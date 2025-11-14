document.addEventListener('DOMContentLoaded', () => {
    // Selectores para los nuevos elementos
    const mainTabs = document.querySelectorAll('#main-tabs .nav-link');
    const contentPanels = document.querySelectorAll('.tab-content-panel');
    
    const lineSelectionView = document.getElementById('line-selection-view');
    const scanView = document.getElementById('scan-view');
    const lineCarousel = document.getElementById('line-carousel');
    const scannerInput = document.getElementById('scanner-input');
    const scanPrompt = document.getElementById('scan-prompt');
    const scanContext = document.getElementById('scan-context');
    const scanProgress = document.getElementById('scan-progress');
    const resetButton = document.getElementById('reset-button');
    const logTableBody = document.getElementById('log-table-body');
    // Nuevos selectores para alertas
    const alertsTableBody = document.getElementById('alerts-table-body');
    const alertsBadge = document.getElementById('alerts-badge'); // Para notificaciones
    let state = {};

     mainTabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            mainTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.getAttribute('data-target');
            contentPanels.forEach(panel => {
                panel.style.display = panel.id === targetId.substring(1) ? 'block' : 'none';
            });

            if (targetId === '#history-content') {
                loadProductionLogs();
            } else if (targetId === '#alerts-content') { // <-- (INICIO) AÑADIR ESTE ELSE IF
                loadMaintenanceAlerts();
            } // <-- (FIN) AÑADIR ESTE ELSE IF
            else if (targetId === '#scan-content') {
                resetState();
            }
        });
    });
async function loadMaintenanceAlerts() {
    try {
        const response = await authFetch('/api/validation/alerts');
        if (!response.ok) throw new Error('Error al cargar las alertas.');
        
        // 'alerts' ahora contiene TODAS (nuevas y resueltas)
        const alerts = await response.json(); 
        
        alertsTableBody.innerHTML = ''; // Limpiar la tabla

        // --- LÓGICA DEL BADGE (CÍRCULO ROJO) ---
        // Filtramos solo las 'new' para contarlas
        const newAlerts = alerts.filter(alert => alert.status === 'new');

        if (newAlerts.length > 0) {
            // El badge solo muestra el conteo de las nuevas
            if (alertsBadge) {
                alertsBadge.textContent = newAlerts.length;
                alertsBadge.style.display = 'inline-block';
            }
        } else {
            // Si no hay nuevas, se oculta el badge
            if (alertsBadge) alertsBadge.style.display = 'none';
        }

        // --- LÓGICA DE LA TABLA ---
        if (alerts.length > 0) {
            // Recorremos TODAS las alertas
            alerts.forEach(alert => {
                const tr = document.createElement('tr');
                const timestamp = new Date(alert.alert_timestamp).toLocaleString('es-MX');

                // --- ¡AQUÍ ESTÁ LA MAGIA! ---
                // Si la alerta es 'new', pintamos la fila de rojo
                if (alert.status === 'new') {
                    tr.classList.add('table-danger'); // Bootstrap clase para fila roja
                }

                tr.innerHTML = `
                    <td>${timestamp}</td>
                    <td>${alert.line_number}</td>
                    <td>${alert.tool_type}</td>
                    <td>${alert.tool_barcode}</td>
                    <td class="fw-bold">${alert.current_uses_recorded} / ${alert.max_uses_recorded}</td>
                `;
                alertsTableBody.appendChild(tr);
            });

        } else {
            // Si no hay NINGUNA alerta (ni nueva ni resuelta), mostramos el mensaje
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="text-center text-muted">No hay historial de alertas.</td>`;
            alertsTableBody.appendChild(tr);
        }
    } catch (error) {
        console.error(error);
        alertsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}
    async function loadProductionLogs() {
        try {
            const response = await authFetch('/api/validation/logs');
            if (!response.ok) throw new Error('Error al cargar el historial.');
            const logs = await response.json();
            logTableBody.innerHTML = '';

            logs.forEach(log => {
                const tr = document.createElement('tr');
                const timestamp = new Date(log.log_timestamp).toLocaleString('es-MX');
                tr.innerHTML = `
                    <td>${timestamp}</td>
                    <td>${log.line_number}</td>
                    <td>${log.model_name || 'N/A'}</td>
                    <td>${log.pn_pcb}</td>
                    <td>${log.model_side}</td>
                    <td>${log.stencil_bc || '-'}</td>
                    <td>${log.squeegee_f_bc || '-'}</td>
                    <td>${log.squeegee_r_bc || '-'}</td>
                    <td>${log.squeegee_y_bc || '-'}</td>
                    <td>${log.plate_bc || '-'}</td>
                    <td>${log.pasta_lot || '-'}</td>
                    <td>${log.username}</td>
                `;
                logTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
            logTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }
    function resetState() {
        state = { line: null, step: null, context: {}, barcodes: {}, steps: [] };
        lineSelectionView.style.display = 'block';
        scanView.style.display = 'none';
        scanProgress.innerHTML = '';
        scanContext.innerHTML = '';
    }

    function startScanProcess(lineNumber) {
        state.line = lineNumber;
        if (['1', '2'].includes(lineNumber)) {
            state.steps = ['stencil', 'squeegee_f', 'squeegee_r', 'plate', 'pasta'];
        } else {
            state.steps = ['stencil', 'squeegee_y', 'plate', 'pasta'];
        }
        state.step = state.steps[0];
        lineSelectionView.style.display = 'none';
        scanView.style.display = 'block';
        updateUI();
        scannerInput.focus();
    }

    function updateUI() {
        const stepLabels = {
            stencil: 'Escanee el STENCIL',
            squeegee_f: 'Escanee el SQUEEGEE (F)',
            squeegee_r: 'Escanee el SQUEEGEE (R)',
            squeegee_y: 'Escanee el SQUEEGEE (Y)',
            plate: 'Escanee el PLATE',
            pasta: 'Escanee la PASTA'
        };
        scanPrompt.textContent = state.step ? stepLabels[state.step] : 'Proceso Completo';
        
        if (state.context.pn_pcb) {
            scanContext.innerHTML = `<strong>Modelo:</strong> ${state.context.pn_pcb} <strong>Lado:</strong> ${state.context.model_side}`;
        }
    }
    
    function addProgressItem(step, barcode) {
        const stepLabels = {
            stencil: 'Stencil', squeegee_f: 'Squeegee F', squeegee_r: 'Squeegee R', 
            squeegee_y: 'Squeegee Y', plate: 'Plate', pasta: 'Pasta'
        };
        const li = document.createElement('li');
        li.className = 'list-group-item scan-progress-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <div>
                <div class="item-name">${stepLabels[step]}</div>
                <div class="item-barcode">${barcode}</div>
            </div>
            <i class="bi bi-check-circle-fill checkmark-icon"></i>
        `;
        scanProgress.appendChild(li);
    }
    
    async function handleScan() {
        // La lógica interna de esta función no cambia
        const barcode = scannerInput.value.trim();
        if (!barcode) return;
        try {
            const response = await authFetch('/api/validation/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: state.step, barcode: barcode, context: state.context })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            state.barcodes[state.step] = barcode;
            addProgressItem(state.step, barcode);
            if (result.nextContext) { state.context = result.nextContext; }
            const currentStepIndex = state.steps.indexOf(state.step);
            if (currentStepIndex < state.steps.length - 1) {
                state.step = state.steps[currentStepIndex + 1];
            } else {
                state.step = null;
                await logFinalResult();
            }
        } catch (error) {
            alert(`Error de validación: ${error.message}`);
        } finally {
            scannerInput.value = '';
            updateUI();
            scannerInput.focus();
        }
    }

    async function logFinalResult() {
        // La lógica interna de esta función no cambia
        scanPrompt.textContent = 'Proceso de validación completo. Registrando...';
        try {
            const response = await authFetch('/api/validation/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    line: state.line, context: state.context, barcodes: state.barcodes,
                
                })
            });
            if (!response.ok) throw new Error('No se pudo guardar el registro.');
            alert('¡Validación y registro completados con éxito!');
            resetState();
        } catch (error) {
            alert(`Error final: ${error.message}`);
        }
    }

    // --- Event Listeners Actualizados ---
    lineCarousel.addEventListener('click', (event) => {
        const card = event.target.closest('.line-card');
        if (card) {
            const selectedLine = card.getAttribute('data-line');
            startScanProcess(selectedLine);
        }
    });
    
    scannerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleScan();
        }
    });

    resetButton.addEventListener('click', resetState);

    scannerInput.addEventListener('blur', () => {
        setTimeout(() => { scannerInput.focus(); }, 10); 
    });
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');

    scrollLeftBtn.addEventListener('click', () => {
        lineCarousel.scrollBy({ left: -300, behavior: 'smooth' });
    });

    scrollRightBtn.addEventListener('click', () => {
        lineCarousel.scrollBy({ left: 300, behavior: 'smooth' });
    });
    loadMaintenanceAlerts();
    // Iniciar
    resetState();
});