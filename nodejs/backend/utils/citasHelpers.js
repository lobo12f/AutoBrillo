/**
 * ============================================================================
 * 🕐 HELPERS DE CITAS: Expiración automática
 * ============================================================================
 * Reglas de expiración:
 * - Cita para HOY o mañana → expira en 2 horas
 * - Cita para pasado mañana → expira en 12 horas
 * - Cita para > 2 días → expira 24h antes de la cita
 * ============================================================================
 */

import CitaTaller from '../models/CitaTaller.js';

// ============================================================================
// CALCULAR FECHA DE EXPIRACIÓN
// ============================================================================
export function calcularFechaExpiracion(fecha, hora) {
    const ahora = new Date();
    const fechaCita = new Date(`${fecha}T${hora}:00`);
    const diffHoras = (fechaCita - ahora) / (1000 * 60 * 60);

    let expiracion;

    if (diffHoras <= 24) {
        // Es hoy o mañana → 2 horas de gracia
        expiracion = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    } else if (diffHoras <= 48) {
        // Pasado mañana → 12 horas de gracia
        expiracion = new Date(ahora.getTime() + 12 * 60 * 60 * 1000);
    } else {
        // Más de 2 días → expira 24 horas antes de la cita
        expiracion = new Date(fechaCita.getTime() - 24 * 60 * 60 * 1000);
    }

    // ⭐ NUEVO: La expiración NUNCA debe ser después de la cita.
    // Si el cliente agenda con poco tiempo de anticipación, la expiración
    // debe ser al menos 15 minutos antes de la cita.
    const maximaExpiracion = new Date(fechaCita.getTime() - 15 * 60 * 1000);

    if (expiracion > maximaExpiracion) {
        expiracion = maximaExpiracion;
    }

    // Si la cita es en menos de 15 minutos, la expiración es ahora mismo (expira ya)
    if (expiracion < ahora) {
        expiracion = ahora;
    }

    return expiracion;
}
// ============================================================================
// MARCAR CITAS EXPIRADAS
// ============================================================================
export async function marcarCitasExpiradas(tallerId = null) {
    try {
        const ahora = new Date();
        const filtro = {
            estado: 'PENDIENTE',
            fechaExpiracion: { $lte: ahora, $ne: null }
        };

        if (tallerId) {
            filtro.tallerId = tallerId;
        }

        const resultado = await CitaTaller.updateMany(
            filtro,
            {
                $set: {
                    estado: 'EXPIRADA',
                    expiradaPor: 'SISTEMA',
                    fechaExpirada: ahora
                }
            }
        );

        if (resultado.modifiedCount > 0) {
            console.log(`⏰ ${resultado.modifiedCount} cita(s) marcadas como EXPIRADA`);
        }

        return resultado.modifiedCount;
    } catch (error) {
        console.error('Error marcando citas expiradas:', error);
        return 0;
    }
}

// ============================================================================
// INICIAR CRON JOB (setInterval cada 5 minutos)
// ============================================================================
export function iniciarCronExpiracion(io) {
    const INTERVALO_MS = 5 * 60 * 1000; // 5 minutos

    console.log('⏰ Cron de expiración de citas iniciado (cada 5 min)');

    // Ejecutar inmediatamente al arrancar
    ejecutarExpiracion(io);

    // Luego cada 5 minutos
    setInterval(() => ejecutarExpiracion(io), INTERVALO_MS);
}

async function ejecutarExpiracion(io) {
    try {
        const ahora = new Date();
        const citasPorExpirar = await CitaTaller.find({
            estado: 'PENDIENTE',
            fechaExpiracion: { $lte: ahora, $ne: null }
        }).lean();

        if (citasPorExpirar.length === 0) return;

        // Marcar todas como expiradas
        const resultado = await marcarCitasExpiradas();

        if (resultado > 0) {
            console.log(`⏰ ${resultado} citas expiradas`);

            // Notificar a clientes y talleres
            if (io) {
                for (const cita of citasPorExpirar) {
                    // Notificar al cliente
                    if (cita.clienteId) {
                        io.to(`cliente-${cita.clienteId}`).emit('cita-expirada', {
                            citaId: cita._id,
                            mensaje: `Tu cita para ${cita.fecha} ${cita.hora} expiró porque el taller no confirmó a tiempo.`,
                            fecha: cita.fecha,
                            hora: cita.hora,
                            vehiculo: cita.vehiculo
                        });
                    }

                    // Notificar al taller
                    if (cita.tallerId) {
                        io.to(`taller-${cita.tallerId}`).emit('cita-expirada-taller', {
                            citaId: cita._id,
                            mensaje: `Cita expirada: ${cita.vehiculo?.marca || 'Vehículo'} ${cita.vehiculo?.modelo || ''}`,
                            fecha: cita.fecha,
                            hora: cita.hora
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error en cron de expiración:', error);
    }
}