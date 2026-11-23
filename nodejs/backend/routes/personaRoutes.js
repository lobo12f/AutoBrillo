import express from "express";
import { registrarPersona } from "../controllers/personaController.js";
// Importamos la conexión desde tu archivo de configuración
import { conectarDB } from "../config/db.js"; 

import { ObjectId } from "mongodb"; // Necesario para manejar IDs de Mongo

// ... tus otras rutas (GET, POST)
const router = express.Router();

router.post("/personas", registrarPersona);

// Ruta para obtener todas las personas
router.get("/personas", async (req, res) => {
    try {
        // 1. Conectamos a la base de datos
        const db = await conectarDB(); 
        
        // 2. Traemos los datos de la colección
        const personas = await db.collection("personas").find().toArray();
        
        // 3. Enviamos la respuesta al frontend
        res.status(200).json(personas);
    } catch (error) {
        // Esto imprimirá el error real en tu terminal de Parrot para que lo veamos
        console.error("❌ Error en GET /personas:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener datos" });
    }
});

// Ruta para eliminar una persona
// Fíjate en el ":id" (los dos puntos son vitales)
router.delete("/personas/:id", async (req, res) => {
    try {
        const db = await conectarDB();
        const { id } = req.params; // Esto captura el ID de la URL

        const resultado = await db.collection("personas").deleteOne({
            _id: new ObjectId(id)
        });

        if (resultado.deletedCount === 1) {
            res.status(200).json({ mensaje: "Empleado eliminado" });
        } else {
            res.status(404).json({ mensaje: "No se encontró el registro" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error interno" });
    }
});

// Ruta para editar una persona
router.put("/personas/:id", async (req, res) => {
    try {
        const db = await conectarDB();
        const { id } = req.params;
        const datosActualizados = req.body; // Aquí vienen los nuevos datos (nombre, email, etc.)

        const resultado = await db.collection("personas").updateOne(
            { _id: new ObjectId(id) },
            { $set: datosActualizados }
        );

        if (resultado.modifiedCount === 1) {
            res.status(200).json({ mensaje: "Datos actualizados con éxito" });
        } else {
            res.status(404).json({ mensaje: "No se realizaron cambios o no se encontró el registro" });
        }
    } catch (error) {
        console.error("❌ Error al actualizar:", error);
        res.status(500).json({ error: "Error interno al actualizar" });
    }
});
export default router;