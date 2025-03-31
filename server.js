const express = require('express');
const path = require('path');
const app = express();

// Serve arquivos estáticos da pasta 'public' como a raiz
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o arquivo principal (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configurar a porta para o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
