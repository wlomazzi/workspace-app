import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client

const router = express.Router();

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



export default router;
