// public/js/plateAdmin.js

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("general-search-input");
    const adminTableBody = document.querySelector("#administracion-content .plate-table tbody");
    const historyTableBody = document.querySelector("#historial-content .plate-table tbody");
    const bajaTableBody = document.querySelector("#baja-content .plate-table tbody");
    let searchTimeout;

    // --- Lógica del Modal de Edición ---
    const editModalEl = document.getElementById("editPlateModal");
    const editModal = new bootstrap.Modal(editModalEl);
    const historySection = document.getElementById("history-section-plate");
    const statusCheckboxes = document.querySelectorAll(".status-check-plate");
    let originalStatus = "";
    // En plateAdmin.js

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
    // ==========================================================
    //  NUEVO CÓDIGO: Limpieza de Modal al Cerrar
    // ==========================================================
    editModalEl.addEventListener("hidden.bs.modal", () => {
        const editForm = document.getElementById("editForm");
        if (editForm) {
            editForm.reset(); // Resetea el formulario
        }

        document.getElementById("edit-status-ok").checked = true; // Estado por defecto

        if (historySection) {
            historySection.style.display = "none"; // Oculta historial
        }

        // Limpia todos los mensajes de error y bordes rojos
        const errorFields = [
            { inputId: "edit-history-date-plate", errorId: "edit-history-date-error" },
            { inputId: "edit-history-time-plate", errorId: "edit-history-time-error" },
            {
                inputId: "edit-history-responsible-plate",
                errorId: "edit-history-responsible-error",
                lengthErrorId: "edit-history-responsible-length-error"
            },
            {
                inputId: "edit-history-comment-plate",
                errorId: "edit-history-comment-error",
                lengthErrorId: "edit-history-comment-length-error"
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
    // ==========================================================
    //  FIN DEL NUEVO CÓDIGO
    // ==========================================================


    // Función de filtro genérica
    function applyGeneralClientSideFilter(tableBodySelector, searchTerm) {
        const tableBody = document.querySelector(tableBodySelector);
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll("tr");
        const upperCaseSearchTerm = searchTerm.toUpperCase();

        rows.forEach((row) => {
            row.style.display = row.textContent.toUpperCase().includes(upperCaseSearchTerm) ? "" : "none";
        });
    }

    // Listener "inteligente" para la barra de búsqueda general
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.trim();
            const activeTab = document.querySelector('#plate-tabs .nav-link.active');

            if (!activeTab) return;

            const activeContentId = activeTab.getAttribute('data-target');

            switch (activeContentId) {
                case '#administracion-content':
                    applyGeneralClientSideFilter('#administracion-content .plate-table tbody', searchTerm);
                    break;
                case '#historial-content':
                    applyGeneralClientSideFilter('#historial-content .plate-table tbody', searchTerm);
                    break;
                case '#baja-content':
                    applyGeneralClientSideFilter('#baja-content .plate-table tbody', searchTerm);
                    break;
            }
        }, 500);
    });

    function toggleHistorySection() {
        const newStatusIsNgOrMantOrBaja =
            document.getElementById("edit-status-ng").checked ||
            document.getElementById("edit-status-mant").checked ||
            document.getElementById("edit-status-baj").checked;

        const originalStatusRequiresLog =
            originalStatus === "NG" ||
            originalStatus === "MANT." ||
            originalStatus === "BAJA";

        historySection.style.display = (newStatusIsNgOrMantOrBaja || originalStatusRequiresLog) ? "block" : "none";

        if (historySection.style.display === "block") {
            document.getElementById("edit-history-date-plate").valueAsDate = new Date();
            document.getElementById("edit-history-time-plate").value = new Date().toTimeString().slice(0, 5);
        }
    }

    statusCheckboxes.forEach((checkbox) =>
        checkbox.addEventListener("change", toggleHistorySection)
    );

    // --- Funciones de Carga de Datos ---

async function loadPlates() {
    try {
        let url = "/api/plates";

        const response = await authFetch(url);
        if (!response.ok) throw new Error("Error al cargar plates");

        const plates = await response.json();
        if (!adminTableBody) return;
        adminTableBody.innerHTML = "";

        plates.forEach((plate) => {
            const tr = document.createElement("tr");
            if (plate.pl_status && (plate.pl_status.trim() === "NG" || plate.pl_status.trim() === "BAJA")) {
                tr.classList.add("table-danger");
            }
            if (plate.pl_status && plate.pl_status.trim() === "MANT.") {
                tr.classList.add("table-warning");
            }

            const arrivedDate = plate.pl_arrived_date ? new Date(plate.pl_arrived_date).toLocaleDateString("es-MX") : " ";

            // ==========================================================
            //  ¡¡¡AQUÍ ESTÁ EL CAMBIO IMPORTANTE!!!
            //  Cambiamos 'src' por 'data-src'
            //  Añadimos la clase 'lazy-qr'
            // ==========================================================
            tr.innerHTML = `
                <td>${plate.pl_id}</td>
                <td>${plate.pl_job || ""}</td>
                <td>${plate.supp_name || ""}</td>
                <td>${plate.model_name || ""}</td>
                <td>${plate.pn_pcb || ""}</td>
                <td>${plate.revision || ""}</td>
                <td>${plate.pl_status || ""}</td>
                <td>${plate.pl_bc || ""}</td>
                <td>
                    <img alt="Cargando QR..." class="table-qr lazy-qr" 
                         data-src="/api/plates/${plate.pl_id}/qr" />
                </td>
                <td>${plate.pl_current_us || 0}</td>
                <td>${plate.pl_mx_us || 0}</td>
                <td>${arrivedDate}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${plate.pl_id}">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                </td>
            `;
            // ==========================================================
            //  FIN DEL CAMBIO
            // ==========================================================
            
            adminTableBody.appendChild(tr);
        });

        // ¡Ahora este código SÍ encontrará las imágenes y las cargará!
        document.querySelectorAll('.lazy-qr').forEach(img => {
            loadProtectedImage(img);
        });

    } catch (error) {
        console.error("No se pudieron cargar los plates:", error);
        if (adminTableBody) adminTableBody.innerHTML = '<tr><td colspan="14" class="text-center">Error al cargar los datos.</td></tr>';
    }
}

    async function loadHistory() {
        try {
            const response = await authFetch("/api/plates/history");
            if (!response.ok) throw new Error("Error al cargar el historial");

            const history = await response.json();
            const historyTableBody = document.querySelector("#historial-content .plate-table tbody");
            if (!historyTableBody) return;
            historyTableBody.innerHTML = "";

            history.forEach((record) => {
                const formattedDate = new Date(record.pl_h_date).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });

                // --- NUEVO: Formateo de comentarios ---
                const comment = record.pl_h_com || '';
                const formattedComment = comment
                    .replace('(Cambio de status:', '<br>(Cambio de status:')
                    .replace('(Ciclos actualizados:', '<br>(Ciclos actualizados:');

                historyTableBody.innerHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${record.plate_id}</td>
                        <td>${record.pl_bc}</td>
                        <td>${record.pl_h_status}</td>
                        <td>${record.pl_responsable}</td>
                        <td>${formattedComment}</td> 
                    </tr>
                `;
            });
        } catch (error) {
            console.error("No se pudo cargar el historial:", error);
            if (historyTableBody) historyTableBody.innerHTML = '<tr><td colspan="6">Error al cargar el historial.</td></tr>';
        }
    }

    async function loadBajaPlates() {
        try {
            const response = await authFetch("/api/plates/baja");
            if (!response.ok) throw new Error("Error al cargar los plates dados de baja");

            const bajaPlates = await response.json();
            if (!bajaTableBody) return;
            bajaTableBody.innerHTML = "";

            bajaPlates.forEach((plate) => {
                const arrivedDate = plate.pl_arrived_date
                    ? new Date(plate.pl_arrived_date).toLocaleDateString("es-MX")
                    : " ";
                const bajaDate = new Date(plate.pl_baja_date).toLocaleDateString("es-MX");

                bajaTableBody.innerHTML += `
                    <tr>
                        <td>${plate.pl_id}</td>
                        <td>${plate.pl_job || ""}</td>
                        <td>${plate.supp_name || ""}</td>
                        <td>${plate.model_name || ""}</td>
                        <td>${plate.pn_pcb || ""}</td>
                        <td>${plate.revision || ""}</td>
                        <td>${plate.pl_status || ""}</td>
                        <td>${plate.pl_bc || ""}</td>
                        <td>${plate.pl_current_us || 0}</td>
                        <td>${plate.pl_mx_us || 0}</td>
                        <td>${arrivedDate}</td>
                        <td>${bajaDate}</td>
                        <td>${plate.pl_responsable || ""}</td>
                        <td>${plate.pl_h_com || ""}</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error("No se pudieron cargar los plates dados de baja:", error);
            if (bajaTableBody) bajaTableBody.innerHTML = '<tr><td colspan="14" class="text-center">Error al cargar los datos.</td></tr>';
        }
    }

    // --- Event Listeners de Modal y Guardado ---

    document.querySelector("#administracion-content .plate-table tbody").addEventListener("click", async (event) => {
        const editButton = event.target.closest(".edit-btn");
        if (!editButton) return;

        const plateId = editButton.dataset.id;
        const response = await authFetch(`/api/plates/${plateId}`);
        const plate = await response.json();

        originalStatus = plate.pl_status.trim();

        // Rellenar Modal
        document.getElementById("edit-pl-id").value = plate.pl_id;
        document.getElementById("edit-barcode").textContent = plate.pl_bc;
        const qrImgElement = document.getElementById("edit-qr-code");
        qrImgElement.src = ""; // Pon un placeholder o déjalo vacío
        qrImgElement.alt = "Cargando QR...";
        qrImgElement.dataset.src = `/api/plates/${plate.pl_id}/qr`; // Asigna la URL al data-src

        // Llama a tu nueva función de ayuda
        loadProtectedImage(qrImgElement);
        document.getElementById("edit-current-cycles").value = plate.pl_current_us;
        document.getElementById("edit-max-cycles").value = plate.pl_mx_us;

        const statusInput = document.querySelector(`input[name="editStatus"][value="${originalStatus}"]`);
        if (statusInput) statusInput.checked = true;

        toggleHistorySection();
        editModal.show();
    });

    document.getElementById("saveChangesBtn").addEventListener("click", async () => {
        const plateId = document.getElementById("edit-pl-id").value;

        // ==========================================================
        //  NUEVO CÓDIGO: VALIDACIÓN CON LONGITUD
        // ==========================================================
        let isValid = true;

        // Define fields con sufijo '-plate'
        const fieldsToValidate = [
            { inputId: "edit-history-date-plate", errorId: "edit-history-date-error" },
            { inputId: "edit-history-time-plate", errorId: "edit-history-time-error" },
            {
                inputId: "edit-history-responsible-plate",
                errorId: "edit-history-responsible-error",
                lengthErrorId: "edit-history-responsible-length-error",
                maxLength: 5
            },
            {
                inputId: "edit-history-comment-plate",
                errorId: "edit-history-comment-error",
                lengthErrorId: "edit-history-comment-length-error",
                maxLength: 45
            },
        ];

        // 1. Oculta todos los errores primero
        fieldsToValidate.forEach((field) => {
            const inputEl = document.getElementById(field.inputId);
            const errorEl = document.getElementById(field.errorId);
            const lengthErrorEl = document.getElementById(field.lengthErrorId);
            if (inputEl) inputEl.classList.remove("is-invalid");
            if (errorEl) errorEl.style.display = "none";
            if (lengthErrorEl) lengthErrorEl.style.display = "none";
        });

        // 2. Valida solo si la sección está visible
        if (historySection.style.display === "block") {
            fieldsToValidate.forEach((field) => {
                const inputEl = document.getElementById(field.inputId);
                const errorEl = document.getElementById(field.errorId);
                const lengthErrorEl = document.getElementById(field.lengthErrorId);
                const value = inputEl.value;

                // Check empty
                if (
                    !value ||
                    (inputEl.type === "text" && !value.trim()) ||
                    (inputEl.tagName === "TEXTAREA" && !value.trim())
                ) {
                    inputEl.classList.add("is-invalid");
                    errorEl.style.display = "block";
                    isValid = false;
                }
                // Check length
                else if (field.maxLength && value.length > field.maxLength) {
                    inputEl.classList.add("is-invalid");
                    lengthErrorEl.style.display = "block";
                    isValid = false;
                }
            });

            if (!isValid) {
                return; // Detiene el guardado
            }
        }
        // ==========================================================
        //  FIN DEL NUEVO CÓDIGO
        // ==========================================================


        const dataToUpdate = {
            currentCycles: document.getElementById("edit-current-cycles").value,
            maxCycles: document.getElementById("edit-max-cycles").value,
            status: document.querySelector('input[name="editStatus"]:checked').value,
        };

        // Si la sección es visible, los datos ya están validados
        if (historySection.style.display === "block") {
            const dateValue = document.getElementById("edit-history-date-plate").value;
            const timeValue = document.getElementById("edit-history-time-plate").value;
            const fullTimestamp = `${dateValue}T${timeValue}`;
            dataToUpdate.history = {
                date: new Date(fullTimestamp),
                responsible: document.getElementById("edit-history-responsible-plate").value.trim(),
                comment: document.getElementById("edit-history-comment-plate").value.trim(),
            };
        }

        const response = await authFetch(`/api/plates/${plateId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToUpdate),
        });

        if (response.ok) {
            alert("Plate actualizado con éxito");
            editModal.hide();
            loadPlates(); // Recarga admin
            loadHistory(); // Recarga historial
            if (dataToUpdate.status === 'BAJA') loadBajaPlates(); // Recarga bajas
        } else {
            alert("Error al actualizar el plate");
        }
    });

    // --- Lógica de Navegación de Pestañas ---
    const tabs = document.querySelectorAll("#plate-tabs .nav-link");
    const contentPanels = document.querySelectorAll(".tab-content-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
            event.preventDefault();

            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            const targetId = tab.dataset.target;
            const normalizedTarget = targetId ? targetId.startsWith("#") ? targetId.slice(1) : targetId : "";

            contentPanels.forEach((panel) => {
                if (panel.id === normalizedTarget) {
                    panel.style.display = "block";
                    if (panel.id === "historial-content") {
                        loadHistory();
                    } else if (panel.id === "baja-content") {
                        loadBajaPlates();
                    }
                } else {
                    panel.style.display = "none";
                }
            });
        });
    });

    function applyAdminFilters() {
        const tableBody = document.querySelector(
            "#administracion-content .plate-table tbody"
        );
        if (!tableBody) return;

        const filterInputs = document.querySelectorAll("#filter-row-admin .table-filter-admin");
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

    function applyBajaFilters() {
        const tableBody = document.querySelector("#baja-content .plate-table tbody");
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
        .querySelectorAll("#filter-row-history .table-filter-history")
        .forEach((input) => {
            input.addEventListener("input", applyHistoryFilters);
        });

    function applyHistoryFilters() {
        const tableBody = document.querySelector("#historial-content .plate-table tbody");
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

    document.querySelectorAll("#filter-row-admin .table-filter-admin").forEach((input) => {
        input.addEventListener("input", applyAdminFilters);
    });


    loadPlates(); // Carga inicial
    // 1. Define la función de logout

});