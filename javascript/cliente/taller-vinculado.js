// ====================================================================
// 🏪 SISTEMA DE VINCULACIÓN CON TALLER
// ====================================================================
// Permite al cliente seleccionar un taller de confianza
// y personaliza toda su experiencia con ese taller
// ====================================================================
import { apiFetch } from '../api-client.js';
export class TallerVinculadoManager {

    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
        this.tallerVinculado = null;
        this.eventListeners = [];
    }

    // ================================================================
    // 🔹 INICIALIZACIÓN
    // ================================================================

    /**
     * Inicializar el manager
     */
    async init() {
        console.log('🏪 Inicializando TallerVinculadoManager...');

        // Cargar taller guardado
        await this.cargarTallerGuardado();

        // Configurar eventos
        this.configurarEventos();

        // Actualizar interfaz
        this.actualizarInterfaz();

        console.log('✅ TallerVinculadoManager listo');
    }

    /**
     * Cargar taller desde localStorage
     */
    async cargarTallerGuardado() {
        try {
            const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
            const clienteId = sesion._id || sesion.usuario?._id || sesion.id;
            const token = sesion.token || '';
            const API_BASE = window.API_URL || 'http://localhost:3000/api';

            console.log('🔄 Cargando taller guardado...');
            console.log('   - clienteId:', clienteId);

            // ⭐ 1. Cargar desde localStorage primero (rápido)
            const guardado = localStorage.getItem('taller_vinculado');
            if (guardado) {
                try {
                    this.tallerVinculado = JSON.parse(guardado);
                    console.log('📦 localStorage:', this.tallerVinculado?.nombre);
                } catch (e) {
                    localStorage.removeItem('taller_vinculado');
                }
            }

            // ⭐ 2. Consultar backend (autoritativo)
            if (clienteId && token) {
                try {
                    console.log('🔍 Consultando backend...');

                    const response = await fetch(
                        `${API_BASE}/clientes/${clienteId}/taller-vinculado`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        if (data.exito && data.taller) {
                            this.tallerVinculado = data.taller;
                            localStorage.setItem('taller_vinculado', JSON.stringify(data.taller));
                            console.log('✅ Backend:', data.taller.nombre);
                        }
                    } else if (response.status === 404) {
                        console.log('ℹ️ Backend: sin taller vinculado');
                        this.tallerVinculado = null;
                        localStorage.removeItem('taller_vinculado');
                    }
                } catch (e) {
                    console.warn('⚠️ No se pudo verificar backend:', e.message);
                }
            }

            if (this.tallerVinculado) {
                console.log('✅ Taller cargado:', this.tallerVinculado.nombre);
            } else {
                console.log('ℹ️ Sin taller vinculado');
            }

        } catch (error) {
            console.error('❌ Error cargando taller:', error);
            this.tallerVinculado = null;
        }
    }

    /**
     * Configurar eventos del DOM
     */
    configurarEventos() {
        // Click en el selector del header
        const selectorHeader = document.getElementById('taller-selector-header');
        if (selectorHeader) {
            selectorHeader.addEventListener('click', () => this.mostrarSelector());
        }

        // Click fuera del modal para cerrar
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('modal-selector-taller');
            if (modal && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // ================================================================
    // 🔹 SELECTOR DE TALLER
    // ================================================================

    /**
     * Mostrar modal de selección de taller
     */
    async mostrarSelector() {
        const modal = document.getElementById('modal-selector-taller');
        if (!modal) {
            console.error('❌ No se encontró el modal selector-taller');
            return;
        }

        modal.style.display = 'flex';

        const lista = document.getElementById('lista-talleres-selector');
        if (!lista) return;

        lista.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">🔍 Buscando talleres disponibles...</p>';

        try {
            const response = await apiFetch(`/talleres/disponibles`);
            const data = await response.json();

            if (data.exito && data.talleres.length > 0) {
                this.renderizarListaTalleres(data.talleres, lista);
            } else {
                lista.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">📭 No hay talleres disponibles</p>';
            }
        } catch (error) {
            lista.innerHTML = '<p style="color:#ff4444; text-align:center; padding:30px;">❌ Error al cargar talleres</p>';
        }
    }

    /**
     * Renderizar lista de talleres en el selector
     */
    renderizarListaTalleres(talleres, container) {
        container.innerHTML = talleres.map(taller => {
            const seleccionado = this.tallerVinculado?._id === taller._id;
            const estrellas = taller.calificacion?.promedio
                ? '⭐'.repeat(Math.round(taller.calificacion.promedio))
                : 'Sin calificar';

            return `
            <div onclick="window.tallerManager.vincular('${taller._id}')" 
                style="background:${seleccionado ? 'rgba(0,255,136,0.05)' : '#131c2b'}; 
                       border:2px solid ${seleccionado ? '#00ff88' : '#1e2a3a'}; 
                       border-radius:12px; padding:18px; cursor:pointer; 
                       transition:all 0.2s ease;"
                onmouseover="this.style.borderColor='#00ff88'; this.style.transform='translateX(5px)';" 
                onmouseout="this.style.borderColor='${seleccionado ? '#00ff88' : '#1e2a3a'}'; this.style.transform='translateX(0)';">
                
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <span style="font-size:1.5rem;">🏪</span>
                            <strong style="color:#fff; font-size:1.05rem;">${taller.nombre}</strong>
                            ${seleccionado ? '<span style="background:#00ff8822; color:#00ff88; padding:3px 8px; border-radius:10px; font-size:0.65rem;">ACTUAL</span>' : ''}
                        </div>
                        <p style="color:#ffbb33; font-size:0.8rem; margin:3px 0;">${estrellas}</p>
                        <p style="color:#888; font-size:0.8rem; margin:3px 0;">📍 ${taller.direccion?.ciudad || ''} - ${taller.direccion?.calle || ''}</p>
                        <div style="display:flex; gap:15px; margin-top:8px;">
                            <span style="color:#888; font-size:0.75rem;">🔧 ${taller.bahiasDisponibles || 0} bahías libres</span>
                            <span style="color:#888; font-size:0.75rem;">🛠️ ${taller.servicios?.length || 0} servicios</span>
                        </div>
                    </div>
                    <span style="font-size:1.5rem; color:${seleccionado ? '#00ff88' : '#888'};">${seleccionado ? '✅' : '→'}</span>
                </div>
            </div>`;
        }).join('');
    }

    // ================================================================
    // 🔹 VINCULAR / DESVINCULAR
    // ================================================================

    /**
     * Vincularse a un taller
     */
    async vincular(tallerId) {
        try {
            this.mostrarToast('⏳ Vinculando taller...', 'info');

            const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
            const clienteId = sesion._id || sesion.usuario?._id || sesion.id;
            const token = sesion.token || '';
            const API_BASE = window.API_URL || 'http://localhost:3000/api';

            console.log('🔗 Vinculando taller:', tallerId, '→ cliente:', clienteId);

            if (!clienteId || !token) {
                this.mostrarToast('❌ Sesión no válida', 'error');
                return;
            }

            // ⭐ 1. Guardar en backend
            const response = await fetch(
                `${API_BASE}/clientes/${clienteId}/vincular-taller`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ tallerId })
                }
            );

            const data = await response.json();

            if (!data.exito) {
                this.mostrarToast('❌ ' + (data.mensaje || 'Error al vincular'), 'error');
                return;
            }

            console.log('✅ Backend: taller vinculado');

            // ⭐ 2. Guardar en localStorage
            this.tallerVinculado = data.taller;
            localStorage.setItem('taller_vinculado', JSON.stringify(data.taller));

            // ⭐ 3. Actualizar UI
            this.actualizarInterfaz();
            this.dispararEvento('tallerVinculado', data.taller);
            this.mostrarToast('✅ Taller vinculado correctamente', 'success');

        } catch (error) {
            console.error('❌ Error vinculando:', error);
            this.mostrarToast('❌ Error al vincular taller', 'error');
        }
    }

    /**
     * Desvincular taller
     */
    async desvincular(silencioso = false) {
        if (!silencioso && !confirm('¿Desvincular este taller?')) {
            return;
        }

        try {
            const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
            const clienteId = sesion._id || sesion.usuario?._id || sesion.id;
            const token = sesion.token || '';
            const API_BASE = window.API_URL || 'http://localhost:3000/api';

            console.log('🔓 Desvinculando taller (cliente:', clienteId, ')');

            // ⭐ 1. Desvincular en backend
            if (clienteId && token) {
                try {
                    await fetch(
                        `${API_BASE}/clientes/${clienteId}/desvincular-taller`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );
                    console.log('✅ Backend: taller desvinculado');
                } catch (e) {
                    console.warn('⚠️ Error backend:', e.message);
                }
            }

            // ⭐ 2. Limpiar localStorage
            this.tallerVinculado = null;
            localStorage.removeItem('taller_vinculado');

            // ⭐ 3. Actualizar UI
            this.actualizarInterfaz();

            if (!silencioso) {
                this.mostrarToast('🔓 Taller desvinculado', 'info');
            }

            this.dispararEvento('tallerDesvinculado', null);

        } catch (error) {
            console.error('❌ Error desvinculando:', error);
        }
    }

    /**
     * Sincronizar vinculación con el servidor
     */
    async sincronizarConServidor(tallerId) {
        try {
            const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
            if (sesion.email) {
                await apiFetch(`/usuarios/sincronizar/${sesion.email}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tallerVinculado: tallerId })
                });
            }
        } catch (error) {
            console.warn('⚠️ No se pudo sincronizar con servidor:', error.message);
        }
    }

    // ================================================================
    // 🔹 INTERFAZ
    // ================================================================

    /**
     * Actualizar toda la interfaz con el taller vinculado
     */
    actualizarInterfaz() {
        this.actualizarHeaderSelector();
        this.actualizarPlanes();
        this.actualizarServicios();
        this.actualizarBadgePlan();
    }

    /**
     * Actualizar el selector del header
     */
    actualizarHeaderSelector() {
        const nombreEl = document.getElementById('taller-actual-nombre');
        const btnDesvincular = document.getElementById('taller-btn-desvincular');

        if (this.tallerVinculado) {
            if (nombreEl) {
                nombreEl.textContent = this.tallerVinculado.nombre;
                nombreEl.style.color = '#00ff88';
                nombreEl.style.fontWeight = '600';
            }
            if (btnDesvincular) {
                btnDesvincular.style.display = 'inline-block';
                btnDesvincular.style.color = '#ff4444';
            }
        } else {
            if (nombreEl) {
                nombreEl.textContent = 'Seleccionar mi taller';
                nombreEl.style.color = '#888';
                nombreEl.style.fontWeight = '400';
            }
            if (btnDesvincular) {
                btnDesvincular.style.display = 'none';
            }
        }
    }

    /**
     * Actualizar la sección de planes
     */
    async actualizarPlanes() {
        const contenedor = document.getElementById('contenedor-planes-cards');
        if (!contenedor) return;

        if (!this.tallerVinculado) {
            contenedor.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; color:#888;">
                    <span style="font-size:3rem;">🏪</span>
                    <p>Selecciona un taller para ver sus planes</p>
                    <button onclick="window.tallerManager.mostrarSelector()" 
                        style="margin-top:10px; padding:10px 20px; background:#00ff88; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                        Seleccionar Taller
                    </button>
                </div>`;
            return;
        }

        contenedor.innerHTML = '<p style="color:#888; text-align:center; grid-column:1/-1;">⏳ Cargando planes...</p>';

        try {
            const response = await apiFetch(`/talleres/${this.tallerVinculado._id}/planes`);
            const data = await response.json();

            if (data.exito && data.planes.length > 0) {
                const nivelIcono = { 'BASICO': '🥉', 'NORMAL': '🥈', 'PREMIUM': '🥇', 'VIP': '💎', 'PERSONALIZADO': '🔧' };
                const nivelColor = { 'BASICO': '#00ff88', 'NORMAL': '#00d4ff', 'PREMIUM': '#ffbb33', 'VIP': '#ff44ff', 'PERSONALIZADO': '#888' };

                contenedor.innerHTML = data.planes
                    .filter(p => p.activo !== false)
                    .map(plan => {
                        const color = nivelColor[plan.nivel] || '#ffbb33';
                        const icono = nivelIcono[plan.nivel] || '📦';
                        let serviciosIncluidos = [];
                        try { serviciosIncluidos = plan.descripcion ? JSON.parse(plan.descripcion) : []; } catch (e) { }

                        return `
                        <div class="plan-card" style="background:#131c2b; border:2px solid ${color}30; border-radius:15px; padding:25px; text-align:center;">
                            <span style="font-size:2.5rem;">${icono}</span>
                            <h3 style="color:#fff; margin:10px 0;">${plan.nombre}</h3>
                            <span style="background:${color}15; color:${color}; padding:4px 12px; border-radius:20px; font-size:0.75rem;">${plan.nivel || 'NORMAL'}</span>
                            <p style="color:${color}; font-weight:700; font-size:1.5rem; margin:12px 0;">RD$ ${plan.precio?.toLocaleString()}</p>
                            <p style="color:#888; font-size:0.8rem;">${plan.serviciosIncluidos} servicios · ${plan.duracionDias || 30} días</p>
                            ${serviciosIncluidos.length > 0 ? `
                            <div style="background:#080c14; border-radius:8px; padding:10px; margin:10px 0; text-align:left;">
                                ${serviciosIncluidos.slice(0, 4).map(s => `
                                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; padding:2px 0; color:#aaa;">
                                        <span>🔧 ${s.nombre}</span>
                                        <span>RD$ ${s.precio}</span>
                                    </div>`).join('')}
                            </div>` : ''}
                            <button onclick="window.comprarPlanWeb?.('${plan._id}', '${this.tallerVinculado._id}')" 
                                style="width:100%; padding:12px; background:${color}; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.9rem; margin-top:10px;">
                                🛒 COMPRAR PLAN
                            </button>
                        </div>`;
                    }).join('');
            } else {
                contenedor.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:#888;">
                        <span style="font-size:3rem;">📦</span>
                        <p>${this.tallerVinculado.nombre} no tiene planes configurados todavía</p>
                    </div>`;
            }
        } catch (error) {
            contenedor.innerHTML = '<p style="color:#ff4444; grid-column:1/-1; text-align:center;">Error al cargar planes</p>';
        }
    }

    /**
     * Actualizar servicios en el modal de agendar
     */
    async actualizarServicios() {
        if (!this.tallerVinculado) return;

        // Si existe la función global para cargar servicios
        if (typeof window.cargarServiciosDelTaller === 'function') {
            await window.cargarServiciosDelTaller(this.tallerVinculado._id);
        }
    }

    /**
     * Actualizar badge del plan
     */
    actualizarBadgePlan() {
        const badge = document.getElementById('badge-plan');
        if (badge && this.tallerVinculado) {
            badge.textContent = `🏪 ${this.tallerVinculado.nombre}`;
        }
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    /**
     * Obtener el taller vinculado
     */
    getTaller() {
        return this.tallerVinculado;
    }

    /**
     * Verificar si hay taller vinculado
     */
    tieneTallerVinculado() {
        return this.tallerVinculado !== null;
    }

    /**
     * Obtener ID del taller vinculado
     */
    getTallerId() {
        return this.tallerVinculado?._id || null;
    }

    /**
     * Mostrar toast
     */
    mostrarToast(mensaje, tipo = 'info') {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(mensaje, tipo);
        } else {
            console.log(`[${tipo}] ${mensaje}`);
        }
    }

    /**
     * Escuchar eventos
     */
    on(evento, callback) {
        this.eventListeners.push({ evento, callback });
    }

    /**
     * Disparar evento
     */
    dispararEvento(evento, data) {
        this.eventListeners
            .filter(l => l.evento === evento)
            .forEach(l => l.callback(data));
    }

    desvincular(silencioso = false) {
        if (!silencioso && !confirm('¿Desvincular este taller? Podrás volver a vincularte cuando quieras.')) {
            return;
        }

        this.tallerVinculado = null;
        localStorage.removeItem('taller_vinculado');
        this.actualizarInterfaz();

        if (!silencioso) {
            this.mostrarToast('🔓 Taller desvinculado', 'info');
        }

        this.dispararEvento('tallerDesvinculado', null);
    }
}

export default TallerVinculadoManager;