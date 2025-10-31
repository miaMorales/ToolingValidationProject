// src/services/recipe.service.js
const pool = require('../db/pool');
const qrcode = require('qrcode');

/**
 * Obtiene la lista de todos los modelos distintos, duplicando cada uno
 * para representar el lado TOP y el lado BOT.
 */
async function getRecipeList() {
    const query = 'SELECT DISTINCT model_name, pn_pcb FROM models ORDER BY model_name;';
    const { rows } = await pool.query(query);
    const recipeList = [];
    rows.forEach(model => {
        recipeList.push({ ...model, model_side: 'TOP' });
        recipeList.push({ ...model, model_side: 'BOT' });
    });
    return recipeList;
}

/**
 * Obtiene el herramental compatible para un PN PCB, lado y línea específicos.
 */
async function getRecipeDetails(pn_pcb, model_side, lineNumber) {
    const stencilsQuery = `SELECT st_id, st_bc, st_no_serie, st_ver, thickness, st_status FROM stencils WHERE pn_pcb = $1 AND model_side = $2 AND st_status <> 'BAJA'`;
    const stencilsResult = await pool.query(stencilsQuery, [pn_pcb, model_side]);

    const platesQuery = `SELECT pl_id, pl_bc, pl_no_serie, pl_status FROM plates WHERE pn_pcb = $1 AND model_side = 'BT' AND pl_status <> 'BAJA'`;
    const platesResult = await pool.query(platesQuery, [pn_pcb]);

    let squeegeesQuery = `
        SELECT sq.sq_id, sq.sq_bc, sq.sq_length, sq.sq_status 
        FROM squeegees AS sq
        INNER JOIN models AS m ON sq.sq_length = m.length
        WHERE m.pn_pcb = $1 AND m.model_side = $2 AND sq.sq_status <> 'BAJA'
    `;
    if (lineNumber === '1' || lineNumber === '2') {
        squeegeesQuery += ` AND sq.sq_side IN ('F', 'R')`;
    } else if (lineNumber === '3' || lineNumber === '4') {
        squeegeesQuery += ` AND sq.sq_side = 'Y'`;
    }
    const squeegeesResult = await pool.query(squeegeesQuery, [pn_pcb, model_side]);

    const modelInfoQuery = 'SELECT model_name FROM models WHERE pn_pcb = $1 LIMIT 1';
    const modelInfoResult = await pool.query(modelInfoQuery, [pn_pcb]);

    return {
        model_name: modelInfoResult.rows[0]?.model_name || 'Desconocido',
        pn_pcb: pn_pcb,
        model_side: model_side,
        stencils: stencilsResult.rows,
        plates: platesResult.rows,
        squeegees: squeegeesResult.rows
    };
}

/**
 * Obtiene los detalles de un modelo específico por sus IDs.
 */
async function getModelDetailsByIds(pn_pcb, model_side) {
    const query = 'SELECT model_qr, pasta, length FROM models WHERE pn_pcb = $1 AND model_side = $2';
    const { rows } = await pool.query(query, [pn_pcb, model_side]);
    return rows[0];
}

/**
 * Actualiza los detalles de un modelo por sus IDs.
 */
async function updateModelByIds(pn_pcb, model_side, newData) {
    const { qr, pasta, length } = newData;
    const query = `
        UPDATE models 
        SET model_qr = $1, pasta = $2, length = $3 
        WHERE pn_pcb = $4 AND model_side = $5
    `;
    await pool.query(query, [qr, pasta, length, pn_pcb, model_side]);
    return { success: true };
}

/**
 * Crea un nuevo modelo (TOP, BOT, BT) y asigna líneas de trabajo.
 */
async function createNewModel(modelData) {
    const { model_name, pn_pcb, model_qr, pasta, length, lines } = modelData;
    
    const checkQuery = 'SELECT 1 FROM models WHERE pn_pcb = $1 LIMIT 1';
    const existing = await pool.query(checkQuery, [pn_pcb]);
    if (existing.rows.length > 0) {
        throw new Error('El PN PCB ya existe. No se puede duplicar.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertModelQuery = `
            INSERT INTO models (model_name, pn_pcb, model_side, model_qr, pasta, length) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(insertModelQuery, [model_name, pn_pcb, 'TOP', model_qr, pasta, length]);
        await client.query(insertModelQuery, [model_name, pn_pcb, 'BOT', model_qr, pasta, length]);
        await client.query(insertModelQuery, [model_name, pn_pcb, 'BT', model_qr, pasta, length]);

        const insertWorkLineQuery = `
            INSERT INTO work_line (wl_no, model_name, model_side, run)
            VALUES ($1, $2, $3, 1)
        `;
        for (const lineNumber of lines) {
            await client.query(insertWorkLineQuery, [lineNumber, pn_pcb, 'TOP']);
            await client.query(insertWorkLineQuery, [lineNumber, pn_pcb, 'BOT']);
        }
        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en la transacción de creación:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Obtiene la lista de recetas (modelos) asignadas a una línea específica.
 */
async function getRecipesByLine(lineNumber) {
    const query = `
        SELECT DISTINCT m.pn_pcb, m.model_name 
        FROM models m
        JOIN work_line wl ON m.pn_pcb = wl.model_name
        WHERE wl.wl_no = $1
        ORDER BY m.model_name;
    `;
    const { rows } = await pool.query(query, [lineNumber]);
    const recipeList = [];
    rows.forEach(model => {
        recipeList.push({ ...model, model_side: 'TOP' });
        recipeList.push({ ...model, model_side: 'BOT' });
    });
    return recipeList;
}

// ==========================================================
//  NUEVA FUNCIÓN: Obtener Pastas Distintas
// ==========================================================
/**
 * Obtiene una lista de valores distintos de 'pasta' de la tabla 'models'.
 */
async function getDistinctPastas() {
    const query = `
        SELECT DISTINCT pasta 
        FROM models 
        WHERE pasta IS NOT NULL AND pasta <> '' 
        ORDER BY pasta;
    `;
    const { rows } = await pool.query(query);
    // Devuelve solo los nombres como un array de strings
    return rows.map(row => row.pasta);
}
// ==========================================================
//  FIN DE LA NUEVA FUNCIÓN
// ==========================================================


module.exports = {
    getModelDetailsByIds,
    updateModelByIds,
    getRecipeList,
    getRecipeDetails,
    createNewModel,
    getRecipesByLine,
    getDistinctPastas // Exportar la nueva función
};