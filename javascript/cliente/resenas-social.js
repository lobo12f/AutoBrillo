// ====================================================================
// 💬 SISTEMA DE RESEÑAS SOCIAL - Tipo Facebook/Instagram
// ====================================================================
import { apiFetch } from '../api-client.js';
export class ResenasSocialManager {

    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
        this.tallerIdActual = null;
        this.usuarioActual = null;
        this.fotosComentarios = {};
        this.calificacionRapida = 0;
        this.comentarioResponderId = null;
        this.intervaloActualizacion = null;

        // ⭐ NUEVO: Estado de paginación
        this.resenasPaginaActual = 1;
        this.resenasPorPagina = 5;
        this.resenasTotalPaginas = 1;
        this.resenasTodas = [];
        this.resenasOrden = 'recientes';
        this.reaccionesCache = {};
    }

    // ================================================================
    // 🔹 ACTUALIZACIÓN EN TIEMPO REAL
    // ================================================================

    iniciarActualizacionTiempoReal(tallerId, containerId) {
        if (this.intervaloActualizacion) clearInterval(this.intervaloActualizacion);
        this.intervaloActualizacion = setInterval(async () => {
            const container = document.getElementById(containerId);
            if (container && container.offsetParent !== null) {
                await this.cargarSilencioso(tallerId, containerId);
            }
        }, 5000);
    }

    detenerActualizacionTiempoReal() {
        if (this.intervaloActualizacion) {
            clearInterval(this.intervaloActualizacion);
            this.intervaloActualizacion = null;
        }
    }

    async cargarSilencioso(tallerId, containerId) {
        try {
            const [resenasRes, reaccionesRes] = await Promise.all([
                apiFetch(`/talleres/${tallerId}/resenas-social`),
                apiFetch(`/talleres/${tallerId}/resenas/reacciones`)
            ]);
            const resenasData = await resenasRes.json();
            const reaccionesData = await reaccionesRes.json();
            if (resenasData.exito && resenasData.resenas) {
                const reacciones = reaccionesData.reacciones || {};
                resenasData.resenas.forEach(resena => {
                    const reacc = reacciones[resena._id] || { likes: 0, util: 0, gracias: 0 };
                    this.actualizarResenaSilencioso(resena, reacc);
                    this.actualizarComentariosSilencioso(resena);
                });
            }
        } catch (error) { /* Silencioso */ }
    }

    actualizarResenaSilencioso(resena, reacciones) {
        const likes = reacciones.likes || 0;
        const util = reacciones.util || 0;
        const gracias = reacciones.gracias || 0;

        const botones = document.querySelectorAll(`button[onclick*="reaccionar('${resena._id}'"]`);
        botones.forEach(boton => {
            const onclick = boton.getAttribute('onclick');
            if (onclick.includes("'likes'")) boton.innerHTML = `❤️ ${likes}`;
            if (onclick.includes("'util'")) boton.innerHTML = `👍 Útil`;
            if (onclick.includes("'gracias'")) boton.innerHTML = `🙏 Gracias`;
        });

        const resenaDiv = document.getElementById(`resena-${resena._id}`);
        if (resenaDiv) {
            const spans = resenaDiv.querySelectorAll('span');
            spans.forEach(span => {
                if (span.textContent.includes('❤️') || span.textContent.includes('👍') || span.textContent.includes('🙏')) {
                    const partes = [];
                    if (likes > 0) partes.push(`❤️ ${likes}`);
                    if (util > 0) partes.push(` · 👍 ${util}`);
                    if (gracias > 0) partes.push(` · 🙏 ${gracias}`);
                    span.innerHTML = partes.join('');
                }
            });

            const respuestaActual = resenaDiv.querySelector('[style*="border-left:3px solid #00ff88"]');
            if (resena.respuesta && !respuestaActual) {
                const botonesDiv = resenaDiv.querySelector('[style*="display:flex; gap:5px; margin-bottom:10px"]');
                if (botonesDiv) {
                    botonesDiv.insertAdjacentHTML('afterend', `
                        <div style="background:rgba(0,255,136,0.02); border-left:3px solid #00ff88; border-radius:0 10px 10px 0; padding:15px; margin-top:10px;">
                            <strong style="color:#00ff88;">🏪 Respuesta del taller</strong>
                            <p style="color:#ccc; margin:5px 0 0;">${resena.respuesta}</p>
                        </div>`);
                }
            }
        }
    }

    actualizarComentariosSilencioso(resena) {
        const comentariosNuevos = resena.comentarios || [];
        const contenedorComentarios = document.getElementById(`comentarios-${resena._id}`);
        if (contenedorComentarios && contenedorComentarios.style.display !== 'none') {
            comentariosNuevos.forEach(com => {
                const likesEl = document.getElementById(`likes-c-${com._id}`);
                if (likesEl) likesEl.textContent = `❤️ ${com.likes || ''}`;
            });
        }
        const resenaDiv = document.getElementById(`resena-${resena._id}`);
        if (resenaDiv) {
            const contadorSpan = resenaDiv.querySelector('span[style*="margin-left:auto"]');
            if (contadorSpan && comentariosNuevos.length > 0) {
                contadorSpan.innerHTML = `💬 ${comentariosNuevos.length} comentario${comentariosNuevos.length !== 1 ? 's' : ''}`;
            }
        }
    }

    // ================================================================
    // 🔹 CARGAR RESEÑAS
    // ================================================================

    async cargar(tallerId, containerId) {
        this.tallerIdActual = tallerId;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">⏳ Cargando reseñas...</p>';
        try {
            const [resenasRes, reaccionesRes] = await Promise.all([
                apiFetch(`/talleres/${tallerId}/resenas-social`),
                apiFetch(`/talleres/${tallerId}/resenas/reacciones`)
            ]);
            const resenasData = await resenasRes.json();
            const reaccionesData = await reaccionesRes.json();
            if (resenasData.exito) {
                this.renderizarResenasSocial(resenasData, reaccionesData.reacciones || {}, container);
                this.iniciarActualizacionTiempoReal(tallerId, containerId);
            }
        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444;">Error al cargar reseñas</p>';
        }
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    renderizarResenasSocial(data, reacciones, container) {
        const promedio = data.promedio || 0;
        const total = data.total || 0;
        const resenas = data.resenas || [];
        container.innerHTML = `
            <div style="margin-bottom:25px;">${this.renderizarEncabezadoSocial(promedio, total, data.distribucion)}</div>
            ${this.renderizarFormularioRapido()}
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <button onclick="window.resenasSocial.filtrarResenas('recientes')" class="btn-filtro-resena active" style="padding:8px 16px; border:1px solid #00ff88; border-radius:20px; background:rgba(0,255,136,0.1); color:#00ff88; cursor:pointer; font-size:0.8rem;">🕐 Más recientes</button>
                <button onclick="window.resenasSocial.filtrarResenas('utiles')" class="btn-filtro-resena" style="padding:8px 16px; border:1px solid #333; border-radius:20px; background:transparent; color:#aaa; cursor:pointer; font-size:0.8rem;">👍 Más útiles</button>
                <button onclick="window.resenasSocial.filtrarResenas('fotos')" class="btn-filtro-resena" style="padding:8px 16px; border:1px solid #333; border-radius:20px; background:transparent; color:#aaa; cursor:pointer; font-size:0.8rem;">📸 Con fotos</button>
            </div>
            <!-- Controles de ordenamiento -->
<div style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap;">
    <select id="filtro-orden-resenas" onchange="window.resenasSocial.cambiarOrdenResenas(this.value)"
        style="flex:1; min-width:150px; padding:8px 12px; background:#080c14; border:1px solid #1e2a3a; border-radius:8px; color:#fff; font-size:0.85rem;">
        <option value="recientes" ${this.resenasOrden === 'recientes' ? 'selected' : ''}>🕐 Más recientes</option>
        <option value="mejor" ${this.resenasOrden === 'mejor' ? 'selected' : ''}>⭐ Mejor valoradas</option>
        <option value="peor" ${this.resenasOrden === 'peor' ? 'selected' : ''}>💔 Peor valoradas</option>
    </select>
</div>

<!-- Contador -->
<div id="contador-resenas" style="text-align:center; color:#888; font-size:0.8rem; margin-bottom:10px;"></div>

<!-- Lista de reseñas -->
<div id="lista-resenas-social">
    ${resenas.length > 0 ? '<p style="color:#888; text-align:center; padding:20px;">⏳ Preparando reseñas...</p>' : '<p style="color:#888; text-align:center; padding:40px;">📭 Sé el primero en dejar una reseña</p>'}
</div>

<!-- Paginación -->
<div id="paginacion-resenas" style="display:flex; justify-content:center; align-items:center; gap:8px; margin:15px 0; flex-wrap:wrap;"></div>`;
        // ⭐ Guardar reseñas y reacciones en caché
        this.resenasTodas = resenas;
        this.reaccionesCache = reacciones;
        this.resenasPaginaActual = 1;
        this.resenasTotalPaginas = Math.ceil(resenas.length / this.resenasPorPagina);

        // ⭐ Renderizar primera página
        if (resenas.length > 0) {
            this.renderizarListaPaginada();
        }
    }

    renderizarEncabezadoSocial(promedio, total, distribucion) {
        return `<div style="background:linear-gradient(135deg, #1a1a2e, #16213e); border-radius:16px; padding:25px; text-align:center;">
            <div style="font-size:4rem; font-weight:700; color:#ffbb33;">${promedio.toFixed(1)}</div>
            <div style="color:#ffbb33; font-size:1.5rem;">${'★'.repeat(Math.round(promedio))}${'☆'.repeat(5 - Math.round(promedio))}</div>
            <p style="color:#888;">Basado en <strong style="color:#fff;">${total}</strong> reseñas</p>
            <div style="max-width:300px; margin:15px auto 0;">
                ${[5, 4, 3, 2, 1].map(e => {
            const cant = distribucion?.[e] || 0;
            const pct = total > 0 ? Math.round((cant / total) * 100) : 0;
            return `<div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                        <span style="color:#ffbb33; font-size:0.75rem; min-width:20px;">${e}★</span>
                        <div style="flex:1; background:#1a1a1a; border-radius:3px; height:6px; overflow:hidden;"><div style="background:#ffbb33; height:100%; width:${pct}%; border-radius:3px;"></div></div>
                        <span style="color:#888; font-size:0.7rem; min-width:25px;">${pct}%</span></div>`;
        }).join('')}
            </div></div>`;
    }

    renderizarFormularioRapido() {
        return `<div style="background:#131c2b; border:1px solid #1e2a3a; border-radius:12px; padding:20px; margin-bottom:20px;">
            <div style="display:flex; gap:12px;">
                <div style="width:45px; height:45px; border-radius:50%; background:rgba(255,187,51,0.1); display:flex; align-items:center; justify-content:center; font-weight:700; color:#ffbb33; flex-shrink:0;">${(window.user?.nombre || 'U')[0].toUpperCase()}</div>
                <div style="flex:1;">
                    <textarea id="resena-rapida-texto" rows="2" placeholder="¿Qué tal tu experiencia?" style="width:100%; padding:12px; background:#080c14; border:1px solid #1e2a3a; border-radius:8px; color:#fff; resize:vertical; font-family:Inter,sans-serif;"></textarea>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <div style="display:flex; gap:6px;" id="estrellas-rapidas">
                            ${[1, 2, 3, 4, 5].map(i => `<span onclick="window.resenasSocial.seleccionarEstrellaRapida(${i})" data-estrella="${i}" style="font-size:1.5rem; cursor:pointer; color:#444;">★</span>`).join('')}
                        </div>
                        <button onclick="window.resenasSocial.enviarResenaRapida()" style="padding:10px 20px; background:#ffbb33; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">📤 Publicar</button>
                    </div>
                </div>
            </div></div>`;
    }

    renderizarResenaSocial(resena, reacciones) {
        const fecha = this.formatearFechaRelativa(resena.fecha);
        const reaccionesResena = reacciones[resena._id] || { likes: 0, util: 0, gracias: 0 };
        const usuarioReacciono = reaccionesResena.usuarioReacciono || {};
        const tieneRespuesta = resena.respuesta && resena.respuesta.trim() !== '';
        const comentarios = resena.comentarios || [];

        // ✅ Logo del taller para la respuesta (NUEVO)
        const tallerLogo = resena.tallerLogo || '';

        return `<div id="resena-${resena._id}" style="background:#131c2b; border:1px solid #1e2a3a; border-radius:16px; padding:20px; margin-bottom:15px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
            <div style="width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #ffbb33, #ff8800); display:flex; align-items:center; justify-content:center; font-weight:700; color:#000; font-size:1.2rem;">${(resena.cliente?.nombre || 'C')[0].toUpperCase()}</div>
            <div>
                <div style="display:flex; align-items:center; gap:6px;"><strong style="color:#fff;">${resena.cliente?.nombre || 'Cliente'}</strong><span style="background:#00ff8822; color:#00ff88; padding:2px 8px; border-radius:10px; font-size:0.6rem;">✓ Verificado</span></div>
                <div style="display:flex; align-items:center; gap:8px; margin-top:3px;"><span style="color:#ffbb33;">${'★'.repeat(resena.puntuacion)}${'☆'.repeat(5 - resena.puntuacion)}</span><span style="color:#888;">·</span><span style="color:#888; font-size:0.8rem;">${fecha}</span></div>
            </div>
        </div>
        ${resena.comentario ? `<p style="color:#ccc; font-size:0.95rem; line-height:1.6; margin-bottom:15px;">${resena.comentario}</p>` : ''}
        ${resena.fotos && resena.fotos.length > 0 ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px; margin-bottom:15px;">${resena.fotos.map(f => `<div style="border-radius:10px; overflow:hidden; cursor:pointer; height:100px;" onclick="window.verFotoGrande?.('${f}')"><img src="${f}" style="width:100%; height:100%; object-fit:cover;" loading="lazy"></div>`).join('')}</div>` : ''}
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #1e2a3a;">
            ${(reaccionesResena.likes + reaccionesResena.util + reaccionesResena.gracias) > 0 ? `<span style="font-size:0.8rem; color:#888;">${reaccionesResena.likes > 0 ? `❤️ ${reaccionesResena.likes}` : ''}${reaccionesResena.util > 0 ? ` · 👍 ${reaccionesResena.util}` : ''}${reaccionesResena.gracias > 0 ? ` · 🙏 ${reaccionesResena.gracias}` : ''}</span>` : ''}
            ${comentarios.length > 0 ? `<span style="font-size:0.8rem; color:#888; margin-left:auto;">💬 ${comentarios.length} comentario${comentarios.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
        <div style="display:flex; gap:5px; margin-bottom:10px;">
            <button onclick="window.resenasSocial.reaccionar('${resena._id}', 'likes')" style="flex:1; padding:8px; background:transparent; border:none; border-radius:6px; color:#888; cursor:pointer; font-size:0.8rem;">❤️ ${reaccionesResena.likes || ''}</button>
            <button onclick="window.resenasSocial.reaccionar('${resena._id}', 'util')" style="flex:1; padding:8px; background:transparent; border:none; border-radius:6px; color:#888; cursor:pointer; font-size:0.8rem;">👍 Útil</button>
            <button onclick="window.resenasSocial.reaccionar('${resena._id}', 'gracias')" style="flex:1; padding:8px; background:transparent; border:none; border-radius:6px; color:#888; cursor:pointer; font-size:0.8rem;">🙏 Gracias</button>
            <button onclick="window.resenasSocial.mostrarComentarios('${resena._id}')" style="flex:1; padding:8px; background:transparent; border:none; border-radius:6px; color:#888; cursor:pointer; font-size:0.8rem;">💬 Comentar</button>
        </div>
        ${tieneRespuesta ? `
        <!-- ✅ RESPUESTA DEL TALLER CON LOGO (ACTUALIZADO) -->
        <div style="background:rgba(0,255,136,0.02); border-left:3px solid #00ff88; border-radius:0 10px 10px 0; padding:15px; margin-top:10px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                ${tallerLogo
                    ? `<img src="${tallerLogo}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #00ff88;" onerror="this.style.display='none';">`
                    : '<span style="font-size:1.2rem;">🏪</span>'}
                <strong style="color:#00ff88; font-size:0.85rem;">Respuesta del taller</strong>
            </div>
            <p style="color:#ccc; margin:5px 0 0;">${resena.respuesta}</p>
        </div>` : ''}
        <div id="comentarios-${resena._id}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid #1e2a3a;">
            ${comentarios.map(c => this.renderizarComentario(c, resena._id)).join('')}
            <div style="display:flex; gap:8px; margin-top:10px;">
                <div style="width:35px; height:35px; border-radius:50%; background:rgba(255,187,51,0.1); display:flex; align-items:center; justify-content:center; font-weight:700; color:#ffbb33; font-size:0.8rem; flex-shrink:0;">${(window.user?.nombre || 'U')[0].toUpperCase()}</div>
                <div style="flex:1;">
                    <div style="display:flex; gap:6px; margin-bottom:6px;">
                        <input type="text" id="input-comentario-${resena._id}" placeholder="Escribe un comentario..." style="flex:1; padding:10px; background:#080c14; border:1px solid #1e2a3a; border-radius:20px; color:#fff; font-size:0.85rem;" onkeypress="if(event.key==='Enter') window.resenasSocial.enviarComentario('${resena._id}')">
                        <label for="file-comentario-${resena._id}" style="padding:10px 12px; background:#1e2a3a; border-radius:50%; cursor:pointer;" title="Adjuntar foto">📷</label>
                        <input type="file" id="file-comentario-${resena._id}" accept="image/*" style="display:none;" onchange="window.resenasSocial.prepararFotoComentario('${resena._id}', this)">
                        <button onclick="window.resenasSocial.enviarComentario('${resena._id}')" style="padding:10px 15px; background:#00ff88; color:#000; border:none; border-radius:20px; cursor:pointer; font-weight:600;">📤</button>
                    </div>
                    <div id="preview-foto-${resena._id}" style="display:none; position:relative; margin-top:5px;">
                        <img id="img-preview-${resena._id}" src="" style="max-width:150px; max-height:100px; border-radius:8px;">
                        <span onclick="window.resenasSocial.quitarFotoComentario('${resena._id}')" style="position:absolute; top:-8px; right:-8px; background:#ff4444; color:#fff; border-radius:50%; width:20px; height:20px; cursor:pointer;">✕</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    }
    renderizarComentario(comentario, resenaId) {
        const fecha = this.formatearFechaRelativa(comentario.fecha);
        const tieneFoto = comentario.foto && comentario.foto !== 'null' && comentario.foto.trim() !== '';
        return `<div style="display:flex; gap:8px; margin-bottom:10px;">
            <div style="width:30px; height:30px; border-radius:50%; background:rgba(255,187,51,0.1); display:flex; align-items:center; justify-content:center; font-weight:700; color:#ffbb33; font-size:0.7rem;">${(comentario.autor?.nombre || 'U')[0].toUpperCase()}</div>
            <div style="flex:1;">
                <div style="background:rgba(255,255,255,0.02); border-radius:12px; padding:10px 15px;">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;"><strong style="color:#fff; font-size:0.8rem;">${comentario.autor?.nombre || 'Usuario'}</strong><span style="color:#888; font-size:0.7rem;">${fecha}</span></div>
                    ${comentario.texto ? `<p style="color:#ccc; margin:0 0 6px 0; font-size:0.85rem;">${comentario.texto}</p>` : ''}
                    ${tieneFoto ? `<img src="${comentario.foto}" style="max-width:200px; max-height:200px; border-radius:8px; cursor:pointer;" onclick="window.verFotoGrande?.('${comentario.foto}')" onerror="this.style.display='none'">` : ''}
                </div>
                <div style="display:flex; gap:10px; margin-top:5px; padding-left:5px;">
                    <span id="likes-c-${comentario._id}" onclick="window.resenasSocial.likeComentario('${comentario._id}', '${resenaId}')" style="color:#888; font-size:0.7rem; cursor:pointer;">❤️ ${comentario.likes || ''}</span>
                    <span onclick="window.resenasSocial.responderAComentario('${resenaId}', '${comentario._id}', '${comentario.autor?.nombre || 'Usuario'}')" style="color:#888; font-size:0.7rem; cursor:pointer;">💬 Responder</span>
                </div>
            </div>
        </div>`;
    }

    // ================================================================
    // 🔹 ACCIONES
    // ================================================================

    seleccionarEstrellaRapida(numero) {
        document.querySelectorAll('#estrellas-rapidas span').forEach((s, i) => { s.style.color = i < numero ? '#ffbb33' : '#444'; });
        this.calificacionRapida = numero;
    }

    async enviarResenaRapida() {
        const comentario = document.getElementById('resena-rapida-texto')?.value?.trim();
        if (!this.calificacionRapida) { this.mostrarToast('⚠️ Selecciona una calificación', 'warning'); return; }
        try {
            await apiFetch(`/talleres/${this.tallerIdActual}/calificaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ puntuacion: this.calificacionRapida, comentario: comentario || '', clienteId: window.obtenerIdUsuario?.() }) });
            this.mostrarToast('✅ ¡Reseña publicada!', 'success');
            document.getElementById('resena-rapida-texto').value = '';
            this.calificacionRapida = 0;
            document.querySelectorAll('#estrellas-rapidas span').forEach(s => s.style.color = '#444');
            await this.cargar(this.tallerIdActual, `calificaciones-content-${this.tallerIdActual}`);
        } catch (error) { this.mostrarToast('❌ Error', 'error'); }
    }

    async reaccionar(resenaId, tipo) {
        if (!this.tallerIdActual) return;
        try {
            const userId = window.obtenerIdUsuario?.() || 'anon';
            const response = await apiFetch(`/talleres/${this.tallerIdActual}/resenas/${resenaId}/reaccionar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, userId }) });
            const data = await response.json();
            if (data.exito && data.reacciones) {
                const likes = data.reacciones.likes || 0;
                const resenaDiv = document.getElementById(`resena-${resenaId}`);
                if (resenaDiv) {
                    resenaDiv.querySelectorAll('button').forEach(boton => {
                        const onclick = boton.getAttribute('onclick');
                        if (onclick?.includes("'likes'")) boton.innerHTML = `❤️ ${likes}`;
                        if (onclick?.includes("'util'")) boton.innerHTML = `👍 Útil`;
                        if (onclick?.includes("'gracias'")) boton.innerHTML = `🙏 Gracias`;
                    });
                    const barraSpan = resenaDiv.querySelector('span[style*="font-size:0.8rem"]');
                    if (barraSpan) {
                        const partes = [];
                        const u = data.reacciones.util || 0;
                        const g = data.reacciones.gracias || 0;
                        if (likes > 0) partes.push(`❤️ ${likes}`);
                        if (u > 0) partes.push(` · 👍 ${u}`);
                        if (g > 0) partes.push(` · 🙏 ${g}`);
                        barraSpan.innerHTML = partes.join('') || '';
                    }
                }
            }
        } catch (error) { console.error('Error:', error); }
    }

    filtrarResenas(filtro) {
        document.querySelectorAll('.btn-filtro-resena').forEach(b => { b.style.background = 'transparent'; b.style.borderColor = '#333'; b.style.color = '#aaa'; });
        if (event?.target) { event.target.style.background = 'rgba(0,255,136,0.1)'; event.target.style.borderColor = '#00ff88'; event.target.style.color = '#00ff88'; }
        this.cargar(this.tallerIdActual, `calificaciones-content-${this.tallerIdActual}`);
    }

    // ================================================================
    // 🔹 COMENTARIOS
    // ================================================================

    mostrarComentarios(resenaId) {
        const div = document.getElementById(`comentarios-${resenaId}`);
        if (div) { div.style.display = div.style.display === 'none' ? 'block' : 'none'; if (div.style.display === 'block') document.getElementById(`input-comentario-${resenaId}`)?.focus(); }
    }

    async likeComentario(comentarioId, resenaId) {
        try {
            const response = await apiFetch(`/talleres/${this.tallerIdActual}/comentarios/${comentarioId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'anon' }) });
            const data = await response.json();
            if (data.exito) {
                const likesEl = document.getElementById(`likes-c-${comentarioId}`);
                if (likesEl) likesEl.textContent = `❤️ ${data.likes}`;
            }
        } catch (error) { console.error('Error:', error); }
    }

    responderAComentario(resenaId, comentarioId, nombre) {
        const div = document.getElementById(`comentarios-${resenaId}`);
        if (div) div.style.display = 'block';
        const input = document.getElementById(`input-comentario-${resenaId}`);
        if (input) { input.placeholder = `Responder a ${nombre}...`; input.focus(); }
        this.comentarioResponderId = comentarioId;
    }

    prepararFotoComentario(resenaId, input) {
        const file = input.files[0];
        if (!file || file.size > 2 * 1024 * 1024) { if (file) this.mostrarToast('⚠️ Máx 2MB', 'warning'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fotosComentarios[resenaId] = e.target.result;
            const p = document.getElementById(`preview-foto-${resenaId}`), i = document.getElementById(`img-preview-${resenaId}`);
            if (p && i) { i.src = e.target.result; p.style.display = 'block'; }
        };
        reader.readAsDataURL(file);
    }

    quitarFotoComentario(resenaId) {
        delete this.fotosComentarios[resenaId];
        const p = document.getElementById(`preview-foto-${resenaId}`), f = document.getElementById(`file-comentario-${resenaId}`);
        if (p) p.style.display = 'none';
        if (f) f.value = '';
    }

    async enviarComentario(resenaId) {
        const input = document.getElementById(`input-comentario-${resenaId}`);
        const texto = input?.value?.trim();
        const foto = this.fotosComentarios?.[resenaId] || null;

        if (!texto && !foto) return;
        if (input) input.disabled = true;

        const API_BASE = window.API_URL || 'http://localhost:3000/api';
        const sesion = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
        const token = sesion.token || '';

        try {
            let fotoUrl = null;

            // ============================================================
            // 1. SUBIR IMAGEN (con fetch directo, sin apiFetch)
            // ============================================================
            if (foto?.startsWith('data:image')) {
                try {
                    console.log('📸 Subiendo imagen...');

                    const blob = this.dataURLtoBlob(foto);
                    const mime = blob.type || 'image/jpeg';
                    let extension = 'jpg';
                    if (mime.includes('png')) extension = 'png';
                    else if (mime.includes('gif')) extension = 'gif';
                    else if (mime.includes('webp')) extension = 'webp';

                    const formData = new FormData();
                    formData.append('imagen', blob, `comentario.${extension}`);

                    console.log('📤 POST:', `${API_BASE}/upload/imagen`);

                    // ⭐ fetch DIRECTO (sin apiFetch)
                    const uploadResponse = await fetch(`${API_BASE}/upload/imagen`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log('📥 Upload status:', uploadResponse.status);

                    if (uploadResponse.ok) {
                        const u = await uploadResponse.json();
                        if (u.exito && u.url) {
                            fotoUrl = u.url;
                            console.log('✅ Imagen subida:', fotoUrl);
                        }
                    } else {
                        const errText = await uploadResponse.text();
                        console.error('❌ Upload error:', uploadResponse.status, errText.substring(0, 200));

                        if (uploadResponse.status === 401 || uploadResponse.status === 403) {
                            this.mostrarToast('⚠️ Sesión expirada - imagen no subida', 'warning');
                        } else {
                            this.mostrarToast(`⚠️ No se pudo subir la imagen (${uploadResponse.status})`, 'warning');
                        }
                        // ⭐ CONTINUAR SIN IMAGEN
                        fotoUrl = null;
                    }

                } catch (uploadError) {
                    console.error('❌ Error upload:', uploadError);
                    this.mostrarToast('⚠️ Error al subir imagen', 'warning');
                    fotoUrl = null;
                }
            }

            // ============================================================
            // 2. ENVIAR COMENTARIO (con fetch directo)
            // ============================================================
            console.log('📤 Enviando comentario...');

            const comentarioResponse = await fetch(
                `${API_BASE}/talleres/${this.tallerIdActual}/resenas/${resenaId}/comentar`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        texto: texto || '',
                        foto: fotoUrl,
                        autor: {
                            id: window.obtenerIdUsuario?.() || 'anon',
                            nombre: window.user?.nombre || 'Usuario'
                        },
                        respuestaA: this.comentarioResponderId || null
                    })
                }
            );

            console.log('📥 Comentario status:', comentarioResponse.status);

            if (!comentarioResponse.ok) {
                const errText = await comentarioResponse.text();
                console.error('❌ Error comentario:', comentarioResponse.status, errText.substring(0, 200));

                if (comentarioResponse.status === 401 || comentarioResponse.status === 403) {
                    this.mostrarToast('⚠️ Sesión expirada - inicia sesión de nuevo', 'error');
                } else {
                    this.mostrarToast(`❌ Error al comentar (${comentarioResponse.status})`, 'error');
                }
                return;
            }

            const data = await comentarioResponse.json();

            if (data.exito) {
                // ✅ Limpiar input
                if (input) {
                    input.value = '';
                    input.placeholder = 'Escribe un comentario...';
                }
                this.quitarFotoComentario(resenaId);
                this.comentarioResponderId = null;

                // ✅ Insertar comentario en DOM
                if (data.comentario) {
                    this.insertarComentarioEnDOM(resenaId, data.comentario);
                }

                this.mostrarToast(
                    fotoUrl ? '✅ Comentario publicado con imagen' :
                        (foto ? '✅ Comentario publicado (imagen no subió)' : '✅ Comentario publicado'),
                    'success'
                );
            } else {
                this.mostrarToast('❌ ' + (data.mensaje || 'Error al comentar'), 'error');
            }

        } catch (error) {
            console.error('❌ Error general:', error);
            this.mostrarToast('❌ Error: ' + error.message, 'error');
        } finally {
            if (input) input.disabled = false;
        }
    }
    // ================================================================
    // 🔹 CONVERTIR DATA URL A BLOB (sin fetch)
    // ================================================================
    dataURLtoBlob(dataURL) {
        try {
            // Separar metadata del contenido
            const arr = dataURL.split(',');
            if (arr.length !== 2) {
                throw new Error('Data URL inválida');
            }

            // Extraer el MIME type de "data:image/jpeg;base64"
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            // Extraer el contenido base64
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);

            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            // Crear el Blob con el MIME correcto
            const blob = new Blob([u8arr], { type: mime });

            console.log('📸 Blob creado:', {
                type: blob.type,
                size: blob.size,
                mimeOriginal: mime
            });

            return blob;
        } catch (error) {
            console.error('❌ Error en dataURLtoBlob:', error);
            throw error;
        }
    }
    // ================================================================
    // 🔹 INSERTAR COMENTARIO EN DOM (sin recargar)
    // ================================================================
    insertarComentarioEnDOM(resenaId, comentario) {
        console.log('🔄 insertarComentarioEnDOM:', { resenaId, comentario });

        const contenedor = document.getElementById(`comentarios-${resenaId}`);
        if (!contenedor) {
            console.error('❌ Contenedor NO encontrado:', `comentarios-${resenaId}`);
            return;
        }

        // Mostrar contenedor
        contenedor.style.display = 'block';

        // Renderizar HTML
        const comentarioHTML = this.renderizarComentario(comentario, resenaId);
        console.log('📝 HTML generado:', comentarioHTML.substring(0, 100) + '...');

        // Buscar el input
        const input = document.getElementById(`input-comentario-${resenaId}`);
        if (!input) {
            console.error('❌ Input NO encontrado');
            contenedor.insertAdjacentHTML('beforeend', comentarioHTML);
            return;
        }

        // Insertar el comentario antes del formulario del input
        const inputRow = input.closest('div[style*="display:flex"]');
        if (inputRow && inputRow.parentElement) {
            inputRow.insertAdjacentHTML('beforebegin', comentarioHTML);
            console.log('✅ Comentario insertado antes del input');
        } else {
            contenedor.insertAdjacentHTML('beforeend', comentarioHTML);
            console.log('✅ Comentario insertado al final');
        }

        // Actualizar contador
        this.actualizarContadorComentarios(resenaId);

        // Scroll
        setTimeout(() => {
            const nuevoComentario = contenedor.querySelector(`#likes-c-${comentario._id}`)?.closest('div[style*="display:flex"]');
            if (nuevoComentario) {
                nuevoComentario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                nuevoComentario.style.transition = 'background 0.5s';
                nuevoComentario.style.background = 'rgba(0,255,136,0.1)';
                setTimeout(() => {
                    nuevoComentario.style.background = 'transparent';
                }, 1500);
            }
        }, 100);
    }
    // ================================================================
    // 🔹 ACTUALIZAR CONTADOR DE COMENTARIOS
    // ================================================================
    actualizarContadorComentarios(resenaId) {
        const resenaDiv = document.getElementById(`resena-${resenaId}`);
        if (!resenaDiv) return;

        const contenedorComentarios = document.getElementById(`comentarios-${resenaId}`);
        if (!contenedorComentarios) return;

        // Contar comentarios (excluyendo el formulario de input)
        // Los comentarios tienen la estructura: <div style="display:flex; gap:8px; margin-bottom:10px;">
        const todosLosDivs = contenedorComentarios.querySelectorAll(':scope > div');
        let totalComentarios = 0;

        todosLosDivs.forEach(div => {
            // El formulario de input NO tiene el botón de "Responder"
            // Los comentarios SÍ tienen un span con "💬 Responder"
            if (div.innerHTML.includes('💬 Responder')) {
                totalComentarios++;
            }
        });

        // Actualizar el span del contador
        const contadorSpan = resenaDiv.querySelector('span[style*="margin-left:auto"]');
        if (contadorSpan) {
            if (totalComentarios > 0) {
                contadorSpan.innerHTML = `💬 ${totalComentarios} comentario${totalComentarios !== 1 ? 's' : ''}`;
            } else {
                contadorSpan.innerHTML = '';
            }
        }
    }
    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    formatearFechaRelativa(fecha) {
        const diff = new Date() - new Date(fecha);
        const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
        if (m < 1) return 'Ahora mismo';
        if (m < 60) return `Hace ${m} min`;
        if (h < 24) return `Hace ${h}h`;
        if (d < 7) return `Hace ${d} días`;
        return new Date(fecha).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    mostrarToast(mensaje, tipo = 'info') {
        if (typeof window.mostrarToast === 'function') window.mostrarToast(mensaje, tipo);
    }

    // ================================================================
    // ⭐ PAGINACIÓN DE RESEÑAS
    // ================================================================

    renderizarListaPaginada() {
        const container = document.getElementById('lista-resenas-social');
        if (!container) return;

        const inicio = (this.resenasPaginaActual - 1) * this.resenasPorPagina;
        const fin = Math.min(inicio + this.resenasPorPagina, this.resenasTodas.length);
        const resenasPagina = this.resenasTodas.slice(inicio, fin);

        // Contador
        const contador = document.getElementById('contador-resenas');
        if (contador) {
            contador.innerHTML = `Mostrando <strong style="color:#00ff88;">${inicio + 1}-${fin}</strong> de <strong style="color:#00ff88;">${this.resenasTodas.length}</strong> reseñas`;
        }

        // Renderizar reseñas de esta página
        container.innerHTML = resenasPagina.map(r =>
            this.renderizarResenaSocial(r, this.reaccionesCache)
        ).join('');

        // Renderizar paginación
        this.renderizarPaginacionResenas();
    }

    renderizarPaginacionResenas() {
        const paginacion = document.getElementById('paginacion-resenas');
        if (!paginacion) return;

        if (this.resenasTotalPaginas <= 1) {
            paginacion.innerHTML = '';
            return;
        }

        const total = this.resenasTotalPaginas;
        const actual = this.resenasPaginaActual;
        const paginas = this.calcularPaginasResenas(actual, total);

        let html = '';

        // Anterior
        html += `<button class="btn-pagina nav-btn" onclick="window.resenasSocial.irAPaginaResenas(${actual - 1})" ${actual === 1 ? 'disabled' : ''}>← Anterior</button>`;

        // Primera si no está en el rango
        if (paginas[0] > 1) {
            html += `<button class="btn-pagina numero" onclick="window.resenasSocial.irAPaginaResenas(1)">1</button>`;
            if (paginas[0] > 2) html += `<span class="pagina-elipsis">...</span>`;
        }

        // Rango
        paginas.forEach(p => {
            html += `<button class="btn-pagina numero ${p === actual ? 'activa' : ''}" onclick="window.resenasSocial.irAPaginaResenas(${p})" ${p === actual ? 'disabled' : ''}>${p}</button>`;
        });

        // Última
        const ultima = paginas[paginas.length - 1];
        if (ultima < total) {
            if (ultima < total - 1) html += `<span class="pagina-elipsis">...</span>`;
            html += `<button class="btn-pagina numero" onclick="window.resenasSocial.irAPaginaResenas(${total})">${total}</button>`;
        }

        // Siguiente
        html += `<button class="btn-pagina nav-btn" onclick="window.resenasSocial.irAPaginaResenas(${actual + 1})" ${actual === total ? 'disabled' : ''}>Siguiente →</button>`;

        paginacion.innerHTML = html;
    }

    calcularPaginasResenas(actual, total) {
        const max = 5;
        if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
        let inicio = Math.max(1, actual - Math.floor(max / 2));
        let fin = Math.min(total, inicio + max - 1);
        if (fin - inicio < max - 1) inicio = Math.max(1, fin - max + 1);
        return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    }

    irAPaginaResenas(pagina) {
        if (pagina < 1 || pagina > this.resenasTotalPaginas || isNaN(pagina)) return;
        this.resenasPaginaActual = pagina;
        this.renderizarListaPaginada();

        // Scroll al inicio de las reseñas
        document.getElementById('lista-resenas-social')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cambiarOrdenResenas(orden) {
        this.resenasOrden = orden;
        this.resenasPaginaActual = 1;

        // Ordenar
        if (orden === 'mejor') {
            this.resenasTodas.sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
        } else if (orden === 'peor') {
            this.resenasTodas.sort((a, b) => (a.puntuacion || 0) - (b.puntuacion || 0));
        } else {
            // recientes (por defecto)
            this.resenasTodas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }

        this.renderizarListaPaginada();
    }
}





export default ResenasSocialManager;