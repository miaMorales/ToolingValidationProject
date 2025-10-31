// generateMissingQRs.js

const { Pool } = require('pg');
const qrcode = require('qrcode');

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// Asegúrate de que estos datos coincidan con tu configuración
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'toolingValidation',
  password: '1475',
  port: 5432,
});

// --- FUNCIÓN PRINCIPAL DEL SCRIPT ---
(async () => {
  console.log('--- Iniciando script para generar QRs faltantes en Squeegees ---');
  
  try {
    // 1. Busca todos los squeegees que tienen barcode pero NO tienen QR.
    const selectSql = 'SELECT pl_id, pl_bc FROM plates WHERE pl_qr IS NULL AND pl_bc IS NOT NULL;';
    const { rows: recordsToFix } = await pool.query(selectSql);

    if (recordsToFix.length === 0) {
      console.log('✅ No hay registros sin QR. ¡Todo está en orden!');
      return;
    }

    console.log(`ℹ️ Se encontraron ${recordsToFix.length} registros para actualizar.`);

    // 2. Recorre cada registro encontrado.
    for (const record of recordsToFix) {
      console.log(` -> Procesando Squeegee ID: ${record.pl_id} con Barcode: ${record.pl_bc}`);

      // 3. Genera la imagen QR a partir del barcode.
      const qrBuffer = await qrcode.toBuffer(record.pl_bc);

      // 4. Actualiza el registro en la base de datos con la nueva imagen QR.
      const updateSql = 'UPDATE plates SET pl_qr = $1 WHERE pl_id = $2;';
      await pool.query(updateSql, [qrBuffer, record.pl_id]);
    }

    console.log(`✅ ¡Proceso completado! Se actualizaron ${recordsToFix.length} registros.`);

  } catch (error) {
    console.error('❌ Ocurrió un error durante el proceso:', error);
  } finally {
    // 5. Cierra la conexión a la base de datos.
    await pool.end();
    console.log('--- Script finalizado. Conexión cerrada. ---');
  }
})();