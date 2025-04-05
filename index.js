import dotenv from 'dotenv';
dotenv.config();  // Carrega as variáveis de ambiente do arquivo .env

import express from 'express';
import path from 'path';  // Corrigido: importando o módulo 'path'
import { fileURLToPath } from 'url';  // Para converter URL em caminho de arquivo
import { supabase } from './lib/supabase.js';  // Importa o cliente do Supabase

const app = express();
const port = process.env.PORT || 3000;  // Define a porta (ou 3000 como padrão)

// Usando import.meta.url para obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));  // Serve o index.html da pasta public
});

// Rota para servir o arquivo test.html
app.get('/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));  // Serve test.html da pasta public
});

// Rota para exibir os dados da tabela "workspaces"
app.get('/workspaces', async (req, res) => {
  try {
    const { data, error } = await supabase.from('workspaces').select('*');
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.send(`
      <html>
        <head>
          <title>Workspaces</title>
        </head>
        <body>
          <h1>Workspaces</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Location</th>
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
