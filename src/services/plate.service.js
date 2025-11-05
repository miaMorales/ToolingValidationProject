// src/services/plate.service.js
const pool = require("../db/pool");
const qrcode = require("qrcode");

// --- Funciones de Lectura General ---

async function getAllPlates(search = "") {
  let query = `
    SELECT 
      p.pl_id, p.pl_job, p.supp_name, m.model_name,
      p.pn_pcb, 
      CONCAT(p.pl_no_serie, '-', p.pl_ver) AS revision, p.pl_arrived_date,p.pl_status, p.pl_bc, 
      p.pl_current_us, p.pl_mx_us
    FROM plates AS p
    INNER JOIN models AS m ON p.pn_pcb = m.pn_pcb AND p.model_side = m.model_side
    WHERE p.pl_status <> 'BAJA'
  `;
  const queryParams = [];

  // Lógica de búsqueda simplificada
  if (search) {
    query += `
      AND (p.pl_job ILIKE $1 OR CAST(p.pl_id AS TEXT) ILIKE $1 OR m.model_name ILIKE $1
      OR p.pn_pcb ILIKE $1 OR p.pl_bc ILIKE $1 OR p.pl_status ILIKE $1)
    `;
    queryParams.push(`%${search}%`);
  }

  query += " ORDER BY p.pl_id ASC";

  const { rows } = await pool.query(query, queryParams);
  return rows;
}

async function getPlateById(id) {
  const { rows } = await pool.query("SELECT * FROM plates WHERE pl_id = $1", [
    id,
  ]);
  return rows[0];
}

async function getPlateQrById(id) {
  const { rows } = await pool.query(
    "SELECT pl_qr FROM plates WHERE pl_id = $1",
    [id]
  );
  return rows[0]?.pl_qr || null;
}

// --- Funciones de Historial y Baja ---

async function getAllHistory() {
  const sql = `
    SELECT 
    ph.pl_h_date, 
    ph.plate_id, 
    p.pl_bc, 
    ph.pl_h_status,
    ph.pl_responsable, 
    ph.pl_h_com
FROM 
    plate_history AS ph
INNER JOIN
    plates AS p ON ph.plate_id = p.pl_id
    ORDER BY ph.pl_h_date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getBajaPlates() {
  const sql = `
    SELECT
    p.pl_id,
    p.pl_job,
    p.supp_name,
    m.model_name,
    p.pn_pcb,
    CONCAT(p.pl_no_serie, '-', p.pl_ver) AS revision,
    p.pl_status,
    p.pl_bc,
    p.pl_current_us,
    p.pl_mx_us,
    p.pl_arrived_date,
    ph.pl_h_date AS pl_baja_date,
    ph.pl_responsable,
    ph.pl_h_com
FROM
    plates AS p
INNER JOIN
    models AS m ON p.pn_pcb = m.pn_pcb AND p.model_side = m.model_side
INNER JOIN
    plate_history AS ph ON p.pl_id = ph.plate_id
WHERE
p.pl_status = 'BAJA' AND ph.pl_h_status = 'BAJA'
ORDER BY ph.pl_h_date ASC;
`;
  const { rows } = await pool.query(sql);
  return rows;
}

// --- Lógica de Edición y Log ---
// --- Lógica de Edición y Log ---

async function updatePlateAndLogHistory(id, newData, user) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const originalPlateResult = await client.query(
      "SELECT * FROM plates WHERE pl_id = $1",
      [id]
    );
    const originalPlate = originalPlateResult.rows[0];

    if (!originalPlate) {
      throw new Error("Plate no encontrado");
    }

    // ====================================================================
    //  CAMBIO EN LÓGICA DE HISTORIAL (Lógica de Responsable Corregida)
    // ====================================================================
    let needsHistoryRecord = false;
    let historyComment = ""; // Inicia vacío

    // --- 1. Definir las variables de cambio PRIMERO ---
    const statusChanged = originalPlate.pl_status.trim() !== newData.status.trim();
    const cyclesChanged = originalPlate.pl_current_us !== parseInt(newData.currentCycles);
    // Revisa si el usuario ENVIÓ un comentario manual
    const manualCommentAdded = newData.history && newData.history.comment;

    // --- 2. Construir el comentario y determinar si se necesita historial ---
    if (manualCommentAdded) {
      needsHistoryRecord = true;
      historyComment = newData.history.comment; // Usa el comentario del usuario
    }

    if (statusChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? " " : "") + `(Cambio de status: ${originalPlate.pl_status.trim()} -> ${newData.status.trim()})`;
    }

    if (cyclesChanged) {
      needsHistoryRecord = true;
      historyComment += (historyComment ? " " : "") + `(Ciclos actualizados: ${originalPlate.pl_current_us} -> ${newData.currentCycles})`;
    }
    // ====================================================================
    //  FIN DEL CAMBIO
    // ====================================================================

    const updateSql = `
      UPDATE plates 
      SET pl_current_us = $1, pl_mx_us = $2, pl_status = $3 
      WHERE pl_id = $4
    `;
    await client.query(updateSql, [
      newData.currentCycles,
      newData.maxCycles,
      newData.status,
      id,
    ]);

    if (needsHistoryRecord) {
      const historySql = `
        INSERT INTO plate_history (plate_id, pl_h_date, pl_h_status, pl_h_com, pl_responsable) 
        VALUES ($1, $2, $3, $4, $5)
      `;

      // ====================================================================
      //  LÓGICA DE RESPONSABLE (La parte importante)
      // ====================================================================
      let responsible;

      // REGLA 1: Si SÓLO cambiaron los ciclos (y no el status, y no hubo comentario manual)
      if (cyclesChanged && !statusChanged && !manualCommentAdded) {
        // ¡Ajusta 'user.no_empleado' a tu campo de token real!
        responsible = user?.no_employee|| "SYS_CYC"; // Fallback si el user no está
      } else {
        // REGLA 2: Si cambió el status, O se agregó un comentario manual,
        // O se cambiaron AMBAS cosas (ciclos y status),
        // usa el valor del formulario (si existe).
        responsible = newData.history?.responsible || "SYS_MAN";
      }
      // ====================================================================
      //  FIN DE LÓGICA DE RESPONSABLE
      // ====================================================================

      const date = newData.history?.date || new Date();

      await client.query(historySql, [
        id,
        date,
        newData.status,
        historyComment.trim(), // Usa el comentario actualizado
        responsible, // <-- Aquí se usa el 'responsible' CORRECTO
      ]);
    }
    
    // (AQUÍ ESTABA EL CÓDIGO INCORRECTO FLOTANTE, AHORA ELIMINADO)

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en la transacción de actualización", error);
    throw error;
  } finally {
    client.release();
  }
}

// --- Lógica de Registro (Create) ---

// En src/services/plate.service.js

async function createPlate(data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const newSupplierName = data.supp_name;
    const insertSupplierSql = `
            INSERT INTO suppliers (supp_name, supp_info)
            VALUES ($1, $2)
            ON CONFLICT (supp_name) DO NOTHING;
        `;
        // Intentamos insertar el nuevo proveedor.
        await client.query(insertSupplierSql, [newSupplierName, 'Registrado desde módulo Plate']);

    // 1. INSERTA los datos iniciales
    const insertSql = `
      INSERT INTO plates (
        pl_job, supp_name, pn_pcb, model_side, pl_no_serie, pl_ver, 
        pl_arrived_date, pl_status, pl_current_us, pl_mx_us
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OK', $8, $9)
      RETURNING pl_id;
    `;
    const insertResult = await client.query(insertSql, [
      data.pl_job,          // $1
      data.supp_name,       // $2
      data.pn_pcb,          // $3
      data.model_side,      // $4 (Es 'BT', pasado desde el frontend/controller)
      data.pl_no_serie,     // $5
      data.pl_ver,          // $6
      data.pl_arrived_date, // $7
      data.pl_current_us,   // $8
      data.pl_mx_us,        // $9
    ]);
    const newId = insertResult.rows[0].pl_id;

    // 2. Obtener el model_qr para el barcode
    const modelQrResult = await client.query('SELECT model_qr FROM models WHERE pn_pcb = $1 AND model_side = $2', [data.pn_pcb, data.model_side]);
    const baseQr = modelQrResult.rows[0]?.model_qr || data.pn_pcb; 
    
    // 3. GENERA el barcode (Pokayoke)
    const barcode = `${baseQr}-${data.pl_no_serie}-${data.pl_ver}`;

    // 4. GENERA EL BUFFER QR (LÍNEA FALTANTE)
    const qrBuffer = await qrcode.toBuffer(barcode); // <-- LÍNEA AGREGADA

    // 5. ACTUALIZA el registro con el barcode y el QR
    const updateSql = `
      UPDATE plates
      SET pl_bc = $1, pl_qr = $2
      WHERE pl_id = $3;
    `;
    await client.query(updateSql, [barcode, qrBuffer, newId]); // qrBuffer ahora está definido.

    await client.query("COMMIT");
    return { success: true, newId, barcode };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear el plate:", error);
    throw error;
  } finally {
    client.release();
  }
}

// --- Lógica Dinámica de Registro (Revisión/Versión) ---
// NOTA: Se asume que las funciones de Suppliers y Workline se pueden reutilizar
//       de stencil.service o se replican aquí si es necesario.
//       Incluiré los nombres aquí para que el controlador pueda llamarlos.

// Replicando funciones de Stencil (Asume que estas funciones acceden a las tablas correctas)

async function getAllSuppliers() {
  const sql = 'SELECT supp_name FROM suppliers ORDER BY supp_name';
  const { rows } = await pool.query(sql);
  return rows.map(row => row.supp_name);
}

async function getPcbsByWorkline(wl_no) {
  // Asume que work_line tiene pn_pcb en model_name (como en tu ejemplo)
  const sql =
    "SELECT DISTINCT model_name FROM work_line WHERE wl_no = $1 ORDER BY model_name";
  const { rows } = await pool.query(sql, [wl_no]);
  return rows.map((row) => row.model_name);
}

async function getAllSeriesAndNextVersion(pn_pcb, model_side) {
  // Para plates no tenemos grosor, la lógica es más simple, solo depende de PCB/Side
  const modelQrQuery = `
        SELECT model_qr FROM models 
        WHERE pn_pcb = $1 AND model_side = $2
    `;
  const modelQrResult = await pool.query(modelQrQuery, [pn_pcb, model_side]);
  const modelQrCode = modelQrResult.rows[0]?.model_qr || "";

  // 1. Determinar la siguiente serie (X.X) para el PCB/Lado
  const lastSerieQuery = `
        SELECT pl_no_serie
        FROM plates 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY pl_no_serie DESC 
        LIMIT 1;
    `;
  const lastSerieResult = await pool.query(lastSerieQuery, [
    pn_pcb,
    model_side,
  ]);
  const lastSerieText = lastSerieResult.rows[0]?.pl_no_serie;

  let nextNewSerie = "1.0";

  if (lastSerieText) {
    const numericValue = parseFloat(lastSerieText);
    if (!isNaN(numericValue)) {
      nextNewSerie = (numericValue + 1.0).toFixed(1).toString();
    }
  }

  // 2. Obtener todas las series ÚNICAS existentes para el PCB y Lado
  const existingSeriesQuery = `
        SELECT DISTINCT pl_no_serie
        FROM plates 
        WHERE pn_pcb = $1 AND model_side = $2
        ORDER BY pl_no_serie ASC;
    `;
  const existingSeriesResult = await pool.query(existingSeriesQuery, [
    pn_pcb,
    model_side,
  ]);
  const existingSeries = existingSeriesResult.rows.map(
    (row) => row.pl_no_serie
  );

  // 3. Para cada serie existente, encontrar la última versión alfabética (A, B, C...)
  const seriesData = [];
  for (const serie of existingSeries) {
    const lastVersionQuery = `
            SELECT pl_ver 
            FROM plates 
            WHERE pn_pcb = $1 AND model_side = $2 AND pl_no_serie = $3
            ORDER BY pl_ver DESC 
            LIMIT 1;
        `;
    const lastVersionResult = await pool.query(lastVersionQuery, [
      pn_pcb,
      model_side,
      serie,
    ]);
    const lastVersion = lastVersionResult.rows[0]?.pl_ver;

    let nextVersion;
    if (lastVersion) {
      const charCode = lastVersion.toUpperCase().charCodeAt(0);
      nextVersion = String.fromCharCode(charCode + 1);
    } else {
      nextVersion = "A";
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
    modelQrCode: modelQrCode
  };
}

module.exports = {
  getAllPlates,
  getPlateById,
  getPlateQrById,
  updatePlateAndLogHistory,
  getAllHistory,
  getBajaPlates,
  createPlate,
  // Reutilizando las funciones de datos dinámicos
  getAllSuppliers,
  getPcbsByWorkline,
  getAllSeriesAndNextVersion,
};