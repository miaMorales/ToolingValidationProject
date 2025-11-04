// src/routes/squeegee.routes.js
const express = require('express');
const router = express.Router();
const { getSqueegees, getSqueegeeQr, getSqueegee, updateSqueegee, getHistory, registerSqueegee, getBajaSqueegees } = require('../controllers/squeegee.controller');
const { 
    verifyToken,          // Verifica que el token sea válido
    adminYTecnico,      // Permite Admin (0) y Tecnico (1)
    todosLogueados        // Permite Admin (0), Tecnico (1) y Operador (2)
} = require('../middleware/auth.middleware');
// ===================================
// Rutas Específicas por Palabra Clave (DEBEN IR PRIMERO)
// ===================================
router.get('/squeegees/history',verifyToken,adminYTecnico, getHistory);
router.get('/squeegees/baja',verifyToken,adminYTecnico, getBajaSqueegees);

// ===================================
// Rutas de Colección General
// ===================================
router.get('/squeegees',verifyToken,adminYTecnico, getSqueegees);
router.post('/squeegees',verifyToken,adminYTecnico, registerSqueegee);

// ===================================
// Rutas de Entidad Específica (Usando :id)
// ===================================
router.get('/squeegees/:id/qr',verifyToken,adminYTecnico, getSqueegeeQr);
router.get('/squeegees/:id',verifyToken,adminYTecnico, getSqueegee);
router.put('/squeegees/:id',verifyToken,adminYTecnico, updateSqueegee);

module.exports = router;