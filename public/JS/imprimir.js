// public/JS/imprimir.js
document.addEventListener('DOMContentLoaded', () => {
    const toolListContainer = document.getElementById('tool-list-container');
    const searchInput = document.getElementById('tool-search-input');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const deselectAllBtn = document.getElementById('deselect-all-btn');

    let allTools = []; // Para guardar todas las herramientas cargadas
    let selectedToolIds = new Set(); // <-- CAMBIO: Almacén para guardar las selecciones (guardará el ID único, ej: "tool-stencil-4")

    /**
     * Carga todas las herramientas (stencils, plates, squeegees) desde el backend.
     */
    async function loadAllTools() {
        toolListContainer.innerHTML = '<div class="text-center p-5">Cargando herramientas...</div>';
        try {
            // Realizar peticiones en paralelo
            const [stencilsRes, platesRes, squeegeesRes] = await Promise.all([
                authFetch('/api/stencils'),
                authFetch('/api/plates'),
                authFetch('/api/squeegees')
            ]);

            if (!stencilsRes.ok || !platesRes.ok || !squeegeesRes.ok) {
                throw new Error('Error al cargar datos de una o más herramientas');
            }

            const stencils = await stencilsRes.json();
            const plates = await platesRes.json();
            const squeegees = await squeegeesRes.json();

            // Combinar y añadir tipo
            allTools = [
                ...stencils.map(s => ({ ...s, type: 'stencil', displayId: `st-${s.st_id}`, id: s.st_id, name: `${s.st_job || ''} ${s.pn_pcb || ''} ${s.st_bc || ''}` })),
                ...plates.map(p => ({ ...p, type: 'plate', displayId: `pl-${p.pl_id}`, id: p.pl_id, name: `${p.pl_job || ''} ${p.pn_pcb || ''} ${p.pl_bc || ''}` })),
                ...squeegees.map(sq => ({ ...sq, type: 'squeegee', displayId: `sq-${sq.sq_id}`, id: sq.sq_id, name: `${sq.sq_length || ''}mm ${sq.sq_side || ''} ${sq.sq_bc || ''}` }))
            ];

            // Ordenar (opcional, por tipo y luego ID)
            allTools.sort((a, b) => {
                if (a.type < b.type) return -1;
                if (a.type > b.type) return 1;
                return a.id - b.id;
            });

            displayTools(allTools); // Mostrar todas al inicio
            updateGenerateButtonState(); // Actualizar estado del botón

        } catch (error) {
            console.error(error);
            toolListContainer.innerHTML = `<div class="alert alert-danger">Error al cargar herramientas: ${error.message}</div>`;
        }
    }

    /**
     * Muestra la lista de herramientas en el HTML con checkboxes.
     * @param {Array} toolsToDisplay - Array de herramientas a mostrar.
     */
    function displayTools(toolsToDisplay) {
        toolListContainer.innerHTML = ''; // Limpiar contenedor
        if (toolsToDisplay.length === 0) {
            toolListContainer.innerHTML = '<div class="text-center p-5">No se encontraron herramientas.</div>';
            return;
        }

        toolsToDisplay.forEach(tool => {
            const div = document.createElement('div');
            div.className = 'tool-list-item';
            // Este es el ID único (ej: "tool-stencil-4")
            const inputId = `tool-${tool.type}-${tool.id}`; 
            let labelText = '';
            switch(tool.type) {
                case 'stencil':
                    labelText = `Stencil #${tool.id}: ${tool.st_job || 'N/A'} (PCB: ${tool.pn_pcb || 'N/A'}, ${tool.st_side || 'N/A'}, ${tool.thickness || 'N/A'}mm) - ${tool.st_bc || 'No Barcode'}`;
                    break;
                case 'plate':
                     labelText = `Base #${tool.id}: ${tool.pl_job || 'N/A'} (PCB: ${tool.pn_pcb || 'N/A'}, Prov: ${tool.supp_name || 'N/A'}) - ${tool.pl_bc || 'No Barcode'}`;
                    break;
                case 'squeegee':
                     labelText = `Squeegee #${tool.id}: ${tool.sq_length || 'N/A'}mm Lado ${tool.sq_side || 'N/A'} - ${tool.sq_bc || 'No Barcode'}`;
                    break;
                 default: labelText = `Herramienta Desconocida #${tool.id}`;
            }

            // --- CAMBIO: Comprobar si el ID *único* está en el Set de seleccionados ---
            const isChecked = selectedToolIds.has(inputId); 
            
            div.innerHTML = `
                <input class="form-check-input tool-checkbox" type="checkbox" 
                       value="${tool.id}" 
                       id="${inputId}" 
                       data-type="${tool.type}" 
                       ${isChecked ? 'checked' : ''}> 
                <label class="form-check-label" for="${inputId}">
                    ${labelText}
                </label>
            `;
            toolListContainer.appendChild(div);
        });
    }

    /**
     * Filtra la lista de herramientas mostradas según el término de búsqueda.
     */
    function filterTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredTools = allTools.filter(tool =>
            tool.name.toLowerCase().includes(searchTerm) ||
            tool.id.toString().includes(searchTerm) ||
            tool.type.toLowerCase().includes(searchTerm) ||
            (tool.st_bc && tool.st_bc.toLowerCase().includes(searchTerm)) ||
            (tool.pl_bc && tool.pl_bc.toLowerCase().includes(searchTerm)) ||
            (tool.sq_bc && tool.sq_bc.toLowerCase().includes(searchTerm))
        );
        displayTools(filteredTools);
    }

    /**
     * Habilita o deshabilita el botón "Generar PDF" basado en si hay algo en el Set.
     */
    function updateGenerateButtonState() {
        const anySelected = selectedToolIds.size > 0;
        generatePdfBtn.disabled = !anySelected;
    }

    // --- Event Listeners ---

    // Búsqueda
    searchInput.addEventListener('input', filterTools);

    // --- CAMBIO: Actualizar el Set usando el ID *único* del input ---
    toolListContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('tool-checkbox')) {
            const uniqueId = event.target.id; // <-- Usar el ID del elemento (ej: "tool-stencil-4")
            if (event.target.checked) {
                selectedToolIds.add(uniqueId); // Añadir al Set
            } else {
                selectedToolIds.delete(uniqueId); // Quitar del Set
            }
            updateGenerateButtonState(); // Actualizar el botón
        }
    });

    // --- CAMBIO: Seleccionar Todos (usa el ID único) ---
     selectAllBtn.addEventListener('click', () => {
         const checkboxes = toolListContainer.querySelectorAll('.tool-checkbox');
         checkboxes.forEach(cb => {
             cb.checked = true;
             selectedToolIds.add(cb.id); // <-- Añadir el ID único al Set
         });
         updateGenerateButtonState();
     });

    // --- CAMBIO: Deseleccionar Todos (usa el ID único) ---
     deselectAllBtn.addEventListener('click', () => {
         const checkboxes = toolListContainer.querySelectorAll('.tool-checkbox');
         checkboxes.forEach(cb => {
             cb.checked = false; 
             selectedToolIds.delete(cb.id); // <-- Quitar el ID único del Set
         });
         updateGenerateButtonState();
     });


    // --- CAMBIO: Generar Excel (leer el Set y separar los IDs) ---
    generatePdfBtn.addEventListener('click', async () => {
        
        const selectedTools = [];
        // Iterar sobre el Set de IDs únicos
        for (const uniqueId of selectedToolIds) {
            // Separar el ID (ej: "tool-stencil-4" -> ["tool", "stencil", "4"])
            const parts = uniqueId.split('-');
            
            if (parts.length === 3) { // Asegurarse que el formato es correcto
                const type = parts[1]; // "stencil", "plate", o "squeegee"
                const id = parts[2];   // "4"
                
                selectedTools.push({
                    type: type,
                    id: id
                });
            }
        }
        // --- FIN CAMBIO ---

        if (selectedTools.length === 0) {
            alert('Por favor, seleccione al menos una herramienta.');
            return;
        }

        const originalButtonText = '<i class="bi bi-file-earmark-excel-fill"></i> Generar Excel';
        generatePdfBtn.disabled = true;
        generatePdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generando...';

        try {
            const response = await authFetch('/api/labels/generate-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tools: selectedTools })
            });

            if (!response.ok) {
                 let errorMsg = `Error del servidor (${response.status})`;
                 try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e) {}
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = url;
            downloadLink.download = 'labels.xlsx';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            window.URL.revokeObjectURL(url);
            downloadLink.remove();

        } catch (error) {
            console.error('Error al generar Excel:', error);
            alert(`Error al generar Excel: ${error.message}`);
        } finally {
            generatePdfBtn.disabled = false;
            generatePdfBtn.innerHTML = originalButtonText;
            updateGenerateButtonState();
        }
    });


    // --- Carga Inicial ---
    loadAllTools();
});