
import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client (anon key, public reads only)
import multer from 'multer';  // Importing multer using ES Module
import dotenv from 'dotenv';
import { requireAuth, requireCsrf } from '../middleware/auth.js';

// Load environment variables from .env file
dotenv.config();

// Configuration for storing files in memory
const storage = multer.memoryStorage();
const upload  = multer({ storage: storage });
const router  = express.Router();

// Middleware to parse JSON bodies
router.use(express.json()); // added to parse JSON bodies - Middleware to parse URL-encoded bodies




// Get the workspace by the workspace_id - Return data from a specific workspace, only if the parameter id is not empty
// If you do not pass any parameters, it returns all workspaces data. Public route - workspaces are the site's catalog.
router.get("/", async (req, res) => {

    const { id } = req.query; // Get the ID from the query string (e.g., ?id=123)

    try {
        let query = supabase.from('workspaces').select('*');

        if (id) {
            query = query.eq('id', id);  // Get the workspace with the specified ID

        }else{
            query = query.eq('active', true);  // Get only active workspaces
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // When fetching a single space by id, also attach its owner's public display info
        // (full_name/avatar_url - profiles are public-readable, see schema.sql) - space_details.js
        // uses this to show "Owner: <name>" and to power the "Message the owner" button, without
        // needing a second request.
        if (id && data && data.length > 0) {
            const ownerIds = [...new Set(data.map(space => space.user_id))];
            const { data: owners, error: ownersError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', ownerIds);

            if (!ownersError) {
                data.forEach(space => {
                    space.owner = (owners || []).find(owner => owner.id === space.user_id) || null;
                });
            }
        }

        res.json(data);  // Return the data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }

});



// Route to receive the POST request filter by the fields received from the front-end. Public route.
router.post("/filter_spaces", async (req, res) => {
    // Destructure the filters from the request body
    const {
        location,
        check_in,
        check_out,
        team_size,
        price_min,
        price_max,
        amn_kitchen,
        amn_parking,
        amn_public_transport,
        amn_wifi,
        amn_printer,
        amn_air,
        amn_smoking,
        location_type,
        rating,
        sort
    } = req.body; // Receiving the filter parameters

    //console.log(req.body); // Debug JSON Payload

    try {
        // If the user searched by date range, find workspaces that already have a
        // conflicting reservation in that window, so they can be excluded below.
        // Two ranges overlap when: reservation.start_time <= check_out AND reservation.end_time >= check_in.
        // Uses the get_all_reservation_slots() RPC (security definer) instead of selecting from
        // "reservations" directly - that table's RLS now only allows a reservation's own renter
        // or the workspace's owner to read it, so an anonymous browsing visitor couldn't otherwise
        // see anything here. The RPC intentionally only exposes dates/hours, never renter identity.
        let workspaceIdsToExclude = [];
        if (check_in && check_out) {
            const { data: allSlots, error: reservationsError } = await supabase
                .rpc('get_all_reservation_slots');

            if (reservationsError) {
                return res.status(500).json({ error: 'Error checking existing reservations.' });
            }

            const conflicting = (allSlots || []).filter(r => r.start_time <= check_out && r.end_time >= check_in);
            workspaceIdsToExclude = [...new Set(conflicting.map(r => r.workspace_id))];
        }

        // Building the Supabase query based on the received parameters
        let query = supabase
            .from('workspaces')
            .select('*')
            .eq('active', true); // Active workspaces only

        // Filtering by address (partial match - e.g. typing "calgary" matches any address containing it)
        if (location) {
            query = query.ilike('address', `%${location}%`);
        }

        // Filtering by availability date (check-in / check-out)
        if (check_in && check_out) {
            // The space must already be available by the requested check-in date...
            query = query.lte('available_from', check_in);

            // ...and must not have any reservation overlapping the requested range.
            if (workspaceIdsToExclude.length > 0) {
                query = query.not('id', 'in', `(${workspaceIdsToExclude.join(',')})`);
            }
        }

        // Filtering by team size
        if (team_size) {
            const seatRequirement = team_size === "5" ? 5 : team_size; // For "5+" we treat it in a special way
            query = query.gte('seats', seatRequirement);  // Filter by number of seats (team size)
        }


        // Filtering by price range (price_min and price_max)
        if (price_min && price_max) {
            query = query
                .gte('price', price_min) // Filters by minimum price
                .lte('price', price_max); // Filters by maximum price
        }

        // Filtering by amenities (checkboxes for various amenities) ------------------------------------------------------------------
        if (amn_kitchen === true) {
            query = query.eq('amn_kitchen', amn_kitchen); // Filters if Kitchen is available
        }

        if (amn_parking === true) {
            query = query.eq('amn_parking', amn_parking); // Filters if Parking is available
        }

        if (amn_public_transport === true) {
            query = query.eq('amn_public_transport', amn_public_transport); // Filters if Public Transport is available
        }

        if (amn_wifi === true) {
            query = query.eq('amn_wifi', amn_wifi); // Filters if WiFi is available
        }

        if (amn_printer === true) {
            query = query.eq('amn_printer', amn_printer); // Filters if Printer is available
        }

        if (amn_air === true) {
            query = query.eq('amn_air', amn_air); // Filters if Air Conditioning is available
        }

        if (amn_smoking === true) {
            query = query.eq('amn_smoking', amn_smoking); // Filters if Smoking is allowed
        }

        // Filtering by lease time (location type, e.g., day, week, month)
        if (location_type && location_type!=='all') {
            query = query.eq('type', location_type); // Filters by lease time (e.g., day, week, month)
        }

        // Filtering by rating (star rating)
        if (rating) {
            query = query.gte('rating', rating); // Filters workspaces with rating greater than or equal to the provided rating
        }


        // console.log('query....:',query); // Debug QUERY

        // Apply sorting based on user's selection
        if (sort) {
            switch (sort) {
                case 'value_less':
                    query = query.order('price', { ascending: true });
                    break;
                case 'value_high':
                    query = query.order('price', { ascending: false });
                    break;
                case 'recently':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'rating':
                    query = query.order('rating', { ascending: false });
                    break;
                default:
                    query = query.order('created_at', { ascending: false }); // Fallback sort
            }
        }


        // Running the query on Supabase
        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Error fetching filtered workspaces.' });
        }

        res.json(data); // Returns the filtered data in JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
});




// Route to list every workspace managed by the logged-in owner. Identity comes from the verified
// session cookie (requireAuth), never from anything the client claims in the request body.
router.post("/owner_spaces", requireAuth, async (req, res) => {
    try {
        const { data, error } = await req.supabaseAuthed
            .from('workspaces')
            .select('*')
            .eq('user_id', req.userId);

        if (error) {
            return res.status(500).json({ error: 'Error to find data from this user.' });
        }

        res.json(data);  // Returns data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }

});



// Route to get all workspaces rented by the logged-in user, with workspace details.
router.post("/coworker_spaces", requireAuth, async (req, res) => {
    try {
        // First query: fetch this user's own reservations. Uses the JWT-scoped client because
        // reservations RLS now only allows reading rows where auth.uid() = user_id (or the
        // workspace is owned by the caller) - the anon client would see nothing here.
        const { data: reservations, error: reservationsError } = await req.supabaseAuthed
            .from('reservations')
            .select('*')
            .eq('user_id', req.userId);

        if (reservationsError) {
            return res.status(500).json({ error: 'Error fetching reservations for this user.' });
        }

        // Second query: fetch workspace details for those reservations (workspaces are public to read).
        const workspaceIds = reservations.map(reservation => reservation.workspace_id);
        const { data: workspaces, error: workspacesError } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds);

        if (workspacesError) {
            return res.status(500).json({ error: 'Error fetching workspaces.' });
        }

        // Combine the reservations data with the workspaces data
        const combinedData = reservations.map(reservation => {
            const workspace = workspaces.find(workspace => workspace.id === reservation.workspace_id);
            return { ...reservation, workspace };  // Combine data into one object
        });

        res.json(combinedData);  // Return the combined data from reservations and workspaces as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
});





// Route to insert workspaces for the owner. user_id always comes from the verified session -
// the request body can no longer claim to be inserting on behalf of someone else.
router.post("/insert", requireAuth, requireCsrf, async (req, res) => {
    const { title, details, price, address, neighborhood, seats, type, lease_time, open_hour, close_hour, latitude, longitude, available_from,
        amn_kitchen, amn_parking, amn_public_transport, amn_wifi, amn_printer, amn_air, amn_smoking, active} = req.body;
    const user_id = req.userId;

    // Check if all required fields are provided
    if (!title || !details || !price || !address || !neighborhood || !seats || !type || !lease_time || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // open_hour/close_hour only make sense for hourly-rate spaces
    if (lease_time === 'hour' && (open_hour === null || open_hour === undefined || close_hour === null || close_hour === undefined || open_hour >= close_hour)) {
        return res.status(400).json({ error: 'A valid opening/closing hour window is required for hourly spaces' });
    }

    try {

        // Prepare data to update the workspace
        const insertWorkspaceData = {
            user_id,
            title,
            details,
            price,
            address,
            neighborhood,
            seats,
            type,
            lease_time,
            open_hour: lease_time === 'hour' ? open_hour : null,
            close_hour: lease_time === 'hour' ? close_hour : null,
            latitude,
            longitude,
            available_from,
            amn_kitchen,
            amn_parking,
            amn_public_transport,
            amn_wifi,
            amn_printer,
            amn_air,
            amn_smoking,
            active
        };

        // Insert the workspace record in Supabase, using the caller's own JWT-scoped client so
        // RLS's "auth.uid() = user_id" check on the insert actually matches. (.select() so we
        // get the new row, including its id, back)
        const { data, error } = await req.supabaseAuthed
            .from('workspaces')
            .insert(insertWorkspaceData)
            .select()
            .single();

        if (error) {
            console.error('Error inserting workspace:', error);
            return res.status(500).json({ error: 'Failed to insert workspace' });
        }

        // Return success message with the newly created workspace (front-end needs data.id to upload images)
        return res.status(200).json({ success: true, insertWorkspaceData: data });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});


// Route to update the workspace by workspace_id. Ownership is enforced both here (an explicit
// check, for a clean 404 instead of an opaque RLS failure) and again at the database level by RLS.
router.post("/update", requireAuth, requireCsrf, async (req, res) => {
    const { space_id, title, details, price, address, neighborhood, seats, type, lease_time, open_hour, close_hour, latitude, longitude, available_from,
        amn_kitchen, amn_parking, amn_public_transport, amn_wifi, amn_printer, amn_air, amn_smoking, active} = req.body;
    const user_id = req.userId;

    // Check if all required fields are provided
    if (!space_id || !title || !details || !price || !address || !neighborhood || !seats || !type || !lease_time || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // open_hour/close_hour only make sense for hourly-rate spaces
    if (lease_time === 'hour' && (open_hour === null || open_hour === undefined || close_hour === null || close_hour === undefined || open_hour >= close_hour)) {
        return res.status(400).json({ error: 'A valid opening/closing hour window is required for hourly spaces' });
    }

    try {
        // Check if the workspace exists and belongs to the user
        const { data: workspace, error: workspaceError } = await req.supabaseAuthed
            .from('workspaces')
            .select('*')
            .eq('id', space_id)
            .eq('user_id', user_id)
            .single();

        if (workspaceError || !workspace) {
            return res.status(404).json({ error: 'Workspace not found or does not belong to the user' });
        }

        // Prepare data to update the workspace
        const updatedWorkspaceData = {
            title,
            details,
            price,
            address,
            neighborhood,
            seats,
            type,
            lease_time,
            open_hour: lease_time === 'hour' ? open_hour : null,
            close_hour: lease_time === 'hour' ? close_hour : null,
            latitude,
            longitude,
            available_from,
            amn_kitchen,
            amn_parking,
            amn_public_transport,
            amn_wifi,
            amn_printer,
            amn_air,
            amn_smoking,
            active
        };

        // Update the workspace record in Supabase
        const { data, error } = await req.supabaseAuthed
            .from('workspaces')
            .update(updatedWorkspaceData)
            .eq('id', space_id);

        if (error) {
            console.error('Error updating workspace:', error);
            return res.status(500).json({ error: 'Failed to update workspace' });
        }

        // Return success message with the updated data
        return res.status(200).json({ success: true, updatedWorkspace: data });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});



// Route to delete a workspace owned by the user
router.post("/delete", requireAuth, requireCsrf, async (req, res) => {
    const { space_id } = req.body;
    const user_id = req.userId;

    if (!space_id) {
        return res.status(400).json({ error: 'space_id is required' });
    }

    try {
        // Check if the workspace exists and belongs to the user
        const { data: workspace, error: workspaceError } = await req.supabaseAuthed
            .from('workspaces')
            .select('*')
            .eq('id', space_id)
            .eq('user_id', user_id)
            .single();

        if (workspaceError || !workspace) {
            return res.status(404).json({ error: 'Workspace not found or does not belong to the user' });
        }

        // Refuse to permanently delete a space that has ANY reservation history (past or future).
        // A hard delete cascades (ON DELETE CASCADE) to reservations, their reviews, and now also
        // messaging conversations for this space - which would silently wipe a renter's booking
        // history, delete reviews (a way to launder bad ratings), retroactively corrupt the
        // owner's own revenue report, and - worst case - erase an upcoming, already-paid
        // reservation with no cancellation or refund flow. Point the owner at deactivating
        // instead (active=false, see /set_active below): removes it from the public catalog,
        // keeps every bit of history intact, reversible.
        const { count: reservationCount, error: reservationCountError } = await req.supabaseAuthed
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', space_id);

        if (reservationCountError) {
            console.error('Error checking reservations before delete:', reservationCountError);
            return res.status(500).json({ error: 'Failed to check reservation history for this workspace' });
        }

        if (reservationCount > 0) {
            return res.status(409).json({
                error: 'This space has reservation history and can\'t be permanently deleted. Deactivate it instead to remove it from the public catalog while keeping its history.',
                hasReservations: true,
            });
        }

        // Delete the workspace record (only reached when there are zero reservations, so the
        // ON DELETE CASCADE below has nothing meaningful to touch beyond the empty relations)
        const { error } = await req.supabaseAuthed
            .from('workspaces')
            .delete()
            .eq('id', space_id);

        if (error) {
            console.error('Error deleting workspace:', error);
            return res.status(500).json({ error: 'Failed to delete workspace' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});



// Route to activate/deactivate a workspace owned by the user - the safe alternative to /delete
// when the space has reservation history (see the check above), and also the toggle used directly
// from the report table/card list (the icon next to delete) so an owner can turn a space back on
// later. Sets only the `active` column: true puts it back in the public catalog (GET "/" filters
// .eq('active', true) when no id is given), false removes it - either way, reservations, reviews
// and message conversations are untouched. Deliberately a narrow, single-field update (unlike
// /update, which requires the full listing form) so this can be called straight from the list or
// from the delete-blocked modal without needing to load the entire edit form first.
router.post("/set_active", requireAuth, requireCsrf, async (req, res) => {
    const { space_id, active } = req.body;
    const user_id = req.userId;

    if (!space_id) {
        return res.status(400).json({ error: 'space_id is required' });
    }

    if (typeof active !== 'boolean') {
        return res.status(400).json({ error: 'active (boolean) is required' });
    }

    try {
        const { data: workspace, error: workspaceError } = await req.supabaseAuthed
            .from('workspaces')
            .select('id')
            .eq('id', space_id)
            .eq('user_id', user_id)
            .single();

        if (workspaceError || !workspace) {
            return res.status(404).json({ error: 'Workspace not found or does not belong to the user' });
        }

        const { error } = await req.supabaseAuthed
            .from('workspaces')
            .update({ active })
            .eq('id', space_id);

        if (error) {
            console.error('Error updating workspace active status:', error);
            return res.status(500).json({ error: `Failed to ${active ? 'activate' : 'deactivate'} workspace` });
        }

        return res.status(200).json({ success: true, active });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});



// Route to upload images. Ownership of space_id is verified before touching storage or the DB -
// previously ANY logged-in user could overwrite images on ANY workspace by just guessing its id.
router.post("/upload_image", requireAuth, requireCsrf, upload.single("file"), async (req, res) => {

    try {
        const file = req.file;  // The uploaded file

        if (!file) {
            return res.status(400).json({ success: false, message: "File is required." });
        }

        // Extract the space_id and image_code from the request
        const { space_id, image_code } = req.body;
        if (!space_id || !image_code) {
            return res.status(400).json({ success: false, message: "Space ID and Image Code are required." });
        }

        // Make sure this workspace actually belongs to the logged-in user before accepting an upload for it.
        const { data: workspace, error: workspaceError } = await req.supabaseAuthed
            .from('workspaces')
            .select('id')
            .eq('id', space_id)
            .eq('user_id', req.userId)
            .single();

        if (workspaceError || !workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found or does not belong to you.' });
        }

        // Generate the image file name
        const imageName = `${space_id}_${image_code}.jpg`;

        // Upload the image to Supabase Storage
        const { data, error } = await req.supabaseAuthed
            .storage
            .from('workspaces')  // Supabase bucket name
            .upload(`spaces/${imageName}`, file.buffer, {
                contentType: file.mimetype,
                upsert: true,  // Replace the image if it already exists
            });

        if (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ success: false, message: `Failed to upload image ${image_code}` });
        }

        // Construct the public URL for the uploaded image. A cache-busting query param is
        // appended because the storage path is always the same for a given space_id/image_code
        // (upsert overwrites it) - without this, browsers/CDN keep serving the old cached image
        // after a re-upload since the URL itself never changes.
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/workspaces/spaces/${imageName}?v=${Date.now()}`;

        // Update the image field in the 'workspaces' table
        const updatedImageField = {};
        updatedImageField[image_code] = publicUrl;  // Update the corresponding field, e.g. image_01

        // Update the 'workspaces' table with the image URL
        const { data: workspaceData, error: workspaceUpdateError } = await req.supabaseAuthed
            .from('workspaces')
            .update(updatedImageField)
            .eq('id', space_id);

        if (workspaceUpdateError) {
            console.error('Error updating workspace:', workspaceUpdateError);
            return res.status(500).json({ success: false, message: 'Failed to update workspace image' });
        }

        // Return success response with updated image URL
        return res.status(200).json({
            success: true,
            message: 'Image uploaded and workspace updated successfully!',
            updatedWorkspace: workspaceData,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});



// Route to get occupied dates/hours for a specific space (or all spaces, if no id given), used to
// grey out already-booked slots on the public booking calendar. Public route - visitors don't need
// to be logged in to see when a space is free. Uses the get_all_reservation_slots() RPC instead of
// reading "reservations" directly, since that table's RLS no longer allows anonymous reads (it
// would otherwise expose who booked what to any visitor).
router.get("/reservations", async (req, res) => {
    const { id } = req.query; // Get the ID from the query string (e.g., ?id=123)
    try {
        const { data, error } = await supabase.rpc('get_all_reservation_slots');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const filtered = id ? (data || []).filter(r => String(r.workspace_id) === String(id)) : data;

        res.json(filtered);  // Return the data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
});





// Route for an owner to see the management report for one of their own workspaces:
// the workspace itself + every reservation made on it, with the renter's basic
// profile info (name, phone) attached to each reservation.
router.post("/owner_reservations", requireAuth, async (req, res) => {
    const { workspace_id } = req.body;
    const user_id = req.userId;

    if (!workspace_id) {
        return res.status(400).json({ error: 'workspace_id is required' });
    }

    try {
        // Make sure this workspace actually belongs to the requesting user before
        // returning any reservation/renter data for it.
        const { data: workspace, error: workspaceError } = await req.supabaseAuthed
            .from('workspaces')
            .select('*')
            .eq('id', workspace_id)
            .eq('user_id', user_id)
            .single();

        if (workspaceError || !workspace) {
            return res.status(404).json({ error: 'Workspace not found or does not belong to the user' });
        }

        // All reservations ever made on this workspace, most recent first. Uses the JWT-scoped
        // client - reservations RLS allows this because the caller owns the workspace.
        const { data: reservations, error: reservationsError } = await req.supabaseAuthed
            .from('reservations')
            .select('*')
            .eq('workspace_id', workspace_id)
            .order('start_time', { ascending: false });

        if (reservationsError) {
            return res.status(500).json({ error: 'Error fetching reservations for this workspace.' });
        }

        // Attach the renter's profile (name/phone) to each reservation.
        const renterIds = [...new Set((reservations || []).map(r => r.user_id))];
        let renters = [];

        if (renterIds.length > 0) {
            const { data: renterProfiles, error: renterError } = await req.supabaseAuthed
                .from('profiles')
                .select('id, full_name, phone, avatar_url')
                .in('id', renterIds);

            if (renterError) {
                return res.status(500).json({ error: 'Error fetching renter profiles.' });
            }

            renters = renterProfiles || [];
        }

        const reservationsWithRenter = (reservations || []).map(reservation => ({
            ...reservation,
            renter: renters.find(renter => renter.id === reservation.user_id) || null
        }));

        res.json({ workspace, reservations: reservationsWithRenter });

    } catch (error) {
        console.error('Error getting owner reservations:', error.message);
        res.status(500).json({ error: error.message });
    }
});



// Route to insert reservations for the workspace and the coworker. user_id always comes from the
// verified session, never the request body.
router.post("/reservations_insert", requireAuth, requireCsrf, async (req, res) => {
    const {
        workspace_id,
        start_time,
        end_time,
        lease_time,
        start_hour,
        end_hour,
        rent_price,
        rent_total,
        status,
        payment_status
    } = req.body;
    const user_id = req.userId;

    // Check if all required fields are provided
    if (!workspace_id || !start_time || !end_time || !lease_time || !rent_price || !rent_total) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (lease_time === 'hour' && (start_hour === undefined || start_hour === null || end_hour === undefined || end_hour === null || start_hour >= end_hour)) {
        return res.status(400).json({ error: 'A valid start/end hour is required for hourly reservations' });
    }

    try {
        // Make sure this reservation doesn't overlap an existing one for the same workspace,
        // regardless of the client's own occupied-dates/occupied-hours UI (belt and suspenders
        // against race conditions or someone hitting this endpoint directly). Uses the public
        // availability RPC since it needs to see every reservation on the workspace, not just
        // this user's own (which is all "reservations" RLS would otherwise allow them to read).
        const { data: allSlots, error: existingError } = await supabase.rpc('get_all_reservation_slots');

        if (existingError) {
            console.error('Error checking existing reservations:', existingError);
            return res.status(500).json({ error: 'Failed to validate reservation availability' });
        }

        const existingReservations = (allSlots || []).filter(r => String(r.workspace_id) === String(workspace_id));

        const hasConflict = existingReservations.some(existing => {
            if (lease_time === 'hour') {
                // Same-day overlap check on the hour range [start_hour, end_hour).
                return existing.start_time === start_time &&
                    start_hour < existing.end_hour &&
                    end_hour > existing.start_hour;
            }
            // Day-based overlap: two date ranges overlap when one starts before the other ends.
            return existing.start_time <= end_time && existing.end_time >= start_time;
        });

        if (hasConflict) {
            return res.status(409).json({ error: 'This workspace is already booked for the selected date/time.' });
        }

        // Prepare data to insert the reservation
        const insertreservation = {
            user_id,
            workspace_id,
            start_time,
            end_time,
            lease_time,
            start_hour: lease_time === 'hour' ? start_hour : null,
            end_hour: lease_time === 'hour' ? end_hour : null,
            rent_price,
            rent_total,
            status,
            payment_status
        };

        // Insert the reservation record in Supabase, using the caller's own JWT-scoped client so
        // RLS's "auth.uid() = user_id" check on the insert actually matches.
        const { data, error } = await req.supabaseAuthed
            .from('reservations')
            .insert(insertreservation);

        if (error) {
            console.error('Error inserting reservation:', error);
            return res.status(500).json({ error: 'Failed to insert reservation' });
        }

        // Return success message with the updated data
        return res.status(200).json({ success: true, insertreservation: data });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});



export default router;
