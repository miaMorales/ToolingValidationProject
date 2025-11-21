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
    const employeeNumber = req.user.no_employee; 
    
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

// --- (NUEVO) Controlador para verificar pasta aleatoria ---
async function checkPasta(req, res) {
  try {
    // 1. Recibimos solo la línea y el barcode del frontend
    const { line, barcode } = req.body;
    
    // 2. CAMBIO AQUÍ: Obtenemos el número de empleado del token de sesión
    // El middleware 'verifyToken' ya decodificó el token y puso los datos en req.user
    const employeeNumber = req.user.no_employee; 

    // 3. Pasamos el employeeNumber como tercer argumento (en lugar de 'Operador')
    const result = await validationService.verifyPastaLog(line, barcode, employeeNumber);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Error verificando pasta:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
}

// Exportamos las 5 funciones (incluyendo checkPasta)
module.exports = { 
    handleScan, 
    handleLog,
    getLogs,
    getAlerts,
    checkPasta // <--- ¡AGREGADO!
};