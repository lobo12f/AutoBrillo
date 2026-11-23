// ====================================================================
// 💳 MÓDULO DE HISTORIAL DE PAGOS - AUTOBRILLO DETALLING
//    Gestión de pagos a empleados con comprobante profesional
// ====================================================================

// ================================================================
// 🔹 CARGAR HISTORIAL DE PAGOS
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export async function cargarHistorialPagos() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const tbody = document.getElementById('tbody-pagos');
    const resumenContainer = document.getElementById('resumen-pagos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">⏳ Cargando historial de pagos...</td></tr>';

    const filtroEmpleado = document.getElementById('filtro-pago-empleado')?.value || 'TODOS';
    const filtroMes = document.getElementById('filtro-pago-mes')?.value || 'TODOS';
    const filtroEstado = document.getElementById('filtro-pago-estado')?.value || 'TODOS';
    const busqueda = (document.getElementById('busqueda-pago')?.value || '').toLowerCase().trim();

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`);
        const data = await response.json();

        if (!data.exito || !data.pagos) {
            tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">No hay pagos registrados</td></tr>';
            return;
        }

        let pagos = [...data.pagos];

        // Aplicar filtros
        if (filtroEmpleado !== 'TODOS') {
            pagos = pagos.filter(p => String(p.empleadoId?._id) === filtroEmpleado);
        }
        if (filtroMes !== 'TODOS') {
            const mes = parseInt(filtroMes);
            pagos = pagos.filter(p => {
                const fecha = new Date(p.periodo?.inicio || p.fechaPago);
                return fecha.getMonth() === mes;
            });
        }
        if (filtroEstado !== 'TODOS') {
            pagos = pagos.filter(p => p.estado === filtroEstado);
        }
        if (busqueda) {
            pagos = pagos.filter(p => (p.empleadoId?.nombre || '').toLowerCase().includes(busqueda));
        }

        // Ordenar por fecha descendente
        pagos.sort((a, b) => new Date(b.periodo?.inicio || b.fechaPago || 0) - new Date(a.periodo?.inicio || a.fechaPago || 0));

        // Resumen rápido
        if (resumenContainer) {
            const totalPagado = pagos.filter(p => p.estado === 'PAGADO').reduce((s, p) => s + (p.comisionMonto || 0), 0);
            const totalPendiente = pagos.filter(p => p.estado === 'PENDIENTE').reduce((s, p) => s + (p.comisionMonto || 0), 0);
            const totalTrabajos = pagos.reduce((s, p) => s + (p.totalTrabajos || 0), 0);

            resumenContainer.innerHTML = `
                <div style="background:#131c2b; border:2px solid #00ff8830; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#00ff88;">RD$ ${totalPagado.toLocaleString()}</div>
                    <small style="color:#888; font-size:0.65rem;">Total Pagado</small>
                </div>
                <div style="background:#131c2b; border:2px solid #ffbb3330; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#ffbb33;">RD$ ${totalPendiente.toLocaleString()}</div>
                    <small style="color:#888; font-size:0.65rem;">Pendiente</small>
                </div>
                <div style="background:#131c2b; border:2px solid #00d4ff30; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#00d4ff;">${totalTrabajos}</div>
                    <small style="color:#888; font-size:0.65rem;">Total Trabajos</small>
                </div>
                <div style="background:#131c2b; border:2px solid #ff44ff30; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#ff44ff;">${pagos.length}</div>
                    <small style="color:#888; font-size:0.65rem;">Registros</small>
                </div>
            `;
        }

        // Llenar filtro de empleados dinámicamente
        const empleadosUnicos = [...new Set(pagos.map(p => p.empleadoId?.nombre).filter(Boolean))];
        const empleadosIds = [...new Set(pagos.map(p => String(p.empleadoId?._id)).filter(Boolean))];
        const selectEmp = document.getElementById('filtro-pago-empleado');
        if (selectEmp && selectEmp.options.length <= 1) {
            selectEmp.innerHTML = '<option value="TODOS">👥 Todos los empleados</option>' +
                empleadosIds.map((id, i) => `<option value="${id}">${empleadosUnicos[i] || id}</option>`).join('');
        }

        // Tabla de pagos
        if (pagos.length > 0) {
            tbody.innerHTML = pagos.map(p => {
                const empleado = p.empleadoId?.nombre || 'N/A';
                const periodo = p.periodo?.inicio
                    ? new Date(p.periodo.inicio).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })
                    : 'N/A';
                const monto = p.comisionMonto || 0;
                const estadoIcon = p.estado === 'PAGADO' ? '✅' : '⏳';
                const estadoColor = p.estado === 'PAGADO' ? '#00ff88' : '#ffbb33';
                const fechaPago = p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-DO') : '—';

                return `
                <tr style="border-bottom:1px solid #1e2a3a; cursor:pointer; transition:all 0.3s;" 
                    onmouseover="this.style.background='#1a2640'" onmouseout="this.style.background=''">
                    <td style="padding:12px; color:#fff;">👨‍🔧 ${empleado}</td>
                    <td style="padding:12px; text-align:center; color:#ccc;">${periodo}</td>
                    <td style="padding:12px; text-align:center; color:#00d4ff; font-weight:600;">${p.totalTrabajos || 0}</td>
                    <td style="padding:12px; text-align:center; color:#ffbb33;">RD$ ${(p.totalGenerado || 0).toLocaleString()}</td>
                    <td style="padding:12px; text-align:center; color:#ccc;">${p.comisionPorcentaje || 0}%</td>
                    <td style="padding:12px; text-align:right; color:#00ff88; font-weight:700;">RD$ ${monto.toLocaleString()}</td>
                    <td style="padding:12px; text-align:center; color:#ccc;">${p.metodoPago || 'N/A'}</td>
                    <td style="padding:12px; text-align:center;">
                        <span style="color:${estadoColor}; font-weight:600;">${estadoIcon} ${p.estado}</span>
                        ${p.estado === 'PAGADO' ? `<br><small style="color:#888; font-size:0.7rem;">${fechaPago}</small>` : ''}
                    </td>
                    <td style="padding:12px; text-align:center;">
                        <button onclick="window.verComprobantePago('${p._id}')" 
                            style="background:transparent; border:1px solid #00d4ff; color:#00d4ff; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:0.7rem;" title="Ver comprobante">🧾</button>
                        ${p.estado === 'PENDIENTE' ? `
                        <button onclick="window.cambiarEstadoPago('${p._id}', 'PAGADO')" 
                            style="background:transparent; border:1px solid #00ff88; color:#00ff88; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:0.7rem;" title="Marcar como pagado">✅</button>` : `
                        <button onclick="window.cambiarEstadoPago('${p._id}', 'PENDIENTE')" 
                            style="background:transparent; border:1px solid #ffbb33; color:#ffbb33; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:0.7rem;" title="Marcar como pendiente">⏳</button>`}
                    </td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">📭 No hay pagos con los filtros actuales</td></tr>';
        }

    } catch (error) {
        console.error('Error al cargar pagos:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#ff4444;">Error al cargar historial de pagos</td></tr>';
    }
}

// ================================================================
// 🔹 CAMBIAR ESTADO DE PAGO
// ================================================================

export async function cambiarEstadoPago(pagoId, nuevoEstado) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


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
            window.mostrarToast?.('✅ Estado de pago actualizado', 'success');
            cargarHistorialPagos();
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error'), 'error');
        }
    } catch (error) {
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
}

// ================================================================
// 🔹 VER COMPROBANTE DE PAGO (PROFESIONAL)
// ================================================================

export async function verComprobantePago(pagoId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));


    try {
        // Obtener datos del pago
        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`);
        const data = await response.json();
        const pago = data.pagos?.find(p => p._id === pagoId);

        if (!pago) {
            window.mostrarToast?.('Pago no encontrado', 'error');
            return;
        }

        // Obtener trabajos incluidos en este pago
        let trabajosDetalle = [];
        if (pago.trabajosIncluidos && pago.trabajosIncluidos.length > 0) {
            const respHistorial = await apiFetch(`/talleres/${tallerActual._id}/historial`);
            const dataHistorial = await respHistorial.json();
            const historial = dataHistorial.historial || [];

            trabajosDetalle = historial.filter(h =>
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

        // Generar filas de trabajos
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

        // Crear ventana del comprobante
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
                        ${tallerActual?.logo
                ? `<img src="${tallerActual.logo}" class="logo-img" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
                : ''}
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
}

// ================================================================
// 🔹 EXPORTAR PAGOS A CSV
// ================================================================

export async function exportarPagosCSV() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/pagos`);
        const data = await response.json();
        const pagos = data.pagos || [];

        let csv = '\uFEFFEmpleado,Email,Periodo Inicio,Periodo Fin,Trabajos,Generado,Comision %,Pagado,Método,Estado,Fecha Pago,Notas\n';

        pagos.forEach(p => {
            csv += `"${p.empleadoId?.nombre || ''}","${p.empleadoId?.email || ''}","${p.periodo?.inicio || ''}","${p.periodo?.fin || ''}",${p.totalTrabajos || 0},${p.totalGenerado || 0},${p.comisionPorcentaje || 0},${p.comisionMonto || 0},"${p.metodoPago || ''}","${p.estado || ''}","${p.fechaPago || ''}","${p.notas || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pagos_empleados_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        window.mostrarToast?.('✅ Archivo CSV descargado', 'success');
    } catch (error) {
        window.mostrarToast?.('❌ Error al exportar', 'error');
    }
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarHistorialPagos() {
    window.cargarHistorialPagos = cargarHistorialPagos;
    window.cambiarEstadoPago = cambiarEstadoPago;
    window.verComprobantePago = verComprobantePago;
    window.exportarPagosCSV = exportarPagosCSV;
}