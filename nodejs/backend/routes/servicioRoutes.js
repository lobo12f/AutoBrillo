import express from "express";
import { conectarDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Registrar un nuevo servicio (Ej: Lavado Full, Pulido de Vidrios)
router.post("/servicios", async (req, res) => {
    try {
        const db = await conectarDB();
        const { nombre, descripcion, precio, tiempoEstimado } = req.body;

        const nuevoServicio = {
            nombre,
            descripcion,
            precio: parseFloat(precio), // Aseguramos que sea número
            tiempoEstimado, // Ej: "2 horas"
            fechaCreacion: new Date()
        };

        const resultado = await db.collection("servicios").insertOne(nuevoServicio);
        res.status(201).json({ mensaje: "Servicio agregado", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ error: "Error al guardar el servicio" });
    }
});

// Obtener todos los servicios para listarlos
router.get("/servicios", async (req, res) => {
    try {
        const db = await conectarDB();
        const servicios = await db.collection("servicios").find().toArray();
        res.status(200).json(servicios);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener servicios" });
    }
});

// ELIMINAR SERVICIO
router.delete("/servicios/:id", async (req, res) => {
    try {
        const db = await conectarDB();
        const { id } = req.params;
        const resultado = await db.collection("servicios").deleteOne({ _id: new ObjectId(id) });

        if (resultado.deletedCount === 1) {
            res.status(200).json({ mensaje: "Servicio eliminado del catálogo" });
        } else {
            res.status(404).json({ error: "Servicio no encontrado" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error interno al eliminar" });
    }
});

// EDITAR SERVICIO
router.put("/servicios/:id", async (req, res) => {
    try {
        const db = await conectarDB();
        const { id } = req.params;
        const datosNuevos = req.body;

        const resultado = await db.collection("servicios").updateOne(
            { _id: new ObjectId(id) },
            { $set: datosNuevos }
        );

        if (resultado.matchedCount === 1) {
            res.status(200).json({ mensaje: "Servicio actualizado con éxito" });
        } else {
            res.status(404).json({ error: "No se encontró el servicio" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar" });
    }
});

export default router;