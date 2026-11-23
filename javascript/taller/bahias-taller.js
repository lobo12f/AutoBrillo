// ====================================================================
// 🏗️ MÓDULO DE BAHÍAS - AUTOBRILLO DETALLING
//    Gestión de bahías con cards profesionales, actualización suave y KPIs
// ====================================================================

// ================================================================
// 🔹 CARGAR BAHÍAS
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';

export async function cargarBahias() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('bahias-admin');
    if (!container) return;

    if (container.children.length === 0 || container.querySelector('.empty-state')) {
        container.innerHTML = '<p class="empty-state" style="color:var(--text-secondary, #888); text-align:center; padding:40px;">⏳ Cargando bahías...</p>';
    }

    try {
        const [respBahias, respCitas] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/bahias`),
            apiFetch(`/talleres/${tallerActual._id}/citas`)
        ]);
        const dataBahias = await respBahias.json();
        const dataCitas = await respCitas.json();

        if (dataBahias.exito && dataBahias.bahias.length > 0) {
            // KPIs
            const total = dataBahias.bahias.length;
            const disponibles = dataBahias.bahias.filter(b => b.estado === 'DISPONIBLE').length;
            const ocupadas = dataBahias.bahias.filter(b => b.estado === 'OCUPADA').length;
            const mantenimiento = dataBahias.bahias.filter(b => b.estado === 'MANTENIMIENTO').length;

            container.innerHTML = `
                <!-- KPIs -->
                <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-bottom:15px;">
                    <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:12px; padding:14px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:${colorTaller};">${total}</div>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Bahías</small>
                    </div>
                    <div style="background:linear-gradient(135deg, #00ff8820, #00ff8805); border:1px solid #00ff8840; border-radius:12px; padding:14px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#00ff88;">${disponibles}</div>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Disponibles</small>
                    </div>
                    <div style="background:linear-gradient(135deg, #ff444420, #ff444405); border:1px solid #ff444440; border-radius:12px; padding:14px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#ff4444;">${ocupadas}</div>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Ocupadas</small>
                    </div>
                    <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:1px solid #ffbb3340; border-radius:12px; padding:14px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#ffbb33;">${mantenimiento}</div>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Mantenimiento</small>
                    </div>
                </div>
                ${renderizarBahiasHTML(dataBahias.bahias, dataCitas.citas || [], colorTaller)}
            `;
        } else {
            container.innerHTML = `
                <div style="text-align:center; padding:60px;">
                    <div style="font-size:4rem; margin-bottom:15px;">🏗️</div>
                    <h3 style="color:var(--text-primary, #fff);">No hay bahías configuradas</h3>
                    <p style="color:var(--text-secondary, #888); margin-bottom:20px;">Crea tu primera bahía para comenzar</p>
                    <button class="btn-add" onclick="window.abrirModalNuevaBahia()" style="padding:12px 25px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem;">+ Crear Primera Bahía</button>
                </div>`;
        }
    } catch (error) {
        if (container.querySelector('.empty-state')) {
            container.innerHTML = '<p class="empty-state" style="color:#ff4444; text-align:center; padding:40px;">Error al cargar bahías</p>';
        }
    }
}

// ================================================================
// 🔹 ACTUALIZAR BAHÍAS SUAVE (sin parpadeo)
// ================================================================

export async function actualizarBahiasSuave() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const container = document.getElementById('bahias-admin');
    if (!container) return;

    try {
        const [respBahias, respCitas] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/bahias`),
            apiFetch(`/talleres/${tallerActual._id}/citas`)
        ]);
        const dataBahias = await respBahias.json();
        const dataCitas = await respCitas.json();
        if (!dataBahias.exito) return;

        const tarjetasExistentes = container.querySelectorAll('.bahia-admin-card');
        if (tarjetasExistentes.length === 0 || tarjetasExistentes.length !== dataBahias.bahias.length) {
            await cargarBahias();
            return;
        }

        dataBahias.bahias.forEach(bahia => {
            const tarjeta = container.querySelector(`[data-bahia-numero="${bahia.numero}"]`);
            if (!tarjeta) { cargarBahias(); return; }

            const citaEnBahia = dataCitas.citas?.find(c => c.bahiaAsignada === bahia.numero && ['EN_RECEPCION', 'EN_PROCESO'].includes(c.estado));
            const estadoColor = bahia.estado === 'DISPONIBLE' ? '#00ff88' : bahia.estado === 'OCUPADA' ? '#ff4444' : '#ffbb33';
            const estadoIcono = bahia.estado === 'DISPONIBLE' ? '🟢' : bahia.estado === 'OCUPADA' ? '🔴' : '🟡';

            tarjeta.style.transition = 'all 0.5s ease';
            tarjeta.style.borderColor = estadoColor + '44';
            tarjeta.style.borderLeftColor = estadoColor;

            const estadoSpan = tarjeta.querySelector('.bahia-estado-badge');
            if (estadoSpan) {
                const nuevoTexto = `${estadoIcono} ${bahia.estado}`;
                if (estadoSpan.textContent.trim() !== nuevoTexto.trim()) {
                    estadoSpan.style.opacity = '0';
                    setTimeout(() => {
                        estadoSpan.innerHTML = nuevoTexto;
                        estadoSpan.style.background = estadoColor + '22';
                        estadoSpan.style.color = estadoColor;
                        estadoSpan.style.opacity = '1';
                    }, 200);
                }
            }

            const empEl = tarjeta.querySelector('.bahia-empleado');
            if (empEl) {
                const nuevoEmp = bahia.empleadoAsignado?.nombre || 'Sin asignar';
                if (empEl.textContent.trim() !== nuevoEmp) {
                    empEl.style.opacity = '0';
                    setTimeout(() => { empEl.textContent = nuevoEmp; empEl.style.opacity = '1'; }, 200);
                }
            }

            const vehEl = tarjeta.querySelector('.bahia-vehiculo');
            if (vehEl) {
                const nuevoVeh = citaEnBahia ? `${citaEnBahia.vehiculo?.marca || ''} ${citaEnBahia.vehiculo?.modelo || ''} (${citaEnBahia.vehiculo?.placa || 'S/P'})` : 'Ninguno';
                if (vehEl.textContent.trim() !== nuevoVeh) {
                    vehEl.style.opacity = '0';
                    setTimeout(() => { vehEl.textContent = nuevoVeh; vehEl.style.opacity = '1'; }, 200);
                }
            }
        });
    } catch (error) { /* silencioso */ }
}

// ================================================================
// 🔹 RENDERIZAR BAHÍAS HTML
// ================================================================

function renderizarBahiasHTML(bahias, citas, colorTaller) {
    return bahias.map((bahia, index) => {
        const citaEnBahia = citas.find(c => c.bahiaAsignada === bahia.numero && ['EN_RECEPCION', 'EN_PROCESO'].includes(c.estado));
        const estadoColor = bahia.estado === 'DISPONIBLE' ? '#00ff88' : bahia.estado === 'OCUPADA' ? '#ff4444' : '#ffbb33';
        const estadoIcono = bahia.estado === 'DISPONIBLE' ? '🟢' : bahia.estado === 'OCUPADA' ? '🔴' : '🟡';
        const estadoBg = bahia.estado === 'DISPONIBLE' ? '#00ff8810' : bahia.estado === 'OCUPADA' ? '#ff444410' : '#ffbb3310';
        const empleadoNombre = bahia.empleadoAsignado?.nombre || '—';
        const vehiculoEnBahia = citaEnBahia ? `${citaEnBahia.vehiculo?.marca || ''} ${citaEnBahia.vehiculo?.modelo || ''}`.trim() : null;
        const placaEnBahia = citaEnBahia?.vehiculo?.placa || null;
        const servicioEnBahia = citaEnBahia?.servicio?.nombre || null;
        const clienteEnBahia = citaEnBahia?.clienteId?.nombre || null;
        const tiempoTranscurrido = citaEnBahia?.fechas?.inicioTrabajo ? calcularTiempoTranscurrido(citaEnBahia.fechas.inicioTrabajo) : '';
        const citaId = citaEnBahia?._id || '';
        const horaInicio = citaEnBahia?.fechas?.inicioTrabajo ? new Date(citaEnBahia.fechas.inicioTrabajo).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
        <div class="bahia-admin-card" data-bahia-numero="${bahia.numero}" style="
            background:var(--bg-card, #131c2b);
            border:1px solid var(--border-color, #1e2a3a);
            border-radius:18px;
            overflow:hidden;
            transition:all 0.3s ease;
        " onmouseover="this.style.borderColor='${colorTaller}60'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)';"
           onmouseout="this.style.borderColor='var(--border-color, #1e2a3a)'; this.style.boxShadow='none';">
            
            <!-- HEADER -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; background:${estadoBg}; border-bottom:1px solid ${estadoColor}20;">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="window.editarBahia('${bahia._id || bahia.numero}')">
                    <div style="width:40px; height:40px; background:${estadoColor}20; border:2px solid ${estadoColor}50; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">🏗️</div>
                    <div>
                        <h4 style="margin:0; color:var(--text-primary, #fff); font-size:0.95rem; font-weight:700;">${bahia.nombre || 'Bahía #' + bahia.numero}</h4>
                        <span style="color:var(--text-muted, #888); font-size:0.7rem;">${formatearTipo(bahia.tipo)}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span style="background:${estadoColor}20; color:${estadoColor}; padding:4px 12px; border-radius:15px; font-size:0.7rem; font-weight:600;">${estadoIcono} ${bahia.estado}</span>
                </div>
            </div>
            
            <!-- CUERPO -->
            <div style="padding:16px 18px;">
                ${citaEnBahia ? `
                <!-- TRABAJO ACTIVO -->
                <div style="margin-bottom:14px;">
                    <!-- Vehículo y tiempo -->
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                        <div style="flex:1;">
                            <p style="color:var(--text-primary, #fff); font-size:0.9rem; font-weight:600; margin:0 0 3px;">🚗 ${vehiculoEnBahia || 'N/A'}</p>
                            ${placaEnBahia ? `<p style="color:var(--text-muted, #888); font-size:0.7rem; margin:0;">🏷️ ${placaEnBahia}</p>` : ''}
                        </div>
                        <div style="text-align:center; background:var(--bg-input, #080c14); padding:8px 12px; border-radius:10px;">
                            <p style="color:#ffbb33; font-weight:700; font-size:0.85rem; margin:0;">${tiempoTranscurrido}</p>
                            <small style="color:var(--text-muted, #666); font-size:0.55rem;">transcurrido</small>
                        </div>
                    </div>
                    
                    <!-- Grid de info -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                        <div style="background:var(--bg-input, #080c14); border-radius:8px; padding:8px 10px;">
                            <small style="color:var(--text-muted, #666); font-size:0.55rem; display:block;">🔧 SERVICIO</small>
                            <span style="color:#ffbb33; font-size:0.75rem; font-weight:500;">${servicioEnBahia || '—'}</span>
                        </div>
                        <div style="background:var(--bg-input, #080c14); border-radius:8px; padding:8px 10px;">
                            <small style="color:var(--text-muted, #666); font-size:0.55rem; display:block;">👤 CLIENTE</small>
                            <span style="color:var(--text-secondary, #aaa); font-size:0.75rem;">${clienteEnBahia || '—'}</span>
                        </div>
                    </div>
                    
                    <!-- Empleado e inicio -->
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#00d4ff; font-size:0.75rem;">👨‍🔧 ${empleadoNombre}</span>
                        <span style="color:var(--text-muted, #888); font-size:0.7rem;">Inicio: ${horaInicio}</span>
                    </div>
                </div>
                ` : `
                <!-- DISPONIBLE -->
                <div style="text-align:center; padding:25px 10px; margin-bottom:14px;">
                    <div style="font-size:3rem; margin-bottom:8px;">🏗️</div>
                    <p style="color:${colorTaller}; font-weight:600; font-size:0.9rem; margin:0;">Bahía Disponible</p>
                    <p style="color:var(--text-muted, #888); font-size:0.7rem; margin:4px 0 0;">Sin vehículo asignado</p>
                </div>
                `}
                
                <!-- BOTONES -->
                <div style="display:flex; gap:6px; align-items:center;">
                    ${citaEnBahia && citaEnBahia.estado === 'EN_PROCESO' ? `
                    <button onclick="event.stopPropagation(); window.finalizarTrabajoDesdeBahia('${citaId}', ${bahia.numero})" 
                        style="flex:1; padding:10px 14px; background:${colorTaller}; color:#000; border:none; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:600; transition:all 0.2s;"
                        onmouseover="this.style.opacity='0.9';"
                        onmouseout="this.style.opacity='1';">
                        ✅ Finalizar
                    </button>` : ''}
                    <button onclick="event.stopPropagation(); window.cambiarEstadoBahia('${bahia._id || bahia.numero}', 'DISPONIBLE')" 
                        style="padding:8px 10px; border:1px solid ${bahia.estado === 'DISPONIBLE' ? '#00ff88' : '#333'}; border-radius:6px; background:${bahia.estado === 'DISPONIBLE' ? '#00ff8820' : 'transparent'}; color:${bahia.estado === 'DISPONIBLE' ? '#00ff88' : '#666'}; cursor:pointer; font-size:0.7rem; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='#00ff88'; this.style.color='#00ff88';"
                        onmouseout="this.style.borderColor='${bahia.estado === 'DISPONIBLE' ? '#00ff88' : '#333'}'; this.style.color='${bahia.estado === 'DISPONIBLE' ? '#00ff88' : '#666'}';"
                        title="Disponible">🟢</button>
                    <button onclick="event.stopPropagation(); window.cambiarEstadoBahia('${bahia._id || bahia.numero}', 'OCUPADA')" 
                        style="padding:8px 10px; border:1px solid ${bahia.estado === 'OCUPADA' ? '#ff4444' : '#333'}; border-radius:6px; background:${bahia.estado === 'OCUPADA' ? '#ff444420' : 'transparent'}; color:${bahia.estado === 'OCUPADA' ? '#ff4444' : '#666'}; cursor:pointer; font-size:0.7rem; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='#ff4444'; this.style.color='#ff4444';"
                        onmouseout="this.style.borderColor='${bahia.estado === 'OCUPADA' ? '#ff4444' : '#333'}'; this.style.color='${bahia.estado === 'OCUPADA' ? '#ff4444' : '#666'}';"
                        title="Ocupada">🔴</button>
                    <button onclick="event.stopPropagation(); window.cambiarEstadoBahia('${bahia._id || bahia.numero}', 'MANTENIMIENTO')" 
                        style="padding:8px 10px; border:1px solid ${bahia.estado === 'MANTENIMIENTO' ? '#ffbb33' : '#333'}; border-radius:6px; background:${bahia.estado === 'MANTENIMIENTO' ? '#ffbb3320' : 'transparent'}; color:${bahia.estado === 'MANTENIMIENTO' ? '#ffbb33' : '#666'}; cursor:pointer; font-size:0.7rem; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='#ffbb33'; this.style.color='#ffbb33';"
                        onmouseout="this.style.borderColor='${bahia.estado === 'MANTENIMIENTO' ? '#ffbb33' : '#333'}'; this.style.color='${bahia.estado === 'MANTENIMIENTO' ? '#ffbb33' : '#666'}';"
                        title="Mantenimiento">🟡</button>
                    <button onclick="event.stopPropagation(); window.editarBahia('${bahia._id || bahia.numero}')" 
                        style="padding:8px 10px; border:1px solid #333; border-radius:6px; background:transparent; color:#666; cursor:pointer; font-size:0.7rem; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='#fff'; this.style.color='#fff';"
                        onmouseout="this.style.borderColor='#333'; this.style.color='#666';"
                        title="Editar">✏️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}
// ================================================================
// 🔹 FUNCIONES AUXILIARES
// ================================================================

function formatearTipo(tipo) {
    const tipos = { 'LAVADO_RAPIDO': '🚿 Lavado Rápido', 'LAVADO_COMPLETO': '🧼 Lavado Completo', 'DETALLADO': '✨ Detallado', 'PULIDO': '💎 Pulido', 'GENERAL': '🔧 General' };
    return tipos[tipo] || tipo || 'General';
}

function calcularTiempoTranscurrido(fechaInicio) {
    const inicio = new Date(fechaInicio);
    const ahora = new Date();
    const diffMin = Math.floor((ahora - inicio) / 60000);
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `${diffMin} min`;
    const horas = Math.floor(diffMin / 60);
    const min = diffMin % 60;
    return `${horas}h ${min}m`;
}

// ================================================================
// 🔹 ABRIR MODAL NUEVA BAHÍA
// ================================================================

export async function abrirModalNuevaBahia() {
    document.getElementById('modal-bahia-titulo').textContent = '🆕 Nueva Bahía';
    document.getElementById('bahia-id').value = '';
    document.getElementById('bahia-numero').value = '';
    document.getElementById('bahia-nombre').value = '';
    document.getElementById('bahia-tipo').value = 'GENERAL';
    document.getElementById('bahia-estado').value = 'DISPONIBLE';
    document.getElementById('btn-eliminar-bahia').style.display = 'none';

    // Cargar empleados para el select
    await cargarEmpleadosEnSelect();

    document.getElementById('modal-bahia').style.display = 'flex';
}

// ================================================================
// 🔹 EDITAR BAHÍA
// ================================================================

export async function editarBahia(bahiaId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/bahias`);
        const data = await response.json();
        const bahia = data.bahias.find(b => (b._id || b.numero.toString()) === bahiaId);
        if (!bahia) return;

        document.getElementById('modal-bahia-titulo').textContent = '✏️ Editar Bahía';
        document.getElementById('bahia-id').value = bahia._id || bahia.numero;
        document.getElementById('bahia-numero').value = bahia.numero;
        document.getElementById('bahia-nombre').value = bahia.nombre || '';
        document.getElementById('bahia-tipo').value = bahia.tipo || 'GENERAL';
        document.getElementById('bahia-estado').value = bahia.estado || 'DISPONIBLE';
        document.getElementById('btn-eliminar-bahia').style.display = 'inline-block';

        await cargarEmpleadosEnSelect(bahia.empleadoAsignado?._id);

        document.getElementById('modal-bahia').style.display = 'flex';
    } catch (error) {
        window.mostrarToast?.('Error al cargar bahía', 'error');
    }
}

// ================================================================
// 🔹 CARGAR EMPLEADOS EN SELECT
// ================================================================

async function cargarEmpleadosEnSelect(seleccionado = null) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const select = document.getElementById('bahia-empleado');
    if (!select) return;

    try {
        const resp = await apiFetch(`/talleres/${tallerActual._id}/empleados`);
        const data = await resp.json();
        if (data.exito) {
            select.innerHTML = '<option value="">Sin asignar</option>' +
                data.empleados.map(e => `<option value="${e._id}" ${seleccionado === e._id ? 'selected' : ''}>${e.nombre}</option>`).join('');
        }
    } catch (e) { /* silencioso */ }
}

// ================================================================
// 🔹 GUARDAR BAHÍA
// ================================================================

export async function guardarBahia(event) {
    if (event && event.preventDefault) event.preventDefault();
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    const id = document.getElementById('bahia-id').value;
    const empleadoId = document.getElementById('bahia-empleado')?.value || null;

    const datos = {
        numero: parseInt(document.getElementById('bahia-numero').value),
        nombre: document.getElementById('bahia-nombre').value,
        tipo: document.getElementById('bahia-tipo').value,
        estado: document.getElementById('bahia-estado').value
    };

    if (empleadoId) datos.empleadoAsignado = empleadoId;

    try {
        const endpoint = id
            ? `/talleres/${tallerActual._id}/bahias/${id}`
            : `/talleres/${tallerActual._id}/bahias`;
        const method = id ? 'PUT' : 'POST';
        const response = await apiFetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.(id ? '✅ Bahía actualizada' : '✅ Bahía creada', 'success');
            document.getElementById('modal-bahia').style.display = 'none';
            cargarBahias();
            if (typeof cargarDashboard === 'function') cargarDashboard();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 CAMBIAR ESTADO BAHÍA
// ================================================================

export async function cambiarEstadoBahia(bahiaId, nuevoEstado) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        await apiFetch(`/talleres/${tallerActual._id}/bahias/${bahiaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        cargarBahias();
        if (typeof cargarDashboard === 'function') cargarDashboard();
    } catch (error) {
        window.mostrarToast?.('❌ Error al cambiar estado', 'error');
    }
}

// ================================================================
// 🔹 SELECCIONAR TIPO DE BAHÍA (UI Interactiva)
// ================================================================

export function seleccionarTipoBahia(tipo, elemento) {
    // Actualizar hidden input
    document.getElementById('bahia-tipo').value = tipo;

    // Actualizar estilos de cards
    document.querySelectorAll('#selector-tipo-bahia > div').forEach(card => {
        card.classList.remove('activo');
        card.style.borderColor = 'var(--border-color, #1e2a3a)';
        card.style.background = 'transparent';
        card.style.color = 'var(--text-secondary, #aaa)';
        card.style.transform = 'scale(1)';
    });

    // Resaltar seleccionado
    elemento.classList.add('activo');
    elemento.style.borderColor = 'var(--accent-color, #00ff88)';
    elemento.style.background = 'var(--accent-bg, rgba(0,255,136,0.08))';
    elemento.style.color = 'var(--accent-color, #00ff88)';
    elemento.style.transform = 'scale(1.05)';
    elemento.style.fontWeight = '600';
}

// Agregar en inicializarBahias:
window.seleccionarTipoBahia = seleccionarTipoBahia;

// ================================================================
// 🔹 ELIMINAR BAHÍA
// ================================================================

export async function eliminarBahia() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const id = document.getElementById('bahia-id').value;

    if (!id || !confirm('¿Eliminar esta bahía?')) return;

    try {
        await apiFetch(`/talleres/${tallerActual._id}/bahias/${id}`, { method: 'DELETE' });
        window.mostrarToast?.('🗑️ Bahía eliminada', 'success');
        document.getElementById('modal-bahia').style.display = 'none';
        cargarBahias();
        if (typeof cargarDashboard === 'function') cargarDashboard();
    } catch (error) {
        window.mostrarToast?.('❌ Error al eliminar', 'error');
    }
}

// ================================================================
// 🔹 FINALIZAR TRABAJO DESDE BAHÍA
// ================================================================
export async function finalizarTrabajoDesdeBahia(citaId, bahiaNumero) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    if (!confirm('✅ ¿Finalizar trabajo y liberar la Bahía #' + bahiaNumero + '?')) return;

    try {
        const response = await apiFetch(`/talleres/citas/${citaId}/finalizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notas: `Finalizado desde Bahía #${bahiaNumero} - ${new Date().toLocaleString('es-DO')}`,
                bahiaNumero: bahiaNumero  // ✅ Enviar el número de bahía
            })
        });

        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.(`✅ Trabajo finalizado - Bahía #${bahiaNumero} liberada`, 'success');

            // ✅ Refrescar todas las vistas
            cargarBahias();
            if (typeof cargarDashboard === 'function') cargarDashboard();
            if (typeof cargarCitas === 'function') cargarCitas();
            if (typeof cargarEmpleados === 'function') cargarEmpleados();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}
// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarBahias() {
    window.cargarBahias = cargarBahias;
    window.actualizarBahiasSuave = actualizarBahiasSuave;
    window.abrirModalNuevaBahia = abrirModalNuevaBahia;
    window.editarBahia = editarBahia;
    window.guardarBahia = guardarBahia;
    window.cambiarEstadoBahia = cambiarEstadoBahia;
    window.eliminarBahia = eliminarBahia;
    window.finalizarTrabajoDesdeBahia = finalizarTrabajoDesdeBahia;
    console.log('🏗️ Módulo de Bahías inicializado');
}