const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth.controller');

console.log('--- Value of login handler:', typeof login, login); 

router.post('/login', login); 

module.exports = router;