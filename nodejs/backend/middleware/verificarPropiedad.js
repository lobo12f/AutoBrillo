// nodejs/backend/middleware/verificarPropiedad.js

/**
 * Middleware que verifica que el taller autenticado sea el dueño
 * del recurso al que intenta acceder.
 *
 * Compara:
 *   - req.usuario.tallerId (del token JWT)
 *   - req.params.tallerId (de la URL)
 *
 * Si no coinciden → 403 Forbidden
 */
import CitaTaller from '../models/CitaTaller.js';
import Usuario from '../models/personaModel.js';

export function verificarPropietarioTaller(req, res, next) {
    // 1. Verificar que haya usuario autenticado
    if (!req.usuario) {
        return res.status(401).json({
            exito: false,
            mensaje: 'No autenticado.'
        });
    }

    // 2. Extraer tallerId del token
    const tallerIdToken = req.usuario.tallerId;
    const tipo = req.usuario.tipo;

    // 3. Si es CLIENTE, permitir (los clientes pueden ver talleres)
    if (tipo === 'CLIENTE') {
        return next();
    }

    // 4. Si es TALLER o EMPLEADO, verificar que coincida
    if (tipo === 'TALLER' || tipo === 'EMPLEADO') {
        const tallerIdURL = req.params.tallerId;

        // Si no hay tallerId en la URL, no hay nada que verificar
        if (!tallerIdURL) {
            return next();
        }

        // Comparar como strings
        if (String(tallerIdToken) !== String(tallerIdURL)) {
            console.warn(`🚫 Acceso denegado: token=${tallerIdToken} vs URL=${tallerIdURL}`);
            return res.status(403).json({
                exito: false,
                mensaje: 'No tienes permiso para acceder a este taller.'
            });
        }

        return next();
    }

    // 5. Tipo desconocido → denegar
    return res.status(403).json({
        exito: false,
        mensaje: 'Tipo de usuario no autorizado.'
    });
}

/**
 * Middleware que verifica que el empleado autenticado sea el dueño
 * del recurso.
 *
 * Compara:
 *   - req.usuario.empleadoId (del token JWT)
 *   - req.params.empleadoId (de la URL)
 */
export function verificarPropietarioEmpleado(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            exito: false,
            mensaje: 'No autenticado.'
        });
    }

    // Si es TALLER, permitir (el taller puede gestionar a sus empleados)
    if (req.usuario.tipo === 'TALLER') {
        return next();
    }

    // Si es EMPLEADO, verificar que sea él mismo
    if (req.usuario.tipo === 'EMPLEADO') {
        const empleadoIdToken = req.usuario.empleadoId || req.usuario.id;
        const empleadoIdURL = req.params.empleadoId;

        if (empleadoIdURL && String(empleadoIdToken) !== String(empleadoIdURL)) {
            return res.status(403).json({
                exito: false,
                mensaje: 'No puedes modificar el perfil de otro empleado.'
            });
        }

        return next();
    }

    return res.status(403).json({
        exito: false,
        mensaje: 'Tipo de usuario no autorizado.'
    });
}


/**
 * Middleware que verifica que el taller autenticado sea el dueño
 * de la CITA (identificada por req.params.citaId).
 */
export async function verificarPropietarioCita(req, res, next) {
    try {
        if (!req.usuario) {
            return res.status(401).json({
                exito: false,
                mensaje: 'No autenticado.'
            });
        }

        const citaId = req.params.citaId;
        if (!citaId) {
            return res.status(400).json({
                exito: false,
                mensaje: 'ID de cita requerido.'
            });
        }

        const cita = await CitaTaller.findById(citaId).select('tallerId');
        if (!cita) {
            return res.status(404).json({
                exito: false,
                mensaje: 'Cita no encontrada.'
            });
        }

        // Si el usuario es CLIENTE, permitir (el cliente puede ver sus citas)
        if (req.usuario.tipo === 'CLIENTE') {
            return next();
        }

        const tallerIdToken = req.usuario.tallerId;
        const tallerIdCita = cita.tallerId?.toString();

        if (String(tallerIdToken) !== String(tallerIdCita)) {
            console.warn(`🚫 Acceso denegado a cita: token=${tallerIdToken} vs cita=${tallerIdCita}`);
            return res.status(403).json({
                exito: false,
                mensaje: 'No tienes permiso para acceder a esta cita.'
            });
        }

        next();
    } catch (error) {
        console.error('Error en verificarPropietarioCita:', error);
        return res.status(500).json({
            exito: false,
            mensaje: 'Error al verificar propiedad.'
        });
    }
}



/**
 * Middleware que verifica que el usuario autenticado sea el dueño
 * del recurso del cliente identificado por `:clienteId` o `:usuarioId`.
 */
export function verificarPropietarioCliente(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            exito: false,
            mensaje: 'No autenticado.'
        });
    }

    // Obtener el ID del cliente autenticado
    const clienteIdToken = req.usuario.id;
    const tipo = req.usuario.tipo;

    // Si es TALLER, permitir (el taller puede ver citas de sus clientes)
    if (tipo === 'TALLER') {
        return next();
    }

    // Si es EMPLEADO, permitir (el empleado puede ver citas de clientes)
    if (tipo === 'EMPLEADO') {
        return next();
    }

    // Si es CLIENTE, verificar que sea él mismo
    if (tipo === 'CLIENTE') {
        const clienteIdURL = req.params.clienteId || req.params.usuarioId;

        if (clienteIdURL && String(clienteIdToken) !== String(clienteIdURL)) {
            console.warn(`🚫 Acceso denegado: token=${clienteIdToken} vs URL=${clienteIdURL}`);
            return res.status(403).json({
                exito: false,
                mensaje: 'No tienes permiso para acceder a los datos de otro cliente.'
            });
        }

        return next();
    }

    return res.status(403).json({
        exito: false,
        mensaje: 'Tipo de usuario no autorizado.'
    });
}