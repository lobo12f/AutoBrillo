
const formServicio = document.getElementById("form-servicio");
const tablaServicios = document.getElementById("lista-servicios-body");

// --- FUNCIÓN PARA LISTAR SERVICIOS ---
const obtenerServicios = async () => {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/servicios");
        const servicios = await res.json();
        
        tablaServicios.innerHTML = ""; // Limpiar tabla

        servicios.forEach(servicio => {
            const fila = document.createElement("tr");
          // ... dentro de tu forEach de servicios ...
            fila.innerHTML = `
                <td>${servicio.nombre}</td>
                <td>${servicio.precio} RD$</td>
                <td>${servicio.descripcion || 'Sin descripción'}</td>
                <td>
                    <button class="btn-edit btn-serv-editar" data-id="${servicio._id}">✏️</button>
                    <button class="btn-delete btn-serv-eliminar" data-id="${servicio._id}">🗑️</button>
                </td>
            `;
            tablaServicios.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al obtener servicios:", error);
    }
};
const tablaServiciosBody = document.getElementById("lista-servicios-body");

tablaServiciosBody.addEventListener("click", async (e) => {
    // BOTÓN ELIMINAR
    if (e.target.classList.contains("btn-serv-eliminar")) {
        const id = e.target.getAttribute("data-id");
        if (!confirm("¿Deseas quitar este servicio del catálogo de AutoBrillo?")) return;

        try {
            const res = await fetch(`http://127.0.0.1:3000/api/servicios/${id}`, { method: "DELETE" });
            if (res.ok) {
                alert("🗑️ Servicio borrado");
                obtenerServicios(); // Refrescar tabla
            }
        } catch (err) { console.error("Error:", err); }
    }

    // BOTÓN EDITAR
    if (e.target.classList.contains("btn-serv-editar")) {
        const id = e.target.getAttribute("data-id");
        
        // Forma rápida: Prompts para probar. 
        // Luego podemos hacerlo para que suba al formulario de arriba.
        const nuevoNombre = prompt("Nuevo nombre del servicio:");
        const nuevoPrecio = prompt("Nuevo precio (RD$):");

        if (!nuevoNombre || !nuevoPrecio) return;

        try {
            const res = await fetch(`http://127.0.0.1:3000/api/servicios/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: nuevoNombre, precio: parseFloat(nuevoPrecio) })
            });

            if (res.ok) {
                alert("✅ Catálogo actualizado");
                obtenerServicios();
            }
        } catch (err) { console.error("Error:", err); }
    }
});
// --- FUNCIÓN PARA GUARDAR NUEVO SERVICIO ---
formServicio.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevoServicio = {
        nombre: document.getElementById("serv-nombre").value,
        descripcion: document.getElementById("serv-descripcion").value,
        precio: document.getElementById("serv-precio").value,
        tiempoEstimado: document.getElementById("serv-tiempo").value
    };

    try {
        const res = await fetch("http://127.0.0.1:3000/api/servicios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoServicio)
        });

        if (res.ok) {
            alert("✨ Servicio añadido correctamente");
            formServicio.reset();
            obtenerServicios(); // Recargar la tabla
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    }
});

// Cargar al iniciar
obtenerServicios();