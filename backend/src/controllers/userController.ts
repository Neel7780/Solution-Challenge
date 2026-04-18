import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';
import type { SignOptions } from 'jsonwebtoken';

const signUserToken = (user: { id: number; role: string; property_id: number }) => {
  return jwt.sign(
    { userId: user.id, role: user.role, propertyId: user.property_id },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'] }
  );
};

export const createGuestAccount = async (req: Request, res: Response) => {
  const { name, email, phone, propertyId, roomNumber, password } = req.body;
  const role = 'guest';
  const resolvedPropertyId = propertyId ? Number(propertyId) : req.user!.propertyId;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Either email or phone is required to create a guest account' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (property_id, name, email, phone, role, room_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [resolvedPropertyId, name, email, phone, role, roomNumber, passwordHash]
    );

    const user = result.rows[0];
    delete user.password_hash;

    logger.info(`Guest account created by user ${req.user!.userId}: ${email || phone}`);

    res.status(201).json({ success: true, user, message: 'Guest account created successfully' });
  } catch (error: any) {
    logger.error('Error creating guest account:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Failed to create guest account' });
  }
};

export const register = async (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Self-signup is disabled. Please request an account from hotel staff.',
  });
};

export const login = async (req: Request, res: Response) => {
  const { identifier, email, password } = req.body;
  const resolvedIdentifier = identifier || email;

  if (!resolvedIdentifier) {
    return res.status(400).json({ error: 'Email or phone identifier is required' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR phone = $1 LIMIT 1`,
      [resolvedIdentifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signUserToken(user);

    delete user.password_hash;

    logger.info(`User logged in: ${resolvedIdentifier}`);

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

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const userResult = await pool.query(`SELECT id, password_hash FROM users WHERE id = $1`, [req.user!.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (!user.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newPasswordHash, req.user!.userId]
    );

    logger.info(`Password changed for user ${req.user!.userId}`);
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    logger.error('Error changing password:', error);
    return res.status(500).json({ error: 'Failed to update password' });
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
      `WITH coords AS (
         SELECT $4::double precision AS lat, $5::double precision AS lon
       )
       INSERT INTO incidents (property_id, reported_by, incident_type, severity, status, description, latitude, longitude, location)
       SELECT $1, $2, 'security', 'critical', 'active', $3, coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
       FROM coords
       RETURNING *`,
      [user.property_id, userId, message || `Panic button triggered by ${user.name}`, latitude, longitude]
    );

    await pool.query(
      `WITH coords AS (
         SELECT $3::double precision AS lat, $4::double precision AS lon
       )
       INSERT INTO check_ins (user_id, incident_id, status, latitude, longitude, location)
       SELECT $1, $2, 'distressed', coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
       FROM coords`,
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

      req.io.to(`property_${user.property_id}`).emit('crisis_reported', {
        incident: incidentResult.rows[0],
        timestamp: new Date().toISOString(),
      });

      req.io.to('role_security').to('role_responder').to('role_admin').emit('new_crisis', {
        incident: incidentResult.rows[0],
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
      `WITH coords AS (
         SELECT $5::double precision AS lat, $6::double precision AS lon
       )
       INSERT INTO check_ins (user_id, incident_id, status, message, latitude, longitude, location)
       SELECT $1, $2, $3, $4, coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
       FROM coords
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
