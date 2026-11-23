/**
 * DASHBOARD DEL TALLER - Versión completa con notificaciones
 */
import { conectarWebSocketTaller } from './websocket-taller.js';
import { TallerManager } from './TallerManager.js';
import { GestionResenas } from './taller-resenas.js';
import { ConfiguracionTaller } from './configuracion-taller.js';
import { MapaConfigTaller } from './mapa-config.js';
import { GestionFotos } from './gestion-fotos.js';
import { GaleriaTaller } from './galeria-taller.js';
import { inicializarHistorialTrabajos } from './historialTrabajos.js';
import { inicializarHistorialPagos } from './historialPagos.js';
import { inicializarRendimiento } from './rendimiento-taller.js';
import { inicializarComisiones } from './comisiones-taller.js';
import { inicializarEmpleados, actualizarEmpleadosSuave } from './empleados-taller.js';
import { inicializarBahias } from './bahias-taller.js';
import { inicializarPlanes } from './planes-taller.js';
import { inicializarServicios } from './servicios-taller.js';
import { inicializarCitas } from './citas-taller.js';
import { inicializarPanel } from './panel-taller.js';
import { inicializarNotificaciones } from './notificaciones-taller.js';

import { TemaManager } from '../archPersonalizar/temaManager.js';
import { ToastManager } from '../archPersonalizar/toast.js';
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
// ==================== FUNCIONES GLOBALES DE MODALES ====================
let seccionActiva = 'panel';
window.cerrarModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};



const ROLES = {
    PROPIETARIO: {
        nivel: 4, nombre: 'Propietario',
        puedeGestionarTaller: true, puedeGestionarEmpleados: true, puedeGestionarBahias: true,
        puedeVerTodasCitas: true, puedeConfirmarCitas: true, puedeCambiarEstados: true,
        puedeVerHistorial: true, puedeVerDashboard: true, puedeAsignarTrabajos: true,
        puedeFinalizarTrabajos: true, puedeVerEstadisticas: true
    },
    ADMIN: {
        nivel: 3, nombre: 'Administrador',
        puedeGestionarTaller: false, puedeGestionarEmpleados: true, puedeGestionarBahias: true,
        puedeVerTodasCitas: true, puedeConfirmarCitas: true, puedeCambiarEstados: true,
        puedeVerHistorial: true, puedeVerDashboard: true, puedeAsignarTrabajos: true,
        puedeFinalizarTrabajos: true, puedeVerEstadisticas: true
    },
    SUPERVISOR: {
        nivel: 2, nombre: 'Supervisor',
        puedeGestionarTaller: false, puedeGestionarEmpleados: false, puedeGestionarBahias: false,
        puedeVerTodasCitas: true, puedeConfirmarCitas: true, puedeCambiarEstados: true,
        puedeVerHistorial: true, puedeVerDashboard: true, puedeAsignarTrabajos: true,
        puedeFinalizarTrabajos: true, puedeVerEstadisticas: false
    },
    DETALLADOR: {
        nivel: 1, nombre: 'Detallador',
        puedeGestionarTaller: false, puedeGestionarEmpleados: false, puedeGestionarBahias: false,
        puedeVerTodasCitas: false, puedeConfirmarCitas: false, puedeCambiarEstados: true,
        puedeVerHistorial: false, puedeVerDashboard: false, puedeAsignarTrabajos: false,
        puedeFinalizarTrabajos: true, puedeVerEstadisticas: false
    },
    LAVADOR: {
        nivel: 1, nombre: 'Lavador',
        puedeGestionarTaller: false, puedeGestionarEmpleados: false, puedeGestionarBahias: false,
        puedeVerTodasCitas: false, puedeConfirmarCitas: false, puedeCambiarEstados: true,
        puedeVerHistorial: false, puedeVerDashboard: false, puedeAsignarTrabajos: false,
        puedeFinalizarTrabajos: true, puedeVerEstadisticas: false
    }
};

let tallerActual = null;
let permisos = ROLES['PROPIETARIO'];
window.notificaciones = [];
let empleadoIdActual = null;
let rolActual = 'PROPIETARIO';
let citasFiltradas = [];
let sistemaTalleres = null;
window.citasVistas = new Set(JSON.parse(localStorage.getItem('citas_vistas') || '[]'));
let filtroNotificacionesActual = 'todas';
window.empleadoAPagar = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {

    const sesionRaw = localStorage.getItem('taller_sesion');
    if (!sesionRaw) {
        window.location.href = 'login.html';
        return;
    }

    const sesion = JSON.parse(sesionRaw);
    if (!sesion || !sesion._id) {
        console.error('❌ Sesión inválida');
        localStorage.removeItem('taller_sesion');
        window.location.href = 'login.html';
        return;
    }

    // ✅ Inicializar roles y taller actual PRIMERO
    inicializarRoles();
    tallerActual = sesion;
    localStorage.setItem('taller_sesion', JSON.stringify(sesion));
    sistemaTalleres = new TallerManager();


    // ✅ TOAST MANAGER
    if (typeof ToastManager !== 'undefined') {
        window.toast = new ToastManager();
        window.mostrarToast = function (mensaje, tipo, duracion) {
            window.toast.mostrar(mensaje, tipo, duracion);
        };
    } else {
        window.mostrarToast = function (mensaje, tipo) {
            console.log(`🔔 [${tipo}]`, mensaje);
            alert(mensaje);
        };
    }

    // ✅ COLOR
    window.aplicarColorTaller = function (color) {
        if (!color) return;
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--taller-color', color);
        document.documentElement.style.setProperty('--taller-color-rgb', `${r}, ${g}, ${b}`);
        const sidebarLogo = document.getElementById('sidebar-taller-logo');
        if (sidebarLogo) { sidebarLogo.style.borderColor = color; sidebarLogo.style.boxShadow = `0 0 15px rgba(${r}, ${g}, ${b}, 0.3)`; }
        const sidebarIcon = document.getElementById('sidebar-taller-icon');
        if (sidebarIcon) { sidebarIcon.style.background = `rgba(${r}, ${g}, ${b}, 0.1)`; sidebarIcon.style.borderColor = color; }
        const sidebarName = document.getElementById('sidebar-taller-name');
        if (sidebarName) sidebarName.style.color = color;
        localStorage.setItem('taller_color', color);
    };

    const colorGuardado = sesion.color || localStorage.getItem('taller_color') || '#00ff88';
    window.aplicarColorTaller(colorGuardado);

    // ✅ SISTEMA DE TEMAS
    if (typeof TemaManager !== 'undefined') {
        window.temaManager = new TemaManager();
        window.temaManager.inicializar();
        setTimeout(() => {
            window.temaManager.renderizarSelectorTemas('selector-temas');
            window.temaManager.renderizarSelectorPaletas('selector-paletas');
            const config = window.temaManager.getConfiguracion();
            const colorInput = document.getElementById('input-color-primario');
            if (colorInput && config.colorPrimario) colorInput.value = config.colorPrimario;
            document.querySelectorAll('.btn-densidad').forEach(btn => {
                if (btn.dataset.densidad === config.densidad) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--accent-bg)';
                    btn.style.color = 'var(--accent-color)';
                    btn.style.borderColor = 'var(--accent-color)';
                }
            });
            document.querySelectorAll('.btn-font').forEach(btn => {
                if (btn.dataset.font === config.tamanoFuente) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--accent-bg)';
                    btn.style.color = 'var(--accent-color)';
                    btn.style.borderColor = 'var(--accent-color)';
                }
            });
            if (config.paletaActual) {
                const paletaActiva = document.querySelector(`.btn-paleta[data-paleta="${config.paletaActual}"]`);
                if (paletaActiva) {
                    paletaActiva.classList.add('active');
                    paletaActiva.style.borderColor = 'var(--accent-color)';
                    paletaActiva.style.boxShadow = '0 0 15px var(--accent-glow)';
                    paletaActiva.style.transform = 'scale(1.05)';
                    paletaActiva.style.background = 'var(--accent-bg)';
                }
            }
        }, 300);
    }

    // ✅ CAMBIAR CONTRASEÑA
    window.cambiarContrasenaTaller = async function () {
        const actual = document.getElementById('config-password-actual')?.value;
        const nueva = document.getElementById('config-password-nueva')?.value;
        const confirmar = document.getElementById('config-password-confirmar')?.value;
        if (!actual || !nueva || !confirmar) { window.mostrarToast('⚠️ Completa todos los campos', 'warning'); return; }
        if (nueva.length < 6) { window.mostrarToast('⚠️ Mínimo 6 caracteres', 'warning'); return; }
        if (nueva !== confirmar) { window.mostrarToast('⚠️ Las contraseñas no coinciden', 'warning'); return; }
        if (actual === nueva) { window.mostrarToast('⚠️ Debe ser diferente', 'warning'); return; }
        const toastId = window.mostrarToast('⏳ Cambiando contraseña...', 'info', 0);
        try {
            const response = await apiFetch(`/talleres/${tallerActual._id}/cambiar-password`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva })
            });
            const data = await response.json();
            window.toast.cerrar(toastId);
            if (data.exito) {
                window.mostrarToast('✅ Contraseña cambiada exitosamente', 'success');
                document.getElementById('config-password-actual').value = '';
                document.getElementById('config-password-nueva').value = '';
                document.getElementById('config-password-confirmar').value = '';
            } else {
                window.mostrarToast('❌ ' + (data.mensaje || 'Error'), 'error');
            }
        } catch (error) {
            window.toast.cerrar(toastId);
            window.mostrarToast('❌ Error de conexión', 'error');
        }
    };

    document.getElementById('btn-cambiar-password')?.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); window.cambiarContrasenaTaller();
    });

    // ✅ FUNCIÓN AUXILIAR
    window.cambiarSeccion = function (sectionId, titulo) {
        document.querySelectorAll('.dashboard-section').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
        const section = document.getElementById(sectionId);
        if (section) { section.style.display = 'block'; section.classList.add('active'); }
        document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`[data-section="${sectionId}"]`);
        if (link) { link.classList.add('active'); document.getElementById('header-title').textContent = titulo || link.textContent.trim(); }
        localStorage.setItem('taller_seccion_activa', sectionId);
    };

    const seccionGuardada = localStorage.getItem('taller_seccion_activa');
    const seccionAMostrar = seccionGuardada || 'panel';
    window.cambiarSeccion(seccionAMostrar);

    // ✅ Inicializar managers
    window.gestionFotos = new GestionFotos(API_URL, tallerActual);
    window.gestionResenas = new GestionResenas(API_URL, tallerActual);
    window.galeriaTaller = new GaleriaTaller(API_URL, tallerActual);
    window.configuracionTaller = new ConfiguracionTaller(API_URL);
    window.mapaConfig = new MapaConfigTaller(API_URL);
    window.previewLogoTaller = function (event) { window.configuracionTaller?.previewLogo(event); };
    window.abrirModalFotos = (citaId) => window.gestionFotos?.abrir(citaId);
    window.cambiarTabFoto = (tipo) => window.gestionFotos?.cambiarTab(tipo);
    window.previsualizarFotos = (e) => window.gestionFotos?.previsualizar(e);
    window.subirFotosCita = () => window.gestionFotos?.subir();

    document.getElementById('input-logo-taller')?.addEventListener('change', function (event) {
        event.preventDefault(); event.stopPropagation();
        if (window.configuracionTaller) window.configuracionTaller.previewLogo(event);
    });

    document.getElementById('btn-guardar-config')?.addEventListener('click', async function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!tallerActual || !tallerActual._id) { window.mostrarToast('⚠️ No se ha cargado la información del taller.', 'warning'); return; }
        if (window.configuracionTaller) { window.configuracionTaller.tallerActual = tallerActual; await window.configuracionTaller.guardar(); }
        if (window.mapaConfig) { window.mapaConfig.tallerActual = tallerActual; await window.mapaConfig.guardar(); }
    });

    // ✅ NAVEGACIÓN
    window.configurarNavegacion = function () {
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const sectionId = link.dataset.section;
                const titulo = link.textContent.trim();
                const seccionesPermitidas = {
                    'panel': permisos?.puedeVerDashboard, 'citas': true, 'servicios': permisos?.puedeGestionarTaller,
                    'planes': permisos?.puedeGestionarTaller, 'bahias': permisos?.puedeGestionarBahias,
                    'empleados': permisos?.puedeGestionarEmpleados, 'comisiones': permisos?.puedeGestionarEmpleados,
                    'rendimiento': permisos?.puedeVerDashboard, 'historial': permisos?.puedeVerHistorial,
                    'historial-pagos': permisos?.puedeGestionarEmpleados, 'configuracion': permisos?.puedeGestionarTaller,
                    'resenas': true, 'galeria': true
                };
                if (seccionesPermitidas[sectionId] === false) { window.mostrarToast('⛔ No tienes permiso', 'warning'); return; }
                window.cambiarSeccion(sectionId, titulo);
                switch (sectionId) {
                    case 'panel': if (permisos?.puedeVerDashboard) await cargarDashboard(); break;
                    case 'citas': document.getElementById('filtro-estado').value = 'TODAS'; document.getElementById('filtro-fecha').value = new Date().toISOString().split('T')[0]; await cargarCitas(); break;
                    case 'servicios': await cargarServicios(); break;
                    case 'planes': await cargarPlanes(); break;
                    case 'bahias': if (permisos?.puedeGestionarBahias) await cargarBahias(); break;
                    case 'empleados': if (permisos?.puedeGestionarEmpleados) await cargarEmpleados(); break;
                    case 'comisiones': await cargarRendimientoEmpleados(); break;
                    case 'rendimiento': await cargarRendimiento(); break;
                    case 'historial': if (permisos?.puedeVerHistorial) await cargarHistorial(); break;
                    case 'resenas': await window.gestionResenas?.cargar(); break;
                    case 'configuracion':
                        if (window.configuracionTaller) await window.configuracionTaller.cargar(tallerActual);
                        setTimeout(() => {
                            if (window.mapaConfig) { window.mapaConfig.tallerActual = tallerActual; window.mapaConfig.inicializar(tallerActual); }
                            if (window.temaManager) { window.temaManager.renderizarSelectorTemas('selector-temas'); window.temaManager.renderizarSelectorPaletas('selector-paletas'); }
                        }, 500);
                        break;
                    case 'historial-pagos': await cargarHistorialPagos(); break;
                    case 'galeria': await window.galeriaTaller?.cargar(); break;
                }
            });
        });
    };

    // ✅ Inicializar módulos
    aplicarPermisosUI();
    configurarNavegacion();
    configurarSidebar();
    mostrarFechaActual();
    inicializarNotificaciones();
    inicializarHistorialTrabajos();
    inicializarHistorialPagos();
    inicializarRendimiento();
    inicializarComisiones();
    inicializarEmpleados();
    inicializarBahias();
    inicializarPlanes();
    inicializarServicios();
    inicializarCitas();
    inicializarPanel();
    const inputFecha = document.getElementById('filtro-fecha');
    if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];

    // ✅ CARGAR DATOS SEGÚN LA SECCIÓN ACTIVA
    switch (seccionAMostrar) {
        case 'panel':
            if (permisos?.puedeVerDashboard) await cargarDashboard();
            await cargarCitas();
            if (permisos?.puedeGestionarBahias) await cargarBahias();
            if (permisos?.puedeGestionarEmpleados) await cargarEmpleados();
            if (permisos?.puedeVerHistorial) await cargarHistorial();
            break;
        case 'citas': setTimeout(async () => { document.getElementById('filtro-estado').value = 'TODAS'; document.getElementById('filtro-fecha').value = new Date().toISOString().split('T')[0]; await cargarCitas(); }, 200); break;
        case 'servicios': setTimeout(() => cargarServicios(), 200); break;
        case 'planes': setTimeout(() => cargarPlanes(), 200); break;
        case 'bahias': if (permisos?.puedeGestionarBahias) setTimeout(() => cargarBahias(), 200); break;
        case 'empleados': if (permisos?.puedeGestionarEmpleados) setTimeout(() => cargarEmpleados(), 200); break;
        case 'comisiones': setTimeout(() => cargarRendimientoEmpleados(), 200); break;
        case 'rendimiento': setTimeout(() => cargarRendimiento(), 200); break;
        case 'historial': if (permisos?.puedeVerHistorial) setTimeout(() => cargarHistorial(), 200); break;
        case 'historial-pagos': setTimeout(() => cargarHistorialPagos(), 200); break;
        case 'resenas': setTimeout(() => window.gestionResenas?.cargar(), 200); break;
        case 'galeria': setTimeout(() => window.galeriaTaller?.cargar(), 200); break;
        case 'configuracion': setTimeout(async () => { if (window.configuracionTaller) await window.configuracionTaller.cargar(tallerActual); setTimeout(() => { if (window.mapaConfig) { window.mapaConfig.tallerActual = tallerActual; window.mapaConfig.inicializar(tallerActual); } }, 500); }, 200); break;
    }

    document.getElementById('filtro-estado')?.addEventListener('change', cargarCitas);
    document.getElementById('filtro-fecha')?.addEventListener('change', cargarCitas);
    document.getElementById('busqueda-historial')?.addEventListener('input', (e) => filtrarHistorial(e.target.value));

    setInterval(async () => {
        //  cargarNotificaciones();
        await actualizarCitasSuave();
        if (permisos?.puedeVerDashboard) await actualizarCitasSuave();

        const seccionBahias = document.getElementById('bahias');
        if (seccionBahias && seccionBahias.classList.contains('active')) {
            await actualizarBahiasSuave();
        }
        // ✅ Actualización SUAVE de empleados (sin parpadeo)
        const seccionEmpleados = document.getElementById('empleados');
        if (seccionEmpleados && seccionEmpleados.classList.contains('active')) {
            await actualizarEmpleadosSuave();
        }
        if (permisos?.puedeVerDashboard) await actualizarDashboardSuave();
    }, 10000);

    window.addEventListener('beforeunload', () => {
        const seccionActiva = document.querySelector('.dashboard-section.active')?.id;
        if (seccionActiva) localStorage.setItem('taller_seccion_activa', seccionActiva);
    });

    console.log('🔐 Rol:', rolActual, '| Permisos:', permisos);
    console.log('📌 Sección mostrada:', seccionAMostrar);
});


window.guardarConfiguracion = async function (event) {
    event.preventDefault();
    await window.mapaConfig.guardar();
};
window.configurarSidebar = function () {
    const sesion = JSON.parse(localStorage.getItem('taller_sesion'));
    document.getElementById('sidebar-taller-name').textContent = sesion?.nombre || 'Mi Taller';

    // ✅ Mostrar logo en sidebar si existe (MEJORADO)
    const logoUrl = sesion?.logo;
    const sidebarLogo = document.getElementById('sidebar-taller-logo');
    const sidebarIcon = document.getElementById('sidebar-taller-icon');

    // ✅ DEBUG: Verificar elementos (NUEVO)
    console.log('🔧 configurarSidebar - Logo URL:', logoUrl || 'NO TIENE');
    console.log('🔧 configurarSidebar - sidebarLogo existe:', !!sidebarLogo);
    console.log('🔧 configurarSidebar - sidebarIcon existe:', !!sidebarIcon);

    if (logoUrl && sidebarLogo) {
        // ✅ Hay logo: mostrar imagen, ocultar ícono
        sidebarLogo.src = logoUrl;
        sidebarLogo.style.display = 'block';
        if (sidebarIcon) {
            sidebarIcon.style.display = 'none';
        }
        console.log('✅ Logo cargado en sidebar');
    } else if (sidebarLogo) {
        // ✅ No hay logo: ocultar imagen, mostrar ícono (NUEVO - Corrige el bug)
        sidebarLogo.style.display = 'none';
        if (sidebarIcon) {
            sidebarIcon.style.display = 'block';
        }
        console.log('✅ Ícono por defecto mostrado (sin logo)');
    }

    // ✅ Rol y propietario (sin cambios)
    const rolNombre = permisos?.nombre || 'Empleado';
    const rolColor = rolActual === 'PROPIETARIO' ? '#ffbb33' :
        rolActual === 'ADMIN' ? '#ff44ff' :
            rolActual === 'SUPERVISOR' ? '#00d4ff' : '#00ff88';
    document.getElementById('header-propietario').innerHTML = `${sesion?.propietario?.nombre || 'Usuario'} <span style="color:${rolColor}; font-size:0.7rem; background:${rolColor}22; padding:2px 8px; border-radius:10px;">${rolNombre}</span>`;
};

window.mostrarFechaActual = function () {
    document.getElementById('fecha-actual').textContent = new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// ==================== SISTEMA DE ROLES Y PERMISOS ====================
function inicializarRoles() {
    const sesion = JSON.parse(localStorage.getItem('taller_sesion') || '{}');
    if (!sesion) return;
    rolActual = sesion.rol || 'PROPIETARIO';
    empleadoIdActual = sesion.empleadoId || null;
    permisos = ROLES[rolActual] || ROLES.PROPIETARIO;
    console.log('🔐 Rol:', rolActual, '| Permisos:', permisos);
}

function aplicarPermisosUI() {
    if (!permisos) return;
    const menuItems = {
        'panel': permisos.puedeVerDashboard, 'citas': true,
        'bahias': permisos.puedeGestionarBahias, 'empleados': permisos.puedeGestionarEmpleados,
        'historial': permisos.puedeVerHistorial, 'configuracion': permisos.puedeGestionarTaller
    };
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        const section = link.dataset.section;
        if (section && menuItems[section] === false) link.style.display = 'none';
    });
    if (!permisos.puedeGestionarEmpleados) {
        const btn = document.querySelector('[onclick*="agregarEmpleado"]');
        if (btn) btn.style.display = 'none';
    }
    if (!permisos.puedeGestionarBahias) {
        const btn = document.querySelector('[onclick*="agregarBahia"]');
        if (btn) btn.style.display = 'none';
    }
}

// ==================== FOTOS ====================
let citaActualFotos = null;
let tipoFotoActual = 'antes';
let fotosSeleccionadas = [];

window.abrirSubirFotosAntes = function (citaId) { citaActualFotos = citaId; tipoFotoActual = 'antes'; abrirModalFotos('📸 Subir Fotos - ANTES 🔴'); };
window.abrirSubirFotosDespues = function (citaId) { citaActualFotos = citaId; tipoFotoActual = 'despues'; abrirModalFotos('📸 Subir Fotos - DESPUÉS 🟢'); };
window.abrirSubirFotosDurante = function (citaId) { citaActualFotos = citaId; tipoFotoActual = 'durante'; abrirModalFotos('📸 Subir Fotos - DURANTE 🟡'); };

function abrirModalFotos(titulo) {
    fotosSeleccionadas = [];
    let modal = document.getElementById('modal-fotos');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-fotos';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><span class="close-btn" onclick="document.getElementById('modal-fotos').style.display='none'">&times;</span><h3 id="modal-fotos-titulo">📸 Subir Fotos</h3><div id="fotos-preview" style="display:flex;flex-wrap:wrap;gap:10px;margin:15px 0;max-height:200px;overflow-y:auto;"></div><div class="form-group"><label>Selecciona las fotos:</label><input type="file" id="input-fotos" accept="image/*" multiple onchange="previewFotos(event)" style="background:#333;padding:10px;border-radius:8px;width:100%;color:white;"><small style="color:#888;">Máximo 5MB c/u.</small></div><div class="form-group"><label>Descripción:</label><input type="text" id="foto-descripcion" placeholder="Ej: Rayón en puerta" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:white;"></div><div class="modal-actions"><button class="btn-cancel" onclick="document.getElementById('modal-fotos').style.display='none'">CANCELAR</button><button class="btn-confirm" onclick="subirFotos()">📤 SUBIR</button></div></div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('modal-fotos-titulo').textContent = titulo;
    document.getElementById('fotos-preview').innerHTML = '';
    document.getElementById('foto-descripcion').value = '';
    document.getElementById('input-fotos').value = '';
    document.getElementById('modal-fotos').style.display = 'flex';
}



window.subirFotos = async function () {
    if (fotosSeleccionadas.length === 0) { alert('⚠️ Selecciona al menos una foto.'); return; }
    if (!citaActualFotos) { alert('❌ No hay cita seleccionada.'); return; }
    const btn = document.querySelector('#modal-fotos .btn-confirm');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Subiendo...'; }
    try {
        const descripcion = document.getElementById('foto-descripcion')?.value || '';
        const fotosConDescripcion = fotosSeleccionadas.map(f => ({ url: f.url, descripcion: descripcion || `Foto ${tipoFotoActual}` }));
        const url = `/talleres/citas/${citaActualFotos}/fotos/${tipoFotoActual}`;
        const response = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fotos: fotosConDescripcion, subidoPor: tallerActual?.propietario?.nombre || 'Empleado' }) });
        const data = await response.json();
        if (data.exito) { alert(`✅ ${data.totalFotos} foto(s) subidas`); document.getElementById('modal-fotos').style.display = 'none'; cargarCitas(); }
        else throw new Error(data.mensaje);
    } catch (error) { alert('❌ ' + error.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '📤 SUBIR'; } }
};

window.verGaleriaAntesDespues = async function (citaId) {
    const modalAnterior = document.getElementById('modal-galeria');
    if (modalAnterior) modalAnterior.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-galeria';
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = `<div class="modal-content" style="background:#0f1621;border:1px solid #1e2a3a;border-radius:16px;padding:25px;max-width:850px;width:95%;max-height:90vh;overflow-y:auto;"><span onclick="document.getElementById('modal-galeria').remove()" style="position:absolute;top:10px;right:15px;font-size:1.5rem;cursor:pointer;color:#888;">&times;</span><h3>📸 Galería Antes y Después</h3><div id="galeria-vehiculo-info" style="text-align:center;margin-bottom:15px;color:#aaa;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;"><div><h4 style="color:#ff6b6b;">🔴 ANTES</h4><div id="galeria-antes"></div></div><div><h4 style="color:#6bff6b;">🟢 DESPUÉS</h4><div id="galeria-despues"></div></div></div></div>`;
    document.body.appendChild(modal);
    await new Promise(r => setTimeout(r, 100));
    const galeriaAntes = document.getElementById('galeria-antes');
    const galeriaDespues = document.getElementById('galeria-despues');
    if (!galeriaAntes || !galeriaDespues) return;
    try {
        const response = await apiFetch(`/talleres/citas/${citaId}/fotos`); const data = await response.json();
        if (data.exito) {
            document.getElementById('galeria-vehiculo-info').innerHTML = `🚗 <strong>${data.vehiculo?.marca || ''} ${data.vehiculo?.modelo || ''} (${data.vehiculo?.placa || 'S/P'})</strong>`;
            const antes = data.fotos?.antes || [];
            const despues = data.fotos?.despues || [];
            galeriaAntes.innerHTML = antes.length > 0 ? antes.map(f => `<div style="background:#1a1a1a;border-radius:10px;overflow:hidden;margin-bottom:10px;"><img src="${f.url}" style="width:100%;height:180px;object-fit:cover;cursor:pointer;" onclick="window.open('${f.url}')"><div style="padding:8px;"><small style="color:#ccc;">${f.descripcion || ''}</small><br><small style="color:#666;">${new Date(f.fecha).toLocaleDateString('es-DO')}</small></div></div>`).join('') : '<p style="color:#666;">Sin fotos</p>';
            galeriaDespues.innerHTML = despues.length > 0 ? despues.map(f => `<div style="background:#1a1a1a;border-radius:10px;overflow:hidden;margin-bottom:10px;"><img src="${f.url}" style="width:100%;height:180px;object-fit:cover;cursor:pointer;" onclick="window.open('${f.url}')"><div style="padding:8px;"><small style="color:#ccc;">${f.descripcion || ''}</small><br><small style="color:#666;">${new Date(f.fecha).toLocaleDateString('es-DO')}</small></div></div>`).join('') : '<p style="color:#666;">Sin fotos</p>';
        }
    } catch (error) { console.error('Error galería:', error); }
};




function filtrarHistorial(busqueda) {
    const tbody = document.getElementById('historial-tbody');
    if (!tbody) return;
    const termino = busqueda.toLowerCase().trim();
    tbody.querySelectorAll('tr').forEach(fila => {
        if (fila.classList.contains('empty-state')) return;
        fila.style.display = (termino === '' || (fila.textContent || '').toLowerCase().includes(termino)) ? '' : 'none';
    });
}

















/**
 * Ver detalle de un trabajo específico
 */



/**
 * Cambia el estado de un pago (Pagado ↔ Pendiente)
 */
window.cambiarEstadoPago = async function (pagoId, nuevoEstado) {
    if (!confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) return;

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos/${pagoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estado: nuevoEstado,
                fechaPago: nuevoEstado === 'PAGADO' ? new Date().toISOString() : null
            })
        });

        const data = await response.json();
        if (data.exito) {
            cargarHistorialPagos();
        } else {
            alert('❌ ' + (data.mensaje || 'Error'));
        }
    } catch (error) {
        alert('❌ Error de conexión');
    }
};











/**
 * Abre modal para realizar pago a empleado
 */
window.abrirModalPagarEmpleado = function (empleadoId, nombre, montoPendiente, totalTrabajos, totalGenerado, comisionPorcentaje, trabajosPendientes) {
    empleadoAPagar = {
        id: empleadoId,
        nombre: nombre,
        monto: montoPendiente,
        totalTrabajos: totalTrabajos || 0,
        totalGenerado: totalGenerado || montoPendiente,
        comisionPorcentaje: comisionPorcentaje || 100,
        trabajosPendientes: trabajosPendientes || []
    };

    document.getElementById('pagar-empleado-nombre').textContent = '👨‍🔧 ' + nombre;
    document.getElementById('pagar-empleado-monto').textContent = 'RD$ ' + montoPendiente.toLocaleString();
    document.getElementById('pagar-monto').value = montoPendiente;
    document.getElementById('pagar-metodo').value = 'EFECTIVO';
    document.getElementById('pagar-notas').value = '';
    document.getElementById('modal-pagar-empleado').style.display = 'flex';
};

/**
 * Confirmar pago a empleado
 */
window.confirmarPagoEmpleado = async function () {
    if (!empleadoAPagar) return;

    const monto = parseFloat(document.getElementById('pagar-monto').value);
    const metodo = document.getElementById('pagar-metodo').value;
    const notas = document.getElementById('pagar-notas').value || '';

    if (isNaN(monto) || monto <= 0) {
        alert('⚠️ Ingresa un monto válido');
        return;
    }

    if (!confirm(`¿Confirmar pago de RD$ ${monto.toLocaleString()} a ${empleadoAPagar.nombre}?\n\n✅ El saldo pendiente volverá a cero.`)) return;

    const btn = document.querySelector('#modal-pagar-empleado .btn-confirm');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Procesando...';
    }

    try {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empleadoId: empleadoAPagar.id,
                periodo: {
                    inicio: inicioMes.toISOString(),
                    fin: finMes.toISOString()
                },
                totalTrabajos: empleadoAPagar.totalTrabajos || 0,
                totalGenerado: empleadoAPagar.totalGenerado || monto,
                comisionPorcentaje: empleadoAPagar.comisionPorcentaje || 100,
                comisionMonto: monto,
                metodoPago: metodo,
                notas: notas,
                trabajosIncluidos: empleadoAPagar.trabajosPendientes || []
            })
        });

        const data = await response.json();

        if (data.exito) {
            // ✅ Cerrar modal
            document.getElementById('modal-pagar-empleado').style.display = 'none';
            empleadoAPagar = null;

            // ✅ Mostrar mensaje de éxito
            alert(`✅ Pago de RD$ ${monto.toLocaleString()} realizado exitosamente.\n\nEl empleado ya no tiene saldo pendiente.`);

            // ✅ Recargar las tablas
            await cargarRendimientoEmpleados();
            await cargarHistorialPagos();

            // ✅ Notificar al empleado (guardar en localStorage para que lo vea)
            const notificacionesEmpleado = JSON.parse(localStorage.getItem('notificaciones_empleados') || '[]');
            notificacionesEmpleado.push({
                empleadoId: empleadoAPagar.id,
                tipo: 'PAGO_RECIBIDO',
                titulo: '💰 Pago Recibido',
                mensaje: `Has recibido un pago de RD$ ${monto.toLocaleString()} por tus trabajos realizados.`,
                fecha: new Date().toISOString(),
                leida: false
            });
            localStorage.setItem('notificaciones_empleados', JSON.stringify(notificacionesEmpleado));

            console.log('✅ Pago procesado y tablas actualizadas');
        } else {
            alert('❌ ' + (data.mensaje || 'Error al procesar pago'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💳 Confirmar Pago';
        }
    }
};













window.cerrarSesionTaller = () => {
    localStorage.removeItem('taller_sesion');
    localStorage.removeItem('taller_seccion_activa'); // ✅ LIMPIAR SECCIÓN
    window.location.href = 'login.html';
};



// ====================================================================
// 📦 GESTIÓN DE PLANES
// ====================================================================


window.enviarRespuestaResena = function () {
    window.gestionResenas.enviarRespuesta();
};
window.cargarResenas = function () {
    if (window.gestionResenas) {
        window.gestionResenas.cargar();
    }
};
// Función global para el botón del modal
window.subirFotos = function () {
    if (window.gestionFotos) {
        window.gestionFotos.subir();
    } else {
        console.error('❌ gestionFotos no está inicializado');
        alert('Error: Sistema de fotos no disponible');
    }
};
//logo
window.previewLogoTaller = function (event) {
    window.configuracionTaller?.previewLogo(event);
};



// ✅ Función para aplicar el color del taller en todo el dashboard (NUEVO)
window.aplicarColorTaller = function (color) {
    if (!color) return;

    console.log('🎨 Aplicando color del taller:', color);

    // ✅ Convertir hex a rgba para fondos semitransparentes
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // ✅ Aplicar variables CSS para usar en todo el dashboard
    document.documentElement.style.setProperty('--taller-color', color);
    document.documentElement.style.setProperty('--taller-color-rgb', `${r}, ${g}, ${b}`);

    // ✅ Actualizar logo del sidebar
    const sidebarLogo = document.getElementById('sidebar-taller-logo');
    if (sidebarLogo) {
        sidebarLogo.style.borderColor = color;
        sidebarLogo.style.boxShadow = `0 0 15px rgba(${r}, ${g}, ${b}, 0.3)`;
    }

    // ✅ Actualizar ícono del sidebar (si no hay logo)
    const sidebarIcon = document.getElementById('sidebar-taller-icon');
    if (sidebarIcon) {
        sidebarIcon.style.background = `rgba(${r}, ${g}, ${b}, 0.1)`;
        sidebarIcon.style.borderColor = color;
    }

    // ✅ Actualizar nombre del taller en sidebar
    const sidebarName = document.getElementById('sidebar-taller-name');
    if (sidebarName) {
        sidebarName.style.color = color;
    }

    // ✅ Actualizar botones de acción en sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.style.setProperty('--hover-color', `rgba(${r}, ${g}, ${b}, 0.1)`);
    });

    // ✅ Actualizar badges y elementos activos
    document.querySelectorAll('.active-badge, .status-active').forEach(el => {
        el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
        el.style.color = color;
        el.style.borderColor = color;
    });

    // ✅ Guardar en localStorage para persistir al recargar
    localStorage.setItem('taller_color', color);

    console.log('✅ Color del taller aplicado correctamente');
};


// Función global para guardar
window.guardarConfiguracionTaller = async function (event) {
    // ✅ Prevenir refresh si viene de un botón submit
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // ✅ Verificar que tengamos el taller
    if (!tallerActual || !tallerActual._id) {
        alert('⚠️ No se ha cargado la información del taller. Recarga la página.');
        return false;
    }

    // ✅ Asegurar que configuracionTaller tenga el taller actual
    if (window.configuracionTaller) {
        window.configuracionTaller.tallerActual = tallerActual;
        await window.configuracionTaller.guardar();
    }

    // Guardar coordenadas del mapa
    if (window.mapaConfig) {
        window.mapaConfig.tallerActual = tallerActual;
        await window.mapaConfig.guardar();
    }

    return false;
};

// ================================================================
// 🔌 WEBSOCKETS - Notificaciones en tiempo real
// ================================================================



function reproducirSonidoNotificacion() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2qEcP+1j2FtNjeC4dGqaIhx/7aQZWE2OILh0KtpiHH/tpBlYTc4guHQrGmIcf+3kGZhNjmC4dCraYhx/7eRZmE3OYLh0KxqiHH/uJFmYTc5guHQrGqIcf+4kmZhNzmC4dGsaohx/7mTZmE3OoLh0axqiHH/uZNmYTc6guHRrGqIcf+5k2ZhNzqC4dGta4hx/7qUZmE3OoLh0q1riHH/upRmYTc6guHSrWuIcf+6lWZhNzuC4dKta4hx/7uVZmE3O4Lh0q5riHH/u5ZmYTc7guHSrmuIcf+7l2ZhNzyC4dKua4hx/7yXZmE3PILh0q9riHH/vJhmYTc8guHSsGuIcf+8mGZhNz2C4dKwa4hx/72ZZmE3PYLh0rFriHH/vZlmYTc+guHSsWuIcf++mmZhNz6C4dKya4hx/76aZmE3PoLh0rJriHH/v5pmYTc/guHSs2uIcf+/m2ZhN0CC4dKza4hx/8CbZmE3QILh0rRriHH/wJxmYTdBguHStGuIcf/BnGZhN0GC4dK1a4hx/8GdZmE3QYLh0rVriHH/wp1mYTdCguHStmuIcf/CnWZhN0KC4dK2a4hx/8OeZmE3Q4Lh0rdriHH/w55mYTdDguHS');
        audio.volume = 0.3;
        audio.play().catch(() => { });
    } catch (e) { }
}

// ================================================================
// 🔌 CONECTAR WEBSOCKET DEL TALLER
// ================================================================
function inicializarWebSocketTaller() {
    const sesion = JSON.parse(localStorage.getItem('taller_sesion'));
    if (!sesion?._id) {
        console.warn('⚠️ No hay sesión de taller, WebSocket no iniciado');
        return;
    }

    conectarWebSocketTaller(sesion._id, {
        // ============================================================
        // 🔔 NOTIFICACIONES
        // ============================================================
        onNotificacion: (data) => {
            console.log('📡 Notificación recibida:', data);

            window.notificaciones = window.notificaciones || [];
            window.notificaciones.unshift({
                id: `ws-${Date.now()}`,
                tipo: data.tipo,
                titulo: data.titulo,
                mensaje: data.mensaje,
                fecha: new Date().toISOString(),
                leida: false,
                prioridad: data.prioridad || 'media'
            });

            localStorage.setItem('notificaciones_taller', JSON.stringify(window.notificaciones));

            if (typeof actualizarBadge === 'function') actualizarBadge();
            if (typeof window.mostrarToast === 'function') window.mostrarToast(data.titulo, 'info');
            if (typeof reproducirSonidoNotificacion === 'function') reproducirSonidoNotificacion();
        },

        // ============================================================
        // 🔄 EMPLEADO ACTUALIZADO
        // ============================================================
        onEmpleadoActualizado: (empleadoId, cambios) => {
            console.log(`👨‍🔧 Empleado ${empleadoId} actualizado:`, cambios);

            if (cambios.fotoPerfil) {
                const avatares = document.querySelectorAll(`img[data-empleado-id="${empleadoId}"]`);
                avatares.forEach(img => { img.src = cambios.fotoPerfil; });
                console.log(`✅ ${avatares.length} avatares del empleado actualizados`);
            }

            const seccionEmpleados = document.getElementById('empleados');
            if (seccionEmpleados && seccionEmpleados.classList.contains('active')) {
                if (typeof actualizarEmpleadosSuave === 'function') {
                    actualizarEmpleadosSuave();
                }
            }
        },

        // ============================================================
        // 🔄 CLIENTE ACTUALIZADO
        // ============================================================
        onClienteActualizado: (clienteId, cambios) => {
            console.log(`👤 Cliente ${clienteId} actualizado:`, cambios);

            if (cambios.fotoPerfil) {
                const avatares = document.querySelectorAll(`img[data-cliente-avatar="${clienteId}"]`);
                avatares.forEach(img => { img.src = cambios.fotoPerfil; });
                console.log(`✅ ${avatares.length} avatares del cliente actualizados`);
            }
        },

        // ============================================================
        // 🔄 TALLER ACTUALIZADO
        // ============================================================
        onTallerActualizado: (cambios) => {
            console.log('🏪 Taller actualizado:', cambios);

            if (cambios.logo) {
                const sidebarLogo = document.getElementById('sidebar-taller-logo');
                if (sidebarLogo) sidebarLogo.src = cambios.logo;

                document.querySelectorAll('img[data-taller-logo="true"]').forEach(img => {
                    img.src = cambios.logo;
                });
            }

            if (cambios.nombre) {
                const sidebarName = document.getElementById('sidebar-taller-name');
                if (sidebarName) sidebarName.textContent = cambios.nombre;
            }

            const sesion = JSON.parse(localStorage.getItem('taller_sesion') || '{}');
            Object.assign(sesion, cambios);
            localStorage.setItem('taller_sesion', JSON.stringify(sesion));
        },

        // ============================================================
        // ⭐ RESEÑAS ACTUALIZADAS
        // ============================================================
        onResenaActualizada: (evento, data) => {
            console.log(`⭐ [Reseñas] ${evento}:`, data);

            const seccionResenas = document.getElementById('resenas');
            if (seccionResenas && seccionResenas.classList.contains('active')) {
                if (window.gestionResenas && typeof window.gestionResenas.cargar === 'function') {
                    window.gestionResenas.cargar();
                    console.log('🔄 Reseñas del taller recargadas automáticamente');

                    if (typeof window.mostrarToast === 'function') {
                        window.mostrarToast('🔄 Reseñas actualizadas', 'info');
                    }
                }
            }
        }
    });
}

// ✅ Inicializar WebSocket cuando el dashboard cargue
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        inicializarWebSocketTaller();
    }, 500);
});