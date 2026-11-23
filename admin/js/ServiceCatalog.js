/**
 * class ServiceCatalog
 * Responsabilidad: Gestionar el listado maestro de servicios, precios base y comisiones.
 */
class ServiceCatalog {
    constructor() {
        // Estos datos vendrán de MongoDB. 
        // El 'precioBase' es el estándar (usualmente para un Sedán).
        this.servicios = [
            { id: 'srv_01', nombre: 'Lavado Exterior', precioBase: 500, comisionTipo: 'porcentaje', comisionValor: 0.10 },
            { id: 'srv_02', nombre: 'Lavado de Interiores', precioBase: 1200, comisionTipo: 'porcentaje', comisionValor: 0.15 },
            { id: 'srv_03', nombre: 'Pulido de Faros', precioBase: 800, comisionTipo: 'fijo', comisionValor: 200 },
            { id: 'srv_04', nombre: 'Limpieza de Motor', precioBase: 600, comisionTipo: 'fijo', comisionValor: 150 },
            { id: 'srv_05', nombre: 'Tratamiento Cerámico', precioBase: 5000, comisionTipo: 'porcentaje', comisionValor: 0.20 }
        ];
    }

    /**
     * Busca un servicio por su ID.
     */
    obtenerServicio(id) {
        return this.servicios.find(s => s.id === id);
    }

    /**
     * Calcula cuánto debe ganar el empleado por un servicio específico.
     * Esto alimenta directamente a la clase StaffManager.
     */
    calcularComision(id, precioFinal) {
        const servicio = this.obtenerServicio(id);
        if (!servicio) return 0;

        if (servicio.comisionTipo === 'fijo') {
            return servicio.comisionValor;
        } else {
            return precioFinal * servicio.comisionValor;
        }
    }

    /**
     * Permite al Admin actualizar precios sin tocar el código.
     */
    actualizarPrecioBase(id, nuevoPrecio) {
        const servicio = this.obtenerServicio(id);
        if (servicio) {
            servicio.precioBase = nuevoPrecio;
            console.log(`✅ Precio actualizado: ${servicio.nombre} ahora cuesta RD$ ${nuevoPrecio}`);
            // Aquí se dispararía la actualización a MongoDB
        }
    }
    // Dentro de ServiceCatalog
async cargarCatalogo() {
    const datos = await window.DB.consultarDocumentoNoSQL('servicios', 'todos');
    if (datos) {
        this.servicios = datos;
        console.log("📦 Catálogo actualizado desde NoSQL");
    }
}
}

window.Services = new ServiceCatalog();