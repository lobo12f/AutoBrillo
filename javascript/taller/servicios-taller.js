// ====================================================================
// 🔧 MÓDULO DE SERVICIOS - AUTOBRILLO DETALLING
//    Gestión de servicios con cards premium, KPIs y diseño moderno
// ====================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
let incluyeSeleccionados = [];

// ================================================================
// 🔹 CARGAR SERVICIOS
// ================================================================

export async function cargarServicios() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('servicios-lista');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">⏳ Cargando servicios...</p>';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/servicios`);
        const data = await response.json();

        if (data.exito && data.servicios.length > 0) {
            const servicios = data.servicios;
            const totalServicios = servicios.length;
            const activos = servicios.filter(s => s.activo !== false).length;
            const tiposUnicos = [...new Set(servicios.map(s => s.tipo))].length;
            const precioPromedio = Math.round(servicios.reduce((s, srv) => s + (srv.precio || 0), 0) / totalServicios);

            let html = `
            <!-- KPIs -->
            <div class="servicios-kpi">
                <div class="servicios-kpi-item" style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border-color:${colorTaller}40;">
                    <div class="servicios-kpi-valor" style="color:${colorTaller};">${totalServicios}</div>
                    <div class="servicios-kpi-label">Total Servicios</div>
                </div>
                <div class="servicios-kpi-item" style="background:linear-gradient(135deg, #00ff8820, #00ff8805); border-color:#00ff8840;">
                    <div class="servicios-kpi-valor" style="color:#00ff88;">${activos}</div>
                    <div class="servicios-kpi-label">Activos</div>
                </div>
                <div class="servicios-kpi-item" style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border-color:#ffbb3340;">
                    <div class="servicios-kpi-valor" style="color:#ffbb33;">${tiposUnicos}</div>
                    <div class="servicios-kpi-label">Tipos</div>
                </div>
                <div class="servicios-kpi-item" style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border-color:#00d4ff40;">
                    <div class="servicios-kpi-valor" style="color:#00d4ff;">RD$ ${precioPromedio.toLocaleString()}</div>
                    <div class="servicios-kpi-label">Precio Promedio</div>
                </div>
            </div>`;

            servicios.forEach(servicio => {
                const tipoIcono = { 'LAVADO': '🧽', 'DETALLADO': '✨', 'PULIDO': '💎', 'TRATAMIENTO': '🧴', 'EXTRA': '➕' };
                const tipoColor = { 'LAVADO': '#00d4ff', 'DETALLADO': '#ff44ff', 'PULIDO': '#ffbb33', 'TRATAMIENTO': '#00ff88', 'EXTRA': '#888' };
                const icono = tipoIcono[servicio.tipo] || '🔧';
                const tColor = tipoColor[servicio.tipo] || '#888';
                const tags = servicio.descripcion ? servicio.descripcion.split(' | ').filter(Boolean) : [];

                html += `
                <div class="servicio-card ${servicio.activo === false ? 'servicio-card-inactivo' : ''}" style="border-color:${tColor}30;">
                    <div class="servicio-card-bar" style="background:linear-gradient(90deg, ${tColor}, ${tColor}88, transparent);"></div>
                    
                    <div class="servicio-card-header">
                        <span class="servicio-card-badge" style="background:${tColor}18; color:${tColor};">${icono} ${servicio.tipo || 'LAVADO'}</span>
                        <h3 class="servicio-card-nombre">${servicio.nombre}</h3>
                    </div>
                    
                    <div class="servicio-card-precio">
                        <span class="servicio-card-precio-valor">RD$ ${servicio.precio?.toLocaleString()}</span>
                        <p class="servicio-card-precio-label">por servicio</p>
                    </div>
                    
                    ${tags.length > 0 ? `
                    <div class="servicio-card-tags">
                        <p class="servicio-card-tags-title">✅ ${tags.length} Incluye</p>
                        ${tags.map(tag => `
                        <div class="servicio-card-tag-item">
                            <span>✅ ${tag}</span>
                        </div>`).join('')}
                    </div>` : ''}
                    
                    <div class="servicio-card-footer">
                        <div class="servicio-card-duracion">
                            <span class="servicio-card-duracion-valor">⏱️ ${servicio.duracionEstimada || 45} min</span>
                            <small>Duración</small>
                        </div>
                        <div class="servicio-card-actions">
                            <button onclick="event.stopPropagation(); window.editarServicio('${servicio._id}')" 
                                class="servicio-card-btn servicio-card-btn-editar" 
                                style="border-color:${tColor}; color:${tColor}; --hover-bg:${tColor}18;">✏️ Editar</button>
                            <button onclick="event.stopPropagation(); window.eliminarServicioConfirmado('${servicio._id}')" 
                                class="servicio-card-btn servicio-card-btn-eliminar">🗑️</button>
                        </div>
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size:4rem; margin-bottom:15px;">🔧</div>
                    <h3 style="color:var(--text-primary, #fff);">No hay servicios creados</h3>
                    <p style="color:var(--text-secondary, #888); margin-bottom:20px;">Crea tu primer servicio para comenzar</p>
                    <button class="btn-add" onclick="window.abrirModalServicio()" style="padding:12px 25px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem;">+ Crear Primer Servicio</button>
                </div>`;
        }
    } catch (error) {
        container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar servicios</p>';
    }
}

// ================================================================
// 🔹 ABRIR MODAL SERVICIO
// ================================================================

export function abrirModalServicio(servicioId = null) {
    document.getElementById('servicio-id').value = '';
    document.getElementById('servicio-nombre').value = '';
    document.getElementById('servicio-precio').value = '';
    document.getElementById('servicio-duracion').value = '45';
    document.getElementById('servicio-tipo').value = 'LAVADO';
    document.getElementById('btn-eliminar-servicio').style.display = 'none';
    document.getElementById('modal-servicio-titulo').textContent = 'Nuevo Servicio';
    // ❌ Eliminar estas líneas:
    // document.getElementById('modal-servicio-icono').textContent = '🔧';

    incluyeSeleccionados = [];
    renderizarTagsServicio();
    actualizarValorIncluye();
    document.getElementById('servicio-incluye-custom').value = '';
    document.getElementById('servicio-incluye-select').value = '';

    if (servicioId) {
        document.getElementById('modal-servicio-titulo').textContent = 'Editar Servicio';
        // ❌ Eliminar esta línea:
        // document.getElementById('modal-servicio-icono').textContent = '✏️';
        document.getElementById('btn-eliminar-servicio').style.display = 'inline-block';
        cargarDatosServicio(servicioId);
    }

    document.getElementById('modal-servicio').style.display = 'flex';
    setTimeout(() => actualizarVistaPreviaServicio(), 100);
}

// ================================================================
// 🔹 CARGAR DATOS DEL SERVICIO
// ================================================================

async function cargarDatosServicio(servicioId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/servicios`);
        const data = await response.json();
        const servicio = data.servicios?.find(s => s._id === servicioId);
        if (servicio) {
            document.getElementById('servicio-id').value = servicio._id;
            document.getElementById('servicio-nombre').value = servicio.nombre || '';
            document.getElementById('servicio-precio').value = servicio.precio || '';
            document.getElementById('servicio-duracion').value = servicio.duracionEstimada || 45;
            document.getElementById('servicio-tipo').value = servicio.tipo || 'LAVADO';
            incluyeSeleccionados = servicio.descripcion ? servicio.descripcion.split(' | ').filter(Boolean) : [];
            renderizarTagsServicio();
            actualizarValorIncluye();
            setTimeout(() => actualizarVistaPreviaServicio(), 150);
        }
    } catch (error) { console.error('Error:', error); }
}

// ================================================================
// 🔹 EDITAR SERVICIO
// ================================================================

export function editarServicio(servicioId) {
    abrirModalServicio(servicioId);
}

// ================================================================
// 🔹 GUARDAR SERVICIO
// ================================================================

export async function guardarServicio(event) {
    if (event && event.preventDefault) event.preventDefault();

    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    const id = document.getElementById('servicio-id').value;
    const nombre = document.getElementById('servicio-nombre').value.trim();
    const precio = parseFloat(document.getElementById('servicio-precio').value);
    const duracion = parseInt(document.getElementById('servicio-duracion').value) || 45;
    const tipo = document.getElementById('servicio-tipo').value;
    const descripcion = incluyeSeleccionados.join(' | ');

    if (!nombre || isNaN(precio)) {
        window.mostrarToast?.('⚠️ Nombre y precio son requeridos', 'warning');
        return;
    }

    const url = id ? `/talleres/${tallerActual._id}/servicios/${id}` : `${API_URL}/talleres/${tallerActual._id}/servicios`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await apiFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion, precio, duracionEstimada: duracion, tipo })
        });
        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.(id ? '✅ Servicio actualizado' : '✅ Servicio creado', 'success');
            document.getElementById('modal-servicio').style.display = 'none';
            cargarServicios();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 ELIMINAR SERVICIO
// ================================================================

export function eliminarServicioConfirmado(servicioId) {
    if (confirm('¿Eliminar este servicio?')) {
        eliminarServicio(servicioId);
    }
}

async function eliminarServicio(servicioId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));
    const id = servicioId || document.getElementById('servicio-id').value;
    if (!id) return;

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/servicios/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.('🗑️ Servicio eliminado', 'success');
            document.getElementById('modal-servicio').style.display = 'none';
            cargarServicios();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 TAGS DE SERVICIOS
// ================================================================

export function agregarIncluyeAlServicio() {
    const select = document.getElementById('servicio-incluye-select');
    const valor = select?.value;
    if (!valor) return;

    if (incluyeSeleccionados.includes(valor)) {
        window.mostrarToast?.('⚠️ Este ítem ya fue agregado', 'warning');
        select.value = '';
        return;
    }

    incluyeSeleccionados.push(valor);
    select.value = '';
    renderizarTagsServicio();
    actualizarValorIncluye();
    actualizarVistaPreviaServicio();
}

export function agregarIncluyeCustom() {
    const input = document.getElementById('servicio-incluye-custom');
    const valor = input?.value?.trim();
    if (!valor) return;

    if (incluyeSeleccionados.includes(valor)) {
        window.mostrarToast?.('⚠️ Este ítem ya fue agregado', 'warning');
        input.value = '';
        return;
    }

    incluyeSeleccionados.push(valor);
    input.value = '';
    renderizarTagsServicio();
    actualizarValorIncluye();
    actualizarVistaPreviaServicio();
}

function renderizarTagsServicio() {
    const container = document.getElementById('servicio-incluye-container');
    if (!container) return;

    if (incluyeSeleccionados.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted, #666); font-size:0.85rem;">No se ha agregado ningún ítem...</span>';
        return;
    }

    container.innerHTML = incluyeSeleccionados.map((item, index) => `
        <span style="display:inline-flex; align-items:center; gap:6px; background:var(--accent-bg, rgba(0,255,136,0.1)); border:1px solid var(--accent-color, #00ff88)30; color:var(--accent-color, #00ff88); padding:5px 10px; border-radius:20px; font-size:0.78rem; margin:3px;">
            ✅ ${item}
            <span onclick="window.eliminarTagServicio(${index})" style="cursor:pointer; color:#ff4444; font-weight:bold; font-size:0.9rem;">&times;</span>
        </span>`).join('');
}

export function eliminarTagServicio(index) {
    incluyeSeleccionados.splice(index, 1);
    renderizarTagsServicio();
    actualizarValorIncluye();
    actualizarVistaPreviaServicio();
}

function actualizarValorIncluye() {
    const input = document.getElementById('servicio-incluye-valor');
    if (input) input.value = incluyeSeleccionados.join(' | ');
}

// ================================================================
// 🔹 SELECCIONAR TIPO DE SERVICIO (UI Interactiva)
// ================================================================

export function seleccionarTipoServicio(tipo, elemento) {
    document.getElementById('servicio-tipo').value = tipo;

    document.querySelectorAll('#selector-tipo-servicio > div').forEach(card => {
        card.classList.remove('activo');
        card.style.borderColor = 'var(--border-color, #1e2a3a)';
        card.style.background = 'transparent';
        card.style.color = 'var(--text-secondary, #aaa)';
        card.style.transform = 'scale(1)';
    });

    elemento.classList.add('activo');
    elemento.style.borderColor = 'var(--accent-color, #00ff88)';
    elemento.style.background = 'var(--accent-bg, rgba(0,255,136,0.08))';
    elemento.style.color = 'var(--accent-color, #00ff88)';
    elemento.style.transform = 'scale(1.05)';
    elemento.style.fontWeight = '600';
    actualizarVistaPreviaServicio();
}

// ================================================================
// 🔹 ACTUALIZAR VISTA PREVIA DEL SERVICIO EN TIEMPO REAL
// ================================================================

export function actualizarVistaPreviaServicio() {
    const nombre = document.getElementById('servicio-nombre')?.value || 'Nombre del Servicio';
    const precio = parseFloat(document.getElementById('servicio-precio')?.value) || 0;
    const duracion = parseInt(document.getElementById('servicio-duracion')?.value) || 45;
    const tipo = document.getElementById('servicio-tipo')?.value || 'LAVADO';

    const tipoIconos = { 'LAVADO': '🧽', 'DETALLADO': '✨', 'PULIDO': '💎', 'TRATAMIENTO': '🧴', 'EXTRA': '➕' };
    const tipoNombres = { 'LAVADO': 'LAVADO', 'DETALLADO': 'DETALLADO', 'PULIDO': 'PULIDO', 'TRATAMIENTO': 'TRATAMIENTO', 'EXTRA': 'EXTRA' };
    const icono = tipoIconos[tipo] || '🔧';
    const tipoNombre = tipoNombres[tipo] || 'LAVADO';

    // ✅ Actualizar tipo
    const previewTipo = document.getElementById('preview-servicio-tipo');
    if (previewTipo) previewTipo.textContent = `${icono} ${tipoNombre}`;

    // ✅ Actualizar nombre
    const previewNombre = document.getElementById('preview-servicio-nombre');
    if (previewNombre) previewNombre.textContent = nombre || 'Nombre del Servicio';

    // ✅ Actualizar precio
    const previewPrecio = document.getElementById('preview-servicio-precio');
    if (previewPrecio) previewPrecio.textContent = 'RD$ ' + precio.toLocaleString('es-DO');

    // ✅ Actualizar duración
    const previewDuracion = document.getElementById('preview-servicio-duracion');
    if (previewDuracion) previewDuracion.textContent = '⏱️ ' + duracion + ' min';

    // ✅ Actualizar tags
    const previewTags = document.getElementById('preview-servicio-tags');
    if (previewTags) {
        if (incluyeSeleccionados.length > 0) {
            previewTags.innerHTML = incluyeSeleccionados.map(item => `
                <div style="padding:3px 0; font-size:0.75rem; color:#aaa;">✅ ${item}</div>
            `).join('');
        } else {
            previewTags.innerHTML = `
                <div class="preview-servicio-empty">
                    <span>📋</span>
                    No hay ítems agregados
                </div>`;
        }
    }
}
// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarServicios() {
    window.cargarServicios = cargarServicios;
    window.abrirModalServicio = abrirModalServicio;
    window.editarServicio = editarServicio;
    window.guardarServicio = guardarServicio;
    window.eliminarServicioConfirmado = eliminarServicioConfirmado;
    window.agregarIncluyeAlServicio = agregarIncluyeAlServicio;
    window.agregarIncluyeCustom = agregarIncluyeCustom;
    window.eliminarTagServicio = eliminarTagServicio;
    window.seleccionarTipoServicio = seleccionarTipoServicio;
    window.actualizarVistaPreviaServicio = actualizarVistaPreviaServicio;
    console.log('🔧 Módulo de Servicios inicializado');
}