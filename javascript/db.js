import { API_URL } from './config.js';
import { apiFetch } from './api-client.js';
const DB_KEY = 'sesion_activa';


export const db = {
    obtenerSesion: () => {
        try {
            const data = localStorage.getItem(DB_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error("❌ Error al leer LocalStorage:", error);
            return null;
        }
    },

    /**
     * Sincroniza los datos locales con el servidor.
     * ✅ Usa la ruta CORRECTA: PUT /api/usuarios/sincronizar/:email
     */
    sincronizarConServidor: async () => {
        if (!window.user || !window.user.email) {
            console.warn("⚠️ No hay usuario activo para sincronizar.");
            return false;
        }

        try {
            const datosParaEnviar = window.user.toJSON ? window.user.toJSON() : window.user;

            // Eliminar campos que no deben enviarse
            delete datosParaEnviar._id;
            delete datosParaEnviar.password;
            delete datosParaEnviar.email;

            console.log("☁️ Sincronizando con servidor...");

            // ✅ RUTA CORRECTA (NO /api/auth/login)
            const respuesta = await apiFetch(`/usuarios/sincronizar/${encodeURIComponent(window.user.email)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (!respuesta.ok) {
                const errorData = await respuesta.json().catch(() => ({}));
                console.warn("⚠️ Servidor rechazó:", errorData.mensaje || respuesta.statusText);
                return false;
            }

            const resultado = await respuesta.json();

            if (resultado.exito) {
                console.log("✅ Sincronización exitosa.");

                // Actualizar datos locales con lo que devuelve el servidor
                if (resultado.usuario) {
                    if (window.user && typeof window.user.actualizarDesdeServidor === 'function') {
                        window.user.actualizarDesdeServidor(resultado.usuario);
                    } else {
                        Object.assign(window.user, resultado.usuario);
                    }
                }

                // Guardar en localStorage
                localStorage.setItem(DB_KEY, JSON.stringify(window.user));

                // Actualizar UI
                if (typeof window.actualizarInterfaz === 'function') {
                    window.actualizarInterfaz(window.user);
                }
                if (typeof window.renderizarCitas === 'function') {
                    window.renderizarCitas();
                }

                return true;
            } else {
                console.warn("⚠️ Servidor respondió sin éxito:", resultado.mensaje);
                return false;
            }
        } catch (error) {
            console.warn("🌐 Modo Offline - Datos guardados localmente:", error.message);

            // Guardar localmente aunque falle el servidor
            try {
                localStorage.setItem(DB_KEY, JSON.stringify(window.user));
            } catch (e) {
                console.error("❌ Error al guardar localmente:", e);
            }

            return false;
        }
    },

    /**
     * Guarda la sesión en localStorage (sin intentar sincronizar).
     */
    guardarSesion: (datos) => {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(datos));
            return true;
        } catch (error) {
            console.error("❌ Error al guardar sesión:", error);
            return false;
        }
    },

    cerrarSesion: () => {
        localStorage.removeItem(DB_KEY);
        localStorage.removeItem('notificaciones_clientes');
        window.user = null;
        window.location.href = '../index.html';
    }
};

window.db = db;