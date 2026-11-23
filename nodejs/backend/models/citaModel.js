import mongoose from 'mongoose';

const citaSchema = new mongoose.Schema({
    usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    vehiculo: {
        marca: { type: String, required: true },
        modelo: { type: String, required: true },
        placa: { type: String, required: true }
    },
    fecha: {
        type: String,
        required: true
    },
    hora: {
        type: String,
        required: true
    },
    sucursal: {
        type: String,
        default: 'Principal'
    },
    estado: {
        type: String,
        enum: ['PENDIENTE', 'CONFIRMADA', 'EN PROCESO', 'LISTO PARA ENTREGA', 'ENTREGADA', 'CANCELADA'],
        default: 'PENDIENTE'
    },
    metodoPago: {
        type: String,
        enum: ['SALDO', 'CUPO_PLAN'],
        required: true
    },
    montoPagado: {
        type: Number,
        default: 0
    },
    fotoFinal: {
        type: String,
        default: null
    }
}, {
    timestamps: true // Añade createdAt y updatedAt automáticamente
});

const Cita = mongoose.model('Cita', citaSchema);
export default Cita;