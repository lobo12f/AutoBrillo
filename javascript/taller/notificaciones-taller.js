// ====================================================================
// 🔔 MÓDULO DE NOTIFICACIONES - AUTOBRILLO DETALLING
//    Versión mejorada con animaciones y agrupación
// ====================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
window.notificaciones = window.notificaciones || [];
let filtroNotificacionesActual = 'todas';
let citasVistas = new Set(JSON.parse(localStorage.getItem('citas_vistas') || '[]'));

// ================================================================
// 🔹 CARGAR NOTIFICACIONES
// ================================================================

export async function cargarNotificaciones() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const timestamp = Date.now();
        const response = await apiFetch(`/talleres/${tallerActual._id}/notificaciones?limit=50&_t=${timestamp}`);
        const data = await response.json();

        if (data.exito && data.notificaciones) {
            window.notificaciones = data.notificaciones.map(n => ({
                ...n,
                id: String(n._id || n.id),  // ✅ Convertir a string
                leida: n.leida || false
            }));
            localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));
        }
    } catch (error) {
        window.notificaciones = JSON.parse(localStorage.getItem('notificaciones_taller') || '[]');
    }

    citasVistas = new Set(JSON.parse(localStorage.getItem('citas_vistas') || '[]'));
    actualizarBadge();
}

// ================================================================
// 🔹 CREAR NOTIFICACIÓN
// ================================================================

export async function crearNotificacion({ tipo, titulo, mensaje, citaId, empleadoId, fechaCita }) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        await apiFetch(`/talleres/${tallerActual._id}/notificaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo, titulo, mensaje,
                detalle: { citaId: citaId || null, fecha: fechaCita || null },
                empleadoId: empleadoId || null,
                prioridad: tipo === 'CITA_CANCELADA' ? 'alta' : 'media',
                leida: false
            })
        });
    } catch (error) {
        console.error('Error al guardar notificación:', error);
    }

    const notificacion = {
        id: String(Date.now()),
        tipo, titulo, mensaje,
        citaId: citaId || null,
        empleadoId: empleadoId || null,
        fechaCita: fechaCita || null,
        fecha: new Date().toISOString(),
        leida: false,
        prioridad: tipo === 'CITA_CANCELADA' ? 'alta' : 'media'
    };

    window.notificaciones.unshift(notificacion);
    if (window.notificaciones.length > 50) window.notificaciones = window.notificaciones.slice(0, 50);
    localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));
    actualizarBadge();
}

// ================================================================
// 🔹 MOSTRAR MODAL
// ================================================================

export async function mostrarNotificaciones() {
    const modal = document.getElementById('modal-notificaciones');
    if (modal) {
        modal.style.display = 'flex';
        const lista = document.getElementById('lista-notificaciones');
        if (lista) lista.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">⏳ Cargando...</p>';
    }

    await cargarNotificaciones();

    // ✅ Resetear filtro a 'todas' al abrir
    filtroNotificacionesActual = 'todas';

    // ✅ Resetear botones de filtro
    document.querySelectorAll('.filtro-notif').forEach(b => {
        b.style.background = 'transparent';
        b.style.borderColor = '#333';
        b.style.color = '#aaa';
    });

    // ✅ Activar botón "Todas"
    const botonTodas = document.querySelector('.filtro-notif');
    if (botonTodas) {
        botonTodas.style.background = 'rgba(0,255,136,0.1)';
        botonTodas.style.borderColor = '#00ff88';
        botonTodas.style.color = '#00ff88';
    }

    renderizarNotificaciones();
}

// ================================================================
// 🔹 RENDERIZAR NOTIFICACIONES
// ================================================================

function renderizarNotificaciones() {
    const lista = document.getElementById('lista-notificaciones');
    if (!lista) return;

    let notifs = [...(window.notificaciones || [])];

    // Aplicar filtros
    if (filtroNotificacionesActual === 'no_leidas') notifs = notifs.filter(n => !n.leida);
    else if (filtroNotificacionesActual === 'nueva_cita') notifs = notifs.filter(n => ['NUEVA_CITA', 'CITA_CONFIRMADA', 'CITA_CANCELADA'].includes(n.tipo));
    else if (filtroNotificacionesActual === 'trabajo') notifs = notifs.filter(n => ['TRABAJO_INICIADO', 'TRABAJO_FINALIZADO', 'VEHICULO_LISTO'].includes(n.tipo));
    else if (filtroNotificacionesActual === 'pago') notifs = notifs.filter(n => ['PAGO_REALIZADO', 'PAGO_RECIBIDO'].includes(n.tipo));

    // Actualizar contador
    const contador = document.getElementById('contador-notificaciones');
    if (contador) {
        const noLeidas = window.notificaciones.filter(n => !n.leida).length;
        contador.textContent = noLeidas > 0 ? `${noLeidas} sin leer` : 'Todas leídas';
        contador.style.color = noLeidas > 0 ? '#00ff88' : '#666';
        contador.style.background = noLeidas > 0 ? 'rgba(0,255,136,0.1)' : 'transparent';
    }

    if (notifs.length === 0) {
        lista.innerHTML = `
            <div style="text-align:center; padding:40px; animation: fadeIn 0.3s;">
                <span style="font-size:3rem; display:block; margin-bottom:10px;">📭</span>
                <p style="color:var(--text-muted, #666);">No hay notificaciones</p>
            </div>`;
        return;
    }

    const iconosPorTipo = {
        'NUEVA_CITA': { icono: '📅', color: '#00d4ff', label: 'Nueva Cita' },
        'CITA_CONFIRMADA': { icono: '✅', color: '#00ff88', label: 'Cita Confirmada' },
        'CITA_CANCELADA': { icono: '❌', color: '#ff4444', label: 'Cita Cancelada' },
        'CITA_REPROGRAMADA': { icono: '🔄', color: '#ffbb33', label: 'Reprogramada' },
        'TRABAJO_INICIADO': { icono: '🔧', color: '#ffbb33', label: 'Trabajo Iniciado' },
        'TRABAJO_FINALIZADO': { icono: '✨', color: '#00ff88', label: 'Trabajo Finalizado' },
        'VEHICULO_LISTO': { icono: '🎉', color: '#ff44ff', label: 'Vehículo Listo' },
        'VEHICULO_ENTREGADO': { icono: '🚗', color: '#00ff88', label: 'Entregado' },
        'PAGO_REALIZADO': { icono: '💰', color: '#ffbb33', label: 'Pago Realizado' },
        'PAGO_RECIBIDO': { icono: '💵', color: '#00ff88', label: 'Pago Recibido' },
        'CLIENTE_LLEGO': { icono: '👋', color: '#00d4ff', label: 'Cliente Llegó' },
        'BAHIA_LIBERADA': { icono: '🏗️', color: '#00ff88', label: 'Bahía Liberada' }
    };

    const prioridadColor = {
        'alta': '#ff4444',
        'urgente': '#ff0000',
        'media': '#ffbb33',
        'baja': '#00d4ff'
    };

    // Agrupar por fecha
    const grupos = {};
    notifs.forEach(n => {
        const fecha = new Date(n.fecha);
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);

        let grupo;
        if (fecha.toDateString() === hoy.toDateString()) grupo = 'Hoy';
        else if (fecha.toDateString() === ayer.toDateString()) grupo = 'Ayer';
        else grupo = fecha.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });

        if (!grupos[grupo]) grupos[grupo] = [];
        grupos[grupo].push(n);
    });

    let html = '';
    for (const [grupo, notifsGrupo] of Object.entries(grupos)) {
        html += `
        <div style="margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; padding:0 4px;">
                <span style="font-size:0.7rem; color:#666; font-weight:600; text-transform:uppercase; letter-spacing:1px;">${grupo}</span>
                <div style="flex:1; height:1px; background:linear-gradient(to right, #333, transparent);"></div>
            </div>
            ${notifsGrupo.map(n => {
            const info = iconosPorTipo[n.tipo] || { icono: '🔔', color: '#888', label: 'Notificación' };
            const tiempo = obtenerTiempoRelativo(n.fecha);
            const prioridad = n.prioridad || 'media';
            const notifId = String(n._id || n.id);  // ✅ ID consistente

            return `
                <div onclick="window.marcarLeida?.('${notifId}')" 
                    style="background:${n.leida ? 'transparent' : 'rgba(0,255,136,0.03)'}; 
                           border-left:4px solid ${n.leida ? '#1e2a3a' : info.color}; 
                           border-radius:12px;
                           padding:14px 16px; 
                           margin-bottom:8px; 
                           cursor:pointer; 
                           transition:all 0.3s;
                           position:relative;
                           animation: slideIn 0.4s ease;"
                    onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateX(5px)';"
                    onmouseout="this.style.background='${n.leida ? 'transparent' : 'rgba(0,255,136,0.03)'}'; this.style.transform='translateX(0)';">
                    
                    <div style="display:flex; align-items:start; gap:12px;">
                        <div style="width:42px; height:42px; 
                                    background:${info.color}15; 
                                    border:2px solid ${info.color}40; 
                                    border-radius:12px; 
                                    display:flex; 
                                    align-items:center; 
                                    justify-content:center; 
                                    font-size:1.2rem; 
                                    flex-shrink:0;
                                    position:relative;">
                            ${info.icono}
                            ${!n.leida ? `<span style="position:absolute; top:-3px; right:-3px; width:10px; height:10px; background:${info.color}; border-radius:50%; border:2px solid #0f1621;"></span>` : ''}
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
                                <div>
                                    <strong style="color:var(--text-primary, #fff); font-size:0.85rem; display:block;">${n.titulo}</strong>
                                    <span style="color:${info.color}; font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${info.label}</span>
                                </div>
                                <button onclick="event.stopPropagation(); window.eliminarNotificacion?.('${notifId}')"
                                    style="background:transparent; border:none; color:#666; cursor:pointer; font-size:1rem; padding:4px; border-radius:50%; transition:all 0.2s;"
                                    onmouseover="this.style.color='#ff4444'; this.style.background='rgba(255,68,68,0.1)';"
                                    onmouseout="this.style.color='#666'; this.style.background='transparent';"
                                    title="Eliminar">
                                    ✕
                                </button>
                            </div>
                            <p style="margin:6px 0 4px; font-size:0.8rem; color:var(--text-secondary, #aaa); line-height:1.4;">${n.mensaje}</p>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <small style="color:var(--text-muted, #666); font-size:0.7rem;">${tiempo}</small>
                                <span style="width:6px; height:6px; background:${prioridadColor[prioridad] || '#666'}; border-radius:50%; display:inline-block;" title="Prioridad: ${prioridad}"></span>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('')}
        </div>`;
    }

    lista.innerHTML = html;
}

// ================================================================
// 🔹 ELIMINAR NOTIFICACIÓN
// ================================================================

export async function eliminarNotificacion(id) {

    try {
        await apiFetch(`/talleres/notificaciones/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error al eliminar:', error);
    }

    window.notificaciones = window.notificaciones.filter(n => String(n._id || n.id) !== String(id));
    localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));
    actualizarBadge();
    renderizarNotificaciones();
    window.mostrarToast?.('🗑️ Notificación eliminada', 'info');
}

// ================================================================
// 🔹 MARCAR LEÍDA Y REDIRIGIR
// ================================================================

export async function marcarLeida(id) {


    const notif = window.notificaciones.find(n => String(n._id || n.id) === String(id));
    if (!notif) return;

    try {
        const notifId = notif._id || notif.id;
        await apiFetch(`/talleres/notificaciones/${notifId}/leer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    } catch (error) { /* silencioso */ }

    if (!notif.leida) {
        notif.leida = true;
        localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));
        actualizarBadge();
    }

    const modal = document.getElementById('modal-notificaciones');
    if (modal) modal.style.display = 'none';

    switch (notif.tipo) {
        case 'NUEVA_CITA':
        case 'CITA_CONFIRMADA':
        case 'CITA_CANCELADA':
            if (notif.fechaCita || notif.detalle?.fecha) {
                sessionStorage.setItem('filtro_cita_fecha', notif.fechaCita || notif.detalle?.fecha);
            }
            const linkCitas = document.querySelector('[data-section="citas"]');
            if (linkCitas) linkCitas.click();
            break;

        case 'TRABAJO_INICIADO':
        case 'TRABAJO_FINALIZADO':
        case 'VEHICULO_LISTO':
            const linkBahias = document.querySelector('[data-section="bahias"]');
            if (linkBahias) linkBahias.click();
            break;

        case 'PAGO_REALIZADO':
        case 'PAGO_RECIBIDO':
            const linkPagos = document.querySelector('[data-section="historial-pagos"]');
            if (linkPagos) linkPagos.click();
            break;

        default:
            const linkDefault = document.querySelector('[data-section="citas"]');
            if (linkDefault) linkDefault.click();
    }
}

// ================================================================
// 🔹 MARCAR TODAS LEÍDAS
// ================================================================

export async function marcarTodasLeidas() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        await apiFetch(`/talleres/${tallerActual._id}/notificaciones/leer-todas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    } catch (error) { /* silencioso */ }

    window.notificaciones.forEach(n => n.leida = true);
    localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));
    actualizarBadge();
    renderizarNotificaciones();
    window.mostrarToast?.('✅ Todas marcadas como leídas', 'success');
}

// ================================================================
// 🔹 FILTRAR NOTIFICACIONES
// ================================================================

export function filtrarNotificaciones(filtro, boton) {
    filtroNotificacionesActual = filtro;

    document.querySelectorAll('.filtro-notif').forEach(b => {
        b.style.background = 'transparent';
        b.style.borderColor = '#333';
        b.style.color = '#aaa';
    });

    if (boton) {
        boton.style.background = 'rgba(0,255,136,0.1)';
        boton.style.borderColor = '#00ff88';
        boton.style.color = '#00ff88';
    }

    renderizarNotificaciones();
}

// ================================================================
// 🔹 ACTUALIZAR BADGE
// ================================================================

function actualizarBadge() {
    const badge = document.getElementById('badge-notificaciones');
    if (!badge) return;

    const noLeidas = window.notificaciones.filter(n => !n.leida).length;

    if (noLeidas > 0) {
        badge.style.display = 'flex';
        badge.textContent = noLeidas > 99 ? '99+' : noLeidas;
        badge.style.animation = 'pulse 2s infinite';
    } else {
        badge.style.display = 'none';
        badge.style.animation = 'none';
    }
}

// ================================================================
// 🔹 TIEMPO RELATIVO
// ================================================================

function obtenerTiempoRelativo(fecha) {
    if (!fecha) return 'Fecha desconocida';
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    const horas = Math.floor(min / 60);
    const dias = Math.floor(horas / 24);
    if (min < 1) return 'Ahora mismo';
    if (min < 60) return `Hace ${min} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias} días`;
    return new Date(fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarNotificaciones() {
    window.cargarNotificaciones = cargarNotificaciones;
    window.mostrarNotificaciones = mostrarNotificaciones;
    window.crearNotificacion = crearNotificacion;
    window.marcarLeida = marcarLeida;
    window.marcarTodasLeidas = marcarTodasLeidas;
    window.filtrarNotificaciones = filtrarNotificaciones;
    window.renderizarNotificaciones = renderizarNotificaciones;
    window.eliminarNotificacion = eliminarNotificacion;
    console.log('🔔 Módulo de Notificaciones inicializado');
}