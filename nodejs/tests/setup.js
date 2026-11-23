// nodejs/tests/setup.js
// Opción A: usar MongoDB REAL con base de datos de TEST separada
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

jest.setTimeout(60000);

// Base de datos de test separada (NO toca AutoBrillo de producción)
const MONGO_URI_TEST = process.env.MONGO_URI_TEST
    || 'mongodb://angel:1234@127.0.0.1:27017/AutoBrilloTest?authSource=admin';

beforeAll(async () => {
    await mongoose.connect(MONGO_URI_TEST, {
        serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB REAL conectada (DB de test):', MONGO_URI_TEST);
}, 30000);

afterEach(async () => {
    // Limpiar colecciones entre tests para aislamiento
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    // Borrar la DB de test completa y desconectar
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('✅ DB de test limpiada y desconectada');
}, 30000);