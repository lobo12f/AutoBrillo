/**
 * class VehicleCategoryManager
 * Responsabilidad: Definir y ajustar precios/tiempos según el tipo de vehículo.
 */
class VehicleCategoryManager {
    constructor() {
        // En un futuro, esto se cargará desde MongoDB
        this.categorias = [
            { id: 'cat_01', nombre: 'Motocicleta', factor: 0.7, tiempoBase: 45 },
            { id: 'cat_02', nombre: 'Sedán', factor: 1.0, tiempoBase: 90 },
            { id: 'cat_03', nombre: 'Hatchback', factor: 0.9, tiempoBase: 80 },
            { id: 'cat_04', nombre: 'Jipeta / SUV', factor: 1.3, tiempoBase: 120 },
            { id: 'cat_05', nombre: 'Camioneta', factor: 1.5, tiempoBase: 150 },
            { id: 'cat_06', nombre: 'Camión / Bus', factor: 2.5, tiempoBase: 240 }
        ];
    }

    /**
     * Calcula el precio final basado en el precio base de un servicio.
     * @param {number} precioBase - Precio estándar (normalmente el de un Sedán).
     * @param {string} categoriaId - El ID de la categoría seleccionada.
     */
    obtenerPrecioAjustado(precioBase, categoriaId) {
        const categoria = this.categorias.find(c => c.id === categoriaId);
        if (!categoria) return precioBase;
        
        // Retornamos el precio multiplicado por el factor (ej: 1000 * 1.3 = 1300)
        return Math.round(precioBase * categoria.factor);
    }

    /**
     * Retorna el listado para llenar los selectores (dropdowns) en la interfaz de Angel.
     */
    listarCategorias() {
        return this.categorias.map(c => ({ id: c.id, nombre: c.nombre }));
    }

    // Método para el Administrador: Agregar nueva categoría
    agregarCategoria(nombre, factor, tiempo) {
        const nuevaCat = {
            id: `cat_${Date.now()}`,
            nombre,
            factor,
            tiempoBase: tiempo
        };
        this.categorias.push(nuevaCat);
        // Aquí iría la orden a MongoDB para persistir el cambio
        console.log(`✅ Nueva categoría añadida: ${nombre}`);
    }
}

// Inicialización global para el sistema administrativo
window.VehicleManager = new VehicleCategoryManager();