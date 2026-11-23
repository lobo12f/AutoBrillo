import {Conexiondb} from "./Conexiondb.js";

  const conexion = new Conexiondb();
  class AgregaAtable {
    constructor() {
        this.conexion = conexion;
    }

    async agregarATable(objeto ,nombreTabla) {
        try {
            await this.conexion.conectar(); // Aseguramos la conexión
            const db = this.conexion.getDb();
            const resultado = await db.collection(nombreTabla).insertOne(objeto);
            console.log("Registro agregado con ID:", resultado.insertedId);
        } catch (e) {
            console.error("Error al agregar el registro:", e);
        }
    }
}

export { AgregaAtable };    