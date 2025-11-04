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

router.get('/users', verifyToken,soloAdmin, getUsers);
router.post('/users', verifyToken,soloAdmin, createUser);

// --- CAMBIO: El parámetro de ruta ahora es :no_employee ---
router.put('/users/:no_employee',verifyToken, soloAdmin, updateUser);
router.delete('/users/:no_employee', verifyToken,soloAdmin, deleteUser);

module.exports = router;