// ====================================================================
// 📊 MÓDULO DE PANEL PRINCIPAL - AUTOBRILLO DETALLING
//    Dashboard con stats premium, bahías y próximas citas
// ====================================================================

// ================================================================
// 🔹 CARGAR DASHBOARD
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export async function cargarDashboard() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/dashboard`);
        const data = await response.json();

        if (data.exito) {
            document.getElementById('citas-hoy').textContent = data.citasHoy || 0;
            document.getElementById('en-proceso').textContent = data.enProceso || 0;
            document.getElementById('completados-hoy').textContent = data.completadosHoy || 0;
            document.getElementById('ingresos-dia').textContent = `RD$ ${(data.ingresosDia || 0).toLocaleString()}`;

            renderizarBahiasStatus(data.bahias || [], colorTaller);
            renderizarProximasCitas(data.proximasCitas || [], colorTaller);
        }
    } catch (error) {
        console.error('Error dashboard:', error);
    }
}

// ================================================================
// 🔹 ACTUALIZAR DASHBOARD SUAVE (sin parpadeo)
// ================================================================

export async function actualizarDashboardSuave() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/dashboard`);
        const data = await response.json();
        if (!data.exito) return;

        const elementos = {
            'citas-hoy': data.citasHoy || 0,
            'en-proceso': data.enProceso || 0,
            'completados-hoy': data.completadosHoy || 0,
            'ingresos-dia': `RD$ ${(data.ingresosDia || 0).toLocaleString()}`
        };

        Object.entries(elementos).forEach(([id, valor]) => {
            const el = document.getElementById(id);
            if (el && el.textContent !== String(valor)) {
                el.textContent = valor;
                el.style.color = colorTaller;
                el.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    el.style.color = '';
                    el.style.transform = 'scale(1)';
                }, 300);
            }
        });
    } catch (error) { /* silencioso */ }
}

// ================================================================
// 🔹 RENDERIZAR ESTADO DE BAHÍAS
// ================================================================

function renderizarBahiasStatus(bahias, colorTaller) {
    const container = document.getElementById('bahias-status');
    if (!container) return;

    if (bahias.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted, #888); text-align:center; padding:20px;">No hay bahías configuradas</p>';
        return;
    }

    container.innerHTML = bahias.map(bahia => {
        const estadoColor = bahia.estado === 'DISPONIBLE' ? '#00ff88' : bahia.estado === 'OCUPADA' ? '#ff4444' : '#ffbb33';
        const estadoIcono = bahia.estado === 'DISPONIBLE' ? '🟢' : bahia.estado === 'OCUPADA' ? '🔴' : '🟡';
        const empleado = bahia.empleadoAsignado?.nombre || 'Sin asignar';

        return `
        <div onclick="window.irABahias?.()" style="background:linear-gradient(180deg, var(--bg-card, #131c2b) 0%, var(--bg-input, #0a0e14) 100%); border:2px solid ${estadoColor}30; border-radius:14px; padding:16px; cursor:pointer; transition:all 0.3s;"
            onmouseover="this.style.borderColor='${colorTaller}88'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px ${colorTaller}10';"
            onmouseout="this.style.borderColor='${estadoColor}30'; this.style.transform='translateY(0)'; this.style.boxShadow='none';"
            title="Click para ir a la sección de Bahías">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.3rem;">🏗️</span>
                    <strong style="color:var(--text-primary, #fff); font-size:0.9rem;">${bahia.nombre || 'Bahía #' + bahia.numero}</strong>
                </div>
                <span style="background:${estadoColor}18; color:${estadoColor}; padding:4px 12px; border-radius:15px; font-size:0.7rem; font-weight:600;">${estadoIcono} ${bahia.estado}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted, #888); font-size:0.75rem;">👨‍🔧 ${empleado}</span>
                <span style="color:${estadoColor}; font-weight:700; font-size:1.2rem;">#${bahia.numero}</span>
            </div>
            <!-- Indicador visual de clicable -->
            <div style="position:absolute; bottom:8px; right:8px; display:none;" class="bahia-panel-arrow">
                <span style="color:${colorTaller}; font-size:0.8rem;">→</span>
            </div>
        </div>`;
    }).join('');
}

// ================================================================
// 🔹 IR A LA SECCIÓN DE BAHÍAS
// ================================================================

export function irABahias() {
    // Usar la función de navegación existente
    if (typeof window.cambiarSeccion === 'function') {
        window.cambiarSeccion('bahias', '🏗️ Administración de Bahías');
        // Cargar las bahías
        if (typeof window.cargarBahias === 'function') {
            window.cargarBahias();
        }
    } else {
        // Fallback: click en el link del sidebar
        const linkBahias = document.querySelector('[data-section="bahias"]');
        if (linkBahias) linkBahias.click();
    }
}
// ================================================================
// 🔹 RENDERIZAR PRÓXIMAS CITAS
// ================================================================

function renderizarProximasCitas(citas, colorTaller) {
    const container = document.getElementById('proximas-citas');
    if (!container) return;

    if (citas.length === 0) {
        container.innerHTML = '<p class="empty-state" style="color:var(--text-muted, #888); text-align:center; padding:20px;">No hay citas pendientes para hoy</p>';
        return;
    }

    const estadoColores = {
        'PENDIENTE': '#ff8800', 'CONFIRMADA': '#00d4ff', 'EN_RECEPCION': '#ffbb33',
        'EN_PROCESO': '#00d4ff', 'LISTO': '#ff44ff', 'ENTREGADO': '#00ff88'
    };

    container.innerHTML = citas.slice(0, 5).map(cita => {
        const eColor = estadoColores[cita.estado] || '#888';

        return `
        <div onclick="window.irACitas?.('${cita.fecha || ''}')" 
            style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--border-light, #1e2a3a22); cursor:pointer; transition:all 0.3s; border-radius:8px;"
            onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.03))'; this.style.paddingLeft='16px'; this.style.borderLeft='3px solid ${colorTaller}';"
            onmouseout="this.style.background='transparent'; this.style.paddingLeft='12px'; this.style.borderLeft='3px solid transparent';"
            title="Click para ir a la sección de Citas">
            
            <div style="width:40px; height:40px; background:${eColor}15; border:2px solid ${eColor}40; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">🚗</div>
            
            <div style="flex:1; min-width:0;">
                <strong style="color:var(--text-primary, #fff); font-size:0.85rem;">${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}</strong>
                <div style="color:var(--text-muted, #888); font-size:0.72rem;">
                    🕐 ${cita.hora || '--:--'} | 👤 ${cita.cliente || 'Cliente'}
                </div>
            </div>
            
            <span style="background:${eColor}15; color:${eColor}; padding:4px 10px; border-radius:12px; font-size:0.65rem; font-weight:600; white-space:nowrap;">${cita.estado}</span>
            
            <!-- Flecha indicadora -->
            <span style="color:${colorTaller}; font-size:0.9rem; opacity:0; transition:all 0.3s;" class="cita-panel-arrow">→</span>
        </div>`;
    }).join('');

    // ✅ Mostrar flecha al hacer hover
    container.querySelectorAll('.cita-panel-item').forEach(item => {
        item.addEventListener('mouseenter', function () {
            const arrow = this.querySelector('.cita-panel-arrow');
            if (arrow) arrow.style.opacity = '1';
        });
        item.addEventListener('mouseleave', function () {
            const arrow = this.querySelector('.cita-panel-arrow');
            if (arrow) arrow.style.opacity = '0';
        });
    });
}
// ================================================================
// 🔹 IR A LA SECCIÓN DE CITAS CON FECHA ESPECÍFICA
// ================================================================

export function irACitas(fecha = null) {
    // Usar la función de navegación existente
    if (typeof window.cambiarSeccion === 'function') {
        window.cambiarSeccion('citas', '📅 Gestión de Citas');

        // Establecer fecha si existe
        if (fecha) {
            const inputFecha = document.getElementById('filtro-fecha');
            if (inputFecha) {
                inputFecha.value = fecha;
                inputFecha.dispatchEvent(new Event('change'));
            }
        }

        // Cargar las citas
        if (typeof window.cargarCitas === 'function') {
            setTimeout(() => window.cargarCitas(), 200);
        }
    } else {
        // Fallback: click en el link del sidebar
        const linkCitas = document.querySelector('[data-section="citas"]');
        if (linkCitas) linkCitas.click();
    }
}
// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarPanel() {
    window.cargarDashboard = cargarDashboard;
    window.actualizarDashboardSuave = actualizarDashboardSuave;
    window.irABahias = irABahias;
    window.irACitas = irACitas;
    console.log('📊 Módulo de Panel Principal inicializado');
}