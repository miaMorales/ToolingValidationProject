const stencilService = require('../services/stencil.service');

async function getStencils(req, res) {
  try {
    const search = req.query.search || '';
    const stencils = await stencilService.getAllStencils(search);
    res.json(stencils);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al obtener stencils' });
  }
}


async function getStencil(req, res) {
    try {
        const { id } = req.params;
        const stencil = await stencilService.getStencilById(id);
        res.json(stencil);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

async function getStencilQr(req, res) {
    try {
        const { id } = req.params;
        const qrImage = await stencilService.getStencilQrById(id);
        if (!qrImage) return res.status(404).send('Not Found');
        res.setHeader('Content-Type', 'image/png');
        res.send(qrImage);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

async function updateStencil(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    await stencilService.updateStencilAndLogHistory(id, data);
    res.json({ success: true, message: 'Stencil actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el stencil' });
  }
}

async function getHistory(req, res) {
  try {
    const history = await stencilService.getAllHistory();
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}
async function getBajaStencils(req, res) {
  try {
    const bajaStencils = await stencilService.getBajaStencils(); // Llama al servicio para obtener stencils dados de baja
    res.json(bajaStencils);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al obtener stencils dados de baja' });
  }
}


async function getSuppliers(req, res) {
    try {
        const suppliers = await stencilService.getAllSuppliers();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
}

async function getPcbOptions(req, res) {
    try {
        const { wl_no } = req.params;
        const pcbs = await stencilService.getPcbsByWorkline(wl_no);
        res.json(pcbs);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener PCBs' });
    }
}

async function getThicknessOptions(req, res) {
    try {
        const { pn_pcb, model_side } = req.params;
        const thickness = await stencilService.getThicknessByPcbAndSide(pn_pcb, model_side);
        res.json(thickness);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener grosores' });
    }
}

async function getNextVersion(req, res) {
    try {
        // CORREGIDO: Extraer thickness de req.params
        const { pn_pcb, model_side, thickness } = req.params; 
        
        // CORREGIDO: Pasar thickness a la función del servicio
        const nextData = await stencilService.getAllSeriesAndNextVersion(pn_pcb, model_side, thickness);
        res.json(nextData);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener versión siguiente' });
    }
}

async function registerStencil(req, res) {
  try {
    const data = req.body;
    const result = await stencilService.createStencil(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar el stencil' });
  }
}

module.exports = {
  getStencils,
  getStencil,
  getStencilQr,
  updateStencil,
  getHistory, // Add the new controller
  getBajaStencils, // Export the new controller
  getSuppliers,
  getPcbOptions,
  getThicknessOptions,
  getNextVersion,
  registerStencil,
};