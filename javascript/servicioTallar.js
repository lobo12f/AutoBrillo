// DATOS AMPLIADOS
let taller = {
    caja: 25500,
    serviciosCompletados: 14,
    catalogo: [
        { nombre: "Lavado Detallado", precio: 1500 },
        { nombre: "Pulido Pro", precio: 4500 },
        { nombre: "Cerámico Pro", precio: 12000 }
    ],
    empleados: [
        { id: 1, nombre: "Marcos Díaz", estado: "Trabajando", gananciaDia: 1200 },
        { id: 2, nombre: "Ricardo Luis", estado: "Libre", gananciaDia: 850 }
    ],
    citas: [
       { hora: "08:00 AM", estado: "Ocupado", cliente: "Juan Pérez",Vehículo:"honda civi", servicio: "Lavado Full" },
       { hora: "10:00 AM", estado: "Libre", cliente: "maria",Vehículo:"honda civi", servicio: "Lavado normal" },
    { hora: "12:00 PM", estado: "Libre", cliente: "julia",Vehículo:"honda civi", servicio: "-" },
    { hora: "02:00 PM", estado: "Libre", cliente: "juana",Vehículo:"honda civi", servicio: "-" }
    ],
    historialClientes: [
        { nombre: "Carlos Ruiz", vehiculo: "Toyota Camry", ultimoServicio: "Pulido", totalInvertido: 4500 }
    ]
};

// ========== PERSISTENCIA EN LOCALSTORAGE ==========
const TALLER_DB_KEY = 'taller_autobrillo_db';

/**
 * Carga los datos del taller desde localStorage
 */
function cargarTallerDesdeStorage() {
    try {
        const datos = localStorage.getItem(TALLER_DB_KEY);
        if (datos) {
            const tallerGuardado = JSON.parse(datos);
            Object.assign(taller, tallerGuardado);
            console.log('✅ Datos del taller cargados desde localStorage');
        }
    } catch (e) {
        console.error('❌ Error al cargar datos del taller:', e);
    }
}

/**
 * Guarda los datos del taller en localStorage
 */
function guardarTallerEnStorage() {
    try {
        localStorage.setItem(TALLER_DB_KEY, JSON.stringify(taller));
        console.log('💾 Datos del taller guardados en localStorage');
    } catch (e) {
        console.error('❌ Error al guardar datos del taller:', e);
    }
}

// Cargar datos al iniciar la página
cargarTallerDesdeStorage();

// Actualizar el objeto de empleados SOLO SI NO HAY DATOS GUARDADOS
// (Si cargarTallerDesdeStorage() restauró empleados, no los sobrescribimos)
if (taller.empleados.length === 0 || taller.empleados[0].gananciaDia === undefined) {
    taller.empleados = [
        { id: 1, nombre: "Marcos Díaz", estado: "Libre", gananciaDia: 0, serviciosHechos: 0 },
        { id: 2, nombre: "Ricardo Luis", estado: "Libre", gananciaDia: 0, serviciosHechos: 0 }
    ];
}

// Guardar después de actualizar
guardarTallerEnStorage();

// ========== FUNCIONES DE TICKET (Generador y Impresión) ==========

/**
 * Genera y muestra un ticket visual del servicio realizado.
 * @param {Object} cita - El objeto de la cita completada.
 */
function generarTicketServicio(cita) {
    console.log('🎟️ Generando ticket...', cita);
    
    const { vehiculo, servicio, precio, fecha, empleado, extra = 0 } = cita;
    const total = precio + extra;

    // Creamos un contenedor temporal para el ticket
    const ticketHTML = `
        <div id="ticket-container" style="
            background: #121212; 
            color: #fff; 
            padding: 25px; 
            border-radius: 20px; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            border: 1px solid #00ff88;
            max-width: 350px;
            margin: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        ">
            <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px;">
                <h2 style="color: #00ff88; margin: 0; letter-spacing: 2px;">AUTOBRILLO D.</h2>
                <small style="color: #888;">Expertos en Detallado Automotriz</small>
            </div>

            <div style="margin-bottom: 20px; font-size: 0.9rem;">
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date(fecha).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Vehículo:</strong> ${vehiculo.modelo}</p>
                <p style="margin: 5px 0;"><strong>Placa:</strong> <span style="background: #00ff88; color: #000; padding: 1px 5px; border-radius: 4px; font-weight: bold;">${vehiculo.placa}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="border-bottom: 1px solid #333; color: #00ff88;">
                        <th style="text-align: left; padding: 8px 0;">Descripción</th>
                        <th style="text-align: right; padding: 8px 0;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px 0;">${servicio}</td>
                        <td style="text-align: right;">RD$ ${precio.toLocaleString()}</td>
                    </tr>
                    ${extra > 0 ? `
                    <tr>
                        <td style="padding: 10px 0;">Cargos Extras</td>
                        <td style="text-align: right;">RD$ ${extra.toLocaleString()}</td>
                    </tr>` : ''}
                </tbody>
            </table>

            <div style="border-top: 2px solid #00ff88; margin-top: 15px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.1rem; font-weight: bold;">TOTAL:</span>
                <span style="font-size: 1.4rem; color: #00ff88; font-weight: bold;">RD$ ${total.toLocaleString()}</span>
            </div>

            <div style="text-align: center; margin-top: 25px; font-size: 0.8rem; color: #666;">
                <p>Atendido por: ${empleado || 'Staff AutoBrillo'}</p>
                <p style="margin-top: 10px; color: #00ff88;">¡Gracias por confiar en nosotros!</p>
                
                <div style="margin-top: 15px;">
                    <button onclick="printTicket()" style="background: #00ff88; border: none; padding: 8px 15px; border-radius: 5px; font-weight: bold; cursor: pointer; color: #000;">Descargar PDF</button>
                    <button onclick="document.getElementById('ticket-modal').remove()" style="background: transparent; border: 1px solid #555; color: #fff; padding: 8px 15px; border-radius: 5px; margin-left: 5px; cursor: pointer;">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    // Inyectamos el ticket en un modal oscuro
    const modalWrap = document.createElement('div');
    modalWrap.id = 'ticket-modal';
    modalWrap.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; align-items:center; justify-content:center; z-index:99999;";
    modalWrap.innerHTML = ticketHTML;
    
    if (document.body) {
        document.body.appendChild(modalWrap);
        console.log('✅ Ticket agregado al DOM');
    } else {
        console.error('❌ No hay document.body disponible');
    }
}

/**
 * Imprime el ticket actual que se generó en pantalla.
 */
function printTicket() {
    const ticket = document.getElementById('ticket-container');
    if (!ticket) {
        return alert('No se encontró el ticket para imprimir.');
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
        return alert('No se pudo abrir la ventana de impresión. Revisa tu bloqueador de ventanas emergentes.');
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>Ticket AutoBrillo</title>
                <style>
                    body { margin: 0; background: #121212; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    #ticket-container { width: 100%; max-width: 400px; margin: 30px auto; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px 0; }
                </style>
            </head>
            <body>
                ${ticket.outerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// --- MEJORA 2: Galería de Antes y Después ---
function agregarAGaleria(cliente, servicio) {
    const galeria = document.getElementById('galeria-trabajos');
    const card = document.createElement('div');
    card.className = 'galeria-card';
    card.innerHTML = `
        <small>${servicio}</small>
        <div style="font-weight:bold; font-size:12px;">${cliente}</div>
        <div class="foto-comparativa">
            <div>FOTO ANTES</div>
            <div>FOTO DESPUÉS</div>
        </div>
    `;
    // Insertar al principio de la galería
    galeria.insertBefore(card, galeria.firstChild);
}

// --- MEJORA 3: Gestión de Historial ---
function actualizarHistorialCliente(nombre, servicio, pago) {
    let cliente = taller.historialClientes.find(c => c.nombre === nombre);
    if(cliente) {
        cliente.totalInvertido += pago;
        cliente.ultimoServicio = servicio;
    } else {
        taller.historialClientes.push({
            nombre: nombre,
            vehiculo: "Por definir",
            ultimoServicio: servicio,
            totalInvertido: pago
        });
    }
}
// --- NAVEGACIÓN ---
function showSection(sectionId) {
    // Ocultar todas
    document.querySelectorAll('.section-page').forEach(s => s.style.display = 'none');
    // Quitar active del menú
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    // Mostrar la seleccionada
    document.getElementById(sectionId).style.display = 'block';
    // Actualizar datos cada vez que entramos
    renderTodo();
}

// --- RENDERIZADO GENERAL ---
// RENDERIZADO ACTUALIZADO
function renderTodo() {
    // 1. Actualizar Caja y Stats
    const cajaDiv = document.getElementById('caja-total');
    if(cajaDiv) cajaDiv.innerText = `RD$ ${taller.caja.toLocaleString()}`;
    
    const cajaDash = document.getElementById('caja-total-dash');
    if(cajaDash) cajaDash.innerText = `RD$ ${taller.caja.toLocaleString()}`;

    const statHoy = document.getElementById('stat-hoy');
    if(statHoy) statHoy.innerText = taller.serviciosCompletados;

    // 2. DIBUJAR TABLA DE CITAS (Esto es lo que te faltaba)
  const tCitas = document.getElementById('tabla-citas');
if(tCitas) {
    tCitas.innerHTML = taller.citas.map((c, i) => {
        // Determinamos qué mostrar en la columna de Acción
        console.log(c.servicio)
        const botonAccion = c.estado === 'Libre' 
            ? `<button onclick="reservarCita(${i})" class="btn-add">Confirmar citas</button>` 
            : `<span style="color:#888;">Citas Confimadad</span>`;
   
        return `
            <tr>
                <td>${c.hora}</td>
                <td>
                    <span class="${c.estado === 'Libre' ? 'status-libre' : 'status-ocupado'}">
                        ${c.estado}
                    </span>
                </td>
                <td>
                    <strong>${c.cliente}</strong>
                    
                   </td>
                      
                   <td>
                   ${c.Vehículo || '-'}
                   </td>
                  <td>  
                      <br> <small style="color: var(--primary); font-weight: bold;">${c.servicio || '-'}</small>
                 </td>
                <td>
                    ${botonAccion} </td>
            </tr>
            
        `;
    }).join('');
}
    // ... (Resto del renderizado de empleados y clientes)


    // 3. Dibujar Tabla de Empleados
    const tEmp = document.getElementById('tabla-empleados');
    if(tEmp) {
        tEmp.innerHTML = taller.empleados.map(e => `
            <tr>
                <td>#${e.id}</td>
                <td>${e.nombre}</td>
                <td>${e.estado}</td>
                <td style="color:#00e676">RD$ ${e.gananciaDia}</td>
            </tr>
        `).join('');
    }

    // 4. Dibujar Historial de Clientes
    const tCli = document.getElementById('tabla-clientes');
    if(tCli) {
        tCli.innerHTML = taller.historialClientes.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.vehiculo}</td>
                <td>${c.ultimoServicio}</td>
                <td>RD$ ${c.totalInvertido}</td>
            </tr>
        `).join('');
    }
}
// --- ACCIONES ---
function reservarCita(idx) {
    const nombreCliente = prompt("Nombre del Cliente y Vehículo:");
    
    if (nombreCliente) {
        // Mostramos los servicios disponibles para elegir uno
        const opciones = taller.catalogo.map((s, i) => `${i}: ${s.nombre} (RD$ ${s.precio})`).join('\n');
        const eleccion = prompt("Seleccione el número del servicio:\n" + opciones);
        
        if (eleccion !== null && taller.catalogo[eleccion]) {
            const servicio = taller.catalogo[eleccion];
            const anticipo = servicio.precio * 0.5;

            // 1. Ocupar la cita
            taller.citas[idx].estado = "Ocupado";
            taller.citas[idx].cliente = nombreCliente;
            
            // 2. Cobrar el 50%
            taller.caja += anticipo;

            // 3. Asignar al primer empleado libre
            let empLibre = taller.empleados.find(e => e.estado === "Libre");
            if (empLibre) {
                empLibre.estado = "Trabajando";
                // Creamos la tarea en el Dashboard para el empleado
                crearCardTarea(servicio.nombre, empLibre.nombre, servicio.precio, nombreCliente);
            }

            guardarTallerEnStorage();
            renderTodo();
            alert(`Reserva confirmada. Se sumaron RD$ ${anticipo} a la caja.`);
        }
    }
}

function crearCardTarea(srv, empNombre, precio, clienteNombre) {
    const cont = document.getElementById('contenedor-tareas');
    const div = document.createElement('div');
    div.className = 'task-card';
    div.innerHTML = `
        <h4>${srv}</h4>
        <p>Operario: ${empNombre}</p>
        <button onclick="finalizarServicio(this, ${precio}, '${empNombre}', '${clienteNombre}', '${srv}')" class="btn-add">Cobrar Restante RD$ ${precio * 0.5}</button>
    `;
    cont.appendChild(div);
}

function finalizarServicio(btn, precioTotal, empNombre, clienteNombre, servicioNombre) {
    console.log('💰 finalizarServicio llamada:', { precioTotal, empNombre, clienteNombre, servicioNombre });
    
    const restante = precioTotal * 0.5;
    const comisionEmp = precioTotal * 0.20;
    const gananciaLimpiaTaller = restante - comisionEmp;

    taller.caja += gananciaLimpiaTaller;
    taller.serviciosCompletados++;

    const emp = taller.empleados.find(e => e.nombre === empNombre);
    if (emp) {
        emp.estado = "Libre";
        emp.gananciaDia += comisionEmp;
    }

    actualizarHistorialCliente(clienteNombre, servicioNombre, precioTotal);
    agregarAGaleria(clienteNombre, servicioNombre);

    console.log('✅ Llamando generarTicketServicio...');
    generarTicketServicio({
        vehiculo: { modelo: servicioNombre, placa: 'N/A' },
        servicio: servicioNombre,
        precio: precioTotal,
        fecha: new Date(),
        empleado: empNombre,
        extra: 0
    });

    btn.parentElement.remove();
    guardarTallerEnStorage();
    renderTodo();
    alert(`Cobrado: RD$ ${restante}. \nComisión Empleado: RD$ ${comisionEmp}`);
}
/**
 * Función auxiliar para guardar después de cualquier cambio en citas
 */
function actualizarCitas() {
    guardarTallerEnStorage();
    renderTodo();
}

// 1. Nueva función: El Empleado avisa que terminó
function empleadoAvisaTerminado(idTarea, empNombre, cliente, servicio, precioTotal) {
    const contenedorAvisos = document.getElementById('lista-avisos');
    
    // Si es el primer aviso, limpiamos el texto de "no hay pendientes"
    if (contenedorAvisos.innerHTML.includes("No hay servicios")) {
        contenedorAvisos.innerHTML = '';
    }

    // Creamos la alerta para el dueño
    const alerta = document.createElement('div');
    alerta.className = 'alerta-pago';
    alerta.id = `alerta-${idTarea}`;
    alerta.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>👷 <b>${empNombre}</b> terminó el servicio de <b>${servicio}</b> (${cliente})</span>
            <button onclick="confirmarCobroFinal('${idTarea}', ${precioTotal}, '${empNombre}', '${cliente}', '${servicio}')" class="btn-add" style="background:#ffc107; color:black;">
                Confirmar Cobro y Archivar 💰
            </button>
        </div>
    `;
    contenedorAvisos.appendChild(alerta);

    // Sonido opcional o cambio visual
    console.log(`Notificación: ${empNombre} ha terminado.`);
}

// 2. El dueño confirma el cobro y se guarda en el historial
function confirmarCobroFinal(idAlerta, precioTotal, empNombre, cliente, servicio) {
    console.log('💳 confirmarCobroFinal llamada:', { precioTotal, empNombre, cliente, servicio });
    
    // Aquí llamamos a la lógica de dinero que ya teníamos
    const restante = precioTotal * 0.5;
    const comision = precioTotal * 0.20;
    
    taller.caja += (restante - comision);
    taller.serviciosCompletados++;

    // Actualizar historial y empleado
    actualizarHistorialCliente(cliente, servicio, precioTotal);
    let emp = taller.empleados.find(e => e.nombre === empNombre);
    if(emp) emp.estado = "Libre";

    // Generar ticket visual localmente
    console.log('✅ Llamando generarTicketServicio desde confirmarCobroFinal...');
    generarTicketServicio({
        vehiculo: { modelo: servicio, placa: 'N/A' },
        servicio,
        precio: precioTotal,
        fecha: new Date(),
        empleado: empNombre,
        extra: 0
    });

    // Quitar la alerta y refrescar
    document.getElementById(`alerta-${idAlerta}`).remove();
    if (document.getElementById('lista-avisos').innerHTML === '') {
        document.getElementById('lista-avisos').innerHTML = '<p style="color: #888;">No hay servicios pendientes de cobro...</p>';
    }
    
    guardarTallerEnStorage();
    renderTodo();
    alert(`¡Venta Cerrada! RD$ ${restante} cobrados. Fotos archivadas en el historial de ${cliente}.`);
}
function verificarReserva(idx) {
    const nombreCliente = prompt("Nombre del Cliente y Vehículo:");
    if (!nombreCliente) return;

    // Menú de opciones basado en tu catálogo
    const opciones = taller.catalogo.map((s, i) => `${i}: ${s.nombre}`).join('\n');
    const eleccion = prompt("Seleccione el servicio:\n" + opciones);

    if (eleccion !== null && taller.catalogo[eleccion]) {
        const servicioSeleccionado = taller.catalogo[eleccion];

        // GUARDAMOS LOS DATOS EN LA CITA
        taller.citas[idx].estado = "Ocupado";
        taller.citas[idx].cliente = nombreCliente;
        taller.citas[idx].servicio = servicioSeleccionado.nombre; // <-- Aquí se guarda

        // Cobro del 50%
        taller.caja += (servicioSeleccionado.precio * 0.5);

        // Asignación automática al empleado
        let emp = taller.empleados.find(e => e.estado === "Libre");
        if (emp) {
            emp.estado = "Trabajando";
            crearCardTarea(servicioSeleccionado.nombre, emp.nombre, servicioSeleccionado.precio, nombreCliente);
        }

        guardarTallerEnStorage();
        renderTodo();
    }
}
// Tabla Historial Clientes
    const tCli = document.getElementById('tabla-clientes');
    if(tCli) {
        tCli.innerHTML = taller.historialClientes.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.vehiculo}</td>
                <td>${c.ultimoServicio}</td>
                <td>RD$ ${c.totalInvertido}</td>
            </tr>
        `).join('');
    }
    function cargarEjemplosVisuales() {
    // 1. Ejemplo de Trabajo en Curso (Dashboard)
    const contenedorTareas = document.getElementById('contenedor-tareas');
    contenedorTareas.innerHTML = `
        <div class="task-card">
            <div style="display:flex; justify-content:space-between;">
                <span class="badge-working">EN PROCESO</span>
                <small>ID: #TR-88</small>
            </div>
            <h4>Pulido de Cristales</h4>
            <p>👷 Empleado: <b>Marcos Díaz</b></p>
            <p>👤 Cliente: <b>Pedro Martínez</b></p>
            <div class="foto-comparativa">
                <div style="background: #444;">🖼️ Foto Antes</div>
                <div style="border: 1px dashed #777;">⏳ Esperando Después</div>
            </div>
        </div>
    `;

// 2. Ejemplo de Galería de Control de Calidad con tu imagen local
// 2. Ejemplo de Galería corregido (Ruta Local)
const galeria = document.getElementById('galeria-trabajos');
galeria.innerHTML = `
    <div class="galeria-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <small style="color:var(--primary)">✅ FINALIZADO</small>
            <small>04/04/2026</small>
        </div>
        <div style="font-weight:bold; margin: 5px 0;">Lavado de Motor - Honda Civic</div>
        <div class="foto-comparativa">
            <div class="foto-placeholder" style="background-image: url('descarga(4).jpeg'); background-size:cover; background-position:center;">
            </div>
            <div class="foto-placeholder" style="background-image: url('https://via.placeholder.com/150/006400/ffffff?text=LIMPIO'); background-size:cover;">
            </div>
        </div>
        <small style="color:#888;">Realizado por: Ricardo Luis</small>
    </div>
`;
 console.log();
    // 3. Ejemplo de Aviso de Cobro Pendiente
    const avisos = document.getElementById('lista-avisos');
    avisos.innerHTML = `
        <div class="alerta-pago" id="alerta-ejemplo">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>👷 <b>Ricardo Luis</b> terminó: <b>Lavado Interior</b> (Ana Mejía)</span>
                <button onclick="confirmarCobroFinal('ejemplo', 1500, 'Ricardo Luis', 'Ana Mejía', 'Lavado Interior')" class="btn-add" style="'background:#ffc107'; color:black; font-size:11px;">
                    COBRAR RD$ 750 💰
                </button>
            </div>
        </div>
    `;
}

// ========== FUNCIONES ADICIONALES CON PERSISTENCIA ==========

/**
 * Agrega un nuevo servicio al catálogo
 */
function agregarServicioCatalogo() {
    const nombre = document.getElementById('srv-nombre').value.trim();
    const precio = parseFloat(document.getElementById('srv-precio').value);
    
    if (nombre && !isNaN(precio) && precio > 0) {
        taller.catalogo.push({ nombre, precio });
        document.getElementById('srv-nombre').value = '';
        document.getElementById('srv-precio').value = '';
        guardarTallerEnStorage();
        renderTodo();
        alert(`✅ Servicio "${nombre}" agregado por RD$ ${precio}`);
    } else {
        alert('❌ Por favor, completa todos los campos correctamente');
    }
}

/**
 * Agrega un nuevo empleado al taller
 */
function agregarEmpleado() {
    const nombre = document.getElementById('emp-nombre').value.trim();
    if (nombre) {
        const id = Math.max(...taller.empleados.map(e => e.id), 0) + 1;
        taller.empleados.push({ id, nombre, estado: 'Libre', gananciaDia: 0 });
        document.getElementById('emp-nombre').value = '';
        guardarTallerEnStorage();
        renderTodo();
        alert(`✅ Empleado "${nombre}" registrado`);
    } else {
        alert('❌ Por favor, ingresa el nombre del empleado');
    }
}

// ACTUALIZA TU WINDOW.ONLOAD
window.onload = function() {
    cargarTallerDesdeStorage();     // Carga los datos guardados PRIMERO
    showSection('section-dash');     // Inicia en Dashboard
    renderTodo();                    // Dibuja las tablas con datos reales
    // NO llamar cargarEjemplosVisuales() para mantener los datos reales
    console.log('✅ Datos del taller cargados al iniciar');
};

