// ====================================================================
// 🖼️ GALERÍA DE TRABAJOS - Sistema Avanzado
// ====================================================================
import { apiFetch } from '../api-client.js';
export class GaleriaTrabajos {

    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
        this.fotosActuales = [];
        this.fotoActualIndex = 0;
        this.filtros = {
            busqueda: '',
            servicio: 'todos',
            fecha: 'todas',
            tipo: 'todas' // antes, durante, despues
        };
    }

    // ================================================================
    // 🔹 CARGAR GALERÍA
    // ================================================================

    async cargar() {
        const container = document.getElementById('contenedor-galeria');
        if (!container) return;

        container.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">⏳ Cargando galería...</p>';

        try {
            const userId = window.obtenerIdUsuario?.();
            const response = await apiFetch(`/mis-citas/${userId}`);
            const data = await response.json();

            if (data.exito && data.citas) {
                // Filtrar solo ENTREGADAS que tengan fotos
                const citasConFotos = data.citas.filter(c =>
                    c.estado === 'ENTREGADO' &&
                    ((c.fotos?.antes?.length > 0) ||
                        (c.fotos?.durante?.length > 0) ||
                        (c.fotos?.despues?.length > 0))
                );

                if (citasConFotos.length === 0) {
                    container.innerHTML = `
                        <div style="grid-column:1/-1; text-align:center; padding:60px; color:#888;">
                            <span style="font-size:5rem;">📸</span>
                            <h3 style="color:#fff; margin:15px 0;">No hay fotos todavía</h3>
                            <p>Tus trabajos completados con fotos aparecerán aquí</p>
                        </div>`;
                    return;
                }

                // Extraer todas las fotos con sus metadatos
                this.fotosActuales = this.extraerFotos(citasConFotos);

                // Renderizar
                this.renderizarGaleria(container);
                this.llenarFiltros(citasConFotos);
            }
        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444;text-align:center;">Error al cargar galería</p>';
        }
    }

    /**
     * Extraer fotos de las citas con metadatos
     */
    extraerFotos(citas) {
        const fotos = [];

        citas.forEach(cita => {
            const vehiculo = `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim();
            const placa = cita.vehiculo?.placa || '';
            const color = cita.vehiculo?.color || '';
            const servicio = cita.servicio?.nombre || cita.servicio || '';
            const fecha = cita.fecha || '';
            const hora = cita.hora || '';
            const calificacion = cita.calificacion?.puntuacion || 0;

            // ✅ NUEVA INFORMACIÓN
            const tallerNombre = cita.tallerId?.nombre || cita.sucursal || 'Taller';
            const tallerDireccion = cita.tallerId?.direccion?.ciudad || '';
            const empleadoNombre = cita.empleadoAsignado?.nombre || 'No asignado';
            const empleadoRol = cita.empleadoAsignado?.rol || '';
            const bahiaNumero = cita.bahiaAsignada || null;
            const montoPagado = cita.pago?.monto || cita.montoPagado || 0;
            const metodoPago = cita.pago?.metodo || cita.metodoPago || '';
            const duracion = cita.fechas?.inicioTrabajo && cita.fechas?.finalizacion
                ? this.calcularDuracion(cita.fechas.inicioTrabajo, cita.fechas.finalizacion)
                : '';
            const notas = cita.notas || [];

            // Fotos ANTES
            (cita.fotos?.antes || []).forEach((foto, i) => {
                fotos.push({
                    ...foto,
                    tipo: 'antes',
                    tipoLabel: '🔴 ANTES',
                    tipoColor: '#ff6b6b',
                    vehiculo, placa, color, servicio, fecha, hora, calificacion,
                    tallerNombre, tallerDireccion, empleadoNombre, empleadoRol,
                    bahiaNumero, montoPagado, metodoPago, duracion, notas,
                    citaId: cita._id, index: i
                });
            });

            // Fotos DURANTE
            (cita.fotos?.durante || []).forEach((foto, i) => {
                fotos.push({
                    ...foto,
                    tipo: 'durante',
                    tipoLabel: '🟡 DURANTE',
                    tipoColor: '#ffbb33',
                    vehiculo, placa, color, servicio, fecha, hora, calificacion,
                    tallerNombre, tallerDireccion, empleadoNombre, empleadoRol,
                    bahiaNumero, montoPagado, metodoPago, duracion, notas,
                    citaId: cita._id, index: i
                });
            });

            // Fotos DESPUÉS
            (cita.fotos?.despues || []).forEach((foto, i) => {
                fotos.push({
                    ...foto,
                    tipo: 'despues',
                    tipoLabel: '🟢 DESPUÉS',
                    tipoColor: '#6bff6b',
                    vehiculo, placa, color, servicio, fecha, hora, calificacion,
                    tallerNombre, tallerDireccion, empleadoNombre, empleadoRol,
                    bahiaNumero, montoPagado, metodoPago, duracion, notas,
                    citaId: cita._id, index: i
                });
            });
        });

        return fotos;
    }

    /**
     * Calcular duración entre dos fechas
     */
    calcularDuracion(inicio, fin) {
        const diff = new Date(fin) - new Date(inicio);
        const minutos = Math.floor(diff / 60000);
        if (minutos < 60) return `${minutos} min`;
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}min`;
    }

    /**
     * Llenar filtros
     */
    llenarFiltros(citas) {
        // Servicios únicos
        const servicios = [...new Set(citas.map(c => c.servicio?.nombre || c.servicio).filter(Boolean))];
        const selectServicio = document.getElementById('filtro-galeria-servicio');
        if (selectServicio) {
            selectServicio.innerHTML = '<option value="todos">🔧 Todos los servicios</option>' +
                servicios.map(s => `<option value="${s}">${s}</option>`).join('');
        }

        // Años únicos
        const años = [...new Set(citas.map(c => c.fecha?.substring(0, 4)).filter(Boolean))].sort().reverse();
        const selectFecha = document.getElementById('filtro-galeria-fecha');
        if (selectFecha) {
            selectFecha.innerHTML = '<option value="todas">📅 Todas las fechas</option>' +
                años.map(a => `<option value="${a}">${a}</option>`).join('');
        }
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    /**
     * Renderizar galería completa
     */
    renderizarGaleria(container) {
        // Aplicar filtros
        let fotos = [...this.fotosActuales];

        if (this.filtros.busqueda) {
            const b = this.filtros.busqueda.toLowerCase();
            fotos = fotos.filter(f =>
                f.vehiculo.toLowerCase().includes(b) ||
                f.placa.toLowerCase().includes(b) ||
                f.servicio.toLowerCase().includes(b)
            );
        }

        if (this.filtros.servicio !== 'todos') {
            fotos = fotos.filter(f => f.servicio === this.filtros.servicio);
        }

        if (this.filtros.fecha !== 'todas') {
            fotos = fotos.filter(f => f.fecha?.startsWith(this.filtros.fecha));
        }

        if (this.filtros.tipo !== 'todas') {
            fotos = fotos.filter(f => f.tipo === this.filtros.tipo);
        }

        if (fotos.length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:40px;grid-column:1/-1;">🔍 No se encontraron fotos con esos filtros</p>';
            return;
        }

        // Ordenar por fecha (más recientes primero)
        fotos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        container.innerHTML = fotos.map((foto, index) => this.renderizarFotoCard(foto, index)).join('');
    }

    /**
     * Renderizar una tarjeta de foto
     */
    renderizarFotoCard(foto, index) {
        const fecha = foto.fecha ? new Date(foto.fecha).toLocaleDateString('es-DO', {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : '';

        return `
    <div class="galeria-card" onclick="window.galeriaTrabajos.abrirLightbox(${index})"
        style="background:#131c2b; border:1px solid #1e2a3a; border-radius:16px; overflow:hidden; cursor:pointer; transition:all 0.3s; break-inside:avoid; margin-bottom:15px;"
        onmouseover="this.style.borderColor='#00ff88'; this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(0,255,136,0.1)';"
        onmouseout="this.style.borderColor='#1e2a3a'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
        
        <!-- Imagen -->
        <div style="position:relative; overflow:hidden; aspect-ratio:4/3;">
            <img src="${foto.url || foto}" 
                style="width:100%; height:100%; object-fit:cover; transition:all 0.5s;"
                onmouseover="this.style.transform='scale(1.05)'"
                onmouseout="this.style.transform='scale(1)'"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect fill=%22%23333%22 width=%22200%22 height=%22150%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
            
            <!-- Badge de tipo -->
            <span style="position:absolute; top:10px; left:10px; background:${foto.tipoColor}22; color:${foto.tipoColor}; padding:5px 10px; border-radius:20px; font-size:0.7rem; font-weight:600; backdrop-filter:blur(5px);">
                ${foto.tipoLabel}
            </span>
            
            <!-- Botón expandir -->
            <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.9rem; opacity:0; transition:all 0.3s;"
                class="btn-expandir">🔍</span>
        </div>
        
        <!-- Información -->
        <div style="padding:15px;">
            <!-- Vehículo y placa -->
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <div>
                    <h4 style="color:#fff; margin:0; font-size:0.9rem;">🚗 ${foto.vehiculo || 'Vehículo'}</h4>
                    <span style="color:#888; font-size:0.75rem;">🏷️ ${foto.placa || 'S/P'}</span>
                    ${foto.color ? `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${foto.color}; margin-left:5px;"></span>` : ''}
                </div>
                ${foto.calificacion > 0 ? `<span style="color:#ffbb33; font-size:0.8rem;">${'⭐'.repeat(foto.calificacion)}</span>` : ''}
            </div>
            
            <!-- Servicio y fecha -->
            <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #1e2a3a;">
                <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.75rem;">
                    <span>🔧</span><span>${foto.servicio || 'Servicio'}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.75rem;">
                    <span>📅</span><span>${fecha} ${foto.hora || ''}</span>
                    ${foto.duracion ? `<span style="color:#ffbb33;">· ⏱️ ${foto.duracion}</span>` : ''}
                </div>
            </div>
            
            <!-- Taller y empleado -->
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.75rem;">
                    <span>🏪</span><span>${foto.tallerNombre || 'Taller'}</span>
                    ${foto.tallerDireccion ? `<span style="color:#666;">· ${foto.tallerDireccion}</span>` : ''}
                </div>
                <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.75rem;">
                    <span>👨‍🔧</span><span>${foto.empleadoNombre || 'No asignado'}</span>
                    ${foto.empleadoRol ? `<span style="color:#666;">· ${foto.empleadoRol}</span>` : ''}
                </div>
                ${foto.bahiaNumero ? `
                <div style="display:flex; align-items:center; gap:6px; color:#8892a4; font-size:0.75rem;">
                    <span>🏗️</span><span>Bahía #${foto.bahiaNumero}</span>
                </div>` : ''}
                ${foto.montoPagado > 0 ? `
                <div style="display:flex; align-items:center; gap:6px; color:#00ff88; font-size:0.75rem; font-weight:600;">
                    <span>💰</span><span>RD$ ${foto.montoPagado.toLocaleString()}</span>
                    ${foto.metodoPago ? `<span style="color:#888; font-weight:400;">· ${foto.metodoPago}</span>` : ''}
                </div>` : ''}
            </div>
            
            ${foto.descripcion ? `<p style="color:#aaa; font-size:0.75rem; margin-top:8px; font-style:italic; padding-top:8px; border-top:1px solid #1e2a3a;">💬 "${foto.descripcion}"</p>` : ''}
        </div>
    </div>`;
    }

    // ================================================================
    // 🔹 LIGHTBOX
    // ================================================================

    /**
     * Abrir lightbox para ver foto en grande
     */
    abrirLightbox(index) {
        this.fotoActualIndex = index;
        this.renderizarLightbox();
    }

    /**
     * Renderizar lightbox
     */
    renderizarLightbox() {
        // Eliminar lightbox anterior si existe
        const anterior = document.getElementById('galeria-lightbox');
        if (anterior) anterior.remove();

        const foto = this.fotosActuales[this.fotoActualIndex];
        if (!foto) return;

        const lightbox = document.createElement('div');
        lightbox.id = 'galeria-lightbox';
        lightbox.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.95); z-index:100000;
            display:flex; align-items:center; justify-content:center;
            flex-direction:column;
            animation: fadeIn 0.3s ease;
        `;

        lightbox.innerHTML = `
            <!-- Botón cerrar -->
            <span onclick="document.getElementById('galeria-lightbox').remove()" 
                style="position:absolute; top:20px; right:30px; color:#fff; font-size:2rem; cursor:pointer; z-index:10;">&times;</span>
            
            <!-- Contador -->
            <span style="position:absolute; top:20px; left:30px; color:#888; font-size:0.9rem; z-index:10;">
                ${this.fotoActualIndex + 1} / ${this.fotosActuales.length}
            </span>
            
            <!-- Flecha anterior -->
            ${this.fotoActualIndex > 0 ? `
            <span onclick="window.galeriaTrabajos.navegarLightbox(-1)" 
                style="position:absolute; left:20px; top:50%; transform:translateY(-50%); color:#fff; font-size:3rem; cursor:pointer; z-index:10; padding:20px;">❮</span>` : ''}
            
            <!-- Flecha siguiente -->
            ${this.fotoActualIndex < this.fotosActuales.length - 1 ? `
            <span onclick="window.galeriaTrabajos.navegarLightbox(1)" 
                style="position:absolute; right:20px; top:50%; transform:translateY(-50%); color:#fff; font-size:3rem; cursor:pointer; z-index:10; padding:20px;">❯</span>` : ''}
            
            <!-- Imagen principal -->
            <div style="max-width:90vw; max-height:70vh; display:flex; align-items:center; justify-content:center;">
                <img src="${foto.url || foto}" 
                    style="max-width:90vw; max-height:70vh; object-fit:contain; border-radius:10px;"
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
            </div>
            
         <!-- Información -->
<div style="max-width:650px; width:90%; margin-top:20px; text-align:center; background:#131c2b; border:1px solid #1e2a3a; border-radius:16px; padding:20px;">
    <!-- Tipo y calificación -->
    <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:10px;">
        <span style="background:${foto.tipoColor}22; color:${foto.tipoColor}; padding:5px 15px; border-radius:20px; font-size:0.8rem; font-weight:600;">
            ${foto.tipoLabel}
        </span>
        ${foto.calificacion > 0 ? `<span style="color:#ffbb33;">${'⭐'.repeat(foto.calificacion)}</span>` : ''}
    </div>
    
    <!-- Vehículo -->
    <h3 style="color:#fff; margin:0 0 5px; font-size:1.1rem;">🚗 ${foto.vehiculo} (${foto.placa})</h3>
    
    <!-- Detalles en grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:15px 0; text-align:left;">
        <div style="color:#888; font-size:0.8rem;">🔧 Servicio:</div>
        <div style="color:#fff; font-size:0.8rem;">${foto.servicio}</div>
        
        <div style="color:#888; font-size:0.8rem;">📅 Fecha:</div>
        <div style="color:#fff; font-size:0.8rem;">${foto.fecha ? new Date(foto.fecha).toLocaleDateString('es-DO') : ''} ${foto.hora || ''}</div>
        
        ${foto.duracion ? `
        <div style="color:#888; font-size:0.8rem;">⏱️ Duración:</div>
        <div style="color:#ffbb33; font-size:0.8rem;">${foto.duracion}</div>` : ''}
        
        <div style="color:#888; font-size:0.8rem;">🏪 Taller:</div>
        <div style="color:#fff; font-size:0.8rem;">${foto.tallerNombre}</div>
        
        <div style="color:#888; font-size:0.8rem;">👨‍🔧 Empleado:</div>
        <div style="color:#fff; font-size:0.8rem;">${foto.empleadoNombre} ${foto.empleadoRol ? `(${foto.empleadoRol})` : ''}</div>
        
        ${foto.bahiaNumero ? `
        <div style="color:#888; font-size:0.8rem;">🏗️ Bahía:</div>
        <div style="color:#fff; font-size:0.8rem;">#${foto.bahiaNumero}</div>` : ''}
        
        ${foto.montoPagado > 0 ? `
        <div style="color:#888; font-size:0.8rem;">💰 Monto:</div>
        <div style="color:#00ff88; font-size:0.8rem; font-weight:600;">RD$ ${foto.montoPagado.toLocaleString()} ${foto.metodoPago ? `(${foto.metodoPago})` : ''}</div>` : ''}
    </div>
    
    ${foto.descripcion ? `<p style="color:#aaa; margin-top:10px; font-style:italic; padding-top:10px; border-top:1px solid #1e2a3a;">💬 "${foto.descripcion}"</p>` : ''}
</div>
        `;

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.remove();
        });

        document.body.appendChild(lightbox);

        // Teclas de navegación
        document.addEventListener('keydown', this.teclasLightbox);
    }

    /**
     * Navegar en el lightbox
     */
    navegarLightbox(direccion) {
        this.fotoActualIndex += direccion;
        if (this.fotoActualIndex < 0) this.fotoActualIndex = 0;
        if (this.fotoActualIndex >= this.fotosActuales.length) this.fotoActualIndex = this.fotosActuales.length - 1;
        this.renderizarLightbox();
    }

    /**
     * Manejar teclas del lightbox
     */
    teclasLightbox(e) {
        if (e.key === 'Escape') {
            document.getElementById('galeria-lightbox')?.remove();
            document.removeEventListener('keydown', window.galeriaTrabajos.teclasLightbox);
        }
        if (e.key === 'ArrowLeft') window.galeriaTrabajos.navegarLightbox(-1);
        if (e.key === 'ArrowRight') window.galeriaTrabajos.navegarLightbox(1);
    }

    // ================================================================
    // 🔹 FILTROS
    // ================================================================

    /**
     * Aplicar filtros
     */
    aplicarFiltros() {
        this.filtros.busqueda = document.getElementById('busqueda-galeria')?.value || '';
        this.filtros.servicio = document.getElementById('filtro-galeria-servicio')?.value || 'todos';
        this.filtros.fecha = document.getElementById('filtro-galeria-fecha')?.value || 'todas';
        this.filtros.tipo = document.getElementById('filtro-galeria-tipo')?.value || 'todas';

        const container = document.getElementById('contenedor-galeria');
        if (container) this.renderizarGaleria(container);
    }

    /**
     * Limpiar filtros
     */
    limpiarFiltros() {
        const busqueda = document.getElementById('busqueda-galeria');
        const servicio = document.getElementById('filtro-galeria-servicio');
        const fecha = document.getElementById('filtro-galeria-fecha');
        const tipo = document.getElementById('filtro-galeria-tipo');

        if (busqueda) busqueda.value = '';
        if (servicio) servicio.value = 'todos';
        if (fecha) fecha.value = 'todas';
        if (tipo) tipo.value = 'todas';

        this.filtros = { busqueda: '', servicio: 'todos', fecha: 'todas', tipo: 'todas' };

        const container = document.getElementById('contenedor-galeria');
        if (container) this.renderizarGaleria(container);
    }
}

export default GaleriaTrabajos;