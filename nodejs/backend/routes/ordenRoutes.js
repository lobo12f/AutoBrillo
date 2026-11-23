import express from "express";
import { conectarDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Crear una nueva Orden de Trabajo
router.post("/ordenes", async (req, res) => {
    try {
        const db = await conectarDB();
        const { clienteId, servicios, total, estado } = req.body;

        const nuevaOrden = {
            clienteId: new ObjectId(clienteId),
            servicios: servicios, // Array de servicios seleccionados
            total: parseFloat(total),
            estado: estado || "Pendiente", // Pendiente, En Proceso, Terminado
            fecha: new Date()
        };

        const resultado = await db.collection("ordenes").insertOne(nuevaOrden);
        res.status(201).json({ mensaje: "Orden creada con éxito", id: resultado.insertedId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la orden" });
    }
});

// Obtener todas las órdenes
router.get("/ordenes", async (req, res) => {
    try {
        const db = await conectarDB();
        // Usamos aggregate para traer el nombre del cliente desde la colección personas
        const ordenes = await db.collection("ordenes").aggregate([
            {
                $lookup: {
                    from: "personas",
                    localField: "clienteId",
                    foreignField: "_id",
                    as: "clienteInfo"
                }
            }
        ]).toArray();
        res.status(200).json(ordenes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener órdenes" });
    }
});

router.get("/dashboard/resumen", async (req, res) => {
    try {
        const db = await conectarDB();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Inicio del día

        // 1. Contar citas de hoy
        const totalCitas = await db.collection("citas").countDocuments({
            fechaCita: { $gte: hoy }
        });

        // 2. Contar vehículos en taller (Estado: "En Proceso")
        const enTaller = await db.collection("ordenes").countDocuments({
            estado: "En Proceso"
        });

        // 3. Sumar ingresos del día (Solo órdenes terminadas hoy)
        const ingresos = await db.collection("ordenes").aggregate([
            { $match: { estado: "Terminado", fecha: { $gte: hoy } } },
            { $group: { _id: null, total: { $sum: "$total" } } }
        ]).toArray();

        res.status(200).json({
            citas: totalCitas,
            taller: enTaller,
            ingresos: ingresos[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: "Error en el resumen" });
    }
});

export default router;