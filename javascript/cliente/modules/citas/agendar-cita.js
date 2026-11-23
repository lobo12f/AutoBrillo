/**
 * ============================================================================
 * 📅 MÓDULO DE AGENDAR CITAS (Wizard + Modal)
 * ============================================================================
 * Versión actualizada con:
 *   - Lógica correcta de alternativas
 *   - V1: Taller cerrado
 *   - V2: Vehículo duplicado
 *   - V3: Bahías llenas
 *   - V4: Empleado ocupado NO bloquea, sugiere otro
 *   - Envío de duracionEstimada
 * ============================================================================
 */

import { apiFetch } from '../../../api-client.js';
import { API_URL } from '../../../config.js';

// ============================================================================
// ESTADO DEL WIZARD
// ============================================================================
window._wizard = {
    paso: 1,
    totalPasos: 4,
    tallerId: null,
    vehiculo: null,
    servicio: null,
    empleado: null,
    fecha: null,
    hora: null,
    serviciosDisponibles: [],
    empleadosDisponibles: []
};

// ============================================================================
// 1. ABRIR MODAL
// ============================================================================
export async function abrirModalSolicitud(sucursalSeleccionada) {
    const garaje = window.user?.garaje || [];
    if (garaje.length === 0) {
        window.mostrarToast?.("⚠️ No tienes vehículos registrados.", "warning");
        return;
    }

    window._wizard = {
        paso: 1, totalPasos: 4, tallerId: null, vehiculo: null,
        servicio: null, empleado: null, fecha: null, hora: null,
        serviciosDisponibles: [], empleadosDisponibles: []
    };

    const tallerVinculado = window.tallerManager?.getTaller();
    const bloqueTaller = document.getElementById('mc-taller-bloque');

    if (tallerVinculado) {
        window._wizard.tallerId = tallerVinculado._id;
        if (bloqueTaller) {
            const direccion = `${tallerVinculado.direccion?.calle || ''}, ${tallerVinculado.direccion?.ciudad || ''}`.trim().replace(/^,\s*|,\s*$/g, '');
            bloqueTaller.innerHTML = `
                <div class="mc-taller-fijo">
                    <div class="mc-taller-fijo-header">
                        <span class="mc-taller-fijo-icon">🏪</span>
                        <div>
                            <strong>${tallerVinculado.nombre}</strong>
                            <small>📍 ${direccion || 'Sin dirección'}</small>
                        </div>
                    </div>
                </div>
            `;
            bloqueTaller.style.display = 'block';
        }
    } else if (sucursalSeleccionada) {
        window._wizard.tallerId = sucursalSeleccionada;
        if (bloqueTaller) bloqueTaller.style.display = 'none';
    }

    const inputFecha = document.getElementById('cita-fecha');
    if (inputFecha) {
        inputFecha.value = '';
        inputFecha.setAttribute('min', new Date().toISOString().split('T')[0]);
    }

    window._wizard.paso = 1;
    actualizarWizardUI();
    renderizarPasoVehiculos();

    if (window._wizard.tallerId) {
        await cargarServiciosDelTaller(window._wizard.tallerId);
        await cargarEmpleadosDelTaller(window._wizard.tallerId);
    }

    const modal = document.getElementById('modal-cita');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('fade-in');
    }

    if (window.empleadoPreferido?.id) {
        setTimeout(() => seleccionarEmpleadoPorId(window.empleadoPreferido.id), 300);
    }
}
export async function alCambiarFecha() {
    const fecha = document.getElementById('cita-fecha')?.value;
    const tallerId = window._wizard?.tallerId;
    const contenedorHorarios = document.getElementById('mc-horarios-grid');
    const dispInfo = document.getElementById('disponibilidad-info');

    if (!fecha || !tallerId || !contenedorHorarios) return;

    // Validar fecha en el pasado (esto sí lo hacemos en el cliente por UX)
    const fechaObj = new Date(fecha + 'T12:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaObj < hoy) {
        dispInfo.textContent = '⚠️ No puedes agendar en el pasado';
        dispInfo.style.color = 'var(--color-danger)';
        contenedorHorarios.innerHTML = '<p class="mc-empty">Fecha no válida</p>';
        return;
    }

    window._wizard.fecha = fecha;
    contenedorHorarios.innerHTML = '<p class="mc-empty">⏳ Verificando disponibilidad...</p>';
    dispInfo.textContent = '';

    try {
        const token = JSON.parse(localStorage.getItem('sesion_activa') || '{}').token || '';
        const params = new URLSearchParams({ fecha });

        if (window._wizard.vehiculo?.placa) params.append('placa', window._wizard.vehiculo.placa);
        if (window._wizard.empleado?.id) params.append('empleadoId', window._wizard.empleado.id);

        // ⭐ EL FRONTEND NO CALCULA NADA, SOLO PIDE
        const response = await fetch(
            `${API_URL}/talleres/${tallerId}/horarios?${params}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();

        if (!data.exito) throw new Error(data.mensaje || 'Error');

        if (data.diaAbierto === false) {
            contenedorHorarios.innerHTML = `<p class="mc-empty">🏪 ${data.mensaje || 'El taller no abre este día'}</p>`;
            dispInfo.textContent = 'Selecciona otro día';
            dispInfo.style.color = 'var(--color-warning)';
            return;
        }

        // ⭐ EL BACKEND YA FILTRÓ, SOLO GUARDAMOS Y RENDERIZAMOS
        window._wizard.horariosDisponibles = data.horarios;

        if (!data.horarios || data.horarios.length === 0) {
            contenedorHorarios.innerHTML = '<p class="mc-empty">Sin horarios disponibles para esta fecha</p>';
            dispInfo.textContent = '⏰ No quedan horarios disponibles';
            dispInfo.style.color = 'var(--color-warning)';
            return;
        }

        const botonesHTML = data.horarios.map(h => `
            <button type="button" class="mc-horario-btn" 
                    data-hora="${h.hora}"
                    data-en-espera="${h.enEspera ? 'true' : 'false'}"
                    ${!h.disponible ? 'disabled' : ''}
                    onclick="window.wizardSeleccionarHora('${h.hora}', this)"
                    title="${h.disponible ? (h.enEspera ? 'En espera - Elige para unirte' : 'Disponible') : (h.razon || 'No disponible')}">
                ${h.hora}
                ${!h.disponible ? `<small style="display:block;font-size:0.6rem;opacity:0.7;">${h.razon || 'No disponible'}</small>` : ''}
                ${h.enEspera ? `<small style="display:block;font-size:0.6rem;color:#ffbb33;">⏳ En espera</small>` : ''}
            </button>
        `).join('');

        contenedorHorarios.innerHTML = botonesHTML;

        const disponibles = data.horarios.filter(h => h.disponible).length;
        const enEspera = data.horarios.filter(h => h.enEspera).length;

        if (disponibles > 0) {
            let mensaje = `✅ ${disponibles} horarios disponibles`;
            if (enEspera > 0) mensaje += ` · ⏳ ${enEspera} en espera`;
            dispInfo.textContent = mensaje;
            dispInfo.style.color = 'var(--color-success)';
        } else {
            dispInfo.textContent = `⚠️ Todos los horarios están ocupados`;
            dispInfo.style.color = 'var(--color-warning)';
        }
    } catch (error) {
        console.error('❌ Error horarios:', error);
        contenedorHorarios.innerHTML = '<p class="mc-empty">Error al cargar horarios</p>';
        dispInfo.textContent = '⚠️ Intenta de nuevo';
        dispInfo.style.color = 'var(--color-danger)';
    }
}
// ============================================================================
// 2. UI DEL WIZARD
// ============================================================================
function actualizarWizardUI() {
    const { paso, totalPasos } = window._wizard;

    document.querySelectorAll('.mc-wizard-paso').forEach(p => p.style.display = 'none');
    const pasoActual = document.getElementById(`mc-paso-${paso}`);
    if (pasoActual) pasoActual.style.display = 'block';

    const progreso = (paso / totalPasos) * 100;
    const barra = document.getElementById('mc-wizard-progress-bar');
    if (barra) barra.style.width = progreso + '%';

    const label = document.getElementById('mc-wizard-paso-label');
    if (label) label.textContent = `Paso ${paso} de ${totalPasos}`;

    const btnPrev = document.getElementById('mc-btn-prev');
    const btnCancel = document.getElementById('mc-btn-cancel');
    const btnNext = document.getElementById('mc-btn-next');
    const btnConfirm = document.getElementById('btn-agendar-cita');

    if (btnPrev) btnPrev.style.display = paso > 1 ? 'block' : 'none';
    if (btnCancel) btnCancel.style.display = paso === 1 ? 'block' : 'none';
    if (btnNext) btnNext.style.display = paso < totalPasos ? 'block' : 'none';
    if (btnConfirm) btnConfirm.style.display = paso === totalPasos ? 'block' : 'none';
}

export async function wizardNext() {
    const pasoActual = window._wizard.paso;

    if (pasoActual === 1 && !window._wizard.vehiculo) {
        window.mostrarToast?.('⚠️ Selecciona un vehículo', 'warning');
        return;
    }
    if (pasoActual === 2 && !window._wizard.servicio) {
        window.mostrarToast?.('⚠️ Selecciona un servicio', 'warning');
        return;
    }
    if (pasoActual >= window._wizard.totalPasos) return;

    window._wizard.paso++;
    actualizarWizardUI();

    if (window._wizard.paso === 4) {
        actualizarResumen();
    }
}

export function wizardPrev() {
    if (window._wizard.paso > 1) {
        window._wizard.paso--;
        actualizarWizardUI();
    }
}

// ============================================================================
// 3. PASO 1: VEHÍCULOS
// ============================================================================
function renderizarPasoVehiculos() {
    const contenedor = document.getElementById('mc-vehiculos-lista');
    if (!contenedor) return;

    const garaje = window.user?.garaje || [];
    if (garaje.length === 0) {
        contenedor.innerHTML = '<p class="mc-empty">No tienes vehículos registrados.</p>';
        return;
    }

    const cardsHTML = garaje.map((auto, index) => {
        const placa = auto.placa || 'S/P';
        const foto = auto.foto && (auto.foto.startsWith('data:') || auto.foto.startsWith('http')) ? auto.foto : null;
        const color = auto.color || '#888';

        return `
            <div class="mc-card mc-card-vehiculo" data-index="${index}" onclick="window.wizardSeleccionarVehiculo(${index})">
                ${foto ? `<img src="${foto}" class="mc-card-vehiculo-img" alt="${auto.marca}">` : `<div class="mc-card-vehiculo-img">🚗</div>`}
                <div class="mc-card-vehiculo-info">
                    <strong>${auto.marca || 'Vehículo'} ${auto.modelo || ''}</strong>
                    <small><span class="mc-card-vehiculo-color" style="background:${color};"></span> ${placa}</small>
                </div>
            </div>
        `;
    }).join('');

    contenedor.innerHTML = cardsHTML + `
        <div class="mc-card mc-card-add" onclick="window.abrirModalVehiculo()">
            ➕ Agregar nuevo vehículo
        </div>
    `;
}

export function wizardSeleccionarVehiculo(index) {
    const garaje = window.user?.garaje || [];
    const auto = garaje[index];
    if (!auto) return;

    window._wizard.vehiculo = {
        marca: auto.marca || 'Genérico',
        modelo: auto.modelo || 'Modelo',
        placa: auto.placa || 'S/P',
        color: auto.color || ''
    };

    document.querySelectorAll('#mc-vehiculos-lista .mc-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}

// ============================================================================
// 4. PASO 2: SERVICIOS
// ============================================================================
async function cargarServiciosDelTaller(tallerId) {
    const contenedor = document.getElementById('mc-servicios-lista');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="mc-empty">⏳ Cargando servicios...</p>';

    try {
        const response = await apiFetch(`/talleres/${tallerId}/servicios`);
        const data = await response.json();

        if (data.exito && data.servicios && data.servicios.length > 0) {
            renderizarListaServicios(data.servicios.filter(s => s.activo !== false));
        } else {
            renderizarListaServicios([
                { nombre: 'Lavado Básico', precio: 500, duracionEstimada: 30, descripcion: 'Lavado exterior', tipo: 'LAVADO' },
                { nombre: 'Lavado Premium', precio: 1200, duracionEstimada: 60, descripcion: 'Lavado completo', tipo: 'LAVADO' },
                { nombre: 'Detallado Interior', precio: 2500, duracionEstimada: 90, descripcion: 'Limpieza profunda', tipo: 'DETALLADO' }
            ]);
        }
    } catch (error) {
        console.error('Error cargando servicios:', error);
        contenedor.innerHTML = '<p class="mc-empty">Error al cargar servicios</p>';
    }
}

function renderizarListaServicios(servicios) {
    const contenedor = document.getElementById('mc-servicios-lista');
    if (!contenedor) return;

    const iconos = { 'LAVADO': '🧽', 'DETALLADO': '✨', 'PULIDO': '💎', 'TRATAMIENTO': '🧴', 'EXTRA': '➕' };

    const cardsHTML = servicios.map((s, index) => {
        const icono = iconos[s.tipo] || '🔧';
        const precio = s.precio || 0;
        const duracion = s.duracionEstimada || 45;
        const descripcion = s.descripcion || '';

        return `
            <div class="mc-card mc-card-servicio" data-index="${index}" onclick="window.wizardSeleccionarServicio(${index})">
                <div class="mc-card-servicio-icon">${icono}</div>
                <div class="mc-card-servicio-info">
                    <strong>${s.nombre}</strong>
                    <small>${descripcion || '⏱️ ' + duracion + ' min'}</small>
                </div>
                <div class="mc-card-servicio-precio">
                    <strong>RD$ ${precio.toLocaleString()}</strong>
                    <small>⏱️ ${duracion} min</small>
                </div>
            </div>
        `;
    }).join('');

    contenedor.innerHTML = cardsHTML;
    window._wizard.serviciosDisponibles = servicios;
}

export function wizardSeleccionarServicio(index) {
    const servicios = window._wizard.serviciosDisponibles || [];
    const servicio = servicios[index];
    if (!servicio) return;

    window._wizard.servicio = {
        nombre: servicio.nombre,
        precio: servicio.precio || 0,
        duracion: servicio.duracionEstimada || 45,
        descripcion: servicio.descripcion || ''
    };

    document.querySelectorAll('#mc-servicios-lista .mc-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}

// ============================================================================
// 5. PASO 3: EMPLEADOS
// ============================================================================
async function cargarEmpleadosDelTaller(tallerId) {
    const contenedor = document.getElementById('mc-empleados-lista');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="mc-empty">⏳ Cargando equipo...</p>';

    const sinPrefHTML = `
        <div class="mc-card mc-card--sinpref" onclick="window.wizardSeleccionarEmpleado('sinpref')">
            <div class="mc-card-empleado-icon">🤷</div>
            <div class="mc-card-empleado-info">
                <strong>Sin preferencia</strong>
                <small>El taller asignará al mejor disponible</small>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch(`/talleres/${tallerId}/empleados-publico`, { noRedirigir: true });
        const data = await res.json();

        if (!data.exito || !data.empleados || data.empleados.length === 0) {
            contenedor.innerHTML = sinPrefHTML;
            window._wizard.empleadosDisponibles = [];
            return;
        }

        const empleados = data.empleados;
        window._wizard.empleadosDisponibles = empleados;

        const cardsHTML = empleados.map((emp, index) => {
            const foto = emp.foto || `https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&name=${encodeURIComponent(emp.nombre)}`;
            const rating = emp.calificacionPromedio || 0;
            const trabajos = emp.trabajosCompletados || 0;
            const estadoIcon = emp.estado === 'DISPONIBLE' ? '🟢' : emp.estado === 'OCUPADO' ? '🟡' : '⚪';

            return `
                <div class="mc-card mc-card-empleado" data-index="${index}" onclick="window.wizardSeleccionarEmpleado(${index})">
                    <img src="${foto}" class="mc-card-empleado-foto" alt="${emp.nombre}"
                         onerror="this.src='https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&name=${encodeURIComponent(emp.nombre)}'">
                    <div class="mc-card-empleado-info">
                        <strong>${emp.nombre}</strong>
                        <small>⭐ ${rating.toFixed(1)} · ${trabajos} trabajos</small>
                    </div>
                    <span class="mc-card-empleado-estado">${estadoIcon}</span>
                </div>
            `;
        }).join('');

        contenedor.innerHTML = sinPrefHTML + cardsHTML;
    } catch (error) {
        console.error('Error cargando empleados:', error);
        contenedor.innerHTML = sinPrefHTML;
    }
}

export function wizardSeleccionarEmpleado(indexOId) {
    const esSinPref = indexOId === 'sinpref' || indexOId === -1;

    if (esSinPref) {
        window._wizard.empleado = null;
    } else {
        const empleados = window._wizard.empleadosDisponibles || [];
        const emp = empleados[indexOId];
        if (!emp) return;
        window._wizard.empleado = { id: emp._id, nombre: emp.nombre };
    }

    const cards = document.querySelectorAll('#mc-empleados-lista .mc-card');
    cards.forEach((card) => {
        const esSinPrefCard = card.classList.contains('mc-card--sinpref');
        const cardIndex = parseInt(card.dataset.index);
        if (esSinPref && esSinPrefCard) {
            card.classList.add('selected');
        } else if (!esSinPref && !esSinPrefCard && cardIndex === indexOId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    if (window._wizard.fecha) {
        window.alCambiarFecha?.();
    }
}

function seleccionarEmpleadoPorId(empleadoId) {
    const empleados = window._wizard.empleadosDisponibles || [];
    const index = empleados.findIndex(e => e._id === empleadoId);
    if (index >= 0) wizardSeleccionarEmpleado(index);
}

// ============================================================================
// 6. PASO 4: FECHA Y HORA
// ============================================================================

export function wizardSeleccionarHora(hora, btn) {
    // Buscar el objeto completo del horario
    const horarios = window._wizard.horariosDisponibles || [];
    const horarioSeleccionado = horarios.find(h => h.hora === hora);

    // Si el horario tiene solicitudes pendientes (enEspera), abrir modal con opciones
    if (horarioSeleccionado && horarioSeleccionado.enEspera) {

        // ⭐ 1. Calcular otros empleados disponibles a la MISMA hora
        const otrosEmpleados = (window._wizard.empleadosDisponibles || [])
            .filter(emp => emp._id !== window._wizard.empleado?.id)
            .slice(0, 3);

        // ⭐ 2. Calcular otras horas disponibles para el MISMO empleado
        const otrasHoras = horarios
            .filter(h => h.hora !== hora && h.disponible && !h.enEspera)
            .slice(0, 3);

        const datosCita = {
            tallerId: window._wizard.tallerId,
            vehiculo: window._wizard.vehiculo,
            fecha: window._wizard.fecha,
            hora: hora,
            sucursal: window._wizard.tallerNombre || 'Taller',
            servicio: window._wizard.servicio.nombre,
            duracionEstimada: window._wizard.servicio.duracion || 60,
            metodoPago: 'SALDO',
            montoPagado: window._wizard.servicio.precio,
            empleadoPreferidoId: window._wizard.empleado?.id || null,
            empleadoPreferidoNombre: window._wizard.empleado?.nombre || null,
            notas: window._wizard.empleado ? `Cliente prefiere a: ${window._wizard.empleado.nombre}` : 'Agendado por cliente',
            enEspera: true
        };

        window.mostrarModalConflicto?.(
            `El horario de las ${hora} ya tiene una solicitud pendiente. ¿Qué deseas hacer?`,
            otrasHoras.map(h => ({ hora: h.hora })), // ⭐ Alternativas de hora
            otrosEmpleados,                           // ⭐ Otros empleados
            datosCita
        );
        return;
    }

    // Comportamiento normal
    window._wizard.hora = hora;
    document.querySelectorAll('#mc-horarios-grid .mc-horario-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
    actualizarResumen();
}
function actualizarResumen() {
    const contenedor = document.getElementById('mc-resumen-content');
    if (!contenedor) return;

    const w = window._wizard;
    const items = [];

    if (w.vehiculo) items.push({ label: '🚗 Vehículo', value: `${w.vehiculo.marca} ${w.vehiculo.modelo} (${w.vehiculo.placa})` });
    if (w.servicio) items.push({ label: '🔧 Servicio', value: `${w.servicio.nombre} · ${w.servicio.duracion} min` });
    items.push({ label: '👤 Empleado', value: w.empleado ? w.empleado.nombre : 'Sin preferencia' });
    if (w.fecha) items.push({
        label: '📅 Fecha',
        value: new Date(w.fecha + 'T12:00:00').toLocaleDateString('es-DO', {
            weekday: 'long', day: 'numeric', month: 'long'
        })
    });
    if (w.hora) items.push({ label: '🕐 Hora', value: w.hora });

    let html = items.map(item => `
        <div class="mc-resumen-item">
            <span>${item.label}</span>
            <span>${item.value}</span>
        </div>
    `).join('');

    if (w.servicio) {
        html += `
            <div class="mc-resumen-total">
                <span>💰 Total a pagar</span>
                <strong>RD$ ${(w.servicio.precio || 0).toLocaleString()}</strong>
            </div>
        `;
    }

    contenedor.innerHTML = html;
}

// ============================================================================
// 7. CONFIRMAR CITA (con detección de conflictos)
// ============================================================================
export async function confirmarCita(event) {
    if (event) event.preventDefault();

    const w = window._wizard;

    if (!w.vehiculo) { window.mostrarToast?.('⚠️ Falta el vehículo', 'warning'); return; }
    if (!w.servicio) { window.mostrarToast?.('⚠️ Falta el servicio', 'warning'); return; }
    if (!w.fecha || !w.hora) { window.mostrarToast?.('⚠️ Falta fecha y hora', 'warning'); return; }

    const saldoActual = window.user?.saldo || 0;
    if (saldoActual < w.servicio.precio) {
        window.mostrarToast?.(`⚠️ Saldo insuficiente. Necesitas RD$ ${w.servicio.precio.toFixed(2)}`, 'warning');
        return;
    }

    if (window.citaEnviada) { window.mostrarToast?.('⏳ Procesando...', 'warning'); return; }
    window.citaEnviada = true;

    const btn = document.getElementById('btn-agendar-cita');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Agendando...'; }

    try {
        let tallerNombre = 'Taller';
        if (window.tallerManager?.tieneTallerVinculado() && w.tallerId === window.tallerManager.getTallerId()) {
            tallerNombre = window.tallerManager.getTaller()?.nombre || 'Taller';
        }

        const notas = w.empleado
            ? `Cliente prefiere ser atendido por: ${w.empleado.nombre}`
            : 'Cita agendada por el cliente';

        // ⭐ CRÍTICO: enviar duracionEstimada
        const datosCita = {
            tallerId: w.tallerId,
            vehiculo: w.vehiculo,
            fecha: w.fecha,
            hora: w.hora,
            sucursal: tallerNombre,
            servicio: w.servicio.nombre,
            duracionEstimada: w.servicio.duracion || 60, // ⭐ NUEVO
            metodoPago: 'SALDO',
            montoPagado: w.servicio.precio,
            empleadoPreferidoId: w.empleado?.id || null,
            empleadoPreferidoNombre: w.empleado?.nombre || null,
            notas: notas
        };

        const response = await apiFetch('/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: window.obtenerIdUsuario?.(),
                datosCita
            })
        });

        // ⭐ FASE 2: Detectar conflicto
        if (response.status === 409) {
            const data = await response.json();
            if (data.conflictos) {
                window.mostrarModalConflicto?.(
                    data.mensaje,
                    data.alternativas || [],
                    data.otrosEmpleados || [],
                    datosCita
                );
                return;
            }
        }

        const data = await response.json();
        if (!data.exito) throw new Error(data.mensaje || 'Error al agendar');

        // Descontar saldo
        window.user.saldo = saldoActual - w.servicio.precio;
        window.persistirUsuario?.();

        // ⭐ Si el empleado preferido estaba ocupado, mostrar aviso
        if (data.aviso && data.aviso.tipo === 'EMPLEADO_OCUPADO') {
            window.mostrarToast?.(
                `⚠️ ${data.aviso.mensaje}` +
                (data.aviso.empleadoSugerido ? ` Sugerencia: ${data.aviso.empleadoSugerido}` : ''),
                'warning',
                7000
            );
        } else {
            const extra = w.empleado ? ` Preferencia: ${w.empleado.nombre}.` : '';
            window.mostrarToast?.(`✅ Cita agendada.${extra}`, 'success', 5000);
        }

        // Notificación nativa
        window.mostrarNotificacionNativa?.(
            '✅ Cita agendada',
            `${w.vehiculo.marca} ${w.vehiculo.modelo} · ${w.fecha} ${w.hora}`,
            { tag: 'cita-creada' }
        );

        window.empleadoPreferido = null;
        window.cerrarModales?.();
        await window.sincronizarEstadoCitas?.();
    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast?.('❌ ' + error.message, 'error');
    } finally {
        window.citaEnviada = false;
        if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar cita'; }
    }
}

// ============================================================================
// 8. MODAL DE CONFLICTO (Fase 2 - CON 2 SECCIONES)
// ============================================================================
// ============================================================================
// 8. MODAL DE CONFLICTO (Fase 2 + Lista de Espera)
// ============================================================================
let _datosCitaConflicto = null;

export function mostrarModalConflicto(mensaje, alternativas, otrosEmpleados, datosCita) {
    _datosCitaConflicto = datosCita;

    const modal = document.getElementById('modal-conflicto-horario');
    const msgEl = document.getElementById('mc-conflicto-mensaje');
    const listaHoras = document.getElementById('mc-conflicto-lista');
    const listaEmpleados = document.getElementById('mc-conflicto-empleados');
    const seccionHoras = document.getElementById('mc-conflicto-horas-seccion');
    const seccionEmpleados = document.getElementById('mc-conflicto-empleados-seccion');
    const seccionEspera = document.getElementById('mc-conflicto-espera-seccion'); // ⭐ NUEVA
    const sinAltEl = document.getElementById('mc-conflicto-sin-alternativas');

    if (!modal) return;
    msgEl.textContent = mensaje;

    // Ocultar todo primero
    seccionHoras.style.display = 'none';
    seccionEmpleados.style.display = 'none';
    if (seccionEspera) seccionEspera.style.display = 'none';
    sinAltEl.style.display = 'none';

    let hayOpciones = false;

    // 1. Sección de otros empleados
    if (otrosEmpleados && otrosEmpleados.length > 0) {
        listaEmpleados.innerHTML = otrosEmpleados.map(emp => {
            const foto = emp.foto || `https://ui-avatars.com/api/?background=131c2b&color=00ff88&bold=true&name=${encodeURIComponent(emp.nombre)}`;
            return `
                <div class="mc-alternativa-card" onclick="window.elegirOtroEmpleado('${emp._id}', '${emp.nombre.replace(/'/g, "\\'")}')">
                    <img src="${foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                    <div class="mc-alternativa-info">
                        <strong>${emp.nombre}</strong>
                        <small>${emp.rol} · Misma hora</small>
                    </div>
                    <div class="mc-alternativa-arrow">→</div>
                </div>
            `;
        }).join('');
        seccionEmpleados.style.display = 'block';
        hayOpciones = true;
    }

    // 2. Sección de otras horas
    if (alternativas && alternativas.length > 0) {
        listaHoras.innerHTML = alternativas.map(alt => `
            <div class="mc-alternativa-card" onclick="window.elegirAlternativa('${alt.hora}')">
                <div class="mc-alternativa-icon">🕐</div>
                <div class="mc-alternativa-info">
                    <strong>${alt.hora}</strong>
                    <small>${datosCita.fecha}</small>
                </div>
                <div class="mc-alternativa-arrow">→</div>
            </div>
        `).join('');
        seccionHoras.style.display = 'block';
        hayOpciones = true;
    }

    // ⭐ 3. Sección de Lista de Espera
    // Solo mostrarla si el backend nos dice que hay solicitudes pendientes (datosCita.enEspera = true)
    if (datosCita.enEspera && seccionEspera) {
        seccionEspera.style.display = 'block';
        hayOpciones = true;
    }

    if (!hayOpciones) {
        sinAltEl.style.display = 'block';
    }

    modal.style.display = 'flex';
    modal.classList.add('fade-in');
}

export function cerrarModalConflicto() {
    const modal = document.getElementById('modal-conflicto-horario');
    if (modal) modal.style.display = 'none';
    _datosCitaConflicto = null;
}

export async function elegirAlternativa(hora) {
    if (!_datosCitaConflicto) return;

    const datos = { ..._datosCitaConflicto, hora };
    cerrarModalConflicto();
    window.mostrarToast?.('⏳ Reagendando...', 'info');

    try {
        const response = await apiFetch('/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: window.obtenerIdUsuario?.(),
                datosCita: datos
            })
        });

        const data = await response.json();

        if (!data.exito) {
            if (response.status === 409 && data.alternativas) {
                mostrarModalConflicto(data.mensaje, data.alternativas, data.otrosEmpleados || [], datos);
                return;
            }
            throw new Error(data.mensaje || 'Error');
        }

        window.user.saldo -= datos.montoPagado || 0;
        window.persistirUsuario?.();
        window.mostrarToast?.('✅ Cita agendada en el nuevo horario', 'success', 5000);
        window.cerrarModales?.();
        await window.sincronizarEstadoCitas?.();
        _datosCitaConflicto = null;
    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast?.('❌ ' + error.message, 'error');
    }
}

export async function elegirOtroEmpleado(empleadoId, empleadoNombre) {
    if (!_datosCitaConflicto) return;

    const datos = {
        ..._datosCitaConflicto,
        empleadoPreferidoId: empleadoId,
        empleadoPreferidoNombre: empleadoNombre,
        notas: `Cliente prefiere ser atendido por: ${empleadoNombre}`
    };
    cerrarModalConflicto();
    window.mostrarToast?.('⏳ Reagendando con otro profesional...', 'info');

    try {
        const response = await apiFetch('/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: window.obtenerIdUsuario?.(),
                datosCita: datos
            })
        });

        const data = await response.json();

        if (!data.exito) {
            if (response.status === 409) {
                mostrarModalConflicto(data.mensaje, data.alternativas || [], data.otrosEmpleados || [], datos);
                return;
            }
            throw new Error(data.mensaje || 'Error');
        }

        window.user.saldo -= datos.montoPagado || 0;
        window.persistirUsuario?.();
        window.mostrarToast?.(`✅ Cita agendada con ${empleadoNombre}`, 'success', 5000);
        window.cerrarModales?.();
        await window.sincronizarEstadoCitas?.();
        _datosCitaConflicto = null;
    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast?.('❌ ' + error.message, 'error');
    }
}

// ⭐ NUEVO: Función para unirse a la lista de espera
export async function unirseListaEspera() {
    if (!_datosCitaConflicto) return;

    // Al unirse a la lista de espera, se envía el mismo POST, pero con una nota
    const datos = {
        ..._datosCitaConflicto,
        notas: (_datosCitaConflicto.notas || '') + ' | Cliente aceptó unirse a lista de espera.'
    };

    cerrarModalConflicto();
    window.mostrarToast?.('⏳ Agregando a lista de espera...', 'info');

    try {
        const response = await apiFetch('/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: window.obtenerIdUsuario?.(),
                datosCita: datos
            })
        });

        const data = await response.json();

        if (!data.exito) {
            if (response.status === 409) {
                mostrarModalConflicto(data.mensaje, data.alternativas || [], data.otrosEmpleados || [], datos);
                return;
            }
            throw new Error(data.mensaje || 'Error');
        }

        window.user.saldo -= datos.montoPagado || 0;
        window.persistirUsuario?.();
        window.mostrarToast?.('✅ Agregado a la lista de espera. El taller decidirá pronto.', 'success', 6000);
        window.cerrarModales?.();
        await window.sincronizarEstadoCitas?.();
        _datosCitaConflicto = null;
    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast?.('❌ ' + error.message, 'error');
    }
}



// ============================================================================
// 9. EXPORTAR A WINDOW
// ============================================================================
window.abrirModalSolicitud = abrirModalSolicitud;
window.wizardNext = wizardNext;
window.wizardPrev = wizardPrev;
window.wizardSeleccionarVehiculo = wizardSeleccionarVehiculo;
window.wizardSeleccionarServicio = wizardSeleccionarServicio;
window.wizardSeleccionarEmpleado = wizardSeleccionarEmpleado;
window.wizardSeleccionarHora = wizardSeleccionarHora;
window.alCambiarFecha = alCambiarFecha;
window.confirmarCita = confirmarCita;
window.mostrarModalConflicto = mostrarModalConflicto;
window.cerrarModalConflicto = cerrarModalConflicto;
window.elegirAlternativa = elegirAlternativa;
window.elegirOtroEmpleado = elegirOtroEmpleado;
window.mostrarModalConflicto = mostrarModalConflicto;
window.unirseListaEspera = unirseListaEspera;

console.log('✅ Módulo agendar-cita.js cargado (v4 - con otrosEmpleados)');