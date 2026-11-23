/**
 * ============================================================================
 * 🎯 DASHBOARD CLIENTE - CORE
 * ============================================================================
 * Solo contiene:
 *   - Inicialización (Cliente, Wallet, managers, WebSocket)
 *   - Navegación entre secciones
 *   - Actualización de interfaz
 *   - Funciones auxiliares (fetchConReintento, bloqueos, etc.)
 *   - Recarga de saldo
 *   - Modal management
 * 
 * Los módulos específicos están en:
 *   - utils/toast.js
 *   - modules/citas/*.js
 *   - modules/vehiculos.js
 *   - modules/perfil.js
 *   - modules/notificaciones.js
 *   - modules/planes.js
 *   - modules/galeria.js
 * ============================================================================
 */

import { Cliente } from "../cliente.js";
import { Wallet } from "../movimientoDinero/Wallet.js";
import { db } from "../db.js";
import { TallerManager } from "../taller/TallerManager.js";
import { ClienteTallerService } from "../taller/ClienteTallerService.js";
import { TallerVinculadoManager } from './taller-vinculado.js';
import { CalificacionesManager } from './calificaciones.js';
import { ResenasSocialManager } from './resenas-social.js';
import { GaleriaTrabajos } from './galeria-trabajos.js';
import { GaleriaTaller } from './galeria-taller.js';
import { MapaTaller } from './mapa-taller.js';
import { conectarWebSocketCliente } from './websocket-cliente.js';
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';

import { logger, limpiarCache } from './utils/toast.js';

// ============================================================================
// CONFIGURACIÓN INICIAL
// ============================================================================
const API_BASE_URL = API_URL;
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 10000;

window.clienteTallerService = new ClienteTallerService();
window.tabClienteActual = 'pendientes';
let intervaloActual = null;
window.bloqueos = new Map();

window.taller = new TallerManager({
    bahias: [
        { id: 1, nombre: "Bahía Express", estado: "LIBRE", especialidad: "Lavado Rápido" },
        { id: 2, nombre: "Bahía Premium", estado: "LIBRE", especialidad: "Lavado Completo" },
        { id: 3, nombre: "Bahía Detallado", estado: "LIBRE", especialidad: "Detallado Interior" }
    ]
});

// ============================================================================
// VERIFICACIÓN DE SESIÓN
// ============================================================================
const sesion = localStorage.getItem('sesion_activa');
if (!sesion) {
    window.location.href = "../index.html";
}

// ============================================================================
// INICIO DEL DASHBOARD
// ============================================================================
document.addEventListener("DOMContentLoaded", async function () {
    logger.info('🚀 Inicializando dashboard del cliente...');

    const sesionData = db.obtenerSesion();
    if (!sesionData) {
        window.location.href = "login.html";
        return;
    }

    try {
        // ⭐ NUEVO: Solicitar permiso para notificaciones nativas
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('🔔 Permiso de notificaciones:', permission);
            });
        }
        // Inicializar cliente
        window.user = new Cliente(sesionData);
        window.calificacionesManager = new CalificacionesManager(API_BASE_URL);
        window.resenasSocial = new ResenasSocialManager(API_BASE_URL);
        window.galeriaTrabajos = new GaleriaTrabajos(API_BASE_URL);
        window.galeriaTaller = new GaleriaTaller(API_BASE_URL);
        window.mapaTaller = new MapaTaller();
        window.wallet = new Wallet(window.user);

        logger.info('✅ Sistema listo. ID de usuario:', window.user.id);

        // ⭐ Permiso para notificaciones nativas
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // WebSocket del cliente
        const clienteId = window.user._id || window.user.id;
        if (clienteId) {
            conectarWebSocketCliente(clienteId, {
                onCambioEstadoCita: (data) => {
                    console.log('📡 Cambio de estado:', data);
                    window.mostrarToast?.(data.mensaje || 'Estado actualizado', 'info');
                    // ⭐ NUEVO: Notificación nativa del navegador
                    window.mostrarNotificacionNativa?.(
                        'AutoBrillo - Cita actualizada',
                        data.mensaje || '',
                        { tag: `cita-${data.citaId}` }
                    );

                    window.mostrarNotificacionNativa?.(
                        'AutoBrillo - Cita actualizada',
                        data.mensaje || '',
                        { tag: `cita-${data.citaId}` }
                    );

                    if (typeof window.sincronizarEstadoCitas === 'function') {
                        window.sincronizarEstadoCitas();
                    }

                    // Sonido si LISTO
                    if (data.estado === 'LISTO') {
                        try {
                            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2qEcP+1j2FtNjeC4dGqaIhx/7aQZWE2OILh0KtpiHH/tpBlYTc4guHQrGmIcf+3kGZhNjmC4dCraYhx/7eRZmE3OYLh0KxqiHH/uJFmYTc5guHQrGqIcf+4kmZhNzmC4dGsaohx/7mTZmE3OoLh0axqiHH/uZNmYTc6guHRrGqIcf+5k2ZhNzqC4dGta4hx/7qUZmE3OoLh0q1riHH/upRmYTc6guHSrWuIcf+6lWZhNzuC4dKta4hx/7uVZmE3O4Lh0q5riHH/u5ZmYTc7guHSrmuIcf+7l2ZhNzyC4dKua4hx/7yXZmE3PILh0q9riHH/vJhmYTc8guHSsGuIcf+8mGZhNz2C4dKwa4hx/72ZZmE3PYLh0rFriHH/vZlmYTc+guHSsWuIcf++mmZhNz6C4dKya4hx/76aZmE3PoLh0rJriHH/v5pmYTc/guHSs2uIcf+/m2ZhN0CC4dKza4hx/8CbZmE3QILh0rRriHH/wJxmYTdBguHStGuIcf/BnGZhN0GC4dK1a4hx/8GdZmE3QYLh0rVriHH/wp1mYTdCguHStmuIcf/CnWZhN0KC4dK2a4hx/8OeZmE3Q4Lh0rdriHH/w55mYTdDguHS');
                            audio.volume = 0.3;
                            audio.play().catch(() => { });
                        } catch (e) { }
                    }
                },

                onNotificacion: (data) => {
                    console.log('🔔 Notificación:', data);
                    window.mostrarToast?.(data.mensaje || 'Notificación', 'info');

                    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');
                    notificaciones.push({
                        tipo: data.tipo || 'OTRO',
                        citaId: data.citaId,
                        mensaje: data.mensaje,
                        fecha: new Date().toISOString(),
                        leida: false
                    });
                    localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));

                    if (typeof window.cargarNotificaciones === 'function') {
                        window.cargarNotificaciones();
                    }
                },

                onPerfilActualizado: (cambios) => {
                    console.log('👤 Perfil actualizado:', cambios);
                    if (cambios.fotoPerfil && window.user) {
                        window.user.fotoPerfil = cambios.fotoPerfil;
                        window.persistirUsuario();
                        window.actualizarInterfaz(window.user);
                    }
                }
            });
        }

        // Taller vinculado
        window.tallerManager = new TallerVinculadoManager(API_BASE_URL);
        await window.tallerManager.init();

        window.tallerManager.on('tallerVinculado', (taller) => {
            console.log('🎉 Taller vinculado:', taller.nombre);
            window.actualizarInterfaz(window.user);
        });

        window.tallerManager.on('tallerDesvinculado', () => {
            console.log('🔓 Taller desvinculado');
            window.renderizarPlanes?.();
        });

        // Cargar datos iniciales
        await window.sincronizarEstadoCitas?.();
        window.actualizarInterfaz(window.user);
        window.inicializarMarcas?.();

        if (window.tallerManager.tieneTallerVinculado()) {
            await window.tallerManager.actualizarPlanes();
        } else {
            window.renderizarPlanes?.();
        }

        window.cargarNotificaciones?.();
        window.iniciarSincronizacion();

        if (typeof window.renderizarCitas === 'function') {
            window.renderizarCitas();
        }

        await db.sincronizarConServidor();

        logger.info('✅ Dashboard inicializado correctamente');

    } catch (error) {
        logger.error('❌ Error crítico en inicio:', error);
        console.error('Stack trace:', error.stack);
        window.mostrarToast?.('Error al cargar el dashboard. Recarga la página.', 'error', 5000);
    }

    // Listeners adicionales
    document.getElementById('busqueda-placa')?.addEventListener('input', (e) => {
        window.filtroActualPlaca = e.target.value;
        if (typeof window.renderizarGaleria === 'function') window.renderizarGaleria();
    });

    document.getElementById('filtro-modelo')?.addEventListener('change', () => {
        if (typeof window.renderizarGaleria === 'function') window.renderizarGaleria();
    });

    const inputFotoAuto = document.getElementById('input-cambiar-foto-auto');
    if (inputFotoAuto) {
        inputFotoAuto.addEventListener('change', window.confirmarCambioFotoAuto);
    }
});

// ============================================================================
// SINCRONIZACIÓN
// ============================================================================
window.iniciarSincronizacion = function () {
    if (intervaloActual) clearInterval(intervaloActual);

    intervaloActual = setInterval(async () => {
        try {
            await window.sincronizarEstadoCitas?.();
            window.cargarNotificaciones?.();
            logger.debug('Sincronización periódica completada');
        } catch (error) {
            logger.error('Error en sincronización:', error);
        }
    }, SYNC_INTERVAL);

    logger.info('Sincronización periódica iniciada');
};

window.detenerSincronizacion = function () {
    if (intervaloActual) {
        clearInterval(intervaloActual);
        intervaloActual = null;
        logger.info('Sincronización detenida');
    }
};

window.addEventListener('beforeunload', () => {
    window.detenerSincronizacion();
    logger.info('Dashboard cerrado');
});

// ============================================================================
// FETCH CON REINTENTO
// ============================================================================
window.fetchConReintento = async function (url, options = {}, maxRetries = MAX_RETRIES) {
    let ultimoError;

    for (let intento = 1; intento <= maxRetries; intento++) {
        try {
            logger.debug(`Intento ${intento}/${maxRetries} para ${url}`);
            const response = await apiFetch(url, options);

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            return await response.json();
        } catch (error) {
            ultimoError = error;
            logger.warn(`Intento ${intento} fallido: ${error.message}`);

            if (intento < maxRetries) {
                const delay = Math.pow(2, intento) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Falló después de ${maxRetries} intentos: ${ultimoError.message}`);
};

// ============================================================================
// BLOQUEO DE OPERACIONES
// ============================================================================
window.adquirirBloqueo = async function (clave, timeout = 5000) {
    if (window.bloqueos.has(clave)) {
        throw new Error(`Operación en progreso: ${clave}`);
    }

    window.bloqueos.set(clave, Date.now());
    logger.debug(`Bloqueo adquirido: ${clave}`);

    setTimeout(() => {
        if (window.bloqueos.has(clave)) {
            window.bloqueos.delete(clave);
            logger.warn(`Bloqueo liberado por timeout: ${clave}`);
        }
    }, timeout);

    return clave;
};

window.liberarBloqueo = function (clave) {
    window.bloqueos.delete(clave);
    logger.debug(`Bloqueo liberado: ${clave}`);
};

// ============================================================================
// FUNCIONES AUXILIARES DEL USUARIO
// ============================================================================
window.obtenerIdUsuario = function () {
    if (!window.user) return null;
    return window.user.id;
};

window.persistirUsuario = function () {
    if (!window.user) return;
    try {
        const datos = window.user.toJSON();
        localStorage.setItem('sesion_activa', JSON.stringify(datos));
    } catch (error) {
        logger.error('Error al persistir usuario:', error);
    }
};

// ============================================================================
// ACTUALIZAR INTERFAZ
// ============================================================================
window.actualizarInterfaz = function (instanciaCliente) {
    const user = instanciaCliente || window.user;
    if (!user) return;

    // IDENTIDAD
    const fotoURL = user.fotoPerfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre)}&background=0b0f19&color=00ff88`;
    document.querySelectorAll('#user-name, #display-nombre, #user-name-display').forEach(el => el.innerText = user.nombre);
    document.querySelectorAll('#foto-perfil-grande, #avatar-sidebar').forEach(img => img.src = fotoURL);
    if (document.getElementById('display-email')) document.getElementById('display-email').innerText = user.email;

    // WALLET Y SERVICIOS
    if (document.getElementById('saldo-cuenta')) {
        document.getElementById('saldo-cuenta').innerText = `RD$ ${user.saldo.toFixed(2)}`;
    }

    const elServicios = document.getElementById('servicios-qty');
    if (elServicios) {
        const servicios = user.serviciosDisponibles;
        elServicios.innerText = servicios;
        elServicios.style.color = servicios > 0 ? "#00ff88" : "#ff4444";
    }

    // PLAN
    const elPlanTexto = document.getElementById('plan-actual-texto');
    const badgePlan = document.getElementById('badge-plan');
    const planActual = user.planActual;
    if (elPlanTexto) {
        elPlanTexto.innerText = planActual !== "Ninguno" ? `Plan Activo: ${planActual}` : "Sin plan activo";
        elPlanTexto.style.color = planActual !== "Ninguno" ? "#00ff88" : "#ffbb33";
    }
    if (badgePlan) badgePlan.innerText = `Plan: ${planActual}`;

    // CONTADORES
    const garaje = user.garaje;
    const misCitas = user.misCitas;

    if (document.getElementById('qty-autos')) {
        document.getElementById('qty-autos').innerText = garaje.length;
    }
    if (document.getElementById('user-total-citas')) {
        document.getElementById('user-total-citas').textContent = misCitas.length;
    }
    if (document.getElementById('user-vehiculos')) {
        document.getElementById('user-vehiculos').textContent = garaje.length;
    }
    if (document.getElementById('user-antiguedad')) {
        if (user.fechaRegistro) {
            const fecha = new Date(user.fechaRegistro);
            const ahora = new Date();
            const meses = (ahora.getFullYear() - fecha.getFullYear()) * 12 + (ahora.getMonth() - fecha.getMonth());
            document.getElementById('user-antiguedad').textContent = meses < 1 ? 'Nuevo' : meses;
        } else {
            document.getElementById('user-antiguedad').textContent = '-';
        }
    }
    if (document.getElementById('garage-count')) {
        document.getElementById('garage-count').textContent = garaje.length + ' vehículo' + (garaje.length !== 1 ? 's' : '');
    }

    // RENDERIZAR GARAJE
    if (typeof window.renderizarGaraje === 'function') {
        window.renderizarGaraje();
    }

    // PRÓXIMA CITA
    const elProxima = document.getElementById('proxima-cita');
    const elSucursalCita = document.getElementById('sucursal-cita');
    const ESTADOS_PENDIENTES = ['PENDIENTE', 'CONFIRMADA', 'EN_RECEPCION', 'EN_PROCESO', 'LISTO'];

    if (elProxima) {
        const citasPendientes = misCitas.filter(c =>
            ESTADOS_PENDIENTES.includes(c.estado?.toUpperCase())
        );
        if (citasPendientes.length > 0) {
            const citasOrdenadas = [...citasPendientes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            const cita = citasOrdenadas[0];
            elProxima.innerText = `${cita.fecha} | ${cita.hora}`;
            elProxima.style.color = "#00ff88";
            if (elSucursalCita) elSucursalCita.innerText = `📍 ${cita.sucursal}`;
        } else {
            elProxima.innerText = "No hay citas";
            elProxima.style.color = "#888";
            if (elSucursalCita) elSucursalCita.innerText = "Reserva tu espacio ahora";
        }
    }

    if (window.tallerManager?.tieneTallerVinculado()) {
        if (badgePlan) badgePlan.textContent = `🏪 ${window.tallerManager.getTaller().nombre}`;
    }
};

// ============================================================================
// RECARGA DE SALDO
// ============================================================================
window.abrirRecarga = function () {
    if (!window.user) {
        window.mostrarToast?.("⚠️ Debes iniciar sesión.", "warning");
        return;
    }
    const modal = document.getElementById('modal-recarga');
    const displayNombre = document.getElementById('recarga-usuario-nombre');
    const inputMonto = document.getElementById('monto-recarga');
    if (modal) {
        if (displayNombre) displayNombre.textContent = window.user.nombre;
        if (inputMonto) inputMonto.value = "";
        modal.style.display = 'flex';
    }
};

window.procesarRecarga = async function (e) {
    if (e) e.preventDefault();
    const inputMonto = document.getElementById('monto-recarga');
    const monto = parseFloat(inputMonto.value);

    if (isNaN(monto) || monto <= 0) {
        window.mostrarToast?.("⚠️ Ingresa un monto válido.", "warning");
        return;
    }

    if (monto < 50) {
        window.mostrarToast?.("⚠️ El monto mínimo de recarga es RD$ 50.00", "warning");
        return;
    }

    window.estadoCarga?.mostrar('Procesando recarga...');

    const saldoActual = window.user.saldo;
    window.user.saldo = saldoActual + monto;

    try {
        const exito = await window.db.sincronizarConServidor();
        if (exito) {
            window.persistirUsuario();
            const displaySaldo = document.getElementById('saldo-cuenta');
            if (displaySaldo) displaySaldo.textContent = window.user.saldo.toFixed(2);
            window.mostrarToast?.(`✅ Recarga exitosa. Tu nuevo saldo es: RD$ ${window.user.saldo.toFixed(2)}`, 'success');
            inputMonto.value = "";
            window.cerrarModales();
        } else {
            window.user.saldo = saldoActual;
            window.mostrarToast?.("❌ Error al sincronizar.", "error");
        }
    } catch (error) {
        logger.error('Error en recarga:', error);
        window.user.saldo = saldoActual;
        window.mostrarToast?.("❌ Error de conexión.", "error");
    } finally {
        window.estadoCarga?.ocultar();
    }
};

// ============================================================================
// MODALES
// ============================================================================
window.cerrarModales = function () {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active', 'show');
    });
    ['modal-recarga', 'modal-vehiculo', 'modal-cita', 'modal-notificaciones', 'modal-conflicto-horario'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });
    document.querySelectorAll('form').forEach(f => f.reset());
};

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        window.cerrarModales();
    }
});

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        window.cerrarModales();
    }
});

// ============================================================================
// NAVEGACIÓN
// ============================================================================
window.navegar = function (event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    let idFinal;

    if (event?.target && typeof event.target.closest === 'function') {
        const dataHrefEl = event.target.closest('[data-href]');
        const linkEl = event.target.closest('a');

        if (dataHrefEl) {
            idFinal = dataHrefEl.getAttribute('data-href')?.replace('#', '');
        } else if (linkEl) {
            const href = linkEl.getAttribute('href');
            idFinal = href ? href.replace('#', '') : 'dashboard';
        }
    }

    if (!idFinal && event?.target?.href) {
        idFinal = event.target.href.replace('#', '');
    }

    if (!idFinal && typeof event === 'string') {
        idFinal = event.replace('#', '');
    }

    idFinal = idFinal || 'dashboard';

    console.log('📍 navegar →', idFinal);
    if (!idFinal || idFinal === '#') return;

    document.querySelectorAll('.side-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + idFinal) link.classList.add('active');
    });

    window.mostrarSeccion(idFinal);
    window.limpiarCache?.();
};

window.mostrarSeccion = function (idDestino) {
    if (window.resenasSocial) {
        window.resenasSocial.detenerActualizacionTiempoReal();
    }

    document.querySelectorAll('.dash-section').forEach(s => s.style.display = 'none');

    const extraServices = document.querySelector('.extra-services');
    const statsGrid = document.querySelector('.stats-grid');
    const workshops = document.getElementById('talleres');
    const herade = document.getElementById('moda-inicio');

    if (extraServices) extraServices.style.display = 'none';
    if (statsGrid) statsGrid.style.display = 'none';
    if (workshops) workshops.style.display = 'none';

    const seccionMostrar = document.getElementById(idDestino);
    if (seccionMostrar) seccionMostrar.style.display = 'block';

    if (idDestino === 'dashboard') {
        if (statsGrid) statsGrid.style.display = 'grid';
    }
    if (idDestino === 'inicio') {
        herade.style.display = 'grid';
        if (extraServices) extraServices.style.display = 'block';
        if (workshops) workshops.style.display = 'block';
    }
    if (idDestino === 'perfil') window.renderizarPerfil?.();
    if (idDestino === 'galeria') window.galeriaTrabajos?.cargar();
    if (idDestino === 'explorar-talleres') window.cargarTalleresExplorar?.();
    if (idDestino === 'mi-taller') window.cargarMiTaller?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================================
// PESTAÑAS DE CITAS
// ============================================================================
window.cambiarTabCliente = function (tab) {
    window.tabClienteActual = tab;

    const contPendientes = document.getElementById('contenedor-citas-pendientes');
    const contHistorial = document.getElementById('contenedor-citas-historial');
    const btnP = document.getElementById('tab-pendientes-cliente');
    const btnH = document.getElementById('tab-historial-cliente');

    if (contPendientes) contPendientes.style.display = tab === 'pendientes' ? 'grid' : 'none';
    if (contHistorial) contHistorial.style.display = tab === 'historial' ? 'grid' : 'none';

    const activo = { bg: 'rgba(0,255,136,0.1)', border: '#00ff88', color: '#00ff88' };
    const inactivo = { bg: 'transparent', border: '#333', color: '#aaa' };

    if (btnP) {
        btnP.style.background = tab === 'pendientes' ? activo.bg : inactivo.bg;
        btnP.style.borderColor = tab === 'pendientes' ? activo.border : inactivo.border;
        btnP.style.color = tab === 'pendientes' ? activo.color : inactivo.color;
    }
    if (btnH) {
        btnH.style.background = tab === 'historial' ? activo.bg : inactivo.bg;
        btnH.style.borderColor = tab === 'historial' ? activo.border : inactivo.border;
        btnH.style.color = tab === 'historial' ? activo.color : inactivo.color;
    }

    if (tab === 'pendientes') {
        window.renderizarCitasPendientes?.();
    } else {
        window.renderizarCitasHistorial?.();
    }
};

// ============================================================================
// UTILIDADES
// ============================================================================
window.actualizarYRenderizar = function () {
    if (!window.user) return;
    db.sincronizarConServidor();
    window.actualizarInterfaz();
    window.renderizarCitas?.();
    if (typeof window.renderizarGaleria === 'function') window.renderizarGaleria();
};

window.crearTicket = function () {
    if (confirm('¿Hablar por WhatsApp?')) window.open('https://wa.me/tu_numero_aqui', '_blank');
};

window.cerrarSesion = function () {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        window.detenerSincronizacion();
        window.limpiarCache?.();
        localStorage.removeItem('sesion_activa');
        window.location.href = '../index.html';
    }
};

// ============================================================================
// LOG FINAL
// ============================================================================
console.log('✅ dashboard-cliente.js v3.0 (modularizado) cargado');