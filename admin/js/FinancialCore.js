/**
 * class FinancialCore
 * Responsabilidad: Registro de ingresos, gastos fijos y balance de utilidades.
 */
class FinancialCore {
    constructor() {
        this.cajaDiaria = 0;
        this.gastosMensuales = 0;
        this.historialTransacciones = []; // Esto persistirá en SQL
    }

    registrarIngreso(monto, metodo) {
        this.cajaDiaria += monto;
        this.historialTransacciones.push({
            tipo: 'INGRESO',
            monto,
            metodo,
            fecha: new Date()
        });
        console.log(`💰 Caja actualizada: +RD$ ${monto.toLocaleString()} (${metodo})`);
    }

    registrarGasto(descripcion, monto) {
        this.gastosMensuales += monto;
        this.historialTransacciones.push({
            tipo: 'GASTO',
            monto,
            descripcion,
            fecha: new Date()
        });
        console.log(`📉 Gasto registrado: -RD$ ${monto.toLocaleString()} [${descripcion}]`);
    }

    obtenerUtilidadNeta() {
        // La utilidad real es lo que entró menos lo que salió (gastos y comisiones)
        // Este dato lo consumirá la clase de Analytics
        return this.cajaDiaria - this.gastosMensuales;
    }
}

window.Finance = new FinancialCore();