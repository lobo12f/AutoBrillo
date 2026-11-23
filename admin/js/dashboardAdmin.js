import { apiFetch } from './api-client.js';
// Dashboard JavaScript Functions
document.addEventListener('DOMContentLoaded', function () {
    // Initialize dashboard
    initializeDashboard();

    // Set current date
    setCurrentDate();

    // Load initial data
    loadDashboardData();
});

const actualizarDashboardReal = async () => {
    try {
        const res = await apiFetch("http://127.0.0.1:3000/api/dashboard/resumen");
        const data = await res.json();

        // 1. Actualizar Ingresos
        const ingresosTexto = `RD$ ${data.ingresos.toLocaleString()}`;
        document.getElementById("ingresos-hoy").textContent = ingresosTexto;
        document.getElementById("txt-ganancia").textContent = ingresosTexto; // La de abajo

        // 2. Actualizar Vehículos
        document.getElementById("vehiculos-hoy").textContent = data.taller;
        document.getElementById("txt-vehiculos-hoy").textContent = data.taller;

        // 3. Actualizar Citas Pendientes
        document.getElementById("citas-pendientes").textContent = data.citas;

        // 4. Alertas de Stock (Ejemplo estático por ahora)
        document.getElementById("txt-alertas").textContent = "Shampoo Bajo (2L)";

    } catch (error) {
        console.error("Error conectando el dashboard:", error);
    }
};

actualizarDashboardReal();

// Ejecutar al cargar la página
actualizarDashboard();
// Opcional: Actualizar cada 5 minutos automáticamente
setInterval(actualizarDashboard, 300000);
// Initialize dashboard
function initializeDashboard() {
    // Show resumen section by default
    showSection('resumen');

    // Add click handlers to sidebar buttons
    const sidebarButtons = document.querySelectorAll('.sidebar-carbon button');
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function () {
            const sectionId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(sectionId);
        });
    });
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('main > section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Update sidebar active state
    const sidebarButtons = document.querySelectorAll('.sidebar-carbon button');
    sidebarButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Find and activate corresponding sidebar button
    const activeButton = document.querySelector(`.sidebar-carbon button[onclick*="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Update navbar active state
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
        }
    });
}
window.showSection = showSection; // Make function globally accessible


// Set current date
function setCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        currentDateElement.textContent = now.toLocaleDateString('es-ES', options);
    }
}

// Load dashboard data (simulated)
function loadDashboardData() {
    // Simulate loading data
    setTimeout(() => {
        document.getElementById('ingresos-hoy').textContent = 'RD$ 15,750.00';
        document.getElementById('vehiculos-hoy').textContent = '8';
        document.getElementById('empleados-activos').textContent = '5';
        document.getElementById('citas-pendientes').textContent = '3';
    }, 1000);
}

// Toggle notifications dropdown
function toggleNotifications() {
    const dropdown = document.querySelector('.notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Logout function
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        // Implement logout logic here
        window.location.href = '../html/inicioDeSecion.html';
    }
}

// Modal functions
function openNewTaskModal() {
    const modal = document.getElementById('modal-registro');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('modal-registro');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('modal-registro');
    if (modal && event.target === modal) {
        closeModal();
    }
});

// Form submission handlers
document.addEventListener('submit', function (event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Handle different forms
    if (form.closest('#modal-registro')) {
        // Handle new vehicle registration
        alert('Vehículo registrado exitosamente!');
        closeModal();
        form.reset();
    } else if (form.closest('#cont-sevicios')) {
        // Handle new service creation
        alert('Servicio agregado exitosamente!');
        form.reset();
    } else if (form.closest('#cont-reg-empl')) {
        // Handle new employee registration
        alert('Empleado registrado exitosamente!');
        form.reset();
    }
});

// Responsive sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar-carbon');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Add mobile menu button if needed
if (window.innerWidth <= 768) {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.innerHTML = '☰';
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.onclick = toggleSidebar;
        navbar.insertBefore(mobileMenuBtn, navbar.firstChild);
    }
}


// Función para mostrar la fecha actual en español
const mostrarFecha = () => {
    const fechaElemento = document.getElementById("current-date");
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const hoy = new Date();

    // Capitalizamos la primera letra (Ej: "Martes...")
    const fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
    fechaElemento.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
};

mostrarFecha();