/**
 * SERVICIO DE CONEXIÓN CLIENTE-TALLER
 * Permite a los clientes buscar talleres, ver disponibilidad y enviar citas
 */
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export class ClienteTallerService {
    constructor() {
        this.API_URL = `${API_URL}`;
        this.talleresCache = null;
        this.ultimaBusqueda = null;
    }

    /**
     * Obtiene todos los talleres disponibles para el cliente
     * @param {Object} filtros - Filtros opcionales { ciudad, provincia, especialidad }
     * @returns {Promise<Array>} Lista de talleres
     */
    async obtenerTalleresDisponibles(filtros = {}) {
        try {
            // Construir query params
            const params = new URLSearchParams();
            if (filtros.ciudad) params.append('ciudad', filtros.ciudad);
            if (filtros.provincia) params.append('provincia', filtros.provincia);
            if (filtros.especialidad) params.append('especialidad', filtros.especialidad);

            const url = `/talleres/disponibles?${params.toString()}`;
            console.log('🔍 Buscando talleres:', url);

            const response = await apiFetch(url);
            const data = await response.json();

            if (data.exito) {
                this.talleresCache = data.talleres;
                this.ultimaBusqueda = { ...filtros, timestamp: Date.now() };
                console.log(`✅ ${data.talleres.length} talleres encontrados`);
                return data.talleres;
            } else {
                console.warn('⚠️ No se encontraron talleres:', data.mensaje);
                return [];
            }
        } catch (error) {
            console.error('❌ Error al buscar talleres:', error);

            // Si hay datos en caché, devolver esos
            if (this.talleresCache) {
                console.log('📦 Devolviendo talleres en caché');
                return this.talleresCache;
            }
            return [];
        }
    }

    /**
     * Obtiene talleres cercanos (simulación por provincia)
     * @param {string} provincia - Provincia del cliente
     * @returns {Promise<Array>} Talleres en esa provincia
     */
    async obtenerTalleresCercanos(provincia) {
        return this.obtenerTalleresDisponibles({ provincia });
    }

    /**
     * Obtiene detalles completos de un taller específico
     * @param {string} tallerId - ID del taller
     * @returns {Promise<Object>} Datos completos del taller
     */
    async obtenerDetalleTaller(tallerId) {
        try {
            const response = await apiFetch(`/talleres/${tallerId}`);
            const data = await response.json();

            if (data.exito) {
                return data.taller;
            }
            throw new Error(data.mensaje || 'Taller no encontrado');
        } catch (error) {
            console.error('❌ Error al obtener detalle:', error);
            throw error;
        }
    }

    /**
     * Verifica disponibilidad de horario en un taller
     * @param {string} tallerId - ID del taller
     * @param {string} fecha - Fecha deseada (YYYY-MM-DD)
     * @param {string} hora - Hora deseada (HH:MM)
     * @returns {Promise<Object>} { disponible, bahiasLibres, horarios }
     */
    async verificarDisponibilidad(tallerId, fecha, hora) {
        try {
            const params = new URLSearchParams({ fecha, hora });
            const response = await apiFetch(
                `/talleres/${tallerId}/disponibilidad?${params.toString()}`
            );
            const data = await response.json();

            return {
                disponible: data.disponible || false,
                bahiasLibres: data.bahiasLibres || 0,
                horariosDisponibles: data.horarios || [],
                mensaje: data.mensaje || ''
            };
        } catch (error) {
            console.error('❌ Error al verificar disponibilidad:', error);
            return {
                disponible: false,
                bahiasLibres: 0,
                horariosDisponibles: [],
                mensaje: 'Error al verificar disponibilidad'
            };
        }
    }

    /**
     * Obtiene los horarios disponibles para un taller en una fecha
     * @param {string} tallerId - ID del taller
     * @param {string} fecha - Fecha (YYYY-MM-DD)
     * @returns {Promise<Array>} Lista de horarios disponibles
     */
    async obtenerHorariosDisponibles(tallerId, fecha) {
        try {
            const response = await apiFetch(
                `/talleres/${tallerId}/horarios?fecha=${fecha}`
            );
            const data = await response.json();
            return data.horarios || [];
        } catch (error) {
            console.error('❌ Error al obtener horarios:', error);
            return [];
        }
    }

    /**
     * Envía una cita al taller seleccionado
     * @param {Object} datosCita - Datos completos de la cita
     * @returns {Promise<Object>} Resultado de la operación
     */
    /**
  * Envía una cita al taller seleccionado
  */
    async enviarCitaATaller(datosCita) {
        try {
            // Asegurar que vehiculo sea objeto
            let v = datosCita.vehiculo;
            if (typeof v === 'string') {
                try { v = JSON.parse(v); } catch (e) { }
            }

            const body = {
                tallerId: datosCita.tallerId,
                clienteId: datosCita.clienteId || window.user?._id,
                vehiculo: {
                    marca: v?.marca || 'Genérico',
                    modelo: v?.modelo || 'Modelo',
                    placa: v?.placa || 'S/P',
                    color: v?.color || ''
                },
                servicio: {
                    nombre: datosCita.servicio?.nombre || 'Lavado',
                    precio: datosCita.servicio?.precio || 0
                },
                fecha: datosCita.fecha,
                hora: datosCita.hora,
                metodoPago: datosCita.metodoPago || 'SALDO',
                montoPagado: datosCita.montoPagado || 0,
                notas: datosCita.notas || ''
            };

            console.log('📤 Enviando al taller:', JSON.stringify(body, null, 2));

            const response = await apiFetch(`/talleres/citas/agendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.exito) {
                return { exito: true, cita: data.cita };
            }
            throw new Error(data.mensaje || 'Error');
        } catch (error) {
            return { exito: false, mensaje: error.message };
        }
    }
    /**
     * Cancela una cita en un taller
     * @param {string} citaId - ID de la cita
     * @param {string} motivo - Motivo de cancelación
     * @returns {Promise<Object>} Resultado
     */
    async cancelarCitaEnTaller(citaId, motivo = 'Cancelado por el cliente') {
        try {
            const response = await apiFetch(`/talleres/citas/${citaId}/cancelar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    motivo,
                    canceladoPor: 'CLIENTE'
                })
            });

            const data = await response.json();

            if (data.exito) {
                console.log('✅ Cita cancelada en el taller');
            }

            return data;
        } catch (error) {
            console.error('❌ Error al cancelar cita:', error);
            return { exito: false, mensaje: error.message };
        }
    }
    /**
     * Obtiene las fotos de Antes/Después de una cita
     */
    async obtenerFotosCita(citaId) {
        try {
            const response = await apiFetch(`/talleres/citas/${citaId}/fotos`);
            const data = await response.json();

            if (data.exito) {
                return {
                    exito: true,
                    vehiculo: data.vehiculo,
                    fotos: data.fotos
                };
            }
            return { exito: false };
        } catch (error) {
            console.error('❌ Error al obtener fotos:', error);
            return { exito: false };
        }
    }
    /**
     * Obtiene el historial de citas del cliente en talleres
     * @param {string} clienteId - ID del cliente
     * @returns {Promise<Array>} Historial de citas
     */
    async obtenerMisCitasEnTalleres(clienteId) {
        try {
            const response = await apiFetch(
                `/talleres/citas/cliente/${clienteId}`
            );
            const data = await response.json();
            return data.citas || [];
        } catch (error) {
            console.error('❌ Error al obtener citas:', error);
            return [];
        }
    }

    /**
     * Califica un servicio recibido en un taller
     * @param {string} citaId - ID de la cita
     * @param {number} puntuacion - 1 a 5 estrellas
     * @param {string} comentario - Comentario opcional
     */
    async calificarServicio(citaId, puntuacion, comentario = '') {
        try {
            const response = await apiFetch(`/talleres/citas/${citaId}/calificar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntuacion, comentario })
            });

            const data = await response.json();

            if (data.exito) {
                console.log('⭐ Calificación enviada:', puntuacion, 'estrellas');
            }

            return data;
        } catch (error) {
            console.error('❌ Error al calificar:', error);
            return { exito: false, mensaje: error.message };
        }
    }

    /**
     * Busca talleres por nombre o especialidad
     * @param {string} busqueda - Texto de búsqueda
     */
    async buscarTalleres(busqueda) {
        const todos = await this.obtenerTalleresDisponibles();
        const termino = busqueda.toLowerCase().trim();

        return todos.filter(taller =>
            taller.nombre.toLowerCase().includes(termino) ||
            taller.especialidad?.toLowerCase().includes(termino) ||
            taller.direccion?.ciudad?.toLowerCase().includes(termino)
        );
    }

    /**
     * Obtiene estadísticas de un taller (para que el cliente decida)
     * @param {string} tallerId 
     */
    async obtenerEstadisticasTaller(tallerId) {
        try {
            const response = await apiFetch(`/talleres/${tallerId}/estadisticas`);
            const data = await response.json();

            return {
                calificacion: data.calificacion || 0,
                totalReseñas: data.totalReseñas || 0,
                trabajosCompletados: data.trabajosCompletados || 0,
                tiempoPromedio: data.tiempoPromedio || 'N/A',
                bahiasLibres: data.bahiasLibres || 0
            };
        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            return null;
        }
    }

    // ==================== MÉTODOS PRIVADOS ====================

    /**
     * Valida que los datos de la cita sean correctos
     */
    _validarDatosCita(datos) {
        if (!datos.tallerId) throw new Error('Debe seleccionar un taller');
        if (!datos.fecha) throw new Error('La fecha es requerida');
        if (!datos.hora) throw new Error('La hora es requerida');
        if (!datos.vehiculo?.placa) throw new Error('Debe seleccionar un vehículo');

        // Validar que la fecha no sea pasada
        const fechaCita = new Date(`${datos.fecha}T${datos.hora}`);
        if (fechaCita < new Date()) {
            throw new Error('No puede agendar citas en fechas pasadas');
        }
    }
}

// Exportar para uso global
window.ClienteTallerService = ClienteTallerService;