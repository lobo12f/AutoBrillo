//---------------------------------------------------------------


import { API_URL as BASE_API_URL } from './config.js';
const API_URL = `${BASE_API_URL}/auth`;
import { apiFetch } from './api-client.js';
async function iniciarSesion(event) {
    event.preventDefault();

    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-pass').value;
    const btn = event.target.querySelector('button[type="submit"]');

    if (!email || !password) {
        alert('⚠️ Completa todos los campos.');
        return;
    }

    const textoOriginal = btn.textContent;
    btn.textContent = '⏳ VERIFICANDO...';
    btn.disabled = true;

    try {
        const response = await apiFetch(`/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('📩 Respuesta:', data);

        // ✅ VERIFICAR data.exito Y data.usuario
        if (data.exito && data.usuario) {
            // ✅ Guardar TODOS los datos del usuario
            const sesionCompleta = {
                ...data.usuario,
                token: data.token
            };
            localStorage.setItem('sesion_activa', JSON.stringify(sesionCompleta));

            btn.textContent = '✅ ACCESO CONCEDIDO';
            btn.style.background = '#00cc66';

            setTimeout(() => {
                window.location.href = '/html/clientes/dashboard.html';
            }, 500);
        } else {
            alert('❌ ' + (data.mensaje || 'Error al iniciar sesión'));
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('🔌 Error de conexión');
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

window.iniciarSesion = iniciarSesion;