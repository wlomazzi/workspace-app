import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client

const router = express.Router();

// Route to return the data from the workspaces
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase.from('workspaces').select('*');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(data);  // Return the data as JSON
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
