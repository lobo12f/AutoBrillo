/**
 * MÓDULO DE NOTIFICACIONES - Empleado
 */

let empleadoIdActual = null;

export function inicializarNotificaciones(empleadoId) {
    empleadoIdActual = empleadoId;
    cargarNotificacionesEmpleado();
}

export function cargarNotificacionesEmpleado() {
    const container = document.getElementById('lista-notificaciones-empleado');
    if (!container) return;

    const notifs = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]')
        .filter(n => n.empleadoId === empleadoIdActual);

    if (notifs.length === 0) {
        container.innerHTML = '<p class="empty-state">📭 Sin notificaciones</p>';
        return;
    }

    container.innerHTML = notifs
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(n => `
            <div class="notif-item ${n.leida ? '' : 'no-leida'}">
                <div class="notif-icono">${n.tipo === 'PAGO_RECIBIDO' ? '💰' : n.tipo === 'TRABAJO_ASIGNADO' ? '🔧' : '✅'}</div>
                <div class="notif-contenido">
                    <strong>${n.titulo}</strong>
                    <p>${n.mensaje}</p>
                    <small>${new Date(n.fecha).toLocaleString('es-DO')}</small>
                </div>
                ${!n.leida ? '<span class="notif-dot"></span>' : ''}
            </div>
        `).join('');

    actualizarBadge();
}

export function marcarTodasLeidasEmpleado() {
    const notifs = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]');
    notifs.forEach(n => { if (n.empleadoId === empleadoIdActual) n.leida = true; });
    localStorage.setItem('notificaciones_empleados', JSON.stringify(notifs));
    cargarNotificacionesEmpleado();
}

function actualizarBadge() {
    const notifs = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]');
    const noLeidas = notifs.filter(n => n.empleadoId === empleadoIdActual && !n.leida).length;

    document.getElementById('badge-notificaciones-sidebar').style.display = noLeidas > 0 ? 'block' : 'none';
    document.getElementById('badge-notificaciones-sidebar').textContent = noLeidas;
    document.getElementById('badge-notificaciones-top').style.display = noLeidas > 0 ? 'block' : 'none';
    document.getElementById('badge-notificaciones-bottom').style.display = noLeidas > 0 ? 'block' : 'none';
    document.getElementById('badge-notificaciones-bottom').textContent = noLeidas;
}

export default { inicializarNotificaciones, cargarNotificacionesEmpleado, marcarTodasLeidasEmpleado };