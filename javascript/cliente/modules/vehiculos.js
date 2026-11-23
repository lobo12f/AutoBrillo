/**
 * ============================================================================
 * 🚗 MÓDULO DE VEHÍCULOS: Garage, CRUD, fotos
 * ============================================================================
 */

import { apiFetch } from '../../api-client.js';
import { estadoCarga, logger } from '../utils/toast.js';

// ============================================================================
// CATÁLOGO DE VEHÍCULOS
// ============================================================================
export const CATALOGO_VEHICULOS = {
    "Toyota": ["Corolla", "Hilux", "Rav4", "Land Cruiser", "Yaris", "Tacoma"],
    "Honda": ["Civic", "CR-V", "Accord", "Fit", "HR-V", "Pilot"],
    "Hyundai": ["Tucson", "Santa Fe", "Elantra", "Accent", "Sonata", "Kona"],
    "Kia": ["Sportage", "Sorento", "Picanto", "Rio", "Cerato", "Seltos"],
    "Nissan": ["Frontier", "Sentra", "Versa", "Qashqai", "X-Trail", "March"],
    "Ford": ["F-150", "Explorer", "Ranger", "Escape", "Focus", "Mustang"],
    "Chevrolet": ["Silverado", "Colorado", "Spark", "Aveo", "Captiva", "Tracker"],
    "BMW": ["Serie 3", "Serie 5", "X3", "X5", "M4"],
    "Mercedes-Benz": ["Clase C", "Clase E", "GLC", "GLE", "Clase S"]
};

// ============================================================================
// VALIDADORES
// ============================================================================
const validadores = {
    placa: (placa) => /^[A-Z0-9]{5,8}$/.test(placa.toUpperCase().replace(/[-\s]/g, ''))
};

// ============================================================================
// INICIALIZAR MARCAS Y MODELOS
// ============================================================================
export function inicializarMarcas() {
    const selectMarca = document.getElementById('car-marca');
    if (!selectMarca) return;

    selectMarca.innerHTML = '<option value="" disabled selected>Selecciona una marca...</option>';
    const marcas = Object.keys(CATALOGO_VEHICULOS).sort();
    marcas.forEach(marca => {
        const opt = document.createElement('option');
        opt.value = marca;
        opt.textContent = marca;
        selectMarca.appendChild(opt);
    });
}

export function actualizarModelos() {
    const elMarca = document.getElementById('car-marca');
    const elModelo = document.getElementById('car-modelo');
    if (!elMarca || !elModelo) return;

    const marcaElegida = elMarca.value;
    elModelo.innerHTML = '<option value="" disabled selected>Selecciona un modelo...</option>';

    if (CATALOGO_VEHICULOS[marcaElegida]) {
        elModelo.disabled = false;
        CATALOGO_VEHICULOS[marcaElegida].sort().forEach(modelo => {
            const opt = document.createElement('option');
            opt.value = modelo;
            opt.textContent = modelo;
            elModelo.appendChild(opt);
        });
    } else {
        elModelo.disabled = true;
    }
}

// ============================================================================
// RENDERIZAR GARAJE
// ============================================================================
export function renderizarGaraje() {
    const container = document.getElementById('contenedor-vehiculos');
    if (!container || !window.user) return;

    container.innerHTML = '';
    const garaje = window.user.garaje || [];

    const countEl = document.getElementById('garage-count');
    if (countEl) {
        countEl.textContent = garaje.length + ' vehículo' + (garaje.length !== 1 ? 's' : '');
    }

    if (garaje.length === 0) {
        container.innerHTML = `
            <div class="empty-garage">
                <div class="empty-garage-icon">🚙</div>
                <p>No tienes vehículos registrados</p>
                <button class="btn-add-first-car" onclick="window.abrirModalVehiculo()">
                    + Registrar mi primer vehículo
                </button>
            </div>`;
        return;
    }

    garaje.forEach(auto => {
        const id = auto.id || auto._id;
        const tieneFoto = auto.foto && (auto.foto.startsWith('data:image') || auto.foto.startsWith('http'));
        const fotoUrl = tieneFoto ? auto.foto : 'https://via.placeholder.com/400x250/131c2b/00ff88?text=Sin+Foto';

        const card = document.createElement('div');
        card.className = 'car-card';
        card.innerHTML = `
            <div class="car-card-body" onclick="window.agendarCitaConVehiculo('${id}')">
                <div class="car-image-wrapper">
                    ${tieneFoto
                ? `<img src="${fotoUrl}" alt="${auto.marca || 'Vehículo'}" class="car-img" />`
                : `<div class="car-img-fallback">🚗</div>`
            }
                    ${auto.color ? `
                    <div class="car-color-badge" title="Color: ${auto.color}">
                        <span class="car-color-dot" style="background-color: ${auto.color};"></span>
                    </div>` : ''}
                </div>
                <div class="car-details">
                    <div class="car-header-info">
                        <h4>${auto.marca || 'Vehículo'} ${auto.modelo || ''}</h4>
                        <span class="car-plate">${auto.placa || 'S/P'}</span>
                    </div>
                    <p class="car-action-hint">Haz clic para agendar cita ⚡</p>
                </div>
            </div>
            <div class="car-actions">
                <button type="button" class="btn-car-action" title="Cambiar foto" onclick="event.stopPropagation(); window.dispararCambioFotoAuto('${id}')">📷</button>
                <button type="button" class="btn-car-action" title="Editar vehículo" onclick="event.stopPropagation(); window.editarVehiculo('${id}')">✏️</button>
                <button type="button" class="btn-car-action delete" title="Eliminar vehículo" onclick="event.stopPropagation(); window.eliminarVehiculo('${id}')">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });

    if (document.getElementById('qty-autos')) {
        document.getElementById('qty-autos').textContent = garaje.length;
    }
    if (document.getElementById('user-vehiculos')) {
        document.getElementById('user-vehiculos').textContent = garaje.length;
    }
}

// ============================================================================
// MODAL: ABRIR / EDITAR / AÑADIR / ELIMINAR
// ============================================================================
export function abrirModalVehiculo() {
    const modal = document.getElementById('modal-vehiculo');
    if (!modal) {
        logger.error('❌ No se encontró el modal de vehículo');
        return;
    }

    document.getElementById('car-marca').value = '';
    document.getElementById('car-modelo').innerHTML = '<option value="" disabled selected>Primero selecciona una marca...</option>';
    document.getElementById('car-modelo').disabled = true;
    document.getElementById('car-placa').value = '';
    document.getElementById('car-color').value = '#33d17a';
    document.getElementById('car-foto').value = '';

    modal.querySelector('h3').textContent = 'Registrar Nuevo Vehículo';
    modal.querySelector('button[type="submit"]').textContent = 'AÑADIR AL GARAJE';
    modal.setAttribute('data-editando', '');

    inicializarMarcas();
    modal.style.display = 'flex';
}

export function editarVehiculo(id) {
    const garaje = window.user.garaje;
    const vehiculo = garaje.find(v => (v.id || v._id) == id);
    if (!vehiculo) {
        window.mostrarToast('⚠️ Vehículo no encontrado', 'warning');
        return;
    }

    const modal = document.getElementById('modal-vehiculo');
    if (!modal) return;

    inicializarMarcas();

    setTimeout(() => {
        document.getElementById('car-marca').value = vehiculo.marca || '';
        actualizarModelos();

        setTimeout(() => {
            document.getElementById('car-modelo').value = vehiculo.modelo || '';
        }, 200);

        document.getElementById('car-placa').value = vehiculo.placa || '';
        document.getElementById('car-color').value = vehiculo.color || '#33d17a';
        document.getElementById('car-foto').value = '';

        modal.querySelector('h3').textContent = 'Editar Vehículo';
        modal.querySelector('button[type="submit"]').textContent = '💾 GUARDAR CAMBIOS';
        modal.setAttribute('data-editando', id);

        modal.style.display = 'flex';
    }, 300);
}

export async function añadirVehiculo(event) {
    if (event) event.preventDefault();

    const modal = document.getElementById('modal-vehiculo');
    const editandoId = modal?.getAttribute('data-editando');

    const marca = document.getElementById('car-marca')?.value;
    const modelo = document.getElementById('car-modelo')?.value;
    const placa = document.getElementById('car-placa')?.value.trim();
    const color = document.getElementById('car-color')?.value;
    const fotoInput = document.getElementById('car-foto');

    if (!marca || !modelo || !placa) {
        window.mostrarToast('⚠️ Completa todos los campos obligatorios', 'warning');
        return;
    }

    if (!validadores.placa(placa)) {
        window.mostrarToast('⚠️ La placa debe tener entre 5 y 8 caracteres alfanuméricos', 'warning');
        return;
    }

    estadoCarga.mostrar('Guardando vehículo...');

    let fotoUrl = null;
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        if (fotoInput.files[0].size > 5 * 1024 * 1024) {
            window.mostrarToast('⚠️ La imagen es muy grande. Máximo 5MB.', 'warning');
            estadoCarga.ocultar();
            return;
        }

        try {
            const formData = new FormData();
            formData.append('imagen', fotoInput.files[0]);

            const data = await window.fetchConReintento(`/upload/imagen`, {
                method: 'POST',
                body: formData
            });

            if (data.exito) {
                fotoUrl = data.url;
                logger.info('📷 Imagen subida:', fotoUrl);
            }
        } catch (error) {
            logger.error('❌ Error al subir imagen:', error);
            window.mostrarToast('⚠️ No se pudo subir la foto.', 'warning');
        }
    }

    const vehiculoData = {
        marca,
        modelo,
        placa: placa.toUpperCase(),
        color,
        foto: fotoUrl
    };

    try {
        if (editandoId) {
            const actualizado = window.user.actualizarVehiculo(editandoId, vehiculoData);
            if (actualizado) window.mostrarToast('✅ Vehículo actualizado correctamente', 'success');
        } else {
            const agregado = window.user.agregarVehiculo(vehiculoData);
            if (agregado) {
                window.mostrarToast('✅ Vehículo agregado al garaje', 'success');
            } else {
                window.mostrarToast('⚠️ Ya existe un vehículo con esa placa', 'warning');
            }
        }

        window.persistirUsuario();
        modal.style.display = 'none';
        renderizarGaraje();
        window.actualizarInterfaz?.(window.user);

        if (window.db?.sincronizarConServidor) {
            await window.db.sincronizarConServidor();
        }
    } catch (error) {
        logger.error('Error al guardar vehículo:', error);
        window.mostrarToast('❌ Error al guardar el vehículo', 'error');
    } finally {
        estadoCarga.ocultar();
    }
}

export function eliminarVehiculo(id) {
    if (!confirm('¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.')) return;

    const garaje = window.user.garaje;
    const vehiculo = garaje.find(v => (v.id || v._id) == id);
    if (!vehiculo) {
        window.mostrarToast('⚠️ Vehículo no encontrado.', 'warning');
        return;
    }

    const eliminado = window.user.eliminarVehiculo(id);
    if (eliminado) {
        window.persistirUsuario();
        renderizarGaraje();
        window.actualizarInterfaz?.(window.user);
        window.mostrarToast(`🗑️ Vehículo ${vehiculo.marca} eliminado`, 'success');

        if (window.db?.sincronizarConServidor) {
            window.db.sincronizarConServidor();
        }
    }
}

export function cerrarModalVehiculo() {
    const modal = document.getElementById('modal-vehiculo');
    if (modal) modal.style.display = 'none';
}

// ============================================================================
// CAMBIO DE FOTO
// ============================================================================
export function dispararCambioFotoAuto(id) {
    const input = document.getElementById('input-cambiar-foto-auto');
    if (input) {
        input.setAttribute('data-vehiculo-id', id);
        input.click();
    }
}

export async function confirmarCambioFotoAuto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const id = event.target.getAttribute('data-vehiculo-id');
    if (!id) return;

    if (file.size > 5 * 1024 * 1024) {
        window.mostrarToast('⚠️ La imagen es muy grande. Máximo 5MB.', 'warning');
        return;
    }

    estadoCarga.mostrar('Subiendo foto...');

    try {
        const formData = new FormData();
        formData.append('imagen', file);

        const data = await window.fetchConReintento(`/upload/imagen`, {
            method: 'POST',
            body: formData
        });

        if (data.exito) {
            window.user.actualizarVehiculo(id, { foto: data.url });
            window.persistirUsuario();
            renderizarGaraje();
            window.mostrarToast('✅ Foto actualizada', 'success');
        } else {
            window.mostrarToast('❌ Error al subir la foto.', 'error');
        }
    } catch (error) {
        logger.error('Error al cambiar foto:', error);
        window.mostrarToast('❌ Error de conexión al subir la foto.', 'error');
    } finally {
        estadoCarga.ocultar();
    }

    event.target.value = '';
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.inicializarMarcas = inicializarMarcas;
window.actualizarModelos = actualizarModelos;
window.renderizarGaraje = renderizarGaraje;
window.abrirModalVehiculo = abrirModalVehiculo;
window.editarVehiculo = editarVehiculo;
window.añadirVehiculo = añadirVehiculo;
window.eliminarVehiculo = eliminarVehiculo;
window.cerrarModalVehiculo = cerrarModalVehiculo;
window.dispararCambioFotoAuto = dispararCambioFotoAuto;
window.confirmarCambioFotoAuto = confirmarCambioFotoAuto;

console.log('✅ Módulo vehiculos.js cargado');