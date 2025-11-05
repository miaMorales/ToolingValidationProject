// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/user.controller');
const { verifyToken, adminYTecnico, } = require('../middleware/auth.middleware');

router.get('/users', verifyToken,adminYTecnico, getUsers);
router.post('/users', verifyToken,adminYTecnico, createUser);

// --- CAMBIO: El parámetro de ruta ahora es :no_employee ---
router.put('/users/:no_employee',verifyToken, adminYTecnico, updateUser);
router.delete('/users/:no_employee', verifyToken,adminYTecnico, deleteUser);

module.exports = router;