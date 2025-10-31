// Contenido para: public/js/stencilRegister.js

document.addEventListener("DOMContentLoaded", () => {
  const registroForm = document.getElementById("registroForm");
  if (!registroForm) return;

  // --- Regex de Validación ---
  const isNumericRegex = /^\d+$/; // Solo números enteros, sin espacios
  // Permite números como 123, 0.1, 0.15, 123.45. No permite '123.'
  const isDecimalRegex = /^\d+(\.\d{1,2})?$/; 

  // --- Elementos del Formulario (Inputs) ---
  const stJobInput = document.getElementById("st_job");
  const suppNameSelect = document.getElementById("supp_name");
  const suppOtroInput = document.getElementById("supp_otro_input");
  const worklineSelect = document.getElementById("lineaDeTrabajo");
  const pcbSelect = document.getElementById("pcb");
  const modelSideSelect = document.getElementById("modelSide");
  const thicknessSelect = document.getElementById("thickness");
  const thicknessOtroInput = document.getElementById("thickness_otro_input");
  const stNoSerieSelect = document.getElementById("st_no_serie");
  const stVerSelect = document.getElementById("st_ver");
  const currentUsInput = document.getElementById("current_us");
  const mxUsInput = document.getElementById("mx_us");
  const arrivedDateInput = document.getElementById("arrived_date");

  // --- Elementos del Formulario (Divs de "Otro") ---
  const suppOtroDiv = document.getElementById("input-supp-otro");
  const thicknessOtroDiv = document.getElementById("input-thickness-otro");
  
  // --- Elementos de Error ---
  const fieldErrors = {
      st_job: document.getElementById("st_job-error"),
      supp_name: document.getElementById("supp_name-error"),
      supp_otro_input: document.getElementById("supp_otro_input-error"),
      lineaDeTrabajo: document.getElementById("lineaDeTrabajo-error"),
      pcb: document.getElementById("pcb-error"),
      modelSide: document.getElementById("modelSide-error"),
      thickness: document.getElementById("thickness-error"),
      thickness_otro_input: document.getElementById("thickness_otro_input-error"),
      st_no_serie: document.getElementById("st_no_serie-error"),
      st_ver: document.getElementById("st_ver-error"),
      current_us: document.getElementById("current_us-error"),
      mx_us: document.getElementById("mx_us-error"),
      arrived_date: document.getElementById("arrived_date-error")
  };
  
  // --- Elementos de Input (para clases 'is-invalid') ---
   const fieldInputs = {
      st_job: stJobInput,
      supp_name: suppNameSelect,
      supp_otro_input: suppOtroInput,
      lineaDeTrabajo: worklineSelect,
      pcb: pcbSelect,
      modelSide: modelSideSelect,
      thickness: thicknessSelect,
      thickness_otro_input: thicknessOtroInput,
      st_no_serie: stNoSerieSelect,
      st_ver: stVerSelect,
      current_us: currentUsInput,
      mx_us: mxUsInput,
      arrived_date: arrivedDateInput
  };

  // Datos cargados del backend para la lógica de versiones
  let loadedSeriesData = [];

  // --- Funciones de Utilidad ---
  function clearAndDisable(element) {
    if (element.id === 'modelSide') {
      element.disabled = true;
      element.value = "";
      return;
    }
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
    const jobValid = stJobInput.value.trim().length > 0;
    const suppValue = suppNameSelect.value.trim();
    const isOtro = suppValue === "Otro";
    suppOtroDiv.style.display = isOtro ? 'block' : 'none';
    suppOtroInput.required = isOtro;
    const nuevoProveedorLleno = isOtro && suppOtroInput.value.trim().length > 0;
    const proveedorExistenteSeleccionado = !isOtro && suppValue.length > 0;
    const shouldEnableWorkline = jobValid && (proveedorExistenteSeleccionado || nuevoProveedorLleno);
    worklineSelect.disabled = !shouldEnableWorkline;
    if (!shouldEnableWorkline) {
      clearAndDisable(pcbSelect);
      clearAndDisable(modelSideSelect);
      clearAndDisable(thicknessSelect);
      clearAndDisable(stNoSerieSelect);
      clearAndDisable(stVerSelect);
    }
  }

  stJobInput.addEventListener('input', checkInitialFields);
  suppNameSelect.addEventListener('change', checkInitialFields);
  suppOtroInput.addEventListener('input', checkInitialFields); 

  worklineSelect.addEventListener('change', async () => {
    const wl_no = worklineSelect.value;
    if (!wl_no) { enableNextStep(pcbSelect, false); return; }
    try {
      const response = await authFetch(`/api/data/pcbs/${wl_no}`);
      const pcbs = await response.json();
      pcbSelect.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
      pcbs.forEach(pcb => {
        const option = document.createElement('option');
        option.value = pcb;
        option.textContent = pcb;
        pcbSelect.appendChild(option);
      });
      enableNextStep(pcbSelect, true);
    } catch (error) { console.error("Error al cargar PCBs:", error); }
  });

  pcbSelect.addEventListener('change', () => {
    const pn_pcb = pcbSelect.value;
    if (!pn_pcb) { enableNextStep(modelSideSelect, false); return; }
    enableNextStep(modelSideSelect, true);
    clearAndDisable(thicknessSelect);
    clearAndDisable(stNoSerieSelect);
    clearAndDisable(stVerSelect);
  });

  modelSideSelect.addEventListener('change', async () => {
    const pn_pcb = pcbSelect.value;
    const model_side = modelSideSelect.value;
    if (!pn_pcb || !model_side) return;
    clearAndDisable(thicknessSelect);
    clearAndDisable(stNoSerieSelect);
    clearAndDisable(stVerSelect);
    thicknessOtroDiv.style.display = 'none';
    try {
      const response = await authFetch(`/api/data/thickness/${pn_pcb}/${model_side}`);
      const thicknesses = await response.json();
      thicknessSelect.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
      thicknesses.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = t;
        thicknessSelect.appendChild(option);
      });
      thicknessSelect.innerHTML += '<option value="Otro">Otro (Ingresar manualmente)</option>';
      enableNextStep(thicknessSelect, true);
    } catch (error) { console.error("Error al cargar grosores:", error); }
  });

  thicknessSelect.addEventListener('change', async () => {
    const thickness = thicknessSelect.value;
    const pn_pcb = pcbSelect.value;
    const model_side = modelSideSelect.value;
    const isOtro = thickness === "Otro";
    
    thicknessOtroDiv.style.display = isOtro ? 'block' : 'none';
    thicknessOtroInput.required = isOtro;
    thicknessOtroInput.value = ''; 
    
    clearAndDisable(stNoSerieSelect);
    clearAndDisable(stVerSelect);

    if (thickness && !isOtro) {
      try {
        const response = await authFetch(`/api/data/next-version/${pn_pcb}/${model_side}/${thickness}`);
        const data = await response.json();
        loadedSeriesData = data.seriesData; 
        stNoSerieSelect.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
        data.seriesData.forEach(item => {
          stNoSerieSelect.innerHTML += `<option value="${item.serie}">${item.serie}</option>`;
        });
        stNoSerieSelect.innerHTML += `<option value="${data.nextNewSerie}">Nuevo (${data.nextNewSerie})</option>`;
        enableNextStep(stNoSerieSelect, true); 
      } catch (error) {
        console.error("Error al obtener series y versiones:", error);
        alert("Error al cargar series. Revisa la consola.");
        enableNextStep(stNoSerieSelect, false);
      }
    }
  });

  thicknessOtroInput.addEventListener('input', () => {
    if (thicknessOtroInput.value.trim().length > 0) {
        stNoSerieSelect.innerHTML = '<option value="1.0">Nuevo (1.0)</option>';
        stVerSelect.innerHTML = '<option value="A">A (Primera versión de la nueva serie)</option>';
        enableNextStep(stNoSerieSelect, true);
        enableNextStep(stVerSelect, true);
    } else {
        clearAndDisable(stNoSerieSelect);
        clearAndDisable(stVerSelect);
    }
  });

  stNoSerieSelect.addEventListener('change', () => {
    const serie = stNoSerieSelect.value;
    clearAndDisable(stVerSelect);
    if (!serie) return;
    const isNewSerieOption = stNoSerieSelect.options[stNoSerieSelect.selectedIndex].textContent.includes('Nuevo');
    if (isNewSerieOption) {
      stVerSelect.innerHTML = '<option value="A">A (Primera versión de la nueva serie)</option>';
    } else {
      const serieData = loadedSeriesData.find(d => d.serie === serie);
      if (serieData) {
        stVerSelect.innerHTML = `<option value="${serieData.nextVersion}">${serieData.nextVersion} (Siguiente)</option>`;
      }
    }
    enableNextStep(stVerSelect, true);
  });

  // ==========================================================
  //  INICIO DE LÓGICA DE VALIDACIÓN DE SUBMIT
  // ==========================================================
  registroForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAllErrors();
    let isValid = true;

    // --- 1. Validación de Campos de Texto ---
    const jobVal = stJobInput.value.trim();
    if (!jobVal) {
        showError('st_job', 'El Job es requerido.');
        isValid = false;
    } else if (jobVal.length > 10) {
        showError('st_job', 'El Job no debe exceder los 10 caracteres.');
        isValid = false;
    }

    // --- 2. Validación de Proveedor ---
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
        } else if (finalSupplier.length > 30) {
            showError('supp_otro_input', 'El nombre no debe exceder los 30 caracteres.');
            isValid = false;
        }
    }
    
    // --- 3. Validación de Selects Encadenados ---
    if (!worklineSelect.value) { showError('lineaDeTrabajo', 'Seleccione una línea.'); isValid = false; }
    if (!pcbSelect.value) { showError('pcb', 'Seleccione un PCB.'); isValid = false; }
    if (!modelSideSelect.value) { showError('modelSide', 'Seleccione un lado.'); isValid = false; }

    // --- 4. Validación de Grosor ---
    const thicknessVal = thicknessSelect.value;
    let finalThickness = thicknessVal;
    if (!thicknessVal) {
        showError('thickness', 'Seleccione un grosor.');
        isValid = false;
    } else if (thicknessVal === "Otro") {
        finalThickness = thicknessOtroInput.value.trim();
        if (!finalThickness) {
            showError('thickness_otro_input', 'Especifique el nuevo grosor.');
            isValid = false;
        } else if (!isDecimalRegex.test(finalThickness)) {
            showError('thickness_otro_input', 'Debe ser un número. Ej: 0.15 o 123.45');
            isValid = false;
        } else if (parseFloat(finalThickness) <= 0) {
             showError('thickness_otro_input', 'Debe ser un número positivo.');
            isValid = false;
        } else if (parseFloat(finalThickness) >= 1000) {
            // numeric(5,2) max es 999.99
             showError('thickness_otro_input', 'El valor es demasiado grande (max 999.99).');
            isValid = false;
        }
    }

    // --- 5. Validación de Serie y Versión ---
    if (!stNoSerieSelect.value) { showError('st_no_serie', 'Seleccione una serie.'); isValid = false; }
    if (!stVerSelect.value) { showError('st_ver', 'Seleccione una versión.'); isValid = false; }

    // --- 6. Validación de Ciclos (Numérico, 6 dígitos) ---
    const currentUsVal = currentUsInput.value.trim();
    if (!currentUsVal) {
        showError('current_us', 'Los ciclos actuales son requeridos.');
        isValid = false;
    } else if (!isNumericRegex.test(currentUsVal)) {
        showError('current_us', 'Debe ser solo números, sin espacios.');
        isValid = false;
    }

    const mxUsVal = mxUsInput.value.trim();
    if (!mxUsVal) {
        showError('mx_us', 'Los ciclos máximos son requeridos.');
        isValid = false;
    } else if (!isNumericRegex.test(mxUsVal)) {
        showError('mx_us', 'Debe ser solo números, sin espacios.');
        isValid = false;
    }

    // --- 7. Validación de Fecha ---
    if (!arrivedDateInput.value) {
        showError('arrived_date', 'Seleccione una fecha de llegada.');
        isValid = false;
    }
    
    // --- 8. Detener si no es válido ---
    if (!isValid) return;

    // --- 9. Preparar y Enviar Datos ---
    const isNewSerieOption = stNoSerieSelect.options[stNoSerieSelect.selectedIndex].textContent.includes('Nuevo');
    const finalSerie = isNewSerieOption ? stNoSerieSelect.value : stNoSerieSelect.value;
    
    const stencilData = {
      st_job: jobVal,
      supp_name: finalSupplier,
      pn_pcb: pcbSelect.value,
      model_side: modelSideSelect.value,
      st_no_serie: finalSerie,
      st_ver: stVerSelect.value,
      st_side: modelSideSelect.value,
      thickness: finalThickness,
      current_us: currentUsVal,
      mx_us: mxUsVal,
      arrived_date: arrivedDateInput.value
    };

    try {
      const response = await authFetch("/api/stencils", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stencilData),
      });
      if (!response.ok) throw new Error("La respuesta del servidor no fue exitosa.");
      
      const result = await response.json();
      alert(`✅ Stencil registrado con éxito!\nID: ${result.newId}\nBarcode: ${result.barcode}`);
      
      registroForm.reset();
      suppOtroDiv.style.display = 'none';
      thicknessOtroDiv.style.display = 'none';
      
      // Resetea todos los selects encadenados
      clearAndDisable(worklineSelect);
      clearAndDisable(pcbSelect);
      clearAndDisable(modelSideSelect);
      clearAndDisable(thicknessSelect);
      clearAndDisable(stNoSerieSelect);
      clearAndDisable(stVerSelect);
      
      // Habilita el primer paso de nuevo
      checkInitialFields(); 
      
      if (typeof loadStencils === "function") { loadStencils(); }
      document.querySelector('a[data-target="#administracion-content"]').click();
    } catch (error) {
      console.error("Error al registrar:", error);
      alert("❌ Hubo un error al registrar el stencil. Revisa la consola para más detalles.");
    }
  });
  // ==========================================================
  //  FIN DE LÓGICA DE VALIDACIÓN DE SUBMIT
  // ==========================================================

  loadSuppliers();
});