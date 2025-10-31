// Espera a que todo el HTML esté cargado para empezar a trabajar
document.addEventListener("DOMContentLoaded", () => {
  const registroForm = document.getElementById("registroForm");
  if (!registroForm) return; // Si no encuentra el form, no hace nada

  // --- LÓGICA PARA QUE LOS CHECKBOX DE "LADO" ACTÚEN COMO RADIOS ---
  const sideCheckboxes = [
    document.getElementById("ladoF"),
    document.getElementById("ladoR"),
    document.getElementById("ladoY"),
  ];

  sideCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("click", () => {
      // Cuando se hace clic en un checkbox, desmarca los otros
      sideCheckboxes.forEach((otherCheckbox) => {
        if (otherCheckbox !== checkbox) {
          otherCheckbox.checked = false;
        }
      });
    });
  });

  // ==========================================================
  //  INICIO DE LÓGICA DE VALIDACIÓN ACTUALIZADA
  // ==========================================================
  registroForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que la página se recargue

    let isValid = true;
    const isNumericRegex = /^\d+$/; // Expresión regular para solo números enteros

    // --- 1. Definir y Ocultar Errores Previos ---
    const fields = {
      largo: {
        input: document.getElementById("largo"),
        error: document.getElementById("largo-error"),
        maxLength: 5
      },
      lado: {
        inputs: sideCheckboxes,
        error: document.getElementById("lado-error")
      },
      arrived_date: {
        input: document.getElementById("arrived_date"),
        error: document.getElementById("arrived_date-error")
      },
      current_cycles: {
        input: document.getElementById("ciclos-actuales"),
        error: document.getElementById("ciclos-actuales-error"),
        maxLength: 6
      },
      max_cycles: {
        input: document.getElementById("ciclos-permitidos"),
        error: document.getElementById("ciclos-permitidos-error"),
        maxLength: 6
      }
    };

    // Ocultar todos los errores y quitar bordes rojos
    for (const key in fields) {
      const field = fields[key];
      if (field.error) field.error.style.display = 'none';
      if (field.input) field.input.classList.remove('is-invalid');
      // No aplica a 'lado'
    }

    // --- 2. Validar Campos Numéricos (Largo, Ciclos) ---
    const numericFields = [fields.largo, fields.current_cycles, fields.max_cycles];
    
    numericFields.forEach(field => {
      const value = field.input.value.trim();
      
      if (!value) {
        field.error.textContent = "Este campo es requerido.";
        field.error.style.display = "block";
        field.input.classList.add("is-invalid");
        isValid = false;
      } else if (!isNumericRegex.test(value)) {
        field.error.textContent = "Este campo solo debe contener números (sin espacios ni letras).";
        field.error.style.display = "block";
        field.input.classList.add("is-invalid");
        isValid = false;
      } else if (value.length > field.maxLength) {
         // Esta validación es extra, maxlength la previene, pero es buena práctica
        field.error.textContent = `No debe exceder los ${field.maxLength} dígitos.`;
        field.error.style.display = "block";
        field.input.classList.add("is-invalid");
        isValid = false;
      }
    });

    // --- 3. Validar Lado ---
    const selectedSideCheckbox = fields.lado.inputs.find((cb) => cb.checked);
    if (!selectedSideCheckbox) {
      fields.lado.error.style.display = "block";
      isValid = false;
    }

    // --- 4. Validar Fecha ---
    if (!fields.arrived_date.input.value) {
      fields.arrived_date.error.style.display = "block";
      fields.arrived_date.input.classList.add("is-invalid");
      isValid = false;
    }

    // --- 5. Detener si no es válido ---
    if (!isValid) {
      return;
    }
    
    // ==========================================================
    //  FIN DE LÓGICA DE VALIDACIÓN
    // ==========================================================


    // 6. Recolecta los datos (ahora que son válidos)
    const squeegeeData = {
      length: parseInt(fields.largo.input.value.trim()),
      side: selectedSideCheckbox.labels[0].textContent,
      currentCycles: parseInt(fields.current_cycles.input.value.trim()),
      maxCycles: parseInt(fields.max_cycles.input.value.trim()),
      arrivedDate: fields.arrived_date.input.value
    };

    try {
      // 7. Envía los datos al servidor
      const response = await authFetch("/api/squeegees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(squeegeeData),
      });

      if (!response.ok) {
        throw new Error("La respuesta del servidor no fue exitosa.");
      }

      const result = await response.json();

      // 8. Muestra un mensaje de éxito y limpia el formulario
      alert(
        `✅ Squeegee registrado con éxito!\nID: ${result.newId}\nBarcode: ${result.barcode}`
      );
      registroForm.reset();
      
      // Resetea el checkbox de 'lado' al valor por defecto (F)
      document.getElementById("ladoF").checked = true;
      document.getElementById("ladoR").checked = false;
      document.getElementById("ladoY").checked = false;


      // Opcional: Recarga la tabla principal y vuelve a la pestaña de administración
      if (typeof loadSqueegees === "function") {
        loadSqueegees();
      }
      document
        .querySelector('a[data-target="#administracion-content"]')
        .click();
    } catch (error) {
      console.error("Error al registrar:", error);
      alert(
        "❌ Hubo un error al registrar el squeegee. Revisa la consola para más detalles."
      );
    }
  });
});