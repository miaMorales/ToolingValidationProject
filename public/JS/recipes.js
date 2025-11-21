document.addEventListener('DOMContentLoaded', () => {
    // --- Regex de Validación ---
    const isNumericRegex = /^\d+$/; // Solo números enteros, sin espacios

    // --- Elementos del DOM ---
    const recipeContainer = document.getElementById('recipe-list-container');
    const searchInput = document.getElementById('recipe-search-input');
    const lineSelector = document.getElementById('line-selector');

    // --- Elementos del Modal ---
    const addNewModelBtn = document.getElementById('add-new-model-btn');
    const newModelModalEl = document.getElementById('newModelModal');
    const newModelModal = new bootstrap.Modal(newModelModalEl);
    const saveNewModelBtn = document.getElementById('saveNewModelBtn');
    const newModelForm = document.getElementById('newModelForm');

    // Inputs del Modal
    const modelNameInput = document.getElementById('new-model-name');
    const pcbInput = document.getElementById('new-model-pcb');
    const qrInput = document.getElementById('new-model-qr');
    const pastaSelect = document.getElementById('new-model-pasta-select');
    const pastaOtroContainer = document.getElementById('new-model-pasta-otro-container');
    const pastaOtroInput = document.getElementById('new-model-pasta-otro');
    const lengthInput = document.getElementById('new-model-length');
    const lineCheckboxes = document.querySelectorAll('input[name="work_lines"]');
    const platePcbInput = document.getElementById('new-model-plate-pcb');
    // Errores del Modal
    const errorDivs = {
        modelName: document.getElementById('new-model-name-error'),
        pcb: document.getElementById('new-model-pcb-error'),
        qr: document.getElementById('new-model-qr-error'),
        pastaSelect: document.getElementById('new-model-pasta-select-error'),
        pastaOtro: document.getElementById('new-model-pasta-otro-error'),
        length: document.getElementById('new-model-length-error'),
        lines: document.getElementById('work_lines-error')
    };

    // Inputs para .is-invalid
     const modalInputs = {
        modelName: modelNameInput,
        pcb: pcbInput,
        qr: qrInput,
        pastaSelect: pastaSelect,
        pastaOtro: pastaOtroInput,
        length: lengthInput
        // No aplica a checkboxes directamente
    };

    let currentRecipes = []; // Guarda las recetas de la línea activa
    let currentLine = '1'; // Línea activa por defecto

    // --- Funciones de Utilidad ---
    function showError(fieldKey, message) {
        if (errorDivs[fieldKey]) {
            errorDivs[fieldKey].textContent = message;
            errorDivs[fieldKey].style.display = 'block';
        }
         if (modalInputs[fieldKey]) {
            modalInputs[fieldKey].classList.add('is-invalid');
        }
    }

    function clearAllModalErrors() {
        for (const key in errorDivs) {
            if (errorDivs[key]) {
                errorDivs[key].style.display = 'none';
            }
             if (modalInputs[key]) {
                modalInputs[key].classList.remove('is-invalid');
            }
        }
        // Limpiar específicamente el error de checkboxes
        if (errorDivs.lines) errorDivs.lines.style.display = 'none';
    }

    // --- Lógica Principal (Carga de Recetas, Búsqueda, Filtro por Línea) ---
    async function loadRecipesForLine(lineNumber) {
        currentLine = lineNumber;
        try {
            const response = await authFetch(`/api/recipes/line/${lineNumber}`);
            if (!response.ok) throw new Error('Error al cargar las recetas');
            currentRecipes = await response.json();
            displayRecipes(currentRecipes);
        } catch (error) {
            console.error(error);
            recipeContainer.innerHTML = `<p class="text-danger">No se pudieron cargar las recetas para la línea ${lineNumber}.</p>`;
        }
    }

    function displayRecipes(recipes) {
        recipeContainer.innerHTML = '';
        if (recipes.length === 0) {
            recipeContainer.innerHTML = '<p>No hay modelos asignados a esta línea.</p>';
            return;
        }
        recipes.forEach(recipe => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
            cardWrapper.innerHTML = `
                <a href="recipe-detail.html?pn_pcb=${encodeURIComponent(recipe.pn_pcb)}&side=${recipe.model_side}&line=${currentLine}" class="card-link">
                    <div class="card h-100 recipe-card">
                        <div class="card-body text-center d-flex flex-column justify-content-center">
                            <h5 class="card-title">${recipe.model_name} <strong>${recipe.model_side}</strong></h5>
                            <p class="card-text text-muted">${recipe.pn_pcb}</p>
                        </div>
                    </div>
                </a>
            `;
            recipeContainer.appendChild(cardWrapper);
        });
    }

    lineSelector.addEventListener('click', (event) => {
        event.preventDefault();
        const link = event.target;
        if (link.tagName === 'A') {
            document.querySelectorAll('#line-selector .nav-link').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            const lineNumber = link.getAttribute('data-line');
            loadRecipesForLine(lineNumber);
        }
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredRecipes = currentRecipes.filter(recipe =>
            recipe.model_name.toLowerCase().includes(searchTerm) ||
            recipe.pn_pcb.toLowerCase().includes(searchTerm)
        );
        displayRecipes(filteredRecipes);
    });

    // --- LÓGICA DEL MODAL DE "NUEVO MODELO" ---

    // ***** AQUÍ SE AÑADIÓ EL LISTENER PARA EL BOTÓN '+' *****
    // Event listener para el botón '+' que abre el modal
    addNewModelBtn.addEventListener('click', () => {
        // No necesitamos resetear el form aquí,
        // ya se hace en el evento 'show.bs.modal'
        newModelModal.show();
    });
    // ***** FIN DEL BLOQUE AÑADIDO *****

    // Evento para cargar pastas cuando el modal está a punto de mostrarse
    newModelModalEl.addEventListener('show.bs.modal', async () => {
        clearAllModalErrors();
        newModelForm.reset(); // Resetea el formulario
        pastaOtroContainer.style.display = 'none'; // Oculta el campo 'Otro'
        pastaOtroInput.value = '';
        pastaSelect.innerHTML = '<option value="" selected disabled>Cargando pastas...</option>'; // Placeholder

        try {
            const response = await authFetch('/api/data/pastas');
            const pastas = await response.json();

            pastaSelect.innerHTML = '<option value="" selected disabled>Seleccionar existente</option>'; // Default
            pastas.forEach(pasta => {
                pastaSelect.innerHTML += `<option value="${pasta}">${pasta}</option>`;
            });
            pastaSelect.innerHTML += '<option value="Otro">Otro (Especificar)</option>'; // Opción "Otro"

        } catch (error) {
            console.error("Error al cargar pastas:", error);
            pastaSelect.innerHTML = '<option value="" selected disabled>Error al cargar pastas</option>';
            showError('pastaSelect', 'No se pudieron cargar las pastas existentes.');
        }
    });

    // Evento para mostrar/ocultar el campo "Otra pasta"
    pastaSelect.addEventListener('change', () => {
        if (pastaSelect.value === 'Otro') {
            pastaOtroContainer.style.display = 'block';
            pastaOtroInput.required = true; // Hacer requerido si se muestra
        } else {
            pastaOtroContainer.style.display = 'none';
            pastaOtroInput.required = false; // No requerido si está oculto
            pastaOtroInput.value = ''; // Limpiar valor
             // Limpiar posible error si se selecciona una opción válida
             if(errorDivs.pastaOtro) errorDivs.pastaOtro.style.display = 'none';
             if(modalInputs.pastaOtro) modalInputs.pastaOtro.classList.remove('is-invalid');
             if(errorDivs.pastaSelect) errorDivs.pastaSelect.style.display = 'none';
             if(modalInputs.pastaSelect) modalInputs.pastaSelect.classList.remove('is-invalid');

        }
    });


    // Evento para guardar el nuevo modelo (CON VALIDACIÓN)
    saveNewModelBtn.addEventListener('click', async () => {
        clearAllModalErrors();
        let isValid = true;

        // 1. Validar Nombre Modelo
        const modelNameVal = modelNameInput.value.trim();
        if (!modelNameVal) { showError('modelName', 'El nombre del modelo es requerido.'); isValid = false; }
        // Maxlength ya lo controla el HTML

        // 2. Validar PN PCB
        const pcbVal = pcbInput.value.trim();
        if (!pcbVal) { showError('pcb', 'El PN PCB es requerido.'); isValid = false; }
         // Maxlength ya lo controla el HTML

        // 3. Validar QR (solo longitud si existe)
        const qrVal = qrInput.value.trim();
        // Maxlength ya lo controla el HTML (no necesita validación JS si es opcional)
        
        // 4. Validar Pasta
        const pastaSelectVal = pastaSelect.value;
        let finalPasta = pastaSelectVal;
        if (!pastaSelectVal) {
            showError('pastaSelect', 'Seleccione o especifique una pasta.');
            isValid = false;
        } else if (pastaSelectVal === 'Otro') {
            finalPasta = pastaOtroInput.value.trim();
            if (!finalPasta) {
                showError('pastaOtro', 'Especifique la nueva pasta.');
                isValid = false;
            }
             // Maxlength ya lo controla el HTML
        }

        // 5. Validar Largo Squeegee
        const lengthVal = lengthInput.value.trim();
        if (!lengthVal) {
             showError('length', 'El largo es requerido.'); isValid = false;
        } else if (!isNumericRegex.test(lengthVal)) {
            showError('length', 'Debe ser solo números enteros.'); isValid = false;
        }
        // Maxlength ya lo controla el HTML
        const platePcbVal = platePcbInput ? platePcbInput.value.trim() : '';
        // 6. Validar Líneas de Trabajo
        const selectedLines = [];
        lineCheckboxes.forEach((checkbox) => {
            if (checkbox.checked) { selectedLines.push(checkbox.value); }
        });
        if (selectedLines.length === 0) {
            showError('lines', 'Seleccione al menos una línea.'); // Muestra error bajo los checkboxes
            isValid = false;
        }

        // --- Si algo falló, detener ---
        if (!isValid) return;

        // --- Si todo OK, preparar y enviar ---
        const newModelData = {
            model_name: modelNameVal,
            pn_pcb: pcbVal,
            model_qr: qrVal, // Puede estar vacío
            pasta: finalPasta,
            length: lengthVal, // Ya validado como número
            lines: selectedLines,
            plate_pcb: platePcbVal
        };

        try {
            const response = await authFetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newModelData)
            });

             const result = await response.json(); // Leer respuesta siempre

            if (!response.ok) {
                // Usar el mensaje del servidor si está disponible
                throw new Error(result.message || `Error ${response.status}: ${response.statusText}`);
            }

            newModelModal.hide();
            alert('¡Modelo y líneas de trabajo creados con éxito!');
            loadRecipesForLine(currentLine); // Recargar la lista actual

        } catch (error) {
            console.error(error);
             // Mostrar el mensaje específico del error (ej. "PN PCB ya existe")
            alert(`Error al guardar: ${error.message}`);
        }
    });

    // Carga inicial
    loadRecipesForLine('1');
}); // Fin del DOMContentLoaded