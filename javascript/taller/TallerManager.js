/**
 * SISTEMA DE GESTIÓN MULTI-TALLER
 * Maneja múltiples talleres con sus propios propietarios, empleados y flujos de trabajo
 */
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export class TallerManager {
    #talleres = new Map();
    #propietarios = new Map();
    #colaTrabajos = [];
    #eventListeners = new Map();

    constructor() {
        this.API_URL = API_URL;
        this._inicializar();
    }

    async _inicializar() {
        console.log("🏢 Inicializando Sistema Multi-Taller...");
        await this._cargarTalleresActivos();
    }

    // ==================== GESTIÓN DE TALLERES ====================

    /**
     * Registra un nuevo taller en la plataforma
     */
    async registrarTaller(datosTaller, propietarioId) {
        try {
            const propietario = this.#propietarios.get(propietarioId);
            if (!propietario) throw new Error("Propietario no encontrado");

            if (propietario.talleres.length >= propietario.maxTalleres) {
                throw new Error(`Límite de talleres alcanzado (${propietario.maxTalleres})`);
            }

            const response = await apiFetch(`/talleres`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...datosTaller,
                    propietarioId
                })
            });

            const data = await response.json();
            if (data.exito) {
                this.#talleres.set(data.taller._id, data.taller);
                this._notificar('tallerRegistrado', data.taller);
                console.log(`✅ Taller "${data.taller.nombre}" registrado exitosamente`);
            }
            return data;
        } catch (error) {
            console.error("❌ Error al registrar taller:", error);
            throw error;
        }
    }

    /**
     * Obtiene un taller específico con todo su estado
     */
    async obtenerTaller(tallerId) {
        // Primero buscar en caché local
        if (this.#talleres.has(tallerId)) {
            return this.#talleres.get(tallerId);
        }

        // Si no está en caché, cargar del servidor
        try {
            const response = await apiFetch(`/talleres/${tallerId}`);
            const data = await response.json();
            if (data.exito) {
                this.#talleres.set(tallerId, data.taller);
                return data.taller;
            }
        } catch (error) {
            console.error("Error al cargar taller:", error);
        }
        return null;
    }

    /**
     * Obtiene todos los talleres disponibles para un cliente
     */
    async obtenerTalleresDisponibles(filtros = {}) {
        try {
            const params = new URLSearchParams(filtros).toString();
            const response = await apiFetch(`/talleres/disponibles?${params}`);
            const data = await response.json();
            return data.talleres || [];
        } catch (error) {
            console.error("Error al cargar talleres:", error);
            return [];
        }
    }

    // ==================== GESTIÓN DE PROPIETARIOS ====================

    /**
     * Registra un usuario como propietario de taller
     */
    async convertirEnPropietario(usuarioId, plan = 'BASICO') {
        try {
            const response = await apiFetch(`/propietarios/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioId, plan })
            });

            const data = await response.json();
            if (data.exito) {
                this.#propietarios.set(usuarioId, data.propietario);
                console.log(`👤 Propietario registrado con plan ${plan}`);
            }
            return data;
        } catch (error) {
            console.error("Error al registrar propietario:", error);
            throw error;
        }
    }

    /**
     * Obtiene el dashboard del propietario con estadísticas de todos sus talleres
     */
    async dashboardPropietario(propietarioId) {
        try {
            const response = await apiFetch(
                `/propietarios/${propietarioId}/dashboard`
            );
            return await response.json();
        } catch (error) {
            console.error("Error al cargar dashboard:", error);
            return null;
        }
    }

    // ==================== GESTIÓN DE EMPLEADOS ====================

    /**
     * Registra un nuevo empleado en un taller específico
     */
    async contratarEmpleado(tallerId, datosEmpleado) {
        try {
            const response = await apiFetch(`/empleados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...datosEmpleado,
                    tallerId
                })
            });
            return await response.json();
        } catch (error) {
            console.error("Error al contratar empleado:", error);
            throw error;
        }
    }

    /**
     * Asigna un empleado a una bahía específica
     */
    async asignarEmpleadoBahia(tallerId, empleadoId, bahiaNumero) {
        const taller = await this.obtenerTaller(tallerId);
        if (!taller) throw new Error("Taller no encontrado");

        const bahia = taller.bahias.find(b => b.numero === bahiaNumero);
        if (!bahia) throw new Error("Bahía no encontrada");

        bahia.empleadoAsignado = empleadoId;

        try {
            await apiFetch(`/talleres/${tallerId}/bahias/${bahiaNumero}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empleadoId })
            });
            console.log(`👨‍🔧 Empleado asignado a ${bahia.nombre}`);
        } catch (error) {
            console.error("Error al asignar empleado:", error);
        }
    }

    // ==================== FLUJO DE TRABAJO ====================

    /**
     * El cliente agenda una cita en un taller específico
     */
    async agendarCita(datosCita) {
        try {
            // Validar disponibilidad del taller
            const disponible = await this._verificarDisponibilidad(
                datosCita.tallerId,
                datosCita.fecha,
                datosCita.hora
            );

            if (!disponible) {
                throw new Error("Horario no disponible en este taller");
            }

            const response = await apiFetch(`/citas-taller`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosCita)
            });

            const data = await response.json();
            if (data.exito) {
                this.#colaTrabajos.push(data.cita);
                this._notificar('nuevaCita', data.cita);
                console.log(`📅 Cita agendada en taller ${datosCita.tallerId}`);
            }
            return data;
        } catch (error) {
            console.error("Error al agendar cita:", error);
            throw error;
        }
    }

    /**
     * El taller confirma la cita del cliente
     */
    async confirmarCita(citaId, datosConfirmacion) {
        try {
            const response = await apiFetch(`/citas-taller/${citaId}/confirmar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosConfirmacion)
            });

            const data = await response.json();
            if (data.exito) {
                this._notificar('citaConfirmada', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error al confirmar cita:", error);
            throw error;
        }
    }

    /**
     * Recibe el vehículo en el taller (Check-in)
     */
    async recibirVehiculo(citaId, fotosAntes = []) {
        try {
            const response = await apiFetch(`/talleres/citas/${citaId}/recepcion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'EN_RECEPCION',
                    fotosAntes,
                    fechaRecepcion: new Date()
                })
            });

            const data = await response.json();
            if (data.exito) {
                this._asignarBahiaAutomatica(data.cita);
                this._notificar('vehiculoRecibido', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error en recepción:", error);
            throw error;
        }
    }

    /**
     * Inicia el trabajo en el vehículo
     */
    async iniciarTrabajo(citaId, empleadoId) {
        try {
            const response = await apiFetch(`/citas-taller/${citaId}/iniciar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId,
                    fechaInicio: new Date()
                })
            });

            const data = await response.json();
            if (data.exito) {
                this._notificar('trabajoIniciado', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error al iniciar trabajo:", error);
            throw error;
        }
    }

    /**
     * Finaliza el trabajo y notifica al cliente
     */
    async finalizarTrabajo(citaId, fotosDespues = []) {
        try {
            const response = await apiFetch(`/citas-taller/${citaId}/finalizar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'LISTO',
                    fotosDespues,
                    fechaFinalizacion: new Date()
                })
            });

            const data = await response.json();
            if (data.exito) {
                this._notificarCliente(data.cita);
                this._notificar('trabajoFinalizado', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error al finalizar trabajo:", error);
            throw error;
        }
    }

    /**
     * Entrega el vehículo al cliente
     */
    async entregarVehiculo(citaId, calificacion = null) {
        try {
            const body = {
                estado: 'ENTREGADO',
                fechaEntrega: new Date()
            };

            if (calificacion) {
                body.calificacion = calificacion;
            }

            const response = await apiFetch(`/citas-taller/${citaId}/entregar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.exito) {
                this._liberarBahia(data.cita);
                this._notificar('vehiculoEntregado', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error en entrega:", error);
            throw error;
        }
    }

    /**
     * Cancelar una cita (por cliente o taller)
     */
    async cancelarCita(citaId, motivo, canceladoPor) {
        try {
            const response = await apiFetch(`/citas-taller/${citaId}/cancelar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    motivo,
                    canceladoPor, // 'CLIENTE' o 'TALLER'
                    fechaCancelacion: new Date()
                })
            });

            const data = await response.json();
            if (data.exito) {
                this._notificar('citaCancelada', data.cita);
            }
            return data;
        } catch (error) {
            console.error("Error al cancelar cita:", error);
            throw error;
        }
    }

    // ==================== ESTADÍSTICAS Y REPORTES ====================

    /**
     * Dashboard en tiempo real para el propietario
     */
    async obtenerDashboardPropietario(propietarioId) {
        return {
            talleres: await this._obtenerTalleresPropietario(propietarioId),
            ingresosHoy: await this._calcularIngresos(propietarioId, 'hoy'),
            ingresosMes: await this._calcularIngresos(propietarioId, 'mes'),
            clientesAtendidos: await this._contarClientes(propietarioId),
            calificacionPromedio: await this._obtenerCalificacion(propietarioId),
            empleadosActivos: await this._contarEmpleadosActivos(propietarioId)
        };
    }

    /**
     * Panel de control para el empleado
     */
    async obtenerPanelEmpleado(empleadoId) {
        try {
            const response = await apiFetch(`/empleados/${empleadoId}/panel`);
            return await response.json();
        } catch (error) {
            console.error("Error al cargar panel:", error);
            return null;
        }
    }

    // ==================== SISTEMA DE NOTIFICACIONES ====================

    /**
     * Suscribirse a eventos del sistema
     */
    on(evento, callback) {
        if (!this.#eventListeners.has(evento)) {
            this.#eventListeners.set(evento, []);
        }
        this.#eventListeners.get(evento).push(callback);
    }

    /**
     * Notificar a todos los suscriptores de un evento
     */
    _notificar(evento, datos) {
        const listeners = this.#eventListeners.get(evento) || [];
        listeners.forEach(callback => callback(datos));
    }

    /**
     * Notificar al cliente por WhatsApp/Email
     */
    async _notificarCliente(cita) {
        // Aquí integrarías Twilio, SendGrid, etc.
        console.log(`📱 Notificando al cliente: Su vehículo está listo`);

        // Si el cliente está en la plataforma, mostrar notificación
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion({
                titulo: "¡Vehículo Listo!",
                mensaje: `Tu ${cita.vehiculo.marca} ${cita.vehiculo.modelo} está listo para recoger`,
                tipo: "exito"
            });
        }
    }

    // ==================== MÉTODOS PRIVADOS ====================

    async _verificarDisponibilidad(tallerId, fecha, hora) {
        try {
            const response = await apiFetch(
                `/talleres/${tallerId}/disponibilidad?fecha=${fecha}&hora=${hora}`
            );
            const data = await response.json();
            return data.disponible;
        } catch (error) {
            return false;
        }
    }

    _asignarBahiaAutomatica(cita) {
        // Lógica para asignar la mejor bahía según tipo de servicio
        console.log(`🔧 Asignando bahía automática para cita ${cita._id}`);
    }

    _liberarBahia(cita) {
        if (cita.bahiaAsignada) {
            console.log(`🔓 Bahía ${cita.bahiaAsignada} liberada`);
        }
    }

    async _cargarTalleresActivos() {
        try {
            const response = await apiFetch(`/talleres/activos`);
            const data = await response.json();
            if (data.talleres) {
                data.talleres.forEach(taller => {
                    this.#talleres.set(taller._id, taller);
                });
            }
        } catch (error) {
            console.warn("⚠️ No se pudieron cargar talleres activos:", error.message);
        }
    }

    async _obtenerTalleresPropietario(propietarioId) {
        try {
            const response = await apiFetch(`/propietarios/${propietarioId}/talleres`);
            const data = await response.json();
            return data.talleres || [];
        } catch (error) {
            return [];
        }
    }

    async _calcularIngresos(propietarioId, periodo) {
        try {
            const response = await apiFetch(
                `/propietarios/${propietarioId}/ingresos?periodo=${periodo}`
            );
            const data = await response.json();
            return data.ingresos || 0;
        } catch (error) {
            return 0;
        }
    }

    async _contarClientes(propietarioId) {
        return 0; // Implementar con el backend
    }

    async _obtenerCalificacion(propietarioId) {
        return 0; // Implementar con el backend
    }

    async _contarEmpleadosActivos(propietarioId) {
        return 0; // Implementar con el backend
    }
}

// Exportar para uso global
window.TallerManager = TallerManager;