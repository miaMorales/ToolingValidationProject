const { exec } = require('child_process');
const util = require('util');
const pool = require('../db/pool');
const execPromise = util.promisify(exec);

// CONFIGURACIÓN DE LÍNEAS
const lineConfig = {
    '1': {
        path: '\\\\10.229.21.114\\RemoteBS',
        username: 'Administrator',
        password: 'Password23',
        lastFileName: null, 
        pendingSqueegee: 0, 
        isChecking: false
    },
    '2': {
        path: '\\\\10.229.21.149\\RemoteBS',
        username: 'Administrator',
        password: 'Linea2',
        lastFileName: null,
        pendingSqueegee: 0,
        isChecking: false
    },
    '3': {
        path: '\\\\10.229.21.148\\RemoteBS',
        username: 'Administrator',
        password: 'Linea3',
        lastFileName: null,
        pendingSqueegee: 0,
        isChecking: false
    },
    '4': {
        path: '\\\\10.229.21.147\\RemoteBS',
        username: 'Administrator',
        password: 'Linea4',
        lastFileName: null,
        pendingSqueegee: 0,
        isChecking: false
    }
};

// --- CONEXIÓN NATIVA WINDOWS ---
async function connectToShare(line) {
    const config = lineConfig[line];
    const deleteCmd = `net use "${config.path}" /delete /y`;
    const connectCmd = `net use "${config.path}" "${config.password}" /user:"${config.username}"`;

    try {
        await execPromise(deleteCmd).catch(() => {}); 
        await execPromise(connectCmd);
        console.log(`✅ [Línea ${line}] Conexión establecida.`);
    } catch (error) {
        if (!error.message.includes('1219')) {
            console.error(`⚠️ [Línea ${line}] Error conectando: ${error.message}`);
        }
    }
}

// --- OBTENER ARCHIVO POR FECHA (DIR /O-D) ---
async function getLatestFileByDate(line) {
    const config = lineConfig[line];
    const cmd = `dir "${config.path}\\*.rbs" /B /A-D /O-D`;

    try {
        const { stdout } = await execPromise(cmd);
        const files = stdout.split(/\r\n|\n|\r/).filter(f => f.trim() !== '');
        if (files.length === 0) return null;
        return files[0].trim(); 
    } catch (error) {
        console.error(`⚠️ [Línea ${line}] Error leyendo carpeta. Reintentando conexión...`);
        await connectToShare(line);
        return null;
    }
}

// --- INICIO DEL SERVICIO ---
function startMonitoring() {
    console.log('=== SISTEMA DE CONTEO Y ALERTAS DB (40K) INICIADO ===');
    const lines = Object.keys(lineConfig);
    const interval = 15000; 
    const stagger = 3000;   

    lines.forEach((line, index) => {
        setTimeout(async () => {
            await connectToShare(line);
            initializeLine(line);
        }, index * 2000);

        setTimeout(() => {
            setInterval(() => pollLine(line), interval);
        }, index * stagger);
    });
}

async function initializeLine(line) {
    const latestFile = await getLatestFileByDate(line);
    if (latestFile) {
        lineConfig[line].lastFileName = latestFile;
        console.log(`✅ [INIT] Línea ${line}: Listo. Archivo base: ${latestFile}`);
    } else {
        console.log(`⚠️ [INIT] Línea ${line}: Esperando archivos...`);
    }
}

async function pollLine(line) {
    const config = lineConfig[line];
    if (config.isChecking) return;
    config.isChecking = true;

    try {
        const latestFile = await getLatestFileByDate(line);

        if (!latestFile) {
            config.isChecking = false;
            return;
        }
        if (!config.lastFileName) {
            config.lastFileName = latestFile;
            config.isChecking = false;
            return;
        }

        if (latestFile !== config.lastFileName) {
            console.log(`🚀 [Línea ${line}] NUEVA PIEZA DETECTADA (${latestFile})`);
            await decrementActiveTools(line, 1);
            config.lastFileName = latestFile;
        } 

    } catch (error) {
        console.error(`⚠️ [ERROR CICLO] Línea ${line}: ${error.message}`);
    }
    config.isChecking = false;
}

// --- LÓGICA DE DB + ALERTA 40K ---
async function decrementActiveTools(line, piecesDetected) {
    const client = await pool.connect();
    const config = lineConfig[line];
    const standardDecrement = piecesDetected;
    let squeegeeDecrement = 0;

    // Cálculo de Squeegee (2:1 en L1/L2, 1:1 en L3/L4)
    if (line === '3' || line === '4') {
        squeegeeDecrement = piecesDetected;
    } else {
        config.pendingSqueegee += piecesDetected;
        squeegeeDecrement = Math.floor(config.pendingSqueegee / 2);
        config.pendingSqueegee = config.pendingSqueegee % 2;
    }

    async function processTool(toolType, barcode, piecesToSubtract) {
        if (!barcode || piecesToSubtract <= 0) return;

        let table, col_us, col_max, col_bc;
        switch (toolType) {
            case 'stencil': table = 'stencils'; col_us = 'st_current_us'; col_max = 'st_mx_us'; col_bc = 'st_bc'; break;
            case 'squeegee': table = 'squeegees'; col_us = 'sq_current_us'; col_max = 'sq_mx_us'; col_bc = 'sq_bc'; break;
            case 'plate': table = 'plates'; col_us = 'pl_current_us'; col_max = 'pl_mx_us'; col_bc = 'pl_bc'; break;
            default: return;
        }

        // 1. Actualizamos la vida del herramental
        const updateQuery = `UPDATE ${table} SET ${col_us} = ${col_us} + $1 WHERE ${col_bc} = $2 RETURNING ${col_us}, ${col_max}`;
        const res = await client.query(updateQuery, [piecesToSubtract, barcode]);
        
        if (res.rows.length > 0) {
            const { [col_us]: current, [col_max]: max } = res.rows[0];
            console.log(`   📉 [UPDATE] ${toolType.toUpperCase()} (${barcode}): ${current}/${max}`);

            // --- AQUÍ ESTÁ LA LÓGICA DE LA ALERTA ---
            const LIMIT_40K = 40000;
            const previousUses = current - piecesToSubtract;

            // Definimos si debemos lanzar alerta (Flag)
            let triggerAlert = false;

            // CASO 1: Llegamos a 40,000 usos (o lo acabamos de pasar)
            if (previousUses < LIMIT_40K && current >= LIMIT_40K) {
                console.log(`   ⚠️ [ALERTA] ${barcode} llegó a 40k usos. Registrando en DB...`);
                triggerAlert = true;
            }

            // CASO 2: Llegamos al Máximo definido en la tabla (si existe)
            if (max && current >= max && previousUses < max) {
                console.log(`   ⚠️ [ALERTA] ${barcode} llegó a su vida máxima (${max}). Registrando en DB...`);
                triggerAlert = true;
            }

            // Si se cumplió alguna condición, insertamos en la tabla 'maintenance_alerts'
            if (triggerAlert) {
                const alertQuery = `
                    INSERT INTO maintenance_alerts 
                    (tool_type, tool_barcode, line_number, current_uses_recorded, max_uses_recorded, status, alert_timestamp)
                    VALUES ($1, $2, $3, $4, $5, 'new', CURRENT_TIMESTAMP)
                    ON CONFLICT (tool_barcode) WHERE (status = 'new') DO NOTHING;
                `;
                // NOTA: El 'ON CONFLICT' evita que se llene de alertas repetidas si nadie atiende la primera
                await client.query(alertQuery, [toolType, barcode, line, current, max || 0]);
            }
        }
    }

    try {
        const res = await client.query('SELECT * FROM active_tooling WHERE line_number = $1', [line]);
        if (res.rows.length === 0) return;
        const activeTools = res.rows[0];
        
        await client.query('BEGIN');
        await processTool('stencil', activeTools.stencil_bc, standardDecrement);
        await processTool('plate', activeTools.plate_bc, standardDecrement);
        await processTool('squeegee', activeTools.squeegee_f_bc, squeegeeDecrement);
        await processTool('squeegee', activeTools.squeegee_r_bc, squeegeeDecrement);
        await processTool('squeegee', activeTools.squeegee_y_bc, squeegeeDecrement);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error DB: ${error.message}`);
    } finally {
        client.release();
    }
}

module.exports = { startMonitoring };