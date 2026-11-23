// ====================================================================
// 📸 GESTIÓN DE FOTOS DE CITAS - Antes / Durante / Después
// ====================================================================
import { apiFetch } from '../api-client.js';
export class GestionFotos {

    constructor(apiUrl, tallerActual) {
        this.API_URL = apiUrl;
        this.tallerActual = tallerActual;
        this.citaActual = null;
        this.tipoActual = 'antes';
        this.fotosSeleccionadas = [];
        this.fotosExistentes = { antes: [], durante: [], despues: [] };
    }

    // ================================================================
    // 🔹 ABRIR MODAL
    // ================================================================

    /**
     * Abrir modal de fotos para una cita
     */
    async abrir(citaId) {
        this.citaActual = citaId;
        this.tipoActual = 'antes';
        this.fotosSeleccionadas = [];

        this.resetearUI();

        await Promise.all([
            this.cargarInfoCita(),
            this.cargarFotosExistentes()
        ]);

        document.getElementById('modal-fotos-cita').style.display = 'flex';

        // ✅ Configurar botón de subir (UNA SOLA VEZ)
        setTimeout(() => {
            const btnSubir = document.getElementById('btn-subir-fotos');
            if (btnSubir && !btnSubir.dataset.listenerAdded) {
                btnSubir.dataset.listenerAdded = 'true';
                btnSubir.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.subir(e);
                });
            }
        }, 300);
    }

    /**
     * Resetear la interfaz
     */
    resetearUI() {
        // Resetear tabs
        const coloresDefault = { bg: 'transparent', border: '#333', color: '#aaa' };
        document.querySelectorAll('.tab-foto').forEach(tab => {
            Object.assign(tab.style, coloresDefault);
        });

        // Activar tab ANTES
        const tabAntes = document.getElementById('tab-foto-antes');
        if (tabAntes) {
            tabAntes.style.background = 'rgba(255,107,107,0.1)';
            tabAntes.style.borderColor = '#ff6b6b';
            tabAntes.style.color = '#ff6b6b';
        }

        // Limpiar campos
        document.getElementById('fotos-preview').innerHTML = '';
        document.getElementById('foto-descripcion').value = '';
        document.getElementById('input-fotos-multiples').value = '';
        document.getElementById('fotos-cita-id').value = this.citaActual || '';
        document.getElementById('fotos-tipo-actual').value = 'antes';
    }

    // ================================================================
    // 🔹 CARGAR DATOS
    // ================================================================

    /**
     * Cargar información de la cita
     */
    async cargarInfoCita() {
        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/citas`);
            const data = await response.json();
            const cita = data.citas?.find(c => c._id === this.citaActual);

            if (cita) {
                const v = cita.vehiculo || {};
                const estadoColor = cita.estado === 'EN_PROCESO' ? '#ffbb33' :
                    cita.estado === 'LISTO' ? '#ff44ff' : '#00ff88';

                document.getElementById('fotos-cita-info').innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="color:#fff;">🚗 ${v.marca || ''} ${v.modelo || ''} (${v.placa || 'S/P'})</strong>
                            <p style="color:#888; margin:5px 0 0;">🔧 ${cita.servicio?.nombre || 'Servicio'}</p>
                            <p style="color:#888; margin:2px 0 0;">📅 ${cita.fecha} | 🕐 ${cita.hora} | 👤 ${cita.clienteId?.nombre || 'Cliente'}</p>
                        </div>
                        <span style="background:${estadoColor}22; color:${estadoColor}; padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:600;">${cita.estado}</span>
                    </div>`;
            }
        } catch (error) {
            console.error('Error al cargar info:', error);
        }
    }

    /**
     * Cargar fotos ya subidas
     */
    async cargarFotosExistentes() {
        try {
            const response = await apiFetch(`/talleres/citas/${this.citaActual}/fotos`);
            const data = await response.json();

            if (data.exito) {
                this.fotosExistentes = {
                    antes: data.fotos?.antes || [],
                    durante: data.fotos?.durante || [],
                    despues: data.fotos?.despues || []
                };
                this.renderizarFotosExistentes();
            }
        } catch (error) {
            console.error('Error al cargar fotos:', error);
        }
    }

    // ================================================================
    // 🔹 RENDERIZAR
    // ================================================================

    /**
     * Renderizar fotos ya subidas en la galería
     */
    renderizarFotosExistentes() {
        const container = document.getElementById('galeria-fotos-subidas');
        if (!container) return;

        const fotos = this.fotosExistentes[this.tipoActual] || [];

        if (fotos.length === 0) {
            container.innerHTML = '<p style="color:#666; font-size:0.85rem; text-align:center; padding:20px;">📭 No hay fotos en esta categoría</p>';
            return;
        }

        container.innerHTML = fotos.map((foto, index) => `
            <div style="position:relative; width:90px; height:90px; border-radius:8px; overflow:hidden; transition:all 0.3s; cursor:pointer;"
                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.5)';"
                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                <img src="${foto.url}" style="width:100%; height:100%; object-fit:cover;" 
                    onclick="window.gestionFotos?.verFotoGrande('${foto.url}')"
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>📷</text></svg>'">
                <span onclick="event.stopPropagation(); window.gestionFotos?.confirmarEliminar('${foto.url}', '${this.tipoActual}', ${index})" 
                    style="position:absolute; top:3px; right:3px; background:#ff4444; color:#fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.65rem; opacity:0.8;"
                    onmouseover="this.style.opacity='1'">✕</span>
                ${foto.descripcion ? `
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.8); padding:3px 6px;">
                    <small style="color:#fff; font-size:0.6rem;">${foto.descripcion.substring(0, 20)}</small>
                </div>` : ''}
            </div>
        `).join('');
    }

    // ================================================================
    // 🔹 CAMBIAR TABS
    // ================================================================

    /**
     * Cambiar entre tabs (antes/durante/después)
     */
    cambiarTab(tipo) {
        this.tipoActual = tipo;
        document.getElementById('fotos-tipo-actual').value = tipo;

        // Limpiar selección actual
        this.fotosSeleccionadas = [];
        document.getElementById('fotos-preview').innerHTML = '';
        document.getElementById('input-fotos-multiples').value = '';

        // Colores por tipo
        const colores = {
            antes: { bg: 'rgba(255,107,107,0.1)', border: '#ff6b6b', color: '#ff6b6b' },
            durante: { bg: 'rgba(255,187,51,0.1)', border: '#ffbb33', color: '#ffbb33' },
            despues: { bg: 'rgba(107,255,107,0.1)', border: '#6bff6b', color: '#6bff6b' }
        };

        // Resetear todos los tabs
        document.querySelectorAll('.tab-foto').forEach(tab => {
            tab.style.background = 'transparent';
            tab.style.borderColor = '#333';
            tab.style.color = '#aaa';
        });

        // Activar tab seleccionado
        const tabActivo = document.getElementById(`tab-foto-${tipo}`);
        if (tabActivo) {
            tabActivo.style.background = colores[tipo].bg;
            tabActivo.style.borderColor = colores[tipo].border;
            tabActivo.style.color = colores[tipo].color;
        }

        this.renderizarFotosExistentes();
    }

    /**
     * Previsualizar fotos seleccionadas (múltiples)
     */
    previsualizar(event) {
        const files = Array.from(event.target.files);
        const preview = document.getElementById('fotos-preview');
        const contador = document.getElementById('fotos-contador');
        const cantidadEl = document.getElementById('fotos-cantidad');
        const btnCantidad = document.getElementById('btn-fotos-cantidad');

        // Validar máximo 10 fotos
        if (this.fotosSeleccionadas.length + files.length > 10) {
            this.mostrarToast('⚠️ Máximo 10 fotos por vez', 'warning');
            return;
        }

        files.forEach((file, i) => {
            // Validar tamaño
            if (file.size > 5 * 1024 * 1024) {
                this.mostrarToast(`⚠️ "${file.name}" supera 5MB`, 'warning');
                return;
            }

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                this.mostrarToast(`⚠️ "${file.name}" no es imagen`, 'warning');
                return;
            }

            this.fotosSeleccionadas.push(file);

            // Crear preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const index = this.fotosSeleccionadas.length - 1;
                const div = document.createElement('div');
                div.style.cssText = 'position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; transition:all 0.3s; animation:fadeIn 0.3s ease;';
                div.innerHTML = `
                <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); opacity:0; transition:all 0.3s; display:flex; align-items:center; justify-content:center;"
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                    <span onclick="event.stopPropagation(); window.gestionFotos.quitarSeleccionada(${index})" 
                        style="background:#ff4444; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem;">✕</span>
                </div>
                <span style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:#fff; padding:3px 6px; font-size:0.6rem; text-align:center;">${file.name.substring(0, 15)}</span>
            `;
                preview.appendChild(div);

                // Actualizar contador
                const total = this.fotosSeleccionadas.length;
                cantidadEl.textContent = total;
                btnCantidad.textContent = total > 0 ? `${total} foto${total > 1 ? 's' : ''}` : '';
                contador.style.display = total > 0 ? 'block' : 'none';
            };
            reader.readAsDataURL(file);
        });

        // Limpiar input para permitir seleccionar los mismos archivos otra vez
        event.target.value = '';
    }

    /**
     * Quitar foto seleccionada
     */
    quitarSeleccionada(index) {
        this.fotosSeleccionadas.splice(index, 1);

        const preview = document.getElementById('fotos-preview');
        if (preview.children[index]) {
            preview.children[index].style.opacity = '0';
            preview.children[index].style.transform = 'scale(0.5)';
            setTimeout(() => {
                // Re-renderizar todo para mantener índices correctos
                this.reRenderizarPreview();
            }, 200);
        }

        const total = this.fotosSeleccionadas.length;
        document.getElementById('fotos-cantidad').textContent = total;
        document.getElementById('btn-fotos-cantidad').textContent = total > 0 ? `${total} foto${total > 1 ? 's' : ''}` : '';
        document.getElementById('fotos-contador').style.display = total > 0 ? 'block' : 'none';
    }

    /**
     * Re-renderizar preview
     */
    reRenderizarPreview() {
        const preview = document.getElementById('fotos-preview');
        preview.innerHTML = '';

        this.fotosSeleccionadas.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.style.cssText = 'position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; animation:fadeIn 0.3s ease;';
                div.innerHTML = `
                <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); opacity:0; transition:all 0.3s; display:flex; align-items:center; justify-content:center;"
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                    <span onclick="event.stopPropagation(); window.gestionFotos.quitarSeleccionada(${index})" 
                        style="background:#ff4444; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem;">✕</span>
                </div>
            `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
  * Subir fotos con barra de progreso
  */
    async subir(event) {
        // ✅ Prevenir recarga de la página
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // ✅ PROTECCIÓN CONTRA DOBLE ENVÍO
        if (this.enviando) {
            console.log('⏳ Ya hay una subida en progreso, ignorando...');
            return false;
        }
        this.enviando = true;

        console.log('📤 Iniciando subida de fotos...');
        console.log('Fotos seleccionadas:', this.fotosSeleccionadas.length);

        const citaId = document.getElementById('fotos-cita-id').value;
        const tipo = document.getElementById('fotos-tipo-actual').value;
        const descripcion = document.getElementById('foto-descripcion')?.value?.trim() || '';

        if (this.fotosSeleccionadas.length === 0) {
            this.enviando = false; // ✅ Resetear bandera
            this.mostrarToast('⚠️ Selecciona al menos una foto', 'warning');
            return false;
        }

        const btn = document.getElementById('btn-subir-fotos');
        const progresoDiv = document.getElementById('fotos-progreso');
        const progresoBarra = document.getElementById('fotos-progreso-barra');
        const progresoTexto = document.getElementById('fotos-progreso-texto');

        // ✅ Deshabilitar botón inmediatamente
        btn.disabled = true;
        btn.textContent = '⏳ Subiendo...';
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        progresoDiv.style.display = 'block';

        try {
            const fotosSubidas = [];
            const total = this.fotosSeleccionadas.length;

            for (let i = 0; i < total; i++) {
                const file = this.fotosSeleccionadas[i];
                const progreso = Math.round(((i + 1) / total) * 100);
                progresoBarra.style.width = `${progreso}%`;
                progresoTexto.textContent = `${i + 1}/${total} (${progreso}%)`;

                const formData = new FormData();
                formData.append('imagen', file);
                const uploadRes = await apiFetch(`/upload/imagen`, { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();

                if (uploadData.exito) {
                    fotosSubidas.push({
                        url: uploadData.url,
                        descripcion: descripcion || `Foto ${tipo} ${i + 1}`
                    });
                }
            }

            if (fotosSubidas.length > 0) {
                const response = await apiFetch(`/talleres/citas/${citaId}/fotos/${tipo}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fotos: fotosSubidas, subidoPor: 'Empleado' })
                });
                const data = await response.json();

                if (data.exito) {
                    this.mostrarToast(`✅ ${fotosSubidas.length} foto(s) subida(s)`, 'success');
                    this.fotosSeleccionadas = [];
                    document.getElementById('fotos-preview').innerHTML = '';
                    document.getElementById('fotos-contador').style.display = 'none';
                    document.getElementById('foto-descripcion').value = '';
                    document.getElementById('btn-fotos-cantidad').textContent = '';
                    await this.cargarFotosExistentes();
                    document.getElementById('fotos-ya-subidas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    this.mostrarToast('❌ ' + (data.mensaje || 'Error'), 'error');
                }
            } else {
                this.mostrarToast('⚠️ Ninguna foto pudo subirse', 'warning');
            }
        } catch (error) {
            console.error('Error en subida:', error);
            this.mostrarToast('❌ Error de conexión', 'error');
        } finally {
            // ✅ RESTAURAR todo
            this.enviando = false;
            btn.disabled = false;
            btn.textContent = '📤 Subir Fotos';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            progresoDiv.style.display = 'none';
            progresoBarra.style.width = '0%';
            progresoTexto.textContent = '0%';
        }

        return false;
    }



    // ================================================================
    // 🔹 ELIMINAR FOTO
    // ================================================================

    /**
     * Confirmar y eliminar foto
     */
    confirmarEliminar(url, tipo, index) {
        if (confirm('¿Eliminar esta foto?')) {
            this.eliminar(url, tipo, index);
        }
    }

    /**
     * Eliminar una foto
     */
    async eliminar(url, tipo, index) {
        // Eliminar del array local
        this.fotosExistentes[tipo].splice(index, 1);
        this.renderizarFotosExistentes();
        this.mostrarToast('🗑️ Foto eliminada', 'info');

        // TODO: Agregar endpoint DELETE para eliminar del servidor
    }

    // ================================================================
    // 🔹 VER FOTO GRANDE
    // ================================================================

    /**
     * Ver foto en pantalla completa
     */
    verFotoGrande(url) {
        const lightbox = document.createElement('div');
        lightbox.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.95); z-index:100000;
            display:flex; align-items:center; justify-content:center;
            cursor:zoom-out;
        `;
        lightbox.innerHTML = `
            <img src="${url}" style="max-width:90vw; max-height:90vh; border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <span onclick="this.parentElement.remove()" 
                style="position:absolute; top:20px; right:30px; color:#fff; font-size:2rem; cursor:pointer;">&times;</span>
        `;
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.remove();
        });
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                lightbox.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    /**
     * Cerrar modal
     */
    cerrar() {
        document.getElementById('modal-fotos-cita').style.display = 'none';
        this.citaActual = null;
    }

    /**
     * Mostrar toast
     */
    mostrarToast(mensaje, tipo = 'info') {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(mensaje, tipo);
        } else if (tipo === 'error') {
            alert(mensaje);
        }
    }
}

export default GestionFotos;