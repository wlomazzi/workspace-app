
import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json()); // added to parse JSON bodies - Middleware to parse URL-encoded bodies




router.get("/", async (req, res) => {

    const { id } = req.query; // Get the ID from the query string (e.g., ?id=123)
    
    try {
        let query = supabase.from('workspaces').select('*');
        
        if (id) {
            query = query.eq('id', id);  // Get the workspace with the specified ID
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);  // Return the data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }

});


// Route to get occupied dates for a specific space
router.get("/reservations", async (req, res) => {
    const { id } = req.query; // Get the ID from the query string (e.g., ?id=123)
    try {
        let query = supabase.from('reservations').select('*');
        
        if (id) {
            query = query.eq('workspace_id', id);  // Get the workspace with the specified ID
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);  // Return the data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
});



// API para receber a requisição POST e processar o user_id
router.post("/filter", async (req, res) => {

    console.log(req.body); // Logando o corpo da requisição para depuração

    const { user_id } = req.body; // Acessando user_id do corpo da requisição

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        // Consulta ao Supabase
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('user_id', user_id)
            //.single(); // Garantir que apenas um resultado seja retornado

        if (error) {
            return res.status(500).json({ error: 'Error to find data from this user.' });
        }

        res.json(data);  // Retorna os dados como JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
        
});





export default router;
