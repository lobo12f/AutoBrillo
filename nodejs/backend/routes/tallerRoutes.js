import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Taller from '../models/Taller.js';
import Propietario from '../models/Propietario.js';
import Empleado from '../models/Empleado.js';
import CitaTaller from '../models/CitaTaller.js';
import Usuario from '../models/personaModel.js';
import Comision from '../models/Comision.js';
import PagoEmpleado from '../models/PagoEmpleado.js';
import NotificacionTaller from '../models/NotificacionTaller.js';
import { generarToken, verificarToken } from '../middleware/auth.js';
import { horaAMinutos, minutosAHora, buscarHorariosAlternativos } from '../utils/horariosHelpers.js';
import { verificarPropietarioTaller, verificarPropietarioEmpleado, verificarPropietarioCita, verificarPropietarioCliente } from '../middleware/verificarPropiedad.js';
const router = express.Router();

// ====================================================================
// 🔹 GRUPO 1: RUTAS FIJAS (SIN PARÁMETROS DINÁMICOS)
// ====================================================================

// Registro de taller
router.post('/registro', async (req, res) => {
    try {
        const { nombre, telefono, email, direccion, especialidad, plan, propietario } = req.body;
        console.log('📝 Registro:', { nombre, email, plan });

        if (!nombre || !email || !propietario?.nombre || !propietario?.email || !propietario?.password) {
            return res.status(400).json({ exito: false, mensaje: 'Faltan campos requeridos.' });
        }

        const tallerExistente = await Taller.findOne({ email });
        if (tallerExistente) return res.status(400).json({ exito: false, mensaje: 'Ya existe un taller con ese email.' });

        const propietarioExistente = await Propietario.findOne({ email: propietario.email });
        if (propietarioExistente) return res.status(400).json({ exito: false, mensaje: 'Ya existe un propietario con ese email.' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(propietario.password, salt);

        const nuevoPropietario = new Propietario({
            nombre: propietario.nombre,
            email: propietario.email,
            password: passwordHash,
            tipoPlan: plan || 'BASICO',
            maxTalleres: plan === 'BASICO' ? 1 : plan === 'PROFESIONAL' ? 3 : 10,
            maxEmpleados: plan === 'BASICO' ? 3 : plan === 'PROFESIONAL' ? 10 : 999
        });
        const propietarioGuardado = await nuevoPropietario.save();

        const nuevoTaller = new Taller({
            nombre, telefono: telefono || '', email,
            direccion: {
                calle: direccion?.calle || '',
                ciudad: direccion?.ciudad || '',
                provincia: direccion?.provincia || '',
                coordenadas: {
                    lat: direccion?.coordenadas?.lat || null,
                    lng: direccion?.coordenadas?.lng || null
                }
            },
            especialidad: especialidad || 'GENERAL',
            propietarioId: propietarioGuardado._id,
            bahias: [{ numero: 1, nombre: 'Bahía Principal', tipo: 'GENERAL', estado: 'DISPONIBLE' }]
        });
        const tallerGuardado = await nuevoTaller.save();

        propietarioGuardado.talleres.push(tallerGuardado._id);
        await propietarioGuardado.save();

        res.status(201).json({
            exito: true, mensaje: 'Taller registrado exitosamente',
            taller: {
                _id: tallerGuardado._id, nombre: tallerGuardado.nombre, email: tallerGuardado.email,
                telefono: tallerGuardado.telefono, direccion: tallerGuardado.direccion,
                especialidad: tallerGuardado.especialidad, bahias: tallerGuardado.bahias, estado: tallerGuardado.estado,
                propietario: { _id: propietarioGuardado._id, nombre: propietarioGuardado.nombre, email: propietarioGuardado.email, tipoPlan: propietarioGuardado.tipoPlan }
            }
        });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        if (error.name === 'ValidationError') {
            const mensajes = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ exito: false, mensaje: 'Error de validación: ' + mensajes.join(', ') });
        }
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor.' });
    }
});

// Login de taller
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ exito: false, mensaje: 'Email y contraseña son requeridos.' });

        const emailLower = email.toLowerCase().trim();

        // 1. Login como Propietario (contraseña del propietario)
        const propietario = await Propietario.findOne({ email: emailLower });
        if (propietario && await bcrypt.compare(password, propietario.password)) {
            const taller = await Taller.findOne({ propietarioId: propietario._id });
            if (taller) {
                // ✅ GENERAR TOKEN
                const token = generarToken({
                    id: taller._id.toString(),
                    tipo: 'TALLER',
                    rol: 'PROPIETARIO',
                    tallerId: taller._id.toString(),
                    propietarioId: propietario._id.toString()
                });

                return res.json({
                    exito: true,
                    token,                                  // ✅ AÑADIDO
                    rol: 'PROPIETARIO',
                    _id: taller._id,
                    ...taller.toObject(),
                    propietario: {
                        _id: propietario._id,
                        nombre: propietario.nombre,
                        email: propietario.email,
                        tipoPlan: propietario.tipoPlan
                    }
                });
            }
        }

        // 2. Login como Empleado
        const empleado = await Empleado.findOne({ email: emailLower });
        if (empleado && await bcrypt.compare(password, empleado.password)) {
            const taller = await Taller.findById(empleado.tallerId).populate('propietarioId');
            if (taller) {
                // ✅ GENERAR TOKEN
                const token = generarToken({
                    id: empleado._id.toString(),
                    tipo: 'EMPLEADO',
                    rol: empleado.rol || 'LAVADOR',
                    tallerId: taller._id.toString(),
                    empleadoId: empleado._id.toString()
                });

                return res.json({
                    exito: true,
                    token,                                  // ✅ AÑADIDO
                    rol: empleado.rol || 'LAVADOR',
                    empleadoId: empleado._id,
                    _id: taller._id,
                    ...taller.toObject(),
                    propietario: {
                        _id: taller.propietarioId?._id,
                        nombre: taller.propietarioId?.nombre
                    }
                });
            }
        }

        // 3. Login con contraseña del Taller (busca por propietario)
        const taller = await Taller.findOne({ email: emailLower }).populate('propietarioId');
        if (taller) {
            const prop = await Propietario.findById(taller.propietarioId);
            if (prop && await bcrypt.compare(password, prop.password)) {
                // ✅ GENERAR TOKEN
                const token = generarToken({
                    id: taller._id.toString(),
                    tipo: 'TALLER',
                    rol: 'PROPIETARIO',
                    tallerId: taller._id.toString(),
                    propietarioId: prop._id.toString()
                });

                return res.json({
                    exito: true,
                    token,                                  // ✅ AÑADIDO
                    rol: 'PROPIETARIO',
                    _id: taller._id,
                    ...taller.toObject(),
                    propietario: {
                        _id: prop._id,
                        nombre: prop.nombre,
                        email: prop.email,
                        tipoPlan: prop.tipoPlan
                    }
                });
            }
        }

        // ✅ 4. Login directo con contraseña del taller (NUEVO)
        const tallerDirecto = await Taller.findOne({ email: emailLower });
        if (tallerDirecto && tallerDirecto.password && await tallerDirecto.compararPassword(password)) {
            const prop = await Propietario.findById(tallerDirecto.propietarioId);

            // ✅ GENERAR TOKEN
            const token = generarToken({
                id: tallerDirecto._id.toString(),
                tipo: 'TALLER',
                rol: 'PROPIETARIO',
                tallerId: tallerDirecto._id.toString(),
                propietarioId: prop?._id?.toString()
            });

            return res.json({
                exito: true,
                token,                                      // ✅ AÑADIDO
                rol: 'PROPIETARIO',
                _id: tallerDirecto._id,
                ...tallerDirecto.toObject(),
                propietario: prop ? {
                    _id: prop._id,
                    nombre: prop.nombre,
                    email: prop.email,
                    tipoPlan: prop.tipoPlan
                } : null
            });
        }

        return res.status(401).json({ exito: false, mensaje: 'Email o contraseña incorrectos.' });
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor.' });
    }
});
/**
 * Actualizar coordenadas del taller
 */
router.put('/:tallerId/coordenadas', verificarToken, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const Taller = (await import('../models/Taller.js')).default;

        const taller = await Taller.findByIdAndUpdate(
            req.params.tallerId,
            {
                $set: {
                    'direccion.coordenadas.lat': lat,
                    'direccion.coordenadas.lng': lng
                }
            },
            { new: true }
        );

        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        res.json({ exito: true, mensaje: 'Coordenadas actualizadas', taller });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Reverse geocoding - Obtener dirección desde coordenadas
 */
router.get('/geocodificar/reverse', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ exito: false, mensaje: 'Se requieren lat y lng' });
        }

        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const response = await fetch(url, { headers: { 'User-Agent': 'AutoBrilloApp/1.0' } });
        const data = await response.json();

        res.json({
            exito: true,
            direccion: data.display_name || '',
            datos: data
        });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Geocodificar dirección - Obtener coordenadas
 */
router.get('/geocodificar/buscar', async (req, res) => {
    try {
        const { direccion } = req.query;

        if (!direccion) {
            return res.status(400).json({ exito: false, mensaje: 'Se requiere dirección' });
        }

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AutoBrilloApp/1.0'
            }
        });
        const data = await response.json();

        if (data && data.length > 0) {
            res.json({
                exito: true,
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                direccion: data[0].display_name
            });
        } else {
            res.json({ exito: false, mensaje: 'No se encontró la dirección' });
        }

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Guardar configuración completa del taller
 */
router.put('/:tallerId/configuracion', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { nombre, email, telefono, especialidad, direccion, horario, logo, descripcion, metodosPago, tiposVehiculos } = req.body;

        console.log('📝 Guardando configuración:', { nombre, logo: logo ? 'SI' : 'NO', descripcion: descripcion || '(vacía)', metodosPago });

        // ✅ Construir objeto con SOLO los campos a actualizar
        const updateData = {};

        if (nombre) updateData.nombre = nombre;
        if (email) updateData.email = email;
        if (telefono) updateData.telefono = telefono;
        if (especialidad) updateData.especialidad = especialidad;

        // ✅ NUEVOS CAMPOS - Siempre incluirlos si vienen en el body
        if (logo !== undefined) updateData.logo = logo;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (metodosPago) updateData.metodosPago = metodosPago;
        if (tiposVehiculos) updateData.tiposVehiculos = tiposVehiculos;
        if (direccion) updateData.direccion = direccion;
        if (horario) updateData.horario = horario;

        updateData['metadata.ultimaActualizacion'] = new Date();

        // ✅ Usar findByIdAndUpdate con $set (más confiable que save())
        const taller = await Taller.findByIdAndUpdate(
            req.params.tallerId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        // ✅ Logs para verificar
        console.log('✅ Configuración guardada:', taller.nombre);
        console.log('   Logo:', taller.logo || 'NO');
        console.log('   Descripción:', taller.descripcion || '(vacía)');
        console.log('   Métodos pago:', taller.metodosPago?.length || 0);

        res.json({ exito: true, mensaje: 'Configuración guardada', taller });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Talleres activos
router.get('/activos', async (req, res) => {
    try {
        const talleres = await Taller.find({ estado: 'ACTIVO' }).select('nombre email telefono direccion especialidad bahias calificacion').sort({ nombre: 1 });
        res.json({ exito: true, talleres, total: talleres.length });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al cargar talleres activos.' });
    }
});

/**
 * Actualizar perfil del empleado + emitir evento en tiempo real
 */
router.put('/empleados/:empleadoId/perfil', verificarToken, verificarPropietarioEmpleado, async (req, res) => {
    // ✅ Verificar que el token corresponde al empleadoId de la ruta
    if (req.usuario.tipo === 'EMPLEADO' && req.usuario.empleadoId !== req.params.empleadoId) {
        return res.status(403).json({ exito: false, mensaje: 'No puedes editar el perfil de otro empleado' });
    }
    try {
        const { nombre, telefono, fotoPerfil, horario } = req.body;
        const empleado = await Empleado.findById(req.params.empleadoId);

        if (!empleado) {
            return res.status(404).json({ exito: false, mensaje: 'Empleado no encontrado' });
        }

        // Actualizar solo lo que viene
        if (nombre) empleado.nombre = nombre;
        if (telefono !== undefined) empleado.telefono = telefono;
        if (fotoPerfil !== undefined) empleado.fotoPerfil = fotoPerfil;
        if (horario) {
            empleado.horario = {
                inicio: horario.inicio || empleado.horario?.inicio || '08:00',
                fin: horario.fin || empleado.horario?.fin || '17:00'
            };
        }

        await empleado.save();

        const { password: _, ...empleadoSeguro } = empleado.toObject();

        // ✅ EMITIR EVENTO POR WEBSOCKET
        if (req.io) {
            const payload = {
                tipo: 'EMPLEADO',
                id: empleado._id.toString(),
                tallerId: empleado.tallerId.toString(),
                cambios: {
                    nombre: empleado.nombre,
                    telefono: empleado.telefono,
                    fotoPerfil: empleado.fotoPerfil,
                    horario: empleado.horario
                }
            };

            // Al taller (dashboard del propietario)
            // req.io.to(`taller-${empleado.tallerId}`).emit('perfil-actualizado', payload);

            // Al empleado mismo (dashboard del empleado)
            req.io.to(`empleado-${empleado._id}`).emit('perfil-actualizado', payload);
            // ✅ Al TALLER (para que su dashboard actualice la foto del empleado)
            req.io.to(`taller-${empleado.tallerId}`).emit('perfil-actualizado', payload);

            console.log('📡 [perfil-actualizado] Emitido a:', {
                taller: `taller-${empleado.tallerId}`,
                empleado: `empleado-${empleado._id}`,
                cambios: payload.cambios
            });
        } else {
            console.warn('⚠️ req.io no disponible, no se emitió evento');
        }

        res.json({ exito: true, mensaje: 'Perfil actualizado', empleado: empleadoSeguro });
    } catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Cambiar contraseña del empleado
router.put('/empleados/:empleadoId/password', verificarToken, verificarPropietarioEmpleado, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        const empleado = await Empleado.findById(req.params.empleadoId);

        if (!empleado) {
            return res.status(404).json({ exito: false, mensaje: 'Empleado no encontrado' });
        }

        const esValida = await empleado.compararPassword(passwordActual);
        if (!esValida) {
            return res.status(401).json({ exito: false, mensaje: 'Contraseña actual incorrecta' });
        }

        empleado.password = passwordNueva;
        await empleado.save();

        res.json({ exito: true, mensaje: 'Contraseña actualizada' });
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
// Talleres disponibles para clientes
// ====================================================================
// GET /api/talleres/disponibles?lat=XX&lng=YY&radio=50
// → Filtra talleres por ubicación geográfica
// ====================================================================
router.get('/disponibles', async (req, res) => {
    try {
        const { ciudad, provincia, especialidad, lat, lng, radio = 50 } = req.query;

        const filtros = { estado: 'ACTIVO' };
        if (ciudad) filtros['direccion.ciudad'] = ciudad;
        if (provincia) filtros['direccion.provincia'] = provincia;
        if (especialidad) filtros.especialidad = especialidad;

        let talleres = await Taller.find(filtros)
            .select('-empleados')
            .populate('propietarioId', 'nombre tipoPlan')
            .lean();

        // ⭐ FILTRAR POR DISTANCIA (si el cliente envió su ubicación)
        if (lat && lng) {
            const latCliente = parseFloat(lat);
            const lngCliente = parseFloat(lng);
            const radioKm = parseFloat(radio);

            console.log(`📍 Filtrando talleres a ${radioKm}km de (${latCliente}, ${lngCliente})`);

            // Fórmula de Haversine para calcular distancia
            const calcularDistancia = (lat1, lon1, lat2, lon2) => {
                const R = 6371; // Radio de la Tierra en km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };

            talleres = talleres
                .map(t => {
                    const latTaller = t.direccion?.coordenadas?.lat;
                    const lngTaller = t.direccion?.coordenadas?.lng;

                    if (latTaller && lngTaller) {
                        const distancia = calcularDistancia(latCliente, lngCliente, latTaller, lngTaller);
                        return { ...t, distanciaKm: Math.round(distancia * 10) / 10 };
                    }
                    return { ...t, distanciaKm: null };
                })
                .filter(t => t.distanciaKm !== null && t.distanciaKm <= radioKm)
                .sort((a, b) => a.distanciaKm - b.distanciaKm);

            console.log(`   Encontrados ${talleres.length} talleres en el radio`);
        }

        const talleresConDisponibilidad = talleres.map(taller => ({
            ...taller,
            bahiasDisponibles: (taller.bahias || []).filter(b => b.estado === 'DISPONIBLE').length,
            calificacion: {
                promedio: taller.calificacion?.promedio || 0,
                totalReseñas: taller.calificacion?.totalReseñas || 0
            }
        }));

        res.json({ exito: true, talleres: talleresConDisponibilidad, total: talleresConDisponibilidad.length });

    } catch (error) {
        console.error('❌ Error al cargar talleres:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar talleres' });
    }
});

// Ruta de prueba para fotos
router.get('/test/fotos', async (req, res) => {
    try {
        const citas = await CitaTaller.find({
            $or: [
                { 'fotos.antes': { $exists: true, $not: { $size: 0 } } },
                { 'fotos.despues': { $exists: true, $not: { $size: 0 } } }
            ]
        }).select('fotos vehiculo estado').limit(10);
        res.json({ exito: true, total: citas.length, citas });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 🔹 GRUPO 2: AUTENTICACIÓN DE EMPLEADOS (FIJAS)
// ====================================================================

// Login de empleado
router.post('/empleados/login', async (req, res) => {
    try {
        const { email, password, tallerId } = req.body;
        if (!email || !password || !tallerId) {
            return res.status(400).json({ exito: false, mensaje: 'Email, contraseña y taller son requeridos.' });
        }

        const empleado = await Empleado.findOne({
            email: email.toLowerCase(),
            tallerId,
            estado: { $ne: 'INACTIVO' }
        });

        if (!empleado) return res.status(401).json({ exito: false, mensaje: 'Empleado no encontrado en este taller.' });

        const passwordCorrecto = await empleado.compararPassword(password);
        if (!passwordCorrecto) return res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta.' });

        empleado.ultimoAcceso = new Date();
        empleado.estado = 'DISPONIBLE';
        await empleado.save();

        const taller = await Taller.findById(tallerId).select('nombre direccion');
        const permisos = {
            LAVADOR: { puedeVerTodasCitas: false, puedeCambiarEstados: true, puedeSubirFotos: true },
            DETALLADOR: { puedeVerTodasCitas: false, puedeCambiarEstados: true, puedeSubirFotos: true },
            SUPERVISOR: { puedeVerTodasCitas: true, puedeCambiarEstados: true, puedeSubirFotos: true, puedeGestionarEmpleados: true },
            ADMIN: { puedeVerTodasCitas: true, puedeCambiarEstados: true, puedeSubirFotos: true, puedeGestionarEmpleados: true, puedeConfigurarTaller: true }
        }[empleado.rol] || {};

        const { password: _, ...emp } = empleado.toObject();

        // ✅ GENERAR TOKEN
        const token = generarToken({
            id: empleado._id.toString(),
            tipo: 'EMPLEADO',
            rol: empleado.rol,
            tallerId: tallerId,
            empleadoId: empleado._id.toString()
        });

        res.json({
            exito: true,
            token,                                          // ✅ AÑADIDO
            empleado: { ...emp, taller },
            permisos
        });
    } catch (error) {
        console.error('❌ Error en login de empleado:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al iniciar sesión.' });
    }
});

// Registrar empleado
// ==================== REGISTRAR EMPLEADO ====================
router.post('/empleados/registro', async (req, res) => {
    try {
        const { nombre, email, password, tallerId, rol, especialidades, telefono, fotoPerfil } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password || !tallerId) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Faltan campos requeridos: nombre, email, password, tallerId'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                exito: false,
                mensaje: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar que el taller existe
        const taller = await Taller.findById(tallerId);
        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        // Verificar si ya existe un empleado con ese email en este taller
        const existe = await Empleado.findOne({
            email: email.toLowerCase().trim(),
            tallerId
        });
        if (existe) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Ya existe un empleado con ese email en este taller'
            });
        }

        // Crear empleado
        const nuevoEmpleado = new Empleado({
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            tallerId,
            rol: rol || 'LAVADOR',
            especialidades: especialidades || [],
            fotoPerfil: fotoPerfil || null, // ✅ NUEVO
            telefono: telefono || '',
            estado: 'DISPONIBLE'
        });

        await nuevoEmpleado.save();

        // Vincular al taller
        if (!taller.empleados.includes(nuevoEmpleado._id)) {
            taller.empleados.push(nuevoEmpleado._id);
            await taller.save();
        }

        // Responder sin la contraseña
        const { password: _, ...empleadoSeguro } = nuevoEmpleado.toObject();

        res.status(201).json({
            exito: true,
            mensaje: 'Empleado registrado exitosamente',
            empleado: empleadoSeguro
        });

    } catch (error) {
        console.error('❌ Error al registrar empleado:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Ya existe un empleado con ese email'
            });
        }
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
});

// ====================================================================
// 🔹 GRUPO 3: CITAS (FIJAS)
// ====================================================================

// Agendar cita en taller
/*router.post('/citas/agendar', async (req, res) => {
    try {
        const { tallerId, clienteId, vehiculo, servicio, fecha, hora, metodoPago, montoPagado, notas } = req.body;

        // ✅ VALIDAR tallerId
        if (!tallerId || !mongoose.Types.ObjectId.isValid(tallerId)) {
            return res.status(400).json({ exito: false, mensaje: 'tallerId inválido' });
        }

        const taller = await Taller.findById(tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        // ✅ Convertir a ObjectId
        const tallerIdObj = new mongoose.Types.ObjectId(tallerId);
        const clienteIdObj = clienteId && mongoose.Types.ObjectId.isValid(clienteId)
            ? new mongoose.Types.ObjectId(clienteId)
            : null;

        const nuevaCita = new CitaTaller({
            tallerId: tallerIdObj,
            clienteId: clienteIdObj,
            vehiculo: {
                marca: vehiculo?.marca || 'Genérico',
                modelo: vehiculo?.modelo || 'Modelo',
                placa: vehiculo?.placa || 'S/P',
                color: vehiculo?.color || ''
            },
            servicio: {
                nombre: servicio?.nombre || 'Servicio',
                precio: servicio?.precio || 0
            },
            fecha,
            hora,
            estado: 'PENDIENTE',
            fechas: {
                cita: new Date(`${fecha}T${hora}:00`),
                agendamiento: new Date()
            },
            pago: {
                metodo: metodoPago || 'SALDO',
                monto: montoPagado || 0,
                pagado: false
            },
            notas: [{
                autor: 'SISTEMA',
                texto: notas || 'Cita agendada por el cliente',
                fecha: new Date()
            }]
        });
        const citaGuardada = await nuevaCita.save();
        console.log('✅ Cita guardada:', citaGuardada._id);

        // ✅ CREAR NOTIFICACIÓN PARA EL TALLER
        try {
            const NotificacionTaller = (await import('../models/NotificacionTaller.js')).default;
            const notificacion = new NotificacionTaller({
                tallerId: tallerIdObj,  // ✅ ObjectId
                tipo: 'NUEVA_CITA',
                titulo: '📅 Nueva Cita Recibida',
                mensaje: `${vehiculo?.marca || 'Vehículo'} ${vehiculo?.modelo || ''} (${vehiculo?.placa || 'S/P'}) - ${fecha} ${hora}`,
                detalle: {
                    citaId: citaGuardada._id,
                    fecha: fecha,
                    vehiculo: `${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.trim(),
                    servicio: servicio?.nombre || ''
                },
                prioridad: 'media',
                leida: false,
                fecha: new Date()
            });
            await notificacion.save();
            console.log('🔔 Notificación NUEVA_CITA creada correctamente');
        } catch (notifError) {
            console.error('❌ Error al crear notificación:', notifError);
        }

        res.status(201).json({
            exito: true,
            mensaje: 'Cita agendada exitosamente',
            cita: citaGuardada,
            tallerNombre: taller.nombre
        });
    } catch (error) {
        console.error('❌ Error al agendar cita:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al agendar cita' });
    }
});
*/
// Citas de un cliente en talleres
router.get('/citas/cliente/:clienteId', verificarToken, verificarPropietarioCliente, async (req, res) => {
    try {
        const citas = await CitaTaller.find({ clienteId: req.params.clienteId }).populate('tallerId', 'nombre direccion telefono').sort({ 'fechas.cita': -1 });
        res.json({ exito: true, citas });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al cargar citas' });
    }
});

// Notificaciones del cliente
router.get('/notificaciones/cliente/:clienteId', async (req, res) => {
    try {
        const citas = await CitaTaller.find({ clienteId: req.params.clienteId }).populate('tallerId', 'nombre direccion telefono').sort({ updatedAt: -1 }).limit(10);
        const notificaciones = citas.map(cita => ({
            id: cita._id,
            tipo: cita.estado === 'CONFIRMADA' ? 'CITA_CONFIRMADA' : cita.estado === 'EN_RECEPCION' ? 'VEHICULO_RECIBIDO' : cita.estado === 'EN_PROCESO' ? 'TRABAJO_INICIADO' : cita.estado === 'LISTO' ? 'VEHICULO_LISTO' : cita.estado === 'ENTREGADO' ? 'VEHICULO_ENTREGADO' : 'ESTADO_ACTUALIZADO',
            estado: cita.estado, fecha: cita.updatedAt, vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`, taller: cita.tallerId?.nombre || 'Taller', leida: false
        }));
        res.json({ exito: true, notificaciones });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener notificaciones' });
    }
});

// ================================================================
// 🔹 OBTENER CITA INDIVIDUAL POR ID
// ================================================================

router.get('/citas/:citaId', async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const cita = await CitaTaller.findById(req.params.citaId)
            .populate('empleadoAsignado', 'nombre')
            .populate('empleadoCompletado', 'nombre')
            .populate('clienteId', 'nombre');

        if (!cita) {
            return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada' });
        }

        res.json({ exito: true, cita });
    } catch (error) {
        console.error('Error al obtener cita:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener cita' });
    }
});
// ====================================================================
// 🔹 GRUPO 4: FOTOS DE CITAS (FIJAS)
// ====================================================================

// Subir fotos ANTES
router.post('/citas/:citaId/fotos/antes', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const { citaId } = req.params;
        const { fotos, subidoPor } = req.body;
        const cita = await CitaTaller.findById(citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        if (Array.isArray(fotos)) {
            fotos.forEach(foto => cita.fotos.antes.push({ url: foto.url || foto, descripcion: foto.descripcion || 'Foto antes', fecha: new Date(), subidoPor: subidoPor || 'Empleado' }));
        }
        await cita.save();
        res.json({ exito: true, mensaje: 'Fotos ANTES subidas', totalFotos: cita.fotos.antes.length });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al subir fotos.' }); }
});

// Subir fotos DESPUÉS
router.post('/citas/:citaId/fotos/despues', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const { citaId } = req.params;
        const { fotos, subidoPor } = req.body;
        const cita = await CitaTaller.findById(citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        if (Array.isArray(fotos)) {
            fotos.forEach(foto => cita.fotos.despues.push({ url: foto.url || foto, descripcion: foto.descripcion || 'Foto después', fecha: new Date(), subidoPor: subidoPor || 'Empleado' }));
        }
        await cita.save();
        res.json({ exito: true, mensaje: 'Fotos DESPUÉS subidas', totalFotos: cita.fotos.despues.length });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al subir fotos.' }); }
});

// Subir fotos DURANTE
router.post('/citas/:citaId/fotos/durante', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const { citaId } = req.params;
        const { fotos, subidoPor } = req.body;
        const cita = await CitaTaller.findById(citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        if (Array.isArray(fotos)) {
            fotos.forEach(foto => cita.fotos.durante.push({ url: foto.url || foto, descripcion: foto.descripcion || 'Foto durante', fecha: new Date(), subidoPor: subidoPor || 'Empleado' }));
        }
        await cita.save();
        res.json({ exito: true, mensaje: 'Fotos DURANTE subidas', totalFotos: cita.fotos.durante.length });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al subir fotos.' }); }
});

// Obtener fotos de una cita
router.get('/citas/:citaId/fotos', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId).select('fotos vehiculo servicio estado');
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        res.json({ exito: true, vehiculo: cita.vehiculo, servicio: cita.servicio, estado: cita.estado, fotos: { antes: cita.fotos.antes || [], durante: cita.fotos.durante || [], despues: cita.fotos.despues || [] } });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al obtener fotos.' }); }
});

// ====================================================================
// 🔹 GRUPO 5: OPERACIONES DE CITAS (FIJAS)
// ====================================================================

// Confirmar cita
router.put('/citas/:citaId/confirmar', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });

        // ⭐ Si ya expiró, rechazar
        if (cita.estado === 'EXPIRADA') {
            return res.status(400).json({
                exito: false,
                mensaje: 'Esta cita expiró. El cliente debe reagendar.'
            });
        }

        // 1. Confirmar la cita seleccionada
        cita.estado = 'CONFIRMADA';
        cita.pago.pagado = true;
        cita.fechaExpiracion = null; // Limpiar expiración
        cita.notas.push({ autor: 'TALLER', texto: req.body.notas || 'Cita confirmada', fecha: new Date() });
        await cita.save();
        await actualizarEstadoEnUsuario(cita);

        // ⭐ 2. Buscar y rechazar las otras citas PENDIENTES en el mismo slot
        const otrasPendientes = await CitaTaller.find({
            _id: { $ne: cita._id }, // Que no sea esta misma
            tallerId: cita.tallerId,
            fecha: cita.fecha,
            hora: cita.hora,
            $or: [
                { empleadoAsignado: cita.empleadoAsignado },
                { empleadoPreferidoId: cita.empleadoPreferidoId }
            ],
            estado: 'PENDIENTE'
        });

        if (otrasPendientes.length > 0) {
            await CitaTaller.updateMany(
                { _id: { $in: otrasPendientes.map(c => c._id) } },
                {
                    $set: {
                        estado: 'RECHAZADA',
                        notas: [...cita.notas, {
                            autor: 'SISTEMA',
                            texto: 'Rechazada automáticamente. El horario fue confirmado para otro cliente.',
                            fecha: new Date()
                        }]
                    }
                }
            );

            // Notificar a los clientes rechazados
            if (req.io) {
                otrasPendientes.forEach(c => {
                    if (c.clienteId) {
                        req.io.to(`cliente-${c.clienteId}`).emit('cita-rechazada', {
                            citaId: c._id,
                            mensaje: '❌ Tu cita fue rechazada porque el horario fue confirmado para otro cliente. Por favor, reagenda.',
                            fecha: c.fecha,
                            hora: c.hora
                        });
                    }
                });
            }
            console.log(`🚫 ${otrasPendientes.length} cita(s) pendiente(s) rechazada(s) automáticamente`);
        }

        // 3. Emitir WebSocket al cliente confirmado
        if (req.io && cita.clienteId) {
            req.io.to(`cliente-${cita.clienteId}`).emit('cambio-estado-cita', {
                citaId: cita._id,
                estado: 'CONFIRMADA',
                mensaje: '✅ Tu cita ha sido confirmada por el taller'
            });
            console.log('📡 WebSocket emitido al cliente confirmado:', cita.clienteId);
        }

        res.json({ exito: true, mensaje: 'Cita confirmada', cita });
    } catch (error) {
        console.error('❌ Error al confirmar cita:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al confirmar' });
    }
});

// Recibir vehículo
router.put('/citas/:citaId/recepcion', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        cita.estado = 'EN_RECEPCION'; cita.fechas.recepcion = new Date(); cita.bahiaAsignada = req.body.bahiaNumero || null;
        if (req.body.fotosAntes?.length) cita.fotos.antes = req.body.fotosAntes;
        if (req.body.notas) cita.notas.push({ autor: 'TALLER', texto: req.body.notas, fecha: new Date() });
        await cita.save();
        await actualizarEstadoEnUsuario(cita); // ✅ AGREGAR
        // ✅ EMITIR WEBSOCKET AL CLIENTE
        if (req.io && cita.clienteId) {
            req.io.to(`cliente-${cita.clienteId}`).emit('cambio-estado-cita', {
                citaId: cita._id,
                estado: 'EN_RECEPCION',
                mensaje: '📥 Tu vehículo fue recibido en el taller'
            });
            console.log('📡 WebSocket emitido al cliente:', cita.clienteId);
        }
        res.json({ exito: true, mensaje: 'Vehículo recibido', cita });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al recibir vehículo.' }); }
});


// Iniciar trabajo
router.put('/citas/:citaId/iniciar', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });

        cita.estado = 'EN_PROCESO';
        cita.fechas.inicioTrabajo = new Date();
        if (req.body.empleadoId) cita.empleadoAsignado = req.body.empleadoId;
        if (req.body.bahiaNumero) cita.bahiaAsignada = req.body.bahiaNumero;
        cita.notas.push({ autor: 'TALLER', texto: req.body.notas || 'Trabajo iniciado', fecha: new Date() });
        await cita.save();
        await actualizarEstadoEnUsuario(cita);

        // 1. MARCAR EMPLEADO COMO OCUPADO
        if (cita.empleadoAsignado) {
            try {
                await Empleado.findByIdAndUpdate(
                    cita.empleadoAsignado,
                    { estado: 'OCUPADO' },
                    { new: true }
                );
                console.log('👤 Empleado marcado como OCUPADO:', cita.empleadoAsignado);
            } catch (empError) {
                console.error('⚠️ Error al marcar empleado:', empError);
            }
        }

        // 2. MARCAR BAHÍA COMO OCUPADA
        if (cita.bahiaAsignada) {
            try {
                const numeroBahia = parseInt(cita.bahiaAsignada);
                await Taller.findOneAndUpdate(
                    { _id: cita.tallerId, 'bahias.numero': numeroBahia },
                    {
                        $set: {
                            'bahias.$.estado': 'OCUPADA',
                            'bahias.$.empleadoAsignado': cita.empleadoAsignado || null
                        }
                    },
                    { new: true }
                );
                console.log('🏗️ Bahía #' + numeroBahia + ' marcada como OCUPADA');
            } catch (bahiaError) {
                console.error('⚠️ Error al marcar bahía:', bahiaError);
            }
        }

        // 3. CREAR NOTIFICACIÓN DE TRABAJO INICIADO
        try {
            const notificacion = new NotificacionTaller({
                tallerId: cita.tallerId,
                tipo: 'TRABAJO_INICIADO',
                titulo: '🔧 Trabajo Iniciado',
                mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) - Bahía #${cita.bahiaAsignada || 'N/A'}`,
                detalle: {
                    citaId: cita._id,
                    vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim(),
                    bahia: { numero: cita.bahiaAsignada || null }
                },
                prioridad: 'media',
                leida: false,
                fecha: new Date()
            });
            await notificacion.save();
            console.log('🔔 Notificación TRABAJO_INICIADO creada');
        } catch (notifError) {
            console.error('⚠️ Error al crear notificación:', notifError);
        }

        // 4. EMITIR WEBSOCKET AL CLIENTE
        if (req.io && cita.clienteId) {
            req.io.to(`cliente-${cita.clienteId}`).emit('cambio-estado-cita', {
                citaId: cita._id,
                estado: 'EN_PROCESO',
                mensaje: '🔧 Están trabajando en tu vehículo'
            });
            console.log('📡 WebSocket emitido al cliente:', cita.clienteId);
        }

        // 5. ✅ EMITIR NOTIFICACIÓN AL EMPLEADO ASIGNADO
        if (req.io && cita.empleadoAsignado) {
            req.io.to(`empleado-${cita.empleadoAsignado}`).emit('nueva-notificacion-empleado', {
                tipo: 'TRABAJO_ASIGNADO',
                titulo: '🔧 Trabajo Asignado',
                mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) - Bahía #${cita.bahiaAsignada || 'N/A'}`
            });
            console.log('📡 Notificación de trabajo enviada al empleado:', cita.empleadoAsignado);
        }

        res.json({ exito: true, mensaje: 'Trabajo iniciado', cita });
    } catch (error) {
        console.error('❌ Error al iniciar trabajo:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al iniciar trabajo.' });
    }
});


// Finalizar trabajo - SOLO cambia a LISTO, no a ENTREGADO
router.put('/citas/:citaId/finalizar', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });

        const empleadoId = cita.empleadoAsignado;
        const bahiaNumero = cita.bahiaAsignada;

        // ✅ BUSCAR NOMBRE DEL EMPLEADO ANTES DE LIMPIAR
        let empleadoNombre = '';
        if (empleadoId) {
            try {
                const empleado = await Empleado.findById(empleadoId);
                empleadoNombre = empleado?.nombre || '';
                console.log('👤 Empleado encontrado:', empleadoNombre);
            } catch (empError) {
                console.error('⚠️ Error al buscar empleado:', empError);
            }
        }

        cita.estado = 'LISTO';
        cita.fechas.finalizacion = new Date();

        // ✅ GUARDAR EMPLEADO COMO OBJETO CON NOMBRE
        cita.empleadoCompletado = {
            id: empleadoId,
            nombre: empleadoNombre
        };

        cita.notas.push({ autor: 'TALLER', texto: req.body.notas || 'Listo para entrega', fecha: new Date() });

        cita.empleadoAsignado = null;
        cita.bahiaAsignada = null;

        await cita.save();

        // 1. MARCAR EMPLEADO COMO DISPONIBLE
        if (empleadoId) {
            try {
                await Empleado.findByIdAndUpdate(
                    empleadoId,
                    {
                        estado: 'DISPONIBLE',
                        $inc: { 'metricas.trabajosCompletados': 1 }
                    },
                    { new: true }
                );
                console.log('👤 Empleado liberado:', empleadoId);
            } catch (empError) {
                console.error('⚠️ Error al liberar empleado:', empError);
            }
        }

        // 2. LIBERAR BAHÍA
        if (bahiaNumero) {
            try {
                const numeroBahia = parseInt(bahiaNumero);
                const taller = await Taller.findOneAndUpdate(
                    { _id: cita.tallerId, 'bahias.numero': numeroBahia },
                    {
                        $set: {
                            'bahias.$.estado': 'DISPONIBLE',
                            'bahias.$.empleadoAsignado': null
                        }
                    },
                    { new: true }
                );
                if (taller) {
                    const bahia = taller.bahias.find(b => b.numero === numeroBahia);
                    console.log('🏗️ Bahía #' + numeroBahia + ' liberada, estado:', bahia?.estado);
                }
            } catch (bahiaError) {
                console.error('⚠️ Error al liberar bahía:', bahiaError);
            }
        }

        // 3. CREAR NOTIFICACIÓN DE TRABAJO FINALIZADO
        try {
            const notificacion = new NotificacionTaller({
                tallerId: cita.tallerId,
                tipo: 'TRABAJO_FINALIZADO',
                titulo: '✅ Trabajo Finalizado',
                mensaje: `${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) está listo para entrega`,
                detalle: {
                    citaId: cita._id,
                    vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim(),
                    bahia: { numero: bahiaNumero || null }
                },
                prioridad: 'alta',
                leida: false,
                fecha: new Date()
            });
            await notificacion.save();
            console.log('🔔 Notificación TRABAJO_FINALIZADO creada');
        } catch (notifError) {
            console.error('⚠️ Error al crear notificación:', notifError);
        }

        // 4. EMITIR WEBSOCKET AL CLIENTE
        if (req.io && cita.clienteId) {
            req.io.to(`cliente-${cita.clienteId}`).emit('cambio-estado-cita', {
                citaId: cita._id,
                estado: 'LISTO',
                mensaje: '🎉 ¡Tu vehículo está listo para recoger!'
            });
            console.log('📡 WebSocket emitido al cliente:', cita.clienteId);
        }

        // 5. EMITIR NOTIFICACIÓN AL EMPLEADO
        if (req.io && empleadoId) {
            req.io.to(`empleado-${empleadoId}`).emit('nueva-notificacion-empleado', {
                tipo: 'TRABAJO_COMPLETADO',
                titulo: '✅ Trabajo Completado',
                mensaje: `Has completado el trabajo de ${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'})`
            });
            console.log('📡 Notificación de trabajo completado enviada al empleado:', empleadoId);
        }

        res.json({
            exito: true,
            mensaje: 'Trabajo finalizado. Empleado y bahía liberados.',
            cita
        });
    } catch (error) {
        console.error('❌ Error al finalizar trabajo:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al finalizar trabajo.' });
    }
});

// Entregar desde el taller (respaldo)
router.put('/citas/:citaId/entregar', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });

        cita.estado = 'ENTREGADO';
        cita.fechas.entrega = new Date();
        cita.notas.push({ autor: 'TALLER', texto: 'Entregado por el taller', fecha: new Date() });
        await cita.save();

        res.json({ exito: true, mensaje: 'Vehículo entregado', cita });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al entregar.' });
    }
});

// Cancelar cita
router.put('/citas/:citaId/cancelar', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const cita = await CitaTaller.findById(req.params.citaId);
        if (!cita) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada.' });
        cita.estado = 'CANCELADA';
        cita.notas.push({ autor: req.body.canceladoPor || 'SISTEMA', texto: `Cancelada: ${req.body.motivo || 'Sin motivo'}`, fecha: new Date() });
        await cita.save();
        await actualizarEstadoEnUsuario(cita); // ✅ AGREGAR
        // ✅ EMITIR WEBSOCKET AL CLIENTE
        if (req.io && cita.clienteId) {
            req.io.to(`cliente-${cita.clienteId}`).emit('cambio-estado-cita', {
                citaId: cita._id,
                estado: 'CANCELADA',
                mensaje: '❌ Tu cita fue cancelada'
            });
            console.log('📡 WebSocket emitido al cliente:', cita.clienteId);
        }

        res.json({ exito: true, mensaje: 'Cita cancelada', cita });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cancelar cita.' }); }
});

// ====================================================================
// 🔹 GRUPO 6: CITAS DE USUARIO (Cliente)
// ====================================================================


// Eliminar cita de usuario
router.delete('/:citaId', async (req, res) => {
    try {
        const { citaId } = req.params;
        const { usuarioId } = req.body;
        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });

        const index = usuario.misCitas.findIndex(c => String(c._id) === String(citaId) || String(c.id) === String(citaId));
        if (index === -1) return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada' });

        usuario.misCitas.splice(index, 1);
        await usuario.save();
        const usuarioActualizado = await Usuario.findById(usuarioId).select('-password');
        res.json({ exito: true, usuario: usuarioActualizado });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

// ====================================================================
// POST /api/talleres/:tallerId/validar-cita
// → Valida si una cita se puede crear sin conflictos
// ====================================================================
router.post('/:tallerId/validar-cita', async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { fecha, hora, vehiculo, empleadoId, servicio } = req.body;

        if (!fecha || !hora || !vehiculo?.placa) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Faltan datos: fecha, hora, vehiculo.placa'
            });
        }

        const taller = await Taller.findById(tallerId).lean();
        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        const errores = [];
        const tallerObjId = new mongoose.Types.ObjectId(tallerId);

        // R2: Vehículo duplicado
        const citaVehiculo = await CitaTaller.findOne({
            tallerId: tallerObjId,
            'vehiculo.placa': vehiculo.placa,
            fecha,
            hora,
            estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
        }).lean();

        if (citaVehiculo) {
            errores.push({
                tipo: 'VEHICULO_OCUPADO',
                mensaje: `El vehículo ${vehiculo.placa} ya tiene cita en este horario`
            });
        }

        // R3 + R4: Empleado ocupado + solapamiento
        if (empleadoId) {
            const citaEmpleado = await CitaTaller.findOne({
                tallerId: tallerObjId,
                empleadoAsignado: new mongoose.Types.ObjectId(empleadoId),
                fecha,
                hora,
                estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
            }).lean();

            if (citaEmpleado) {
                errores.push({
                    tipo: 'EMPLEADO_OCUPADO',
                    mensaje: 'El empleado ya tiene una cita en este horario'
                });
            }

            // Solapamiento
            const duracionNueva = servicio?.duracionEstimada || 60;
            const horaNuevaMin = horaAMinutos(hora);
            const finNueva = horaNuevaMin + duracionNueva;

            const citasDelDia = await CitaTaller.find({
                tallerId: tallerObjId,
                empleadoAsignado: new mongoose.Types.ObjectId(empleadoId),
                fecha,
                estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
            }).lean();

            for (const cita of citasDelDia) {
                const horaCitaMin = horaAMinutos(cita.hora);
                const duracionCita = cita.servicio?.duracionEstimada || 60;
                const finCita = horaCitaMin + duracionCita;

                if (horaNuevaMin < finCita && finNueva > horaCitaMin) {
                    errores.push({
                        tipo: 'SOLAPAMIENTO',
                        mensaje: `El empleado tiene cita de ${cita.hora} a ${minutosAHora(finCita)}`
                    });
                    break;
                }
            }
        }

        // R5: Bahías
        const bahiasTotales = taller.bahias?.length || 0;
        const citasEnSlot = await CitaTaller.countDocuments({
            tallerId: tallerObjId,
            fecha,
            hora,
            estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
        });

        if (citasEnSlot >= bahiasTotales) {
            errores.push({
                tipo: 'SIN_BAHIAS',
                mensaje: `No hay bahías disponibles (${citasEnSlot}/${bahiasTotales})`
            });
        }

        // Resultado
        if (errores.length > 0) {
            let alternativas = [];
            if (errores.some(e => ['VEHICULO_OCUPADO', 'SIN_BAHIAS'].includes(e.tipo))) {
                alternativas = await buscarHorariosAlternativos(
                    tallerId, fecha, hora, vehiculo.placa, empleadoId
                );
            }

            return res.json({
                exito: false,
                valido: false,
                errores,
                alternativas,
                mensaje: errores[0].mensaje
            });
        }

        res.json({ exito: true, valido: true, mensaje: 'Cita válida' });

    } catch (error) {
        console.error('❌ Error validando cita:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al validar: ' + error.message });
    }
});

// ====================================================================
// 🔹 GRUPO 7: RUTAS CON PARÁMETRO :tallerId (AL FINAL)
// ====================================================================

// Empleados del taller
// ====================================================================
// 👥 EMPLEADOS - CRUD (PROTEGIDO CON JWT)
// ====================================================================

// Crear empleado
router.post('/:tallerId/empleados', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        const existe = await Empleado.findOne({ email: req.body.email });
        if (existe) return res.status(400).json({ exito: false, mensaje: 'Ya existe un empleado con ese email' });

        let passwordHash = '';
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(req.body.password, salt);
        }

        const empleado = await new Empleado({
            ...req.body, tallerId: req.params.tallerId,
            password: passwordHash || 'sinpassword', rol: req.body.rol ||
                'LAVADOR', estado: req.body.estado || 'DISPONIBLE'
        }).save();
        taller.empleados.push(empleado._id); await taller.save();

        // ✅ ELIMINAR PASSWORD DE LA RESPUESTA
        const { password: _, ...empleadoSeguro } = empleado.toObject();

        res.status(201).json({ exito: true, mensaje: 'Empleado creado', empleado: empleadoSeguro });

    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

// Editar empleado
router.put('/:tallerId/empleados/:empleadoId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const empleado = await Empleado.findOne({ _id: req.params.empleadoId, tallerId: req.params.tallerId });
        if (!empleado) return res.status(404).json({ exito: false, mensaje: 'Empleado no encontrado' });
        const u = req.body;
        if (u.nombre !== undefined) empleado.nombre = u.nombre;
        if (u.email !== undefined) empleado.email = u.email;
        if (u.rol !== undefined) empleado.rol = u.rol;
        if (u.estado !== undefined) empleado.estado = u.estado;
        if (u.fotoPerfil !== undefined) empleado.fotoPerfil = u.fotoPerfil;
        if (u.password) {
            const salt = await bcrypt.genSalt(10);
            empleado.password = await bcrypt.hash(u.password, salt);
        }
        await empleado.save();
        res.json({ exito: true, mensaje: 'Empleado actualizado', empleado });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

// Eliminar empleado
router.delete('/:tallerId/empleados/:empleadoId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const empleado = await Empleado.findOneAndDelete({ _id: req.params.empleadoId, tallerId: req.params.tallerId });
        if (!empleado) return res.status(404).json({ exito: false, mensaje: 'Empleado no encontrado' });
        await Taller.findByIdAndUpdate(req.params.tallerId, { $pull: { empleados: req.params.empleadoId } });
        res.json({ exito: true, mensaje: 'Empleado eliminado' });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

// Listar empleados
router.get('/:tallerId/empleados', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const empleados = await Empleado.find({ tallerId: req.params.tallerId }).select('-password').sort({ rol: 1, nombre: 1 });
        res.json({ exito: true, empleados });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar empleados.' }); }
});
// ====================================================================
// GET /api/talleres/:tallerId/empleados-publico
// → Público (sin auth) para la vista "Mi Taller" del cliente
// → Calcula métricas REALES desde citas + calificaciones
// ====================================================================
router.get('/:tallerId/empleados-publico', async (req, res) => {
    try {
        const { tallerId } = req.params;

        // 1. Traer empleados activos
        const empleados = await Empleado.find({
            tallerId,
            estado: { $ne: 'INACTIVO' }
        })
            .select('nombre rol foto fotoPerfil especialidades estado metricas')
            .lean();

        if (!empleados.length) {
            return res.json({ exito: true, empleados: [] });
        }

        const empleadoIds = empleados.map(e => e._id);
        const tallerObjectId = new mongoose.Types.ObjectId(tallerId);

        // 2. Calcular TODO en una sola agregación
        //    - trabajos completados (citas ENTREGADO/LISTO)
        //    - rating real (solo citas con calificación ≥ 1)
        const statsReales = await CitaTaller.aggregate([
            {
                $match: {
                    tallerId: tallerObjectId,
                    empleadoAsignado: { $in: empleadoIds },
                    estado: { $in: ['ENTREGADO', 'LISTO', 'FINALIZADA', 'COMPLETADA'] }
                }
            },
            {
                $group: {
                    _id: '$empleadoAsignado',
                    trabajosCompletados: { $sum: 1 },
                    citasCalificadas: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ['$calificacion.puntuacion', 1] },
                                        { $lte: ['$calificacion.puntuacion', 5] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    sumaCalificaciones: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ['$calificacion.puntuacion', 1] },
                                        { $lte: ['$calificacion.puntuacion', 5] }
                                    ]
                                },
                                '$calificacion.puntuacion',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Mapear resultados por ID de empleado
        const mapaStats = {};
        statsReales.forEach(s => {
            const id = s._id.toString();
            mapaStats[id] = {
                trabajosCompletados: s.trabajosCompletados,
                totalResenas: s.citasCalificadas,
                calificacionPromedio: s.citasCalificadas > 0
                    ? Math.round((s.sumaCalificaciones / s.citasCalificadas) * 10) / 10
                    : 0
            };
        });

        // 3. Combinar con fallback a métricas manuales
        const resultado = empleados.map(e => {
            const id = e._id.toString();
            const stats = mapaStats[id];

            return {
                _id: e._id,
                nombre: e.nombre,
                rol: e.rol,
                foto: e.fotoPerfil || e.foto || null,
                especialidades: e.especialidades || [],
                estado: e.estado,
                // ⭐ Prioridad: dato real → métrica manual → 0
                calificacionPromedio: stats?.calificacionPromedio ?? e.metricas?.calificacionPromedio ?? 0,
                totalResenas: stats?.totalResenas ?? e.metricas?.totalResenas ?? 0,
                trabajosCompletados: stats?.trabajosCompletados ?? e.metricas?.trabajosCompletados ?? 0
            };
        });

        // 4. Ordenar: mejor rating, luego más trabajos
        resultado.sort((a, b) =>
            (b.calificacionPromedio - a.calificacionPromedio) ||
            (b.trabajosCompletados - a.trabajosCompletados)
        );

        console.log(`✅ [Empleados público] ${resultado.length} empleados cargados`);
        resultado.forEach(e => {
            console.log(`   ${e.nombre}: ${e.trabajosCompletados} trabajos, ${e.calificacionPromedio}⭐ (${e.totalResenas} reseñas)`);
        });

        res.json({ exito: true, empleados: resultado });

    } catch (error) {
        console.error('[Empleados público] Error:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar empleados.' });
    }
});
// ====================================================================
// GET /api/talleres/:tallerId/empleados/:empleadoId/perfil-publico
// → Perfil público: datos + trabajos + reseñas reales
// ====================================================================
router.get('/:tallerId/empleados/:empleadoId/perfil-publico', async (req, res) => {
    try {
        const { tallerId, empleadoId } = req.params;

        // 1. Datos del empleado
        const empleado = await Empleado.findOne({
            _id: empleadoId,
            tallerId
        })
            .select('nombre rol foto fotoPerfil especialidades estado metricas bio')
            .lean();

        if (!empleado) {
            return res.status(404).json({ exito: false, mensaje: 'Empleado no encontrado' });
        }

        const empleadoObjId = new mongoose.Types.ObjectId(empleadoId);
        const tallerObjId = new mongoose.Types.ObjectId(tallerId);

        // 2. Stats agregadas + trabajos recientes + reseñas en paralelo
        const [stats, trabajosRecientes, resenasRecientes] = await Promise.all([
            // 2a. Stats agregadas
            CitaTaller.aggregate([
                {
                    $match: {
                        tallerId: tallerObjId,
                        empleadoAsignado: empleadoObjId,
                        estado: { $in: ['ENTREGADO', 'LISTO'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        trabajosCompletados: { $sum: 1 },
                        citasCalificadas: {
                            $sum: { $cond: [{ $gte: ['$calificacion.puntuacion', 1] }, 1, 0] }
                        },
                        sumaCalificaciones: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$calificacion.puntuacion', 1] },
                                    '$calificacion.puntuacion',
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            // 2b. Últimos 5 trabajos (sin datos sensibles)
            CitaTaller.find({
                tallerId: tallerObjId,
                empleadoAsignado: empleadoObjId,
                estado: { $in: ['ENTREGADO', 'LISTO'] }
            })
                .select('vehiculo servicio fechas calificacion fotos')
                .sort({ 'fechas.entrega': -1 })
                .limit(5)
                .lean(),

            // 2c. Últimas 5 reseñas (con estrellas)
            CitaTaller.find({
                tallerId: tallerObjId,
                empleadoAsignado: empleadoObjId,
                'calificacion.puntuacion': { $gte: 1 }
            })
                .select('calificacion vehiculo clienteId fechas')
                .sort({ 'calificacion.fecha': -1 })
                .limit(5)
                .populate('clienteId', 'nombre')
                .lean()
        ]);

        // Procesar stats
        const s = stats[0] || { trabajosCompletados: 0, citasCalificadas: 0, sumaCalificaciones: 0 };
        const rating = s.citasCalificadas > 0
            ? Math.round((s.sumaCalificaciones / s.citasCalificadas) * 10) / 10
            : 0;

        // Procesar trabajos
        const trabajos = trabajosRecientes.map(t => ({
            _id: t._id,
            vehiculo: {
                marca: t.vehiculo?.marca || 'Vehículo',
                modelo: t.vehiculo?.modelo || '',
                placa: t.vehiculo?.placa || 'S/P'
            },
            servicio: t.servicio?.nombre || 'Servicio',
            fecha: t.fechas?.entrega || t.fechas?.finalizacion,
            calificacion: t.calificacion?.puntuacion || 0,
            foto: t.fotos?.despues?.[0]?.url || null
        }));

        // Procesar reseñas
        const resenas = resenasRecientes.map(r => ({
            _id: r._id,
            puntuacion: r.calificacion.puntuacion,
            comentario: r.calificacion.comentario || '',
            fecha: r.calificacion.fecha,
            cliente: {
                nombre: r.clienteId?.nombre || 'Cliente'
            },
            vehiculo: `${r.vehiculo?.marca || ''} ${r.vehiculo?.modelo || ''}`.trim()
        }));

        res.json({
            exito: true,
            empleado: {
                _id: empleado._id,
                nombre: empleado.nombre,
                rol: empleado.rol,
                foto: empleado.fotoPerfil || empleado.foto || null,
                especialidades: empleado.especialidades || [],
                estado: empleado.estado,
                bio: empleado.bio || ''
            },
            stats: {
                calificacionPromedio: rating,
                trabajosCompletados: s.trabajosCompletados,
                totalResenas: s.citasCalificadas
            },
            trabajos,
            resenas
        });

    } catch (error) {
        console.error('[Perfil empleado] Error:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar perfil' });
    }
});

// Bahías del taller
router.post('/:tallerId/bahias', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        if (taller.bahias.some(b => b.numero === req.body.numero)) return res.status(400).json({ exito: false, mensaje: 'Ya existe una bahía con ese número' });
        taller.bahias.push({ numero: req.body.numero, nombre: req.body.nombre || `Bahía ${req.body.numero}`, tipo: req.body.tipo || 'GENERAL', estado: req.body.estado || 'DISPONIBLE' });
        await taller.save();
        res.status(201).json({ exito: true, mensaje: 'Bahía creada', bahias: taller.bahias });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

router.put('/:tallerId/bahias/:bahiaId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        const bahia = taller.bahias.id(req.params.bahiaId) || taller.bahias.find(b => b.numero.toString() === req.params.bahiaId);
        if (!bahia) return res.status(404).json({ exito: false, mensaje: 'Bahía no encontrada' });
        const u = req.body;
        if (u.numero !== undefined) bahia.numero = u.numero;
        if (u.nombre !== undefined) bahia.nombre = u.nombre;
        if (u.tipo !== undefined) bahia.tipo = u.tipo;
        if (u.estado !== undefined) bahia.estado = u.estado;
        if (u.empleadoAsignado !== undefined) bahia.empleadoAsignado = u.empleadoAsignado;
        await taller.save();
        res.json({ exito: true, mensaje: 'Bahía actualizada', bahias: taller.bahias });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

router.delete('/:tallerId/bahias/:bahiaId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        const bahia = taller.bahias.id(req.params.bahiaId) || taller.bahias.find(b => b.numero.toString() === req.params.bahiaId);
        if (!bahia) return res.status(404).json({ exito: false, mensaje: 'Bahía no encontrada' });
        if (bahia.estado === 'OCUPADA') return res.status(400).json({ exito: false, mensaje: 'No se puede eliminar una bahía ocupada.' });
        bahia.deleteOne(); await taller.save();
        res.json({ exito: true, mensaje: 'Bahía eliminada', bahias: taller.bahias });
    } catch (error) { res.status(500).json({ exito: false, mensaje: error.message }); }
});

router.get('/:tallerId/bahias', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId).populate('bahias.empleadoAsignado', 'nombre');
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado.' });
        res.json({ exito: true, bahias: taller.bahias });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar bahías.' }); }
});

// Consultas del taller
router.get('/:tallerId/dashboard', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tallerId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(tallerId)) return res.status(400).json({ exito: false, mensaje: 'ID inválido.' });
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        const [citasHoy, enProceso, completadosHoy, ingresosHoy, taller, proximasCitas] = await Promise.all([
            CitaTaller.countDocuments({ tallerId, 'fechas.cita': { $gte: hoy, $lt: manana } }),
            CitaTaller.countDocuments({ tallerId, estado: 'EN_PROCESO' }),
            CitaTaller.countDocuments({ tallerId, estado: 'ENTREGADO', 'fechas.entrega': { $gte: hoy, $lt: manana } }),
            CitaTaller.aggregate([{ $match: { tallerId: new mongoose.Types.ObjectId(tallerId), estado: 'ENTREGADO', 'fechas.entrega': { $gte: hoy, $lt: manana } } }, { $group: { _id: null, total: { $sum: '$pago.monto' } } }]),
            Taller.findById(tallerId).populate({ path: 'bahias.empleadoAsignado', select: 'nombre' }),
            CitaTaller.find({ tallerId, estado: { $in: ['PENDIENTE', 'CONFIRMADA'] }, 'fechas.cita': { $gte: hoy } }).sort({ 'fechas.cita': 1 }).limit(5).populate('clienteId', 'nombre').populate('empleadoAsignado', 'nombre')
        ]);
        res.json({ exito: true, citasHoy, enProceso, completadosHoy, ingresosDia: ingresosHoy[0]?.total || 0, bahias: taller?.bahias || [], proximasCitas: proximasCitas.map(c => ({ _id: c._id, vehiculo: c.vehiculo, servicio: c.servicio, estado: c.estado, hora: c.fechas?.cita ? new Date(c.fechas.cita).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '', cliente: c.clienteId?.nombre || 'Sin asignar' })) });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar dashboard.' }); }
});

router.get('/:tallerId/citas', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tallerId))
            return res.status(400).json({ exito: false, mensaje: 'ID inválido.' });
        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId

        }).sort({ 'fechas.cita': -1 }).populate('clienteId', 'nombre email').populate('empleadoAsignado', 'nombre').limit(50);
        res.json({ exito: true, citas });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar citas.' }); }
});

router.get('/:tallerId/historial', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tallerId)) {
            return res.status(400).json({ exito: false, mensaje: 'ID inválido.' });
        }

        // ✅ INCLUIR LISTO Y ENTREGADO
        const historial = await CitaTaller.find({
            tallerId: req.params.tallerId,
            estado: { $in: ['LISTO', 'ENTREGADO'] }  // ✅ CAMBIAR AQUÍ
        })
            .sort({ 'fechas.entrega': -1, 'fechas.finalizacion': -1, createdAt: -1 })
            .populate('clienteId', 'nombre')
            .populate('empleadoAsignado', 'nombre')
            .limit(100);

        console.log('📊 Historial encontrado:', historial.length);

        res.json({ exito: true, historial });
    } catch (error) {
        console.error('Error al cargar historial:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar historial.' });
    }
});

router.get('/:tallerId/disponibilidad', async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        const { fecha, hora } = req.query;
        const citasEnHorario = await CitaTaller.countDocuments({ tallerId: req.params.tallerId, 'fechas.cita': { $gte: new Date(`${fecha}T00:00:00`), $lt: new Date(`${fecha}T23:59:59`) }, hora, estado: { $nin: ['CANCELADA', 'ENTREGADO'] } });
        const bahiasLibres = taller.bahias.filter(b => b.estado === 'DISPONIBLE').length;
        res.json({ exito: true, disponible: citasEnHorario < bahiasLibres, bahiasLibres, citasEnHorario, mensaje: citasEnHorario < bahiasLibres ? 'Horario disponible' : 'Horario ocupado' });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al verificar disponibilidad' }); }
});

// ====================================================================
// GET /api/talleres/:tallerId/horarios?fecha=YYYY-MM-DD
//   &placa=XXXX&empleadoId=XXXX&horaMinima=HH:MM
// → Genera slots dinámicos filtrados por conflictos
// ====================================================================
router.get('/:tallerId/horarios', async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { fecha, placa, empleadoId } = req.query;

        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ exito: false, mensaje: 'Fecha requerida' });
        }

        const taller = await Taller.findById(tallerId).lean();
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        // ⭐ ZONA HORARIA DEL TALLER
        const zonaHorariaTaller = taller.zonaHoraria || 'America/Santo_Domingo';

        // ⭐ OBTENER LA HORA ACTUAL EN LA ZONA DEL TALLER
        const ahoraUTC = new Date();
        const formateador = new Intl.DateTimeFormat('en-CA', {
            timeZone: zonaHorariaTaller,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        const horaLocalTallerStr = formateador.format(ahoraUTC).replace(',', '');
        const [fechaActualTaller, horaActualTaller] = horaLocalTallerStr.split(' ');

        console.log(`🕐 Hora en taller (${zonaHorariaTaller}):`, horaActualTaller, '| Fecha:', fechaActualTaller);

        // ⭐ DETERMINAR DÍA DE LA SEMANA
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaObj = new Date(year, month - 1, day);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const nombreDia = diasSemana[fechaObj.getDay()];

        const configDia = taller.horario?.[nombreDia];
        if (!configDia?.apertura || !configDia?.cierre) {
            return res.json({ exito: true, horarios: [], diaAbierto: false, mensaje: `El taller no abre los ${nombreDia}s` });
        }

        let slots = generarSlotsDelDia(configDia.apertura, configDia.cierre, 60);

        // ⭐ FILTRAR SLOTS SI LA FECHA SELECCIONADA ES HOY EN LA ZONA DEL TALLER
        if (fecha === fechaActualTaller) {
            const [hh, mm] = horaActualTaller.split(':').map(Number);
            const minutosActualesTaller = hh * 60 + mm;
            const horaMinimaTaller = minutosActualesTaller + 15; // margen 15 min

            console.log(`   Filtrando slots para hoy. Hora mínima: ${Math.floor(horaMinimaTaller / 60)}:${String(horaMinimaTaller % 60).padStart(2, '0')}`);

            slots = slots.filter(slot => {
                const [sh, sm] = slot.split(':').map(Number);
                return (sh * 60 + sm) >= horaMinimaTaller;
            });
        }

        const bahiasTotales = taller.bahias?.length || 1;
        const tallerObjId = new mongoose.Types.ObjectId(tallerId);

        const horariosConDisponibilidad = await Promise.all(
            slots.map(async (hora) => {
                // 1. Citas CONFIRMADAS (bloquean)
                const citasConfirmadas = await CitaTaller.countDocuments({
                    tallerId: tallerObjId, fecha, hora,
                    estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] }
                });

                // 2. Citas PENDIENTES (no bloquean, pero marcan enEspera)
                const citasPendientes = await CitaTaller.countDocuments({
                    tallerId: tallerObjId, fecha, hora, estado: 'PENDIENTE'
                });

                // 3. Vehículo ocupado
                let vehiculoOcupado = false;
                if (placa) {
                    const citaVehiculo = await CitaTaller.findOne({
                        tallerId: tallerObjId, 'vehiculo.placa': placa, fecha, hora,
                        estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] }
                    });
                    vehiculoOcupado = !!citaVehiculo;
                }

                // 4. Empleado ocupado
                let empleadoOcupado = false;
                if (empleadoId) {
                    const citaEmpleado = await CitaTaller.findOne({
                        tallerId: tallerObjId,
                        $or: [{ empleadoAsignado: new mongoose.Types.ObjectId(empleadoId) }, { empleadoPreferidoId: new mongoose.Types.ObjectId(empleadoId) }],
                        fecha, hora,
                        estado: { $in: ['CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'] }
                    });
                    empleadoOcupado = !!citaEmpleado;
                }

                const bahiasLlenas = citasConfirmadas >= bahiasTotales;
                const disponible = !bahiasLlenas && !vehiculoOcupado && !empleadoOcupado;

                let razon = null;
                let enEspera = false;

                if (!disponible) {
                    if (vehiculoOcupado) razon = 'Tu auto';
                    else if (empleadoOcupado) razon = 'Empleado';
                    else if (bahiasLlenas) razon = 'Lleno';
                } else if (citasPendientes > 0) {
                    enEspera = true;
                    razon = 'En espera';
                }

                return { hora, disponible, enEspera, razon, citasOcupadas: citasConfirmadas, citasPendientes, bahiasTotales };
            })
        );

        res.json({
            exito: true,
            horarios: horariosConDisponibilidad,
            diaAbierto: true,
            info: {
                dia: nombreDia,
                apertura: configDia.apertura,
                cierre: configDia.cierre,
                bahiasTotales,
                horaTallerActual: horaActualTaller,
                zonaHoraria: zonaHorariaTaller
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener horarios:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
// ====================================================================
// 🕐 HELPER: Generar slots entre dos horas
// ====================================================================
function generarSlotsDelDia(horaApertura, horaCierre, duracionMinutos) {
    const slots = [];

    // Parsear "HH:MM"
    const [hA, mA] = horaApertura.split(':').map(Number);
    const [hC, mC] = horaCierre.split(':').map(Number);

    let actualMin = hA * 60 + mA;
    const cierreMin = hC * 60 + mC;

    while (actualMin + duracionMinutos <= cierreMin) {
        const h = Math.floor(actualMin / 60);
        const m = actualMin % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        actualMin += duracionMinutos;
    }

    return slots;
}

// ⚠️ Obtener taller por ID - SIEMPRE AL FINAL
router.get('/:tallerId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tallerId)) return res.status(400).json({ exito: false, mensaje: 'ID inválido.' });
        const taller = await Taller.findById(req.params.tallerId).populate('propietarioId', 'nombre email');
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado.' });
        res.json({ exito: true, taller });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al obtener taller.' }); }
});

// ✅ Cambiar contraseña del taller - DEBE IR ANTES DE /:tallerId
router.put('/:tallerId/cambiar-password', verificarToken, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        const taller = await Taller.findById(req.params.tallerId);

        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        // Verificar contraseña actual
        const passwordValida = await taller.compararPassword(passwordActual);
        if (!passwordValida) {
            return res.status(400).json({ exito: false, mensaje: 'Contraseña actual incorrecta' });
        }

        // Cambiar contraseña
        taller.password = passwordNueva;
        await taller.save();

        res.json({ exito: true, mensaje: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error.message);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
});

// ================================================================
// 🔹 ACTUALIZAR CHECKLIST DE SERVICIOS
// ================================================================

router.put('/citas/:citaId/checklist', verificarToken, verificarPropietarioCita, async (req, res) => {
    try {
        const { servicioIndex, empleadoId } = req.body;
        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        const cita = await CitaTaller.findById(req.params.citaId);

        if (!cita) {
            return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada' });
        }

        // ✅ Inicializar checklist desde la descripción del servicio
        if (!cita.checklistServicios || cita.checklistServicios.length === 0 ||
            (cita.checklistServicios.length === 1 && cita.checklistServicios[0].nombre === cita.servicio?.nombre)) {

            // Buscar la descripción del servicio en el taller
            const Taller = (await import('../models/Taller.js')).default;
            const taller = await Taller.findById(cita.tallerId);

            const servicioEncontrado = taller?.servicios?.find(s =>
                s.nombre?.toLowerCase() === cita.servicio?.nombre?.toLowerCase() ||
                s._id === cita.servicio?._id
            );

            if (servicioEncontrado?.descripcion) {
                cita.checklistServicios = servicioEncontrado.descripcion
                    .split('|')
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => ({
                        nombre: p,
                        completado: false,
                        fechaCompletado: null,
                        completadoPor: null,
                        notas: ''
                    }));
                console.log('📋 Checklist inicializado:', cita.checklistServicios.map(s => s.nombre));
            } else {
                cita.checklistServicios = [{
                    nombre: cita.servicio?.nombre || 'Servicio General',
                    completado: false,
                    fechaCompletado: null,
                    completadoPor: null,
                    notas: ''
                }];
            }
        }

        // Toggle del servicio
        if (cita.checklistServicios[servicioIndex]) {
            const servicio = cita.checklistServicios[servicioIndex];
            servicio.completado = !servicio.completado;
            servicio.fechaCompletado = servicio.completado ? new Date() : null;
            servicio.completadoPor = servicio.completado ? empleadoId : null;
        }

        await cita.save();

        console.log('✅ Checklist guardado:', cita.checklistServicios.map(s => `${s.nombre} = ${s.completado}`));

        res.json({
            exito: true,
            mensaje: 'Checklist actualizado',
            checklist: cita.checklistServicios
        });
    } catch (error) {
        console.error('Error al actualizar checklist:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar checklist' });
    }
});

// ==================== COMISIONES DE EMPLEADOS ====================

// Obtener comisiones del taller
router.get('/:tallerId/comisiones', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const comisiones = await Comision.find({
            tallerId: req.params.tallerId,
            activo: true
        }).populate('empleadoId', 'nombre email rol');

        res.json({ exito: true, comisiones });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Crear o actualizar comisión
router.post('/:tallerId/comisiones', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { empleadoId, porcentaje, tipo, montoFijo } = req.body;

        // Buscar si ya existe
        let comision = await Comision.findOne({
            tallerId: req.params.tallerId,
            empleadoId
        });

        if (comision) {
            comision.porcentaje = porcentaje;
            comision.tipo = tipo || 'POR_LAVADO';
            comision.montoFijo = montoFijo || 0;
            await comision.save();
        } else {
            comision = new Comision({
                tallerId: req.params.tallerId,
                empleadoId,
                porcentaje,
                tipo: tipo || 'POR_LAVADO',
                montoFijo: montoFijo || 0
            });
            await comision.save();
        }

        res.json({ exito: true, comision });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ==================== REPORTE DE RENDIMIENTO ====================

// Rendimiento del taller por meses
router.get('/:tallerId/rendimiento', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { año } = req.query;
        const year = parseInt(año) || new Date().getFullYear();

        const inicioAño = new Date(year, 0, 1);
        const finAño = new Date(year + 1, 0, 1);

        // Obtener todas las citas entregadas del año
        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            estado: 'ENTREGADO',
            'fechas.entrega': { $gte: inicioAño, $lt: finAño }
        }).populate('empleadoAsignado', 'nombre');

        // Agrupar por mes
        const rendimientoMensual = Array.from({ length: 12 }, (_, i) => {
            const mes = i;
            const citasMes = citas.filter(c => {
                const fecha = new Date(c.fechas.entrega);
                return fecha.getMonth() === mes;
            });

            const totalIngresos = citasMes.reduce((sum, c) => sum + (c.pago?.monto || 0), 0);
            const totalTrabajos = citasMes.length;

            // Agrupar por empleado
            const empleados = {};
            citasMes.forEach(c => {
                const empId = String(c.empleadoAsignado?._id || 'sin-asignar');
                if (!empleados[empId]) {
                    empleados[empId] = {
                        nombre: c.empleadoAsignado?.nombre || 'Sin asignar',
                        trabajos: 0,
                        ingresos: 0
                    };
                }
                empleados[empId].trabajos++;
                empleados[empId].ingresos += (c.pago?.monto || 0);
            });

            return {
                mes: i + 1,
                nombre: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i],
                totalIngresos,
                totalTrabajos,
                empleados: Object.values(empleados)
            };
        });

        res.json({ exito: true, año: year, rendimientoMensual });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Rendimiento por empleado
router.get('/:tallerId/rendimiento-empleados', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { mes, año } = req.query;
        const now = new Date();
        const month = parseInt(mes) || now.getMonth();
        const year = parseInt(año) || now.getFullYear();

        const inicio = new Date(year, month, 1);
        const fin = new Date(year, month + 1, 1);

        // Obtener citas entregadas del mes
        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            estado: 'ENTREGADO',
            'fechas.entrega': { $gte: inicio, $lt: fin }
        }).populate('empleadoAsignado', 'nombre email');

        // ✅ Obtener TODOS los pagos realizados (no solo del mes)
        const pagosRealizados = await PagoEmpleado.find({
            tallerId: req.params.tallerId,
            estado: 'PAGADO'
        });

        // ✅ Crear un Set con todos los IDs de trabajos ya pagados
        const trabajosPagados = new Set();
        pagosRealizados.forEach(pago => {
            if (pago.trabajosIncluidos && Array.isArray(pago.trabajosIncluidos)) {
                pago.trabajosIncluidos.forEach(id => {
                    trabajosPagados.add(String(id));
                });
            }
        });

        console.log('📊 Trabajos pagados:', trabajosPagados.size);
        console.log('📊 Total citas del mes:', citas.length);

        // ✅ Filtrar citas que NO han sido pagadas aún
        const citasPendientes = citas.filter(c => !trabajosPagados.has(String(c._id)));

        console.log('📊 Citas pendientes de pago:', citasPendientes.length);

        // Agrupar por empleado SOLO las citas pendientes
        const empleados = {};
        citasPendientes.forEach(c => {
            const empId = String(c.empleadoAsignado?._id || 'sin-asignar');
            if (!empleados[empId]) {
                empleados[empId] = {
                    empleado: c.empleadoAsignado || { nombre: 'Sin asignar' },
                    trabajos: [],
                    totalTrabajos: 0,
                    totalIngresos: 0
                };
            }
            empleados[empId].trabajos.push({
                id: c._id,
                vehiculo: c.vehiculo,
                servicio: c.servicio?.nombre,
                monto: c.pago?.monto || 0,
                fecha: c.fechas?.entrega
            });
            empleados[empId].totalTrabajos++;
            empleados[empId].totalIngresos += (c.pago?.monto || 0);
        });

        // Obtener comisiones
        const comisiones = await Comision.find({
            tallerId: req.params.tallerId,
            activo: true
        });

        // Calcular pago para cada empleado
        const resultado = Object.values(empleados).map(emp => {
            const comision = comisiones.find(c =>
                String(c.empleadoId) === String(emp.empleado?._id)
            );
            const porcentaje = comision?.porcentaje || 30;
            const pago = Math.round((emp.totalIngresos * porcentaje) / 100);

            return {
                ...emp,
                comisionPorcentaje: porcentaje,
                pagoEstimado: pago
            };
        });

        res.json({
            exito: true,
            mes: month + 1,
            año: year,
            empleados: resultado,
            totalPendiente: resultado.reduce((sum, e) => sum + e.pagoEstimado, 0),
            debug: {
                totalCitas: citas.length,
                trabajosPagados: trabajosPagados.size,
                citasPendientes: citasPendientes.length
            }
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Generar pago a empleado
router.post('/:tallerId/pagos', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const {
            empleadoId, periodo, totalTrabajos, totalGenerado,
            comisionPorcentaje, comisionMonto, metodoPago, notas,
            trabajosIncluidos
        } = req.body;

        // ✅ VALIDAR CAMPOS REQUERIDOS
        if (!empleadoId || !periodo || !periodo.inicio || !periodo.fin) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Faltan campos requeridos: empleadoId, periodo.inicio, periodo.fin'
            });
        }

        const pago = new PagoEmpleado({
            tallerId: req.params.tallerId,
            empleadoId,
            periodo: {
                inicio: periodo.inicio,
                fin: periodo.fin
            },
            trabajosIncluidos: trabajosIncluidos || [],
            totalTrabajos: totalTrabajos || 0,
            totalGenerado: totalGenerado || 0,
            comisionPorcentaje: comisionPorcentaje || 100,
            comisionMonto: comisionMonto || totalGenerado,
            metodoPago: metodoPago || 'EFECTIVO',
            notas: notas || '',
            estado: 'PAGADO',
            fechaPago: new Date().toISOString()
        });

        await pago.save();

        // ✅ EMITIR NOTIFICACIÓN AL EMPLEADO
        if (req.io && empleadoId) {
            req.io.to(`empleado-${empleadoId}`).emit('nueva-notificacion-empleado', {
                tipo: 'PAGO_RECIBIDO',
                titulo: '💰 Pago Recibido',
                mensaje: `Has recibido un pago de RD$ ${(comisionMonto || totalGenerado || 0).toLocaleString()} por ${totalTrabajos || 0} trabajos`
            });
            console.log('📡 Notificación de pago enviada al empleado:', empleadoId);
        }

        res.status(201).json({ exito: true, pago });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Historial de pagos
router.get('/:tallerId/pagos', verificarToken, verificarPropietarioTaller, async (req, res) => {

    try {
        const pagos = await PagoEmpleado.find({ tallerId: req.params.tallerId })
            .populate('empleadoId', 'nombre email')
            .sort({ 'periodo.inicio': -1 });

        res.json({ exito: true, pagos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Marcar pago como realizado
router.put('/:tallerId/pagos/:pagoId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const pago = await PagoEmpleado.findOneAndUpdate(
            { _id: req.params.pagoId, tallerId: req.params.tallerId },
            {
                estado: 'PAGADO',
                fechaPago: new Date(),
                notas: req.body.notas
            },
            { new: true }
        );

        if (!pago) {
            return res.status(404).json({ exito: false, mensaje: 'Pago no encontrado' });
        }

        res.json({ exito: true, pago });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// Eliminar un pago
router.delete('/:tallerId/pagos/:pagoId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const pago = await PagoEmpleado.findOneAndDelete({
            _id: req.params.pagoId,
            tallerId: req.params.tallerId
        });

        if (!pago) {
            return res.status(404).json({ exito: false, mensaje: 'Pago no encontrado' });
        }

        res.json({ exito: true, mensaje: 'Pago eliminado' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 🔔 NOTIFICACIONES DEL TALLER - ENDPOINTS UNIFICADOS
// ====================================================================

/**
 * Obtener notificaciones del taller
 * GET /api/talleres/:tallerId/notificaciones
 */


router.get('/:tallerId/notificaciones', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { soloNoLeidas, limit, tipo } = req.query;

        // ✅ Convertir a ObjectId
        const filtros = {
            tallerId: new mongoose.Types.ObjectId(tallerId)
        };

        if (soloNoLeidas === 'true') {
            filtros.leida = false;
        }

        if (tipo) {
            filtros.tipo = tipo;
        }

        const notificaciones = await NotificacionTaller.find(filtros)
            .sort({ fecha: -1 })
            .limit(parseInt(limit) || 50);

        const totalNoLeidas = await NotificacionTaller.countDocuments({
            tallerId: new mongoose.Types.ObjectId(tallerId),
            leida: false
        });

        console.log(`📥 Notificaciones obtenidas: ${notificaciones.length} (${totalNoLeidas} sin leer)`);

        res.json({
            exito: true,
            notificaciones,
            total: notificaciones.length,
            totalNoLeidas
        });

    } catch (error) {
        console.error('❌ Error al obtener notificaciones:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Crear una notificación para el taller
 * POST /api/talleres/:tallerId/notificaciones
 */
router.post('/:tallerId/notificaciones', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { tipo, titulo, mensaje, detalle, prioridad, empleadoId } = req.body;

        const notificacion = new NotificacionTaller({
            tallerId: new mongoose.Types.ObjectId(tallerId),
            tipo: tipo || 'OTRO',
            titulo: titulo || 'Notificación',
            mensaje: mensaje || '',
            detalle: detalle || {},
            prioridad: prioridad || 'media',
            leida: false,
            fecha: new Date()
        });

        if (empleadoId) {
            notificacion.empleadoId = new mongoose.Types.ObjectId(empleadoId);
        }

        await notificacion.save();

        console.log(`🔔 Notificación creada: ${tipo} - ${titulo}`);

        res.status(201).json({ exito: true, notificacion });

    } catch (error) {
        console.error('❌ Error al crear notificación:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Marcar notificación como leída
 * PUT /api/talleres/notificaciones/:notificacionId/leer
 */
router.put('/notificaciones/:notificacionId/leer', async (req, res) => {
    try {
        const { notificacionId } = req.params;
        const { empleadoId } = req.body;

        const notificacion = await NotificacionTaller.findById(notificacionId);

        if (!notificacion) {
            return res.status(404).json({ exito: false, mensaje: 'Notificación no encontrada' });
        }

        notificacion.leida = true;
        if (empleadoId) {
            notificacion.leidaPor.push({
                empleadoId: new mongoose.Types.ObjectId(empleadoId),
                fecha: new Date()
            });
        }
        await notificacion.save();

        res.json({ exito: true, mensaje: 'Notificación marcada como leída', notificacion });

    } catch (error) {
        console.error('❌ Error al marcar leída:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Marcar TODAS las notificaciones como leídas
 * PUT /api/talleres/:tallerId/notificaciones/leer-todas
 */
router.put('/:tallerId/notificaciones/leer-todas', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { empleadoId } = req.body;

        const resultado = await NotificacionTaller.updateMany(
            {
                tallerId: new mongoose.Types.ObjectId(tallerId),
                leida: false
            },
            {
                leida: true,
                $push: {
                    leidaPor: {
                        empleadoId: empleadoId ? new mongoose.Types.ObjectId(empleadoId) : null,
                        fecha: new Date()
                    }
                }
            }
        );

        res.json({
            exito: true,
            mensaje: `${resultado.modifiedCount} notificaciones marcadas como leídas`,
            modificadas: resultado.modifiedCount
        });

    } catch (error) {
        console.error('❌ Error al marcar todas leídas:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Eliminar una notificación
 * DELETE /api/talleres/notificaciones/:notificacionId
 */
router.delete('/notificaciones/:notificacionId', async (req, res) => {
    try {
        const { notificacionId } = req.params;

        const notificacion = await NotificacionTaller.findByIdAndDelete(notificacionId);

        if (!notificacion) {
            return res.status(404).json({ exito: false, mensaje: 'Notificación no encontrada' });
        }

        res.json({ exito: true, mensaje: 'Notificación eliminada' });

    } catch (error) {
        console.error('❌ Error al eliminar notificación:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Obtener resumen de notificaciones (para badge)
 * GET /api/talleres/:tallerId/notificaciones/resumen
 */
router.get('/:tallerId/notificaciones/resumen', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const { tallerId } = req.params;
        const objectId = new mongoose.Types.ObjectId(tallerId);

        const [totalNoLeidas, ultimas5, porTipo] = await Promise.all([
            NotificacionTaller.countDocuments({
                tallerId: objectId,
                leida: false
            }),
            NotificacionTaller.find({
                tallerId: objectId,
                leida: false
            })
                .sort({ fecha: -1 })
                .limit(5)
                .select('tipo titulo mensaje fecha prioridad'),
            NotificacionTaller.aggregate([
                { $match: { tallerId: objectId, leida: false } },
                { $group: { _id: '$tipo', total: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ])
        ]);

        res.json({
            exito: true,
            totalNoLeidas,
            ultimas: ultimas5,
            porTipo: porTipo.reduce((acc, item) => {
                acc[item._id] = item.total;
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('❌ Error al obtener resumen:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 🔧 SERVICIOS DEL TALLER (CRUD)
// ====================================================================

/**
 * Obtener servicios del taller
 * GET /api/talleres/:tallerId/servicios
 */
router.get('/:tallerId/servicios', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        res.json({ exito: true, servicios: taller.servicios || [] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Crear un servicio
 * POST /api/talleres/:tallerId/servicios
 */
router.post('/:tallerId/servicios', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const { nombre, descripcion, precio, duracionEstimada, tipo } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre y precio son requeridos' });
        }

        taller.servicios.push({
            nombre,
            descripcion: descripcion || '',
            precio,
            duracionEstimada: duracionEstimada || 45,
            tipo: tipo || 'LAVADO',
            activo: true
        });

        await taller.save();
        console.log(`✅ Servicio creado: ${nombre} - RD$ ${precio}`);

        res.status(201).json({ exito: true, mensaje: 'Servicio creado', servicios: taller.servicios });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Actualizar un servicio
 * PUT /api/talleres/:tallerId/servicios/:servicioId
 */
router.put('/:tallerId/servicios/:servicioId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const servicio = taller.servicios.id(req.params.servicioId);
        if (!servicio) return res.status(404).json({ exito: false, mensaje: 'Servicio no encontrado' });

        const { nombre, descripcion, precio, duracionEstimada, tipo, activo } = req.body;

        if (nombre !== undefined) servicio.nombre = nombre;
        if (descripcion !== undefined) servicio.descripcion = descripcion;
        if (precio !== undefined) servicio.precio = precio;
        if (duracionEstimada !== undefined) servicio.duracionEstimada = duracionEstimada;
        if (tipo !== undefined) servicio.tipo = tipo;
        if (activo !== undefined) servicio.activo = activo;

        await taller.save();
        console.log(`✅ Servicio actualizado: ${servicio.nombre}`);

        res.json({ exito: true, mensaje: 'Servicio actualizado', servicios: taller.servicios });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Eliminar un servicio
 * DELETE /api/talleres/:tallerId/servicios/:servicioId
 */
router.delete('/:tallerId/servicios/:servicioId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const servicio = taller.servicios.id(req.params.servicioId);
        if (!servicio) return res.status(404).json({ exito: false, mensaje: 'Servicio no encontrado' });

        servicio.deleteOne();
        await taller.save();
        console.log(`🗑️ Servicio eliminado`);

        res.json({ exito: true, mensaje: 'Servicio eliminado', servicios: taller.servicios });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ====================================================================
// 📦 PLANES DEL TALLER (CRUD)
// ====================================================================

/**
 * Obtener planes del taller
 * GET /api/talleres/:tallerId/planes
 */
router.get('/:tallerId/planes', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        res.json({ exito: true, planes: taller.planes || [] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Crear un plan
 * POST /api/talleres/:tallerId/planes
 */
router.post('/:tallerId/planes', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const { nombre, descripcion, precio, serviciosIncluidos, duracionDias, tipoServicio, numeroLavados } = req.body;

        if (!nombre || !precio || !serviciosIncluidos) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre, precio y serviciosIncluidos son requeridos' });
        }

        taller.planes.push({
            nombre,
            descripcion: descripcion || '',
            precio,
            serviciosIncluidos,
            duracionDias: duracionDias || 30,
            tipoServicio: tipoServicio || '',
            numeroLavados: numeroLavados || 0, // ✅ NUEVO
            activo: true
        });

        await taller.save();
        console.log(`✅ Plan creado: ${nombre} - RD$ ${precio}`);

        res.status(201).json({ exito: true, mensaje: 'Plan creado', planes: taller.planes });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Actualizar un plan
 * PUT /api/talleres/:tallerId/planes/:planId
 */
router.put('/:tallerId/planes/:planId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const plan = taller.planes.id(req.params.planId);
        if (!plan) return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });

        const { nombre, descripcion, precio, serviciosIncluidos, duracionDias, tipoServicio, activo, numeroLavados } = req.body;

        if (nombre !== undefined) plan.nombre = nombre;
        if (descripcion !== undefined) plan.descripcion = descripcion;
        if (precio !== undefined) plan.precio = precio;
        if (serviciosIncluidos !== undefined) plan.serviciosIncluidos = serviciosIncluidos;
        if (duracionDias !== undefined) plan.duracionDias = duracionDias;
        if (tipoServicio !== undefined) plan.tipoServicio = tipoServicio;
        if (activo !== undefined) plan.activo = activo;
        if (numeroLavados !== undefined) plan.numeroLavados = numeroLavados; // ✅ NUEVO

        await taller.save();
        console.log(`✅ Plan actualizado: ${plan.nombre}`);

        res.json({ exito: true, mensaje: 'Plan actualizado', planes: taller.planes });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});
/**
 * Eliminar un plan
 * DELETE /api/talleres/:tallerId/planes/:planId
 */
router.delete('/:tallerId/planes/:planId', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        const plan = taller.planes.id(req.params.planId);
        if (!plan) return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });

        plan.deleteOne();
        await taller.save();
        console.log(`🗑️ Plan eliminado`);

        res.json({ exito: true, mensaje: 'Plan eliminado', planes: taller.planes });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ================================================================
// 🔹 SUSCRIPCIONES DE PLANES (CLIENTE)
// ================================================================

/**
 * GET /api/talleres/:tallerId/clientes/:clienteId/plan-actual
 * Obtener el plan activo del cliente en un taller
 * 
 * Busca la suscripción ACTIVA más reciente del cliente en ese taller.
 * Si no hay ninguna, devuelve 404.
 */
router.get('/:tallerId/clientes/:clienteId/plan-actual', async (req, res) => {
    try {
        const { tallerId, clienteId } = req.params;
        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        // Marcar vencidas primero
        await SuscripcionPlan.marcarVencidas();

        // Buscar suscripción activa
        const suscripcion = await SuscripcionPlan.findOne({
            clienteId,
            tallerId,
            estado: 'ACTIVA',
            fechaVencimiento: { $gte: new Date() },
        }).sort({ createdAt: -1 });

        if (!suscripcion) {
            return res.status(404).json({
                exito: false,
                mensaje: 'El cliente no tiene un plan activo en este taller',
            });
        }

        // Calcular información adicional
        const diasRestantes = suscripcion.calcularDiasRestantes();
        const progreso = suscripcion.calcularProgreso();

        res.json({
            exito: true,
            plan: {
                _id: suscripcion._id,
                planId: suscripcion.planId,
                nombre: suscripcion.planData.nombre,
                nivel: suscripcion.planData.nivel,
                precio: suscripcion.planData.precio,
                duracionDias: suscripcion.planData.duracionDias,
                serviciosIncluidos: suscripcion.planData.serviciosIncluidos,
                servicios: suscripcion.planData.servicios || [],
                numeroLavados: suscripcion.planData.numeroLavados || 0,

                // Estado
                fechaInicio: suscripcion.fechaInicio,
                fechaVencimiento: suscripcion.fechaVencimiento,
                diasRestantes,
                estado: suscripcion.estado,

                // Uso
                serviciosUsados: suscripcion.serviciosUsados,
                serviciosRestantes: suscripcion.serviciosRestantes,
                progreso,
                lavadosUsados: suscripcion.lavadosUsados,
                historialUso: suscripcion.historialUso,

                // Pago
                montoPagado: suscripcion.montoPagado,
                metodoPago: suscripcion.metodoPago,
                estadoPago: suscripcion.estadoPago,
            },
        });

    } catch (error) {
        console.error('❌ Error obteniendo plan actual:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al obtener plan actual: ' + error.message,
        });
    }
});

/**
 * POST /api/talleres/:tallerId/clientes/:clienteId/planes/:planId/contratar
 * Contratar un plan
 */
router.post('/:tallerId/clientes/:clienteId/planes/:planId/contratar', async (req, res) => {
    try {
        const { tallerId, clienteId, planId } = req.params;
        const { metodoPago = 'EFECTIVO' } = req.body;

        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        // Verificar que el taller existe y tiene el plan
        const taller = await Taller.findById(tallerId);
        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        const plan = (taller.planes || []).find(p => p._id.toString() === planId);
        if (!plan) {
            return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });
        }

        // Verificar que el cliente no tenga ya una suscripción activa a este plan
        const existente = await SuscripcionPlan.findOne({
            clienteId,
            tallerId,
            planId,
            estado: 'ACTIVA',
            fechaVencimiento: { $gte: new Date() },
        });

        if (existente) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El cliente ya tiene este plan activo',
            });
        }

        // Parsear servicios del plan
        let servicios = [];
        try {
            if (plan.descripcion) {
                const parsed = typeof plan.descripcion === 'string'
                    ? JSON.parse(plan.descripcion)
                    : plan.descripcion;
                servicios = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('⚠️ No se pudo parsear descripcion del plan:', e.message);
        }

        // Calcular fecha de vencimiento
        const fechaInicio = new Date();
        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (plan.duracionDias || 30));

        // Crear suscripción
        const suscripcion = new SuscripcionPlan({
            clienteId,
            tallerId,
            planId,
            planData: {
                nombre: plan.nombre,
                precio: plan.precio,
                duracionDias: plan.duracionDias || 30,
                serviciosIncluidos: plan.serviciosIncluidos || servicios.length,
                servicios,
                nivel: plan.nivel || 'NORMAL',
                numeroLavados: plan.numeroLavados || 0,
            },
            fechaInicio,
            fechaVencimiento,
            estado: 'ACTIVA',
            serviciosUsados: 0,
            serviciosRestantes: plan.serviciosIncluidos || servicios.length,
            montoPagado: plan.precio,
            metodoPago,
            estadoPago: 'PAGADO',
        });

        await suscripcion.save();

        console.log(`✅ Plan contratado: ${plan.nombre} por cliente ${clienteId} en taller ${tallerId}`);

        res.json({
            exito: true,
            mensaje: 'Plan contratado exitosamente',
            suscripcion: {
                _id: suscripcion._id,
                nombre: plan.nombre,
                fechaInicio: suscripcion.fechaInicio,
                fechaVencimiento: suscripcion.fechaVencimiento,
            },
        });

    } catch (error) {
        console.error('❌ Error contratando plan:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al contratar plan: ' + error.message,
        });
    }
});

/**
 * POST /api/suscripciones/:suscripcionId/usar-servicio
 * Registrar el uso de un servicio del plan (llamado desde el flujo de citas)
 */
router.post('/suscripciones/:suscripcionId/usar-servicio', async (req, res) => {
    try {
        const { suscripcionId } = req.params;
        const { citaId, servicio, monto, empleadoId, notas } = req.body;

        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        const suscripcion = await SuscripcionPlan.findById(suscripcionId);

        if (!suscripcion) {
            return res.status(404).json({ exito: false, mensaje: 'Suscripción no encontrada' });
        }

        if (!suscripcion.estaActiva()) {
            return res.status(400).json({ exito: false, mensaje: 'La suscripción no está activa' });
        }

        if (suscripcion.serviciosRestantes <= 0) {
            return res.status(400).json({ exito: false, mensaje: 'No quedan servicios en este plan' });
        }

        // Registrar uso
        suscripcion.serviciosUsados += 1;
        suscripcion.historialUso.push({
            fecha: new Date(),
            citaId,
            servicio,
            monto: monto || 0,
            empleadoId,
            notas,
        });

        await suscripcion.save();

        res.json({
            exito: true,
            mensaje: 'Servicio registrado en el plan',
            serviciosRestantes: suscripcion.serviciosRestantes,
            serviciosUsados: suscripcion.serviciosUsados,
        });

    } catch (error) {
        console.error('❌ Error usando servicio:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error: ' + error.message,
        });
    }
});

/**
 * PUT /api/suscripciones/:suscripcionId/cancelar
 * Cancelar una suscripción
 */
router.put('/suscripciones/:suscripcionId/cancelar', async (req, res) => {
    try {
        const { suscripcionId } = req.params;
        const { motivo = 'Sin motivo especificado', canceladaPor = 'CLIENTE' } = req.body;

        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        const suscripcion = await SuscripcionPlan.findById(suscripcionId);

        if (!suscripcion) {
            return res.status(404).json({ exito: false, mensaje: 'Suscripción no encontrada' });
        }

        suscripcion.estado = 'CANCELADA';
        suscripcion.canceladaPor = canceladaPor;
        suscripcion.motivoCancelacion = motivo;
        await suscripcion.save();

        res.json({
            exito: true,
            mensaje: 'Suscripción cancelada',
        });

    } catch (error) {
        console.error('❌ Error cancelando suscripción:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error: ' + error.message,
        });
    }
});






/**
 * POST /api/talleres/suscripciones/:suscripcionId/renovar
 * Renovar una suscripción (extender por otro período)
 */
router.post('/suscripciones/:suscripcionId/renovar', async (req, res) => {
    try {
        const { suscripcionId } = req.params;
        const { metodoPago = 'EFECTIVO' } = req.body;

        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        const suscripcion = await SuscripcionPlan.findById(suscripcionId);

        if (!suscripcion) {
            return res.status(404).json({ exito: false, mensaje: 'Suscripción no encontrada' });
        }

        // Calcular nueva fecha de vencimiento
        const nuevaFecha = new Date();
        nuevaFecha.setDate(nuevaFecha.getDate() + (suscripcion.planData.duracionDias || 30));

        // Guardar historial del período anterior
        const periodosAnteriores = suscripcion.historialUso || [];

        // Actualizar suscripción (mantener historial, resetear contadores)
        suscripcion.fechaInicio = new Date();
        suscripcion.fechaVencimiento = nuevaFecha;
        suscripcion.estado = 'ACTIVA';
        suscripcion.serviciosUsados = 0;
        suscripcion.serviciosRestantes = suscripcion.planData.serviciosIncluidos;
        suscripcion.lavadosUsados = 0;
        suscripcion.metodoPago = metodoPago;
        suscripcion.montoPagado = suscripcion.planData.precio;
        suscripcion.estadoPago = 'PAGADO';

        await suscripcion.save();

        console.log(`✅ Suscripción renovada: ${suscripcion._id} hasta ${nuevaFecha.toISOString()}`);

        res.json({
            exito: true,
            mensaje: 'Suscripción renovada',
            suscripcion: {
                _id: suscripcion._id,
                nombre: suscripcion.planData.nombre,
                fechaInicio: suscripcion.fechaInicio,
                fechaVencimiento: suscripcion.fechaVencimiento,
                serviciosRestantes: suscripcion.serviciosRestantes,
            },
        });

    } catch (error) {
        console.error('❌ Error renovando suscripción:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al renovar: ' + error.message,
        });
    }
});

/**
 * GET /api/talleres/suscripciones/:suscripcionId
 * Obtener detalles completos de una suscripción (para el modal)
 */
router.get('/suscripciones/:suscripcionId', async (req, res) => {
    try {
        const { suscripcionId } = req.params;
        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        const suscripcion = await SuscripcionPlan.findById(suscripcionId)
            .populate('tallerId', 'nombre logo direccion telefono')
            .populate('historialUso.citaId', 'fecha servicio estado');

        if (!suscripcion) {
            return res.status(404).json({ exito: false, mensaje: 'Suscripción no encontrada' });
        }

        res.json({
            exito: true,
            suscripcion,
        });

    } catch (error) {
        console.error('❌ Error obteniendo suscripción:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error: ' + error.message,
        });
    }
});
/**
 * GET /api/clientes/:clienteId/suscripciones
 * Listar todas las suscripciones del cliente
 */
router.get('/clientes/:clienteId/suscripciones', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const SuscripcionPlan = (await import('../models/SuscripcionPlan.js')).default;

        // Marcar vencidas primero
        await SuscripcionPlan.marcarVencidas();

        const suscripciones = await SuscripcionPlan.find({ clienteId })
            .populate('tallerId', 'nombre logo')
            .sort({ createdAt: -1 });

        res.json({
            exito: true,
            suscripciones,
        });

    } catch (error) {
        console.error('❌ Error listando suscripciones:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error: ' + error.message,
        });
    }
});
// ====================================================================
// ⭐ CALIFICACIONES DEL TALLER
// ====================================================================

/**
 * Obtener calificaciones de un taller
 */
router.get('/:tallerId/calificaciones', verificarToken, verificarPropietarioTaller, async (req, res) => {
    try {
        const taller = await Taller.findById(req.params.tallerId);
        if (!taller) return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });

        // Obtener reseñas de CitaTaller que tengan calificación
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const citasCalificadas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            'calificacion.puntuacion': { $exists: true, $gt: 0 }
        })
            .populate('clienteId', 'nombre')
            .sort({ 'calificacion.fecha': -1 })
            .limit(20)
            .lean();

        const resenas = citasCalificadas.map(c => ({
            puntuacion: c.calificacion.puntuacion,
            comentario: c.calificacion.comentario || '',
            fecha: c.calificacion.fecha || c.fechas?.entrega,
            cliente: c.clienteId ? { nombre: c.clienteId.nombre } : { nombre: 'Cliente' }
        }));

        // Calcular distribución
        const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        resenas.forEach(r => {
            if (distribucion[r.puntuacion] !== undefined) distribucion[r.puntuacion]++;
        });

        const promedio = resenas.length > 0
            ? resenas.reduce((sum, r) => sum + r.puntuacion, 0) / resenas.length
            : 0;

        res.json({
            exito: true,
            promedio: Math.round(promedio * 10) / 10,
            total: resenas.length,
            distribucion,
            resenas
        });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Agregar calificación a un taller
 */

router.post('/:tallerId/calificaciones', verificarToken, async (req, res) => {
    try {
        const { tallerId } = req.params;
        const { puntuacion, comentario, clienteId } = req.body;

        console.log('⭐ Recibiendo calificación:', { tallerId, puntuacion, clienteId });

        if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
            return res.status(400).json({ exito: false, mensaje: 'Puntuación inválida (1-5)' });
        }

        const CitaTaller = (await import('../models/CitaTaller.js')).default;

        // ✅ 1. Buscar la cita ENTREGADA más reciente (aunque ya tenga calificación)
        let cita = null;

        if (clienteId) {
            // Primero buscar una sin calificar
            cita = await CitaTaller.findOne({
                tallerId: tallerId,
                clienteId: clienteId,
                estado: 'ENTREGADO',
                $or: [
                    { 'calificacion': { $exists: false } },
                    { 'calificacion.puntuacion': { $exists: false } },
                    { 'calificacion.puntuacion': 0 },
                    { 'calificacion.puntuacion': null }
                ]
            }).sort({ 'fechas.entrega': -1 });

            // Si no hay sin calificar, tomar la más reciente (sobrescribir)
            if (!cita) {
                cita = await CitaTaller.findOne({
                    tallerId: tallerId,
                    clienteId: clienteId,
                    estado: 'ENTREGADO'
                }).sort({ 'fechas.entrega': -1 });

                if (cita) {
                    console.log('⚠️ Sobrescribiendo calificación existente en cita:', cita._id);
                }
            }
        }

        // Si no hay cita del cliente, buscar cualquier cita ENTREGADA del taller
        if (!cita) {
            cita = await CitaTaller.findOne({
                tallerId: tallerId,
                estado: 'ENTREGADO'
            }).sort({ 'fechas.entrega': -1 });
        }

        if (cita) {
            // ✅ Guardar/actualizar calificación
            cita.calificacion = {
                puntuacion: puntuacion,
                comentario: comentario || '',
                fecha: new Date()
            };
            await cita.save();
            console.log('✅ Calificación guardada en cita:', cita._id);
        } else {
            console.log('⚠️ No se encontró ninguna cita para guardar la calificación');
        }

        // ✅ 2. Recalcular promedio del taller
        const Taller = (await import('../models/Taller.js')).default;
        const taller = await Taller.findById(tallerId);

        if (taller) {
            const todasCalificadas = await CitaTaller.find({
                tallerId: tallerId,
                'calificacion.puntuacion': { $exists: true, $gt: 0 }
            });

            const total = todasCalificadas.length;
            const suma = todasCalificadas.reduce((s, c) => s + (c.calificacion?.puntuacion || 0), 0);
            const promedio = total > 0 ? suma / total : 0;

            taller.calificacion = {
                promedio: Math.round(promedio * 10) / 10,
                totalReseñas: total
            };
            await taller.save();
            console.log(`⭐ Promedio actualizado: ${promedio.toFixed(1)} (${total} reseñas)`);
        }

        res.json({
            exito: true,
            mensaje: '¡Gracias por tu calificación!'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Obtener galería de fotos del taller
 */
router.get('/:tallerId/galeria', async (req, res) => {
    try {
        const CitaTaller = (await import('../models/CitaTaller.js')).default;
        const citas = await CitaTaller.find({
            tallerId: req.params.tallerId,
            $or: [
                { 'fotos.despues': { $exists: true, $not: { $size: 0 } } },
                { 'fotos.antes': { $exists: true, $not: { $size: 0 } } }
            ]
        }).select('fotos').limit(20).lean();

        const fotos = [];
        citas.forEach(cita => {
            if (cita.fotos?.despues) {
                cita.fotos.despues.forEach(f => fotos.push({ url: f.url, tipo: 'despues' }));
            }
            if (cita.fotos?.antes) {
                cita.fotos.antes.forEach(f => fotos.push({ url: f.url, tipo: 'antes' }));
            }
        });

        res.json({ exito: true, fotos: fotos.slice(0, 12) });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * Función auxiliar: Actualiza el estado en el modelo Cita del usuario
 * cuando el taller cambia el estado de una cita
 */
async function actualizarEstadoEnUsuario(citaTaller) {
    try {
        const Cita = (await import('../models/citaModel.js')).default;

        // Buscar la cita del usuario por múltiples criterios
        let citaUsuario = await Cita.findOne({
            'vehiculo.placa': citaTaller.vehiculo?.placa,
            fecha: citaTaller.fecha,
            hora: citaTaller.hora
        });

        // Si no encuentra por placa exacta, buscar sin case sensitive
        if (!citaUsuario && citaTaller.vehiculo?.placa) {
            const placaUpper = citaTaller.vehiculo.placa.toUpperCase();
            citaUsuario = await Cita.findOne({
                fecha: citaTaller.fecha,
                hora: citaTaller.hora,
                $expr: {
                    $eq: [{ $toUpper: '$vehiculo.placa' }, placaUpper]
                }
            });
        }

        if (citaUsuario) {
            citaUsuario.estado = citaTaller.estado;
            if (citaTaller.bahiaAsignada) citaUsuario.bahiaAsignada = citaTaller.bahiaAsignada;
            if (citaTaller.empleadoAsignado) citaUsuario.empleadoAsignado = citaTaller.empleadoAsignado;
            await citaUsuario.save();
            console.log(`✅ Modelo Cita actualizado: ${citaUsuario._id} → ${citaTaller.estado}`);
        } else {
            console.warn(`⚠️ No se encontró cita en modelo Cita para: ${citaTaller.vehiculo?.placa} ${citaTaller.fecha} ${citaTaller.hora}`);
        }

        // Actualizar en array misCitas del usuario
        if (citaTaller.clienteId) {
            const usuario = await Usuario.findById(citaTaller.clienteId);
            if (usuario) {
                let actualizado = false;
                for (const citaEnArray of usuario.misCitas) {
                    const placaMatch = citaEnArray.vehiculo?.placa?.toUpperCase() === citaTaller.vehiculo?.placa?.toUpperCase();
                    if (placaMatch && citaEnArray.fecha === citaTaller.fecha && citaEnArray.hora === citaTaller.hora) {
                        citaEnArray.estado = citaTaller.estado;
                        actualizado = true;
                        console.log(`✅ Array usuario actualizado → ${citaTaller.estado}`);
                        break;
                    }
                }
                if (actualizado) await usuario.save();
            }
        }
    } catch (error) {
        console.warn('⚠️ No se pudo actualizar en modelo Cita:', error.message);
    }
}

export default router;
