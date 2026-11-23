// ====================================================================
// ⭐ RUTAS DE RESEÑAS Y COMENTARIOS - AUTOBRILLO DETALLING
// ====================================================================

import express from 'express';
import mongoose from 'mongoose';
import Taller from '../models/Taller.js';
import Empleado from '../models/Empleado.js';
import CitaTaller from '../models/CitaTaller.js';
import ComentarioResena from '../models/ComentarioResena.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarPropietarioTaller } from '../middleware/verificarPropiedad.js';

const router = express.Router();

// ✅ Helper: emite a taller + empleados involucrados
function emitirATallerYEmpleados(req, tallerId, empleadoIds, evento, payload) {
    if (!req.io) return;
    //   req.io.to(`taller-${tallerId}`).emit(evento, payload);
    //  console.log(`📡 [${evento}] Emitido a taller-${tallerId}`);
    const unicos = [...new Set((empleadoIds || []).filter(Boolean).map(id => String(id)))];
    unicos.forEach(empId => {
        req.io.to(`empleado-${empId}`).emit(evento, payload);
        console.log(`📡 [${evento}] Emitido a empleado-${empId}`);
    });
}

// ✅ Helper: emite SOLO al taller
function emitirATaller(req, tallerId, evento, payload) {
    if (!req.io) return;

    req.io.to(`taller-${tallerId}`).emit(evento, payload);
    console.log(`📡 [${evento}] Emitido a taller-${tallerId}`);
}
// ✅ Helper: emite SOLO a los empleados
function emitirAEmpleados(req, empleadoIds, evento, payload) {
    if (!req.io) return;
    const unicos = [...new Set((empleadoIds || []).filter(Boolean).map(id => String(id)))];
    unicos.forEach(empId => {
        req.io.to(`empleado-${empId}`).emit(evento, payload);
        console.log(`📡 [${evento}] Emitido a empleado-${empId}`);
    });
}

function obtenerEmpleadosDeCita(cita) {
    const ids = [];
    if (cita?.empleadoAsignado) ids.push(String(cita.empleadoAsignado));
    if (cita?.empleadoCompletado?.id) ids.push(String(cita.empleadoCompletado.id));
    return ids;
}
// ====================================================================
// 🔹 GRUPO 1: RESEÑAS DEL TALLER (ADMIN)
// ====================================================================

/**
 * GET /:tallerId/resenas-admin
 * Obtener reseñas para el panel de administración del taller
 */
router.get('/:tallerId/resenas-admin', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        // ✅ Obtener modelo Usuario
        let Usuario;
        try {
            Usuario = mongoose.model('Usuario');
        } catch (e) {
            const UsuarioModel = await import('../models/personaModel.js');
            Usuario = UsuarioModel.default;
        }

        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            'calificacion.puntuacion': { $exists: true, $gt: 0 }
        })
            .populate('clienteId', 'nombre email fotoPerfil')
            .sort({ 'calificacion.fecha': -1 })
            .lean();

        // ✅ Obtener todos los comentarios de estas citas
        const citaIds = citas.map(c => c._id);
        const todosComentarios = await ComentarioResena.find({
            citaId: { $in: citaIds }
        }).sort({ fecha: 1 }).lean();

        // ✅ NUEVO: Enriquecer cada comentario con la foto ACTUAL del autor
        const comentariosEnriquecidos = await Promise.all(todosComentarios.map(async (c) => {
            let fotoActual = c.autor?.foto;

            // Si es CLIENTE, buscar su foto actual
            if (c.autor?.tipo === 'CLIENTE' && c.autor?.id) {
                try {
                    const u = await Usuario.findById(c.autor.id).lean();
                    if (u?.fotoPerfil && u.fotoPerfil.trim() !== '') {
                        fotoActual = u.fotoPerfil;
                    }
                } catch (e) { /* silencioso */ }
            }

            // Si es EMPLEADO, buscar su foto actual
            if (c.autor?.tipo === 'EMPLEADO' && c.autor?.id) {
                try {
                    const emp = await Empleado.findById(c.autor.id).lean();
                    if (emp?.fotoPerfil && emp.fotoPerfil.trim() !== '') {
                        fotoActual = emp.fotoPerfil;
                    }
                } catch (e) { /* silencioso */ }
            }

            // Si es TALLER, buscar su logo actual
            if (c.autor?.tipo === 'TALLER' && c.autor?.id) {
                try {
                    const t = await Taller.findById(c.autor.id).lean();
                    if (t?.logo && t.logo.trim() !== '') {
                        fotoActual = t.logo;
                    }
                } catch (e) { /* silencioso */ }
            }

            return {
                ...c,
                autor: {
                    ...c.autor,
                    foto: fotoActual || null
                }
            };
        }));

        // ✅ CONSTRUIR ÁRBOL DE COMENTARIOS agrupados por cita
        const comentariosPorCita = {};

        // Primero: agrupar todos los comentarios por cita
        const comentariosRaw = {};
        comentariosEnriquecidos.forEach(com => {
            const key = com.citaId.toString();
            if (!comentariosRaw[key]) comentariosRaw[key] = [];
            comentariosRaw[key].push(com);
        });

        // Segundo: construir árbol para cada cita
        Object.keys(comentariosRaw).forEach(citaKey => {
            const comentariosCita = comentariosRaw[citaKey];

            // Mapear por ID
            const map = {};
            const raices = [];

            comentariosCita.forEach(c => {
                map[c._id.toString()] = { ...c, respuestas: [] };
            });

            // Anidar
            comentariosCita.forEach(c => {
                const comentario = map[c._id.toString()];
                if (c.respuestaA) {
                    const padre = map[c.respuestaA.toString()];
                    if (padre) {
                        padre.respuestas.push(comentario);
                    } else {
                        raices.push(comentario);
                    }
                } else {
                    raices.push(comentario);
                }
            });

            // Ordenar recursivamente por fecha
            const ordenarArbol = (nodos) => {
                nodos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                nodos.forEach(n => {
                    if (n.respuestas && n.respuestas.length > 0) {
                        ordenarArbol(n.respuestas);
                    }
                });
            };
            ordenarArbol(raices);

            comentariosPorCita[citaKey] = raices;
        });

        const resenas = citas.map(c => ({
            _id: c._id,
            puntuacion: c.calificacion.puntuacion,
            comentario: c.calificacion.comentario || '',
            respuesta: c.calificacion.respuestaTaller || c.calificacion.respuesta || '',
            fechaRespuesta: c.calificacion.fechaRespuestaTaller || c.calificacion.fechaRespuesta || null,
            fecha: c.calificacion.fecha || c.fechas?.entrega || c.createdAt,
            fotos: c.fotos?.despues?.map(f => f.url) || [],
            comentarios: comentariosPorCita[c._id.toString()] || [],
            cliente: c.clienteId ? {
                id: String(c.clienteId._id),
                nombre: c.clienteId.nombre,
                email: c.clienteId.email,
                foto: c.clienteId.fotoPerfil || null
            } : { id: null, nombre: 'Cliente', email: '', foto: null },
            vehiculo: c.vehiculo,
            servicio: c.servicio?.nombre
        }));

        const promedio = resenas.length > 0
            ? resenas.reduce((s, r) => s + r.puntuacion, 0) / resenas.length
            : 0;

        const sinResponder = resenas.filter(r => !r.respuesta).length;

        console.log(`📊 Reseñas admin: ${resenas.length} reseñas, ${todosComentarios.length} comentarios`);

        res.json({
            exito: true,
            promedio: Math.round(promedio * 10) / 10,
            total: resenas.length,
            sinResponder,
            resenas
        });

    } catch (error) {
        console.error('❌ Error en resenas-admin:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
/**
 * GET /:tallerId/resenas-social
 * Obtener reseñas con datos sociales (incluye comentarios del modelo separado)
 */
router.get('/:tallerId/resenas-social', async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            'calificacion.puntuacion': { $exists: true, $gt: 0 }
        })
            .populate('clienteId', 'nombre email fotoPerfil')
            .sort({ 'calificacion.fecha': -1 })
            .lean();

        // Obtener todos los comentarios de estas citas
        const citaIds = citas.map(c => c._id);
        const todosComentarios = await ComentarioResena.find({
            citaId: { $in: citaIds }
        }).sort({ fecha: 1 }).lean();

        // Agrupar comentarios por citaId
        const comentariosPorCita = {};
        todosComentarios.forEach(com => {
            const key = com.citaId.toString();
            if (!comentariosPorCita[key]) comentariosPorCita[key] = [];
            comentariosPorCita[key].push(com);
        });

        const resenas = citas.map(c => ({
            _id: c._id,
            puntuacion: c.calificacion.puntuacion,
            comentario: c.calificacion.comentario || '',
            respuesta: c.calificacion.respuesta || '',
            fechaRespuesta: c.calificacion.fechaRespuesta || null,
            fecha: c.calificacion.fecha || c.fechas?.entrega || c.createdAt,
            fotos: c.fotos?.despues?.map(f => f.url) || [],
            comentarios: comentariosPorCita[c._id.toString()] || [],
            cliente: c.clienteId ? {
                nombre: c.clienteId.nombre,
                email: c.clienteId.email,
                foto: c.clienteId.fotoPerfil
            } : { nombre: 'Cliente' },
            vehiculo: c.vehiculo,
            servicio: c.servicio?.nombre
        }));

        const promedio = resenas.length > 0
            ? resenas.reduce((s, r) => s + r.puntuacion, 0) / resenas.length
            : 0;

        const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        resenas.forEach(r => { if (distribucion[r.puntuacion] !== undefined) distribucion[r.puntuacion]++; });

        console.log(`📊 Reseñas sociales: ${resenas.length} reseñas, ${todosComentarios.length} comentarios`);

        res.json({
            exito: true,
            promedio: Math.round(promedio * 10) / 10,
            total: resenas.length,
            distribucion,
            resenas
        });

    } catch (error) {
        console.error('❌ Error en resenas-social:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 🔹 GRUPO 2: RESPUESTAS DEL TALLER
// ====================================================================

/**
 * PUT /:tallerId/resenas/:resenaId/responder
 * Taller responde a una reseña
 */
router.put('/:tallerId/resenas/:resenaId/responder', async (req, res) => {
    try {
        const { tallerId, resenaId } = req.params;
        const { respuesta } = req.body;

        if (!respuesta || respuesta.trim() === '') {
            return res.status(400).json({ exito: false, mensaje: 'La respuesta es requerida' });
        }

        const taller = await Taller.findById(tallerId);
        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        const Cita = mongoose.model('CitaTaller');
        const cita = await Cita.findOne({
            _id: resenaId,
            tallerId
        });

        if (!cita) {
            return res.status(404).json({ exito: false, mensaje: 'Reseña no encontrada' });
        }

        // ✅ Guardar respuesta del taller (separada de la del empleado)
        if (!cita.calificacion) {
            cita.calificacion = {};
        }

        // ✅ Guardar en campos ESPECÍFICOS del taller
        cita.calificacion.respuestaTaller = respuesta.trim();
        cita.calificacion.fechaRespuestaTaller = new Date();
        cita.calificacion.respondidoPorTaller = tallerId;

        await cita.save();
        emitirATaller(req, tallerId, 'resena-respondida', {
            resenaId: cita._id,
            tipo: 'TALLER',
            respuesta: cita.calificacion.respuestaTaller,
            fecha: cita.calificacion.fechaRespuestaTaller
        });

        res.json({
            exito: true,
            mensaje: '✅ Respuesta del taller guardada correctamente',
            data: {
                respuesta: cita.calificacion.respuestaTaller,
                fechaRespuesta: cita.calificacion.fechaRespuestaTaller
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 🔹 GRUPO 3: RESPUESTAS DEL EMPLEADO
// ====================================================================

/**
 * GET /:tallerId/empleado/:empleadoId/resenas
 * Obtener reseñas del empleado con comentarios y permisos
 */
router.get('/:tallerId/empleado/:empleadoId/resenas', async (req, res) => {
    try {
        console.log('🔍 Iniciando búsqueda de reseñas...');
        const { tallerId, empleadoId } = req.params;

        // 1. Verificar taller
        console.log('📡 Verificando taller:', tallerId);
        const taller = await Taller.findById(tallerId);
        if (!taller) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Taller no encontrado'
            });
        }
        console.log('✅ Taller encontrado:', taller.nombre);

        // 2. Verificar empleado
        console.log('📡 Verificando empleado:', empleadoId);
        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId: tallerId
        });

        if (!empleado) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado en este taller'
            });
        }
        console.log('✅ Empleado encontrado:', empleado.nombre);

        // 3. Obtener el modelo CitaTaller
        console.log('📡 Obteniendo modelo CitaTaller...');
        let Cita;
        try {
            Cita = mongoose.model('CitaTaller');
            console.log('✅ Modelo CitaTaller obtenido');
        } catch (e) {
            console.error('❌ Error obteniendo modelo CitaTaller:', e.message);
            const CitaTaller = await import('../models/CitaTaller.js');
            Cita = CitaTaller.default;
            console.log('✅ Modelo CitaTaller importado directamente');
        }

        // 4. Buscar citas con calificación
        console.log('📡 Buscando citas del empleado con calificación...');
        let citasConCalificacion = [];
        try {
            citasConCalificacion = await Cita.find({
                tallerId: tallerId,
                $or: [
                    { empleadoAsignado: empleadoId },
                    { 'empleadoCompletado.id': empleadoId }
                ],
                'calificacion.puntuacion': { $exists: true, $ne: null }
            })
                .lean()
                .sort({ 'calificacion.fecha': -1 });

            console.log('📝 Citas con calificación encontradas:', citasConCalificacion.length);
        } catch (e) {
            console.error('❌ Error en consulta de citas:', e.message);
            try {
                citasConCalificacion = await Cita.find({
                    tallerId: tallerId,
                    empleadoAsignado: empleadoId,
                    'calificacion.puntuacion': { $exists: true, $ne: null }
                })
                    .lean()
                    .sort({ 'calificacion.fecha': -1 });
                console.log('📝 Citas con calificación (solo empleadoAsignado):', citasConCalificacion.length);
            } catch (e2) {
                console.error('❌ Error en consulta alternativa:', e2.message);
                throw e2;
            }
        }

        // 5. Obtener modelo ComentarioResena
        let ComentarioResena;
        try {
            ComentarioResena = mongoose.model('ComentarioResena');
        } catch (e) {
            const ComentarioResenaModel = await import('../models/ComentarioResena.js');
            ComentarioResena = ComentarioResenaModel.default;
        }

        // ✅ Obtener modelo Usuario (una sola vez)
        let Usuario;
        try {
            Usuario = mongoose.model('Usuario');
        } catch (e) {
            const UsuarioModel = await import('../models/personaModel.js');
            Usuario = UsuarioModel.default;
        }

        // 6. Procesar cada cita
        console.log('📡 Procesando citas...');
        const resenas = [];
        for (const cita of citasConCalificacion) {
            try {
                // ✅ Obtener TODOS los comentarios de esta cita
                let todosComentarios = [];
                try {
                    todosComentarios = await ComentarioResena.find({
                        citaId: cita._id,
                        tallerId: tallerId,
                        estado: 'ACTIVO'
                    })
                        .lean()
                        .sort({ fecha: 1 });
                } catch (e) {
                    console.warn('⚠️ Error obteniendo comentarios para cita:', cita._id, e.message);
                }

                // ✅ NUEVO: Enriquecer cada comentario con la foto ACTUAL del autor
                const comentariosEnriquecidos = await Promise.all(todosComentarios.map(async (c) => {
                    let fotoActual = c.autor?.foto;

                    // Si es CLIENTE, buscar su foto actual
                    if (c.autor?.tipo === 'CLIENTE' && c.autor?.id) {
                        try {
                            const u = await Usuario.findById(c.autor.id).lean();
                            if (u?.fotoPerfil && u.fotoPerfil.trim() !== '') {
                                fotoActual = u.fotoPerfil;
                            }
                        } catch (e) { /* silencioso */ }
                    }

                    // Si es EMPLEADO, buscar su foto actual
                    if (c.autor?.tipo === 'EMPLEADO' && c.autor?.id) {
                        try {
                            const emp = await Empleado.findById(c.autor.id).lean();
                            if (emp?.fotoPerfil && emp.fotoPerfil.trim() !== '') {
                                fotoActual = emp.fotoPerfil;
                            }
                        } catch (e) { /* silencioso */ }
                    }

                    // Si es TALLER, buscar su logo actual
                    if (c.autor?.tipo === 'TALLER' && c.autor?.id) {
                        try {
                            const t = await Taller.findById(c.autor.id).lean();
                            if (t?.logo && t.logo.trim() !== '') {
                                fotoActual = t.logo;
                            }
                        } catch (e) { /* silencioso */ }
                    }

                    return {
                        ...c,
                        autor: {
                            ...c.autor,
                            foto: fotoActual || null   // ✅ foto actual (o null si no tiene)
                        }
                    };
                }));

                // ✅ CONSTRUIR ÁRBOL DE COMENTARIOS (con los enriquecidos)
                const comentariosMap = {};
                const comentariosRaiz = [];

                // Paso 1: Mapear cada comentario por su ID
                comentariosEnriquecidos.forEach(c => {
                    comentariosMap[c._id.toString()] = {
                        ...c,
                        respuestas: []
                    };
                });

                // Paso 2: Anidar cada comentario bajo su padre
                comentariosEnriquecidos.forEach(c => {
                    const comentario = comentariosMap[c._id.toString()];

                    if (c.respuestaA) {
                        const padreId = c.respuestaA.toString();
                        const padre = comentariosMap[padreId];

                        if (padre) {
                            padre.respuestas.push(comentario);
                        } else {
                            comentariosRaiz.push(comentario);
                        }
                    } else {
                        comentariosRaiz.push(comentario);
                    }
                });

                // ✅ Ordenar recursivamente por fecha
                const ordenarArbol = (nodos) => {
                    nodos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    nodos.forEach(n => {
                        if (n.respuestas && n.respuestas.length > 0) {
                            ordenarArbol(n.respuestas);
                        }
                    });
                };
                ordenarArbol(comentariosRaiz);

                console.log(`🌳 Cita ${cita._id}: ${todosComentarios.length} comentarios, ${comentariosRaiz.length} raíces`);

                // ✅ Obtener información del cliente CON FOTO
                let cliente = { id: null, nombre: 'Cliente', email: '', telefono: '', foto: null };
                if (cita.clienteId) {
                    try {
                        const usuario = await Usuario.findById(cita.clienteId).lean();
                        if (usuario) {
                            cliente = {
                                id: String(usuario._id),
                                nombre: usuario.nombre || 'Cliente',
                                email: usuario.email || '',
                                telefono: usuario.telefono || '',
                                foto: usuario.fotoPerfil || null
                            };
                        }
                    } catch (e) {
                        console.warn('⚠️ No se pudo obtener usuario:', e.message);
                    }
                }

                resenas.push({
                    _id: cita._id,
                    cliente: cliente,
                    vehiculo: {
                        marca: cita.vehiculo?.marca || 'N/A',
                        modelo: cita.vehiculo?.modelo || 'N/A',
                        placa: cita.vehiculo?.placa || 'S/P',
                        color: cita.vehiculo?.color || ''
                    },
                    servicio: cita.servicio?.nombre || 'Servicio',
                    puntuacion: cita.calificacion?.puntuacion || 0,
                    comentario: cita.calificacion?.comentario || '',
                    fotos: cita.fotos?.despues || [],
                    fecha: cita.calificacion?.fecha || cita.fechas?.entrega || cita.createdAt,
                    // Respuesta del taller
                    respuestaTaller: cita.calificacion?.respuestaTaller || cita.calificacion?.respuesta || '',
                    fechaRespuestaTaller: cita.calificacion?.fechaRespuestaTaller || cita.calificacion?.fechaRespuesta || null,
                    respondidoPorTaller: cita.calificacion?.respondidoPorTaller || null,
                    // Respuesta del empleado
                    respuestaEmpleado: cita.calificacion?.respuestaEmpleado || '',
                    fechaRespuestaEmpleado: cita.calificacion?.fechaRespuestaEmpleado || null,
                    respondidoPorEmpleado: cita.calificacion?.respondidoPorEmpleado || null,
                    // ✅ REACCIONES
                    reacciones: cita.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 },
                    reaccionesUsuarios: cita.calificacion?.reaccionesUsuarios || {},
                    // ✅ ÁRBOL DE COMENTARIOS (con fotos actualizadas)
                    comentarios: comentariosRaiz
                });

            } catch (e) {
                console.warn('⚠️ Error procesando cita:', cita._id, e.message);
            }
        }

        // 7. Calcular estadísticas
        const total = resenas.length;
        const promedio = total > 0
            ? resenas.reduce((sum, r) => sum + r.puntuacion, 0) / total
            : 0;

        const distribucion = {
            5: resenas.filter(r => r.puntuacion === 5).length,
            4: resenas.filter(r => r.puntuacion === 4).length,
            3: resenas.filter(r => r.puntuacion === 3).length,
            2: resenas.filter(r => r.puntuacion === 2).length,
            1: resenas.filter(r => r.puntuacion === 1).length
        };

        console.log('✅ Reseñas procesadas:', total);
        console.log('📊 Promedio:', promedio);

        res.json({
            exito: true,
            total,
            promedio,
            distribucion,
            resenas
        });

    } catch (error) {
        console.error('❌ Error al obtener reseñas del empleado:', error);
        console.error('📚 Stack:', error.stack);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
/**
 * PUT /:tallerId/empleado/:empleadoId/resenas/:resenaId/responder
 * Empleado responde a una reseña
 */

router.put('/:tallerId/empleado/:empleadoId/resenas/:resenaId/responder', async (req, res) => {
    try {
        const { tallerId, empleadoId, resenaId } = req.params;
        const { respuesta } = req.body;

        if (!respuesta || respuesta.trim() === '') {
            return res.status(400).json({
                exito: false,
                mensaje: 'La respuesta es requerida'
            });
        }

        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId: tallerId
        });

        if (!empleado) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado'
            });
        }

        const Cita = mongoose.model('CitaTaller');

        const cita = await Cita.findOne({
            _id: resenaId,
            tallerId: tallerId,
            $or: [
                { empleadoAsignado: empleadoId },
                { 'empleadoCompletado.id': empleadoId }
            ],
            'calificacion.puntuacion': { $exists: true, $ne: null }
        });

        if (!cita) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Reseña no encontrada o no autorizada'
            });
        }

        // ✅ Inicializar calificacion si no existe
        if (!cita.calificacion) {
            cita.calificacion = {};
        }

        // ✅ Guardar en campos ESPECÍFICOS del empleado
        cita.calificacion.respuestaEmpleado = respuesta.trim();
        cita.calificacion.fechaRespuestaEmpleado = new Date();
        cita.calificacion.respondidoPorEmpleado = empleadoId;

        await cita.save();
        const empleadosInvolucrados = obtenerEmpleadosDeCita(cita);
        emitirAEmpleados(req, empleadosInvolucrados, 'resena-respondida', {
            resenaId: cita._id,
            tipo: 'EMPLEADO',
            empleadoId: empleadoId,
            respuesta: cita.calificacion.respuestaEmpleado,
            fecha: cita.calificacion.fechaRespuestaEmpleado
        });

        console.log('✅ Respuesta del empleado guardada:', {
            citaId: cita._id,
            empleadoId,
            respuesta: respuesta.trim().substring(0, 50)
        });

        res.json({
            exito: true,
            mensaje: '✅ Respuesta del empleado guardada correctamente',
            data: {
                respuestaEmpleado: cita.calificacion.respuestaEmpleado,
                fechaRespuestaEmpleado: cita.calificacion.fechaRespuestaEmpleado
            }
        });

    } catch (error) {
        console.error('❌ Error al responder reseña:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor: ' + error.message
        });
    }
});

/**
 * DELETE /:tallerId/empleado/:empleadoId/resenas/:resenaId/responder
 * Empleado elimina su respuesta
 */
router.delete('/:tallerId/empleado/:empleadoId/resenas/:resenaId/responder', async (req, res) => {
    try {
        const { tallerId, empleadoId, resenaId } = req.params;

        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId: tallerId
        });

        if (!empleado) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado'
            });
        }

        const Cita = mongoose.model('CitaTaller');

        const cita = await Cita.findOne({
            _id: resenaId,
            tallerId: tallerId,
            'calificacion.respondidoPor': empleadoId
        });

        if (!cita) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Reseña no encontrada o no autorizada'
            });
        }

        // Eliminar la respuesta
        if (cita.calificacion) {
            delete cita.calificacion.respuesta;
            delete cita.calificacion.fechaRespuesta;
            delete cita.calificacion.respondidoPor;
            delete cita.calificacion.respondidoPorTipo;
            await cita.save();
        }

        res.json({
            exito: true,
            mensaje: '✅ Respuesta eliminada correctamente'
        });

    } catch (error) {
        console.error('❌ Error al eliminar respuesta:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

// ====================================================================
// 🔹 GRUPO 4: COMENTARIOS (MODELO SEPARADO)
// ====================================================================

/**
 * GET /:tallerId/resenas/:citaId/comentarios
 * Obtener comentarios ANIDADOS (estructura de árbol)
 */
router.get('/:tallerId/resenas/:citaId/comentarios', async (req, res) => {
    try {
        const { tallerId, citaId } = req.params;

        // Obtener todos los comentarios de la reseña
        const todosComentarios = await ComentarioResena.find({
            citaId: citaId,
            tallerId: tallerId,
            estado: 'ACTIVO'
        })
            .sort({ fecha: 1 })
            .lean();

        console.log('📊 Total comentarios:', todosComentarios.length);
        // ✅ Construir ÁRBOL JERÁRQUICO
        const comentariosMap = {};
        const comentariosRaiz = [];

        // Primero: mapear todos los comentarios por ID
        todosComentarios.forEach(c => {
            comentariosMap[c._id.toString()] = {
                ...c,
                respuestas: []  // Array de respuestas hijas
            };
        });

        // Segundo: construir la jerarquía
        todosComentarios.forEach(c => {
            const comentario = comentariosMap[c._id.toString()];

            if (c.respuestaA) {
                // Es una respuesta → agregar al padre
                const padre = comentariosMap[c.respuestaA.toString()];
                if (padre) {
                    padre.respuestas.push(comentario);
                } else {
                    // Si el padre no existe (fue eliminado), mostrar como raíz
                    comentariosRaiz.push(comentario);
                }
            } else {
                // Es un comentario raíz
                console.warn(`⚠️ Padre no encontrado para: ${c._id}`);
                comentariosRaiz.push(comentario);
            }
        });

        // ✅ Ordenar recursivamente los hijos por fecha
        const ordenarRespuestas = (nodo) => {
            if (nodo.respuestas && nodo.respuestas.length > 0) {
                nodo.respuestas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                nodo.respuestas.forEach(ordenarRespuestas);
            }
        };
        comentariosRaiz.forEach(ordenarRespuestas);
        console.log(JSON.stringify(comentariosRaiz, null, 2));
        // ✅ Función para debug: contar nodos del árbol
        const contarNodos = (nodos) => {
            let total = nodos.length;
            nodos.forEach(n => {
                if (n.respuestas && n.respuestas.length > 0) {
                    total += contarNodos(n.respuestas);
                }
            });
            return total;
        };

        console.log(`📊 Comentarios: ${todosComentarios.length} total, ${comentariosRaiz.length} raíces`);

        res.json({
            exito: true,
            total: todosComentarios.length,
            comentarios: comentariosRaiz  // Solo los raíces, con respuestas anidadas
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * POST /:tallerId/resenas/:citaId/comentarios
 * Crear comentario (cliente, empleado o taller) - CON ANIDACIÓN
 */
router.post('/:tallerId/resenas/:citaId/comentarios', async (req, res) => {
    try {
        const { tallerId, citaId } = req.params;
        const { texto, foto, autorId, autorNombre, autorTipo, respuestaA } = req.body;

        console.log('📝 POST comentario recibido:', {
            tallerId,
            citaId,
            autorTipo,
            autorId,
            autorNombre,
            tieneTexto: !!texto,
            tieneFoto: !!foto,
            esRespuesta: !!respuestaA
        });

        if (!['CLIENTE', 'EMPLEADO', 'TALLER'].includes(autorTipo)) {
            return res.status(400).json({ exito: false, mensaje: 'Tipo de autor no válido' });
        }

        const taller = await Taller.findById(tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const cita = await CitaTaller.findById(citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada' });

        // ✅ Construir autor
        const autor = {
            id: autorId || 'ANONIMO',
            nombre: autorNombre || 'Usuario',
            foto: null,
            tipo: autorTipo
        };

        // ✅ Si es CLIENTE, obtener su foto
        if (autorTipo === 'CLIENTE' && autorId) {
            try {
                const Usuario = mongoose.model('Usuario');
                const usuario = await Usuario.findById(autorId).lean();

                console.log('🔍 Buscando cliente:', autorId);
                console.log('👤 Cliente encontrado:', usuario ? {
                    nombre: usuario.nombre,
                    fotoPerfil: usuario.fotoPerfil ? usuario.fotoPerfil.substring(0, 60) + '...' : 'VACÍO'
                } : 'NO EXISTE');

                if (usuario) {
                    autor.nombre = usuario.nombre || autorNombre;
                    autor.foto = usuario.fotoPerfil && usuario.fotoPerfil.trim() !== ''
                        ? usuario.fotoPerfil
                        : null;
                }
            } catch (e) {
                console.warn('⚠️ No se pudo obtener cliente:', e.message);
            }
        }

        // ✅ Si es EMPLEADO, obtener su foto
        if (autorTipo === 'EMPLEADO') {
            const empleado = await Empleado.findById(autorId);

            console.log('🔍 Buscando empleado:', autorId);
            console.log('👨‍🔧 Empleado encontrado:', empleado ? {
                nombre: empleado.nombre,
                fotoPerfil: empleado.fotoPerfil ? empleado.fotoPerfil.substring(0, 60) + '...' : 'VACÍO'
            } : 'NO EXISTE');

            if (empleado) {
                autor.nombre = empleado.nombre || autorNombre;
                autor.foto = empleado.fotoPerfil || empleado.foto || null;
                autor.empleadoId = empleado._id;
            }
        }

        // ✅ Si es TALLER, obtener su logo
        if (autorTipo === 'TALLER') {
            autor.nombre = taller.nombre || autorNombre;
            autor.foto = taller.logo || null;
            autor.tallerId = taller._id;
        }

        console.log('✅ Autor construido:', {
            id: autor.id,
            nombre: autor.nombre,
            tipo: autor.tipo,
            foto: autor.foto ? 'SÍ (' + autor.foto.substring(0, 40) + '...)' : 'NO'
        });

        // ✅ Calcular nivel y comentario raíz
        let nivel = 0;
        let comentarioRaizId = null;

        if (respuestaA) {
            const comentarioPadre = await ComentarioResena.findById(respuestaA);
            if (comentarioPadre) {
                nivel = (comentarioPadre.nivel || 0) + 1;
                comentarioRaizId = comentarioPadre.comentarioRaizId || comentarioPadre._id;

                console.log('📊 Respuesta anidada:', {
                    padreId: respuestaA,
                    nivel,
                    comentarioRaizId
                });
            }
        }

        // ✅ Crear comentario (nodo del árbol)
        const nuevoComentario = new ComentarioResena({
            citaId,
            tallerId,
            texto: texto || '',
            foto: foto || null,
            autor,
            respuestaA: respuestaA || null,
            nivel: nivel,
            comentarioRaizId: comentarioRaizId
        });

        await nuevoComentario.save();

        const citaWS = await CitaTaller.findById(citaId);
        const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

        // ✅ Notificar al taller
        emitirATaller(req, tallerId, 'comentario-creado', {
            citaId: citaId,
            comentarioId: nuevoComentario._id,
            autor: nuevoComentario.autor,
            texto: nuevoComentario.texto,
            respuestaA: respuestaA || null,
            fecha: nuevoComentario.fecha
        });

        // ✅ Notificar a los empleados
        emitirAEmpleados(req, empleadosInvolucrados, 'comentario-creado', {
            citaId: citaId,
            comentarioId: nuevoComentario._id,
            autor: nuevoComentario.autor,
            texto: nuevoComentario.texto,
            respuestaA: respuestaA || null,
            fecha: nuevoComentario.fecha
        });

        console.log(`✅ Comentario guardado:`, {
            id: nuevoComentario._id,
            autor: nuevoComentario.autor.nombre,
            tipo: nuevoComentario.autor.tipo,
            fotoGuardada: nuevoComentario.autor.foto ? 'SÍ' : 'NO',
            nivel: nuevoComentario.nivel,
            padre: respuestaA || 'RAÍZ'
        });

        res.json({
            exito: true,
            mensaje: 'Comentario agregado correctamente',
            comentario: nuevoComentario
        });

    } catch (error) {
        console.error('❌ Error al crear comentario:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});


/**
 * POST /: tallerId / resenas / comentarios /: comentarioId / responder
    * Responder a un comentario(empleado o taller)
        */

router.post('/:tallerId/resenas/comentarios/:comentarioId/responder', async (req, res) => {
    try {
        const { tallerId, comentarioId } = req.params;
        const {
            texto,
            autorId,
            autorNombre,
            autorTipo
        } = req.body;

        // Validar que sea empleado o taller
        if (!['EMPLEADO', 'TALLER'].includes(autorTipo)) {
            return res.status(403).json({
                exito: false,
                mensaje: 'Solo empleados o taller pueden responder'
            });
        }

        // Validar que tenga texto
        if (!texto || texto.trim() === '') {
            return res.status(400).json({
                exito: false,
                mensaje: 'El texto es requerido'
            });
        }

        const ComentarioResena = mongoose.model('ComentarioResena');

        // Buscar el comentario original
        const comentarioOriginal = await ComentarioResena.findById(comentarioId);
        if (!comentarioOriginal) {
            return res.status(404).json({ exito: false, mensaje: 'Comentario no encontrado' });
        }

        // Verificar que el taller coincida
        if (comentarioOriginal.tallerId.toString() !== tallerId) {
            return res.status(403).json({
                exito: false,
                mensaje: 'No tienes permiso para responder este comentario'
            });
        }

        // ❌ ELIMINADA la validación de "ya tiene respuesta"
        // ✅ Ahora se permiten MÚLTIPLES respuestas al mismo comentario

        const taller = await Taller.findById(tallerId);
        const autor = {
            id: autorId,
            nombre: autorNombre,
            foto: null,  // ✅ NUEVO
            tipo: autorTipo
        };

        // Si es empleado, validar que pertenece al taller
        if (autorTipo === 'EMPLEADO') {
            const empleado = await Empleado.findOne({ _id: autorId, tallerId });
            if (!empleado) {
                return res.status(403).json({ exito: false, mensaje: 'Empleado no encontrado en este taller' });
            }
            autor.nombre = empleado.nombre || autorNombre;
            autor.foto = empleado.fotoPerfil || empleado.foto || null;
            autor.empleadoId = empleado._id;
        }
        // Si es taller
        if (autorTipo === 'TALLER') {
            autor.nombre = taller.nombre || autorNombre;
            autor.foto = taller.logo || null;
            autor.tallerId = taller._id;
        }

        // ✅ Crear respuesta (nodo hijo en el árbol)
        const respuesta = new ComentarioResena({
            citaId: comentarioOriginal.citaId,
            tallerId,
            texto: texto.trim(),
            autor,
            respuestaA: comentarioId,
            // ✅ Calcular nivel para indentación
            nivel: (comentarioOriginal.nivel || 0) + 1,
            // ✅ Referencia al comentario raíz (para búsquedas rápidas)
            comentarioRaizId: comentarioOriginal.comentarioRaizId || comentarioOriginal._id,
            puedeResponder: 'NINGUNO'
        });

        await respuesta.save();

        // ✅ Notificar al taller
        emitirATaller(req, tallerId, 'comentario-respondido', {
            citaId: respuesta.citaId,
            comentarioId: respuesta._id,
            padreId: comentarioId,
            autor: respuesta.autor,
            texto: respuesta.texto,
            fecha: respuesta.fecha
        });

        // ✅ Notificar a los empleados (si el autor es empleado, no se auto-notifica)
        if (autorTipo === 'TALLER' && autorId) {
            emitirAEmpleados(req, [autorId], 'comentario-respondido', {
                citaId: respuesta.citaId,
                comentarioId: respuesta._id,
                padreId: comentarioId,
                autor: respuesta.autor,
                texto: respuesta.texto,
                fecha: respuesta.fecha
            });
        }

        // ✅ NO actualizar "tieneRespuesta" porque eso era para bloquear respuestas
        // (si quieres llevar un contador, usa otro campo)

        console.log('✅ Respuesta anidada creada:', {
            id: respuesta._id,
            padre: comentarioId,
            nivel: respuesta.nivel,
            autor: autor.nombre,
            tipo: autorTipo
        });

        res.json({
            exito: true,
            mensaje: 'Respuesta agregada correctamente',
            respuesta
        });

    } catch (error) {
        console.error('❌ Error al responder comentario:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * POST /:tallerId/comentarios/:comentarioId/like
 * Dar like a un comentario
 */

router.post('/:tallerId/comentarios/:comentarioId/like', async (req, res) => {
    try {
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        const comentario = await ComentarioResena.findById(req.params.comentarioId);

        if (!comentario) {
            return res.status(404).json({ exito: false, mensaje: 'Comentario no encontrado' });
        }

        comentario.likes = (comentario.likes || 0) + 1;
        await comentario.save();

        console.log('✅ Like agregado. Total likes:', comentario.likes);

        res.json({ exito: true, likes: comentario.likes });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * DELETE /:tallerId/comentarios/:comentarioId
 * Eliminar un comentario (taller)
 */

router.delete('/:tallerId/comentarios/:comentarioId', async (req, res) => {
    try {
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        const comentario = await ComentarioResena.findByIdAndDelete(req.params.comentarioId);

        if (!comentario) return res.status(404).json({ exito: false, mensaje: 'Comentario no encontrado' });

        // ✅ Emitir WebSocket
        const citaWS = await CitaTaller.findById(comentario.citaId);
        if (citaWS) {
            const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

            emitirATaller(req, req.params.tallerId, 'comentario-eliminado', {
                comentarioId: comentario._id,
                citaId: comentario.citaId
            });

            emitirAEmpleados(req, empleadosInvolucrados, 'comentario-eliminado', {
                comentarioId: comentario._id,
                citaId: comentario.citaId
            });
        }

        res.json({ exito: true, mensaje: 'Comentario eliminado' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Eliminar respuesta de una reseña
 */
router.delete('/:tallerId/resenas/:resenaId/responder', async (req, res) => {
    try {
        const mongoose = (await import('mongoose')).default;
        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        await CitaTaller.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(req.params.resenaId) },
            {
                $set: {
                    'calificacion.respuesta': '',
                    'calificacion.fechaRespuesta': null
                }
            }
        );

        res.json({ exito: true, mensaje: 'Respuesta eliminada' });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * DELETE /:tallerId/empleado/:empleadoId/comentarios/:comentarioId
 * Empleado elimina su comentario
 */

router.delete('/:tallerId/empleado/:empleadoId/comentarios/:comentarioId', async (req, res) => {
    try {
        const { tallerId, empleadoId, comentarioId } = req.params;

        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId: tallerId
        });

        if (!empleado) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado'
            });
        }

        const ComentarioResena = mongoose.model('ComentarioResena');

        const comentario = await ComentarioResena.findOne({
            _id: comentarioId,
            tallerId: tallerId
        });

        if (!comentario) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Comentario no encontrado'
            });
        }

        // Verificar que el empleado sea el autor
        if (comentario.autor?.id !== empleadoId) {
            return res.status(403).json({
                exito: false,
                mensaje: 'No tienes permiso para eliminar este comentario'
            });
        }

        await comentario.deleteOne();

        // ✅ Emitir WebSocket
        const citaWS = await CitaTaller.findById(comentario.citaId);
        if (citaWS) {
            const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

            emitirATaller(req, tallerId, 'comentario-eliminado', {
                comentarioId: comentario._id,
                citaId: comentario.citaId
            });

            emitirAEmpleados(req, empleadosInvolucrados, 'comentario-eliminado', {
                comentarioId: comentario._id,
                citaId: comentario.citaId
            });
        }

        res.json({
            exito: true,
            mensaje: '✅ Comentario eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ Error al eliminar comentario:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        });
    }
});


// ====================================================================
// 🔹 GRUPO 5: COMENTARIOS ALTERNATIVOS Y REACCIONES
// ====================================================================


/**
 * Obtener reseñas con datos sociales (incluye comentarios del modelo separado)
 */
router.get('/:tallerId/resenas-social', async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            'calificacion.puntuacion': { $exists: true, $gt: 0 }
        })
            .populate('clienteId', 'nombre email fotoPerfil')
            .sort({ 'calificacion.fecha': -1 })
            .lean();

        // Obtener todos los comentarios de estas citas
        const citaIds = citas.map(c => c._id);
        const todosComentarios = await ComentarioResena.find({
            citaId: { $in: citaIds }
        }).sort({ fecha: 1 }).lean();

        // Agrupar comentarios por citaId
        const comentariosPorCita = {};
        todosComentarios.forEach(com => {
            const key = com.citaId.toString();
            if (!comentariosPorCita[key]) comentariosPorCita[key] = [];
            comentariosPorCita[key].push(com);
        });

        const resenas = citas.map(c => ({
            _id: c._id,
            puntuacion: c.calificacion.puntuacion,
            comentario: c.calificacion.comentario || '',
            respuesta: c.calificacion.respuesta || '',
            fechaRespuesta: c.calificacion.fechaRespuesta || null,
            fecha: c.calificacion.fecha || c.fechas?.entrega || c.createdAt,
            fotos: c.fotos?.despues?.map(f => f.url) || [],
            comentarios: comentariosPorCita[c._id.toString()] || [],
            cliente: c.clienteId ? {
                nombre: c.clienteId.nombre,
                email: c.clienteId.email,
                foto: c.clienteId.fotoPerfil
            } : { nombre: 'Cliente' },
            vehiculo: c.vehiculo,
            servicio: c.servicio?.nombre
        }));

        const promedio = resenas.length > 0
            ? resenas.reduce((s, r) => s + r.puntuacion, 0) / resenas.length
            : 0;

        const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        resenas.forEach(r => { if (distribucion[r.puntuacion] !== undefined) distribucion[r.puntuacion]++; });

        console.log(`📊 Reseñas sociales: ${resenas.length} reseñas, ${todosComentarios.length} comentarios`);

        res.json({
            exito: true,
            promedio: Math.round(promedio * 10) / 10,
            total: resenas.length,
            distribucion,
            resenas
        });

    } catch (error) {
        console.error('❌ Error en resenas-social:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
/**
 * POST /:tallerId/resenas/:resenaId/comentar
 * Comentar en una reseña (modelo separado)
 */

router.post('/:tallerId/resenas/:resenaId/comentar', async (req, res) => {
    try {
        const { texto, autor, respuestaA, foto } = req.body;
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        // Validar que tenga texto o foto
        if ((!texto || texto.trim() === '') && !foto) {
            return res.status(400).json({ exito: false, mensaje: 'El comentario debe tener texto o foto' });
        }

        const comentario = new ComentarioResena({
            citaId: req.params.resenaId,
            tallerId: req.params.tallerId,
            texto: texto ? texto.trim() : '',
            foto: foto || null,
            autor: autor || { nombre: 'Usuario' },
            respuestaA: respuestaA || null
        });

        await comentario.save();

        // ✅ Emitir WebSocket
        const citaWS = await CitaTaller.findById(req.params.resenaId);
        const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

        emitirATaller(req, req.params.tallerId, 'comentario-creado', {
            citaId: req.params.resenaId,
            comentarioId: comentario._id,
            autor: comentario.autor,
            texto: comentario.texto,
            respuestaA: respuestaA || null,
            fecha: comentario.fecha
        });

        emitirAEmpleados(req, empleadosInvolucrados, 'comentario-creado', {
            citaId: req.params.resenaId,
            comentarioId: comentario._id,
            autor: comentario.autor,
            texto: comentario.texto,
            respuestaA: respuestaA || null,
            fecha: comentario.fecha
        });

        console.log('✅ Comentario guardado:', comentario._id, foto ? '(con foto)' : '');

        res.json({
            exito: true,
            mensaje: 'Comentario agregado',
            comentario: {
                _id: comentario._id,
                texto: comentario.texto,
                foto: comentario.foto,
                autor: comentario.autor,
                fecha: comentario.fecha,
                likes: comentario.likes
            }
        });

    } catch (error) {
        console.error('❌ Error al comentar:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * POST /:tallerId/resenas/:resenaId/reaccionar
 * Reaccionar a una reseña (❤️ 👍 🙏)
 */

router.post('/:tallerId/resenas/:resenaId/reaccionar', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tipo, userId } = req.body;
        const mongoose = (await import('mongoose')).default;
        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        const uid = userId || 'anon';
        const key = `${uid}_${tipo}`;

        // Primero leer el documento actual
        const cita = await CitaTaller.findById(req.params.resenaId).lean();
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Reseña no encontrada' });

        const reaccionesActuales = cita.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 };
        const usuariosActuales = cita.calificacion?.reaccionesUsuarios || {};

        // Determinar si ya reaccionó
        const yaReacciono = !!usuariosActuales[key];

        if (yaReacciono) {
            // ✅ Quitar reacción con $inc negativo y $unset
            await CitaTaller.collection.updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.resenaId) },
                {
                    $inc: { [`calificacion.reacciones.${tipo}`]: -1 },
                    $unset: { [`calificacion.reaccionesUsuarios.${key}`]: '' }
                }
            );
        } else {
            // ✅ Agregar reacción con $inc positivo y $set
            await CitaTaller.collection.updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.resenaId) },
                {
                    $inc: { [`calificacion.reacciones.${tipo}`]: 1 },
                    $set: { [`calificacion.reaccionesUsuarios.${key}`]: true }
                }
            );
        }

        // Leer el resultado final
        const citaActualizada = await CitaTaller.findById(req.params.resenaId).lean();
        const empleadosInvolucrados = obtenerEmpleadosDeCita(citaActualizada);

        // ✅ Notificar al taller
        emitirATaller(req, req.params.tallerId, 'reaccion-actualizada', {
            resenaId: req.params.resenaId,
            reacciones: citaActualizada.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 }
        });

        // ✅ Notificar a los empleados
        emitirAEmpleados(req, empleadosInvolucrados, 'reaccion-actualizada', {
            resenaId: req.params.resenaId,
            reacciones: citaActualizada.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 }
        });
        res.json({
            exito: true,
            reacciones: citaActualizada.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * GET /:tallerId/resenas/reacciones
 * Obtener reacciones de reseñas
 */

router.get('/:tallerId/resenas/reacciones', async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            'calificacion.puntuacion': { $exists: true, $gt: 0 }
        }).select('calificacion.reacciones').lean();

        const reacciones = {};
        citas.forEach(c => {
            if (c._id) {
                reacciones[c._id] = c.calificacion?.reacciones || { likes: 0, util: 0, gracias: 0 };
            }
        });

        res.json({ exito: true, reacciones });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});




/**
 * Dar like a un comentario
 */
router.post('/:tallerId/resenas/:resenaId/comentarios/:comentarioId/like', async (req, res) => {
    try {
        const { userId } = req.body;
        const ComentarioResena = (await import('../models/ComentarioResena.js')).default;

        const comentario = await ComentarioResena.findById(req.params.comentarioId);
        if (!comentario) return res.status(404).json({ exito: false, mensaje: 'Comentario no encontrado' });

        const uid = userId || 'anon';

        if (comentario.likesUsuarios.includes(uid)) {
            // Quitar like
            comentario.likes = Math.max(0, comentario.likes - 1);
            comentario.likesUsuarios = comentario.likesUsuarios.filter(u => u !== uid);
        } else {
            // Dar like
            comentario.likes += 1;
            comentario.likesUsuarios.push(uid);
        }


        await comentario.save();

        // ✅ Emitir WebSocket
        const citaWS = await CitaTaller.findById(comentario.citaId);
        const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

        emitirATaller(req, req.params.tallerId, 'reaccion-actualizada', {
            comentarioId: comentario._id,
            likes: comentario.likes
        });

        emitirAEmpleados(req, empleadosInvolucrados, 'reaccion-actualizada', {
            comentarioId: comentario._id,
            likes: comentario.likes
        });

        console.log('✅ Like agregado. Total likes:', comentario.likes);

        res.json({ exito: true, likes: comentario.likes });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
/**
 * POST /:tallerId/empleado/:empleadoId/comentarios/:comentarioId/like
 * Empleado da/quita like a un comentario
 */
router.post('/:tallerId/empleado/:empleadoId/comentarios/:comentarioId/like', async (req, res) => {
    try {
        const { tallerId, empleadoId, comentarioId } = req.params;

        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId: tallerId
        });

        if (!empleado) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Empleado no encontrado'
            });
        }

        const ComentarioResena = mongoose.model('ComentarioResena');

        const comentario = await ComentarioResena.findOne({
            _id: comentarioId,
            tallerId: tallerId
        });

        if (!comentario) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Comentario no encontrado'
            });
        }

        // Toggle like
        if (!comentario.likesUsuarios) {
            comentario.likesUsuarios = [];
        }

        const userIndex = comentario.likesUsuarios.indexOf(empleadoId);
        let liked = false;

        if (userIndex === -1) {
            comentario.likesUsuarios.push(empleadoId);
            comentario.likes = (comentario.likes || 0) + 1;
            liked = true;
        } else {
            comentario.likesUsuarios.splice(userIndex, 1);
            comentario.likes = (comentario.likes || 0) - 1;
            liked = false;
        }

        await comentario.save();

        // ✅ Emitir WebSocket
        const citaWS = await CitaTaller.findById(comentario.citaId);
        const empleadosInvolucrados = obtenerEmpleadosDeCita(citaWS);

        emitirATaller(req, tallerId, 'reaccion-actualizada', {
            comentarioId: comentario._id,
            likes: comentario.likes
        });

        emitirAEmpleados(req, empleadosInvolucrados, 'reaccion-actualizada', {
            comentarioId: comentario._id,
            likes: comentario.likes
        });

        res.json({
            exito: true,
            likes: comentario.likes,
            liked: liked
        });

    } catch (error) {
        console.error('❌ Error al dar like:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        });
    }
});




// ====================================================================
// 🔹 GRUPO 6: DEBUG
// ====================================================================


/**
 * GET /:tallerId/empleado/:empleadoId/resenas-debug
 * Endpoint de diagnóstico
 */
router.get('/:tallerId/empleado/:empleadoId/resenas-debug', async (req, res) => {
    try {
        const { tallerId, empleadoId } = req.params;
        const resultados = {};

        // 1. Verificar taller
        try {
            const taller = await Taller.findById(tallerId);
            resultados.taller = taller ? {
                id: taller._id,
                nombre: taller.nombre,
                existe: true
            } : { existe: false };
        } catch (e) {
            resultados.taller = { error: e.message };
        }

        // 2. Verificar empleado
        try {
            const empleado = await Empleado.findOne({ _id: empleadoId, tallerId: tallerId });
            resultados.empleado = empleado ? {
                id: empleado._id,
                nombre: empleado.nombre,
                tallerId: empleado.tallerId,
                existe: true
            } : { existe: false };
        } catch (e) {
            resultados.empleado = { error: e.message };
        }

        // 3. Verificar modelo CitaTaller
        try {
            const Cita = mongoose.model('CitaTaller');
            resultados.modeloCita = { existe: true };

            // Probar una consulta simple
            const count = await Cita.countDocuments({ tallerId: tallerId });
            resultados.totalCitas = count;

            // Citas del empleado
            const citasEmpleado = await Cita.find({
                tallerId: tallerId,
                $or: [
                    { empleadoAsignado: empleadoId },
                    { 'empleadoCompletado.id': empleadoId }
                ]
            }).limit(5);

            resultados.citasEmpleado = citasEmpleado.map(c => ({
                id: c._id,
                estado: c.estado,
                tieneCalificacion: !!(c.calificacion?.puntuacion),
                puntuacion: c.calificacion?.puntuacion || null
            }));

        } catch (e) {
            resultados.modeloCita = { error: e.message };
        }

        // 4. Verificar modelo ComentarioResena
        try {
            const ComentarioResena = mongoose.model('ComentarioResena');
            resultados.modeloComentario = { existe: true };

            const count = await ComentarioResena.countDocuments({ tallerId: tallerId });
            resultados.totalComentarios = count;

        } catch (e) {
            resultados.modeloComentario = { error: e.message };
        }

        res.json({
            exito: true,
            debug: resultados
        });

    } catch (error) {
        console.error('❌ Error en debug:', error);
        res.status(500).json({
            exito: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// ====================================================================
// 🔹 EXPORT
// ====================================================================

export default router;