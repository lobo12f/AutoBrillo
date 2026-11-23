import mongoose from 'mongoose';

const comisionSchema = new mongoose.Schema({
    tallerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        required: true
    },
    empleadoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empleado',
        required: true
    },
    porcentaje: {
        type: Number,
        required: true,
        default: 30, // 30% por defecto
        min: 0,
        max: 100
    },
    tipo: {
        type: String,
        enum: ['POR_LAVADO', 'POR_SERVICIO', 'FIJO_MENSUAL'],
        default: 'POR_LAVADO'
    },
    montoFijo: {
        type: Number,
        default: 0 // Si es pago fijo mensual
    },
    activo: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('Comision', comisionSchema);