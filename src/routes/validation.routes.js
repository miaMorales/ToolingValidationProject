const express = require('express');
const router = express.Router();

// 1. AGREGAMOS 'checkPasta' A LA IMPORTACIÓN (Asegúrate de agregar esto en tu controller también)
const { 
    handleScan, 
    handleLog, 
    getLogs, 
    getAlerts, 
    checkPasta // <--- NUEVA FUNCIÓN
} = require('../controllers/validation.controller');

const { 
    verifyToken,          
    todosLogueados        
} = require('../middleware/auth.middleware');

// Ruta para validar cada escaneo individual
router.post('/validation/scan', verifyToken, todosLogueados, handleScan);

// Ruta para guardar el log final
router.post('/validation/log', verifyToken, todosLogueados, handleLog);

router.get('/validation/logs', verifyToken, todosLogueados, getLogs);
router.get('/validation/alerts', verifyToken, todosLogueados, getAlerts);

// --- 2. NUEVA RUTA PARA VERIFICAR PASTA ---
// Esta es la que llama el frontend cuando haces el escaneo random
router.post('/validation/check-pasta', verifyToken, todosLogueados, checkPasta);

module.exports = router;