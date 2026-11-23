/* ============================================================================
   MI TALLER - Módulo del cliente (v2 - CON FIXES)
   ============================================================================
   Carga y renderiza la sección "Mi Taller" con toda la información
   del taller vinculado por el cliente.
   
   Cambios v2:
   - Fix: mostrar content correctamente (display: block)
   - Fix: navegación sin event.preventDefault
   - Fix: manejo de errores parciales
   - Fix: resetear estados al iniciar
   - Fix: botones con location.hash
   ============================================================================ */

import { API_URL } from '../config.js';
import { apiFetch, apiJSON } from '../api-client.js';

// ============================================================================
// ESTADO
// ============================================================================
const estadoMiTaller = {
    taller: null,
    citas: [],
    servicios: [],
    galeria: [],
    equipo: [],        // ⭐ NUEVO
    resenas: [],
    cargado: false,
};

window.miTallerEstado = estadoMiTaller;

// ============================================================================
// 1. CARGAR MI TALLER (función principal)
// ============================================================================
export async function cargarMiTaller() {
    const loading = document.getElementById('mi-taller-loading');
    const empty = document.getElementById('mi-taller-empty');
    const content = document.getElementById('mi-taller-content');

    if (!loading || !empty || !content) {
        console.warn('⚠️ Elementos de Mi Taller no encontrados');
        return;
    }

    // ⭐ RESETEAR TODOS LOS ESTADOS AL INICIO
    loading.style.display = 'flex';
    loading.classList.remove('d-none');
    empty.style.display = 'none';
    empty.classList.add('d-none');
    content.style.display = 'none';
    content.classList.add('d-none');

    try {
        // Verificar si hay taller vinculado
        if (!window.tallerManager || !window.tallerManager.tieneTallerVinculado()) {
            // Estado vacío
            loading.style.display = 'none';
            loading.classList.add('d-none');
            empty.style.display = 'block';
            empty.classList.remove('d-none');
            return;
        }

        // Obtener datos del taller
        const taller = window.tallerManager.getTaller();
        if (!taller) {
            loading.style.display = 'none';
            loading.classList.add('d-none');
            empty.style.display = 'block';
            empty.classList.remove('d-none');
            return;
        }

        estadoMiTaller.taller = taller;

        // ⭐ MOSTRAR CONTENT ANTES DE CARGAR SECCIONES
        loading.style.display = 'none';
        loading.classList.add('d-none');
        content.style.display = 'block';
        content.classList.remove('d-none');

        // Renderizar hero inmediatamente
        renderizarHero(taller);

        // Cargar secciones en paralelo (sin bloquear si una falla)
        await Promise.allSettled([
            cargarCitas(),
            cargarServicios(),
            cargarGaleria(),
            cargarResenas(),
            cargarPlan(),
            cargarEquipo(),
            Promise.resolve().then(() => inicializarMapa(taller)),
        ]);

        estadoMiTaller.cargado = true;
        console.log('✅ Mi Taller cargado correctamente');

    } catch (error) {
        console.error('❌ Error cargando mi taller:', error);

        // ⭐ MOSTRAR CONTENT AUNQUE HAYA ERRORES
        loading.style.display = 'none';
        loading.classList.add('d-none');
        content.style.display = 'block';
        content.classList.remove('d-none');

        window.mostrarToast?.('⚠️ Algunas secciones no se cargaron', 'warning');
    }
}

// ============================================================================
// 2. RENDERIZAR HERO DEL TALLER
// ============================================================================
function renderizarHero(taller) {
    const container = document.getElementById('mi-taller-hero');
    if (!container) return;

    const estaAbierto = taller.abierto !== false;
    const promedio = taller.calificacion?.promedio || 0;
    const totalResenas = taller.calificacion?.totalReseñas || 0;
    const estrellas = promedio > 0 ? '⭐'.repeat(Math.round(promedio)) : '';
    const direccion = `${taller.direccion?.calle || ''}, ${taller.direccion?.ciudad || ''}`;

    // Logo o placeholder
    const logoHTML = taller.logo
        ? `<img src="${taller.logo}" class="mi-taller-hero-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="mi-taller-hero-logo-placeholder" style="display:none;">🏪</div>`
        : `<div class="mi-taller-hero-logo-placeholder">🏪</div>`;

    container.innerHTML = `
        <div class="mi-taller-hero-top">
            ${logoHTML}
            <div class="mi-taller-hero-info">
                <h2 class="mi-taller-hero-nombre">
                    ${taller.nombre || 'Mi Taller'}
                    <span class="mi-taller-hero-badge ${estaAbierto ? 'abierto' : 'cerrado'}">
                        ${estaAbierto ? '🟢 Abierto' : '🔴 Cerrado'}
                    </span>
                </h2>
                ${promedio > 0 ? `
                <div class="mi-taller-hero-rating">
                    <span>${estrellas}</span>
                    <span class="rating-numero">${promedio.toFixed(1)}</span>
                    <small>(${totalResenas} reseñas)</small>
                </div>
                ` : '<div class="mi-taller-hero-rating"><small>Sin reseñas aún</small></div>'}
            </div>
        </div>
        
        <div class="mi-taller-hero-meta">
            ${direccion ? `
            <div class="mi-taller-hero-meta-item">
                <span>📍</span>
                <span>${direccion}</span>
            </div>` : ''}
            ${taller.telefono ? `
            <div class="mi-taller-hero-meta-item">
                <span>📞</span>
                <span>${taller.telefono}</span>
            </div>` : ''}
            ${taller.horario ? `
            <div class="mi-taller-hero-meta-item">
                <span>⏰</span>
                <span>${typeof taller.horario === 'object' ? 'Ver horarios' : taller.horario}</span>
            </div>` : ''}
            ${taller.especialidad ? `
            <div class="mi-taller-hero-meta-item">
                <span>🔧</span>
                <span>Especialidad: <strong>${taller.especialidad}</strong></span>
            </div>` : ''}
        </div>

        <!-- ⭐ NUEVO: Advertencia de distancia -->
        ${generarAdvertenciaDistancia(taller)}

        <div class="mi-taller-hero-actions">
            <button class="btn-hero-primario" onclick="window.abrirModalSolicitud?.()">
                📅 Agendar cita
            </button>
            ${taller.direccion?.coordenadas?.lat ? `
            <a href="https://www.google.com/maps/dir/?api=1&destination=${taller.direccion.coordenadas.lat},${taller.direccion.coordenadas.lng}" 
               target="_blank" class="btn-hero-secundario">
                🗺️ Cómo llegar
            </a>` : ''}
            <button class="btn-hero-peligro" onclick="window.confirmarDesvincular()">
                ❌ Desvincular
            </button>
        </div>
    `;
}

// ⭐ NUEVO: Genera el HTML de advertencia si el cliente está lejos
function generarAdvertenciaDistancia(taller) {
    const latTaller = taller.direccion?.coordenadas?.lat;
    const lngTaller = taller.direccion?.coordenadas?.lng;

    if (!latTaller || !lngTaller) return '';

    // Si no tenemos ubicación del cliente, usar la del taller (distancia 0)
    const latCliente = window._ubicacionCliente?.lat;
    const lngCliente = window._ubicacionCliente?.lng;

    if (!latCliente || !lngCliente) {
        // No podemos calcular, pero mostramos un aviso suave
        return '';
    }

    const distancia = calcularDistancia(latCliente, lngCliente, latTaller, lngTaller);

    if (distancia < 50) {
        // Está cerca, no mostrar advertencia
        return '';
    }

    if (distancia < 200) {
        return `
            <div style="background:rgba(255,187,51,0.08); border:1px solid rgba(255,187,51,0.25); border-radius:12px; padding:12px 15px; margin:15px 0; display:flex; align-items:start; gap:10px;">
                <span style="font-size:1.3rem;">⚠️</span>
                <div style="flex:1;">
                    <p style="color:#ffbb33; font-weight:600; margin:0 0 3px; font-size:0.9rem;">
                        Estás a ${Math.round(distancia)} km de este taller
                    </p>
                    <p style="color:#888; font-size:0.8rem; margin:0;">
                        Puedes agendar, pero considera que está algo lejos.
                    </p>
                </div>
            </div>
        `;
    }

    // Muy lejos
    return `
        <div style="background:rgba(255,68,68,0.08); border:1px solid rgba(255,68,68,0.25); border-radius:12px; padding:15px; margin:15px 0;">
            <div style="display:flex; align-items:start; gap:10px;">
                <span style="font-size:1.5rem;">🚨</span>
                <div style="flex:1;">
                    <p style="color:#ff4444; font-weight:700; margin:0 0 5px; font-size:0.95rem;">
                        Estás muy lejos de este taller
                    </p>
                    <p style="color:#ccc; font-size:0.85rem; margin:0 0 10px;">
                        Este taller está a <strong>${Math.round(distancia)} km</strong> de tu ubicación actual. 
                        Si estás de viaje o en otra ciudad, te recomendamos buscar un taller cercano.
                    </p>
                    <button onclick="window.navegar({ target: { href: '#explorar-talleres' } })" 
                            style="padding:10px 18px; background:#ff4444; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">
                        🔍 Buscar talleres cerca de mí
                    </button>
                </div>
            </div>
        </div>
    `;
}





// ⭐ Función helper para calcular distancia
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// ============================================================================
// 3. CARGAR PRÓXIMAS CITAS
// ============================================================================
async function cargarCitas() {
    const container = document.getElementById('mi-taller-citas');
    if (!container) return;

    try {
        const clienteId = window.obtenerIdUsuario?.() || window.user?._id;
        if (!clienteId) {
            container.innerHTML = '<p class="empty-message">No hay citas disponibles</p>';
            return;
        }

        const response = await apiFetch(`/talleres/citas/cliente/${clienteId}`);
        const data = await response.json();

        if (!data.exito || !data.citas || data.citas.length === 0) {
            container.innerHTML = `
                <div class="mi-plan-cta">
                    <h4>📅 No tienes citas agendadas</h4>
                    <p>Agenda tu primera cita en este taller</p>
                    <button onclick="window.abrirModalSolicitud?.()">Agendar ahora</button>
                </div>
            `;
            return;
        }

        // Filtrar próximas citas (pendientes/confirmadas)
        const proximas = data.citas
            .filter(c => ['PENDIENTE', 'CONFIRMADA', 'RECIBIDO', 'EN_PROCESO'].includes(c.estado))
            .slice(0, 3);

        if (proximas.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay citas próximas</p>';
            return;
        }

        container.innerHTML = proximas.map(cita => renderizarCitaMini(cita)).join('');

    } catch (error) {
        console.error('Error cargando citas:', error);
        container.innerHTML = '<p class="empty-message">Error al cargar citas</p>';
    }
}

function renderizarCitaMini(cita) {
    const colores = {
        'PENDIENTE': '#ffbb33',
        'CONFIRMADA': '#00d4ff',
        'RECIBIDO': '#00ff88',
        'EN_PROCESO': '#00ff88',
    };
    const color = colores[cita.estado] || '#888';
    const fecha = cita.fecha ? new Date(cita.fecha).toLocaleDateString('es-DO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : 'Sin fecha';

    return `
        <div class="cita-mini-card" onclick="window.location.hash = '#citas-agendadas'">
            <div class="cita-mini-info">
                <div class="cita-mini-titulo">
                    🔧 ${cita.servicio?.nombre || cita.servicio || 'Servicio'}
                </div>
                <div class="cita-mini-detalle">
                    <span>📅 ${fecha}</span>
                    ${cita.vehiculo ? `<span>🚗 ${cita.vehiculo.marca || ''} ${cita.vehiculo.modelo || ''}</span>` : ''}
                </div>
            </div>
            <span class="cita-mini-estado" style="background:${color}20; color:${color};">
                ${cita.estado}
            </span>
        </div>
    `;
}

// ============================================================================
// 4. CARGAR SERVICIOS
// ============================================================================
async function cargarServicios() {
    const container = document.getElementById('mi-taller-servicios');
    if (!container) return;

    try {
        const tallerId = window.tallerManager.getTallerId();
        const response = await apiFetch(`/talleres/${tallerId}/servicios`);
        const data = await response.json();

        if (!data.servicios || data.servicios.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay servicios disponibles</p>';
            return;
        }

        const servicios = data.servicios.filter(s => s.activo !== false).slice(0, 6);
        container.innerHTML = servicios.map(s => renderizarServicioMini(s)).join('');

    } catch (error) {
        console.error('Error cargando servicios:', error);
        container.innerHTML = '<p class="empty-message">Error al cargar servicios</p>';
    }
}

function renderizarServicioMini(servicio) {
    const iconos = {
        'LAVADO': '🧽',
        'DETALLADO': '✨',
        'PULIDO': '💎',
        'TRATAMIENTO': '🧴',
        'EXTRA': '➕',
    };
    const icono = iconos[servicio.tipo] || '🔧';

    return `
        <div class="servicio-mini-card">
            <span class="servicio-mini-icono">${icono}</span>
            <div class="servicio-mini-nombre">${servicio.nombre}</div>
            <div class="servicio-mini-precio">RD$ ${servicio.precio?.toLocaleString() || 0}</div>
            <div class="servicio-mini-duracion">⏱️ ${servicio.duracionEstimada || 45} min</div>
            <button class="servicio-mini-btn" onclick="window.abrirModalSolicitud?.()">
                Agendar
            </button>
        </div>
    `;
}

// ============================================================================
// 5. CARGAR GALERÍA
// ============================================================================
async function cargarGaleria() {
    const container = document.getElementById('mi-taller-galeria');
    if (!container) return;

    try {
        const tallerId = window.tallerManager.getTallerId();
        const response = await apiFetch(`/talleres/${tallerId}/galeria`);
        const data = await response.json();

        if (!data.fotos || data.fotos.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay fotos disponibles</p>';
            return;
        }

        const fotos = data.fotos.slice(0, 8);
        container.innerHTML = fotos.map(foto => `
            <div class="foto-mini" onclick="window.verFotoGrande?.('${foto.url}')">
                <img src="${foto.url}" alt="Trabajo" loading="lazy">
            </div>
        `).join('');

    } catch (error) {
        console.error('Error cargando galería:', error);
        container.innerHTML = '<p class="empty-message">Error al cargar galería</p>';
    }
}

// ============================================================================
// 6. CARGAR RESEÑAS
// ============================================================================
async function cargarResenas() {
    const container = document.getElementById('mi-taller-resenas');
    if (!container) return;

    try {
        const tallerId = window.tallerManager.getTallerId();
        if (!tallerId) {
            container.innerHTML = '<p class="empty-message">No hay taller vinculado</p>';
            return;
        }

        // ✅ Delegar al sistema completo de reseñas
        if (window.resenasSocial && typeof window.resenasSocial.cargar === 'function') {
            await window.resenasSocial.cargar(tallerId, 'mi-taller-resenas');
        } else {
            console.warn('⚠️ resenasSocial no está disponible');
            container.innerHTML = '<p class="empty-message">Cargando sistema de reseñas...</p>';

            // Reintentar en 1 segundo (por si aún no cargó)
            setTimeout(() => {
                if (window.resenasSocial) {
                    window.resenasSocial.cargar(tallerId, 'mi-taller-resenas');
                }
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Error cargando reseñas:', error);
        container.innerHTML = '<p class="empty-message">Error al cargar reseñas</p>';
    }
}


// ============================================================================
// 7. CARGAR PLAN ACTUAL
// ============================================================================
async function cargarPlan() {
    const container = document.getElementById('mi-taller-plan');
    if (!container) return;

    try {
        const clienteId = window.obtenerIdUsuario?.() || window.user?._id;
        const tallerId = window.tallerManager.getTallerId();

        if (!clienteId) {
            mostrarCTAparaContratarPlan(container);
            return;
        }

        // Intentar obtener plan actual (endpoint nuevo)
        const response = await apiFetch(`/talleres/${tallerId}/clientes/${clienteId}/plan-actual`);

        if (response.status === 404) {
            // No tiene plan (endpoint no existe aún)
            mostrarCTAparaContratarPlan(container);
            return;
        }

        const data = await response.json();

        if (!data.exito || !data.plan) {
            mostrarCTAparaContratarPlan(container);
            return;
        }

        renderizarPlanActual(container, data.plan);

    } catch (error) {
        console.warn('No se pudo cargar plan (posiblemente no existe endpoint):', error);
        mostrarCTAparaContratarPlan(container);
    }
}

function mostrarCTAparaContratarPlan(container) {
    container.innerHTML = `
        <div class="mi-plan-cta">
            <h4>💳 Contrata un plan</h4>
            <p>Ahorra con nuestros planes mensuales y accede a servicios exclusivos</p>
            <button onclick="window.irAPlanesTaller()">Ver planes disponibles →</button>
        </div>
    `;
}

function renderizarPlanActual(container, plan) {
    const serviciosUsados = plan.serviciosUsados || 0;
    const serviciosTotal = plan.serviciosIncluidos || 0;
    const porcentaje = serviciosTotal > 0 ? (serviciosUsados / serviciosTotal) * 100 : 0;
    const vencimiento = plan.fechaVencimiento
        ? new Date(plan.fechaVencimiento).toLocaleDateString('es-DO')
        : 'Sin fecha';

    // Días restantes
    const diasRestantes = plan.diasRestantes ?? (() => {
        if (!plan.fechaVencimiento) return 0;
        const diff = new Date(plan.fechaVencimiento) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    })();

    // Estado visual
    const estadoBadge = {
        'ACTIVA': '🟢 ACTIVA',
        'VENCIDA': '🔴 VENCIDA',
        'CANCELADA': '⚫ CANCELADA',
        'SUSPENDIDA': '🟡 SUSPENDIDA',
    }[plan.estado] || '⚪ ' + (plan.estado || 'N/A');

    container.innerHTML = `
        <div class="mi-plan-header">
            <h4 class="mi-plan-nombre">🥇 ${plan.nombre}</h4>
            <span class="mi-plan-badge">${estadoBadge}</span>
        </div>
        <div class="mi-plan-precio">RD$ ${plan.precio?.toLocaleString()}</div>
        <div class="mi-plan-duracion">📅 ${plan.duracionDias || 30} días · Vence: ${vencimiento}</div>
        <div class="mi-plan-duracion">⏳ ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}</div>
        
        <div class="mi-plan-progreso">
            <div class="mi-plan-progreso-label">
                <span>📊 Progreso</span>
                <span>${serviciosUsados}/${serviciosTotal} servicios usados</span>
            </div>
            <div class="mi-plan-barra">
                <div class="mi-plan-barra-fill" style="width:${porcentaje}%"></div>
            </div>
        </div>
        
        <div class="mi-plan-actions">
    <button class="btn-hero-secundario" onclick="window.verDetallesPlan('${plan._id}')">
        👁️ Ver detalles
    </button>
    <button class="btn-hero-primario" onclick="window.renovarPlan('${plan._id}')">
        🔄 Renovar
    </button>
    <button onclick="window.cancelarPlan('${plan._id}')"
        style="padding:10px 16px; background:transparent; border:2px solid rgba(255,68,68,0.3); color:#ff4444; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.85rem; transition:all 0.3s;"
        onmouseover="this.style.background='rgba(255,68,68,0.1)'; this.style.borderColor='#ff4444';"
        onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(255,68,68,0.3)';"
        title="Cancelar plan">
        Cancelar plan
    </button>
</div>
    `;
}
// ============================================================================
// 8. INICIALIZAR MAPA
// ============================================================================
function inicializarMapa(taller) {
    const container = document.getElementById('mi-taller-mapa');
    const actions = document.getElementById('mi-taller-map-actions');
    if (!container || !actions) return;

    const tieneCoords = taller.direccion?.coordenadas?.lat && taller.direccion?.coordenadas?.lng;

    if (window.mapaTaller && tieneCoords) {
        const tallerId = window.tallerManager.getTallerId();
        const direccion = `${taller.direccion?.calle || ''}, ${taller.direccion?.ciudad || ''}`;

        setTimeout(() => {
            try {
                window.mapaTaller.inicializar(
                    tallerId,
                    direccion,
                    taller.nombre,
                    {
                        lat: taller.direccion.coordenadas.lat,
                        lng: taller.direccion.coordenadas.lng
                    }
                );
            } catch (e) {
                console.warn('Error inicializando mapa:', e);
            }
        }, 300);
    } else {
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">
                📍 Ubicación no disponible
            </div>
        `;
    }

    // Botones de acción
    actions.innerHTML = `
        ${tieneCoords ? `
        <a href="https://www.google.com/maps/dir/?api=1&destination=${taller.direccion.coordenadas.lat},${taller.direccion.coordenadas.lng}" 
           target="_blank" class="btn-map btn-map-google">
            🗺️ Google Maps
        </a>
        <a href="https://waze.com/ul?ll=${taller.direccion.coordenadas.lat},${taller.direccion.coordenadas.lng}&navigate=yes" 
           target="_blank" class="btn-map btn-map-waze">
            🚗 Waze
        </a>
        ` : ''}
        <button class="btn-map btn-map-ubicacion" onclick="window.usarMiUbicacion?.()">
            📍 Mi ubicación
        </button>
    `;
}

// ============================================================================
// 9. FUNCIONES DE NAVEGACIÓN (SIN preventDefault)
// ============================================================================
export function irAAgendarCita() {
    if (window.abrirModalSolicitud) {
        window.abrirModalSolicitud();
    }
}

export function irAPlanesTaller() {
    console.log('💳 Navegando a planes...');

    // 1. Cambiar el hash de la URL
    window.location.hash = '#planes';

    // 2. Forzar la navegación si el hash ya era #planes
    if (window.navegar) {
        try {
            window.navegar({
                target: { href: '#planes' }
            });
        } catch (e) {
            console.warn('navegar falló, usando fallback:', e);
            window.mostrarSeccion?.('planes');
        }
    } else if (window.mostrarSeccion) {
        window.mostrarSeccion('planes');
    }

    // 3. Recargar los planes después de navegar
    setTimeout(() => {
        if (window.renderizarPlanes) {
            window.renderizarPlanes();
        }
    }, 300);
}

export function irAResenasTaller() {
    window.location.hash = '#explorar-talleres';

    // Después de un delay, abrir el modal
    setTimeout(() => {
        const tallerId = window.tallerManager?.getTallerId();
        if (tallerId && window.seleccionarTallerExplorar) {
            window.seleccionarTallerExplorar(tallerId);
        }
    }, 800);
}

export function irAGaleriaTaller() {
    window.location.hash = '#galeria';
}

export function confirmarDesvincular() {
    console.log('🚪 Iniciando desvinculación de taller...');

    const taller = window.tallerManager?.getTaller();
    const tallerNombre = taller?.nombre || 'este taller';

    // Eliminar modal previo
    document.getElementById('modal-desvincular-taller')?.remove();

    const modalHTML = `
        <div id="modal-desvincular-taller" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            
            <div style="background:#0f1621; border:2px solid #ff4444; border-radius:20px; max-width:450px; width:100%; padding:0; overflow:hidden;"
                 onclick="event.stopPropagation()">
                
                <!-- Header -->
                <div style="padding:25px; background:linear-gradient(135deg, #ff444415, #ff444405); border-bottom:1px solid #1e2a3a; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:10px;">🏪</div>
                    <h2 style="color:#fff; margin:0 0 5px; font-size:1.4rem;">¿Desvincular taller?</h2>
                    <p style="color:#888; margin:0; font-size:0.85rem;">${tallerNombre}</p>
                </div>

                <!-- Advertencia -->
                <div style="padding:25px;">
                    <div style="background:rgba(255,187,51,0.05); border:1px solid rgba(255,187,51,0.2); border-radius:12px; padding:15px; margin-bottom:20px;">
                        <p style="color:#ffbb33; margin:0; font-size:0.85rem; line-height:1.6;">
                            ℹ️ <strong>Podrás volver a vincular este taller</strong> o elegir otro cuando quieras.
                        </p>
                    </div>

                    <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                        <p style="color:#aaa; margin:0 0 8px; font-weight:600; font-size:0.85rem;">Consecuencias:</p>
                        <ul style="color:#ccc; margin:0; padding-left:20px; font-size:0.8rem; line-height:1.8;">
                            <li>Perderás acceso a los planes del taller</li>
                            <li>No podrás agendar citas con este taller</li>
                            <li>Tu historial se conservará</li>
                        </ul>
                    </div>

                    <!-- Botones -->
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('modal-desvincular-taller').remove()"
                            style="flex:1; padding:14px; background:transparent; border:1px solid #333; color:#fff; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.9rem;">
                            Cancelar
                        </button>
                        <button id="btn-confirmar-desvincular"
                            onclick="window.ejecutarDesvincularTaller()"
                            style="flex:2; padding:14px; background:#ff4444; border:none; color:#fff; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.9rem;">
                            🚪 Sí, desvincular
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================================
// EJECUTAR DESVINCULACIÓN (llamado desde el modal)
// ============================================================================
window.ejecutarDesvincularTaller = function () {
    console.log('🚪 [ejecutarDesvincularTaller] Ejecutando desvinculación...');

    const btn = document.getElementById('btn-confirmar-desvincular');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Desvinculando...';
    }

    try {
        // 1. Verificar estado ANTES
        console.log('   Antes:', {
            tieneTaller: window.tallerManager?.tieneTallerVinculado(),
            nombre: window.tallerManager?.getTaller()?.nombre
        });

        // ⭐ 2. LLAMAR CON silencioso = true (evita el confirm interno)
        if (window.tallerManager) {
            window.tallerManager.desvincular(true);  // ← ⭐ CAMBIO CLAVE
            console.log('   ✅ tallerManager.desvincular(true) ejecutado');
        }

        // 3. Verificar estado DESPUÉS
        console.log('   Después:', {
            tieneTaller: window.tallerManager?.tieneTallerVinculado(),
            nombre: window.tallerManager?.getTaller()?.nombre
        });

        // 4. Cerrar modal
        document.getElementById('modal-desvincular-taller')?.remove();

        // 5. Toast
        window.mostrarToast?.('✅ Taller desvinculado correctamente', 'success');

        // 6. Recargar "Mi Taller"
        setTimeout(() => {
            if (window.cargarMiTaller) {
                window.cargarMiTaller();
            }
        }, 500);

    } catch (error) {
        console.error('❌ Error desvinculando:', error);
        window.mostrarToast?.('❌ Error al desvincular: ' + error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🚪 Sí, desvincular';
        }
    }
};

export function usarMiUbicacion() {
    if (window.mapaTaller?.obtenerUbicacionCliente) {
        window.mapaTaller.obtenerUbicacionCliente();
    }
}

// ============================================================================
// 10. INICIALIZAR
// ============================================================================
export function inicializarMiTaller() {
    // Escuchar cuando se navega a #mi-taller
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#mi-taller') {
            cargarMiTaller();
        }
    });

    // Cargar si ya estamos en #mi-taller al cargar
    if (window.location.hash === '#mi-taller') {
        setTimeout(() => cargarMiTaller(), 1000);
    }
}

// ============================================================================
// 11. VER DETALLES DEL PLAN (modal)
// ============================================================================
export async function verDetallesPlan(suscripcionId) {
    try {
        const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
        const token = sesion.token || '';
        const API_BASE = window.API_URL || 'http://localhost:3000/api';

        console.log('📋 Obteniendo detalles del plan:', suscripcionId);

        const response = await fetch(
            `${API_BASE}/talleres/suscripciones/${suscripcionId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            window.mostrarToast?.('❌ No se pudo cargar el plan', 'error');
            return;
        }

        const data = await response.json();

        if (!data.exito || !data.suscripcion) {
            window.mostrarToast?.('❌ Plan no encontrado', 'error');
            return;
        }

        mostrarModalDetallesPlan(data.suscripcion);

    } catch (error) {
        console.error('❌ Error:', error);
        window.mostrarToast?.('❌ Error al cargar detalles', 'error');
    }
}

function mostrarModalDetallesPlan(suscripcion) {
    // Eliminar modal existente
    document.getElementById('modal-plan-detalles')?.remove();

    const plan = suscripcion.planData || {};
    const servicios = plan.servicios || [];
    const historial = suscripcion.historialUso || [];
    const diasRestantes = (() => {
        if (!suscripcion.fechaVencimiento) return 0;
        const diff = new Date(suscripcion.fechaVencimiento) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    })();
    const progreso = plan.serviciosIncluidos > 0
        ? Math.round((suscripcion.serviciosUsados / plan.serviciosIncluidos) * 100)
        : 0;

    const estadoBadge = {
        'ACTIVA': '<span style="background:#00ff8820; color:#00ff88; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:600;">🟢 ACTIVA</span>',
        'VENCIDA': '<span style="background:#ff444420; color:#ff4444; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:600;">🔴 VENCIDA</span>',
        'CANCELADA': '<span style="background:#88888820; color:#888; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:600;">⚫ CANCELADA</span>',
    }[suscripcion.estado] || '';

    const modalHTML = `
        <div id="modal-plan-detalles" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            
            <div style="background:#0f1621; border:1px solid #1e2a3a; border-radius:20px; max-width:600px; width:100%; max-height:85vh; overflow-y:auto; padding:30px; position:relative;"
                 onclick="event.stopPropagation()">
                
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <h2 style="color:#fff; margin:0; font-size:1.5rem;">🥇 ${plan.nombre || 'Plan'}</h2>
                            ${estadoBadge}
                        </div>
                        <p style="color:#888; margin:0; font-size:0.85rem;">
                            Contratado el ${new Date(suscripcion.fechaInicio).toLocaleDateString('es-DO')}
                        </p>
                    </div>
                    <button onclick="document.getElementById('modal-plan-detalles').remove()"
                        style="background:transparent; border:none; color:#888; font-size:1.5rem; cursor:pointer; padding:5px; width:35px; height:35px; border-radius:50%; transition:all 0.3s;"
                        onmouseover="this.style.background='#ff444422'; this.style.color='#ff4444';"
                        onmouseout="this.style.background='transparent'; this.style.color='#888';">
                        ✕
                    </button>
                </div>

                <!-- Precio y duración -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                    <div style="background:#131c2b; border-radius:12px; padding:15px; text-align:center;">
                        <div style="color:#ffbb33; font-size:1.8rem; font-weight:800;">RD$ ${(plan.precio || 0).toLocaleString()}</div>
                        <small style="color:#888; font-size:0.7rem;">PRECIO</small>
                    </div>
                    <div style="background:#131c2b; border-radius:12px; padding:15px; text-align:center;">
                        <div style="color:${diasRestantes > 0 ? '#00ff88' : '#ff4444'}; font-size:1.8rem; font-weight:800;">${diasRestantes}</div>
                        <small style="color:#888; font-size:0.7rem;">DÍAS RESTANTES</small>
                    </div>
                </div>

                <!-- Fechas -->
                <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:#888;">📅 Fecha inicio:</span>
                        <span style="color:#fff;">${new Date(suscripcion.fechaInicio).toLocaleDateString('es-DO')}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#888;">📅 Fecha vencimiento:</span>
                        <span style="color:${diasRestantes > 0 ? '#00ff88' : '#ff4444'};">${new Date(suscripcion.fechaVencimiento).toLocaleDateString('es-DO')}</span>
                    </div>
                </div>

                <!-- Progreso -->
                <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:#888;">📊 Progreso de servicios</span>
                        <span style="color:#fff; font-weight:600;">${suscripcion.serviciosUsados}/${plan.serviciosIncluidos}</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); height:12px; border-radius:10px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #ffbb33, #00ff88); height:100%; width:${progreso}%; border-radius:10px; transition:width 0.5s;"></div>
                    </div>
                    <p style="color:#888; font-size:0.75rem; margin:8px 0 0;">${progreso}% completado · ${suscripcion.serviciosRestantes} servicios disponibles</p>
                </div>

                <!-- Servicios incluidos -->
                ${servicios.length > 0 ? `
                <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                    <h3 style="color:#00ff88; font-size:0.9rem; margin:0 0 12px;">✅ Servicios incluidos (${servicios.length})</h3>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${servicios.map(s => `
                            <div style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:8px;">
                                <span style="color:#ccc; font-size:0.85rem;">🔧 ${s.nombre || 'Servicio'}</span>
                                <span style="color:#888; font-size:0.8rem;">RD$ ${(s.precio || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Historial de uso -->
                ${historial.length > 0 ? `
                <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                    <h3 style="color:#00d4ff; font-size:0.9rem; margin:0 0 12px;">📋 Historial de uso (${historial.length})</h3>
                    <div style="display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto;">
                        ${historial.slice().reverse().map(h => `
                            <div style="padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:8px; border-left:3px solid #00d4ff;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                    <span style="color:#fff; font-size:0.85rem;">🔧 ${h.servicio || 'Servicio'}</span>
                                    <span style="color:#888; font-size:0.75rem;">${new Date(h.fecha).toLocaleDateString('es-DO')}</span>
                                </div>
                                ${h.notas ? `<p style="color:#888; font-size:0.75rem; margin:0;">${h.notas}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px; text-align:center;">
                    <p style="color:#888; font-size:0.85rem; margin:0;">📭 Aún no has usado servicios de este plan</p>
                </div>
                `}

                <!-- Botones -->
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button onclick="document.getElementById('modal-plan-detalles').remove()"
                        style="flex:1; padding:14px; background:transparent; border:1px solid #333; color:#fff; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.9rem;">
                        Cerrar
                    </button>
                    ${suscripcion.estado === 'ACTIVA' && diasRestantes <= 7 ? `
                    <button onclick="document.getElementById('modal-plan-detalles').remove(); window.renovarPlan('${suscripcion._id}')"
                        style="flex:1; padding:14px; background:#ffbb33; border:none; color:#000; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.9rem;">
                        🔄 Renovar ahora
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================================
// 12. RENOVAR PLAN
// ============================================================================
export async function renovarPlan(suscripcionId) {
    if (!confirm('¿Renovar este plan?\n\nSe extenderá por otro período completo y se resetearán los servicios disponibles.')) {
        return;
    }

    try {
        const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
        const token = sesion.token || '';
        const API_BASE = window.API_URL || 'http://localhost:3000/api';

        window.mostrarToast?.('⏳ Renovando plan...', 'info');

        console.log('🔄 Renovando suscripción:', suscripcionId);

        const response = await fetch(
            `${API_BASE}/talleres/suscripciones/${suscripcionId}/renovar`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ metodoPago: 'SALDO_CLIENTE' })
            }
        );

        const data = await response.json();

        if (!data.exito) {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error al renovar'), 'error');
            return;
        }

        console.log('✅ Plan renovado:', data.suscripcion);

        window.mostrarToast?.(
            `✅ Plan renovado hasta ${new Date(data.suscripcion.fechaVencimiento).toLocaleDateString('es-DO')}`,
            'success'
        );

        // Recargar "Mi Taller"
        setTimeout(() => {
            if (window.cargarMiTaller) {
                window.cargarMiTaller();
            }
        }, 800);

    } catch (error) {
        console.error('❌ Error renovando:', error);
        window.mostrarToast?.('❌ Error al renovar plan', 'error');
    }
}
// ============================================================================
// 13. CANCELAR PLAN (con modal HTML, sin confirm/prompt nativos)
// ============================================================================
export async function cancelarPlan(suscripcionId) {
    console.log('🚫 [cancelarPlan] Iniciando cancelación:', suscripcionId);

    if (!suscripcionId || suscripcionId === 'undefined') {
        window.mostrarToast?.('❌ ID de suscripción inválido', 'error');
        return;
    }

    // ⭐ Eliminar modal previo si existe
    document.getElementById('modal-cancelar-plan')?.remove();

    // ⭐ Crear modal de confirmación
    const modalHTML = `
        <div id="modal-cancelar-plan" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            
            <div style="background:#0f1621; border:2px solid #ff4444; border-radius:20px; max-width:450px; width:100%; padding:0; overflow:hidden;"
                 onclick="event.stopPropagation()">
                
                <!-- Header -->
                <div style="padding:25px; background:linear-gradient(135deg, #ff444415, #ff444405); border-bottom:1px solid #1e2a3a; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:10px;">⚠️</div>
                    <h2 style="color:#fff; margin:0 0 5px; font-size:1.4rem;">¿Cancelar tu plan?</h2>
                    <p style="color:#888; margin:0; font-size:0.85rem;">Esta acción no se puede deshacer</p>
                </div>

                <!-- Advertencias -->
                <div style="padding:25px;">
                    <div style="background:rgba(255,68,68,0.05); border:1px solid rgba(255,68,68,0.2); border-radius:12px; padding:15px; margin-bottom:20px;">
                        <p style="color:#ff4444; margin:0 0 10px; font-weight:600; font-size:0.9rem;">⚠️ Al cancelar:</p>
                        <ul style="color:#ccc; margin:0; padding-left:20px; font-size:0.85rem; line-height:1.8;">
                            <li>Perderás los servicios restantes</li>
                            <li>No habrá reembolso del dinero pagado</li>
                            <li>Podrás contratar otro plan cuando quieras</li>
                        </ul>
                    </div>

                    <!-- Motivo (opcional) -->
                    <div style="margin-bottom:20px;">
                        <label style="color:#aaa; font-size:0.8rem; display:block; margin-bottom:8px;">
                            📝 Motivo (opcional)
                        </label>
                        <textarea id="motivo-cancelacion" 
                                  rows="3"
                                  placeholder="¿Por qué cancelas? (nos ayuda a mejorar)"
                                  style="width:100%; padding:12px; background:#080c14; border:1px solid #1e2a3a; border-radius:10px; color:#fff; font-family:Inter,sans-serif; font-size:0.85rem; resize:vertical;"></textarea>
                    </div>

                    <!-- Botones -->
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('modal-cancelar-plan').remove()"
                            style="flex:1; padding:14px; background:transparent; border:1px solid #333; color:#fff; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.9rem;">
                            ❌ No cancelar
                        </button>
                        <button id="btn-confirmar-cancelar-plan"
                            onclick="window.ejecutarCancelarPlan('${suscripcionId}')"
                            style="flex:2; padding:14px; background:#ff4444; border:none; color:#fff; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.9rem;">
                            ⚠️ Sí, cancelar plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================================
// 14. EJECUTAR CANCELACIÓN (llamado desde el modal)
// ============================================================================
window.ejecutarCancelarPlan = async function (suscripcionId) {
    const btn = document.getElementById('btn-confirmar-cancelar-plan');
    const motivoInput = document.getElementById('motivo-cancelacion');
    const motivo = motivoInput?.value?.trim() || 'Sin motivo especificado';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Cancelando...';
    }

    try {
        const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
        const token = sesion.token || '';
        const API_BASE = window.API_URL || 'http://localhost:3000/api';

        console.log('📤 Cancelando suscripción:', suscripcionId);
        console.log('   Motivo:', motivo);

        const response = await fetch(
            `${API_BASE}/talleres/suscripciones/${suscripcionId}/cancelar`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    motivo: motivo,
                    canceladaPor: 'CLIENTE'
                })
            }
        );

        console.log('📥 Status:', response.status);

        const data = await response.json();
        console.log('📦 Data:', data);

        if (!data.exito) {
            window.mostrarToast?.(`❌ ${data.mensaje || 'Error al cancelar'}`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '⚠️ Sí, cancelar plan';
            }
            return;
        }

        console.log('✅ Plan cancelado correctamente');

        // Cerrar modal
        document.getElementById('modal-cancelar-plan')?.remove();

        // Toast de éxito
        window.mostrarToast?.('✅ Plan cancelado correctamente', 'success', 5000);

        // Recargar "Mi Taller"
        setTimeout(() => {
            if (window.cargarMiTaller) {
                window.cargarMiTaller();
            }
        }, 800);

    } catch (error) {
        console.error('❌ Error cancelando:', error);
        window.mostrarToast?.(`❌ Error: ${error.message}`, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '⚠️ Sí, cancelar plan';
        }
    }
};

// ============================================================================
// 15. CARGAR EQUIPO DE TRABAJO ⭐ NUEVO
// ============================================================================

const ESTADO_EMPLEADO_MAP = {
    DISPONIBLE: { texto: 'Disponible', clase: 'disponible' },
    OCUPADO: { texto: 'Ocupado', clase: 'ocupado' },
    DESCANSANDO: { texto: 'Descansando', clase: 'descansando' },
    INACTIVO: { texto: 'Inactivo', clase: 'descansando' }
};

const AVATAR_DEFAULT = 'https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&size=256&name=';

function crearCardEmpleado(emp) {
    const rating = emp.calificacionPromedio || 0;
    const totalResenas = emp.totalResenas || 0;
    const trabajos = emp.trabajosCompletados || 0;
    const estrellasLlenas = Math.round(rating);
    const estrellas = '★'.repeat(estrellasLlenas) + '☆'.repeat(5 - estrellasLlenas);
    const estado = ESTADO_EMPLEADO_MAP[emp.estado] || ESTADO_EMPLEADO_MAP.DISPONIBLE;
    const foto = emp.foto || `${AVATAR_DEFAULT}${encodeURIComponent(emp.nombre)}`;
    const especialidades = (emp.especialidades || []).slice(0, 2).join(' · ') || 'Sin especialidad';

    return `
        <article class="mi-empleado-card" onclick="window.abrirPerfilEmpleado('${emp._id}')">
            <div class="mi-empleado-foto-wrap">
                <img
                    src="${foto}"
                    alt="${emp.nombre}"
                    class="mi-empleado-foto"
                    loading="lazy"
                    onerror="this.src='${AVATAR_DEFAULT}${encodeURIComponent(emp.nombre)}'"
                >
                <span class="mi-empleado-badge mi-empleado-badge--${estado.clase}">
                    ${estado.texto}
                </span>
            </div>

            <div class="mi-empleado-info">
                <h4 class="mi-empleado-nombre" title="${emp.nombre}">${emp.nombre}</h4>
                <p class="mi-empleado-rol">${emp.rol || 'Especialista'}</p>
                <p class="mi-empleado-especialidades">🔧 ${especialidades}</p>

                <div class="mi-empleado-rating">
                    <span class="mi-empleado-estrellas">${estrellas}</span>
                    <span class="mi-empleado-promedio">${rating.toFixed(1)}</span>
                    <span class="mi-empleado-total">(${totalResenas})</span>
                </div>

                <div class="mi-empleado-stats">
                    <div class="mi-empleado-stat">
                        <span class="mi-empleado-stat-valor">${trabajos}</span>
                        <span class="mi-empleado-stat-label">Trabajos</span>
                    </div>
                </div>
            </div>
        </article>
    `;
}

async function cargarEquipo() {
    const contenedor = document.getElementById('mi-taller-equipo');
    const contador = document.getElementById('mi-taller-equipo-count');
    const contenedorFiltros = document.getElementById('mi-taller-equipo-filtros');
    if (!contenedor) return;

    try {
        const tallerId = window.tallerManager?.getTallerId();
        if (!tallerId) {
            contenedor.innerHTML = '<p class="empty-message">No hay taller vinculado</p>';
            return;
        }

        const res = await apiJSON(`/talleres/${tallerId}/empleados-publico`, {
            noRedirigir: true
        });

        if (!res.exito || !res.empleados?.length) {
            contenedor.innerHTML = `
                <p class="empty-message">Este taller aún no ha publicado a su equipo.</p>
            `;
            if (contador) contador.textContent = '';
            if (contenedorFiltros) contenedorFiltros.style.display = 'none';
            return;
        }

        // ⭐ GUARDAR EN ESTADO GLOBAL (para filtros)
        estadoMiTaller.equipo = res.empleados;

        // Renderizar todos
        contenedor.innerHTML = res.empleados.map(crearCardEmpleado).join('');

        // Contador
        if (contador) {
            const n = res.empleados.length;
            contador.textContent = `${n} ${n === 1 ? 'profesional' : 'profesionales'}`;
        }

        // ⭐ NUEVO: Construir filtros
        construirFiltrosEquipo(res.empleados);

        console.log(`✅ Equipo cargado: ${res.empleados.length} empleados`);

    } catch (error) {
        console.error('❌ Error cargando equipo:', error);
        contenedor.innerHTML = '<p class="empty-message">Error al cargar el equipo</p>';
    }
}
// ⭐ NUEVO: Construir chips de filtros
function construirFiltrosEquipo(empleados) {
    const contenedorFiltros = document.getElementById('mi-taller-equipo-filtros');
    const contenedor = document.getElementById('mi-taller-equipo');
    if (!contenedorFiltros || !contenedor) return;

    // Extraer especialidades únicas (primera de cada empleado + roles)
    const especialidadesMap = new Map();
    const rolesMap = new Map();

    empleados.forEach(emp => {
        // Roles
        const rol = emp.rol || 'OTRO';
        rolesMap.set(rol, (rolesMap.get(rol) || 0) + 1);

        // Especialidades
        (emp.especialidades || []).forEach(esp => {
            const clean = esp.trim().toLowerCase();
            if (clean) {
                especialidadesMap.set(clean, (especialidadesMap.get(clean) || 0) + 1);
            }
        });
    });

    // Si solo hay 1 rol y 0 especialidades, no mostrar filtros
    if (rolesMap.size <= 1 && especialidadesMap.size === 0) {
        contenedorFiltros.style.display = 'none';
        return;
    }

    // Construir HTML
    const total = empleados.length;
    let html = `
        <button class="mi-filtro-chip activo" data-filtro="todos" onclick="window.filtrarEquipo('todos', this)">
            👥 Todos <span class="mi-filtro-count">(${total})</span>
        </button>
    `;

    // Chips de roles (más relevantes)
    const rolesOrdenados = [...rolesMap.entries()].sort((a, b) => b[1] - a[1]);
    rolesOrdenados.forEach(([rol, count]) => {
        const icono = {
            'LAVADOR': '🧽',
            'DETALLADOR': '✨',
            'SUPERVISOR': '👔',
            'ADMIN': '⚙️'
        }[rol] || '👤';
        html += `
            <button class="mi-filtro-chip" data-filtro="rol:${rol}" onclick="window.filtrarEquipo('rol:${rol}', this)">
                ${icono} ${rol.charAt(0) + rol.slice(1).toLowerCase()} <span class="mi-filtro-count">(${count})</span>
            </button>
        `;
    });

    // Chips de especialidades (si hay)
    if (especialidadesMap.size > 0 && especialidadesMap.size <= 8) {
        const especialidadesOrdenadas = [...especialidadesMap.entries()].sort((a, b) => b[1] - a[1]);
        especialidadesOrdenadas.forEach(([esp, count]) => {
            html += `
                <button class="mi-filtro-chip" data-filtro="esp:${esp}" onclick="window.filtrarEquipo('esp:${esp}', this)">
                    🔧 ${esp.charAt(0).toUpperCase() + esp.slice(1)} <span class="mi-filtro-count">(${count})</span>
                </button>
            `;
        });
    }

    contenedorFiltros.innerHTML = html;
    contenedorFiltros.style.display = 'flex';
}

// ⭐ NUEVO: Filtrar empleados por chip
window.filtrarEquipo = function (filtro, botonClickeado) {
    const contenedor = document.getElementById('mi-taller-equipo');
    const empleados = estadoMiTaller.equipo || [];
    if (!contenedor) return;

    // Actualizar chip activo
    document.querySelectorAll('.mi-filtro-chip').forEach(btn => btn.classList.remove('activo'));
    if (botonClickeado) botonClickeado.classList.add('activo');

    // Filtrar
    let filtrados = empleados;
    if (filtro !== 'todos') {
        const [tipo, valor] = filtro.split(':');

        if (tipo === 'rol') {
            filtrados = empleados.filter(e => e.rol === valor);
        } else if (tipo === 'esp') {
            filtrados = empleados.filter(e =>
                (e.especialidades || []).some(esp =>
                    esp.trim().toLowerCase() === valor.toLowerCase()
                )
            );
        }
    }

    // Renderizar
    if (filtrados.length === 0) {
        contenedor.innerHTML = `<p class="empty-message">No hay profesionales con este filtro.</p>`;
    } else {
        contenedor.innerHTML = filtrados.map(crearCardEmpleado).join('');
    }
};

// ⭐ NUEVO: Abrir modal de perfil de empleado
window.abrirPerfilEmpleado = async function (empleadoId) {
    const tallerId = window.tallerManager?.getTallerId();
    if (!tallerId) {
        window.mostrarToast?.('❌ No hay taller vinculado', 'error');
        return;
    }

    // Eliminar modal previo
    document.getElementById('modal-perfil-empleado')?.remove();

    // Mostrar modal con loading
    const loadingHTML = `
        <div id="modal-perfil-empleado" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background:#0f1621; border-radius:20px; max-width:700px; width:100%; max-height:90vh; overflow-y:auto; padding:40px; text-align:center;">
                <div class="spinner"></div>
                <p style="color:#888; margin-top:20px;">Cargando perfil...</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);

    try {
        const res = await apiJSON(`/talleres/${tallerId}/empleados/${empleadoId}/perfil-publico`, {
            noRedirigir: true
        });

        if (!res.exito) {
            document.getElementById('modal-perfil-empleado')?.remove();
            window.mostrarToast?.(`❌ ${res.mensaje || 'Error'}`, 'error');
            return;
        }

        renderizarModalPerfil(res);
    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
        document.getElementById('modal-perfil-empleado')?.remove();
        window.mostrarToast?.('❌ Error al cargar el perfil', 'error');
    }
};

function renderizarModalPerfil(data) {
    const { empleado, stats, trabajos, resenas } = data;
    const foto = empleado.foto || `https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&size=256&name=${encodeURIComponent(empleado.nombre)}`;
    const estrellasLlenas = Math.round(stats.calificacionPromedio);
    const estrellas = '★'.repeat(estrellasLlenas) + '☆'.repeat(5 - estrellasLlenas);
    const especialidades = (empleado.especialidades || []).join(' · ') || 'Sin especialidad';
    const estadoBadge = {
        DISPONIBLE: { texto: '🟢 Disponible', color: '#00ff88' },
        OCUPADO: { texto: '🟡 Ocupado', color: '#ffbb33' },
        DESCANSANDO: { texto: '⚪ Descansando', color: '#888' }
    }[empleado.estado] || { texto: 'Disponible', color: '#00ff88' };

    // Formatear fecha
    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin fecha';
        return new Date(fecha).toLocaleDateString('es-DO', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    // HTML de trabajos
    const trabajosHTML = trabajos.length > 0 ? trabajos.map(t => `
        <div style="background:#080c14; border-radius:10px; padding:12px; margin-bottom:8px; display:flex; gap:12px; align-items:center;">
            ${t.foto ? `<img src="${t.foto}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">` : `<div style="width:50px; height:50px; border-radius:8px; background:#1e2a3a; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🚗</div>`}
            <div style="flex:1;">
                <div style="color:#fff; font-weight:600; font-size:0.9rem;">${t.vehiculo.marca} ${t.vehiculo.modelo}</div>
                <div style="color:#888; font-size:0.75rem;">${t.vehiculo.placa} · ${t.servicio}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:#888; font-size:0.7rem;">${formatearFecha(t.fecha)}</div>
                ${t.calificacion > 0 ? `<div style="color:#ffc107; font-size:0.9rem;">${'★'.repeat(t.calificacion)}</div>` : ''}
            </div>
        </div>
    `).join('') : '<p style="color:#666; text-align:center; padding:20px;">Sin trabajos recientes</p>';

    // HTML de reseñas
    const resenasHTML = resenas.length > 0 ? resenas.map(r => `
        <div style="background:#080c14; border-radius:10px; padding:12px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <div>
                    <span style="color:#ffc107;">${'★'.repeat(r.puntuacion)}${'☆'.repeat(5 - r.puntuacion)}</span>
                    <span style="color:#fff; font-weight:600; margin-left:8px; font-size:0.85rem;">${r.cliente.nombre}</span>
                </div>
                <span style="color:#888; font-size:0.7rem;">${formatearFecha(r.fecha)}</span>
            </div>
            ${r.comentario ? `<p style="color:#ccc; font-size:0.8rem; margin:0;">"${r.comentario}"</p>` : ''}
            ${r.vehiculo ? `<small style="color:#666; font-size:0.7rem;">🚗 ${r.vehiculo}</small>` : ''}
        </div>
    `).join('') : '<p style="color:#666; text-align:center; padding:20px;">Sin reseñas aún</p>';

    const modalHTML = `
        <div id="modal-perfil-empleado" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            
            <div style="background:#0f1621; border:1px solid #1e2a3a; border-radius:20px; max-width:700px; width:100%; max-height:90vh; overflow-y:auto;"
                 onclick="event.stopPropagation()">
                
                <!-- Header con foto grande -->
                <div style="position:relative; padding:30px; background:linear-gradient(135deg, #00ff8810, #00ff8805); border-bottom:1px solid #1e2a3a;">
                    <button onclick="document.getElementById('modal-perfil-empleado').remove()"
                        style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.5); border:none; color:#fff; width:35px; height:35px; border-radius:50%; cursor:pointer; font-size:1.2rem; z-index:1;">
                        ✕
                    </button>
                    
                    <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                        <img src="${foto}" 
                             style="width:100px; height:100px; border-radius:50%; border:3px solid #00ff88; object-fit:cover;"
                             onerror="this.src='https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&size=256&name=${encodeURIComponent(empleado.nombre)}'">
                        
                        <div style="flex:1; min-width:200px;">
                            <h2 style="color:#fff; margin:0 0 6px; font-size:1.4rem;">${empleado.nombre}</h2>
                            <p style="color:#00ff88; margin:0 0 8px; font-size:0.85rem; font-weight:600;">${empleado.rol}</p>
                            <p style="color:#888; margin:0 0 8px; font-size:0.8rem;">🔧 ${especialidades}</p>
                            <span style="background:${estadoBadge.color}20; color:${estadoBadge.color}; padding:4px 12px; border-radius:15px; font-size:0.7rem; font-weight:600;">
                                ${estadoBadge.texto}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Stats -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; padding:20px;">
                    <div style="background:#080c14; border-radius:12px; padding:15px; text-align:center;">
                        <div style="color:#ffc107; font-size:1.5rem; font-weight:800;">${stats.calificacionPromedio.toFixed(1)}</div>
                        <div style="color:#ffc107; font-size:0.9rem; margin:4px 0;">${estrellas}</div>
                        <small style="color:#888; font-size:0.7rem;">${stats.totalResenas} reseñas</small>
                    </div>
                    <div style="background:#080c14; border-radius:12px; padding:15px; text-align:center;">
                        <div style="color:#00ff88; font-size:1.5rem; font-weight:800;">${stats.trabajosCompletados}</div>
                        <small style="color:#888; font-size:0.7rem;">Trabajos</small>
                    </div>
                    <div style="background:#080c14; border-radius:12px; padding:15px; text-align:center;">
                        <div style="color:#00d4ff; font-size:1.5rem; font-weight:800;">${estrellasLlenas >= 4 ? '⭐' : estrellasLlenas >= 3 ? '👍' : '🌱'}</div>
                        <small style="color:#888; font-size:0.7rem;">${estrellasLlenas >= 4 ? 'Top' : estrellasLlenas >= 3 ? 'Bueno' : 'Nuevo'}</small>
                    </div>
                </div>
                
                <!-- Trabajos recientes -->
                <div style="padding:0 20px 20px;">
                    <h3 style="color:#00ff88; margin:0 0 12px; font-size:1rem; display:flex; align-items:center; gap:8px;">
                        🔧 Trabajos recientes
                    </h3>
                    ${trabajosHTML}
                </div>
                
                <!-- Reseñas -->
                <div style="padding:0 20px 20px;">
                    <h3 style="color:#ffc107; margin:0 0 12px; font-size:1rem; display:flex; align-items:center; gap:8px;">
                        ⭐ Reseñas de clientes
                    </h3>
                    ${resenasHTML}
                </div>
                
                <!-- CTA final -->
                <div style="padding:20px; border-top:1px solid #1e2a3a; background:#080c14; display:flex; gap:10px;">
                    <button onclick="document.getElementById('modal-perfil-empleado').remove()"
                        style="flex:1; padding:14px; background:transparent; border:1px solid #333; color:#fff; border-radius:12px; cursor:pointer; font-weight:600;">
                        Cerrar
                    </button>
                    <button onclick="window.agendarConEmpleado('${empleado._id}', '${empleado.nombre.replace(/'/g, "\\'")}')"
                        style="flex:2; padding:14px; background:#00ff88; border:none; color:#000; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.95rem;">
                        📅 Agendar con ${empleado.nombre}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Reemplazar modal de loading
    document.getElementById('modal-perfil-empleado')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ⭐ NUEVO: Agendar cita con empleado específico
window.agendarConEmpleado = function (empleadoId, empleadoNombre) {
    // Cerrar el modal de perfil
    document.getElementById('modal-perfil-empleado')?.remove();

    // Guardar preferencia en el estado global
    window.empleadoPreferido = {
        id: empleadoId,
        nombre: empleadoNombre
    };

    // Abrir modal de agendar cita (el existente)
    if (typeof window.abrirModalSolicitud === 'function') {
        window.abrirModalSolicitud();

        // Después de abrir, mostrar un aviso con el empleado preferido
        setTimeout(() => {
            mostrarAvisoEmpleadoPreferido(empleadoNombre);
        }, 300);
    } else {
        // Fallback: navegar a la sección de citas
        window.location.hash = '#citas-agendadas';
        window.mostrarToast?.(`📅 Agenda tu cita. Preferencia: ${empleadoNombre}`, 'info');
    }
};

function mostrarAvisoEmpleadoPreferido(nombre) {
    // Eliminar aviso previo
    document.getElementById('aviso-empleado-preferido')?.remove();

    // Buscar el modal de cita
    const modalCita = document.getElementById('modal-cita');
    if (!modalCita) return;

    const modalContent = modalCita.querySelector('.modal-content') || modalCita.firstElementChild;
    if (!modalContent) return;

    // Insertar aviso
    const avisoHTML = `
        <div id="aviso-empleado-preferido" 
             style="background:rgba(0,255,136,0.1); border:1px solid rgba(0,255,136,0.3); border-radius:10px; padding:12px; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.5rem;">👤</span>
            <div style="flex:1;">
                <div style="color:#00ff88; font-weight:600; font-size:0.85rem;">
                    Empleado preferido: ${nombre}
                </div>
                <div style="color:#888; font-size:0.75rem;">
                    El taller intentará asignarte a este profesional
                </div>
            </div>
            <button onclick="document.getElementById('aviso-empleado-preferido').remove(); window.empleadoPreferido = null;"
                style="background:transparent; border:none; color:#888; cursor:pointer; font-size:1.2rem;">
                ✕
            </button>
        </div>
    `;

    // Insertar al inicio del contenido
    modalContent.insertAdjacentHTML('afterbegin', avisoHTML);
}
// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.cargarMiTaller = cargarMiTaller;
window.irAAgendarCita = irAAgendarCita;
window.irAPlanesTaller = irAPlanesTaller;
window.irAResenasTaller = irAResenasTaller;
window.irAGaleriaTaller = irAGaleriaTaller;
window.confirmarDesvincular = confirmarDesvincular;
window.usarMiUbicacion = usarMiUbicacion;
window.verDetallesPlan = verDetallesPlan;
window.renovarPlan = renovarPlan;
window.cancelarPlan = cancelarPlan;
window.cargarEquipo = cargarEquipo;   // ⭐ para debug

console.log('✅ Módulo mi-taller.js v2 cargado');