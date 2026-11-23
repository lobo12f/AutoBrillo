// ====================================================================
// 💳 MÓDULO DE PAGOS - AUTOBRILLO DETALLING
//    Historial de pagos del empleado con filtros y comprobante
// ====================================================================
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';
let pagosEmpleado = [];
let empleadoIdActual = null; // ✅ AGREGADO
// ================================================================
// 🔹 INICIALIZAR
// ================================================================

export function inicializarPagos() {
    window.cargarHistorialPagos = cargarHistorialPagos;
    window.exportarPagosCSV = exportarPagosCSV;
    window.verComprobantePago = verComprobantePago;
    window.cerrarComprobante = cerrarComprobante;
    window.descargarComprobante = descargarComprobante;

    console.log('💳 Módulo de Pagos inicializado');
}

// ================================================================
// 🔹 CARGAR HISTORIAL DE PAGOS
// ================================================================

export async function cargarHistorialPagos() {
    const tbody = document.getElementById('tbody-pagos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="padding:40px; text-align:center; color:#888;">⏳ Cargando pagos...</td></tr>';

    try {
        const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        empleadoIdActual = sesionEmpleado?.empleado?._id; // ✅ GUARDAR GLOBALMENTE
        const tallerId = tallerActual?._id || sesionEmpleado?.tallerId;

        console.log('👤 Empleado ID para filtro:', empleadoIdActual);

        const response = await apiFetch(`/talleres/${tallerId}/pagos`);
        const data = await response.json();

        if (!data.exito) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:40px; text-align:center; color:#ff4444;">❌ Error al cargar pagos</td></tr>';
            return;
        }

        // ✅ FILTRAR CON VERIFICACIÓN ADICIONAL
        const todosPagos = data.pagos || [];
        console.log('📊 Total pagos del taller:', todosPagos.length);

        pagosEmpleado = todosPagos.filter(p => {
            const empId = p.empleadoId?._id || p.empleadoId || '';
            const coincide = String(empId) === String(empleadoIdActual);
            return coincide;
        });

        console.log('💳 Pagos filtrados del empleado:', pagosEmpleado.length);

        actualizarResumenPagos();
        renderizarTablaPagos();

    } catch (error) {
        console.error('Error al cargar pagos:', error);
    }
}
// ================================================================
// 🔹 ACTUALIZAR RESUMEN
// ================================================================

function actualizarResumenPagos() {
    const totalPagado = pagosEmpleado
        .filter(p => p.estado === 'PAGADO')
        .reduce((s, p) => s + (p.comisionMonto || 0), 0);

    const totalPendiente = pagosEmpleado
        .filter(p => p.estado === 'PENDIENTE')
        .reduce((s, p) => s + (p.comisionMonto || 0), 0);

    const totalTrabajos = pagosEmpleado.reduce((s, p) => s + (p.totalTrabajos || 0), 0);
    const totalRegistros = pagosEmpleado.length;

    const pagoTotal = document.getElementById('pago-total');
    const pagoPendiente = document.getElementById('pago-pendiente');
    const pagoTrabajos = document.getElementById('pago-trabajos');
    const pagoRegistros = document.getElementById('pago-registros');

    if (pagoTotal) pagoTotal.textContent = `$${totalPagado.toLocaleString()}`;
    if (pagoPendiente) pagoPendiente.textContent = `$${totalPendiente.toLocaleString()}`;
    if (pagoTrabajos) pagoTrabajos.textContent = totalTrabajos;
    if (pagoRegistros) pagoRegistros.textContent = totalRegistros;
}

// ================================================================
// 🔹 RENDERIZAR TABLA
// ================================================================

function renderizarTablaPagos() {
    const tbody = document.getElementById('tbody-pagos');
    if (!tbody) return;

    let filtrados = [...pagosEmpleado];

    const mesFiltro = document.getElementById('filtro-pago-mes')?.value;
    if (mesFiltro && mesFiltro !== 'TODOS') {
        const mesNumero = parseInt(mesFiltro);
        filtrados = filtrados.filter(p => {
            const fecha = new Date(p.periodo?.inicio || p.fechaPago || p.createdAt);
            return fecha.getMonth() === mesNumero;
        });
    }

    const estadoFiltro = document.getElementById('filtro-pago-estado')?.value;
    if (estadoFiltro && estadoFiltro !== 'TODOS') {
        filtrados = filtrados.filter(p => p.estado === estadoFiltro);
    }

    filtrados.sort((a, b) => {
        const fechaA = new Date(b.fechaPago || b.periodo?.inicio || b.createdAt || 0);
        const fechaB = new Date(a.fechaPago || a.periodo?.inicio || a.createdAt || 0);
        return fechaB - fechaA;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:40px; text-align:center; color:#888;">📭 No se encontraron pagos</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(pago => renderizarFilaPago(pago)).join('');
}

// ================================================================
// 🔹 RENDERIZAR FILA
// ================================================================

function renderizarFilaPago(pago) {
    let periodo = '—';
    if (pago.periodo?.inicio) {
        periodo = formatearPeriodo(pago.periodo.inicio);
    } else if (pago.fechaPago) {
        periodo = formatearPeriodo(pago.fechaPago);
    }

    const trabajos = pago.totalTrabajos || 0;
    const generado = pago.totalGenerado || 0;
    const porcentaje = pago.comisionPorcentaje || 30;
    const pagado = pago.comisionMonto || 0;
    const metodo = pago.metodoPago || 'EFECTIVO';
    const estado = pago.estado || 'PAGADO';
    const fechaPago = pago.fechaPago ? formatearFecha(pago.fechaPago) : '—';

    const estadoColor = estado === 'PAGADO' ? '#00ff88' : '#ffbb33';
    const estadoIcono = estado === 'PAGADO' ? '✅' : '⏳';

    return `
    <tr style="border-bottom:1px solid #1e2a3a; cursor:pointer; transition:all 0.2s;"
        onmouseover="this.style.background='rgba(0,255,136,0.03)';"
        onmouseout="this.style.background='transparent';">
        <td style="padding:12px; color:#aaa; font-size:0.8rem;">${periodo}</td>
        <td style="padding:12px; text-align:center; color:#00d4ff; font-weight:600; font-size:0.8rem;">${trabajos}</td>
        <td style="padding:12px; text-align:center; color:#ffbb33; font-size:0.8rem;">$${generado.toLocaleString()}</td>
        <td style="padding:12px; text-align:center; color:#aaa; font-size:0.8rem;">${porcentaje}%</td>
        <td style="padding:12px; text-align:right; color:#00ff88; font-weight:700; font-size:0.85rem;">$${pagado.toLocaleString()}</td>
        <td style="padding:12px; text-align:center;">
            <span style="color:${estadoColor}; font-weight:600; font-size:0.75rem;">${estadoIcono} ${estado}</span>
            ${fechaPago !== '—' ? `<br><small style="color:#888; font-size:0.65rem;">${fechaPago}</small>` : ''}
        </td>
        <td style="padding:12px; text-align:center;">
            <button onclick="verComprobantePago('${pago._id}')" 
                style="background:transparent; border:1px solid #00d4ff; color:#00d4ff; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:0.7rem;"
                title="Ver comprobante">
                🧾
            </button>
        </td>
    </tr>`;
}

// ================================================================
// 🔹 VER COMPROBANTE DE PAGO
// ================================================================

window.verComprobantePago = async function (pagoId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`);
        const data = await response.json();
        const pago = data.pagos?.find(p => p._id === pagoId);

        if (!pago) {
            window.mostrarToast?.('Pago no encontrado', 'error');
            return;
        }

        // Obtener trabajos incluidos
        let trabajosDetalle = [];
        if (pago.trabajosIncluidos && pago.trabajosIncluidos.length > 0) {
            const respHistorial = await apiFetch(`/talleres/${tallerActual._id}/historial`);
            const dataHistorial = await respHistorial.json();

            const respCitas = await apiFetch(`/talleres/${tallerActual._id}/citas`);
            const dataCitas = await respCitas.json();

            const historialCompleto = [
                ...(dataHistorial.historial || []),
                ...(dataCitas.citas || []).filter(c => c.estado === 'LISTO')
            ];

            trabajosDetalle = historialCompleto.filter(h =>
                pago.trabajosIncluidos.some(id => String(id) === String(h._id))
            );
        }

        const empleado = pago.empleadoId?.nombre || 'N/A';
        const emailEmpleado = pago.empleadoId?.email || '';
        const periodoInicio = pago.periodo?.inicio ? new Date(pago.periodo.inicio).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
        const periodoFin = pago.periodo?.fin ? new Date(pago.periodo.fin).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
        const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
        const metodoPago = pago.metodoPago || 'EFECTIVO';
        const metodosNombres = { 'EFECTIVO': '💵 Efectivo', 'TRANSFERENCIA': '🏦 Transferencia', 'TARJETA': '💳 Tarjeta', 'CHEQUE': '📝 Cheque', 'OTRO': '📌 Otro' };
        const totalGenerado = pago.totalGenerado || 0;
        const comisionPorcentaje = pago.comisionPorcentaje || 0;
        const comisionMonto = pago.comisionMonto || 0;
        const totalTrabajos = pago.totalTrabajos || 0;
        const colorTaller = tallerActual?.color || '#00cc55';

        let filasTrabajos = '';
        if (trabajosDetalle.length > 0) {
            filasTrabajos = trabajosDetalle.map((t, i) => {
                const fecha = t.fechas?.entrega ? new Date(t.fechas.entrega).toLocaleDateString('es-DO') : 'N/A';
                const vehiculo = `${t.vehiculo?.marca || ''} ${t.vehiculo?.modelo || ''} (${t.vehiculo?.placa || 'S/P'})`;
                const servicio = t.servicio?.nombre || 'N/A';
                const monto = t.pago?.monto || 0;
                const cliente = t.clienteId?.nombre || 'N/A';
                return `
                <tr>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd;">${i + 1}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd;">${fecha}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd;">${cliente}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd;">${vehiculo}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd;">${servicio}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #ddd; text-align:right;">RD$ ${monto.toLocaleString()}</td>
                </tr>`;
            }).join('');
        } else {
            filasTrabajos = `
            <tr>
                <td colspan="6" style="padding:20px; text-align:center; color:#888;">No hay detalle de trabajos disponibles</td>
            </tr>`;
        }

        const comprobante = window.open('', 'Comprobante', 'width=750,height=700');
        comprobante.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante de Pago - ${empleado}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        padding: 30px; 
                        background: #f5f5f5; 
                        color: #222; 
                    }
                    .comprobante {
                        max-width: 700px;
                        margin: 0 auto;
                        background: #fff;
                        border-radius: 15px;
                        padding: 35px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid ${colorTaller};
                        padding-bottom: 20px;
                        margin-bottom: 25px;
                    }
                    .header .logo-img {
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 3px solid ${colorTaller};
                        margin-bottom: 10px;
                    }
                    .header .logo-placeholder {
                        font-size: 3.5rem;
                        margin-bottom: 10px;
                    }
                    .header h1 {
                        font-size: 1.5rem;
                        color: #1a1a2e;
                        margin-bottom: 3px;
                    }
                    .header .subtitulo {
                        color: #666;
                        font-size: 0.9rem;
                    }
                    .header .comprobante-titulo {
                        display: inline-block;
                        background: ${colorTaller};
                        color: #fff;
                        padding: 6px 20px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        margin-top: 8px;
                        letter-spacing: 1px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 25px;
                        padding: 20px;
                        background: #f9fafb;
                        border-radius: 10px;
                    }
                    .info-item { font-size: 0.9rem; }
                    .info-item strong {
                        display: block;
                        color: #555;
                        font-size: 0.7rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 3px;
                    }
                    .info-item span { color: #1a1a2e; font-size: 0.95rem; }
                    .seccion-titulo {
                        font-size: 1rem;
                        color: #1a1a2e;
                        margin: 20px 0 10px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #e0e0e0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 0.85rem;
                    }
                    thead th {
                        background: #1a1a2e;
                        color: #fff;
                        padding: 10px 8px;
                        text-align: left;
                        font-size: 0.75rem;
                        text-transform: uppercase;
                    }
                    thead th:last-child { text-align: right; }
                    tbody tr:hover { background: #f0fdf4; }
                    .totales {
                        margin-top: 20px;
                        padding: 20px;
                        background: #1a1a2e;
                        border-radius: 10px;
                        color: #fff;
                    }
                    .totales .fila {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 0.9rem;
                    }
                    .totales .fila.total {
                        border-top: 2px solid ${colorTaller};
                        margin-top: 10px;
                        padding-top: 15px;
                        font-size: 1.3rem;
                        font-weight: bold;
                        color: ${colorTaller};
                    }
                    .firma { margin-top: 40px; text-align: center; }
                    .firma .linea {
                        border-top: 1px solid #333;
                        width: 200px;
                        margin: 0 auto 5px;
                    }
                    .footer {
                        margin-top: 25px;
                        text-align: center;
                        color: #999;
                        font-size: 0.75rem;
                        border-top: 1px solid #e0e0e0;
                        padding-top: 15px;
                    }
                    .btn-imprimir {
                        display: block;
                        margin: 20px auto 0;
                        padding: 14px 35px;
                        background: ${colorTaller};
                        color: #fff;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .btn-imprimir:hover {
                        opacity: 0.9;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    @media print {
                        body { background: #fff; padding: 0; }
                        .comprobante { box-shadow: none; border-radius: 0; }
                        .btn-imprimir { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="comprobante">
                    <div class="header">
                        ${tallerActual?.logo ? `<img src="${tallerActual.logo}" class="logo-img" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <div class="logo-placeholder" style="${tallerActual?.logo ? 'display:none;' : ''}">🏪</div>
                        <h1>${tallerActual?.nombre || 'AutoBrillo Detailing'}</h1>
                        <p class="subtitulo">${tallerActual?.direccion?.calle || ''}, ${tallerActual?.direccion?.ciudad || ''}</p>
                        <p class="subtitulo">📞 ${tallerActual?.telefono || 'N/A'} | 📧 ${tallerActual?.email || 'N/A'}</p>
                        <div class="comprobante-titulo">COMPROBANTE DE PAGO</div>
                    </div>

                    <div class="info-grid">
                        <div class="info-item"><strong>👨‍🔧 Empleado</strong><span>${empleado}</span></div>
                        <div class="info-item"><strong>📧 Email</strong><span>${emailEmpleado || 'N/A'}</span></div>
                        <div class="info-item"><strong>📅 Periodo</strong><span>${periodoInicio} - ${periodoFin}</span></div>
                        <div class="info-item"><strong>📅 Fecha de Pago</strong><span>${fechaPago}</span></div>
                        <div class="info-item"><strong>💳 Método</strong><span>${metodosNombres[metodoPago] || metodoPago}</span></div>
                        <div class="info-item"><strong>📌 Estado</strong><span style="color:${colorTaller}; font-weight:600;">✅ ${pago.estado || 'PAGADO'}</span></div>
                    </div>

                    <h3 class="seccion-titulo">🚗 Trabajos Realizados (${totalTrabajos})</h3>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Vehículo</th><th>Servicio</th><th style="text-align:right;">Monto</th></tr>
                        </thead>
                        <tbody>${filasTrabajos}</tbody>
                    </table>

                    <div class="totales">
                        <div class="fila"><span>💰 Total Generado</span><span>RD$ ${totalGenerado.toLocaleString()}</span></div>
                        <div class="fila"><span>📊 Comisión (${comisionPorcentaje}%)</span><span>RD$ ${comisionMonto.toLocaleString()}</span></div>
                        <div class="fila total"><span>💵 TOTAL A PAGAR</span><span>RD$ ${comisionMonto.toLocaleString()}</span></div>
                    </div>

                    <div class="firma">
                        <div class="linea"></div>
                        <p style="color:#888; font-size:0.85rem;">Firma del Empleado</p>
                        <p style="color:#aaa; font-size:0.75rem; margin-top:5px;">${empleado}</p>
                    </div>

                    ${pago.notas ? `
                    <div style="margin-top:20px; padding:15px; background:#fffbea; border-left:4px solid #ffbb33; border-radius:5px;">
                        <strong>📝 Notas:</strong> ${pago.notas}
                    </div>` : ''}

                    <div class="footer">
                        <p>🧾 Comprobante generado por ${tallerActual?.nombre || 'AutoBrillo Detailing'}</p>
                        <p>${new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Comprobante</button>
                </div>
            </body>
            </html>
        `);
        comprobante.document.close();

    } catch (error) {
        console.error('Error al generar comprobante:', error);
        window.mostrarToast?.('❌ Error al generar comprobante', 'error');
    }
};

// ================================================================
// 🔹 CERRAR COMPROBANTE
// ================================================================

window.cerrarComprobante = function () {
    const modal = document.getElementById('modal-comprobante');
    if (modal) modal.remove();
};

// ================================================================
// 🔹 DESCARGAR COMPROBANTE
// ================================================================

window.descargarComprobante = function (url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante_${Date.now()}.png`;
    a.click();
};

// ================================================================
// 🔹 EXPORTAR CSV
// ================================================================

window.exportarPagosCSV = function () {
    // ✅ USAR SOLO LOS PAGOS FILTRADOS DEL EMPLEADO
    if (pagosEmpleado.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // ✅ VERIFICAR QUE SOLO SEAN DEL EMPLEADO ACTUAL
    const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
    const empleadoId = sesionEmpleado?.empleado?._id;

    const pagosFiltrados = pagosEmpleado.filter(p => {
        const empId = p.empleadoId?._id || p.empleadoId || '';
        return String(empId) === String(empleadoId);
    });

    if (pagosFiltrados.length === 0) {
        alert('No hay datos del empleado para exportar');
        return;
    }

    console.log('📥 Exportando', pagosFiltrados.length, 'pagos del empleado');

    const csv = [
        ['Periodo', 'Trabajos', 'Generado', '% Comisión', 'Pagado', 'Método', 'Estado', 'Fecha Pago'],
        ...pagosFiltrados.map(p => {
            let periodo = '';
            if (p.periodo?.inicio) {
                periodo = formatearPeriodo(p.periodo.inicio);
            }
            return [
                periodo,
                p.totalTrabajos || 0,
                p.totalGenerado || 0,
                p.comisionPorcentaje || 30,
                p.comisionMonto || 0,
                p.metodoPago || 'EFECTIVO',
                p.estado || 'PAGADO',
                p.fechaPago ? formatearFecha(p.fechaPago) : ''
            ];
        })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis_pagos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ================================================================
// 🔹 UTILIDADES
// ================================================================

function formatearPeriodo(fecha) {
    if (!fecha) return '—';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('es-DO', { month: 'short', year: 'numeric' });
    } catch (error) {
        return '—';
    }
}

function formatearFecha(fecha) {
    if (!fecha) return '—';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
        return '—';
    }
}