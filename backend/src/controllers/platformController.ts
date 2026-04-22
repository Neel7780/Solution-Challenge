import { pool, query } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';

export const submitOnboardingRequest = async (req: Request, res: Response) => {
  const {
    orgName,
    orgType,
    address,
    contactName,
    contactEmail,
    contactPhone,
    expectedCapacity,
    additionalInfo
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO organization_requests (
        org_name, org_type, address, contact_name, contact_email, 
        contact_phone, expected_capacity, additional_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [orgName, orgType, address, contactName, contactEmail, contactPhone, expectedCapacity, additionalInfo]
    );

    logger.info(`New onboarding request from ${orgName} (${contactEmail})`);

    res.status(201).json({
      success: true,
      requestId: result.rows[0].id,
      message: 'Your request has been submitted successfully. Our team will review it shortly.'
    });
  } catch (error: any) {
    logger.error('Error submitting onboarding request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

export const getOnboardingRequests = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM organization_requests ORDER BY created_at DESC`
    );
    res.json({ success: true, requests: result.rows });
  } catch (error: any) {
    logger.error('Error fetching onboarding requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const reviewOnboardingRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT * FROM organization_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Request already processed' });
    }

    await client.query(
      `UPDATE organization_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [action, id]
    );

    if (action === 'approved') {
      // 1. Create Organization
      const orgResult = await client.query(
        `INSERT INTO organizations (name, contact_email) VALUES ($1, $2) RETURNING id`,
        [request.org_name, request.contact_email]
      );
      const orgId = orgResult.rows[0].id;

      // 2. Create Primary Property
      const propResult = await client.query(
        `INSERT INTO properties (organization_id, name, address) VALUES ($1, $2, $3) RETURNING id`,
        [orgId, request.org_name + ' (Main)', request.address]
      );
      const propertyId = propResult.rows[0].id;

      // 3. Create Org Admin User
      const tempPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const userResult = await client.query(
        `INSERT INTO users (organization_id, property_id, name, email, phone, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [orgId, propertyId, request.contact_name, request.contact_email, request.contact_phone, 'org_admin', passwordHash]
      );

      // 4. Link user to property in mapping table
      await client.query(
        `INSERT INTO user_properties (user_id, property_id, role) VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, propertyId, 'admin']
      );

      logger.info(`Organization ${request.org_name} approved and onboarded. Admin password: ${tempPassword}`);
      
      // In a real app, you'd send an email here with tempPassword
      await client.query('COMMIT');
      return res.json({ 
        success: true, 
        message: 'Request approved and organization onboarded',
        credentials: { email: request.contact_email, password: tempPassword } 
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error reviewing onboarding request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  } finally {
    client.release();
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM organizations ORDER BY created_at DESC`
    );
    res.json({ success: true, organizations: result.rows });
  } catch (error: any) {
    logger.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

