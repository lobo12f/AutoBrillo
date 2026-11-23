// ====================================================================
// ⭐ MÓDULO DE RESEÑAS - EMPLEADO (VERSIÓN CON RESPUESTAS SEPARADAS)
// ====================================================================
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';
const ResenasEmpleado = {
    // Estado
    resenas: [],
    resenaActualId: null,

    // ============================================================
    // 🔹 INICIALIZAR
    // ============================================================
    iniciar() {
        console.log('⭐ Módulo de Reseñas Empleado iniciado');

        window.cargarResenasEmpleado = this.cargar.bind(this);
        window.filtrarResenasEmpleado = this.filtrar.bind(this);
        window.abrirModalRespuestaEmpleado = this.abrirModalRespuesta.bind(this);
        window.enviarRespuestaEmpleado = this.enviarRespuesta.bind(this);
        window.eliminarRespuestaEmpleado = this.eliminarRespuesta.bind(this);
        window.contactarClienteEmpleado = this.contactar.bind(this);
        window.likeComentarioEmpleado = this.likeComentario.bind(this);
        window.responderComentarioEmpleado = this.responderComentario.bind(this);
        window.eliminarComentarioEmpleado = this.eliminarComentario.bind(this);
        window.reaccionarResena = this.reaccionarResena.bind(this);
        window.usuarioYaReacciono = this.usuarioYaReacciono.bind(this);
        window.verFotoGrande = this.verFotoGrande.bind(this);
        window.responderComentarioTaller = this.responderComentarioTaller.bind(this);

        window.ResenasEmpleado = this;
    },

    // ============================================================
    // 🔹 CARGAR RESEÑAS
    // ============================================================
    async cargar() {
        const container = document.getElementById('lista-resenas-empleado');
        if (!container) return;

        container.innerHTML = '<p style="color:#888; text-align:center; padding:30px;">⏳ Cargando reseñas...</p>';

        const filtroEstrellas = document.getElementById('filtro-resenas-estrellas')?.value || 'TODAS';
        const busqueda = (document.getElementById('busqueda-resena')?.value || '').toLowerCase().trim();

        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                console.error('❌ IDs no encontrados');
                container.innerHTML = '<p style="color:#ff4444; text-align:center; padding:30px;">❌ Error: No se encontró la sesión</p>';
                return;
            }


            const response = await apiFetch(`/talleres/${tallerId}/empleado/${empleadoId}/resenas`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.exito) {
                this.resenas = data.resenas || [];
                this.renderizarEstadisticas(data);

                let resenas = [...this.resenas];

                if (filtroEstrellas === 'SIN_RESPUESTA') {
                    resenas = resenas.filter(r =>
                        !r.respuestaEmpleado || r.respuestaEmpleado.trim() === ''
                    );
                } else if (filtroEstrellas !== 'TODAS') {
                    resenas = resenas.filter(r => r.puntuacion === parseInt(filtroEstrellas));
                }

                if (busqueda) {
                    resenas = resenas.filter(r =>
                        (r.cliente?.nombre || '').toLowerCase().includes(busqueda) ||
                        (r.comentario || '').toLowerCase().includes(busqueda) ||
                        (r.respuestaEmpleado || '').toLowerCase().includes(busqueda) ||
                        (r.respuestaTaller || '').toLowerCase().includes(busqueda)
                    );
                }

                container.innerHTML = resenas.length === 0
                    ? '<p style="color:#888; text-align:center; padding:30px;">📭 No se encontraron reseñas</p>'
                    : resenas.map(r => this.renderizarResena(r)).join('');
            } else {
                container.innerHTML = `<p style="color:#ff4444; text-align:center; padding:30px;">❌ ${data.mensaje || 'Error al cargar reseñas'}</p>`;
            }
        } catch (error) {
            console.error('❌ Error:', error);
            container.innerHTML = `<p style="color:#ff4444; text-align:center; padding:30px;">❌ Error: ${error.message}</p>`;
        }
    },

    // ============================================================
    // 🔹 FILTRAR
    // ============================================================
    filtrar() {
        this.cargar();
    },

    // ============================================================
    // 🔹 RENDERIZAR ESTADÍSTICAS
    // ============================================================
    renderizarEstadisticas(data) {
        const container = document.getElementById('stats-resenas');
        if (!container) return;

        const promedio = data.promedio || 0;
        const total = data.total || 0;
        const positivas = this.resenas?.filter(r => r.puntuacion >= 4).length || 0;
        const porcentajePositivas = total > 0 ? Math.round((positivas / total) * 100) : 0;
        const sinResponderEmpleado = this.resenas?.filter(r => !r.respuestaEmpleado || r.respuestaEmpleado.trim() === '').length || 0;

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
                <div style="font-size:2rem; font-weight:700; color:#ffbb33;">${sinResponderEmpleado}</div>
                <small style="color:#888;">Sin responder (tú)</small>
            </div>
        `;
    },

    // ============================================================
    // 🔹 RENDERIZAR RESEÑA (CON RESPUESTAS SEPARADAS)
    // ============================================================
    renderizarResena(resena) {
        const fecha = new Date(resena.fecha).toLocaleDateString('es-DO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const tieneRespuestaEmpleado = resena.respuestaEmpleado && resena.respuestaEmpleado.trim() !== '';
        const tieneRespuestaTaller = resena.respuestaTaller && resena.respuestaTaller.trim() !== '';
        const clienteNombre = resena.cliente?.nombre || 'Cliente';
        const clienteInicial = clienteNombre.charAt(0).toUpperCase();
        const comentarios = resena.comentarios || [];
        const fotos = resena.fotos || [];

        // ✅ Foto del cliente
        const fotoCliente = resena.cliente?.foto &&
            resena.cliente.foto !== 'null' &&
            resena.cliente.foto.trim() !== ''
            ? resena.cliente.foto
            : null;

        // ✅ Foto del empleado actual desde localStorage
        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const fotoEmpleadoActual = sesionEmpleado?.empleado?.fotoPerfil || null;

        return `
<div data-resena-id="${resena._id}" style="background:#131c2b; border:1px solid ${tieneRespuestaEmpleado ? '#00ff8830' : '#ffbb3330'}; border-radius:12px; padding:20px; ${!tieneRespuestaEmpleado ? 'border-left:3px solid #ffbb33;' : ''}">
    
    <!-- Cabecera -->
    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
            <!-- ✅ Avatar del cliente con foto -->
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
                <small style="color:#666; font-size:0.7rem;">${resena.vehiculo?.marca || ''} ${resena.vehiculo?.modelo || ''}</small>
            </div>
        </div>
        <div style="text-align:right;">
            <small style="color:#888; font-size:0.75rem;">${fecha}</small>
            ${!tieneRespuestaEmpleado ? '<br><span style="background:#ffbb3322; color:#ffbb33; padding:2px 8px; border-radius:10px; font-size:0.65rem;">Pendiente</span>' : ''}
        </div>
    </div>
    
    <!-- Comentario del cliente -->
    ${resena.comentario ? `
    <div style="background:#080c14; border-radius:8px; padding:12px 15px; margin-bottom:10px;">
        <p style="color:#aaa; margin:0; font-size:0.85rem; line-height:1.5;">"${resena.comentario}"</p>
    </div>` : ''}

    <!-- Fotos -->
    ${fotos && fotos.length > 0 ? `
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
        ${fotos.map(f => {
            const url = typeof f === 'string' ? f : (f?.url || f?.Url || '');
            if (!url) return '';
            return `
                <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer;" 
                    onclick="window.verFotoGrande('${url}')">
            `;
        }).filter(Boolean).join('')}
    </div>` : ''}

    <!-- ✅ RESPUESTA DEL TALLER -->
    ${tieneRespuestaTaller ? `
    <div style="background:rgba(0,212,255,0.04); border-left:3px solid #00d4ff; border-radius:6px; padding:10px 12px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <div style="width:24px; height:24px; border-radius:50%; background:rgba(0,212,255,0.1); display:flex; align-items:center; justify-content:center; border:1.5px solid #00d4ff;">
                <span style="font-size:0.7rem;">🏪</span>
            </div>
            <strong style="color:#00d4ff; font-size:0.75rem; letter-spacing:0.5px;">RESPUESTA DEL TALLER</strong>
            <small style="color:#666; font-size:0.65rem; margin-left:auto;">
                ${resena.fechaRespuestaTaller ? new Date(resena.fechaRespuestaTaller).toLocaleDateString('es-DO') : ''}
            </small>
        </div>
        <p style="color:#bbb; margin:0; font-size:0.8rem; line-height:1.4; padding-left:32px;">${resena.respuestaTaller}</p>
    </div>` : ''}

    <!-- ✅ RESPUESTA DEL EMPLEADO (CON FOTO) -->
    ${tieneRespuestaEmpleado ? `
    <div style="background:rgba(0,255,136,0.04); border-left:3px solid #00ff88; border-radius:6px; padding:10px 12px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            ${fotoEmpleadoActual ? `
                <img src="${fotoEmpleadoActual}" 
                    style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:1.5px solid #00ff88;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display:none; width:24px; height:24px; border-radius:50%; background:rgba(0,255,136,0.1); align-items:center; justify-content:center; border:1.5px solid #00ff88;">
                    <span style="font-size:0.7rem;">👨‍🔧</span>
                </div>
            ` : `
                <div style="width:24px; height:24px; border-radius:50%; background:rgba(0,255,136,0.1); display:flex; align-items:center; justify-content:center; border:1.5px solid #00ff88;">
                    <span style="font-size:0.7rem;">👨‍🔧</span>
                </div>
            `}
            <strong style="color:#00ff88; font-size:0.75rem; letter-spacing:0.5px;">TU RESPUESTA</strong>
            <small style="color:#666; font-size:0.65rem; margin-left:auto;">
                ${resena.fechaRespuestaEmpleado ? new Date(resena.fechaRespuestaEmpleado).toLocaleDateString('es-DO') : ''}
            </small>
        </div>
        <p style="color:#bbb; margin:0; font-size:0.8rem; line-height:1.4; padding-left:32px;">${resena.respuestaEmpleado}</p>
    </div>` : ''}

    <!-- Comentarios (hilos anidados) -->
    ${comentarios && comentarios.length > 0 ? `
    <div style="background:#0a0f1a; border-radius:10px; padding:12px; margin-bottom:12px; border:1px solid #1a2332;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #1a2332;">
            <span style="font-size:0.9rem;">💬</span>
            <strong style="color:#fff; font-size:0.8rem;">Comentarios</strong>
            <span style="color:#666; font-size:0.7rem;">(${comentarios.length})</span>
        </div>
        ${comentarios.map(c => this.renderizarComentario(c, resena._id, 0)).join('')}
    </div>` : ''}

    <!-- ✅ REACCIONES -->
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:10px 0; border-top:1px solid #1e2a3a;">
        <span style="color:#666; font-size:0.7rem; margin-right:4px;">Reaccionar:</span>

        <!-- ❤️ Me gusta -->
        <button onclick="window.reaccionarResena('${resena._id}', 'likes')" 
            style="
                padding:5px 12px; 
                background:${this.usuarioYaReacciono(resena, 'likes') ? 'rgba(255,68,68,0.15)' : 'transparent'}; 
                border:1px solid ${this.usuarioYaReacciono(resena, 'likes') ? '#ff4444' : '#333'}; 
                color:${this.usuarioYaReacciono(resena, 'likes') ? '#ff4444' : '#888'}; 
                border-radius:20px; 
                cursor:pointer; 
                font-size:0.75rem;
                display:flex; 
                align-items:center; 
                gap:4px;
                transition: all 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'" 
            onmouseout="this.style.transform='scale(1)'">
            ❤️ <span>${resena.reacciones?.likes || 0}</span>
        </button>

        <!-- 👍 Útil -->
        <button onclick="window.reaccionarResena('${resena._id}', 'util')" 
            style="
                padding:5px 12px; 
                background:${this.usuarioYaReacciono(resena, 'util') ? 'rgba(0,212,255,0.15)' : 'transparent'}; 
                border:1px solid ${this.usuarioYaReacciono(resena, 'util') ? '#00d4ff' : '#333'}; 
                color:${this.usuarioYaReacciono(resena, 'util') ? '#00d4ff' : '#888'}; 
                border-radius:20px; 
                cursor:pointer; 
                font-size:0.75rem;
                display:flex; 
                align-items:center; 
                gap:4px;
                transition: all 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'" 
            onmouseout="this.style.transform='scale(1)'">
            👍 <span>${resena.reacciones?.util || 0}</span>
        </button>

        <!-- 🙏 Gracias -->
        <button onclick="window.reaccionarResena('${resena._id}', 'gracias')" 
            style="
                padding:5px 12px; 
                background:${this.usuarioYaReacciono(resena, 'gracias') ? 'rgba(255,187,51,0.15)' : 'transparent'}; 
                border:1px solid ${this.usuarioYaReacciono(resena, 'gracias') ? '#ffbb33' : '#333'}; 
                color:${this.usuarioYaReacciono(resena, 'gracias') ? '#ffbb33' : '#888'}; 
                border-radius:20px; 
                cursor:pointer; 
                font-size:0.75rem;
                display:flex; 
                align-items:center; 
                gap:4px;
                transition: all 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'" 
            onmouseout="this.style.transform='scale(1)'">
            🙏 <span>${resena.reacciones?.gracias || 0}</span>
        </button>
    </div>

    <!-- Botones de acción -->
    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid #1e2a3a;">
        ${tieneRespuestaEmpleado ? `
        <button onclick="window.abrirModalRespuestaEmpleado('${resena._id}')" 
            style="padding:6px 12px; background:transparent; border:1px solid #00ff88; color:#00ff88; border-radius:6px; cursor:pointer; font-size:0.75rem;">
            ✏️ Editar
        </button>
        <button onclick="window.eliminarRespuestaEmpleado('${resena._id}')" 
            style="padding:6px 12px; background:transparent; border:1px solid #ff4444; color:#ff4444; border-radius:6px; cursor:pointer; font-size:0.75rem;">
            🗑️ Eliminar
        </button>` : `
        <button onclick="window.abrirModalRespuestaEmpleado('${resena._id}')" 
            style="padding:6px 12px; background:#ffbb33; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:600;">
            💬 Responder
        </button>`}
        ${resena.cliente?.email ? `
        <button onclick="window.contactarClienteEmpleado('${resena.cliente.email}')" 
            style="padding:6px 12px; background:transparent; border:1px solid #00d4ff; color:#00d4ff; border-radius:6px; cursor:pointer; font-size:0.75rem;">
            📧 Contactar
        </button>` : ''}
    </div>
</div>`;
    },
    // ============================================================
    // 🔹 HELPER: ¿El usuario actual ya reaccionó?
    // ============================================================
    usuarioYaReacciono(resena, tipo) {
        if (!resena.reaccionesUsuarios) return false;

        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const empleadoId = sesionEmpleado?.empleado?._id?.toString() ||
            sesionEmpleado?._id?.toString() ||
            sesionEmpleado?.id?.toString();

        if (!empleadoId) return false;

        const key = `${empleadoId}_${tipo}`;
        return !!resena.reaccionesUsuarios[key];
    },

    // ============================================================
    // 🔹 REACCIONAR A UNA RESEÑA
    // ============================================================
    async reaccionarResena(resenaId, tipo) {
        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() ||
                sesionEmpleado?._id?.toString() ||
                sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() ||
                tallerActual?.id?.toString() ||
                sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                alert('❌ Error: No se encontró la sesión');
                return;
            }


            const url = `/talleres/${tallerId}/resenas/${resenaId}/reaccionar`;

            console.log('❤️ Reaccionando:', { resenaId, tipo, empleadoId });

            const response = await apiFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: tipo,
                    userId: empleadoId
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            const data = await response.json();

            if (data.exito) {
                console.log(`✅ Reacción ${data.accion}:`, data.reacciones);

                // ✅ Actualizar solo esa reseña localmente (sin recargar todo)
                const resena = this.resenas.find(r => r._id === resenaId);
                if (resena) {
                    resena.reacciones = data.reacciones;
                    resena.reaccionesUsuarios = data.reaccionesUsuarios;
                }

                // ✅ Re-renderizar solo esa reseña (más rápido)
                this.actualizarResenaEnDOM(resenaId);
            } else {
                alert('❌ ' + (data.mensaje || 'Error al reaccionar'));
            }

        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
        }
    },

    // ============================================================
    // 🔹 ACTUALIZAR RESEÑA EN EL DOM (sin recargar todo)
    // ============================================================
    actualizarResenaEnDOM(resenaId) {
        const resena = this.resenas.find(r => r._id === resenaId);
        if (!resena) return;

        // Buscar el card en el DOM
        const cards = document.querySelectorAll('[data-resena-id]');
        for (const card of cards) {
            if (card.getAttribute('data-resena-id') === resenaId) {
                // Reemplazar el HTML del card completo
                const nuevaHTML = this.renderizarResena(resena);
                const temp = document.createElement('div');
                temp.innerHTML = nuevaHTML;
                const nuevoCard = temp.firstElementChild;
                nuevoCard.setAttribute('data-resena-id', resenaId);
                card.replaceWith(nuevoCard);
                break;
            }
        }
    },
    // ============================================================
    // 🔹 RENDERIZAR COMENTARIO (RECURSIVO - Estilo Instagram)
    // ============================================================
    renderizarComentario(comentario, resenaId, nivel = 0) {
        const fecha = new Date(comentario.fecha).toLocaleString('es-DO', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        // Extraer foto del comentario
        let fotoUrl = null;
        if (comentario.foto) {
            if (typeof comentario.foto === 'string') fotoUrl = comentario.foto;
            else if (comentario.foto.url) fotoUrl = comentario.foto.url;
        }
        const tieneFoto = fotoUrl && fotoUrl !== 'null' && fotoUrl.trim() !== '';

        // Badge por tipo de autor
        const tipoAutor = comentario.autor?.tipo || 'CLIENTE';
        const badges = {
            CLIENTE: { color: '#ffbb33', icono: '👤', label: 'Cliente' },
            EMPLEADO: { color: '#00ff88', icono: '👨‍🔧', label: 'Empleado' },
            TALLER: { color: '#00d4ff', icono: '🏪', label: 'Taller' }
        };
        const badge = badges[tipoAutor] || badges.CLIENTE;

        const nombre = comentario.autor?.nombre || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();
        const likes = comentario.likes || 0;

        // ✅ Foto del autor del comentario
        const fotoAutor = comentario.autor?.foto &&
            comentario.autor.foto !== 'null' &&
            comentario.autor.foto.trim() !== ''
            ? comentario.autor.foto
            : null;

        // 🔍 LOG de debug
        if (nivel === 0 || tipoAutor === 'EMPLEADO') {
            console.log(`👤 ${nombre} (${tipoAutor}) - foto:`, fotoAutor ? '✅' : '❌', fotoAutor?.substring(0, 60));
        }

        // Permisos
        const usuarioActual = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
        const empleadoActualId = usuarioActual?.empleado?._id?.toString();
        const puedeEliminar =
            comentario.autor?.id === empleadoActualId ||
            comentario.autor?.empleadoId?.toString() === empleadoActualId;

        const tieneRespuestas = comentario.respuestas && comentario.respuestas.length > 0;
        const cantidadRespuestas = tieneRespuestas ? comentario.respuestas.length : 0;

        const nivelVisual = Math.min(nivel, 5);
        const indentacion = nivelVisual * 20;
        const coloresLinea = ['#1e2a3a', '#2a3a4a', '#3a4a5a', '#4a5a6a', '#5a6a7a'];
        const colorLinea = coloresLinea[nivelVisual] || '#5a6a7a';

        return `
<div style="
    ${nivel > 0 ? `
        margin-left: ${indentacion}px;
        padding-left: 12px;
        border-left: 2px solid ${colorLinea};
        margin-top: 8px;
    ` : 'border-bottom: 1px solid #1a2332; padding-bottom: 12px; margin-bottom: 12px;'}
">
    <div style="display:flex; gap:10px; padding:8px 0;">
        
        <!-- Avatar con foto de perfil -->
        <div style="position:relative; flex-shrink:0;">
            ${fotoAutor ? `
                <img src="${fotoAutor}" 
                  ${tipoAutor === 'EMPLEADO' ? 'data-empleado-avatar="true"' : ''}
            ${tipoAutor === 'CLIENTE' ? `data-cliente-avatar="${comentario.autor?.id || ''}"` : ''}
                    style="
                        width:${nivel === 0 ? '38px' : '32px'}; 
                        height:${nivel === 0 ? '38px' : '32px'}; 
                        border-radius:50%; 
                        object-fit:cover;
                        border:2px solid ${badge.color}40;
                        display:block;
                    "
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="
                    display:none;
                    width:${nivel === 0 ? '38px' : '32px'}; 
                    height:${nivel === 0 ? '38px' : '32px'}; 
                    border-radius:50%; 
                    background:linear-gradient(135deg, ${badge.color}30, ${badge.color}10);
                    align-items:center; justify-content:center; 
                    font-weight:700; color:${badge.color}; 
                    font-size:${nivel === 0 ? '0.9rem' : '0.75rem'};
                    border:2px solid ${badge.color}40;
                ">
                    ${inicial}
                </div>
            ` : `
                <div style="
                    width:${nivel === 0 ? '38px' : '32px'}; 
                    height:${nivel === 0 ? '38px' : '32px'}; 
                    border-radius:50%; 
                    background:linear-gradient(135deg, ${badge.color}30, ${badge.color}10);
                    display:flex; align-items:center; justify-content:center; 
                    font-weight:700; color:${badge.color}; 
                    font-size:${nivel === 0 ? '0.9rem' : '0.75rem'};
                    border:2px solid ${badge.color}40;
                ">
                    ${inicial}
                </div>
            `}
            
            <!-- Badge de tipo -->
            <div style="
                position:absolute; bottom:-2px; right:-2px;
                width:14px; height:14px; border-radius:50%;
                background:#131c2b; border:1.5px solid ${badge.color};
                display:flex; align-items:center; justify-content:center;
                font-size:0.5rem;
                z-index:1;
            ">${badge.icono}</div>
        </div>

        <!-- Contenido -->
        <div style="flex:1; min-width:0;">
            
            <!-- Nombre + badge + fecha -->
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px; flex-wrap:wrap;">
                <strong style="color:#fff; font-size:${nivel === 0 ? '0.82rem' : '0.78rem'};">${nombre}</strong>
                ${tipoAutor !== 'CLIENTE' ? `
                <span style="
                    background:${badge.color}15; color:${badge.color}; 
                    padding:1px 6px; border-radius:8px; 
                    font-size:0.55rem; font-weight:600;
                ">${badge.label}</span>` : ''}
                <span style="color:#555; font-size:0.62rem;">· ${fecha}</span>
            </div>

            <!-- Texto -->
            ${comentario.texto ? `
            <p style="color:#ccc; margin:0 0 6px 0; font-size:0.8rem; line-height:1.45; word-wrap:break-word;">
                ${comentario.texto}
            </p>` : ''}

            <!-- Foto -->
            ${tieneFoto ? `
            <div style="
                margin:6px 0; border-radius:10px; overflow:hidden; 
                max-width:${nivel === 0 ? '260px' : '220px'}; 
                border:1px solid #1e2a3a; cursor:pointer;
            " onclick="window.verFotoGrande('${fotoUrl}')">
                <img src="${fotoUrl}" 
                    style="width:100%; height:auto; display:block; max-height:240px;"
                    onerror="this.parentElement.style.display='none'">
            </div>` : ''}

            <!-- Acciones -->
            <div style="display:flex; align-items:center; gap:14px; margin-top:4px;">
                <button onclick="window.likeComentarioEmpleado('${comentario._id}')" 
                    style="background:transparent; border:none; color:#888; 
                    font-size:0.7rem; cursor:pointer; display:flex; align-items:center; gap:3px; padding:0;"
                    onmouseover="this.style.color='#ff4444'" 
                    onmouseout="this.style.color='#888'">
                    🤍 <span>${likes > 0 ? likes : ''}</span>
                </button>

                <button onclick="window.responderComentarioEmpleado('${resenaId}', '${comentario._id}', '${nombre}')" 
                    style="background:transparent; border:none; color:#888; 
                    font-size:0.7rem; cursor:pointer; display:flex; align-items:center; gap:3px; padding:0;"
                    onmouseover="this.style.color='#00d4ff'" 
                    onmouseout="this.style.color='#888'">
                    💬 Responder
                </button>

                ${puedeEliminar ? `
                <button onclick="window.eliminarComentarioEmpleado('${comentario._id}', '${resenaId}')" 
                    style="background:transparent; border:none; color:#555; 
                    font-size:0.7rem; cursor:pointer; margin-left:auto; padding:0;"
                    onmouseover="this.style.color='#ff4444'" 
                    onmouseout="this.style.color='#555'">
                    🗑️
                </button>` : ''}
            </div>

            <!-- Contador de respuestas -->
            ${tieneRespuestas ? `
            <div style="margin-top:8px; padding-top:6px; border-top:1px dashed #1e2a3a;">
                <span style="color:#666; font-size:0.65rem;">
                    ↳ ${cantidadRespuestas} respuesta${cantidadRespuestas !== 1 ? 's' : ''}
                </span>
            </div>` : ''}
        </div>
    </div>

    <!-- ✅ RESPUESTAS ANIDADAS (RECURSIVO) -->
    ${tieneRespuestas ? `
    <div style="margin-top:4px;">
        ${comentario.respuestas.map(respuesta =>
            this.renderizarComentario(respuesta, resenaId, nivel + 1)
        ).join('')}
    </div>` : ''}
</div>`;
    },

    // ============================================================
    // 🔹 RESPONDER COMENTARIO COMO TALLER
    // ============================================================
    responderComentarioTaller(resenaId, comentarioId, nombreCliente) {
        console.log('🏪 Responder comentario como taller:', { resenaId, comentarioId, nombreCliente });

        // Obtener datos del taller
        const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
        const tallerNombre = tallerActual?.nombre || 'Taller';

        // ✅ Pasar comentarioId como 4to parámetro
        this.abrirModalRespuesta(
            resenaId,
            `@${nombreCliente} `,  // Sin el "Taller:" porque ya se muestra en el título del modal
            'TALLER',
            comentarioId  // ✅ ESTE ES EL PARÁMETRO QUE FALTABA
        );
    },
    // ============================================================
    // 🔹 ABRIR MODAL PARA RESPONDER (CON TIPO)
    // ============================================================
    async abrirModalRespuesta(resenaId, textoPredefinido = '', tipoRespuesta = 'EMPLEADO', comentarioId = null) {
        // ✅ Guardar IDs correctamente
        this.resenaActualId = resenaId;
        this.comentarioResponderId = comentarioId;  // ✅ Ahora sí recibe el parámetro

        console.log('📝 Abriendo modal:', { resenaId, tipoRespuesta, comentarioId });

        const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
        const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

        const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
        const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

        if (!tallerId || !empleadoId) {
            alert('❌ Error: No se encontró la sesión del empleado');
            return;
        }



        try {
            const response = await apiFetch(`/talleres/${tallerId}/empleado/${empleadoId}/resenas`);
            const data = await response.json();
            const resena = data.resenas?.find(r => r._id === resenaId);

            if (resena) {
                const modal = document.getElementById('modal-responder-resena');
                if (modal) {
                    // Actualizar título según tipo de respuesta
                    const tituloModal = document.getElementById('modal-responder-titulo');
                    if (tituloModal) {
                        if (comentarioId) {
                            tituloModal.textContent = tipoRespuesta === 'TALLER'
                                ? '🏪 Responder a comentario (Taller)'
                                : '👨‍🔧 Responder a comentario (Empleado)';
                        } else {
                            tituloModal.textContent = tipoRespuesta === 'TALLER'
                                ? '🏪 Responder como Taller'
                                : '👨‍🔧 Responder como Empleado';
                        }
                    }

                    document.getElementById('respuesta-resena-id').value = resenaId;
                    document.getElementById('respuesta-texto').value = textoPredefinido || '';
                    document.getElementById('respuesta-tipo').value = tipoRespuesta;

                    // ✅ Mostrar reseña original + comentario padre si existe
                    let contenidoOriginal = `
                    <div style="color:#ffbb33; margin-bottom:5px;">${'⭐'.repeat(resena.puntuacion)}</div>
                    <p style="color:#aaa; margin:0;">"${resena.comentario || 'Sin comentario'}"</p>
                    <small style="color:#888;">- ${resena.cliente?.nombre || 'Cliente'}</small>
                `;

                    // ✅ Si es respuesta a un comentario, mostrar el comentario padre
                    if (comentarioId) {
                        // Buscar el comentario en la lista de comentarios de la reseña
                        const comentarioPadre = this.buscarComentarioPorId(resena.comentarios || [], comentarioId);
                        if (comentarioPadre) {
                            contenidoOriginal += `
                            <div style="margin-top:10px; padding:10px; background:rgba(255,187,51,0.05); border-left:3px solid #ffbb33; border-radius:6px;">
                                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                    <span style="font-size:0.75rem;">👤</span>
                                    <strong style="color:#ffbb33; font-size:0.75rem;">${comentarioPadre.autor?.nombre || 'Usuario'}</strong>
                                    <span style="color:#666; font-size:0.65rem;">· comentario al que respondes</span>
                                </div>
                                <p style="color:#aaa; margin:0; font-size:0.8rem;">${comentarioPadre.texto || '[Foto]'}</p>
                            </div>
                        `;
                        }
                    }

                    if (resena.respuestaTaller) {
                        contenidoOriginal += `
                        <div style="margin-top:8px; padding:8px; background:rgba(0,212,255,0.05); border-radius:6px;">
                            <small style="color:#00d4ff;">🏪 Respuesta del taller:</small>
                            <p style="color:#aaa; margin:0; font-size:0.8rem;">${resena.respuestaTaller}</p>
                        </div>
                    `;
                    }

                    document.getElementById('resena-original').innerHTML = contenidoOriginal;

                    modal.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al cargar la reseña: ' + error.message);
        }
    },

    // ✅ Función auxiliar: buscar comentario por ID (recursivo en árbol)
    buscarComentarioPorId(comentarios, id) {
        for (const c of comentarios) {
            if (c._id === id || c._id?.toString() === id) {
                return c;
            }
            if (c.respuestas && c.respuestas.length > 0) {
                const encontrado = this.buscarComentarioPorId(c.respuestas, id);
                if (encontrado) return encontrado;
            }
        }
        return null;
    },

    // ============================================================
    // 🔹 ENVIAR RESPUESTA (SEGÚN TIPO)
    // ============================================================
    async enviarRespuesta() {
        const resenaId = document.getElementById('respuesta-resena-id').value;
        const respuesta = document.getElementById('respuesta-texto').value.trim();
        const tipoRespuesta = document.getElementById('respuesta-tipo')?.value || 'EMPLEADO';
        const comentarioId = this.comentarioResponderId;

        if (!respuesta) {
            alert('⚠️ Escribe una respuesta');
            return;
        }

        console.log('📤 Enviando respuesta:', { resenaId, tipoRespuesta, comentarioId });

        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                alert('❌ Error: No se encontró la sesión');
                return;
            }


            let url, method, body;

            // ✅ CASO 1: Responder a un COMENTARIO (crear nodo hijo)
            if (comentarioId) {
                url = `${API_URL}/talleres/${tallerId}/resenas/comentarios/${comentarioId}/responder`;
                method = 'POST';
                body = {
                    texto: respuesta,
                    autorId: empleadoId,
                    autorNombre: sesionEmpleado?.empleado?.nombre || 'Empleado',
                    autorTipo: tipoRespuesta
                };
            }
            // ✅ CASO 2: Responder a la RESEÑA (taller o empleado)
            else if (tipoRespuesta === 'TALLER') {
                url = `/talleres/${tallerId}/resenas/${resenaId}/responder`;
                method = 'PUT';
                body = { respuesta };
            } else {
                url = `/talleres/${tallerId}/empleado/${empleadoId}/resenas/${resenaId}/responder`;
                method = 'PUT';
                body = { respuesta };
            }

            console.log('📤 Fetch:', { url, method, body });

            const response = await apiFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            const data = await response.json();

            if (data.exito) {
                alert(`✅ ${comentarioId ? 'Respuesta al comentario' : (tipoRespuesta === 'TALLER' ? 'Respuesta del taller' : 'Tu respuesta')} guardada`);
                document.getElementById('modal-responder-resena').style.display = 'none';
                this.comentarioResponderId = null;  // ✅ Limpiar
                this.cargar();
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
        }
    },

    // ============================================================
    // 🔹 ELIMINAR RESPUESTA DEL EMPLEADO
    // ============================================================
    async eliminarRespuesta(resenaId) {
        if (!confirm('¿Eliminar tu respuesta a esta reseña?')) return;

        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                alert('❌ Error: No se encontró la sesión');
                return;
            }


            const response = await apiFetch(`/talleres/${tallerId}/empleado/${empleadoId}/resenas/${resenaId}/responder`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.exito) {
                alert('✅ Tu respuesta fue eliminada');
                this.cargar();
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
        }
    },

    // ============================================================
    // 🔹 LIKE COMENTARIO
    // ============================================================
    async likeComentario(comentarioId) {
        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                console.error('❌ IDs no encontrados');
                return;
            }


            const response = await apiFetch(`/talleres/${tallerId}/empleado/${empleadoId}/comentarios/${comentarioId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.exito) {
                this.cargar();
            }
        } catch (error) {
            console.error('❌ Error al dar like:', error);
        }
    },

    // ============================================================
    // 🔹 RESPONDER COMENTARIO COMO EMPLEADO
    // ============================================================
    responderComentario(resenaId, comentarioId, nombreCliente) {
        console.log('👨‍🔧 Responder comentario como empleado:', { resenaId, comentarioId, nombreCliente });

        // ✅ Pasar comentarioId como 4to parámetro
        this.abrirModalRespuesta(
            resenaId,
            `@${nombreCliente} `,
            'EMPLEADO',
            comentarioId  // ✅ ESTE ES EL PARÁMETRO QUE FALTABA
        );
    },

    // ============================================================
    // 🔹 ELIMINAR COMENTARIO
    // ============================================================
    async eliminarComentario(comentarioId, resenaId) {
        if (!confirm('¿Eliminar este comentario?')) return;

        try {
            const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
            const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');

            const empleadoId = sesionEmpleado?.empleado?._id?.toString() || sesionEmpleado?._id?.toString() || sesionEmpleado?.id?.toString();
            const tallerId = tallerActual?._id?.toString() || tallerActual?.id?.toString() || sesionEmpleado?.tallerId?.toString();

            if (!tallerId || !empleadoId) {
                alert('❌ Error: No se encontró la sesión');
                return;
            }

            const response = await apiFetch(`/talleres/${tallerId}/empleado/${empleadoId}/comentarios/${comentarioId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.exito) {
                alert('✅ Comentario eliminado');
                this.cargar();
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
        }
    },

    // ============================================================
    // 🔹 CONTACTAR CLIENTE
    // ============================================================
    contactar(email) {
        const tallerActual = JSON.parse(localStorage.getItem('taller_sesion') || 'null');
        const subject = `Respuesta a tu reseña - ${tallerActual?.nombre || 'AutoBrillo'}`;
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`, '_blank');
    },

    // ============================================================
    // 🔹 VER FOTO GRANDE
    // ============================================================
    verFotoGrande(url) {
        window.open(url, '_blank');
    }
};

// ================================================================
// 🔹 EXPORTAR
// ================================================================

export { ResenasEmpleado };
export default ResenasEmpleado;