function seleccionarPlan(nombrePlan) {
    // Aquí es donde conectarías con tu pasarela de pago (Stripe/Mercado Pago)
    alert("Has seleccionado el " + nombrePlan + ". Redirigiendo a la pasarela de pago segura...");
    
    // Ejemplo de redirección lógica:
    // window.location.href = "/checkout?plan=" + nombrePlan.toLowerCase();
}

document.querySelector('.btn-login').addEventListener('click', function(){
   window.location.href='./cabesera/inicioDeSecion.html'
   '<a href=""></a>'
});

// Efecto de cambio de color en la barra de navegación al hacer scroll
window.addEventListener('scroll', function() {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        nav.style.background = '#000';
    } else {
        nav.style.background = 'rgba(0,0,0,0.8)';
    }
});

document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Obtener los datos del formulario
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const servicio = document.getElementById('servicio').value;
    
    // Simulación de envío
    console.log("Enviando mensaje de:", nombre, email, "Interés en:", servicio);
    
    alert("¡Gracias " + nombre + "! Hemos recibido tu mensaje. Nos pondremos en contacto contigo pronto.");
    
    // Limpiar el formulario
    this.reset();
});