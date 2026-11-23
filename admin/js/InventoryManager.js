/**
 * class InventoryManager
 * Responsabilidad: Controlar el stock de productos y alertar sobre faltantes.
 */
class InventoryManager {
    constructor() {
        this.productos = [
            { id: 'prod_01', nombre: 'Shampoo PH Neutro', stock: 50, unidad: 'Galones', minimo: 10 },
            { id: 'prod_02', nombre: 'Cera de Carnauba', stock: 12, unidad: 'Unidades', minimo: 3 },
            { id: 'prod_03', nombre: 'Desengrasante Motor', stock: 5, unidad: 'Galones', minimo: 8 } // Este disparará alerta
        ];
    }

    /**
     * Registra el gasto de producto al terminar un servicio.
     */
    consumirProducto(id, cantidad) {
        const prod = this.productos.find(p => p.id === id);
        if (prod) {
            prod.stock -= cantidad;
            if (prod.stock <= prod.minimo) {
                console.warn(`⚠️ ALERTA DE STOCK: El producto ${prod.nombre} se está agotando.`);
            }
        }
    }

    obtenerAlertas() {
        return this.productos.filter(p => p.stock <= p.minimo);
    }
}

window.Inventory = new InventoryManager();