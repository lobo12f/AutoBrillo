// ====================================================================
// 📋 MÓDULO DE HISTORIAL DE TRABAJOS - AUTOBRILLO DETALLING
//    Gestión del historial de trabajos con filtros, detalle y exportación
// ====================================================================

// ================================================================
// 🔹 CARGAR HISTORIAL
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export async function cargarHistorial(pagina = 1) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const tbody = document.getElementById('historial-tbody');
    const statsContainer = document.getElementById('stats-historial');
    const paginacionContainer = document.getElementById('paginacion-historial');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">⏳ Cargando historial...</td></tr>';

    const ITEMS_POR_PAGINA = 20;

    // Cargar empleados para filtros
    try {
        const respEmp = await apiFetch(`/talleres/${tallerActual._id}/empleados`);
        const dataEmp = await respEmp.json();
        const selectEmp = document.getElementById('filtro-historial-empleado');
        if (dataEmp.exito && selectEmp && selectEmp.options.length <= 1) {
            selectEmp.innerHTML = '<option value="TODOS">👥 Todos</option>' +
                dataEmp.empleados.map(e => `<option value="${e._id}">${e.nombre}</option>`).join('');
        }
    } catch (e) { }

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/historial`);
        const data = await response.json();

        if (!data.exito || !data.historial) {
            tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">No hay trabajos en el historial</td></tr>';
            return;
        }

        let historial = [...data.historial];

        // Filtros
        const filtroEmpleado = document.getElementById('filtro-historial-empleado')?.value || 'TODOS';
        const filtroServicio = document.getElementById('filtro-historial-servicio')?.value || 'TODOS';
        const filtroDesde = document.getElementById('filtro-historial-desde')?.value;
        const filtroHasta = document.getElementById('filtro-historial-hasta')?.value;
        const busqueda = (document.getElementById('busqueda-historial')?.value || '').toLowerCase().trim();

        if (filtroEmpleado !== 'TODOS') {
            historial = historial.filter(h => String(h.empleadoAsignado?._id || h.empleadoAsignado) === filtroEmpleado);
        }
        if (filtroServicio !== 'TODOS') {
            historial = historial.filter(h => h.servicio?.nombre === filtroServicio);
        }
        if (filtroDesde) {
            historial = historial.filter(h => new Date(h.fechas?.entrega || h.createdAt) >= new Date(filtroDesde));
        }
        if (filtroHasta) {
            const hastaFin = new Date(filtroHasta);
            hastaFin.setHours(23, 59, 59);
            historial = historial.filter(h => new Date(h.fechas?.entrega || h.createdAt) <= hastaFin);
        }
        if (busqueda) {
            historial = historial.filter(h => {
                const txt = `${h.vehiculo?.placa || ''} ${h.clienteId?.nombre || ''} ${h.servicio?.nombre || ''} ${h.vehiculo?.marca || ''} ${h.vehiculo?.modelo || ''}`.toLowerCase();
                return txt.includes(busqueda);
            });
        }

        // Llenar filtro de servicios dinámicamente
        const serviciosUnicos = [...new Set(historial.map(h => h.servicio?.nombre).filter(Boolean))];
        const selectServ = document.getElementById('filtro-historial-servicio');
        if (selectServ && selectServ.options.length <= 1) {
            selectServ.innerHTML = '<option value="TODOS">🔧 Todos</option>' +
                serviciosUnicos.map(s => `<option value="${s}">${s}</option>`).join('');
        }

        // Ordenar por fecha descendente
        historial.sort((a, b) => new Date(b.fechas?.entrega || b.createdAt) - new Date(a.fechas?.entrega || a.createdAt));

        // Estadísticas
        const totalIngresos = historial.reduce((s, h) => s + (h.pago?.monto || 0), 0);
        const totalTrabajos = historial.length;
        const ticketPromedio = totalTrabajos > 0 ? Math.round(totalIngresos / totalTrabajos) : 0;
        const conteoServicios = {};
        historial.forEach(h => {
            const nombre = h.servicio?.nombre || 'Otro';
            conteoServicios[nombre] = (conteoServicios[nombre] || 0) + 1;
        });
        const servicioPopular = Object.entries(conteoServicios).sort((a, b) => b[1] - a[1])[0];

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div style="background:#131c2b; border:2px solid #00ff8830; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#00ff88;">RD$ ${totalIngresos.toLocaleString()}</div>
                    <small style="color:#888; font-size:0.65rem;">Total Ingresos</small>
                </div>
                <div style="background:#131c2b; border:2px solid #00d4ff30; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#00d4ff;">${totalTrabajos}</div>
                    <small style="color:#888; font-size:0.65rem;">Trabajos</small>
                </div>
                <div style="background:#131c2b; border:2px solid #ffbb3330; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:700; color:#ffbb33;">RD$ ${ticketPromedio.toLocaleString()}</div>
                    <small style="color:#888; font-size:0.65rem;">Ticket Promedio</small>
                </div>
                <div style="background:#131c2b; border:2px solid #ff44ff30; border-radius:10px; padding:12px; text-align:center;">
                    <div style="font-size:0.9rem; font-weight:700; color:#ff44ff;">${servicioPopular ? servicioPopular[0] : 'N/A'}</div>
                    <small style="color:#888; font-size:0.65rem;">Servicio Top (${servicioPopular ? servicioPopular[1] : 0})</small>
                </div>
            `;
        }

        // Paginación
        const totalPaginas = Math.ceil(historial.length / ITEMS_POR_PAGINA);
        const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
        const paginaActual = historial.slice(inicio, inicio + ITEMS_POR_PAGINA);

        if (paginacionContainer && totalPaginas > 1) {
            let pagHTML = '';
            for (let i = 1; i <= totalPaginas; i++) {
                pagHTML += `<button onclick="window.cargarHistorial(${i})" style="padding:8px 14px; border:1px solid ${i === pagina ? '#00ff88' : '#1e2a3a'}; border-radius:8px; background:${i === pagina ? '#00ff8822' : 'transparent'}; color:${i === pagina ? '#00ff88' : '#888'}; cursor:pointer; font-size:0.8rem;">${i}</button>`;
            }
            paginacionContainer.innerHTML = pagHTML;
        } else if (paginacionContainer) {
            paginacionContainer.innerHTML = '';
        }

        // Tabla
        if (paginaActual.length > 0) {
            tbody.innerHTML = paginaActual.map((t, index) => {
                const v = t.vehiculo || {};
                const fecha = t.fechas?.entrega ? new Date(t.fechas.entrega).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/F';
                const hora = t.fechas?.entrega ? new Date(t.fechas.entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '';
                const cliente = t.clienteId?.nombre || 'Cliente';
                const servicio = t.servicio?.nombre || 'Servicio';
                const empleado = t.empleadoAsignado?.nombre || 'N/A';
                const monto = t.pago?.monto || 0;
                const estrellas = t.calificacion?.puntuacion ? '⭐'.repeat(t.calificacion.puntuacion) : '—';

                let duracion = '—';
                if (t.fechas?.inicioTrabajo && t.fechas?.finalizacion) {
                    const min = Math.round((new Date(t.fechas.finalizacion) - new Date(t.fechas.inicioTrabajo)) / 60000);
                    duracion = min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`;
                }

                return `
                <tr style="border-bottom:1px solid #1e2a3a; cursor:pointer; transition:all 0.3s; animation: fadeInUp 0.${3 + index}s ease;" 
                    onmouseover="this.style.background='#1a2640'" onmouseout="this.style.background=''"
                    onclick="window.verDetalleTrabajo('${t._id}')">
                    <td style="padding:12px; white-space:nowrap;">
                        <span style="color:#fff; font-size:0.85rem;">${fecha}</span>
                        <br><small style="color:#888;">${hora}</small>
                    </td>
                    <td style="padding:12px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:30px; height:30px; background:#00ff8822; border:2px solid #00ff88; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#00ff88; font-size:0.7rem;">${cliente.charAt(0)}</div>
                            <span style="color:#fff; font-size:0.85rem;">${cliente}</span>
                        </div>
                    </td>
                    <td style="padding:12px;">
                        <span style="color:#fff;">🚗 ${v.marca || ''} ${v.modelo || ''}</span>
                        <br><small style="color:#888;">🏷️ ${v.placa || 'S/P'}</small>
                    </td>
                    <td style="padding:12px;">
                        <span style="background:rgba(0,255,136,0.08); color:#00ff88; padding:3px 8px; border-radius:10px; font-size:0.78rem;">${servicio}</span>
                    </td>
                    <td style="padding:12px; color:#ccc;">👨‍🔧 ${empleado}</td>
                    <td style="padding:12px; text-align:center; color:#ffbb33; font-size:0.8rem;">${duracion}</td>
                    <td style="padding:12px; text-align:right; color:#00ff88; font-weight:700;">RD$ ${monto.toLocaleString()}</td>
                    <td style="padding:12px; text-align:center; font-size:0.8rem;">${estrellas}</td>
                    <td style="padding:12px; text-align:center;">
                        <button onclick="event.stopPropagation(); window.verDetalleTrabajo('${t._id}')" style="background:transparent; border:1px solid #00d4ff; color:#00d4ff; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:0.7rem;">🔍</button>
                    </td>
                </tr>`;
            }).join('');

            if (paginacionContainer) {
                const fin = Math.min(inicio + ITEMS_POR_PAGINA, historial.length);
                paginacionContainer.innerHTML += `<span style="color:#888; font-size:0.7rem; padding:8px;">${inicio + 1}-${fin} de ${historial.length}</span>`;
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#888;">📭 No hay trabajos con los filtros actuales</td></tr>';
        }

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#ff4444;">Error al cargar historial</td></tr>';
    }
}

// ================================================================
// 🔹 VER DETALLE DE TRABAJO
// ================================================================

// ================================================================
// 🔹 VER DETALLE DE TRABAJO (MEJORADO CON TEMAS)
// ================================================================

export async function verDetalleTrabajo(trabajoId) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || '#00ff88';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/historial`);
        const data = await response.json();
        const trabajo = data.historial?.find(h => h._id === trabajoId);

        if (!trabajo) {
            window.mostrarToast?.('Trabajo no encontrado', 'warning');
            return;
        }

        // Datos del trabajo
        const v = trabajo.vehiculo || {};
        const fecha = trabajo.fechas?.entrega ? new Date(trabajo.fechas.entrega).toLocaleDateString('es-DO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
        const hora = trabajo.fechas?.entrega ? new Date(trabajo.fechas.entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const inicio = trabajo.fechas?.inicioTrabajo ? new Date(trabajo.fechas.inicioTrabajo).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const fin = trabajo.fechas?.finalizacion ? new Date(trabajo.fechas.finalizacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const notas = trabajo.notas || [];
        const cliente = trabajo.clienteId?.nombre || 'N/A';
        const servicio = trabajo.servicio?.nombre || 'N/A';
        const empleado = trabajo.empleadoAsignado?.nombre || 'N/A';
        const monto = trabajo.pago?.monto || 0;
        const metodo = trabajo.pago?.metodo || 'N/A';
        const puntuacion = trabajo.calificacion?.puntuacion || 0;
        const comentario = trabajo.calificacion?.comentario || '';
        const bahia = trabajo.bahiaAsignada || 'N/A';
        const placa = v.placa || 'S/P';
        const vehiculoCompleto = `${v.marca || ''} ${v.modelo || ''} ${v.color ? '(' + v.color + ')' : ''}`;

        // Duración
        let duracion = 'N/A';
        if (trabajo.fechas?.inicioTrabajo && trabajo.fechas?.finalizacion) {
            const min = Math.round((new Date(trabajo.fechas.finalizacion) - new Date(trabajo.fechas.inicioTrabajo)) / 60000);
            duracion = min < 60 ? `${min} minutos` : `${Math.floor(min / 60)}h ${min % 60}m`;
        }

        // Métodos de pago con iconos
        const metodosIconos = {
            'EFECTIVO': '💵', 'TRANSFERENCIA': '🏦', 'TARJETA': '💳', 'CHEQUE': '📝', 'OTRO': '📌'
        };

        // Estrellas visuales
        let estrellasHTML = '';
        for (let i = 1; i <= 5; i++) {
            estrellasHTML += i <= puntuacion
                ? `<span style="color:#ffbb33; font-size:1.2rem;">⭐</span>`
                : `<span style="color:#333; font-size:1.2rem;">☆</span>`;
        }

        // Estado del trabajo
        const estadoBadge = {
            'ENTREGADO': { color: '#00ff88', icono: '✅' },
            'LISTO': { color: '#00d4ff', icono: '🟢' },
            'EN_PROCESO': { color: '#ffbb33', icono: '🔧' }
        };
        const estado = estadoBadge[trabajo.estado] || { color: '#888', icono: '📌' };

        // Crear modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%; 
            background:rgba(0,0,0,0.85); backdrop-filter:blur(5px);
            display:flex; align-items:center; justify-content:center; 
            z-index:10000; animation: fadeIn 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: var(--bg-card, #131c2b); 
                border: 2px solid ${colorTaller}; 
                border-radius: 20px; 
                padding: 0;
                max-width: 600px; 
                width: 95%; 
                max-height: 85vh; 
                overflow-y:auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${colorTaller}20;
                animation: slideUp 0.3s ease;
            ">
                <!-- Encabezado con color del taller -->
                <div style="
                    background: linear-gradient(135deg, ${colorTaller}22, ${colorTaller}08);
                    padding: 25px 30px;
                    border-bottom: 1px solid ${colorTaller}40;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="
                            width: 45px; height: 45px; 
                            background: ${colorTaller}22; 
                            border: 2px solid ${colorTaller}; 
                            border-radius: 14px;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 1.3rem;
                        ">🔍</div>
                        <div>
                            <h3 style="color:#fff; margin:0; font-size:1.1rem;">Detalle del Trabajo</h3>
                            <span style="color:${estado.color}; font-size:0.8rem; font-weight:600;">${estado.icono} ${trabajo.estado || 'N/A'}</span>
                        </div>
                    </div>
                    <span onclick="this.closest('div').parentElement.remove()" 
                        style="font-size:1.5rem; cursor:pointer; color:#888; width:35px; height:35px; 
                            display:flex; align-items:center; justify-content:center; 
                            border-radius:50%; transition:all 0.3s;"
                        onmouseover="this.style.background='#ff444422'; this.style.color='#ff4444';"
                        onmouseout="this.style.background='transparent'; this.style.color='#888';">
                        ✕
                    </span>
                </div>

                <!-- Cuerpo -->
                <div style="padding: 25px 30px;">
                    <!-- Info Principal -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px;">
                        <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:12px;">
                            <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">🚗 Vehículo</small>
                            <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;">${vehiculoCompleto || 'N/A'}</p>
                            <span style="background:${colorTaller}22; color:${colorTaller}; padding:2px 8px; border-radius:8px; font-size:0.7rem;">🏷️ ${placa}</span>
                        </div>
                        <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:12px;">
                            <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">👤 Cliente</small>
                            <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;">${cliente}</p>
                        </div>
                        <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:12px;">
                            <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">🔧 Servicio</small>
                            <p style="color:${colorTaller}; margin:4px 0 0; font-size:0.9rem; font-weight:600;">${servicio}</p>
                        </div>
                        <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:12px;">
                            <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">👨‍🔧 Empleado</small>
                            <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;">${empleado}</p>
                        </div>
                    </div>

                    <!-- Detalles adicionales -->
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:20px;">
                        <div style="text-align:center; padding:12px; background:var(--bg-input, #080c14); border-radius:10px;">
                            <div style="font-size:1.2rem;">🏗️</div>
                            <small style="color:#888; font-size:0.65rem;">Bahía</small>
                            <p style="color:#fff; margin:2px 0 0; font-weight:600;">#${bahia}</p>
                        </div>
                        <div style="text-align:center; padding:12px; background:var(--bg-input, #080c14); border-radius:10px;">
                            <div style="font-size:1.2rem;">⏱️</div>
                            <small style="color:#888; font-size:0.65rem;">Duración</small>
                            <p style="color:#ffbb33; margin:2px 0 0; font-weight:600;">${duracion}</p>
                        </div>
                        <div style="text-align:center; padding:12px; background:var(--bg-input, #080c14); border-radius:10px;">
                            <div style="font-size:1.2rem;">📅</div>
                            <small style="color:#888; font-size:0.65rem;">Entrega</small>
                            <p style="color:#fff; margin:2px 0 0; font-size:0.75rem;">${fecha}<br>${hora}</p>
                        </div>
                    </div>

                    <!-- Línea de tiempo -->
                    <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:15px; margin-bottom:20px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase; display:block; margin-bottom:8px;">⏱️ Línea de Tiempo</small>
                        <div style="display:flex; align-items:center; justify-content:space-between; position:relative;">
                            <div style="text-align:center; z-index:1;">
                                <div style="width:12px; height:12px; background:${colorTaller}; border-radius:50%; margin:0 auto 5px;"></div>
                                <span style="color:#fff; font-size:0.7rem;">Inicio</span>
                                <br><span style="color:#888; font-size:0.65rem;">${inicio}</span>
                            </div>
                            <div style="flex:1; height:2px; background:linear-gradient(90deg, ${colorTaller}, ${colorTaller}60); margin:0 5px; margin-bottom:20px;"></div>
                            <div style="text-align:center; z-index:1;">
                                <div style="width:12px; height:12px; background:#ffbb33; border-radius:50%; margin:0 auto 5px;"></div>
                                <span style="color:#fff; font-size:0.7rem;">Fin</span>
                                <br><span style="color:#888; font-size:0.65rem;">${fin}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Pago -->
                    <div style="background:linear-gradient(135deg, ${colorTaller}15, ${colorTaller}05); border:1px solid ${colorTaller}30; border-radius:12px; padding:18px; margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">💰 Total Cobrado</small>
                                <p style="color:#fff; font-size:1.5rem; font-weight:700; margin:5px 0 0;">RD$ ${monto.toLocaleString()}</p>
                            </div>
                            <div style="text-align:right;">
                                <span style="background:${colorTaller}22; color:${colorTaller}; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:600;">
                                    ${metodosIconos[metodo] || ''} ${metodo}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Calificación -->
                    <div style="background:var(--bg-input, #080c14); border-radius:10px; padding:15px; margin-bottom:20px; text-align:center;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">⭐ Calificación del Cliente</small>
                        <div style="margin:8px 0;">${estrellasHTML}</div>
                        ${comentario ? `<p style="color:#aaa; font-size:0.85rem; font-style:italic; margin:0;">"${comentario}"</p>` : '<p style="color:#666; font-size:0.8rem;">Sin comentario</p>'}
                    </div>

                    <!-- Notas -->
                    ${notas.length > 0 ? `
                    <div style="border-top:1px solid var(--border-color, #1e2a3a); padding-top:15px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase; display:block; margin-bottom:8px;">📝 Historial de Notas</small>
                        <div style="max-height:150px; overflow-y:auto;">
                            ${notas.slice().reverse().map(n => `
                                <div style="display:flex; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-light, #1e2a3a22);">
                                    <div style="width:8px; height:8px; background:${colorTaller}; border-radius:50%; margin-top:6px; flex-shrink:0;"></div>
                                    <div>
                                        <p style="color:#ccc; font-size:0.8rem; margin:0;">${n.texto}</p>
                                        <small style="color:#666; font-size:0.65rem;">${new Date(n.fecha).toLocaleString('es-DO')} · ${n.autor || 'Sistema'}</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;

        // Animaciones CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        modal.appendChild(style);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => modal.remove(), 200);
            }
        });
        document.body.appendChild(modal);

    } catch (error) {
        window.mostrarToast?.('❌ Error al cargar detalle', 'error');
    }
}
// ================================================================
// 🔹 EXPORTAR A CSV
// ================================================================

export async function exportarHistorialCSV() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/historial`);
        const data = await response.json();
        const historial = data.historial || [];

        let csv = '\uFEFFFecha,Cliente,Vehículo,Placa,Servicio,Empleado,Duración,Monto,Método,Calificación\n';

        historial.forEach(h => {
            const fecha = h.fechas?.entrega ? new Date(h.fechas.entrega).toLocaleDateString('es-DO') : '';
            let duracion = '';
            if (h.fechas?.inicioTrabajo && h.fechas?.finalizacion) {
                const min = Math.round((new Date(h.fechas.finalizacion) - new Date(h.fechas.inicioTrabajo)) / 60000);
                duracion = min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`;
            }
            const puntuacion = h.calificacion?.puntuacion || 0;
            const estrellas = puntuacion > 0 ? '⭐'.repeat(puntuacion) : 'Sin calificar';

            csv += `"${fecha}","${h.clienteId?.nombre || ''}","${h.vehiculo?.marca || ''} ${h.vehiculo?.modelo || ''}","${h.vehiculo?.placa || ''}","${h.servicio?.nombre || ''}","${h.empleadoAsignado?.nombre || ''}","${duracion}","RD$ ${(h.pago?.monto || 0).toLocaleString()}","${h.pago?.metodo || ''}","${estrellas}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `historial_trabajos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        window.mostrarToast?.('✅ Archivo CSV descargado', 'success');
    } catch (error) {
        window.mostrarToast?.('❌ Error al exportar', 'error');
    }
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarHistorialTrabajos() {
    window.cargarHistorial = cargarHistorial;
    window.verDetalleTrabajo = verDetalleTrabajo;
    window.exportarHistorialCSV = exportarHistorialCSV;
    console.log('📋 Módulo de Historial de Trabajos inicializado');
}