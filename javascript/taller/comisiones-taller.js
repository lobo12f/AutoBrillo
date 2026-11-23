// ====================================================================
// 💰 MÓDULO DE COMISIONES - AUTOBRILLO DETALLING
//    Gestión de empleados, comisiones y pagos con diseño profesional
//    Incluye: Estado de pago permanente, KPIs, filtros dinámicos
// ====================================================================

// ================================================================
// 🔹 CARGAR RENDIMIENTO DE EMPLEADOS
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export async function cargarRendimientoEmpleados() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('tbody-comisiones');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:var(--text-secondary, #888);"><div style="font-size:2rem; margin-bottom:10px;">⏳</div>Cargando datos de empleados...</td></tr>';

    try {
        const mes = document.getElementById('filtro-comision-mes')?.value || new Date().getMonth();
        const año = document.getElementById('filtro-comision-año')?.value || new Date().getFullYear();

        // ✅ Obtener rendimiento Y pagos realizados
        const [respRendimiento, respPagos] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/rendimiento-empleados?mes=${mes}&año=${año}`),
            apiFetch(`/talleres/${tallerActual._id}/pagos`)
        ]);

        const data = await respRendimiento.json();
        const datosPagos = await respPagos.json();
        const pagosRealizados = datosPagos.exito ? (datosPagos.pagos || []) : [];

        // ✅ Función para verificar si un empleado ya fue pagado en este período
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

        function empleadoYaPagado(empId) {
            return pagosRealizados.some(p =>
                String(p.empleadoId?._id || p.empleadoId) === String(empId) &&
                p.estado === 'PAGADO' &&
                new Date(p.fechaPago || p.createdAt) >= inicioMes
            );
        }

        function obtenerPagoRealizado(empId) {
            return pagosRealizados.find(p =>
                String(p.empleadoId?._id || p.empleadoId) === String(empId) &&
                p.estado === 'PAGADO'
            );
        }

        if (data.exito && data.empleados && data.empleados.length > 0) {
            const totalAPagar = data.empleados.reduce((s, e) => s + (e.pagoEstimado || 0), 0);
            const totalGenerado = data.empleados.reduce((s, e) => s + (e.totalIngresos || 0), 0);
            const totalTrabajos = data.empleados.reduce((s, e) => s + (e.totalTrabajos || 0), 0);
            const empleadosActivos = data.empleados.filter(e => e.totalTrabajos > 0).length;
            const maxPago = Math.max(...data.empleados.map(e => e.pagoEstimado || 0), 1);

            // Limpiar contenedor
            container.innerHTML = '';

            // ===== KPIs =====
            const trKPI = document.createElement('tr');
            trKPI.innerHTML = '<td colspan="6" style="padding:0;"><div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:20px; padding:15px 0;" id="kpi-comisiones"></div></td>';
            container.appendChild(trKPI);

            const kpiContainer = document.getElementById('kpi-comisiones');
            kpiContainer.innerHTML = `
                <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.4rem; font-weight:800; color:${colorTaller};">RD$ ${totalAPagar.toLocaleString()}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total a Pagar</small>
                </div>
                <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:1px solid #00d4ff40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.4rem; font-weight:800; color:#00d4ff;">${empleadosActivos}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Empleados Activos</small>
                </div>
                <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:1px solid #ffbb3340; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.4rem; font-weight:800; color:#ffbb33;">${totalTrabajos}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Trabajos</small>
                </div>
                <div style="background:linear-gradient(135deg, #ff44ff20, #ff44ff05); border:1px solid #ff44ff40; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:1.4rem; font-weight:800; color:#ff44ff;">RD$ ${totalGenerado.toLocaleString()}</div>
                    <small style="color:var(--text-secondary, #888); font-size:0.7rem;">Total Generado</small>
                </div>`;

            // ===== EMPLEADOS =====
            data.empleados.forEach((emp) => {
                const empId = emp.empleado?._id || '';
                const empNombre = emp.empleado?.nombre || 'Sin asignar';
                const empEmail = emp.empleado?.email || '';
                const pagoEstimado = emp.pagoEstimado || 0;
                const totalTrabajosEmp = emp.totalTrabajos || 0;
                const totalIngresosEmp = emp.totalIngresos || 0;
                const comisionPct = emp.comisionPorcentaje || 30;
                const pctBarra = maxPago > 0 ? Math.round((pagoEstimado / maxPago) * 100) : 0;
                const inicial = empNombre.charAt(0).toUpperCase();
                const trabajosIds = JSON.stringify((emp.trabajos || []).map(t => t.id));

                // ✅ Verificar si ya fue pagado
                const yaPagado = empleadoYaPagado(empId);
                const pagoRealizado = yaPagado ? obtenerPagoRealizado(empId) : null;

                const tr = document.createElement('tr');
                tr.style.cssText = 'border-bottom:1px solid var(--border-color, #1e2a3a); transition:all 0.3s;' + (yaPagado ? 'opacity:0.7;' : '');
                tr.onmouseover = function () { this.style.background = 'var(--bg-hover, rgba(255,255,255,0.03))'; };
                tr.onmouseout = function () { this.style.background = 'transparent'; };

                tr.innerHTML = `
                    <td style="padding:14px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:42px; height:42px; border-radius:14px; background:linear-gradient(135deg, ${colorTaller}, ${colorTaller}88); display:flex; align-items:center; justify-content:center; font-weight:700; color:#000; font-size:1rem; flex-shrink:0;">${inicial}</div>
                            <div>
                                <strong style="color:var(--text-primary, #fff); font-size:0.9rem;">👨‍🔧 ${empNombre}</strong>
                                <br><small style="color:var(--text-muted, #888); font-size:0.7rem;">${empEmail}</small>
                            </div>
                        </div>
                    </td>
                    <td style="padding:14px; text-align:center;"><span style="color:#00d4ff; font-weight:600; font-size:0.9rem;">${totalTrabajosEmp}</span></td>
                    <td style="padding:14px; text-align:center;"><span style="color:${colorTaller}; font-weight:600; font-size:0.9rem;">RD$ ${totalIngresosEmp.toLocaleString()}</span></td>
                    <td style="padding:14px; text-align:center;">
                        <div style="display:flex; align-items:center; gap:6px; justify-content:center;">
                            <span style="color:#ffbb33; font-weight:700;">${comisionPct}%</span>
                            <button id="btn-comision-${empId}" style="background:transparent; border:1px solid #ffbb33; color:#ffbb33; padding:3px 6px; border-radius:4px; cursor:pointer; font-size:0.6rem;" title="Configurar comisión">⚙️</button>
                        </div>
                    </td>
                    <td style="padding:14px; text-align:center;">
                        <span style="color:#ff44ff; font-weight:700; font-size:0.95rem;">RD$ ${pagoEstimado.toLocaleString()}</span>
                        <div style="background:#1a1a1a; border-radius:3px; height:4px; overflow:hidden; margin-top:4px; max-width:100px; margin-left:auto; margin-right:auto;">
                            <div style="background:linear-gradient(90deg, #ff44ff, ${colorTaller}); height:100%; width:${pctBarra}%; border-radius:3px;"></div>
                        </div>
                    </td>
                    <td style="padding:14px; text-align:center;" id="td-accion-${empId}"></td>
                `;

                container.appendChild(tr);

                // ✅ Celda de acción
                const tdAccion = document.getElementById('td-accion-' + empId);
                if (tdAccion) {
                    if (yaPagado) {
                        // ✅ Estado PAGADO permanente
                        const fechaPago = pagoRealizado?.fechaPago
                            ? new Date(pagoRealizado.fechaPago).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Pagado';
                        const montoPagado = pagoRealizado?.comisionMonto || pagoEstimado;

                        tdAccion.innerHTML = `
                            <div style="text-align:center;">
                                <span style="color:${colorTaller}; font-size:0.85rem; font-weight:700;">✅ Pagado</span>
                                <br><small style="color:var(--text-muted, #888); font-size:0.65rem;">${fechaPago}</small>
                                <br><small style="color:#ffbb33; font-size:0.7rem; font-weight:600;">RD$ ${montoPagado.toLocaleString()}</small>
                                <br><button onclick="document.querySelector('[data-section=historial-pagos]').click();" style="margin-top:4px; background:transparent; border:1px solid #00d4ff; color:#00d4ff; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:0.6rem;">📋 Ver historial</button>
                            </div>`;
                    } else if (pagoEstimado > 0) {
                        // Botón Pagar
                        const btnPagar = document.createElement('button');
                        btnPagar.textContent = '💳 Pagar';
                        btnPagar.style.cssText = 'background:' + colorTaller + '; color:#000; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:600; transition:all 0.3s;';
                        btnPagar.onmouseover = function () { this.style.boxShadow = '0 0 20px ' + colorTaller + '40'; this.style.transform = 'translateY(-2px)'; };
                        btnPagar.onmouseout = function () { this.style.boxShadow = 'none'; this.style.transform = 'translateY(0)'; };
                        btnPagar.onclick = function () {
                            window.pagarEmpleadoDirecto(empId, empNombre, pagoEstimado, totalTrabajosEmp, totalIngresosEmp, comisionPct, trabajosIds);
                        };
                        tdAccion.appendChild(btnPagar);
                    } else {
                        const spanAlDia = document.createElement('span');
                        spanAlDia.textContent = '✅ Al día';
                        spanAlDia.style.cssText = 'color:' + colorTaller + '; font-size:0.8rem; font-weight:600;';
                        tdAccion.appendChild(spanAlDia);
                    }
                }

                // Botón de comisión
                const btnComision = document.getElementById('btn-comision-' + empId);
                if (btnComision) {
                    btnComision.onclick = function () {
                        window.abrirModalComision(empId, empNombre, comisionPct);
                    };
                }
            });

            // ===== BOTÓN PAGAR TODO =====
            if (totalAPagar > 0) {
                const trPagarTodo = document.createElement('tr');
                const tdPagarTodo = document.createElement('td');
                tdPagarTodo.colSpan = 6;
                tdPagarTodo.style.cssText = 'padding:15px; text-align:center; border-top:2px solid ' + colorTaller + '30;';

                const btnPagarTodo = document.createElement('button');
                btnPagarTodo.textContent = '💰 Pagar Todo (RD$ ' + totalAPagar.toLocaleString() + ')';
                btnPagarTodo.style.cssText = 'background:linear-gradient(135deg, ' + colorTaller + ', ' + colorTaller + 'cc); color:#000; border:none; padding:12px 30px; border-radius:12px; cursor:pointer; font-size:0.9rem; font-weight:700; transition:all 0.3s;';
                btnPagarTodo.onmouseover = function () { this.style.boxShadow = '0 0 30px ' + colorTaller + '60'; this.style.transform = 'translateY(-2px)'; };
                btnPagarTodo.onmouseout = function () { this.style.boxShadow = 'none'; this.style.transform = 'translateY(0)'; };
                btnPagarTodo.onclick = function () { window.pagarTodosEmpleados(); };

                tdPagarTodo.appendChild(btnPagarTodo);
                trPagarTodo.appendChild(tdPagarTodo);
                container.appendChild(trPagarTodo);
            }

        } else {
            container.innerHTML = '<tr><td colspan="6" style="padding:60px; text-align:center; color:var(--text-secondary, #888);"><div style="font-size:4rem; margin-bottom:15px;">📭</div><h3 style="color:var(--text-primary, #fff);">No hay trabajos pendientes</h3><p>Todos los empleados están al día</p></td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<tr><td colspan="6" style="padding:30px; text-align:center; color:#ff4444;">Error al cargar</td></tr>';
    }
}

// ================================================================
// 🔹 ABRIR MODAL DE COMISIÓN
// ================================================================

export function abrirModalComision(empleadoId, nombre, porcentajeActual) {
    document.getElementById('comision-empleado-id').value = empleadoId || '';
    document.getElementById('comision-empleado-nombre').textContent = '👨‍🔧 ' + (nombre || 'Empleado');
    document.getElementById('comision-porcentaje').value = porcentajeActual || 30;
    document.getElementById('modal-comision').style.display = 'flex';
}

// ================================================================
// 🔹 GUARDAR COMISIÓN
// ================================================================

export async function guardarComision() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const empleadoId = document.getElementById('comision-empleado-id').value;
    const porcentaje = parseInt(document.getElementById('comision-porcentaje').value);
    const tipo = document.getElementById('comision-tipo').value;

    if (!empleadoId) return;

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/comisiones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId, porcentaje, tipo })
        });

        const data = await response.json();
        if (data.exito) {
            window.mostrarToast?.('✅ Comisión guardada correctamente', 'success');
            document.getElementById('modal-comision').style.display = 'none';
            cargarRendimientoEmpleados();
        } else {
            alert('❌ ' + (data.mensaje || 'Error'));
        }
    } catch (error) {
        alert('❌ Error de conexión');
    }
}

// ================================================================
// 🔹 PAGAR EMPLEADO DIRECTO
// ================================================================

export async function pagarEmpleadoDirecto(empleadoId, nombre, montoPendiente, totalTrabajos, totalGenerado, comisionPorcentaje, trabajosPendientesJSON) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || '#00ff88';

    let trabajosArray = [];
    try {
        if (trabajosPendientesJSON && trabajosPendientesJSON !== '[]' && trabajosPendientesJSON !== 'undefined') {
            trabajosArray = JSON.parse(trabajosPendientesJSON);
        }
    } catch (e) {
        trabajosArray = [];
    }

    if (trabajosArray.length === 0) {
        window.mostrarToast?.('⚠️ No hay trabajos pendientes para este empleado.', 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter:blur(5px); animation:fadeIn 0.3s ease;';

    const metodos = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'OTRO'];
    const metodosIconos = { 'EFECTIVO': '💵', 'TRANSFERENCIA': '🏦', 'TARJETA': '💳', 'CHEQUE': '📝', 'OTRO': '📌' };

    modal.innerHTML = `
        <div style="background:var(--bg-card, #131c2b); border:2px solid ${colorTaller}40; border-radius:20px; padding:30px; max-width:480px; width:95%; animation:slideUp 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="color:var(--text-primary, #fff); margin:0;">💳 Confirmar Pago</h3>
                <span id="modal-pago-cerrar" style="font-size:1.3rem; cursor:pointer; color:#888; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:all 0.3s;">✕</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:15px; background:var(--bg-input, #080c14); border-radius:12px;">
                <div style="width:45px; height:45px; border-radius:14px; background:linear-gradient(135deg, ${colorTaller}, ${colorTaller}88); display:flex; align-items:center; justify-content:center; font-weight:700; color:#000; font-size:1.1rem;">${nombre.charAt(0)}</div>
                <div><strong style="color:#fff;">${nombre}</strong><br><small style="color:#888;">${totalTrabajos} trabajos · ${comisionPorcentaje}% comisión</small></div>
            </div>
            <div style="background:linear-gradient(135deg, ${colorTaller}15, ${colorTaller}05); border:1px solid ${colorTaller}30; border-radius:12px; padding:20px; margin-bottom:20px; text-align:center;">
                <p style="color:#888; font-size:0.75rem; margin:0;">Total a Pagar</p>
                <p style="color:${colorTaller}; font-size:2rem; font-weight:800; margin:8px 0;">RD$ ${montoPendiente.toLocaleString()}</p>
                <div style="display:flex; gap:8px; justify-content:center;">
                    <span style="background:#ff444422; color:#ff4444; padding:4px 10px; border-radius:10px; font-size:0.7rem;">${trabajosArray.length} trabajos</span>
                    <span style="background:#ffbb3322; color:#ffbb33; padding:4px 10px; border-radius:10px; font-size:0.7rem;">${comisionPorcentaje}% comisión</span>
                </div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#888; font-size:0.8rem;">Método de pago</label>
                <select id="pago-metodo" style="width:100%; padding:12px; background:var(--bg-input, #080c14); border:1px solid var(--border-color, #1e2a3a); border-radius:10px; color:#fff; margin-top:5px;">
                    ${metodos.map(m => `<option value="${m}">${metodosIconos[m]} ${m}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:#888; font-size:0.8rem;">Notas (opcional)</label>
                <textarea id="pago-notas" rows="2" placeholder="Ej: Pago de comisión mensual" style="width:100%; padding:12px; background:var(--bg-input, #080c14); border:1px solid var(--border-color, #1e2a3a); border-radius:10px; color:#fff; resize:vertical; font-family:Inter,sans-serif;"></textarea>
            </div>
            <div style="display:flex; gap:10px;">
                <button id="modal-pago-cancelar" style="flex:1; padding:12px; background:transparent; border:1px solid #333; color:#fff; border-radius:10px; cursor:pointer;">Cancelar</button>
                <button id="btn-confirmar-pago" style="flex:2; padding:12px; background:${colorTaller}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:600;">💳 Confirmar Pago</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    const cerrarModal = function () { modal.remove(); };
    document.getElementById('modal-pago-cerrar').onclick = cerrarModal;
    document.getElementById('modal-pago-cancelar').onclick = cerrarModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

    document.getElementById('btn-confirmar-pago').addEventListener('click', async function () {
        const btn = this;
        const metodo = document.getElementById('pago-metodo').value;
        const notas = document.getElementById('pago-notas').value;

        btn.disabled = true;
        btn.textContent = '⏳ Procesando...';
        btn.style.opacity = '0.7';

        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

        try {
            const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId,
                    periodo: { inicio: inicioMes.toISOString(), fin: finMes.toISOString() },
                    totalTrabajos,
                    totalGenerado,
                    comisionPorcentaje,
                    comisionMonto: montoPendiente,
                    metodoPago: metodo,
                    notas: notas || `Pago realizado el ${new Date().toLocaleDateString('es-DO')}`,
                    trabajosIncluidos: trabajosArray
                })
            });

            const data = await response.json();
            if (data.exito) {
                modal.remove();
                mostrarIndicadorPago(nombre, montoPendiente);

                // ✅ Cambiar a "PAGADO" visualmente
                const tdAccion = document.getElementById('td-accion-' + empleadoId);
                if (tdAccion) {
                    const fechaPago = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
                    tdAccion.innerHTML = `
                        <div style="text-align:center;">
                            <span style="color:${colorTaller}; font-size:0.85rem; font-weight:700;">✅ Pagado</span>
                            <br><small style="color:var(--text-muted, #888); font-size:0.65rem;">${fechaPago}</small>
                            <br><small style="color:#ffbb33; font-size:0.7rem; font-weight:600;">RD$ ${montoPendiente.toLocaleString()}</small>
                            <br><button onclick="document.querySelector('[data-section=historial-pagos]').click();" style="margin-top:4px; background:transparent; border:1px solid #00d4ff; color:#00d4ff; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:0.6rem;">📋 Ver historial</button>
                        </div>`;
                    const tr = tdAccion.closest('tr');
                    if (tr) tr.style.opacity = '0.7';
                }

                if (typeof cargarHistorialPagos === 'function') {
                    setTimeout(() => cargarHistorialPagos(), 1000);
                }
            } else {
                btn.disabled = false;
                btn.textContent = '💳 Confirmar Pago';
                btn.style.opacity = '1';
                window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
            }
        } catch (error) {
            btn.disabled = false;
            btn.textContent = '💳 Confirmar Pago';
            btn.style.opacity = '1';
            window.mostrarToast?.('❌ Error de conexión', 'error');
        }
    });
}

// ================================================================
// 🔹 PAGAR TODOS LOS EMPLEADOS
// ================================================================

export async function pagarTodosEmpleados() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || '#00ff88';

    const mes = document.getElementById('filtro-comision-mes')?.value || new Date().getMonth();
    const año = document.getElementById('filtro-comision-año')?.value || new Date().getFullYear();

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/rendimiento-empleados?mes=${mes}&año=${año}`);
        const data = await response.json();

        if (!data.exito || !data.empleados || data.empleados.length === 0) {
            window.mostrarToast?.('⚠️ No hay empleados con pagos pendientes', 'warning');
            return;
        }

        const empleadosConPago = data.empleados.filter(e => e.pagoEstimado > 0);
        if (empleadosConPago.length === 0) {
            window.mostrarToast?.('✅ Todos los empleados están al día', 'success');
            return;
        }

        const totalAPagar = empleadosConPago.reduce((s, e) => s + e.pagoEstimado, 0);

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter:blur(5px);';

        modal.innerHTML = `
            <div style="background:var(--bg-card, #131c2b); border:2px solid ${colorTaller}40; border-radius:20px; padding:30px; max-width:500px; width:95%; max-height:80vh; overflow-y:auto;">
                <h3 style="color:#fff; margin:0 0 20px;">💰 Pagar Todos los Empleados</h3>
                <div style="background:linear-gradient(135deg, ${colorTaller}15, ${colorTaller}05); border:1px solid ${colorTaller}30; border-radius:12px; padding:20px; margin-bottom:20px; text-align:center;">
                    <p style="color:#888; font-size:0.8rem;">Total a Pagar</p>
                    <p style="color:${colorTaller}; font-size:2rem; font-weight:800;">RD$ ${totalAPagar.toLocaleString()}</p>
                    <p style="color:#888;">${empleadosConPago.length} empleados</p>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="color:#888;">Método de pago</label>
                    <select id="pago-todos-metodo" style="width:100%; padding:12px; background:#080c14; border:1px solid #1e2a3a; border-radius:8px; color:#fff; margin-top:5px;">
                        <option value="EFECTIVO">💵 Efectivo</option>
                        <option value="TRANSFERENCIA">🏦 Transferencia</option>
                        <option value="TARJETA">💳 Tarjeta</option>
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="this.closest('div').parentElement.remove()" style="flex:1; padding:12px; background:transparent; border:1px solid #333; color:#fff; border-radius:8px; cursor:pointer;">Cancelar</button>
                    <button id="btn-confirmar-todos" style="flex:2; padding:12px; background:${colorTaller}; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">💳 Pagar Todo</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-confirmar-todos').addEventListener('click', async function () {
            const btn = this;
            const metodo = document.getElementById('pago-todos-metodo').value;
            btn.disabled = true;
            btn.textContent = '⏳ Procesando...';

            const ahora = new Date();
            const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
            let exitos = 0, fallos = 0;

            for (const emp of empleadosConPago) {
                try {
                    const trabajosArray = (emp.trabajos || []).map(t => t.id);
                    const res = await apiFetch(`/talleres/${tallerActual._id}/pagos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            empleadoId: emp.empleado?._id,
                            periodo: { inicio: inicioMes.toISOString(), fin: finMes.toISOString() },
                            totalTrabajos: emp.totalTrabajos,
                            totalGenerado: emp.totalIngresos,
                            comisionPorcentaje: emp.comisionPorcentaje,
                            comisionMonto: emp.pagoEstimado,
                            metodoPago: metodo,
                            notas: `Pago masivo - ${new Date().toLocaleDateString('es-DO')}`,
                            trabajosIncluidos: trabajosArray
                        })
                    });
                    const d = await res.json();
                    if (d.exito) exitos++; else fallos++;
                } catch (e) { fallos++; }
            }

            modal.remove();
            window.mostrarToast?.(`✅ ${exitos} pagos realizados${fallos > 0 ? ' · ' + fallos + ' fallidos' : ''}`, fallos > 0 ? 'warning' : 'success');
            cargarRendimientoEmpleados();
            if (typeof cargarHistorialPagos === 'function') cargarHistorialPagos();
        });

    } catch (error) {
        window.mostrarToast?.('❌ Error al procesar pagos', 'error');
    }
}

// ================================================================
// 🔹 MOSTRAR INDICADOR DE PAGO
// ================================================================

function mostrarIndicadorPago(nombre, monto) {
    const colorTaller = JSON.parse(localStorage.getItem('taller_sesion'))?.color || '#00ff88';
    const indicador = document.createElement('div');
    indicador.style.cssText = `
        position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0);
        background:linear-gradient(135deg, ${colorTaller}, #00d4ff);
        color:#000; padding:20px 30px; border-radius:20px;
        font-weight:700; font-size:1.2rem; z-index:99999;
        box-shadow:0 20px 60px ${colorTaller}40;
        animation:popIn 0.5s ease forwards, popOut 0.5s ease 2s forwards;
        text-align:center;
    `;
    indicador.innerHTML = `
        <div style="font-size:3rem; margin-bottom:5px;">✅</div>
        <div>¡Pago Realizado!</div>
        <div style="font-size:0.9rem; opacity:0.8;">${nombre}</div>
        <div style="font-size:1.1rem;">RD$ ${monto.toLocaleString()}</div>`;
    document.body.appendChild(indicador);
    setTimeout(() => indicador.remove(), 2500);
}

// ================================================================
// 🔹 RENDERIZAR FILTROS DINÁMICOS
// ================================================================

export function renderizarFiltrosComisiones() {
    const container = document.getElementById('filtros-comisiones');
    if (!container) return;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const años = [];
    for (let a = 2024; a <= añoActual + 1; a++) años.push(a);

    container.innerHTML = `
        <select id="filtro-comision-mes" onchange="cargarRendimientoEmpleados()" style="padding:10px 14px; background:var(--bg-input, #080c14); border:1px solid var(--border-color, #1e2a3a); border-radius:10px; color:var(--text-primary, #fff); font-size:0.85rem; cursor:pointer;">
            ${meses.map((mes, i) => `<option value="${i}" ${i === mesActual ? 'selected' : ''}>📅 ${mes}</option>`).join('')}
        </select>
        <select id="filtro-comision-año" onchange="cargarRendimientoEmpleados()" style="padding:10px 14px; background:var(--bg-input, #080c14); border:1px solid var(--border-color, #1e2a3a); border-radius:10px; color:var(--text-primary, #fff); font-size:0.85rem; cursor:pointer;">
            ${años.map(a => `<option value="${a}" ${a === añoActual ? 'selected' : ''}>📆 ${a}</option>`).join('')}
        </select>
        <span style="color:var(--text-muted, #888); font-size:0.75rem; margin-left:auto;">📅 ${meses[mesActual]} ${añoActual}</span>`;
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarComisiones() {
    window.cargarRendimientoEmpleados = cargarRendimientoEmpleados;
    window.abrirModalComision = abrirModalComision;
    window.guardarComision = guardarComision;
    window.pagarEmpleadoDirecto = pagarEmpleadoDirecto;
    window.pagarTodosEmpleados = pagarTodosEmpleados;
    renderizarFiltrosComisiones();
    console.log('💰 Módulo de Comisiones inicializado');
}