const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const usersFilePath = path.join(__dirname, "../../data/users.json");

const multer = require("multer"); // Importing multer to handle file uploads


// Check if the users.json file exists, if not, create it
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2));
}

// Function to load the list of users
const loadUsers = () => {
    try {
        const data = fs.readFileSync(usersFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};


// Function to register a new user
router.post("/register", (req, res) => {
    const { user_login, user_password } = req.body;

    if (!user_login || !user_password) {
        return res.status(400).json({ message: "Fill in all fields!" });
    }

    let users = loadUsers();
    if (users.find(user => user.user_login === user_login)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    users.push({ user_login, user_password });
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    res.json({ success: true, message: "User registered successfully!" });
});

// Getting the list of all registered users
router.get("/", (req, res) => {
    res.json(loadUsers());
});




// Function to handle user login
router.post("/login", (req, res) => {
    const { user_login, user_password } = req.body;

    if (!user_login || !user_password) {
        return res.status(400).json({ success: false, message: "Fill all the fields!" });
    }

    const users = loadUsers();
    const user = users.find(u => u.user_login === user_login && u.user_password === user_password);

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or password!" });
    }

    // Remove password before returning
    const { user_password: _, ...userWithoutPassword } = user;

    res.json({
        success: true,
        message: "Login Successful!",
        user: userWithoutPassword
    });
});



// Route to update user profile information
router.put("/update", (req, res) => {
    const { user_id, firstName, lastName, email, location, profilePic } = req.body;

    // Validate if all required fields are provided
    if (!user_id || !firstName || !lastName || !email || !location) {
        return res.status(400).json({ message: "Fill in all fields!" });
    }

    let users = loadUsers();  // Load the current list of users

    // Find the user in the list
    const userIndex = users.findIndex(user => user.user_id === user_id);

    if (userIndex === -1) {
        // If user is not found, return a 404 error
        return res.status(404).json({ message: "User not found!" });
    }

    // Update the user data
    users[userIndex] = { 
        ...users[userIndex],
        firstName,
        lastName,
        email,
        location,
        profilePic: profilePic || users[userIndex].profilePic // Profile picture update if provided
    };

    // Save the updated user list back to the JSON file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    // Respond with success message
    res.json({ success: true, message: "User profile updated successfully!" });
});



// Configuring multer for image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../public/img_profile");
        fs.mkdirSync(uploadPath, { recursive: true }); // Check if the folder exists, if not, create it
        cb(null, uploadPath);
    },
    
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Keep the original file extension (.jpg, .png, etc.)
        
        // Get the user_id from the request body
        const user_id = req.body.user_id;  // Get user_id from req.body
        
        if (!user_id) {
            return cb(new Error("User ID is missing!"));
        }

        // Set the file name as user_<user_id>.jpg
        const fileName = `user_${user_id}${ext}`;  // Use the user_id from req.body
        cb(null, fileName);
    }

});

const upload = multer({ storage: storage }); // Defining the upload variable

router.post("/update/profile_picture", upload.single("image"), (req, res) => {
    console.log("Received Form Data:", req.body); // Debugging: Log full form data

    const { user_id } = req.body;  // Extract user_id from the request body

    // Check if user_id or image is missing
    if (!user_id || !req.file) {
        return res.status(400).json({ message: "User ID or image file is missing!" });
    }

    let users = loadUsers();  // Load the users from the users.json file

    // Find the index of the user in the array
    const userIndex = users.findIndex(u => u.user_id === user_id);

    if (userIndex === -1) {
        // If the user is not found, return a 404 error
        return res.status(404).json({ message: "User not found!" });
    }

    // Update the user's profilePic field with the new image path
    const ext = path.extname(req.file.originalname); // Keep the original file extension (.jpg, .png, etc.)
    users[userIndex].profilePic = `/public/img_profile/user_${user_id}${ext}`;

    // Save the updated users array back to the users.json file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    res.json({ success: true, message: "Profile picture updated successfully!" });
});




module.exports = router;