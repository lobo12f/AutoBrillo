/**
 * CONFIGURACIÓN DEL EMPLEADO - AutoBrillo D.
 * Maneja perfil, contraseña y preferencias
 */

import { API_URL } from '../../config.js';
import { apiFetch } from '../../api-client.js';

let configTabActual = 'perfil';
let fotoPerfilTemporal = null;

// ================================================================
// 🔹 INICIALIZAR CONFIGURACIÓN
// ================================================================

export function inicializarConfiguracion(sesionEmpleado, empleadoId) {
    // window.sesionEmpleado = JSON.parse(JSON.stringify(sesionEmpleado));
    window.empleadoId = empleadoId;

    // Exponer funciones globales
    window.cambiarConfigTab = cambiarConfigTab;
    window.previewFotoPerfil = previewFotoPerfil;
    window.guardarPerfil = guardarPerfil;
    window.cambiarPassword = cambiarPassword;
    window.guardarPreferencia = guardarPreferencia;
    window.cargarPreferencias = cargarPreferencias;
    window.cargarDatosPerfil = cargarDatosPerfil;


    console.log('⚙️ Módulo de Configuración inicializado');
}

// ================================================================
// 🔹 TABS DE CONFIGURACIÓN
// ================================================================

export function cambiarConfigTab(tab) {
    configTabActual = tab;

    // Resetear tabs
    const tabPerfil = document.getElementById('config-tab-perfil');
    const tabPassword = document.getElementById('config-tab-password');
    const tabPreferencias = document.getElementById('config-tab-preferencias');

    if (tabPerfil) tabPerfil.className = tab === 'perfil' ? 'config-tab-activo' : 'config-tab-inactivo';
    if (tabPassword) tabPassword.className = tab === 'password' ? 'config-tab-activo' : 'config-tab-inactivo';
    if (tabPreferencias) tabPreferencias.className = tab === 'preferencias' ? 'config-tab-activo' : 'config-tab-inactivo';

    // Mostrar/ocultar secciones
    const secPerfil = document.getElementById('config-perfil');
    const secPassword = document.getElementById('config-password');
    const secPreferencias = document.getElementById('config-preferencias');

    if (secPerfil) secPerfil.style.display = tab === 'perfil' ? 'block' : 'none';
    if (secPassword) secPassword.style.display = tab === 'password' ? 'block' : 'none';
    if (secPreferencias) secPreferencias.style.display = tab === 'preferencias' ? 'block' : 'none';

    // Cargar datos según tab
    if (tab === 'perfil') cargarDatosPerfil();
    if (tab === 'preferencias') cargarPreferencias();
}

// ================================================================
// 🔹 PERFIL
// ================================================================

function cargarDatosPerfil() {
    const empleado = window.sesionEmpleado;
    if (!empleado) return;

    const inputNombre = document.getElementById('config-nombre');
    const inputTelefono = document.getElementById('config-telefono');
    const inputHorarioInicio = document.getElementById('config-horario-inicio');
    const inputHorarioFin = document.getElementById('config-horario-fin');
    const fotoPreview = document.getElementById('config-foto-preview');
    const fotoPlaceholder = document.getElementById('config-foto-placeholder');

    if (inputNombre) inputNombre.value = empleado.nombre || '';
    if (inputTelefono) inputTelefono.value = empleado.telefono || '';
    if (inputHorarioInicio) inputHorarioInicio.value = empleado.horario?.inicio || '08:00';
    if (inputHorarioFin) inputHorarioFin.value = empleado.horario?.fin || '17:00';

    if (empleado.fotoPerfil && fotoPreview && fotoPlaceholder) {
        fotoPreview.src = empleado.fotoPerfil;
        fotoPreview.style.display = 'block';
        fotoPlaceholder.style.display = 'none';
    }
}

export function previewFotoPerfil(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('⚠️ La imagen debe ser menor a 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const fotoPreview = document.getElementById('config-foto-preview');
        const fotoPlaceholder = document.getElementById('config-foto-placeholder');

        if (fotoPreview && fotoPlaceholder) {
            fotoPreview.src = e.target.result;
            fotoPreview.style.display = 'block';
            fotoPlaceholder.style.display = 'none';
        }

        fotoPerfilTemporal = e.target.result;
    };
    reader.readAsDataURL(file);
}

export async function guardarPerfil() {
    const empleadoId = window.empleadoId;
    const nombre = document.getElementById('config-nombre')?.value?.trim() || '';
    const telefono = document.getElementById('config-telefono')?.value?.trim() || '';
    const horarioInicio = document.getElementById('config-horario-inicio')?.value || '08:00';
    const horarioFin = document.getElementById('config-horario-fin')?.value || '17:00';
    const fotoPerfil = fotoPerfilTemporal || window.sesionEmpleado?.fotoPerfil || null;

    if (!nombre) {
        alert('⚠️ El nombre es requerido');
        return;
    }

    try {
        // ✅ Migrado a apiFetch
        const response = await apiFetch(`/talleres/empleados/${empleadoId}/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                telefono,
                fotoPerfil,
                horario: { inicio: horarioInicio, fin: horarioFin }
            })
        });

        const data = await response.json();

        if (data.exito) {
            // 1. Actualizar localStorage con los datos del backend
            const sesion = JSON.parse(localStorage.getItem('taller_empleado_sesion') || '{}');
            sesion.empleado = { ...sesion.empleado, ...data.empleado };
            localStorage.setItem('taller_empleado_sesion', JSON.stringify(sesion));

            // 2. ✅ Reemplazar la copia local del módulo (nueva referencia, sin mutar)
            window.sesionEmpleado = JSON.parse(JSON.stringify(sesion.empleado));

            // 3. ✅ Notificar al dashboard (que reemplace su copia)
            if (typeof window.actualizarSesionEmpleado === 'function') {
                window.actualizarSesionEmpleado(data.empleado);
            }

            // 4. Actualizar UI
            const nombreHeader = document.getElementById('empleado-nombre');
            if (nombreHeader) nombreHeader.textContent = nombre;

            alert('✅ Perfil actualizado');
            fotoPerfilTemporal = null;
        } else {
            alert('❌ ' + (data.mensaje || 'Error'));
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error de conexión');
    }
}

// ================================================================
// 🔹 CONTRASEÑA
// ================================================================

export async function cambiarPassword() {
    const empleadoId = window.empleadoId;
    const actual = document.getElementById('config-password-actual')?.value || '';
    const nueva = document.getElementById('config-password-nueva')?.value || '';
    const confirmar = document.getElementById('config-password-confirmar')?.value || '';

    if (!actual || !nueva || !confirmar) {
        alert('⚠️ Completa todos los campos');
        return;
    }

    if (nueva.length < 6) {
        alert('⚠️ Mínimo 6 caracteres');
        return;
    }

    if (nueva !== confirmar) {
        alert('⚠️ Las contraseñas no coinciden');
        return;
    }

    if (actual === nueva) {
        alert('⚠️ La nueva contraseña debe ser diferente');
        return;
    }

    try {
        // ✅ Migrado a apiFetch
        const response = await apiFetch(`/talleres/empleados/${empleadoId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva })
        });

        const data = await response.json();

        if (data.exito) {
            alert('✅ Contraseña cambiada exitosamente');

            // Limpiar campos
            document.getElementById('config-password-actual').value = '';
            document.getElementById('config-password-nueva').value = '';
            document.getElementById('config-password-confirmar').value = '';
        } else {
            alert('❌ ' + (data.mensaje || 'Error'));
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error de conexión');
    }
}

// ================================================================
// 🔹 PREFERENCIAS
// ================================================================

export function cargarPreferencias() {
    const prefs = JSON.parse(localStorage.getItem('empleado_preferencias') || '{}');

    const inputSonido = document.getElementById('config-sonido');
    const inputToast = document.getElementById('config-toast');
    const inputTemaOscuro = document.getElementById('config-tema-oscuro');

    if (inputSonido) inputSonido.checked = prefs.sonido !== false;
    if (inputToast) inputToast.checked = prefs.toast !== false;
    if (inputTemaOscuro) inputTemaOscuro.checked = prefs.temaOscuro !== false;

    console.log('⚙️ Preferencias cargadas:', prefs);
}

export function guardarPreferencia(clave, valor) {
    console.log(`⚙️ guardarPreferencia: ${clave} = ${valor}`);

    const prefs = JSON.parse(localStorage.getItem('empleado_preferencias') || '{}');
    prefs[clave] = valor;
    localStorage.setItem('empleado_preferencias', JSON.stringify(prefs));

    console.log('💾 Preferencias guardadas:', prefs);

    if (clave === 'temaOscuro') aplicarTemaOscuro(valor);
    if (clave === 'sonido') window.sonidoActivo = valor;
    if (clave === 'toast') window.toastActivo = valor;
}

function aplicarTemaOscuro(activo) {
    if (activo) {
        document.body.style.background = '#080c14';
        document.body.style.color = '#ffffff';
        document.documentElement.style.setProperty('--bg', '#080c14');
        document.documentElement.style.setProperty('--card', '#0f1621');
        document.documentElement.style.setProperty('--text', '#ffffff');
    } else {
        document.body.style.background = '#f5f5f5';
        document.body.style.color = '#333';
        document.documentElement.style.setProperty('--bg', '#f5f5f5');
        document.documentElement.style.setProperty('--card', '#ffffff');
        document.documentElement.style.setProperty('--text', '#333');
    }
}

// ================================================================
// 🔹 APLICAR PREFERENCIAS AL CARGAR
// ================================================================

export function aplicarPreferenciasIniciales() {
    const prefs = JSON.parse(localStorage.getItem('empleado_preferencias') || '{}');

    window.sonidoActivo = prefs.sonido !== false;
    window.toastActivo = prefs.toast !== false;

    if (prefs.temaOscuro === false) {
        aplicarTemaOscuro(false);
    }
}

export default {
    inicializarConfiguracion,
    cambiarConfigTab,
    previewFotoPerfil,
    guardarPerfil,
    cambiarPassword,
    guardarPreferencia,
    aplicarPreferenciasIniciales
};