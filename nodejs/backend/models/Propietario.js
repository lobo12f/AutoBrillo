import mongoose from 'mongoose';

const propietarioSchema = new mongoose.Schema({
    usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: false, // ✅ Cambiado a false - No todos los propietarios son usuarios de la app
        default: null
    },
    nombre: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    tipoPlan: { 
        type: String, 
        enum: ['BASICO', 'PROFESIONAL', 'EMPRESARIAL'], 
        default: 'BASICO' 
    },
    talleres: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Taller' 
    }],
    maxTalleres: { 
        type: Number, 
        default: 1 
    },
    maxEmpleados: { 
        type: Number, 
        default: 5 
    },
    comision: { 
        type: Number, 
        default: 15 
    },
    ingresos: {
        mensual: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    estado: { 
        type: String, 
        enum: ['ACTIVO', 'SUSPENDIDO'], 
        default: 'ACTIVO' 
    }
}, { 
    timestamps: true 
});

export default mongoose.model('Propietario', propietarioSchema);