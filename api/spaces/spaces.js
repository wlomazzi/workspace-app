const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer"); // Importing multer to handle file uploads
const router = express.Router();
const spacesFilePath = path.join(__dirname, "../../data/data.json");
const occupiedDatesFilePath = path.join(__dirname, "../../data/spaces_occupied_dates.json");


// Check if the data.json file exists, if not, create it
if (!fs.existsSync(spacesFilePath)) {
    fs.writeFileSync(spacesFilePath, JSON.stringify([], null, 2));
}
// Check if the spaces_occupied_dates.json file exists, if not, create it
if (!fs.existsSync(occupiedDatesFilePath)) {
    fs.writeFileSync(occupiedDatesFilePath, JSON.stringify([], null, 2));
}

// Function to load the list of spaces
const loadSpaces = () => {
    try {
        const data = fs.readFileSync(spacesFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Function to load occupied dates from the spaces_occupied_dates.json file
const loadOccupiedDates = () => {
    try {
        const data = fs.readFileSync(occupiedDatesFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};




// Getting the list of available spaces
router.get("/", (req, res) => {
    res.json(loadSpaces());
});



// Configuring multer for image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../public/img_spaces");
        fs.mkdirSync(uploadPath, { recursive: true }); // Check if the folder exists, if not, create it
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const randomName = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname); // Get the file extension (.jpg, .png, etc.)
        const fileName = `space_${randomName}${ext}`;
        cb(null, fileName); // Set the file name with space ID and sequence number
    }
});

const upload = multer({ storage: storage }); // Defining the upload variable



// Rote to INSERT or UPDATE a new space ***********************************************************************************************************
// Rote to INSERT or UPDATE a new space
// Rote to handle space creation and update
router.post("/", upload.array("images", 4), (req, res) => {
    let spaces = loadSpaces(); // Load all spaces
    const spaceId = req.body.id; // Get the space id from the form data (optional)

    fileCount = 0;

    if (spaceId) {
        // If spaceId exists, we are updating an existing space
        const spaceIndex = spaces.findIndex(space => space.id == spaceId);
        if (spaceIndex === -1) {
            return res.status(404).json({ message: "Space not found!" });
        }

        // Update space with new data
        const updatedSpace = {
            ...spaces[spaceIndex],
            title: req.body.title,
            details: req.body.details,
            price: req.body.price,
            address: req.body.address,
            neighborhood: req.body.neighborhood,
            workspace_seats: req.body.workspace_seats,
            type: req.body.type,
            lease_time: req.body.lease_time,
            amenities: {
                kitchen: req.body.kitchen === "true",
                parking: req.body.parking === "true",
                public_transport: req.body.public_transport === "true",
                wifi: req.body.wifi === "true",
                printer: req.body.printer === "true",
                air_conditioning: req.body.air_conditioning === "true"
            },
            available_from: req.body.available_from,
            rating: spaces[spaceIndex].rating, // Keep the old rating
            image: req.files && req.files.length > 0 ? "/img_spaces/" + req.files[0].filename : spaces[spaceIndex].image,
            images: req.files && req.files.length > 0 ? req.files.map(file => "/img_spaces/" + file.filename) : spaces[spaceIndex].images,
            latitude: req.body.latitude,
            longitude: req.body.longitude
        };

        spaces[spaceIndex] = updatedSpace; // Update the space in the array
        fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2)); // Save updated spaces to file

        return res.json({ success: true, message: "Space updated!", space: updatedSpace });
    } else {
        // If spaceId does not exist, we are creating a new space
        const newSpace = {
            id: spaces.length + 1, // Generate an automatic ID for the new space
            user_id: req.body.user_id,
            title: req.body.title,
            details: req.body.details,
            price: req.body.price,
            address: req.body.address,
            neighborhood: req.body.neighborhood,
            workspace_seats: req.body.workspace_seats,
            type: req.body.type,
            lease_time: req.body.lease_time,
            amenities: {
                kitchen: req.body.kitchen === "true",
                parking: req.body.parking === "true",
                public_transport: req.body.public_transport === "true",
                wifi: req.body.wifi === "true",
                printer: req.body.printer === "true",
                air_conditioning: req.body.air_conditioning === "true"
            },
            available_from: req.body.available_from,
            rating: 0, // New spaces have no rating yet
            image: req.files && req.files.length > 0 ? "/img_spaces/" + req.files[0].filename : "/img_spaces/workplace1.jpg", // Default image if no file uploaded
            images: req.files && req.files.length > 0 ? req.files.map(file => "/img_spaces/" + file.filename) : ["/img_spaces/workplace1.jpg", "/img_spaces/workplace1.jpg"],
            latitude: req.body.latitude,
            longitude: req.body.longitude
        };

        spaces.push(newSpace); // Add new space to the array
        fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2)); // Save updated spaces to file

        return res.json({ success: true, message: "Space inserted!", space: newSpace });
    }
});


// Route to get occupied dates for a specific space
router.get("/occupied-dates", (req, res) => {
    const spaceId = req.query.space_id;  // Get the space_id from query parameters

    if (!spaceId) {
        return res.status(400).json({ message: "Space ID is required!" });
    }

    const occupiedDates = loadOccupiedDates();
    const space = occupiedDates.find(space => space.space_id === spaceId);

    if (!space) {
        return res.status(404).json({ message: "Space not found!" });
    }

    res.json({ occupied_dates: space.dates });
});




// Route to update occupied dates for a specific space
router.post("/update-occupied-dates", (req, res) => {
    const { space_id, dates } = req.body;

    if (!space_id || !Array.isArray(dates)) {
        return res.status(400).json({ message: "Space ID and dates are required!" });
    }

    let occupiedDates = loadOccupiedDates(); // Load existing occupied dates

    // Find the existing space by space_id
    const existingSpace = occupiedDates.find(space => space.space_id === space_id);

    if (existingSpace) {
        // If the space already exists, merge the existing dates with the new ones
        existingSpace.dates = [...new Set([...existingSpace.dates, ...dates])]; // Merge and remove duplicates
    } else {
        // If the space does not exist, add the new space with the given dates
        occupiedDates.push({ space_id, dates });
    }

    // Save the updated occupied dates back to the file
    fs.writeFileSync(occupiedDatesFilePath, JSON.stringify(occupiedDates, null, 2));

    res.json({ success: true, message: "Occupied dates updated successfully!" });
});




module.exports = router;