const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Pool } = require('pg'); // Solo una vez
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CONEXIÓN A BASES DE DATOS ---

// SQL: PostgreSQL (Finanzas)
const sqlPool = new Pool({
  user: process.env.DB_USER || 'angel_admin',
  host: process.env.DB_HOST || 'localhost',
  database: 'autobrillo_finanzas',
  password: process.env.DB_PASSWORD || 'tu_clave_segura',
  port: 5432,
});

sqlPool.query('SELECT NOW()', (err) => {
  if (err) console.error('🚨 Error PostgreSQL:', err);
  else console.log('🏦 Conexión exitosa a PostgreSQL (Finanzas)');
});

// NoSQL: MongoDB (Operación)
// Asegúrate que DATABASE_URL_NOSQL esté en tu archivo .env
mongoose.connect(process.env.DATABASE_URL_NOSQL || 'mongodb://localhost:27017/autobrillo_operacion')
  .then(() => console.log('🍃 Conectado a MongoDB (Operación)'))
  .catch(err => console.error('🚨 Error MongoDB:', err));

// --- 2. RUTAS DE SEGURIDAD (PostgreSQL) ---

app.post('/api/sql/registrar-comision', async (req, res) => {
    const { empleadoId, monto, referencia } = req.body;
    try {
        const query = 'INSERT INTO comisiones_staff (empleado_name, monto_comision, ticket_ref) VALUES ($1, $2, $3) RETURNING *';
        const values = [empleadoId, monto, referencia];
        const result = await sqlPool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 3. RUTAS DE FLEXIBILIDAD (MongoDB) ---

app.get('/api/nosql/servicios', async (req, res) => {
    try {
        const servicios = await mongoose.connection.collection('servicios').find().toArray();
        res.json(servicios);
    } catch (err) {
        res.status(500).json({ error: true, msg: err.message });
    }
});

// Ruta para registrar entrada de vehículo
app.post('/api/nosql/nuevo-ingreso', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const result = await db.collection('vehiculos_historial').insertOne({
            ...req.body,
            fecha: new Date(),
            estado: 'ESPERA'
        });
        res.json({ success: true, id: result.insertedId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. LANZAMIENTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de AutoBrillo D. corriendo en puerto ${PORT}`);
});