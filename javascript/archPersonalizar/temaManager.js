// ====================================================================
// 🎨 GESTOR DE TEMAS - AUTOBRILLO DETALLING
//    Sistema de personalización visual para taller y cliente
// ====================================================================

export class TemaManager {

    constructor() {
        // ✅ Temas predefinidos disponibles
        this.temasDisponibles = [
            { id: 'dark-neon', nombre: '🌙 Dark Neon', icono: '🌙', descripcion: 'Oscuro con acentos neón' },
            { id: 'light-clean', nombre: '☀️ Light Clean', icono: '☀️', descripcion: 'Claro y minimalista' },
            { id: 'ocean-blue', nombre: '🌊 Ocean Blue', icono: '🌊', descripcion: 'Azules profundos' },
            { id: 'rose-gold', nombre: '🌸 Rose Gold', icono: '🌸', descripcion: 'Tonos rosados cálidos' },
            { id: 'forest-green', nombre: '🌿 Forest Green', icono: '🌿', descripcion: 'Verdes naturales' },
            { id: 'midnight-purple', nombre: '🟣 Midnight Purple', icono: '🟣', descripcion: 'Púrpuras elegantes' }
        ];

        // ✅ Configuración por defecto
        this.configuracion = {
            tema: 'dark-neon',           // Tema actual
            colorPrimario: '#00ff88',    // Color de acento
            densidad: 'comodo',          // 'compacto' | 'comodo'
            tamanoFuente: 'normal'       // 'pequeno' | 'normal' | 'grande'
        };
    }

    // ================================================================
    // 🔹 PALETAS PREMIUM (NUEVO)
    // ================================================================

    /**
     * ✅ Paletas de color predefinidas
     *    Cada paleta define un color primario, un color de fondo
     *    y un tema recomendado que combina bien
     */
    paletasPremium = [
        {
            id: 'midnight',
            nombre: '🌙 Midnight',
            primario: '#6c5ce7',
            fondo: '#0a0a1a',
            tema: 'midnight-purple',
            descripcion: 'Púrpura oscuro elegante'
        },
        {
            id: 'sunset',
            nombre: '🍊 Sunset',
            primario: '#ff6b35',
            fondo: '#1a0f0a',
            tema: 'dark-neon',
            descripcion: 'Naranja cálido vibrante'
        },
        {
            id: 'arctic',
            nombre: '❄️ Arctic',
            primario: '#00d4ff',
            fondo: '#0a1628',
            tema: 'ocean-blue',
            descripcion: 'Azul hielo refrescante'
        },
        {
            id: 'nature',
            nombre: '🌿 Nature',
            primario: '#00cc55',
            fondo: '#0c1410',
            tema: 'forest-green',
            descripcion: 'Verde natural relajante'
        },
        {
            id: 'cyberpunk',
            nombre: '💜 Cyberpunk',
            primario: '#ff00ff',
            fondo: '#0f001a',
            tema: 'midnight-purple',
            descripcion: 'Neón púrpura intenso'
        },
        {
            id: 'gold',
            nombre: '👑 Gold',
            primario: '#ffd700',
            fondo: '#1a1500',
            tema: 'dark-neon',
            descripcion: 'Dorado premium lujoso'
        },
        {
            id: 'cherry',
            nombre: '🍒 Cherry',
            primario: '#ff1744',
            fondo: '#1a0a0f',
            tema: 'rose-gold',
            descripcion: 'Rojo cereza pasional'
        },
        {
            id: 'mint',
            nombre: '🌱 Mint',
            primario: '#00e5a0',
            fondo: '#0a1410',
            tema: 'forest-green',
            descripcion: 'Verde menta fresco'
        }
    ];

    /**
     * ✅ Aplicar una paleta premium completa
     *    Cambia el tema, color primario y actualiza la UI
     * @param {string} paletaId - ID de la paleta a aplicar
     */
    aplicarPaleta(paletaId) {
        const paleta = this.paletasPremium.find(p => p.id === paletaId);
        if (!paleta) {
            console.warn('⚠️ Paleta no encontrada:', paletaId);
            return false;
        }

        console.log('🎨 Aplicando paleta:', paleta.nombre);

        // Cambiar tema de fondo
        this.cambiarTema(paleta.tema);

        // Cambiar color primario
        this.cambiarColorPrimario(paleta.primario);

        // Guardar paleta actual
        this.configuracion.paletaActual = paletaId;
        this.guardar();

        // Actualizar UI de botones
        this._actualizarBotonesPaletas(paletaId);

        // Si existe la función de color del taller, también actualizarla
        if (typeof window.aplicarColorTaller === 'function') {
            window.aplicarColorTaller(paleta.primario);
        }

        return true;
    }

    /**
     * ✅ Actualizar estado visual de los botones de paleta
     * @param {string} paletaActiva - ID de la paleta seleccionada
     */
    _actualizarBotonesPaletas(paletaActiva) {
        document.querySelectorAll('.btn-paleta').forEach(btn => {
            const btnPaleta = btn.dataset.paleta;
            if (btnPaleta === paletaActiva) {
                btn.classList.add('active');
                btn.style.borderColor = 'var(--accent-color)';
                btn.style.boxShadow = '0 0 15px var(--accent-glow)';
                btn.style.transform = 'scale(1.05)';
                btn.style.background = 'var(--accent-bg)';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-color)';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
                btn.style.background = 'var(--bg-input)';
            }
        });
    }

    /**
     * ✅ Obtener todas las paletas disponibles
     * @returns {Array} Lista de paletas premium
     */
    getPaletas() {
        return this.paletasPremium;
    }

    /**
     * ✅ Renderizar selector de paletas en el HTML
     * @param {string} containerId - ID del contenedor donde renderizar
     */
    renderizarSelectorPaletas(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('⚠️ Contenedor de paletas no encontrado:', containerId);
            return;
        }

        const paletaActual = this.configuracion.paletaActual || '';

        container.innerHTML = this.paletasPremium.map(paleta => `
        <div class="btn-paleta ${paleta.id === paletaActual ? 'active' : ''}"
            data-paleta="${paleta.id}"
            onclick="window.temaManager.aplicarPaleta('${paleta.id}')"
            style="
                padding: 12px 8px;
                border-radius: 10px;
                cursor: pointer;
                text-align: center;
                transition: all 0.3s ease;
                border: 2px solid ${paleta.id === paletaActual ? 'var(--accent-color)' : 'var(--border-color)'};
                background: ${paleta.id === paletaActual ? 'var(--accent-bg)' : 'var(--bg-input)'};
                ${paleta.id === paletaActual ? 'box-shadow: 0 0 15px var(--accent-glow); transform: scale(1.05);' : ''}
            "
            onmouseover="if(!this.classList.contains('active')){this.style.borderColor='var(--accent-color)';this.style.transform='scale(1.05)';}"
            onmouseout="if(!this.classList.contains('active')){this.style.borderColor='var(--border-color)';this.style.transform='scale(1)';}"
            title="${paleta.descripcion}">
            <div style="
                width: 30px; 
                height: 30px; 
                border-radius: 50%; 
                background: ${paleta.primario}; 
                margin: 0 auto 6px;
                box-shadow: 0 0 10px ${paleta.primario}80;
            "></div>
            <div style="font-size:0.7rem; font-weight:600; color: var(--text-primary);">${paleta.nombre}</div>
            <div style="font-size:0.6rem; color: var(--text-muted); margin-top:2px;">${paleta.descripcion}</div>
        </div>
    `).join('');

        console.log('🎨 Selector de paletas renderizado:', this.paletasPremium.length, 'paletas');
    }
    // ================================================================
    // 🔹 INICIALIZAR
    // ================================================================

    /**
     * ✅ Inicializar tema desde localStorage o usar defaults
     *    Se llama al cargar la página para restaurar preferencias
     */
    inicializar() {
        // Cargar configuración guardada
        const configGuardada = localStorage.getItem('autobrillo_tema');
        if (configGuardada) {
            try {
                const config = JSON.parse(configGuardada);
                this.configuracion = { ...this.configuracion, ...config };
                console.log('🎨 Configuración de tema cargada:', this.configuracion);
            } catch (error) {
                console.warn('⚠️ Error al cargar tema guardado, usando defaults');
            }
        }

        // Aplicar todas las configuraciones
        this.aplicarTema(this.configuracion.tema);
        this.aplicarColorPrimario(this.configuracion.colorPrimario);
        this.aplicarDensidad(this.configuracion.densidad);
        this.aplicarTamanoFuente(this.configuracion.tamanoFuente);

        console.log('✅ Sistema de temas inicializado:', this.configuracion.tema);
    }

    // ================================================================
    // 🔹 TEMAS
    // ================================================================

    /**
     * ✅ Cambiar tema
     * @param {string} temaId - ID del tema a aplicar
     */
    cambiarTema(temaId) {
        const temaExiste = this.temasDisponibles.find(t => t.id === temaId);
        if (!temaExiste) {
            console.warn('⚠️ Tema no encontrado:', temaId);
            return false;
        }

        this.configuracion.tema = temaId;
        this.aplicarTema(temaId);
        this.guardar();

        console.log('🎨 Tema cambiado a:', temaId);
        return true;
    }

    /**
     * ✅ Aplicar tema al DOM
     * @param {string} temaId - ID del tema
     */
    aplicarTema(temaId) {
        document.documentElement.setAttribute('data-tema', temaId);

        // ✅ Actualizar botones de tema en el panel si existe
        document.querySelectorAll('.btn-tema').forEach(btn => {
            const btnTema = btn.dataset.tema;
            if (btnTema === temaId) {
                btn.classList.add('active');
                btn.style.borderColor = 'var(--accent-color, #00ff88)';
                btn.style.background = 'var(--accent-bg, rgba(0,255,136,0.1))';
                btn.style.color = 'var(--accent-color, #00ff88)';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-color, #1e2a3a)';
                btn.style.background = 'var(--bg-input, #080c14)';
                btn.style.color = 'var(--text-primary, #fff)';
            }
        });
    }

    // ================================================================
    // 🔹 COLOR PRIMARIO
    // ================================================================

    /**
     * ✅ Cambiar color primario (acento)
     * @param {string} color - Color en formato hex (#00ff88)
     */
    cambiarColorPrimario(color) {
        if (!color || !color.startsWith('#')) {
            console.warn('⚠️ Color inválido:', color);
            return false;
        }

        this.configuracion.colorPrimario = color;
        this.aplicarColorPrimario(color);
        this.guardar();

        console.log('🎨 Color primario cambiado a:', color);
        return true;
    }

    /**
     * ✅ Aplicar color primario al DOM
     * @param {string} color - Color en formato hex
     */
    aplicarColorPrimario(color) {
        if (!color) return;

        // ✅ Convertir hex a RGB para rgba
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // ✅ Aplicar variables CSS
        document.documentElement.style.setProperty('--taller-color', color);
        document.documentElement.style.setProperty('--taller-color-rgb', `${r}, ${g}, ${b}`);
        document.documentElement.style.setProperty('--accent-color', color);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
        document.documentElement.style.setProperty('--accent-bg', `rgba(${r}, ${g}, ${b}, 0.08)`);
    }

    // ================================================================
    // 🔹 DENSIDAD
    // ================================================================

    /**
     * ✅ Cambiar densidad de la interfaz
     * @param {string} densidad - 'compacto' | 'comodo'
     */
    cambiarDensidad(densidad) {
        if (!['compacto', 'comodo'].includes(densidad)) {
            console.warn('⚠️ Densidad inválida:', densidad);
            return false;
        }

        this.configuracion.densidad = densidad;
        this.aplicarDensidad(densidad);
        this.guardar();

        console.log('📐 Densidad cambiada a:', densidad);

        // ✅ Actualizar botones de densidad
        document.querySelectorAll('.btn-densidad').forEach(btn => {
            if (btn.dataset.densidad === densidad) {
                btn.classList.add('active');
                btn.style.borderColor = 'var(--accent-color, #00ff88)';
                btn.style.background = 'var(--accent-bg, rgba(0,255,136,0.1))';
                btn.style.color = 'var(--accent-color, #00ff88)';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-color, #1e2a3a)';
                btn.style.background = 'var(--bg-input, #080c14)';
                btn.style.color = 'var(--text-primary, #fff)';
            }
        });

        return true;
    }

    /**
     * ✅ Aplicar densidad al DOM
     * @param {string} densidad - 'compacto' | 'comodo'
     */
    aplicarDensidad(densidad) {
        document.documentElement.setAttribute('data-densidad', densidad);

        // ✅ Variables de espaciado según densidad
        const espacios = {
            'compacto': {
                '--spacing-xs': '4px',
                '--spacing-sm': '8px',
                '--spacing-md': '12px',
                '--spacing-lg': '18px',
                '--spacing-xl': '24px',
                '--card-padding': '15px',
                '--gap-sm': '6px',
                '--gap-md': '10px',
                '--gap-lg': '16px'
            },
            'comodo': {
                '--spacing-xs': '6px',
                '--spacing-sm': '12px',
                '--spacing-md': '20px',
                '--spacing-lg': '28px',
                '--spacing-xl': '36px',
                '--card-padding': '25px',
                '--gap-sm': '10px',
                '--gap-md': '16px',
                '--gap-lg': '24px'
            }
        };

        const vars = espacios[densidad];
        Object.entries(vars).forEach(([prop, valor]) => {
            document.documentElement.style.setProperty(prop, valor);
        });
    }

    // ================================================================
    // 🔹 TAMAÑO DE FUENTE
    // ================================================================

    /**
     * ✅ Cambiar tamaño de fuente
     * @param {string} tamano - 'pequeno' | 'normal' | 'grande'
     */
    cambiarTamanoFuente(tamano) {
        if (!['pequeno', 'normal', 'grande'].includes(tamano)) {
            console.warn('⚠️ Tamaño de fuente inválido:', tamano);
            return false;
        }

        this.configuracion.tamanoFuente = tamano;
        this.aplicarTamanoFuente(tamano);
        this.guardar();

        console.log('🔤 Tamaño de fuente cambiado a:', tamano);

        // ✅ Actualizar botones de fuente
        document.querySelectorAll('.btn-font').forEach(btn => {
            if (btn.dataset.font === tamano) {
                btn.classList.add('active');
                btn.style.borderColor = 'var(--accent-color, #00ff88)';
                btn.style.background = 'var(--accent-bg, rgba(0,255,136,0.1))';
                btn.style.color = 'var(--accent-color, #00ff88)';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-color, #1e2a3a)';
                btn.style.background = 'var(--bg-input, #080c14)';
                btn.style.color = 'var(--text-primary, #fff)';
            }
        });

        return true;
    }

    /**
     * ✅ Aplicar tamaño de fuente al DOM
     * @param {string} tamano - 'pequeno' | 'normal' | 'grande'
     */
    aplicarTamanoFuente(tamano) {
        document.documentElement.setAttribute('data-font-size', tamano);

        const tamanos = {
            'pequeno': '13px',
            'normal': '15px',
            'grande': '17px'
        };

        document.documentElement.style.fontSize = tamanos[tamano] || '15px';
    }

    // ================================================================
    // 🔹 GUARDAR
    // ================================================================

    /**
     * ✅ Guardar configuración en localStorage
     */
    guardar() {
        try {
            localStorage.setItem('autobrillo_tema', JSON.stringify(this.configuracion));
            console.log('💾 Configuración de tema guardada');
        } catch (error) {
            console.error('❌ Error al guardar tema:', error);
        }
    }

    // ================================================================
    // 🔹 GETTERS
    // ================================================================

    /**
     * ✅ Obtener temas disponibles
     * @returns {Array} Lista de temas
     */
    getTemas() {
        return this.temasDisponibles;
    }

    /**
     * ✅ Obtener configuración actual
     * @returns {Object} Configuración completa
     */
    getConfiguracion() {
        return { ...this.configuracion };
    }

    /**
     * ✅ Obtener tema actual
     * @returns {string} ID del tema actual
     */
    getTemaActual() {
        return this.configuracion.tema;
    }

    /**
     * ✅ Restablecer a valores por defecto
     */
    resetear() {
        this.configuracion = {
            tema: 'dark-neon',
            colorPrimario: '#00ff88',
            densidad: 'comodo',
            tamanoFuente: 'normal'
        };

        this.aplicarTema('dark-neon');
        this.aplicarColorPrimario('#00ff88');
        this.aplicarDensidad('comodo');
        this.aplicarTamanoFuente('normal');
        this.guardar();

        console.log('🔄 Tema restablecido a valores por defecto');
    }

    /**
     * ✅ Renderizar panel de selección de temas
     * @param {string} containerId - ID del contenedor HTML
     */
    renderizarSelectorTemas(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('⚠️ Contenedor no encontrado:', containerId);
            return;
        }

        const temaActual = this.configuracion.tema;

        container.innerHTML = this.temasDisponibles.map(tema => `
            <div class="btn-tema ${tema.id === temaActual ? 'active' : ''}"
                data-tema="${tema.id}"
                onclick="window.temaManager.cambiarTema('${tema.id}')"
                style="
                    padding: 12px;
                    border-radius: 10px;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.3s;
                    border: 2px solid ${tema.id === temaActual ? 'var(--accent-color, #00ff88)' : 'var(--border-color, #1e2a3a)'};
                    background: ${tema.id === temaActual ? 'var(--accent-bg, rgba(0,255,136,0.1))' : 'var(--bg-input, #080c14)'};
                    color: ${tema.id === temaActual ? 'var(--accent-color, #00ff88)' : 'var(--text-primary, #fff)'};
                "
                onmouseover="if(!this.classList.contains('active')){this.style.borderColor='var(--accent-color)';this.style.transform='translateY(-2px)';}"
                onmouseout="if(!this.classList.contains('active')){this.style.borderColor='var(--border-color)';this.style.transform='translateY(0)';}"
                title="${tema.descripcion}">
                <div style="font-size:1.5rem; margin-bottom:5px;">${tema.icono}</div>
                <div style="font-size:0.7rem; font-weight:600;">${tema.nombre.split(' ').pop()}</div>
            </div>
        `).join('');

        console.log('🎨 Selector de temas renderizado');
    }
}

export default TemaManager;