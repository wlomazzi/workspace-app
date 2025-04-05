import dotenv from 'dotenv';
dotenv.config();  // Carrega as variáveis de ambiente do arquivo .env

import { createClient } from '@supabase/supabase-js';

// Obter as variáveis de ambiente do .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Verifique se as variáveis de ambiente foram carregadas corretamente
console.log('SUPABASE_URL:', supabaseUrl);  // Apenas para depuração
console.log('SUPABASE_KEY:', supabaseKey);  // Apenas para depuração

// Criar o cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };