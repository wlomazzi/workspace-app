import dotenv from 'dotenv';
dotenv.config();  // Carrega as variáveis de ambiente do arquivo .env

import express from 'express';
import path from 'path';  // Necessário para servir arquivos estáticos corretamente
import { supabase } from './lib/supabase.js';  // Importa o cliente do Supabase

const app = express();
const port = process.env.PORT || 3000;  // Define a porta (ou 3000 como padrão)

// Serve arquivos estáticos da pasta 'public'
app.use(express.static('public'));  // Serve arquivos da pasta public

// Rota para servir o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));  // Serve o index.html da pasta public
});
app.get('/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));  // Serve workspaces.html
});


// Rota para exibir os dados da tabela "workspaces"
app.get('/workspaces', async (req, res) => {
  try {
    // Faz a consulta na tabela "workspaces" do Supabase
    const { data, error } = await supabase.from('workspaces').select('*');

    // Verifica se houve erro ao consultar os dados
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Retorna os dados em formato HTML
    res.send(`
      <html>
        <head>
          <title>Workspaces</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 12px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Workspaces</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Location</th>
                <th>Title</th>
                <th>Price per hour</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(workspace => `
                <tr>
                  <td>${workspace.id}</td>
                  <td>${workspace.title}</td>
                  <td>${workspace.location}</td>
                  <td>${workspace.price_per_hour}</td>
                  <td>${workspace.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor na porta definida
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
