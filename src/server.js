// server.js (Corregido y unificado)
const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
  console.error('!!!!!!!!!! Error al cargar el archivo .env !!!!!!!!!!!');
  console.error(result.error);
} else {
    console.log('Variables de entorno cargadas:', result.parsed ? Object.keys(result.parsed).join(', ') : '(ninguna)');
    console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : '(no definida)'); // No mostrar la contraseña en logs
}

const path = require('path');
const express = require('express');
const app = express();

// --- Require de todas las rutas ---
const stencilRoutes = require('./routes/stencil.routes.js');
const recipeRoutes = require('./routes/recipe.routes');
const plateRoutes = require('./routes/plate.routes.js');
const squeegeeRoutes = require('./routes/squeegee.routes.js');
const validationRoutes = require('./routes/validation.routes');
const { startMonitoring } = require('./services/cycleCounter.service');
const authRoutes = require('./routes/auth.routes'); // Rutas de autenticación (login)
const userRoutes = require('./routes/user.routes');   // Rutas de gestión de usuarios (CRUD)
const labelRoutes = require('./routes/label.routes');
// --- Middlewares ---
// Parsear JSON bodies (IMPORTANTE: antes de las rutas)
app.use(express.json());
// Parsear URL-encoded bodies (para formularios HTML tradicionales, aunque no lo uses mucho con API)
app.use(express.urlencoded({ extended: true }));
// Servir archivos estáticos (HTML, CSS, JS del frontend) desde la carpeta 'public'
// Asumiendo que server.js está en 'src', subimos un nivel y entramos a 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Montaje de Rutas API (todas bajo /api) ---
app.use('/api', authRoutes); // Rutas de login: /api/login
app.use('/api', userRoutes); // Rutas CRUD usuarios: /api/users, /api/users/:username
app.use('/api', stencilRoutes);
app.use('/api', recipeRoutes);
app.use('/api', plateRoutes);
app.use('/api', squeegeeRoutes);
app.use('/api', validationRoutes);
app.use('/api', labelRoutes);

// --- Rutas HTML ---
// Ruta raíz ('/') sirve la página de login (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'adminIndex.html'));
});

// Ruta para la página principal del admin (si existe)
app.get('/adminIndex.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'public', 'adminIndex.html'));
});

// Ruta para la página principal del operador (asegúrate que el archivo exista)
app.get('/operadorIndex.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'public', 'adminIndex.html'));
});

// Puedes añadir más rutas .get() para servir otras páginas HTML directamente si es necesario


// --- Puerto y Arranque ---
const PORT = process.env.PORT || 3000; // Usa variable de entorno si existe, si no, 3000
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
startMonitoring();