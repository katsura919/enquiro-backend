const express = require('express');
const router = express.Router();
const knowledgeController = require('./knowledge-controller');

// Create a knowledge entry
router.post('/', knowledgeController.createKnowledge);

// Get all knowledge for a business
router.get('/business/:businessId', knowledgeController.getKnowledgeByBusiness);

// Get a knowledge entry by ID
router.get('/:id', knowledgeController.getKnowledgeById);

// Update a knowledge entry by ID
router.put('/:id', knowledgeController.updateKnowledge);

// Delete a knowledge entry by ID
router.delete('/:id', knowledgeController.deleteKnowledge);

module.exports = router;
