// ====================================================================
// 🔧 MÓDULO DE TRABAJOS - AUTOBRILLO DETALLING
//    Gestión de trabajos con estadísticas, filtros y cards mejoradas
// ====================================================================
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';
let trabajosActuales = window.trabajosActuales || [];
let tabTrabajosActual = 'pendientes';
let empleadoId = null;
let tallerId = null;
let rolUsuario = null;

// ================================================================
// 🔹 CAMBIAR TAB - CORREGIDO
// ================================================================

export function cambiarTab(tab) {
    tabTrabajosActual = tab;

    // Actualizar tabs visualmente
    const tabPendientes = document.getElementById('tab-pendientes');
    const tabRealizados = document.getElementById('tab-realizados');

    if (tabPendientes && tabRealizados) {
        if (tab === 'pendientes') {
            tabPendientes.style.background = 'rgba(0,255,136,0.1)';
            tabPendientes.style.borderColor = '#00ff88';
            tabPendientes.style.color = '#00ff88';
            tabRealizados.style.background = 'transparent';
            tabRealizados.style.borderColor = '#333';
            tabRealizados.style.color = '#aaa';
        } else {
            tabRealizados.style.background = 'rgba(0,255,136,0.1)';
            tabRealizados.style.borderColor = '#00ff88';
            tabRealizados.style.color = '#00ff88';
            tabPendientes.style.background = 'transparent';
            tabPendientes.style.borderColor = '#333';
            tabPendientes.style.color = '#aaa';
        }
    }

    // Mostrar/ocultar contenedores
    const contenedorPendientes = document.getElementById('contenedor-pendientes');
    const contenedorRealizados = document.getElementById('contenedor-realizados');

    if (contenedorPendientes) contenedorPendientes.style.display = tab === 'pendientes' ? 'block' : 'none';
    if (contenedorRealizados) contenedorRealizados.style.display = tab === 'realizados' ? 'block' : 'none';

    // ✅ Limpiar contenido y cargar SOLO el tab actual
    if (tab === 'pendientes') {
        if (contenedorRealizados) contenedorRealizados.innerHTML = '';
        cargarTrabajosPendientes();
    } else {
        if (contenedorPendientes) contenedorPendientes.innerHTML = '';
        cargarTrabajosRealizados();
    }

    // ✅ Las estadísticas NO se recalculan aquí, ya son globales
}

// ================================================================
// 🔹 ACTUALIZAR TAB ACTUAL (BOTÓN ACTUALIZAR)
// ================================================================

export function actualizarTabActual() {
    if (tabTrabajosActual === 'pendientes') {
        cargarTrabajosPendientes();
    } else {
        cargarTrabajosRealizados();
    }
}

// ================================================================
// 🔹 CARGAR TRABAJOS
// ================================================================

export async function cargarTrabajos() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
    const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

    if (!tallerActual && !sesionEmpleado) {
        console.error('No hay sesión activa');
        return;
    }

    tallerId = tallerActual?._id || sesionEmpleado?.tallerId || null;
    rolUsuario = sesionEmpleado ? 'EMPLEADO' : (tallerActual?.rol || 'EMPLEADO');

    empleadoId = sesionEmpleado?.empleado?._id ||
        sesionEmpleado?._id ||
        localStorage.getItem('empleado_id') ||
        localStorage.getItem('empleadoId') ||
        null;

    console.log('👤 Empleado ID:', empleadoId);
    console.log('📑 Tab actual:', tabTrabajosActual);

    // ✅ PRIMERO: Cargar TODAS las estadísticas del empleado
    await cargarEstadisticasGlobales();

    // ✅ LUEGO: Cargar según el tab
    if (tabTrabajosActual === 'pendientes') {
        await cargarTrabajosPendientes();
    } else {
        await cargarTrabajosRealizados();
    }
}

// ================================================================
// 🔹 CARGAR TRABAJOS PENDIENTES - CORREGIDO
// ================================================================

async function cargarTrabajosPendientes() {
    const container = document.getElementById('contenedor-pendientes');
    if (!container) return;

    // ✅ SOLO mostrar "Cargando..." si el contenedor está vacío
    if (container.children.length === 0 || container.querySelector('.empty-state')) {
        container.innerHTML = '<p class="loading">Cargando trabajos pendientes...</p>';
    }

    try {

        const response = await apiFetch(`/talleres/${tallerId}/citas`);
        const data = await response.json();

        if (!data.exito) {
            if (container.children.length === 0) {
                container.innerHTML = '<p class="empty-state">Error al cargar</p>';
            }
            return;
        }

        const misCitas = data.citas.filter(c => {
            const empAsignado = c.empleadoAsignado?._id ||
                c.empleadoAsignado ||
                c.empleadoId ||
                '';
            const coincide = String(empAsignado) === String(empleadoId);
            const estadoValido = ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO'].includes(c.estado);
            return coincide && estadoValido;
        });

        console.log('📊 Mis citas pendientes:', misCitas.length);

        trabajosActuales = misCitas;
        window.trabajosActuales = misCitas;

        if (misCitas.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <span style="font-size:3rem; display:block; margin-bottom:10px;">🎉</span>
                    <p style="color:#666;">No tienes trabajos pendientes</p>
                </div>`;
            return;
        }

        // ✅ Renderizar sin parpadeo
        const nuevoHTML = misCitas.map(cita => renderizarCitaCard(cita)).join('');
        if (container.innerHTML !== nuevoHTML) {
            container.innerHTML = nuevoHTML;
        }

    } catch (error) {
        console.error('Error:', error);
        if (container.children.length === 0) {
            container.innerHTML = '<p class="empty-state">Error al cargar</p>';
        }
    }
}

// ================================================================
// 🔹 CARGAR TRABAJOS REALIZADOS - CORREGIDO
// ================================================================

async function cargarTrabajosRealizados() {
    const container = document.getElementById('contenedor-realizados');
    if (!container) return;
    // ✅ Aplicar estilo de scroll al contenedor
    container.style.maxHeight = '600px';
    container.style.overflowY = 'auto';
    container.style.paddingRight = '8px';
    container.style.scrollbarWidth = 'thin';
    container.style.scrollbarColor = '#00ff88 #1e2a3a';
    try {


        // Obtener historial
        const responseHistorial = await apiFetch(`/talleres/${tallerId}/historial`);
        const dataHistorial = await responseHistorial.json();

        // Obtener citas
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

        // ✅ FILTRAR - CORREGIDO PARA INCLUIR LISTO SIN EMPLEADO
        const misTrabajos = trabajosUnicos.filter(h => {
            const empAsignado = h.empleadoAsignado?._id || h.empleadoAsignado || h.empleadoId || '';
            const coincide = String(empAsignado) === String(empleadoId);

            // ✅ SI ES LISTO Y NO TIENE EMPLEADO, INCLUIRLO
            if (h.estado === 'LISTO' && !empAsignado) {
                return true;
            }

            return coincide;
        });

        console.log('📊 Total trabajos realizados:', misTrabajos.length);
        console.log('📊 Trabajos LISTO:', misTrabajos.filter(t => t.estado === 'LISTO').length);

        // Mostrar los 5 más recientes para debug
        misTrabajos.slice(0, 5).forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.vehiculo?.marca} - Estado: ${t.estado} - Empleado: ${t.empleadoAsignado?._id || t.empleadoAsignado || 'SIN ASIGNAR'} - Fecha: ${t.fechas?.entrega || t.fechas?.finalizacion || t.createdAt}`);
        });

        trabajosActuales = misTrabajos;
        window.trabajosActuales = misTrabajos;

        if (misTrabajos.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <span style="font-size:3rem; display:block; margin-bottom:10px;">📭</span>
                    <p style="color:#666;">No tienes trabajos realizados</p>
                </div>`;
            return;
        }

        // Ordenar por fecha más reciente
        const nuevoHTML = misTrabajos
            .sort((a, b) => {
                const fechaA = new Date(a.fechas?.entrega || a.fechas?.finalizacion || a.createdAt || 0);
                const fechaB = new Date(b.fechas?.entrega || b.fechas?.finalizacion || b.createdAt || 0);
                return fechaB - fechaA;
            })
            .map(trabajo => renderizarTrabajoRealizado(trabajo))
            .join('');

        if (container.innerHTML !== nuevoHTML) {
            container.innerHTML = nuevoHTML;
        }

    } catch (error) {
        console.error('Error al cargar historial:', error);
        if (container.children.length === 0) {
            container.innerHTML = '<p class="empty-state">Error al cargar</p>';
        }
    }
}

// ================================================================
// 🔹 CARGAR ESTADÍSTICAS GLOBALES DEL EMPLEADO
// ================================================================

async function cargarEstadisticasGlobales() {
    try {


        // Obtener citas activas
        const responseCitas = await apiFetch(`/talleres/${tallerId}/citas`);
        const dataCitas = await responseCitas.json();

        // Obtener historial
        const responseHistorial = await apiFetch(`/talleres/${tallerId}/historial`);
        const dataHistorial = await responseHistorial.json();

        // Filtrar por empleado
        const citasEmpleado = (dataCitas.citas || []).filter(c => {
            const empAsignado = c.empleadoAsignado?._id || c.empleadoAsignado || c.empleadoId || '';
            return String(empAsignado) === String(empleadoId);
        });

        const historialEmpleado = (dataHistorial.historial || []).filter(h => {
            const empAsignado = h.empleadoAsignado?._id || h.empleadoAsignado || h.empleadoId || '';
            return String(empAsignado) === String(empleadoId);
        });

        // Calcular estadísticas GLOBALES
        const pendientes = citasEmpleado.filter(c => c.estado === 'PENDIENTE').length;
        const activos = citasEmpleado.filter(c => c.estado === 'EN_PROCESO').length;
        const completados = historialEmpleado.length;
        const ingresos = historialEmpleado.reduce((sum, h) => sum + (h.servicio?.precio || 0), 0);

        // Actualizar el DOM SOLO si el valor cambió
        const statPendientes = document.getElementById('stat-pendientes');
        const statActivos = document.getElementById('stat-activos');
        const statCompletados = document.getElementById('stat-completados');
        const statIngresos = document.getElementById('stat-ingresos');

        if (statPendientes && statPendientes.textContent !== String(pendientes)) {
            statPendientes.textContent = pendientes;
        }
        if (statActivos && statActivos.textContent !== String(activos)) {
            statActivos.textContent = activos;
        }
        if (statCompletados && statCompletados.textContent !== String(completados)) {
            statCompletados.textContent = completados;
        }
        if (statIngresos && statIngresos.textContent !== `$${ingresos.toLocaleString()}`) {
            statIngresos.textContent = `$${ingresos.toLocaleString()}`;
        }

    } catch (error) {
        console.error('Error al cargar estadísticas globales:', error);
    }
}
/*function actualizarEstadisticas() {
    const misTrabajos = trabajosActuales;

    const activos = misTrabajos.filter(t => t.estado === 'EN_PROCESO').length;
    const pendientes = misTrabajos.filter(t => t.estado === 'PENDIENTE').length;
    const completados = misTrabajos.filter(t => ['LISTO', 'ENTREGADO'].includes(t.estado)).length;
    const ingresos = misTrabajos
        .filter(t => ['LISTO', 'ENTREGADO'].includes(t.estado))
        .reduce((sum, t) => sum + (t.servicio?.precio || 0), 0);

    const statPendientes = document.getElementById('stat-pendientes');
    const statActivos = document.getElementById('stat-activos');
    const statCompletados = document.getElementById('stat-completados');
    const statIngresos = document.getElementById('stat-ingresos');

    if (statPendientes) statPendientes.textContent = pendientes;
    if (statActivos) statActivos.textContent = activos;
    if (statCompletados) statCompletados.textContent = completados;
    if (statIngresos) statIngresos.textContent = `$${ingresos.toLocaleString()}`;
}*/

// ================================================================
// 🔹 RENDERIZAR CITA CARD (PENDIENTES)
// ================================================================
function renderizarCitaCard(cita) {
    const estadoColor = obtenerColorEstado(cita.estado);
    const estadoIcono = obtenerIconoEstado(cita.estado);

    let serviciosChecklist = [];
    if (cita.checklistServicios && cita.checklistServicios.length > 0) {
        serviciosChecklist = cita.checklistServicios;
    }

    const serviciosCompletados = serviciosChecklist.filter(s => s.completado).length;
    const porcentajeCompletado = serviciosChecklist.length > 0
        ? Math.round((serviciosCompletados / serviciosChecklist.length) * 100)
        : 0;

    let duracion = 'N/A';
    if (cita.fechas?.inicioTrabajo && cita.fechas?.finalizacion) {
        const inicio = new Date(cita.fechas.inicioTrabajo);
        const fin = new Date(cita.fechas.finalizacion);
        const minutos = Math.round((fin - inicio) / 60000);
        duracion = minutos < 60 ? `${minutos} minutos` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
    }

    return `
    <div class="cita-card" style="border: 2px solid ${estadoColor}; box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px ${estadoColor}15;">
        <div class="cita-card-header" style="background: linear-gradient(135deg, ${estadoColor}22, ${estadoColor}08); border-bottom: 1px solid ${estadoColor}40;">
            <div class="cita-card-header-info">
                <div class="cita-card-icon" style="background: ${estadoColor}22; border: 2px solid ${estadoColor};">
                    ${estadoIcono}
                </div>
                <div>
                    <h3 class="cita-card-title">Detalle del Trabajo</h3>
                    <span class="cita-card-estado" style="color: ${estadoColor};">${estadoIcono} ${cita.estado || 'N/A'}</span>
                </div>
            </div>
            <button class="cita-card-close" onclick="event.stopPropagation(); cerrarDetalleCita(this)">✕</button>
        </div>

        <div class="cita-card-body">
            ${serviciosChecklist.length > 0 ? `
            <div class="cita-conte-detalle">    
            <div class="checklist-container">
                <h4>📋 Checklist de Trabajos</h4>
                <div class="checklist-header">
                    <span class="checklist-contador">${serviciosCompletados}/${serviciosChecklist.length} completados</span>
                    <span class="checklist-porcentaje">${porcentajeCompletado}%</span>
                </div>
                <div class="checklist-barra">
                    <div class="checklist-barra-fill" style="width:${porcentajeCompletado}%;"></div>
                </div>
                <div class="checklist-items">
                    ${serviciosChecklist.map((servicio, index) => `
                        <div class="checklist-item ${servicio.completado ? 'completado' : ''} ${cita.estado === 'EN_PROCESO' ? 'clickable' : ''}"
                            data-checklist-item 
                            data-index="${index}"
                            data-completado="${servicio.completado || false}"
                            ${cita.estado === 'EN_PROCESO' ? `onclick="event.stopPropagation(); window.toggleChecklistDirecto(this, '${cita._id}', ${index}, event)"` : ''}>
                            <div class="checklist-checkbox" data-checkbox>${servicio.completado ? '✓' : ''}</div>
                            <span class="checklist-texto" data-texto>${servicio.nombre}</span>
                            <span class="checklist-estado" data-estado>${servicio.completado ? '✓' : '○'}</span>
                            <span class="checklist-hora" data-hora>${servicio.fechaCompletado ? formatearHora(servicio.fechaCompletado) : ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="info-grid">
                <div class="info-item">
                    <small>🚗 Vehículo</small>
                    <p>${cita.vehiculo?.marca || 'N/A'} ${cita.vehiculo?.modelo || ''}</p>
                    <span class="placa" style="background:${estadoColor}22; color:${estadoColor};">🏷️ ${cita.vehiculo?.placa || 'S/P'}</span>
                </div>
                <div class="info-item">
                    <small>👤 Cliente</small>
                    <p>${cita.clienteId?.nombre || 'Cliente'}</p>
                </div>
                <div class="info-item">
                    <small>🔧 Servicio</small>
                    <p style="color:${estadoColor}; font-weight:600;">${cita.servicio?.nombre || 'N/A'}</p>
                </div>
                <div class="info-item">
                    <small>👨‍🔧 Empleado</small>
                    <p>${cita.empleadoAsignado?.nombre || cita.empleadoCompletado?.nombre || 'N/A'}</p>
                </div>
            </div>
            <div class="conte-detalle-pago">
            <div class="detalles-grid">
                <div class="detalle-item">
                    <div class="icono">🏗️</div>
                    <small>Bahía</small>
                    <p>#${cita.bahiaAsignada || 'N/A'}</p>
                </div>
                <div class="detalle-item">
                    <div class="icono">⏱️</div>
                    <small>Duración</small>
                    <p style="color:#ffbb33;">${duracion}</p>
                </div>
                <div class="detalle-item">
                    <div class="icono">📅</div>
                    <small>Fecha</small>
                    <p>${formatearFecha(cita.fecha)} ${cita.hora || ''}</p>
                </div>
            </div>

            <div class="pago-card" style="background:linear-gradient(135deg, ${estadoColor}15, ${estadoColor}05); border:1px solid ${estadoColor}30;">
                <div>
                    <small>💰 Total</small>
                    <p class="monto">RD$ ${(cita.servicio?.precio || 0).toLocaleString()}</p>
                </div>
                <span class="metodo" style="background:${estadoColor}22; color:${estadoColor};">
                    ${cita.pago?.metodo || 'SALDO'}
                </span>
            </div>
            </div>
           </div>


            ${cita.fotos && (cita.fotos.antes?.length > 0 || cita.fotos.durante?.length > 0 || cita.fotos.despues?.length > 0) ? `
               <div class="conte-foto-galeria">
                <div class="fotos-galeria">
                <h4>📸 Fotos del Trabajo</h4>
                ${cita.fotos.antes?.length > 0 ? `
                <div class="fotos-grupo">
                    <small style="color:#ffbb33;">📸 ANTES (${cita.fotos.antes.length})</small>
                    <div class="fotos-lista">
                        ${cita.fotos.antes.map(foto => `
                            <img src="${foto.url || foto}" onclick="event.stopPropagation(); window.open('${foto.url || foto}', '_blank')" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                </div>` : ''}
                ${cita.fotos.durante?.length > 0 ? `
                <div class="fotos-grupo">
                    <small style="color:#00d4ff;">🔧 DURANTE (${cita.fotos.durante.length})</small>
                    <div class="fotos-lista">
                        ${cita.fotos.durante.map(foto => `
                            <img src="${foto.url || foto}" onclick="event.stopPropagation(); window.open('${foto.url || foto}', '_blank')" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                </div>` : ''}
                ${cita.fotos.despues?.length > 0 ? `
                <div class="fotos-grupo">
                    <small style="color:#00ff88;">✨ DESPUÉS (${cita.fotos.despues.length})</small>
                    <div class="fotos-lista">
                        ${cita.fotos.despues.map(foto => `
                            <img src="${foto.url || foto}" onclick="event.stopPropagation(); window.open('${foto.url || foto}', '_blank')" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>` : ''}
            </div>
            <div class="acciones-card">
                ${cita.estado === 'EN_PROCESO' ? `
                <button class="btn-accion btn-antes" onclick="event.stopPropagation(); abrirModalFotos('${cita._id}', 'antes')">📸 Antes</button>
                <button class="btn-accion btn-durante" onclick="event.stopPropagation(); abrirModalFotos('${cita._id}', 'durante')">🔧 Durante</button>
                <button class="btn-accion btn-despues" onclick="event.stopPropagation(); abrirModalFotos('${cita._id}', 'despues')">✨ Después</button>` : ''}
                
                ${cita.estado === 'EN_PROCESO' ? `
                <button class="btn-accion btn-finalizar" onclick="event.stopPropagation(); finalizarTrabajo('${cita._id}')">✅ Finalizar</button>` : ''}
            </div>
        </div>
    </div>
    `;
}
// ================================================================
// 🔹 RENDERIZAR TRABAJO REALIZADO
// ================================================================

function renderizarTrabajoRealizado(trabajo) {
    const precio = trabajo.servicio?.precio || trabajo.pago?.monto || 0;
    const fechaEntrega = trabajo.fechas?.entrega || trabajo.fechas?.finalizacion || trabajo.createdAt;

    // ✅ Diferenciar LISTO de ENTREGADO
    const esListo = trabajo.estado === 'LISTO';
    const icono = esListo ? '✨' : '✅';
    const label = esListo ? 'Listo' : 'Completado';
    const color = esListo ? '#ffbb33' : '#00ff88';

    return `
    <div style="background:rgba(0,255,136,0.02); border:1px solid ${color}30; border-radius:15px; padding:18px; margin-bottom:12px; cursor:pointer; transition:all 0.3s;"
        onmouseover="this.style.background='rgba(0,255,136,0.05)'; this.style.borderColor='${color}60'; this.style.transform='translateY(-2px)';"
        onmouseout="this.style.background='rgba(0,255,136,0.02)'; this.style.borderColor='${color}30'; this.style.transform='translateY(0)';"
        onclick="mostrarDetalleCita('${trabajo._id}')">
        
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
            <div style="display:flex; gap:10px; align-items:center;">
                <div style="width:45px; height:45px; background:${color}15; border:2px solid ${color}40; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem;">${icono}</div>
                <div>
                    <strong style="color:#fff; font-size:0.9rem; display:block;">${trabajo.vehiculo?.marca || 'Vehículo'} ${trabajo.vehiculo?.modelo || ''}</strong>
                    <span style="color:#aaa; font-size:0.75rem;">${trabajo.vehiculo?.placa || 'S/P'}</span>
                </div>
            </div>
            <span style="background:${color}15; color:${color}; padding:4px 10px; border-radius:12px; font-size:0.7rem; font-weight:600;">${icono} ${label}</span>
        </div>
        
        <div style="margin-bottom:12px;">
            <p style="color:#aaa; font-size:0.8rem; margin:0 0 4px;">
                <strong>Servicio:</strong> ${trabajo.servicio?.nombre || 'N/A'}
            </p>
            <p style="color:#aaa; font-size:0.8rem; margin:0;">
                <strong>${esListo ? 'Finalizado' : 'Completado'}:</strong> ${formatearFecha(fechaEntrega)}
            </p>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #1e2a3a;">
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.9rem;">💰</span>
                <span style="color:#00ff88; font-size:0.85rem; font-weight:600;">$${(precio || 0).toLocaleString()}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.9rem;">📅</span>
                <span style="color:#888; font-size:0.75rem;">${formatearFecha(fechaEntrega)}</span>
            </div>
        </div>
    </div>`;
}

// ================================================================
// 🔹 FINALIZAR TRABAJO
// ================================================================

export async function finalizarTrabajo(citaId) {
    if (!citaId) return;

    if (!confirm('¿Estás seguro de que deseas finalizar este trabajo?')) return;



    try {
        const response = await apiFetch(`/talleres/citas/${citaId}/finalizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.('✅ Trabajo finalizado', 'success');
            await cargarTrabajos();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ================================================================
// 🔹 MOSTRAR DETALLE DE CITA
// ================================================================

export async function mostrarDetalleCita(citaId) {
    if (!citaId) return;

    try {


        // ✅ SIEMPRE buscar la cita individual del servidor
        const response = await apiFetch(`/talleres/citas/${citaId}`);

        let cita = null;

        if (response.ok) {
            const data = await response.json();
            cita = data.cita || data;
            console.log('📋 Checklist del servidor:',
                cita?.checklistServicios?.map(s => `${s.nombre}=${s.completado}`));
        }

        // Fallback: buscar en trabajosActuales
        if (!cita) {
            cita = trabajosActuales.find(t => t._id === citaId);
            console.log('⚠️ Usando cita de trabajosActuales');
        }

        if (!cita) {
            window.mostrarToast?.('❌ No se encontró la cita', 'error');
            return;
        }

        crearModalDetalleCita(cita);

    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast?.('❌ Error al cargar detalles', 'error');
    }
}
// ================================================================
// 🔹 CREAR MODAL CON CHECKLIST - CORREGIDO
// ================================================================

async function crearModalDetalleCita(cita) {
    const modal = document.createElement('div');
    modal.id = 'modal-detalle-cita';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s;
    `;

    const estadoColor = obtenerColorEstado(cita.estado);
    const estadoIcono = obtenerIconoEstado(cita.estado);

    // Mostrar cargando
    modal.innerHTML = `
        <div style="background:#0f1621; border:1px solid #1e2a3a; border-radius:20px; padding:40px; text-align:center;">
            <span style="font-size:2rem;">⏳</span>
            <p style="color:#aaa; margin-top:10px;">Cargando detalles...</p>
        </div>
    `;
    document.body.appendChild(modal);

    // ✅ OBTENER CHECKLIST - SIEMPRE BUSCAR DESCRIPCIÓN PRIMERO
    let serviciosChecklist = [];

    // PRIMERO: Buscar descripción del servicio en el taller
    try {

        const response = await apiFetch(`/talleres/${cita.tallerId || tallerId}/servicios`); const data = await response.json();

        if (data.exito && data.servicios) {
            const servicioEncontrado = data.servicios.find(s =>
                s.nombre?.toLowerCase() === cita.servicio?.nombre?.toLowerCase() ||
                s._id === cita.servicio?._id
            );

            if (servicioEncontrado?.descripcion) {
                const pasosDescripcion = servicioEncontrado.descripcion
                    .split('|')
                    .map(paso => paso.trim())
                    .filter(paso => paso.length > 0);

                // ✅ CREAR CHECKLIST CON DESCRIPCIÓN Y CHECKMARKS GUARDADOS
                serviciosChecklist = pasosDescripcion.map(paso => {
                    const guardado = cita.checklistServicios?.find(cs => cs.nombre === paso);
                    return {
                        nombre: paso,
                        completado: guardado?.completado || false,
                        fechaCompletado: guardado?.fechaCompletado || null
                    };
                });

                console.log('📋 Checklist desde descripción con checkmarks:',
                    serviciosChecklist.map(s => `${s.nombre}=${s.completado}`));
            }
        }
    } catch (error) {
        console.error('Error al buscar servicios:', error);
    }

    // SEGUNDO: Si no hay descripción, usar checklist guardado
    if (serviciosChecklist.length === 0 && cita.checklistServicios && cita.checklistServicios.length > 0) {
        serviciosChecklist = cita.checklistServicios;
        console.log('📋 Usando checklist guardado:', serviciosChecklist.map(s => `${s.nombre}=${s.completado}`));
    }

    // TERCERO: Fallback final
    if (serviciosChecklist.length === 0) {
        serviciosChecklist = [{
            nombre: cita.servicio?.nombre || 'Servicio Principal',
            completado: false,
            fechaCompletado: null
        }];
    }

    const serviciosCompletados = serviciosChecklist.filter(s => s.completado).length;
    const porcentajeCompletado = serviciosChecklist.length > 0
        ? Math.round((serviciosCompletados / serviciosChecklist.length) * 100)
        : 0;

    // Calcular duración
    let duracion = 'N/A';
    if (cita.fechas?.inicioTrabajo && cita.fechas?.finalizacion) {
        const inicio = new Date(cita.fechas.inicioTrabajo);
        const fin = new Date(cita.fechas.finalizacion);
        const minutos = Math.round((fin - inicio) / 60000);
        duracion = minutos < 60 ? `${minutos} minutos` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
    }

    // Calificación
    const calificacion = cita.calificacion?.puntuacion || 0;
    const estrellas = calificacion > 0
        ? '⭐'.repeat(calificacion) + '<span style="color:#333;">' + '☆'.repeat(5 - calificacion) + '</span>'
        : '<span style="color:#333;">☆☆☆☆☆</span>';

    // Re-renderizar con el diseño mejorado
    modal.innerHTML = `
        <div style="
            background: #0f1621; 
            border: 2px solid ${estadoColor}; 
            border-radius: 20px; 
            padding: 0;
            max-width: 600px; 
            width: 95%; 
            max-height: 85vh; 
            overflow-y:auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${estadoColor}20;
            animation: slideUp 0.3s ease;
        ">
            <!-- Encabezado -->
            <div style="
                background: linear-gradient(135deg, ${estadoColor}22, ${estadoColor}08);
                padding: 25px 30px;
                border-bottom: 1px solid ${estadoColor}40;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                z-index: 10;
                backdrop-filter: blur(10px);
            ">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="
                        width: 45px; height: 45px; 
                        background: ${estadoColor}22; 
                        border: 2px solid ${estadoColor}; 
                        border-radius: 14px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 1.3rem;
                    ">${estadoIcono}</div>
                    <div>
                        <h3 style="color:#fff; margin:0; font-size:1.1rem;">Detalle del Trabajo</h3>
                        <span style="color:${estadoColor}; font-size:0.8rem; font-weight:600;">${estadoIcono} ${cita.estado || 'N/A'}</span>
                    </div>
                </div>
                <span onclick="cerrarDetalleCita()" style="font-size:1.5rem; cursor:pointer; color:#888; width:35px; height:35px; 
                        display:flex; align-items:center; justify-content:center; 
                        border-radius:50%; transition:all 0.3s;" 
                        onmouseover="this.style.background='#ff444422'; this.style.color='#ff4444';" 
                        onmouseout="this.style.background='transparent'; this.style.color='#888';">
                    ✕
                </span>
            </div>

            <!-- Cuerpo -->
            <div style="padding: 25px 30px;">
                <!-- Checklist -->
                <div style="margin-bottom:20px;">
                    <h4 style="color:#fff; margin:0 0 12px; font-size:0.85rem;">📋 Checklist de Trabajos</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="color:#aaa; font-size:0.7rem;">${serviciosCompletados}/${serviciosChecklist.length} completados</span>
                        <span style="color:#00ff88; font-size:0.7rem; font-weight:600;">${porcentajeCompletado}%</span>
                    </div>
                    <div style="width:100%; height:8px; background:#1e2a3a; border-radius:10px; overflow:hidden; margin-bottom:12px;">
                        <div style="width:${porcentajeCompletado}%; height:100%; background:linear-gradient(to right, #00ff88, #00d4ff); border-radius:10px; transition:width 0.5s;"></div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                    ${serviciosChecklist.map((servicio, index) => `
                        <div data-checklist-item 
                            data-index="${index}"
                            data-completado="${servicio.completado || false}"
                            style="
                            display:flex; 
                            align-items:center; 
                            gap:10px; 
                            padding:10px 12px; 
                            background:${servicio.completado ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)'}; 
                            border:1px solid ${servicio.completado ? 'rgba(0,255,136,0.3)' : '#1e2a3a'}; 
                            border-radius:10px;
                            ${cita.estado === 'EN_PROCESO' ? 'cursor:pointer;' : ''}
                            transition:all 0.3s;
                        " ${cita.estado === 'EN_PROCESO' ? `onclick="window.toggleChecklistDirecto(this, '${cita._id}', ${index}, event)"` : ''}>
                            <div data-checkbox style="
                                width:20px; height:20px; 
                                background:${servicio.completado ? '#00ff88' : 'transparent'}; 
                                border:2px solid ${servicio.completado ? '#00ff88' : '#333'}; 
                                border-radius:6px;
                                display:flex; align-items:center; justify-content:center;
                                font-size:0.7rem; color:#0f1621;
                                flex-shrink:0;
                            ">${servicio.completado ? '✓' : ''}</div>
                            <span data-texto style="flex:1; color:${servicio.completado ? '#00ff88' : '#aaa'}; font-size:0.8rem; ${servicio.completado ? 'text-decoration:line-through;' : ''}">${servicio.nombre}</span>
                            <span data-estado style="font-size:0.65rem; color:${servicio.completado ? '#00ff88' : '#666'};">${servicio.completado ? 'Completado' : 'Pendiente'}</span>
                            <span data-hora style="color:#666; font-size:0.65rem;">${servicio.fechaCompletado ? formatearHora(servicio.fechaCompletado) : ''}</span>
                        </div>
                    `).join('')}
                    </div>
                </div>

                <!-- Info Principal -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px;">
                    <div style="background:#080c14; border-radius:10px; padding:12px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">🚗 Vehículo</small>
                        <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;">${cita.vehiculo?.marca || 'N/A'} ${cita.vehiculo?.modelo || ''}</p>
                        <span style="background:${estadoColor}22; color:${estadoColor}; padding:2px 8px; border-radius:8px; font-size:0.7rem;">🏷️ ${cita.vehiculo?.placa || 'S/P'}</span>
                    </div>
                    <div style="background:#080c14; border-radius:10px; padding:12px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">👤 Cliente</small>
                        <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;">${cita.clienteId?.nombre || 'Cliente'}</p>
                    </div>
                    <div style="background:#080c14; border-radius:10px; padding:12px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">🔧 Servicio</small>
                        <p style="color:${estadoColor}; margin:4px 0 0; font-size:0.9rem; font-weight:600;">${cita.servicio?.nombre || 'N/A'}</p>
                    </div>
                    <div style="background:#080c14; border-radius:10px; padding:12px;">
                        <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">👨‍🔧 Empleado</small>
                        <p style="color:#fff; margin:4px 0 0; font-size:0.9rem;"> ${cita.empleadoAsignado?.nombre || cita.empleadoCompletado?.nombre || 'N/A'}</p>
                    </div>
                </div>

                <!-- Detalles adicionales -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:20px;">
                    <div style="text-align:center; padding:12px; background:#080c14; border-radius:10px;">
                        <div style="font-size:1.2rem;">🏗️</div>
                        <small style="color:#888; font-size:0.65rem;">Bahía</small>
                        <p style="color:#fff; margin:2px 0 0; font-weight:600;">#${cita.bahiaAsignada || 'N/A'}</p>
                    </div>
                    <div style="text-align:center; padding:12px; background:#080c14; border-radius:10px;">
                        <div style="font-size:1.2rem;">⏱️</div>
                        <small style="color:#888; font-size:0.65rem;">Duración</small>
                        <p style="color:#ffbb33; margin:2px 0 0; font-weight:600;">${duracion}</p>
                    </div>
                    <div style="text-align:center; padding:12px; background:#080c14; border-radius:10px;">
                        <div style="font-size:1.2rem;">📅</div>
                        <small style="color:#888; font-size:0.65rem;">Entrega</small>
                        <p style="color:#fff; margin:2px 0 0; font-size:0.75rem;">${formatearFecha(cita.fechas?.entrega || cita.fechas?.finalizacion || cita.createdAt)}</p>
                    </div>
                </div>

                <!-- Pago -->
                <div style="background:linear-gradient(135deg, ${estadoColor}15, ${estadoColor}05); border:1px solid ${estadoColor}30; border-radius:12px; padding:18px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">💰 Total</small>
                            <p style="color:#fff; font-size:1.5rem; font-weight:700; margin:5px 0 0;">RD$ ${(cita.servicio?.precio || 0).toLocaleString()}</p>
                        </div>
                        <span style="background:${estadoColor}22; color:${estadoColor}; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:600;">
                            ${cita.pago?.metodo || 'SALDO'}
                        </span>
                    </div>
                </div>

                <!-- Calificación -->
                <div style="background:#080c14; border-radius:10px; padding:15px; margin-bottom:20px; text-align:center;">
                    <small style="color:#888; font-size:0.65rem; text-transform:uppercase;">⭐ Calificación del Cliente</small>
                    <div style="margin:8px 0; font-size:1.2rem;">${estrellas}</div>
                    <p style="color:#666; font-size:0.8rem;">${cita.calificacion?.comentario || 'Sin comentario'}</p>
                </div>
                <!-- Galería de Fotos -->
                ${cita.fotos && (cita.fotos.antes?.length > 0 || cita.fotos.durante?.length > 0 || cita.fotos.despues?.length > 0) ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#fff; margin:0 0 12px; font-size:0.85rem;">📸 Fotos del Trabajo</h4>
                    ${cita.fotos.antes?.length > 0 ? `
                    <div style="margin-bottom:10px;">
                        <small style="color:#ffbb33; font-size:0.7rem;">📸 ANTES</small>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                            ${cita.fotos.antes.map(foto => `
                                <img src="${foto.url || foto}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:2px solid #ffbb33; cursor:pointer;" 
                                    onclick="window.open('${foto.url || foto}', '_blank')">
                            `).join('')}
                        </div>
                    </div>` : ''}
                    ${cita.fotos.durante?.length > 0 ? `
                    <div style="margin-bottom:10px;">
                        <small style="color:#00d4ff; font-size:0.7rem;">🔧 DURANTE</small>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                            ${cita.fotos.durante.map(foto => `
                                <img src="${foto.url || foto}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:2px solid #00d4ff; cursor:pointer;" 
                                    onclick="window.open('${foto.url || foto}', '_blank')">
                            `).join('')}
                        </div>
                    </div>` : ''}
                    ${cita.fotos.despues?.length > 0 ? `
                    <div>
                        <small style="color:#00ff88; font-size:0.7rem;">✨ DESPUÉS</small>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                            ${cita.fotos.despues.map(foto => `
                                <img src="${foto.url || foto}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:2px solid #00ff88; cursor:pointer;" 
                                    onclick="window.open('${foto.url || foto}', '_blank')">
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>` : ''}
              <!-- Acciones -->
                <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    ${cita.estado === 'EN_PROCESO' ? `
                    <button onclick="abrirModalFotos('${cita._id}', 'antes')"
                        style="flex:1; min-width:80px; padding:10px; border:1px solid #ffbb33; border-radius:12px; background:rgba(255,187,51,0.1); color:#ffbb33; cursor:pointer; font-size:0.75rem;">
                        📸 Antes
                    </button>
                    <button onclick="abrirModalFotos('${cita._id}', 'durante')"
                        style="flex:1; min-width:80px; padding:10px; border:1px solid #00d4ff; border-radius:12px; background:rgba(0,212,255,0.1); color:#00d4ff; cursor:pointer; font-size:0.75rem;">
                        🔧 Durante
                    </button>
                    <button onclick="abrirModalFotos('${cita._id}', 'despues')"
                        style="flex:1; min-width:80px; padding:10px; border:1px solid #00ff88; border-radius:12px; background:rgba(0,255,136,0.1); color:#00ff88; cursor:pointer; font-size:0.75rem;">
                        ✨ Después
                    </button>` : ''}
                    
                    ${cita.estado === 'EN_PROCESO' ? `
                    <button onclick="finalizarTrabajo('${cita._id}')"
                        style="flex:1; min-width:80px; padding:10px; border:1px solid #ff44ff; border-radius:12px; background:rgba(255,68,255,0.1); color:#ff44ff; cursor:pointer; font-size:0.75rem; font-weight:600;">
                        ✅ Finalizar
                    </button>` : ''}
                    
                    <button onclick="cerrarDetalleCita()"
                        style="flex:1; min-width:80px; padding:10px; border:1px solid #333; border-radius:12px; background:transparent; color:#aaa; cursor:pointer; font-size:0.75rem;">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ================================================================
// 🔹 TOGGLE SERVICIO CHECKLIST
// ================================================================

window.toggleChecklistDirecto = async function (elemento, citaId, servicioIndex, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // ✅ CAMBIAR VISUALMENTE PRIMERO
    const estaCompletado = elemento.getAttribute('data-completado') === 'true';
    const nuevoEstado = !estaCompletado;

    elemento.setAttribute('data-completado', String(nuevoEstado));

    // Checkbox
    const checkbox = elemento.querySelector('[data-checkbox]');
    if (checkbox) {
        checkbox.style.background = nuevoEstado ? '#00ff88' : 'transparent';
        checkbox.style.borderColor = nuevoEstado ? '#00ff88' : '#333';
        checkbox.textContent = nuevoEstado ? '✓' : '';
        checkbox.style.color = nuevoEstado ? '#0f1621' : '';
    }

    // Texto
    const texto = elemento.querySelector('[data-texto]');
    if (texto) {
        texto.style.color = nuevoEstado ? '#00ff88' : '#aaa';
        texto.style.textDecoration = nuevoEstado ? 'line-through' : 'none';
    }

    // Estado
    const estado = elemento.querySelector('[data-estado]');
    if (estado) {
        estado.textContent = nuevoEstado ? 'Completado' : 'Pendiente';
        estado.style.color = nuevoEstado ? '#00ff88' : '#666';
    }

    // Hora
    const hora = elemento.querySelector('[data-hora]');
    if (hora) {
        hora.textContent = nuevoEstado ? new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '';
    }

    // Fondo y borde
    elemento.style.background = nuevoEstado ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)';
    elemento.style.borderColor = nuevoEstado ? 'rgba(0,255,136,0.3)' : '#1e2a3a';

    // ✅ ACTUALIZAR BARRA Y CONTADOR DIRECTAMENTE
    const items = document.querySelectorAll('[data-checklist-item]');
    const total = items.length;
    const completados = Array.from(items).filter(i => i.getAttribute('data-completado') === 'true').length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    // Buscar la barra de progreso
    const barra = document.querySelector('#modal-detalle-cita div[style*="linear-gradient(to right, #00ff88, #00d4ff)"]');
    if (barra) {
        barra.style.width = porcentaje + '%';
    }

    // Actualizar contador
    const contador = document.getElementById('contador-checklist');
    if (contador) {
        contador.textContent = `${completados}/${total} completados`;
    }

    // Actualizar texto de porcentaje
    const spans = document.querySelectorAll('#modal-detalle-cita span');
    spans.forEach(s => {
        if (s.textContent.includes('%') && s.style.color === 'rgb(0, 255, 136)') {
            s.textContent = `${porcentaje}%`;
        }
    });

    console.log('✅ Visual actualizado:', nuevoEstado);

    // Guardar en servidor
    try {

        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const empleadoId = sesionEmpleado?.empleado?._id || null;

        const response = await apiFetch(`/talleres/citas/${citaId}/checklist`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ servicioIndex, empleadoId })
        });

        const data = await response.json();
        console.log('✅ Servidor guardado:', data.exito);

    } catch (error) {
        console.error('Error:', error);
        // Revertir
        elemento.setAttribute('data-completado', String(estaCompletado));
    }
};
/*window.toggleServicioChecklist = async function (citaId, servicioIndex, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // ✅ GUARDAR REFERENCIA ANTES DE CUALQUIER COSA
    const item = event.target.closest('[data-checklist-item]');

    if (!item) {
        console.error('❌ No se encontró el item');
        return;
    }

    console.log('✅ Item encontrado:', item.getAttribute('data-completado'));

    try {
       
        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const empleadoId = sesionEmpleado?.empleado?._id || null;

        const response = await fetch(`${API_URL}/talleres/citas/${citaId}/checklist`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ servicioIndex, empleadoId })
        });

        const data = await response.json();

        if (data.exito) {
            // ✅ CAMBIAR ESTADO USANDO LA REFERENCIA GUARDADA
            const estaCompletado = item.getAttribute('data-completado') === 'true';
            const nuevoEstado = !estaCompletado;

            item.setAttribute('data-completado', String(nuevoEstado));

            // Checkbox
            const checkbox = item.querySelector('[data-checkbox]');
            if (checkbox) {
                checkbox.style.background = nuevoEstado ? '#00ff88' : 'transparent';
                checkbox.style.borderColor = nuevoEstado ? '#00ff88' : '#333';
                checkbox.textContent = nuevoEstado ? '✓' : '';
            }

            // Texto
            const texto = item.querySelector('[data-texto]');
            if (texto) {
                texto.style.color = nuevoEstado ? '#00ff88' : '#aaa';
                texto.style.textDecoration = nuevoEstado ? 'line-through' : 'none';
            }

            // Estado
            const estado = item.querySelector('[data-estado]');
            if (estado) {
                estado.textContent = nuevoEstado ? 'Completado' : 'Pendiente';
                estado.style.color = nuevoEstado ? '#00ff88' : '#666';
            }

            // Hora
            const hora = item.querySelector('[data-hora]');
            if (hora) {
                hora.textContent = nuevoEstado ? new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '';
            }

            // Fondo y borde del item
            item.style.background = nuevoEstado ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)';
            item.style.borderColor = nuevoEstado ? 'rgba(0,255,136,0.3)' : '#1e2a3a';

            // ✅ ACTUALIZAR BARRA Y CONTADOR
            const items = document.querySelectorAll('[data-checklist-item]');
            const total = items.length;
            const completados = Array.from(items).filter(i =>
                i.getAttribute('data-completado') === 'true'
            ).length;
            const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

            const barra = document.getElementById('barra-progreso-checklist');
            if (barra) barra.style.width = porcentaje + '%';

            const contador = document.getElementById('contador-checklist');
            if (contador) contador.textContent = `${completados}/${total} completados`;

            console.log('✅ Visual actualizado:', nuevoEstado ? 'MARCADO' : 'DESMARCADO');
        }
    } catch (error) {
        console.error('Error:', error);
    }
};*/
// ✅ FUNCIONES GLOBALES
window.actualizarBarraProgreso = function () {
    const checklistItems = document.querySelectorAll('[data-checklist-item]');
    const total = checklistItems.length;
    const completados = Array.from(checklistItems).filter(item =>
        item.getAttribute('data-completado') === 'true'
    ).length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    // ✅ Buscar la barra por el ID correcto
    const barra = document.querySelector('#modal-detalle-cita div[style*="linear-gradient(to right, #00ff88, #00d4ff)"]');

    if (barra) {
        barra.style.width = `${porcentaje}%`;
    }

    // ✅ Actualizar contador
    const contador = document.getElementById('contador-checklist');
    if (contador) {
        contador.textContent = `${completados}/${total} completados`;
    }

    // ✅ Actualizar texto de porcentaje
    const spans = document.querySelectorAll('#modal-detalle-cita span');
    spans.forEach(s => {
        if (s.textContent.includes('%') && s.style.color === 'rgb(0, 255, 136)') {
            s.textContent = `${porcentaje}%`;
        }
    });
};
window.actualizarContadorChecklist = function () {
    const checklistItems = document.querySelectorAll('[data-checklist-item]');
    const total = checklistItems.length;
    const completados = Array.from(checklistItems).filter(item =>
        item.getAttribute('data-completado') === 'true'
    ).length;
    const contador = document.getElementById('contador-checklist');
    if (contador) contador.textContent = `${completados}/${total}`;
};

// ================================================================
// 🔹 CERRAR DETALLE DE CITA
// ================================================================

export function cerrarDetalleCita() {
    const modal = document.getElementById('modal-detalle-cita');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s';
        setTimeout(() => modal.remove(), 200);
    }
}

// ================================================================
// 🔹 UTILIDADES
// ================================================================

function calcularTiempoTranscurrido(fechaInicio) {
    if (!fechaInicio) return 'No iniciado';
    const diff = Date.now() - new Date(fechaInicio).getTime();
    const min = Math.floor(diff / 60000);
    const horas = Math.floor(min / 60);
    if (min < 1) return 'Ahora';
    if (min < 60) return `${min} min`;
    return `${horas}h ${min % 60}m`;
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
}

function formatearHora(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

function formatearFechaCompleta(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-DO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function obtenerColorEstado(estado) {
    const colores = {
        'PENDIENTE': '#ffbb33',
        'CONFIRMADA': '#00d4ff',
        'EN_PROCESO': '#ffbb33',
        'LISTO': '#00ff88',
        'ENTREGADO': '#ff44ff',
        'CANCELADA': '#ff4444'
    };
    return colores[estado] || '#888';
}

function obtenerIconoEstado(estado) {
    const iconos = {
        'PENDIENTE': '⏳',
        'CONFIRMADA': '✅',
        'EN_PROCESO': '🔧',
        'LISTO': '✨',
        'ENTREGADO': '🚗',
        'CANCELADA': '❌'
    };
    return iconos[estado] || '❓';
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarTrabajos() {
    window.cambiarTab = cambiarTab;
    window.cargarTrabajos = cargarTrabajos;
    window.actualizarTabActual = actualizarTabActual;
    window.renderizarCitaCard = renderizarCitaCard;
    window.renderizarTrabajoRealizado = renderizarTrabajoRealizado;
    window.finalizarTrabajo = finalizarTrabajo;
    window.mostrarDetalleCita = mostrarDetalleCita;
    window.cerrarDetalleCita = cerrarDetalleCita;
    // window.toggleServicioChecklist = toggleServicioChecklist;
    window.toggleChecklistDirecto = toggleChecklistDirecto;
    window.trabajosActuales = trabajosActuales;

    console.log('🔧 Módulo de Trabajos inicializado');

    // ✅ Cargar todo al inicio (estadísticas + tab actual)
    cargarTrabajos();

    // ✅ Auto-actualizar cada 30 segundos
    /*setInterval(() => {
        const seccionTrabajos = document.getElementById('seccion-trabajos');
        if (seccionTrabajos && seccionTrabajos.style.display !== 'none') {
            // ✅ Recargar estadísticas globales Y el tab actual
            cargarEstadisticasGlobales();
            actualizarTabActual();
        }
    }, 30000);*/
}