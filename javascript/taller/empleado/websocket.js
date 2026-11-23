/**
 * MÓDULO WEBSOCKET - Conexión del empleado
 * ✅ Con soporte para perfil, reseñas, comentarios y reacciones en tiempo real
 */
import { WS_URL } from '../../config.js';
let socket = null;

export function conectarWebSocket(empleadoId, tallerId, callbacks = {}) {
    if (!empleadoId || !tallerId) return;

    // Si ya hay una conexión, la cerramos antes de reconectar
    if (socket) {
        socket.disconnect();
    }

    try {
        // URL dinámica: localhost en dev, mismo host en prod

        socket = io(WS_URL);

        socket.on('connect', () => {
            console.log('🔌 Empleado conectado al WebSocket');
            socket.emit('unirse-empleado', empleadoId);

        });

        // ================================================================
        // 🔹 PERFIL ACTUALIZADO (Empleado, Cliente, Taller)
        // ================================================================
        socket.on('perfil-actualizado', (data) => {
            console.log('🔄 [WS] perfil-actualizado recibido:', data);

            // Caso 1: Es el empleado actual
            if (data.tipo === 'EMPLEADO' && data.id === empleadoId) {
                if (typeof callbacks.onPerfilActualizado === 'function') {
                    callbacks.onPerfilActualizado(data.cambios);
                } else {
                    console.warn('⚠️ callback onPerfilActualizado no definido');
                }
            }

            // Caso 2: Es un cliente
            if (data.tipo === 'CLIENTE') {
                if (typeof callbacks.onClienteActualizado === 'function') {
                    callbacks.onClienteActualizado(data.id, data.cambios);
                }
            }

            // Caso 3: Es el taller
            if (data.tipo === 'TALLER') {
                if (typeof callbacks.onTallerActualizado === 'function') {
                    callbacks.onTallerActualizado(data.cambios);
                }
            }
        });

        // ================================================================
        // 🔹 EVENTOS DE RESEÑAS EN TIEMPO REAL
        // ================================================================
        const eventosResenas = [
            'resena-respondida',
            'comentario-creado',
            'comentario-respondido',
            'reaccion-actualizada'
        ];

        eventosResenas.forEach(evento => {
            socket.on(evento, (data) => {
                console.log(`🔄 [WS] ${evento} recibido:`, data);

                if (typeof callbacks.onResenaActualizada === 'function') {
                    callbacks.onResenaActualizada(evento, data);
                }
            });
        });

        // ================================================================
        // 🔹 NOTIFICACIONES
        // ================================================================
        socket.on('nueva-notificacion-empleado', (data) => {
            console.log('📡 Notificación recibida:', data);

            // Guardar en localStorage
            try {
                const notifs = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]');
                notifs.unshift({
                    empleadoId,
                    tipo: data.tipo || 'OTRO',
                    titulo: data.titulo || 'Notificación',
                    mensaje: data.mensaje || '',
                    fecha: new Date().toISOString(),
                    leida: false
                });
                localStorage.setItem('notificaciones_empleados', JSON.stringify(notifs));
            } catch (e) {
                console.error('Error guardando notificación:', e);
            }

            // Callback del dashboard
            if (typeof callbacks.onNotificacion === 'function') {
                callbacks.onNotificacion(data);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Empleado desconectado');
        });

        return socket;
    } catch (error) {
        console.warn('⚠️ WebSocket no disponible:', error.message);
    }
}

export function desconectarWebSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export default { conectarWebSocket, desconectarWebSocket };