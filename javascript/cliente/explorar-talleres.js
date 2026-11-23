/* ============================================================================
   EXPLORAR TALLERES - MÓDULO INDEPENDIENTE
   ============================================================================
   Todo lo relacionado con la sección "Explorar Talleres":
   - Carga de talleres desde la API
   - Filtros (búsqueda, ciudad, especialidad)
   - Paginación (10 talleres por página)
   - Renderizado de cards
   - Selección de taller
   - Vinculación
   - Agendar cita
   - Búsqueda de ubicación manual
   ============================================================================ */

/* ============================================================================
   EXPLORAR TALLERES - MÓDULO INDEPENDIENTE
   ============================================================================ */

// ============================================================================
// IMPORTS
// ============================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';


// ============================================================================
// ESTADO LOCAL DEL MÓDULO
// ============================================================================
const estado = {
    todos: [],
    filtrados: [],
    paginaActual: 1,
    porPagina: 10,
    totalPaginas: 1,
    tallerSeleccionadoId: null,
    cargando: false,
};

window.talleresExplorar = estado.todos;
window.talleresPaginacion = estado;

// ============================================================================
// 1. CARGAR TALLERES (CON PAGINACIÓN)
// ============================================================================
export async function cargarTalleresExplorar(params = {}) {
    const container = document.getElementById('lista-talleres');
    if (!container) return;

    if (estado.cargando) return;
    estado.cargando = true;

    container.innerHTML = `
        <div class="et-loading-container">
            <div class="et-spinner"></div>
            <p class="et-loading-text">🔍 Buscando talleres disponibles...</p>
        </div>
    `;

    const paginacion = document.getElementById('paginacion-talleres');
    const contador = document.getElementById('contador-talleres');
    if (paginacion) paginacion.innerHTML = '';
    if (contador) contador.innerHTML = '';

    try {
        // ⭐ Construir query params con lat/lng si vienen
        const queryParams = new URLSearchParams();
        if (params.lat) queryParams.append('lat', params.lat);
        if (params.lng) queryParams.append('lng', params.lng);
        if (params.radio) queryParams.append('radio', params.radio);

        const url = `${API_URL}/talleres/disponibles?${queryParams}`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.exito && data.talleres && data.talleres.length > 0) {
            estado.todos = data.talleres;
            estado.filtrados = [...data.talleres];
            estado.paginaActual = 1;
            window.talleresExplorar = estado.todos;

            llenarFiltros(data.talleres);
            renderizarPaginados();

            const inputBusqueda = document.getElementById('busqueda-taller');
            if (inputBusqueda && !inputBusqueda.dataset.listener) {
                inputBusqueda.addEventListener('input', () => filtrarTalleres());
                inputBusqueda.dataset.listener = 'true';
            }
        } else {
            container.innerHTML = '<p class="et-empty-message">📭 No hay talleres disponibles en tu zona</p>';
        }
    } catch (error) {
        console.error('❌ Error al cargar talleres:', error);
        container.innerHTML = `<p class="et-error-message">Error: ${error.message}</p>`;
    } finally {
        estado.cargando = false;
    }
}

// ============================================================================
// 2. LLENAR FILTROS
// ============================================================================
function llenarFiltros(talleres) {
    const selectCiudad = document.getElementById('filtro-ciudad');
    if (selectCiudad) {
        const ciudades = [...new Set(talleres.map(t => t.direccion?.ciudad).filter(Boolean))];
        selectCiudad.innerHTML = '<option value="">Todas las ciudades</option>' +
            ciudades.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const selectEspecialidad = document.getElementById('filtro-especialidad');
    if (selectEspecialidad) {
        const especialidades = [...new Set(talleres.map(t => t.especialidad).filter(Boolean))];
        selectEspecialidad.innerHTML = '<option value="">Todas las especialidades</option>' +
            especialidades.map(e => `<option value="${e}">${e}</option>`).join('');
    }
}

// ============================================================================
// 3. FILTRAR TALLERES
// ============================================================================
export function filtrarTalleres() {
    const busqueda = (document.getElementById('busqueda-taller')?.value || '').toLowerCase().trim();
    const ciudad = document.getElementById('filtro-ciudad')?.value || '';
    const especialidad = document.getElementById('filtro-especialidad')?.value || '';

    let filtrados = [...estado.todos];

    if (busqueda) {
        filtrados = filtrados.filter(t =>
            t.nombre?.toLowerCase().includes(busqueda) ||
            t.direccion?.ciudad?.toLowerCase().includes(busqueda) ||
            t.direccion?.calle?.toLowerCase().includes(busqueda)
        );
    }
    if (ciudad) filtrados = filtrados.filter(t => t.direccion?.ciudad === ciudad);
    if (especialidad) filtrados = filtrados.filter(t => t.especialidad === especialidad);

    estado.filtrados = filtrados;
    estado.paginaActual = 1;
    renderizarPaginados();
}

// ============================================================================
// 4. RENDERIZAR CON PAGINACIÓN
// ============================================================================
function renderizarPaginados() {
    const container = document.getElementById('lista-talleres');
    const paginacion = document.getElementById('paginacion-talleres');
    const contador = document.getElementById('contador-talleres');

    if (!container) return;

    const total = estado.filtrados.length;
    const totalPaginas = Math.ceil(total / estado.porPagina);
    estado.totalPaginas = totalPaginas;

    if (total === 0) {
        container.innerHTML = '<p class="et-empty-message">📭 No se encontraron talleres</p>';
        if (paginacion) paginacion.innerHTML = '';
        if (contador) contador.innerHTML = '';
        return;
    }

    const inicio = (estado.paginaActual - 1) * estado.porPagina;
    const fin = Math.min(inicio + estado.porPagina, total);
    const talleresPagina = estado.filtrados.slice(inicio, fin);

    if (contador) {
        contador.innerHTML = `
            Mostrando <strong>${inicio + 1}-${fin}</strong> de <strong>${total}</strong> talleres
            ${totalPaginas > 1 ? ` | Página <strong>${estado.paginaActual}</strong> de <strong>${totalPaginas}</strong>` : ''}
        `;
    }

    renderizarCards(talleresPagina);

    if (paginacion && totalPaginas > 1) {
        renderizarPaginacionUI();
    } else if (paginacion) {
        paginacion.innerHTML = '';
    }
}

// ============================================================================
// 5. RENDERIZAR CARDS
// ============================================================================
function renderizarCards(talleres) {
    const container = document.getElementById('lista-talleres');
    if (!container) return;

    if (talleres.length === 0) {
        container.innerHTML = '<p class="et-empty-message">📭 No se encontraron talleres</p>';
        return;
    }

    const tallerVinculadoId = window.tallerManager?.getTallerId();

    container.innerHTML = talleres.map(taller => {
        const estrellas = taller.calificacion?.promedio ? '⭐'.repeat(Math.round(taller.calificacion.promedio)) : 'Sin calificar';
        const bahiasLibres = taller.bahiasDisponibles || 0;
        const estaVinculado = tallerVinculadoId === taller._id;

        const logoHTML = taller.logo
            ? `<img src="${taller.logo}" class="taller-card-logo" onerror="this.style.display='none'; this.parentElement.innerHTML='🏪';">`
            : '🏪';

        return `
        <div class="taller-card ${estaVinculado ? 'vinculado' : ''}" onclick="window.seleccionarTallerExplorar('${taller._id}')">
            
            <div class="taller-card-header">
                <div class="taller-card-title-row">
                    <div class="taller-card-logo-container ${estaVinculado ? 'vinculado' : ''}">
                        ${logoHTML}
                    </div>
                    <div>
                        <div class="taller-card-title-row">
                            <h4 class="taller-card-title">${taller.nombre}</h4>
                            ${estaVinculado ? '<span class="taller-badge-vinculado">⭐ MI TALLER</span>' : ''}
                        </div>
                        <span class="taller-rating">${estrellas}</span>
                    </div>
                </div>
                ${bahiasLibres > 0 ? `<span class="taller-badge-bahias">🟢 ${bahiasLibres} libre${bahiasLibres > 1 ? 's' : ''}</span>` : ''}
            </div>
            
            ${taller.descripcion ? `
            <div class="taller-card-desc-container">
                <p class="taller-card-desc">📝 ${taller.descripcion.substring(0, 100)}${taller.descripcion.length > 100 ? '...' : ''}</p>
            </div>` : ''}
            
            <div class="taller-card-info-list">
                <div class="taller-card-info-item">
                    <span>📍</span>
                    <span>${taller.direccion?.calle || ''}, ${taller.direccion?.ciudad || ''}</span>
                </div>
                <div class="taller-card-info-item">
                    <span>🔧</span>
                    <span>${taller.especialidad || 'General'} · ${taller.bahias?.length || 0} bahías</span>
                </div>
                ${taller.metodosPago && taller.metodosPago.length > 0 ? `
                <div class="taller-card-info-item">
                    <span>💳</span>
                    <span>${taller.metodosPago.map(m => ({ 'EFECTIVO': '💵', 'TRANSFERENCIA': '🏦', 'TARJETA': '💳' })[m] || m).join(' ')}</span>
                </div>` : ''}
            </div>
            ${taller.tiposVehiculos && taller.tiposVehiculos.length > 0 ? `
            <div class="taller-card-info-item" style="margin-bottom: 15px;">
                <span>🚗</span>
                <span>${taller.tiposVehiculos.map(t => ({ 'AUTO': '🚗', 'CAMIONETA': '🚙', 'MOTO': '🏍️', 'CAMION': '🚛', 'BUS': '🚌', 'OTRO': '⚙️' })[t] || t).join(' ')}</span>
            </div>` : ''}
            <div class="taller-card-actions">
                <button onclick="event.stopPropagation(); window.seleccionarTallerExplorar('${taller._id}')" class="btn-taller-action btn-ver-detalles">
                    👁️ Ver detalles
                </button>
                <button onclick="event.stopPropagation(); window.vincularTallerDesdeExplorar('${taller._id}')" class="btn-taller-action btn-vincular ${estaVinculado ? 'vinculado' : ''}">
                    ${estaVinculado ? '✅ Vinculado' : '🏪 Vincular'}
                </button>
                <button onclick="event.stopPropagation(); window.agendarEnTaller('${taller._id}')" class="btn-agendar-icon">
                    📅
                </button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================================
// 6. RENDERIZAR PAGINACIÓN UI
// ============================================================================
function renderizarPaginacionUI() {
    const paginacion = document.getElementById('paginacion-talleres');
    if (!paginacion) return;

    const { paginaActual, totalPaginas } = estado;

    if (totalPaginas <= 1) {
        paginacion.innerHTML = '';
        return;
    }

    const paginasMostrar = calcularPaginasMostrar(paginaActual, totalPaginas);
    let html = '';

    html += `
        <button class="btn-pagina nav-btn" 
                onclick="window.irAPagina(${paginaActual - 1})"
                ${paginaActual === 1 ? 'disabled' : ''}>
            ← Anterior
        </button>
    `;

    if (paginasMostrar[0] > 1) {
        html += `<button class="btn-pagina numero" onclick="window.irAPagina(1)">1</button>`;
        if (paginasMostrar[0] > 2) {
            html += `<span class="pagina-elipsis">...</span>`;
        }
    }

    paginasMostrar.forEach(p => {
        html += `
            <button class="btn-pagina numero ${p === paginaActual ? 'activa' : ''}"
                    onclick="window.irAPagina(${p})"
                    ${p === paginaActual ? 'disabled' : ''}>
                ${p}
            </button>
        `;
    });

    const ultimaMostrada = paginasMostrar[paginasMostrar.length - 1];
    if (ultimaMostrada < totalPaginas) {
        if (ultimaMostrada < totalPaginas - 1) {
            html += `<span class="pagina-elipsis">...</span>`;
        }
        html += `<button class="btn-pagina numero" onclick="window.irAPagina(${totalPaginas})">${totalPaginas}</button>`;
    }

    html += `
        <button class="btn-pagina nav-btn" 
                onclick="window.irAPagina(${paginaActual + 1})"
                ${paginaActual === totalPaginas ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;

    html += `
        <div class="ir-a-pagina">
            <span>Ir a:</span>
            <input type="number" min="1" max="${totalPaginas}" 
                   placeholder="${paginaActual}"
                   onkeypress="if(event.key==='Enter') window.irAPagina(parseInt(this.value))">
        </div>
    `;

    paginacion.innerHTML = html;
}

// ============================================================================
// 7. CALCULAR PÁGINAS
// ============================================================================
function calcularPaginasMostrar(actual, total) {
    const maxVisibles = 5;

    if (total <= maxVisibles) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    let inicio = Math.max(1, actual - Math.floor(maxVisibles / 2));
    let fin = Math.min(total, inicio + maxVisibles - 1);

    if (fin - inicio < maxVisibles - 1) {
        inicio = Math.max(1, fin - maxVisibles + 1);
    }

    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

// ============================================================================
// 8. IR A PÁGINA
// ============================================================================
export function irAPagina(pagina) {
    if (pagina < 1 || pagina > estado.totalPaginas || isNaN(pagina)) return;

    estado.paginaActual = pagina;
    renderizarPaginados();

    const contenedor = document.getElementById('lista-talleres');
    if (contenedor) {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================================================
// 9. SELECCIONAR TALLER (ver detalle)
// ============================================================================
export async function seleccionarTallerExplorar(tallerId) {
    estado.tallerSeleccionadoId = tallerId;
    window.tallerSeleccionadoId = tallerId;

    filtrarTalleres();

    const modal = document.getElementById('modal-taller-fullscreen');
    const body = document.getElementById('modal-taller-body');
    const footer = document.getElementById('modal-taller-footer');
    const headerTitulo = document.getElementById('modal-taller-nombre-header');

    if (!modal || !body) {
        console.error('❌ Modal no encontrado en el HTML');
        return;
    }

    // Abrir modal
    modal.classList.remove('d-none');
    document.body.classList.add('modal-taller-abierto');
    body.innerHTML = '<p style="text-align:center; color:#888; padding:40px;">⏳ Cargando detalles...</p>';
    footer.innerHTML = '';
    if (headerTitulo) headerTitulo.textContent = '🏪 Cargando...';

    // Scroll al top del modal
    body.scrollTop = 0;

    try {
        const [tallerRes, serviciosRes, planesRes] = await Promise.all([
            apiFetch(`/talleres/${tallerId}`),
            apiFetch(`/talleres/${tallerId}/servicios`),
            apiFetch(`/talleres/${tallerId}/planes`)
        ]);

        const tallerData = await tallerRes.json();
        const serviciosData = await serviciosRes.json();
        const planesData = await planesRes.json();

        if (!tallerData.exito) {
            body.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar taller</p>';
            return;
        }

        const t = tallerData.taller;
        const servicios = serviciosData.servicios?.filter(s => s.activo !== false) || [];
        const planes = planesData.planes?.filter(p => p.activo !== false) || [];
        const estrellas = t.calificacion?.promedio ? '⭐'.repeat(Math.round(t.calificacion.promedio)) : 'Sin calificar';
        const direccion = `${t.direccion?.calle || ''}, ${t.direccion?.ciudad || ''}, ${t.direccion?.provincia || ''}`;
        const estaVinculado = window.tallerManager?.getTallerId() === tallerId;

        // Actualizar título del header
        if (headerTitulo) headerTitulo.textContent = `🏪 ${t.nombre}`;

        const iconosPago = {
            'EFECTIVO': '💵',
            'TRANSFERENCIA': '🏦',
            'TARJETA': '💳',
            'OTRO': '📌'
        };
        const metodosPagoTexto = t.metodosPago?.map(m => iconosPago[m] || m).join(' ') || '';

        // ====================================================================
        // CONTENIDO DEL MODAL
        // ====================================================================
        body.innerHTML = `
            <!-- HERO -->
            <div class="modal-taller-hero">
                <div class="modal-taller-hero-top">
                    ${t.logo
                ? `<img src="${t.logo}" class="modal-taller-logo" onerror="this.style.display='none';">`
                : '<div class="modal-taller-logo-placeholder">🏪</div>'}
                    <div class="modal-taller-info-principal">
                        <h2 class="modal-taller-nombre">${t.nombre}</h2>
                        <div class="modal-taller-rating">
                            ${estrellas}
                            <span>${t.calificacion?.promedio?.toFixed(1) || 'N/A'}</span>
                            <small style="color:#888;">(${t.calificacion?.totalReseñas || 0} reseñas)</small>
                            ${estaVinculado ? '<span class="modal-taller-badge" style="background:#ffbb3322; color:#ffbb33;">⭐ MI TALLER</span>' : ''}
                        </div>
                    </div>
                </div>
                ${t.descripcion ? `<p class="modal-taller-descripcion">📝 ${t.descripcion}</p>` : ''}
                <div class="modal-taller-meta">
                    <div class="modal-taller-meta-item">
                        <span>📍</span>
                        <span>${direccion}</span>
                    </div>
                    ${t.telefono ? `
                    <div class="modal-taller-meta-item">
                        <span>📞</span>
                        <span>${t.telefono}</span>
                    </div>` : ''}
                    ${metodosPagoTexto ? `
                    <div class="modal-taller-meta-item">
                        <span>💳</span>
                        <span>Acepta: ${metodosPagoTexto}</span>
                    </div>` : ''}
                    ${t.especialidad ? `
                    <div class="modal-taller-meta-item">
                        <span>🔧</span>
                        <span>Especialidad: <strong>${t.especialidad}</strong></span>
                    </div>` : ''}
                    ${t.bahias?.length ? `
                    <div class="modal-taller-meta-item">
                        <span>🏗️</span>
                        <span>${t.bahias.length} bahías · ${t.bahiasDisponibles || 0} disponibles</span>
                    </div>` : ''}
                </div>
            </div>

            <!-- Servicios -->
            <div class="modal-taller-section">
                <h3 class="modal-taller-section-title">
                    <span>🔧</span> Servicios (${servicios.length})
                </h3>
                ${servicios.length > 0 ? `
                <div class="cont-cat-servicio" >
                    ${servicios.map(s => {
                    const tipoIcono = { 'LAVADO': '🧽', 'DETALLADO': '✨', 'PULIDO': '💎', 'TRATAMIENTO': '🧴', 'EXTRA': '➕' };
                    return `
                   
                        <div  class="box-cat-servicio" >
                         <!-- Contenedor de la imagen con efecto hundido -->
                       <div class="cont-servicio-imagen">
                        <img src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
                         alt="Carro lavado">
                        </div>
                            <div class="box-cat-servicio-tatlle"  >
                                <span>${tipoIcono[s.tipo] || '🔧'}</span>
                                <span >${s.nombre}</span>
                            </div>
                            <div class="box-cat-servicio-precio">
                                <span >RD$ ${s.precio?.toLocaleString()}</span>
                                <small >⏱️ ${s.duracionEstimada || 45}min</small>
                            </div>
                        </div>`;
                }).join('')}
                </div>` : '<p style="color:#888; text-align:center; padding:20px;">📭 No hay servicios configurados</p>'}
            </div>

            <!-- Planes -->
            <div class="modal-taller-section-planes">
                <h3 class="modal-taller-section-title">
                    <span>📦</span> Planes (${planes.length})
                </h3>
                ${planes.length > 0 ? `
                <div class="cont-box-planes" >
                 ${planes.map(p => {
                    // ⭐ Parsear servicios del campo descripcion
                    const servicios = parsearServiciosPlan(p.descripcion);

                    const nivelIcono = { 'BASICO': '🥉', 'NORMAL': '🥈', 'PREMIUM': '🥇', 'VIP': '💎', 'PERSONALIZADO': '🔧' };
                    const nivelColor = { 'BASICO': '#00ff88', 'NORMAL': '#00d4ff', 'PREMIUM': '#ffbb33', 'VIP': '#ff44ff', 'PERSONALIZADO': '#888' };
                    const color = nivelColor[p.nivel] || '#00d4ff';
                    const icono = nivelIcono[p.nivel] || '📦';
                    const cantServicios = servicios.length > 0 ? servicios.length : (p.serviciosIncluidos || 0);
                    const lavados = p.numeroLavados || 0;
                    const precioPorServicio = cantServicios > 0 ? Math.round(p.precio / cantServicios) : 0;

                    return `
        <div class="plan-card-cliente">
            
            <!-- Badge nivel -->
            <span class="plan-nivel-badge" 
                  style="background:${color}20; color:${color}; border:1px solid ${color}50;">
                ${icono} ${p.nivel || 'NORMAL'}
            </span>
            
            <!-- Nombre del plan -->
            <h4 class="plan-nombre-cliente">${p.nombre}</h4>
            
            <!-- Precio -->
            <div class="plan-precio-box" 
                 style="background:linear-gradient(135deg, ${color}20, ${color}05); border:1px solid ${color}30;">
                <span class="plan-precio-valor" style="color:${color};">RD$ ${p.precio?.toLocaleString()}</span>
                <small class="plan-duracion">por ${p.duracionDias || 30} días</small>
            </div>
            
            <!-- Servicios -->
            <div class="plan-servicios-box">
                <p class="plan-servicios-title">
                    <span>✅</span> Servicios Incluidos
                </p>
                ${servicios.length > 0 ? `
                <div class="plan-servicios-lista">
                    ${servicios.map(s => `
                        <div class="plan-servicio-item">
                            <span class="plan-servicio-nombre">
                                <span>🔧</span> ${s.nombre || 'Servicio'}
                            </span>
                            <span class="plan-servicio-precio">RD$ ${(s.precio || 0).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
                ` : `
                <div class="plan-servicios-empty">
                    <span>📋</span>
                    ${cantServicios} servicios incluidos
                </div>
                `}
            </div>
            
            <!-- Stats -->
            <div class="plan-stats-grid">
                <div class="plan-stat-item">
                    <div class="plan-stat-valor verde">${cantServicios}</div>
                    <small class="plan-stat-label">Servicios</small>
                </div>
                <div class="plan-stat-item">
                    <div class="plan-stat-valor azul">RD$ ${precioPorServicio.toLocaleString()}</div>
                    <small class="plan-stat-label">Por Serv.</small>
                </div>
                <div class="plan-stat-item">
                    <div class="plan-stat-valor morado">${lavados}</div>
                    <small class="plan-stat-label">🧽 Lavados</small>
                </div>
            </div>
            
            <!-- Botón contratar -->
            <button class="plan-btn-contratar" 
                onclick="window.contratarPlan('${p._id}', '${tallerId}')"
                style="background:linear-gradient(135deg, ${color}, ${color}cc);">
                💳 Contratar Plan
            </button>
        </div>
                           `;
                }).join('')}
                </div>` : '<p style="color:#888; text-align:center; padding:20px;">📭 No hay planes disponibles</p>'}
            </div>

            <!-- Calificaciones -->
            <div class="modal-taller-section">
                <h3 class="modal-taller-section-title">
                    <span>⭐</span> Calificaciones y Reseñas
                </h3>
                <div id="calificaciones-content-${tallerId}">
                    <p style="color:#888; text-align:center; padding:20px;">⏳ Cargando reseñas...</p>
                </div>
            </div>

            <!-- Galería -->
            <div class="modal-taller-section">
                <h3 class="modal-taller-section-title">
                    <span>📸</span> Galería de Trabajos
                </h3>
                <div id="galeria-content-${tallerId}" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px;">
                    <p style="color:#888; grid-column:1/-1; text-align:center; padding:20px;">⏳ Cargando fotos...</p>
                </div>
            </div>

            <!-- Mapa -->
            <div class="modal-taller-section">
                <h3 class="modal-taller-section-title">
                    <span>🗺️</span> Ubicación
                </h3>
                <div id="mapa-taller-${tallerId}" style="width:100%; height:300px; border-radius:12px; background:#080c14; border:1px solid #1e2a3a;"></div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:8px;">
                    <small style="color:#888;">📍 ${direccion}</small>
                    <div style="display:flex; gap:6px;">
                        ${t.direccion?.coordenadas?.lat ? `
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${t.direccion.coordenadas.lat},${t.direccion.coordenadas.lng}" 
                           target="_blank" 
                           style="padding:6px 12px; background:rgba(0,255,136,0.1); border:1px solid #00ff88; border-radius:8px; color:#00ff88; text-decoration:none; font-size:0.8rem; font-weight:600;">
                            🗺️ Cómo llegar
                        </a>
                        <a href="https://waze.com/ul?ll=${t.direccion.coordenadas.lat},${t.direccion.coordenadas.lng}&navigate=yes" 
                           target="_blank" 
                           style="padding:6px 12px; background:rgba(51,204,255,0.1); border:1px solid #33CCFF; border-radius:8px; color:#33CCFF; text-decoration:none; font-size:0.8rem; font-weight:600;">
                            🚗 Waze
                        </a>` : `
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}" 
                           target="_blank" 
                           style="padding:6px 12px; background:rgba(0,212,255,0.1); border:1px solid #00d4ff; border-radius:8px; color:#00d4ff; text-decoration:none; font-size:0.8rem; font-weight:600;">
                            🔗 Ver en Google Maps
                        </a>`}
                    </div>
                </div>
            </div>
        `;

        // ====================================================================
        // FOOTER CON CTA
        // ====================================================================
        footer.innerHTML = `
            <button class="btn-cta-principal" onclick="window.agendarEnTaller('${tallerId}')">
                📅 Reservar ahora
            </button>
            ${estaVinculado ? `
            <button class="btn-cta-secundario" onclick="window.tallerManager.desvincular()" title="Desvincular">
                ✅
            </button>` : `
            <button class="btn-cta-secundario vincular" onclick="window.vincularTallerDesdeExplorar('${tallerId}')" title="Vincular taller">
                🏪
            </button>`}
            ${t.telefono ? `
            <a href="https://wa.me/1${t.telefono?.replace(/[^0-9]/g, '')}" 
               target="_blank" 
               class="btn-cta-secundario" 
               style="text-decoration:none;"
               title="WhatsApp">
                💬
            </a>` : ''}
        `;

        // ====================================================================
        // CARGAR SECCIONES DINÁMICAS
        // ====================================================================
        setTimeout(() => window.resenasSocial?.cargar(tallerId, `calificaciones-content-${tallerId}`), 300);
        setTimeout(() => window.cargarGaleriaTaller(tallerId), 300);

        const coordenadas = t.direccion?.coordenadas?.lat ? {
            lat: t.direccion.coordenadas.lat,
            lng: t.direccion.coordenadas.lng
        } : null;
        setTimeout(() => window.mapaTaller?.inicializar(tallerId, direccion, t.nombre, coordenadas), 500);

    } catch (error) {
        console.error('❌ Error al cargar detalle:', error);
        body.innerHTML = `<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar detalle: ${error.message}</p>`;
    }
}

// ============================================================================
// 10. VINCULAR TALLER
// ============================================================================
export async function vincularTallerDesdeExplorar(tallerId) {
    if (window.tallerManager) {
        await window.tallerManager.vincular(tallerId);
        filtrarTalleres();
    }
}

// ============================================================================
// 11. AGENDAR EN TALLER
// ============================================================================
export function agendarEnTaller(tallerId) {
    if (window.abrirModalSolicitud) {
        window.abrirModalSolicitud(tallerId);
    }
}

// ============================================================================
// 12. BUSCAR MI UBICACIÓN MANUAL
// ============================================================================
export async function buscarMiUbicacionManual(tallerId, direccion, nombre, lat, lng) {
    const input = document.getElementById(`input-mi-ubicacion-${tallerId}`);
    const miDireccion = input?.value?.trim();

    if (!miDireccion) {
        alert('Por favor, ingresa tu ubicación');
        return;
    }

    if (window.mapaTaller) {
        const encontrada = await window.mapaTaller.buscarMiUbicacion(miDireccion);
        if (encontrada) {
            window.mapaTaller.inicializar(tallerId, direccion, nombre, { lat, lng });
        } else {
            alert('No se pudo encontrar tu ubicación. Intenta con una dirección más específica.');
        }
    }
}
// ============================================================================
// 📍 BUSCAR CERCA DE MÍ
// ============================================================================
window.buscarCercaDeMi = function () {
    if (!navigator.geolocation) {
        window.mostrarToast?.('❌ Tu navegador no soporta geolocalización', 'error');
        return;
    }

    window.mostrarToast?.('📍 Obteniendo tu ubicación...', 'info');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            console.log(`📍 Ubicación real: ${latitude}, ${longitude}`);

            window._ubicacionCliente = { lat: latitude, lng: longitude };
            await window.cargarTalleresExplorar({ lat: latitude, lng: longitude, radio: 50 });
            window.mostrarToast?.(`✅ Talleres encontrados cerca de ti`, 'success');
        },
        (error) => {
            console.warn('⚠️ Error de geolocalización:', error.message);
            // ⭐ FALLBACK: Usar ubicación por defecto (Santo Domingo)
            console.warn('⚠️ Usando ubicación por defecto (Santo Domingo) para pruebas');
            const latDefault = 18.4861;
            const lngDefault = -69.9312;

            window._ubicacionCliente = { lat: latDefault, lng: lngDefault };
            window.cargarTalleresExplorar({ lat: latDefault, lng: lngDefault, radio: 50 });
            window.mostrarToast?.(`⚠️ No se pudo obtener tu ubicación. Mostrando talleres cerca de Santo Domingo.`, 'warning');
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
};
// ============================================================================
// 13. EXPORTAR A window (para compatibilidad con HTML)
// ============================================================================
window.cargarTalleresExplorar = cargarTalleresExplorar;
window.filtrarTalleres = filtrarTalleres;
window.irAPagina = irAPagina;
window.seleccionarTallerExplorar = seleccionarTallerExplorar;
window.vincularTallerDesdeExplorar = vincularTallerDesdeExplorar;
window.agendarEnTaller = agendarEnTaller;
window.buscarMiUbicacionManual = buscarMiUbicacionManual;
window.cerrarModalTaller = () => cerrarModalTaller();

window.compartirTaller = () => compartirTaller();
window.cargarGaleriaTaller = cargarGaleriaTaller;
window.verFotoGrande = verFotoGrande;
window.buscarCercaDeMi = buscarCercaDeMi;
window._ubicacionCliente = window._ubicacionCliente || null;

// ============================================================================
// 14. CARGAR GALERÍA DEL TALLER
// ============================================================================
export async function cargarGaleriaTaller(tallerId) {
    const container = document.getElementById(`galeria-content-${tallerId}`) ||
        document.getElementById('galeria-taller');
    if (!container) return;

    try {
        const response = await apiFetch(`/talleres/${tallerId}/galeria`);
        const data = await response.json();

        if (data.exito && data.fotos && data.fotos.length > 0) {
            container.innerHTML = data.fotos.map(foto => `
                <div class="et-galeria-item" onclick="window.verFotoGrande('${foto.url}')">
                    <img src="${foto.url}" class="et-galeria-img" 
                        onerror="this.parentElement.style.display='none'">
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="et-empty-message">📭 No hay fotos todavía</p>';
        }
    } catch (error) {
        console.error('❌ Error cargando galería:', error);
        container.innerHTML = '<p class="et-empty-message">Error al cargar fotos</p>';
    }
}

// ============================================================================
// 15. VER FOTO EN GRANDE (modal)
// ============================================================================
export function verFotoGrande(url) {
    const modal = document.createElement('div');
    modal.className = 'et-modal-zoom';
    modal.innerHTML = `<img src="${url}" class="et-modal-zoom-img">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

// ============================================================================
// 16. CERRAR MODAL
// ============================================================================
export function cerrarModalTaller() {
    const modal = document.getElementById('modal-taller-fullscreen');
    if (!modal) return;

    modal.classList.add('cerrando');
    setTimeout(() => {
        modal.classList.add('d-none');
        modal.classList.remove('cerrando');
        document.body.classList.remove('modal-taller-abierto');
    }, 250);
}

// ============================================================================
// 17. COMPARTIR TALLER
// ============================================================================
export async function compartirTaller() {
    const tallerId = estado.tallerSeleccionadoId;
    if (!tallerId) return;

    const url = `${window.location.origin}${window.location.pathname}#taller/${tallerId}`;
    const taller = estado.todos.find(t => t._id === tallerId);

    if (navigator.share) {
        try {
            await navigator.share({
                title: taller?.nombre || 'Taller',
                text: `Mira este taller en AutoBrillo: ${taller?.nombre}`,
                url: url
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(url);
            window.mostrarToast?.('✅ Enlace copiado al portapapeles', 'success');
        } catch (e) {
            alert(`Comparte este enlace:\n\n${url}`);
        }
    }
}
// ============================================================================
// 18. CERRAR CON ESCAPE
// ============================================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-taller-fullscreen');
        if (modal && !modal.classList.contains('d-none')) {
            cerrarModalTaller();
        }
    }
});

// ============================================================================
// 19. SOPORTE PARA HASH URL (#taller/123)
// ============================================================================
function checkHashYAbirTaller() {
    const hash = window.location.hash;
    const match = hash.match(/#taller\/(.+)/);
    if (match && match[1]) {
        const tallerId = match[1];
        // Esperar a que se carguen los talleres
        setTimeout(() => {
            if (estado.todos.length > 0) {
                seleccionarTallerExplorar(tallerId);
            }
        }, 1000);
    }
}
// ============================================================================
// 🛠️ HELPER: Parsear servicios del plan
// ============================================================================
// El taller guarda los servicios del plan como JSON string en el campo
// `descripcion`. Ejemplo: '[{"nombre":"Lavado","precio":300}]'
// ============================================================================
export function parsearServiciosPlan(descripcion) {
    if (!descripcion) return [];

    if (Array.isArray(descripcion)) {
        return descripcion;
    }

    if (typeof descripcion === 'string') {
        try {
            const parsed = JSON.parse(descripcion);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    return [];
}

// ============================================================================
// 20. CONTRATAR PLAN
// ============================================================================
export async function contratarPlan(planId, tallerId) {
    if (window.comprarPlanWeb) {
        window.comprarPlanWeb(planId, tallerId);
    } else {
        window.mostrarToast?.('⚠️ Función de compra no disponible', 'warning');
    }
}

window.contratarPlan = contratarPlan;
// Verificar al cargar
document.addEventListener('DOMContentLoaded', checkHashYAbirTaller);

// Actualizar hash al cerrar
const originalCerrar = cerrarModalTaller;
console.log('✅ Módulo explorar-talleres.js cargado');