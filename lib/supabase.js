import dotenv from 'dotenv';
dotenv.config();  // Load environment variables from the .env file

import { createClient } from '@supabase/supabase-js';

// Get environment variables from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if environment variables were loaded correctly
//console.log('SUPABASE_URL:', supabaseUrl);  // Apenas para depuração
//console.log('SUPABASE_KEY:', supabaseKey);  // Apenas para depuração

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };