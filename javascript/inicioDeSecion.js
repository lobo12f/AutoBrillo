/**
 * PÁGINA DE INICIO DE SESIÓN - AutoBrillo D. (Versión 2026)
 * Maneja: login de clientes, propietarios y empleados
 */

import { db } from './db.js';
import { API_URL } from './config.js';
import { apiFetch } from '../api-client.js';
const CONFIG = {
    MAX_INTENTOS: 5,
    TIEMPO_BLOQUEO: 15 * 60 * 1000,
    MIN_PASSWORD_LENGTH: 6,
    REDIRECT_DELAY: 800,
    // ✅ PÁGINAS CORRECTAS
    PAGINA_LOGIN: 'index.html',           // O 'inicioDeSesion.html' si es separado
    PAGINA_DASHBOARD_CLIENTE: 'dashboard.html',
    PAGINA_DASHBOARD_TALLER: 'dashboard-taller.html',
    PAGINA_DASHBOARD_EMPLEADO: 'dashboard-empleado.html'
};

// Estado de intentos
let intentosFallidos = parseInt(sessionStorage.getItem('intentos_login') || '0');
let bloqueadoHasta = parseInt(sessionStorage.getItem('bloqueo_login') || '0');

// ================================================================
// 🔹 INICIALIZACIÓN
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 Página actual:', window.location.pathname);

    // ✅ SOLO verificar sesión si NO estamos en la página de login
    const esPaginaLogin = window.location.pathname.includes('index.html') ||
        window.location.pathname.includes('inicioDeSesion') ||
        window.location.pathname === '/' ||
        window.location.pathname.endsWith('/');

    if (!esPaginaLogin) {
        // Estamos en otra página, verificar sesión
        const sesion = db.obtenerSesion();
        if (!sesion?.email) {
            console.log('🔒 No hay sesión, redirigiendo al login...');
            window.location.href = CONFIG.PAGINA_LOGIN;
            return;
        }
    } else {
        // ✅ Estamos en la página de login
        // Verificar si YA hay sesión activa (para evitar loop)
        const sesion = db.obtenerSesion();
        if (sesion?.email && sesion?.rol) {
            console.log('🔐 Sesión existente, redirigiendo a dashboard...');
            window.location.href = _obtenerRutaDashboard(sesion.rol);
            return;
        }
    }

    // Verificar bloqueo por intentos
    if (_estaBloqueado()) {
        _mostrarBloqueo();
        return;
    }

    // Configurar formulario
    const formulario = document.getElementById('form-login');
    if (formulario) {
        formulario.addEventListener('submit', _manejarLogin);
        console.log('✅ Formulario de login configurado');
    } else {
        console.warn('⚠️ No se encontró el formulario #form-login');
    }

    // Mostrar intentos restantes
    _actualizarIntentosUI();

    // Configurar toggle de contraseña
    _configurarTogglePassword();
});

// ================================================================
// 🔹 MANEJADOR DE LOGIN
// ================================================================

async function _manejarLogin(e) {
    e.preventDefault();
    console.log('🔑 Intentando login...');

    // Verificar bloqueo
    if (_estaBloqueado()) {
        _mostrarBloqueo();
        return;
    }

    const emailInput = document.getElementById('log-email');
    const passwordInput = document.getElementById('log-pass');
    const btn = e.target.querySelector('button[type="submit"]');
    const errorContainer = document.getElementById('login-error');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    // Validaciones
    if (!_validarFormulario(email, password, emailInput, passwordInput, errorContainer)) {
        return;
    }

    // Estado de carga
    _mostrarCarga(btn, true);

    try {
        const resultado = await _intentarLogin(email, password);

        if (resultado.exito) {
            _manejarLoginExitoso(resultado, emailInput, passwordInput);
        } else {
            _manejarLoginFallido(resultado, errorContainer, btn);
        }
    } catch (error) {
        console.error("❌ Error de conexión:", error);
        _mostrarError(errorContainer, "🔌 No se pudo conectar con el servidor.");
        _mostrarCarga(btn, false);
    }
}

// ================================================================
// 🔹 INTENTOS DE LOGIN
// ================================================================

async function _intentarLogin(email, password) {
    const emailLimpio = email.toLowerCase().trim();

    // ✅ PRIMERO: Intentar como cliente normal (usuarios)
    try {
        console.log('🔄 Intentando login como cliente...');
        const response = await apiFetch(`/usuarios/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailLimpio, password })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.exito && data.usuario) {
                console.log('✅ Login como cliente exitoso');
                return { exito: true, usuario: data.usuario, rol: 'CLIENTE' };
            }
        }
    } catch (error) {
        console.log('⚠️ No se pudo conectar con API de usuarios');
    }

    // ✅ SEGUNDO: Intentar como propietario/empleado (talleres)
    try {
        console.log('🔄 Intentando login como taller...');
        const response = await apiFetch(`/talleres/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailLimpio, password })
        });

        const data = await response.json();

        if (data.exito) {
            console.log('✅ Login como taller exitoso');
            return {
                exito: true,
                usuario: data,
                rol: data.rol || 'PROPIETARIO'
            };
        }

        // Mensaje del servidor
        return { exito: false, mensaje: data.mensaje || 'Email o contraseña incorrectos.' };
    } catch (error) {
        console.error('❌ Error en login de taller:', error);
        throw error;
    }
}

// ================================================================
// 🔹 MANEJO DE RESULTADOS
// ================================================================

function _manejarLoginExitoso(resultado, emailInput, passwordInput) {
    console.log('🎉 Login exitoso, guardando sesión...');

    // Limpiar intentos fallidos
    sessionStorage.removeItem('intentos_login');
    sessionStorage.removeItem('bloqueo_login');
    intentosFallidos = 0;

    // Guardar sesión
    const datosSesion = {
        ...resultado.usuario,
        rol: resultado.rol,
        timestamp: Date.now()
    };

    db.guardarSesion(datosSesion);
    window.user = datosSesion;

    // Feedback visual
    const btn = document.querySelector('#form-login button[type="submit"]');
    if (btn) {
        btn.innerHTML = '✅ ¡Bienvenido!';
        btn.style.background = '#00cc66';
        btn.disabled = true;
    }

    // Limpiar formulario
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // ✅ Redirigir según rol (con pequeño delay para ver el feedback)
    const ruta = _obtenerRutaDashboard(resultado.rol);
    console.log(`🔄 Redirigiendo a: ${ruta}`);

    setTimeout(() => {
        window.location.href = ruta;
    }, CONFIG.REDIRECT_DELAY);
}

function _manejarLoginFallido(resultado, errorContainer, btn) {
    intentosFallidos++;
    sessionStorage.setItem('intentos_login', intentosFallidos.toString());

    const intentosRestantes = CONFIG.MAX_INTENTOS - intentosFallidos;

    if (intentosRestantes <= 0) {
        const bloqueoHasta = Date.now() + CONFIG.TIEMPO_BLOQUEO;
        sessionStorage.setItem('bloqueo_login', bloqueoHasta.toString());
        _mostrarBloqueo();
        return;
    }

    let mensaje = resultado.mensaje || 'Email o contraseña incorrectos.';

    if (intentosRestantes <= 2) {
        mensaje += ` Te quedan ${intentosRestantes} intento(s).`;
    }

    _mostrarError(errorContainer, mensaje);
    _mostrarCarga(btn, false);
    _actualizarIntentosUI();

    // Agitar formulario
    const formulario = document.getElementById('form-login');
    if (formulario) {
        formulario.style.animation = 'none';
        setTimeout(() => {
            formulario.style.animation = 'shake 0.5s ease';
        }, 10);
    }
}

// ================================================================
// 🔹 VALIDACIONES
// ================================================================

function _validarFormulario(email, password, emailInput, passwordInput, errorContainer) {
    if (errorContainer) errorContainer.style.display = 'none';
    if (emailInput) emailInput.classList.remove('input-error');
    if (passwordInput) passwordInput.classList.remove('input-error');

    if (!email) {
        _mostrarError(errorContainer, 'Ingresa tu correo electrónico.');
        if (emailInput) {
            emailInput.classList.add('input-error');
            emailInput.focus();
        }
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        _mostrarError(errorContainer, 'Ingresa un correo electrónico válido.');
        if (emailInput) {
            emailInput.classList.add('input-error');
            emailInput.focus();
        }
        return false;
    }

    if (!password) {
        _mostrarError(errorContainer, 'Ingresa tu contraseña.');
        if (passwordInput) {
            passwordInput.classList.add('input-error');
            passwordInput.focus();
        }
        return false;
    }

    return true;
}

// ================================================================
// 🔹 UI HELPERS
// ================================================================

function _mostrarCarga(btn, cargando) {
    if (!btn) return;

    if (cargando) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `
            <span style="display:flex; align-items:center; justify-content:center; gap:10px;">
                <span class="spinner"></span> Verificando...
            </span>`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || 'INICIAR SESIÓN';
        btn.disabled = false;
    }
}

function _mostrarError(container, mensaje) {
    if (!container) {
        container = document.getElementById('login-error');
        if (!container) {
            container = document.createElement('div');
            container.id = 'login-error';
            container.style.cssText = `
                background: rgba(255,68,68,0.1);
                border: 1px solid rgba(255,68,68,0.3);
                color: #ff6b6b;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 15px;
                font-size: 0.9rem;
                text-align: center;
                display: none;
            `;
            const formulario = document.getElementById('form-login');
            if (formulario) {
                formulario.insertBefore(container, formulario.firstChild);
            }
        }
    }

    container.textContent = mensaje;
    container.style.display = 'block';

    clearTimeout(container._timeout);
    container._timeout = setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function _mostrarBloqueo() {
    const formulario = document.getElementById('form-login');
    const errorContainer = document.getElementById('login-error');

    if (formulario) {
        const btn = formulario.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
    }

    const tiempoRestante = Math.ceil((bloqueadoHasta - Date.now()) / 1000 / 60);
    _mostrarError(
        errorContainer,
        `🚫 Demasiados intentos. Espera ${tiempoRestante} minuto(s).`
    );
}

function _estaBloqueado() {
    if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
        return true;
    }

    if (bloqueadoHasta && Date.now() >= bloqueadoHasta) {
        sessionStorage.removeItem('bloqueo_login');
        sessionStorage.removeItem('intentos_login');
        bloqueadoHasta = 0;
        intentosFallidos = 0;
    }

    return false;
}

function _actualizarIntentosUI() {
    const intentosRestantes = CONFIG.MAX_INTENTOS - intentosFallidos;
    const indicador = document.getElementById('intentos-restantes');

    if (indicador) {
        if (intentosRestantes <= 2 && intentosRestantes > 0) {
            indicador.textContent = `⚠️ ${intentosRestantes} intento(s) restante(s)`;
            indicador.style.display = 'block';
        } else {
            indicador.style.display = 'none';
        }
    }
}

function _configurarTogglePassword() {
    const toggleBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('log-pass');

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
}

function _obtenerRutaDashboard(rol) {
    switch (rol) {
        case 'PROPIETARIO':
        case 'ADMIN':
            return CONFIG.PAGINA_DASHBOARD_TALLER;
        case 'EMPLEADO':
        case 'LAVADOR':
        case 'DETALLADOR':
            return CONFIG.PAGINA_DASHBOARD_EMPLEADO;
        case 'CLIENTE':
        default:
            return CONFIG.PAGINA_DASHBOARD_CLIENTE;
    }
}

// ================================================================
// 🔹 ANIMACIONES CSS
// ================================================================

if (!document.getElementById('login-animations')) {
    const style = document.createElement('style');
    style.id = 'login-animations';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .input-error {
            border-color: #ff4444 !important;
            box-shadow: 0 0 0 3px rgba(255,68,68,0.1) !important;
            animation: shake 0.5s ease;
        }
        
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}