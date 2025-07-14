const express = require('express');
const router = express.Router();
const userViews = require('./views');

// Create a user
router.post('/', userViews.createUser);

// Get all users
router.get('/', userViews.getUsers);

// Get a user by ID
router.get('/:id', userViews.getUserById);

// Update a user by ID
router.put('/:id', userViews.updateUser);

// Delete a user by ID
router.delete('/:id', userViews.deleteUser);

module.exports = router;
