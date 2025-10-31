// src/routes/recipe.routes.js
const express = require('express');
const router = express.Router();
const {
    getRecipes,
    getRecipeDetails,
    getModelDetails,
    updateModelDetails,
    createModel,
    getLineRecipes,
    getPastas // Importar el nuevo controlador
} = require('../controllers/recipe.controller');

// ==========================================================
//  NUEVA RUTA: Obtener Pastas
// ==========================================================
// Ruta para obtener datos específicos (ej: pastas)
router.get('/data/pastas', getPastas);
// ==========================================================
//  FIN DE LA NUEVA RUTA
// ==========================================================


// Ruta principal (la menos específica)
router.get('/recipes', getRecipes);

// Ruta específica para filtrar por línea (va antes de la general con parámetros)
router.get('/recipes/line/:lineNumber', getLineRecipes);

// Ruta general para detalles de receta con parámetros
router.get('/recipes/:pn_pcb/:model_side', getRecipeDetails);

// Rutas para el CRUD de modelos
router.get('/models/:pn_pcb/:model_side', getModelDetails);
router.post('/models', createModel);
router.put('/models/:pn_pcb/:model_side', updateModelDetails);

module.exports = router;