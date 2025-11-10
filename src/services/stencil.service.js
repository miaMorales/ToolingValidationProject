const pool = require("../db/pool");
const qrcode = require("qrcode");

async function getAllStencils(search = "") {
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

  query += " ORDER BY s.st_id ASC";

  const { rows } = await pool.query(query, queryParams);
  return rows;
}

async function getStencilById(id) {
  const { rows } = await pool.query("SELECT * FROM stencils WHERE st_id = $1", [
    id,
  ]);
  return rows[0];
}

async function getStencilQrById(id) {
  const { rows } = await pool.query(
    "SELECT st_qr FROM stencils WHERE st_id = $1",
    [id]
  );
  return rows[0]?.st_qr || null;
}

async function updateStencilAndLogHistory(id, newData, user) { // <-- 1. Se añade 'user'
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const originalStencilResult = await client.query('SELECT * FROM stencils WHERE st_id = $1', [id]);
    const originalStencil = originalStencilResult.rows[0];

    if (!originalStencil) throw new Error('Stencil no encontrado');

    // ====================================================================
    //  CAMBIO EN LÓGICA DE HISTORIAL (Lógica de Responsable Corregida)
    // ====================================================================
    let needsHistoryRecord = false;
    let historyComment = ''; // Inicia vacío

    // --- 1. Definir las variables de cambio PRIMERO ---
    // (Usando los nombres de columna de stencil: st_status, st_current_us)
    const statusChanged = originalStencil.st_status.trim() !== newData.status.trim();
    const cyclesChanged = originalStencil.st_current_us !== parseInt(newData.currentCycles);
    const manualCommentAdded = newData.history && newData.history.comment;

    // --- 2. Construir el comentario y determinar si se necesita historial ---
    if (manualCommentAdded) {
        needsHistoryRecord = true;
        historyComment = newData.history.comment; // Usa el comentario del usuario
    }

    if (statusChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? ' ' : '') + `(Cambio de status: ${originalStencil.st_status.trim()} -> ${newData.status.trim()})`;
    }

    if (cyclesChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? ' ' : '') + `(Ciclos actualizados: ${originalStencil.st_current_us} -> ${newData.currentCycles})`;
    }
    // ====================================================================
    //  FIN DEL CAMBIO
    // ====================================================================

    const updateSql = `
      UPDATE stencils 
      SET st_current_us = $1, st_mx_us = $2, st_status = $3 
      WHERE st_id = $4
    `;
    await client.query(updateSql, [newData.currentCycles, newData.maxCycles, newData.status, id]);

    if (needsHistoryRecord) {
      const historySql = `
        INSERT INTO stencil_history (stencil_id, st_h_date, st_h_status, st_h_com, st_responsable) 
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
          responsible = newData.history?.responsible || "SYS_MAN";
      }
      // ====================================================================
      //  FIN DE LÓGICA DE RESPONSABLE
      // ====================================================================

      const date = newData.history?.date || new Date();

      // Usa el historyComment actualizado
      await client.query(historySql, [id, date, newData.status, historyComment.trim(), responsible]);
    }

    await client.query('COMMIT'); 
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Error en la transacción de actualización de stencil', error);
    throw error;
  } finally {
    client.release();
  }
}

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
    CONCAT(s.st_no_serie, 'Error en la transacción de actualización', s.st_ver) AS serie,
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
s.st_status = '-'
`;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getAllSuppliers() {
  const sql = "SELECT supp_name FROM suppliers ORDER BY supp_name";;
  const { rows } = await pool.query(sql);

  return rows.map((row) => row.supp_name);
}

async function getPcbsByWorkline(wl_no) {

  const sql = "SELECT DISTINCT model_name FROM work_line WHERE wl_no = $1 ORDER BY model_name";
 
  const { rows } = await pool.query(sql, [wl_no]); 

  return rows.map((row) => row.model_name); 
}

async function getThicknessByPcbAndSide(pn_pcb, model_side) {
  const sql = `
    SELECT DISTINCT thickness FROM stencils 
    WHERE pn_pcb = $1 AND model_side = $2 
    ORDER BY thickness;
  `;
  const { rows } = await pool.query(sql, [pn_pcb, model_side]);
  return rows.map((row) => row.thickness);
}

async function getNextSerieAndVersion(pn_pcb, model_side) {
  const lastSerieQuery = `
        SELECT st_no_serie 
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY st_no_serie DESC 
        LIMIT 1;
    `;
  const lastSerieResult = await pool.query(lastSerieQuery, [
    pn_pcb,
    model_side,
  ]);
  const lastSerie =
    lastSerieResult.rows[0]?.st_no_serie ||
    "SELECT DISTINCT model_name FROM work_line WHERE wl_no = $1 ORDER BY model_name";

  const lastVersionQuery = `
        SELECT st_ver 
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2 AND st_no_serie = $3
        ORDER BY st_ver DESC 
        LIMIT 1;
    `;
  const lastVersionResult = await pool.query(lastVersionQuery, [
    pn_pcb,
    model_side,
    lastSerie,
  ]);
  const lastVersion = lastVersionResult.rows[0]?.st_ver;

  let nextVersion;
  if (lastVersion) {
    const charCode = lastVersion.charCodeAt(0);
    nextVersion = String.fromCharCode(charCode + 1);
  } else {
    nextVersion = "1.0";
  }

  return { nextSerie: lastSerie, nextVersion: nextVersion };
}

async function createStencil(data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // (Esta parte de 'suppliers' está bien)
    const newSupplierName = data.supp_name;
    const insertSupplierSql = `
            INSERT INTO suppliers (supp_name, supp_info)
            VALUES ($1, $2)
            ON CONFLICT (supp_name) DO NOTHING;
        `;
    await client.query(insertSupplierSql, [newSupplierName, "BEGIN"]);

    
    const insertSql = `
      INSERT INTO stencils (
        st_job, supp_name, pn_pcb, model_side, st_no_serie, st_ver, 
        st_side, thickness, st_status, st_current_us, st_mx_us, st_arrived_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING st_id;
    `;
    
    // --- CORRECCIÓN 1: Cambiar el status a "OK" ---
    const insertResult = await client.query(insertSql, [
      data.st_job,
      data.supp_name,
      data.pn_pcb,
      data.model_side,
      data.st_no_serie,
      data.st_ver,
      data.st_side,
      data.thickness,
      'OK', // <-- AQUÍ ESTÁ EL CAMBIO (antes era 'Registrado desde módulo Plate')
      data.current_us,
      data.mx_us,
      data.arrived_date,
    ]);
    const newId = insertResult.rows[0].st_id;

    // --- CORRECCIÓN 2: El barcode debe ser el 'st_job' ---
    const barcode = data.st_job; // <-- AQUÍ ESTÁ EL CAMBIO (coincide con el VARCHAR(10))

    const qrBuffer = await qrcode.toBuffer(barcode); // El QR sí puede ser el 'st_job'

    const updateSql = `
      UPDATE stencils
      SET st_bc = $1, st_qr = $2
      WHERE st_id = $3;
    `;
    await client.query(updateSql, [barcode, qrBuffer, newId]);

    await client.query("COMMIT");

    return { success: true, newId, barcode };

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("ROLLBACK ejecutado por error en 'createStencil':", error);
    throw error;
  } finally {
    client.release();
  }
}

async function getAllSeriesAndNextVersion(pn_pcb, model_side, thickness) {
  const lastSerieQuery = `
        SELECT st_no_serie
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY st_no_serie DESC 
        LIMIT 1;
    `;
  const lastSerieResult = await pool.query(lastSerieQuery, [
    pn_pcb,
    model_side,
  ]);
  const lastSerieText = lastSerieResult.rows[0]?.st_no_serie;

  let nextNewSerie = "Error al crear el stencil:";

  if (lastSerieText) {
    const numericValue = parseFloat(lastSerieText);
    if (!isNaN(numericValue)) {
      nextNewSerie = (numericValue + 1.0).toFixed(1).toString();
    }
  }

  const existingSeriesQuery = `
        SELECT DISTINCT st_no_serie
        FROM stencils 
        WHERE pn_pcb = $1 AND model_side = $2 AND thickness = $3
        ORDER BY st_no_serie ASC;
    `;
  const existingSeriesResult = await pool.query(existingSeriesQuery, [
    pn_pcb,
    model_side,
    thickness,
  ]);
  const existingSeries = existingSeriesResult.rows.map(
    (row) => row.st_no_serie
  );

  const seriesData = [];
  for (const serie of existingSeries) {
    const lastVersionQuery = `
            SELECT st_ver 
            FROM stencils 
            WHERE pn_pcb = $1 AND model_side = $2 AND thickness = $3 AND st_no_serie = $4
            ORDER BY st_ver DESC 
            LIMIT 1;
        `;
    const lastVersionResult = await pool.query(lastVersionQuery, [
      pn_pcb,
      model_side,
      thickness,
      serie,
    ]);
    const lastVersion = lastVersionResult.rows[0]?.st_ver;

    let nextVersion;
    if (lastVersion) {
      const charCode = lastVersion.toUpperCase().charCodeAt(0);
      nextVersion = String.fromCharCode(charCode + 1);
    } else {
      nextVersion = "1.0";
    }

    seriesData.push({
      serie: serie,
      nextVersion: nextVersion,
      lastVersion: lastVersion,
    });
  }

  return {
    nextNewSerie: nextNewSerie,
    seriesData: seriesData,
  };
}
module.exports = {
  getAllSuppliers,
  getPcbsByWorkline,
  getThicknessByPcbAndSide,
  getNextSerieAndVersion,
  createStencil,
  getAllStencils,
  getStencilById,
  getStencilQrById,
  updateStencilAndLogHistory,
  getAllHistory,
  getBajaStencils,
  getAllSeriesAndNextVersion,
};
