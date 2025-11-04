// src/controllers/auth.controller.js

const { findByEmployeeNumberCredentials } = require('../services/user.service');
const jwt = require('jsonwebtoken'); 
const JWT_SECRET = 'SMTToolingValidationSecretKey'; 

async function login(req, res) {
  const { no_employee, password } = req.body;
  const clean_no_employee = no_employee ? no_employee.replace(/'/g, '-') : '';
  
  console.log(`[AUTH] Intento de login recibido: No. Empleado='${clean_no_employee}', Contraseña='${password ? '***' : '(vacía)'}'`);

  try {
    const user = await findByEmployeeNumberCredentials(clean_no_employee, password);

    if (!user) {
       console.log(`[AUTH] Falló: Credenciales incorrectas para '${clean_no_employee}'`);
       // Usa return para detener la ejecución aquí
       return res.status(401).json({ success: false, message: 'Credenciales incorrectas' }); 
    }

    // --- SECCIÓN DE ÉXITO (DEBE HABER SOLO UNA) ---
    const payload = {
      name: user.name,
      no_employee: user.no_employee,
      privilege: user.privilege 
    };
  console.log(`[AUTH] Creando token. 'privilege' desde la BD es: ${user.privilege} (Tipo: ${typeof user.privilege})`);  
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    
    console.log(`[AUTH] Éxito: No. Empleado '${clean_no_employee}' autenticado (Usuario: ${user.name}). Privilegio: ${user.privilege}`);
    
    // Solo UNA llamada a res.json aquí
    res.json({ success: true, token: token, user: user });
    // --- FIN DE SECCIÓN DE ÉXITO ---

  } catch (e) {
    console.error('[AUTH] Error en el servidor durante login:', e);
    
    // Asegurarse de no enviar cabeceras si ya se enviaron (aunque el 'return' de arriba debería prevenirlo)
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }
}

module.exports = { login };