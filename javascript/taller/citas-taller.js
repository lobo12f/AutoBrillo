// ====================================================================
// 📅 MÓDULO DE CITAS - AUTOBRILLO DETALLING
//    Gestión de citas con cards premium, KPIs y actualización suave
// ====================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
let citasVistas = new Set(JSON.parse(localStorage.getItem('citas_vistas') || '[]'));

// ================================================================
// 🔹 CARGAR CITAS
// ================================================================

export async function cargarCitas() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('citas-taller-lista');
    if (!container) return;

    const fechaFiltroNotif = sessionStorage.getItem('filtro_cita_fecha');
    if (fechaFiltroNotif) {
        const filtroFecha = document.getElementById('filtro-fecha');
        if (filtroFecha) filtroFecha.value = fechaFiltroNotif;
        sessionStorage.removeItem('filtro_cita_fecha');
    }

    container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">⏳ Cargando citas...</p>';

    if (!tallerActual || !tallerActual._id) {
        container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error: Sesión no válida</p>';
        return;
    }

    try {
        const estadoFiltro = document.getElementById('filtro-estado')?.value || 'TODAS';
        const fechaFiltro = document.getElementById('filtro-fecha')?.value || '';

        const response = await apiFetch(`/talleres/${tallerActual._id}/citas`);
        const data = await response.json();

        if (!data.exito || !data.citas) {
            container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">No hay citas disponibles</p>';
            return;
        }

        let citas = data.citas;

        if (estadoFiltro && estadoFiltro !== 'TODAS') {
            citas = citas.filter(c => c.estado === estadoFiltro);
        }

        if (fechaFiltro) {
            citas = citas.filter(c => {
                const fechaCita = c.fechas?.cita ? new Date(c.fechas.cita).toISOString().split('T')[0] : c.fecha;
                return fechaCita === fechaFiltro;
            });
        }

        citas.forEach(cita => citasVistas.add(cita._id));
        localStorage.setItem('citas_vistas', JSON.stringify([...citasVistas]));

        if (citas.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">No hay citas con los filtros actuales</p>';
            return;
        }

        const pendientes = citas.filter(c => c.estado === 'PENDIENTE').length;
        const confirmadas = citas.filter(c => c.estado === 'CONFIRMADA').length;
        const enProceso = citas.filter(c => c.estado === 'EN_PROCESO').length;
        const listas = citas.filter(c => c.estado === 'LISTO').length;
        const entregadas = citas.filter(c => c.estado === 'ENTREGADO').length;

        let html = `
        <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
            ${pendientes > 0 ? `<div style="flex:1; background:linear-gradient(135deg, #ff880015, #ff880005); border:1px solid #ff880030; border-radius:12px; padding:14px; text-align:center; min-width:100px;"><div style="font-size:1.6rem; font-weight:800; color:#ff8800;">${pendientes}</div><small style="color:var(--text-muted, #888); font-size:0.7rem;">⏳ Pendientes</small></div>` : ''}
            ${confirmadas > 0 ? `<div style="flex:1; background:linear-gradient(135deg, #00d4ff15, #00d4ff05); border:1px solid #00d4ff30; border-radius:12px; padding:14px; text-align:center; min-width:100px;"><div style="font-size:1.6rem; font-weight:800; color:#00d4ff;">${confirmadas}</div><small style="color:var(--text-muted, #888); font-size:0.7rem;">✅ Confirmadas</small></div>` : ''}
            ${enProceso > 0 ? `<div style="flex:1; background:linear-gradient(135deg, #ffbb3315, #ffbb3305); border:1px solid #ffbb3330; border-radius:12px; padding:14px; text-align:center; min-width:100px;"><div style="font-size:1.6rem; font-weight:800; color:#ffbb33;">${enProceso}</div><small style="color:var(--text-muted, #888); font-size:0.7rem;">🔧 En Proceso</small></div>` : ''}
            ${listas > 0 ? `<div style="flex:1; background:linear-gradient(135deg, #ff44ff15, #ff44ff05); border:1px solid #ff44ff30; border-radius:12px; padding:14px; text-align:center; min-width:100px;"><div style="font-size:1.6rem; font-weight:800; color:#ff44ff;">${listas}</div><small style="color:var(--text-muted, #888); font-size:0.7rem;">✨ Listos</small></div>` : ''}
            ${entregadas > 0 ? `<div style="flex:1; background:linear-gradient(135deg, #00ff8815, #00ff8805); border:1px solid #00ff8830; border-radius:12px; padding:14px; text-align:center; min-width:100px;"><div style="font-size:1.6rem; font-weight:800; color:#00ff88;">${entregadas}</div><small style="color:var(--text-muted, #888); font-size:0.7rem;">✅ Entregadas</small></div>` : ''}
        </div>`;

        citas.forEach(cita => {
            const v = cita.vehiculo || {};
            const fechaCita = cita.fechas?.cita ? new Date(cita.fechas.cita).toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' }) : (cita.fecha || 'S/F');
            const horaCita = cita.hora || '--:--';
            const cliente = cita.clienteId?.nombre || 'Cliente';
            const servicio = cita.servicio?.nombre || 'Servicio';
            const estadoColor = {
                'PENDIENTE': '#ff8800', 'CONFIRMADA': '#00d4ff', 'EN_RECEPCION': '#ffbb33',
                'EN_PROCESO': '#00d4ff', 'LISTO': '#ff44ff', 'ENTREGADO': '#00ff88', 'CANCELADA': '#888'
            };
            const eColor = estadoColor[cita.estado] || '#888';

            let botones = '';
            if (cita.estado === 'PENDIENTE') {
                botones = `<button class="cita-btn cita-btn-confirmar" onclick="window.accion?.('confirmar','${cita._id}')">✅ Confirmar</button>
                           <button class="cita-btn cita-btn-cancelar" onclick="window.accion?.('cancelar','${cita._id}')">❌ Rechazar</button>`;
            } else if (cita.estado === 'CONFIRMADA') {
                botones = `<button class="cita-btn cita-btn-recibir" onclick="window.accion?.('recibir','${cita._id}')">📥 Recibir</button>`;
            } else if (cita.estado === 'EN_RECEPCION') {
                botones = `<button class="cita-btn cita-btn-iniciar" onclick="window.accion?.('iniciar','${cita._id}')">🔧 Iniciar</button>`;
            } else if (cita.estado === 'EN_PROCESO') {
                botones = `<button class="cita-btn cita-btn-finalizar" onclick="window.accion?.('finalizar','${cita._id}')">✅ Finalizar</button>`;
            } else if (cita.estado === 'LISTO') {
                botones = `<span class="cita-badge-listo">⏳ Esperando confirmación</span>`;
            }

            botones += `<button class="cita-btn cita-btn-fotos" onclick="event.stopPropagation(); window.gestionFotos?.abrir('${cita._id}')">📷 Fotos</button>`;

            html += `
            <div class="cita-card" style="border-left-color:${eColor};">
                <div class="cita-card-header">
                    <div class="cita-card-vehiculo">🚗 ${v.marca || ''} ${v.modelo || ''} <small>(${v.placa || 'S/P'})</small></div>
                    <span class="cita-card-estado" style="background:${eColor}15; color:${eColor};">${cita.estado}</span>
                </div>
                <div class="cita-card-info">📅 ${fechaCita} | 🕐 ${horaCita}<br>👤 ${cliente} | 🔧 ${servicio}</div>
                ${botones ? `<div class="cita-card-actions">${botones}</div>` : ''}
            </div>`;
        });

        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar citas</p>';
    }
}

// ================================================================
// 🔹 ACCIÓN SOBRE CITA (confirmar, cancelar, recibir, iniciar, finalizar, entregar)
// ================================================================

export async function accion(accion, citaId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    if (accion === 'finalizar') {
        if (!confirm('✅ ¿Finalizar trabajo?')) return;
        try {
            const r = await apiFetch(`/talleres/citas/${citaId}/finalizar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const d = await r.json();
            if (!d.exito) { window.mostrarToast?.('❌ ' + (d.mensaje || 'Error'), 'error'); return; }

            const respCitas = await apiFetch(`/talleres/${tallerActual._id}/citas`);
            const dataCitas = await respCitas.json();
            const cita = dataCitas.citas?.find(c => c._id === citaId);

            if (cita?.bahiaAsignada) {
                await apiFetch(`/talleres/${tallerActual._id}/bahias/${cita.bahiaAsignada}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'DISPONIBLE', empleadoAsignado: null }) });
            }
            if (cita?.empleadoAsignado) {
                await apiFetch(`/talleres/${tallerActual._id}/empleados/${cita.empleadoAsignado._id || cita.empleadoAsignado}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'DISPONIBLE' }) });
            }

            window.mostrarToast?.('✅ Trabajo finalizado', 'success');
            await cargarCitas();
            if (typeof cargarDashboard === 'function') await cargarDashboard();
            if (typeof cargarBahias === 'function') await cargarBahias();
            if (typeof cargarEmpleados === 'function') await cargarEmpleados();
        } catch (e) { window.mostrarToast?.('❌ Error: ' + e.message, 'error'); }
        return;
    }

    if (accion === 'confirmar') {
        if (!confirm('¿Confirmar cita?')) return;
        await apiFetch(`/talleres/citas/${citaId}/confirmar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        window.mostrarToast?.('✅ Cita confirmada', 'success');
        await cargarCitas();
        if (typeof cargarDashboard === 'function') await cargarDashboard();
        if (typeof cargarBahias === 'function') await cargarBahias();
    }

    if (accion === 'cancelar') {
        const motivo = prompt('Motivo de cancelación:');
        if (!motivo) return;
        await apiFetch(`/talleres/citas/${citaId}/cancelar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo, canceladoPor: 'TALLER' }) });
        window.mostrarToast?.('❌ Cita cancelada', 'success');
        await cargarCitas();
        if (typeof cargarBahias === 'function') await cargarBahias();
    }

    if (accion === 'recibir') {
        await apiFetch(`/talleres/citas/${citaId}/recepcion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        window.mostrarToast?.('📥 Vehículo recibido', 'success');
        await cargarCitas();
        if (typeof cargarDashboard === 'function') await cargarDashboard();
        if (typeof cargarBahias === 'function') await cargarBahias();
    }

    if (accion === 'iniciar') {
        await modalAsignar(citaId);
        await cargarCitas();
        if (typeof cargarDashboard === 'function') await cargarDashboard();
        if (typeof cargarBahias === 'function') await cargarBahias();
        if (typeof cargarEmpleados === 'function') await cargarEmpleados();
    }

    if (accion === 'entregar') {
        if (!confirm('¿Entregar vehículo al cliente?')) return;
        try {
            const r = await apiFetch(`/talleres/citas/${citaId}/entregar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const d = await r.json();
            if (!d.exito) { window.mostrarToast?.('❌ ' + (d.mensaje || 'Error'), 'error'); return; }

            const respCitas = await apiFetch(`/talleres/${tallerActual._id}/citas`);
            const dataCitas = await respCitas.json();
            const cita = dataCitas.citas?.find(c => c._id === citaId);

            if (cita?.bahiaAsignada) {
                await apiFetch(`/talleres/${tallerActual._id}/bahias/${cita.bahiaAsignada}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'DISPONIBLE', empleadoAsignado: null }) });
            }
            if (cita?.empleadoAsignado) {
                await apiFetch(`/talleres/${tallerActual._id}/empleados/${cita.empleadoAsignado._id || cita.empleadoAsignado}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'DISPONIBLE' }) });
            }

            window.mostrarToast?.('🎉 Vehículo entregado', 'success');
            await cargarCitas();
            if (typeof cargarDashboard === 'function') await cargarDashboard();
            if (typeof cargarHistorial === 'function') await cargarHistorial();
            if (typeof cargarBahias === 'function') await cargarBahias();
            if (typeof cargarEmpleados === 'function') await cargarEmpleados();
        } catch (e) { window.mostrarToast?.('❌ Error: ' + e.message, 'error'); }
    }
}

// ================================================================
// 🔹 ACTUALIZAR CITAS SUAVE (sin parpadeo, detecta nuevas)
// ================================================================

export async function actualizarCitasSuave() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const seccionCitas = document.getElementById('citas');
        if (!seccionCitas || !seccionCitas.classList.contains('active')) return;

        const response = await apiFetch(`/talleres/${tallerActual._id}/citas`);
        const data = await response.json();
        if (!data.exito) return;

        data.citas.forEach(cita => {
            if (!citasVistas.has(cita._id) && cita.estado === 'PENDIENTE') {
                if (typeof crearNotificacion === 'function') {
                    crearNotificacion({
                        tipo: 'NUEVA_CITA',
                        titulo: '📅 Nueva Cita Recibida',
                        mensaje: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''} (${cita.vehiculo?.placa || 'S/P'}) - ${cita.fecha} ${cita.hora}`,
                        citaId: cita._id,
                        fechaCita: cita.fecha
                    });
                }
            }
            citasVistas.add(cita._id);
        });

        localStorage.setItem('citas_vistas', JSON.stringify([...citasVistas]));
    } catch (error) { /* silencioso */ }
}

// ================================================================
// 🔹 MODAL ASIGNAR TRABAJO
// ================================================================

async function modalAsignar(citaId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';

    try {
        const [respEmp, respBah] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/empleados`),
            apiFetch(`/talleres/${tallerActual._id}/bahias`)
        ]);
        const dataEmp = await respEmp.json();
        const dataBah = await respBah.json();
        const empleados = dataEmp.empleados?.filter(e => e.estado === 'DISPONIBLE') || [];
        const bahias = dataBah.bahias?.filter(b => b.estado === 'DISPONIBLE') || [];

        if (empleados.length === 0) { window.mostrarToast?.('⚠️ No hay empleados disponibles', 'warning'); return; }
        if (bahias.length === 0) { window.mostrarToast?.('⚠️ No hay bahías disponibles', 'warning'); return; }

        let empleadoSeleccionado = null;
        let bahiaSeleccionada = null;

        const modal = document.createElement('div');
        modal.id = 'modal-asignar';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';

        modal.innerHTML = `
        <div style="background:#0f1621; border:1px solid #1e2a3a; border-radius:20px; padding:30px; width:600px; max-height:85vh; overflow-y:auto;">
            
            <!-- Header -->
            <div style="text-align:center; margin-bottom:25px; position:relative;">
                <span onclick="document.getElementById('modal-asignar').remove()" 
                    style="position:absolute; top:-5px; right:0; font-size:1.2rem; cursor:pointer; color:#888; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:all 0.3s;"
                    onmouseover="this.style.background='#ff444422'; this.style.color='#ff4444';"
                    onmouseout="this.style.background='transparent'; this.style.color='#888';">✕</span>
                <div style="width:50px; height:50px; background:${colorTaller}18; border:2px solid ${colorTaller}; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto 10px;">🔧</div>
                <h3 style="color:#fff; margin:0; font-size:1rem; font-weight:700;">Asignar Trabajo</h3>
                <p style="color:#888; font-size:0.72rem; margin:4px 0 0;">Selecciona un empleado y una bahía</p>
            </div>

            <!-- Sección Empleados -->
            <label style="color:#aaa; font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:10px;">👨‍🔧 Empleado</label>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:8px; margin-bottom:25px; max-height:200px; overflow-y:auto;">
                ${empleados.map(emp => `
                <div class="asignar-card" data-empleado="${emp._id}" 
                    style="position:relative; background:rgba(255,255,255,0.02); border:2px solid #1e2a3a; border-radius:12px; padding:12px; cursor:pointer; transition:all 0.25s; text-align:center;"
                    onmouseover="if(!this.classList.contains('sel')){this.style.borderColor='${colorTaller}60';}"
                    onmouseout="if(!this.classList.contains('sel')){this.style.borderColor='#1e2a3a';}"
                    onclick="seleccionarCardAsignacion(this, 'empleado')">
                    <div style="position:absolute; top:8px; right:8px; display:none;" class="check-mark">
                        <span style="background:${colorTaller}; color:#000; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700;">✓</span>
                    </div>
                    ${emp.fotoPerfil ? `
                    <img src="${emp.fotoPerfil}" style="width:45px; height:45px; border-radius:12px; object-fit:cover; border:2px solid ${colorTaller}55; margin:0 auto 8px; display:block;"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="width:45px; height:45px; border-radius:12px; background:${colorTaller}18; border:2px solid ${colorTaller}55; display:${emp.fotoPerfil ? 'none' : 'flex'}; align-items:center; justify-content:center; font-weight:700; color:${colorTaller}; font-size:1.1rem; margin:0 auto 8px;">${emp.nombre.charAt(0)}</div>
                    ` : `
                    <div style="width:45px; height:45px; border-radius:12px; background:${colorTaller}18; border:2px solid ${colorTaller}55; display:flex; align-items:center; justify-content:center; font-weight:700; color:${colorTaller}; font-size:1.1rem; margin:0 auto 8px;">${emp.nombre.charAt(0)}</div>
                    `}
                    <div style="color:#fff; font-weight:600; font-size:0.8rem;">${emp.nombre}</div>
                    <div style="color:#888; font-size:0.65rem;">${emp.rol || 'LAVADOR'}</div>
                </div>`).join('')}
            </div>

            <!-- Sección Bahías -->
            <label style="color:#aaa; font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:10px;">🏗️ Bahía</label>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px; margin-bottom:25px;">
                ${bahias.map(bahia => `
                <div class="asignar-card" data-bahia="${bahia.numero}" 
                    style="position:relative; background:rgba(255,255,255,0.02); border:2px solid #1e2a3a; border-radius:12px; padding:14px; cursor:pointer; transition:all 0.25s; text-align:center;"
                    onmouseover="if(!this.classList.contains('sel')){this.style.borderColor='${colorTaller}60';}"
                    onmouseout="if(!this.classList.contains('sel')){this.style.borderColor='#1e2a3a';}"
                    onclick="seleccionarCardAsignacion(this, 'bahia')">
                    <div style="position:absolute; top:8px; right:8px; display:none;" class="check-mark">
                        <span style="background:${colorTaller}; color:#000; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700;">✓</span>
                    </div>
                    <div style="font-size:1.5rem; margin-bottom:4px;">🏗️</div>
                    <div style="color:#fff; font-weight:700; font-size:0.85rem;">#${bahia.numero}</div>
                    <div style="color:#888; font-size:0.6rem;">${bahia.nombre || 'Bahía ' + bahia.numero}</div>
                </div>`).join('')}
            </div>

            <!-- Botones -->
            <div style="display:flex; gap:8px; padding-top:15px; border-top:1px solid #1e2a3a;">
                <button onclick="document.getElementById('modal-asignar').remove()" 
                    style="flex:1; padding:13px; background:transparent; border:1px solid #333; color:#fff; border-radius:10px; cursor:pointer; font-size:0.8rem;">Cancelar</button>
                <button id="btn-confirmar-asignacion" 
                    style="flex:2; padding:13px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.85rem;">🔧 INICIAR TRABAJO</button>
            </div>
        </div>
        <style>@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }</style>`;

        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

        // Función global para seleccionar cards
        window.seleccionarCardAsignacion = function (elemento, tipo) {
            // Quitar selección de cards del mismo tipo
            const cards = document.querySelectorAll(`.asignar-card[data-${tipo}]`);
            cards.forEach(card => {
                card.classList.remove('sel');
                card.style.borderColor = '#1e2a3a';
                card.style.background = 'rgba(255,255,255,0.02)';
                const check = card.querySelector('.check-mark');
                if (check) check.style.display = 'none';
            });

            // Seleccionar esta card
            elemento.classList.add('sel');
            elemento.style.borderColor = colorTaller;
            elemento.style.background = colorTaller + '10';
            const check = elemento.querySelector('.check-mark');
            if (check) check.style.display = 'block';

            if (tipo === 'empleado') {
                empleadoSeleccionado = elemento.dataset.empleado;
            } else {
                bahiaSeleccionada = elemento.dataset.bahia;
            }
        };

        document.getElementById('btn-confirmar-asignacion').onclick = async function () {
            if (!empleadoSeleccionado || !bahiaSeleccionada) {
                window.mostrarToast?.('⚠️ Selecciona empleado y bahía', 'warning');
                return;
            }

            try {
                const resp = await apiFetch(`/talleres/citas/${citaId}/iniciar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ empleadoId: empleadoSeleccionado, bahiaNumero: parseInt(bahiaSeleccionada) })
                });
                const data = await resp.json();

                if (data.exito) {
                    await apiFetch(`/talleres/${tallerActual._id}/empleados/${empleadoSeleccionado}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'OCUPADO' }) });
                    await apiFetch(`/talleres/${tallerActual._id}/bahias/${bahiaSeleccionada}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'OCUPADA', empleadoAsignado: empleadoSeleccionado }) });
                    document.getElementById('modal-asignar')?.remove();
                    window.mostrarToast?.('🔧 Trabajo iniciado', 'success');
                    cargarCitas();
                    if (typeof cargarDashboard === 'function') cargarDashboard();
                    if (typeof cargarBahias === 'function') cargarBahias();
                    if (typeof cargarEmpleados === 'function') cargarEmpleados();
                } else {
                    window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
                }
            } catch (e) {
                window.mostrarToast?.('❌ Error de conexión', 'error');
            }
        };
    } catch (e) {
        window.mostrarToast?.('❌ Error al cargar datos', 'error');
    }
}
// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarCitas() {
    window.cargarCitas = cargarCitas;
    window.accion = accion;
    window.actualizarCitasSuave = actualizarCitasSuave;
    console.log('📅 Módulo de Citas inicializado');
}