/**
 * ============================================================================
 * 📋 LISTA DE CITAS: Renderizado de cards (con expiración)
 * ============================================================================
 */

// ============================================================================
// ESTADOS Y CONSTANTES
// ============================================================================
const ESTADOS_CITA = {
    PENDIENTE: 'PENDIENTE',
    CONFIRMADA: 'CONFIRMADA',
    EN_RECEPCION: 'EN_RECEPCION',
    EN_PROCESO: 'EN_PROCESO',
    LISTO: 'LISTO',
    ENTREGADO: 'ENTREGADO',
    ENTREGADA: 'ENTREGADA',
    CANCELADA: 'CANCELADA',
    EXPIRADA: 'EXPIRADA'
};

const COLORES_ESTADO = {
    [ESTADOS_CITA.PENDIENTE]: "#ff8800",
    [ESTADOS_CITA.CONFIRMADA]: "#00ff88",
    [ESTADOS_CITA.EN_RECEPCION]: "#00d4ff",
    [ESTADOS_CITA.EN_PROCESO]: "#ffcc00",
    [ESTADOS_CITA.LISTO]: "#ff44ff",
    [ESTADOS_CITA.ENTREGADO]: "#888888",
    [ESTADOS_CITA.ENTREGADA]: "#888888",
    [ESTADOS_CITA.CANCELADA]: "#ff4444",
    [ESTADOS_CITA.EXPIRADA]: "#ff4444"
};

const PROGRESO_ESTADO = {
    [ESTADOS_CITA.PENDIENTE]: 10,
    [ESTADOS_CITA.CONFIRMADA]: 25,
    [ESTADOS_CITA.EN_RECEPCION]: 40,
    [ESTADOS_CITA.EN_PROCESO]: 65,
    [ESTADOS_CITA.LISTO]: 90,
    [ESTADOS_CITA.ENTREGADO]: 100,
    [ESTADOS_CITA.ENTREGADA]: 100,
    [ESTADOS_CITA.CANCELADA]: 0,
    [ESTADOS_CITA.EXPIRADA]: 0
};

const MENSAJE_ESTADO = {
    [ESTADOS_CITA.PENDIENTE]: 'Esperando confirmación',
    [ESTADOS_CITA.CONFIRMADA]: 'Taller confirmó ✅',
    [ESTADOS_CITA.EN_RECEPCION]: 'Vehículo recibido',
    [ESTADOS_CITA.EN_PROCESO]: 'Trabajando 🔧',
    [ESTADOS_CITA.LISTO]: '¡Listo para recoger! 🎉',
    [ESTADOS_CITA.ENTREGADO]: 'Completado',
    [ESTADOS_CITA.ENTREGADA]: 'Completado',
    [ESTADOS_CITA.CANCELADA]: 'Cancelada',
    [ESTADOS_CITA.EXPIRADA]: '⏰ Expirada'
};

const ICONO_ESTADO = {
    [ESTADOS_CITA.PENDIENTE]: '⏳',
    [ESTADOS_CITA.CONFIRMADA]: '✅',
    [ESTADOS_CITA.EN_RECEPCION]: '📥',
    [ESTADOS_CITA.EN_PROCESO]: '🔧',
    [ESTADOS_CITA.LISTO]: '🎉',
    [ESTADOS_CITA.ENTREGADO]: '🏁',
    [ESTADOS_CITA.ENTREGADA]: '🏁',
    [ESTADOS_CITA.CANCELADA]: '❌',
    [ESTADOS_CITA.EXPIRADA]: '⏰'
};

// ============================================================================
// HELPERS DE EXPIRACIÓN
// ============================================================================
function calcularTiempoRestante(fechaExpiracion) {
    if (!fechaExpiracion) return null;

    const ahora = new Date();
    const expira = new Date(fechaExpiracion);
    const diffMs = expira - ahora;

    if (diffMs <= 0) return { expirada: true, texto: 'Expirada' };

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);

    if (horas > 0) {
        return { expirada: false, texto: `${horas}h ${minutos % 60}m`, urgente: horas < 2 };
    } else {
        return { expirada: false, texto: `${minutos}m`, urgente: minutos < 30 };
    }
}

// ============================================================================
// RENDERIZADO PRINCIPAL
// ============================================================================
export function renderizarCitas() {
    const contenedorHistorial = document.getElementById('contenedor-citas-historial');
    const contenedorPendientes = document.getElementById('contenedor-citas-pendientes');

    if (!window.user) return;

    const pendientes = window.user.citasPendientes;
    const historial = window.user.citasHistorial;

    if (contenedorPendientes) {
        contenedorPendientes.style.display = 'grid';
        contenedorPendientes.innerHTML = '';

        if (pendientes.length === 0) {
            contenedorPendientes.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">🎉 No tienes citas pendientes.</p>';
        } else {
            [...pendientes].reverse().forEach(cita => {
                contenedorPendientes.appendChild(crearCardCita(cita, true));
            });
        }
    }
}

export function renderizarCitasPendientes() {
    const contenedor = document.getElementById('contenedor-citas-pendientes');
    if (!contenedor || !window.user) return;

    contenedor.innerHTML = '';
    const pendientes = window.user.citasPendientes;

    if (pendientes.length === 0) {
        contenedor.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">🎉 No tienes citas pendientes.</p>';
        return;
    }

    [...pendientes].reverse().forEach(c => {
        contenedor.appendChild(crearCardCita(c, true));
    });
}

export function renderizarCitasHistorial() {
    const contenedor = document.getElementById('contenedor-citas-historial');
    if (!contenedor || !window.user) return;

    contenedor.innerHTML = '';
    const historial = window.user.citasHistorial;

    if (historial.length === 0) {
        contenedor.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">📭 No hay historial todavía.</p>';
        return;
    }

    [...historial].reverse().forEach(c => {
        contenedor.appendChild(crearCardCita(c, false));
    });
}

// ============================================================================
// CREAR CARD DE CITA
// ============================================================================
export function crearCardCita(cita, esPendiente) {
    const idFinal = cita._id || cita.id || cita.idCita;
    const estado = (cita.estado || ESTADOS_CITA.PENDIENTE).toUpperCase();
    const color = COLORES_ESTADO[estado] || '#00ff88';
    const icono = ICONO_ESTADO[estado] || '📌';
    const mensaje = MENSAJE_ESTADO[estado] || '';
    const progreso = PROGRESO_ESTADO[estado] || 10;

    const { modeloTxt, placaTxt } = obtenerDatosVehiculo(cita);
    const tallerNombre = cita.tallerNombre || cita.tallerId?.nombre || 'Taller';

    const card = document.createElement('div');
    card.className = 'cita-card-cliente';
    card.style.cssText = `
        background: #111820;
        border: 1px solid #1a2530;
        border-left: 4px solid ${color};
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 14px;
        transition: all 0.3s ease;
    `;

    card.addEventListener('mouseenter', () => {
        card.style.borderColor = color + '44';
        card.style.boxShadow = `0 8px 25px ${color}10`;
        card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#1a2530';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
    });

    card.innerHTML = `
        ${crearHeaderCitaHTML(icono, modeloTxt, placaTxt, estado, color)}
        ${crearInfoCitaHTML(cita, tallerNombre)}
        ${crearInfoBahiaHTML(cita)}
        ${crearBarraProgresoHTML(mensaje, color, progreso)}
        ${crearBadgeExpiracionHTML(cita)}
        ${crearAccionesCitaHTML(idFinal, estado, esPendiente, cita)}
    `;

    return card;
}

// ============================================================================
// HELPERS
// ============================================================================
function obtenerDatosVehiculo(cita) {
    let modeloTxt = "Vehículo";
    let placaTxt = "S/P";

    if (cita.vehiculo && typeof cita.vehiculo === 'object') {
        const marca = cita.vehiculo.marca || '';
        modeloTxt = `${marca} ${cita.vehiculo.modelo || ''}`.trim();
        placaTxt = cita.vehiculo.placa || "S/P";
    } else if (typeof cita.vehiculo === 'string') {
        const partes = cita.vehiculo.split('|');
        modeloTxt = partes[0] || "Vehículo";
        placaTxt = partes[1] || "S/P";
    }

    return { modeloTxt, placaTxt };
}

function crearHeaderCitaHTML(icono, modeloTxt, placaTxt, estado, color) {
    return `
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="
                    width:50px; height:50px; min-width:50px;
                    background:${color}15;
                    border:2px solid ${color}33;
                    border-radius:14px;
                    display:flex; align-items:center; justify-content:center;
                    font-size:1.6rem;
                ">${icono}</div>
                <div>
                    <h4 style="color:#fff; margin:0; font-size:1rem; font-weight:600;">${modeloTxt}</h4>
                    <span class="car-plate" style="margin-top:3px;">${placaTxt}</span>
                </div>
            </div>
            <span style="
                background:${color}18;
                color:${color};
                padding:5px 12px;
                border-radius:20px;
                font-size:0.7rem;
                font-weight:700;
                letter-spacing:1px;
                white-space:nowrap;
            ">${estado}</span>
        </div>`;
}

function crearInfoCitaHTML(cita, tallerNombre) {
    return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.8rem;">
                <span>📅</span><span>${cita.fecha || 'S/F'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.8rem;">
                <span>🕐</span><span>${cita.hora || '--:--'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.8rem;">
                <span>🏪</span><span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tallerNombre}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.8rem;">
                <span>🔧</span><span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cita.servicio?.nombre || 'Servicio'}</span>
            </div>
        </div>`;
}

function crearInfoBahiaHTML(cita) {
    if (!cita.bahiaAsignada && !cita.empleadoAsignado) return '';
    return `
        <div style="display:flex; gap:15px; margin-bottom:12px; flex-wrap:wrap;">
            ${cita.bahiaAsignada ? `
            <div style="display:flex; align-items:center; gap:5px; background:rgba(255,187,51,0.08); padding:5px 10px; border-radius:8px; font-size:0.7rem; color:#ffbb33;">
                🏗️ Bahía #${cita.bahiaAsignada}
            </div>` : ''}
            ${cita.empleadoAsignado ? `
            <div style="display:flex; align-items:center; gap:5px; background:rgba(0,212,255,0.08); padding:5px 10px; border-radius:8px; font-size:0.7rem; color:#00d4ff;">
                👨‍🔧 ${typeof cita.empleadoAsignado === 'object' ? cita.empleadoAsignado.nombre : cita.empleadoAsignado}
            </div>` : ''}
        </div>`;
}

function crearBarraProgresoHTML(mensaje, color, progreso) {
    return `
        <div style="margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="font-size:0.65rem; color:#666;">Progreso</span>
                <span style="font-size:0.65rem; color:${color};">${mensaje}</span>
            </div>
            <div style="background:#1a1a1a; border-radius:8px; height:6px; overflow:hidden;">
                <div style="background:${color}; height:100%; width:${progreso}%; border-radius:8px; transition:width 0.5s ease;"></div>
            </div>
        </div>`;
}

function crearBadgeExpiracionHTML(cita) {
    if (cita.estado !== 'PENDIENTE') return '';
    if (!cita.fechaExpiracion) return '';

    const tiempo = calcularTiempoRestante(cita.fechaExpiracion);
    if (!tiempo) return '';

    if (tiempo.expirada) {
        return `
            <div style="background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.3); border-radius:8px; padding:8px 12px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.2rem;">⏰</span>
                <div>
                    <div style="color:#ff4444; font-weight:600; font-size:0.85rem;">Cita expirada</div>
                    <div style="color:#888; font-size:0.7rem;">El taller no confirmó a tiempo</div>
                </div>
            </div>
        `;
    }

    const color = tiempo.urgente ? '#ff4444' : '#ffbb33';
    const bgColor = tiempo.urgente ? 'rgba(255,68,68,0.1)' : 'rgba(255,187,51,0.1)';
    const borderColor = tiempo.urgente ? 'rgba(255,68,68,0.3)' : 'rgba(255,187,51,0.3)';
    const icono = tiempo.urgente ? '⚠️' : '⏰';

    return `
        <div style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:8px; padding:8px 12px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">${icono}</span>
            <div>
                <div style="color:${color}; font-weight:600; font-size:0.85rem;">
                    Expira en ${tiempo.texto}
                </div>
                <div style="color:#888; font-size:0.7rem;">
                    El taller debe confirmar antes
                </div>
            </div>
        </div>
    `;
}

function crearAccionesCitaHTML(idFinal, estado, esPendiente, cita) {
    let botonesHTML = '';

    if (estado === ESTADOS_CITA.EXPIRADA) {
        botonesHTML += `<button onclick="window.reagendarCitaExpirada('${idFinal}')" class="btn-cita-confirmar" style="background:#ffbb33; color:#000;">🔄 Reagendar</button>`;
    }

    if (esPendiente && [ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA].includes(estado)) {
        botonesHTML += `<button onclick="window.cancelarCita('${idFinal}')" class="btn-cita-cancelar">❌ Cancelar</button>`;
    }

    if (estado === ESTADOS_CITA.LISTO) {
        botonesHTML += `<button onclick="window.abrirModalConfirmarEntrega('${idFinal}')" class="btn-cita-confirmar">🎉 Confirmar Entrega</button>`;
    }

    if (estado === ESTADOS_CITA.ENTREGADO && !cita.calificacion?.puntuacion) {
        botonesHTML += `<button onclick="window.calificarServicio('${idFinal}')" class="btn-cita-calificar">⭐ Calificar</button>`;
    }

    if (cita.calificacion?.puntuacion && cita.calificacion.puntuacion > 0) {
        botonesHTML += `<span style="font-size:0.85rem; color:#ffbb33; padding:8px;">${'⭐'.repeat(cita.calificacion.puntuacion)}</span>`;
    }

    if (cita.tallerId) {
        botonesHTML += `<button onclick="window.verDetalleCita('${idFinal}')" class="btn-cita-detalle">🔍 Detalle</button>`;
    }

    return `<div style="display:flex; gap:8px; flex-wrap:wrap;">${botonesHTML}</div>`;
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.renderizarCitas = renderizarCitas;
window.renderizarCitasPendientes = renderizarCitasPendientes;
window.renderizarCitasHistorial = renderizarCitasHistorial;
window.crearCardCita = crearCardCita;

console.log('✅ Módulo citas-lista.js cargado (con expiración)');