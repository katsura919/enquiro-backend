const express = require('express');
const router = express.Router();
const notesController = require('./notes-controller');

// Routes for notes associated with escalations
// GET /api/notes/escalation/:escalationId - Get all notes for an escalation
router.get('/escalation/:escalationId', notesController.getNotesByEscalation);

// POST /api/notes/escalation/:escalationId - Create a new note for an escalation
router.post('/escalation/:escalationId', notesController.createNote);

// GET /api/notes/escalation/:escalationId/stats - Get notes statistics for an escalation
router.get('/escalation/:escalationId/stats', notesController.getNotesStats);

// Routes for individual notes
// GET /api/notes/:noteId - Get a specific note by ID
router.get('/:noteId', notesController.getNoteById);

// PUT /api/notes/:noteId - Update a note
router.put('/:noteId', notesController.updateNote);

// DELETE /api/notes/:noteId - Delete a note permanently
router.delete('/:noteId', notesController.deleteNote);

module.exports = router;
