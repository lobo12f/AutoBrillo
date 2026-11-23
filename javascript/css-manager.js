/* ============================================================================
   AUTOBRILLO - CSS VARIABLES MANAGER v3 (FINAL DEFINITIVO)
   ============================================================================
   Sistema unificado de gestión de variables CSS.
   
   ✅ Aliases legacy (--accent, --primary, --border, etc.)
   ✅ Temas alineados con variables.css
   ✅ Aliases de temas (ES/EN)
   ✅ Persistencia en localStorage
   
   Uso:
     CSSManager.setColorPrimario('#ff4444');
     CSSManager.aplicarTema('ocean-blue');
     CSSManager.listarTemas();
   ============================================================================ */

// ============================================================================
// 1. CATÁLOGO COMPLETO DE VARIABLES
// ============================================================================
export const CSS_VARIABLES = {
    bg: {
        primary: '--bg-primary',
        secondary: '--bg-secondary',
        card: '--bg-card',
        cardAlt: '--bg-card-alt',
        input: '--bg-input',
        hover: '--bg-hover',
        overlay: '--bg-overlay',
        sidebar: '--bg-sidebar',
        header: '--bg-header',
        modal: '--bg-modal',
    },
    text: {
        primary: '--text-primary',
        secondary: '--text-secondary',
        muted: '--text-muted',
        inverse: '--text-inverse',
        heading: '--text-heading',
    },
    accent: {
        color: '--accent-color',
        rgb: '--accent-color-rgb',
        glow: '--accent-glow',
        bg: '--accent-bg',
        border: '--accent-border',
    },
    state: {
        success: '--color-success',
        warning: '--color-warning',
        danger: '--color-danger',
        info: '--color-info',
        purple: '--color-purple',
        gold: '--color-gold',
    },
    border: {
        color: '--border-color',
        light: '--border-color-light',
        strong: '--border-color-strong',
    },
    radius: {
        xs: '--radius-xs',
        sm: '--radius-sm',
        md: '--radius-md',
        lg: '--radius-lg',
        xl: '--radius-xl',
        pill: '--radius-pill',
    },
    space: {
        xxs: '--space-xxs',
        xs: '--space-xs',
        sm: '--space-sm',
        md: '--space-md',
        lg: '--space-lg',
        xl: '--space-xl',
        '2xl': '--space-2xl',
        '3xl': '--space-3xl',
    },
};

// ============================================================================
// 2. TEMAS PREDEFINIDOS (ALINEADOS 100% con data-tema en variables.css)
// ============================================================================
export const TEMAS_PREDEFINIDOS = {
    'dark-neon': {
        nombre: 'Dark Neon',
        icono: '🌙',
        accent: '#00ff88',
        rgb: '0, 255, 136',
        descripcion: 'Oscuro elegante con verde neón (Default)',
    },
    'light-clean': {
        nombre: 'Light Clean',
        icono: '☀️',
        accent: '#0066ff',
        rgb: '0, 102, 255',
        descripcion: 'Claro, limpio y profesional',
    },
    'ocean-blue': {
        nombre: 'Ocean Blue',
        icono: '🌊',
        accent: '#00b4ff',
        rgb: '0, 180, 255',
        descripcion: 'Azules profundos y relajantes',
    },
    'rose-gold': {
        nombre: 'Rose Gold',
        icono: '🌸',
        accent: '#ff69b4',
        rgb: '255, 105, 180',
        descripcion: 'Cálido con tonos rosados',
    },
    'forest-green': {
        nombre: 'Forest Green',
        icono: '🌿',
        accent: '#00cc55',
        rgb: '0, 204, 85',
        descripcion: 'Natural y tranquilo',
    },
    'midnight-purple': {
        nombre: 'Midnight Purple',
        icono: '🟣',
        accent: '#8a2be2',
        rgb: '138, 43, 226',
        descripcion: 'Elegante y misterioso',
    },
};

// ============================================================================
// 3. ALIASES DE TEMAS (para compatibilidad con nombres viejos ES/EN)
// ============================================================================
export const ALIASES_TEMAS = {
    // Español
    'verde': 'dark-neon',
    'esmeralda': 'dark-neon',
    'azul': 'ocean-blue',
    'rojo': 'midnight-purple',
    'naranja': 'rose-gold',
    'morado': 'midnight-purple',
    'purpura': 'midnight-purple',
    'dorado': 'rose-gold',
    'rosa': 'rose-gold',
    'cyan': 'ocean-blue',
    'claro': 'light-clean',
    'bosque': 'forest-green',
    // Inglés
    'green': 'dark-neon',
    'emerald': 'dark-neon',
    'blue': 'ocean-blue',
    'red': 'midnight-purple',
    'orange': 'rose-gold',
    'purple': 'midnight-purple',
    'gold': 'rose-gold',
    'pink': 'rose-gold',
    'light': 'light-clean',
    'forest': 'forest-green',
    'default': 'dark-neon',
    'dark': 'dark-neon',
};

// ============================================================================
// 4. PALETAS PREMIUM
// ============================================================================
export const PALETAS_PREMIUM = {
    esmeralda: { nombre: 'Esmeralda', accent: '#00ff88', bg: '#080c14', card: '#0f1621', text: '#ffffff' },
    midnight: { nombre: 'Midnight', accent: '#3b82f6', bg: '#0a0e1a', card: '#141a2e', text: '#e0e7ff' },
    sunset: { nombre: 'Sunset', accent: '#ff6b35', bg: '#1a0f0a', card: '#2d1810', text: '#ffe5d9' },
    royal: { nombre: 'Royal', accent: '#a855f7', bg: '#0f0a1a', card: '#1e142e', text: '#f3e8ff' },
    crimson: { nombre: 'Crimson', accent: '#dc2626', bg: '#1a0a0a', card: '#2d1010', text: '#fee2e2' },
    ocean: { nombre: 'Ocean', accent: '#06b6d4', bg: '#051318', card: '#0a1f28', text: '#cffafe' },
    forest: { nombre: 'Forest', accent: '#22c55e', bg: '#0a1409', card: '#142814', text: '#dcfce7' },
    golden: { nombre: 'Golden', accent: '#fbbf24', bg: '#14100a', card: '#28200f', text: '#fef3c7' },
};

// ============================================================================
// 5. GESTOR PRINCIPAL
// ============================================================================
export const CSSManager = {

    // ========================================================================
    // CORE: set / get / reset
    // ========================================================================
    set(variable, valor, target = document.documentElement) {
        if (!variable || valor === undefined || valor === null) return;
        const varName = variable.startsWith('--') ? variable : `--${variable}`;
        target.style.setProperty(varName, valor);
        this._actualizarAliases(varName, valor, target);
    },

    get(variable, target = document.documentElement) {
        const varName = variable.startsWith('--') ? variable : `--${variable}`;
        return getComputedStyle(target).getPropertyValue(varName).trim();
    },

    setMultiple(variables, target = document.documentElement) {
        if (!variables || typeof variables !== 'object') return;
        Object.entries(variables).forEach(([key, value]) => {
            this.set(key, value, target);
        });
    },

    reset(variable, target = document.documentElement) {
        const varName = variable.startsWith('--') ? variable : `--${variable}`;
        target.style.removeProperty(varName);
    },

    resetAll() {
        const html = document.documentElement;
        html.removeAttribute('style');
        html.removeAttribute('data-tema');
        html.removeAttribute('data-theme');
        html.removeAttribute('data-densidad');
        html.removeAttribute('data-density');
        html.removeAttribute('data-font-size');
        html.removeAttribute('data-mode');
        try {
            localStorage.removeItem('autobrillo_prefs');
        } catch (e) { /* ignore */ }
    },

    // ========================================================================
    // ALIASES: sincroniza nombres legacy con canónicos
    // ========================================================================
    _aliases: {
        '--accent-color': ['--accent', '--primary', '--primary-green', '--taller-color', '--color-primary'],
        '--border-color': ['--border'],
        '--color-danger': ['--danger', '--accent-danger'],
        '--color-warning': ['--warning', '--accent-warning'],
        '--color-info': ['--info', '--accent-secondary'],
        '--color-success': ['--success'],
        '--color-purple': ['--purple', '--accent-purple'],
        '--bg-primary': ['--bg-dark', '--main-bg', '--bg'],
        '--bg-card': ['--card-bg', '--card'],
        '--bg-sidebar': ['--sidebar-bg'],
        '--text-primary': ['--text-main', '--text'],
        '--text-secondary': ['--text-dim'],
        '--radius-sm': ['--border-radius-sm'],
        '--radius-md': ['--border-radius-md', '--radius'],
        '--radius-lg': ['--border-radius-lg'],
        '--radius-xl': ['--border-radius-xl'],
        '--radius-circle': ['--border-radius-full'],
        '--space-xs': ['--spacing-xs'],
        '--space-sm': ['--spacing-sm', '--gap-sm'],
        '--space-md': ['--spacing-md', '--gap-md'],
        '--space-lg': ['--spacing-lg', '--gap-lg'],
        '--space-xl': ['--spacing-xl'],
    },

    _actualizarAliases(varName, valor, target) {
        const aliases = this._aliases[varName];
        if (aliases) {
            aliases.forEach(alias => target.style.setProperty(alias, valor));
        }
    },

    // ========================================================================
    // ACCIONES ESPECÍFICAS
    // ========================================================================

    setColorPrimario(hexColor) {
        if (!hexColor) return;
        const hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
        const rgb = this.hexToRgb(hex);

        const variables = {
            '--accent-color': hex,
            '--accent-color-rgb': rgb,
            '--accent-glow': `rgba(${rgb}, 0.15)`,
            '--accent-bg': `rgba(${rgb}, 0.1)`,
            '--accent-border': `rgba(${rgb}, 0.3)`,
            '--color-primary': hex,
            '--color-primary-rgb': rgb,
            // Aliases legacy
            '--accent': hex,
            '--primary': hex,
            '--primary-green': hex,
            '--taller-color': hex,
            '--shadow-neon': `0 0 15px rgba(${rgb}, 0.15)`,
        };

        this.setMultiple(variables);
        this.guardarPreferencia('accentColor', hex);
        this.emitir('accent-change', { color: hex, rgb });

        const input = document.getElementById('input-color-primario');
        if (input) input.value = hex;
    },

    // ✅ aplicarTema CON SOPORTE PARA ALIASES
    aplicarTema(temaKey) {
        if (!temaKey) return false;

        // Resolver alias
        const temaReal = ALIASES_TEMAS[temaKey] || temaKey;
        const tema = TEMAS_PREDEFINIDOS[temaReal];

        if (!tema) {
            console.warn(`⚠️ Tema "${temaKey}" no encontrado`);
            console.info('💡 Temas:', Object.keys(TEMAS_PREDEFINIDOS));
            console.info('💡 Aliases:', Object.keys(ALIASES_TEMAS));
            return false;
        }

        // Aplicar tema
        document.documentElement.setAttribute('data-tema', temaReal);
        document.documentElement.setAttribute('data-theme', temaReal);
        this.setColorPrimario(tema.accent);
        this.guardarPreferencia('tema', temaReal);

        // Actualizar botones activos
        document.querySelectorAll('[data-tema-btn]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.temaBtn === temaReal);
        });

        this.emitir('tema-change', { key: temaReal, ...tema });

        const esAlias = temaReal !== temaKey;
        console.log(`✅ Tema "${tema.nombre}" aplicado${esAlias ? ` (desde alias "${temaKey}")` : ''}`);
        return true;
    },

    aplicarPaleta(paletaKey) {
        if (!paletaKey) return false;
        const p = PALETAS_PREMIUM[paletaKey];
        if (!p) {
            console.warn(`⚠️ Paleta "${paletaKey}" no encontrada`);
            return false;
        }

        this.setMultiple({
            '--bg-primary': p.bg,
            '--bg-secondary': p.bg,
            '--bg-card': p.card,
            '--bg-dark': p.bg,
            '--main-bg': p.bg,
            '--card-bg': p.card,
        });

        if (p.text) {
            this.set('--text-primary', p.text);
            this.set('--text-main', p.text);
        }

        this.setColorPrimario(p.accent);
        this.guardarPreferencia('paleta', paletaKey);
        this.emitir('paleta-change', { key: paletaKey, ...p });
        console.log(`✅ Paleta "${p.nombre}" aplicada`);
        return true;
    },

    cambiarDensidad(densidad) {
        const valores = ['compacto', 'comodo', 'amplio'];
        if (!valores.includes(densidad)) return;

        document.documentElement.setAttribute('data-densidad', densidad);
        document.documentElement.setAttribute('data-density', densidad);
        this.guardarPreferencia('densidad', densidad);

        document.querySelectorAll('.btn-densidad').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.densidad === densidad);
        });

        this.emitir('densidad-change', { densidad });
    },

    cambiarTamanoFuente(tamano) {
        const valores = { pequeno: 0.875, normal: 1, grande: 1.15 };
        if (!valores[tamano]) return;

        document.documentElement.setAttribute('data-font-size', tamano);
        this.set('--font-scale', valores[tamano]);
        this.guardarPreferencia('fontSize', tamano);

        document.querySelectorAll('.btn-font').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === tamano);
        });

        this.emitir('font-size-change', { tamano });
    },

    cambiarModo(modo) {
        if (!['light', 'dark'].includes(modo)) return;
        document.documentElement.setAttribute('data-mode', modo);
        this.guardarPreferencia('mode', modo);
        this.emitir('mode-change', { modo });
    },

    // ========================================================================
    // UTILIDADES
    // ========================================================================

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0, 0, 0';
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    },

    guardarPreferencia(key, valor) {
        try {
            const prefs = JSON.parse(localStorage.getItem('autobrillo_prefs') || '{}');
            prefs[key] = valor;
            localStorage.setItem('autobrillo_prefs', JSON.stringify(prefs));
        } catch (e) { /* ignore */ }
    },

    obtenerPreferencia(key) {
        try {
            return JSON.parse(localStorage.getItem('autobrillo_prefs') || '{}')[key];
        } catch (e) { return null; }
    },

    cargarPreferencias() {
        const prefs = JSON.parse(localStorage.getItem('autobrillo_prefs') || '{}');
        if (prefs.accentColor) this.setColorPrimario(prefs.accentColor);
        if (prefs.tema) this.aplicarTema(prefs.tema);
        if (prefs.paleta) this.aplicarPaleta(prefs.paleta);
        if (prefs.densidad) this.cambiarDensidad(prefs.densidad);
        if (prefs.fontSize) this.cambiarTamanoFuente(prefs.fontSize);
        if (prefs.mode) this.cambiarModo(prefs.mode);
    },

    emitir(nombre, detalle = {}) {
        window.dispatchEvent(new CustomEvent(`css:${nombre}`, { detail: detalle }));
    },

    // ========================================================================
    // RENDERIZADO DE SELECTORES
    // ========================================================================

    renderizarSelectorTemas(contenedorId = 'selector-temas') {
        const c = document.getElementById(contenedorId);
        if (!c) return;

        const temaActual = this.obtenerPreferencia('tema');

        c.innerHTML = Object.entries(TEMAS_PREDEFINIDOS).map(([key, t]) => `
            <div 
                data-tema-btn="${key}" 
                onclick="CSSManager.aplicarTema('${key}')"
                class="tema-btn ${key === temaActual ? 'active' : ''}"
                title="${t.descripcion}"
            >
                <div class="tema-btn-color" 
                     style="background:${t.accent}; box-shadow:0 0 15px ${t.accent}80;"></div>
                <span class="tema-btn-label">${t.icono} ${t.nombre}</span>
            </div>
        `).join('');
    },

    renderizarSelectorPaletas(contenedorId = 'selector-paletas') {
        const c = document.getElementById(contenedorId);
        if (!c) return;

        c.innerHTML = Object.entries(PALETAS_PREMIUM).map(([key, p]) => `
            <div onclick="CSSManager.aplicarPaleta('${key}')" 
                 class="paleta-btn"
                 title="${p.nombre}">
                <div class="paleta-preview" 
                     style="background:linear-gradient(135deg, ${p.bg}, ${p.card}, ${p.accent});"></div>
                <span class="paleta-label">${p.nombre}</span>
            </div>
        `).join('');
    },

    // ========================================================================
    // DEBUG: Listar todos los temas disponibles
    // ========================================================================
    listarTemas() {
        console.log('🎨 Temas disponibles:');
        console.table(Object.entries(TEMAS_PREDEFINIDOS).map(([key, t]) => ({
            key,
            nombre: t.nombre,
            accent: t.accent,
            icono: t.icono,
        })));

        console.log('🔗 Aliases:');
        console.table(Object.entries(ALIASES_TEMAS).map(([alias, real]) => ({
            alias,
            tema_real: real,
        })));

        console.log('🎨 Paletas disponibles:');
        console.table(Object.entries(PALETAS_PREMIUM).map(([key, p]) => ({
            key,
            nombre: p.nombre,
            accent: p.accent,
        })));
    },

    // ========================================================================
    // INIT
    // ========================================================================
    init() {
        this.cargarPreferencias();
        this.renderizarSelectorTemas();
        this.renderizarSelectorPaletas();

        console.log('🎨 CSSManager v3 inicializado');
        console.log('💡 Tip: CSSManager.listarTemas() para ver todos los temas');
        return this;
    },
};

// ============================================================================
// 6. EXPORTACIÓN GLOBAL
// ============================================================================
window.CSSManager = CSSManager;
window.CSS_VARIABLES = CSS_VARIABLES;
window.TEMAS_PREDEFINIDOS = TEMAS_PREDEFINIDOS;
window.PALETAS_PREMIUM = PALETAS_PREMIUM;
window.ALIASES_TEMAS = ALIASES_TEMAS;

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CSSManager.init());
} else {
    CSSManager.init();
}

export default CSSManager;