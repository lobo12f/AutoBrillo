/**
 * class PlanManager
 * Responsabilidad: Crear paquetes que agrupan varios servicios con un precio especial.
 */
class PlanManager {
    constructor() {
        this.planes = [
            {
                id: 'plan_full',
                nombre: 'Plan Brillante Full',
                serviciosIncluidos: ['srv_01', 'srv_02', 'srv_04'], // Lavado Ext + Int + Motor
                descuentoPaquete: 0.10 // 10% de descuento por ser combo
            },
            {
                id: 'plan_diamante',
                nombre: 'Plan Diamante Cerámico',
                serviciosIncluidos: ['srv_01', 'srv_02', 'srv_05'], 
                descuentoPaquete: 0.15
            }
        ];
    }

    /**
     * Calcula el costo total de un plan ajustado al tipo de vehículo.
     * @param {string} planId 
     * @param {string} categoriaVehiculoId 
     */
    calcularCostoPlan(planId, categoriaVehiculoId) {
        const plan = this.planes.find(p => p.id === planId);
        if (!plan) return 0;

        let totalSuma = 0;

        plan.serviciosIncluidos.forEach(srvId => {
            const srv = window.Services.obtenerServicio(srvId);
            if (srv) {
                // Ajustamos el precio de cada servicio según el vehículo (Clase 1)
                totalSuma += window.VehicleManager.obtenerPrecioAjustado(srv.precioBase, categoriaVehiculoId);
            }
        });

        // Aplicamos el descuento del plan
        const precioFinal = totalSuma * (1 - plan.descuentoPaquete);
        return Math.round(precioFinal);
    }
}

window.Planes = new PlanManager();