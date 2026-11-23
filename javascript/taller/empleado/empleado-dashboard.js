/**
 * DASHBOARD EMPLEADO - AutoBrillo D. (Versión 2026)
 * Diseño responsive con sidebar desktop y bottom nav móvil
 */


// ==================== VARIABLES GLOBALES ====================
let sesionLocal = null;   // ✅ Variable LOCAL (fuente de verdad del dashboard)
let permisos = null;
let tallerId = null;
let empleadoId = null;
let socket = null;
let seccionActual = 'panel';
let tabTrabajosActual = 'pendientes';
let fotosSeleccionadas = [];
let citaActualFotos = null;
let tipoFotoActual = 'antes';

const META_DIARIA = 5000;

// ==================== IMPORTAR MÓDULOS ====================
import {
    inicializarConfiguracion,
    aplicarPreferenciasIniciales
} from './empleado-configuracion.js';

import {
    inicializarNotificaciones,
    marcarTodasLeidasEmpleado,
    cargarNotificacionesEmpleado
} from './notificaciones.js';
import { inicializarPagos } from './empleado-pagos.js';
import { inicializarFotos } from './empleado-fotos.js';
import { inicializarTrabajos } from './empleado-trabajos.js';
import { inicializarHistorial } from './empleado-historial.js';
import ResenasEmpleado from './empleado-resenas.js';

import {
    conectarWebSocket
} from './websocket.js';
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    cargarSesion();
    inicializarTrabajos();
    inicializarPagos();
    inicializarFotos();
    inicializarHistorial();

    const tabPendientes = document.getElementById('tab-pendientes');
    const tabRealizados = document.getElementById('tab-realizados');

    if (tabPendientes) {
        tabPendientes.addEventListener('click', () => cambiarTab('pendientes'));
    }
    if (tabRealizados) {
        tabRealizados.addEventListener('click', () => cambiarTab('realizados'));
    }
});

// ==================== CARGAR SESIÓN ====================
function cargarSesion() {
    const sesionRaw = localStorage.getItem('taller_empleado_sesion');
    if (!sesionRaw) {
        alert('Sesión no válida');
        window.location.href = 'login.html';
        return;
    }

    let sesion;
    try {
        sesion = JSON.parse(sesionRaw);
    } catch (e) {
        alert('Sesión corrupta');
        window.location.href = 'login.html';
        return;
    }

    if (!sesion?.empleado?._id) {
        alert('Sesión no válida');
        window.location.href = 'login.html';
        return;
    }

    // ✅ 1. Copia LOCAL (fuente de verdad del dashboard)
    sesionLocal = JSON.parse(JSON.stringify(sesion.empleado));
    permisos = JSON.parse(JSON.stringify(sesion.permisos || {}));
    tallerId = sesion.tallerId;
    empleadoId = sesionLocal._id;

    // ✅ 2. Copia GLOBAL separada para otros módulos
    window.sesionEmpleado = JSON.parse(JSON.stringify(sesionLocal));

    // ✅ 3. Test de aislamiento
    console.log('🔍 ¿Mismo objeto?', sesionLocal === window.sesionEmpleado);          // false
    console.log('🔍 ¿Mismo horario?', sesionLocal.horario === window.sesionEmpleado.horario);  // false

    // Actualizar UI
    actualizarUIEmpleado();
    aplicarPreferenciasIniciales();

    // Inicializar módulos
    inicializarConfiguracion(sesionLocal, empleadoId);
    inicializarNotificaciones(empleadoId);
    ResenasEmpleado.iniciar();
    conectarWebSocket(empleadoId, tallerId, {
        // Notificaciones (mantiene el comportamiento anterior)
        onNotificacion: manejarNotificacionWebSocket,

        // Perfil del empleado
        onPerfilActualizado: (cambios) => {
            console.log('🔄 [DASHBOARD] Perfil actualizado:', cambios);

            sesionLocal = { ...sesionLocal, ...cambios };
            window.sesionEmpleado = JSON.parse(JSON.stringify(sesionLocal));

            actualizarUIEmpleado();

            if (seccionActual === 'configuracion' && typeof cargarDatosPerfil === 'function') {
                cargarDatosPerfil();
            }

            actualizarAvataresEmpleado(cambios.fotoPerfil);

            if (typeof mostrarToast === 'function') {
                mostrarToast('🔄 Tu perfil se actualizó', 'info');
            }
        },

        // Reseñas (recarga la sección si está visible)
        onResenaActualizada: (evento, data) => {
            console.log(`🔄 [DASHBOARD] ${evento}:`, data);

            if (seccionActual === 'resenas') {
                // ✅ Usar el objeto ResenasEmpleado (no la función global)
                if (ResenasEmpleado && typeof ResenasEmpleado.cargar === 'function') {
                    ResenasEmpleado.cargar();
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('🔄 Reseñas actualizadas', 'info');
                    }
                }
            }
        },

        // Cliente (actualiza su avatar en reseñas)
        onClienteActualizado: (clienteId, cambios) => {
            console.log(`👤 [DASHBOARD] Cliente actualizado:`, clienteId, cambios);

            if (cambios.fotoPerfil) {
                actualizarAvatarCliente(clienteId, cambios.fotoPerfil);
            }
        },

        // Taller (actualiza su logo)
        onTallerActualizado: (cambios) => {
            console.log('🏪 [DASHBOARD] Taller actualizado:', cambios);

            if (cambios.logo) {
                document.querySelectorAll('img[data-taller-logo="true"]').forEach(img => {
                    img.src = cambios.logo;
                });
            }
        }
    });
    // Cargar datos iniciales
    cargarDatosIniciales();
    setInterval(cargarDatosIniciales, 30000);

    console.log('✅ Dashboard empleado inicializado');
}

// ==================== ACTUALIZAR UI ====================
function actualizarUIEmpleado() {
    const nombre = sesionLocal?.nombre || 'Empleado';
    const rol = sesionLocal?.rol || 'LAVADOR';
    const foto = sesionLocal?.fotoPerfil || null;

    document.getElementById('sidebar-nombre').textContent = nombre;
    document.getElementById('sidebar-rol').textContent = rol;
    document.getElementById('topbar-nombre').textContent = nombre;
    document.getElementById('topbar-rol').textContent = rol;
    document.getElementById('fecha-actual').textContent = new Date().toLocaleDateString('es-DO', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    if (foto) {
        document.getElementById('sidebar-avatar').innerHTML = `<img src="${foto}" alt="Foto">`;
        document.getElementById('topbar-avatar').innerHTML = `<img src="${foto}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`;
    }
}

// ==================== ACTUALIZAR SESIÓN (llamada desde config) ====================
window.actualizarSesionEmpleado = (nuevosDatos) => {
    console.log('🔄 Actualizando sesión:', nuevosDatos);

    // ✅ Actualizar copia LOCAL
    sesionLocal = { ...sesionLocal, ...nuevosDatos };

    // ✅ Actualizar copia GLOBAL (clonada)
    window.sesionEmpleado = JSON.parse(JSON.stringify(sesionLocal));

    actualizarUIEmpleado();
};

// ==================== ACTUALIZAR PERFIL EN TIEMPO REAL (desde WebSocket) ====================
window.onPerfilActualizado = (cambios) => {
    console.log('🔄 [DASHBOARD] Perfil actualizado en tiempo real:', cambios);

    // 1. Actualizar copia LOCAL
    sesionLocal = { ...sesionLocal, ...cambios };

    // 2. Actualizar copia GLOBAL (clonada)
    window.sesionEmpleado = JSON.parse(JSON.stringify(sesionLocal));

    // 3. Refrescar sidebar y topbar
    actualizarUIEmpleado();

    // 4. Refrescar formulario de Configuración si está visible
    if (seccionActual === 'configuracion' && typeof cargarDatosPerfil === 'function') {
        cargarDatosPerfil();
    }

    // 5. Refrescar avatares en reseñas (respuestas del empleado)
    actualizarAvataresEmpleado(cambios.fotoPerfil);

    // 6. Mostrar toast
    if (typeof mostrarToast === 'function') {
        mostrarToast('🔄 Perfil actualizado en tiempo real', 'info');
    }
};

// ==================== ACTUALIZAR AVATARES DEL EMPLEADO ====================
function actualizarAvataresEmpleado(nuevaFoto) {
    if (!nuevaFoto) return;

    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const topbarAvatar = document.getElementById('topbar-avatar');

    if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${nuevaFoto}" alt="Foto">`;
    if (topbarAvatar) topbarAvatar.innerHTML = `<img src="${nuevaFoto}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`;

    document.querySelectorAll('img[data-empleado-avatar="true"]').forEach(img => {
        img.src = nuevaFoto;
    });

    console.log('✅ Avatares del empleado actualizados');
}

// ==================== ACTUALIZAR AVATARES DEL CLIENTE ====================
function actualizarAvatarCliente(clienteId, nuevaFoto) {
    if (!nuevaFoto) return;

    const avatares = document.querySelectorAll(`img[data-cliente-avatar="${clienteId}"]`);
    avatares.forEach(img => {
        img.src = nuevaFoto;
    });

    console.log(`✅ ${avatares.length} avatares del cliente ${clienteId} actualizados`);
}
// ==================== NAVEGACIÓN ====================
function cambiarSeccion(seccion) {
    seccionActual = seccion;
    window.seccionActual = seccion;
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));

    const seccionEl = document.getElementById(`seccion-${seccion}`);
    if (seccionEl) seccionEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === seccion);
    });

    document.querySelectorAll('.bottom-item').forEach(item => {
        item.classList.toggle('active', item.textContent.includes(obtenerTituloSeccion(seccion)) ||
            (seccion === 'panel' && item.textContent.includes('Panel')) ||
            (seccion === 'trabajos' && item.textContent.includes('Trabajos')) ||
            (seccion === 'pagos' && item.textContent.includes('Pagos')) ||
            (seccion === 'notificaciones' && item.textContent.includes('Alertas')) ||
            (seccion === 'resenas' && item.textContent.includes('Resenas')) ||
            (seccion === 'configuracion' && item.textContent.includes('Config'))
        );
    });

    const titulos = {
        panel: '📊 Panel',
        trabajos: '📋 Mis Trabajos',
        pagos: '💳 Pagos',
        notificaciones: '🔔 Notificaciones',
        resenas: '⭐ Reseñas',
        historial: '📜 Historial',
        configuracion: '⚙️ Configuración'
    };
    document.getElementById('seccion-titulo').textContent = titulos[seccion] || 'Panel';

    switch (seccion) {
        case 'panel':
            if (typeof cargarPanel === 'function') cargarPanel();
            break;
        case 'trabajos':
            if (typeof cargarTrabajos === 'function') cargarTrabajos();
            break;
        case 'pagos':
            if (typeof cargarHistorialPagos === 'function') cargarHistorialPagos();
            break;
        case 'notificaciones':
            if (typeof cargarNotificacionesEmpleado === 'function') cargarNotificacionesEmpleado();
            break;
        case 'resenas':
            console.log('⭐ Cargando reseñas del empleado...');
            if (typeof cargarResenasEmpleado === 'function') {
                cargarResenasEmpleado();
            } else {
                console.warn('⚠️ cargarResenasEmpleado no está definida, importando...');
                import('./empleado-resenas.js')
                    .then(module => {
                        window.cargarResenasEmpleado = module.cargarResenasEmpleado;
                        window.filtrarResenasEmpleado = module.filtrarResenasEmpleado;
                        window.abrirModalRespuestaEmpleado = module.abrirModalRespuestaEmpleado;
                        window.enviarRespuestaEmpleado = module.enviarRespuestaEmpleado;
                        window.eliminarRespuestaEmpleado = module.eliminarRespuestaEmpleado;

                        if (typeof module.inicializarResenas === 'function') {
                            module.inicializarResenas();
                        }
                        module.cargarResenasEmpleado();
                        console.log('✅ Módulo de reseñas importado dinámicamente');
                    })
                    .catch(err => {
                        console.error('❌ Error importando empleado-resenas.js:', err);
                        const container = document.getElementById('lista-resenas-empleado');
                        if (container) {
                            container.innerHTML = `<p style="color:#ff4444; text-align:center; padding:30px;">
                                ❌ Error cargando módulo de reseñas: ${err.message}
                            </p>`;
                        }
                    });
            }
            break;
        case 'historial':
            if (typeof cargarHistorial === 'function') cargarHistorial();
            break;
        case 'configuracion':
            // ✅ Llenar el formulario con los datos reales del empleado
            if (typeof cargarDatosPerfil === 'function') {
                cargarDatosPerfil();
            }
            if (typeof cargarPreferencias === 'function') {
                cargarPreferencias();
            }

            break;
        default:
            console.log('📌 Sección no manejada:', seccion);
    }

    if (typeof cerrarSidebar === 'function') cerrarSidebar();
}

function obtenerTituloSeccion(seccion) {
    const titulos = {
        panel: 'Panel',
        trabajos: 'Trabajos',
        historial: 'Historial',
        pagos: 'Pagos',
        notificaciones: 'Alertas',
        resenas: 'Reseñas',
        configuracion: 'Config'
    };
    return titulos[seccion] || '';
}

// ==================== SIDEBAR MÓVIL ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');

    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function cerrarSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarSidebar();
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) cerrarSidebar();
    });
});

// ==================== CARGAR DATOS ====================
async function cargarDatosIniciales() {
    await cargarPanel();
}

async function cargarPanel() {
    await Promise.all([
        cargarIngresos(),
        cargarEstadisticas(),
        cargarProximosTrabajos()
    ]);
}

// ==================== INGRESOS ====================
async function cargarIngresos() {
    try {
        const response = await apiFetch(`/talleres/${tallerId}/historial`);
        const data = await response.json();

        if (!data.exito) return;

        const misTrabajos = (data.historial || []).filter(h =>
            String(h.empleadoAsignado?._id || h.empleadoAsignado || '') === String(empleadoId)
        );

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const tHoy = misTrabajos.filter(t => new Date(t.fechas?.entrega || t.createdAt) >= hoy);
        const tSemana = misTrabajos.filter(t => new Date(t.fechas?.entrega || t.createdAt) >= inicioSemana);
        const tMes = misTrabajos.filter(t => new Date(t.fechas?.entrega || t.createdAt) >= inicioMes);

        const iHoy = tHoy.reduce((s, t) => s + (t.pago?.monto || 0), 0);
        const iSemana = tSemana.reduce((s, t) => s + (t.pago?.monto || 0), 0);
        const iMes = tMes.reduce((s, t) => s + (t.pago?.monto || 0), 0);
        const iTotal = misTrabajos.reduce((s, t) => s + (t.pago?.monto || 0), 0);

        document.getElementById('ingresos-hoy').textContent = `RD$ ${iHoy.toLocaleString()}`;
        document.getElementById('ingresos-semana').textContent = `RD$ ${iSemana.toLocaleString()}`;
        document.getElementById('ingresos-mes').textContent = `RD$ ${iMes.toLocaleString()}`;
        document.getElementById('ingresos-total').textContent = `RD$ ${iTotal.toLocaleString()}`;

        document.getElementById('trabajos-hoy').textContent = `${tHoy.length} trabajos`;
        document.getElementById('trabajos-semana').textContent = `${tSemana.length} trabajos`;
        document.getElementById('trabajos-mes').textContent = `${tMes.length} trabajos`;
        document.getElementById('trabajos-total').textContent = `${misTrabajos.length} trabajos`;

        const porcentaje = Math.min(100, Math.round((iHoy / META_DIARIA) * 100));
        document.getElementById('meta-porcentaje').textContent = `${porcentaje}%`;
        document.getElementById('meta-fill').style.width = `${porcentaje}%`;

        const cals = misTrabajos.filter(t => t.calificacion?.puntuacion);
        document.getElementById('mi-calificacion').textContent = cals.length > 0
            ? (cals.reduce((s, t) => s + t.calificacion.puntuacion, 0) / cals.length).toFixed(1)
            : 'N/A';
    } catch (error) {
        console.error('Error cargando ingresos:', error);
    }
}

// ==================== ESTADÍSTICAS ====================
async function cargarEstadisticas() {
    try {
        const response = await apiFetch(`/talleres/${tallerId}/citas`);
        const data = await response.json();

        if (!data.exito) return;

        const misCitas = data.citas.filter(c =>
            String(c.empleadoAsignado?._id || c.empleadoAsignado || '') === String(empleadoId)
        );

        document.getElementById('mis-pendientes').textContent = misCitas.filter(c =>
            ['PENDIENTE', 'CONFIRMADA', 'EN_RECEPCION'].includes(c.estado)
        ).length;

        document.getElementById('mis-en-proceso').textContent = misCitas.filter(c =>
            c.estado === 'EN_PROCESO'
        ).length;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ==================== PRÓXIMOS TRABAJOS ====================
async function cargarProximosTrabajos() {
    const container = document.getElementById('proximos-trabajos');

    try {
        const response = await apiFetch(`/talleres/${tallerId}/citas`);
        const data = await response.json();

        if (!data.exito) return;

        const misCitas = data.citas
            .filter(c =>
                String(c.empleadoAsignado?._id || c.empleadoAsignado || '') === String(empleadoId) &&
                !['ENTREGADO', 'CANCELADA', 'LISTO'].includes(c.estado)
            )
            .slice(0, 3);

        if (misCitas.length === 0) {
            container.innerHTML = '<p class="empty-state">🎉 No tienes trabajos próximos</p>';
            return;
        }

        container.innerHTML = misCitas.map(cita => renderizarCitaCard(cita)).join('');
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Error al cargar</p>';
    }
}

// ==================== ACCIONES DE TRABAJO ====================
async function iniciarTrabajo(citaId) {
    if (!confirm('¿Iniciar trabajo?')) return;

    try {
        const response = await apiFetch(`/talleres/citas/${citaId}/iniciar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId, notas: 'Iniciado por empleado' })
        });

        const data = await response.json();

        if (data.exito) {
            mostrarToast('🔧 Trabajo iniciado', 'success');
            cargarDatosIniciales();
        } else {
            mostrarToast('❌ ' + data.mensaje, 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// ==================== TOAST ====================
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const iconos = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const icono = iconos[tipo] || 'ℹ️';

    toast.innerHTML = `<strong>${icono} ${mensaje}</strong>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ==================== WEBSOCKET ====================
function manejarNotificacionWebSocket(data) {
    mostrarToast(data.titulo || 'Notificación', 'info');
    if (typeof cargarNotificacionesEmpleado === 'function') cargarNotificacionesEmpleado();
    actualizarBadge();
}

function actualizarBadge() {
    const notifs = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]');
    const noLeidas = notifs.filter(n => n.empleadoId === empleadoId && !n.leida).length;

    const badgeSidebar = document.getElementById('badge-notificaciones-sidebar');
    const badgeTop = document.getElementById('badge-notificaciones-top');
    const badgeBottom = document.getElementById('badge-notificaciones-bottom');

    if (badgeSidebar) {
        badgeSidebar.style.display = noLeidas > 0 ? 'block' : 'none';
        badgeSidebar.textContent = noLeidas;
    }
    if (badgeTop) {
        badgeTop.style.display = noLeidas > 0 ? 'block' : 'none';
    }
    if (badgeBottom) {
        badgeBottom.style.display = noLeidas > 0 ? 'block' : 'none';
        badgeBottom.textContent = noLeidas;
    }
}

// ==================== CERRAR SESIÓN ====================
window.cerrarSesion = () => {
    if (socket) socket.disconnect();
    localStorage.removeItem('taller_empleado_sesion');
    window.sesionEmpleado = null;
    sesionLocal = null;
    window.location.href = 'login.html';
};

// ==================== EXPONER FUNCIONES ====================
window.cambiarSeccion = cambiarSeccion;
window.toggleSidebar = toggleSidebar;
window.cerrarSidebar = cerrarSidebar;
window.iniciarTrabajo = iniciarTrabajo;
window.marcarTodasLeidasEmpleado = marcarTodasLeidasEmpleado;