const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");

const PORT = 3000;

// Middleware
app.use(express.json()); // Allows JSON body parsing
app.use(cors());         // Enables CORS for all requests

// Importing API route handlers
const usersRoutes = require("./api/users/users");
const spacesRoutes = require("./api/spaces/spaces");
const spacesRentedRoutes = require("./api/spaces/spaces_rented"); // ✅ NEW route added here

// Registering API endpoints
app.use("/api/users", usersRoutes);
app.use("/api/spaces", spacesRoutes);
app.use("/api/spaces_rented", spacesRentedRoutes); // ✅ New route registration

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
