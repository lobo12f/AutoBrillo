// ====================================================================
// 🖼️ GALERÍA DEL TALLER - Estilo Instagram con temas personalizados
//    Incluye: Lightbox, comparativa Antes/Después, likes, menú,
//    carrusel, compartir fotos, descarga
// ====================================================================
import { apiFetch } from '../api-client.js';
export class GaleriaTaller {

    constructor(apiUrl, tallerActual) {
        this.API_URL = apiUrl;
        this._tallerActual = tallerActual;
        this.fotos = [];
        this.filtroActual = 'todas';
        this.busquedaActual = '';
        this.fechaDesde = null;
        this.fechaHasta = null;
        this.likes = {};
    }

    // ================================================================
    // 🔹 GETTERS
    // ================================================================

    get tallerActual() {
        if (this._tallerActual?._id) return this._tallerActual;
        if (window.tallerActual?._id) return window.tallerActual;
        return JSON.parse(localStorage.getItem('taller_sesion') || '{}');
    }

    get colorTaller() {
        return this.tallerActual?.color || localStorage.getItem('taller_color') || '#00ff88';
    }

    // ================================================================
    // 🔹 CARGAR
    // ================================================================

    async cargar() {
        const container = document.getElementById('galeria-taller-grid');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center; padding:60px; color:#888; column-span:all;">
                <span style="font-size:3rem; display:block; margin-bottom:15px;">⏳</span>
                Cargando galería...
            </div>`;

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/citas`);
            const data = await response.json();

            if (!data.exito || !data.citas) {
                container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; column-span:all;">📭 No hay citas disponibles</p>';
                return;
            }

            this.fotos = [];

            data.citas.forEach(cita => {
                const info = {
                    citaId: cita._id,
                    vehiculo: `${cita.vehiculo?.marca || ''} ${cita.vehiculo?.modelo || ''}`.trim(),
                    placa: cita.vehiculo?.placa || 'S/P',
                    color: cita.vehiculo?.color || '',
                    cliente: cita.clienteId?.nombre || 'Cliente',
                    servicio: cita.servicio?.nombre || 'Servicio',
                    fecha: cita.fecha || '',
                    hora: cita.hora || '',
                    estado: cita.estado,
                    empleado: cita.empleadoAsignado?.nombre || 'N/A',
                    calificacion: cita.calificacion?.puntuacion || 0,
                    monto: cita.pago?.monto || 0
                };

                (cita.fotos?.antes || []).forEach(foto => {
                    this.fotos.push({ ...info, url: foto.url, descripcion: foto.descripcion || '', tipo: 'antes', tipoLabel: '🔴 Antes', tipoColor: '#ff6b6b' });
                });

                (cita.fotos?.durante || []).forEach(foto => {
                    this.fotos.push({ ...info, url: foto.url, descripcion: foto.descripcion || '', tipo: 'durante', tipoLabel: '🟡 Durante', tipoColor: '#ffbb33' });
                });

                (cita.fotos?.despues || []).forEach(foto => {
                    this.fotos.push({ ...info, url: foto.url, descripcion: foto.descripcion || '', tipo: 'despues', tipoLabel: '🟢 Después', tipoColor: '#6bff6b' });
                });
            });

            this.fotos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            if (this.fotos.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:60px; color:#888; column-span:all;">
                        <span style="font-size:5rem;">📸</span>
                        <h3 style="color:#fff; margin:15px 0;">No hay fotos todavía</h3>
                        <p>Sube fotos desde la sección de Citas para verlas aquí</p>
                    </div>`;
                return;
            }

            this.likes = JSON.parse(localStorage.getItem('galeria_likes') || '{}');
            this.renderizar(container);

        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444; column-span:all;">Error al cargar</p>';
        }
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    renderizar(container) {
        let fotosFiltradas = [...this.fotos];
        const colorTaller = this.colorTaller;

        if (this.filtroActual !== 'todas') {
            fotosFiltradas = fotosFiltradas.filter(f => f.tipo === this.filtroActual);
        }
        if (this.fechaDesde) {
            fotosFiltradas = fotosFiltradas.filter(f => f.fecha >= this.fechaDesde);
        }
        if (this.fechaHasta) {
            fotosFiltradas = fotosFiltradas.filter(f => f.fecha <= this.fechaHasta);
        }
        if (this.busquedaActual) {
            const b = this.busquedaActual.toLowerCase();
            fotosFiltradas = fotosFiltradas.filter(f =>
                f.vehiculo.toLowerCase().includes(b) ||
                f.placa.toLowerCase().includes(b) ||
                f.cliente.toLowerCase().includes(b) ||
                f.servicio.toLowerCase().includes(b) ||
                f.empleado.toLowerCase().includes(b)
            );
        }

        document.getElementById('galeria-total-fotos').textContent = fotosFiltradas.length;
        const citasUnicas = new Set(fotosFiltradas.map(f => f.citaId));
        document.getElementById('galeria-total-citas').textContent = citasUnicas.size;

        if (fotosFiltradas.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px; color:#888; column-span:all;">
                    <span style="font-size:5rem;">📸</span>
                    <h3 style="color:#fff; margin:15px 0;">No se encontraron fotos</h3>
                    <p>${this.busquedaActual ? 'Prueba con otra búsqueda' : 'Sube fotos desde la sección de Citas'}</p>
                </div>`;
            return;
        }

        const citasAgrupadas = {};
        fotosFiltradas.forEach(foto => {
            if (!citasAgrupadas[foto.citaId]) {
                citasAgrupadas[foto.citaId] = [];
            }
            citasAgrupadas[foto.citaId].push(foto);
        });

        container.innerHTML = Object.values(citasAgrupadas).map(fotos =>
            this.renderizarPostInstagram(fotos, colorTaller)
        ).join('');
    }

    // ================================================================
    // 🔹 RENDERIZAR POST INSTAGRAM
    // ================================================================

    renderizarPostInstagram(fotos, colorTaller) {
        const primera = fotos[0];
        const fecha = primera.fecha ? new Date(primera.fecha).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const tieneMultiples = fotos.length > 1;
        const likeKey = primera.citaId;
        const tieneLike = this.likes[likeKey] || false;

        return `
        <div class="galeria-post" style="
            background: var(--bg-card, #131c2b); 
            border: 1px solid var(--border-color, #1e2a3a); 
            border-radius: 20px; 
            overflow: hidden; 
            break-inside: avoid; 
            margin-bottom: 15px; 
            transition: all 0.3s ease;
            position: relative;
        " onmouseover="this.style.borderColor='${colorTaller}'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px ${colorTaller}20';"
           onmouseout="this.style.borderColor='var(--border-color, #1e2a3a)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            
            <!-- Header -->
            <div style="display:flex; align-items:center; gap:10px; padding:12px 15px;">
                <div style="
                    width: 38px; height: 38px; 
                    border-radius: 50%; 
                    background: linear-gradient(135deg, ${colorTaller}, ${colorTaller}88); 
                    display: flex; align-items: center; justify-content: center; 
                    font-weight: 700; color: #000; font-size: 0.9rem; flex-shrink: 0;
                ">${primera.cliente.charAt(0).toUpperCase()}</div>
                <div style="flex:1; min-width:0;">
                    <strong style="color: var(--text-primary, #fff); font-size:0.85rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${primera.cliente}</strong>
                    <small style="color: var(--text-secondary, #888); font-size:0.7rem;">${fecha} · ${primera.vehiculo}</small>
                </div>
                <span style="color:var(--text-muted, #888); font-size:1.2rem; cursor:pointer;"
                    onclick="window.galeriaTaller.mostrarMenuCita('${primera.citaId}', event)">⋯</span>
            </div>
            
            <!-- Imagen/Carrusel -->
            <div style="position:relative; background:#000;">
                ${tieneMultiples ? `
                <div id="carousel-${primera.citaId}" class="galeria-carousel" 
                    style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;"
                    onscroll="window.galeriaTaller.actualizarIndicador('${primera.citaId}', ${fotos.length})">
                    ${fotos.map((foto, i) => `
                    <div style="min-width:100%; scroll-snap-align:start; position:relative; aspect-ratio:4/3; cursor:pointer;"
                        onclick="window.galeriaTaller.verFotoGrande('${foto.url}', '${foto.tipoLabel}', null, ${i}, '${primera.citaId}')">
                        <img src="${foto.url}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" loading="lazy"
                            ondblclick="window.galeriaTaller.darLike('${primera.citaId}', this.closest('.galeria-post'))"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
                        <span style="position:absolute; top:8px; left:8px; background:${foto.tipoColor}33; color:${foto.tipoColor}; padding:3px 8px; border-radius:10px; font-size:0.6rem; font-weight:600; backdrop-filter:blur(4px);">${foto.tipoLabel}</span>
                    </div>`).join('')}
                </div>
                <div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:#fff; padding:4px 10px; border-radius:20px; font-size:0.65rem; z-index:5;">
                    <span id="slide-indicator-${primera.citaId}">1/${fotos.length}</span>
                </div>
                <button onclick="window.galeriaTaller.navegarCarousel('${primera.citaId}', -1)" 
                    style="position:absolute; left:5px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1rem; z-index:5; transition:all 0.3s;"
                    onmouseover="this.style.background='${colorTaller}88';"
                    onmouseout="this.style.background='rgba(0,0,0,0.5)';">❮</button>
                <button onclick="window.galeriaTaller.navegarCarousel('${primera.citaId}', 1)" 
                    style="position:absolute; right:5px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1rem; z-index:5; transition:all 0.3s;"
                    onmouseover="this.style.background='${colorTaller}88';"
                    onmouseout="this.style.background='rgba(0,0,0,0.5)';">❯</button>
                ` : `
                <div style="position:relative; aspect-ratio:4/3; cursor:pointer;" 
                    ondblclick="window.galeriaTaller.darLike('${primera.citaId}', this.closest('.galeria-post'))"
                    onclick="window.galeriaTaller.verFotoGrande('${primera.url}', '${primera.tipoLabel}', null, 0, '${primera.citaId}')">
                    <img src="${primera.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy"
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
                    <span style="position:absolute; top:8px; left:8px; background:${primera.tipoColor}33; color:${primera.tipoColor}; padding:3px 8px; border-radius:10px; font-size:0.6rem; font-weight:600; backdrop-filter:blur(4px);">${primera.tipoLabel}</span>
                </div>`}
            </div>
            
            <!-- Acciones -->
            <div style="padding:10px 15px;">
                <div style="display:flex; gap:12px; margin-bottom:8px;">
                    <span onclick="window.galeriaTaller.darLike('${primera.citaId}', this.closest('.galeria-post'))" 
                        style="font-size:1.3rem; cursor:pointer; transition:transform 0.2s;"
                        id="like-btn-${primera.citaId}">${tieneLike ? '❤️' : '🤍'}</span>
                    <span style="font-size:1.3rem; cursor:pointer;" onclick="window.galeriaTaller.agregarFotos('${primera.citaId}')">💬</span>
                    <span style="font-size:1.3rem; cursor:pointer; margin-left:auto;" onclick="window.galeriaTaller.descargarFoto('${primera.url}')">💾</span>
                    <!-- ✅ Botón Compartir -->
                    <span style="font-size:1.3rem; cursor:pointer;" 
                        onclick="window.galeriaTaller.compartirFoto('${primera.url}', {vehiculo:'${primera.vehiculo}', servicio:'${primera.servicio}'}, event)">📤</span>
                </div>
                
                <p style="margin:0 0 5px; font-size:0.85rem;">
                    <strong style="color:var(--text-primary, #fff);">🚗 ${primera.vehiculo}</strong>
                    <span style="color:var(--text-muted, #888); font-size:0.75rem;"> · ${primera.placa}</span>
                </p>
                <p style="margin:0 0 5px; color:var(--text-secondary, #aaa); font-size:0.8rem;">🔧 ${primera.servicio}</p>
                <p style="margin:0; color:var(--text-muted, #888); font-size:0.75rem;">👨‍🔧 ${primera.empleado} · ${fecha}</p>
                
                ${primera.calificacion > 0 ? `<p style="margin:5px 0 0; color:#ffbb33; font-size:0.8rem;">${'⭐'.repeat(primera.calificacion)}</p>` : ''}
                
                <div style="display:flex; gap:6px; margin-top:10px;">
                    <button onclick="window.galeriaTaller.agregarFotos('${primera.citaId}')" 
                        style="flex:1; padding:8px; background:transparent; border:1px solid ${colorTaller}; color:${colorTaller}; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:600;">
                        📷 Agregar
                    </button>
                    <button onclick="window.galeriaTaller.verCita('${primera.citaId}')" 
                        style="flex:1; padding:8px; background:transparent; border:1px solid #00d4ff; color:#00d4ff; border-radius:8px; cursor:pointer; font-size:0.75rem;">
                        👁️ Ver cita
                    </button>
                    <button onclick="window.galeriaTaller.verComparativa('${primera.citaId}')" 
                        style="padding:8px 10px; background:transparent; border:1px solid #ff44ff; color:#ff44ff; border-radius:8px; cursor:pointer; font-size:0.75rem; white-space:nowrap;">
                        🔍 Comparar
                    </button>
                </div>
            </div>
        </div>`;
    }

    // ================================================================
    // 🔹 ACCIONES
    // ================================================================

    buscar(texto) {
        this.busquedaActual = texto;
        const container = document.getElementById('galeria-taller-grid');
        if (container) this.renderizar(container);
    }

    filtrar(tipo) {
        this.filtroActual = tipo;

        document.querySelectorAll('.btn-filtro-galeria').forEach(b => {
            b.style.background = 'transparent';
            b.style.borderColor = '#333';
            b.style.color = '#aaa';
        });

        const btnActivo = document.getElementById(`filtro-galeria-${tipo}`);
        if (btnActivo) {
            btnActivo.style.background = 'rgba(0,255,136,0.1)';
            btnActivo.style.borderColor = '#00ff88';
            btnActivo.style.color = '#00ff88';
        }

        const container = document.getElementById('galeria-taller-grid');
        if (container) this.renderizar(container);
    }

    filtrarPorFecha() {
        const desde = document.getElementById('filtro-fecha-desde')?.value;
        const hasta = document.getElementById('filtro-fecha-hasta')?.value;
        this.fechaDesde = desde || null;
        this.fechaHasta = hasta || null;

        const container = document.getElementById('galeria-taller-grid');
        if (container) this.renderizar(container);
    }

    darLike(citaId, postElement) {
        this.likes[citaId] = !this.likes[citaId];
        localStorage.setItem('galeria_likes', JSON.stringify(this.likes));

        const btn = document.getElementById(`like-btn-${citaId}`);
        if (btn) {
            btn.textContent = this.likes[citaId] ? '❤️' : '🤍';
            if (this.likes[citaId]) {
                btn.style.transform = 'scale(1.3)';
                setTimeout(() => btn.style.transform = 'scale(1)', 200);
            }
        }
    }

    verCita(citaId) {
        const foto = this.fotos.find(f => f.citaId === citaId);
        const fechaCita = foto?.fecha || '';

        const linkCitas = document.querySelector('[data-section="citas"]');
        if (linkCitas) {
            linkCitas.click();

            setTimeout(() => {
                const inputFecha = document.getElementById('filtro-fecha');
                const selectEstado = document.getElementById('filtro-estado');

                if (inputFecha && fechaCita) {
                    inputFecha.value = fechaCita;
                    inputFecha.dispatchEvent(new Event('change'));

                    window.mostrarToast?.(`📅 Mostrando citas del ${new Date(fechaCita + 'T00:00:00').toLocaleDateString('es-DO')}`, 'info');
                }

                if (selectEstado) {
                    selectEstado.value = 'TODAS';
                }
            }, 300);
        }
    }

    agregarFotos(citaId) {
        if (window.gestionFotos) {
            window.gestionFotos.abrir(citaId);
        }
    }

    mostrarMenuCita(citaId, event) {
        event.stopPropagation();

        const foto = this.fotos.find(f => f.citaId === citaId);
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            background: var(--bg-card, #131c2b);
            border: 1px solid var(--border-color, #1e2a3a);
            border-radius: 12px;
            padding: 8px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            min-width: 180px;
        `;
        menu.style.left = (event.clientX - 160) + 'px';
        menu.style.top = (event.clientY + 10) + 'px';

        menu.innerHTML = `
            <button onclick="window.galeriaTaller.descargarFoto('${foto?.url || ''}'); this.closest('div').remove();" 
                style="display:block; width:100%; padding:10px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px;"
                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                💾 Descargar
            </button>
            <button onclick="window.galeriaTaller.compartirFoto('${foto?.url || ''}', {vehiculo:'${foto?.vehiculo || ''}', servicio:'${foto?.servicio || ''}'}, event); this.closest('div').remove();" 
                style="display:block; width:100%; padding:10px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px;"
                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                📤 Compartir
            </button>
            <button onclick="window.galeriaTaller.agregarFotos('${citaId}'); this.closest('div').remove();" 
                style="display:block; width:100%; padding:10px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px;"
                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                📷 Agregar fotos
            </button>
            <button onclick="navigator.clipboard.writeText('${citaId}'); this.closest('div').remove(); window.mostrarToast?.('✅ ID copiado', 'success');" 
                style="display:block; width:100%; padding:10px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px;"
                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                📋 Copiar ID
            </button>
        `;

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function cerrarMenu() {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            });
        }, 100);
    }

    // ================================================================
    // 🔹 COMPARTIR FOTO (NUEVO)
    // ================================================================

    compartirFoto(url, foto, event) {
        event.stopPropagation();

        const texto = `🚗 ${foto.vehiculo} - ${foto.servicio}\n📸 Por: ${this.tallerActual?.nombre || 'AutoBrillo Detailing'}\n🔗 ${url}`;
        const textoWhatsApp = `🚗 *${foto.vehiculo}* - *${foto.servicio}*\n📸 Por: _${this.tallerActual?.nombre || 'AutoBrillo Detailing'}_\n🔗 ${url}`;

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            background: var(--bg-card, #131c2b);
            border: 1px solid var(--border-color, #1e2a3a);
            border-radius: 16px;
            padding: 12px;
            z-index: 10001;
            box-shadow: 0 15px 40px rgba(0,0,0,0.6);
            min-width: 220px;
            animation: slideUp 0.2s ease;
        `;
        menu.style.left = Math.min(event.clientX - 100, window.innerWidth - 240) + 'px';
        menu.style.top = Math.min(event.clientY + 10, window.innerHeight - 300) + 'px';

        menu.innerHTML = `
            <div style="padding:8px 12px; margin-bottom:8px; border-bottom:1px solid var(--border-color, #1e2a3a);">
                <span style="color:#fff; font-weight:600; font-size:0.9rem;">🔗 Compartir foto</span>
            </div>
            
            <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}', '_blank'); this.closest('div').remove();" 
                style="display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px; font-size:0.85rem;"
                onmouseover="this.style.background='#25D36622';"
                onmouseout="this.style.background='transparent';">
                <span style="font-size:1.2rem;">💬</span> WhatsApp
            </button>
            
            <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}', '_blank'); this.closest('div').remove();" 
                style="display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px; font-size:0.85rem;"
                onmouseover="this.style.background='#1877F222';"
                onmouseout="this.style.background='transparent';">
                <span style="font-size:1.2rem;">📘</span> Facebook
            </button>
            
            <button onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}', '_blank'); this.closest('div').remove();" 
                style="display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px; font-size:0.85rem;"
                onmouseover="this.style.background='#1DA1F222';"
                onmouseout="this.style.background='transparent';">
                <span style="font-size:1.2rem;">🐦</span> Twitter/X
            </button>
            
            <button onclick="navigator.clipboard.writeText('${url}').then(() => { window.mostrarToast?.('✅ Enlace copiado al portapapeles', 'success'); }).catch(() => { prompt('📋 Copia el enlace:', '${url}'); }); this.closest('div').remove();" 
                style="display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; background:transparent; border:none; color:#fff; text-align:left; cursor:pointer; border-radius:8px; font-size:0.85rem;"
                onmouseover="this.style.background='${this.colorTaller}22';"
                onmouseout="this.style.background='transparent';">
                <span style="font-size:1.2rem;">📋</span> Copiar enlace
            </button>
            
            <style>
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            </style>
        `;

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function cerrarMenu() {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            });
        }, 100);
    }

    // ================================================================
    // 🔹 NAVEGACIÓN DEL CARRUSEL
    // ================================================================

    navegarCarousel(citaId, direccion) {
        const carousel = document.getElementById(`carousel-${citaId}`);
        if (!carousel) return;

        const anchoSlide = carousel.clientWidth;
        carousel.scrollBy({
            left: anchoSlide * direccion,
            behavior: 'smooth'
        });
    }

    actualizarIndicador(citaId, total) {
        const carousel = document.getElementById(`carousel-${citaId}`);
        const indicador = document.getElementById(`slide-indicator-${citaId}`);
        if (!carousel || !indicador) return;

        const anchoSlide = carousel.clientWidth;
        const scrollPos = carousel.scrollLeft;
        const indexActual = Math.round(scrollPos / anchoSlide) + 1;

        indicador.textContent = `${indexActual}/${total}`;
    }

    // ================================================================
    // 🔹 VISTA COMPARATIVA ANTES/DESPUÉS
    // ================================================================

    verComparativa(citaId) {
        const fotosCita = this.fotos.filter(f => f.citaId === citaId);
        const antes = fotosCita.filter(f => f.tipo === 'antes');
        const despues = fotosCita.filter(f => f.tipo === 'despues');

        if (antes.length === 0 || despues.length === 0) {
            window.mostrarToast?.('⚠️ Esta cita no tiene fotos de Antes y Después para comparar', 'warning');
            return;
        }

        const primera = fotosCita[0];
        const colorTaller = this.colorTaller;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.95); backdrop-filter:blur(10px);
            z-index:100000; display:flex; flex-direction:column;
            animation: fadeIn 0.3s ease;
        `;

        let indexAntes = 0;
        let indexDespues = 0;

        const renderComparativa = () => {
            const fotoAntes = antes[indexAntes];
            const fotoDespues = despues[indexDespues];

            modal.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px; background:rgba(0,0,0,0.5);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#fff; font-size:1.1rem; font-weight:600;">🔍 Comparativa</span>
                        <span style="background:${colorTaller}44; color:${colorTaller}; padding:4px 12px; border-radius:15px; font-size:0.8rem;">${primera.vehiculo}</span>
                    </div>
                    <span onclick="this.closest('div').remove()" 
                        style="color:#fff; font-size:1.5rem; cursor:pointer; background:rgba(255,255,255,0.1); width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center;">✕</span>
                </div>
                
                <div style="display:flex; flex:1; overflow:hidden;">
                    <div style="flex:1; position:relative; border-right:2px solid #ff6b6b;">
                        <div style="position:absolute; top:10px; left:10px; background:#ff6b6b; color:#fff; padding:5px 12px; border-radius:15px; font-size:0.8rem; font-weight:600; z-index:5;">🔴 ANTES</div>
                        ${antes.length > 1 ? `
                        <button onclick="this.closest('div').querySelector('.antes-img').src = '${antes[indexAntes > 0 ? indexAntes - 1 : antes.length - 1]?.url}';" 
                            style="position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; z-index:5;">❮</button>
                        <button onclick="this.closest('div').querySelector('.antes-img').src = '${antes[indexAntes < antes.length - 1 ? indexAntes + 1 : 0]?.url}';" 
                            style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; z-index:5;">❯</button>
                        ` : ''}
                        <img class="antes-img" src="${fotoAntes?.url}" style="width:100%; height:100%; object-fit:cover;"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22>📷</text></svg>'">
                    </div>
                    
                    <div style="flex:1; position:relative;">
                        <div style="position:absolute; top:10px; right:10px; background:#6bff6b; color:#000; padding:5px 12px; border-radius:15px; font-size:0.8rem; font-weight:600; z-index:5;">🟢 DESPUÉS</div>
                        ${despues.length > 1 ? `
                        <button onclick="this.closest('div').querySelector('.despues-img').src = '${despues[indexDespues > 0 ? indexDespues - 1 : despues.length - 1]?.url}';" 
                            style="position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; z-index:5;">❮</button>
                        <button onclick="this.closest('div').querySelector('.despues-img').src = '${despues[indexDespues < despues.length - 1 ? indexDespues + 1 : 0]?.url}';" 
                            style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; z-index:5;">❯</button>
                        ` : ''}
                        <img class="despues-img" src="${fotoDespues?.url}" style="width:100%; height:100%; object-fit:cover;"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22>📷</text></svg>'">
                    </div>
                </div>
                
                <div style="padding:15px 25px; background:rgba(0,0,0,0.5); text-align:center;">
                    <p style="color:#fff; margin:0 0 5px;">🚗 ${primera.vehiculo} · ${primera.placa}</p>
                    <p style="color:#aaa; margin:0; font-size:0.85rem;">🔧 ${primera.servicio} · 👨‍🔧 ${primera.empleado}</p>
                    <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
                        <span style="color:#ff6b6b; font-size:0.8rem;">🔴 ${antes.length} fotos</span>
                        <span style="color:#888;">|</span>
                        <span style="color:#6bff6b; font-size:0.8rem;">${despues.length} fotos 🟢</span>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                </style>
            `;
        };

        renderComparativa();

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(modal);
    }

    // ================================================================
    // 🔹 LIGHTBOX
    // ================================================================

    verFotoGrande(url, titulo, fotosArray = null, indexActual = 0, citaId = null) {
        let fotos = fotosArray;

        if (citaId) {
            fotos = this.fotos.filter(f => f.citaId === citaId);
            if (fotos.length === 0) {
                fotos = [{ url, tipoLabel: titulo }];
            }
        }

        if (typeof fotos === 'string') {
            try { fotos = JSON.parse(fotos); } catch (e) { fotos = [{ url, tipoLabel: titulo }]; }
        }

        if (!fotos || fotos.length === 0) {
            fotos = [{ url, tipoLabel: titulo }];
        }

        const lightbox = document.createElement('div');
        lightbox.id = 'galeria-lightbox';
        lightbox._fotos = fotos;
        lightbox._currentIndex = indexActual;
        const colorTaller = this.colorTaller;

        lightbox.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.97); backdrop-filter:blur(10px);
            z-index:100000; display:flex; align-items:center; justify-content:center;
            flex-direction:column; animation: fadeIn 0.3s ease;
            user-select:none; -webkit-user-select:none;
        `;

        lightbox._renderFn = () => {
            const idx = lightbox._currentIndex;
            const foto = fotos[idx];
            if (!foto) return;

            lightbox.innerHTML = `
                <div style="position:absolute; top:0; left:0; right:0; display:flex; justify-content:space-between; padding:20px 30px; z-index:10;">
                    <span style="color:#fff; font-size:0.9rem; background:rgba(0,0,0,0.5); padding:6px 12px; border-radius:20px;">
                        ${idx + 1} / ${fotos.length}
                    </span>
                    <span id="lightbox-btn-close" 
                        style="color:#fff; font-size:1.8rem; cursor:pointer; background:rgba(0,0,0,0.5); width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:all 0.3s;"
                        onmouseover="this.style.background='#ff4444';"
                        onmouseout="this.style.background='rgba(0,0,0,0.5)';">✕</span>
                </div>
                
                <div id="lightbox-image-container" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; overflow:hidden;">
                    <img src="${foto.url}" id="lightbox-img" style="max-width:90vw; max-height:85vh; object-fit:contain; border-radius:8px; transition:transform 0.3s;"
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22400%22><rect fill=%22%23333%22 width=%22600%22 height=%22400%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'"
                        ondblclick="this.style.transform = this.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)';">
                </div>
                
                <button id="lightbox-btn-prev" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:50%; width:50px; height:50px; cursor:pointer; font-size:1.5rem; z-index:10; transition:all 0.3s; display:${idx > 0 ? 'flex' : 'none'}; align-items:center; justify-content:center;"
                    onmouseover="this.style.background='${colorTaller}44';"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)';">❮</button>
                
                <button id="lightbox-btn-next" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:50%; width:50px; height:50px; cursor:pointer; font-size:1.5rem; z-index:10; transition:all 0.3s; display:${idx < fotos.length - 1 ? 'flex' : 'none'}; align-items:center; justify-content:center;"
                    onmouseover="this.style.background='${colorTaller}44';"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)';">❯</button>
                
                <div style="position:absolute; bottom:30px; left:50%; transform:translateX(-50%); text-align:center; max-width:500px; width:90%;">
                    <span style="background:${foto.tipoColor}44; color:#fff; padding:6px 16px; border-radius:20px; font-size:0.85rem; backdrop-filter:blur(4px);">${foto.tipoLabel}</span>
                    <p style="color:#fff; margin:10px 0 0; font-size:0.9rem;">🚗 ${foto.vehiculo} · ${foto.servicio}</p>
                    <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
                        <button id="lightbox-btn-download" 
                            style="padding:10px 20px; background:${colorTaller}; color:#000; border:none; border-radius:20px; cursor:pointer; font-weight:600; font-size:0.8rem;">💾 Descargar</button>
                        <button id="lightbox-btn-share" 
                            style="padding:10px 20px; background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:20px; cursor:pointer; font-weight:600; font-size:0.8rem;">📤 Compartir</button>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                </style>
            `;

            setTimeout(() => {
                document.getElementById('lightbox-btn-close')?.addEventListener('click', () => lightbox.remove());
                document.getElementById('lightbox-btn-download')?.addEventListener('click', () => this.descargarFoto(foto.url));
                document.getElementById('lightbox-btn-share')?.addEventListener('click', (e) => {
                    this.compartirFoto(foto.url, { vehiculo: foto.vehiculo, servicio: foto.servicio }, e);
                });

                document.getElementById('lightbox-btn-prev')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.navegarLightbox(-1);
                });
                document.getElementById('lightbox-btn-next')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.navegarLightbox(1);
                });
            }, 50);
        };

        lightbox._renderFn();

        let touchStartX = 0, touchStartY = 0;
        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                this.navegarLightbox(diffX > 0 ? -1 : 1);
            }
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', escHandler); }
            if (e.key === 'ArrowLeft') this.navegarLightbox(-1);
            if (e.key === 'ArrowRight') this.navegarLightbox(1);
        };
        document.addEventListener('keydown', escHandler);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.id === 'lightbox-image-container') {
                lightbox.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });

        document.body.appendChild(lightbox);
    }

    navegarLightbox(direccion) {
        const lightbox = document.getElementById('galeria-lightbox');
        if (!lightbox || !lightbox._fotos) return false;

        lightbox._currentIndex += direccion;
        if (lightbox._currentIndex < 0) lightbox._currentIndex = 0;
        if (lightbox._currentIndex >= lightbox._fotos.length) lightbox._currentIndex = lightbox._fotos.length - 1;

        lightbox._renderFn();
        return false;
    }

    descargarFoto(url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `autobrillo-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

export default GaleriaTaller;