// public/JS/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const employeeInput = document.getElementById('no_employee');
    const passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Leer del campo correcto
            const no_employee = employeeInput.value.trim();
            const password = passwordInput.value;

            // Validación simple
            if (!no_employee || !password) {
                alert('Por favor, ingresa tu No. de Empleado y contraseña.');
                return;
            }

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // Enviar 'no_employee' en el body
                    body: JSON.stringify({ no_employee, password }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    console.log('Login exitoso:', result.user);
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('userPrivilege', result.user.privilege);
                    // Redirección basada en privilegio (sin cambios aquí)
                    switch (result.user.privilege) {
                        case 0: // Admin
                            window.location.href = '/adminIndex.html';
                            break;
                        case 1: // Tecnico
                            window.location.href = '/adminIndex.html';
                            break;
                        case 2: // Operador
                            window.location.href = '/adminIndex.html';
                            break;
                        default:
                            alert('Privilegio desconocido.');
                            window.location.href = '/index.html';
                    }

                } else {
                    alert(result.message || 'Error al iniciar sesión.');
                    passwordInput.value = '';
                }

            } catch (error) {
                console.error('Error en la solicitud de login:', error);
                alert('Error al conectar con el servidor.');
            }
        });
    }
});