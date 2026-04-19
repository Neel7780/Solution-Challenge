import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, queryWithContext } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';
import type { SignOptions } from 'jsonwebtoken';
import { notifyNearbyUsers } from './crisisController';

const signUserToken = (user: { id: number; role: string; property_id: number; organization_id: number }) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      propertyId: user.property_id,
      organizationId: user.organization_id,
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'] }
  );
};

export const createGuestAccount = async (req: Request, res: Response) => {
  const { name, email, phone, propertyId, roomNumber, password } = req.body;
  const role = 'guest';
  const resolvedPropertyId = propertyId ? Number(propertyId) : req.user!.propertyId;
  let organizationId = req.user!.organizationId;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Either email or phone is required to create a guest account' });
  }

  try {
    // If organizationId is missing from context (e.g. super_admin), fetch it from property
    if (!organizationId && resolvedPropertyId) {
      const propResult = await pool.query('SELECT organization_id FROM properties WHERE id = $1', [resolvedPropertyId]);
      if (propResult.rows.length > 0) {
        organizationId = propResult.rows[0].organization_id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (property_id, organization_id, name, email, phone, role, room_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [resolvedPropertyId, organizationId, name, email, phone, role, roomNumber, passwordHash]
    );

    const user = result.rows[0];
    delete user.password_hash;

    // Also link to user_properties for consistency
    await pool.query(
      `INSERT INTO user_properties (user_id, property_id, role) VALUES ($1, $2, $3)`,
      [user.id, resolvedPropertyId, role]
    );

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

export const createUser = async (req: Request, res: Response) => {
  const { name, email, phone, role, propertyId, organizationId, password } = req.body;
  const userContext = req.user!;

  // Validation
  if (!name || !role || !password) {
    return res.status(400).json({ error: 'Name, role, and password are required' });
  }

  // Scoping
  const finalOrgId = userContext.role === 'super_admin' ? (organizationId || userContext.organizationId) : userContext.organizationId;
  const finalPropertyId = propertyId || null;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (organization_id, property_id, name, email, phone, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, organization_id, property_id`,
      [finalOrgId, finalPropertyId, name, email, phone, role, passwordHash]
    );

    const newUser = result.rows[0];

    // If a property was specified, also create a mapping in user_properties
    if (finalPropertyId) {
      await pool.query(
        `INSERT INTO user_properties (user_id, property_id, role)
         VALUES ($1, $2, $3)`,
        [newUser.id, finalPropertyId, role]
      );
    }

    logger.info(`User ${newUser.id} (${newUser.role}) created by Admin ${userContext.userId}`);

    res.status(201).json({
      success: true,
      user: newUser,
      message: `User ${name} onboarded successfully as ${role}`
    });
  } catch (error: any) {
    logger.error('Error onboarding user:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Failed to onboard user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, role, propertyId, status } = req.body;
  const userContext = req.user!;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check permissions and existence
      const checkResult = await client.query(
        `SELECT organization_id FROM users WHERE id = $1`,
        [id]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      if (userContext.role !== 'super_admin' && checkResult.rows[0].organization_id !== userContext.organizationId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Update user
      const result = await client.query(
        `UPDATE users 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             role = COALESCE($4, role),
             property_id = COALESCE($5, property_id),
             status = COALESCE($6, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, name, email, role, property_id, status`,
        [name, email, phone, role, propertyId, status, id]
      );

      const updatedUser = result.rows[0];

      // Update user_properties mapping if property changed
      if (propertyId) {
        await client.query(
          `DELETE FROM user_properties WHERE user_id = $1`,
          [id]
        );
        await client.query(
          `INSERT INTO user_properties (user_id, property_id, role)
           VALUES ($1, $2, $3)`,
          [id, propertyId, role || updatedUser.role]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, user: updatedUser, message: 'User updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userContext = req.user!;

  try {
    const checkResult = await pool.query(
      `SELECT organization_id FROM users WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userContext.role !== 'super_admin' && checkResult.rows[0].organization_id !== userContext.organizationId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};



export const register = async (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Self-signup is disabled. Please request an account from hotel staff.',
  });
};

export const login = async (req: Request, res: Response) => {
  const { identifier, email, password, propertyId } = req.body;
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

    // Fetch available property contexts
    const contextResult = await pool.query(
      `SELECT up.property_id, up.role, p.name as property_name, p.organization_id
       FROM user_properties up
       JOIN properties p ON up.property_id = p.id
       WHERE up.user_id = $1`,
      [user.id]
    );

    const contexts = contextResult.rows;

    if (contexts.length === 0 && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'No property access assigned to this account' });
    }

    // If propertyId is provided, use it. Otherwise, default to user's last_property_id or default property or first available context.
    let selectedPropertyId = propertyId || user.last_property_id || user.property_id;
    let selectedRole = user.role;
    let selectedOrgId = user.organization_id;

    if (propertyId) {
      const selectedContext = contexts.find(c => c.property_id === Number(propertyId));
      if (!selectedContext && user.role !== 'super_admin' && user.role !== 'org_admin') {
        return res.status(403).json({ error: 'Access denied for the requested property' });
      }
      if (selectedContext) {
        selectedRole = selectedContext.role;
        selectedOrgId = selectedContext.organization_id;
      }
    } else if (contexts.length > 1 && !user.last_property_id && !user.property_id) {
      // User must select a context
      return res.json({
        success: true,
        requiresContextSelection: true,
        contexts: contexts.map(c => ({
          propertyId: c.property_id,
          propertyName: c.property_name,
          role: c.role
        })),
        message: 'Multiple contexts available. Please select one.'
      });
    } else if (contexts.length > 0 && !selectedPropertyId) {
       selectedPropertyId = contexts[0].property_id;
       selectedRole = contexts[0].role;
       selectedOrgId = contexts[0].organization_id;
    }

    // Update last_property_id
    if (selectedPropertyId) {
      await pool.query(`UPDATE users SET last_property_id = $1 WHERE id = $2`, [selectedPropertyId, user.id]);
    }

    const token = signUserToken({
      id: user.id,
      role: selectedRole,
      property_id: selectedPropertyId,
      organization_id: selectedOrgId
    });

    delete user.password_hash;
    user.role = selectedRole;
    user.property_id = selectedPropertyId;
    user.organization_id = selectedOrgId;

    logger.info(`User logged in: ${resolvedIdentifier} to property ${selectedPropertyId}`);

    res.json({
      success: true,
      token,
      user,
      contexts: contexts.length > 1 ? contexts : undefined,
      message: 'Login successful'
    });
  } catch (error: any) {
    logger.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const switchContext = async (req: Request, res: Response) => {
  const { propertyId } = req.body;
  const userId = req.user!.userId;

  try {
    const contextResult = await pool.query(
      `SELECT up.property_id, up.role, p.organization_id
       FROM user_properties up
       JOIN properties p ON up.property_id = p.id
       WHERE up.user_id = $1 AND up.property_id = $2`,
      [userId, propertyId]
    );

    if (contextResult.rows.length === 0) {
      // Check if user is super_admin or org_admin for this property
      const userResult = await pool.query(`SELECT id, role, organization_id FROM users WHERE id = $1`, [userId]);
      const user = userResult.rows[0];

      if (user.role === 'super_admin' || (user.role === 'org_admin' && user.organization_id)) {
         const propResult = await pool.query(`SELECT id, organization_id FROM properties WHERE id = $1`, [propertyId]);
         if (propResult.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
         
         if (user.role === 'org_admin' && propResult.rows[0].organization_id !== user.organization_id) {
           return res.status(403).json({ error: 'Access denied for this property' });
         }

         await pool.query(`UPDATE users SET last_property_id = $1 WHERE id = $2`, [propertyId, userId]);

         const newToken = signUserToken({
           id: userId,
           role: user.role,
           property_id: propertyId,
           organization_id: propResult.rows[0].organization_id
         });
         return res.json({ success: true, token: newToken, message: 'Context switched' });
      }

      return res.status(403).json({ error: 'Access denied for the requested property' });
    }

    const context = contextResult.rows[0];
    await pool.query(`UPDATE users SET last_property_id = $1 WHERE id = $2`, [propertyId, userId]);

    const newToken = signUserToken({
      id: userId,
      role: context.role,
      property_id: context.property_id,
      organization_id: context.organization_id
    });

    res.json({ success: true, token: newToken, message: 'Context switched' });
  } catch (error: any) {
    logger.error('Error switching context:', error);
    res.status(500).json({ error: 'Failed to switch context' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, property_id, organization_id, last_property_id, name, email, phone, role, room_number, status, created_at
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
  const { role } = req.query;
  const userContext = req.user!;

  try {
    let baseQuery = `
      SELECT u.id, u.property_id, u.organization_id, u.name, u.email, u.phone, 
             u.role, u.room_number, u.status,
             o.name as organization_name,
             p.name as property_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN properties p ON u.property_id = p.id
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      baseQuery += ` WHERE u.role = $1`;
    }

    baseQuery += ` ORDER BY u.created_at DESC`;

    // Use queryWithContext to automatically append property/org filters based on user role
    const result = await queryWithContext(userContext, baseQuery, params, 'u');

    logger.info(`Personnel fetch: User ${userContext.userId} (${userContext.role}) retrieved ${result.rows.length} records`);

    res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (error: any) {
    logger.error('Error fetching users:', { error: error.message, user: req.user });
    res.status(500).json({ error: 'Failed to fetch personnel directory' });
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

      // Broadcast to specific roles and the whole organization
      req.io.to('role_security')
        .to('role_responder')
        .to('role_admin')
        .to('role_org_admin')
        .to('role_super_admin')
        .to(`organization_${user.organization_id}`)
        .emit('new_crisis', {
          incident: incidentResult.rows[0],
          timestamp: new Date().toISOString(),
        });

      // Proximity-based notification
      if (latitude && longitude) {
        notifyNearbyUsers(req.io, latitude, longitude, incidentResult.rows[0]);
      }
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
