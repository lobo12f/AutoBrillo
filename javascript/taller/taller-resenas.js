// ====================================================================
// ⭐ GESTIÓN DE RESEÑAS DEL TALLER
// ====================================================================
import { apiFetch } from '../api-client.js';
export class GestionResenas {

    constructor(apiUrl, tallerActual) {
        this.API_URL = apiUrl;
        this.tallerActual = tallerActual;
        this.resenaActualId = null;
    }

    /**s
     * Cargar todas las reseñas
     */
    async cargar() {
        const container = document.getElementById('lista-resenas-taller');
        if (!container) return;

        // ✅ Solo mostrar "Cargando..." si es la primera vez
        if (!container.querySelector('[data-resena-id]')) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">⏳ Cargando reseñas...</p>';
        }

        const filtroEstrellas = document.getElementById('filtro-resenas-estrellas')?.value || 'TODAS';
        const busqueda = (document.getElementById('busqueda-resena')?.value || '').toLowerCase().trim();

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/resenas-admin`);
            const data = await response.json();

            if (data.exito) {
                this.renderizarEstadisticas(data);
                this.resenas = data.resenas || [];   // ✅ NUEVO: guardar en la instancia

                let resenas = data.resenas || [];

                if (filtroEstrellas === 'SIN_RESPUESTA') {
                    resenas = resenas.filter(r => !r.respuesta);
                } else if (filtroEstrellas !== 'TODAS') {
                    resenas = resenas.filter(r => r.puntuacion === parseInt(filtroEstrellas));
                }

                if (busqueda) {
                    resenas = resenas.filter(r =>
                        (r.cliente?.nombre || '').toLowerCase().includes(busqueda) ||
                        (r.comentario || '').toLowerCase().includes(busqueda) ||
                        (r.respuesta || '').toLowerCase().includes(busqueda)
                    );
                }

                if (resenas.length === 0) {
                    container.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">📭 No se encontraron reseñas</p>';
                } else {
                    container.innerHTML = resenas.map(r => this.renderizarResena(r)).join('');
                }
            }
        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444; text-align:center;">Error al cargar reseñas</p>';
        }
    }

    /**
     * Renderizar estadísticas
     */
    renderizarEstadisticas(data) {
        const container = document.getElementById('stats-resenas');
        if (!container) return;

        const promedio = data.promedio || 0;
        const total = data.total || 0;
        const positivas = data.resenas?.filter(r => r.puntuacion >= 4).length || 0;
        const porcentajePositivas = total > 0 ? Math.round((positivas / total) * 100) : 0;

        container.innerHTML = `
            <div style="background:#131c2b; border:1px solid #1e2a3a; border-radius:10px; padding:15px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#ffbb33;">${promedio.toFixed(1)} ⭐</div>
                <small style="color:#888;">Promedio</small>
            </div>
            <div style="background:#131c2b; border:1px solid #1e2a3a; border-radius:10px; padding:15px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#00d4ff;">${total}</div>
                <small style="color:#888;">Total Reseñas</small>
            </div>
            <div style="background:#131c2b; border:1px solid #1e2a3a; border-radius:10px; padding:15px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#00ff88;">${porcentajePositivas}%</div>
                <small style="color:#888;">Positivas (4-5⭐)</small>
            </div>
            <div style="background:#131c2b; border:1px solid #1e2a3a; border-radius:10px; padding:15px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#ff4444;">${data.sinResponder || 0}</div>
                <small style="color:#888;">Sin Responder</small>
            </div>
        `;
    }

    /**
  * Renderizar una reseña individual
  */
    renderizarResena(resena) {
        const fecha = new Date(resena.fecha).toLocaleDateString('es-DO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const tieneRespuesta = resena.respuesta && resena.respuesta.trim() !== '';
        const clienteNombre = resena.cliente?.nombre || 'Cliente';
        const clienteInicial = clienteNombre.charAt(0).toUpperCase();
        const id = resena._id;
        const comentarios = resena.comentarios || [];
        const fotos = resena.fotos || [];

        // ✅ Foto del cliente
        const fotoCliente = resena.cliente?.foto &&
            resena.cliente.foto !== 'null' &&
            resena.cliente.foto.trim() !== ''
            ? resena.cliente.foto
            : null;

        return `
<div data-resena-id="${id}" style="background:#131c2b; border:1px solid ${tieneRespuesta ? '#00ff8830' : '#ffbb3330'}; border-radius:12px; padding:20px; ${!tieneRespuesta ? 'border-left:3px solid #ffbb33;' : ''}">
    
    <!-- Cabecera -->
    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
            <!-- ✅ Avatar del cliente CON FOTO y data-* -->
            ${fotoCliente ? `
                <img src="${fotoCliente}" 
                    data-cliente-avatar="${resena.cliente?.id || ''}"
                    style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid #ffbb33;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display:none; width:45px; height:45px; border-radius:50%; background:rgba(255,187,51,0.1); align-items:center; justify-content:center; font-weight:700; color:#ffbb33; font-size:1.1rem;">
                    ${clienteInicial}
                </div>
            ` : `
                <div style="width:45px; height:45px; border-radius:50%; background:rgba(255,187,51,0.1); display:flex; align-items:center; justify-content:center; font-weight:700; color:#ffbb33; font-size:1.1rem;">
                    ${clienteInicial}
                </div>
            `}
            <div>
                <strong style="color:#fff;">${clienteNombre}</strong>
                <div style="color:#ffbb33;">${'⭐'.repeat(resena.puntuacion)}${'☆'.repeat(5 - resena.puntuacion)}</div>
            </div>
        </div>
        <div style="text-align:right;">
            <small style="color:#888;">${fecha}</small>
            ${!tieneRespuesta ? '<br><span style="background:#ffbb3322; color:#ffbb33; padding:2px 8px; border-radius:10px; font-size:0.65rem;">Pendiente</span>' : ''}
        </div>
    </div>
    
    <!-- Comentario de la reseña -->
    ${resena.comentario ? `
    <div style="background:#080c14; border-radius:8px; padding:15px; margin-bottom:12px;">
        <p style="color:#aaa; margin:0; font-size:0.9rem; line-height:1.5;">"${resena.comentario}"</p>
    </div>` : ''}

    <!-- Fotos de la reseña -->
    ${fotos.length > 0 ? `
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        ${fotos.map(f => `
            <img src="${f}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; cursor:pointer;" 
                onclick="window.verFotoGrande?.('${f}')">
        `).join('')}
    </div>` : ''}

   <!-- Respuesta del taller -->
${tieneRespuesta ? `
<div style="background:rgba(0,255,136,0.03); border:1px solid rgba(0,255,136,0.1); border-radius:8px; padding:15px; margin-bottom:12px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
        ${this.tallerActual?.logo ? `
            <img src="${this.tallerActual.logo}" 
                data-taller-logo="true"
                style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:1.5px solid #00ff88;"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display:none; width:24px; height:24px; border-radius:50%; background:rgba(0,255,136,0.15); align-items:center; justify-content:center; border:1.5px solid #00ff88;">
                <span style="font-size:0.7rem;">🏪</span>
            </div>
        ` : `
            <div style="width:24px; height:24px; border-radius:50%; background:rgba(0,255,136,0.15); display:flex; align-items:center; justify-content:center; border:1.5px solid #00ff88;">
                <span style="font-size:0.7rem;">🏪</span>
            </div>
        `}
        <strong style="color:#00ff88; font-size:0.85rem;">Tu respuesta:</strong>
    </div>
    <p style="color:#ccc; margin:0; font-size:0.85rem; padding-left:32px;">${resena.respuesta}</p>
    <small style="color:#888; padding-left:32px;">${resena.fechaRespuesta ? new Date(resena.fechaRespuesta).toLocaleString('es-DO') : ''}</small>
</div>` : ''}

    <!-- Comentarios de clientes -->
    ${comentarios.length > 0 ? `
    <div style="background:#080c14; border-radius:8px; padding:12px; margin-bottom:12px;">
        <p style="color:#888; font-size:0.8rem; margin-bottom:8px;">💬 ${comentarios.length} comentario${comentarios.length !== 1 ? 's' : ''} de clientes:</p>
        ${comentarios.map(c => this.renderizarComentarioTaller(c, id)).join('')}
    </div>` : ''}

    <!-- Botones -->
    <div style="display:flex; gap:8px;">
        ${tieneRespuesta ? `
        <button onclick="window.gestionResenas.abrirModalRespuesta('${id}')" 
            style="padding:8px 15px; background:transparent; border:1px solid #00ff88; color:#00ff88; border-radius:6px; cursor:pointer; font-size:0.8rem;">
            ✏️ Editar
        </button>
        <button onclick="window.gestionResenas.eliminarRespuesta('${id}')" 
            style="padding:8px 15px; background:transparent; border:1px solid #ff4444; color:#ff4444; border-radius:6px; cursor:pointer; font-size:0.8rem;">
            🗑️ Eliminar
        </button>` : `
        <button onclick="window.gestionResenas.abrirModalRespuesta('${id}')" 
            style="padding:8px 15px; background:#ffbb33; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;">
            💬 Responder
        </button>`}
        ${resena.cliente?.email ? `
        <button onclick="window.gestionResenas.contactarCliente('${resena.cliente.email}')" 
            style="padding:8px 15px; background:transparent; border:1px solid #00d4ff; color:#00d4ff; border-radius:6px; cursor:pointer; font-size:0.8rem;">
            📧 Contactar
        </button>` : ''}
    </div>
</div>`;
    }

    /**
   * Renderizar un comentario en el panel del taller
   */
    renderizarComentarioTaller(comentario, resenaId, nivel = 0) {
        const fecha = new Date(comentario.fecha).toLocaleString('es-DO', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const tieneFoto = comentario.foto && comentario.foto !== 'null' && comentario.foto.trim() !== '';

        const tipoAutor = comentario.autor?.tipo || 'CLIENTE';
        const badges = {
            CLIENTE: { color: '#ffbb33', icono: '👤', label: 'Cliente' },
            EMPLEADO: { color: '#00ff88', icono: '👨‍🔧', label: 'Empleado' },
            TALLER: { color: '#00d4ff', icono: '🏪', label: 'Taller' }
        };
        const badge = badges[tipoAutor] || badges.CLIENTE;

        const nombre = comentario.autor?.nombre || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();

        const fotoAutor = comentario.autor?.foto &&
            comentario.autor.foto !== 'null' &&
            comentario.autor.foto.trim() !== ''
            ? comentario.autor.foto
            : null;

        const tieneRespuestas = comentario.respuestas && comentario.respuestas.length > 0;

        // ✅ Indentación
        const nivelVisual = nivel;   // ✅ Sin límite
        const indentacion = Math.min(nivelVisual * 16, 200);   // ✅ Limitar indentación total
        const coloresLinea = ['#1e2a3a', '#2a3a4a', '#3a4a5a', '#4a5a6a', '#5a6a7a'];
        const colorLinea = coloresLinea[nivelVisual] || '#5a6a7a';

        return `
<div style="
    ${nivel > 0 ? `
        margin-left: ${indentacion}px;
        padding-left: 10px;
        border-left: 2px solid ${colorLinea};
        margin-top: 6px;
    ` : 'margin-bottom:8px;'}
">
    <div style="display:flex; gap:8px; padding:8px; background:rgba(255,255,255,0.01); border-radius:8px;">
        
        <!-- Avatar -->
        <div style="position:relative; flex-shrink:0;">
            ${fotoAutor ? `
                <img src="${fotoAutor}" 
                    ${tipoAutor === 'CLIENTE' ? `data-cliente-avatar="${comentario.autor?.id || ''}"` : ''}
                    ${tipoAutor === 'EMPLEADO' ? `data-empleado-avatar="true" data-empleado-id="${comentario.autor?.id || ''}"` : ''}
                    ${tipoAutor === 'TALLER' ? `data-taller-logo="true"` : ''}
                    style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1.5px solid ${badge.color};"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display:none; width:32px; height:32px; border-radius:50%; background:${badge.color}20; align-items:center; justify-content:center; font-weight:700; color:${badge.color}; font-size:0.7rem;">
                    ${inicial}
                </div>
            ` : `
                <div style="width:32px; height:32px; border-radius:50%; background:${badge.color}20; display:flex; align-items:center; justify-content:center; font-weight:700; color:${badge.color}; font-size:0.7rem;">
                    ${inicial}
                </div>
            `}
            
            <div style="
                position:absolute; bottom:-2px; right:-2px;
                width:14px; height:14px; border-radius:50%;
                background:#131c2b; border:1.5px solid ${badge.color};
                display:flex; align-items:center; justify-content:center;
                font-size:0.5rem;
                z-index:1;
            ">${badge.icono}</div>
        </div>

        <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px; flex-wrap:wrap;">
                <strong style="color:#fff; font-size:0.75rem;">${nombre}</strong>
                ${tipoAutor !== 'CLIENTE' ? `
                <span style="background:${badge.color}15; color:${badge.color}; padding:1px 5px; border-radius:8px; font-size:0.55rem; font-weight:600;">
                    ${badge.label}
                </span>` : ''}
                <span style="color:#888; font-size:0.65rem;">${fecha}</span>
            </div>

            ${comentario.texto ? `<p style="color:#aaa; margin:0 0 5px 0; font-size:0.8rem;">${comentario.texto}</p>` : ''}

            ${tieneFoto ? `
            <img src="${comentario.foto}" 
                style="max-width:120px; max-height:120px; border-radius:6px; margin-bottom:5px; cursor:pointer;" 
                onclick="window.verFotoGrande?.('${comentario.foto}')"
                onerror="this.style.display='none'">` : ''}

            <div style="display:flex; gap:8px;">
                <span onclick="window.gestionResenas.likeComentario('${comentario._id}')" 
                    style="color:#888; font-size:0.65rem; cursor:pointer;"
                    onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='#888'">
                    ❤️ ${comentario.likes || 0}
                </span>
                <span onclick="window.gestionResenas.responderComentario('${resenaId}', '${comentario._id}', '${nombre}')" 
                    style="color:#888; font-size:0.65rem; cursor:pointer;"
                    onmouseover="this.style.color='#00d4ff'" onmouseout="this.style.color='#888'">
                    💬 Responder
                </span>
                <span onclick="window.gestionResenas.eliminarComentario('${comentario._id}', '${resenaId}')" 
                    style="color:#888; font-size:0.65rem; cursor:pointer;"
                    onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='#888'">
                    🗑️ Eliminar
                </span>
            </div>

            ${tieneRespuestas ? `
            <div style="margin-top:6px; padding-top:4px; border-top:1px dashed #1e2a3a;">
                <span style="color:#666; font-size:0.6rem;">
                    ↳ ${comentario.respuestas.length} respuesta${comentario.respuestas.length !== 1 ? 's' : ''}
                </span>
            </div>` : ''}
        </div>
    </div>

    <!-- ✅ RESPUESTAS ANIDADAS (RECURSIVO) -->
    ${tieneRespuestas ? `
    <div style="margin-top:4px;">
        ${comentario.respuestas.map(r => this.renderizarComentarioTaller(r, resenaId, nivel + 1)).join('')}
    </div>` : ''}
</div>`;
    }

    /**
     * Abrir modal para responder
     */
    abrirModalRespuesta(resenaId, textoPredefinido = '') {
        this.resenaActualId = resenaId;

        apiFetch(`/talleres/${this.tallerActual._id}/resenas-admin`)
            .then(r => r.json())
            .then(data => {
                const resena = data.resenas?.find(r => r._id === resenaId);
                if (resena) {
                    document.getElementById('respuesta-resena-id').value = resenaId;
                    document.getElementById('respuesta-texto').value = textoPredefinido || resena.respuesta || '';

                    document.getElementById('resena-original').innerHTML = `
                    <div style="color:#ffbb33; margin-bottom:5px;">${'⭐'.repeat(resena.puntuacion)}</div>
                    <p style="color:#aaa; margin:0;">"${resena.comentario || 'Sin comentario'}"</p>
                    <small style="color:#888;">- ${resena.cliente?.nombre || 'Cliente'}</small>
                `;

                    document.getElementById('modal-responder-resena').style.display = 'flex';
                }
            });
    }

    /**
     * Enviar respuesta
     */
    async enviarRespuesta() {
        const resenaId = document.getElementById('respuesta-resena-id').value;
        const respuesta = document.getElementById('respuesta-texto').value.trim();

        if (!respuesta) {
            alert('⚠️ Escribe una respuesta');
            return;
        }
        // ✅ NUEVO: Verificar si ya existe una respuesta
        const resenaActual = this.resenas?.find(r => r._id === resenaId);
        if (resenaActual?.respuesta && resenaActual.respuesta.trim() !== '') {
            const confirmar = confirm(
                `⚠️ Esta reseña ya tiene una respuesta:\n\n"${resenaActual.respuesta}"\n\n` +
                `¿Quieres SOBREESCRIBIRLA con la nueva respuesta?`
            );
            if (!confirmar) return;
        }
        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/resenas/${resenaId}/responder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ respuesta })
            });

            const data = await response.json();

            if (data.exito) {
                alert('✅ Respuesta guardada');
                document.getElementById('modal-responder-resena').style.display = 'none';
                this.cargar();
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            alert('❌ Error de conexión');
        }
    }

    /**
     * Eliminar respuesta
     */
    async eliminarRespuesta(resenaId) {
        if (!confirm('¿Eliminar la respuesta a esta reseña?')) return;

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/resenas/${resenaId}/responder`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.exito) {
                alert('✅ Respuesta eliminada');
                this.cargar();
            }
        } catch (error) {
            alert('❌ Error');
        }
    }

    /**
     * Contactar cliente por email
     */
    contactarCliente(email) {
        const subject = `Respuesta a tu reseña - ${this.tallerActual?.nombre || 'Taller'}`;
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`, '_blank');
    }

    /**
 * Dar like a un comentario
 */
    async likeComentario(comentarioId) {
        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/comentarios/${comentarioId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'taller' })
            });

            const data = await response.json();
            if (data.exito) {
                this.cargar(); // Recargar reseñas
            }
        } catch (error) {
            console.error('Error al dar like:', error);
        }
    }

    /**
     * Responder a un comentario (abre el modal con pre-texto)
     */
    responderComentario(resenaId, comentarioId, nombreCliente) {
        // Guardar referencia del comentario que se está respondiendo
        this.comentarioResponderId = comentarioId;

        // Abrir modal de respuesta con texto predefinido
        this.abrirModalRespuesta(resenaId, `@${nombreCliente} `);
    }

    /**
     * Eliminar un comentario
     */
    async eliminarComentario(comentarioId, resenaId) {
        if (!confirm('¿Eliminar este comentario?')) return;

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/comentarios/${comentarioId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.exito) {
                alert('✅ Comentario eliminado');
                this.cargar(); // Recargar reseñas
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            alert('❌ Error de conexión');
        }
    }
}

export default GestionResenas;