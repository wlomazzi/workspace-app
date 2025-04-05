require('dotenv').config();  // Carregar variáveis de ambiente


const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const PORT = 3000;

// Carregar variáveis de ambiente

// Middleware
app.use(express.json()); // Allows JSON body parsing
app.use(cors());         // Enables CORS for all requests


// Importing API route handlers
const usersRoutes = require("./api/users/users");
const spacesRoutes = require("./api/spaces/spaces");
const spacesRentedRoutes = require("./api/spaces/spaces_rented"); // ✅ NEW route added here

const workspaces = require('./api/spaces/workspaces');

// Usar o CORS para permitir todas as origens
app.use(cors());

// Usar o arquivo workspaces.js como uma rota
app.use('/api/spaces/workspaces', workspaces);

// Middleware para permitir requisições CORS
/*
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
*/
//// Usar o arquivo workspaces.js como uma rota
app.use('/api/spaces/workspaces', workspaces);


// Registering API endpoints
app.use("/api/users", usersRoutes);
app.use("/api/spaces", spacesRoutes);
app.use("/api/spaces_rented", spacesRentedRoutes); // ✅ New route registration

// Serve arquivos estáticos da pasta 'public' como a raiz
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o arquivo principal (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configurar a porta para o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
