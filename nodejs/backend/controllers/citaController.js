import Cita from '../models/Cita.js';
import Usuario from '../models/personaModel.js';

export const crearCita = async (req, res) => {
    try {
        const { usuarioId, datosCita } = req.body;

        if (!usuarioId || !datosCita) {
            return res.status(400).json({ mensaje: "Faltan datos (ID o Cita)" });
        }

        const { fecha, hora, metodoPago, montoPagado } = datosCita;

        // 🔎 Buscar usuario
        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        // 💰 Lógica de Pago (Backend-Side)
        if (metodoPago === "SALDO") {
            if (usuario.saldo < montoPagado) {
                return res.status(400).json({ mensaje: "Saldo insuficiente en cuenta" });
            }
            usuario.saldo -= montoPagado;
        } 
        // Si usas cupos de plan, aquí podrías restar usuario.serviciosDisponibles -= 1;

        // 📅 Validar disponibilidad
        const existeCita = await Cita.findOne({ fecha, hora });
        if (existeCita) {
            return res.status(400).json({ mensaje: "Este horario ya está reservado" });
        }

        // 🧾 1. Crear la cita en la colección 'Citas'
        const nuevaCita = new Cita({
            usuarioId,
            ...datosCita
        });
        const citaGuardada = await nuevaCita.save();

        // 🔗 2. VINCULAR AL USUARIO (Paso vital)
        // Agregamos el objeto de la cita al array 'misCitas' del usuario
        usuario.misCitas.push(citaGuardada); 
        
        // 💾 3. Guardar cambios en el usuario (Saldo + Cita)
        await usuario.save();

        res.status(201).json({
            exito: true,
            mensaje: "Cita agendada con éxito",
            cita: citaGuardada,
            usuario: usuario // Enviamos el usuario actualizado para el frontend
        });

    } catch (error) {
        console.error("❌ Error en crearCita:", error);
        res.status(500).json({
            exito: false,
            mensaje: "Error interno del servidor",
            error: error.message
        });
    }
};