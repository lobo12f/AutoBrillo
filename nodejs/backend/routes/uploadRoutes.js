// ====================================================================
// 📸 RUTAS DE SUBIDA DE ARCHIVOS
// ====================================================================
import mongoose from 'mongoose';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Usuario from '../models/personaModel.js';
import Empleado from '../models/Empleado.js';
import Taller from '../models/Taller.js';

const router = express.Router();

// ✅ Configurar rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Carpeta de uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Carpeta uploads creada:', uploadsDir);
}

// ✅ Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${timestamp}-${random}${ext}`);
    }
});

// ✅ Filtro de archivos (solo imágenes)
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
    const extValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = tiposPermitidos.test(file.mimetype);

    if (extValida && mimeValido) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, gif, webp)'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

// ====================================================================
// 📤 ENDPOINTS
// ====================================================================

/**
 * POST /api/upload/perfil
 * Subir foto de perfil de CLIENTE
 */
router.post('/perfil', upload.single('foto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                exito: false,
                mensaje: 'No se recibió ninguna imagen'
            });
        }

        const { usuarioId } = req.body;

        if (!usuarioId) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                exito: false,
                mensaje: 'usuarioId es requerido'
            });
        }

        // ✅ URL pública de la imagen
        const urlFoto = `http://localhost:3000/uploads/${req.file.filename}`;

        // ✅ Actualizar el usuario
        const Usuario = mongoose.models.Usuario;
        const usuario = await Usuario.findByIdAndUpdate(
            usuarioId,
            { $set: { fotoPerfil: urlFoto } },
            { new: true }
        );

        // ✅ AHORA verificamos si existe (ANTES de emitir)
        if (!usuario) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                exito: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        console.log('✅ Foto de perfil actualizada:', {
            usuarioId,
            nombre: usuario.nombre,
            urlFoto
        });

        // ✅ EMITIR EVENTO WEBSOCKET: el cliente cambió su foto
        if (req.io) {
            // Buscar todas las citas calificadas de este cliente para saber
            // a qué talleres y empleados avisar
            const CitaTaller = (await import('../models/CitaTaller.js')).default;

            const citasDelCliente = await CitaTaller.find({
                clienteId: usuarioId,
                'calificacion.puntuacion': { $exists: true, $gt: 0 }
            }).select('tallerId empleadoAsignado empleadoCompletado').lean();

            // Agrupar por taller + empleados únicos
            const talleresUnicos = new Set();
            const empleadosUnicos = new Set();

            citasDelCliente.forEach(c => {
                if (c.tallerId) talleresUnicos.add(String(c.tallerId));
                if (c.empleadoAsignado) empleadosUnicos.add(String(c.empleadoAsignado));
                if (c.empleadoCompletado?.id) empleadosUnicos.add(String(c.empleadoCompletado.id));
            });

            const payload = {
                tipo: 'CLIENTE',
                id: usuario._id.toString(),
                cambios: { fotoPerfil: usuario.fotoPerfil }
            };

            // ✅ Emitir al TALLER
            talleresUnicos.forEach(tid => {
                req.io.to(`taller-${tid}`).emit('perfil-actualizado', payload);
                console.log(`📡 [perfil-actualizado CLIENTE] Emitido a taller-${tid}`);
            });

            // ✅ Emitir a EMPLEADOS
            empleadosUnicos.forEach(eid => {
                req.io.to(`empleado-${eid}`).emit('perfil-actualizado', payload);
                console.log(`📡 [perfil-actualizado CLIENTE] Emitido a empleado-${eid}`);
            });

            console.log(`📡 [perfil-actualizado CLIENTE] Total: ${talleresUnicos.size} talleres, ${empleadosUnicos.size} empleados`);
        }
        res.json({
            exito: true,
            mensaje: 'Foto de perfil actualizada correctamente',
            url: urlFoto,
            usuario: {
                _id: usuario._id,
                nombre: usuario.nombre,
                fotoPerfil: usuario.fotoPerfil
            }
        });

    } catch (error) {
        console.error('❌ Error al subir foto de perfil:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            exito: false,
            mensaje: error.message
        });
    }
});

/**
 * POST /api/upload/empleado/:empleadoId
 * Subir foto de perfil de EMPLEADO + emitir evento en tiempo real
 */
router.post('/empleado/:empleadoId', upload.single('foto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                exito: false,
                mensaje: 'No se recibió ninguna imagen'
            });
        }

        const { empleadoId } = req.params;
        const urlFoto = `http://localhost:3000/uploads/${req.file.filename}`;

        const empleado = await Empleado.findByIdAndUpdate(
            empleadoId,
            { $set: { fotoPerfil: urlFoto } },
            { new: true }
        );

        if (!empleado) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado'
            });
        }

        console.log('✅ Foto de empleado actualizada:', {
            empleadoId,
            nombre: empleado.nombre,
            urlFoto
        });

        // ✅ EMITIR EVENTO POR WEBSOCKET
        if (req.io) {
            const payload = {
                tipo: 'EMPLEADO',
                id: empleado._id.toString(),
                tallerId: empleado.tallerId.toString(),
                cambios: { fotoPerfil: empleado.fotoPerfil }
            };

            // req.io.to(`taller-${empleado.tallerId}`).emit('perfil-actualizado', payload);
            req.io.to(`empleado-${empleado._id}`).emit('perfil-actualizado', payload);

            console.log('📡 [perfil-actualizado] Emitido (foto):', {
                taller: `taller-${empleado.tallerId}`,
                empleado: `empleado-${empleado._id}`,
                fotoPerfil: empleado.fotoPerfil
            });
        } else {
            console.warn('⚠️ req.io no disponible en uploadRoutes');
        }

        res.json({
            exito: true,
            mensaje: 'Foto actualizada',
            url: urlFoto,
            empleado: {
                _id: empleado._id,
                nombre: empleado.nombre,
                fotoPerfil: empleado.fotoPerfil
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * POST /api/upload/taller/:tallerId
 * Subir LOGO de TALLER
 */
router.post('/taller/:tallerId', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                exito: false,
                mensaje: 'No se recibió ninguna imagen'
            });
        }

        const { tallerId } = req.params;
        const urlLogo = `http://localhost:3000/uploads/${req.file.filename}`;

        const taller = await Taller.findByIdAndUpdate(
            tallerId,
            { $set: { logo: urlLogo } },
            { new: true }
        );

        if (!taller) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                exito: false,
                mensaje: 'Taller no encontrado'
            });
        }

        res.json({
            exito: true,
            mensaje: 'Logo actualizado',
            url: urlLogo,
            taller: {
                _id: taller._id,
                nombre: taller.nombre,
                logo: taller.logo
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

export default router;