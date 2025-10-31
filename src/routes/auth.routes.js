const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth.controller');

console.log('--- Value of login handler:', typeof login, login); // <-- ADD THIS LOG

router.post('/login', login); 

module.exports = router;