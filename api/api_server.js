const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");

const PORT = process.env.PORT || 3000;  // Alterei para usar a variável de ambiente do Vercel

// Middleware
app.use(express.json()); // Allows JSON body parsing
app.use(cors());         // Enables CORS for all requests

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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
