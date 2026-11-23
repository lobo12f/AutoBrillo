import express from 'express';
import mongoose from 'mongoose';
import Cita from '../models/citaModel.js';
import Usuario from '../models/personaModel.js';
import Taller from '../models/Taller.js';
import { calcularFechaExpiracion, marcarCitasExpiradas } from '../utils/citasHelpers.js';
import { buscarHorariosAlternativos, buscarEmpleadoDisponible } from '../utils/horariosHelpers.js';
import CitaTaller from '../models/CitaTaller.js';

const router = express.Router();

// ================================================================
// 🔹 CREAR CITA (POST) - Con WebSocket
// ================================================================

// ================================================================
// 🔹 CREAR CITA (POST) - Con validaciones Fase 2
// ================================================================
router.post('/', async (req, res) => {
    console.log('═══════════════════════════════════════════');
    console.log('🚀 POST /citas RECIBIDO');
    console.log('   body:', JSON.stringify(req.body, null, 2));
    console.log('═══════════════════════════════════════════');

    await marcarCitasExpiradas();

    try {
        const { usuarioId, datosCita } = req.body;
        if (!usuarioId || !datosCita) {
            return res.status(400).json({ exito: false, mensaje: 'Faltan datos' });
        }

        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }

        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        // 1. Crear Checklist
        const checklistServicios = [];
        if (datosCita.servicio) {
            checklistServicios.push({ nombre: datosCita.servicio, completado: false, fechaCompletado: null, completadoPor: null, notas: '' });
        }
        if (datosCita.servicios && Array.isArray(datosCita.servicios)) {
            datosCita.servicios.forEach(s => {
                const nombreServicio = typeof s === 'string' ? s : s.nombre;
                if (nombreServicio && nombreServicio !== datosCita.servicio) {
                    checklistServicios.push({ nombre: nombreServicio, completado: false, fechaCompletado: null, completadoPor: null, notas: '' });
                }
            });
        }
        if (checklistServicios.length === 0) {
            checklistServicios.push({ nombre: 'Servicio General', completado: false, fechaCompletado: null, completadoPor: null, notas: '' });
        }

        // 2. Validaciones
        const tallerObjId = new mongoose.Types.ObjectId(datosCita.tallerId);
        const tallerInfo = await Taller.findById(datosCita.tallerId).lean();
        if (!tallerInfo) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const [year, month, day] = datosCita.fecha.split('-').map(Number);
        const fechaObj = new Date(year, month - 1, day);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const nombreDia = diasSemana[fechaObj.getDay()];
        const configDia = tallerInfo.horario?.[nombreDia];

        if (!configDia?.apertura || !configDia?.cierre) {
            return res.status(409).json({
                exito: false, conflictos: true, tipo: 'TALLER_CERRADO',
                mensaje: `El taller no abre los ${nombreDia}s. Elige otro día.`,
                alternativas: [], otrosEmpleados: []
            });
        }

        // V2: Vehículo duplicado (SOLO CONFIRMADAS BLOQUEAN)
        const citaVehiculoExistente = await CitaTaller.findOne({
            tallerId: tallerObjId,
            'vehiculo.placa': datosCita.vehiculo?.placa,
            fecha: datosCita.fecha,
            hora: datosCita.hora,
            estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] } // ⭐ CORREGIDO
        });

        if (citaVehiculoExistente) {
            const resultado = await buscarHorariosAlternativos(datosCita.tallerId, datosCita.fecha, datosCita.hora, datosCita.vehiculo.placa, datosCita.empleadoPreferidoId);
            return res.status(409).json({
                exito: false, conflictos: true, tipo: 'VEHICULO_OCUPADO',
                mensaje: `Tu vehículo ya tiene una cita a las ${datosCita.hora}`,
                alternativas: resultado.alternativas || [], otrosEmpleados: resultado.otrosEmpleados || []
            });
        }

        // V3: Bahías llenas (SOLO CONFIRMADAS BLOQUEAN)
        const bahiasTotales = tallerInfo.bahias?.length || 0;
        const citasConfirmadas = await CitaTaller.countDocuments({
            tallerId: tallerObjId,
            fecha: datosCita.fecha,
            hora: datosCita.hora,
            estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] } // ⭐ CORREGIDO
        });

        if (citasConfirmadas >= bahiasTotales) {
            const resultado = await buscarHorariosAlternativos(datosCita.tallerId, datosCita.fecha, datosCita.hora, datosCita.vehiculo.placa, datosCita.empleadoPreferidoId);
            return res.status(409).json({
                exito: false, conflictos: true, tipo: 'SIN_BAHIAS',
                mensaje: `No hay bahías disponibles a las ${datosCita.hora}`,
                alternativas: resultado.alternativas || [], otrosEmpleados: resultado.otrosEmpleados || []
            });
        }

        // V4: Empleado ocupado (SOLO CONFIRMADAS BLOQUEAN)
        if (datosCita.empleadoPreferidoId) {
            const empleadoOcupado = await CitaTaller.findOne({
                tallerId: tallerObjId,
                $or: [
                    { empleadoAsignado: new mongoose.Types.ObjectId(datosCita.empleadoPreferidoId) },
                    { empleadoPreferidoId: new mongoose.Types.ObjectId(datosCita.empleadoPreferidoId) }
                ],
                fecha: datosCita.fecha,
                hora: datosCita.hora,
                estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] } // ⭐ CORREGIDO
            });

            if (empleadoOcupado) {
                // Si el empleado preferido está ocupado, el sistema avisa pero NO bloquea. 
                // El cliente puede unirse a la lista de espera.
                datosCita.notas = (datosCita.notas || '') + ` | Nota: Empleado preferido estaba ocupado.`;
                datosCita.enEspera = true;
            }
        }

        // ⭐ NUEVO: Verificar si hay citas PENDIENTES (para lista de espera)
        const citasPendientes = await CitaTaller.countDocuments({
            tallerId: tallerObjId,
            fecha: datosCita.fecha,
            hora: datosCita.hora,
            estado: 'PENDIENTE'
        });

        if (citasPendientes > 0) {
            datosCita.enEspera = true; // Si hay pendientes, se une a la lista
        }

        // 3. Crear Cita
        const nuevaCita = new CitaTaller({
            tallerId: datosCita.tallerId,
            clienteId: usuarioId,
            vehiculo: datosCita.vehiculo || {},
            servicio: { nombre: datosCita.servicio || 'Servicio', precio: datosCita.montoPagado || 0, duracionEstimada: datosCita.duracionEstimada || 60 },
            checklistServicios: checklistServicios,
            fecha: datosCita.fecha,
            hora: datosCita.hora,
            estado: 'PENDIENTE',
            fechaExpiracion: calcularFechaExpiracion(datosCita.fecha, datosCita.hora),
            empleadoPreferidoId: datosCita.empleadoPreferidoId || null,
            empleadoPreferidoNombre: datosCita.empleadoPreferidoNombre || null,
            fechas: { cita: new Date(`${datosCita.fecha}T${datosCita.hora}:00`), agendamiento: new Date() },
            pago: { metodo: datosCita.metodoPago || 'SALDO', monto: datosCita.montoPagado || 0, pagado: false },
            notas: [{ autor: 'SISTEMA', texto: datosCita.notas || 'Agendado por cliente', fecha: new Date() }]
        });

        await nuevaCita.save();
        console.log(`⏰ Cita expira: ${nuevaCita.fechaExpiracion.toLocaleString('es-DO')}`);
        console.log('✅ Cita creada:', nuevaCita._id);

        // Guardar en usuario
        usuario.misCitas.push({
            _id: nuevaCita._id, id: Date.now(), vehiculo: datosCita.vehiculo || {},
            fecha: datosCita.fecha, hora: datosCita.hora, sucursal: datosCita.sucursal || 'Principal',
            estado: 'PENDIENTE', servicio: datosCita.servicio || '', metodoPago: datosCita.metodoPago || 'SALDO',
            montoPagado: datosCita.montoPagado || 0, pagado: false, fechaRegistro: new Date().toLocaleString('es-DO'),
            tallerId: datosCita.tallerId
        });
        await usuario.save();

        // Notificar al taller
        if (datosCita.tallerId) {
            try {
                const NotificacionTaller = (await import('../models/NotificacionTaller.js')).default;
                await new NotificacionTaller({
                    tallerId: datosCita.tallerId, tipo: 'NUEVA_CITA', titulo: '📅 Nueva Cita Recibida',
                    mensaje: `${datosCita.vehiculo?.marca || 'Vehículo'} ${datosCita.vehiculo?.modelo || ''} (${datosCita.vehiculo?.placa || 'S/P'}) - ${datosCita.fecha} ${datosCita.hora}`,
                    detalle: { citaId: nuevaCita._id, fecha: datosCita.fecha, vehiculo: `${datosCita.vehiculo?.marca || ''} ${datosCita.vehiculo?.modelo || ''}`.trim(), servicio: datosCita.servicio || '' },
                    prioridad: 'media', leida: false, fecha: new Date()
                }).save();
            } catch (err) { }
        }

        if (req.io && datosCita.tallerId) {
            req.io.to(`taller-${datosCita.tallerId}`).emit('nueva-notificacion', {
                tipo: 'NUEVA_CITA', titulo: '📅 Nueva Cita Recibida',
                mensaje: `${datosCita.vehiculo?.marca || 'Vehículo'} ${datosCita.vehiculo?.modelo || ''} (${datosCita.vehiculo?.placa || 'S/P'}) - ${datosCita.fecha} ${datosCita.hora}`
            });
        }

        res.status(201).json({ exito: true, mensaje: 'Cita creada', usuario: await Usuario.findById(usuarioId).select('-password'), cita: nuevaCita });

    } catch (error) {
        console.error('❌ Error al crear cita:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
// ================================================================
// 🔹 CANCELAR CITA (PUT) - Con WebSocket
// ================================================================

router.put('/:id/cancelar', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuarioId, motivo } = req.body;

        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const NotificacionTaller = (await import('../models/NotificacionTaller.js')).default;

        const cita = await CitaTaller.findById(id);
        if (!cita) {
            return res.status(404).json({ exito: false, mensaje: "Cita no encontrada" });
        }

        cita.estado = 'CANCELADA';
        cita.notas.push({
            autor: 'CLIENTE',
            texto: `Cancelada por el cliente. Motivo: ${motivo || 'No especificado'}`,
            fecha: new Date()
        });
        await cita.save();

        // Crear notificación para el taller
        let notificacionCreada = null;
        if (cita.tallerId) {
            try {
                const notificacion = new NotificacionTaller({
                    tallerId: cita.tallerId,
                    tipo: 'CITA_CANCELADA',
                    titulo: '❌ Cita Cancelada por Cliente',
                    mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) - ${cita.fecha} ${cita.hora}`,
                    detalle: {
                        citaId: cita._id,
                        fecha: cita.fecha,
                        vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim(),
                        motivoCancelacion: motivo || 'No especificado'
                    },
                    prioridad: 'alta',
                    leida: false,
                    fecha: new Date()
                });
                notificacionCreada = await notificacion.save();
                console.log('🔔 Notificación CITA_CANCELADA creada para el taller');
            } catch (notifError) {
                console.error('❌ Error al crear notificación de cancelación:', notifError);
            }
        }

        // ✅ EMITIR EVENTO WEBSOCKET AL TALLER
        if (req.io && cita.tallerId) {
            req.io.to(`taller-${cita.tallerId}`).emit('nueva-notificacion', {
                tipo: 'CITA_CANCELADA',
                titulo: '❌ Cita Cancelada por Cliente',
                mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) - ${cita.fecha} ${cita.hora}`,
                notificacion: notificacionCreada || null
            });
            console.log('📡 WebSocket emitido al taller:', cita.tallerId);
        }

        res.json({ exito: true, mensaje: "Cita cancelada" });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ================================================================
// 🔹 OBTENER TODAS LAS CITAS (ADMIN)
// ================================================================

router.get('/', async (req, res) => {
    try {
        const citas = await Cita.find().populate('usuarioId', 'nombre email').sort({ fecha: -1 });
        res.json({ exito: true, citas });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ================================================================
// 🔹 CLIENTE CONFIRMA ENTREGA (PUT) - Con WebSocket
// ================================================================

router.put('/:id/confirmar-entrega', async (req, res) => {
    try {
        const { id } = req.params;
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const NotificacionTaller = (await import('../models/NotificacionTaller.js')).default;

        const cita = await CitaTaller.findById(id);
        if (!cita) {
            return res.status(404).json({ exito: false, mensaje: "Cita no encontrada" });
        }

        if (cita.estado !== 'LISTO') {
            return res.status(400).json({ exito: false, mensaje: "La cita no está lista para entregar" });
        }

        cita.estado = 'ENTREGADO';
        cita.fechas.entrega = new Date();
        cita.notas.push({
            autor: 'CLIENTE',
            texto: '✅ Cliente confirmó recepción del vehículo',
            fecha: new Date()
        });
        await cita.save();

        // Crear notificación para el taller
        let notificacionCreada = null;
        if (cita.tallerId) {
            try {
                const notificacion = new NotificacionTaller({
                    tallerId: cita.tallerId,
                    tipo: 'VEHICULO_ENTREGADO',
                    titulo: '🚗 Vehículo Entregado al Cliente',
                    mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) ha sido entregado`,
                    detalle: {
                        citaId: cita._id,
                        fecha: cita.fecha,
                        vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim()
                    },
                    prioridad: 'media',
                    leida: false,
                    fecha: new Date()
                });
                notificacionCreada = await notificacion.save();
                console.log('🔔 Notificación VEHICULO_ENTREGADO creada para el taller');
            } catch (notifError) {
                console.error('❌ Error al crear notificación de entrega:', notifError);
            }
        }

        // ✅ EMITIR EVENTO WEBSOCKET AL TALLER
        if (req.io && cita.tallerId) {
            req.io.to(`taller-${cita.tallerId}`).emit('nueva-notificacion', {
                tipo: 'VEHICULO_ENTREGADO',
                titulo: '🚗 Vehículo Entregado al Cliente',
                mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) ha sido entregado`,
                notificacion: notificacionCreada || null
            });
            console.log('📡 WebSocket emitido al taller:', cita.tallerId);
        }

        res.json({ exito: true, mensaje: "Entrega confirmada", cita });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

export default router;