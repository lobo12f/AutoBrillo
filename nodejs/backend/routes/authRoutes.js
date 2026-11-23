import express from "express";
import { conectarDB } from "../config/db.js";
import bcrypt from "bcrypt";
import { generarToken, verificarToken } from '../middleware/auth.js';

const router = express.Router();

// ================================================================
// 🔹 REGISTRO DE USUARIO
// ================================================================

router.post("/registro", async (req, res) => {
    try {
        const db = await conectarDB();
        const { nombre, apellido, email, whatsapp, password, tipoUsuario } = req.body;

        // 1. Verificar si el correo ya existe
        const usuarioExiste = await db.collection("usuarios").findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({ exito: false, mensaje: "El correo ya está registrado" });
        }

        // 2. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Crear el Usuario con todos los campos necesarios
        const nuevoUsuario = {
            nombre,
            apellido: apellido || "",
            email,
            whatsapp: whatsapp || "",
            password: hashedPassword,
            rol: tipoUsuario || "cliente",
            saldo: 0,
            serviciosDisponibles: 0,
            planActual: "Ninguno",
            misCitas: [],
            garaje: [],
            extrasPagos: [],
            fotoPerfil: "",
            fechaRegistro: new Date()
        };

        const resultado = await db.collection("usuarios").insertOne(nuevoUsuario);

        res.status(201).json({
            exito: true,
            mensaje: "Usuario creado exitosamente",
            userId: resultado.insertedId
        });

    } catch (error) {
        console.error("❌ Error en registro:", error);
        res.status(500).json({ exito: false, mensaje: "Error al registrar usuario" });
    }
});

// ================================================================
// 🔹 LOGIN DE USUARIO (DEVUELVE TODOS LOS DATOS)
// ================================================================

router.post("/login", verificarToken, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ exito: false, mensaje: "Email y contraseña son requeridos" });
        }

        const db = await conectarDB();

        // 1. Buscar al usuario
        const usuario = await db.collection("usuarios").findOne({ email: email.toLowerCase().trim() });

        if (!usuario) {
            return res.status(400).json({ exito: false, mensaje: "Usuario no encontrado" });
        }

        // 2. Comparar la contraseña
        const passwordCorrecto = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecto) {
            return res.status(400).json({ exito: false, mensaje: "Contraseña incorrecta" });
        }

        // 3. ✅ DEVOLVER TODOS LOS DATOS DEL USUARIO
        res.status(200).json({
            exito: true,
            mensaje: "Bienvenido",
            usuario: {
                _id: usuario._id,
                id: usuario._id,
                nombre: usuario.nombre,
                apellido: usuario.apellido || "",
                email: usuario.email,
                whatsapp: usuario.whatsapp || "",
                rol: usuario.rol,
                saldo: usuario.saldo || 0,
                serviciosDisponibles: usuario.serviciosDisponibles || 0,
                planActual: usuario.planActual || "Ninguno",
                misCitas: usuario.misCitas || [],
                garaje: usuario.garaje || [],
                extrasPagos: usuario.extrasPagos || [],
                fotoPerfil: usuario.fotoPerfil || "",
                fechaRegistro: usuario.fechaRegistro
            }
        });

    } catch (error) {
        console.error("❌ Error en login:", error);
        res.status(500).json({ exito: false, mensaje: "Error del servidor" });
    }
});

export default router;