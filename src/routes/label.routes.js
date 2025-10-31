// src/routes/label.routes.js
const express = require('express');
const router = express.Router();
const { generateLabels } = require('../controllers/label.controller');

// Ruta para generar el EXCEL
router.post('/labels/generate-excel', generateLabels); // Cambiado a generate-excel

module.exports = router;