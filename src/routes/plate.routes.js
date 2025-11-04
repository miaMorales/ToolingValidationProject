// src/routes/plate.routes.js
const express = require('express');
const router = express.Router();
const {
  getPlates,
  getPlate,
  getPlateQr,
  updatePlate,
  registerPlate,
  getHistory,
  getBajaPlates,
  getSuppliers,
  getPcbOptions,
  getNextRevision
} = require('../controllers/plate.controller');
const { 
    verifyToken,          // Verifica que el token sea válido
    adminYTecnico,      // Permite Admin (0) y Tecnico (1)
} = require('../middleware/auth.middleware');
// ===================================
// Rutas de Datos Dinámicos (Más específicas)
// ===================================

router.get('/data/suppliers',verifyToken,adminYTecnico, getSuppliers);
router.get('/data/pcbs/:wl_no',verifyToken,adminYTecnico, getPcbOptions);
router.get('/data/next-revision/:pn_pcb',verifyToken,adminYTecnico, getNextRevision); 

// ===================================
// Rutas de Vistas y Colección (Palabras Clave)
// Deben ir antes de las rutas con :id
// ===================================

router.get('/plates/history',verifyToken,adminYTecnico, getHistory);
router.get('/plates/baja',verifyToken,adminYTecnico, getBajaPlates);

// Ruta de Colección General (Obtener todos los plates)
router.get('/plates',verifyToken,adminYTecnico, getPlates); 


// ===================================
// Rutas de Entidad (Usando :id)
// ===================================

router.get('/plates/:id',verifyToken,adminYTecnico, getPlate);
router.get('/plates/:id/qr',verifyToken,adminYTecnico, getPlateQr);
router.put('/plates/:id',verifyToken,adminYTecnico, updatePlate);
router.post('/plates',verifyToken,adminYTecnico, registerPlate);


module.exports = router;