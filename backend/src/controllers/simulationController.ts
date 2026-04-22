import type { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  analyzeSimulation,
  saveSimulationRun,
  getSimulationHistory,
  type SimulationSnapshot,
  type SimulationAnalysisRequest,
} from '../services/simulationAnalysisService';

/**
 * POST /api/simulation/analyze
 * Submit a simulation snapshot for AI analysis.
 */
export const analyzeSnapshot = async (req: Request, res: Response) => {
  const { snapshot, simulationDuration = 0 } = req.body;
  const propertyId = req.user?.propertyId || req.body.propertyId;
  const userId = req.user?.userId;

  if (!snapshot || !snapshot.agents || !snapshot.fires || !snapshot.metrics) {
    return res.status(400).json({ error: 'Invalid simulation snapshot. Required: agents, fires, metrics.' });
  }

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required.' });
  }

  try {
    const analysisReq: SimulationAnalysisRequest = {
      snapshot: snapshot as SimulationSnapshot,
      propertyId,
      simulationDuration,
      userId,
    };

    const analysis = await analyzeSimulation(analysisReq);

    // Persist the run
    let runId: number | null = null;
    if (userId) {
      runId = await saveSimulationRun(
        propertyId,
        userId,
        snapshot,
        analysis,
        simulationDuration,
      );
    }

    // Broadcast to property dashboard
    if (req.io) {
      req.io.to(`property_${propertyId}`).emit('simulation:analysis_result', {
        runId,
        analysis,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      runId,
      analysis,
    });
  } catch (error: any) {
    logger.error('Simulation analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze simulation snapshot.' });
  }
};

/**
 * GET /api/simulation/history
 * Get past simulation analysis results.
 */
export const getHistory = async (req: Request, res: Response) => {
  const propertyId = req.user?.propertyId || Number(req.query.propertyId);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required.' });
  }

  try {
    const runs = await getSimulationHistory(propertyId, limit);
    res.json({ success: true, count: runs.length, runs });
  } catch (error: any) {
    logger.error('Simulation history error:', error);
    res.status(500).json({ error: 'Failed to fetch simulation history.' });
  }
};

/**
 * POST /api/simulation/feed-to-dashboard
 * Convert a simulation analysis into a real incident for the main dashboard.
 */
export const feedToDashboard = async (req: Request, res: Response) => {
  const { runId, analysisOverride } = req.body;
  const propertyId = req.user?.propertyId;
  const userId = req.user?.userId;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required.' });
  }

  try {
    // Import dynamically to avoid circular deps
    const { query } = await import('../database/connection.js');

    // Get the simulation run
    let analysis: any;
    if (runId) {
      const runResult = await query(
        'SELECT ai_analysis FROM simulation_runs WHERE id = $1 AND property_id = $2',
        [runId, propertyId]
      );
      if (runResult.rows.length === 0) {
        return res.status(404).json({ error: 'Simulation run not found.' });
      }
      analysis = runResult.rows[0].ai_analysis;
    } else if (analysisOverride) {
      analysis = analysisOverride;
    } else {
      return res.status(400).json({ error: 'Either runId or analysisOverride is required.' });
    }

    // Create a real incident from the simulation analysis
    const incidentResult = await query(
      `INSERT INTO incidents (
        property_id, reported_by, incident_type, severity, status,
        description, mass_alert_message, responder_action_plan
      ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7) RETURNING *`,
      [
        propertyId,
        userId,
        'fire',
        analysis.severity || 'high',
        `[SIMULATION DERIVED] ${analysis.narrativeSummary || 'Incident created from simulation analysis'}`,
        analysis.recommendations?.[0] || 'Review simulation results for details.',
        analysis.recommendations?.join('\n') || 'Follow standard evacuation procedures.',
      ]
    );

    const incident = incidentResult.rows[0];

    // Broadcast to dashboard
    if (req.io) {
      req.io.to(`property_${propertyId}`).emit('crisis_reported', {
        incident,
        fromSimulation: true,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Simulation analysis fed to dashboard as incident ${incident.id}`);

    res.status(201).json({
      success: true,
      incident,
      message: 'Simulation analysis converted to active incident.',
    });
  } catch (error: any) {
    logger.error('Feed to dashboard error:', error);
    res.status(500).json({ error: 'Failed to create incident from simulation.' });
  }
};
