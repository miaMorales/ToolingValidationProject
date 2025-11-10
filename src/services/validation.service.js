const pool = require('../db/pool');

async function validateScan(step, barcode, context) {
    let query, params;
    
    // Validación del Stencil (sin cambios)
    if (step === 'stencil') {
        query = 'SELECT pn_pcb, model_side, st_status FROM stencils WHERE st_bc = $1';
        params = [barcode];
        const { rows } = await pool.query(query, params);
        const item = rows[0];
        if (!item) throw new Error('Stencil no encontrado.');
        if (item.st_status !== 'OK') throw new Error(`El status del Stencil es ${item.st_status}, se requiere "OK".`);
        return { success: true, nextContext: { pn_pcb: item.pn_pcb, model_side: item.model_side } };
    }

    if (!context || !context.pn_pcb || !context.model_side) {
        throw new Error('Contexto inválido. Escanee un stencil primero.');
    }

    const modelQuery = 'SELECT length, pasta FROM models WHERE pn_pcb = $1 AND model_side = $2';
    const modelResult = await pool.query(modelQuery, [context.pn_pcb, context.model_side]);
    const model = modelResult.rows[0];
    if (!model) throw new Error('Receta no encontrada para el modelo y lado correspondientes.');

    switch (step) {
        case 'squeegee_f':
        case 'squeegee_r':
        case 'squeegee_y':
            // Lógica de Squeegee (sin cambios)
            query = 'SELECT sq_length, sq_status, sq_side FROM squeegees WHERE sq_bc = $1';
            const { rows: squeegeeRows } = await pool.query(query, [barcode]);
            const squeegee = squeegeeRows[0];
            if (!squeegee) throw new Error('Squeegee no encontrado.');
            if (squeegee.sq_status !== 'OK') throw new Error(`El status del Squeegee es ${squeegee.sq_status}, se requiere "OK".`);
            if (squeegee.sq_length !== model.length) throw new Error(`Largo de Squeegee incorrecto. Requerido: ${model.length}, Escaneado: ${squeegee.sq_length}.`);
            if (step === 'squeegee_f' && squeegee.sq_side !== 'F') throw new Error('Se requiere un Squeegee lado F.');
            if (step === 'squeegee_r' && squeegee.sq_side !== 'R') throw new Error('Se requiere un Squeegee lado R.');
            if (step === 'squeegee_y' && squeegee.sq_side !== 'Y') throw new Error('Se requiere un Squeegee lado Y.');
            return { success: true };

        case 'plate':
            // Lógica de Plate (sin cambios)
            query = 'SELECT pn_pcb, pl_status FROM plates WHERE pl_bc = $1';
            const { rows: plateRows } = await pool.query(query, [barcode]);
            const plate = plateRows[0];
            if (!plate) throw new Error('Plate no encontrado.');
            if (plate.pl_status !== 'OK') throw new Error(`El status del Plate es ${plate.pl_status}, se requiere "OK".`);
            if (plate.pn_pcb !== context.pn_pcb) throw new Error(`PN de Plate incorrecto. Requerido: ${context.pn_pcb}, Escaneado: ${plate.pn_pcb}.`);
            return { success: true };
            
        // --- LÓGICA MODIFICADA PARA EXTRAER VALOR DE PASTA ---
        case 'pasta':
            if (!barcode) {
                throw new Error('No se escaneó el barcode de la pasta.');
            }

            // 1. Dividimos el barcode escaneado por la coma
            const parts = barcode.split(',');

            // 2. Verificamos que el formato sea correcto (al menos dos partes)
            if (parts.length < 2) {
                throw new Error(`Formato de pasta escaneada incorrecto. Se esperaba un formato con comas, pero se recibió "${barcode}".`);
            }

            // 3. Extraemos la segunda parte, que es la que nos interesa
            const extractedPastaValue = parts[1].trim(); // .trim() quita espacios accidentales

            // 4. Comparamos la parte extraída con el valor exacto de la receta
            if (extractedPastaValue !== model.pasta) {
                throw new Error(`Pasta incorrecta. Requerida: ${model.pasta}, Valor extraído del escaneo: ${extractedPastaValue}.`);
            }
            
            return { success: true };
        // --- FIN DE LA MODIFICACIÓN ---
            
        default:
            throw new Error('Paso de validación desconocido.');
    }
}

async function logProduction(logData) {
    // 1. Descomponemos los datos que nos pasó el CONTROLLER
    //    'user' (el inseguro) ya no existe, ahora tenemos 'userEmployee'
    const { line, context, barcodes, userEmployee } = logData; 
    
    const { pn_pcb, model_side } = context;

    // ... (la lógica para buscar model_name no cambia) ...
    const modelNameQuery = 'SELECT model_name FROM models WHERE pn_pcb = $1 LIMIT 1';
    const modelNameResult = await pool.query(modelNameQuery, [pn_pcb]);
    const model_name = modelNameResult.rows[0]?.model_name || 'N/A';
    const client = await pool.connect();
    // 2. Modificamos la consulta para usar el dato nuevo
    const query = `
        INSERT INTO production_log 
        (line_number, pn_pcb, model_name, model_side, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, pasta_lot, username)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    try {
        // Iniciar transacción
        await client.query('BEGIN');

        // 1. Insertar en el log de producción (tu código original)
        const logQuery = `
            INSERT INTO production_log 
            (line_number, pn_pcb, model_name, model_side, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, pasta_lot, username)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        const logParams = [
            line,
            pn_pcb,
            model_name,
            model_side,
            barcodes.stencil,
            barcodes.squeegee_f || null,
            barcodes.squeegee_r || null,
            barcodes.squeegee_y || null,
            barcodes.plate,
            barcodes.pasta,
            userEmployee
        ];
        await client.query(logQuery, logParams);

        // 2. Actualizar la tabla 'active_tooling'
        // Esto "intercambia" el herramental activo por el nuevo que acabas de validar
        const activeToolingQuery = `
            INSERT INTO active_tooling 
            (line_number, stencil_bc, squeegee_f_bc, squeegee_r_bc, squeegee_y_bc, plate_bc, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (line_number) DO UPDATE SET
                stencil_bc = EXCLUDED.stencil_bc,
                squeegee_f_bc = EXCLUDED.squeegee_f_bc,
                squeegee_r_bc = EXCLUDED.squeegee_r_bc,
                squeegee_y_bc = EXCLUDED.squeegee_y_bc,
                plate_bc = EXCLUDED.plate_bc,
                last_updated = CURRENT_TIMESTAMP;
        `;
        const activeToolingParams = [
            line,
            barcodes.stencil,
            barcodes.squeegee_f || null,
            barcodes.squeegee_r || null,
            barcodes.squeegee_y || null,
            barcodes.plate
        ];
        await client.query(activeToolingQuery, activeToolingParams);

        // Confirmar transacción
        await client.query('COMMIT');

    } catch (e) {
        // Si algo falla, deshacer todo
        await client.query('ROLLBACK');
        throw e; // Re-lanza el error para que el controller lo atrape
    } finally {
        // Liberar el cliente de vuelta a la pool
        client.release();
    }
    // --- (FIN) CÓDIGO AÑADIDO ---

    // (La lógica original de 'pool.query' se movió adentro de la transacción)
    // Ya no necesitamos 'return { success: true }' aquí si el 'catch' maneja los errores.
    // O déjalo si tu controller lo espera
    return { success: true };
}

async function getProductionLogs() {
    const query = `
        SELECT * FROM production_log
        ORDER BY log_timestamp DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
}

module.exports = { validateScan, logProduction, getProductionLogs };