// Contenido para: public/js/plateRegister.js (COMPLETO Y CORREGIDO)

document.addEventListener("DOMContentLoaded", () => {
    // --- Regex de Validación ---
    const isNumericRegex = /^\d+$/; // Solo números enteros, sin espacios

    // --- Variables del Formulario (Inputs) ---
    const registroForm = document.getElementById("registroPlateForm");
    if (!registroForm) return;

    const plJobInput = document.getElementById("pl_job");
    const suppNameSelect = document.getElementById("supp_name");
    const suppOtroInput = document.getElementById("supp_otro_input");
    const worklineSelect = document.getElementById("lineaDeTrabajo");
    const pcbSelect = document.getElementById("pl_pcb");
    const plNoSerieSelect = document.getElementById("pl_no_serie");
    const plVerSelect = document.getElementById("pl_ver");
    const arrivedDateInput = document.getElementById("pl_arrived_date");
    const currentUsInput = document.getElementById("pl_current_us");
    const mxUsInput = document.getElementById("pl_mx_us");

    // --- Variables del Formulario (Divs "Otro") ---
    const suppOtroDiv = document.getElementById("input-supp-otro");

    // --- Elementos de Error ---
     const fieldErrors = {
        pl_job: document.getElementById("pl_job-error"),
        supp_name: document.getElementById("supp_name-error"),
        supp_otro_input: document.getElementById("supp_otro_input-error"),
        lineaDeTrabajo: document.getElementById("lineaDeTrabajo-error"),
        pl_pcb: document.getElementById("pl_pcb-error"),
        pl_no_serie: document.getElementById("pl_no_serie-error"),
        pl_ver: document.getElementById("pl_ver-error"),
        pl_arrived_date: document.getElementById("pl_arrived_date-error"),
        pl_current_us: document.getElementById("pl_current_us-error"),
        pl_mx_us: document.getElementById("pl_mx_us-error")
    };
    
    // --- Elementos de Input (para clases 'is-invalid') ---
    const fieldInputs = {
        pl_job: plJobInput,
        supp_name: suppNameSelect,
        supp_otro_input: suppOtroInput,
        lineaDeTrabajo: worklineSelect,
        pl_pcb: pcbSelect,
        pl_no_serie: plNoSerieSelect,
        pl_ver: plVerSelect,
        pl_arrived_date: arrivedDateInput,
        pl_current_us: currentUsInput,
        pl_mx_us: mxUsInput
    };

    let loadedSeriesData = [];

    // --- Funciones de Utilidad ---
    function clearAndDisable(element) {
        element.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
        element.disabled = true;
    }

    function enableNextStep(element, isEnabled) {
        if (isEnabled) {
            element.disabled = false;
        } else {
            clearAndDisable(element);
        }
    }
    
    function showError(fieldKey, message) {
        if (fieldErrors[fieldKey]) {
            fieldErrors[fieldKey].textContent = message;
            fieldErrors[fieldKey].style.display = 'block';
        }
        if (fieldInputs[fieldKey]) {
            fieldInputs[fieldKey].classList.add('is-invalid');
        }
    }

    function clearAllErrors() {
        for (const key in fieldErrors) {
            if (fieldErrors[key]) {
                fieldErrors[key].style.display = 'none';
            }
            if (fieldInputs[key]) {
                fieldInputs[key].classList.remove('is-invalid');
            }
        }
    }


    async function loadSuppliers() {
        try {
            const response = await authFetch('/api/data/suppliers');
            const suppliers = await response.json();

            const currentOptions = Array.from(suppNameSelect.options).filter(opt => opt.value === "" || opt.value === "Otro");
            suppNameSelect.innerHTML = '';
            currentOptions.forEach(opt => suppNameSelect.appendChild(opt));

            suppliers.forEach(supp => {
                if (supp !== 'Otro') {
                    const option = document.createElement('option');
                    option.value = supp;
                    option.textContent = supp;
                    suppNameSelect.appendChild(option);
                }
            });
            suppNameSelect.disabled = false;
        } catch (error) {
            console.error("Error al cargar proveedores:", error);
            suppNameSelect.innerHTML = '<option value="" selected disabled>Error al cargar</option>';
        }
    }


    // --- LÓGICA DE ENCADENAMIENTO DE CAMPOS ---

    function checkInitialFields() {
        const jobValid = plJobInput.value.trim().length > 0;
        const suppValue = suppNameSelect.value.trim();
        const suppValid = suppValue.length > 0 && suppValue !== "Seleccionar";
        const isOtro = suppValue === "Otro";
        
        suppOtroDiv.style.display = isOtro ? 'block' : 'none';
        suppOtroInput.required = isOtro;

        const nuevoProveedorLleno = isOtro && suppOtroInput.value.trim().length > 0;
        const shouldEnableWorkline = jobValid && (suppValid || nuevoProveedorLleno);

        worklineSelect.disabled = !shouldEnableWorkline;
        
        if (!shouldEnableWorkline) {
            clearAndDisable(pcbSelect);
            clearAndDisable(plNoSerieSelect);
            clearAndDisable(plVerSelect);
        }
    }

    plJobInput.addEventListener('input', checkInitialFields);
    suppNameSelect.addEventListener('change', checkInitialFields);
    suppOtroInput.addEventListener('input', checkInitialFields); // Asegura que se actualice al escribir


    worklineSelect.addEventListener('change', async () => {
        const wl_no = worklineSelect.value;
        if (!wl_no) { enableNextStep(pcbSelect, false); return; }

        clearAndDisable(plNoSerieSelect);
        clearAndDisable(plVerSelect);

        try {
            const response = await authFetch(`/api/data/pcbs/${wl_no}`);
            const pcbs = await response.json();
            pcbSelect.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
            pcbs.forEach(pcb => { pcbSelect.innerHTML += `<option value="${pcb}">${pcb}</option>`; });
            enableNextStep(pcbSelect, true);
        } catch (error) { console.error("Error al cargar PCBs:", error); }
    });

    pcbSelect.addEventListener('change', async () => {
        const pn_pcb = pcbSelect.value;
        const model_side = 'BT'; // VALOR FIJO
        if (!pn_pcb) return;

        clearAndDisable(plNoSerieSelect);
        clearAndDisable(plVerSelect);

        try {
            const response = await authFetch(`/api/data/next-revision/${pn_pcb}`);
            const data = await response.json();
            loadedSeriesData = data.seriesData;
            plNoSerieSelect.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
            data.seriesData.forEach(item => { plNoSerieSelect.innerHTML += `<option value="${item.serie}">${item.serie}</option>`; });
            plNoSerieSelect.innerHTML += `<option value="${data.nextNewSerie}">Nuevo (${data.nextNewSerie})</option>`;
            enableNextStep(plNoSerieSelect, true);
        } catch (error) { console.error("Error al obtener series y versiones:", error); alert("Error al cargar series. Revisa la consola."); }
    });

    plNoSerieSelect.addEventListener('change', () => {
        const serie = plNoSerieSelect.value;
        clearAndDisable(plVerSelect);
        if (!serie) return;

        const isNewSerieOption = plNoSerieSelect.options[plNoSerieSelect.selectedIndex].textContent.includes('Nuevo');
        if (isNewSerieOption) {
            plVerSelect.innerHTML = '<option value="A">A (Primera versión de la nueva serie)</option>';
        } else {
            const serieData = loadedSeriesData.find(d => d.serie === serie);
            if (serieData) { plVerSelect.innerHTML = `<option value="${serieData.nextVersion}">${serieData.nextVersion} (Siguiente)</option>`; }
        }
        enableNextStep(plVerSelect, true);
    });

    // ==========================================================
    //  INICIO DE LÓGICA DE VALIDACIÓN DE SUBMIT
    // ==========================================================
    registroForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearAllErrors();
        let isValid = true;

        // --- 1. Validación Job ---
        const jobVal = plJobInput.value.trim();
        if (!jobVal) {
            showError('pl_job', 'El Job es requerido.');
            isValid = false;
        } else if (jobVal.length > 15) { // Límite de 15
            showError('pl_job', 'El Job no debe exceder los 15 caracteres.');
            isValid = false;
        }

        // --- 2. Validación Proveedor ---
        const suppVal = suppNameSelect.value;
        let finalSupplier = suppVal;
        if (!suppVal) {
            showError('supp_name', 'Seleccione un proveedor.');
            isValid = false;
        } else if (suppVal === "Otro") {
            finalSupplier = suppOtroInput.value.trim();
            if (!finalSupplier) {
                showError('supp_otro_input', 'Especifique el nombre del nuevo proveedor.');
                isValid = false;
            } else if (finalSupplier.length > 30) { // Límite de 30
                showError('supp_otro_input', 'El nombre no debe exceder los 30 caracteres.');
                isValid = false;
            }
        }

        // --- 3. Validación Selects Encadenados ---
        if (!worklineSelect.value) { showError('lineaDeTrabajo', 'Seleccione una línea.'); isValid = false; }
        if (!pcbSelect.value) { showError('pl_pcb', 'Seleccione un PCB.'); isValid = false; }
        if (!plNoSerieSelect.value) { showError('pl_no_serie', 'Seleccione una serie.'); isValid = false; }
        if (!plVerSelect.value) { showError('pl_ver', 'Seleccione una versión.'); isValid = false; }
        
        // --- 4. Validación Fecha ---
        if (!arrivedDateInput.value) {
            showError('pl_arrived_date', 'Seleccione una fecha de llegada.');
            isValid = false;
        }

        // --- 5. Validación Ciclos (Numérico, 6 dígitos) ---
        const currentUsVal = currentUsInput.value.trim();
        if (!currentUsVal) {
            showError('pl_current_us', 'Los ciclos actuales son requeridos.');
            isValid = false;
        } else if (!isNumericRegex.test(currentUsVal)) {
            showError('pl_current_us', 'Debe ser solo números, sin espacios.');
            isValid = false;
        } // Maxlength ya lo controla el HTML

        const mxUsVal = mxUsInput.value.trim();
        if (!mxUsVal) {
            showError('pl_mx_us', 'Los ciclos máximos son requeridos.');
            isValid = false;
        } else if (!isNumericRegex.test(mxUsVal)) {
            showError('pl_mx_us', 'Debe ser solo números, sin espacios.');
            isValid = false;
        } // Maxlength ya lo controla el HTML
        
        // --- 6. Detener si no es válido ---
        if (!isValid) return;

        // --- 7. Preparar y Enviar Datos ---
        const isNewSerieOption = plNoSerieSelect.options[plNoSerieSelect.selectedIndex].textContent.includes('Nuevo');
        const finalSerie = isNewSerieOption ? plNoSerieSelect.value : plNoSerieSelect.value;

        const plateData = {
            pl_job: jobVal,
            supp_name: finalSupplier,
            pn_pcb: pcbSelect.value,
            model_side: 'BT', // Fijo
            pl_no_serie: finalSerie,
            pl_ver: plVerSelect.value,
            pl_current_us: currentUsVal,
            pl_mx_us: mxUsVal,
            pl_arrived_date: arrivedDateInput.value,
        };

        try {
            const response = await authFetch("/api/plates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(plateData),
            });
            if (!response.ok) { throw new Error("La respuesta del servidor no fue exitosa."); }

            const result = await response.json();
            alert(`✅ Plate registrado con éxito!\nID: ${result.newId}\nPokayoke: ${result.barcode}`);

            registroForm.reset();
            suppOtroDiv.style.display = 'none';

            // Reinicia selects y habilita el primer paso
            clearAndDisable(worklineSelect);
            clearAndDisable(pcbSelect);
            clearAndDisable(plNoSerieSelect);
            clearAndDisable(plVerSelect);
            checkInitialFields(); // Habilita workline si job/supp están llenos
            
            if (typeof loadPlates === "function") { loadPlates(); }
            document.querySelector('a[data-target="#administracion-content"]').click();
        } catch (error) {
            console.error("Error al registrar:", error);
            alert("❌ Hubo un error al registrar el plate. Revisa la consola.");
        }
    });
     // ==========================================================
    //  FIN DE LÓGICA DE VALIDACIÓN DE SUBMIT
    // ==========================================================

    // --- Carga Inicial ---
    loadSuppliers();
    checkInitialFields(); // Ejecuta al inicio para deshabilitar campos
});