const validationService = require('../services/validation.service');

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
        await validationService.logProduction(req.body);
        res.status(201).json({ success: true, message: 'Producción registrada con éxito.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar la producción.' });
    }
}

async function getLogs(req, res) {
    try {
        const logs = await validationService.getProductionLogs();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el historial de producción.' });
    }
}
module.exports = { handleScan, handleLog, getLogs };