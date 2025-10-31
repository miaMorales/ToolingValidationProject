// src/controllers/recipe.controller.js
const recipeService = require('../services/recipe.service');
// No es necesario importar createNewModel aquí si ya está en recipeService
// No es necesario importar getModelDetailsByIds, updateModelByIds si ya están en recipeService

/**
 * Controlador para obtener la lista de todas las "recetas" (modelos).
 */
async function getRecipes(req, res) {
    try {
        const recipes = await recipeService.getRecipeList();
        res.json(recipes);
    } catch (error) {
        console.error('Error al obtener la lista de recetas:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

/**
 * Controlador para obtener el detalle de una receta específica.
 */
async function getRecipeDetails(req, res) {
    try {
        const { pn_pcb, model_side } = req.params;
        const { line } = req.query; // Obtenemos 'line' de los query parameters (ej: ?line=1)
        const details = await recipeService.getRecipeDetails(pn_pcb, model_side, line);
        res.json(details);
    } catch (error) {
        console.error('Error al obtener los detalles de la receta:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

/**
 * Controlador para OBTENER los detalles de un modelo.
 */
async function getModelDetails(req, res) {
    try {
        const { pn_pcb, model_side } = req.params;
        const model = await recipeService.getModelDetailsByIds(pn_pcb, model_side); // Llama al servicio
        if (!model) {
            return res.status(404).json({ message: 'Modelo no encontrado' });
        }
        res.json(model);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al obtener detalles del modelo' });
    }
}

/**
 * Controlador para ACTUALIZAR los detalles de un modelo.
 */
async function updateModelDetails(req, res) {
    try {
        const { pn_pcb, model_side } = req.params;
        const dataToUpdate = req.body;
        const result = await recipeService.updateModelByIds(pn_pcb, model_side, dataToUpdate); // Llama al servicio
        res.json({ success: true, message: 'Modelo actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el modelo' });
    }
}

/**
 * Controlador para CREAR un nuevo modelo.
 */
async function createModel(req, res) {
    try {
        const modelData = req.body;
        await recipeService.createNewModel(modelData);
        res.status(201).json({ success: true, message: 'Modelo creado exitosamente.' });
    } catch (error) {
        // Captura el error específico de 'PN PCB ya existe'
        if (error.message === 'El PN PCB ya existe. No se puede duplicar.') {
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        res.status(500).json({ message: 'Error en el servidor al crear el modelo.' });
    }
}

/**
 * Controlador para obtener las recetas de una línea específica.
 */
async function getLineRecipes(req, res) {
    try {
        const { lineNumber } = req.params;
        const recipes = await recipeService.getRecipesByLine(lineNumber);
        res.json(recipes);
    } catch (error) {
        console.error(`Error al obtener recetas para la línea ${req.params.lineNumber}:`, error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

// ==========================================================
//  NUEVO CONTROLADOR: Obtener Pastas
// ==========================================================
/**
 * Controlador para obtener la lista de pastas distintas.
 */
async function getPastas(req, res) {
    try {
        const pastas = await recipeService.getDistinctPastas();
        res.json(pastas);
    } catch (error) {
        console.error('Error al obtener la lista de pastas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener pastas' });
    }
}
// ==========================================================
//  FIN DEL NUEVO CONTROLADOR
// ==========================================================


module.exports = {
    getRecipes,
    getRecipeDetails,
    getModelDetails,
    updateModelDetails,
    createModel,
    getLineRecipes,
    getPastas // Exportar el nuevo controlador
};