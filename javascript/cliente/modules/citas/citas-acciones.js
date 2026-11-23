/**
 * ============================================================================
 * 🎬 ACCIONES DE CITAS: Cancelar, Calificar, Ver Detalle
 * ============================================================================
 */

import { apiFetch } from '../../../api-client.js';

// ============================================================================
// CANCELAR CITA
// ============================================================================
export async function cancelarCita(idRecibido) {
    const cita = window.user.obtenerCita(idRecibido);
    if (!cita) {
        window.mostrarToast("❌ Cita no encontrada.", "error");
        return;
    }

    const nombre = typeof cita.vehiculo === 'object'
        ? `${cita.vehiculo.marca || ''} ${cita.vehiculo.modelo || ''}`
        : cita.vehiculo;
    const montoReembolso = cita.pago?.monto || 0;

    if (!confirm(`¿Cancelar cita de ${nombre}?\n\nSe reembolsará RD$ ${montoReembolso.toFixed(2)}`)) return;

    try {
        const citaId = cita._id || cita.id;
        await apiFetch(`/citas/${citaId}/cancelar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: window.obtenerIdUsuario(),
                motivo: 'Cancelado por el cliente'
            })
        });

        window.user.eliminarCita(idRecibido);

        if (montoReembolso > 0) {
            window.user.saldo += montoReembolso;
        }

        window.persistirUsuario();
        window.renderizarCitas();
        window.mostrarToast(`✅ Cita cancelada. RD$ ${montoReembolso.toFixed(2)} reembolsado.`, 'success');
    } catch (error) {
        window.mostrarToast("❌ Error al cancelar", "error");
    }
}

// ============================================================================
// CONFIRMAR ENTREGA Y CALIFICAR
// ============================================================================
export function abrirModalConfirmarEntrega(citaId) {
    window.calificacionesManager?.abrirModalConfirmarEntrega(citaId);
}

export function seleccionarEstrellaConfirmar(numero) {
    window.calificacionesManager?.seleccionarEstrellaConfirmar(numero);
}

export function cerrarModalConfirmar() {
    window.calificacionesManager?.cerrarModalConfirmar();
}

export function confirmarEntregaConCalificacion() {
    window.calificacionesManager?.confirmarEntregaConCalificacion();
}

// ============================================================================
// VER DETALLE DE CITA
// ============================================================================
export function verDetalleCita(citaId) {
    const cita = window.user.obtenerCita(citaId);
    if (!cita) return;

    const vehiculo = typeof cita.vehiculo === 'object'
        ? `${cita.vehiculo.marca || ''} ${cita.vehiculo.modelo || ''} (${cita.vehiculo.placa || ''})`
        : cita.vehiculo;

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:10000;';
    modal.innerHTML = `
        <div style="background:#111820; border:1px solid #1a2530; border-radius:16px; padding:25px; max-width:450px; width:90%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="color:#fff; margin:0;">🔍 Detalle de Cita</h3>
                <span onclick="this.closest('div').parentElement.remove()" style="font-size:1.5rem; cursor:pointer; color:#888;">&times;</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; color:#ccc; font-size:0.9rem;">
                <p><strong>🚗 Vehículo:</strong> ${vehiculo}</p>
                <p><strong>📅 Fecha:</strong> ${cita.fecha || 'S/F'}</p>
                <p><strong>🕐 Hora:</strong> ${cita.hora || '--:--'}</p>
                <p><strong>🏪 Taller:</strong> ${cita.tallerId?.nombre || 'No asignado'}</p>
                <p><strong>🔧 Servicio:</strong> ${cita.servicio?.nombre || 'No especificado'}</p>
                <p><strong>📌 Estado:</strong> ${cita.estado || 'Pendiente'}</p>
                ${cita.bahiaAsignada ? `<p><strong>🏗️ Bahía:</strong> #${cita.bahiaAsignada}</p>` : ''}
                ${cita.montoPagado ? `<p><strong>💰 Monto:</strong> RD$ ${cita.montoPagado.toLocaleString()}</p>` : ''}
            </div>
            <button onclick="this.closest('div').parentElement.remove()" 
                style="width:100%; margin-top:20px; padding:12px; background:#00ff88; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                CERRAR
            </button>
        </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

// ============================================================================
// AGENDAR CITA CON VEHÍCULO
// ============================================================================
export function agendarCitaConVehiculo(id) {
    const garaje = window.user.garaje;
    const vehiculo = garaje.find(v => (v.id || v._id) == id);
    if (!vehiculo) {
        window.mostrarToast('⚠️ Vehículo no encontrado', 'warning');
        return;
    }

    if (typeof window.abrirModalSolicitud === 'function') {
        window.abrirModalSolicitud();

        setTimeout(() => {
            const selectVehiculo = document.getElementById('cita-vehiculo');
            if (selectVehiculo) {
                for (let i = 0; i < selectVehiculo.options.length; i++) {
                    const option = selectVehiculo.options[i];
                    if (option.dataset.placa === vehiculo.placa ||
                        option.textContent.includes(vehiculo.placa)) {
                        selectVehiculo.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 500);
    }
}
// ============================================================================
// REAGENDAR CITA EXPIRADA
// ============================================================================
export function reagendarCitaExpirada(citaId) {
    const cita = window.user?.obtenerCita(citaId);
    if (!cita) {
        window.mostrarToast?.('❌ Cita no encontrada', 'error');
        return;
    }

    window.mostrarToast?.('🔄 Abriendo wizard para reagendar...', 'info');

    if (typeof window.abrirModalSolicitud === 'function') {
        window.abrirModalSolicitud();

        setTimeout(() => {
            // Precargar vehículo
            const garaje = window.user?.garaje || [];
            const vehiculoIndex = garaje.findIndex(v => v.placa === cita.vehiculo?.placa);
            if (vehiculoIndex >= 0 && window.wizardSeleccionarVehiculo) {
                window.wizardSeleccionarVehiculo(vehiculoIndex);
            }

            // Precargar empleado
            if (cita.empleadoPreferidoId && window.wizardSeleccionarEmpleado) {
                const empleados = window._wizard?.empleadosDisponibles || [];
                const empIndex = empleados.findIndex(e => e._id === cita.empleadoPreferidoId);
                if (empIndex >= 0) {
                    window.wizardSeleccionarEmpleado(empIndex);
                }
            }
        }, 500);
    }
}


// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.cancelarCita = cancelarCita;
window.abrirModalConfirmarEntrega = abrirModalConfirmarEntrega;
window.seleccionarEstrellaConfirmar = seleccionarEstrellaConfirmar;
window.cerrarModalConfirmar = cerrarModalConfirmar;
window.confirmarEntregaConCalificacion = confirmarEntregaConCalificacion;
window.verDetalleCita = verDetalleCita;
window.agendarCitaConVehiculo = agendarCitaConVehiculo;
window.reagendarCitaExpirada = reagendarCitaExpirada;
console.log('✅ Módulo citas-acciones.js cargado');