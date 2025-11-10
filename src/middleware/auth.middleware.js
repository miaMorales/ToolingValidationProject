// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'SMTToolingValidationSecretKey';

/**
 * Middleware para verificar el token JWT.
 * Si es válido, añade req.user con los datos del payload.
 * Si no, envía un error 401.
 */
function verifyToken(req, res, next) {
    // 1. Obtener el token del header 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' }); // 401 Unauthorized
    }

    // 2. Verificar el token
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; 
        next(); 
    } catch (err) {
        console.warn("[AUTH] Token inválido o expirado:", err.message);
        return res.status(403).json({ message: 'Token inválido o expirado.' }); // 403 Forbidden
    }
}

/**
 * Middleware para verificar roles (privilegios).
 * Se usa DESPUÉS de verifyToken.
 * @param {Array<number>} allowedPrivileges - Array de niveles de privilegio permitidos (ej. [0] para solo Admin)
 */
function checkRole(allowedPrivileges) {
    return (req, res, next) => {
        if (!req.user || req.user.privilege === undefined) {
            return res.status(403).json({ message: 'No se pudo verificar el privilegio.' });
        }

        // --- CAMBIO AQUÍ ---
        // Convertimos el privilegio del token (que puede ser "0") a un NÚMERO
        const userPrivilege = parseInt(req.user.privilege, 10);
        // --- FIN DEL CAMBIO ---
        if (allowedPrivileges.includes(userPrivilege)) {
            // El usuario tiene el privilegio, continuar
            // ej. [0].includes(0) -> true
            next();
        } else {
            // El usuario no tiene el privilegio
            // ej. [0].includes(2) -> false
            console.warn(`[AUTH] Acceso denegado para ${req.user.name}. Rol ${userPrivilege} no autorizado. Se esperaba uno de: ${allowedPrivileges}`);
            res.status(403).json({ message: 'Acceso prohibido. No tienes los permisos necesarios.' });
        }
    };
}

// Roles
const soloAdmin = checkRole([0]); // 0 = Admin
const adminYTecnico = checkRole([0, 1]); // 0 = Admin, 1 = Tecnico
const todosLogueados = checkRole([0, 1, 2]); // Cualquiera que tenga token

module.exports = {
    verifyToken,
    soloAdmin,
    adminYTecnico,
    todosLogueados
};