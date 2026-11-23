import express from "express";
import cors from "cors";
import personaRoutes from "./backend/routes/personaRoutes.js";
import servicioRoutes from "./backend/routes/servicioRoutes.js"; // Importa arriba
import ordenRoutes from "./backend/routes/ordenRoutes.js"; // Importa arriba


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", personaRoutes);

// ...
app.use("/api", ordenRoutes);

// ... debajo de app.use("/api", personaRoutes);
app.use("/api", servicioRoutes);

app.listen(3000, () => {
    console.log("🚀 Servidor en http://localhost:3000");
});

















/*const { MongoClient } = require('mongodb');

// Tu URL está perfecta, la dejamos igual
const url = "mongodb://angel:1234@127.0.0.1:27017/AutoBrillo?authSource=admin";
exports.url = url;
const client = new MongoClient(url);

async function connectDB() {
    try {
        // Intentamos conectar
        await client.connect();
        console.log("✅ ¡Conexión exitosa a MongoDB desde Node.js!");

        // Seleccionamos la base de datos
        const db = client.db("AutoBrillo");
        
        // Prueba: Listar colecciones
        const collections = await db.listCollections().toArray();
        console.log("Colecciones disponibles:", collections.map(c => c.name));

    } catch (error) {
        console.error("❌ Error conectando a la base de datos:", error);
    } finally {
        // Cerramos la conexión al terminar la prueba
        await client.close();
    }
}

connectDB();
*/