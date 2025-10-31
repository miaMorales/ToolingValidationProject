// src/controllers/label.controller.js
const labelService = require('../services/label.service');

async function generateLabels(req, res) {
    try {
        const selectedTools = req.body.tools;

        if (!selectedTools || !Array.isArray(selectedTools) || selectedTools.length === 0) {
            return res.status(400).json({ message: 'No se seleccionaron herramientas.' });
        }

        // Llamar a la nueva función del servicio
        const excelBuffer = await labelService.generateLabelExcel(selectedTools);

        // Configurar headers para archivo Excel
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="labels.xlsx"'); // Nombre del archivo descargado
        res.send(excelBuffer); // Enviar el buffer

    } catch (error) {
        console.error('Error al generar Excel de etiquetas:', error);
        // Enviar un error JSON si falla la generación
        // Es importante no intentar enviar headers de archivo si ya hubo un error
        if (!res.headersSent) {
             res.status(500).json({ message: error.message || 'Error interno al generar el archivo Excel.' });
        }
    }
}

module.exports = {
    generateLabels
};