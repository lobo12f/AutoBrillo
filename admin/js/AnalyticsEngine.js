/**
 * class AnalyticsEngine
 * Responsabilidad: Generar métricas financieras y predicciones de consumo.
 */
class AnalyticsEngine {
    constructor() {
        // Estos datos se extraen de la combinación de SQL (pagos) y NoSQL (servicios)
    }

    /**
     * Calcula el rendimiento real del taller.
     * Genera la data para las gráficas de Angel.
     */
    obtenerReporteFinanciero() {
        const ingresos = window.Finance.cajaDiaria;
        const gastos = window.Finance.gastosMensuales;
        
        // Sumamos todas las comisiones que se deben o se han pagado
        const comisionesPagadas = window.Staff.empleados.reduce((acc, emp) => acc + emp.comisionesAcumuladas, 0);

        return {
            ingresoBruto: ingresos,
            utilidadNeta: ingresos - gastos - comisionesPagadas,
            costoOperativo: gastos + comisionesPagadas,
            margenBeneficio: (((ingresos - gastos - comisionesPagadas) / ingresos) * 100).toFixed(2) + '%'
        };
    }

    /**
     * INTELIGENCIA DE CLIENTE:
     * Analiza el historial de un vehículo para predecir su siguiente cita.
     */
    predecirSiguienteServicio(placa) {
        // Simulamos búsqueda en el historial de NoSQL (MongoDB)
        // En un caso real, haríamos un query: db.servicios.find({placa: placa})
        const historial = [
            { placa: 'A123456', servicioId: 'plan_full', fecha: '2026-03-01' },
            { placa: 'A123456', servicioId: 'plan_full', fecha: '2026-04-01' }
        ];

        const serviciosFrecuentes = historial.filter(h => h.placa === placa);

        if (serviciosFrecuentes.length > 0) {
            // Lógica simple: recomendar el servicio que más repite
            const sugerencia = serviciosFrecuentes[0].servicioId;
            const planInfo = window.Planes.planes.find(p => p.id === sugerencia);
            
            return {
                mensaje: `💡 Sugerencia: Al cliente de la placa ${placa} le gusta el ${planInfo.nombre}.`,
                planId: sugerencia,
                esRecurrente: true
            };
        }

        return { mensaje: "Cliente nuevo. Sugerir Plan Básico.", esRecurrente: false };
    }

    /**
     * RANKING DE STAFF:
     * Para saber qué empleado está produciendo más.
     */
    obtenerRankingEmpleados() {
        return window.Staff.empleados
            .map(emp => ({
                nombre: emp.nombre,
                produccion: emp.comisionesAcumuladas
            }))
            .sort((a, b) => b.produccion - a.produccion);
    }
}

window.Analytics = new AnalyticsEngine();