const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer"); // Importing the multer library


const router = express.Router();
const spacesFilePath = path.join(__dirname, "data.json");

// Check if the data.json file exists, if not, create it
if (!fs.existsSync(spacesFilePath)) {
    fs.writeFileSync(spacesFilePath, JSON.stringify([], null, 2));
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

// Getting the list of available spaces
router.get("/", (req, res) => {
    res.json(loadSpaces());
});



// Configuring multer for imagem storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../public/img_spaces");
        fs.mkdirSync(uploadPath, { recursive: true }); // Check if the folder exists, if not, create it
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const fileName = Date.now() + "-" + file.originalname;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage }); // Defining the upload variable


// Rote to insert a new space
// Inseting a new space on the list
router.post("/", upload.single("image"), (req, res) => {
    let spaces = loadSpaces();

    const newSpace = {
        id: spaces.length + 1, // Generate an automatic ID
        user_id: req.body.user_id,
        image: req.file ? "/img_spaces/" + req.file.filename : null, // Image path
        title: req.body.title,
        price: req.body.price,
        neighborhood: req.body.neighborhood,
        workspace_seats: req.body.workspace_seats,
        type: req.body.type,
        lease_time: req.body.lease_time,
        amenities: {
            kitchen: req.body.kitchen === "true",
            parking: req.body.parking === "true",
            public_transport: req.body.public_transport === "true",
            wifi: req.body.wifi === "true",
            printer: req.body.printer === "true"
        },
        available_from: req.body.available_from,
        rating: req.body.rating
    };

    spaces.push(newSpace);
    fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2));

    res.json({ success: true, message: "Space successfull inserted!", space: newSpace });
});

module.exports = router;
