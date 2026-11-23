// ====================================================================
// ⭐ SISTEMA DE CALIFICACIONES Y RESEÑAS
// ====================================================================
// Maneja todo lo relacionado con calificaciones de talleres
// ====================================================================
import { apiFetch } from '../api-client.js';
export class CalificacionesManager {

    constructor(apiBaseUrl) {
        this.API_BASE_URL = apiBaseUrl;
        this.tallerIdActual = null;
        this.calificacionSeleccionada = 0;
        this.fotosResena = [];
        this.estrellasConfirmar = 0;
        this.citaIdConfirmar = null;
    }

    // ================================================================
    // 🔹 CARGAR CALIFICACIONES
    // ================================================================

    /**
     * Cargar calificaciones de un taller
     */
    async cargar(tallerId, containerId) {
        this.tallerIdActual = tallerId;
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">⏳ Cargando calificaciones...</p>';

        try {
            const response = await (`/talleres/${tallerId}/calificaciones`);
            const data = await response.json();

            if (data.exito) {
                this.renderizarCompleto(data, container);
            }
        } catch (error) {
            container.innerHTML = '<p style="color:#ff4444; text-align:center;">Error al cargar calificaciones</p>';
        }
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    /**
     * Renderizar sistema completo de calificaciones
     */
    renderizarCompleto(data, container) {
        const promedio = data.promedio || 0;
        const total = data.total || 0;
        const distribucion = data.distribucion || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const resenas = data.resenas || [];

        container.innerHTML = `
            <!-- Resumen -->
            <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap; background:#080c14; border-radius:12px; padding:20px;">
                <div style="text-align:center; min-width:100px;">
                    <div style="font-size:3rem; font-weight:700; color:#ffbb33;">${promedio.toFixed(1)}</div>
                    <div style="color:#ffbb33; font-size:1.1rem;">${this.crearEstrellas(Math.round(promedio))}</div>
                    <small style="color:#888;">${total} reseñas</small>
                </div>
                <div style="flex:1; min-width:200px;">
                    ${this.renderizarBarras(distribucion, total)}
                </div>
            </div>

            <!-- Formulario para dejar reseña -->
            ${this.renderizarFormularioResena()}

            <!-- Lista de reseñas -->
            <div style="margin-top:15px;">
                <h5 style="color:#fff; margin-bottom:10px;">💬 Reseñas (${total})</h5>
                ${resenas.length > 0 ?
                resenas.map(r => this.renderizarResena(r)).join('') :
                '<p style="color:#888; text-align:center; padding:20px;">📭 Sé el primero en dejar una reseña</p>'
            }
            </div>
        `;

        // Configurar eventos de estrellas
        this.configurarEventosEstrellas();
    }

    /**
     * Renderizar barras de distribución
     */
    renderizarBarras(distribucion, total) {
        const maxCantidad = Math.max(...Object.values(distribucion), 1);

        return [5, 4, 3, 2, 1].map(estrella => {
            const cantidad = distribucion[estrella] || 0;
            const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
            const porcentajeBarra = Math.round((cantidad / maxCantidad) * 100);

            return `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; cursor:pointer;"
                onclick="document.querySelectorAll('.resena-filtro-estrella').forEach(e=>e.style.opacity='1'); this.style.opacity='0.5'; window.calificacionesManager.filtrarPorEstrella(${estrella})">
                <span style="color:#ffbb33; font-size:0.8rem; min-width:25px;">${estrella}★</span>
                <div style="flex:1; background:#1a1a1a; border-radius:4px; height:8px; overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#ffbb33,#ff8800); height:100%; width:${porcentajeBarra}%; border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <span style="color:#888; font-size:0.75rem; min-width:30px;">${porcentaje}%</span>
                <span style="color:#888; font-size:0.7rem; min-width:15px;">(${cantidad})</span>
            </div>`;
        }).join('');
    }

    /**
     * Renderizar formulario de reseña
     */
    renderizarFormularioResena() {
        return `
        <div style="background:#080c14; border:1px solid #1e2a3a; border-radius:12px; padding:20px; margin-bottom:15px;">
            <h5 style="color:#fff; margin-bottom:12px;">📝 Dejar una reseña</h5>
            
            <!-- Estrellas -->
            <div style="display:flex; gap:8px; margin-bottom:12px;" id="estrellas-calificacion">
                ${[1, 2, 3, 4, 5].map(i => `
                    <span onclick="window.calificacionesManager.seleccionarEstrella(${i})" 
                        data-estrella="${i}"
                        style="font-size:2rem; cursor:pointer; transition:all 0.2s; color:#444;"
                        onmouseover="window.calificacionesManager.iluminarEstrellas(${i})"
                        onmouseout="window.calificacionesManager.iluminarEstrellas(window.calificacionesManager.calificacionSeleccionada)">
                        ★
                    </span>`).join('')}
                <small style="color:#888; margin-left:8px;" id="texto-calificacion">Selecciona una calificación</small>
            </div>
            
            <!-- Comentario -->
            <textarea id="resena-comentario" rows="3" placeholder="Comparte tu experiencia con este taller... ¿Qué tal el servicio? ¿Recomendarías este taller?"
                style="width:100%; padding:12px; background:#0a0e14; border:1px solid #1e2a3a; border-radius:8px; color:#fff; resize:vertical; margin-bottom:10px; font-family:Inter,sans-serif;"></textarea>
            
            <!-- Botón enviar -->
            <button onclick="window.calificacionesManager.enviarResena()" 
                style="padding:12px 25px; background:#ffbb33; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.9rem;">
                📤 Enviar Reseña
            </button>
            <small style="color:#888; display:block; margin-top:8px;">Solo puedes dejar una reseña si has recibido un servicio en este taller.</small>
        </div>`;
    }

    /**
     * Renderizar una reseña individual
     */
    renderizarResena(resena) {
        const fecha = new Date(resena.fecha || resena.createdAt).toLocaleDateString('es-DO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        return `
        <div style="background:#080c14; border:1px solid #1e2a3a; border-radius:10px; padding:18px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,187,51,0.1); display:flex; align-items:center; justify-content:center; font-weight:700; color:#ffbb33;">
                        ${(resena.cliente?.nombre || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                        <strong style="color:#fff;">${resena.cliente?.nombre || 'Cliente'}</strong>
                        <div style="color:#ffbb33;">${this.crearEstrellas(resena.puntuacion)}</div>
                    </div>
                </div>
                <small style="color:#888;">${fecha}</small>
            </div>
            ${resena.comentario ? `<p style="color:#aaa; font-size:0.9rem; line-height:1.5;">${resena.comentario}</p>` : ''}
            ${resena.fotos && resena.fotos.length > 0 ? `
            <div style="display:flex; gap:8px; margin-top:10px;">
                ${resena.fotos.map(f => `
                    <img src="${f}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; cursor:pointer;" 
                        onclick="window.verFotoGrande?.('${f}')">
                `).join('')}
            </div>` : ''}
        </div>`;
    }

    // ================================================================
    // 🔹 INTERACCIONES
    // ================================================================

    /**
     * Crear estrellas visuales
     */
    crearEstrellas(cantidad) {
        return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
    }

    /**
     * Seleccionar estrella para calificar
     */
    seleccionarEstrella(numero) {
        this.calificacionSeleccionada = numero;
        this.iluminarEstrellas(numero);

        const textos = {
            1: '😞 Muy malo',
            2: '😐 Regular',
            3: '🙂 Bueno',
            4: '😊 Muy bueno',
            5: '🤩 ¡Excelente!'
        };
        const textoEl = document.getElementById('texto-calificacion');
        if (textoEl) {
            textoEl.textContent = textos[numero] || '';
            textoEl.style.color = '#ffbb33';
        }
    }

    /**
     * Iluminar estrellas al pasar el mouse
     */
    iluminarEstrellas(cantidad) {
        const estrellas = document.querySelectorAll('#estrellas-calificacion span[data-estrella]');
        estrellas.forEach(estrella => {
            const num = parseInt(estrella.dataset.estrella);
            estrella.style.color = num <= cantidad ? '#ffbb33' : '#444';
            estrella.style.transform = num <= cantidad ? 'scale(1.1)' : 'scale(1)';
        });
    }

    /**
     * Configurar eventos de estrellas
     */
    configurarEventosEstrellas() {
        // Ya se manejan con onclick y onmouseover en el HTML
    }

    /**
     * Filtrar reseñas por estrella
     */
    filtrarPorEstrella(estrella) {
        // Recargar solo las reseñas de esa calificación
        if (this.tallerIdActual) {
            this.cargar(this.tallerIdActual, `calificaciones-content-${this.tallerIdActual}`);
        }
    }

    // ================================================================
    // 🔹 ENVIAR RESEÑA
    // ================================================================

    /**
     * Enviar reseña
     */
    async enviarResena() {
        if (this.calificacionSeleccionada === 0) {
            this.mostrarToast('⚠️ Selecciona una calificación de estrellas', 'warning');
            return;
        }

        if (!this.tallerIdActual) {
            this.mostrarToast('❌ No hay taller seleccionado', 'error');
            return;
        }

        const comentario = document.getElementById('resena-comentario')?.value?.trim() || '';

        try {
            const response = await apiFetch(`/talleres/${this.tallerIdActual}/calificaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puntuacion: this.calificacionSeleccionada,
                    comentario: comentario,
                    clienteId: window.obtenerIdUsuario?.()
                })
            });

            const data = await response.json();

            if (data.exito) {
                this.mostrarToast('✅ ¡Gracias por tu reseña!', 'success');

                // Limpiar formulario
                this.calificacionSeleccionada = 0;
                document.getElementById('resena-comentario').value = '';
                this.iluminarEstrellas(0);
                const textoEl = document.getElementById('texto-calificacion');
                if (textoEl) {
                    textoEl.textContent = 'Selecciona una calificación';
                    textoEl.style.color = '#888';
                }

                // Recargar calificaciones
                this.cargar(this.tallerIdActual, `calificaciones-content-${this.tallerIdActual}`);
            } else {
                this.mostrarToast('❌ ' + (data.mensaje || 'Error al enviar'), 'error');
            }
        } catch (error) {
            this.mostrarToast('❌ Error de conexión', 'error');
        }
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    // ================================================================
    // 🔹 CONFIRMAR ENTREGA CON CALIFICACIÓN (NUEVO)
    // ================================================================

    /**
     * Abrir modal de confirmación de entrega
     */
    abrirModalConfirmarEntrega(citaId) {
        this.citaIdConfirmar = citaId;
        this.estrellasConfirmar = 0;

        // Resetear estrellas
        const estrellas = document.querySelectorAll('#estrellas-confirmar span');
        if (estrellas.length > 0) {
            estrellas.forEach(s => {
                s.style.color = '#444';
                s.style.transform = 'scale(1)';
            });
        }

        const textoEstrellas = document.getElementById('texto-estrellas-confirmar');
        if (textoEstrellas) {
            textoEstrellas.textContent = 'Selecciona una calificación';
            textoEstrellas.style.color = '#888';
        }

        const comentario = document.getElementById('comentario-confirmar');
        if (comentario) comentario.value = '';

        const citaIdInput = document.getElementById('cita-confirmar-id');
        if (citaIdInput) citaIdInput.value = citaId;

        const modal = document.getElementById('modal-confirmar-entrega');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Seleccionar estrella en el modal de confirmación
     */
    seleccionarEstrellaConfirmar(numero) {
        this.estrellasConfirmar = numero;

        const estrellas = document.querySelectorAll('#estrellas-confirmar span');
        estrellas.forEach((s, i) => {
            if (i < numero) {
                s.style.color = '#ffbb33';
                s.style.transform = 'scale(1.2)';
            } else {
                s.style.color = '#444';
                s.style.transform = 'scale(1)';
            }
        });

        const textos = ['', '😞 Muy malo', '😐 Regular', '🙂 Bueno', '😊 Muy bueno', '🤩 ¡Excelente!'];
        const textoEl = document.getElementById('texto-estrellas-confirmar');
        if (textoEl) {
            textoEl.textContent = textos[numero];
            textoEl.style.color = '#ffbb33';
        }
    }

    /**
     * Cerrar modal de confirmación
     */
    cerrarModalConfirmar() {
        const modal = document.getElementById('modal-confirmar-entrega');
        if (modal) modal.style.display = 'none';
        this.citaIdConfirmar = null;
    }

    /**
     * Confirmar entrega con calificación
     */
    async confirmarEntregaConCalificacion() {
        const citaId = document.getElementById('cita-confirmar-id')?.value;

        if (!citaId) return;

        if (this.estrellasConfirmar === 0) {
            this.mostrarToast('⚠️ Selecciona una calificación de estrellas', 'warning');
            return;
        }

        const comentario = document.getElementById('comentario-confirmar')?.value?.trim() || '';

        this.cerrarModalConfirmar();

        if (typeof window.estadoCarga !== 'undefined') {
            window.estadoCarga.mostrar('Confirmando entrega...');
        }

        try {
            // 1. Confirmar entrega en el servidor
            const data = await window.fetchConReintento(`${this.API_BASE_URL}/citas/${citaId}/confirmar-entrega`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    calificacion: this.estrellasConfirmar,
                    comentario: comentario
                })
            });

            if (data.exito) {
                // 2. Enviar calificación al taller
                const cita = window.user?.obtenerCita?.(citaId);
                const tallerId = cita?.tallerId?._id || cita?.tallerId || window.tallerManager?.getTallerId();
                const tallerIdStr = String(tallerId);
                if (tallerId) {
                    try {
                        await apiFetch(`/talleres/${tallerId}/calificaciones`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                puntuacion: this.estrellasConfirmar,
                                comentario: comentario,
                                clienteId: window.obtenerIdUsuario?.()
                            })
                        });
                    } catch (e) { }
                }

                // 3. Actualizar localmente
                if (window.user) {
                    window.user.actualizarCita({
                        _id: citaId,
                        estado: 'ENTREGADO',
                        calificacion: {
                            puntuacion: this.estrellasConfirmar,
                            comentario
                        }
                    });
                    window.persistirUsuario?.();
                    window.renderizarCitas?.();
                }

                this.mostrarToast('✅ ¡Gracias! Entrega confirmada.', 'success');
            } else {
                this.mostrarToast('❌ ' + (data.mensaje || 'Error'), 'error');
            }
        } catch (error) {
            // Actualizar localmente aunque falle
            if (window.user) {
                window.user.actualizarCita({
                    _id: citaId,
                    estado: 'ENTREGADO',
                    calificacion: {
                        puntuacion: this.estrellasConfirmar,
                        comentario
                    }
                });
                window.persistirUsuario?.();
                window.renderizarCitas?.();
            }
            this.mostrarToast('✅ Entrega confirmada (modo offline).', 'success');
        } finally {
            if (typeof window.estadoCarga !== 'undefined') {
                window.estadoCarga.ocultar();
            }
        }
    }

    mostrarToast(mensaje, tipo = 'info') {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(mensaje, tipo);
        }
    }
}

export default CalificacionesManager;