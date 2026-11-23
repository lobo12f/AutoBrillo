/**
 * class StaffManager
 * Responsabilidad: Control de empleados, disponibilidad y tracking de comisiones.
 */
class StaffManager {
    constructor() {
        // En producción, esto se sincroniza con SQL (PostgreSQL)
        this.empleados = [
            { id: 'emp_01', nombre: 'Juan Pérez', rango: 'Senior', comisionesAcumuladas: 0, activo: true },
            { id: 'emp_02', nombre: 'Pedro Alcántara', rango: 'Junior', comisionesAcumuladas: 0, activo: true },
            { id: 'emp_03', nombre: 'Dahiana M.', rango: 'Especialista', comisionesAcumuladas: 0, activo: true }
        ];
    }

    /**
     * Registra una comisión ganada por un trabajo terminado.
     * Este método interactuará con el PaymentSecurityCore para validar el dinero.
     */
    registrarTrabajo(empleadoId, montoComision, ticketId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        
        if (empleado && empleado.activo) {
            empleado.comisionesAcumuladas += montoComision;
            
            // Log de auditoría para SQL
            console.log(`🏦 SQL LOG: Comisión de RD$ ${montoComision} asignada a ${empleado.nombre}. Ticket: ${ticketId}`);
            return true;
        }
        return false;
    }

    /**
     * Realiza el pago de comisiones (Cierre de semana/mes).
     */
    pagarNominaEmpleado(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (empleado && empleado.comisionesAcumuladas > 0) {
            const montoAPagar = empleado.comisionesAcumuladas;
            empleado.comisionesAcumuladas = 0; // Reiniciamos balance
            
            console.log(`💸 PAGO REALIZADO: RD$ ${montoAPagar} entregados a ${empleado.nombre}`);
            // Aquí se enviaría la orden a FinancialCore (SQL) para registrar el gasto de caja
            return montoAPagar;
        }
        return 0;
    }

    listarEmpleadosDisponibles() {
        return this.empleados.filter(e => e.activo);
    }

    // Dentro de StaffManager
async registrarTrabajo(empleadoId, montoComision, ticketId) {
    // Enviamos el dato a SQL para que quede grabado a fuego
    const resultado = await window.DB.ejecutarTransaccionSQL('registrar-comision', {
        empleadoId,
        monto: montoComision,
        referencia: ticketId
    });

    if (resultado.success) {
        console.log("✅ Comisión guardada permanentemente en SQL");
    }
}
}

window.Staff = new StaffManager();