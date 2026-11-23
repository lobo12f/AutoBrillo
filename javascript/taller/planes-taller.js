// ====================================================================
// 📦 MÓDULO DE PLANES - AUTOBRILLO DETALLING
//    Gestión de planes con cards premium, KPIs, vista previa
//    y cálculo automático de precio (servicios × lavados)
// ====================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
// ✅ Variable global para servicios seleccionados
window.serviciosPlanSeleccionados = window.serviciosPlanSeleccionados || [];

// ================================================================
// 🔹 CARGAR PLANES
// ================================================================

export async function cargarPlanes() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('planes-lista');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">⏳ Cargando planes...</p>';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/planes`);
        const data = await response.json();

        if (data.exito && data.planes.length > 0) {
            const planes = data.planes;
            const totalPlanes = planes.length;
            const planesActivos = planes.filter(p => p.activo !== false).length;
            const precioPromedio = planes.length > 0 ? Math.round(planes.reduce((s, p) => s + (p.precio || 0), 0) / planes.length) : 0;
            const totalLavados = planes.reduce((s, p) => s + (p.numeroLavados || 0), 0);

            let html = `
            <!-- KPIs -->
            <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:10px;">
                <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.5rem; font-weight:800; color:${colorTaller};">${totalPlanes}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Planes</small>
                </div>
                <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:1px solid #ffbb3340; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.5rem; font-weight:800; color:#ffbb33;">${planesActivos}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Planes Activos</small>
                </div>
                <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:1px solid #00d4ff40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.5rem; font-weight:800; color:#00d4ff;">RD$ ${precioPromedio.toLocaleString()}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Precio Promedio</small>
                </div>
                <div style="background:linear-gradient(135deg, #ff44ff20, #ff44ff05); border:1px solid #ff44ff40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.5rem; font-weight:800; color:#ff44ff;">${totalLavados}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Lavados</small>
                </div>
            </div>`;

            planes.forEach((plan, index) => {
                const activoClass = plan.activo !== false ? '' : 'opacity:0.5; filter:grayscale(30%);';
                const precioPorLavado = plan.numeroLavados > 0 ? Math.round(plan.precio / plan.numeroLavados) : 0;
                let serviciosIncluidos = [];
                try { serviciosIncluidos = plan.descripcion ? JSON.parse(plan.descripcion) : []; } catch (e) { }

                const niveles = [
                    { nombre: 'Básico', color: '#888', icono: '🥉' },
                    { nombre: 'Intermedio', color: '#c0c0c0', icono: '🥈' },
                    { nombre: 'Premium', color: '#ffbb33', icono: '🥇' },
                    { nombre: 'Elite', color: '#ff44ff', icono: '👑' }
                ];
                const nivel = niveles[Math.min(index, niveles.length - 1)];

                html += `
                <div class="plan-card" style="background:linear-gradient(180deg, var(--bg-card, #131c2b) 0%, var(--bg-input, #0a0e14) 100%); border:2px solid ${nivel.color}30; border-radius:20px; overflow:hidden; transition:all 0.3s ease; ${activoClass}"
                    onmouseover="this.style.borderColor='${colorTaller}88'; this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px ${colorTaller}15';"
                    onmouseout="this.style.borderColor='${nivel.color}30'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    
                    <div style="height:4px; background:linear-gradient(90deg, ${nivel.color}, ${nivel.color}88, transparent);"></div>
                    
                    <div style="text-align:center; padding:20px 20px 10px;">
                        <span style="background:${nivel.color}18; padding:8px 16px; border-radius:20px; color:${nivel.color}; font-weight:600; font-size:0.7rem;">${nivel.icono} ${nivel.nombre}</span>
                        <h3 style="color:var(--text-primary, #fff); margin:12px 0 5px; font-size:1.1rem;">${plan.nombre}</h3>
                    </div>
                    
                    <div style="text-align:center; padding:10px 20px;">
                        <span style="font-size:2.2rem; font-weight:800; color:#ffbb33;">RD$ ${plan.precio?.toLocaleString()}</span>
                        <p style="color:var(--text-muted, #888); font-size:0.75rem; margin:2px 0 0;">por ${plan.duracionDias || 30} días</p>
                    </div>
                    
                    ${serviciosIncluidos.length > 0 ? `
                    <div style="margin:10px 20px; padding:15px; background:var(--bg-input, #080c14); border-radius:12px;">
                        <p style="color:#ffbb33; font-size:0.75rem; font-weight:600; margin:0 0 10px;">✅ ${serviciosIncluidos.length} Servicios Incluidos</p>
                        ${serviciosIncluidos.slice(0, 5).map(s => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--border-light, #1e2a3a22);">
                            <span style="color:var(--text-secondary, #aaa); font-size:0.78rem;">🔧 ${s.nombre}</span>
                            <span style="color:var(--text-muted, #888); font-size:0.7rem;">RD$ ${s.precio.toLocaleString()}</span>
                        </div>`).join('')}
                        ${serviciosIncluidos.length > 5 ? `<p style="color:var(--text-muted, #666); font-size:0.7rem; text-align:center; margin-top:8px;">+${serviciosIncluidos.length - 5} más</p>` : ''}
                    </div>` : ''}
                    
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:15px 20px; padding:15px; background:var(--bg-input, #080c14); border-radius:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:1.3rem; font-weight:700; color:${colorTaller};">${plan.serviciosIncluidos || 0}</div>
                            <small style="color:var(--text-muted, #888); font-size:0.6rem;">Servicios</small>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:1.3rem; font-weight:700; color:#00d4ff;">RD$ ${precioPorLavado.toLocaleString()}</div>
                            <small style="color:var(--text-muted, #888); font-size:0.6rem;">Por lavado</small>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:1.3rem; font-weight:700; color:#ff44ff;">${plan.numeroLavados || 0}</div>
                            <small style="color:var(--text-muted, #888); font-size:0.6rem;">🧽 Lavados</small>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:6px; padding:15px 20px; border-top:1px solid var(--border-color, #1e2a3a);">
                        <button onclick="event.stopPropagation(); window.editarPlan('${plan._id}')" 
                            style="flex:1; padding:10px; border:1px solid #ffbb33; border-radius:8px; background:transparent; color:#ffbb33; cursor:pointer; font-size:0.78rem; font-weight:500; transition:all 0.2s;"
                            onmouseover="this.style.background='#ffbb3318';"
                            onmouseout="this.style.background='transparent';">✏️ Editar</button>
                        <button onclick="event.stopPropagation(); window.eliminarPlanConfirmado('${plan._id}')" 
                            style="flex:1; padding:10px; border:1px solid #ff444440; border-radius:8px; background:transparent; color:#ff4444; cursor:pointer; font-size:0.78rem; font-weight:500; transition:all 0.2s;"
                            onmouseover="this.style.background='#ff444418';"
                            onmouseout="this.style.background='transparent';">🗑️ Eliminar</button>
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size:4rem; margin-bottom:15px;">📦</div>
                    <h3 style="color:var(--text-primary, #fff);">No hay planes creados</h3>
                    <p style="color:var(--text-secondary, #888); margin-bottom:20px;">Crea tu primer plan de servicios</p>
                    <button class="btn-add" onclick="window.abrirModalPlan()" style="padding:12px 25px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem;">+ Crear Primer Plan</button>
                </div>`;
        }
    } catch (error) {
        container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar planes</p>';
    }
}

// ================================================================
// 🔹 CALCULAR PRECIO TOTAL DEL PLAN
//    Precio = (Suma de servicios) × Número de lavados
// ================================================================

export function calcularPrecioPlan() {
    const servicios = window.serviciosPlanSeleccionados || [];
    const totalServicios = servicios.reduce((sum, s) => sum + (s.precio || 0), 0);
    const numLavados = parseInt(document.getElementById('plan-lavados')?.value) || 1;
    const precioFinal = totalServicios * numLavados;

    const inputPrecio = document.getElementById('plan-precio');
    if (inputPrecio) {
        inputPrecio.value = precioFinal;
        inputPrecio.style.color = '#ffbb33';
        inputPrecio.style.fontWeight = '700';
        inputPrecio.title = `💰 Desglose:\n• Total servicios: RD$ ${totalServicios.toLocaleString()}\n• Lavados: ${numLavados}\n• Precio total: RD$ ${precioFinal.toLocaleString()}\n\n✏️ Puedes ajustar manualmente`;
    }

    actualizarVistaPreviaPlan();

    if (totalServicios > 0) {
        window.mostrarToast?.(`💰 Precio: RD$ ${precioFinal.toLocaleString()} (${totalServicios.toLocaleString()} × ${numLavados})`, 'info', 2500);
    }
}

// ================================================================
// 🔹 ACTUALIZAR VISTA PREVIA DEL PLAN EN TIEMPO REAL
// ================================================================

export function actualizarVistaPreviaPlan() {
    const servicios = window.serviciosPlanSeleccionados || [];
    const nombre = document.getElementById('plan-nombre')?.value || 'Nombre del Plan';
    const precio = parseFloat(document.getElementById('plan-precio')?.value) || 0;
    const duracion = parseInt(document.getElementById('plan-duracion')?.value) || 30;
    const lavados = parseInt(document.getElementById('plan-lavados')?.value) || 0;
    const numServicios = parseInt(document.getElementById('plan-servicios')?.value) || servicios.length;
    const precioPorLavado = lavados > 0 ? Math.round(precio / lavados) : 0;

    const previewNombre = document.getElementById('preview-plan-nombre');
    if (previewNombre) previewNombre.textContent = nombre || 'Nombre del Plan';

    const previewPrecio = document.getElementById('preview-plan-precio');
    if (previewPrecio) previewPrecio.textContent = 'RD$ ' + precio.toLocaleString('es-DO');

    const previewDuracion = document.getElementById('preview-plan-duracion');
    if (previewDuracion) previewDuracion.textContent = 'por ' + duracion + ' días';

    // ✅ Actualizar lista de servicios en la vista previa
    const previewServicios = document.getElementById('preview-plan-servicios');
    if (previewServicios) {
        if (servicios.length > 0) {
            previewServicios.innerHTML = servicios.map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#aaa; font-size:0.78rem;">🔧 ${s.nombre}</span>
                    <span style="color:#888; font-size:0.72rem; font-weight:600;">RD$ ${s.precio.toLocaleString('es-DO')}</span>
                </div>
            `).join('');
        } else {
            previewServicios.innerHTML = `
                <div style="text-align:center; padding:15px; color:#666; font-size:0.8rem;">
                    <span style="font-size:2rem; display:block; margin-bottom:8px;">📋</span>
                    No hay servicios agregados
                </div>`;
        }
    }

    const previewNumServicios = document.getElementById('preview-plan-num-servicios');
    if (previewNumServicios) previewNumServicios.textContent = numServicios;

    const previewPorServicio = document.getElementById('preview-plan-por-servicio');
    if (previewPorServicio) previewPorServicio.textContent = 'RD$ ' + precioPorLavado.toLocaleString('es-DO');

    const previewLavados = document.getElementById('preview-plan-lavados');
    if (previewLavados) previewLavados.textContent = lavados;
}

// ================================================================
// 🔹 ABRIR MODAL PLAN
// ================================================================

export async function abrirModalPlan(planId = null) {
    // Limpiar servicios globales
    window.serviciosPlanSeleccionados = [];

    document.getElementById('plan-id').value = '';
    document.getElementById('plan-nombre').value = '';
    document.getElementById('plan-precio').value = '';
    document.getElementById('plan-servicios').value = '';
    document.getElementById('plan-lavados').value = '';
    document.getElementById('plan-duracion').value = '30';
    document.getElementById('btn-eliminar-plan').style.display = 'none';
    document.getElementById('modal-plan-titulo').textContent = 'Nuevo Plan';
    document.getElementById('modal-plan-icono').textContent = '📦';

    renderizarTagsPlan();

    if (planId) {
        document.getElementById('modal-plan-titulo').textContent = 'Editar Plan';
        document.getElementById('modal-plan-icono').textContent = '✏️';
        document.getElementById('btn-eliminar-plan').style.display = 'inline-block';
        await cargarDatosPlan(planId);
    }

    document.getElementById('modal-plan').style.display = 'flex';
    setTimeout(() => actualizarVistaPreviaPlan(), 100);
}

// ================================================================
// 🔹 AGREGAR SERVICIO AL PLAN
// ================================================================

export function agregarServicioAlPlan() {
    const select = document.getElementById('plan-servicios-select');
    const inputPrecio = document.getElementById('plan-servicio-precio');
    const valor = select?.value;
    const precio = parseFloat(inputPrecio?.value) || 0;

    if (!valor) {
        window.mostrarToast?.('⚠️ Selecciona un servicio', 'warning');
        return;
    }

    if (precio <= 0) {
        window.mostrarToast?.('⚠️ Ingresa un precio válido', 'warning');
        return;
    }

    if (window.serviciosPlanSeleccionados.find(s => s.nombre === valor)) {
        window.mostrarToast?.('⚠️ Este servicio ya fue agregado', 'warning');
        select.value = '';
        inputPrecio.value = '';
        return;
    }

    window.serviciosPlanSeleccionados.push({ nombre: valor, precio });
    select.value = '';
    inputPrecio.value = '';
    renderizarTagsPlan();
    actualizarConteoAutomatico();
    calcularPrecioPlan();
    actualizarVistaPreviaPlan();
}

// ================================================================
// 🔹 ELIMINAR SERVICIO DEL PLAN
// ================================================================

export function eliminarServicioPlan(index) {
    window.serviciosPlanSeleccionados.splice(index, 1);
    renderizarTagsPlan();
    actualizarConteoAutomatico();
    calcularPrecioPlan();
    actualizarVistaPreviaPlan();
}

// ================================================================
// 🔹 RENDERIZAR TAGS DE SERVICIOS
// ================================================================

function renderizarTagsPlan() {
    const container = document.getElementById('plan-servicios-container');
    if (!container) return;

    const servicios = window.serviciosPlanSeleccionados || [];

    if (servicios.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted, #666); font-size:0.85rem;">No se ha agregado ningún servicio...</span>';
        return;
    }

    container.innerHTML = servicios.map((s, i) => `
        <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,187,51,0.1); border:1px solid rgba(255,187,51,0.3); color:#ffbb33; padding:6px 12px; border-radius:20px; font-size:0.78rem; margin:3px;">
            🔧 ${s.nombre} <small style="color:var(--text-muted, #888);">(RD$ ${s.precio.toLocaleString()})</small>
            <span onclick="window.eliminarServicioPlan(${i})" style="cursor:pointer; color:#ff4444; font-weight:bold; font-size:1rem;">&times;</span>
        </span>`).join('');
}

// ================================================================
// 🔹 ACTUALIZAR CONTEO AUTOMÁTICO
// ================================================================

function actualizarConteoAutomatico() {
    const servicios = window.serviciosPlanSeleccionados || [];
    const inputValor = document.getElementById('plan-servicios-valor');
    if (inputValor) inputValor.value = JSON.stringify(servicios);

    const inputServicios = document.getElementById('plan-servicios');
    if (inputServicios) {
        const sugerido = servicios.length;
        if (sugerido > 0 && (!inputServicios.value || parseInt(inputServicios.value) < sugerido)) {
            inputServicios.value = sugerido;
            inputServicios.style.color = '#ffbb33';
            inputServicios.style.fontWeight = '700';
        }
    }
}

// ================================================================
// 🔹 CARGAR DATOS DEL PLAN
// ================================================================

async function cargarDatosPlan(planId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/planes`);
        const data = await response.json();
        const plan = data.planes?.find(p => p._id === planId);
        if (plan) {
            document.getElementById('plan-id').value = plan._id;
            document.getElementById('plan-nombre').value = plan.nombre || '';
            document.getElementById('plan-precio').value = plan.precio || '';
            document.getElementById('plan-servicios').value = plan.serviciosIncluidos || '';
            document.getElementById('plan-lavados').value = plan.numeroLavados || '';
            document.getElementById('plan-duracion').value = plan.duracionDias || 30;

            try { window.serviciosPlanSeleccionados = plan.descripcion ? JSON.parse(plan.descripcion) : []; }
            catch (e) { window.serviciosPlanSeleccionados = []; }

            renderizarTagsPlan();
            setTimeout(() => actualizarVistaPreviaPlan(), 150);
        }
    } catch (error) { console.error('Error:', error); }
}

// ================================================================
// 🔹 EDITAR PLAN
// ================================================================

export function editarPlan(planId) {
    abrirModalPlan(planId);
}

// ================================================================
// 🔹 GUARDAR PLAN
// ================================================================

export async function guardarPlan(event) {
    if (event && event.preventDefault) event.preventDefault();

    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    const id = document.getElementById('plan-id').value;
    const nombre = document.getElementById('plan-nombre').value.trim();
    const precio = parseFloat(document.getElementById('plan-precio').value);
    const serviciosIncluidos = parseInt(document.getElementById('plan-servicios').value);
    const numeroLavados = parseInt(document.getElementById('plan-lavados').value) || 0;
    const duracionDias = parseInt(document.getElementById('plan-duracion').value) || 30;
    const descripcion = window.serviciosPlanSeleccionados.length > 0 ? JSON.stringify(window.serviciosPlanSeleccionados) : '';

    if (!nombre || isNaN(precio) || isNaN(serviciosIncluidos)) {
        window.mostrarToast?.('⚠️ Completa todos los campos requeridos', 'warning');
        return;
    }

    const url = id ? `/talleres/${tallerActual._id}/planes/${id}` : `/talleres/${tallerActual._id}/planes`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await apiFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion, precio, serviciosIncluidos, duracionDias, numeroLavados })
        });
        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.(id ? '✅ Plan actualizado' : '✅ Plan creado', 'success');
            document.getElementById('modal-plan').style.display = 'none';
            cargarPlanes();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 ELIMINAR PLAN
// ================================================================

export function eliminarPlanConfirmado(planId) {
    if (confirm('¿Eliminar este plan?')) {
        eliminarPlan(planId);
    }
}

async function eliminarPlan(planId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const id = planId || document.getElementById('plan-id').value;
    if (!id) return;

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/planes/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.('🗑️ Plan eliminado', 'success');
            document.getElementById('modal-plan').style.display = 'none';
            cargarPlanes();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarPlanes() {
    window.cargarPlanes = cargarPlanes;
    window.abrirModalPlan = abrirModalPlan;
    window.editarPlan = editarPlan;
    window.guardarPlan = guardarPlan;
    window.eliminarPlanConfirmado = eliminarPlanConfirmado;
    window.agregarServicioAlPlan = agregarServicioAlPlan;
    window.eliminarServicioPlan = eliminarServicioPlan;
    window.actualizarVistaPreviaPlan = actualizarVistaPreviaPlan;
    window.calcularPrecioPlan = calcularPrecioPlan;
    console.log('📦 Módulo de Planes inicializado');
}