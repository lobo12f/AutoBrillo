// ====================================================================
// 📜 MÓDULO DE HISTORIAL - AUTOBRILLO DETALLING
//    Historial completo con tabla, filtros, estadísticas y paginación
// ====================================================================
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';
let historialEmpleado = [];
let paginaHistorial = 1;
const ITEMS_POR_PAGINA = 15;

// ================================================================
// 🔹 INICIALIZAR
// ================================================================

export function inicializarHistorial() {
    window.cargarHistorial = cargarHistorial;
    window.exportarHistorialCSV = exportarHistorialCSV;
    window.cambiarPaginaHistorial = cambiarPaginaHistorial;
    window.verDetalleHistorial = verDetalleHistorial;

    console.log('📜 Módulo de Historial inicializado');
}

// ================================================================
// 🔹 CARGAR HISTORIAL
// ================================================================

export async function cargarHistorial() {
    const tbody = document.getElementById('historial-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="padding:40px; text-align:center; color:#888;">⏳ Cargando historial...</td></tr>';

    try {
        const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const empleadoId = sesionEmpleado?.empleado?._id;
        const tallerId = tallerActual?._id || sesionEmpleado?.tallerId;


        // Obtener historial (ENTREGADO)
        const responseHistorial = await apiFetch(`/talleres/${tallerId}/historial`);
        const dataHistorial = await responseHistorial.json();

        // Obtener citas (LISTO)
        const responseCitas = await apiFetch(`/talleres/${tallerId}/citas`);
        const dataCitas = await responseCitas.json();

        // Combinar
        const historialCompleto = [
            ...(dataHistorial.historial || []),
            ...(dataCitas.citas || []).filter(c => c.estado === 'LISTO')
        ];

        // Eliminar duplicados
        const trabajosUnicos = [];
        const idsVistos = new Set();
        historialCompleto.forEach(t => {
            const id = t._id?.toString();
            if (id && !idsVistos.has(id)) {
                idsVistos.add(id);
                trabajosUnicos.push(t);
            }
        });

        // Filtrar por empleado
        historialEmpleado = trabajosUnicos.filter(h => {
            const empAsignado = h.empleadoAsignado?._id || h.empleadoAsignado || h.empleadoId || '';
            if (h.estado === 'LISTO' && !empAsignado) return true;
            return String(empAsignado) === String(empleadoId);
        });

        // Ordenar por fecha más reciente
        historialEmpleado.sort((a, b) => {
            const fechaA = new Date(a.fechas?.entrega || a.fechas?.finalizacion || a.createdAt || 0);
            const fechaB = new Date(b.fechas?.entrega || b.fechas?.finalizacion || b.createdAt || 0);
            return fechaB - fechaA;
        });

        console.log('📊 Historial cargado:', historialEmpleado.length, 'trabajos');

        // Cargar servicios para filtro
        cargarServiciosFiltro();

        // Actualizar estadísticas
        actualizarEstadisticasHistorial();

        // Resetear paginación
        paginaHistorial = 1;

        // Renderizar
        renderizarTablaHistorial();

    } catch (error) {
        console.error('Error al cargar historial:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="padding:40px; text-align:center; color:#ff4444;">❌ Error al cargar historial</td></tr>';
    }
}

// ================================================================
// 🔹 CARGAR SERVICIOS PARA FILTRO
// ================================================================

async function cargarServiciosFiltro() {
    try {
        const select = document.getElementById('filtro-historial-servicio');
        if (!select) return;

        const serviciosUnicos = [...new Set(historialEmpleado.map(h => h.servicio?.nombre).filter(Boolean))];
        select.innerHTML = '<option value="TODOS">🔧 Todos los servicios</option>' +
            serviciosUnicos.map(s => `<option value="${s}">${s}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar servicios:', error);
    }
}

// ================================================================
// 🔹 ACTUALIZAR ESTADÍSTICAS
// ================================================================

function actualizarEstadisticasHistorial() {
    const total = historialEmpleado.length;
    const ingresos = historialEmpleado.reduce((s, t) => s + (t.servicio?.precio || 0), 0);

    const cals = historialEmpleado.filter(t => t.calificacion?.puntuacion);
    const calificacionPromedio = cals.length > 0
        ? (cals.reduce((s, t) => s + t.calificacion.puntuacion, 0) / cals.length).toFixed(1)
        : 'N/A';

    // Duración promedio
    const duraciones = historialEmpleado.filter(t => t.fechas?.inicioTrabajo && t.fechas?.finalizacion);
    const duracionPromedioMin = duraciones.length > 0
        ? Math.round(duraciones.reduce((s, t) => {
            const inicio = new Date(t.fechas.inicioTrabajo);
            const fin = new Date(t.fechas.finalizacion);
            return s + (fin - inicio) / 60000;
        }, 0) / duraciones.length)
        : 0;

    document.getElementById('hist-total').textContent = total;
    document.getElementById('hist-ingresos').textContent = `$${ingresos.toLocaleString()}`;
    document.getElementById('hist-calificacion').textContent = calificacionPromedio;
    document.getElementById('hist-duracion-promedio').textContent = `${duracionPromedioMin}min`;
}

// ================================================================
// 🔹 RENDERIZAR TABLA
// ================================================================

function renderizarTablaHistorial() {
    const tbody = document.getElementById('historial-tbody');
    if (!tbody) return;

    // Aplicar filtros
    let filtrados = [...historialEmpleado];

    // Filtro servicio
    const servicioFiltro = document.getElementById('filtro-historial-servicio')?.value;
    if (servicioFiltro && servicioFiltro !== 'TODOS') {
        filtrados = filtrados.filter(t => t.servicio?.nombre === servicioFiltro);
    }

    // Filtro fecha desde
    const desde = document.getElementById('filtro-historial-desde')?.value;
    if (desde) {
        const fechaDesde = new Date(desde);
        filtrados = filtrados.filter(t => {
            const fecha = new Date(t.fechas?.entrega || t.fechas?.finalizacion || t.createdAt);
            return fecha >= fechaDesde;
        });
    }

    // Filtro fecha hasta
    const hasta = document.getElementById('filtro-historial-hasta')?.value;
    if (hasta) {
        const fechaHasta = new Date(hasta);
        fechaHasta.setHours(23, 59, 59);
        filtrados = filtrados.filter(t => {
            const fecha = new Date(t.fechas?.entrega || t.fechas?.finalizacion || t.createdAt);
            return fecha <= fechaHasta;
        });
    }

    // Búsqueda
    const busqueda = document.getElementById('busqueda-historial')?.value?.toLowerCase() || '';
    if (busqueda) {
        filtrados = filtrados.filter(t => {
            const placa = t.vehiculo?.placa?.toLowerCase() || '';
            const marca = t.vehiculo?.marca?.toLowerCase() || '';
            const modelo = t.vehiculo?.modelo?.toLowerCase() || '';
            const cliente = t.clienteId?.nombre?.toLowerCase() || '';
            const servicio = t.servicio?.nombre?.toLowerCase() || '';
            return placa.includes(busqueda) || marca.includes(busqueda) ||
                modelo.includes(busqueda) || cliente.includes(busqueda) ||
                servicio.includes(busqueda);
        });
    }

    // Paginación
    const totalPaginas = Math.ceil(filtrados.length / ITEMS_POR_PAGINA);
    const inicio = (paginaHistorial - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const trabajosPagina = filtrados.slice(inicio, fin);

    if (trabajosPagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:40px; text-align:center; color:#888;">📭 No se encontraron trabajos</td></tr>';
        document.getElementById('paginacion-historial').innerHTML = '';
        return;
    }

    tbody.innerHTML = trabajosPagina.map(trabajo => renderizarFilaHistorial(trabajo)).join('');

    // Renderizar paginación
    renderizarPaginacion(totalPaginas);
}

// ================================================================
// 🔹 RENDERIZAR FILA
// ================================================================

function renderizarFilaHistorial(trabajo) {
    const fecha = formatearFecha(trabajo.fechas?.entrega || trabajo.fechas?.finalizacion || trabajo.createdAt);
    const cliente = trabajo.clienteId?.nombre || 'Cliente';
    const vehiculo = `${trabajo.vehiculo?.marca || ''} ${trabajo.vehiculo?.modelo || ''}`.trim() || 'N/A';
    const placa = trabajo.vehiculo?.placa || 'S/P';
    const servicio = trabajo.servicio?.nombre || 'N/A';
    const monto = trabajo.servicio?.precio || 0;
    const calificacion = trabajo.calificacion?.puntuacion || 0;
    const estrellas = calificacion > 0 ? '⭐'.repeat(calificacion) : '—';

    // Duración
    let duracion = '—';
    if (trabajo.fechas?.inicioTrabajo && trabajo.fechas?.finalizacion) {
        const inicio = new Date(trabajo.fechas.inicioTrabajo);
        const fin = new Date(trabajo.fechas.finalizacion);
        const minutos = Math.round((fin - inicio) / 60000);
        duracion = minutos < 60 ? `${minutos}min` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
    }

    return `
    <tr style="border-bottom:1px solid #1e2a3a; cursor:pointer; transition:all 0.2s;"
        onmouseover="this.style.background='rgba(0,255,136,0.03)';"
        onmouseout="this.style.background='transparent';"
        onclick="verDetalleHistorial('${trabajo._id}')">
        <td style="padding:12px; font-size:0.75rem; color:#aaa;">${fecha}</td>
        <td style="padding:12px; font-size:0.75rem; color:#aaa;">${cliente}</td>
        <td style="padding:12px; font-size:0.75rem; color:#aaa;">${vehiculo} <span style="color:#666;">(${placa})</span></td>
        <td style="padding:12px; font-size:0.75rem; color:#00d4ff;">${servicio}</td>
        <td style="padding:12px; text-align:center; font-size:0.7rem; color:#888;">${duracion}</td>
        <td style="padding:12px; text-align:right; font-size:0.8rem; font-weight:600; color:#00ff88;">$${monto.toLocaleString()}</td>
        <td style="padding:12px; text-align:center; font-size:0.7rem;">${estrellas}</td>
        <td style="padding:12px; text-align:center;">
            <span style="font-size:0.9rem;">👁️</span>
        </td>
    </tr>`;
}

// ================================================================
// 🔹 PAGINACIÓN
// ================================================================

function renderizarPaginacion(totalPaginas) {
    const container = document.getElementById('paginacion-historial');
    if (!container) return;

    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Botón anterior
    html += `<button onclick="cambiarPaginaHistorial(${paginaHistorial - 1})" 
        ${paginaHistorial === 1 ? 'disabled' : ''}
        style="padding:8px 14px; border:1px solid ${paginaHistorial === 1 ? '#333' : '#00ff88'}; border-radius:8px; background:${paginaHistorial === 1 ? 'transparent' : 'rgba(0,255,136,0.1)'}; color:${paginaHistorial === 1 ? '#666' : '#00ff88'}; cursor:${paginaHistorial === 1 ? 'default' : 'pointer'}; font-size:0.75rem;">
        ←
    </button>`;

    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === paginaHistorial) {
            html += `<button style="padding:8px 14px; border:1px solid #00ff88; border-radius:8px; background:#00ff88; color:#000; font-weight:bold; font-size:0.75rem;">${i}</button>`;
        } else {
            html += `<button onclick="cambiarPaginaHistorial(${i})" 
                style="padding:8px 14px; border:1px solid #333; border-radius:8px; background:transparent; color:#aaa; cursor:pointer; font-size:0.75rem;">
                ${i}
            </button>`;
        }
    }

    // Botón siguiente
    html += `<button onclick="cambiarPaginaHistorial(${paginaHistorial + 1})" 
        ${paginaHistorial === totalPaginas ? 'disabled' : ''}
        style="padding:8px 14px; border:1px solid ${paginaHistorial === totalPaginas ? '#333' : '#00ff88'}; border-radius:8px; background:${paginaHistorial === totalPaginas ? 'transparent' : 'rgba(0,255,136,0.1)'}; color:${paginaHistorial === totalPaginas ? '#666' : '#00ff88'}; cursor:${paginaHistorial === totalPaginas ? 'default' : 'pointer'}; font-size:0.75rem;">
        →
    </button>`;

    container.innerHTML = html;
}

// ================================================================
// 🔹 CAMBIAR PÁGINA
// ================================================================

window.cambiarPaginaHistorial = function (pagina) {
    paginaHistorial = pagina;
    renderizarTablaHistorial();
};

// ================================================================
// 🔹 VER DETALLE
// ================================================================

window.verDetalleHistorial = function (citaId) {
    if (window.mostrarDetalleCita) {
        window.mostrarDetalleCita(citaId);
    }
};

// ================================================================
// 🔹 EXPORTAR CSV
// ================================================================

window.exportarHistorialCSV = function () {
    if (historialEmpleado.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const csv = [
        ['Fecha', 'Cliente', 'Vehículo', 'Placa', 'Servicio', 'Monto', 'Calificación', 'Duración'],
        ...historialEmpleado.map(t => {
            const fecha = formatearFecha(t.fechas?.entrega || t.fechas?.finalizacion || t.createdAt);
            const cliente = t.clienteId?.nombre || 'Cliente';
            const vehiculo = `${t.vehiculo?.marca || ''} ${t.vehiculo?.modelo || ''}`.trim();
            const placa = t.vehiculo?.placa || 'S/P';
            const servicio = t.servicio?.nombre || 'N/A';
            const monto = t.servicio?.precio || 0;
            const calificacion = t.calificacion?.puntuacion || 0;
            return [fecha, cliente, vehiculo, placa, servicio, monto, calificacion, ''];
        })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ================================================================
// 🔹 UTILIDADES
// ================================================================

function formatearFecha(fecha) {
    if (!fecha) return 'S/F';
    return new Date(fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}