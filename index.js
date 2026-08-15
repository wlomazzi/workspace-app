import dotenv from 'dotenv';
dotenv.config();  // Load environment variables from the .env file


// Importing the API routers
import workspacesRouter from './api/spaces/workspaces.js';  // Importing the workspaces router
import loginRouter from './api/users/user_login.js';  // Importing the login router
import reviewsRouter from './api/reviews/reviews.js';  // Importing the reviews router
import messagesRouter from './api/messages/messages.js';  // Importing the messages router


import express from 'express';
import path from 'path';  // Importing the path module to handle file paths
import { fileURLToPath } from 'url'; // Convert url to path
import { supabase } from './lib/supabase.js';  // Importing the Supabase client

const app = express();
const port = process.env.PORT || 3000;  //Define the port to listen on, defaulting to 3000 if not specified in the environment variables

// Using import.meta.url to get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Define the public folder to serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Mounting the routes from workspaces.js at the path '/api/spaces/workspaces'
app.use('/api/spaces/workspaces', workspacesRouter);
app.use('/api/users/user_login', loginRouter);  // Mounting the routes from login.js at the path '/api/users/login'
app.use('/api/reviews', reviewsRouter);  // Mounting the routes from reviews.js at the path '/api/reviews'
app.use('/api/messages', messagesRouter);  // Mounting the routes from messages.js at the path '/api/messages'
//app.use('/api/users/user_login/logout', loginRouter);  // Mounting the routes from login.js at the path '/api/users/login/logout'
//app.use('/api/users/user_login/session', loginRouter);  // Mounting the routes from login.js at the path '/api/users/login/logout'


// Rout to serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));  // Serve the index.html file from the public folder
});

// Public, non-secret config the frontend needs to talk to Supabase directly for the one flow
// that requires it (completing a password reset - see reset_password.js). SUPABASE_KEY here is
// the anon/publishable key, which is meant to be public (it's already embedded in every image
// URL the app serves) - this is not the service_role key and never will be.
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_KEY
  });
});

// Start the server on the defined port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
