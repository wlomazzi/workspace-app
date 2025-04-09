import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
const router = express.Router();

//Use cookie-parser to handle cookies
//router.use(cookieParser());


// Middleware to parse JSON bodies
router.use(express.json()); // added to parse JSON bodies - Middleware to parse URL-encoded bodies

// POST /api/login
router.post("/", async (req, res) => {
    const { email, password } = req.body;  // getting email and password from the request body

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Sign in with email and password in Supabase database
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }


        // Store the access_token in an HTTP-only cookie - not in use now
        /*
        res.cookie('access_token', data.session.access_token, {
            httpOnly: true,  // Não pode ser acessado por JavaScript
            secure: process.env.NODE_ENV === 'production',  // Definir como true em produção
            maxAge: 60 * 60 * 1000,  // Tempo de expiração (1 hora)
            sameSite: 'Strict',  // Política de mesmo site
        });
        */

        // Return the user data and access_token
        res.status(200).json({
            message: 'Login successful',
            access_token: data.session.access_token,
            user: data.user,
        });
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
