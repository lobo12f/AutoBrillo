/**
 * ============================================================================
 * 🔔 MÓDULO DE NOTIFICACIONES: Badge, modal, marcar leídas
 * ============================================================================
 */

// ============================================================================
// CARGAR BADGE
// ============================================================================
export function cargarNotificaciones() {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
    const noLeidas = notificaciones.filter(n => !n.leida);
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.display = noLeidas.length > 0 ? 'flex' : 'none';
        badge.textContent = noLeidas.length || '0';
    }
}

// ============================================================================
// MOSTRAR MODAL
// ============================================================================
export function mostrarNotificaciones() {
    const modal = document.getElementById('modal-notificaciones');
    const lista = document.getElementById('lista-notificaciones');
    if (!modal || !lista) return;

    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');

    if (notificaciones.length === 0) {
        lista.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">📭 Sin notificaciones</p>';
    } else {
        lista.innerHTML = notificaciones.reverse().map((notif, index) => {
            const icono = notif.tipo === 'CITA_CONFIRMADA' ? '✅' :
                notif.tipo === 'VEHICULO_LISTO' ? '🎉' : '📌';
            const bg = notif.leida ? 'transparent' : 'rgba(0,255,136,0.05)';
            const border = notif.leida ? '#333' : '#00ff88';
            return `
                <div style="background:${bg};border-left:3px solid ${border};padding:12px;margin-bottom:8px;border-radius:8px;cursor:pointer;" 
                     onclick="window.marcarLeida(${index})">
                    <div style="display:flex;align-items:start;gap:10px;">
                        <span style="font-size:1.2rem;">${icono}</span>
                        <div style="flex:1;">
                            <p style="margin:0;font-size:0.9rem;color:#fff;">${notif.mensaje}</p>
                            <small style="color:#888;">
                                ${new Date(notif.fecha).toLocaleString('es-DO')} 
                                ${notif.leida ? '✓' : '🔵'}
                            </small>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
    modal.style.display = 'flex';
    cargarNotificaciones();
}

export function marcarLeida(index) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
    const realIndex = notificaciones.length - 1 - index;
    if (notificaciones[realIndex]) {
        notificaciones[realIndex].leida = true;
        localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));
        mostrarNotificaciones();
    }
}

export function marcarTodasLeidas() {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
    notificaciones.forEach(n => n.leida = true);
    localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));
    mostrarNotificaciones();
    cargarNotificaciones();
    window.mostrarToast('✅ Todas las notificaciones marcadas como leídas', 'success');
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.cargarNotificaciones = cargarNotificaciones;
window.mostrarNotificaciones = mostrarNotificaciones;
window.marcarLeida = marcarLeida;
window.marcarTodasLeidas = marcarTodasLeidas;

console.log('✅ Módulo notificaciones.js cargado');
