/**
 * Una función "wrapper" para 'fetch' que automáticamente
 * añade el token JWT de localStorage a las cabeceras.
 */
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    // Prepara las cabeceras
    const headers = new Headers(options.headers || {});
    
    // Añade el token si existe
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    // Asegurarse que Content-Type esté si se envía body JSON
    if (options.body && typeof options.body === 'object') {
         headers.append('Content-Type', 'application/json');
         // Convertir el body a string JSON
         options.body = JSON.stringify(options.body);
    }
    
    // Actualizar las opciones con las nuevas cabeceras
    const newOptions = { ...options, headers: headers };

    // Realizar la petición
    const response = await fetch(url, newOptions);

    // Si el token es inválido (401 o 403), el servidor lo rechazará.
    // Redirigir al login.
    if (response.status === 401 || response.status === 403) {
        console.warn('Token inválido o expirado. Redirigiendo al login.');
        localStorage.removeItem('token');
        localStorage.removeItem('userPrivilege');
        localStorage.removeItem('userName');
        // Redirigir a la página de inicio
        window.location.href = '/index.html'; 
        // Lanzar un error para detener la ejecución del código que llamó a authFetch
        throw new Error('No autorizado.'); 
    }

    return response;
}