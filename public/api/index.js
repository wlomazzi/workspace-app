/*const express = require('express');
const app = express();
const path = require('path');

// Serve os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Função serverless
module.exports = app;
*/
const express = require('express');
const app = express();
const path = require('path');

// Serve os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota para carregar o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Função serverless
module.exports = app;
