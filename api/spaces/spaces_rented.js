const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Path to the spaces_rented.json file
const dataFilePath = path.join(__dirname, "../../data/spaces_rented.json");

// GET /api/spaces_rented → Return all rented spaces
router.get("/", (req, res) => {
    fs.readFile(dataFilePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading rented spaces file:", err);
            return res.status(500).json({ error: "Failed to read rented spaces data." });
        }

        try {
            const spaces = JSON.parse(data);
            res.json(spaces);
        } catch (parseError) {
            console.error("Error parsing rented spaces JSON:", parseError);
            res.status(500).json({ error: "Invalid JSON format in rented spaces file." });
        }
    });
});

module.exports = router;
