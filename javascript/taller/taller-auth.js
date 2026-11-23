/**
 * AUTOENTICACIÓN DE TALLERES
 * Maneja registro, login y verificación de sesión para propietarios
 */

import { SERVER_URL } from '../config.js';
const API_URL = `${SERVER_URL}/api/talleres`;
import { apiFetch } from '../api-client.js';
// ==================== REGISTRO ====================

let pasoActual = 1;
const totalPasos = 3;
let planSeleccionado = 'BASICO';

function actualizarPasos() {
    // ✅ Validar que los elementos existen
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    // Si no existen, es porque no estamos en la página de registro (es login)
    if (!btnPrev || !btnNext || !btnSubmit) return;

    // Actualizar indicador de pasos
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (stepNum === pasoActual) step.classList.add('active');
        if (stepNum < pasoActual) step.classList.add('completed');
    });

    // Mostrar/ocultar formularios
    document.querySelectorAll('.form-step').forEach(form => {
        form.classList.remove('active');
        if (parseInt(form.dataset.step) === pasoActual) form.classList.add('active');
    });

    // Actualizar botones
    btnPrev.style.display = pasoActual > 1 ? 'inline-block' : 'none';
    btnNext.style.display = pasoActual < totalPasos ? 'inline-block' : 'none';
    btnSubmit.style.display = pasoActual === totalPasos ? 'inline-block' : 'none';
}

window.siguientePaso = function () {
    if (validarPasoActual()) {
        if (pasoActual < totalPasos) {
            pasoActual++;
            actualizarPasos();
        }
    }
};

window.pasoAnterior = function () {
    if (pasoActual > 1) {
        pasoActual--;
        actualizarPasos();
    }
};

window.seleccionarPlan = function (plan) {
    planSeleccionado = plan;
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.plan === plan) card.classList.add('selected');
    });
};

function validarPasoActual() {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = '';

    if (pasoActual === 1) {
        const nombre = document.getElementById('taller-nombre').value.trim();
        const telefono = document.getElementById('taller-telefono').value.trim();
        const email = document.getElementById('taller-email').value.trim();
        const direccion = document.getElementById('taller-direccion').value.trim();
        const ciudad = document.getElementById('taller-ciudad').value.trim();

        if (!nombre || !telefono || !email || !direccion || !ciudad) {
            mostrarAlerta('Por favor, completa todos los campos obligatorios.', 'error');
            return false;
        }
    }

    if (pasoActual === 3) {
        const password = document.getElementById('propietario-password').value;
        const confirmar = document.getElementById('propietario-confirmar').value;

        if (password !== confirmar) {
            mostrarAlerta('Las contraseñas no coinciden.', 'error');
            return false;
        }

        if (password.length < 8) {
            mostrarAlerta('La contraseña debe tener al menos 8 caracteres.', 'error');
            return false;
        }
    }

    return true;
}

function mostrarAlerta(mensaje, tipo) {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
    setTimeout(() => alertContainer.innerHTML = '', 5000);
}



document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('btn-login');

            if (!email || !password) {
                alert('⚠️ Completa todos los campos');
                return;
            }

            // Mostrar loading
            btn.disabled = true;
            btn.textContent = '⏳ Ingresando...';

            try {
                console.log('🔑 Intentando login con:', email);

                const response = await apiFetch(`/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('📥 Respuesta:', data);

                if (data.exito) {
                    // Guardar sesión
                    localStorage.setItem('taller_sesion', JSON.stringify(data));
                    console.log('✅ Sesión guardada');

                    // Verificar que se guardó
                    const verificado = localStorage.getItem('taller_sesion');
                    if (verificado) {
                        console.log('✅ Verificación OK, redirigiendo...');
                        window.location.href = 'dashboard.html';
                    } else {
                        alert('❌ Error al guardar sesión');
                    }
                } else {
                    alert('❌ ' + (data.mensaje || 'Error al iniciar sesión'));
                    btn.disabled = false;
                    btn.textContent = '🚀 Ingresar al Panel';
                }
            } catch (error) {
                console.error('❌ Error:', error);
                alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
                btn.disabled = false;
                btn.textContent = '🚀 Ingresar al Panel';
            }
        });
    }
});

function mostrarAlertaLogin(mensaje, tipo) {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
}

// Toggle password visibility
window.togglePassword = function () {
    const input = document.getElementById('login-password');
    input.type = input.type === 'password' ? 'text' : 'password';
};

// Inicializar
// Inicializar (solo si estamos en la página de registro)
if (document.getElementById('register-form')) {
    actualizarPasos();
}