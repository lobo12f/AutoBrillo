const { MongoClient } = require('mongodb');

class Conexionbd {
    constructor() {
        this.url = "mongodb://angel:1234@127.0.0.1:27017/AutoBrillo?authSource=admin";
        this.client = new MongoClient(this.url);
        this.db = null; // Inicializamos en null
    }

    async conectar() {
        try {
            await this.client.connect();
            this.db = this.client.db("AutoBrillo");
            console.log("✅ Conexión exitosa a AutoBrillo DB");
            return this.db;
        } catch (error) {
            console.error("❌ Error al conectar a MongoDB:", error);
            throw error;
        }
    }

    getDb() {
        return this.db;
    }
}

// --- FORMA CORRECTA DE USARLO ---

let co = new Conexionbd();

async function probarConexion() {
    // 1. Esperamos a que la conexión se complete
    await co.conectar(); 
    
    // 2. Ahora sí, getDb() tendrá la base de datos
    console.log("Instancia de la DB:", co.getDb().databaseName); 
}

async function mostrarDocumentos() {
    // 1. Conectamos
    await co.conectar();
    const db = co.getDb();

    // 2. Usamos find().toArray() para obtener los documentos
    const servicios = await db.collection('caja_diaria').find().toArray();

    console.log("--- Listado de Servicios ---");
    console.log(servicios); // Mostramos el primer documento para verificar
}

async function crearDocumentos() {
   await co.conectar();
    const db = co.getDb();

    const nuevoDiario = {
        _id: "diario_20240620",
        fecha: new Date(),
        monto_inicial:1000,
        ingresos_totales: 3000,
         egresos_totales: 500,
         comisiones_pendientes: 225,
        estado: "Pendiente"
    };
    const resultado = await db.collection('caja_diaria').insertOne(nuevoDiario);
    console.log("Documento creado con ID:", resultado.insertedId);
}
mostrarDocumentos();
probarConexion();
crearDocumentos();