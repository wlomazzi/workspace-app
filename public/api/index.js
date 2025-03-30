const express = require('express');
const app = express();
const path = require('path');

// Serve os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Função serverless
module.exports = app;
