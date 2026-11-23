/**
 * LÓGICA DE PERFIL Y GARAJE - AutoBrillo D. (Versión 2026 - Limpia)
 * Depende de: dashboard.js (window.user, window.actualizarInterfaz, window.renderizarGaraje)
 */

import { SERVER_URL } from './config.js';
const API_URL = SERVER_URL;
import { apiFetch } from './api-client.js';
// ====================================================================
// 🔹 SINCRONIZACIÓN CON EL SERVIDOR (ÚNICA DEFINICIÓN)
// ====================================================================

/**
 * Sincroniza los datos del usuario con MongoDB.
 * Asegura que los cambios realizados en el perfil se guarden permanentemente.
 */
window.sincronizarUsuario = async function () {
    const user = window.user;
    if (!user || !user.email) {
        console.error("❌ No hay usuario para sincronizar");
        return false;
    }

    try {
        // Guardar en localStorage primero (respuesta rápida)
        localStorage.setItem('sesion_activa', JSON.stringify(user));

        const url = `/api/usuarios/sincronizar/${encodeURIComponent(user.email)}`;

        const response = await apiFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error del servidor:", errorText);
            return false;
        }

        const resultado = await response.json();
        console.log("☁️ Sincronizado con MongoDB");
        return resultado.exito !== false;

    } catch (error) {
        console.error("❌ Error de red:", error.message);
        return false;
    }
};

// ====================================================================
// 🔹 ACTUALIZAR SELECTOR DE VEHÍCULOS (Para el Modal de Citas)
// ====================================================================

/**
 * Sincroniza el menú desplegable de citas con los vehículos del garaje.
 */
window.actualizarSelectVehiculos = function () {
    const select = document.getElementById('cita-vehiculo');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Selecciona un vehículo --</option>';

    const garaje = window.user?.garaje || [];

    if (garaje.length === 0) {
        select.innerHTML += '<option value="" disabled>No tienes vehículos registrados</option>';
        return;
    }

    garaje.forEach(auto => {
        const marca = auto.marca || 'Genérico';
        const modelo = auto.modelo || 'Estándar';
        const placa = auto.placa || 'S/P';
        const color = auto.color || '';

        const option = document.createElement('option');
        option.value = JSON.stringify({ marca, modelo, placa, color });
        option.textContent = `${marca} ${modelo} (${placa})`;
        option.dataset.marca = marca;
        option.dataset.modelo = modelo;
        option.dataset.placa = placa;
        option.dataset.color = color;

        select.appendChild(option);
    });
};

// ====================================================================
// 🔹 GESTIÓN DE FOTO DE PERFIL
// ====================================================================

/**
 * Procesa y sube la nueva foto de perfil al servidor.
 */
window.procesarFotoPerfil = async function (event) {
    const archivo = event.target.files[0];
    if (!archivo || !window.user) return;

    // Validar tamaño (máximo 5MB)
    if (archivo.size > 5 * 1024 * 1024) {
        alert("⚠️ La imagen es muy pesada. Máximo 5MB.");
        event.target.value = '';
        return;
    }

    try {
        // Subir al servidor en lugar de guardar en base64
        const formData = new FormData();
        formData.append('imagen', archivo);

        const response = await apiFetch(`/api/upload/imagen`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.exito) {
            window.user.fotoPerfil = data.url;

            // Actualizar todas las imágenes de perfil en el DOM
            document.querySelectorAll('#foto-perfil-grande, #avatar-sidebar, .user-avatar-sync')
                .forEach(img => img.src = data.url);

            await window.sincronizarUsuario();

            if (typeof window.actualizarInterfaz === 'function') {
                window.actualizarInterfaz(window.user);
            }

            console.log("📸 Foto de perfil actualizada");
        } else {
            alert("❌ Error al subir la imagen.");
        }
    } catch (error) {
        console.error("❌ Error:", error);
        alert("No se pudo procesar la imagen.");
    }

    event.target.value = '';
};

// ====================================================================
// 🔹 MODAL DE PERFIL
// ====================================================================

/**
 * Abre el modal de edición de perfil con los datos actuales.
 */
window.abrirModalPerfil = function () {
    const user = window.user;
    if (!user) {
        alert("⚠️ Sesión no encontrada. Inicia sesión primero.");
        return;
    }

    // Cargar datos actuales en el formulario
    const campos = {
        'edit-nombre': user.nombre || '',
        'edit-telefono': user.telefono || '',
        'edit-especialidad': user.especialidad || ''
    };

    for (const [id, valor] of Object.entries(campos)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = valor;
            input.classList.remove('input-error');
        }
    }

    // Mostrar modal con animación
    const modal = document.getElementById('modal-perfil');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            document.getElementById('edit-nombre')?.focus();
        }, 10);
    }
};

/**
 * Cierra el modal de perfil.
 */
window.cerrarModalPerfil = function () {
    const modal = document.getElementById('modal-perfil');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
};

/**
 * Guarda los cambios del perfil.
 */
window.guardarPerfil = async function (e) {
    if (e) e.preventDefault();

    const user = window.user;
    if (!user) return;

    const nuevoNombre = document.getElementById('edit-nombre')?.value.trim();
    const nuevoTelefono = document.getElementById('edit-telefono')?.value.trim();

    if (!nuevoNombre) {
        const inputNombre = document.getElementById('edit-nombre');
        if (inputNombre) {
            inputNombre.style.borderColor = "#ff4444";
            inputNombre.placeholder = "El nombre es obligatorio";
        }
        alert("⚠️ El nombre no puede estar vacío.");
        return;
    }

    user.nombre = nuevoNombre;
    if (nuevoTelefono !== undefined) user.telefono = nuevoTelefono;

    const exito = await window.sincronizarUsuario();

    if (exito) {
        if (typeof window.actualizarInterfaz === 'function') {
            window.actualizarInterfaz(user);
        }
        window.cerrarModalPerfil();
        console.log(`✅ Perfil actualizado: ${user.nombre}`);
    } else {
        alert("❌ Error al guardar. Intenta de nuevo.");
    }
};

// ====================================================================
// 🔹 GESTIÓN DE VEHÍCULOS
// ====================================================================

/**
 * Abre el modal para registrar un nuevo vehículo.
 */
window.abrirModalVehiculo = function () {
    if (!window.user) {
        alert("⚠️ Debes iniciar sesión primero.");
        return;
    }

    const modal = document.getElementById('modal-vehiculo');
    if (!modal) return;

    // Limpiar formulario
    const form = modal.querySelector('form');
    if (form) form.reset();

    document.getElementById('car-modelo').innerHTML = '<option value="" disabled selected>Primero selecciona una marca...</option>';
    document.getElementById('car-modelo').disabled = true;

    // Mostrar con animación
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
};

/**
 * Cierra cualquier modal abierto.
 */
window.cerrarModales = function () {
    ['modal-perfil', 'modal-vehiculo', 'modal-cita', 'modal-recarga'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => { modal.style.display = 'none'; }, 200);
        }
    });
};

/**
 * Añade un vehículo al garaje del usuario.
 */
window.añadirVehiculo = async function (e) {
    if (e) e.preventDefault();

    if (!window.user) {
        alert("⚠️ No hay sesión activa.");
        return;
    }

    if (!window.user.garaje) {
        window.user.garaje = [];
    }

    const marca = document.getElementById('car-marca')?.value;
    const modelo = document.getElementById('car-modelo')?.value;
    const placa = document.getElementById('car-placa')?.value.trim().toUpperCase();
    const color = document.getElementById('car-color')?.value || '#33d17a';

    if (!marca || !modelo || !placa) {
        alert("⚠️ Completa todos los campos: marca, modelo y placa.");
        return;
    }

    // Verificar duplicados en el garaje local
    if (window.user.garaje.some(auto => auto.placa === placa)) {
        alert("⚠️ Ya tienes un vehículo con esta placa.");
        return;
    }

    // Procesar foto (subir al servidor)
    let fotoUrl = null;
    const inputFoto = document.getElementById('car-foto');
    if (inputFoto?.files[0]) {
        try {
            const formData = new FormData();
            formData.append('imagen', inputFoto.files[0]);

            const response = await apiFetch(`/api/upload/imagen`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.exito) fotoUrl = data.url;
        } catch (error) {
            console.warn("⚠️ No se pudo subir la foto, continuando sin ella");
        }
    }

    const nuevoAuto = {
        id: Date.now(),
        marca,
        modelo,
        placa,
        color,
        foto: fotoUrl
    };

    window.user.garaje.push(nuevoAuto);

    const exito = await window.sincronizarUsuario();

    if (exito) {
        // Refrescar interfaces
        if (typeof window.renderizarGaraje === 'function') window.renderizarGaraje();
        window.actualizarSelectVehiculos();
        window.cerrarModales();
        if (e.target?.reset) e.target.reset();
        console.log(`✅ Vehículo agregado: ${marca} ${modelo} (${placa})`);
    } else {
        alert("⚠️ Vehículo guardado localmente pero hubo error al sincronizar.");
    }
};

/**
 * Elimina un vehículo del garaje.
 */
window.eliminarVehiculo = function (id) {
    const user = window.user;
    if (!user?.garaje) return;

    const index = user.garaje.findIndex(a => a.id === id);
    if (index === -1) return;

    const auto = user.garaje[index];

    if (!confirm(`¿Eliminar ${auto.marca} ${auto.modelo} (${auto.placa})?`)) return;

    // Archivar en historial
    if (!user.garajeHistorial) user.garajeHistorial = [];
    user.garajeHistorial.push({ ...auto, fechaBaja: new Date().toISOString() });

    // Eliminar del garaje activo
    user.garaje.splice(index, 1);

    window.sincronizarUsuario();
    if (typeof window.renderizarGaraje === 'function') window.renderizarGaraje();
    window.actualizarSelectVehiculos();

    console.log(`🗑️ Vehículo eliminado: ${auto.placa}`);
};

// ====================================================================
// 🔹 CAMBIO DE FOTO DE VEHÍCULO (UNIFICADO)
// ====================================================================

/** ID temporal del vehículo que está cambiando de foto */
window.idAutoSiendoEditado = null;

/**
 * Abre el selector de archivos para cambiar la foto de un vehículo.
 */
window.dispararCambioFotoAuto = function (autoId) {
    window.idAutoSiendoEditado = autoId;

    const input = document.getElementById('input-cambiar-foto-auto');
    if (input) {
        input.click();
    } else {
        // Fallback: crear input temporal
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/jpeg, image/png, image/webp';
        tempInput.onchange = window.confirmarCambioFotoAuto;
        tempInput.click();
    }
};

/**
 * Procesa el cambio de foto del vehículo.
 */
window.confirmarCambioFotoAuto = async function (event) {
    const archivo = event.target.files?.[0];
    const user = window.user;
    const idEdicion = window.idAutoSiendoEditado;

    if (!archivo || !idEdicion || !user?.garaje) {
        window.idAutoSiendoEditado = null;
        if (event.target) event.target.value = '';
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
        alert("⚠️ La imagen es muy grande. Máximo 5MB.");
        event.target.value = '';
        window.idAutoSiendoEditado = null;
        return;
    }

    try {
        // Subir al servidor
        const formData = new FormData();
        formData.append('imagen', archivo);

        const response = await apiFetch(`/api/upload/imagen`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.exito) {
            const auto = user.garaje.find(a => a.id === idEdicion);
            if (auto) {
                auto.foto = data.url;
                await window.sincronizarUsuario();

                // Actualizar solo la imagen en el DOM
                const imgElement = document.getElementById(`img-auto-${idEdicion}`);
                if (imgElement) {
                    imgElement.src = data.url;
                } else {
                    if (typeof window.renderizarGaraje === 'function') {
                        window.renderizarGaraje();
                    }
                }
                console.log(`📸 Foto actualizada para vehículo ID: ${idEdicion}`);
            }
        }
    } catch (error) {
        console.error("❌ Error al cambiar foto:", error);
        alert("No se pudo actualizar la foto.");
    }

    window.idAutoSiendoEditado = null;
    if (event.target) event.target.value = '';
};

// ====================================================================
// 🔹 INICIALIZACIÓN
// ====================================================================

window.addEventListener('DOMContentLoaded', () => {
    // Recuperar sesión del localStorage
    const sesion = localStorage.getItem('sesion_activa');

    if (sesion) {
        try {
            window.user = JSON.parse(sesion);

            // Aplicar datos al DOM inmediatamente (evitar parpadeo)
            const dispNombre = document.getElementById('display-nombre');
            const dispEmail = document.getElementById('display-email');

            if (dispNombre && window.user.nombre) dispNombre.textContent = window.user.nombre;
            if (dispEmail && window.user.email) dispEmail.textContent = window.user.email;

            if (window.user.fotoPerfil) {
                document.querySelectorAll('#foto-perfil-grande, #avatar-sidebar')
                    .forEach(img => img.src = window.user.fotoPerfil);
            }
        } catch (e) {
            console.error("❌ Error al recuperar sesión:", e);
        }
    }

    // Inicializar componentes cuando el DOM esté listo
    if (window.user?.email) {
        if (typeof window.renderizarGaraje === 'function') {
            window.renderizarGaraje();
        }
        window.actualizarSelectVehiculos();
    }

    console.log("✅ Profile.js cargado (versión limpia)");
});

// Cerrar modal al hacer clic fuera
window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.opacity = '0';
        setTimeout(() => { event.target.style.display = 'none'; }, 200);
    }
});