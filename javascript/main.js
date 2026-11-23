import { Cliente } from './Cliente.js';
import { Wallet } from './Wallet.js';
import { db } from './db.js';

const datosCargados = db.obtenerSesion();

if (datosCargados) {
    // 1. Transformamos el JSON plano en una Instancia viva de Cliente
    window.user = new Cliente(datosCargados);
    
    // 2. Le damos la billetera a esa instancia
    window.wallet = new Wallet(window.user);
    
    // 3. ¡Encendemos los motores!
    window.actualizarYRenderizar();
} else {
    // Si no hay sesión, mandamos al login
    window.location.replace('login.html');
}