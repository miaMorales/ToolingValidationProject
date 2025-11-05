// src/services/squeegee.service.js
const pool = require('../db/pool');
const qrcode = require('qrcode');

// --- Funciones de Lectura General ---

async function getAllSqueegees(search = '') {
  let dataQuery = `
    SELECT 
      sq_id, sq_length, sq_side, sq_status, sq_bc, 
      sq_current_us, sq_mx_us, sq_arrived_date 
    FROM squeegees
    WHERE sq_status <> 'BAJA'
  `;
  const queryParams = [];
  
  if (search) {
    dataQuery += `
      AND (
        CAST(sq_id AS TEXT) ILIKE $1 OR
        sq_side ILIKE $1 OR 
        sq_status ILIKE $1 OR 
        sq_bc ILIKE $1 OR
        CAST(sq_length AS TEXT) ILIKE $1
      )
    `;
    queryParams.push(`%${search}%`);
  }

  dataQuery += ' ORDER BY sq_id ASC';
  
  const { rows } = await pool.query(dataQuery, queryParams);
  return rows;
}

async function getSqueegeeById(id) {
  const sql = 'SELECT * FROM squeegees WHERE sq_id = $1';
  const { rows } = await pool.query(sql, [id]);
  return rows[0];
}

async function getSqueegeeQrById(id) {
  const sql = 'SELECT sq_qr FROM squeegees WHERE sq_id = $1';
  const { rows } = await pool.query(sql, [id]);
  return rows[0]?.sq_qr || null;
}

// --- Historial y Baja ---

async function getAllHistory() {
  const sql = `
    SELECT 
    sh.sq_h_date, 
    sh.squeegee_id, 
    s.sq_bc, 
    sh.sq_h_status,
    sh.sq_responsable, 
    sh.sq_h_com
FROM 
    squeegee_history AS sh
INNER JOIN
    squeegees AS s ON sh.squeegee_id = s.sq_id
ORDER BY sh.sq_h_date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getBajaSqueegees() {
  const sql = `
    SELECT
        s.sq_id, s.sq_length, s.sq_side, s.sq_status, s.sq_bc, 
        s.sq_current_us, s.sq_mx_us, s.sq_arrived_date,
        sh.sq_h_date AS sq_baja_date,
        sh.sq_responsable,
        sh.sq_h_com
    FROM
        squeegees AS s
    INNER JOIN
        squeegee_history AS sh ON s.sq_id = sh.squeegee_id
    WHERE
        s.sq_status = 'BAJA' AND sh.sq_h_status = 'BAJA'
    ORDER BY sh.sq_h_date DESC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

// --- Edición y Log ---

// --- Edición y Log ---

async function updateSqueegeeAndLogHistory(id, newData, user) { // <-- 1. Se añade 'user'
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const originalSqueegeeResult = await client.query('SELECT * FROM squeegees WHERE sq_id = $1', [id]);
    const originalSqueegee = originalSqueegeeResult.rows[0];

    if (!originalSqueegee) throw new Error('Squeegee no encontrado');

    // ====================================================================
    //  CAMBIO EN LÓGICA DE HISTORIAL (Lógica de Responsable Corregida)
    // ====================================================================
    let needsHistoryRecord = false;
    let historyComment = ''; // Inicia vacío

    // --- 1. Definir las variables de cambio PRIMERO ---
    // (Usando los nombres de columna de squeegee: sq_status, sq_current_us)
    const statusChanged = originalSqueegee.sq_status.trim() !== newData.status.trim();
    const cyclesChanged = originalSqueegee.sq_current_us !== parseInt(newData.currentCycles);
    const manualCommentAdded = newData.history && newData.history.comment; //

    // --- 2. Construir el comentario y determinar si se necesita historial ---
    if (manualCommentAdded) {
        needsHistoryRecord = true;
        historyComment = newData.history.comment; // Usa el comentario del usuario
    }

    if (statusChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? ' ' : '') + `(Cambio de status: ${originalSqueegee.sq_status.trim()} -> ${newData.status.trim()})`; //
    }

    if (cyclesChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? ' ' : '') + `(Ciclos actualizados: ${originalSqueegee.sq_current_us} -> ${newData.currentCycles})`; //
    }
    // ====================================================================
    //  FIN DEL CAMBIO
    // ====================================================================

    const updateSql = `
      UPDATE squeegees 
      SET sq_current_us = $1, sq_mx_us = $2, sq_status = $3 
      WHERE sq_id = $4
    `;
    await client.query(updateSql, [newData.currentCycles, newData.maxCycles, newData.status, id]); //

    if (needsHistoryRecord) { //
      const historySql = `
        INSERT INTO squeegee_history (squeegee_id, sq_h_date, sq_h_status, sq_h_com, sq_responsable) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      // ====================================================================
      //  LÓGICA DE RESPONSABLE (La parte importante)
      // ====================================================================
      let responsible;

      // REGLA 1: Si SÓLO cambiaron los ciclos (y no el status, y no hubo comentario manual)
      if (cyclesChanged && !statusChanged && !manualCommentAdded) {
          // ¡Ajusta 'user.no_empleado' a tu campo de token real!
          responsible = user?.no_employee || "SYS_CYC"; // Fallback si el user no está
      } else {
          // REGLA 2: Para CUALQUIER OTRA combinación (status, comentario, o ambos)
          responsible = newData.history?.responsible || "SYS_MAN"; //
      }
      // ====================================================================
      //  FIN DE LÓGICA DE RESPONSABLE
      // ====================================================================

      const date = newData.history?.date || new Date(); //

      // Usa el historyComment actualizado
      await client.query(historySql, [id, date, newData.status, historyComment.trim(), responsible]); //
    }

    await client.query('COMMIT'); 
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Error en la transacción de actualización', error);
    throw error;
  } finally {
    client.release();
  }
}

// --- Registro (Create) ---

async function createSqueegee(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 

    // 1. INSERTA los datos iniciales
    const insertSql = `
      INSERT INTO squeegees (sq_length, sq_side, sq_status, sq_current_us, sq_mx_us, sq_arrived_date)
      VALUES ($1, $2, 'OK', $3, $4, $5)
      RETURNING sq_id;
    `;
    const insertResult = await client.query(insertSql, [
      data.length,
      data.side,
      data.currentCycles,
      data.maxCycles,
      data.arrivedDate,
    ]);
    const newId = insertResult.rows[0].sq_id;

    // 2. GENERA el barcode y QR
    const barcode = `S-${newId}-${data.length}-${data.side}`;
    const qrBuffer = await qrcode.toBuffer(barcode);

    // 3. ACTUALIZA el registro con el barcode y el QR
    const updateSql = `
      UPDATE squeegees
      SET sq_bc = $1, sq_qr = $2
      WHERE sq_id = $3;
    `;
    await client.query(updateSql, [barcode, qrBuffer, newId]);

    await client.query('COMMIT'); 
    return { success: true, newId, barcode };
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error("Error al crear el squeegee:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllSqueegees,
  getSqueegeeQrById,
  getSqueegeeById,
  updateSqueegeeAndLogHistory,
  getAllHistory,
  createSqueegee,
  getBajaSqueegees,
};