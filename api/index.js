import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runSql, getSql, allSql, initDb, connectionDebugInfo } from '../server/db.js';
import { triageComplaint } from '../server/ai.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Initialize DB schema on cold start
let isDbInitialized = false;
let dbInitError = null;

app.use(async (req, res, next) => {
  if (!isDbInitialized) {
    try {
      await initDb();
      isDbInitialized = true;
      dbInitError = null;
    } catch (err) {
      console.error('Failed to initialize database on cold start:', err);
      dbInitError = err.message;
    }
  }
  next();
});

// 1. Submit Complaint (Resident Flow)
app.post('/api/complaints', async (req, res) => {
  try {
    if (dbInitError) {
      return res.status(500).json({ error: `DB Init Error: ${dbInitError} (${connectionDebugInfo})` });
    }

    const { flat_number, description, apiKey } = req.body;

    if (!flat_number || !flat_number.trim()) {
      return res.status(400).json({ error: 'Flat number is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Complaint description is required.' });
    }

    // AI Triage
    const aiResult = await triageComplaint(description.trim(), apiKey);

    // Save to Database via SQL
    const sql = `
      INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const result = await runSql(sql, [
      flat_number.trim().toUpperCase(),
      description.trim(),
      aiResult.category,
      aiResult.urgency,
      aiResult.ai_drafted_response
    ]);

    const inserted = await getSql('SELECT * FROM complaints WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      complaint: inserted || {
        id: result.lastID,
        flat_number: flat_number.trim().toUpperCase(),
        description: description.trim(),
        category: aiResult.category,
        urgency: aiResult.urgency,
        ai_drafted_response: aiResult.ai_drafted_response,
        status: 'Open',
        created_at: new Date().toISOString()
      },
      aiSource: aiResult.source
    });
  } catch (err) {
    console.error('Error submitting complaint:', err);
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

// 2. Fetch Complaints (Admin / Resident)
app.get('/api/complaints', async (req, res) => {
  try {
    if (dbInitError) {
      return res.status(500).json({ error: `DB Init Error: ${dbInitError} (${connectionDebugInfo})` });
    }

    const { flat_number, status, category, search } = req.query;

    let sql = 'SELECT * FROM complaints WHERE 1=1';
    const params = [];

    if (flat_number) {
      sql += ' AND UPPER(flat_number) = UPPER(?)';
      params.push(flat_number.trim());
    }

    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (description LIKE ? OR flat_number LIKE ? OR assigned_to LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Urgency sorting order: High (1), Medium (2), Low (3), then created_at DESC
    sql += ` ORDER BY 
      CASE urgency 
        WHEN 'High' THEN 1 
        WHEN 'Medium' THEN 2 
        WHEN 'Low' THEN 3 
        ELSE 4 
      END, created_at DESC`;

    const rows = await allSql(sql, params);
    return res.json({ complaints: rows });
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

// 3. Single Complaint Details
app.get('/api/complaints/:id', async (req, res) => {
  try {
    const complaint = await getSql('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }
    return res.json({ complaint });
  } catch (err) {
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

// 4. Update Complaint (Admin Flow: Status, Notes, Override Category/Urgency/Draft)
app.patch('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, urgency, admin_edited_response, assigned_to, admin_notes, status } = req.body;

    const existing = await getSql('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const updatedCategory = category || existing.category;
    const updatedUrgency = urgency || existing.urgency;
    const updatedResponse = admin_edited_response !== undefined ? admin_edited_response : existing.admin_edited_response;
    const updatedAssigned = assigned_to !== undefined ? assigned_to : existing.assigned_to;
    const updatedNotes = admin_notes !== undefined ? admin_notes : existing.admin_notes;
    const updatedStatus = status || existing.status;

    const sql = `
      UPDATE complaints 
      SET category = ?,
          urgency = ?,
          admin_edited_response = ?,
          assigned_to = ?,
          admin_notes = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runSql(sql, [updatedCategory, updatedUrgency, updatedResponse, updatedAssigned, updatedNotes, updatedStatus, id]);

    const updated = await getSql('SELECT * FROM complaints WHERE id = ?', [id]);
    return res.json({ success: true, complaint: updated });
  } catch (err) {
    console.error('Error updating complaint:', err);
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

// 5. Admin Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await getSql('SELECT * FROM admins WHERE username = ? AND password_hash = ?', [username, password]);

    if (admin) {
      return res.json({ success: true, user: { username: admin.username } });
    } else {
      return res.status(401).json({ error: 'Invalid admin username or password.' });
    }
  } catch (err) {
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

// 6. Dashboard Stats Summary
app.get('/api/stats', async (req, res) => {
  try {
    const totalRow = await getSql('SELECT COUNT(*) as c FROM complaints');
    const openRow = await getSql("SELECT COUNT(*) as c FROM complaints WHERE status = 'Open'");
    const highUrgencyRow = await getSql("SELECT COUNT(*) as c FROM complaints WHERE urgency = 'High' AND status != 'Resolved'");
    const inProgressRow = await getSql("SELECT COUNT(*) as c FROM complaints WHERE status = 'In Progress'");
    const resolvedRow = await getSql("SELECT COUNT(*) as c FROM complaints WHERE status = 'Resolved'");

    return res.json({
      stats: {
        total: parseInt(totalRow?.c || 0, 10),
        open: parseInt(openRow?.c || 0, 10),
        highUrgency: parseInt(highUrgencyRow?.c || 0, 10),
        inProgress: parseInt(inProgressRow?.c || 0, 10),
        resolved: parseInt(resolvedRow?.c || 0, 10)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `${err.message} (${connectionDebugInfo})` });
  }
});

export default app;
