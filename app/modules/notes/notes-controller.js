const Notes = require('../../models/notes-model');
const logActivity = require('../../utils/logActivity');
const Escalation = require('../../models/escalation-model');
const mongoose = require('mongoose');

// Create a new note for an escalation
const createNote = async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { content } = req.body;

    const escalation = await Escalation.findById(escalationId);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: 'Escalation not found'
      });
    }

    const note = new Notes({
      escalationId,
      content
    });

    await note.save();

    // Log activity
    await logActivity({
      escalationId,
      action: 'Note Created',
      details: `Note added: ${content}`
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: note
    });

  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: error.message
    });
  }
};

// Get all notes for an escalation
const getNotesByEscalation = async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const escalation = await Escalation.findById(escalationId);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: 'Escalation not found'
      });
    }

    const notes = await Notes.findByEscalation(escalationId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const totalNotes = await Notes.countDocuments({ escalationId });

    res.status(200).json({
      success: true,
      data: {
        notes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalNotes / parseInt(limit)),
          totalNotes,
          hasNext: parseInt(page) < Math.ceil(totalNotes / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message
    });
  }
};

// Get a specific note by ID
const getNoteById = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Notes.findById(noteId).populate('escalationId', 'caseNumber customerName');
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: error.message
    });
  }
};

// Update a note
const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;

    const note = await Notes.findByIdAndUpdate(
      noteId,
      { content },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Log activity
    await logActivity({
      escalationId: note.escalationId,
      action: 'Note Updated',
      details: `Note updated: ${content}`
    });

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: note
    });

  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
};

// Delete a note permanently
const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Notes.findByIdAndDelete(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Log activity
    await logActivity({
      escalationId: note.escalationId,
      action: 'Note Deleted',
      details: `Note deleted.`
    });

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
};

// Get notes statistics for an escalation
const getNotesStats = async (req, res) => {
  try {
    const { escalationId } = req.params;

    const escalation = await Escalation.findById(escalationId);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: 'Escalation not found'
      });
    }

    const stats = await Notes.getEscalationStats(escalationId);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalNotes: 0,
        lastNoteDate: null
      }
    });

  } catch (error) {
    console.error('Error fetching notes stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes statistics',
      error: error.message
    });
  }
};

module.exports = {
  createNote,
  getNotesByEscalation,
  getNoteById,
  updateNote,
  deleteNote,
  getNotesStats
};
