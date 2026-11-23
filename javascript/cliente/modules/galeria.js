/**
 * ============================================================================
 * 🖼️ MÓDULO DE GALERÍA: Fotos de trabajos
 * ============================================================================
 */

import { apiFetch } from '../../api-client.js';

// ============================================================================
// RENDERIZAR GALERÍA
// ============================================================================
export async function renderizarGaleria() {
    const contenedor = document.getElementById('contenedor-galeria');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">⏳ Cargando galería...</p>';

    try {
        const userId = window.obtenerIdUsuario();
        const response = await apiFetch(`/mis-citas/${userId}`);
        const data = await response.json();

        if (!data.exito || !data.citas) {
            contenedor.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">📭 No hay trabajos en la galería.</p>';
            return;
        }

        const entregadas = data.citas.filter(c => c.estado === 'ENTREGADO');
        const busquedaPlaca = (document.getElementById('busqueda-placa')?.value || '').toLowerCase().trim();
        const filtroModelo = document.getElementById('filtro-modelo')?.value || 'todos';

        if (entregadas.length === 0) {
            contenedor.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">📭 No tienes trabajos completados.</p>';
            return;
        }

        const modelosUnicos = [...new Set(entregadas.map(c =>
            `${c.vehiculo?.marca || ''} ${c.vehiculo?.modelo || ''}`.trim()
        ).filter(Boolean))];

        const selectModelo = document.getElementById('filtro-modelo');
        if (selectModelo) {
            selectModelo.innerHTML = '<option value="todos">🚗 Todos los modelos</option>' +
                modelosUnicos.map(m => `<option value="${m}">${m}</option>`).join('');
        }

        let citasFiltradas = entregadas;
        if (busquedaPlaca) {
            citasFiltradas = citasFiltradas.filter(c =>
                (c.vehiculo?.placa || '').toLowerCase().includes(busquedaPlaca)
            );
        }
        if (filtroModelo && filtroModelo !== 'todos') {
            citasFiltradas = citasFiltradas.filter(c => {
                const modeloCompleto = `${c.vehiculo?.marca || ''} ${c.vehiculo?.modelo || ''}`.trim();
                return modeloCompleto === filtroModelo;
            });
        }

        if (citasFiltradas.length === 0) {
            contenedor.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">🔍 No hay trabajos con esos filtros.</p>';
            return;
        }

        contenedor.innerHTML = '';
        for (const cita of citasFiltradas) {
            const card = await crearCardGaleria(cita);
            contenedor.appendChild(card);
        }

    } catch (error) {
        console.error('❌ Error galería:', error);
        contenedor.innerHTML = '<p style="color:#ff4444;text-align:center;padding:40px;">Error al cargar galería.</p>';
    }
}

// ============================================================================
// CREAR CARD
// ============================================================================
async function crearCardGaleria(cita) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.style.cssText = `
        background: #131c2b; border: 1px solid #1e2a3a; border-radius: 16px;
        overflow: hidden; transition: all 0.3s ease;
    `;

    const vehiculo = cita.vehiculo || {};
    const modeloTxt = `${vehiculo.marca || ''} ${vehiculo.modelo || ''}`.trim() || 'Vehículo';
    const placaTxt = vehiculo.placa || 'S/P';
    const fecha = cita.fecha || 'S/F';
    const servicio = cita.servicio?.nombre || cita.servicio || 'Servicio';
    const calificacion = cita.calificacion?.puntuacion || 0;
    const estrellas = calificacion > 0 ? '⭐'.repeat(calificacion) : '';

    let fotosAntes = [];
    let fotosDespues = [];

    try {
        const fotosResponse = await apiFetch(`/talleres/citas/${cita._id}/fotos`);
        const fotosData = await fotosResponse.json();
        if (fotosData.exito) {
            fotosAntes = fotosData.fotos?.antes || [];
            fotosDespues = fotosData.fotos?.despues || [];
        }
    } catch (e) { }

    const tieneFotos = fotosAntes.length > 0 || fotosDespues.length > 0;

    card.innerHTML = `
        <div style="display:grid; grid-template-columns: ${tieneFotos ? '1fr 1fr' : '1fr'}; gap:8px; padding:15px;">
            <div style="text-align:center;">
                <div style="font-size:0.75rem; color:#ff6b6b; margin-bottom:8px;">🔴 ANTES</div>
                <div style="background:#0a0e14; border-radius:12px; height:180px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    ${fotosAntes.length > 0 ?
            `<img src="${fotosAntes[0].url}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.verFotoCompleta('${fotosAntes[0].url}', 'ANTES - ${modeloTxt}')">` :
            '<span style="color:#444; font-size:3rem;">📷</span>'}
                </div>
                ${fotosAntes.length > 1 ? `<small style="color:#888;">+${fotosAntes.length - 1} fotos más</small>` : ''}
            </div>
            ${tieneFotos ? `
            <div style="text-align:center;">
                <div style="font-size:0.75rem; color:#6bff6b; margin-bottom:8px;">🟢 DESPUÉS</div>
                <div style="background:#0a0e14; border-radius:12px; height:180px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    ${fotosDespues.length > 0 ?
                `<img src="${fotosDespues[0].url}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.verFotoCompleta('${fotosDespues[0].url}', 'DESPUÉS - ${modeloTxt}')">` :
                '<span style="color:#444; font-size:3rem;">📷</span>'}
                </div>
                ${fotosDespues.length > 1 ? `<small style="color:#888;">+${fotosDespues.length - 1} fotos más</small>` : ''}
            </div>` : ''}
        </div>
        <div style="padding:15px; border-top:1px solid #1e2a3a;">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h4 style="color:#fff; margin:0 0 5px;">🚗 ${modeloTxt}</h4>
                    <span style="color:#888; font-size:0.8rem;">🏷️ ${placaTxt}</span>
                </div>
                <div style="text-align:right;">
                    <span style="color:#00ff88; font-size:0.8rem;">📅 ${fecha}</span>
                    <br><span style="color:#ffbb33; font-size:0.75rem;">🔧 ${servicio}</span>
                    ${estrellas ? `<br><span style="font-size:0.85rem;">${estrellas}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return card;
}

// ============================================================================
// VER FOTO COMPLETA
// ============================================================================
export function verFotoCompleta(url, titulo) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; align-items:center; justify-content:center; z-index:10000; cursor:zoom-out;';
    modal.innerHTML = `
        <div style="text-align:center; max-width:90vw; max-height:90vh;">
            <p style="color:#fff; margin-bottom:15px; font-size:1.1rem;">${titulo}</p>
            <img src="${url}" style="max-width:90vw; max-height:75vh; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <p style="color:#888; margin-top:15px;">Click para cerrar</p>
        </div>
    `;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
}

export function limpiarFiltros() {
    document.getElementById('busqueda-placa').value = '';
    document.getElementById('filtro-modelo').value = 'todos';
    renderizarGaleria();
}

export function verImagenFull(src) {
    if (!src) return;
    verFotoCompleta(src, 'Foto');
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.renderizarGaleria = renderizarGaleria;
window.verFotoCompleta = verFotoCompleta;
window.limpiarFiltros = limpiarFiltros;
window.verImagenFull = verImagenFull;

console.log('✅ Módulo galeria.js cargado');