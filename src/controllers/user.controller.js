// src/controllers/user.controller.js
const userService = require('../services/user.service');

// Mapas de privilegio (sin cambios)
const privilegeMap = { 'Operador': 2, 'Tecnico': 1, 'Admin': 0 };
const reversePrivilegeMap = { 2: 'Operador', 1: 'Tecnico', 0: 'Admin' };
function numberToPrivilege(num) { return reversePrivilegeMap[num] ?? 'Desconocido'; }
function privilegeToNumber(name) { return privilegeMap[name]; }

async function getUsers(req, res) {
    // (Sin cambios)
    try {
        const users = await userService.getAllUsers();
        const usersWithDetails = users.map(user => ({
            ...user,
            privilegeName: numberToPrivilege(user.privilege),
        }));
        res.json(usersWithDetails);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

async function createUser(req, res) {
    // (Validación de 'name' añadida)
    try {
        const { name, password, privilegeName, last_name1, last_name2, no_employee } = req.body;

        // --- CAMBIO: 'name' ahora es un campo obligatorio más ---
        if (!name || !password || !privilegeName || !last_name1 || !last_name2 || !no_employee) {
             return res.status(400).json({ message: 'Todos los campos son requeridos.' });
        }
        // Validaciones de longitud (sin cambios)
        if (name.length > 30) return res.status(400).json({ message: 'El nombre excede los 30 caracteres.' });
        if (last_name1.length > 10) return res.status(400).json({ message: 'Apellido paterno excede los 10 caracteres.' });
        if (last_name2.length > 10) return res.status(400).json({ message: 'Apellido materno excede los 10 caracteres.' });
        if (no_employee.length > 5) return res.status(400).json({ message: 'No. empleado excede los 5 caracteres.' });

        const privilegeNumber = privilegeToNumber(privilegeName);
        if (privilegeNumber === undefined) {
            return res.status(400).json({ message: 'Privilegio no válido.' });
        }

        const newUser = await userService.createUser({
            name, password, privilege: privilegeNumber, last_name1, last_name2, no_employee
        });
        res.status(201).json({ success: true, user: newUser });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === '23505') { // Error de PK duplicada
             // --- CAMBIO: El error ahora es sobre 'no_employee' ---
             return res.status(409).json({ message: `El No. de Empleado '${req.body.no_employee}' ya existe.` });
        }
        res.status(500).json({ message: 'Error en el servidor al crear usuario' });
    }
}

async function updateUser(req, res) {
    try {
        // --- CAMBIO: El parámetro de ruta ahora es 'no_employee' ---
        const { no_employee } = req.params; 
        
        // --- CAMBIO: 'name' ahora viene en el body como campo a actualizar ---
        const { password, privilegeName, name, last_name1, last_name2 } = req.body;

        // Validaciones
        if (password && password.length > 10) {
             return res.status(400).json({ message: 'La nueva contraseña excede los 10 caracteres.' });
        }
        // --- CAMBIO: 'name' es requerido, 'no_employee' ya no viene en el body de actualización ---
        if (!privilegeName || !name || !last_name1 || !last_name2) {
             return res.status(400).json({ message: 'Faltan campos requeridos (nombre, apellidos, privilegio).' });
        }
        // Validaciones de longitud
         if (name.length > 30) return res.status(400).json({ message: 'El nombre excede los 30 caracteres.' });
         if (last_name1.length > 10) return res.status(400).json({ message: 'Apellido paterno excede los 10 caracteres.' });
         if (last_name2.length > 10) return res.status(400).json({ message: 'Apellido materno excede los 10 caracteres.' });
         // no_employee no se valida aquí porque no se está actualizando

        const privilegeNumber = privilegeToNumber(privilegeName);
        if (privilegeNumber === undefined) {
            return res.status(400).json({ message: 'Privilegio no válido.' });
        }

        const updatedUser = await userService.updateUser(no_employee, { // <-- CAMBIO: Pasa la PK
            password,
            privilege: privilegeNumber,
            name, // <-- CAMBIO: Pasa el nuevo nombre
            last_name1,
            last_name2
            // no_employee no se pasa porque no se puede actualizar
        });
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error(`Error al actualizar usuario ${req.params.no_employee}:`, error); // <-- CAMBIO
        if (error.message.includes('Usuario no encontrado')) {
             return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error en el servidor al actualizar usuario' });
    }
}

async function deleteUser(req, res) {
    try {
        // --- CAMBIO: El parámetro de ruta ahora es 'no_employee' ---
        const { no_employee } = req.params;
        const deletedUser = await userService.deleteUser(no_employee); // <-- CAMBIO
        res.json({ success: true, message: `Usuario '${deletedUser.name}' (No. ${deletedUser.no_employee}) eliminado.` }); // <-- CAMBIO
    } catch (error) {
        console.error(`Error al eliminar usuario ${req.params.no_employee}:`, error); // <-- CAMBIO
         if (error.message.includes('Usuario no encontrado')) {
             return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error en el servidor al eliminar usuario' });
    }
}

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};