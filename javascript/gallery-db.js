/**
 * MÓDULO DE GALERÍA DE TRABAJOS - AutoBrillo D. (Versión 2026)
 * Maneja: almacenamiento local de trabajos completados con fotos.
 * NOTA: En producción, estos datos deben estar en el servidor (MongoDB).
 */

import { API_URL } from './config.js';
import { apiFetch } from './api-client.js';
const CONFIG = {
    STORAGE_KEY: 'galeria_trabajos',
    MAX_TRABAJOS_LOCALES: 20,  // Máximo de trabajos guardados localmente
    MAX_FOTO_SIZE_MB: 2        // Tamaño máximo de foto para guardar localmente
};

const GalleryDB = {
    // ================================================================
    // 🔹 GUARDAR TRABAJO
    // ================================================================

    /**
     * Guarda un trabajo completado en la galería local.
     * @param {string} idCita - ID de la cita completada
     * @param {Object} datosVehiculo - Información del vehículo {marca, modelo, placa, color}
     * @param {string} fotoFinal - URL de la foto final (NO base64)
     * @returns {Object} El trabajo guardado
     */
    guardarTrabajo(idCita, datosVehiculo, fotoFinal) {
        // Validar datos mínimos
        if (!idCita) {
            console.error("❌ Se requiere ID de cita para guardar en galería");
            return null;
        }

        if (!fotoFinal) {
            console.warn("⚠️ Sin foto final, no se guardará en galería");
            return null;
        }

        // No guardar base64 en localStorage
        if (fotoFinal.startsWith('data:')) {
            console.warn("⚠️ Fotos en base64 no se guardan localmente. Usa URLs del servidor.");
            // Solo guardar referencia, no la imagen completa
            fotoFinal = null;
        }

        try {
            let galeria = this.obtenerTodos();

            // Extraer datos del vehículo de forma segura
            const vehiculoInfo = this._normalizarDatosVehiculo(datosVehiculo);

            // Verificar si ya existe un trabajo para esta cita
            const existente = galeria.find(t => t.idCita === idCita);
            if (existente) {
                console.log("🔄 Actualizando trabajo existente en galería");
                Object.assign(existente, {
                    vehiculo: vehiculoInfo.modeloCompleto,
                    placa: vehiculoInfo.placa,
                    foto: fotoFinal || existente.foto,
                    fechaActualizacion: new Date().toISOString()
                });
                this._guardar(galeria);
                return existente;
            }

            // Crear nuevo trabajo
            const nuevoTrabajo = {
                id: this._generarId(),
                idCita,
                vehiculo: vehiculoInfo.modeloCompleto,
                placa: vehiculoInfo.placa,
                marca: vehiculoInfo.marca,
                modelo: vehiculoInfo.modelo,
                color: vehiculoInfo.color,
                foto: fotoFinal,
                fecha: new Date().toISOString(),
                fechaFormateada: new Date().toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };

            // Agregar al inicio (más reciente primero)
            galeria.unshift(nuevoTrabajo);

            // Limitar cantidad de trabajos guardados
            if (galeria.length > CONFIG.MAX_TRABAJOS_LOCALES) {
                const eliminados = galeria.splice(CONFIG.MAX_TRABAJOS_LOCALES);
                console.log(`🧹 Eliminados ${eliminados.length} trabajos antiguos de galería`);
            }

            this._guardar(galeria);
            console.log(`📸 Trabajo guardado en galería: ${vehiculoInfo.placa}`);

            return nuevoTrabajo;
        } catch (error) {
            console.error("❌ Error al guardar en galería:", error.message);
            return null;
        }
    },

    // ================================================================
    // 🔹 OBTENER TRABAJOS
    // ================================================================

    /**
     * Obtiene todos los trabajos de la galería.
     * @returns {Array} Lista de trabajos
     */
    obtenerTodos() {
        try {
            const datos = localStorage.getItem(CONFIG.STORAGE_KEY);
            return datos ? JSON.parse(datos) : [];
        } catch (error) {
            console.error("❌ Error al leer galería:", error);
            return [];
        }
    },

    /**
     * Obtiene los trabajos más recientes.
     * @param {number} limite - Cantidad máxima a retornar
     * @returns {Array}
     */
    obtenerRecientes(limite = 6) {
        return this.obtenerTodos().slice(0, limite);
    },

    /**
     * Busca trabajos por placa.
     * @param {string} placa - Placa a buscar
     * @returns {Array}
     */
    buscarPorPlaca(placa) {
        if (!placa) return [];
        const placaLimpia = placa.toUpperCase().trim();
        return this.obtenerTodos().filter(t =>
            t.placa?.toUpperCase().includes(placaLimpia)
        );
    },

    /**
     * Busca trabajos por modelo de vehículo.
     * @param {string} modelo - Modelo a buscar
     * @returns {Array}
     */
    buscarPorModelo(modelo) {
        if (!modelo) return [];
        const modeloLimpio = modelo.toLowerCase().trim();
        return this.obtenerTodos().filter(t =>
            t.vehiculo?.toLowerCase().includes(modeloLimpio) ||
            t.modelo?.toLowerCase().includes(modeloLimpio)
        );
    },

    /**
     * Obtiene un trabajo específico por ID de cita.
     * @param {string} idCita - ID de la cita
     * @returns {Object|null}
     */
    obtenerPorCita(idCita) {
        if (!idCita) return null;
        return this.obtenerTodos().find(t => t.idCita === idCita) || null;
    },

    // ================================================================
    // 🔹 ELIMINAR TRABAJO
    // ================================================================

    /**
     * Elimina un trabajo de la galería.
     * @param {string} id - ID del trabajo a eliminar
     * @returns {boolean}
     */
    eliminarTrabajo(id) {
        if (!id) return false;

        try {
            let galeria = this.obtenerTodos();
            const index = galeria.findIndex(t => t.id === id || t.idCita === id);

            if (index === -1) return false;

            galeria.splice(index, 1);
            this._guardar(galeria);
            console.log(`🗑️ Trabajo eliminado de galería: ${id}`);
            return true;
        } catch (error) {
            console.error("❌ Error al eliminar de galería:", error);
            return false;
        }
    },

    /**
     * Limpia toda la galería.
     * @returns {boolean}
     */
    limpiarTodo() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            console.log("🧹 Galería limpiada completamente");
            return true;
        } catch (error) {
            console.error("❌ Error al limpiar galería:", error);
            return false;
        }
    },

    // ================================================================
    // 🔹 ESTADÍSTICAS
    // ================================================================

    /**
     * Obtiene estadísticas de la galería.
     * @returns {Object}
     */
    obtenerEstadisticas() {
        const trabajos = this.obtenerTodos();

        return {
            total: trabajos.length,
            conFoto: trabajos.filter(t => t.foto).length,
            sinFoto: trabajos.filter(t => !t.foto).length,
            marcasUnicas: [...new Set(trabajos.map(t => t.marca).filter(Boolean))],
            placasUnicas: [...new Set(trabajos.map(t => t.placa).filter(Boolean))]
        };
    },

    // ================================================================
    // 🔹 SINCRONIZACIÓN CON SERVIDOR
    // ================================================================

    /**
     * Sube los trabajos locales al servidor.
     * @returns {Promise<boolean>}
     */
    async sincronizarConServidor() {
        const trabajos = this.obtenerTodos();
        const sinSincronizar = trabajos.filter(t => !t.sincronizado);

        if (sinSincronizar.length === 0) return true;

        try {
            const response = await apiFetch(`/galeria/sincronizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trabajos: sinSincronizar })
            });

            if (response.ok) {
                // Marcar como sincronizados
                trabajos.forEach(t => {
                    if (!t.sincronizado) t.sincronizado = true;
                });
                this._guardar(trabajos);
                console.log(`☁️ ${sinSincronizar.length} trabajos sincronizados`);
                return true;
            }
            return false;
        } catch (error) {
            console.warn("🌐 No se pudo sincronizar galería:", error.message);
            return false;
        }
    },

    // ================================================================
    // 🔹 MÉTODOS PRIVADOS
    // ================================================================

    /**
     * Normaliza los datos del vehículo de múltiples formatos posibles.
     */
    _normalizarDatosVehiculo(datos) {
        // Si datos es un string, intentar parsearlo
        if (typeof datos === 'string') {
            try {
                datos = JSON.parse(datos);
            } catch (e) {
                return {
                    marca: '',
                    modelo: datos,
                    placa: 'S/P',
                    color: '',
                    modeloCompleto: datos
                };
            }
        }

        // Si no es objeto, devolver valores por defecto
        if (!datos || typeof datos !== 'object') {
            return {
                marca: '',
                modelo: 'Vehículo',
                placa: 'S/P',
                color: '',
                modeloCompleto: 'Vehículo'
            };
        }

        const marca = datos.marca || '';
        const modelo = datos.modelo || '';
        const modeloCompleto = [marca, modelo].filter(Boolean).join(' ') || 'Vehículo';

        return {
            marca,
            modelo,
            placa: datos.placa || 'S/P',
            color: datos.color || '',
            modeloCompleto
        };
    },

    /**
     * Genera un ID único para el trabajo.
     */
    _generarId() {
        return `gal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Guarda en localStorage con manejo de errores.
     */
    _guardar(datos) {
        try {
            const jsonStr = JSON.stringify(datos);
            const sizeKB = (jsonStr.length * 2) / 1024;

            if (sizeKB > 4000) {
                console.warn(`⚠️ Galería pesada (${sizeKB.toFixed(0)}KB). Limpiando trabajos antiguos...`);
                // Eliminar trabajos sin foto primero
                datos = datos.filter(t => t.foto);
                // Si sigue siendo grande, mantener solo los más recientes
                if (datos.length > 10) {
                    datos = datos.slice(0, 10);
                }
            }

            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(datos));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn("⚠️ Cuota excedida, guardando versión mínima...");
                try {
                    const minimo = datos.slice(0, 5).map(t => ({
                        id: t.id,
                        idCita: t.idCita,
                        vehiculo: t.vehiculo,
                        placa: t.placa,
                        fecha: t.fecha,
                        foto: null // Sin fotos para ahorrar espacio
                    }));
                    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(minimo));
                    return true;
                } catch (e) {
                    console.error("❌ Error crítico:", e.message);
                    return false;
                }
            }
            console.error("❌ Error al guardar:", error.message);
            return false;
        }
    }
};

// Exportar para uso en otros módulos
window.GalleryDB = GalleryDB;