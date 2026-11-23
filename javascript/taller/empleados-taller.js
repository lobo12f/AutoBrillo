// ====================================================================
// 👥 MÓDULO DE EMPLEADOS - AUTOBRILLO DETALLING
//    Gestión de empleados con cards profesionales, KPIs y actualización suave
// ====================================================================

// ================================================================
// 🔹 CARGAR EMPLEADOS
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';

export async function cargarEmpleados() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('empleados-lista');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--text-secondary, #888); text-align:center; padding:40px;">⏳ Cargando empleados...</p>';

    try {
        const [respEmpleados, respHistorial, respCitas] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/empleados`),
            apiFetch(`/talleres/${tallerActual._id}/historial`),
            apiFetch(`/talleres/${tallerActual._id}/citas`)
        ]);

        const dataEmpleados = await respEmpleados.json();
        const dataHistorial = await respHistorial.json();
        const dataCitas = await respCitas.json();

        if (dataEmpleados.exito && dataEmpleados.empleados.length > 0) {
            const empleados = dataEmpleados.empleados;

            const activos = empleados.filter(e => e.estado === 'DISPONIBLE' || e.estado === 'OCUPADO').length;
            const disponibles = empleados.filter(e => e.estado === 'DISPONIBLE').length;
            const ocupados = empleados.filter(e => e.estado === 'OCUPADO').length;

            let html = `
            <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:10px;" id="kpi-empleados">
                <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:12px; padding:14px; text-align:center;">
                    <div class="kpi-total" style="font-size:1.5rem; font-weight:800; color:${colorTaller};">${empleados.length}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Empleados</small>
                </div>
                <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:1px solid #00d4ff40; border-radius:12px; padding:14px; text-align:center;">
                    <div class="kpi-activos" style="font-size:1.5rem; font-weight:800; color:#00d4ff;">${activos}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Activos</small>
                </div>
                <div style="background:linear-gradient(135deg, #00ff8820, #00ff8805); border:1px solid #00ff8840; border-radius:12px; padding:14px; text-align:center;">
                    <div class="kpi-disponibles" style="font-size:1.5rem; font-weight:800; color:#00ff88;">${disponibles}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Disponibles</small>
                </div>
                <div style="background:linear-gradient(135deg, #ff444420, #ff444405); border:1px solid #ff444440; border-radius:12px; padding:14px; text-align:center;">
                    <div class="kpi-ocupados" style="font-size:1.5rem; font-weight:800; color:#ff4444;">${ocupados}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Ocupados</small>
                </div>
            </div>`;

            empleados.forEach((emp, index) => {
                const estadoColor = emp.estado === 'DISPONIBLE' ? '#00ff88' : emp.estado === 'OCUPADO' ? '#ff4444' : emp.estado === 'DESCANSANDO' ? '#ffbb33' : '#888';
                const estadoIcono = emp.estado === 'DISPONIBLE' ? '🟢' : emp.estado === 'OCUPADO' ? '🔴' : emp.estado === 'DESCANSANDO' ? '🟡' : '⚪';
                const rolIcono = emp.rol === 'LAVADOR' ? '🧽' : emp.rol === 'DETALLADOR' ? '✨' : emp.rol === 'SUPERVISOR' ? '👁️' : '👔';
                const historialEmpleado = dataHistorial.historial?.filter(h => String(h.empleadoAsignado?._id || h.empleadoAsignado || '') === String(emp._id || '')) || [];
                const totalCompletados = historialEmpleado.length;
                const hoy = new Date().toISOString().split('T')[0];
                const trabajosHoy = dataCitas.citas?.filter(c => String(c.empleadoAsignado?._id || c.empleadoAsignado) === String(emp._id) && c.fecha === hoy).length || 0;
                const trabajoActual = dataCitas.citas?.find(c => String(c.empleadoAsignado?._id || c.empleadoAsignado) === String(emp._id) && ['EN_RECEPCION', 'EN_PROCESO'].includes(c.estado));
                const vehiculoActual = trabajoActual ? `${trabajoActual.vehiculo?.marca || ''} ${trabajoActual.vehiculo?.modelo || ''}` : null;
                const placaActual = trabajoActual?.vehiculo?.placa || null;
                const bahiaActual = trabajoActual?.bahiaAsignada || null;
                const calificaciones = historialEmpleado.filter(h => h.calificacion?.puntuacion).map(h => h.calificacion.puntuacion);
                const calificacionPromedio = calificaciones.length > 0 ? (calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length).toFixed(1) : '—';

                html += `
                <div class="empleado-card" data-empleado-id="${emp._id}" style="background:linear-gradient(180deg, var(--bg-card, #131c2b) 0%, var(--bg-input, #0a0e14) 100%); border:1px solid var(--border-color, #1e2a3a); border-radius:20px; overflow:hidden; cursor:pointer; position:relative; transition:all 0.3s ease;"
                    onmouseover="this.style.borderColor='${colorTaller}'; this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px ${colorTaller}20';"
                    onmouseout="this.style.borderColor='var(--border-color, #1e2a3a)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';"
                    onclick="window.editarEmpleado('${emp._id}')">
                    
                    <div style="height:4px; background:linear-gradient(90deg, ${estadoColor}, ${estadoColor}88, transparent);"></div>
                    
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px 10px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <!-- ✅ AVATAR CON FOTO DE PERFIL O ICONO -->
                        ${emp.fotoPerfil ? `
                        <img src="${emp.fotoPerfil}" class="foto-empleado" style="width:55px; height:55px; border-radius:16px; object-fit:cover; border:2px solid ${estadoColor}55;"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="avatar-empleado" style="width:55px; height:55px; background:linear-gradient(135deg, ${estadoColor}33, ${estadoColor}08); border:2px solid ${estadoColor}55; border-radius:16px; display:none; align-items:center; justify-content:center; font-size:1.8rem; position:relative;">
                            ${rolIcono}
                            <span style="position:absolute; bottom:-3px; right:-3px; width:14px; height:14px; background:${estadoColor}; border:2px solid var(--bg-card, #131c2b); border-radius:50%;"></span>
                        </div>` : `
                        <div class="avatar-empleado" style="width:55px; height:55px; background:linear-gradient(135deg, ${estadoColor}33, ${estadoColor}08); border:2px solid ${estadoColor}55; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; position:relative;">
                            ${rolIcono}
                            <span style="position:absolute; bottom:-3px; right:-3px; width:14px; height:14px; background:${estadoColor}; border:2px solid var(--bg-card, #131c2b); border-radius:50%;"></span>
                        </div>`}
                            <div>
                                <h3 style="margin:0; font-size:1rem; color:var(--text-primary, #fff); font-weight:700;">${emp.nombre}</h3>
                                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                                    <span style="background:${colorTaller}18; color:${colorTaller}; padding:2px 10px; border-radius:10px; font-size:0.7rem; font-weight:500;">${emp.rol}</span>
                                    <span class="badge-estado" style="background:${estadoColor}18; color:${estadoColor}; padding:2px 10px; border-radius:10px; font-size:0.7rem; font-weight:600;">${estadoIcono} ${emp.estado}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.5rem; font-weight:800; color:${colorTaller};">#${index + 1}</div>
                            <small style="color:var(--text-muted, #666); font-size:0.55rem;">RANKING</small>
                        </div>
                    </div>
                    
                    <div style="padding:0 20px 15px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; padding:12px; background:var(--bg-input, #080c14); border-radius:12px;">
                            <div>
                                <small style="color:var(--text-muted, #666); font-size:0.55rem; text-transform:uppercase; letter-spacing:0.5px;">🎯 Especialidad</small>
                                <p style="margin:3px 0 0; color:#ffbb33; font-size:0.78rem; font-weight:500;">${emp.especialidades?.[0] || 'General'}</p>
                            </div>
                            <div>
                                <small style="color:var(--text-muted, #666); font-size:0.55rem; text-transform:uppercase; letter-spacing:0.5px;">📧 Contacto</small>
                                <p style="margin:3px 0 0; color:var(--text-secondary, #aaa); font-size:0.72rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.email || 'N/D'}</p>
                            </div>
                        </div>
                        
                        <div class="trabajo-actual" style="${trabajoActual ? `background:linear-gradient(135deg, ${estadoColor}12, ${estadoColor}03); border:1px solid ${estadoColor}33;` : `background:${colorTaller}06; border:1px solid ${colorTaller}18;`} border-radius:12px; padding:12px; margin-bottom:12px; ${trabajoActual ? '' : 'text-align:center;'}">
                            ${trabajoActual ? `
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                                <span style="font-size:1.2rem;">🚗</span>
                                <span style="color:var(--text-primary, #fff); font-weight:600; font-size:0.85rem;">${vehiculoActual}</span>
                            </div>
                            <div style="display:flex; gap:12px;">
                                ${placaActual ? `<span style="color:var(--text-secondary, #888); font-size:0.7rem;">🏷️ ${placaActual}</span>` : ''}
                                ${bahiaActual ? `<span style="color:#ffbb33; font-size:0.7rem;">🏗️ Bahía #${bahiaActual}</span>` : ''}
                            </div>` :
                        `<p style="color:${colorTaller}; margin:0; font-weight:600; font-size:0.85rem;">✨ ${emp.estado}</p>`}
                        </div>
                        
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:12px;">
                            <div style="text-align:center; padding:10px 5px; background:var(--bg-input, #080c14); border-radius:10px;">
                                <p class="contador-hoy" style="font-size:1.3rem; font-weight:800; color:${colorTaller}; margin:0;">${trabajosHoy}</p>
                                <small style="color:var(--text-muted, #666); font-size:0.6rem;">HOY</small>
                                <div style="background:#1a1a1a; border-radius:2px; height:3px; margin-top:4px; overflow:hidden;">
                                    <div style="background:${colorTaller}; height:100%; width:${Math.min(trabajosHoy * 20, 100)}%; border-radius:2px;"></div>
                                </div>
                            </div>
                            <div style="text-align:center; padding:10px 5px; background:var(--bg-input, #080c14); border-radius:10px;">
                                <p style="font-size:1.3rem; font-weight:800; color:#00d4ff; margin:0;">${totalCompletados}</p>
                                <small style="color:var(--text-muted, #666); font-size:0.6rem;">TOTAL</small>
                                <div style="background:#1a1a1a; border-radius:2px; height:3px; margin-top:4px; overflow:hidden;">
                                    <div style="background:#00d4ff; height:100%; width:${Math.min(totalCompletados * 5, 100)}%; border-radius:2px;"></div>
                                </div>
                            </div>
                            <div style="text-align:center; padding:10px 5px; background:var(--bg-input, #080c14); border-radius:10px;">
                                <p style="font-size:1.3rem; font-weight:800; color:#ffbb33; margin:0;">${calificacionPromedio}</p>
                                <small style="color:var(--text-muted, #666); font-size:0.6rem;">⭐ CALIF.</small>
                                <div style="background:#1a1a1a; border-radius:2px; height:3px; margin-top:4px; overflow:hidden;">
                                    <div style="background:#ffbb33; height:100%; width:${calificacionPromedio !== '—' ? Math.min(parseFloat(calificacionPromedio) * 20, 100) : 0}%; border-radius:2px;"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="display:flex; gap:5px; margin-bottom:8px;">
                            <button onclick="event.stopPropagation(); window.cambiarEstadoEmpleado('${emp._id}', 'DISPONIBLE')" style="flex:1; padding:8px 4px; border:1px solid #00ff8840; border-radius:8px; background:transparent; color:#00ff88; cursor:pointer; font-size:0.65rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='#00ff8818'; this.style.borderColor='#00ff88';" onmouseout="this.style.background='transparent'; this.style.borderColor='#00ff8840';" title="Disponible">🟢</button>
                            <button onclick="event.stopPropagation(); window.cambiarEstadoEmpleado('${emp._id}', 'OCUPADO')" style="flex:1; padding:8px 4px; border:1px solid #ff444440; border-radius:8px; background:transparent; color:#ff4444; cursor:pointer; font-size:0.65rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='#ff444418'; this.style.borderColor='#ff4444';" onmouseout="this.style.background='transparent'; this.style.borderColor='#ff444440';" title="Ocupado">🔴</button>
                            <button onclick="event.stopPropagation(); window.cambiarEstadoEmpleado('${emp._id}', 'DESCANSANDO')" style="flex:1; padding:8px 4px; border:1px solid #ffbb3340; border-radius:8px; background:transparent; color:#ffbb33; cursor:pointer; font-size:0.65rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='#ffbb3318'; this.style.borderColor='#ffbb33';" onmouseout="this.style.background='transparent'; this.style.borderColor='#ffbb3340';" title="Descansando">🟡</button>
                            <button onclick="event.stopPropagation(); window.cambiarEstadoEmpleado('${emp._id}', 'INACTIVO')" style="flex:1; padding:8px 4px; border:1px solid #88888840; border-radius:8px; background:transparent; color:#888; cursor:pointer; font-size:0.65rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='#88888818'; this.style.borderColor='#888';" onmouseout="this.style.background='transparent'; this.style.borderColor='#88888840';" title="Inactivo">⚪</button>
                        </div>
                        
                        <button onclick="event.stopPropagation(); window.verHistorialEmpleado('${emp._id}')" style="width:100%; padding:10px; border:1px solid #00d4ff30; border-radius:10px; background:transparent; color:#00d4ff; cursor:pointer; font-size:0.75rem; font-weight:500; transition:all 0.3s;" onmouseover="this.style.background='#00d4ff10'; this.style.borderColor='#00d4ff';" onmouseout="this.style.background='transparent'; this.style.borderColor='#00d4ff30';">
                            📋 Ver Historial Completo
                        </button>
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size:4rem; margin-bottom:15px;">👥</div>
                    <h3 style="color:var(--text-primary, #fff);">No hay empleados registrados</h3>
                    <p style="color:var(--text-secondary, #888); margin-bottom:20px;">Agrega tu primer empleado para comenzar</p>
                    <button class="btn-add" onclick="window.abrirModalNuevoEmpleado()" style="padding:12px 25px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem;">+ Contratar Primer Empleado</button>
                </div>`;
        }
    } catch (error) {
        container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar empleados</p>';
    }
}

// ================================================================
// 🔹 ACTUALIZAR EMPLEADOS SUAVE (sin parpadeo)
// ================================================================

export async function actualizarEmpleadosSuave() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const container = document.getElementById('empleados-lista');
    if (!container) return;

    try {
        const [respEmpleados, respCitas] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/empleados`),
            apiFetch(`/talleres/${tallerActual._id}/citas`)
        ]);

        const dataEmpleados = await respEmpleados.json();
        const dataCitas = await respCitas.json();
        if (!dataEmpleados.exito) return;

        const hoy = new Date().toISOString().split('T')[0];
        const colorTaller = tallerActual?.color || '#00ff88';

        dataEmpleados.empleados.forEach(emp => {
            const card = document.querySelector(`.empleado-card[data-empleado-id="${emp._id}"]`);
            if (!card) return;

            const estadoColor = emp.estado === 'DISPONIBLE' ? '#00ff88' : emp.estado === 'OCUPADO' ? '#ff4444' : emp.estado === 'DESCANSANDO' ? '#ffbb33' : '#888';
            const estadoIcono = emp.estado === 'DISPONIBLE' ? '🟢' : emp.estado === 'OCUPADO' ? '🔴' : emp.estado === 'DESCANSANDO' ? '🟡' : '⚪';

            const badge = card.querySelector('.badge-estado');
            if (badge) {
                badge.style.background = estadoColor + '18';
                badge.style.color = estadoColor;
                badge.textContent = estadoIcono + ' ' + emp.estado;
            }

            const avatar = card.querySelector('.avatar-empleado');
            if (avatar) {
                avatar.style.background = `linear-gradient(135deg, ${estadoColor}33, ${estadoColor}08)`;
                avatar.style.borderColor = estadoColor + '55';
            }

            const trabajoActual = dataCitas.citas?.find(c => String(c.empleadoAsignado?._id || c.empleadoAsignado) === String(emp._id) && ['EN_RECEPCION', 'EN_PROCESO'].includes(c.estado));
            const trabajoDiv = card.querySelector('.trabajo-actual');
            if (trabajoDiv) {
                if (trabajoActual) {
                    const v = `${trabajoActual.vehiculo?.marca || ''} ${trabajoActual.vehiculo?.modelo || ''}`;
                    trabajoDiv.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                            <span style="font-size:1.2rem;">🚗</span>
                            <span style="color:var(--text-primary, #fff); font-weight:600; font-size:0.85rem;">${v}</span>
                        </div>
                        <div style="display:flex; gap:12px;">
                            ${trabajoActual.vehiculo?.placa ? `<span style="color:var(--text-secondary, #888); font-size:0.7rem;">🏷️ ${trabajoActual.vehiculo.placa}</span>` : ''}
                            ${trabajoActual.bahiaAsignada ? `<span style="color:#ffbb33; font-size:0.7rem;">🏗️ Bahía #${trabajoActual.bahiaAsignada}</span>` : ''}
                        </div>`;
                    trabajoDiv.style.background = `linear-gradient(135deg, ${estadoColor}12, ${estadoColor}03)`;
                    trabajoDiv.style.border = `1px solid ${estadoColor}33`;
                    trabajoDiv.style.textAlign = 'left';
                } else {
                    trabajoDiv.innerHTML = `<p style="color:${colorTaller}; margin:0; font-weight:600; font-size:0.85rem;">✨ Disponible para trabajar</p>`;
                    trabajoDiv.style.background = colorTaller + '06';
                    trabajoDiv.style.border = '1px solid ' + colorTaller + '18';
                    trabajoDiv.style.textAlign = 'center';
                }
            }

            const trabajosHoy = dataCitas.citas?.filter(c => String(c.empleadoAsignado?._id || c.empleadoAsignado) === String(emp._id) && c.fecha === hoy).length || 0;
            const contadorHoy = card.querySelector('.contador-hoy');
            if (contadorHoy) contadorHoy.textContent = trabajosHoy;
        });

    } catch (error) { /* silencioso */ }
}

// ================================================================
// 🔹 ACTUALIZAR KPIs SIN RECARGAR
// ================================================================

async function actualizarKPIsEmpleados() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const resp = await apiFetch(`/talleres/${tallerActual._id}/empleados`);
        const data = await resp.json();
        if (!data.exito) return;

        const empleados = data.empleados;
        const activos = empleados.filter(e => e.estado === 'DISPONIBLE' || e.estado === 'OCUPADO').length;
        const disponibles = empleados.filter(e => e.estado === 'DISPONIBLE').length;
        const ocupados = empleados.filter(e => e.estado === 'OCUPADO').length;

        const kpiTotal = document.querySelector('.kpi-total');
        const kpiActivos = document.querySelector('.kpi-activos');
        const kpiDisponibles = document.querySelector('.kpi-disponibles');
        const kpiOcupados = document.querySelector('.kpi-ocupados');

        if (kpiTotal) kpiTotal.textContent = empleados.length;
        if (kpiActivos) kpiActivos.textContent = activos;
        if (kpiDisponibles) kpiDisponibles.textContent = disponibles;
        if (kpiOcupados) kpiOcupados.textContent = ocupados;
    } catch (e) { /* silencioso */ }
}

// ================================================================
// 🔹 CAMBIAR ESTADO EMPLEADO (SIN RECARGAR)
// ================================================================

export async function cambiarEstadoEmpleado(empleadoId, nuevoEstado) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || '#00ff88';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/empleados/${empleadoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const data = await response.json();

        if (data.exito) {
            const estadoColor = nuevoEstado === 'DISPONIBLE' ? '#00ff88' : nuevoEstado === 'OCUPADO' ? '#ff4444' : nuevoEstado === 'DESCANSANDO' ? '#ffbb33' : '#888';
            const estadoIcono = nuevoEstado === 'DISPONIBLE' ? '🟢' : nuevoEstado === 'OCUPADO' ? '🔴' : nuevoEstado === 'DESCANSANDO' ? '🟡' : '⚪';

            const card = document.querySelector(`.empleado-card[data-empleado-id="${empleadoId}"]`);
            if (card) {
                const badge = card.querySelector('.badge-estado');
                if (badge) {
                    badge.style.background = estadoColor + '18';
                    badge.style.color = estadoColor;
                    badge.textContent = estadoIcono + ' ' + nuevoEstado;
                }

                const avatar = card.querySelector('.avatar-empleado');
                if (avatar) {
                    avatar.style.background = `linear-gradient(135deg, ${estadoColor}33, ${estadoColor}08)`;
                    avatar.style.borderColor = estadoColor + '55';
                }

                const trabajoDiv = card.querySelector('.trabajo-actual');
                if (trabajoDiv) {
                    if (nuevoEstado === 'DISPONIBLE') {
                        trabajoDiv.innerHTML = `<p style="color:${colorTaller}; margin:0; font-weight:600; font-size:0.85rem;">✨ Disponible para trabajar</p>`;
                        trabajoDiv.style.background = colorTaller + '06';
                        trabajoDiv.style.border = '1px solid ' + colorTaller + '18';
                        trabajoDiv.style.textAlign = 'center';
                    } else if (nuevoEstado === 'OCUPADO') {
                        trabajoDiv.innerHTML = `<p style="color:#ff4444; margin:0; font-weight:600; font-size:0.85rem;">🔴 Ocupado</p>`;
                        trabajoDiv.style.background = '#ff444410';
                        trabajoDiv.style.border = '1px solid #ff444433';
                        trabajoDiv.style.textAlign = 'center';
                    } else if (nuevoEstado === 'DESCANSANDO') {
                        trabajoDiv.innerHTML = `<p style="color:#ffbb33; margin:0; font-weight:600; font-size:0.85rem;">🟡 Descansando</p>`;
                        trabajoDiv.style.background = '#ffbb3310';
                        trabajoDiv.style.border = '1px solid #ffbb3333';
                        trabajoDiv.style.textAlign = 'center';
                    } else if (nuevoEstado === 'INACTIVO') {
                        trabajoDiv.innerHTML = `<p style="color:#888; margin:0; font-weight:600; font-size:0.85rem;">⚪ Inactivo</p>`;
                        trabajoDiv.style.background = '#88888810';
                        trabajoDiv.style.border = '1px solid #88888833';
                        trabajoDiv.style.textAlign = 'center';
                    }
                }
            }

            actualizarKPIsEmpleados();
            window.mostrarToast?.(`✅ Estado cambiado a ${nuevoEstado}`, 'success');
        } else {
            window.mostrarToast?.('❌ Error al cambiar estado', 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 ABRIR MODAL NUEVO EMPLEADO
// ================================================================

export function abrirModalNuevoEmpleado() {
    document.getElementById('modal-empleado-titulo').textContent = '👨‍🔧 Nuevo Empleado';
    document.getElementById('empleado-id').value = '';
    document.getElementById('empleado-nombre').value = '';
    document.getElementById('empleado-email').value = '';
    document.getElementById('empleado-password').value = '';
    document.getElementById('empleado-password').required = true;
    document.getElementById('empleado-rol').value = 'LAVADOR';
    document.getElementById('empleado-especialidad').value = '';
    document.getElementById('empleado-estado').value = 'DISPONIBLE';
    document.getElementById('btn-eliminar-empleado').style.display = 'none';
    document.getElementById('modal-empleado').style.display = 'flex';
    // Limpiar foto
    const fotoPreview = document.getElementById('preview-foto-empleado');
    const fotoPlaceholder = document.getElementById('foto-placeholder');
    if (fotoPreview) fotoPreview.style.display = 'none';
    if (fotoPlaceholder) fotoPlaceholder.style.display = 'flex';
    window._fotoEmpleadoTemporal = null;
}

// ================================================================
// 🔹 EDITAR EMPLEADO
// ================================================================

export async function editarEmpleado(empleadoId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/empleados`);
        const data = await response.json();
        const emp = data.empleados.find(e => e._id === empleadoId);
        if (!emp) return;
        // Cargar foto de perfil
        const fotoPreview = document.getElementById('preview-foto-empleado');
        const fotoPlaceholder = document.getElementById('foto-placeholder');
        if (emp.fotoPerfil && fotoPreview) {
            fotoPreview.src = emp.fotoPerfil;
            fotoPreview.style.display = 'block';
            if (fotoPlaceholder) fotoPlaceholder.style.display = 'none';
        } else if (fotoPlaceholder) {
            fotoPlaceholder.style.display = 'flex';
        }
        window._fotoEmpleadoTemporal = null;

        document.getElementById('modal-empleado-titulo').textContent = '✏️ Editar Empleado';
        document.getElementById('empleado-id').value = emp._id;
        document.getElementById('empleado-nombre').value = emp.nombre || '';
        document.getElementById('empleado-email').value = emp.email || '';
        document.getElementById('empleado-password').value = '';
        document.getElementById('empleado-password').required = false;
        document.getElementById('empleado-rol').value = emp.rol || 'LAVADOR';
        document.getElementById('empleado-estado').value = emp.estado || 'DISPONIBLE';
        document.getElementById('btn-eliminar-empleado').style.display = 'inline-block';
        document.getElementById('modal-empleado').style.display = 'flex';
    } catch (error) {
        window.mostrarToast?.('Error al cargar empleado', 'error');
    }
}

// ================================================================
// 🔹 GUARDAR EMPLEADO
// ================================================================

export async function guardarEmpleado(event) {
    if (event && event.preventDefault) event.preventDefault();
    console.log('🟢 guardarEmpleado INICIADO');

    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const id = document.getElementById('empleado-id').value;
    const nombre = document.getElementById('empleado-nombre').value.trim();
    const email = document.getElementById('empleado-email').value.trim();
    const password = document.getElementById('empleado-password').value;
    const rol = document.getElementById('empleado-rol').value;
    const especialidad = document.getElementById('empleado-especialidad')?.value || '';
    const estado = document.getElementById('empleado-estado').value;

    if (!nombre || !email) { window.mostrarToast?.('⚠️ Nombre y email son requeridos.', 'warning'); return; }
    if (!id && !password) { window.mostrarToast?.('⚠️ La contraseña es requerida para nuevos empleados.', 'warning'); return; }
    if (!id && password.length < 6) { window.mostrarToast?.('⚠️ La contraseña debe tener al menos 6 caracteres.', 'warning'); return; }

    // ✅ Usar foto base64 directamente
    const fotoUrl = window._fotoEmpleadoTemporal || null;

    const datos = {
        nombre, email, rol,
        especialidades: especialidad ? [especialidad] : [],
        estado, tallerId: tallerActual._id
    };
    if (password) datos.password = password;
    if (fotoUrl) datos.fotoPerfil = fotoUrl;

    console.log('📤 Guardando empleado...');

    const btn = document.querySelector('#form-empleado button[onclick*="guardarEmpleado"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
        // ✅ Construir URL sin API_URL y usar apiFetch
        const endpoint = id
            ? `/talleres/${tallerActual._id}/empleados/${id}`
            : `/talleres/empleados/registro`;
        const method = id ? 'PUT' : 'POST';

        const response = await apiFetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await response.json();

        // Limpiar foto temporal
        window._fotoEmpleadoTemporal = null;
        const fotoPreview = document.getElementById('preview-foto-empleado');
        const fotoPlaceholder = document.getElementById('foto-placeholder');
        if (fotoPreview) fotoPreview.style.display = 'none';
        if (fotoPlaceholder) fotoPlaceholder.style.display = 'flex';

        if (data.exito) {
            window.mostrarToast?.(id ? '✅ Empleado actualizado' : '✅ Empleado registrado', 'success');
            document.getElementById('modal-empleado').style.display = 'none';
            cargarEmpleados();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error al guardar'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 GUARDAR'; }
    }
}

// ================================================================
// 🔹 VER HISTORIAL DEL EMPLEADO (MODAL COMPLETO)
// ================================================================

export async function verHistorialEmpleado(empleadoId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';

    const anterior = document.getElementById('modal-historial-empleado');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-historial-empleado';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter:blur(8px); animation:fadeIn 0.3s ease;';

    modal.innerHTML = `
        <div style="background:var(--bg-card, #131c2b); border:2px solid ${colorTaller}40; border-radius:24px; max-width:750px; width:95%; max-height:85vh; overflow-y:auto; box-shadow:0 25px 80px rgba(0,0,0,0.7); animation:slideUp 0.35s ease;">
            <div style="background:linear-gradient(135deg, ${colorTaller}18, ${colorTaller}05); padding:25px 30px; border-bottom:1px solid ${colorTaller}30; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:10; border-radius:24px 24px 0 0;">
                <div style="display:flex; align-items:center; gap:12px;" id="historial-header-avatar">
                    <div style="width:50px; height:50px; background:${colorTaller}22; border:2px solid ${colorTaller}; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👨‍🔧</div>
                    <div>
                        <h3 style="color:var(--text-primary, #fff); margin:0; font-size:1.1rem;" id="historial-nombre">Cargando...</h3>
                        <span style="color:${colorTaller}; font-size:0.8rem;">Historial de Trabajos</span>
                    </div>
                </div>
                <span onclick="document.getElementById('modal-historial-empleado').remove()" style="font-size:1.3rem; cursor:pointer; color:#888; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:all 0.3s;" onmouseover="this.style.background='#ff444433'; this.style.color='#ff4444';" onmouseout="this.style.background='transparent'; this.style.color='#888';">✕</span>
            </div>
            <div style="padding:25px 30px;" id="historial-content">
                <div style="text-align:center; padding:50px;"><div style="font-size:3rem; margin-bottom:15px;">⏳</div><p style="color:var(--text-secondary, #888);">Cargando historial...</p></div>
            </div>
        </div>
        <style>@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }@keyframes slideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }</style>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

    try {
        const [respEmpleados, respHistorial] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/empleados`),
            apiFetch(`/talleres/${tallerActual._id}/historial`)
        ]);
        const dataEmpleados = await respEmpleados.json();
        const dataHistorial = await respHistorial.json();
        const emp = dataEmpleados.exito ? dataEmpleados.empleados.find(e => e._id === empleadoId) : null;
        const nombre = emp?.nombre || 'Empleado';
        const rol = emp?.rol || 'N/A';
        const email = emp?.email || 'N/A';
        const estado = emp?.estado || 'N/A';
        const fotoPerfil = emp?.fotoPerfil || null;

        // ✅ Actualizar header con foto de perfil
        document.getElementById('historial-nombre').textContent = nombre;
        const headerAvatar = document.getElementById('historial-header-avatar');
        if (headerAvatar && fotoPerfil) {
            headerAvatar.querySelector('div').innerHTML = `<img src="${fotoPerfil}" style="width:50px; height:50px; border-radius:16px; object-fit:cover; border:2px solid ${colorTaller};" onerror="this.style.display='none'; this.parentElement.innerHTML='👨‍🔧';">`;
        }

        const trabajos = dataHistorial.exito ? (dataHistorial.historial || []).filter(h => String(h.empleadoAsignado?._id || h.empleadoAsignado || '') === String(empleadoId || '')) : [];
        trabajos.sort((a, b) => new Date(b.fechas?.entrega || b.createdAt) - new Date(a.fechas?.entrega || a.createdAt));

        const totalTrabajos = trabajos.length;
        const totalIngresos = trabajos.reduce((s, t) => s + (t.pago?.monto || 0), 0);
        const calificaciones = trabajos.filter(t => t.calificacion?.puntuacion).map(t => t.calificacion.puntuacion);
        const promedioCalif = calificaciones.length > 0 ? (calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length).toFixed(1) : '—';
        const ticketPromedio = totalTrabajos > 0 ? Math.round(totalIngresos / totalTrabajos) : 0;
        const conteoServicios = {};
        trabajos.forEach(t => { const n = t.servicio?.nombre || 'Otro'; conteoServicios[n] = (conteoServicios[n] || 0) + 1; });
        const servicioTop = Object.entries(conteoServicios).sort((a, b) => b[1] - a[1])[0];

        const content = document.getElementById('historial-content');
        content.innerHTML = `
            <!-- ✅ Info del empleado con foto de perfil -->
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; padding:18px; background:var(--bg-input, #080c14); border-radius:14px;">
                ${fotoPerfil ? `
                <img src="${fotoPerfil}" style="width:55px; height:55px; border-radius:14px; object-fit:cover; border:2px solid ${colorTaller};"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="width:55px; height:55px; background:linear-gradient(135deg, ${colorTaller}, ${colorTaller}88); border-radius:14px; display:${fotoPerfil ? 'none' : 'flex'}; align-items:center; justify-content:center; font-weight:700; color:#000; font-size:1.3rem;">${nombre.charAt(0)}</div>
                ` : `
                <div style="width:55px; height:55px; background:linear-gradient(135deg, ${colorTaller}, ${colorTaller}88); border-radius:14px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#000; font-size:1.3rem;">${nombre.charAt(0)}</div>
                `}
                <div style="flex:1;">
                    <strong style="color:#fff; font-size:1rem;">${nombre}</strong>
                    <div style="display:flex; gap:8px; margin-top:4px;">
                        <span style="background:${colorTaller}18; color:${colorTaller}; padding:2px 8px; border-radius:8px; font-size:0.65rem;">${rol}</span>
                        <span style="background:#88888818; color:#888; padding:2px 8px; border-radius:8px; font-size:0.65rem;">${email}</span>
                        <span style="background:#88888818; color:#aaa; padding:2px 8px; border-radius:8px; font-size:0.65rem;">${estado}</span>
                    </div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px;">
                <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:12px; padding:14px; text-align:center;"><div style="font-size:1.3rem; font-weight:800; color:${colorTaller};">${totalTrabajos}</div><small style="color:var(--text-secondary, #888); font-size:0.65rem;">Total Trabajos</small></div>
                <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:1px solid #00d4ff40; border-radius:12px; padding:14px; text-align:center;"><div style="font-size:1.3rem; font-weight:800; color:#00d4ff;">RD$ ${totalIngresos.toLocaleString()}</div><small style="color:var(--text-secondary, #888); font-size:0.65rem;">Total Generado</small></div>
                <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:1px solid #ffbb3340; border-radius:12px; padding:14px; text-align:center;"><div style="font-size:1.3rem; font-weight:800; color:#ffbb33;">${promedioCalif}</div><small style="color:var(--text-secondary, #888); font-size:0.65rem;">⭐ Promedio</small></div>
                <div style="background:linear-gradient(135deg, #ff44ff20, #ff44ff05); border:1px solid #ff44ff40; border-radius:12px; padding:14px; text-align:center;"><div style="font-size:1.3rem; font-weight:800; color:#ff44ff;">RD$ ${ticketPromedio.toLocaleString()}</div><small style="color:var(--text-secondary, #888); font-size:0.65rem;">Ticket Promedio</small></div>
            </div>
            ${servicioTop ? `<div style="background:linear-gradient(135deg, #ffbb3310, #ffbb3302); border:1px solid #ffbb3320; border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px;"><span style="font-size:1.5rem;">🔧</span><div><small style="color:#888; font-size:0.65rem;">Servicio más realizado</small><div style="color:#ffbb33; font-weight:600;">${servicioTop[0]} (${servicioTop[1]} veces)</div></div></div>` : ''}
            <h4 style="color:var(--text-primary, #fff); margin:0 0 15px;">📋 Últimos Trabajos</h4>
            ${trabajos.length > 0 ? trabajos.slice(0, 20).map(t => {
            const fecha = t.fechas?.entrega ? new Date(t.fechas.entrega).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/F';
            const vehiculo = `${t.vehiculo?.marca || ''} ${t.vehiculo?.modelo || ''}`.trim() || 'N/A';
            const servicio = t.servicio?.nombre || 'N/A';
            const monto = t.pago?.monto || 0;
            const estrellas = t.calificacion?.puntuacion ? '⭐'.repeat(t.calificacion.puntuacion) : '—';
            const cliente = t.clienteId?.nombre || 'Cliente';
            return `<div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-color, #1e2a3a);"><span style="color:var(--text-muted, #666); font-size:0.7rem; min-width:45px;">${fecha}</span><span style="font-size:1.1rem;">🚗</span><div style="flex:1;"><span style="color:var(--text-primary, #fff); font-size:0.85rem;">${vehiculo}</span><span style="background:${colorTaller}15; color:${colorTaller}; padding:2px 8px; border-radius:6px; font-size:0.65rem; margin-left:6px;">${servicio}</span></div><span style="color:var(--text-secondary, #aaa); font-size:0.7rem;">👤 ${cliente}</span><span style="color:#00ff88; font-weight:600; font-size:0.8rem; min-width:80px; text-align:right;">RD$ ${monto.toLocaleString()}</span><span style="font-size:0.7rem; min-width:50px; text-align:center;">${estrellas}</span></div>`;
        }).join('') : '<p style="color:var(--text-secondary, #888); text-align:center; padding:30px;">No hay trabajos registrados</p>'}
            ${trabajos.length > 20 ? `<p style="color:var(--text-muted, #666); text-align:center; font-size:0.75rem;">Mostrando 20 de ${trabajos.length} trabajos</p>` : ''}`;
    } catch (error) { document.getElementById('historial-content').innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar historial</p>'; }
}

// ================================================================
// 🔹 ELIMINAR EMPLEADO
// ================================================================

export async function eliminarEmpleado() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const id = document.getElementById('empleado-id').value;

    if (!id || !confirm('¿Despedir empleado? Esta acción no se puede deshacer.')) return;

    try {
        await apiFetch(`/talleres/${tallerActual._id}/empleados/${id}`, { method: 'DELETE' });
        window.mostrarToast?.('🗑️ Empleado eliminado', 'success');
        document.getElementById('modal-empleado').style.display = 'none';
        cargarEmpleados();
    } catch (error) {
        window.mostrarToast?.('❌ Error al eliminar', 'error');
    }
}

// ================================================================
// 🔹 PREVISUALIZAR FOTO DE EMPLEADO
// ================================================================

export function previsualizarFotoEmpleado(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        window.mostrarToast?.('⚠️ La imagen es muy grande. Máximo 2MB.', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('preview-foto-empleado');
        const placeholder = document.getElementById('foto-placeholder');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
        // Guardar temporalmente
        window._fotoEmpleadoTemporal = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ================================================================
// 🔹 SUBIR FOTO DE EMPLEADO
// ================================================================

async function subirFotoEmpleado() {
    if (!window._fotoEmpleadoTemporal) return null;

    // ✅ Devolver el base64 directamente, sin intentar subir al servidor
    console.log('📷 Usando foto base64');
    return window._fotoEmpleadoTemporal;
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarEmpleados() {
    window.cargarEmpleados = cargarEmpleados;
    window.actualizarEmpleadosSuave = actualizarEmpleadosSuave;
    window.abrirModalNuevoEmpleado = abrirModalNuevoEmpleado;
    window.editarEmpleado = editarEmpleado;
    window.guardarEmpleado = guardarEmpleado;
    window.cambiarEstadoEmpleado = cambiarEstadoEmpleado;
    window.eliminarEmpleado = eliminarEmpleado;
    window.verHistorialEmpleado = verHistorialEmpleado;
    window.previsualizarFotoEmpleado = previsualizarFotoEmpleado;
    console.log('👥 Módulo de Empleados inicializado');
}