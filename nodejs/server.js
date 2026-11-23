// server.js - Versión ES Modules Pulida
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { generarToken, verificarToken } from './backend/middleware/auth.js';
import { verificarPropietarioCliente } from './backend/middleware/verificarPropiedad.js';
import { iniciarCronExpiracion } from './backend/utils/citasHelpers.js';

// Importar modelos
import Comision from './backend/models/Comision.js';
import PagoEmpleado from './backend/models/PagoEmpleado.js';

// Importar rutas
import citasRoutes from './backend/routes/citasRoutes.js';
import tallerRoutes from './backend/routes/tallerRoutes.js';
import resenasRoutes from './backend/routes/resenasRoutes.js';
import uploadRoutes from './backend/routes/uploadRoutes.js';
import clienteRoutes from './backend/routes/clienteRoutes.js';
// Importar modelo
import Usuario from './backend/models/personaModel.js';

const app = express();
const server = http.createServer(app);

// ==================== CONFIGURACIÓN DE SOCKET.IO ====================
const io = new SocketServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']    // ✅ AÑADIDO
    }
});
iniciarCronExpiracion(io);
// Middleware para inyectar io en las rutas
app.use((req, res, next) => { req.io = io; next(); });

// Socket.IO - Conexiones
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    socket.on('unirse-taller', (tallerId) => {
        socket.join(`taller-${tallerId}`);
        console.log(`🏪 Taller ${tallerId} conectado`);
    });

    socket.on('unirse-cliente', (clienteId) => {
        socket.join(`cliente-${clienteId}`);
        console.log(`👤 Cliente ${clienteId} conectado`);
    });

    // ✅ NUEVO: Sala para empleados
    socket.on('unirse-empleado', (empleadoId) => {
        socket.join(`empleado-${empleadoId}`);
        console.log(`👨‍🔧 Empleado ${empleadoId} conectado`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });
});

// --- CONFIGURACIÓN DE DIRECTORIOS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Carpeta uploads creada');
}

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
    fileFilter: (req, file, cb) => {
        const tipos = /jpeg|jpg|png|gif|webp/;
        const ext = tipos.test(path.extname(file.originalname).toLowerCase());
        const mime = tipos.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Solo imágenes (jpeg, jpg, png, gif, webp)'));
        }
    }
});

app.use(express.static(path.join(__dirname)));

// --- CONFIGURACIÓN Y MIDDLEWARES ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],    // ✅ AÑADIDO OPTIONS
    allowedHeaders: ['Content-Type', 'Authorization']        // ✅ AÑADIDO Authorization
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));

// Servir archivos estáticos de la carpeta uploads
// ✅ Servir uploads con headers CORS correctos
app.use('/uploads', (req, res, next) => {
    // Permitir acceso desde cualquier origen
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // ✅ ESTE HEADER ES EL CLAVE para evitar el bloqueo
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    // Cache para mejorar rendimiento
    res.header('Cache-Control', 'public, max-age=86400');
    next();
}, express.static(uploadsDir));

// --- CONEXIÓN A MONGO DB ---
// ⚠️ NO conectar en test: setup.js ya conecta a mongodb-memory-server
if (process.env.NODE_ENV !== 'test') {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://angel:1234@127.0.0.1:27017/AutoBrillo?authSource=admin";

    mongoose.connect(MONGO_URI)
        .then(() => console.log('🚀 Base de Datos sincronizada (San Pedro de Macorís)'))
        .catch(err => console.error('❌ Error de conexión:', err));
}
// ==================== RUTAS DE CLIENTES ====================

/**
 * Registro de nuevos clientes
 */
app.post('/api/auth/registro', async (req, res) => {
    try {
        const { email, password, nombre } = req.body;

        const existe = await Usuario.findOne({ email: email.toLowerCase() });
        if (existe) {
            return res.status(400).json({ exito: false, mensaje: "Este correo ya tiene una cuenta activa." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nuevoUsuario = new Usuario({
            nombre,
            email: email.toLowerCase(),
            password: passwordHash
        });

        const guardado = await nuevoUsuario.save();
        const { password: _, ...usuarioSeguro } = guardado._doc;

        res.status(201).json({ exito: true, usuario: usuarioSeguro });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al crear la cuenta." });
    }
});

/**
 * Login de clientes
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ exito: false, mensaje: "Email y contraseña son requeridos." });
        }

        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });

        if (!usuario) {
            return res.status(401).json({ exito: false, mensaje: "El usuario no existe." });
        }

        const passwordCorrecto = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecto) {
            return res.status(401).json({ exito: false, mensaje: "Contraseña incorrecta." });
        }

        // ✅ GENERAR TOKEN
        const token = generarToken({
            id: usuario._id.toString(),
            tipo: 'CLIENTE',
            rol: usuario.rol || 'CLIENTE',
            email: usuario.email
        });

        const { password: _, ...usuarioSeguro } = usuario._doc;

        res.json({
            exito: true,
            token,
            usuario: { ...usuarioSeguro, token }
        });

    } catch (error) {
        console.error("❌ ERROR DETALLADO EN LOGIN:", error);
        res.status(500).json({ exito: false, mensaje: "Error interno del servidor." });
    }
});

/**
 * 
 * 
 * 
 * 
 * Sincronización Maestra
 */
app.put('/api/usuarios/sincronizar/:email', verificarToken, async (req, res) => {
    try {
        const { email } = req.params;
        if (req.usuario.email && req.usuario.email !== email.toLowerCase()) {
            return res.status(403).json({
                exito: false,
                mensaje: 'No puedes modificar los datos de otro usuario.'
            });
        }
        let datosFrontend = { ...req.body };

        delete datosFrontend._id;
        delete datosFrontend.password;
        delete datosFrontend.email;

        const usuarioActualizado = await Usuario.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: datosFrontend },
            { returnDocument: 'after', runValidators: true }
        );

        if (!usuarioActualizado) {
            return res.status(404).json({ exito: false, mensaje: "Usuario no encontrado" });
        }

        const { password: _, ...usuarioSeguro } = usuarioActualizado.toObject();

        return res.json({ exito: true, usuario: usuarioSeguro });   // ← CORREGIDO

    } catch (error) {
        console.error("❌ Error en Sincro:", error);
        return res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Cambiar contraseña
 */
app.post('/api/usuarios/update-password', verificarToken, async (req, res) => {
    try {
        const { email, passwordActual, passwordNueva } = req.body;
        // ✅ VERIFICAR QUE EL EMAIL COINCIDE CON EL DEL TOKEN
        if (req.usuario.email && req.usuario.email !== email) {
            return res.status(403).json({
                exito: false,
                mensaje: 'No puedes cambiar la contraseña de otro usuario.'
            });
        }
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(404).json({ exito: false, mensaje: "Usuario no encontrado." });
        }

        const esValida = await bcrypt.compare(passwordActual, usuario.password);
        if (!esValida) {
            return res.status(401).json({ exito: false, mensaje: "La contraseña actual es incorrecta." });
        }

        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(passwordNueva, salt);
        await usuario.save();

        res.json({ exito: true, mensaje: "Contraseña cambiada." });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ==================== RUTA DE SUBIDA DE IMÁGENES ====================

/**
 * Subir imagen al servidor
 * Devuelve la URL de la imagen guardada
 */
app.post('/api/upload/imagen', verificarToken, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                exito: false,
                mensaje: 'No se envió ninguna imagen'
            });
        }

        const url = `http://localhost:3000/uploads/${req.file.filename}`;
        console.log('📷 Imagen subida:', url);

        res.json({
            exito: true,
            url,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('❌ Error al subir imagen:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al procesar la imagen: ' + error.message
        });
    }
});

/**
 * Eliminar una imagen del servidor
 */
app.delete('/api/upload/imagen/:filename', verificarToken, (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Imagen eliminada:', filename);
            res.json({ exito: true, mensaje: 'Imagen eliminada' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Imagen no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ==================== RUTAS DE CITAS DE USUARIO ====================

/**
 * Obtener citas de un usuario (SOLO ACTIVAS, NO CANCELADAS)
 */
app.get('/api/citas/usuario/:usuarioId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const Cita = (await import('./backend/models/citaModel.js')).default;

        const citas = await Cita.find({
            usuarioId: usuarioId,
            estado: { $nin: ['CANCELADA'] }
        }).sort({ fecha: -1 });

        console.log(`📊 Citas activas para ${usuarioId}: ${citas.length}`);
        res.json({ exito: true, citas });
    } catch (error) {
        console.error('❌ Error al obtener citas:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Obtener SOLO los estados actualizados de las citas del taller
 */
app.get('/api/talleres/estados-cliente/:usuarioId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const CitaTaller = (await import('./backend/models/CitaTaller.js')).default;

        const citas = await CitaTaller.find({
            clienteId: usuarioId,
            estado: { $nin: ['CANCELADA', 'ENTREGADA', 'ENTREGADO'] }
        }).select('vehiculo.placa fecha hora estado bahiaAsignada empleadoAsignado')
            .lean();

        const estados = citas.map(c => ({
            placa: c.vehiculo?.placa || '',
            fecha: c.fecha,
            hora: c.hora,
            estado: c.estado,
            bahiaAsignada: c.bahiaAsignada || null,
            empleadoAsignado: c.empleadoAsignado || null
        }));

        console.log(`📊 Estados del taller para ${usuarioId}: ${estados.length}`);
        res.json({ exito: true, estados });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// RUTA TEMPORAL para corregir citas viejas
app.get('/api/corregir-citas', verificarToken, async (req, res) => {
    try {
        const CitaTaller = (await import('./backend/models/CitaTaller.js')).default;
        const Cita = (await import('./backend/models/citaModel.js')).default;

        let corregidasTaller = 0;
        let corregidasUsuario = 0;

        const citasTaller = await CitaTaller.find({});
        for (const cita of citasTaller) {
            if (typeof cita.vehiculo === 'string') {
                const partes = cita.vehiculo.split('|');
                await CitaTaller.updateOne(
                    { _id: cita._id },
                    {
                        $set: {
                            vehiculo: {
                                marca: 'Genérico',
                                modelo: partes[0] || 'Modelo',
                                placa: partes[1] || 'S/P',
                                color: ''
                            }
                        }
                    }
                );
                corregidasTaller++;
            }
        }

        const citasUsuario = await Cita.find({});
        for (const cita of citasUsuario) {
            if (typeof cita.vehiculo === 'string') {
                const partes = cita.vehiculo.split('|');
                await Cita.updateOne(
                    { _id: cita._id },
                    {
                        $set: {
                            vehiculo: {
                                marca: 'Genérico',
                                modelo: partes[0] || 'Modelo',
                                placa: partes[1] || 'S/P',
                                color: ''
                            }
                        }
                    }
                );
                corregidasUsuario++;
            }
        }

        res.json({
            exito: true,
            mensaje: 'Citas corregidas',
            corregidasTaller,
            corregidasUsuario
        });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ==================== RUTAS DE CITAS ====================
app.use('/api/citas', citasRoutes);
// ==================== RUTAS DE TALLERES ====================
app.use('/api/talleres', tallerRoutes);

//=====================RUTAS DE RESENAS=====================
app.use('/api/talleres', resenasRoutes);
//=====================RUTAS PARA CARGA FOTOS DE PERFIR ==================== 
app.use('/api/upload', uploadRoutes);
//=====================RUTAS DE CLIENTE=====================
app.use('/api/clientes', clienteRoutes);

// ==================== RUTA DE SALUD ====================
app.get('/api/health', (req, res) => {
    res.json({
        estado: 'online',
        timestamp: new Date().toISOString(),
        rutas: [
            'POST /api/auth/registro',
            'POST /api/auth/login',
            'PUT  /api/usuarios/sincronizar/:email',
            'POST /api/usuarios/update-password',
            'POST /api/upload/imagen',
            'DELETE /api/upload/imagen/:filename',
            'GET  /api/citas',
            'POST /api/citas',
            'DELETE /api/citas/:id',
            'POST /api/talleres/registro',
            'POST /api/talleres/login',
            'GET  /api/talleres/:tallerId/dashboard',
            'GET  /api/talleres/:tallerId/citas',
            'GET  /api/talleres/:tallerId/bahias',
            'GET  /api/talleres/:tallerId/empleados',
            'GET  /api/talleres/:tallerId/historial'
        ]
    });
});

// ==================== RUTAS ADICIONALES ====================

app.get('/api/talleres/citas/cliente/:usuarioId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const CitaTaller = (await import('./backend/models/CitaTaller.js')).default;

        const citas = await CitaTaller.find({
            clienteId: usuarioId,
            estado: { $nin: ['CANCELADA', 'ENTREGADA', 'ENTREGADO'] }
        }).sort({ fecha: -1 });

        console.log(`📊 Citas taller activas para ${usuarioId}: ${citas.length}`);
        res.json({ exito: true, citas, total: citas.length });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/api/limpiar-canceladas/:usuarioId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    const { usuarioId } = req.params;
    const usuario = await Usuario.findById(usuarioId);

    const antes = usuario.misCitas.length;
    usuario.misCitas = usuario.misCitas.filter(c => c.estado !== 'CANCELADA');
    await usuario.save();

    res.json({
        exito: true,
        antes,
        despues: usuario.misCitas.length,
        eliminadas: antes - usuario.misCitas.length
    });
});

app.get('/api/mis-citas/:usuarioId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const CitaTaller = (await import('./backend/models/CitaTaller.js')).default;

        const citas = await CitaTaller.find({
            clienteId: usuarioId
        })
            .sort({ fecha: -1, hora: -1 })
            .populate('tallerId', 'nombre direccion telefono')
            .lean();

        console.log(`📊 Citas para ${usuarioId}: ${citas.length}`);
        res.json({ exito: true, citas });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// --- LANZAMIENTO (SIEMPRE AL FINAL) ---
// --- LANZAMIENTO (SIEMPRE AL FINAL) ---
// ✅ NO arrancar el servidor si estamos en modo test

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`
        =========================================
        ✨ AutoBrillo API: Online
        🌐 Puerto: ${PORT}
        📡 Entorno: Development
        📁 Uploads: /uploads
        🔌 WebSockets: Activados
        👨‍🔧 Sala Empleados: Activada
        📋 Rutas Clientes: /api/auth/*, /api/citas/*
        🏪 Rutas Talleres: /api/talleres/*
        📷 Subir Imágenes: POST /api/upload/imagen
        =========================================
        `);
    });
}

// Al final de server.js
export default app;