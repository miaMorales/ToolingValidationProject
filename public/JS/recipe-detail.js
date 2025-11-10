document.addEventListener('DOMContentLoaded', () => {
    // --- Regex ---
    const isNumericRegex = /^\d+$/; // Solo números enteros

    // --- Parámetros URL ---
    const params = new URLSearchParams(window.location.search);
    const pn_pcb = params.get('pn_pcb');
    const side = params.get('side');
    const line = params.get('line'); // Obtiene el número de línea

    // --- Elementos DOM Principales ---
    const recipeTitle = document.getElementById('main-recipe-title');
    const recipePN = document.getElementById('recipe-pn-display');
    const stencilsTableBody = document.getElementById('stencils-table-body');
    const squeegeesTableBody = document.getElementById('squeegees-table-body');
    const platesTableBody = document.getElementById('plates-table-body');
    const searchInput = document.getElementById('table-search-input');

    // --- Elementos del Modal de Edición ---
    const editModelBtn = document.getElementById('edit-model-btn');
    const editModalEl = document.getElementById('editModelModal');
    const editModal = new bootstrap.Modal(editModalEl);
    const saveModelChangesBtn = document.getElementById('saveModelChangesBtn');
    const editModelForm = document.getElementById('editModelForm'); // Referencia al form
    
    // Inputs del Modal Edición
    const editQrInput = document.getElementById('edit-model-qr');
    const editPastaSelect = document.getElementById('edit-model-pasta-select');
    const editPastaOtroContainer = document.getElementById('edit-model-pasta-otro-container');
    const editPastaOtroInput = document.getElementById('edit-model-pasta-otro');
    const editLengthInput = document.getElementById('edit-model-length');

    // Errores del Modal Edición
    const editErrorDivs = {
        qr: document.getElementById('edit-model-qr-error'),
        pastaSelect: document.getElementById('edit-model-pasta-select-error'),
        pastaOtro: document.getElementById('edit-model-pasta-otro-error'),
        length: document.getElementById('edit-model-length-error')
    };
    
    // Inputs para .is-invalid del Modal Edición
     const editModalInputs = {
        qr: editQrInput,
        pastaSelect: editPastaSelect,
        pastaOtro: editPastaOtroInput,
        length: editLengthInput
    };


    // --- Validación Inicial ---
    if (!pn_pcb || !side || !line) { // Asegura que line también exista
        recipeTitle.textContent = 'Error: Faltan parámetros en la URL (PN, Side o Line).';
        recipePN.textContent = '';
        return;
    }
    /**
     * Esta función usa authFetch para cargar una imagen protegida por token.
     * @param {HTMLImageElement} imgElement El elemento <img> que queremos cargar.
     */
    async function loadProtectedImage(imgElement) {
        const url = imgElement.dataset.src; // Tomamos la URL del atributo data-src
        if (!url) return;

        try {
            // 1. Usamos authFetch, que SÍ envía el token
            const response = await authFetch(url);
            if (!response.ok) throw new Error('No se pudo cargar la imagen QR');

            // 2. Convertimos la respuesta en un "Blob" (un archivo en memoria)
            const imageBlob = await response.blob();

            // 3. Creamos una URL local para ese Blob
            const imageObjectURL = URL.createObjectURL(imageBlob);

            // 4. Asignamos esa URL local al 'src' de la imagen
            imgElement.src = imageObjectURL;
        } catch (error) {
            console.error('Error al cargar imagen protegida:', url, error);
            imgElement.alt = "Error al cargar QR"; // Mostramos un error en la imagen
        }
    }
    // --- Funciones de Utilidad ---
     function showEditError(fieldKey, message) {
        if (editErrorDivs[fieldKey]) {
            editErrorDivs[fieldKey].textContent = message;
            editErrorDivs[fieldKey].style.display = 'block';
        }
         if (editModalInputs[fieldKey]) {
            editModalInputs[fieldKey].classList.add('is-invalid');
        }
    }

    function clearAllEditModalErrors() {
        for (const key in editErrorDivs) {
            if (editErrorDivs[key]) {
                editErrorDivs[key].style.display = 'none';
            }
             if (editModalInputs[key]) {
                editModalInputs[key].classList.remove('is-invalid');
            }
        }
    }

    // --- Carga de Detalles de Receta ---
    async function loadDetails() {
        try {
            // Ya tenemos 'line' de la validación inicial
            const response = await authFetch(`/api/recipes/${encodeURIComponent(pn_pcb)}/${side}?line=${line}`);
            if (!response.ok) throw new Error('No se encontró la receta o hubo un error.');

            const data = await response.json();

            recipeTitle.textContent = `${data.model_name} ${data.model_side}`;
            recipePN.textContent = data.pn_pcb;

            populateStencilsTable(data.stencils);
            populateSqueegeesTable(data.squeegees);
            populatePlatesTable(data.plates);

        } catch (error) {
            console.error(error);
            recipeTitle.textContent = 'Error al cargar los detalles.';
            recipePN.textContent = '';
        }
    }

    // --- Lógica de Búsqueda en Tablas ---
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeTabPane = document.querySelector('.tab-pane.fade.show.active');
        if (activeTabPane) {
            const tableRows = activeTabPane.querySelectorAll('tbody tr');
            tableRows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
        }
    });

    // --- Funciones para Poblar Tablas ---
    // (populateStencilsTable, populateSqueegeesTable, populatePlatesTable - Sin cambios)
function populateStencilsTable(stencils) {
    stencilsTableBody.innerHTML = '';
    if (!stencils || stencils.length === 0) {
        stencilsTableBody.innerHTML = '<tr><td colspan="8">No se encontraron stencils compatibles.</td></tr>';
        return;
    }
    stencils.forEach((item, index) => {
        // --- CAMBIO AQUÍ ---
        const qrCodeUrl = item.st_bc ? `/api/stencils/${item.st_id}/qr` : '';
        // Usamos data-src y la clase 'lazy-qr'
        const qrImage = qrCodeUrl ? `<img alt="Cargando QR..." class="table-qr lazy-qr" data-src="${qrCodeUrl}">` : '';
        // --- FIN DEL CAMBIO ---

        const row = `
            <tr>
                <td>${item.st_id}</td>
                <td>${item.st_bc || 'N/A'}</td>
                <td>${item.st_no_serie || 'N/A'}</td>
                <td>${item.st_ver || 'N/A'}</td>
                <td>${item.thickness || 'N/A'}</td>
                <td>${item.st_status || 'N/A'}</td>
                <td>${qrImage}</td>
                <td></td>
            </tr>
        `;
        stencilsTableBody.innerHTML += row;
    });

    // --- CAMBIO AQUÍ: Llamar al helper después de llenar la tabla ---
    stencilsTableBody.querySelectorAll('.lazy-qr').forEach(img => loadProtectedImage(img));
}

function populateSqueegeesTable(squeegees) {
    squeegeesTableBody.innerHTML = '';
    if (!squeegees || squeegees.length === 0) {
        squeegeesTableBody.innerHTML = '<tr><td colspan="6">No se encontraron squeegees compatibles.</td></tr>';
        return;
    }
    squeegees.forEach((item, index) => {
        // --- CAMBIO AQUÍ ---
        const qrCodeUrl = item.sq_bc ? `/api/squeegees/${item.sq_id}/qr` : '';
        // Usamos data-src y la clase 'lazy-qr'
        const qrImage = qrCodeUrl ? `<img alt="Cargando QR..." class="table-qr lazy-qr" data-src="${qrCodeUrl}">` : '';
        // --- FIN DEL CAMBIO ---

        const row = `
            <tr>
                <td>${item.sq_id}</td>
                <td>${item.sq_bc || 'N/A'}</td>
                <td>${item.sq_length || 'N/A'}</td>
                <td>${item.sq_status || 'N/A'}</td>
                <td>${qrImage}</td>
                <td></td>
            </tr>
        `;
        squeegeesTableBody.innerHTML += row;
    });

    // --- CAMBIO AQUÍ: Llamar al helper después de llenar la tabla ---
    squeegeesTableBody.querySelectorAll('.lazy-qr').forEach(img => loadProtectedImage(img));
}

function populatePlatesTable(plates) {
    platesTableBody.innerHTML = '';
    if (!plates || plates.length === 0) {
        platesTableBody.innerHTML = '<tr><td colspan="6">No se encontraron plates compatibles.</td></tr>';
        return;
    }
    plates.forEach((item, index) => {
        // --- CAMBIO AQUÍ ---
        const qrCodeUrl = item.pl_bc ? `/api/plates/${item.pl_id}/qr` : '';
        // Usamos data-src y la clase 'lazy-qr'
        const qrImage = qrCodeUrl ? `<img alt="Cargando QR..." class="table-qr lazy-qr" data-src="${qrCodeUrl}">` : '';
        // --- FIN DEL CAMBIO ---

        const row = `
            <tr>
                <td>${item.pl_id}</td>
                <td>${item.pl_bc || 'N/A'}</td>
                <td>${item.pl_no_serie || 'N/A'}</td>
                <td>${item.pl_status || 'N/A'}</td>
                <td>${qrImage}</td>
                <td></td>
            </tr>
        `;
        platesTableBody.innerHTML += row;
    });

    // --- CAMBIO AQUÍ: Llamar al helper después de llenar la tabla ---
    platesTableBody.querySelectorAll('.lazy-qr').forEach(img => loadProtectedImage(img));
}


    // --- LÓGICA DEL MODAL DE EDICIÓN ---

    // 1. Evento para abrir el modal, cargar datos y pastas
    editModelBtn.addEventListener('click', async () => {
        clearAllEditModalErrors();
        editModelForm.reset(); // Resetea antes de cargar
        editPastaOtroContainer.style.display = 'none'; // Oculta campo Otro
        editPastaSelect.innerHTML = '<option value="" selected disabled>Cargando...</option>'; // Placeholder

        try {
            // Pide los datos actuales del modelo
            const modelResponse = await authFetch(`/api/models/${encodeURIComponent(pn_pcb)}/${side}`);
            if (!modelResponse.ok) throw new Error('No se pudieron cargar los datos del modelo.');
            const modelData = await modelResponse.json();

            // Pide las pastas existentes
            const pastaResponse = await authFetch('/api/data/pastas');
            if (!pastaResponse.ok) throw new Error('No se pudieron cargar las pastas.');
            const pastas = await pastaResponse.json();

            // Rellena QR y Largo
            editQrInput.value = modelData.model_qr || '';
            editLengthInput.value = modelData.length || '';

            // Llenar select de Pasta
            editPastaSelect.innerHTML = '<option value="" selected disabled>Seleccionar existente</option>';
            let pastaExistsInList = false;
            pastas.forEach(pasta => {
                const selected = (pasta === modelData.pasta);
                editPastaSelect.innerHTML += `<option value="${pasta}" ${selected ? 'selected' : ''}>${pasta}</option>`;
                if (selected) pastaExistsInList = true;
            });
            editPastaSelect.innerHTML += '<option value="Otro">Otro (Especificar)</option>';

            // Si la pasta actual no está en la lista, seleccionar "Otro" y llenar el input
            if (modelData.pasta && !pastaExistsInList) {
                editPastaSelect.value = 'Otro';
                editPastaOtroInput.value = modelData.pasta;
                editPastaOtroContainer.style.display = 'block';
                 editPastaOtroInput.required = true;
            } else {
                 editPastaOtroContainer.style.display = 'none';
                 editPastaOtroInput.required = false;
            }


            const modalTitle = editModalEl.querySelector('.modal-title');
            modalTitle.textContent = `Editar ${recipeTitle.textContent}`;
            editModal.show();

        } catch (error) {
            console.error(error);
            alert(`Error al cargar datos para editar: ${error.message}`);
        }
    });

    // 2. Listener para el Select de Pasta en Edición
     editPastaSelect.addEventListener('change', () => {
        if (editPastaSelect.value === 'Otro') {
            editPastaOtroContainer.style.display = 'block';
            editPastaOtroInput.required = true;
        } else {
            editPastaOtroContainer.style.display = 'none';
            editPastaOtroInput.required = false;
            editPastaOtroInput.value = ''; // Limpiar
             // Limpiar posible error si se selecciona una opción válida
             if(editErrorDivs.pastaOtro) editErrorDivs.pastaOtro.style.display = 'none';
             if(editModalInputs.pastaOtro) editModalInputs.pastaOtro.classList.remove('is-invalid');
             if(editErrorDivs.pastaSelect) editErrorDivs.pastaSelect.style.display = 'none';
             if(editModalInputs.pastaSelect) editModalInputs.pastaSelect.classList.remove('is-invalid');
        }
    });


    // 3. Evento para guardar los cambios (CON VALIDACIÓN)
    saveModelChangesBtn.addEventListener('click', async () => {
        clearAllEditModalErrors();
        let isValid = true;

        // Validar QR (solo longitud si no está vacío)
        const qrVal = editQrInput.value.trim();
        // Maxlength ya valida longitud máxima

        // Validar Pasta
        const pastaSelectVal = editPastaSelect.value;
        let finalPasta = pastaSelectVal;
        if (!pastaSelectVal) {
            showEditError('pastaSelect', 'Seleccione o especifique una pasta.');
            isValid = false;
        } else if (pastaSelectVal === 'Otro') {
            finalPasta = editPastaOtroInput.value.trim();
            if (!finalPasta) {
                showEditError('pastaOtro', 'Especifique la nueva pasta.');
                isValid = false;
            }
             // Maxlength valida longitud máxima
        }

        // Validar Largo
        const lengthVal = editLengthInput.value.trim();
         if (!lengthVal) { // Largo es requerido en edición también
             showEditError('length', 'El largo es requerido.'); isValid = false;
        } else if (!isNumericRegex.test(lengthVal)) {
            showEditError('length', 'Debe ser solo números enteros.'); isValid = false;
        }
        // Maxlength ya valida longitud máxima

        if (!isValid) return;

        // Si es válido, prepara datos
        const updatedData = {
            qr: qrVal,
            pasta: finalPasta,
            length: lengthVal // Ya validado como número
        };

        try {
            const response = await authFetch(`/api/models/${encodeURIComponent(pn_pcb)}/${side}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error('Error al guardar los cambios.');

            editModal.hide();
            alert('Modelo actualizado con éxito.');
            // Opcional: Recargar detalles podría ser útil si estos datos se muestran en la página principal
            // loadDetails();

        } catch (error) {
            console.error(error);
            alert(`No se pudieron guardar los cambios: ${error.message}`);
        }
    });

    // --- Carga Inicial ---
    loadDetails();
}); // Fin DOMContentLoaded