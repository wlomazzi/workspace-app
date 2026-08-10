import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';  // Importing multer using ES Module
import jwt from 'jsonwebtoken';

// Configuration for storing files in memory
const storage = multer.memoryStorage(); 
const upload  = multer({ storage: storage });
const router  = express.Router();

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


// POST /api/register
router.post('/register', async (req, res) => {
    const { email, password, full_name } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
  
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || null
        }
      }
    });
  
    if (error) {
      return res.status(400).json({ error: error.message });
    }
  
    res.status(201).json({
      message: 'User registered successfully',
      access_token: data.session?.access_token || null,
      user: data.user
    });
  });


// POST /api/logout
router.post("/logout", async (req, res) => {
    try {
        // Log out of Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error when trying to log out of Supabase:', error);
            throw new Error(error.message); // If an error occurs when logging out of Supabase
        }

        // Returns a success response to the client
        res.status(200).json({ message: "Logout successful!" });
    } catch (error) {
        // Exibe mensagem de erro caso algo dê errado
        console.error('Error logging out from server:', error);
        res.status(500).json({ error: 'An error occurred while trying to log out. Please try again.' });
    }
});


// POST /api/session
router.post("/session", async (req, res) => {
    // Get the user_id that was sent in the request
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    // Here we can use user_id to do other operations, for example, query the database
    //console.log('User ID:', user_id);

    try {
        // Example of operation using user_id
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();

        if (error) {
            return res.status(500).json({ error: 'Error fetching profile data' });
        }

        res.status(200).json({ profile: data });  // Returns profile data to the client
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'An unexpected error has occurred.' });
    }
});






// POST /api/profile_update
router.post("/profile_update", async (req, res) => {
    const { user_id, full_name, location, phone, is_owner, is_coworker } = req.body;

    // Check if the required data was sent
    if (!user_id || !full_name || !location || !phone || is_owner === undefined || is_coworker === undefined) {
        return res.status(400).json({ error: 'user_id, full_name, location, phone, is_owner and is_coworker are required' });
    }

    try {
        console.log(`Checking if user ${user_id} exists...`);

        // Check if user exists
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();  // Using .single() to ensure only 1 result is returned

        if (userError || !userData) {
            //console.error('User not found or error:', userError);
            //return res.status(404).json({ error: 'User not found' });
            // Update profile data in the 'profiles' table
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: user_id,
                    full_name: full_name,
                    location: location,
                    phone: phone,
                    is_owner: is_owner,  // Update is_owner
                    is_coworker: is_coworker  // Always true for is_coworker
                })
                .eq('id', user_id) // Where the user_id is the same as the one sent in the request
                .select();  // This forces Supabase to return the updated data

            //console.log('Supabase update response:', data);  // Supabase response log
            //console.log('Supabase update error:', error); // Supabase error log

            if (error) {
                console.error('Error updating profile:', error);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            // If the data was updated, return the response with success
            res.status(200).json({ success: true, updatedProfile: data });
        }else{
            // console.log('User found:', userData); // debug
            // Update profile data in the 'profiles' table
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    full_name: full_name,
                    location: location,
                    phone: phone,
                    is_owner: is_owner,  // Update is_owner
                    is_coworker: is_coworker  // Always true for is_coworker
                })
                .eq('id', user_id) // Where the user_id is the same as the one sent in the request
                .select();  // This forces Supabase to return the updated data

            //console.log('Supabase update response:', data);  // Supabase response log
            //console.log('Supabase update error:', error); // Supabase error log

            if (error) {
                console.error('Error updating profile:', error);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            // If the data was updated, return the response with success
            res.status(200).json({ success: true, updatedProfile: data });
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});




// Route to change the logged-in user's password.
// Best practice: require the current password again (re-authentication) before allowing the
// change, so an unattended/stolen session token alone isn't enough to lock the real owner out.
router.post("/change_password", async (req, res) => {
    const { email, current_password, new_password } = req.body;

    if (!email || !current_password || !new_password) {
        return res.status(400).json({ error: 'Email, current password and new password are required' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: 'The new password must be at least 6 characters long' });
    }

    if (new_password === current_password) {
        return res.status(400).json({ error: 'The new password must be different from the current password' });
    }

    try {
        // Step 1: confirm the current password is actually correct by performing a real sign-in.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: current_password,
        });

        if (signInError || !signInData?.session) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Step 2: use that freshly-verified session to update the password. A short-lived client
        // scoped to the user's own session is used here - not the service_role key - so this only
        // ever has permission to modify the account that was just re-authenticated.
        // Note: auth.updateUser() relies on the client's internal session state, not just the
        // Authorization header, so the session has to be set explicitly via setSession().
        const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const { error: setSessionError } = await userClient.auth.setSession({
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
        });

        if (setSessionError) {
            console.error('Error setting session for password update:', setSessionError);
            return res.status(500).json({ error: 'Could not verify your session. Please try again.' });
        }

        const { error: updateError } = await userClient.auth.updateUser({ password: new_password });

        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Server error changing password:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});



// Route to upload profile image
router.post("/profile_picture", upload.single("file"), async (req, res) => {
    const authToken    = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>'
    if (!authToken) {
        return res.status(401).json({ success: false, message: 'Authentication token is required.' });
    }

    try {

        //console.log('authToken:',authToken);
        // Verify JWT token using Supabase (no need to use jsonwebtoken directly)
        //const { data: userData, error: authError } = await supabase.auth.api.getUser(authToken);
        const { data: userData, error: authError } = await supabase.auth.getUser(authToken);

        if (authError || !userData) {
            console.error('Error verifying token:', authError);
            return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        }

        console.log('userData:',userData);
        const user_id      = userData.user.id;  // Get the user_id from the decoded token
        const file         = req.file;

        //console.log('user_id:',user_id);
        //console.log('file:',file);

        if (!file) {
            return res.status(400).json({ success: false, message: "File is required." });
        }

        // Generate the file path in Supabase Storage
        const filePath = `avatars/${user_id}.jpg`;

        // Upload the file to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('workspaces')  // Make sure you have the correct bucket in Supabase
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true,  // Replace the file if it already exists
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        // Build the public URL from the current project's SUPABASE_URL (filePath already includes 'avatars/')
        // Cache-busting query param: the storage path is always the same for a given user_id
        // (upsert overwrites it), so without this the browser/CDN would keep showing the old
        // cached photo after re-uploading a new one.
        const avatarUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/workspaces/${filePath}?v=${Date.now()}`;

        // Update profile picture in the 'profiles' table
        const { data: dtProfile, error: errProfile } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user_id) // Where the user_id is the same as the one sent in the request
            .select();  // This forces Supabase to return the updated data

        if (errProfile) {
            console.error('Error updating profile avatar_url:', errProfile);
            return res.status(500).json({ success: false, message: errProfile.message });
        }

        return res.json({ success: true, avatar_url: avatarUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});



export default router;
