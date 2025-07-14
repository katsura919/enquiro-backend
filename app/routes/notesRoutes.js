const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotesByEscalation,
  getNoteById,
  updateNote,
  deleteNote,
  getNotesStats
} = require('../controllers/notesController');

// Routes for notes associated with escalations
// GET /api/notes/escalation/:escalationId - Get all notes for an escalation
router.get('/escalation/:escalationId', getNotesByEscalation);

// POST /api/notes/escalation/:escalationId - Create a new note for an escalation
router.post('/escalation/:escalationId', createNote);

// GET /api/notes/escalation/:escalationId/stats - Get notes statistics for an escalation
router.get('/escalation/:escalationId/stats', getNotesStats);

// Routes for individual notes
// GET /api/notes/:noteId - Get a specific note by ID
router.get('/:noteId', getNoteById);

// PUT /api/notes/:noteId - Update a note
router.put('/:noteId', updateNote);

// DELETE /api/notes/:noteId - Delete a note permanently
router.delete('/:noteId', deleteNote);

module.exports = router;
