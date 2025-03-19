const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const usersFilePath = path.join(__dirname, "users.json");

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
    const { user_id, user_password } = req.body;

    if (!user_id || !user_password) {
        return res.status(400).json({ message: "Fill in all fields!" });
    }

    let users = loadUsers();
    if (users.find(user => user.user_id === user_id)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    users.push({ user_id, user_password });
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    res.json({ success: true, message: "User registered successfully!" });
});

// Getting the list of all registered users
router.get("/", (req, res) => {
    res.json(loadUsers());
});

module.exports = router;


// Add rote to login in `user_register.js` file
router.post("/login", (req, res) => {
    const { user_id, user_password } = req.body;

    if (!user_id || !user_password) {
        return res.status(400).json({ success: false, message: "Fill all the fields!" });
    }

    let users = loadUsers();
    const user = users.find(u => u.user_id === user_id && u.user_password === user_password);

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or password!" });
    }

    res.json({ success: true, message: "Login Successful!" });
});
