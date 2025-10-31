// Poner esto en un script en adminIndex.html o un JS que se cargue allí
document.addEventListener('DOMContentLoaded', () => {
    
    const privilege = localStorage.getItem('userPrivilege'); // Será "0", "1", o "2" (string)

    // 1. Botón de "Gestión de Usuarios"
    // Asumamos que el enlace en tu NAV tiene id="nav-users-link"
    const usersLink = document.getElementById('main-nav-links'); // <-- Debes poner este ID en tu HTML
    
    if (usersLink && privilege == '2') { // Si NO es Admin (0)
        usersLink.style.display = 'none'; // Ocultar el enlace
    }

    // 3. Botón de "Logout" (Asegurarse de limpiar localStorage)
    const logoutBtn = document.querySelector('.logout-btn'); // Usando la clase que ya tienes
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userPrivilege');
            localStorage.removeItem('userName');
            window.location.href = '/index.html';
        });
    }
});