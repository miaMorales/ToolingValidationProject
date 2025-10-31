// src/routes/squeegee.routes.js
const express = require('express');
const router = express.Router();
const { getSqueegees, getSqueegeeQr, getSqueegee, updateSqueegee, getHistory, registerSqueegee, getBajaSqueegees } = require('../controllers/squeegee.controller');

// ===================================
// Rutas Específicas por Palabra Clave (DEBEN IR PRIMERO)
// ===================================
router.get('/squeegees/history', getHistory);
router.get('/squeegees/baja', getBajaSqueegees);

// ===================================
// Rutas de Colección General
// ===================================
router.get('/squeegees', getSqueegees);
router.post('/squeegees', registerSqueegee);

// ===================================
// Rutas de Entidad Específica (Usando :id)
// ===================================
router.get('/squeegees/:id/qr', getSqueegeeQr);
router.get('/squeegees/:id', getSqueegee);
router.put('/squeegees/:id', updateSqueegee);

module.exports = router;