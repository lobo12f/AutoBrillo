// ====================================================================
// 🔔 SISTEMA DE TOASTS - AUTOBRILLO DETALLING
// ====================================================================

export class ToastManager {

    constructor() {
        this.container = null;
        this.contador = 0;
        this.inicializar();
    }

    /**
     * ✅ Crear el contenedor de toasts
     */
    inicializar() {
        // Verificar si ya existe
        if (document.getElementById('toast-container')) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * ✅ Mostrar un toast
     * @param {string} mensaje - Texto del toast
     * @param {string} tipo - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duracion - Milisegundos (default: 4000)
     */
    mostrar(mensaje, tipo = 'info', duracion = 4000) {
        this.contador++;
        const id = `toast-${this.contador}`;

        // Colores según tipo
        const colores = {
            success: { bg: '#0a2a15', border: '#00ff88', icon: '✅', color: '#00ff88' },
            error: { bg: '#2a0a0a', border: '#ff4444', icon: '❌', color: '#ff4444' },
            warning: { bg: '#2a1a0a', border: '#ffbb33', icon: '⚠️', color: '#ffbb33' },
            info: { bg: '#0a162a', border: '#00d4ff', icon: 'ℹ️', color: '#00d4ff' }
        };

        const estilo = colores[tipo] || colores.info;

        // Crear elemento toast
        const toast = document.createElement('div');
        toast.id = id;
        toast.style.cssText = `
            background: ${estilo.bg};
            border: 1px solid ${estilo.border};
            border-radius: 12px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            animation: slideInRight 0.3s ease;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 300px;
        `;

        toast.innerHTML = `
            <span style="font-size:1.2rem; flex-shrink:0;">${estilo.icon}</span>
            <span style="flex:1; color:#ddd;">${mensaje}</span>
            <span style="color:#666; font-size:0.7rem; cursor:pointer; padding:4px;"
                onclick="document.getElementById('${id}').remove()">✕</span>
        `;

        // Cerrar al hacer clic
        toast.addEventListener('click', () => {
            this.cerrar(id);
        });

        this.container.appendChild(toast);

        // Auto-cerrar después de la duración
        setTimeout(() => {
            this.cerrar(id);
        }, duracion);

        console.log(`🔔 Toast [${tipo}]:`, mensaje);
        return id;
    }

    /**
     * ✅ Cerrar un toast con animación
     */
    cerrar(id) {
        const toast = document.getElementById(id);
        if (!toast) return;

        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }

    /**
     * ✅ Atajos para tipos comunes
     */
    success(mensaje, duracion) { return this.mostrar(mensaje, 'success', duracion); }
    error(mensaje, duracion) { return this.mostrar(mensaje, 'error', duracion); }
    warning(mensaje, duracion) { return this.mostrar(mensaje, 'warning', duracion); }
    info(mensaje, duracion) { return this.mostrar(mensaje, 'info', duracion); }
}

export default ToastManager;