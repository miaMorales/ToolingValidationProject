// Poner esto en un script en adminIndex.html o un JS que se cargue allí
document.addEventListener('DOMContentLoaded', () => {
    
    const privilege = localStorage.getItem('userPrivilege'); // Será "0", "1", o "2" (string)

    // 1. Botón de "Gestión de Usuarios"
    // Asumamos que el enlace en tu NAV tiene id="nav-users-link"
    const usersLink = document.getElementById('main-nav-links'); // <-- Debes poner este ID en tu HTML
    const gestionUs=document.getElementById('gestion-us');

    if (usersLink && privilege == '2') { // Si NO es Admin (0)
        usersLink.style.display = 'none'; // Ocultar el enlace
    }

    if(gestionUs && privilege == '1' || privilege == '2'){
        gestionUs.style.display='none';
    }

    function handleLogout() {
        console.log("Cerrando sesión y redirigiendo..."); 
        localStorage.removeItem('token');
        localStorage.removeItem('userPrivilege');
        localStorage.removeItem('userName');
        window.location.replace('/index.html'); 
    }

    // --- ASÍ ES CORRECTO ---
    // 2. Busca el botón y asigna el evento DIRECTAMENTE
    // (Esto funciona porque ya estamos dentro del listener principal)
    const logoutButton = document.getElementById('logout-button'); //

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.warn("No se encontró el botón con id 'logout-button'");
    }
const INACTIVITY_TIME = 1 * 60 * 1000; // 5 minutos en milisegundos
let inactivityTimer;

// 1. Función que se ejecutará cuando se acabe el tiempo
function logoutDueToInactivity() {
    alert("Se ha cerrado la sesión por inactividad.");
    
    // Reutilizamos la lógica de logout (asegúrate de que esta función exista)
    localStorage.removeItem('token');
    localStorage.removeItem('userPrivilege');
    localStorage.removeItem('userName');
    window.location.replace('/index.html');
}

// 2. Función para reiniciar el temporizador
function resetInactivityTimer() {
    clearTimeout(inactivityTimer); // Borra el temporizador anterior
    inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIME); // Crea uno nuevo
    // console.log("Timer reiniciado");
}

// 3. Escuchar la actividad del usuario en toda la página
// 'mousemove': Mover el ratón
// 'keydown': Presionar una tecla
// 'click': Hacer clic
// 'scroll': Mover el scroll
window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('keydown', resetInactivityTimer);
window.addEventListener('click', resetInactivityTimer);
window.addEventListener('scroll', resetInactivityTimer);

// 4. Iniciar el temporizador por primera vez cuando se carga la página
resetInactivityTimer();
// Asigna esto a tu botón
// document.getElementById('logout-button').addEventListener('click', handleLogout);
});