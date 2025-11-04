// src/routes/label.routes.js
const express = require('express');
const router = express.Router();
const { generateLabels } = require('../controllers/label.controller');
const { 
    verifyToken,          // Verifica que el token sea válido
    todosLogueados        // Permite Admin (0), Técnico (1) y Operador (2)
} = require('../middleware/auth.middleware');

// Ruta para generar el EXCEL
router.post('/labels/generate-excel',verifyToken,todosLogueados, generateLabels); // Cambiado a generate-excel

module.exports = router;