import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';
import type { SignOptions } from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  const { name, email, phone, role, propertyId, roomNumber, password } = req.body;

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const result = await pool.query(
      `INSERT INTO users (property_id, name, email, phone, role, room_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [propertyId, name, email, phone, role, roomNumber, passwordHash]
    );

    const user = result.rows[0];
    delete user.password_hash;

    logger.info(`User registered: ${email} with role ${role}`);

    res.status(201).json({ success: true, user, message: 'User registered successfully' });
  } catch (error: any) {
    logger.error('Error registering user:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, propertyId: user.property_id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'] }
    );

    delete user.password_hash;

    logger.info(`User logged in: ${email}`);

    res.json({ success: true, token, user, message: 'Login successful' });
  } catch (error: any) {
    logger.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, property_id, name, email, phone, role, room_number, status, created_at
       FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { name, phone, roomNumber } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       room_number = COALESCE($3, room_number), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [name, phone, roomNumber, req.user!.userId]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const { propertyId, role } = req.query;

  try {
    let query = `SELECT id, property_id, name, email, phone, role, room_number, status FROM users WHERE 1=1`;
    const params: any[] = [];

    if (propertyId) {
      params.push(propertyId);
      query += ` AND property_id = $${params.length}`;
    }

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  const { latitude, longitude, beaconId, zoneId } = req.body;
  const userId = req.user!.userId;

  try {
    await pool.query(
      `INSERT INTO location_tracking (user_id, zone_id, beacon_id, latitude, longitude, location)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326))`,
      [userId, zoneId, beaconId, latitude, longitude]
    );

    if (req.io) {
      req.io.to('role_admin').to('role_security').emit('user_location_update', {
        userId,
        latitude,
        longitude,
        beaconId,
        zoneId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Location updated' });
  } catch (error: any) {
    logger.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const triggerPanic = async (req: Request, res: Response) => {
  const { latitude, longitude, message } = req.body;
  const userId = req.user!.userId;

  try {
    const userResult = await pool.query(`SELECT property_id, name FROM users WHERE id = $1`, [userId]);
    const user = userResult.rows[0];

    const incidentResult = await pool.query(
      `INSERT INTO incidents (property_id, reported_by, incident_type, severity, status, description, latitude, longitude, location)
       VALUES ($1, $2, 'security', 'critical', 'active', $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326))
       RETURNING *`,
      [user.property_id, userId, message || `Panic button triggered by ${user.name}`, latitude, longitude]
    );

    await pool.query(
      `INSERT INTO check_ins (user_id, incident_id, status, latitude, longitude, location)
       VALUES ($1, $2, 'distressed', $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
      [userId, incidentResult.rows[0].id, latitude, longitude]
    );

    if (req.io) {
      req.io.to(`property_${user.property_id}`).emit('panic_triggered', {
        userId,
        userName: user.name,
        latitude,
        longitude,
        incidentId: incidentResult.rows[0].id,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Panic button triggered by user ${userId}`);

    res.status(201).json({
      success: true,
      incident: incidentResult.rows[0],
      message: 'Emergency alert sent. Stay calm, help is on the way.',
    });
  } catch (error: any) {
    logger.error('Error triggering panic:', error);
    res.status(500).json({ error: 'Failed to trigger panic alert' });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  const { incidentId, status, message, latitude, longitude } = req.body;
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      `INSERT INTO check_ins (user_id, incident_id, status, message, latitude, longitude, location)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326))
       RETURNING *`,
      [userId, incidentId, status, message, latitude, longitude]
    );

    if (req.io) {
      req.io.emit('user_checkin', {
        userId,
        incidentId,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, checkIn: result.rows[0], message: 'Check-in recorded successfully' });
  } catch (error: any) {
    logger.error('Error recording check-in:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
};
