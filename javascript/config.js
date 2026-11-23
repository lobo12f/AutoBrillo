/**
 * ====================================================================
 * ⚙️ CONFIGURACIÓN CENTRAL - AUTOBRILLO DETALLING
 * ====================================================================
 * 
 * ✅ Un solo lugar para cambiar la URL del servidor
 * ✅ Detecta automáticamente si está en desarrollo o producción
 * ✅ Compatible con localhost, 127.0.0.1, redes locales (192.168.x.x)
 */

// ================================================================
// 🔍 DETECCIÓN DEL ENTORNO
// ================================================================
const hostname = window.location.hostname;

// ✅ Detectar si estamos en desarrollo local
const esLocalhost = hostname === 'localhost'
    || hostname === '127.0.0.1';
/*|| hostname.startsWith('192.168.')
|| hostname.startsWith('10.')
|| hostname.startsWith('172.');*/

// ================================================================
// 🌐 URLS DEL SERVIDOR
// ================================================================

// ✅ URL del backend (Node.js + Express)
/*export const SERVER_URL = esLocalhost
    ? 'http://localhost:3000'
    : window.location.origin;
*/

export const SERVER_URL = esLocalhost
    ? 'http://localhost:3000'
    : `http://${hostname}:3000`;   // ← Usa la IP del navegador


// ✅ URL de la API (backend + /api)
export const API_URL = `${SERVER_URL}/api`;

// ✅ URL del WebSocket (Socket.IO)
export const WS_URL = SERVER_URL;

// ✅ URL de la carpeta de uploads
export const UPLOADS_URL = `${SERVER_URL}/uploads`;

// ================================================================
// 📊 EXPORTS DE CONVENIENCIA
// ================================================================

export default {
    SERVER_URL,
    API_URL,
    WS_URL,
    UPLOADS_URL,
    esLocalhost
};

// ================================================================
// 🔍 LOG DE DEBUG (solo en desarrollo)
// ================================================================
if (esLocalhost) {
    console.log('⚙️ Configuración central cargada:', {
        hostname,
        SERVER_URL,
        API_URL,
        WS_URL,
        UPLOADS_URL
    });
}