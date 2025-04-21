
import express from 'express';
import { supabase } from '../../lib/supabase.js';  // Import the Supabase client
import multer from 'multer';  // Importing multer using ES Module
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration for storing files in memory
const storage = multer.memoryStorage(); 
const upload  = multer({ storage: storage });
const router  = express.Router();

// Middleware to parse JSON bodies
router.use(express.json()); // added to parse JSON bodies - Middleware to parse URL-encoded bodies

// Middleware to parse JSON bodies
router.use(express.json()); // added to parse JSON bodies - Middleware to parse URL-encoded bodies




// Get the workspace by the workspace_id - Return data from a specific workspace, only if the parameter id is not empty
// If you do not pass any parameters, it returns all workspaces data. 
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

        res.json(data);  // Return the data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }

});



// Route to receive the POST request filter by the fields received from the front-end
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
        // Construindo a consulta do Supabase com base nos parâmetros
        let query = supabase
            .from('workspaces')
            .select('*')
            .eq('active', true); // Apenas workspaces ativos

        // Filtrando por Neighborhood
        if (location) {
            query = query.ilike('neighborhood', `%${location}%`);  // Filter by neighborhood with LIKE (if you enter part of the name)
        }

        // Filtering by availability date (check-in / check-out)
        if (check_in && check_out) {
            query = query
                .gte('available_from', check_in) // Greater than or equal to check-in date
                .lte('available_from', check_out); // Less than or equal to checkout date
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






// Route to receive the POST request and process the user_id
// This route filter all workspaces managed by the user OWNER
router.post("/owner_spaces", async (req, res) => {
    //console.log(req.body); //Logging the request body for debugging
    const { user_id } = req.body; // Accessing user_id from the request body

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        // Supabase Query
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('user_id', user_id);
            //.single(); // Ensure that only one result is returned. However, if there is more than one result, an error is returned.

        if (error) {
            return res.status(500).json({ error: 'Error to find data from this user.' });
        }

        res.json(data);  // Returns data as JSON
    } catch (error) {
        console.error('Error getting the data:', error.message);
        res.status(500).json({ error: error.message });
    }
        
});



// Route to get all workspaces rented by the user and workspace details 
router.post("/coworker_spaces", async (req, res) => {  // Changed to POST
    const { user_id } = req.body; // Accessing user_id from the request body

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        // First query: Fetch data from reservations table
        const { data: reservations, error: reservationsError } = await supabase
            .from('reservations')
            .select('*')
            .eq('user_id', user_id);

        if (reservationsError) {
            return res.status(500).json({ error: 'Error fetching reservations for this user.' });
        }

        // Second query: Fetch data from workspaces table (using the workspace_id from reservations)
        const workspaceIds = reservations.map(reservation => reservation.workspace_id);
        const { data: workspaces, error: workspacesError } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds); // Get only active Workspaces  // Filter workspaces based on workspace_ids from reservations

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





// Route to insert workspaces for the owner
router.post("/insert", async (req, res) => {
    const { user_id, title, details, price, address, neighborhood, seats, type, lease_time, latitude, longitude, available_from,
        amn_kitchen, amn_parking, amn_public_transport, amn_wifi, amn_printer, amn_air, amn_smoking, active} = req.body;

    // Check if all required fields are provided
    if (!user_id || !title || !details || !price || !address || !neighborhood || !seats || !type || !lease_time || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
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
        const { data, error } = await supabase
            .from('workspaces')
            .insert(insertWorkspaceData);

        if (error) {
            console.error('Error inserting workspace:', error);
            return res.status(500).json({ error: 'Failed to insert workspace' });
        }

        // Return success message with the updated data
        return res.status(200).json({ success: true, insertWorkspaceData: data });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
});


// Route to update the workspace by workspace_id
router.post("/update", async (req, res) => {
    const { user_id, space_id, title, details, price, address, neighborhood, seats, type, lease_time, latitude, longitude, available_from,
        amn_kitchen, amn_parking, amn_public_transport, amn_wifi, amn_printer, amn_air, amn_smoking, active} = req.body;

    // Check if all required fields are provided
    if (!user_id || !space_id || !title || !details || !price || !address || !neighborhood || !seats || !type || !lease_time || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if the workspace exists
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', space_id)
            .eq('user_id', user_id)  // Ensure the workspace belongs to the user
            .single();  // Ensure only one result is returned

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
        const { data, error } = await supabase
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



// Route to upload images
router.post("/upload_image", upload.single("file"), async (req, res) => {

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

        // Generate the image file name
        const imageName = `${space_id}_${image_code}.jpg`;

        // Upload the image to Supabase Storage
        const { data, error } = await supabase
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

        // Construct the public URL for the uploaded image
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/workspaces/spaces/${imageName}`;

        // Update the image field in the 'workspaces' table
        const updatedImageField = {};
        updatedImageField[image_code] = publicUrl;  // Update the corresponding field, e.g. image_01

        // Update the 'workspaces' table with the image URL
        const { data: workspaceData, error: workspaceError } = await supabase
            .from('workspaces')
            .update(updatedImageField)
            .eq('id', space_id);  // Make sure the workspace is owned by the user

        if (workspaceError) {
            console.error('Error updating workspace:', workspaceError);
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



// Route to get occupied dates for a specific space
// This function return all reservations for the workspace
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






// Route to insert reservations for the workspace and the coworker
router.post("/reservations_insert", async (req, res) => {
    const { 
        user_id, 
        workspace_id, 
        start_time, 
        end_time, 
        lease_time, 
        rent_price, 
        rent_total,
        status,
        payment_status
    } = req.body;

    console.log(req);
    // Check if all required fields are provided
    if (!user_id || !workspace_id || !start_time || !end_time || !lease_time || !rent_price || !rent_total) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {

        // Prepare data to update the workspace
        const insertreservation = {
            user_id,
            workspace_id,
            start_time,
            end_time,
            lease_time,
            rent_price,
            rent_total,
            status,
            payment_status
        };

        // Update the workspace record in Supabase
        const { data, error } = await supabase
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
