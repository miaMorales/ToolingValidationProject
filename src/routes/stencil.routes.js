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

// Todas las rutas para stencils
// La ruta de historial debe estar ANTES de la ruta con el ID para evitar conflictos
router.get('/stencils/history', getHistory);
router.get('/stencils/baja', getBajaStencils); // Nueva ruta para stencils dados de baja
router.get('/stencils', getStencils);
router.get('/stencils/:id', getStencil);
router.get('/stencils/:id/qr', getStencilQr);
router.put('/stencils/:id', updateStencil);
router.get('/data/suppliers', getSuppliers);
router.get('/data/pcbs/:wl_no', getPcbOptions);
router.get('/data/thickness/:pn_pcb/:model_side', getThicknessOptions);
router.get('/data/next-version/:pn_pcb/:model_side/:thickness', getNextVersion);
router.post('/stencils', registerStencil);

module.exports = router;