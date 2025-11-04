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
const { 
    verifyToken,          // Verifica que el token sea válido
    adminYTecnico,      // Permite Admin (0) y Tecnico (1)
    todosLogueados        // Permite Admin (0), Tecnico (1) y Operador (2)
} = require('../middleware/auth.middleware');
// ==========================================================
//  NUEVA RUTA: Obtener Pastas
// ==========================================================
// Ruta para obtener datos específicos (ej: pastas)
router.get('/data/pastas',verifyToken,adminYTecnico, getPastas);
// ==========================================================
//  FIN DE LA NUEVA RUTA
// ==========================================================


// Ruta principal (la menos específica)
router.get('/recipes',verifyToken,adminYTecnico, getRecipes);

// Ruta específica para filtrar por línea (va antes de la general con parámetros)
router.get('/recipes/line/:lineNumber',verifyToken,adminYTecnico, getLineRecipes);

// Ruta general para detalles de receta con parámetros
router.get('/recipes/:pn_pcb/:model_side',verifyToken,adminYTecnico, getRecipeDetails);

// Rutas para el CRUD de modelos
router.get('/models/:pn_pcb/:model_side',verifyToken,adminYTecnico, getModelDetails);
router.post('/models', verifyToken,adminYTecnico,createModel);
router.put('/models/:pn_pcb/:model_side',verifyToken,adminYTecnico, updateModelDetails);

module.exports = router;