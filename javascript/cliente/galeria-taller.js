// ====================================================================
// 📸 GALERÍA DEL TALLER - Explorar Talleres
// ====================================================================
import { apiFetch } from '../api-client.js';
export class GaleriaTaller {

    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
        this.fotosCache = {}; // Cache de fotos por tallerId
    }

    // ================================================================
    // 🔹 CARGAR GALERÍA
    // ================================================================

    /**
     * Cargar galería de un taller
     */
    async cargar(tallerId) {
        const container = document.getElementById(`galeria-content-${tallerId}`);
        if (!container) return;

        container.innerHTML = '<p style="color:#888; grid-column:1/-1; text-align:center; padding:20px;">⏳ Cargando fotos...</p>';

        try {
            const response = await apiFetch(`/talleres/${tallerId}/citas`);
            const data = await response.json();

            if (!data.exito || !data.citas) {
                container.innerHTML = '<p style="color:#888; grid-column:1/-1; text-align:center; padding:30px;">📭 No hay trabajos disponibles</p>';
                return;
            }

            // Filtrar citas con fotos
            const citasConFotos = data.citas.filter(c =>
                (c.fotos?.antes?.length > 0) ||
                (c.fotos?.durante?.length > 0) ||
                (c.fotos?.despues?.length > 0)
            );

            if (citasConFotos.length === 0) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">
                        <span style="font-size:4rem;">📸</span>
                        <p>Este taller no tiene fotos de trabajos todavía</p>
                    </div>`;
                return;
            }

            // Extraer fotos
            const fotos = this.extraerFotos(citasConFotos);

            // Guardar en cache
            this.fotosCache[tallerId] = fotos;

            // Renderizar
            this.renderizarGrid(fotos, container, tallerId);

        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444; grid-column:1/-1;">Error al cargar fotos</p>';
        }
    }

    /**
     * Extraer fotos de las citas
     */
    extraerFotos(citas) {
        const fotos = [];

        citas.forEach(cita => {
            const vehiculo = `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim();
            const placa = cita.vehiculo?.placa || '';
            const color = cita.vehiculo?.color || '';
            const servicio = cita.servicio?.nombre || 'Servicio';
            const fecha = cita.fecha || '';
            const hora = cita.hora || '';
            const empleado = cita.empleadoAsignado?.nombre || 'No asignado';
            const empleadoRol = cita.empleadoAsignado?.rol || '';
            const bahia = cita.bahiaAsignada || null;
            const monto = cita.pago?.monto || cita.montoPagado || 0;
            const metodoPago = cita.pago?.metodo || '';
            const calificacion = cita.calificacion?.puntuacion || 0;
            const comentario = cita.calificacion?.comentario || '';
            const duracion = this.calcularDuracion(cita.fechas?.inicioTrabajo, cita.fechas?.finalizacion);
            const cliente = cita.clienteId?.nombre || 'Cliente';

            const infoComun = {
                vehiculo, placa, color, servicio, fecha, hora,
                empleado, empleadoRol, bahia, monto, metodoPago,
                calificacion, comentario, duracion, cliente,
                citaId: cita._id
            };

            // Fotos ANTES
            (cita.fotos?.antes || []).forEach(foto => {
                fotos.push({
                    ...infoComun,
                    url: foto.url,
                    descripcion: foto.descripcion || '',
                    tipo: 'antes',
                    tipoLabel: '🔴 ANTES',
                    tipoColor: '#ff6b6b'
                });
            });

            // Fotos DURANTE
            (cita.fotos?.durante || []).forEach(foto => {
                fotos.push({
                    ...infoComun,
                    url: foto.url,
                    descripcion: foto.descripcion || '',
                    tipo: 'durante',
                    tipoLabel: '🟡 DURANTE',
                    tipoColor: '#ffbb33'
                });
            });

            // Fotos DESPUÉS
            (cita.fotos?.despues || []).forEach(foto => {
                fotos.push({
                    ...infoComun,
                    url: foto.url,
                    descripcion: foto.descripcion || '',
                    tipo: 'despues',
                    tipoLabel: '🟢 DESPUÉS',
                    tipoColor: '#6bff6b'
                });
            });
        });

        // Ordenar por fecha
        fotos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return fotos;
    }

    /**
     * Calcular duración
     */
    calcularDuracion(inicio, fin) {
        if (!inicio || !fin) return '';
        const diff = new Date(fin) - new Date(inicio);
        const minutos = Math.floor(diff / 60000);
        if (minutos < 60) return `${minutos}min`;
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return `${h}h ${m}min`;
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    /**
     * Renderizar grid de fotos
     */
    renderizarGrid(fotos, container, tallerId) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        container.style.gap = '8px';

        container.innerHTML = fotos.map((foto, index) => this.renderizarFotoCard(foto, index, tallerId)).join('');
    }

    /**
     * Renderizar una tarjeta de foto
     */
    renderizarFotoCard(foto, index, tallerId) {
        return `
        <div onclick="window.galeriaTaller.abrirLightbox('${tallerId}', ${index})" 
            style="position:relative; border-radius:12px; overflow:hidden; cursor:pointer; aspect-ratio:4/3; background:#080c14; transition:all 0.3s;"
            onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.5)'; this.querySelector('.foto-overlay').style.opacity='1';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.querySelector('.foto-overlay').style.opacity='0';">
            
            <!-- Imagen -->
            <img src="${foto.url}" 
                style="width:100%; height:100%; object-fit:cover; transition:transform 0.5s;"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect fill=%22%23333%22 width=%22200%22 height=%22150%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
            
            <!-- Badge tipo -->
            <span style="position:absolute; top:8px; left:8px; background:${foto.tipoColor}33; color:${foto.tipoColor}; padding:3px 8px; border-radius:10px; font-size:0.6rem; font-weight:600;">
                ${foto.tipoLabel}
            </span>
            
            <!-- Overlay con info -->
            <div class="foto-overlay" style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent, rgba(0,0,0,0.95)); padding:25px 10px 10px; opacity:0; transition:opacity 0.3s;">
                <p style="color:#fff; font-size:0.75rem; margin:0; font-weight:600;">🚗 ${foto.vehiculo}</p>
                <p style="color:#ccc; font-size:0.7rem; margin:3px 0 0;">🔧 ${foto.servicio}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                    <span style="color:#888; font-size:0.65rem;">👨‍🔧 ${foto.empleado}</span>
                    ${foto.calificacion > 0 ? `<span style="color:#ffbb33; font-size:0.7rem;">${'⭐'.repeat(foto.calificacion)}</span>` : ''}
                </div>
            </div>
        </div>`;
    }

    // ================================================================
    // 🔹 LIGHTBOX
    // ================================================================

    /**
     * Abrir lightbox
     */
    abrirLightbox(tallerId, index) {
        const fotos = this.fotosCache[tallerId];
        if (!fotos || fotos.length === 0) return;

        const foto = fotos[index];
        if (!foto) return;

        // Eliminar lightbox anterior
        const anterior = document.getElementById('galeria-taller-lightbox');
        if (anterior) anterior.remove();

        const lightbox = document.createElement('div');
        lightbox.id = 'galeria-taller-lightbox';
        lightbox.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.95); z-index:100000;
            display:flex; align-items:center; justify-content:center;
            flex-direction:column;
        `;

        lightbox.innerHTML = this.renderizarLightbox(foto, index, fotos.length, tallerId);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.remove();
        });

        document.body.appendChild(lightbox);

        // Teclas
        this.configurarTeclas(tallerId, index, fotos.length);
    }

    /**
     * Renderizar lightbox
     */
    renderizarLightbox(foto, index, total, tallerId) {
        const fecha = foto.fecha ? new Date(foto.fecha).toLocaleDateString('es-DO', {
            year: 'numeric', month: 'long', day: 'numeric'
        }) : '';

        return `
            <!-- Botón cerrar -->
            <span onclick="document.getElementById('galeria-taller-lightbox').remove()" 
                style="position:absolute; top:20px; right:30px; color:#fff; font-size:2rem; cursor:pointer; z-index:10;">&times;</span>
            
            <!-- Contador -->
            <span style="position:absolute; top:20px; left:30px; color:#888; z-index:10;">
                ${index + 1} / ${total}
            </span>
            
            <!-- Flechas -->
            ${index > 0 ? `<span onclick="document.getElementById('galeria-taller-lightbox').remove(); window.galeriaTaller.abrirLightbox('${tallerId}', ${index - 1})" 
                style="position:absolute; left:20px; top:50%; transform:translateY(-50%); color:#fff; font-size:3rem; cursor:pointer; z-index:10;">❮</span>` : ''}
            
            ${index < total - 1 ? `<span onclick="document.getElementById('galeria-taller-lightbox').remove(); window.galeriaTaller.abrirLightbox('${tallerId}', ${index + 1})" 
                style="position:absolute; right:20px; top:50%; transform:translateY(-50%); color:#fff; font-size:3rem; cursor:pointer; z-index:10;">❯</span>` : ''}
            
            <!-- Imagen -->
            <img src="${foto.url}" 
                style="max-width:90vw; max-height:60vh; object-fit:contain; border-radius:10px;"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
            
            <!-- Info -->
            <div style="max-width:550px; width:90%; margin-top:20px; background:#131c2b; border:1px solid #1e2a3a; border-radius:16px; padding:20px; text-align:center;">
                <span style="background:${foto.tipoColor}22; color:${foto.tipoColor}; padding:5px 15px; border-radius:20px; font-size:0.8rem;">${foto.tipoLabel}</span>
                
                <h3 style="color:#fff; margin:10px 0 5px;">🚗 ${foto.vehiculo} (${foto.placa})</h3>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:12px 0; text-align:left; font-size:0.8rem;">
                    <span style="color:#888;">🔧 Servicio:</span><span style="color:#fff;">${foto.servicio}</span>
                    <span style="color:#888;">📅 Fecha:</span><span style="color:#fff;">${fecha} ${foto.hora}</span>
                    ${foto.duracion ? `<span style="color:#888;">⏱️ Duración:</span><span style="color:#ffbb33;">${foto.duracion}</span>` : ''}
                    <span style="color:#888;">👨‍🔧 Empleado:</span><span style="color:#fff;">${foto.empleado}</span>
                    ${foto.bahia ? `<span style="color:#888;">🏗️ Bahía:</span><span style="color:#fff;">#${foto.bahia}</span>` : ''}
                    ${foto.monto > 0 ? `<span style="color:#888;">💰 Monto:</span><span style="color:#00ff88; font-weight:600;">RD$ ${foto.monto.toLocaleString()}</span>` : ''}
                    ${foto.calificacion > 0 ? `<span style="color:#888;">⭐ Calificación:</span><span style="color:#ffbb33;">${'⭐'.repeat(foto.calificacion)}</span>` : ''}
                </div>
                
                ${foto.descripcion ? `<p style="color:#aaa; font-style:italic; padding-top:10px; border-top:1px solid #1e2a3a;">💬 "${foto.descripcion}"</p>` : ''}
            </div>
        `;
    }

    /**
     * Configurar teclas de navegación
     */
    configurarTeclas(tallerId, index, total) {
        const handler = (e) => {
            if (e.key === 'Escape') {
                document.getElementById('galeria-taller-lightbox')?.remove();
                document.removeEventListener('keydown', handler);
            }
            if (e.key === 'ArrowLeft' && index > 0) {
                document.getElementById('galeria-taller-lightbox')?.remove();
                document.removeEventListener('keydown', handler);
                this.abrirLightbox(tallerId, index - 1);
            }
            if (e.key === 'ArrowRight' && index < total - 1) {
                document.getElementById('galeria-taller-lightbox')?.remove();
                document.removeEventListener('keydown', handler);
                this.abrirLightbox(tallerId, index + 1);
            }
        };
        document.addEventListener('keydown', handler);
    }
}

export default GaleriaTaller;