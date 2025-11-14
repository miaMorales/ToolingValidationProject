// Este SÍ es el contenido de 'controllers/validation.controller.js'

const validationService = require('../services/validation.service');

// Controlador para el escaneo
async function handleScan(req, res) {
  try {
    const { step, barcode, context } = req.body;
    const result = await validationService.validateScan(step, barcode, context);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Controlador para el log
async function handleLog(req, res) {
  try {
    const frontendData = req.body;
    const employeeNumber = req.user.no_employee; // O como lo tengas en tu token
    
    await validationService.logProduction({
      ...frontendData, 
      userEmployee: employeeNumber,
    });
    res
      .status(201)
      .json({ success: true, message: "Producción registrada con éxito." });
  } catch (error) {
    console.error("Error al registrar la producción:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al registrar la producción." });
  }
}

// Controlador para obtener los logs
async function getLogs(req, res) {
  try {
    const logs = await validationService.getProductionLogs();
    res.json(logs);
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener el historial de producción.",
      });
  }
}

// Controlador para las alertas
async function getAlerts(req, res) {
  try {
    const alerts = await validationService.getMaintenanceAlerts(); 
    res.json(alerts);
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener las alertas de mantenimiento.",
      });
  }
}

// ¡AQUÍ ESTÁ LA CLAVE!
// Exportamos las 4 funciones que 'validation.routes.js' necesita.
module.exports = { 
    handleScan, 
    handleLog,
    getLogs,
    getAlerts 
};