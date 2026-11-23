// ====================================================================
// 📊 MÓDULO DE RENDIMIENTO - AUTOBRILLO DETALLING
//    Dashboard profesional con KPIs, gráficos y temas personalizados
// ====================================================================

// ================================================================
// 🔹 CARGAR RENDIMIENTO ANUAL
// ================================================================
import { API_URL } from '../config.js';
import { apiFetch } from '../api-client.js';
export async function cargarRendimiento() {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    const container = document.getElementById('rendimiento-mensual');
    if (!container) return;

    const año = document.getElementById('filtro-año')?.value || new Date().getFullYear();
    container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px;">
            <div style="font-size:3rem; margin-bottom:15px; animation: pulse 1.5s infinite;">⏳</div>
            <p style="color: var(--text-secondary, #888);">Cargando rendimiento...</p>
        </div>`;

    try {
        const [respActual, respAnterior] = await Promise.all([
            apiFetch(`/talleres/${tallerActual._id}/rendimiento?año=${año}`),
            apiFetch(`/talleres/${tallerActual._id}/rendimiento?año=${parseInt(año) - 1}`)
        ]);

        const dataActual = await respActual.json();
        const dataAnterior = await respAnterior.json();

        if (!dataActual.exito) {
            container.innerHTML = '<p style="color:#ff4444; grid-column:1/-1; text-align:center;">Error al cargar</p>';
            return;
        }

        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mesActual = new Date().getMonth();

        // Cálculos
        const totalIngresos = dataActual.rendimientoMensual.reduce((sum, m) => sum + m.totalIngresos, 0);
        const totalTrabajos = dataActual.rendimientoMensual.reduce((sum, m) => sum + m.totalTrabajos, 0);
        const totalIngresosAnterior = dataAnterior.exito ? dataAnterior.rendimientoMensual.reduce((sum, m) => sum + m.totalIngresos, 0) : 0;
        const crecimientoAnual = totalIngresosAnterior > 0 ? Math.round(((totalIngresos - totalIngresosAnterior) / totalIngresosAnterior) * 100) : 0;
        const ticketPromedio = totalTrabajos > 0 ? Math.round(totalIngresos / totalTrabajos) : 0;
        const ingresosMesActual = dataActual.rendimientoMensual[mesActual]?.totalIngresos || 0;
        const diaActual = new Date().getDate();
        const diasDelMes = new Date(año, mesActual + 1, 0).getDate();
        const proyeccionCierre = diaActual > 0 ? Math.round((ingresosMesActual / diaActual) * diasDelMes) : 0;
        const diasRestantes = diasDelMes - diaActual;
        const maxIngreso = Math.max(...dataActual.rendimientoMensual.map(m => m.totalIngresos), 1);
        const mejorMes = dataActual.rendimientoMensual.reduce((mejor, m) => m.totalIngresos > (mejor?.totalIngresos || 0) ? m : mejor, null);

        // Ranking empleados
        const todosEmpleados = {};
        dataActual.rendimientoMensual.forEach(mes => {
            mes.empleados?.forEach(emp => {
                if (!todosEmpleados[emp.nombre]) {
                    todosEmpleados[emp.nombre] = { nombre: emp.nombre, trabajos: 0, ingresos: 0 };
                }
                todosEmpleados[emp.nombre].trabajos += emp.trabajos;
                todosEmpleados[emp.nombre].ingresos += emp.ingresos;
            });
        });
        const ranking = Object.values(todosEmpleados).sort((a, b) => b.ingresos - a.ingresos);
        const empleadoTop = ranking[0];

        let html = '';

        // ========== HEADER CON AÑO ==========
        html += `
        <div style="grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
                <h2 style="color:var(--text-primary, #fff); margin:0; font-size:1.3rem;">📊 Panel de Rendimiento</h2>
                <p style="color:var(--text-secondary, #888); margin:5px 0 0; font-size:0.8rem;">Análisis detallado del año ${año}</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="background:${colorTaller}22; color:${colorTaller}; padding:6px 15px; border-radius:20px; font-size:0.8rem; font-weight:600;">
                    📅 Año Fiscal ${año}
                </span>
            </div>
        </div>`;

        // ========== KPIs PRINCIPALES ==========
        html += `
        <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
            <!-- Ingresos Totales -->
            <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:2px solid ${colorTaller}40; border-radius:18px; padding:22px; position:relative; overflow:hidden; transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px ${colorTaller}20';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-secondary, #888); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">💰 Ingresos Totales</div>
                        <div style="font-size:1.8rem; font-weight:800; color:${colorTaller};">RD$ ${totalIngresos.toLocaleString()}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted, #888); margin-top:5px;">
                            ${crecimientoAnual >= 0 ? '📈' : '📉'} <span style="color:${crecimientoAnual >= 0 ? '#00ff88' : '#ff4444'}; font-weight:600;">${crecimientoAnual >= 0 ? '+' : ''}${crecimientoAnual}%</span> vs ${parseInt(año) - 1}
                        </div>
                    </div>
                    <div style="font-size:2.5rem; opacity:0.3;">💰</div>
                </div>
            </div>
            
            <!-- Ticket Promedio -->
            <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:2px solid #00d4ff40; border-radius:18px; padding:22px; position:relative; overflow:hidden; transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px #00d4ff20';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-secondary, #888); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🎫 Ticket Promedio</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#00d4ff;">RD$ ${ticketPromedio.toLocaleString()}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted, #888); margin-top:5px;">${totalTrabajos} servicios realizados</div>
                    </div>
                    <div style="font-size:2.5rem; opacity:0.3;">🎫</div>
                </div>
            </div>
            
            <!-- Mejor Mes -->
            <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:2px solid #ffbb3340; border-radius:18px; padding:22px; position:relative; overflow:hidden; transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px #ffbb3320';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-secondary, #888); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🏆 Mejor Mes</div>
                        <div style="font-size:1.4rem; font-weight:800; color:#ffbb33;">${mejorMes?.nombre || 'N/A'}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted, #888); margin-top:5px;">RD$ ${(mejorMes?.totalIngresos || 0).toLocaleString()}</div>
                    </div>
                    <div style="font-size:2.5rem; opacity:0.3;">🏆</div>
                </div>
            </div>
            
            <!-- Proyección -->
            <div style="background:linear-gradient(135deg, #ff44ff20, #ff44ff05); border:2px solid #ff44ff40; border-radius:18px; padding:22px; position:relative; overflow:hidden; transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px #ff44ff20';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-secondary, #888); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🔮 Proyección Cierre</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#ff44ff;">RD$ ${proyeccionCierre.toLocaleString()}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted, #888); margin-top:5px;">${diasRestantes} días restantes del mes</div>
                    </div>
                    <div style="font-size:2.5rem; opacity:0.3;">🔮</div>
                </div>
            </div>
        </div>`;

        // ========== EMPLEADO DEL MES ==========
        if (empleadoTop) {
            html += `
            <div style="grid-column:1/-1; background:linear-gradient(135deg, ${colorTaller}15, ${colorTaller}05); border:2px solid ${colorTaller}30; border-radius:18px; padding:20px; margin-bottom:25px; display:flex; align-items:center; gap:15px;">
                <div style="font-size:3rem;">👑</div>
                <div style="flex:1;">
                    <div style="font-size:0.7rem; color:var(--text-secondary, #888); text-transform:uppercase; letter-spacing:1px;">Empleado Destacado del Año</div>
                    <div style="font-size:1.3rem; font-weight:700; color:var(--text-primary, #fff);">${empleadoTop.nombre}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary, #aaa);">RD$ ${empleadoTop.ingresos.toLocaleString()} generados · ${empleadoTop.trabajos} trabajos</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:1.5rem; font-weight:800; color:${colorTaller};">${ranking[0].ingresos > 0 ? Math.round((empleadoTop.ingresos / totalIngresos) * 100) : 0}%</div>
                    <div style="font-size:0.7rem; color:var(--text-muted, #888);">del total</div>
                </div>
            </div>`;
        }

        // ========== GRÁFICO DE BARRAS ==========
        html += `
        <div style="grid-column:1/-1; background:var(--bg-card, #131c2b); border:1px solid var(--border-color, #1e2a3a); border-radius:18px; overflow:hidden;">
            <div style="padding:20px 25px; border-bottom:1px solid var(--border-color, #1e2a3a); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:var(--text-primary, #fff); font-size:1rem;">📊 Ingresos Mensuales ${año}</h3>
                <div style="display:flex; gap:12px; align-items:center;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="width:10px; height:10px; background:${colorTaller}; border-radius:2px;"></span>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">${año}</small>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="width:10px; height:10px; background:var(--text-muted, #555); border-radius:2px;"></span>
                        <small style="color:var(--text-secondary, #888); font-size:0.7rem;">${parseInt(año) - 1}</small>
                    </div>
                </div>
            </div>
            <div style="padding:25px;">`;

        dataActual.rendimientoMensual.forEach((mes, index) => {
            const porcentaje = maxIngreso > 0 ? Math.round((mes.totalIngresos / maxIngreso) * 100) : 0;
            const esMesActual = index === mesActual;
            const ingresosMes = mes.totalIngresos || 0;
            const trabajosMes = mes.totalTrabajos || 0;
            const ingresosAnterior = dataAnterior.exito ? (dataAnterior.rendimientoMensual[index]?.totalIngresos || 0) : 0;
            const pctAnterior = maxIngreso > 0 ? Math.round((ingresosAnterior / maxIngreso) * 100) : 0;
            const topEmpleado = mes.empleados?.sort((a, b) => b.ingresos - a.ingresos)[0];

            html += `
            <div class="mes-clickeable" data-mes="${index}" data-nombre="${mes.nombre}" 
                style="margin-bottom:16px; cursor:pointer; transition:all 0.3s; ${esMesActual ? 'background:' + colorTaller + '08; border:1px solid ' + colorTaller + '25; border-radius:12px; padding:14px;' : 'padding:10px; border-radius:12px;'}" 
                onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.03))'" 
                onmouseout="this.style.background='${esMesActual ? colorTaller + '08' : 'transparent'}'"
                title="Clic para ver detalle diario de ${mes.nombre}">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:600; color:var(--text-primary, #fff); min-width:75px; font-size:0.9rem;">📅 ${mes.nombre.substring(0, 3)}</span>
                        ${esMesActual ? `<span style="background:${colorTaller}22; color:${colorTaller}; padding:3px 8px; border-radius:10px; font-size:0.6rem; font-weight:600;">ACTUAL</span>` : ''}
                        ${ingresosMes === 0 && !esMesActual ? '<span style="color:var(--text-muted, #666); font-size:0.7rem;">Sin datos</span>' : ''}
                    </div>
                    <div style="text-align:right;">
                        <span style="color:${colorTaller}; font-weight:700; font-size:0.9rem;">RD$ ${ingresosMes.toLocaleString()}</span>
                        <span style="color:var(--text-secondary, #888); font-size:0.7rem; margin-left:8px;">${trabajosMes} trab.</span>
                    </div>
                </div>
                
                <div style="display:flex; gap:6px; align-items:flex-end; height:22px;">
                    <div style="flex:1; background:#1a1a1a; border-radius:8px; height:20px; overflow:hidden; position:relative;">
                        <div style="background:${esMesActual ? 'linear-gradient(90deg, ' + colorTaller + ', ' + colorTaller + '88)' : 'linear-gradient(90deg, ' + colorTaller + '99, ' + colorTaller + '55)'}; height:100%; width:${porcentaje}%; border-radius:8px; transition: width 1s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);">
                        </div>
                        ${porcentaje > 20 ? `<span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:0.6rem; color:#000; font-weight:700;">${porcentaje}%</span>` : ''}
                    </div>
                    <div style="width:35%; background:#1a1a1a; border-radius:5px; height:10px; overflow:hidden; opacity:0.4;">
                        <div style="background:var(--text-muted, #666); height:100%; width:${pctAnterior}%; border-radius:5px;"></div>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-top:6px;">
                    ${topEmpleado ? `<small style="color:#ffbb33; font-size:0.65rem;">🏆 ${topEmpleado.nombre}: RD$ ${topEmpleado.ingresos.toLocaleString()}</small>` : '<small></small>'}
                    ${ingresosAnterior > 0 ? `<small style="color:var(--text-secondary, #888); font-size:0.65rem;">${parseInt(año) - 1}: RD$ ${ingresosAnterior.toLocaleString()}</small>` : ''}
                </div>
            </div>`;
        });

        html += `</div></div>`;

        // ========== RANKING EMPLEADOS ==========
        if (ranking.length > 0) {
            html += `
            <div style="grid-column:1/-1; background:var(--bg-card, #131c2b); border:1px solid var(--border-color, #1e2a3a); border-radius:18px; overflow:hidden; margin-top:20px;">
                <div style="padding:20px 25px; border-bottom:1px solid var(--border-color, #1e2a3a);">
                    <h3 style="margin:0; color:var(--text-primary, #fff); font-size:1rem;">🏆 Ranking de Empleados ${año}</h3>
                </div>
                <div style="padding:20px 25px;">`;

            ranking.slice(0, 8).forEach((emp, index) => {
                const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
                const colores = ['#ffbb33', '#c0c0c0', '#cd7f32', '#888', '#888', '#888', '#888', '#888'];
                const pctAporte = totalIngresos > 0 ? Math.round((emp.ingresos / totalIngresos) * 100) : 0;
                const pctBarra = ranking[0].ingresos > 0 ? Math.round((emp.ingresos / ranking[0].ingresos) * 100) : 0;

                html += `
                <div style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-light, #1e2a3a22); ${index === 0 ? 'background:' + colorTaller + '05; border-radius:8px; padding:12px;' : ''}">
                    <span style="font-size:1.5rem; min-width:35px; text-align:center;">${medallas[index] || '👤'}</span>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <strong style="color:var(--text-primary, #fff); font-size:0.9rem;">${emp.nombre}</strong>
                            <span style="color:${colores[index]}; font-weight:700; font-size:0.9rem;">RD$ ${emp.ingresos.toLocaleString()}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; background:#1a1a1a; border-radius:4px; height:6px; overflow:hidden;">
                                <div style="background:linear-gradient(90deg, ${colores[index]}, ${colores[index]}88); height:100%; width:${pctBarra}%; border-radius:4px; transition: width 0.8s ease;"></div>
                            </div>
                            <small style="color:var(--text-secondary, #888); font-size:0.7rem; min-width:35px;">${pctAporte}%</small>
                            <small style="color:var(--text-muted, #666); font-size:0.7rem; min-width:60px;">${emp.trabajos} trabajos</small>
                        </div>
                    </div>
                </div>`;
            });

            html += `</div></div>`;
        }

        if (totalTrabajos === 0) {
            html = '<div style="grid-column:1/-1; text-align:center; padding:80px 20px;"><div style="font-size:5rem; margin-bottom:15px;">📭</div><h3 style="color:var(--text-primary, #fff); margin:10px 0;">Sin datos de rendimiento</h3><p style="color:var(--text-secondary, #888);">No hay trabajos registrados para ' + año + '</p></div>';
        }

        container.innerHTML = html;

        // Eventos para detalle diario
        document.querySelectorAll('.mes-clickeable').forEach(mesDiv => {
            mesDiv.addEventListener('click', async function () {
                const mesIndex = parseInt(this.dataset.mes);
                const mesNombre = this.dataset.nombre;
                await cargarDetalleMes(mesIndex, mesNombre, año);
            });
        });

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p style="color:#ff4444; grid-column:1/-1; text-align:center; padding:40px;">Error al cargar rendimiento</p>';
    }
}

// ================================================================
// 🔹 CARGAR DETALLE DIARIO DEL MES (MEJORA VISUAL)
// ================================================================

export async function cargarDetalleMes(mesIndex, mesNombre, año) {
    const tallerActual = JSON.parse(localStorage.getItem('taller_sesion'));

    const colorTaller = tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';

    const anterior = document.getElementById('modal-detalle-mes');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-detalle-mes';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%; 
        background:rgba(0,0,0,0.92); backdrop-filter:blur(12px);
        display:flex; align-items:center; justify-content:center; 
        z-index:10000; animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background:var(--bg-card, #0f1621); 
            border:2px solid ${colorTaller}40; 
            border-radius:24px; 
            padding:0;
            max-width:800px; 
            width:95%; 
            max-height:88vh; 
            overflow-y:auto;
            box-shadow:0 25px 80px rgba(0,0,0,0.7), 0 0 60px ${colorTaller}15;
            animation:slideUp 0.35s ease;
        ">
            <!-- Encabezado con gradiente -->
            <div style="
                background:linear-gradient(135deg, ${colorTaller}18, ${colorTaller}05);
                padding:25px 30px;
                border-bottom:1px solid ${colorTaller}30;
                display:flex; justify-content:space-between; align-items:center;
                position:sticky; top:0; z-index:10;
                border-radius:24px 24px 0 0;
            ">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="
                        width:50px; height:50px;
                        background:${colorTaller}22;
                        border:2px solid ${colorTaller};
                        border-radius:16px;
                        display:flex; align-items:center; justify-content:center;
                        font-size:1.5rem;
                    ">📅</div>
                    <div>
                        <h3 style="color:var(--text-primary, #fff); margin:0; font-size:1.2rem;">${mesNombre} ${año}</h3>
                        <span style="color:${colorTaller}; font-size:0.8rem; font-weight:600;">Detalle Diario de Trabajos</span>
                    </div>
                </div>
                <span onclick="document.getElementById('modal-detalle-mes').remove()" style="
                    font-size:1.3rem; cursor:pointer; 
                    color:var(--text-muted, #888); 
                    width:40px; height:40px; 
                    display:flex; align-items:center; justify-content:center; 
                    border-radius:50%; transition:all 0.3s;
                    background:rgba(255,255,255,0.03);
                " onmouseover="this.style.background='#ff444433'; this.style.color='#ff4444';" 
                  onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='#888';">✕</span>
            </div>
            
            <!-- Contenido -->
            <div style="padding:25px 30px;" id="detalle-dias-content">
                <div style="text-align:center; padding:50px;">
                    <div style="font-size:3rem; margin-bottom:15px; animation:pulse 1.5s infinite;">⏳</div>
                    <p style="color:var(--text-secondary, #888);">Cargando detalle...</p>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes slideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }
            @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        </style>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

    try {
        const response = await apiFetch(`/talleres/${tallerActual._id}/citas`);
        const data = await response.json();
        if (!data.exito) {
            document.getElementById('detalle-dias-content').innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar datos</p>';
            return;
        }

        const inicioMes = new Date(año, mesIndex, 1);
        const finMes = new Date(año, mesIndex + 1, 1);
        const citasMes = data.citas.filter(c => {
            const fecha = new Date(c.fechas?.entrega || c.fechas?.cita || c.createdAt);
            return fecha >= inicioMes && fecha < finMes && c.estado === 'ENTREGADO';
        });

        const diasDelMes = new Date(año, mesIndex + 1, 0).getDate();
        const diasAgrupados = {};
        for (let d = 1; d <= diasDelMes; d++) {
            const fechaStr = `${año}-${String(mesIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            diasAgrupados[fechaStr] = {
                fecha: fechaStr, dia: d,
                diaSemana: new Date(año, mesIndex, d).toLocaleDateString('es-DO', { weekday: 'short' }),
                trabajos: [], totalIngresos: 0, totalTrabajos: 0
            };
        }

        citasMes.forEach(cita => {
            const fechaCita = cita.fechas?.entrega
                ? new Date(cita.fechas.entrega).toISOString().split('T')[0]
                : new Date(cita.createdAt).toISOString().split('T')[0];
            if (diasAgrupados[fechaCita]) {
                diasAgrupados[fechaCita].trabajos.push({
                    id: cita._id, vehiculo: cita.vehiculo,
                    servicio: cita.servicio?.nombre,
                    monto: cita.pago?.monto || 0,
                    empleado: cita.empleadoAsignado?.nombre || 'N/A',
                    cliente: cita.clienteId?.nombre || 'Cliente'
                });
                diasAgrupados[fechaCita].totalIngresos += (cita.pago?.monto || 0);
                diasAgrupados[fechaCita].totalTrabajos++;
            }
        });

        const diasArray = Object.values(diasAgrupados).sort((a, b) => a.dia - b.dia);
        const totalIngresosMes = diasArray.reduce((s, d) => s + d.totalIngresos, 0);
        const totalTrabajosMes = diasArray.reduce((s, d) => s + d.totalTrabajos, 0);
        const diasConTrabajo = diasArray.filter(d => d.totalTrabajos > 0).length;
        const maxIngresoDia = Math.max(...diasArray.map(d => d.totalIngresos), 1);
        const diaMasProductivo = diasArray.reduce((mejor, d) => d.totalIngresos > (mejor?.totalIngresos || 0) ? d : mejor, null);

        // Empleado del mes
        const empleadosMes = {};
        diasArray.forEach(d => {
            d.trabajos.forEach(t => {
                if (!empleadosMes[t.empleado]) empleadosMes[t.empleado] = { nombre: t.empleado, trabajos: 0, ingresos: 0 };
                empleadosMes[t.empleado].trabajos++;
                empleadosMes[t.empleado].ingresos += t.monto;
            });
        });
        const topEmpleado = Object.values(empleadosMes).sort((a, b) => b.ingresos - a.ingresos)[0];

        const content = document.getElementById('detalle-dias-content');
        let html = `
        <!-- KPIs del mes -->
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:25px;">
            <div style="background:linear-gradient(135deg, ${colorTaller}20, ${colorTaller}05); border:1px solid ${colorTaller}40; border-radius:16px; padding:18px; text-align:center; transition:all 0.3s;" onmouseover="this.style.transform='translateY(-3px)';" onmouseout="this.style.transform='translateY(0)';">
                <div style="font-size:1.5rem; font-weight:800; color:${colorTaller};">RD$ ${totalIngresosMes.toLocaleString()}</div>
                <small style="color:var(--text-secondary, #888); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px;">💰 Total Ingresos</small>
            </div>
            <div style="background:linear-gradient(135deg, #00d4ff20, #00d4ff05); border:1px solid #00d4ff40; border-radius:16px; padding:18px; text-align:center; transition:all 0.3s;" onmouseover="this.style.transform='translateY(-3px)';" onmouseout="this.style.transform='translateY(0)';">
                <div style="font-size:1.5rem; font-weight:800; color:#00d4ff;">${totalTrabajosMes}</div>
                <small style="color:var(--text-secondary, #888); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px;">🔧 Total Trabajos</small>
            </div>
            <div style="background:linear-gradient(135deg, #ffbb3320, #ffbb3305); border:1px solid #ffbb3340; border-radius:16px; padding:18px; text-align:center; transition:all 0.3s;" onmouseover="this.style.transform='translateY(-3px)';" onmouseout="this.style.transform='translateY(0)';">
                <div style="font-size:1.5rem; font-weight:800; color:#ffbb33;">${diasConTrabajo}/${diasDelMes}</div>
                <small style="color:var(--text-secondary, #888); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px;">📅 Días Activos</small>
            </div>
            <div style="background:linear-gradient(135deg, #ff44ff20, #ff44ff05); border:1px solid #ff44ff40; border-radius:16px; padding:18px; text-align:center; transition:all 0.3s;" onmouseover="this.style.transform='translateY(-3px)';" onmouseout="this.style.transform='translateY(0)';">
                <div style="font-size:1.5rem; font-weight:800; color:#ff44ff;">RD$ ${diasConTrabajo > 0 ? Math.round(totalIngresosMes / diasConTrabajo).toLocaleString() : 0}</div>
                <small style="color:var(--text-secondary, #888); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px;">📊 Promedio/Día</small>
            </div>
        </div>`;

        // Banner de día más productivo + empleado top
        if (diaMasProductivo || topEmpleado) {
            html += `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:25px;">
                ${diaMasProductivo && diaMasProductivo.totalIngresos > 0 ? `
                <div style="background:linear-gradient(135deg, #ffbb3318, #ffbb3305); border:1px solid #ffbb3330; border-radius:16px; padding:18px; display:flex; align-items:center; gap:12px;">
                    <span style="font-size:2.2rem;">🔥</span>
                    <div>
                        <small style="color:#ffbb33; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.5px;">Día Más Productivo</small>
                        <div style="color:var(--text-primary, #fff); font-weight:700; font-size:1rem;">${diaMasProductivo.dia} de ${mesNombre}</div>
                        <div style="color:#ffbb33; font-size:0.85rem;">RD$ ${diaMasProductivo.totalIngresos.toLocaleString()} · ${diaMasProductivo.totalTrabajos} trabajos</div>
                    </div>
                </div>` : '<div></div>'}
                ${topEmpleado ? `
                <div style="background:linear-gradient(135deg, ${colorTaller}18, ${colorTaller}05); border:1px solid ${colorTaller}30; border-radius:16px; padding:18px; display:flex; align-items:center; gap:12px;">
                    <span style="font-size:2.2rem;">👑</span>
                    <div>
                        <small style="color:${colorTaller}; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.5px;">Empleado del Mes</small>
                        <div style="color:var(--text-primary, #fff); font-weight:700; font-size:1rem;">${topEmpleado.nombre}</div>
                        <div style="color:${colorTaller}; font-size:0.85rem;">RD$ ${topEmpleado.ingresos.toLocaleString()} · ${topEmpleado.trabajos} trabajos</div>
                    </div>
                </div>` : '<div></div>'}
            </div>`;
        }

        // Calendario de días
        html += `
        <h4 style="color:var(--text-primary, #fff); margin:0 0 15px; font-size:1rem; display:flex; align-items:center; gap:8px;">
            <span>📋</span> Desglose por Día
            <span style="font-size:0.7rem; color:var(--text-muted, #888); font-weight:normal; margin-left:auto;">${diasConTrabajo} días con actividad</span>
        </h4>
        <div style="display:grid; gap:6px;">`;

        diasArray.forEach(dia => {
            const porcentaje = maxIngresoDia > 0 ? Math.round((dia.totalIngresos / maxIngresoDia) * 100) : 0;
            const esHoy = new Date().toISOString().split('T')[0] === dia.fecha;
            const esFinSemana = ['sáb', 'dom'].includes(dia.diaSemana);
            const tieneActividad = dia.totalIngresos > 0;

            html += `
            <div style="
                padding:${tieneActividad ? '14px' : '10px 14px'}; 
                border-radius:12px; 
                transition:all 0.3s;
                ${esHoy ? 'background:' + colorTaller + '12; border:1px solid ' + colorTaller + '50;' :
                    tieneActividad ? 'background:var(--bg-input, #080c14); border:1px solid var(--border-color, #1e2a3a);' :
                        'border-bottom:1px solid var(--border-light, #1e2a3a33);'}
                ${esFinSemana && !tieneActividad ? 'opacity:0.4;' : ''}
                ${tieneActividad ? 'cursor:default;' : ''}
            " onmouseover="this.style.background='${tieneActividad ? 'var(--bg-hover, rgba(255,255,255,0.05))' : ''}'" 
               onmouseout="this.style.background='${esHoy ? colorTaller + '12' : tieneActividad ? 'var(--bg-input, #080c14)' : 'transparent'}'">
                
                <!-- Cabecera del día -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${tieneActividad ? '8px' : '0'};">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="
                            width:${esHoy ? '36px' : '32px'}; 
                            height:${esHoy ? '36px' : '32px'}; 
                            background:${esHoy ? colorTaller : tieneActividad ? colorTaller + '22' : 'transparent'}; 
                            border:${esHoy ? '2px solid ' + colorTaller : tieneActividad ? '1px solid ' + colorTaller + '44' : 'none'};
                            border-radius:${esHoy ? '12px' : '8px'};
                            display:flex; align-items:center; justify-content:center;
                            font-weight:700; 
                            color:${esHoy ? '#000' : tieneActividad ? colorTaller : 'var(--text-muted, #888)'}; 
                            font-size:${esHoy ? '0.9rem' : '0.85rem'};
                        ">${dia.dia}</div>
                        <div>
                            <span style="color:${esFinSemana ? '#ff4444' : 'var(--text-muted, #888)'}; font-size:0.7rem; text-transform:uppercase;">${dia.diaSemana}</span>
                            ${esHoy ? `<span style="background:${colorTaller}; color:#000; padding:2px 8px; border-radius:8px; font-size:0.6rem; font-weight:700; margin-left:6px;">HOY</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        ${tieneActividad ? `
                            <span style="color:${colorTaller}; font-weight:700; font-size:0.9rem;">RD$ ${dia.totalIngresos.toLocaleString()}</span>
                            <span style="color:var(--text-secondary, #888); font-size:0.7rem; margin-left:6px;">${dia.totalTrabajos} trab.</span>
                        ` : `
                            <span style="color:var(--text-muted, #555); font-size:0.75rem;">Sin actividad</span>
                        `}
                    </div>
                </div>
                
                ${tieneActividad ? `
                <!-- Barra de progreso -->
                <div style="background:#1a1a1a; border-radius:4px; height:5px; overflow:hidden; margin-bottom:10px;">
                    <div style="background:linear-gradient(90deg, ${colorTaller}, ${colorTaller}88, #00d4ff); height:100%; width:${porcentaje}%; border-radius:4px; transition:width 1s ease; box-shadow:0 0 8px ${colorTaller}40;"></div>
                </div>
                <!-- Lista de trabajos -->
                <div style="display:grid; gap:4px;">
                    ${dia.trabajos.map(t => `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:6px 10px; background:var(--bg-primary, #0a0e14); border-radius:8px; color:var(--text-secondary, #aaa);">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <span style="font-size:0.9rem;">🚗</span>
                            <span style="color:var(--text-primary, #ddd);">${t.vehiculo?.marca || ''} ${t.vehiculo?.modelo || ''}</span>
                            <small style="color:var(--text-muted, #888);">(${t.vehiculo?.placa || 'S/P'})</small>
                        </div>
                        <span style="color:var(--text-secondary, #aaa); margin:0 10px;">👤 ${t.empleado}</span>
                        <span style="color:#ffbb33; font-weight:700; min-width:80px; text-align:right;">RD$ ${t.monto.toLocaleString()}</span>
                    </div>`).join('')}
                </div>` : ''}
            </div>`;
        });

        html += `</div>`;
        content.innerHTML = html;

    } catch (error) {
        document.getElementById('detalle-dias-content').innerHTML = '<p style="color:#ff4444; text-align:center; padding:40px;">Error al cargar detalle</p>';
    }
}

// ================================================================
// 🔹 INICIALIZAR FUNCIONES GLOBALES
// ================================================================

export function inicializarRendimiento() {
    window.cargarRendimiento = cargarRendimiento;
    window.cargarDetalleMes = cargarDetalleMes;
    console.log('📊 Módulo de Rendimiento inicializado');
}