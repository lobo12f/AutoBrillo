/**
 * Lógica del Dashboard Admin
 * Conecta la UI con las 12 Clases Maestras
 */
const DashboardApp = {
    init: function() {
        this.verificarPermisos();
        this.renderResumen();
        this.renderAgenda();
    },

    verificarPermisos: function() {
        // Usamos la clase AdminAuth que creamos
        if (window.Auth.tienePermiso('VER_DINERO')) {
            document.getElementById('btn-finanzas').style.display = 'block';
        }
    },

    renderResumen: function() {
        // Consumimos AnalyticsEngine
        const reporte = window.Analytics.obtenerReporteFinanciero();
        document.getElementById('txt-ganancia').innerText = `RD$ ${reporte.utilidadNeta.toLocaleString()}`;
        
        // Consumimos InventoryManager
        const alertas = window.Inventory.obtenerAlertas();
        document.getElementById('txt-alertas').innerText = alertas.length > 0 ? `${alertas.length} productos bajos` : "Todo OK";
    },

    renderAgenda: function() {
        const tareas = window.Scheduler.obtenerTablero();
        const container = document.getElementById('table-tasks');
        container.innerHTML = '';

        tareas.forEach(tarea => {
            // Buscamos datos en otras clases para mostrar nombres reales
            const emp = window.Staff.empleados.find(e => e.id === tarea.empleadoId);
            const plan = window.Planes.planes.find(p => p.id === tarea.planId);

            container.innerHTML += `
                <tr>
                    <td>${tarea.placa}</td>
                    <td>${plan ? plan.nombre : 'S/N'}</td>
                    <td>${emp ? emp.nombre : 'Sin asignar'}</td>
                    <td><span class="badge ${tarea.estado}">${tarea.estado}</span></td>
                    <td>
                        <button onclick="cambiarEstado('${tarea.id}')">🔄</button>
                        <button onclick="notificarCliente('${tarea.placa}')">📱</button>
                    </td>
                </tr>
            `;
        });

        /**
 * main.js - Controlador de Interfaz de AutoBrillo D.
 */

const DashboardUI = {
    init: function() {
        // Inicializar clases de lógica
        DashboardApp.init(); 
        RegistroVehiculo.init();
        
        // Configuración inicial de la vista
        this.setupNavigation();
    },

    // Maneja el cambio de pestañas (Resumen, Agenda, etc.)
    showSection: function(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('main > section').forEach(sec => {
            sec.classList.add('hidden');
        });
        
        // Quitar clase activa de botones
        document.querySelectorAll('.sidebar-carbon button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar la sección seleccionada
        const target = document.getElementById(`sec-${sectionId}`);
        if (target) {
            target.classList.remove('hidden');
        }
    },

    // Control del Modal de Registro
    toggleModal: function(show) {
        const modal = document.getElementById('modal-registro');
        modal.style.display = show ? 'flex' : 'none';
    }
};

// Funciones globales para los "onclick" de tu HTML
function showSection(id) { DashboardUI.showSection(id); }
function openNewTaskModal() { DashboardUI.toggleModal(true); }
function actualizarPrecioVista() { RegistroVehiculo.actualizarPrecioVista(); }

// Cerrar modal al hacer clic fuera del contenido
window.onclick = function(event) {
    const modal = document.getElementById('modal-registro');
    if (event.target == modal) {
        DashboardUI.toggleModal(false);
    }
}

// Arrancar la App
window.onload = () => DashboardUI.init();
    }
    
};

// Arrancar cuando cargue la página
window.onload = () => DashboardApp.init();