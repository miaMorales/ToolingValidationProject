// src/controllers/plate.controller.js
const plateService = require('../services/plate.service');

// --- Controladores CRUD ---

async function getPlates(req, res) {
  try {
    const search = req.query.search || '';
    const plates = await plateService.getAllPlates(search);
    res.json(plates);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al obtener plates' });
  }
}

async function getPlate(req, res) {
    try {
        const { id } = req.params;
        const plate = await plateService.getPlateById(id);
        res.json(plate);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

async function getPlateQr(req, res) {
    try {
        const { id } = req.params;
        const qrImage = await plateService.getPlateQrById(id);
        if (!qrImage) return res.status(404).send('Not Found');
        res.setHeader('Content-Type', 'image/png');
        res.send(qrImage);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

async function updatePlate(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    await plateService.updatePlateAndLogHistory(id, data);
    res.json({ success: true, message: 'Plate actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el plate' });
  }
}

async function registerPlate(req, res) {
  try {
    const data = req.body;
    const result = await plateService.createPlate(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar el plate' });
  }
}

// --- Controladores de Vistas ---

async function getHistory(req, res) {
  try {
    const history = await plateService.getAllHistory();
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

async function getBajaPlates(req, res) {
  try {
    const bajaPlates = await plateService.getBajaPlates(); 
    res.json(bajaPlates);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al obtener plates dados de baja' });
  }
}

// --- Controladores de Datos Dinámicos ---

async function getSuppliers(req, res) {
    try {
        const suppliers = await plateService.getAllSuppliers();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
}

async function getPcbOptions(req, res) {
    try {
        const { wl_no } = req.params;
        const pcbs = await plateService.getPcbsByWorkline(wl_no);
        res.json(pcbs);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener PCBs' });
    }
}

// En src/controllers/plate.controller.js

async function getNextRevision(req, res) {
    try {
        // Corregido: Solo extraemos pn_pcb
        const { pn_pcb } = req.params; 
        const model_side = 'BT'; // Valor fijo por solicitud del cliente

        // Pasamos el valor fijo 'BT' al servicio
        const nextData = await plateService.getAllSeriesAndNextVersion(pn_pcb, model_side);
        res.json(nextData);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener siguiente revisión' });
    }
}

module.exports = {
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
};