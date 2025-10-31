// public/js/squeegeeAdmin.js (REEMPLAZAR TODO)

document.addEventListener('DOMContentLoaded', () => {
    // --- Variables de Elementos del DOM ---
    const searchInput = document.getElementById('general-search-input');
    const adminTableBody = document.querySelector("#administracion-content .squeegee-table tbody");
    const historyTableBody = document.querySelector("#historial-content .squeegee-table tbody");
    const bajaTableBody = document.querySelector("#baja-content .squeegee-table tbody");
    let searchTimeout;

    // --- Lógica del Modal de Edición ---
    const editModalEl = document.getElementById("editSqueegeeModal");
    const editModal = new bootstrap.Modal(editModalEl);
    const historySection = document.getElementById("history-section");
    const statusCheckboxes = document.querySelectorAll(".status-check");
    let originalStatus = "";

    // ==========================================================
    //  NUEVO CÓDIGO: Limpieza de Modal al Cerrar
    // ==========================================================
    editModalEl.addEventListener("hidden.bs.modal", () => {
        const editForm = document.getElementById("editSqueegeeForm");
        if (editForm) {
            editForm.reset(); // Resetea el formulario
        }

        document.getElementById("edit-status-ok").checked = true; // Estado por defecto
        
        if (historySection) {
            historySection.style.display = "none"; // Oculta historial
        }

        // Limpia todos los mensajes de error y bordes rojos
        const errorFields = [
            { inputId: "edit-history-date", errorId: "edit-history-date-error" },
            { inputId: "edit-history-time", errorId: "edit-history-time-error" },
            { 
              inputId: "edit-history-responsible", 
              errorId: "edit-history-responsible-error", 
              lengthErrorId: "edit-history-responsible-length-error" 
            },
            { 
              inputId: "edit-history-comment", 
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


    /**
     * Filtra una tabla del lado del cliente, ocultando las filas que no coinciden.
     */
    function applyGeneralClientSideFilter(tableBodySelector, searchTerm) {
        const tableBody = document.querySelector(tableBodySelector);
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll("tr");
        const upperCaseSearchTerm = searchTerm.toUpperCase();

        rows.forEach((row) => {
            row.style.display = row.textContent.toUpperCase().includes(upperCaseSearchTerm) ? "" : "none";
        });
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.trim();
            const activeTab = document.querySelector('#squeegee-tabs .nav-link.active');

            if (!activeTab) return; 

            const activeContentId = activeTab.getAttribute('data-target');

            switch (activeContentId) {
                case '#administracion-content':
                    applyGeneralClientSideFilter('#administracion-content .squeegee-table tbody', searchTerm); 
                    break;
                case '#historial-content':
                    applyGeneralClientSideFilter('#historial-content .squeegee-table tbody', searchTerm);
                    break;
                case '#baja-content':
                    applyGeneralClientSideFilter('#baja-content .squeegee-table tbody', searchTerm);
                    break;
            }
        }, 500); 
    });

    function toggleHistorySection() {
        const newStatusRequiresLog =
            document.getElementById("edit-status-ng").checked ||
            document.getElementById("edit-status-mant").checked ||
            document.getElementById("edit-status-baj").checked; 

        const shouldShowHistory =
            newStatusRequiresLog ||
            originalStatus === "NG" ||
            originalStatus === "MANT." ||
            originalStatus === "BAJA"; 

        historySection.style.display = shouldShowHistory ? "block" : "none";

        if (shouldShowHistory) {
            document.getElementById("edit-history-date").valueAsDate = new Date();
            document.getElementById("edit-history-time").value = new Date().toTimeString().slice(0, 5);
        }
    }

    statusCheckboxes.forEach((checkbox) =>
        checkbox.addEventListener("change", toggleHistorySection)
    );

    // --- Funciones de Carga de Datos ---
    async function loadSqueegees(searchTerm = '') {
        try {
            let url = '/api/squeegees';
            if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;

            const response = await authFetch(url);
            if (!response.ok) throw new Error("Error al cargar los datos");

            const squeegees = await response.json();
            if (!adminTableBody) return;
            adminTableBody.innerHTML = "";

            squeegees.forEach((squeegee) => {
                const tr = document.createElement("tr");
                const formattedDate = squeegee.sq_arrived_date 
                ? new Date(squeegee.sq_arrived_date).toLocaleDateString('es-MX')
                : '';

                if (squeegee.sq_status.trim() === 'NG' || squeegee.sq_status.trim() === 'BAJA') {
                    tr.classList.add('table-danger');
                }
                if (squeegee.sq_status.trim() === 'MANT.') {
                    tr.classList.add('table-warning');
                }

                tr.innerHTML = `
                    <td>${squeegee.sq_id}</td>
                    <td>${squeegee.sq_length}</td>
                    <td>${squeegee.sq_side}</td>
                    <td>${squeegee.sq_status}</td>
                    <td>${squeegee.sq_bc}</td>
                    <td><img src="/api/squeegees/${squeegee.sq_id}/qr" alt="QR" class="table-qr" /></td>
                    <td>${squeegee.sq_current_us}</td>
                    <td>${squeegee.sq_mx_us}</td>
                    <td>${formattedDate}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${squeegee.sq_id}">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                    </td>
                `;
                adminTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("No se pudieron cargar los squeegees:", error);
            if (adminTableBody) adminTableBody.innerHTML = '<tr><td colspan="10">Error al cargar los datos.</td></tr>';
        }
    }

    async function loadHistory() {
        try {
            const response = await authFetch("/api/squeegees/history"); 
            if (!response.ok) throw new Error("Error al cargar el historial");

            const history = await response.json();
            const tbody = document.querySelector("#historial-content .squeegee-table tbody");
            if (!tbody) return;

            tbody.innerHTML = ""; 

            history.forEach((record) => {
                const tr = document.createElement("tr");
                
                const formattedDate = new Date(record.sq_h_date).toLocaleString('es-MX', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: true
                });

                const comment = record.sq_h_com || '';
                // Formatea el comentario para separar el log automático con un salto de línea
                const formattedComment = comment
                    .replace('(Cambio de status:', '<br>(Cambio de status:')
                    .replace('(Ciclos actualizados:', '<br>(Ciclos actualizados:');


                tr.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${record.squeegee_id}</td>
                    <td>${record.sq_bc}</td>
                    <td>${record.sq_h_status}</td>
                    <td>${record.sq_responsable}</td>
                    <td>${formattedComment}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("No se pudo cargar el historial:", error);
            const tbody = document.querySelector("#historial-content .squeegee-table tbody");
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6">Error al cargar el historial.</td></tr>';
            }
        }
    }

    async function loadBajaSqueegees() {
        try {
            const response = await authFetch("/api/squeegees/baja");
            if (!response.ok) throw new Error("Error al cargar bajas");

            const baja = await response.json();
            if (!bajaTableBody) return;
            bajaTableBody.innerHTML = "";

            baja.forEach((record) => {
                const arrivedDate = new Date(record.sq_arrived_date).toLocaleDateString('es-MX');
                const bajaDate = new Date(record.sq_baja_date).toLocaleDateString('es-MX');

                bajaTableBody.innerHTML += `
                    <tr>
                        <td>${record.sq_id}</td>
                        <td>${record.sq_length}</td>
                        <td>${record.sq_side}</td>
                        <td>${record.sq_status}</td>
                        <td>${record.sq_bc}</td>
                        <td>${record.sq_current_us}</td>
                        <td>${record.sq_mx_us}</td>
                        <td>${arrivedDate}</td>
                        <td>${bajaDate}</td>
                        <td>${record.sq_responsable}</td>
                        <td>${record.sq_h_com}</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error("No se pudo cargar el historial de bajas:", error);
            if (bajaTableBody) bajaTableBody.innerHTML = '<tr><td colspan="11">Error al cargar las bajas.</td></tr>';
        }
    }

    // --- Lógica de Filtros ---
    document
        .querySelectorAll("#filter-row-admin .table-filter-admin")
        .forEach((input) => {
            input.addEventListener("input", applyAdminFilters);
        });

    function applyAdminFilters() {
        const tableBody = document.querySelector(
            "#administracion-content .squeegee-table tbody"
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
        const tableBody = document.querySelector("#baja-content .squeegee-table tbody");
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
        const tableBody = document.querySelector("#historial-content .squeegee-table tbody");
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


    // --- Setup de Listeners ---

    // 1. Escuchador de la tabla de Administración para el Modal
    document.querySelector("#administracion-content .squeegee-table tbody")
        .addEventListener("click", async (event) => {
            const editButton = event.target.closest(".edit-btn");
            if (!editButton) return;

            const squeegeeId = editButton.dataset.id;
            const response = await authFetch(`/api/squeegees/${squeegeeId}`);
            const squeegee = await response.json();

            originalStatus = squeegee.sq_status.trim();

            document.getElementById("edit-sq-id").value = squeegee.sq_id;
            document.getElementById("edit-barcode").textContent = squeegee.sq_bc;
            document.getElementById("edit-qr-code").src = `/api/squeegees/${squeegee.sq_id}/qr`;
            document.getElementById("edit-current-cycles").value = squeegee.sq_current_us;
            document.getElementById("edit-max-cycles").value = squeegee.sq_mx_us;

            const statusInput = document.querySelector(`input[name="editStatus"][value="${originalStatus}"]`);
            if (statusInput) statusInput.checked = true;

            toggleHistorySection();
            editModal.show();
        });

    // 2. Lógica para guardar los cambios
    document.getElementById("saveChangesBtn").addEventListener("click", async () => {
        const squeegeeId = document.getElementById("edit-sq-id").value;
        
        // ==========================================================
        //  NUEVO CÓDIGO: VALIDACIÓN CON LONGITUD
        // ==========================================================
        let isValid = true;

        const fieldsToValidate = [
            { inputId: "edit-history-date", errorId: "edit-history-date-error" },
            { inputId: "edit-history-time", errorId: "edit-history-time-error" },
            { 
              inputId: "edit-history-responsible", 
              errorId: "edit-history-responsible-error", 
              lengthErrorId: "edit-history-responsible-length-error", 
              maxLength: 5 
            },
            { 
              inputId: "edit-history-comment", 
              errorId: "edit-history-comment-error", 
              lengthErrorId: "edit-history-comment-length-error", 
              maxLength: 45
            },
        ];

        // Oculta todos los errores primero
        fieldsToValidate.forEach((field) => {
            const inputEl = document.getElementById(field.inputId);
            const errorEl = document.getElementById(field.errorId);
            const lengthErrorEl = document.getElementById(field.lengthErrorId);
            if (inputEl) inputEl.classList.remove("is-invalid");
            if (errorEl) errorEl.style.display = "none";
            if (lengthErrorEl) lengthErrorEl.style.display = "none";
        });

        // Valida solo si la sección está visible
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
            const dateValue = document.getElementById("edit-history-date").value;
            const timeValue = document.getElementById("edit-history-time").value;
            const fullTimestamp = `${dateValue}T${timeValue}`;
            dataToUpdate.history = {
                date: new Date(fullTimestamp),
                responsible: document.getElementById("edit-history-responsible").value.trim(),
                comment: document.getElementById("edit-history-comment").value.trim(),
            };
        }

        const response = await authFetch(`/api/squeegees/${squeegeeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToUpdate),
        });

        if (response.ok) {
            alert("Squeegee actualizado con éxito");
            editModal.hide();
            loadSqueegees(); // Recarga tabla admin
            loadHistory(); // Recarga historial
            if (dataToUpdate.status === 'BAJA') loadBajaSqueegees(); // Recarga bajas
        } else {
            alert("Error al actualizar el squeegee");
        }
    });

    // 3. Lógica de Pestañas
    const tabs = document.querySelectorAll('#squeegee-tabs .nav-link');
    const contentPanels = document.querySelectorAll('.tab-content-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.dataset.target;
            const normalizedTarget = targetId ? targetId.startsWith("#") ? targetId.slice(1) : targetId : "";

            contentPanels.forEach(panel => {
                if (panel.id === normalizedTarget) {
                    panel.style.display = 'block';
                    if (panel.id === 'historial-content') loadHistory();
                    else if (panel.id === 'baja-content') loadBajaSqueegees();
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });

    // --- CARGA INICIAL DE DATOS --- 
    loadSqueegees();
});