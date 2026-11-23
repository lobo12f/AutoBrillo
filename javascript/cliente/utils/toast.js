/**
 * ============================================================================
 * 🎨 UTILIDADES DE UI: Toast, Logger, Cache, Loading
 * ============================================================================
 * Centraliza las notificaciones visuales, logs, cache y estado de carga.
 * ============================================================================
 */

// ============================================================================
// 📢 TOAST NOTIFICATIONS
// ============================================================================
export function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const colores = {
        success: '#00ff88',
        error: '#ff4444',
        warning: '#ffbb33',
        info: '#00d4ff'
    };
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #131c2b;
        border-left: 4px solid ${colores[tipo]};
        color: white; padding: 15px 20px;
        border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 100000; min-width: 300px; max-width: 400px;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        font-family: 'Inter', sans-serif;
        display: flex; align-items: center; gap: 10px;
        animation: slideIn 0.3s ease forwards, fadeOut 0.3s ease ${duracion - 300}ms forwards;
    `;

    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${iconos[tipo]}</span>
        <span style="flex: 1; font-size: 0.9rem;">${mensaje}</span>
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; color: #888; cursor: pointer; font-size: 1.2rem;">×</button>
    `;

    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn { to { transform: translateX(0); } }
            @keyframes fadeOut { to { opacity: 0; transform: translateX(120%); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.parentElement && toast.remove(), duracion);
}

// ============================================================================
// 🔔 NOTIFICACIÓN NATIVA DEL NAVEGADOR
// ============================================================================
export function mostrarNotificacionNativa(titulo, cuerpo, opciones = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        const notif = new Notification(titulo, {
            body: cuerpo,
            icon: '/assets/logo.png',
            badge: '/assets/badge.png',
            tag: opciones.tag || 'autobrillo-' + Date.now(),
            requireInteraction: opciones.requireInteraction !== false,
            silent: opciones.silent || false,
            data: opciones.data || {}
        });

        notif.onclick = () => {
            window.focus();
            if (opciones.onClick) opciones.onClick();
            notif.close();
        };

        setTimeout(() => notif.close(), 10000);
    } catch (error) {
        console.error('❌ Error notificación nativa:', error);
    }
}

// ============================================================================
// 📊 LOGGER
// ============================================================================
export const logger = {
    niveles: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
    nivel: 1,
    historial: [],

    log(nivel, mensaje, data = null) {
        if (nivel >= this.nivel) {
            const timestamp = new Date().toISOString();
            const prefijo = Object.keys(this.niveles).find(k => this.niveles[k] === nivel);
            const logEntry = { timestamp, nivel: prefijo, mensaje, data };
            this.historial.push(logEntry);
            if (this.historial.length > 100) this.historial.shift();

            const styles = {
                DEBUG: 'color: #888',
                INFO: 'color: #00d4ff',
                WARN: 'color: #ffbb33',
                ERROR: 'color: #ff4444'
            };
            console.log(`%c[${timestamp}] [${prefijo}] ${mensaje}`, styles[prefijo] || '', data || '');
        }
    },

    debug(msg, data) { this.log(0, msg, data); },
    info(msg, data) { this.log(1, msg, data); },
    warn(msg, data) { this.log(2, msg, data); },
    error(msg, data) { this.log(3, msg, data); },

    obtenerHistorial() { return [...this.historial]; },
    exportar() { return JSON.stringify(this.historial, null, 2); }
};

// ============================================================================
// 💾 CACHE
// ============================================================================
const cache = new Map();
const CACHE_TTL = 60000;

export async function obtenerConCache(clave, funcionFetch, ttl = CACHE_TTL) {
    const cached = cache.get(clave);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
        logger.debug(`Cache hit: ${clave}`);
        return cached.data;
    }

    logger.debug(`Cache miss: ${clave}`);
    try {
        const data = await funcionFetch();
        cache.set(clave, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        if (cached) {
            logger.warn(`Usando cache expirado: ${clave}`);
            return cached.data;
        }
        throw error;
    }
}

export function limpiarCache() {
    cache.clear();
    logger.info('Cache limpiado');
}

// ============================================================================
// ⏳ ESTADO DE CARGA
// ============================================================================
export const estadoCarga = {
    overlay: null,

    inicializar() {
        if (this.overlay) return;
        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 99999;
            display: none; align-items: center; justify-content: center;
            flex-direction: column; gap: 20px;
        `;
        this.overlay.innerHTML = `
            <div style="width: 50px; height: 50px; border: 3px solid #333; border-top: 3px solid #00ff88; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: #00ff88; font-family: 'Inter', sans-serif;">Procesando...</p>
        `;
        if (!document.getElementById('spin-style')) {
            const style = document.createElement('style');
            style.id = 'spin-style';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        document.body.appendChild(this.overlay);
    },

    mostrar(mensaje = 'Procesando...') {
        this.inicializar();
        this.overlay.querySelector('p').textContent = mensaje;
        this.overlay.style.display = 'flex';
    },

    ocultar() {
        if (this.overlay) this.overlay.style.display = 'none';
    }
};

// ============================================================================
// 🌐 EXPORTAR A WINDOW
// ============================================================================
window.mostrarToast = mostrarToast;
window.mostrarNotificacionNativa = mostrarNotificacionNativa;
window.estadoCarga = estadoCarga;
window.obtenerConCache = obtenerConCache;
window.limpiarCache = limpiarCache;
window.logger = logger;

console.log('✅ Módulo utils/toast.js cargado');