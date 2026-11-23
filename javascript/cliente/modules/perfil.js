/**
 * ============================================================================
 * 👤 MÓDULO DE PERFIL: Datos, foto, password
 * ============================================================================
 */

import { estadoCarga, logger } from '../utils/toast.js';

// ============================================================================
// VALIDADORES
// ============================================================================
const validadores = {
    telefono: (tel) => /^(809|829|849)\d{7}$/.test(tel.replace(/[-\s]/g, ''))
};

// ============================================================================
// RENDERIZAR PERFIL
// ============================================================================
export function renderizarPerfil() {
    const user = window.user;
    if (!user) return;

    document.getElementById('perf-nombre').value = user.nombre || '';
    document.getElementById('perf-apellido').value = user.apellido || '';
    document.getElementById('perf-whatsapp').value = user.whatsapp || '';
    document.getElementById('perf-email').value = user.email || '';
    document.getElementById('preview-foto-perfil').src = user.fotoPerfil || './assets/default-avatar.png';
    document.getElementById('perfil-nombre-display').textContent = user.nombre || 'Usuario';
    document.getElementById('perfil-email-display').textContent = user.email || '';
    document.getElementById('perfil-plan-badge').textContent = 'Plan: ' + (user.planActual || 'Ninguno');

    const historial = user.citasHistorial;
    document.getElementById('perfil-total-citas').textContent = historial.length;
    document.getElementById('perfil-total-gastado').textContent = 'RD$ ' + historial
        .reduce((s, c) => s + (c.montoPagado || 0), 0).toLocaleString();
    document.getElementById('perfil-vehiculos-count').textContent = user.garaje.length;

    renderizarHistorialFinanciero();
}

export function renderizarHistorialFinanciero() {
    const contenedor = document.getElementById('lista-transacciones');
    if (!contenedor) return;

    let transacciones = [];

    const misCitas = window.user.misCitas;
    misCitas.forEach(c => {
        if (c.montoPagado > 0) {
            transacciones.push({
                fecha: c.fecha || c.fechaRegistro,
                concepto: 'Cita: ' + (c.servicio || 'Servicio'),
                monto: c.montoPagado,
                tipo: 'PAGO'
            });
        }
    });

    transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (transacciones.length === 0) {
        contenedor.innerHTML = '<p style="color:#666;text-align:center;">No hay transacciones.</p>';
        return;
    }

    contenedor.innerHTML = transacciones.map(t => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1e2a3a;">
            <div>
                <p style="color:#fff;font-size:0.85rem;margin:0;">${t.concepto}</p>
                <small style="color:#888;">${new Date(t.fecha).toLocaleDateString('es-DO')}</small>
            </div>
            <span style="color:${t.tipo === 'RECARGA' || t.tipo === 'REEMBOLSO' ? '#00ff88' : '#ff4444'};font-weight:600;">
                ${t.tipo === 'RECARGA' || t.tipo === 'REEMBOLSO' ? '+' : '-'} RD$ ${t.monto.toLocaleString()}
            </span>
        </div>`).join('');
}

// ============================================================================
// GUARDAR CAMBIOS
// ============================================================================
export async function guardarCambiosPerfil(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btn-guardar-perfil');
    const orig = btn.innerHTML;

    const telefono = document.getElementById('perf-whatsapp').value;

    if (telefono && !validadores.telefono(telefono)) {
        window.mostrarToast('⚠️ Formato de teléfono inválido. Use: 8095551234', 'warning');
        return;
    }

    window.user.nombre = document.getElementById('perf-nombre').value;
    window.user.apellido = document.getElementById('perf-apellido').value;
    window.user.whatsapp = telefono;

    btn.innerHTML = "Guardando... ✨";
    btn.disabled = true;
    estadoCarga.mostrar('Guardando perfil...');

    try {
        const exito = await window.db.sincronizarConServidor();
        if (exito) {
            window.persistirUsuario();
            window.mostrarToast("✅ Perfil actualizado exitosamente.", "success");
            window.actualizarInterfaz?.(window.user);
        } else {
            window.mostrarToast("⚠️ No se pudo sincronizar con el servidor.", "warning");
        }
    } catch (error) {
        logger.error('Error al guardar perfil:', error);
        window.mostrarToast("❌ Error al guardar los cambios.", "error");
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
        estadoCarga.ocultar();
    }
}

// ============================================================================
// ACTUALIZAR CONTRASEÑA
// ============================================================================
export async function actualizarPassword(e) {
    if (e) e.preventDefault();
    const actual = document.getElementById('pass-actual').value;
    const nueva = document.getElementById('pass-nueva').value;
    const confirma = document.getElementById('pass-confirma').value;

    if (nueva !== confirma) {
        window.mostrarToast("❌ Las contraseñas no coinciden.", "error");
        return;
    }
    if (nueva.length < 8) {
        window.mostrarToast("⚠️ La contraseña debe tener mínimo 8 caracteres.", "warning");
        return;
    }

    const btn = e.target.querySelector('button');
    btn.innerHTML = "Actualizando... 🔐";
    btn.disabled = true;
    estadoCarga.mostrar('Actualizando contraseña...');

    try {
        const d = await window.fetchConReintento(`/usuarios/update-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: window.user.email,
                passwordActual: actual,
                passwordNueva: nueva
            })
        });
        if (d.exito) {
            window.mostrarToast("✅ Contraseña actualizada exitosamente.", "success");
            document.getElementById('form-password').reset();
        } else {
            window.mostrarToast("❌ " + d.mensaje, "error");
        }
    } catch (error) {
        logger.error('Error al actualizar contraseña:', error);
        window.mostrarToast("🔌 Error de conexión.", "error");
    } finally {
        btn.innerHTML = "Actualizar Contraseña";
        btn.disabled = false;
        estadoCarga.ocultar();
    }
}

// ============================================================================
// FOTO DE PERFIL
// ============================================================================
export async function procesarImagenParaPerfil(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
        window.mostrarToast("⚠️ Formato no permitido. Usa JPG, PNG o WebP.", "warning");
        return;
    }

    if (file.size > 1024 * 1024) {
        window.mostrarToast("⚠️ Imagen muy pesada. Máximo 1MB.", "warning");
        return;
    }

    estadoCarga.mostrar('Subiendo foto de perfil...');

    try {
        const formData = new FormData();
        formData.append('foto', file);

        const usuarioId = window.user?._id || window.user?.id;
        if (!usuarioId) {
            window.mostrarToast("❌ Error: No se encontró el usuario", "error");
            estadoCarga.ocultar();
            return;
        }
        formData.append('usuarioId', usuarioId);

        const data = await window.fetchConReintento(`/upload/perfil`, {
            method: 'POST',
            body: formData
        });

        if (data.exito) {
            window.user.fotoPerfil = data.url;
            document.querySelectorAll('#preview-foto-perfil,#avatar-sidebar,#user-photo-header')
                .forEach(img => img.src = data.url);
            window.persistirUsuario();
            await window.db.sincronizarConServidor();
            window.mostrarToast("✅ Foto de perfil actualizada.", "success");
        } else {
            window.mostrarToast("❌ Error al subir la imagen.", "error");
        }
    } catch (error) {
        logger.error('Error al subir foto de perfil:', error);
        window.mostrarToast("❌ Error de conexión.", "error");
    } finally {
        estadoCarga.ocultar();
    }
}

// ============================================================================
// EXPORTAR A WINDOW
// ============================================================================
window.renderizarPerfil = renderizarPerfil;
window.renderizarHistorialFinanciero = renderizarHistorialFinanciero;
window.guardarCambiosPerfil = guardarCambiosPerfil;
window.actualizarPassword = actualizarPassword;
window.procesarImagenParaPerfil = procesarImagenParaPerfil;

console.log('✅ Módulo perfil.js cargado');