const express = require('express');
const { createClient } = require('@supabase/supabase-js');


// Inicializa o cliente do Supabase com as variáveis de ambiente
const supabase = createClient(
    process.env.SUPABASE_URL, // A URL do Supabase
    process.env.SUPABASE_ANON_KEY // A chave pública (anon key)
);


const router = express.Router();

// Rota GET para buscar os workspaces
router.get('/', async (req, res) => {
  try {
    // Consulta os dados da tabela 'workspaces' no Supabase
    const { data, error } = await supabase
      .from('workspaces')
      .select('*');
    
    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar os workspaces' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

module.exports = router;
