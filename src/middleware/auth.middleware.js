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
        
        // 3. Si es válido, guardar los datos del usuario en el objeto 'req'
        // para que las siguientes funciones (controladores) puedan usarlo.
        req.user = payload; // req.user ahora tiene { name, no_employee, privilege }
        next(); // Pasa al siguiente middleware o al controlador
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

        const userPrivilege = req.user.privilege; // Ej. 0, 1, o 2

        if (allowedPrivileges.includes(userPrivilege)) {
            next(); // El usuario tiene el privilegio, continuar
        } else {
            console.warn(`[AUTH] Acceso denegado para ${req.user.name}. Rol ${userPrivilege} no autorizado.`);
            res.status(403).json({ message: 'Acceso prohibido. No tienes los permisos necesarios.' }); // 403 Forbidden
        }
    };
}

// Roles
const soloAdmin = checkRole([0]); // 0 = Admin
const adminYTécnico = checkRole([0, 1]); // 0 = Admin, 1 = Tecnico
const todosLogueados = checkRole([0, 1, 2]); // Cualquiera que tenga token

module.exports = {
    verifyToken,
    soloAdmin,
    adminYTécnico,
    todosLogueados
};