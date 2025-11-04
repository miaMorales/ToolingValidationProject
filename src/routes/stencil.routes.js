const express = require('express');
const router = express.Router();
const {
  getStencils,
  getStencil,
  getStencilQr,
  updateStencil,
  getHistory,
  getBajaStencils,
  getSuppliers,
  getPcbOptions,
  getThicknessOptions,
  getNextVersion,
  registerStencil,
} = require('../controllers/stencil.controller');
const { 
    verifyToken,          // Verifica que el token sea válido
    adminYTecnico,   // Permite Admin (0) y Tecnico (1)
} = require('../middleware/auth.middleware');
// Todas las rutas para stencils
// La ruta de historial debe estar ANTES de la ruta con el ID para evitar conflictos
router.get('/stencils/history',verifyToken,adminYTecnico, getHistory);
router.get('/stencils/baja',verifyToken,adminYTecnico, getBajaStencils); // Nueva ruta para stencils dados de baja
router.get('/stencils',verifyToken,adminYTecnico, getStencils);
router.get('/stencils/:id',verifyToken,adminYTecnico, getStencil);
router.get('/stencils/:id/qr',verifyToken,adminYTecnico, getStencilQr);
router.put('/stencils/:id',verifyToken,adminYTecnico, updateStencil);
router.get('/data/suppliers',verifyToken,adminYTecnico, getSuppliers);
router.get('/data/pcbs/:wl_no',verifyToken,adminYTecnico, getPcbOptions);
router.get('/data/thickness/:pn_pcb/:model_side',verifyToken,adminYTecnico, getThicknessOptions);
router.get('/data/next-version/:pn_pcb/:model_side/:thickness',verifyToken,adminYTecnico, getNextVersion);
router.post('/stencils',verifyToken,adminYTecnico, registerStencil);

module.exports = router;