import { MongoClient } from "mongodb";
const uri = "mongodb://angel:1234@127.0.0.1:27017/AutoBrillo?authSource=admin";
const client = new MongoClient(uri);

let db;

export async function conectarDB() {
    if (!db) {
        await client.connect();
        db = client.db("AutoBrillo");
        console.log("✅ Conectado a MongoDB");
    }
    return db;
}

export async function desconectarDB() {
    if (client) {
        await client.close();
        console.log("✅ Desconectado de MongoDB");
    }
}

export function getDb() {
    if (!db) {
        throw new Error("No se ha conectado a la base de datos");
    }
    return db;
}   