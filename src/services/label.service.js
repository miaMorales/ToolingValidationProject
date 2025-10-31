// src/services/label.service.js
const ExcelJS = require('exceljs');
const path = require('path');


// --- Constantes ---
// Asegúrate que esta ruta sea correcta desde donde se ejecuta tu script (usualmente la raíz del proyecto)
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'labels.xlsx'); // Ajusta '../templates' si es necesario
const QR_IMG_SIZE_PLATE = { width: 53, height: 53 }; // Tamaño del QR en Excel (pixels, ajustar)
const QR_IMG_SIZE_SQUEEGEE = { width: 38, height: 38 }; // Tamaño del QR en Excel (pixels, ajustar)
const QR_IMG_SIZE_STENCIL = { width: 55, height: 55 }; // Tamaño del QR en Excel (pixels, ajustar)

// --- Funciones Auxiliares para Escribir Etiquetas ---

/** Escribe una etiqueta de Squeegee en la hoja dada, a partir de la fila especificada */
async function writeSqueegeeLabel(worksheet, startRow, toolData, workbook) {
    const { data, qr } = toolData;
    if (!data) return startRow; // Si no hay datos, no hacer nada

    // 1. Combinar celdas
    worksheet.mergeCells(`B${startRow}:B${startRow + 1}`); // ID
    worksheet.mergeCells(`E${startRow}:E${startRow + 1}`); // QR

    // 2. Escribir datos
    worksheet.getCell(`B${startRow}`).value = data.sq_id || '';
    worksheet.getCell(`C${startRow}`).value = 'Largo';
    worksheet.getCell(`C${startRow + 1}`).value = 'Lado';
    worksheet.getCell(`D${startRow}`).value = `${data.sq_length || ''} mm`;
    worksheet.getCell(`D${startRow + 1}`).value = data.sq_side || '';

    // 3. Añadir QR (si existe)
    if (qr) {
        try {
            const imageId = workbook.addImage({
                buffer: qr,
                extension: 'png', // Asumiendo que el QR es PNG
            });
            // Posicionar la imagen dentro de la celda combinada E1:E2 (ajustar col/row offsets si es necesario)
            // 'col' y 'row' son 0-based index. Col E is 4. Row startRow is startRow-1.
            worksheet.addImage(imageId, {
                tl: { col: 4, row: startRow - 1 }, // Top-left corner en E(startRow)
                ext: QR_IMG_SIZE_SQUEEGEE
            });
        } catch (imgError) {
            console.error(`Error adding Squeegee QR for ID ${data.sq_id}:`, imgError);
            worksheet.getCell(`E${startRow}`).value = 'Error QR'; // Placeholder
        }
    }

    // 4. Aplicar Estilos (Opcional pero recomendado para centrar, etc.)
    worksheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`E${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`D${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`D${startRow + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
    // ... añadir bordes si se desea ...

    // Devuelve la siguiente fila donde empezar (fila actual + 2 filas de etiqueta + 1 fila de espacio)
    return startRow + 3;
}

/** Escribe una etiqueta de Base (Plate) en la hoja dada, a partir de la fila especificada */
async function writePlateLabel(worksheet, startRow, toolData, workbook) {
    const { data, qr } = toolData;
    if (!data) return startRow;

    // 1. Combinar celdas (3 filas de alto)
    worksheet.mergeCells(`B${startRow}:B${startRow + 2}`); // ID
    worksheet.mergeCells(`E${startRow}:E${startRow + 2}`); // QR

    // 2. Escribir datos
    worksheet.getCell(`B${startRow}`).value = data.pl_id || '';
    worksheet.getCell(`C${startRow}`).value = 'JOB';
    worksheet.getCell(`C${startRow + 1}`).value = 'PCB';
    worksheet.getCell(`C${startRow + 2}`).value = 'Proveedor';
    worksheet.getCell(`D${startRow}`).value = data.pl_job || '';
    worksheet.getCell(`D${startRow + 1}`).value = data.pn_pcb || '';
    worksheet.getCell(`D${startRow + 2}`).value = data.supp_name || '';

    // 3. Añadir QR
     if (qr) {
        try {
            const imageId = workbook.addImage({ buffer: qr, extension: 'png' });
            // Posicionar en E(startRow)
            worksheet.addImage(imageId, {
                tl: { col: 4, row: startRow - 1 },
                ext: QR_IMG_SIZE_PLATE
            });
        } catch (imgError) {
            console.error(`Error adding Plate QR for ID ${data.pl_id}:`, imgError);
            worksheet.getCell(`E${startRow}`).value = 'Error QR';
        }
    }

    // 4. Estilos (Centrar ID y QR)
    worksheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`E${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    // ... otros estilos ...

    // Devuelve la siguiente fila (fila actual + 3 filas de etiqueta + 1 fila de espacio)
    return startRow + 4;
}

/** Escribe una etiqueta de Stencil en la hoja dada, a partir de la fila especificada */
async function writeStencilLabel(worksheet, startRow, toolData, workbook) {
     const { data, qr } = toolData;
    if (!data) return startRow;

    // 1. Combinar celdas (3 filas de alto)
    worksheet.mergeCells(`B${startRow}:B${startRow + 2}`); // ID
    worksheet.mergeCells(`E${startRow}:E${startRow + 2}`); // QR
    worksheet.mergeCells(`F${startRow}:F${startRow + 2}`); // Side

    // 2. Escribir datos
    worksheet.getCell(`B${startRow}`).value = data.st_id || '';
    worksheet.getCell(`C${startRow}`).value = 'JOB';
    worksheet.getCell(`C${startRow + 1}`).value = 'PCB';
    worksheet.getCell(`C${startRow + 2}`).value = 'THK';
    worksheet.getCell(`D${startRow}`).value = data.st_job || '';
    worksheet.getCell(`D${startRow + 1}`).value = data.pn_pcb || '';
    worksheet.getCell(`D${startRow + 2}`).value = `${data.thickness || ''} Milis`; // Añadir "Milis"
    worksheet.getCell(`F${startRow}`).value = data.st_side?.slice(0, 1) || ''; // Solo B o T

    // 3. Añadir QR
     if (qr) {
        try {
            const imageId = workbook.addImage({ buffer: qr, extension: 'png' });
             // Posicionar en E(startRow)
            worksheet.addImage(imageId, {
                tl: { col: 4, row: startRow - 1 }, // Col E = 4
                ext: QR_IMG_SIZE_STENCIL
            });
        } catch (imgError) {
            console.error(`Error adding Stencil QR for ID ${data.st_id}:`, imgError);
             worksheet.getCell(`E${startRow}`).value = 'Error QR';
        }
    }

    // 4. Estilos (Centrar ID, QR, Side)
    worksheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`E${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(`F${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
     // ... otros estilos ...

    // Devuelve la siguiente fila (fila actual + 3 filas de etiqueta + 1 fila de espacio)
    return startRow + 4;
}


/**
 * Generates an Excel file with labels based on a template.
 */
async function generateLabelExcel(toolIdsList) {
    // 1. Cargar la plantilla
    const workbook = new ExcelJS.Workbook();
    console.log("Intentando cargar plantilla desde:", TEMPLATE_PATH);
    try {
        await workbook.xlsx.readFile(TEMPLATE_PATH);
        
    } catch (readError) {
        console.error("Error leyendo la plantilla Excel:", readError);
        throw new Error("No se pudo cargar la plantilla de etiquetas.");
    }


    // 2. Obtener datos de las herramientas
    const toolDataList = await getToolData(toolIdsList); // Reutiliza tu función getToolData

    // 3. Obtener las hojas de trabajo
    const wsStencil = workbook.getWorksheet('Etiquetas Stencil');
    const wsPlate = workbook.getWorksheet('Etiquetas bases');
    const wsSqueegee = workbook.getWorksheet('Etiquetas Squeegees');

    if (!wsStencil || !wsPlate || !wsSqueegee) {
         throw new Error("Una o más hojas requeridas no se encontraron en la plantilla.");
    }

    // 4. Escribir etiquetas, manteniendo la siguiente fila disponible por hoja
    let nextRowMap = {
        stencil: 1, // Stencil empieza en fila 1
        plate: 2,   // Base empieza en fila 2
        squeegee: 1 // Squeegee empieza en fila 1
    };

    for (const toolData of toolDataList) {
        switch (toolData.type) {
            case 'stencil':
                nextRowMap.stencil = await writeStencilLabel(wsStencil, nextRowMap.stencil, toolData, workbook);
                break;
            case 'plate':
                nextRowMap.plate = await writePlateLabel(wsPlate, nextRowMap.plate, toolData, workbook);
                break;
            case 'squeegee':
                nextRowMap.squeegee = await writeSqueegeeLabel(wsSqueegee, nextRowMap.squeegee, toolData, workbook);
                break;
        }
    }

    // 5. Generar el buffer del archivo modificado
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

async function getToolData(tools) {
    const stencilService = require('./stencil.service');
    const plateService = require('./plate.service');
    const squeegeeService = require('./squeegee.service');

    const toolDataPromises = tools.map(async (tool) => {
        try {
            let data = null;
            let qrBuffer = null;
            switch (tool.type) {
                case 'stencil':
                    data = await stencilService.getStencilById(tool.id);
                    qrBuffer = await stencilService.getStencilQrById(tool.id);
                    break;
                case 'plate':
                    data = await plateService.getPlateById(tool.id);
                     qrBuffer = await plateService.getPlateQrById(tool.id);
                    break;
                case 'squeegee':
                    data = await squeegeeService.getSqueegeeById(tool.id);
                     qrBuffer = await squeegeeService.getSqueegeeQrById(tool.id);
                    break;
                default: return null;
            }
             // Validar QR Buffer
            if (qrBuffer && !(qrBuffer instanceof Buffer)) {
                 console.warn(`QR data for ${tool.type} ID ${tool.id} is not a Buffer.`);
                 qrBuffer = null; // Ignorar si no es un buffer válido
            }
            return { type: tool.type, data, qr: qrBuffer };
        } catch (error) {
            console.error(`Error fetching data for ${tool.type} ID ${tool.id}:`, error);
            return null;
        }
    });
    const results = await Promise.all(toolDataPromises);
    return results.filter(result => result !== null && result.data);
}
module.exports = {
    getToolData, // Asegúrate que esta función exista y esté exportada si está en otro archivo
    generateLabelExcel // La nueva función principal
};

// Asegúrate de tener esta función si no está importada de otro lado
