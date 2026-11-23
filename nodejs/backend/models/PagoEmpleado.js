import mongoose from 'mongoose';

const pagoEmpleadoSchema = new mongoose.Schema({
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
    periodo: {
        inicio: { type: Date, required: true },
        fin: { type: Date, required: true }
    },
    trabajosIncluidos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CitaTaller'
    }],
    totalTrabajos: { type: Number, default: 0 },
    totalGenerado: { type: Number, default: 0 },
    comisionPorcentaje: { type: Number, default: 30 },
    comisionMonto: { type: Number, default: 0 },
    metodoPago: {
        type: String,
        enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'OTRO'],
        default: 'EFECTIVO'
    },
    estado: {
        type: String,
        enum: ['PENDIENTE', 'PAGADO', 'CANCELADO'],
        default: 'PENDIENTE'
    },
    fechaPago: Date,
    notas: String
}, { timestamps: true });

export default mongoose.model('PagoEmpleado', pagoEmpleadoSchema);