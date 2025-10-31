// src/services/user.service.js
const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Obtiene todos los usuarios (sin la contraseña).
 * (Sin cambios aquí)
 */
async function getAllUsers() {
    const query = `
        SELECT name, last_name1, last_name2, no_employee, privilege 
        FROM users 
        ORDER BY name ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
}

/**
 * Obtiene un usuario por su NÚMERO DE EMPLEADO (PK).
 */
async function getUserByEmployeeNumber(no_employee) { // <-- CAMBIO DE NOMBRE DE FUNCIÓN
    const query = `
        SELECT name, password, privilege, last_name1, last_name2, no_employee 
        FROM users 
        WHERE no_employee = $1; -- <-- CAMBIO: PK ahora es no_employee
    `;
    const { rows } = await pool.query(query, [no_employee]);
    return rows[0];
}

/**
 * Crea un nuevo usuario. Hashea la contraseña.
 */
async function createUser(userData) {
    const { name, password, privilege, last_name1, last_name2, no_employee } = userData;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
        INSERT INTO users (name, password, privilege, last_name1, last_name2, no_employee)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING no_employee; -- <-- CAMBIO: Retornar la nueva PK
    `;
    const { rows } = await pool.query(query, [name, hashedPassword, privilege, last_name1, last_name2, no_employee]);
    return rows[0];
}

/**
 * Actualiza datos del usuario (privilegio, apellidos, nombre, y opcionalmente contraseña).
 * Identifica al usuario por no_employee.
 */
async function updateUser(no_employee, updateData) { // <-- CAMBIO: Identificador es no_employee
    // --- CAMBIO: 'name' ahora está incluido en los campos a actualizar ---
    const { password, privilege, name, last_name1, last_name2 } = updateData;

    let queryFields = ['privilege = $1', 'name = $2', 'last_name1 = $3', 'last_name2 = $4'];
    let queryParams = [privilege, name, last_name1, last_name2];
    let passwordClause = '';
    let pkParamIndex = 5; // Índice para no_employee en WHERE

    if (password) {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        passwordClause = ', password = $5'; // Añadir actualización de contraseña
        queryParams.push(hashedPassword);
        pkParamIndex = 6; // Ajustar índice
    }

    const query = `
        UPDATE users
        SET ${queryFields.join(', ')} ${passwordClause} 
        WHERE no_employee = $${pkParamIndex} -- <-- CAMBIO: PK ahora es no_employee
        RETURNING no_employee; -- <-- CAMBIO: Retornar la PK
    `;
    queryParams.push(no_employee); // Añadir no_employee al final para el WHERE

    const { rows } = await pool.query(query, queryParams);
    if (rows.length === 0) {
        throw new Error('Usuario no encontrado para actualizar.');
    }
    return rows[0];
}

/**
 * Elimina un usuario por su no_employee.
 */
async function deleteUser(no_employee) { // <-- CAMBIO: Identificador es no_employee
    const query = 'DELETE FROM users WHERE no_employee = $1 RETURNING no_employee'; // <-- CAMBIO
    const { rows } = await pool.query(query, [no_employee]);
    if (rows.length === 0) {
        throw new Error('Usuario no encontrado para eliminar.');
    }
    return rows[0];
}

/**
 * Busca un usuario por número de empleado y verifica su contraseña (Login).
 * (Esta función ya era correcta por tu petición anterior)
 */
async function findByEmployeeNumberCredentials(no_employee, password) {
    try {
        // 1. Obtener el usuario por no_employee
        const query = `
            SELECT name, password, privilege, last_name1, last_name2, no_employee 
            FROM users 
            WHERE no_employee = $1
        `;
        const { rows } = await pool.query(query, [no_employee]);
        const user = rows[0];

        if (!user) {
            console.log(`[SERVICE] findByEmployeeNumberCredentials: No. empleado '${no_employee}' no encontrado.`);
            return null;
        }
        console.log(`[SERVICE] findByEmployeeNumberCredentials: No. empleado '${no_employee}' encontrado (Usuario: ${user.name}). Comparando contraseña...`);

        const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;
        console.log(`[SERVICE] findByEmployeeNumberCredentials: Resultado bcrypt.compare para '${no_employee}': ${isMatch}`);
        if (!isMatch) return null;

        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;

    } catch (error) {
        console.error("[SERVICE] Error en findByEmployeeNumberCredentials:", error);
        throw error;
    }
}

module.exports = {
    getAllUsers,
    getUserByEmployeeNumber, // <-- CAMBIO: Exportar la nueva función getter
    createUser,
    updateUser,
    deleteUser,
    findByEmployeeNumberCredentials
};