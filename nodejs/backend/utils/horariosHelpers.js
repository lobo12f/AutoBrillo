/**
 * ============================================================================
 * 🕐 HELPERS DE HORARIOS
 * ============================================================================
 * Funciones para generar slots, validar solapamientos y buscar alternativas.
 * ============================================================================
 */

import mongoose from 'mongoose';
import Taller from '../models/Taller.js';
import CitaTaller from '../models/CitaTaller.js';
import Empleado from '../models/Empleado.js';

// ============================================================================
// CONVERSIÓN HORA ↔ MINUTOS
// ============================================================================
export function horaAMinutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

export function minutosAHora(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================================
// GENERAR SLOTS DEL DÍA
// ============================================================================
export function generarSlotsDelDia(horaApertura, horaCierre, duracionMinutos = 60) {
    const slots = [];
    const [hA, mA] = horaApertura.split(':').map(Number);
    const [hC, mC] = horaCierre.split(':').map(Number);

    let actualMin = hA * 60 + mA;
    const cierreMin = hC * 60 + mC;

    while (actualMin + duracionMinutos <= cierreMin) {
        const h = Math.floor(actualMin / 60);
        const m = actualMin % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        actualMin += duracionMinutos;
    }

    return slots;
}

// ============================================================================
// BUSCAR HORARIOS ALTERNATIVOS (v2 - con lógica de negocio)
// ============================================================================
export async function buscarHorariosAlternativos(
    tallerId, fecha, horaActual, placa, empleadoId, duracionServicio = 60
) {
    try {
        const taller = await Taller.findById(tallerId).lean();
        if (!taller) return { alternativas: [], otrosEmpleados: [] };

        const [year, month, day] = fecha.split('-').map(Number);
        const fechaObj = new Date(year, month - 1, day);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const nombreDia = diasSemana[fechaObj.getDay()];

        const configDia = taller.horario?.[nombreDia];
        if (!configDia?.apertura || !configDia?.cierre) {
            return { alternativas: [], otrosEmpleados: [] };
        }

        const slots = generarSlotsDelDia(configDia.apertura, configDia.cierre, 60);
        const bahiasTotales = taller.bahias?.length || 1;
        const tallerObjId = new mongoose.Types.ObjectId(tallerId);
        const horaOriginalMin = horaAMinutos(horaActual);

        // Hora mínima: si es hoy, solo futuros. Si es otro día, la hora original.
        const ahora = new Date();
        const esHoy = fechaObj.toDateString() === ahora.toDateString();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const horaMinimaFinal = esHoy ? Math.max(minutosActuales + 30, horaOriginalMin - 120) : 0;

        // ─────────────────────────────────────────────────────────
        // 1. Alternativas de HORA para el MISMO empleado (si viene)
        // ─────────────────────────────────────────────────────────
        const alternativasEmpleado = [];

        if (empleadoId) {
            for (const hora of slots) {
                const horaMin = horaAMinutos(hora);

                // Solo futuro (si es hoy) y distancia máxima 3 horas
                if (horaMin < horaMinimaFinal) continue;
                const distancia = Math.abs(horaMin - horaOriginalMin);
                if (distancia > 180) continue; // máximo 3 horas de diferencia
                if (hora === horaActual) continue;

                // ¿El empleado está libre en ese slot?
                const citaEmpleado = await CitaTaller.findOne({
                    tallerId: tallerObjId,
                    $or: [
                        { empleadoAsignado: new mongoose.Types.ObjectId(empleadoId) },
                        { empleadoPreferidoId: new mongoose.Types.ObjectId(empleadoId) }
                    ],
                    fecha, hora,
                    estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
                });
                if (citaEmpleado) continue;

                // ¿El vehículo ya tiene cita ahí?
                const citaVehiculo = await CitaTaller.findOne({
                    tallerId: tallerObjId,
                    'vehiculo.placa': placa,
                    fecha, hora,
                    estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
                });
                if (citaVehiculo) continue;

                // ¿Hay bahías disponibles?
                const citasEnSlot = await CitaTaller.countDocuments({
                    tallerId: tallerObjId,
                    fecha, hora,
                    estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
                });
                if (citasEnSlot >= bahiasTotales) continue;

                alternativasEmpleado.push({ hora, distancia });
            }

            // Ordenar por cercanía
            alternativasEmpleado.sort((a, b) => a.distancia - b.distancia);
        }

        // ─────────────────────────────────────────────────────────
        // 2. Otros EMPLEADOS disponibles en la MISMA hora
        // ─────────────────────────────────────────────────────────
        const otrosEmpleados = [];

        // Solo si el problema es el empleado ocupado (no bahías/vehículo)
        const citaVehiculo = await CitaTaller.findOne({
            tallerId: tallerObjId,
            'vehiculo.placa': placa,
            fecha, hora: horaActual,
            estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
        });

        const citasEnSlotActual = await CitaTaller.countDocuments({
            tallerId: tallerObjId,
            fecha, hora: horaActual,
            estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
        });

        // Solo buscar otros empleados si el vehículo no está ocupado y hay bahías
        if (!citaVehiculo && citasEnSlotActual < bahiasTotales) {
            // Empleados del taller
            const empleadosTaller = await Empleado.find({
                tallerId: tallerObjId,
                estado: { $ne: 'INACTIVO' }
            }).select('nombre rol fotoPerfil especialidades').lean();

            for (const emp of empleadosTaller) {
                // Saltar al empleado preferido (ya sabemos que está ocupado)
                if (empleadoId && String(emp._id) === String(empleadoId)) continue;

                // ¿Está ocupado en este horario?
                const ocupado = await CitaTaller.findOne({
                    tallerId: tallerObjId,
                    $or: [
                        { empleadoAsignado: emp._id },
                        { empleadoPreferidoId: emp._id }
                    ],
                    fecha, hora: horaActual,
                    estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
                });

                if (!ocupado) {
                    otrosEmpleados.push({
                        _id: emp._id,
                        nombre: emp.nombre,
                        rol: emp.rol,
                        foto: emp.fotoPerfil || null,
                        especialidades: emp.especialidades || []
                    });
                }
            }
        }

        // ─────────────────────────────────────────────────────────
        // 3. Resultado
        // ─────────────────────────────────────────────────────────
        return {
            alternativas: alternativasEmpleado.slice(0, 3).map(a => ({ hora: a.hora })),
            otrosEmpleados: otrosEmpleados.slice(0, 3)
        };

    } catch (error) {
        console.error('Error buscando alternativas:', error);
        return { alternativas: [], otrosEmpleados: [] };
    }
}

// ============================================================================
// BUSCAR EMPLEADO DISPONIBLE EN UN HORARIO (excluye el ocupado)
// ============================================================================
export async function buscarEmpleadoDisponible(tallerId, fecha, hora, excluirEmpleadoId = null) {
    try {
        const tallerObjId = new mongoose.Types.ObjectId(tallerId);

        // Obtener todos los empleados activos del taller
        const empleados = await Empleado.find({
            tallerId: tallerObjId,
            estado: { $ne: 'INACTIVO' }
        }).select('nombre rol fotoPerfil especialidades estado').lean();

        const disponibles = [];

        for (const emp of empleados) {
            // Saltar el empleado excluido (el que está ocupado)
            if (excluirEmpleadoId && String(emp._id) === String(excluirEmpleadoId)) continue;

            // Verificar si está ocupado en ese horario
            const ocupado = await CitaTaller.findOne({
                tallerId: tallerObjId,
                $or: [
                    { empleadoAsignado: emp._id },
                    { empleadoPreferidoId: emp._id }
                ],
                fecha,
                hora,
                estado: { $nin: ['CANCELADA', 'ENTREGADO'] }
            });

            if (!ocupado) {
                disponibles.push({
                    _id: emp._id,
                    nombre: emp.nombre,
                    rol: emp.rol,
                    foto: emp.fotoPerfil || null,
                    especialidades: emp.especialidades || [],
                    estado: emp.estado
                });
            }
        }

        return disponibles;
    } catch (error) {
        console.error('Error buscando empleado disponible:', error);
        return [];
    }
}