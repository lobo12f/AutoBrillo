/**
 * ============================================================================
 * 🔄 SINCRONIZACIÓN DE CITAS (con expiración)
 * ============================================================================
 */

import { logger } from '../../utils/toast.js';

// ============================================================================
// SINCRONIZAR ESTADO DE CITAS
// ============================================================================
export async function sincronizarEstadoCitas() {
    const userId = window.obtenerIdUsuario();
    if (!userId) return;

    try {
        const response = await window.fetchConReintento?.(`/mis-citas/${userId}`);
        if (!response?.exito) return;

        const citas = response.citas || [];
        const activas = citas.filter(c => !['CANCELADA', 'ENTREGADO'].includes(c.estado));
        const historial = citas.filter(c => ['ENTREGADO'].includes(c.estado));

        window.user.misCitas = [...activas, ...historial];
        window.persistirUsuario();

        if (window.tabClienteActual === 'historial') {
            window.renderizarCitasHistorial?.();
        } else {
            window.renderizarCitasPendientes?.();
        }
    } catch (error) {
        logger.error('❌ Error sincronizando:', error.message);
    }
}

// ============================================================================
// CREAR NOTIFICACIÓN DE CAMBIO DE ESTADO
// ============================================================================
export function crearNotificacionEstado(citaTaller) {
    const vehiculoNombre = `${citaTaller.vehiculo?.marca || ''} ${citaTaller.vehiculo?.modelo || ''}`.trim();
    let mensaje = '';
    let tipo = '';

    switch (citaTaller.estado) {
        case 'CONFIRMADA':
            mensaje = `✅ Cita para ${vehiculoNombre} CONFIRMADA`;
            tipo = 'CITA_CONFIRMADA';
            break;
        case 'EN_RECEPCION':
            mensaje = `📥 ${vehiculoNombre} recibido en taller`;
            tipo = 'VEHICULO_RECIBIDO';
            break;
        case 'EN_PROCESO':
            mensaje = `🔧 Trabajando en ${vehiculoNombre}`;
            tipo = 'TRABAJO_INICIADO';
            break;
        case 'LISTO':
            mensaje = `🎉 ${vehiculoNombre} LISTO para recoger`;
            tipo = 'VEHICULO_LISTO';
            break;
        case 'ENTREGADO':
            mensaje = `🏁 Servicio completado`;
            tipo = 'VEHICULO_ENTREGADO';
            break;
        case 'CANCELADA':
            mensaje = `❌ Cita cancelada`;
            tipo = 'CITA_CANCELADA';
            break;
        case 'EXPIRADA':
            mensaje = `⏰ Cita expirada: ${vehiculoNombre}`;
            tipo = 'CITA_EXPIRADA';
            break;
        default:
            mensaje = `📌 Cita actualizada: ${citaTaller.estado}`;
            tipo = 'ESTADO_ACTUALIZADO';
    }

    if (mensaje) {
        const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
        const yaExiste = notificaciones.some(n => n.tipo === tipo && n.mensaje === mensaje);
        if (!yaExiste) {
            notificaciones.push({
                tipo,
                citaId: citaTaller._id,
                mensaje,
                fecha: new Date().toISOString(),
                leida: false
            });
            localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));

            if (tipo === 'VEHICULO_LISTO') {
                window.mostrarToast?.(mensaje, 'success', 6000);
            } else if (tipo === 'CITA_CONFIRMADA') {
                window.mostrarToast?.(mensaje, 'info', 4000);
            } else if (tipo === 'CITA_EXPIRADA') {
                window.mostrarToast?.(mensaje, 'warning', 8000);
            }

            // ⭐ Notificación nativa
            window.mostrarNotificacionNativa?.(
                'AutoBrillo - Cita actualizada',
                mensaje,
                { tag: `cita-${citaTaller._id}` }
            );
        }
    }
}

// ============================================================================
// HANDLER: CITA EXPIRADA (WebSocket)
// ============================================================================
export function manejarCitaExpirada(data) {
    console.log('⏰ [Sync] Cita expirada:', data);

    window.mostrarToast?.(
        `⏰ ${data.mensaje || 'Tu cita expiró'}`,
        'warning',
        8000
    );

    window.mostrarNotificacionNativa?.(
        '⏰ Cita expirada',
        data.mensaje || 'Tu cita expiró',
        { tag: `expira-${data.citaId}` }
    );

    // Guardar notificación
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
    notificaciones.push({
        tipo: 'CITA_EXPIRADA',
        citaId: data.citaId,
        mensaje: data.mensaje || 'Tu cita expiró',
        fecha: new Date().toISOString(),
        leida: false
    });
    localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));

    // Recargar
    if (typeof window.sincronizarEstadoCitas === 'function') {
        window.sincronizarEstadoCitas();
    }
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.sincronizarEstadoCitas = sincronizarEstadoCitas;
window.crearNotificacionEstado = crearNotificacionEstado;
window.manejarCitaExpirada = manejarCitaExpirada;

console.log('✅ Módulo citas-sync.js cargado (con expiración)');