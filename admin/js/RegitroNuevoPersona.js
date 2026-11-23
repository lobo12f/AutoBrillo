

import { apiFetch } from '../../javascript/api-client';
const form = document.getElementById("form-registro");
const botonRegistro = document.getElementById("reg_persona_boton");
document.addEventListener("DOMContentLoaded", () => {
    botonRegistro.addEventListener("click", () => {
        console.log("Botón de registro clickeado");
        form.requestSubmit();
    });
});


form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nuevoRegistro = {
        nombre: document.getElementById("reg-nombre").value,
        // apellido: document.getElementById("reg-apellido").value,
        email: document.getElementById("reg-correo").value,
        telefono: document.getElementById("reg-telefono").value,
        fecha: document.getElementById("reg-fecha").value,
        direcciones: document.getElementById("reg-direccion").value,
        documentoIdentidad: document.getElementById("reg-documento").value
    };

    try {
        const response = await apiFetch("/api/personas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(nuevoRegistro)
        });

        if (!response.ok) throw new Error("Error en la petición");

        alert("Registro agregado exitosamente");
        form.reset();

    } catch (e) {
        console.error("Error al registrar persona", e);
        alert("Error al agregar el registro");
    }
});