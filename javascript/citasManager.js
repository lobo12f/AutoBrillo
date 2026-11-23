/**
 * MANEJADOR DE CITAS - AutoBrillo D. (Versión 2026)
 * 
 * Se encarga de TODO el ciclo de vida de una cita:
 * - Agendar nueva cita
 * - Escuchar cambios de estado desde el taller
 * - Cancelar cita
 * - Entregar vehículo y calificar
 * - Crear notificaciones
 * - Escuchar WebSockets en tiempo real
 */
import { API_URL as CONFIG_API_URL, WS_URL } from './config.js';
import { apiFetch } from './api-client.js';
const API_URL = CONFIG_API_URL;

// Estados válidos de una cita
const ESTADOS_CITA = {
    PENDIENTE: 'PENDIENTE',
    CONFIRMADA: 'CONFIRMADA',
    EN_RECEPCION: 'EN_RECEPCION',
    EN_PROCESO: 'EN_PROCESO',
    LISTO: 'LISTO',
    ENTREGADO: 'ENTREGADO',
    CANCELADA: 'CANCELADA'
};

// Estados que se muestran como "pendientes"
const ESTADOS_ACTIVOS = [
    ESTADOS_CITA.PENDIENTE,
    ESTADOS_CITA.CONFIRMADA,
    ESTADOS_CITA.EN_RECEPCION,
    ESTADOS_CITA.EN_PROCESO,
    ESTADOS_CITA.LISTO
];

// Estados que van al historial
const ESTADOS_HISTORIAL = [
    ESTADOS_CITA.ENTREGADO,
    ESTADOS_CITA.CANCELADA
];

// Configuración de UI por estado
const CONFIG_ESTADO = {
    [ESTADOS_CITA.PENDIENTE]: { color: '#ff8800', icono: '⏳', mensaje: 'Esperando confirmación', progreso: 10 },
    [ESTADOS_CITA.CONFIRMADA]: { color: '#00ff88', icono: '✅', mensaje: 'Taller confirmó', progreso: 25 },
    [ESTADOS_CITA.EN_RECEPCION]: { color: '#00d4ff', icono: '📥', mensaje: 'Vehículo recibido', progreso: 40 },
    [ESTADOS_CITA.EN_PROCESO]: { color: '#ffcc00', icono: '🔧', mensaje: 'Trabajando en tu vehículo', progreso: 65 },
    [ESTADOS_CITA.LISTO]: { color: '#ff44ff', icono: '🎉', mensaje: '¡Listo para recoger!', progreso: 90 },
    [ESTADOS_CITA.ENTREGADO]: { color: '#888888', icono: '🏁', mensaje: 'Servicio completado', progreso: 100 },
    [ESTADOS_CITA.CANCELADA]: { color: '#ff4444', icono: '❌', mensaje: 'Cita cancelada', progreso: 0 }
};

class CitasManager {
    constructor() {
        this.citas = [];
        this.talleresDisponibles = [];
        this.tallerSeleccionado = null;
        this.intervaloSincronizacion = null;
        this.agendando = false;
        this.cancelando = false;
        this.confirmandoEntrega = false;
        this.socket = null; // ✅ Socket para WebSockets
    }

    // ================================================================
    // 🔹 INICIALIZACIÓN
    // ================================================================

    iniciar(usuario) {
        if (!usuario) {
            console.error('❌ Se requiere un usuario para iniciar CitasManager');
            return;
        }

        this.usuario = usuario;
        this.citas = usuario.misCitas || [];

        console.log(`📅 CitasManager iniciado. ${this.citas.length} citas cargadas.`);

        this.iniciarSincronizacion();
        this.sincronizarConTaller();
        this.conectarWebSocketCliente(); // ✅ Conectar WebSocket
    }

    iniciarSincronizacion(intervalo = 30000) {
        this.detenerSincronizacion();

        this.intervaloSincronizacion = setInterval(() => {
            this.sincronizarConTaller();
        }, intervalo);

        console.log(`🔄 Sincronización de citas: cada ${intervalo / 1000}s`);
    }

    detenerSincronizacion() {
        if (this.intervaloSincronizacion) {
            clearInterval(this.intervaloSincronizacion);
            this.intervaloSincronizacion = null;
        }
    }

    // ================================================================
    // 🔌 WEBSOCKET - Escuchar cambios de estado en tiempo real
    // ================================================================

    conectarWebSocketCliente() {
        if (!this.usuario?._id) {
            console.warn('⚠️ No hay usuario para conectar WebSocket');
            return;
        }

        try {
            this.socket = io(WS_URL);

            this.socket.on('connect', () => {
                console.log('🔌 WebSocket cliente conectado');
                this.socket.emit('unirse-cliente', this.usuario._id);
            });

            this.socket.on('cambio-estado-cita', (data) => {
                console.log('📡 Cambio de estado recibido en tiempo real:', data);

                const cita = this.citas.find(c => String(c._id) === String(data.citaId));
                if (cita) {
                    cita.estado = data.estado;
                    this.guardarCitas();
                    this.crearNotificacionCambioEstado({ ...cita, estado: data.estado });
                    this.notificarUI('citasActualizadas');

                    // Mostrar toast
                    window.mostrarToast?.(data.mensaje || `Estado: ${data.estado}`, 'info');
                } else {
                    console.log('📡 Cita no encontrada localmente, sincronizando...');
                    this.sincronizarConTaller();
                }
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 WebSocket cliente desconectado');
            });
        } catch (error) {
            console.warn('⚠️ No se pudo conectar WebSocket:', error.message);
        }
    }

    // ================================================================
    // 🔹 SINCRONIZACIÓN CON EL TALLER
    // ================================================================

    async sincronizarConTaller() {
        if (!this.usuario || !this.usuario._id) {
            console.warn('⚠️ No hay usuario para sincronizar citas');
            return;
        }

        try {
            const response = await apiFetch(`/talleres/citas/cliente/${this.usuario._id}`);

            if (!response.ok) return;

            const data = await response.json();
            if (!data.exito || !data.citas) return;

            let cambios = 0;

            data.citas.forEach(citaServidor => {
                const citaLocal = this.buscarCita(citaServidor);

                if (citaLocal) {
                    if (citaLocal.estado !== citaServidor.estado) {
                        console.log(`🔄 Cita actualizada: ${citaLocal.estado} → ${citaServidor.estado}`);

                        citaLocal.estado = citaServidor.estado;
                        citaLocal.bahiaAsignada = citaServidor.bahiaAsignada;
                        citaLocal.empleadoAsignado = citaServidor.empleadoAsignado;
                        citaLocal.tallerId = citaServidor.tallerId;

                        this.crearNotificacionCambioEstado(citaServidor);
                        cambios++;
                    }
                } else {
                    console.log('📅 Nueva cita encontrada:', citaServidor.vehiculo?.placa);
                    this.citas.push({
                        ...citaServidor,
                        sucursal: citaServidor.tallerId?.nombre || 'Taller'
                    });
                    cambios++;
                }
            });

            if (cambios > 0) {
                this.guardarCitas();
                this.notificarUI('citasActualizadas');
                console.log(`✅ ${cambios} cambio(s) sincronizado(s)`);
            }
        } catch (error) {
            console.warn('🌐 Sin conexión con el taller:', error.message);
        }
    }

    buscarCita(citaBuscar) {
        return this.citas.find(c => {
            if (c._id && citaBuscar._id && String(c._id) === String(citaBuscar._id)) {
                return true;
            }
            const mismaFecha = c.fecha === citaBuscar.fecha;
            const mismaHora = c.hora === citaBuscar.hora;
            const mismaPlaca = c.vehiculo?.placa === citaBuscar.vehiculo?.placa;
            return mismaFecha && mismaHora && mismaPlaca;
        });
    }

    // ================================================================
    // 🔹 AGENDAR NUEVA CITA
    // ================================================================

    async agendarCita(datos) {
        if (this.agendando) {
            console.warn('⚠️ Ya hay una solicitud de agendamiento en curso');
            return { exito: false, mensaje: 'Procesando...' };
        }

        this.agendando = true;

        try {
            const {
                tallerId,
                vehiculo,
                servicio,
                fecha,
                hora,
                metodoPago = 'SALDO',
                montoPagado = 0,
                notas = ''
            } = datos;

            if (!tallerId || !vehiculo || !servicio || !fecha || !hora) {
                return { exito: false, mensaje: 'Faltan datos requeridos: tallerId, vehiculo, servicio, fecha, hora' };
            }

            const response = await apiFetch(`/citas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioId: this.usuario._id,
                    datosCita: {
                        vehiculo: {
                            marca: vehiculo.marca || 'Genérico',
                            modelo: vehiculo.modelo || 'Modelo',
                            placa: vehiculo.placa || 'S/P',
                            color: vehiculo.color || ''
                        },
                        fecha,
                        hora,
                        sucursal: datos.sucursal || 'Principal',
                        estado: ESTADOS_CITA.PENDIENTE,
                        servicio: servicio.nombre || servicio,
                        metodoPago,
                        montoPagado,
                        tallerId: tallerId,
                        notas: notas || `Agendado por ${this.usuario.nombre}`
                    }
                })
            });

            const data = await response.json();

            if (data.exito) {
                if (data.usuario) {
                    this.usuario = data.usuario;
                    this.citas = this.usuario.misCitas || [];
                }

                this.guardarCitas();
                this.notificarUI('citaAgendada');

                return {
                    exito: true,
                    mensaje: data.mensaje || 'Cita agendada exitosamente',
                    cita: data.cita || null
                };
            }

            return { exito: false, mensaje: data.mensaje || 'Error al agendar cita' };

        } catch (error) {
            console.error('❌ Error al agendar cita:', error);
            return { exito: false, mensaje: 'Error de conexión con el servidor' };
        } finally {
            this.agendando = false;
        }
    }

    // ================================================================
    // 🔹 CANCELAR CITA
    // ================================================================

    async cancelarCita(idCita, motivo = 'Cancelada por el cliente') {
        if (this.cancelando) {
            console.warn('⚠️ Ya hay una cancelación en curso');
            return { exito: false, mensaje: 'Procesando...' };
        }

        this.cancelando = true;

        try {
            const cita = this.citas.find(c => String(c._id || c.id) === String(idCita));

            if (!cita) {
                return { exito: false, mensaje: 'Cita no encontrada' };
            }

            if ([ESTADOS_CITA.ENTREGADO, ESTADOS_CITA.CANCELADA].includes(cita.estado)) {
                return { exito: false, mensaje: 'No se puede cancelar una cita en este estado' };
            }

            const response = await apiFetch(`/citas/${cita._id || idCita}/cancelar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioId: this.usuario._id,
                    motivo
                })
            });

            const data = await response.json();

            this.citas = this.citas.filter(c => String(c._id || c.id) !== String(idCita));
            this.guardarCitas();
            this.notificarUI('citaCancelada');

            return { exito: true, mensaje: data.mensaje || 'Cita cancelada exitosamente' };

        } catch (error) {
            console.error('❌ Error al cancelar:', error);

            this.citas = this.citas.filter(c => String(c._id || c.id) !== String(idCita));
            this.guardarCitas();

            return { exito: true, mensaje: 'Cita cancelada (modo offline)' };
        } finally {
            this.cancelando = false;
        }
    }

    // ================================================================
    // 🔹 ENTREGAR Y CALIFICAR
    // ================================================================

    async entregarYCalificar(idCita, puntuacion, comentario = '') {
        if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
            return { exito: false, mensaje: 'La puntuación debe ser entre 1 y 5' };
        }

        if (this.confirmandoEntrega) {
            console.warn('⚠️ Ya hay una confirmación en curso');
            return { exito: false, mensaje: 'Procesando...' };
        }

        this.confirmandoEntrega = true;

        try {
            const cita = this.citas.find(c => String(c._id || c.id) === String(idCita));

            if (!cita) {
                return { exito: false, mensaje: 'Cita no encontrada' };
            }

            if (cita.estado !== ESTADOS_CITA.LISTO) {
                return { exito: false, mensaje: 'La cita debe estar en estado LISTO para entregar' };
            }

            const response = await apiFetch(`/citas/${idCita}/confirmar-entrega`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioId: this.usuario._id,
                    calificacion: {
                        puntuacion: parseInt(puntuacion),
                        comentario
                    }
                })
            });

            const data = await response.json();

            if (data.exito) {
                cita.estado = ESTADOS_CITA.ENTREGADO;
                cita.calificacion = { puntuacion: parseInt(puntuacion), comentario };

                this.guardarCitas();
                this.notificarUI('citaEntregada');

                return { exito: true, mensaje: '¡Gracias por calificar!' };
            }

            return { exito: false, mensaje: data.mensaje || 'Error al entregar' };

        } catch (error) {
            console.error('❌ Error al entregar:', error);

            cita.estado = ESTADOS_CITA.ENTREGADO;
            cita.calificacion = { puntuacion: parseInt(puntuacion), comentario };
            this.guardarCitas();

            return { exito: true, mensaje: 'Calificación guardada (modo offline)' };
        } finally {
            this.confirmandoEntrega = false;
        }
    }

    // ================================================================
    // 🔹 NOTIFICACIONES
    // ================================================================

    crearNotificacionCambioEstado(cita) {
        const vehiculoNombre = `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim();

        let tipo = 'ESTADO_ACTUALIZADO';
        let mensaje = `📌 Tu cita cambió a: ${cita.estado}`;

        switch (cita.estado) {
            case ESTADOS_CITA.CONFIRMADA:
                tipo = 'CITA_CONFIRMADA';
                mensaje = `✅ ¡Tu cita para ${vehiculoNombre} ha sido CONFIRMADA!`;
                break;
            case ESTADOS_CITA.EN_RECEPCION:
                tipo = 'VEHICULO_RECIBIDO';
                mensaje = `📥 Tu ${vehiculoNombre} fue recibido en el taller`;
                break;
            case ESTADOS_CITA.EN_PROCESO:
                tipo = 'TRABAJO_INICIADO';
                mensaje = `🔧 Están trabajando en tu ${vehiculoNombre}`;
                break;
            case ESTADOS_CITA.LISTO:
                tipo = 'VEHICULO_LISTO';
                mensaje = `🎉 ¡Tu ${vehiculoNombre} está LISTO para recoger!`;
                break;
            case ESTADOS_CITA.ENTREGADO:
                tipo = 'VEHICULO_ENTREGADO';
                mensaje = `🏁 Servicio completado para ${vehiculoNombre}`;
                break;
            case ESTADOS_CITA.CANCELADA:
                tipo = 'CITA_CANCELADA';
                mensaje = `❌ Cita de ${vehiculoNombre} fue cancelada`;
                break;
        }

        this.agregarNotificacion(tipo, cita._id, mensaje);
    }

    agregarNotificacion(tipo, citaId, mensaje) {
        const notificaciones = JSON.parse(localStorage.getItem('notificaciones_clientes') || '[]');

        const yaExiste = notificaciones.some(n => n.tipo === tipo && n.mensaje === mensaje);

        if (!yaExiste) {
            notificaciones.unshift({
                tipo,
                citaId,
                mensaje,
                fecha: new Date().toISOString(),
                leida: false
            });

            if (notificaciones.length > 50) {
                notificaciones.splice(50);
            }

            localStorage.setItem('notificaciones_clientes', JSON.stringify(notificaciones));
            this.notificarUI('notificacionNueva');
        }
    }

    // ================================================================
    // 🔹 OBTENER CITAS
    // ================================================================

    obtenerCitasPendientes() {
        return this.citas.filter(c => ESTADOS_ACTIVOS.includes(c.estado));
    }

    obtenerCitasHistorial() {
        return this.citas.filter(c => ESTADOS_HISTORIAL.includes(c.estado));
    }

    obtenerConfigEstado(estado) {
        return CONFIG_ESTADO[estado] || CONFIG_ESTADO[ESTADOS_CITA.PENDIENTE];
    }

    obtenerCitaPorId(id) {
        return this.citas.find(c => String(c._id || c.id) === String(id)) || null;
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    guardarCitas() {
        if (this.usuario) {
            this.usuario.misCitas = this.citas;
            localStorage.setItem('sesion_activa', JSON.stringify(this.usuario));
        }
    }

    notificarUI(evento) {
        window.dispatchEvent(new CustomEvent('citasManager:' + evento, {
            detail: { citas: this.citas, manager: this }
        }));
    }

    limpiarHistorialAntiguo(dias = 90) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - dias);

        const antes = this.citas.length;

        this.citas = this.citas.filter(c => {
            if (!ESTADOS_HISTORIAL.includes(c.estado)) return true;
            const fechaCita = new Date(c.fechaCompletado || c.fecha || Date.now());
            return fechaCita >= fechaLimite;
        });

        const eliminadas = antes - this.citas.length;

        if (eliminadas > 0) {
            this.guardarCitas();
            console.log(`🧹 ${eliminadas} citas antiguas eliminadas del historial`);
        }
    }
}

// ================================================================
// 🔹 EXPORTAR
// ================================================================

window.citasManager = new CitasManager();

export { CitasManager, ESTADOS_CITA, ESTADOS_ACTIVOS, ESTADOS_HISTORIAL, CONFIG_ESTADO };
export default window.citasManager;