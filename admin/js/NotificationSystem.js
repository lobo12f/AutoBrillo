/**
 * class NotificationSystem
 * Responsabilidad: Automatizar avisos por WhatsApp y Web Push.
 */
class NotificationSystem {
    constructor() {
        this.apiWhatsApp = "https://wa.me/";
        this.telefonoTaller = "8090000000"; // Teléfono de AutoBrillo D.
    }

    /**
     * Genera el enlace de WhatsApp con un mensaje personalizado.
     */
    notificarVehiculoListo(clienteNombre, placa, telefonoCliente) {
        const mensaje = `*AutoBrillo D. 💎*%0A%0A¡Hola ${clienteNombre}! 👋%0A%0ANuestro equipo ha terminado con tu vehículo *(${placa})*. Ya puedes pasar a recogerlo. ¡Quedó como nuevo! ✨`;
        
        const url = `${this.apiWhatsApp}${telefonoCliente}?text=${mensaje}`;
        
        console.log(`📱 Notificación preparada para ${clienteNombre}`);
        // Retornamos el link para que Angel solo tenga que darle click
        return url;
    }

    /**
     * Aviso interno para Angel (Ej: Stock bajo o alerta de seguridad).
     */
    alertaAdministrativa(mensaje) {
        console.warn(`🔔 NOTIFICACIÓN ADMIN: ${mensaje}`);
        // Aquí se integraría con un servicio de Push o Telegram Bot
    }
}

window.Notifications = new NotificationSystem();