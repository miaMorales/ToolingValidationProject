const validationService = require("../services/validation.service");

async function handleScan(req, res) {
  try {
    const { step, barcode, context } = req.body;
    const result = await validationService.validateScan(step, barcode, context);
    res.json(result);
  } catch (error) {
    // Usamos status 400 (Bad Request) para errores de validación claros
    res.status(400).json({ success: false, message: error.message });
  }
}

async function handleLog(req, res) {
  try {
    // 1. Obtenemos los datos del frontend (lo que mandaste)
    const frontendData = req.body;

    // 2. Obtenemos el ID del usuario del TOKEN (¡Esto es seguro!)
    //    (El middleware 'verifyToken' ya puso 'req.user' aquí)
    const employeeNumber = req.user.no_employee;

    // 3. Pasamos AMBOS datos al servicio
    //    (Añadimos el employeeNumber a los datos)
    await validationService.logProduction({
      ...frontendData, // Esto copia: line, context, barcodes
      userEmployee: employeeNumber, // <-- ¡Aquí va el dato seguro!
    });

    res
      .status(201)
      .json({ success: true, message: "Producción registrada con éxito." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error al registrar la producción." });
  }
}

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
module.exports = { handleScan, handleLog, getLogs };
