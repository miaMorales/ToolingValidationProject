// Contenido para: public/js/stencilAdmin.js

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("general-search-input");
  const adminTableBody = document.querySelector(
    "#administracion-content table tbody"
  );
  const historyTableBody = document.querySelector(
    "#historial-content table tbody"
  );
  const bajaTableBody = document.querySelector("#baja-content table tbody");
  let searchTimeout;

  // ==========================================================
  //  --- CAMBIO 1: AÑADIR LA FUNCIÓN DE AYUDA (HELPER) ---
  // ==========================================================
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

          imgElement.src = imageObjectURL;
      } catch (error) {
          console.error('Error al cargar imagen protegida:', url, error);
          imgElement.alt = "Error al cargar QR"; // Mostramos un error en la imagen
      }
  }
  // ==========================================================
  //  FIN DEL CAMBIO 1
  // ==========================================================


  /**
   * Filtra una tabla del lado del cliente, ocultando las filas que no coinciden.
   * @param {string} tableBodySelector - El selector CSS para el tbody de la tabla a filtrar.
   * @param {string} searchTerm - El término de búsqueda.
   */
  function applyGeneralClientSideFilter(tableBodySelector, searchTerm) {
    const tableBody = document.querySelector(tableBodySelector);
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll("tr");
    const upperCaseSearchTerm = searchTerm.toUpperCase();

    rows.forEach((row) => {
      row.style.display = row.textContent
        .toUpperCase()
        .includes(upperCaseSearchTerm)
        ? ""
        : "none";
    });
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      const searchTerm = searchInput.value.trim();
      const activeTab = document.querySelector(
        "#stencil-tabs .nav-link.active"
      );

      if (!activeTab) return;

      const activeContentId = activeTab.getAttribute("data-target");

      switch (activeContentId) {
        case "#administracion-content":
          applyGeneralClientSideFilter(
            "#administracion-content .stencil-table tbody",
            searchTerm
          );
          break;
        case "#historial-content":
          applyGeneralClientSideFilter(
            "#historial-content .stencil-table tbody",
            searchTerm
          );
          break;
        case "#baja-content":
          applyGeneralClientSideFilter(
            "#baja-content .stencil-table tbody",
            searchTerm
          );
          break;
      }
    }, 500);
  });
  // --- FUNCIÓN PARA CARGAR Y MOSTRAR LOS DATOS DE ADMINISTRACIÓN ---
  async function loadStencils() {
    try {
        let url = "/api/stencils";

        const response = await authFetch(url);

        if (!response.ok) throw new Error("Error al cargar datos de stencils");

        const stencils = await response.json();

        if (!adminTableBody) return;

        adminTableBody.innerHTML = "";

        stencils.forEach((stencil) => {
            const tr = document.createElement("tr");

            if (stencil.st_status && stencil.st_status.trim() === "NG") {
                tr.classList.add("table-danger");
            }

            if (stencil.st_status && stencil.st_status.trim() === "MANT.") {
                tr.classList.add("table-warning");
            }

            const arrivedDate = stencil.st_arrived_date
                ? new Date(stencil.st_arrived_date).toLocaleDateString("es-MX")
                : " ";

            // ==========================================================
            //  --- CAMBIO 2: USAR data-src Y 'lazy-qr' EN LA TABLA ---
            // ==========================================================
            const qrCellContent = stencil.st_bc
                ? `<img alt="Cargando QR..." class="table-qr lazy-qr" 
                       data-src="/api/stencils/${stencil.st_id}/qr" />`
                : ''; // Celda vacía si no hay barcode

            tr.innerHTML = `
                <td>${stencil.st_id}</td>
                <td>${stencil.st_job || ""}</td>
                <td>${stencil.supp_name || ""}</td>
                <td>${stencil.model_name || ""}</td>
                <td>${stencil.pn_pcb || ""}</td>
                <td>${stencil.serie || ""}</td>
                <td>${stencil.st_side || ""}</td>
                <td>${stencil.thickness || ""}</td>
                <td>${stencil.st_status || ""}</td>
                <td>${stencil.st_bc || ""}</td>
                <td>${qrCellContent}</td> 
                <td>${stencil.st_current_us || 0}</td>
                <td>${stencil.st_mx_us || 0}</td>
                <td>${arrivedDate}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${stencil.st_id}">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                </td>
            `;
            // ==========================================================
            //  FIN DEL CAMBIO 2
            // ==========================================================

            adminTableBody.appendChild(tr);
        });

        // ==========================================================
        //  --- CAMBIO 2.1: LLAMAR AL HELPER DESPUÉS DEL LOOP ---
        // ==========================================================
        document.querySelectorAll('.lazy-qr').forEach(img => {
            loadProtectedImage(img);
        });
        // ==========================================================
        //  FIN DEL CAMBIO 2.1
        // ==========================================================

    } catch (error) {
        console.error("No se pudieron cargar los stencils:", error);

        if (adminTableBody) {
            adminTableBody.innerHTML =
                '<tr><td colspan="15" class="text-center">Error al cargar los datos. Inténtalo más tarde.</td></tr>';
        }
    }
}
 async function loadHistory() {
    try {
      const response = await authFetch("/api/stencils/history");
      if (!response.ok) throw new Error("Error al cargar el historial");

      const history = await response.json();
      if (!historyTableBody) return;

      historyTableBody.innerHTML = "";

      history.forEach((record) => {
        const tr = document.createElement("tr");
        const formattedDate = new Date(record.st_h_date).toLocaleString(
          "es-MX",
          {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        );

        tr.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${record.stencil_id}</td>
                    <td>${record.st_bc}</td>
                    <td>${record.st_h_status}</td>
                    <td>${record.st_responsable}</td>
                    <td>${record.st_h_com}</td>
                `;
        historyTableBody.appendChild(tr);
      });
    } catch (error) {
      console.error("No se pudo cargar el historial:", error);
      if (historyTableBody) {
        historyTableBody.innerHTML =
          '<tr><td colspan="6">Error al cargar el historial.</td></tr>';
      }
    }
  }
  async function loadBajaStencils() {
    try {
      const bajaTableBodyLocal = document.querySelector(
        "#baja-content table tbody"
      );
      if (!bajaTableBodyLocal) return;

      const response = await authFetch("/api/stencils/baja");
      if (!response.ok)
        throw new Error("Error al cargar los stencils dados de baja");

      const bajaStencils = await response.json();
      bajaTableBodyLocal.innerHTML = "";
      bajaStencils.forEach((stencil) => {
        const tr = document.createElement("tr");
        const arrivedDate = new Date(
          stencil.st_arrived_date
        ).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const bajaDate = new Date(stencil.st_h_date).toLocaleDateString(
          "es-MX",
          {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        );
        tr.innerHTML = `
                    <td>${stencil.st_id}</td>
                    <td>${stencil.st_job || ""}</td>
                    <td>${stencil.supp_name || ""}</td>
                    <td>${stencil.model_name || ""}</td>
                    <td>${stencil.pn_pcb || ""}</td>
                    <td>${stencil.serie || ""}</td>
                    <td>${stencil.st_side || ""}</td>
                    <td>${stencil.thickness || ""}</td>
                    <td>${stencil.st_status || ""}</td>
                    <td>${stencil.st_bc || ""}</td>
                    <td>${stencil.st_current_us || 0}</td>
                    <td>${stencil.st_mx_us || 0}</td>
                    <td>${arrivedDate}</td>
                    <td>${bajaDate}</td>
                    <td>${stencil.st_responsable || ""}</td>
                    <td>${stencil.st_h_com || ""}</td>
                `;
        bajaTableBodyLocal.appendChild(tr);
      });
    } catch (error) {
      console.error("No se pudieron cargar los stencils dados de baja:", error);
      const bajaTableBodyLocal = document.querySelector(
        "#baja-content table tbody"
      );
      if (bajaTableBodyLocal) {
        bajaTableBodyLocal.innerHTML =
          '<tr><td colspan="16" class="text-center">Error al cargar los datos. Inténtalo más tarde.</td></tr>';
      }
    }
  }

  // --- LÓGICA DEL MODAL DE EDICIÓN ---
  const editModalEl = document.getElementById("editStencilModal");
  const editModal = new bootstrap.Modal(editModalEl);
  const historySection = document.getElementById("history-section-stencil");
  const statusCheckboxes = document.querySelectorAll(".status-check-stencil");
  let originalStatus = "";

  // (Tu código de limpieza de modal está bien como está)
  editModalEl.addEventListener("hidden.bs.modal", () => {
    const editForm = document.getElementById("editForm");
    if (editForm) {
      editForm.reset();
    }
    document.getElementById("edit-status-ok").checked = true;
    if (historySection) {
      historySection.style.display = "none";
    }

    const errorFields = [
      {
        inputId: "edit-history-date-stencil",
        errorId: "edit-history-date-error",
      },
      {
        inputId: "edit-history-time-stencil",
        errorId: "edit-history-time-error",
      },
      {
        inputId: "edit-history-responsible-stencil",
        errorId: "edit-history-responsible-error",
        lengthErrorId: "edit-history-responsible-length-error",
      },
      {
        inputId: "edit-history-comment-stencil",
        errorId: "edit-history-comment-error",
        lengthErrorId: "edit-history-comment-length-error",
      },
    ];

    errorFields.forEach((field) => {
      const inputEl = document.getElementById(field.inputId);
      const errorEl = document.getElementById(field.errorId);
      const lengthErrorEl = document.getElementById(field.lengthErrorId); 

      if (inputEl) inputEl.classList.remove("is-invalid");
      if (errorEl) errorEl.style.display = "none";
      if (lengthErrorEl) lengthErrorEl.style.display = "none"; 
    });
  });

  function toggleHistorySection() {
    // 1. Revisa si el NUEVO status seleccionado requiere historial
    const newStatusRequiresHistory =
      document.getElementById("edit-status-ng").checked ||
      document.getElementById("edit-status-mant").checked ||
      document.getElementById("edit-status-baj").checked; // <-- AÑADIDO ESTO

    // 2. Revisa si el status ORIGINAL (cuando se abrió el modal) requería historial
    const originalStatusRequiredHistory =
      originalStatus === "NG" ||
      originalStatus === "MANT." ||
      originalStatus === "BAJA"; // <-- AÑADIDO ESTO

    // 3. Se debe mostrar si CUALQUIERA de los dos es verdadero
    const shouldShowHistory =
      newStatusRequiresHistory || originalStatusRequiredHistory;

    historySection.style.display = shouldShowHistory ? "block" : "none";

    // El resto de la función es igual...
    if (shouldShowHistory) {
      document.getElementById("edit-history-date-stencil").valueAsDate =
        new Date();
      document.getElementById("edit-history-time-stencil").value = new Date()
        .toTimeString()
        .slice(0, 5);
    }
  }

  statusCheckboxes.forEach((checkbox) =>
    checkbox.addEventListener("change", toggleHistorySection)
  );

  document
    .querySelector("#administracion-content .stencil-table tbody")
    .addEventListener("click", async (event) => {
      const editButton = event.target.closest(".edit-btn");
      if (!editButton) return;
      const stencilId = editButton.dataset.id;
      const response = await authFetch(`/api/stencils/${stencilId}`);
      const stencil = await response.json();

      originalStatus = stencil.st_status.trim();

      document.getElementById("edit-st-id").value = stencil.st_id;
      document.getElementById("edit-barcode").textContent = stencil.st_bc;
      
      // ==========================================================
      //  --- CAMBIO 3: USAR 'loadProtectedImage' EN EL MODAL ---
      // ==========================================================
      // document.getElementById("edit-qr-code").src = `/api/stencils/${stencil.st_id}/qr`; // <-- LÍNEA ANTIGUA
      
      const qrImgElement = document.getElementById("edit-qr-code");
      qrImgElement.src = ""; // Placeholder
      qrImgElement.alt = "Cargando QR...";
      qrImgElement.dataset.src = `/api/stencils/${stencil.st_id}/qr`;
      loadProtectedImage(qrImgElement);
      // ==========================================================
      //  FIN DEL CAMBIO 3
      // ==========================================================

      document.getElementById("edit-current-cycles").value =
        stencil.st_current_us;
      document.getElementById("edit-max-cycles").value = stencil.st_mx_us;

      const statusInput = document.querySelector(
        `input[name="editStatus"][value="${originalStatus}"]`
      );
      if (statusInput) {
        statusInput.checked = true;
      }

      toggleHistorySection();
      editModal.show();
    });

  // (Tu lógica de guardar cambios 'saveChangesBtn' y validación están bien)
  document
    .getElementById("saveChangesBtn")
    .addEventListener("click", async () => {
      const stencilId = document.getElementById("edit-st-id").value;
      let isValid = true;
      const fieldsToValidate = [
        {
          inputId: "edit-history-date-stencil",
          errorId: "edit-history-date-error",
        },
        {
          inputId: "edit-history-time-stencil",
          errorId: "edit-history-time-error",
        },
        {
          inputId: "edit-history-responsible-stencil",
          errorId: "edit-history-responsible-error",
          lengthErrorId: "edit-history-responsible-length-error",
          maxLength: 5,
        },
        {
          inputId: "edit-history-comment-stencil",
          errorId: "edit-history-comment-error",
          lengthErrorId: "edit-history-comment-length-error",
          maxLength: 100,
        },
      ];
      fieldsToValidate.forEach((field) => {
        const inputEl = document.getElementById(field.inputId);
        const errorEl = document.getElementById(field.errorId);
        const lengthErrorEl = document.getElementById(field.lengthErrorId);
        if (inputEl) inputEl.classList.remove("is-invalid");
        if (errorEl) errorEl.style.display = "none";
        if (lengthErrorEl) lengthErrorEl.style.display = "none";
      });
      if (historySection.style.display === "block") {
        fieldsToValidate.forEach((field) => {
          const inputEl = document.getElementById(field.inputId);
          const errorEl = document.getElementById(field.errorId);
          const lengthErrorEl = document.getElementById(field.lengthErrorId);
          const value = inputEl.value;
          if (
            !value ||
            (inputEl.type === "text" && !value.trim()) ||
            (inputEl.tagName === "TEXTAREA" && !value.trim())
          ) {
            inputEl.classList.add("is-invalid");
            errorEl.style.display = "block";
            isValid = false;
          }
          else if (field.maxLength && value.length > field.maxLength) {
            inputEl.classList.add("is-invalid");
            lengthErrorEl.style.display = "block"; 
            isValid = false;
          }
        });

        if (!isValid) {
          return; 
        }
      }
      const dataToUpdate = {
        currentCycles: document.getElementById("edit-current-cycles").value,
        maxCycles: document.getElementById("edit-max-cycles").value,
        status: document.querySelector('input[name="editStatus"]:checked')
          .value,
      };
      if (historySection.style.display === "block") {
        const dateValue = document.getElementById(
          "edit-history-date-stencil"
        ).value;
        const timeValue = document.getElementById(
          "edit-history-time-stencil"
        ).value;
        const fullTimestamp = `${dateValue}T${timeValue}`;
        dataToUpdate.history = {
          date: new Date(fullTimestamp),
          responsible: document
            .getElementById("edit-history-responsible-stencil")
            .value.trim(), 
          comment: document
            .getElementById("edit-history-comment-stencil")
            .value.trim(), 
        };
      }
      const response = await authFetch(`/api/stencils/${stencilId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToUpdate),
      });
      if (response.ok) {
        alert("Stencil actualizado con éxito");
        editModal.hide();
        loadStencils(); 
        loadHistory(); 
      } else {
        alert("Error al actualizar el stencil");
      }
    });

  // --- LÓGICA DE NAVEGACIÓN ENTRE PESTAÑAS (Sin cambios) ---
  const tabs = document.querySelectorAll("#stencil-tabs .nav-link");
  const contentPanels = document.querySelectorAll(".tab-content-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.target;
      const normalizedTarget = targetId
        ? targetId.startsWith("#")
          ? targetId.slice(1)
          : targetId
        : "";
      contentPanels.forEach((panel) => {
        if (panel.id === normalizedTarget) {
          panel.style.display = "block";
          if (panel.id === "historial-content") {
            loadHistory();
          } else if (panel.id === "baja-content") {
            loadBajaStencils();
          }
        } else {
          panel.style.display = "none";
        }
      });
    });
  });

  // --- LÓGICA PARA FILTROS (Sin cambios) ---
  function applyAdminFilters() {
    const tableBody = document.querySelector(
      "#administracion-content .stencil-table tbody"
    );
    if (!tableBody) return;
    const filterInputs = document.querySelectorAll(
      "#filter-row-admin .table-filter-admin"
    );
    const rows = tableBody.querySelectorAll("tr");
    const filters = {};
    filterInputs.forEach((input) => {
      const columnIndex = input.dataset.column;
      const filterValue = input.value.toUpperCase();
      if (filterValue) {
        filters[columnIndex] = filterValue;
      }
    });
    rows.forEach((row) => {
      let isVisible = true;
      const cells = row.querySelectorAll("td");
      for (const columnIndex in filters) {
        const cellValue = cells[columnIndex]?.textContent.toUpperCase() || "";
        if (!cellValue.includes(filters[columnIndex])) {
          isVisible = false;
          break;
        }
      }
      row.style.display = isVisible ? "" : "none";
    });
  }
  function applyBajaFilters() {
    const tableBody = document.querySelector("#baja-content table tbody");
    if (!tableBody) return;
    const filterInputs = document.querySelectorAll(
      "#filter-row-baja .table-filter-baja"
    );
    const rows = tableBody.querySelectorAll("tr");
    const filters = {};
    filterInputs.forEach((input) => {
      const columnIndex = input.dataset.column;
      const filterValue = input.value.toUpperCase();
      if (filterValue) {
        filters[columnIndex] = filterValue;
      }
    });
    rows.forEach((row) => {
      let isVisible = true;
      const cells = row.querySelectorAll("td");
      for (const columnIndex in filters) {
        const cellValue = cells[columnIndex]?.textContent.toUpperCase() || "";
        if (!cellValue.includes(filters[columnIndex])) {
          isVisible = false;
          break;
        }
      }
      row.style.display = isVisible ? "" : "none";
    });
  }
  document
    .querySelectorAll("#filter-row-baja .table-filter-baja")
    .forEach((input) => {
      input.addEventListener("input", applyBajaFilters);
    });
  function applyHistoryFilters() {
    const tableBody = document.querySelector("#historial-content table tbody");
    if (!tableBody) return;
    const filterInputs = document.querySelectorAll(
      "#filter-row-history .table-filter-history"
    );
    const rows = tableBody.querySelectorAll("tr");
    const filters = {};
    filterInputs.forEach((input) => {
      const columnIndex = input.dataset.column;
      const filterValue = input.value.toUpperCase();
      if (filterValue) {
        filters[columnIndex] = filterValue;
      }
    });
    rows.forEach((row) => {
      let isVisible = true;
      const cells = row.querySelectorAll("td");
      for (const columnIndex in filters) {
        const cellValue = cells[columnIndex]?.textContent.toUpperCase() || "";
        if (!cellValue.includes(filters[columnIndex])) {
          isVisible = false;
          break;
        }
      }
      row.style.display = isVisible ? "" : "none";
    });
  }
  document
    .querySelectorAll("#filter-row-admin .table-filter-admin")
    .forEach((input) => {
      input.addEventListener("input", applyAdminFilters);
    });
  document
    .querySelectorAll("#filter-row-history .table-filter-history")
    .forEach((input) => {
      input.addEventListener("input", applyHistoryFilters);
    });

  // --- CARGA INICIAL DE DATOS ---
  loadStencils();
});