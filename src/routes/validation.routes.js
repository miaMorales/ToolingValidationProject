const express = require('express');
const router = express.Router();
const { handleScan, handleLog, getLogs } = require('../controllers/validation.controller');
// Ruta para validar cada escaneo individual
router.post('/validation/scan', handleScan);

// Ruta para guardar el log final
router.post('/validation/log', handleLog);
router.get('/validation/logs', getLogs);
module.exports = router;