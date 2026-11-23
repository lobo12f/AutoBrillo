/**
 * MÓDULO WEBSOCKET - Conexión del CLIENTE
 * ✅ Maneja: notificaciones de citas, cambios de estado, perfil
 */
import { WS_URL } from '../config.js';
let socket = null;

export function conectarWebSocketCliente(clienteId, callbacks = {}) {
    if (!clienteId) {
        console.warn('⚠️ conectarWebSocketCliente: falta clienteId');
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
            console.log('🔌 [WS Cliente] Conectado al servidor');
            socket.emit('unirse-cliente', clienteId);
            console.log(`👤 [WS Cliente] Unido al room cliente-${clienteId}`);
        });

        // ================================================================
        // ⏰ CITA EXPIRADA
        // ================================================================
        socket.on('cita-expirada', (data) => {
            console.log('⏰ [WS Cliente] cita-expirada:', data);
            if (typeof window.manejarCitaExpirada === 'function') {
                window.manejarCitaExpirada(data);
            }
        });
        // ================================================================
        // 🔔 NOTIFICACIONES DE CITAS
        // ================================================================
        socket.on('cambio-estado-cita', (data) => {
            console.log('📡 [WS Cliente] cambio-estado-cita:', data);
            if (typeof callbacks.onCambioEstadoCita === 'function') {
                callbacks.onCambioEstadoCita(data);
            }
        });

        socket.on('nueva-notificacion-cliente', (data) => {
            console.log('📡 [WS Cliente] nueva-notificacion-cliente:', data);
            if (typeof callbacks.onNotificacion === 'function') {
                callbacks.onNotificacion(data);
            }
        });

        // ================================================================
        // 🔄 PERFIL ACTUALIZADO (por si en el futuro se necesita)
        // ================================================================
        socket.on('perfil-actualizado', (data) => {
            console.log('🔄 [WS Cliente] perfil-actualizado:', data);

            // Caso 1: Es el cliente actual
            if (data.tipo === 'CLIENTE' && String(data.id) === String(clienteId)) {
                if (typeof callbacks.onPerfilActualizado === 'function') {
                    callbacks.onPerfilActualizado(data.cambios);
                }
            }
        });

        // ================================================================
        // 🔌 DESCONEXIÓN
        // ================================================================
        socket.on('disconnect', () => {
            console.log('🔌 [WS Cliente] Desconectado del servidor');
        });

        return socket;
    } catch (error) {
        console.warn('⚠️ [WS Cliente] WebSocket no disponible:', error.message);
    }
}

export function desconectarWebSocketCliente() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('🔌 [WS Cliente] Desconectado manualmente');
    }
}

export default { conectarWebSocketCliente, desconectarWebSocketCliente };
