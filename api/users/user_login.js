import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
const router = express.Router();

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



// POST /api/logout
router.post("/logout", async (req, res) => {
    try {
        // Faz o logout do Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Erro ao tentar fazer logout no Supabase:', error);
            throw new Error(error.message); // Caso ocorra um erro no logout do Supabase
        }

        // Retorna uma resposta de sucesso para o cliente
        res.status(200).json({ message: "Logout realizado com sucesso!" });
    } catch (error) {
        // Exibe mensagem de erro caso algo dê errado
        console.error('Erro no logout do servidor:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao tentar sair. Tente novamente.' });
    }
});


// POST /api/session
router.post("/session", async (req, res) => {
    // Pega o user_id que foi enviado na requisição
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    // Agora você pode usar o user_id para fazer outras operações, por exemplo, consultar o banco de dados
    //console.log('User ID:', user_id);

    try {
        // Exemplo de operação usando user_id
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();

        if (error) {
            return res.status(500).json({ error: 'Erro ao buscar dados do perfil' });
        }

        res.status(200).json({ profile: data });  // Retorna os dados do perfil para o cliente
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Ocorreu um erro inesperado.' });
    }
});


export default router;
