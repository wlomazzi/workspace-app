const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Importing the APIs
const usersRoutes = require("./api/users/user_register");
const spacesRoutes = require("./api/spaces/spaces");

// Registering the APIs with different routes
app.use("/api/users", usersRoutes);
app.use("/api/spaces", spacesRoutes);

// Starting the server
app.listen(PORT, () => {
    console.log(`🚀 Server running in http://localhost:${PORT}`);
});
