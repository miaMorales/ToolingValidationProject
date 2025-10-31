// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/user.controller');
const { verifyToken, soloAdmin } = require('../middleware/auth.middleware');

router.get('/users', soloAdmin, getUsers);
router.post('/users', soloAdmin, createUser);

// --- CAMBIO: El parámetro de ruta ahora es :no_employee ---
router.put('/users/:no_employee', soloAdmin, updateUser);
router.delete('/users/:no_employee', soloAdmin, deleteUser);

module.exports = router;