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

// ===================================
// Rutas de Datos Dinámicos (Más específicas)
// ===================================

router.get('/data/suppliers', getSuppliers);
router.get('/data/pcbs/:wl_no', getPcbOptions);
router.get('/data/next-revision/:pn_pcb', getNextRevision); 

// ===================================
// Rutas de Vistas y Colección (Palabras Clave)
// Deben ir antes de las rutas con :id
// ===================================

router.get('/plates/history', getHistory);
router.get('/plates/baja', getBajaPlates);

// Ruta de Colección General (Obtener todos los plates)
router.get('/plates', getPlates); 


// ===================================
// Rutas de Entidad (Usando :id)
// ===================================

router.get('/plates/:id', getPlate);
router.get('/plates/:id/qr', getPlateQr);
router.put('/plates/:id', updatePlate);
router.post('/plates', registerPlate);


module.exports = router;