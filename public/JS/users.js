// public/js/users.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos DOM ---
    const userTableBody = document.getElementById('users-table-body');
    const searchInput = document.getElementById('user-search-input');
    const filterInputs = document.querySelectorAll('.table-filter');
    const addUserBtn = document.getElementById('add-user-btn');

    // --- Modales ---
    const createUserModalEl = document.getElementById('createUserModal');
    const createUserModal = new bootstrap.Modal(createUserModalEl);
    const editUserModalEl = document.getElementById('editUserModal');
    const editUserModal = new bootstrap.Modal(editUserModalEl);

    // --- Formularios y Botones Modales ---
    const createUserForm = document.getElementById('createUserForm');
    const saveNewUserBtn = document.getElementById('saveNewUserBtn');
    const editUserForm = document.getElementById('editUserForm');
    const saveUserChangesBtn = document.getElementById('saveUserChangesBtn');

    // --- Elementos de Error (Crear) ---
    const createErrorDivs = {
        name: document.getElementById('edit-name-error'), // <-- CAMBIO
        lastName1: document.getElementById('edit-last_name1-error'),
        lastName2: document.getElementById('edit-last_name2-error'),
        noEmployee: document.getElementById('edit-no_employee-error'), // Aunque es readonly, lo dejamos por si acaso
        password: document.getElementById('edit-password-error'),
        privilege: document.getElementById('edit-privilege-error')
    };
    const createInputs = {
        name: document.getElementById('create-name'),
        lastName1: document.getElementById('create-last_name1'),
        lastName2: document.getElementById('create-last_name2'),
        noEmployee: document.getElementById('create-no_employee'),
        password: document.getElementById('create-password'),
        privilege: document.getElementById('create-privilege')
    };

    // --- Elementos de Error (Editar) ---
    const editErrorDivs = {
        lastName1: document.getElementById('edit-last_name1-error'),
        lastName2: document.getElementById('edit-last_name2-error'),
        noEmployee: document.getElementById('edit-no_employee-error'),
        password: document.getElementById('edit-password-error'), // Solo para longitud si se ingresa
        privilege: document.getElementById('edit-privilege-error')
    };
    const editInputs = {
        // name no necesita error div porque es readonly
        name: document.getElementById('edit-name'), // <-- CAMBIO
        lastName1: document.getElementById('edit-last_name1'),
        lastName2: document.getElementById('edit-last_name2'),
        noEmployee: document.getElementById('edit-no_employee'), // <-- CAMBIO
        password: document.getElementById('edit-password'),
        privilege: document.getElementById('edit-privilege')
    };


    let allUsers = []; // Para guardar los usuarios y filtrar en el cliente

    // --- Funciones de Utilidad ---
    function showCreateError(fieldKey, message) {
        if (createErrorDivs[fieldKey]) {
            createErrorDivs[fieldKey].textContent = message;
            createErrorDivs[fieldKey].style.display = 'block';
        }
        if (createInputs[fieldKey]) {
            createInputs[fieldKey].classList.add('is-invalid');
        }
    }
    function clearCreateModalErrors() {
        for (const key in createErrorDivs) {
            if (createErrorDivs[key]) createErrorDivs[key].style.display = 'none';
            if (createInputs[key]) createInputs[key].classList.remove('is-invalid');
        }
    }
    function showEditError(fieldKey, message) {
        if (editErrorDivs[fieldKey]) {
            editErrorDivs[fieldKey].textContent = message;
            editErrorDivs[fieldKey].style.display = 'block';
        }
        if (editInputs[fieldKey]) {
            editInputs[fieldKey].classList.add('is-invalid');
        }
    }
    function clearEditModalErrors() {
        for (const key in editErrorDivs) {
            if (editErrorDivs[key]) editErrorDivs[key].style.display = 'none';
            if (editInputs[key]) editInputs[key].classList.remove('is-invalid');
        }
    }


    /**
     * Carga los usuarios desde la API y los muestra en la tabla.
     */
    async function loadUsers() {
        try {
            const response = await authFetch('/api/users');
            if (!response.ok) throw new Error('Error al cargar usuarios');
            allUsers = await response.json();
            displayUsers(allUsers);
        } catch (error) {
            console.error(error);
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error al cargar usuarios. ${error.message}</td></tr>`; // Colspan=6
        }
    }

    /**
     * Muestra los usuarios en la tabla HTML.
     * @param {Array} users - Array de objetos de usuario.
     */
    function displayUsers(users) {
        userTableBody.innerHTML = '';
        if (!users || users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios registrados.</td></tr>'; // Colspan=6
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            // Escapar HTML en los datos del usuario por seguridad (si vinieran de fuentes no confiables)
            const safeName = user.name?.replace(/</g, "&lt;") || '';
            const safeLastName1 = user.last_name1?.replace(/</g, "&lt;") || '';
            const safeLastName2 = user.last_name2?.replace(/</g, "&lt;") || '';
            const safeNoEmployee = user.no_employee?.replace(/</g, "&lt;") || '';
            const safePrivilegeName = user.privilegeName?.replace(/</g, "&lt;") || 'Desconocido';

            // Convertir privilegeName a formato JSON string para data attribute
            const userDataForEdit = JSON.stringify({
                name: user.name,
                lastName1: user.last_name1,
                lastName2: user.last_name2,
                noEmployee: user.no_employee,
                privilege: user.privilegeName
            });

            tr.innerHTML = `
                <td>${safeName}</td>
                <td>${safeLastName1}</td>
                <td>${safeLastName2}</td>
                <td>${safeNoEmployee}</td>
                <td>${safePrivilegeName}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-user='${userDataForEdit.replace(/'/g, "&apos;")}' title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    
                    <button class="btn btn-sm btn-outline-danger delete-btn" 
                            data-name="${safeName}" 
                            data-no-employee="${safeNoEmployee}" 
                            title="Eliminar">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                    </td>
            `;
            userTableBody.appendChild(tr);
        });
    }

    /**
     * Aplica los filtros de columna a los usuarios mostrados.
     */
    function applyFilters() {
        const filters = {};
        filterInputs.forEach(input => {
            const colIndex = input.dataset.column;
            const value = input.value.toUpperCase();
            if (value) {
                filters[colIndex] = value;
            }
        });

        const rows = userTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            let isVisible = true;
            const cells = row.querySelectorAll('td');

            // Asegurarse de que haya suficientes celdas antes de acceder por índice
            if (cells.length < Object.keys(filters).length) { // Compara con el número de filtros activos
                row.style.display = 'none'; // Ocultar si la fila no tiene suficientes celdas (ej. fila de "no hay usuarios")
                return;
            }


            for (const colIndex in filters) {
                // Verificar que la celda exista antes de acceder a textContent
                const cellValue = cells[colIndex]?.textContent.toUpperCase() || '';
                if (!cellValue.includes(filters[colIndex])) {
                    isVisible = false;
                    break;
                }
            }
            row.style.display = isVisible ? '' : 'none';
        });
    }

    // --- Event Listeners ---

    // Abrir modal de creación
    addUserBtn.addEventListener('click', () => {
        clearCreateModalErrors();
        createUserForm.reset();
        createUserModal.show();
    });

    // Guardar nuevo usuario
    saveNewUserBtn.addEventListener('click', async () => {
        clearCreateModalErrors();
        let isValid = true;

        const name = createInputs.name.value.trim();
        const lastName1 = createInputs.lastName1.value.trim();
        const lastName2 = createInputs.lastName2.value.trim();
        const noEmployee = createInputs.noEmployee.value.trim();
        const password = createInputs.password.value;
        const privilege = createInputs.privilege.value;

        // Validaciones
        if (!name) { showCreateError('name', 'El nombre es requerido.'); isValid = false; }
        if (!lastName1) { showCreateError('lastName1', 'Apellido paterno requerido.'); isValid = false; }
        if (!lastName2) { showCreateError('lastName2', 'Apellido materno requerido.'); isValid = false; }
        if (!noEmployee) { showCreateError('noEmployee', 'No. de empleado requerido.'); isValid = false; }
        if (!password) { showCreateError('password', 'La contraseña es requerida.'); isValid = false; }
        else if (password.length > 10) { showCreateError('password', 'Máximo 10 caracteres.'); isValid = false; } // Validar longitud aquí
        if (!privilege) { showCreateError('privilege', 'Seleccione un privilegio.'); isValid = false; }
        // Maxlength de otros campos lo valida HTML

        if (!isValid) return;

        try {
            const response = await authFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name, // <-- CAMBIO
                    last_name1: lastName1,
                    last_name2: lastName2,
                    no_employee: noEmployee,
                    password: password,
                    privilegeName: privilege
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Error ${response.status}`);

            createUserModal.hide();
            alert(`Usuario '${result.user.name}' creado con éxito.`);
            loadUsers();

        } catch (error) {
            console.error('Error al crear usuario:', error);
            // Mostrar error específico (ej: usuario duplicado) en el modal
            showCreateError('noEmployee', error.message.includes('ya existe') ? error.message : 'Error del servidor.');
        }
    });

    // Delegación de eventos para botones Editar y Eliminar en la tabla
    userTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const editBtn = target.closest('.edit-btn');
        const deleteBtn = target.closest('.delete-btn');

        if (editBtn) {
            clearEditModalErrors();
            try {
                // Parsear los datos del usuario desde el atributo data-user
                const userData = JSON.parse(editBtn.dataset.user);

                // Rellenar modal de edición
                // Guardar la PK (no_employee) en el campo readonly
                document.getElementById('edit-no_employee').value = userData.noEmployee || '';
                // Llenar el campo 'name' que ahora es editable
                document.getElementById('edit-name').value = userData.name || '';

                document.getElementById('edit-last_name1').value = userData.lastName1 || '';
                document.getElementById('edit-last_name2').value = userData.lastName2 || '';
                document.getElementById('edit-password').value = '';
                document.getElementById('edit-privilege').value = userData.privilege || '';

                editUserModal.show();
            } catch (e) {
                console.error("Error al parsear datos de usuario para editar:", e);
                alert("No se pudieron cargar los datos del usuario para editar.");
            }
        }

        if (deleteBtn) {
            const no_employee = deleteBtn.dataset.noEmployee;;
            const name = deleteBtn.dataset.name; // Solo para el mensaje
            if (confirm(`¿Estás seguro de que quieres eliminar a '${name}' (No. ${no_employee})?`)) {
                try {
                    // Usar 'no_employee' en la URL
                    const response = await authFetch(`/api/users/${encodeURIComponent(no_employee)}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || `Error ${response.status}`);
                    alert(result.message);
                    loadUsers();
                } catch (error) {
                    console.error('Error al eliminar usuario:', error);
                    alert(`Error al eliminar usuario: ${error.message}`);
                }
            }
        }
    });

    // Guardar cambios del usuario editado
    saveUserChangesBtn.addEventListener('click', async () => {
        clearEditModalErrors();
        let isValid = true;
        const no_employee_pk = document.getElementById('edit-no_employee').value;
        const name = editInputs.name.value.trim();
        const lastName1 = editInputs.lastName1.value.trim();
        const lastName2 = editInputs.lastName2.value.trim();
        const password = editInputs.password.value;
        const privilege = editInputs.privilege.value;

        // Validaciones para campos requeridos en edición
       if (!name) { showEditError('name', 'El nombre es requerido.'); isValid = false; } // <-- CAMBIO
        if (!lastName1) { showEditError('lastName1', 'Apellido paterno requerido.'); isValid = false; }
        if (!lastName2) { showEditError('lastName2', 'Apellido materno requerido.'); isValid = false; }
        if (!privilege) { showEditError('privilege', 'Seleccione un privilegio.'); isValid = false; }
        if (password && password.length > 10) {
            showEditError('password', 'Máximo 10 caracteres.');
            isValid = false;
        }

        if (!isValid) return;

        const updateData = {
           name: name, // <-- CAMBIO
            last_name1: lastName1,
            last_name2: lastName2,
            privilegeName: privilege
        };
        if (password) { // Incluir solo si no está vacía
            updateData.password = password;
        }

        try {
            // Usar 'originalName' en la URL
            const response = await authFetch(`/api/users/${encodeURIComponent(no_employee_pk)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Error ${response.status}`);

            editUserModal.hide();
            alert(`Usuario (No. ${result.user.no_employee}) actualizado con éxito.`);
            loadUsers();

        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            alert(`Error al actualizar usuario: ${error.message}`);
        }
    });


    // Listener para filtros de columna
    filterInputs.forEach(input => {
        input.addEventListener('input', applyFilters);
    });

    // Listener para búsqueda general
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredUsers = allUsers.filter(user =>
            // Busca en todos los campos relevantes
            (user.name && user.name.toLowerCase().includes(searchTerm)) ||
            (user.last_name1 && user.last_name1.toLowerCase().includes(searchTerm)) ||
            (user.last_name2 && user.last_name2.toLowerCase().includes(searchTerm)) ||
            (user.no_employee && user.no_employee.toLowerCase().includes(searchTerm)) ||
            (user.privilegeName && user.privilegeName.toLowerCase().includes(searchTerm))
        );
        displayUsers(filteredUsers);
        applyFilters(); // Reaplicar filtros de columna
    });

    // --- Carga Inicial ---
    loadUsers();
});