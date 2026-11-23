/**
 * MÓDULO WEBSOCKET - Conexión del TALLER
 * ✅ Maneja: notificaciones, perfil actualizado, reseñas en tiempo real
 */
import { WS_URL } from '../config.js';
let socket = null;

export function conectarWebSocketTaller(tallerId, callbacks = {}) {
    if (!tallerId) {
        console.warn('⚠️ conectarWebSocketTaller: falta tallerId');
        return;
    }

    // Si ya hay conexión, cerrarla antes de reconectar
    if (socket) {
        socket.disconnect();
    }

    try {

        socket = io(WS_URL);

        // ================================================================
        // 🔹 CONEXIÓN
        // ================================================================
        socket.on('connect', () => {
            console.log('🔌 [WS Taller] Conectado al servidor');
            socket.emit('unirse-taller', tallerId);
            console.log(`🏪 [WS Taller] Unido al room taller-${tallerId}`);
        });

        // ================================================================
        // 🔔 NOTIFICACIONES
        // ================================================================
        socket.on('nueva-notificacion', (data) => {
            console.log('📡 [WS Taller] nueva-notificacion:', data);
            if (typeof callbacks.onNotificacion === 'function') {
                callbacks.onNotificacion(data);
            }
        });

        // ================================================================
        // 🔄 PERFIL ACTUALIZADO (Empleado, Cliente, Taller)
        // ================================================================
        socket.on('perfil-actualizado', (data) => {
            console.log('🔄 [WS Taller] perfil-actualizado:', data);

            // Caso 1: Es un EMPLEADO
            if (data.tipo === 'EMPLEADO') {
                if (typeof callbacks.onEmpleadoActualizado === 'function') {
                    callbacks.onEmpleadoActualizado(data.id, data.cambios);
                }
            }

            // Caso 2: Es un CLIENTE
            if (data.tipo === 'CLIENTE') {
                if (typeof callbacks.onClienteActualizado === 'function') {
                    callbacks.onClienteActualizado(data.id, data.cambios);
                }
            }

            // Caso 3: Es el TALLER actual
            if (data.tipo === 'TALLER' && String(data.id) === String(tallerId)) {
                if (typeof callbacks.onTallerActualizado === 'function') {
                    callbacks.onTallerActualizado(data.cambios);
                }
            }
        });

        // ================================================================
        // ⭐ EVENTOS DE RESEÑAS EN TIEMPO REAL
        // ================================================================
        const eventosResenas = [
            'resena-respondida',
            'comentario-creado',
            'comentario-respondido',
            'comentario-eliminado',
            'reaccion-actualizada'
        ];

        eventosResenas.forEach(evento => {
            socket.on(evento, (data) => {
                console.log(`🔄 [WS Taller] ${evento}:`, data);
                if (typeof callbacks.onResenaActualizada === 'function') {
                    callbacks.onResenaActualizada(evento, data);
                }
            });
        });

        // ================================================================
        // 🔌 DESCONEXIÓN
        // ================================================================
        socket.on('disconnect', () => {
            console.log('🔌 [WS Taller] Desconectado del servidor');
        });

        return socket;
    } catch (error) {
        console.warn('⚠️ [WS Taller] WebSocket no disponible:', error.message);
    }
}

export function desconectarWebSocketTaller() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('🔌 [WS Taller] Desconectado manualmente');
    }
}

export default { conectarWebSocketTaller, desconectarWebSocketTaller };