// src/controllers/squeegee.controller.js
const squeegeeService = require('../services/squeegee.service');

async function getSqueegees(req, res) {
  try {
    const search = req.query.search || '';
    const squeegees = await squeegeeService.getAllSqueegees(search);
    res.json(squeegees);
  } catch (error) {
    console.error('Error al obtener squeegees:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

async function getHistory(req, res) {
  try {
    const history = await squeegeeService.getAllHistory();
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

async function getBajaSqueegees(req, res) {
  try {
    const bajaSqueegees = await squeegeeService.getBajaSqueegees();
    res.json(bajaSqueegees);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al obtener squeegees dados de baja' });
  }
}

async function getSqueegeeQr(req, res) {
  try {
    const { id } = req.params;
    const qrImageBuffer = await squeegeeService.getSqueegeeQrById(id);

    if (!qrImageBuffer) return res.status(404).send('Imagen no encontrada');

    res.setHeader('Content-Type', 'image/png');
    res.send(qrImageBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

async function getSqueegee(req, res) {
  try {
    const { id } = req.params;
    const squeegee = await squeegeeService.getSqueegeeById(id);
    if (!squeegee) return res.status(404).json({ message: 'Squeegee no encontrado' });
    res.json(squeegee);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

async function updateSqueegee(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    await squeegeeService.updateSqueegeeAndLogHistory(id, data);
    res.json({ success: true, message: 'Squeegee actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el squeegee' });
  }
}

async function registerSqueegee(req, res) {
  try {
    const data = req.body;
    const result = await squeegeeService.createSqueegee(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar el squeegee' });
  }
}

module.exports = {
  getSqueegees,
  getSqueegeeQr,
  getSqueegee,
  updateSqueegee,
  getHistory,
  registerSqueegee,
  getBajaSqueegees,
};