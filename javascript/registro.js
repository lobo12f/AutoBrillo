import { db } from './db.js';
import { API_URL } from './config.js';
import { apiFetch } from '../api-client.js';
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const pass = document.getElementById('pass1').value;
        const confirmPass = document.getElementById('pass2').value;
        const btn = e.target.querySelector('button[type="submit"]');

        // Validaciones
        if (pass !== confirmPass) {
            alert("⚠️ Las contraseñas no coinciden.");
            return;
        }

        if (pass.length < 8) {
            alert("⚠️ La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        // Preparar datos (solo lo que acepta el servidor)
        const nombre = document.getElementById('reg-nombre').value.trim();
        const apellido = document.getElementById('reg-apellido').value.trim();

        const userData = {
            nombre: nombre + (apellido ? ' ' + apellido : ''),
            email: document.getElementById('reg-email').value.trim(),
            password: pass
        };

        const originalText = btn.innerHTML;
        btn.innerHTML = "Creando cuenta... ✨";
        btn.disabled = true;

        try {
            const response = await apiFetch(`/auth/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            console.log('📩 Respuesta:', result);

            if (result.exito && result.usuario) {
                // ✅ Guardar sesión directamente en localStorage
                localStorage.setItem('sesion_activa', JSON.stringify(result.usuario));

                btn.innerHTML = '✅ CUENTA CREADA';
                btn.style.background = '#00cc66';

                alert(`¡Bienvenido, ${userData.nombre}!`);

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 500);

            } else {
                alert("❌ " + (result.mensaje || "Error en el registro"));
                btn.innerHTML = originalText;
                btn.disabled = false;
            }

        } catch (error) {
            console.error("❌ Error de red:", error);
            alert("🔌 No se pudo conectar con el servidor. Verifica que esté corriendo en puerto 3000.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}