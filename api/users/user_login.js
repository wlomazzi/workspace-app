
import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';  // Importing multer using ES Module
import {
    requireAuth,
    requireCsrf,
    generateCsrfToken,
    setSessionCookies,
    clearSessionCookies,
    parseCookies,
    ACCESS_TOKEN_COOKIE,
    CSRF_COOKIE
} from '../middleware/auth.js';

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

        // Session tokens are set as httpOnly cookies - the client-side JS never sees the raw
        // access token, which is what protects it from theft via XSS (the old approach stored it
        // in localStorage, which any injected script could read). A separate, readable CSRF
        // cookie is issued alongside it (see api/middleware/auth.js for why).
        const csrfToken = generateCsrfToken();
        const maxAgeMs = (data.session.expires_in || 3600) * 1000;

        setSessionCookies(res, {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            csrfToken,
            maxAgeMs
        });

        res.status(200).json({
            message: 'Login successful',
            csrfToken,
            user: { id: data.user.id, email: data.user.email },
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

    // If the Supabase project has email confirmation disabled, signUp() returns a session
    // immediately - in that case log the user straight in the same way /  (login) does.
    // Otherwise (the more common/secure setup) there's no session yet until they confirm by
    // email, so we just report success and let them log in normally afterwards.
    if (data.session) {
        const csrfToken = generateCsrfToken();
        const maxAgeMs = (data.session.expires_in || 3600) * 1000;

        setSessionCookies(res, {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            csrfToken,
            maxAgeMs
        });

        return res.status(201).json({
            message: 'User registered successfully',
            csrfToken,
            user: { id: data.user.id, email: data.user.email }
        });
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email to confirm your account before logging in.',
      user: { id: data.user.id, email: data.user.email }
    });
  });


// POST /api/logout
router.post("/logout", async (req, res) => {
    try {
        // Log out of Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error when trying to log out of Supabase:', error);
        }
    } catch (error) {
        console.error('Error logging out from server:', error);
    } finally {
        // Always clear the session cookies client-side, even if the Supabase call above failed -
        // there's no reason to leave the user "stuck" logged in on their own browser.
        clearSessionCookies(res);
        res.status(200).json({ message: "Logout successful!" });
    }
});


// POST /api/session - returns the logged-in user's profile. Identity comes from the verified
// session cookie (requireAuth), never from anything the client claims in the request body.
router.post("/session", requireAuth, async (req, res) => {
    try {
        const { data, error } = await req.supabaseAuthed
            .from('profiles')
            .select('*')
            .eq('id', req.userId)
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


// GET /api/whoami - lightweight check the frontend can call on every page load to find out
// whether the visitor is currently logged in (their JS can no longer just read a localStorage
// flag, since the session now lives in an httpOnly cookie it has no access to).
router.get("/whoami", async (req, res) => {
    const cookies = parseCookies(req);
    const accessToken = cookies[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
        return res.status(200).json({ loggedIn: false });
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
        return res.status(200).json({ loggedIn: false });
    }

    res.status(200).json({
        loggedIn: true,
        user: { id: data.user.id, email: data.user.email },
        csrfToken: cookies[CSRF_COOKIE] || null
    });
});




// POST /api/profile_update
router.post("/profile_update", requireAuth, requireCsrf, async (req, res) => {
    const { full_name, location, phone, is_owner, is_coworker } = req.body;
    const user_id = req.userId; // Always the verified session's user - never trusted from the body

    // Check if the required data was sent
    if (!full_name || !location || !phone || is_owner === undefined || is_coworker === undefined) {
        return res.status(400).json({ error: 'full_name, location, phone, is_owner and is_coworker are required' });
    }

    try {
        // Check if user exists
        const { data: userData, error: userError } = await req.supabaseAuthed
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();

        if (userError || !userData) {
            const { data, error } = await req.supabaseAuthed
                .from('profiles')
                .insert({
                    id: user_id,
                    full_name: full_name,
                    location: location,
                    phone: phone,
                    is_owner: is_owner,
                    is_coworker: is_coworker
                })
                .select();

            if (error) {
                console.error('Error updating profile:', error);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            res.status(200).json({ success: true, updatedProfile: data });
        }else{
            const { data, error } = await req.supabaseAuthed
                .from('profiles')
                .update({
                    full_name: full_name,
                    location: location,
                    phone: phone,
                    is_owner: is_owner,
                    is_coworker: is_coworker
                })
                .eq('id', user_id)
                .select();

            if (error) {
                console.error('Error updating profile:', error);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            res.status(200).json({ success: true, updatedProfile: data });
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});




// POST /api/change_password - change the logged-in user's password.
// Best practice: require the current password again (re-authentication) before allowing the
// change, so a stolen session cookie alone isn't enough to lock the real owner out.
router.post("/change_password", requireAuth, requireCsrf, async (req, res) => {
    const { current_password, new_password } = req.body;
    const email = req.userEmail; // From the verified session, not the request body

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required' });
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

        // Step 2: use that freshly-verified session to update the password.
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


// POST /api/forgot_password - sends a password reset email via Supabase Auth. Always responds
// with the same generic success message regardless of whether the email is actually registered,
// so this endpoint can't be used to enumerate which emails have accounts.
router.post("/forgot_password", async (req, res) => {
    const { email, redirectTo } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo || undefined
        });

        if (error) {
            // Log server-side for debugging, but still return the generic message to the client.
            console.error('Error sending password reset email:', error.message);
        }
    } catch (error) {
        console.error('Server error sending password reset email:', error);
    }

    res.status(200).json({
        message: 'If an account exists for that email, a password reset link has been sent.'
    });
});



// POST /api/profile_picture
router.post("/profile_picture", requireAuth, requireCsrf, upload.single("file"), async (req, res) => {
    try {
        const user_id = req.userId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "File is required." });
        }

        // Generate the file path in Supabase Storage
        const filePath = `avatars/${user_id}.jpg`;

        // Upload the file to Supabase Storage, using the caller's own JWT-scoped client so this
        // is subject to the same RLS/storage policies as any other authenticated write.
        const { data, error } = await req.supabaseAuthed
            .storage
            .from('workspaces')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        // Cache-busting query param: the storage path is always the same for a given user_id
        // (upsert overwrites it), so without this the browser/CDN would keep showing the old
        // cached photo after re-uploading a new one.
        const avatarUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/workspaces/${filePath}?v=${Date.now()}`;

        // Update profile picture in the 'profiles' table
        const { data: dtProfile, error: errProfile } = await req.supabaseAuthed
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user_id)
            .select();

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
