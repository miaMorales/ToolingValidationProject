const express = require('express');
const router = express.Router();
const { handleScan, handleLog, getLogs } = require('../controllers/validation.controller');
const { 
    verifyToken,          // Verifica que el token sea válido
    todosLogueados        // Permite Admin (0), Técnico (1) y Operador (2)
} = require('../middleware/auth.middleware');
// Ruta para validar cada escaneo individual
router.post('/validation/scan',verifyToken,todosLogueados, handleScan);

// Ruta para guardar el log final
router.post('/validation/log',verifyToken,todosLogueados, handleLog);
router.get('/validation/logs',verifyToken,todosLogueados, getLogs);
module.exports = router;