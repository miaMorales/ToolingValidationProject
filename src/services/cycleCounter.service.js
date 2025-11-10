const SMB2 = require('smb2');
const pool = require('../db/pool');

// --- CONFIGURACIÓN CORRECTA (SOLO DATOS, SIN CLIENT) ---
const lineConfig = {
    '1': {
        share: '\\\\10.229.21.114\\RemoteBS',
        username: 'Administrator',
        password: 'Password23',
        domain: '.',
        path: '', // Directorio raíz
        lastCount: 0, 
        isChecking: false 
    },
    '2': {
        share: '\\\\10.229.21.149\\RemoteBS',
        username: 'Administrator',
        password: 'Linea2',
        domain: '.',
        path: '',
        lastCount: 0,
        isChecking: false
    },
    '3': {
         share: '\\\\10.229.21.148\\RemoteBS',
         username: 'Administrator',
         password: 'Linea3',
         domain: '.',
         path: '',
        lastCount: 0,
        isChecking: false
    },
    '4': {
         share: '\\\\10.229.21.147\\RemoteBS',
         username: 'Administrator',
         password: 'Linea4',
         domain: '.',
         path: '',
        lastCount: 0,
        isChecking: false
    }
};
// --- FIN DE LA CONFIGURACIÓN ---


// --- (INICIO) FUNCIÓN DE AYUDA (CONECTA/DESCONECTA) ---
async function getRemoteFileCount(config) {
    try {
        // 1. Crear cliente
        const client = new SMB2({
            share: config.share, 
            username: config.username,
            password: config.password,
            domain: config.domain
        });

        // 2. "Promisify" la llamada a readdir
        const files = await new Promise((resolve, reject) => {
            client.readdir(config.path, (err, files) => {
                if (err) {
                    return reject(err);
                }
                resolve(files);
            });
        });

        // 3. Contar los archivos y devolver el número
        const rbsFiles = files.filter(file => file.endsWith('.rbs'));
        return rbsFiles.length;

    } catch (error) {
        throw error; // El error se lanzará y será capturado por pollLine/initializeLineCount
    }
}
// --- (FIN) NUEVA FUNCIÓN DE AYUDA ---


/**
 * Función principal para iniciar el monitoreo.
 */
function startMonitoring() {
    console.log('Iniciando servicio de conteo de ciclos (Modo: Asíncrono)...');

    for (const line in lineConfig) {
        
        // 1. Llama a la inicialización, PERO NO LA ESPERES (fire-and-forget)
        //    Usamos .catch() para que un fallo aquí no "crashee" el servidor.
        initializeLineCount(line).catch(err => {
            console.error(`Fallo crítico en la inicialización de Línea ${line}: ${err.message}`);
        });
        
        // 2. Configura el 'setInterval' INMEDIATAMENTE.
        //    No espera a que la inicialización termine.
        setInterval(() => pollLine(line), 20000); 
    }
}

/**
 * Obtiene el conteo inicial (Usa el ayudante)
 */
async function initializeLineCount(line) {
    try {
        const config = lineConfig[line]; // <-- 'config' ahora es { share: '...', ... }
        const currentCount = await getRemoteFileCount(config); // <-- Y se pasa al ayudante
        
        config.lastCount = currentCount;
        console.log(`Línea ${line}: Conteo inicial de archivos .rbs establecido en ${currentCount}`);
        
    } catch (error) {
        console.error(`Error inicializando Línea ${line}: ${error.message}`);
    }
}

/**
 * Vigila una línea específica (Usa el ayudante)
 */
async function pollLine(line) {
    const config = lineConfig[line];
    if (config.isChecking) {
        return;
    }
    config.isChecking = true;

    try {
        const newCount = await getRemoteFileCount(config); // <-- Usa el ayudante

        if (newCount > config.lastCount) { 
            const piecesMade = newCount - config.lastCount;
            console.log(`Línea ${line}: Se detectaron ${piecesMade} archivos .rbs nuevos (Total: ${newCount})`);
            
            await decrementActiveTools(line, piecesMade);
            
            config.lastCount = newCount;
        }

    } catch (error) {
        console.error(`Error al vigilar Línea ${line}: ${error.message}`);
    }

    config.isChecking = false;
}


/**
 * Actualiza la base de datos (Esta función no cambia)
 */
async function decrementActiveTools(line, piecesToIncrement) {
    const client = await pool.connect();

    async function processTool(toolType, barcode, pieces) {
        if (!barcode) return; 
        let table, col_us, col_max, col_bc;
        switch (toolType) {
            case 'stencil':
                table = 'stencils'; col_us = 'st_current_us'; col_max = 'st_mx_us'; col_bc = 'st_bc';
                break;
            case 'squeegee':
                table = 'squeegees'; col_us = 'sq_current_us'; col_max = 'sq_mx_us'; col_bc = 'sq_bc';
                break;
            case 'plate':
                table = 'plates'; col_us = 'pl_current_us'; col_max = 'pl_mx_us'; col_bc = 'pl_bc';
                break;
            default:
                return;
        }
        const selectQuery = `SELECT ${col_us}, ${col_max} FROM ${table} WHERE ${col_bc} = $1 FOR UPDATE`;
        const res = await client.query(selectQuery, [barcode]);
        if (res.rows.length === 0) {
             console.error(`Herramental ${toolType} con BC ${barcode} no encontrado.`);
             return;
        }
        const old_uses = res.rows[0][col_us] || 0; 
        const max_uses = res.rows[0][col_max];
        const new_uses = old_uses + pieces;
        const updateQuery = `UPDATE ${table} SET ${col_us} = $1 WHERE ${col_bc} = $2`;
        await client.query(updateQuery, [new_uses, barcode]);
        if (max_uses && (old_uses < max_uses) && (new_uses >= max_uses)) {
            console.warn(`ALERTA DE MANTENIMIENTO: ${toolType} ${barcode} ha alcanzado ${new_uses}/${max_uses} usos en línea ${line}.`);
            const alertQuery = `
                INSERT INTO maintenance_alerts 
                (tool_type, tool_barcode, line_number, current_uses_recorded, max_uses_recorded, status)
                VALUES ($1, $2, $3, $4, $5, 'new')
                ON CONFLICT (tool_barcode) WHERE (status = 'new') DO NOTHING;
            `;
            await client.query(alertQuery, [
                toolType, barcode, line, new_uses, max_uses
            ]);
        }
    }

    try {
        const res = await client.query('SELECT * FROM active_tooling WHERE line_number = $1', [line]);
        if (res.rows.length === 0) {
            console.log(`Línea ${line}: No hay herramental activo registrado. Saltando decremento.`);
            return;
        }
        const activeTools = res.rows[0];
        await client.query('BEGIN');
        await processTool('stencil', activeTools.stencil_bc, piecesToIncrement);
        await processTool('squeegee', activeTools.squeegee_f_bc, piecesToIncrement);
        await processTool('squeegee', activeTools.squeegee_r_bc, piecesToIncrement);
        await processTool('squeegee', activeTools.squeegee_y_bc, piecesToIncrement);
        await processTool('plate', activeTools.plate_bc, piecesToIncrement);
        await client.query('COMMIT');
        console.log(`Línea ${line}: Vida de herramental actualizada (+${piecesToIncrement} usos).`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al decrementar vida en Línea ${line}: ${error.message}`);
    } finally {
        client.release();
    }
}

// Exportamos la función que ENCIENDE todo
module.exports = { startMonitoring };