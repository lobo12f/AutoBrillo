const conte_nedor_empleado = document.getElementById("cont-empleado");

const obtenerPersonas = async () => {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/personas");
        console.log("Respuesta del servidor:", res);
        if (!res.ok) throw new Error("Error al obtener los datos");

        const personas = await res.json();
        
        // Limpiamos el contenedor antes de llenarla
          conte_nedor_empleado.innerHTML = "";

        personas.forEach(persona => {
            const caja_empleado = document.createElement("div"); // Cambiado a div para mejor compatibilidad
            caja_empleado.className = "box-empleado"; 
            
            caja_empleado.innerHTML = `
                <img src="../../imagen/a.jpeg" alt="">
                <h4>${persona.nombre}</h4>
                <h4>${persona.email}</h4>
                <h4>${persona.telefono || 'N/A'}</h4>
                <h4>${persona.documentoIdentidad || 'N/A'}</h4>
                
                <select name="obtenel cliente">
                     <option value="">misael</option>
                     <option value="">misael1</option>
                     <option value="">misael2</option>
                </select>

                <div class="acciones">
                    <button class="btn-edit" data-id="${persona._id}">✏️</button>
                    <button class="btn-delete" data-id="${persona._id}">🗑️</button>
                </div>
            `;
            conte_nedor_empleado.appendChild(caja_empleado);
        });
      
    } catch (error) {
        console.error("Error:", error);
      //  tablaPersonas.innerHTML = `<tr><h4 colspan="5">Error al cargar datos</h4></tr>`;
    }
};

// Función para eliminar
const eliminarPersona = async (id) => {
    if (!confirm("¿Estás seguro de que deseas eliminar a esta persona?")) return;

    try {
        const res = await fetch(`http://127.0.0.1:3000/api/personas/${id}`, {
          method: "DELETE"
        });
     console.log("estoy eliminado el empleado");
        if (res.ok) {
            alert("🗑️ Registro eliminado");
            obtenerPersonas(); // Recargamos la tabla automáticamente
        } else {
            alert("❌ No se pudo eliminar");
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
};

window.editarPersona = async (id) => {
    // 1. Primero, podrías pedir los nuevos datos (puedes usar un modal o campos de texto)
    const nuevoNombre = prompt("Nuevo nombre del empleado:");
    if (!nuevoNombre) return; // Cancelar si no escribe nada

    const nuevoEmail = prompt("Nuevo correo electrónico:");
    if (!nuevoEmail) return;

    const datos = {
        nombre: nuevoNombre,
        email: nuevoEmail
    };

    try {
        const res = await fetch(`http://127.0.0.1:3000/api/personas/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert("✅ Empleado actualizado");
            obtenerPersonas(); // Recargar la lista
        } else {
            alert("❌ Falló la actualización");
        }
    } catch (error) {
        console.error("Error al editar:", error);
    }
};

// Delegación de eventos para los botones
conte_nedor_empleado.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete')) {
        const btn = e.target.classList.contains('btn-delete') ? e.target : e.target.closest('.btn-delete');
        const id = btn.getAttribute('data-id');
        if (id) eliminarPersona(id);
    }else if(e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit')){
          const btn = e.target.classList.contains('btn-edit') ? e.target : e.target.closest('.btn-edit');
        const id = btn.getAttribute('data-id');
        if(id) editarPersona(id)
    } 
});

obtenerPersonas();