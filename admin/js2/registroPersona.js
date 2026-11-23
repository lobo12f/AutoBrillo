const form = document.getElementById("form-registro");

const botonRegistro = document.getElementById("reg_persona_boton");
document.addEventListener("DOMContentLoaded", () => {
    botonRegistro.addEventListener("click", () => {
        form.requestSubmit();
    });
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        nombre: document.getElementById("reg-nombre").value,
       // apellido: document.getElementById("reg-apellido").value,
        email: document.getElementById("reg-correo").value,
        telefono: document.getElementById("reg-telefono").value,
        fecha: document.getElementById("reg-fecha").value,
        direcciones: document.getElementById("reg-direccion").value,
        documentoIdentidad: document.getElementById("reg-documento").value
    };

    try {
        const res = await fetch("http://127.0.0.1:3000/api/personas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.error);

        alert("✅ Registro exitoso");
        form.reset();

    } catch (error) {
        console.error(error);
        alert("❌ Error al registrar");
    }
});