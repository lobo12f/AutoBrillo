import { crearPersona } from "../models/personaModel.js";

export async function registrarPersona(req, res) {
    try {
        const data = req.body;

        if (!data.nombre || !data.email) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        const resultado = await crearPersona(data);

        res.status(201).json({
            mensaje: "Persona registrada",
            id: resultado.insertedId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error del servidor" });
    }
}