/**
 * ============================================================================
 * 💳 MÓDULO DE PLANES: Render, comprar
 * ============================================================================
 */

// ============================================================================
// RENDERIZAR PLANES
// ============================================================================
export async function renderizarPlanes() {
    if (window.tallerManager?.tieneTallerVinculado()) {
        await window.tallerManager.actualizarPlanes();
        return;
    }

    const contenedor = document.getElementById('contenedor-planes-cards');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">
            <span style="font-size:4rem;">🏪</span>
            <h3 style="color:#fff; margin:15px 0;">Selecciona tu taller de confianza</h3>
            <p style="margin-bottom:20px;">Vincula un taller para ver sus planes exclusivos</p>
            <button onclick="window.tallerManager.mostrarSelector()" 
                style="padding:14px 30px; background:#00ff88; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:1rem;">
                🏪 Seleccionar Mi Taller
            </button>
        </div>`;
}

// ============================================================================
// COMPRAR PLAN
// ============================================================================
export async function comprarPlanWeb(planId, tallerId) {
    const clienteId = window.obtenerIdUsuario?.() || window.user?._id || window.user?.id;

    if (!clienteId) {
        window.mostrarToast?.('⚠️ Debes iniciar sesión', 'warning');
        return;
    }

    try {
        const API_BASE = window.API_URL || 'http://localhost:3000/api';
        const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
        const token = sesion.token || '';

        const planRes = await fetch(`${API_BASE}/talleres/${tallerId}/planes`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const planData = await planRes.json();
        const plan = planData.planes?.find(p => p._id === planId);

        if (!plan) {
            window.mostrarToast?.('❌ Plan no encontrado', 'error');
            return;
        }

        mostrarModalComprarPlan(plan, planId, tallerId, clienteId, token);
    } catch (error) {
        console.error('❌ Error:', error);
        window.mostrarToast?.('❌ Error al cargar plan', 'error');
    }
}

// ============================================================================
// MODAL DE COMPRA
// ============================================================================
function mostrarModalComprarPlan(plan, planId, tallerId, clienteId, token) {
    document.getElementById('modal-comprar-plan')?.remove();

    const modalHTML = `
        <div id="modal-comprar-plan" 
             style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background:#0f1621; border:2px solid #1e2a3a; border-radius:20px; max-width:450px; width:100%; padding:0; overflow:hidden;"
                 onclick="event.stopPropagation()">
                <div style="padding:25px; background:linear-gradient(135deg, #ffbb3310, #ff880005); border-bottom:1px solid #1e2a3a; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:10px;">💳</div>
                    <h2 style="color:#fff; margin:0 0 5px; font-size:1.4rem;">Confirmar Compra</h2>
                    <p style="color:#888; margin:0; font-size:0.85rem;">¿Deseas contratar este plan?</p>
                </div>
                <div style="padding:25px;">
                    <div style="background:#131c2b; border-radius:12px; padding:20px; margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                            <div>
                                <h3 style="color:#fff; margin:0 0 5px; font-size:1.2rem;">📦 ${plan.nombre}</h3>
                            </div>
                            <div style="text-align:right;">
                                <div style="color:#ffbb33; font-size:1.8rem; font-weight:800;">RD$ ${(plan.precio || 0).toLocaleString()}</div>
                                <small style="color:#888; font-size:0.75rem;">${plan.duracionDias || 30} días</small>
                            </div>
                        </div>
                        <div style="display:flex; gap:15px; padding-top:15px; border-top:1px solid #1e2a3a; flex-wrap:wrap;">
                            <div style="flex:1; text-align:center;">
                                <div style="color:#00ff88; font-size:1.3rem; font-weight:700;">${plan.serviciosIncluidos || 0}</div>
                                <small style="color:#888; font-size:0.65rem;">SERVICIOS</small>
                            </div>
                            ${plan.numeroLavados > 0 ? `
                            <div style="flex:1; text-align:center;">
                                <div style="color:#00d4ff; font-size:1.3rem; font-weight:700;">${plan.numeroLavados}</div>
                                <small style="color:#888; font-size:0.65rem;">🧽 LAVADOS</small>
                            </div>` : ''}
                        </div>
                    </div>
                    <div style="background:#131c2b; border-radius:12px; padding:15px; margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#888; font-size:0.85rem;">💰 Tu saldo:</span>
                            <span style="color:#00ff88; font-weight:700; font-size:1.1rem;">RD$ ${(window.user?.saldo || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('modal-comprar-plan').remove()"
                            style="flex:1; padding:14px; background:transparent; border:1px solid #333; color:#fff; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.9rem;">
                            ❌ Cancelar
                        </button>
                        <button id="btn-confirmar-compra-plan"
                            onclick="ejecutarCompraPlan('${planId}', '${tallerId}', '${clienteId}', '${token}', '${plan.nombre}', ${plan.serviciosIncluidos || 0})"
                            style="flex:2; padding:14px; background:#00ff88; border:none; color:#000; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.9rem;">
                            ✅ Confirmar Compra
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================================
// EJECUTAR COMPRA
// ============================================================================
export async function ejecutarCompraPlan(planId, tallerId, clienteId, token, planNombre, serviciosIncluidos) {
    const btn = document.getElementById('btn-confirmar-compra-plan');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Procesando...'; }

    try {
        const API_BASE = window.API_URL || 'http://localhost:3000/api';

        const response = await fetch(
            `${API_BASE}/talleres/${tallerId}/clientes/${clienteId}/planes/${planId}/contratar`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ metodoPago: 'EFECTIVO' })
            }
        );

        const data = await response.json();

        if (!data.exito) {
            window.mostrarToast?.(`❌ ${data.mensaje || 'Error'}`, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '✅ Confirmar Compra'; }
            return;
        }

        document.getElementById('modal-comprar-plan')?.remove();

        if (window.user) {
            window.user.planActual = data.suscripcion.nombre || planNombre;
            window.user.serviciosDisponibles = serviciosIncluidos;
            window.persistirUsuario?.();
            window.actualizarInterfaz?.(window.user);
        }

        window.mostrarToast?.(`✅ ¡Plan "${planNombre}" contratado!`, 'success', 5000);

        setTimeout(() => {
            renderizarPlanes();
            window.cargarMiTaller?.();
        }, 1000);
    } catch (error) {
        console.error('❌ Error:', error);
        window.mostrarToast?.(`❌ Error: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '✅ Confirmar Compra'; }
    }
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.renderizarPlanes = renderizarPlanes;
window.comprarPlanWeb = comprarPlanWeb;
window.ejecutarCompraPlan = ejecutarCompraPlan;

console.log('✅ Módulo planes.js cargado');