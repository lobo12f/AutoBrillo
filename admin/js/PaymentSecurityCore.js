/**
 * class PaymentSecurityCore
 * Responsabilidad: Validar, procesar cobros y proteger la integridad del dinero.
 */
class PaymentSecurityCore {
    constructor() {
        this.tasaImpuesto = 0.18; // Ejemplo: ITBIS si aplica
        this.intentosFallidos = 0;
    }

    /**
     * PROCESO MAESTRO DE COBRO
     * Valida que el monto que llega del "frontend" sea igual al que dictan las reglas del negocio.
     */
    async procesarPago(cliente, ticketData) {
        console.log('🛡️ Iniciando verificación de seguridad...');

        // 1. RECALCULAR (No confiar en el input del usuario)
        // Buscamos el precio real en nuestras clases maestras (ServiceCatalog y VehicleManager)
        const precioReal = window.Planes.calcularCostoPlan(ticketData.planId, ticketData.categoriaId);
        const montoConExtras = precioReal + (ticketData.extras || 0);

        // 2. VALIDACIÓN ANTI-HACKEO
        if (ticketData.montoCobrado !== montoConExtras) {
            this.bloquearTransaccion('Discrepancia de montos detectada. Posible manipulación de datos.');
            return { status: 'ERROR', message: 'Error de validación financiera.' };
        }

        // 3. VERIFICACIÓN DE FONDOS (Si es por Wallet)
        if (ticketData.metodo === 'WALLET') {
            if (cliente.wallet_saldo < montoConExtras) {
                return { status: 'DENIED', message: 'Saldo insuficiente en Wallet.' };
            }
        }

        // 4. EJECUCIÓN ATÓMICA (Simulación de Transacción SQL)
        try {
            // En SQL, esto sería una transacción BEGIN...COMMIT
            console.log('💸 Procesando transacción en Núcleo SQL...');
            
            // A. Registrar el ingreso en FinancialCore
            window.Finance.registrarIngreso(montoConExtras, ticketData.metodo);

            // B. Si es Wallet, descontar al cliente
            if (ticketData.metodo === 'WALLET') {
                cliente.wallet_saldo -= montoConExtras;
            }

            // C. Disparar el pago de comisión al empleado
            const comision = window.Services.calcularComision(ticketData.planId, montoConExtras);
            window.Staff.registrarTrabajo(ticketData.empleadoId, comision, ticketData.id);

            return { 
                status: 'SUCCESS', 
                authCode: `AUTH-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
                total: montoConExtras
            };

        } catch (error) {
            this.bloquearTransaccion(`Error crítico en base de datos: ${error.message}`);
            return { status: 'CRITICAL_ERROR' };
        }
    }

    bloquearTransaccion(motivo) {
        this.intentosFallidos++;
        console.error(`🚨 ALERTA DE SEGURIDAD: ${motivo}`);
        // Aquí se enviaría una alerta inmediata al celular de Angel
    }
}

window.Security = new PaymentSecurityCore();