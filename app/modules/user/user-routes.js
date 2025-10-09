const express = require('express');
const router = express.Router();
const userController = require('./user-controller');
const authMiddleware  = require('../../middleware/authMiddleware');
const {createUserValidation, updateUserValidation} = require('../../utils/validation/userValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');


// Fetch user info using JWT token
router.get('/info', 
    authMiddleware,
    userController.getUserInfoByToken
);

// Change user password
router.post('/change-password', 
    authMiddleware,
    userController.changePassword
);

// Create a user
router.post('/', 
    authMiddleware,
    createUserValidation,
    handleValidationErrors, 
    userController.createUser
);

// Get all users
router.get('/', 
    authMiddleware,
    userController.getUsers
);

// Get a user by ID
router.get('/:id', 
    authMiddleware,
    userController.getUserById
);

// Update a user by ID
router.put('/:id', 
    authMiddleware,
    updateUserValidation,
    handleValidationErrors, 
    userController.updateUser
);

// Delete a user by ID
router.delete('/:id', 
    authMiddleware,
    userController.deleteUser
);

module.exports = router;
