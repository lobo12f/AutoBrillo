// ====================================================================
// 📸 MÓDULO DE FOTOS - AUTOBRILLO DETALLING
// ====================================================================
import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';
let fotosSeleccionadas = [];
let citaActualFotos = null;
let tipoFotoActual = 'antes';

// ================================================================
// 🔹 INICIALIZAR
// ================================================================

export function inicializarFotos() {
    window.abrirModalFotos = abrirModalFotos;
    window.cerrarModalFotos = cerrarModalFotos;
    window.previewFotos = previewFotos;
    window.subirFotos = subirFotos;
    window.eliminarFotoPreview = eliminarFotoPreview;

    console.log('📸 Módulo de Fotos inicializado');
}

// ================================================================
// 🔹 ABRIR MODAL DE FOTOS
// ================================================================

window.abrirModalFotos = function (citaId, tipo) {
    citaActualFotos = citaId;
    tipoFotoActual = tipo;
    fotosSeleccionadas = [];

    const modal = document.getElementById('modal-fotos');
    if (modal) {
        modal.style.display = 'flex';

        const titulo = document.getElementById('modal-fotos-titulo');
        if (titulo) {
            const titulos = {
                'antes': '📸 Fotos ANTES del Trabajo',
                'durante': '🔧 Fotos DURANTE el Trabajo',
                'despues': '✨ Fotos DESPUÉS del Trabajo'
            };
            titulo.textContent = titulos[tipo] || '📸 Fotos';
        }

        const preview = document.getElementById('fotos-preview');
        if (preview) preview.innerHTML = '';

        const input = document.getElementById('input-fotos');
        if (input) input.value = '';

        // Cargar fotos existentes
        cargarFotosExistentes(citaId, tipo);
    }
};

// ================================================================
// 🔹 CARGAR FOTOS EXISTENTES
// ================================================================

async function cargarFotosExistentes(citaId, tipo) {
    try {

        const response = await apiFetch(`/talleres/citas/${citaId}/fotos`);
        const data = await response.json();

        if (data.exito && data.fotos?.[tipo]) {
            const fotosExistentes = data.fotos[tipo];
            const preview = document.getElementById('fotos-preview');

            if (fotosExistentes.length > 0 && preview) {
                preview.innerHTML = '';
                fotosExistentes.forEach((foto) => {
                    const div = document.createElement('div');
                    div.className = 'foto-preview-item';
                    div.style.cssText = 'position:relative; display:inline-block; margin:5px;';
                    div.innerHTML = `
                        <img src="${foto.url || foto}" style="width:100px; height:100px; object-fit:cover; border-radius:10px; border:2px solid #00ff88;">
                        <small style="display:block; text-align:center; color:#888; font-size:0.6rem;">${foto.subidoPor || ''}</small>
                    `;
                    preview.appendChild(div);
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar fotos existentes:', error);
    }
}

// ================================================================
// 🔹 CERRAR MODAL DE FOTOS
// ================================================================

window.cerrarModalFotos = function () {
    const modal = document.getElementById('modal-fotos');
    if (modal) modal.style.display = 'none';
    fotosSeleccionadas = [];
};

// ================================================================
// 🔹 PREVIEW DE FOTOS
// ================================================================

window.previewFotos = function (event) {
    const files = event.target.files;
    const preview = document.getElementById('fotos-preview');
    if (!preview) return;

    preview.innerHTML = '';
    fotosSeleccionadas = [];

    Array.from(files).forEach((file) => {
        if (file.size > 5 * 1024 * 1024) {
            alert('⚠️ Imagen muy grande (máx 5MB): ' + file.name);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            fotosSeleccionadas.push({
                url: e.target.result,
                descripcion: ''
            });

            const div = document.createElement('div');
            div.className = 'foto-preview-item';
            div.style.cssText = 'position:relative; display:inline-block; margin:5px;';
            div.innerHTML = `
                <img src="${e.target.result}" style="width:100px; height:100px; object-fit:cover; border-radius:10px; border:2px solid #00ff88;">
                <button onclick="eliminarFotoPreview(${fotosSeleccionadas.length - 1})" 
                    style="position:absolute; top:-5px; right:-5px; background:#ff4444; color:#fff; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:0.7rem;">
                    ✕
                </button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
};

// ================================================================
// 🔹 ELIMINAR FOTO DEL PREVIEW
// ================================================================

window.eliminarFotoPreview = function (index) {
    fotosSeleccionadas.splice(index, 1);

    const preview = document.getElementById('fotos-preview');
    if (preview) {
        preview.innerHTML = '';
        fotosSeleccionadas.forEach((foto, i) => {
            const div = document.createElement('div');
            div.className = 'foto-preview-item';
            div.style.cssText = 'position:relative; display:inline-block; margin:5px;';
            div.innerHTML = `
                <img src="${foto.url}" style="width:100px; height:100px; object-fit:cover; border-radius:10px; border:2px solid #00ff88;">
                <button onclick="eliminarFotoPreview(${i})" 
                    style="position:absolute; top:-5px; right:-5px; background:#ff4444; color:#fff; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:0.7rem;">
                    ✕
                </button>
            `;
            preview.appendChild(div);
        });
    }
};

// ================================================================
// 🔹 SUBIR FOTOS
// ================================================================

window.subirFotos = async function () {
    if (!fotosSeleccionadas.length) {
        alert('⚠️ Selecciona al menos una foto');
        return;
    }

    if (!citaActualFotos) {
        alert('⚠️ No hay cita seleccionada');
        return;
    }

    const sesionEmpleado = JSON.parse(localStorage.getItem('taller_empleado_sesion') || 'null');
    const empleadoNombre = sesionEmpleado?.empleado?.nombre || 'Empleado';

    try {

        const response = await apiFetch(`/talleres/citas/${citaActualFotos}/fotos/${tipoFotoActual}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fotos: fotosSeleccionadas,
                subidoPor: empleadoNombre
            })
        });

        const data = await response.json();

        if (data.exito) {
            window.mostrarToast?.('✅ Fotos subidas correctamente', 'success');
            cerrarModalFotos();

            if (window.mostrarDetalleCita && citaActualFotos) {
                await window.mostrarDetalleCita(citaActualFotos);
            }
        } else {
            window.mostrarToast?.('❌ ' + (data.mensaje || 'Error al subir fotos'), 'error');
        }
    } catch (error) {
        console.error('Error al subir fotos:', error);
        window.mostrarToast?.('❌ Error de conexión', 'error');
    }
};