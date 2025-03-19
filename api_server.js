const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// 🔹 Importando APIs corretamente
const usersRoutes = require("./api/users/user_register");
const spacesRoutes = require("./api/spaces/spaces");

// 🔹 Registrando APIs com prefixos diferentes
app.use("/api/users", usersRoutes);
app.use("/api/spaces", spacesRoutes);

// 🔹 Iniciando servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
