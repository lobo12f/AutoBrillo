/**
 * ====================================================================
 * 🔐 API CLIENT - AUTOBRILLO DETALLING
 * ====================================================================
 * Wrapper de fetch que:
 *   ✅ Añade el token JWT automáticamente (header Authorization)
 *   ✅ Redirige al login si el token expira (401/403)
 *   ✅ Detecta la sesión activa (taller, empleado o cliente)
 *   ✅ Soporta FormData (para subida de archivos)
 */

import { API_URL } from './config.js';

// ================================================================
// 🔍 DETECCIÓN DE SESIÓN Y TOKEN
// ================================================================

/**
 * Busca el token JWT en localStorage, probando todas las sesiones posibles.
 * @returns {string|null} El token o null si no hay sesión.
 */
export function obtenerToken() {
    // 1. Taller (propietario)
    const sesionTaller = localStorage.getItem('taller_sesion');
    if (sesionTaller) {
        try {
            const s = JSON.parse(sesionTaller);
            if (s?.token) return s.token;
        } catch (e) { /* ignorar */ }
    }

    // 2. Empleado
    const sesionEmpleado = localStorage.getItem('taller_empleado_sesion');
    if (sesionEmpleado) {
        try {
            const s = JSON.parse(sesionEmpleado);
            if (s?.token) return s.token;
            if (s?.empleado?.token) return s.empleado.token;
        } catch (e) { /* ignorar */ }
    }

    // 3. Cliente (sesion_activa) ← NUEVO
    const sesionClienteActiva = localStorage.getItem('sesion_activa');
    if (sesionClienteActiva) {
        try {
            const s = JSON.parse(sesionClienteActiva);
            if (s?.token) return s.token;
            if (s?.usuario?.token) return s.usuario.token;
        } catch (e) { /* ignorar */ }
    }

    // 4. Cliente (cliente_sesion) ← por compatibilidad
    const sesionCliente = localStorage.getItem('cliente_sesion');
    if (sesionCliente) {
        try {
            const s = JSON.parse(sesionCliente);
            if (s?.token) return s.token;
        } catch (e) { /* ignorar */ }
    }

    return null;
}

/**
 * Detecta a qué login redirigir según la ruta actual.
 */
function rutaDeLogin() {
    const ruta = window.location.pathname;

    if (ruta.includes('/empleado')) return '/html/taller/login.html';
    if (ruta.includes('/taller')) return '/html/taller/login.html';
    if (ruta.includes('/clientes') || ruta.includes('/cliente')) return '/html/cabesera/inicioDeSecion.html';   // ← CORREGIDO
    if (ruta.includes('/cabesera') || ruta.includes('/admin')) return '/html/cabesera/inicioDeSecion.html';

    return '/html/taller/login.html';
}

/**
 * Limpia todas las sesiones y redirige al login.
 */
function cerrarSesionYRedirigir() {
    localStorage.removeItem('taller_sesion');
    localStorage.removeItem('taller_empleado_sesion');
    localStorage.removeItem('cliente_sesion');
    localStorage.removeItem('sesion_activa');   // ← NUEVO
    window.location.href = rutaDeLogin();
}

// ================================================================
// 🚀 FETCH CON TOKEN
// ================================================================

/**
 * Wrapper de fetch que añade el token JWT automáticamente.
 *
 * @param {string} endpoint - Ej: '/talleres/123/citas' (sin API_URL) o URL completa
 * @param {Object} options - Opciones de fetch (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */


export async function apiFetch(endpoint, options = {}) {
    const token = obtenerToken();

    const headers = { ...(options.headers || {}) };

    // Solo añadir Content-Type si NO es FormData
    // (FormData lo define automáticamente con boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Construir URL completa si es relativa
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    // ⭐ NUEVO: verificar si se debe bloquear el redirect
    const noRedirigir = options.noRedirigir === true;

    // Quitar el flag de las options para no pasarlo a fetch
    const { noRedirigir: _, ...fetchOptions } = options;

    const response = await fetch(url, {
        ...fetchOptions,
        headers
    });

    // ✅ Token expirado o inválido
    if (response.status === 401 || response.status === 403) {
        if (noRedirigir) {
            console.warn('⚠️ 401/403 - redirect bloqueado por noRedirigir');
            return response;  // Devolver la respuesta sin redirigir
        }

        console.warn('🔒 Token expirado o inválido. Cerrando sesión...');
        cerrarSesionYRedirigir();
        throw new Error('Sesión expirada');
    }

    return response;
}
/**
 * Atajo: fetch + parse JSON en una línea.
 *
 * @example
 *   const data = await apiJSON('/talleres/123/citas');
 *   if (data.exito) { ... }
 */
export async function apiJSON(endpoint, options = {}) {
    const response = await apiFetch(endpoint, options);
    return response.json();
}

// ================================================================
// 📤 ATAJOS PARA MÉTODOS HTTP
// ================================================================

export const apiGet = (endpoint, options = {}) =>
    apiJSON(endpoint, { ...options, method: 'GET' });

export const apiPost = (endpoint, body, options = {}) =>
    apiJSON(endpoint, {
        ...options,
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body)
    });

export const apiPut = (endpoint, body, options = {}) =>
    apiJSON(endpoint, {
        ...options,
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body)
    });

export const apiDelete = (endpoint, options = {}) =>
    apiJSON(endpoint, { ...options, method: 'DELETE' });

// ================================================================
// EXPORT DEFAULT
// ================================================================

export default {
    apiFetch,
    apiJSON,
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    obtenerToken
};