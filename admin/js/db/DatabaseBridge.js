/**
 * class DatabaseBridge
 * Responsabilidad: Centralizar las peticiones a SQL (Postgres) y NoSQL (Mongo).
 */
class DatabaseBridge {
    constructor() {
        this.apiSQL = "https://tu-servidor-api.com/sql";
        this.apiNoSQL = "https://tu-servidor-api.com/nosql";
    }

    /**
     * OPERACIONES SQL (Seguridad y Dinero)
     */
    async ejecutarTransaccionSQL(endpoint, datos) {
        try {
            const response = await fetch(`${this.apiSQL}/${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.Auth.token}` // Token anti-hackeo
                },
                body: JSON.stringify(datos)
            });
            return await response.json();
        } catch (error) {
            console.error("🚨 Error Crítico SQL:", error);
            return { error: true, msg: "Fallo en el núcleo financiero" };
        }
    }

    /**
     * OPERACIONES NoSQL (Flexibilidad y Catálogo)
     */
    async consultarDocumentoNoSQL(coleccion, query) {
        try {
            const response = await fetch(`${this.apiNoSQL}/${coleccion}?search=${query}`);
            return await response.json();
        } catch (error) {
            console.error("🚨 Error NoSQL:", error);
            return null;
        }
    }
}

window.DB = new DatabaseBridge();