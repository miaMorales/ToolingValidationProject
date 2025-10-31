const pool = require('../db/pool');
const qrcode = require('qrcode');

/**
 * Obtiene todos los stencils con datos de tablas relacionadas.
 * Acepta un término de búsqueda para filtrar los resultados.
 */
// Dentro de src/services/stencil.service.js

async function getAllStencils(search = '') {
  let query = `
    SELECT 
      s.st_id, s.st_job, s.supp_name, m.model_name,
      s.pn_pcb, 
      CONCAT(s.st_no_serie, '-', s.st_ver) AS serie,
      s.st_side, s.thickness, s.st_status, s.st_bc, 
      s.st_current_us, s.st_mx_us, s.st_arrived_date
    FROM stencils AS s
    INNER JOIN models AS m ON s.pn_pcb = m.pn_pcb AND s.model_side = m.model_side
    WHERE s.st_status <> 'BAJA'
  `;
  const queryParams = [];

  if (search) {
    query += `
      and s.st_job ILIKE $1 OR CAST(st_id AS TEXT) ILIKE $1 OR s.model_name ILIKE $1
      OR s.pn_pcb ILIKE $1 OR s.st_bc ILIKE $1 OR s.st_status ILIKE $1
    `;
    queryParams.push(`%${search}%`);
  }

  query += ' ORDER BY s.st_id ASC'; 
  
  const { rows } = await pool.query(query, queryParams);
  return rows;
}

/**
 * Crea un nuevo stencil, generando su barcode y QR en una transacción.
 */

/**
 * Obtiene los datos de un solo stencil por su ID.
 */
async function getStencilById(id) {
  const { rows } = await pool.query('SELECT * FROM stencils WHERE st_id = $1', [id]);
  return rows[0];
}

/**
 * Obtiene la imagen QR de un stencil por su ID.
 */
async function getStencilQrById(id) {
    const { rows } = await pool.query('SELECT st_qr FROM stencils WHERE st_id = $1', [id]);
    return rows[0]?.st_qr || null;
}


async function updateStencilAndLogHistory(id, newData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Inicia una transacción

    // 1. Obtenemos el estado actual del stencil ANTES de actualizarlo
    const originalStencilResult = await client.query('SELECT * FROM stencils WHERE st_id = $1', [id]);
    const originalStencil = originalStencilResult.rows[0];

    if (!originalStencil) {
      throw new Error('Stencil no encontrado');
    }

    // 2. Comparamos para ver si necesitamos un registro de historial
    let needsHistoryRecord = false;
    let historyComment = newData.history?.comment || '';
    // 2.1. Revisa si el usuario ENVIÓ un formulario de historial
    // (El frontend solo lo envía si está visible y validado)
    if (newData.history && newData.history.comment) {
        needsHistoryRecord = true;
        historyComment = newData.history.comment; // Usa el comentario del usuario
    }
    // Compara si el status cambió (CORREGIDO: usa st_status)
    if (originalStencil.st_status.trim() !== newData.status.trim()) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? ' ' : '') + `Cambio de status: ${originalStencil.st_status.trim()} -> ${newData.status.trim()}`;

    }

    // Compara si los ciclos actuales cambiaron (CORREGIDO: usa st_current_us)
    if (originalStencil.st_current_us !== parseInt(newData.currentCycles)) {
      needsHistoryRecord = true;
      historyComment += ` Ciclos actualizados: ${originalStencil.st_current_us} -> ${newData.currentCycles}.`;
    }

    // 3. Actualizamos la tabla principal (esto siempre pasa)
    const updateSql = `
      UPDATE stencils 
      SET st_current_us = $1, st_mx_us = $2, st_status = $3 
      WHERE st_id = $4
    `;
    await client.query(updateSql, [newData.currentCycles, newData.maxCycles, newData.status, id]);

    // 4. Si es necesario, guardamos el historial
    if (needsHistoryRecord) {
      const historySql = `
        INSERT INTO stencil_history (stencil_id, st_h_date, st_h_status, st_h_com, st_responsable) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      const responsible = newData.history?.responsible || 'SYS'; // 'SYS' para cambio automático
      const date = newData.history?.date || new Date(); // Usa la fecha del form o la actual

      await client.query(historySql, [id, date, newData.status, historyComment.trim(), responsible]);
    }

    await client.query('COMMIT'); // Confirma todos los cambios
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK'); // Deshace todos los cambios si hay un error
    console.error('Error en la transacción de actualización', error);
    throw error;
  } finally {
    client.release(); // Libera la conexión
  }
}

// src/services/stencil.service.js
// ... existing code

async function getAllHistory() {
  const sql = `
    SELECT 
    sh.st_h_date, 
    sh.stencil_id, 
    s.st_bc, 
    sh.st_h_status,
    sh.st_responsable, 
    sh.st_h_com
FROM 
    stencil_history AS sh
INNER JOIN
    stencils AS s ON sh.stencil_id = s.st_id
    order BY sh.st_h_date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getBajaStencils() {
  const sql = `
    SELECT
    s.st_id,
    s.st_job,
    s.supp_name,
    m.model_name,
    s.pn_pcb,
    CONCAT(s.st_no_serie, '-', s.st_ver) AS serie,
    s.st_side,
    s.thickness,
    s.st_status,
    s.st_bc,
    s.st_current_us,
    s.st_mx_us,
    s.st_arrived_date,
    sh.st_h_date,
    sh.st_responsable,
    sh.st_h_com
FROM
    stencils AS s
INNER JOIN
    models AS m ON s.pn_pcb = m.pn_pcb AND s.model_side = m.model_side
INNER JOIN
    stencil_history AS sh ON s.st_id = sh.stencil_id
WHERE
s.st_status = 'BAJA'
`;
  const { rows } = await pool.query(sql);
  return rows;
}

// Función para obtener todos los proveedores
async function getAllSuppliers() {
  const sql = 'SELECT supp_name FROM suppliers ORDER BY supp_name';
  const { rows } = await pool.query(sql);
  // Devuelve solo los nombres como un arreglo de strings, o el objeto completo si lo necesitas
  return rows.map(row => row.supp_name);
}

// Función para obtener PCBs (model_name) por línea de trabajo
async function getPcbsByWorkline(wl_no) {
  const sql = 'SELECT DISTINCT model_name FROM work_line WHERE wl_no = $1 ORDER BY model_name';
  const { rows } = await pool.query(sql, [wl_no]);
  return rows.map(row => row.model_name);
}

// Función para obtener grosores (thickness) únicos por PCB y lado
async function getThicknessByPcbAndSide(pn_pcb, model_side) {
  const sql = `
    SELECT DISTINCT thickness FROM stencils 
    WHERE pn_pcb = $1 AND model_side = $2 
    ORDER BY thickness;
  `;
  const { rows } = await pool.query(sql, [pn_pcb, model_side]);
  return rows.map(row => row.thickness);
}

// Función para obtener la serie y versión para autocompletado (última serie y siguiente versión)
async function getNextSerieAndVersion(pn_pcb, model_side) {
    const lastSerieQuery = `
        SELECT st_no_serie 
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY st_no_serie DESC 
        LIMIT 1;
    `;
    const lastSerieResult = await pool.query(lastSerieQuery, [pn_pcb, model_side]);
    const lastSerie = lastSerieResult.rows[0]?.st_no_serie || '1.0'; // Valor por defecto si no existe

    const lastVersionQuery = `
        SELECT st_ver 
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2 AND st_no_serie = $3
        ORDER BY st_ver DESC 
        LIMIT 1;
    `;
    const lastVersionResult = await pool.query(lastVersionQuery, [pn_pcb, model_side, lastSerie]);
    const lastVersion = lastVersionResult.rows[0]?.st_ver;

    let nextVersion;
    if (lastVersion) {
        // Lógica para incrementar la letra (A, B, C, ...)
        const charCode = lastVersion.charCodeAt(0);
        nextVersion = String.fromCharCode(charCode + 1);
    } else {
        nextVersion = 'A'; // Primera versión
    }

    return { nextSerie: lastSerie, nextVersion: nextVersion };
}


// --- Lógica de Creación/Registro del Stencil (AJUSTADA) ---
async function createStencil(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 
    const newSupplierName = data.supp_name;
    const insertSupplierSql = `
            INSERT INTO suppliers (supp_name, supp_info)
            VALUES ($1, $2)
            ON CONFLICT (supp_name) DO NOTHING;
        `;
        // Intentamos insertar el nuevo proveedor.
        await client.query(insertSupplierSql, [newSupplierName, 'Registrado desde módulo Plate']);

    // 1. INSERTA los datos iniciales, incluyendo la fecha, y obtén el nuevo ID
    const insertSql = `
      INSERT INTO stencils (
        st_job, supp_name, pn_pcb, model_side, st_no_serie, st_ver, 
        st_side, thickness, st_status, st_current_us, st_mx_us, st_arrived_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OK', $9, $10, $11)
      RETURNING st_id;
    `;
    const insertResult = await client.query(insertSql, [
      data.st_job,
      data.supp_name,
      data.pn_pcb,
      data.model_side,
      data.st_no_serie,
      data.st_ver,
      data.st_side, // st_side debe ser el mismo que model_side (TOP/BOT)
      data.thickness,
      data.current_us,
      data.mx_us,
      data.arrived_date,
    ]);
    const newId = insertResult.rows[0].st_id;

    // 2. GENERA el barcode usando los datos clave
    // Formato sugerido: PN_PCB-LADO-SERIE-VERSION
    const barcode = `${data.pn_pcb}-${data.model_side}-${data.st_no_serie}-${data.st_ver}`;

    // 3. GENERA el buffer de la imagen QR a partir del barcode
    const qrBuffer = await qrcode.toBuffer(barcode);

    // 4. ACTUALIZA el registro recién creado con el barcode y el QR
    const updateSql = `
      UPDATE stencils
      SET st_bc = $1, st_qr = $2
      WHERE st_id = $3;
    `;
    await client.query(updateSql, [barcode, qrBuffer, newId]);

    await client.query('COMMIT'); 
    return { success: true, newId, barcode };
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error("Error al crear el stencil:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obtiene todas las series (st_no_serie) y la próxima versión disponible
 * para el PCB, Lado y Grosor seleccionados.
 */
async function getAllSeriesAndNextVersion(pn_pcb, model_side, thickness) {
    // 1. Obtener la última serie. Ahora que st_no_serie es NUMERIC, la ordenación es correcta.
    const lastSerieQuery = `
        SELECT st_no_serie
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY st_no_serie DESC 
        LIMIT 1;
    `;
    const lastSerieResult = await pool.query(lastSerieQuery, [pn_pcb, model_side]);
    const lastSerieText = lastSerieResult.rows[0]?.st_no_serie;
    
    let nextNewSerie = '1.0';

    if (lastSerieText) {
        // Convertimos el valor (que ahora es seguro) y sumamos 1.0
        const numericValue = parseFloat(lastSerieText);
        if (!isNaN(numericValue)) {
            nextNewSerie = (numericValue + 1.0).toFixed(1).toString();
        }
    }
    
    // 2. Obtener todas las series ÚNICAS existentes para el THICKNESS, PCB y SIDE
    // Estas consultas ya son estables y no necesitan cambios mayores.
    const existingSeriesQuery = `
        SELECT DISTINCT st_no_serie
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2 AND thickness = $3
        ORDER BY st_no_serie ASC;
    `;
    const existingSeriesResult = await pool.query(existingSeriesQuery, [pn_pcb, model_side, thickness]);
    const existingSeries = existingSeriesResult.rows.map(row => row.st_no_serie);

    // 3. Para cada serie existente, encontrar la última versión alfabética usada (A, B, C...)
    const seriesData = [];
    for (const serie of existingSeries) {
        const lastVersionQuery = `
            SELECT st_ver 
            FROM stencils 
            WHERE pn_pcb = $1 AND model_side = $2 AND thickness = $3 AND st_no_serie = $4
            ORDER BY st_ver DESC 
            LIMIT 1;
        `;
        const lastVersionResult = await pool.query(lastVersionQuery, [pn_pcb, model_side, thickness, serie]);
        const lastVersion = lastVersionResult.rows[0]?.st_ver;
        
        let nextVersion;
        if (lastVersion) {
            const charCode = lastVersion.toUpperCase().charCodeAt(0);
            nextVersion = String.fromCharCode(charCode + 1);
        } else {
            nextVersion = 'A'; 
        }

        seriesData.push({ 
            serie: serie, 
            nextVersion: nextVersion,
            lastVersion: lastVersion
        });
    }

    return { 
        nextNewSerie: nextNewSerie, 
        seriesData: seriesData 
    };
}
module.exports = {
  getAllSuppliers,
    getPcbsByWorkline,
    getThicknessByPcbAndSide,
    getNextSerieAndVersion,
    createStencil, // Asegúrate de que esta esté en el módulo
    getAllStencils,
    getStencilById,
    getStencilQrById,
    updateStencilAndLogHistory,
    getAllHistory, // Add the new function
    getBajaStencils, // Export the new function
    getAllSeriesAndNextVersion
};
