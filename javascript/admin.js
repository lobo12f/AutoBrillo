// --- Gestión del Estado del Taller ---
let tallerLleno = false;

function toggleStatus() {
    const btn = document.getElementById('btn-toggle');
    const statusText = document.getElementById('status-text');
    
    tallerLleno = !tallerLleno;

    if (tallerLleno) {
        btn.innerText = "MARCAR COMO LIBRE";
        btn.style.background = "#ff4d4d"; // Rojo
        statusText.innerText = "LLENO";
        statusText.style.color = "#ff4d4d";
        alert("Atención: El taller ahora figura como LLENO para los clientes.");
    } else {
        btn.innerText = "MARCAR COMO LLENO";
        btn.style.background = "var(--primary)"; // Azul Neón
        statusText.innerText = "LIBRE";
        statusText.style.color = "var(--primary)";
        alert("Atención: El taller ahora figura como LIBRE.");
    }
}

// --- Simulación de subida de servicio ---
function confirmarSubida() {
    const servicio = document.getElementById('tipoServicio').value;
    alert(`Éxito: Se ha registrado el servicio "${servicio}" y se ha enviado la foto a la galería del cliente.`);
    // Aquí limpiarías el formulario
    document.getElementById('uploadService').reset();
}

// --- Marcar llegada de cliente ---
function marcarLlegada(btn) {
    const item = btn.parentElement;
    item.style.opacity = "0.4";
    btn.innerText = "ATENDIENDO...";
    btn.disabled = true;
    btn.style.background = "#444";
    console.log("Cliente ingresado a bahía de servicio.");
}

// --- Previsualización de imagen (Opcional) ---
document.getElementById('img-input')?.addEventListener('change', function(e) {
    const preview = document.getElementById('preview');
    if (e.target.files[0]) {
        preview.innerText = "Imagen cargada: " + e.target.files[0].name;
        preview.style.borderColor = "var(--primary)";
    }
});