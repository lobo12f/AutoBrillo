import mongoose from 'mongoose';

const citaTallerSchema = new mongoose.Schema({
    tallerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        required: true
    },
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    empleadoPreferidoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empleado',
        default: null
    },
    empleadoPreferidoNombre: {
        type: String,
        default: null
    },// ⭐ NUEVO: Sistema de expiración
    fechaExpiracion: {
        type: Date,
        default: null,
        index: true
    },
    expiradaPor: {
        type: String,
        enum: ['SISTEMA', 'TALLER', 'CLIENTE', null],
        default: null
    },
    fechaExpirada: {
        type: Date,
        default: null
    },
    vehiculo: {
        marca: { type: String, default: 'Genérico' },
        modelo: { type: String, default: 'Modelo' },
        placa: { type: String, default: 'S/P' },
        color: { type: String, default: '' }
    },
    servicio: {
        nombre: { type: String, default: 'Servicio' },
        precio: { type: Number, default: 0 },
        duracionEstimada: { type: Number, default: 45 }
    },
    fecha: { type: String },
    hora: { type: String },
    bahiaAsignada: { type: Number, default: null },
    empleadoAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empleado',
        default: null
    },
    // ✅ NUEVO: Empleado que completó el trabajo (para historial)
    empleadoCompletado: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado',
            default: null
        },
        nombre: {
            type: String,
            default: ''
        }
    },
    estado: {
        type: String,
        enum: [
            'PENDIENTE',
            'CONFIRMADA',
            'EN_RECEPCION',
            'EN_PROCESO',
            'LISTO',
            'ENTREGADO',
            'CANCELADA',
            'EXPIRADA'],
        default: 'PENDIENTE'
    },
    fechas: {
        cita: { type: Date },
        recepcion: { type: Date },
        inicioTrabajo: { type: Date },
        finalizacion: { type: Date },
        entrega: { type: Date }
    },
    pago: {
        metodo: {
            type: String,
            enum: ['SALDO', 'CUPO_PLAN', 'TARJETA', 'EFECTIVO'],
            default: 'SALDO'
        },
        monto: { type: Number, default: 0 },
        pagado: { type: Boolean, default: false },
        comisionPlataforma: { type: Number, default: 0 }
    },
    checklistServicios: [{
        nombre: {
            type: String,
            required: true
        },
        completado: {
            type: Boolean,
            default: false
        },
        fechaCompletado: {
            type: Date,
            default: null
        },
        completadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado',
            default: null
        },
        notas: {
            type: String,
            default: ''
        }
    }],
    // ✅ FOTOS - solo una definición
    fotos: {
        antes: [{
            url: String,
            descripcion: String,
            fecha: { type: Date, default: Date.now },
            subidoPor: String
        }],
        durante: [{
            url: String,
            descripcion: String,
            fecha: { type: Date, default: Date.now },
            subidoPor: String
        }],
        despues: [{
            url: String,
            descripcion: String,
            fecha: { type: Date, default: Date.now },
            subidoPor: String
        }]
    },
    // ✅ NOTAS - solo una definición
    notas: [{
        autor: { type: String, default: 'SISTEMA' },
        texto: { type: String },
        fecha: { type: Date, default: Date.now }
    }],
    calificacion: {
        puntuacion: { type: Number, min: 1, max: 5 },
        comentario: { type: String },
        fecha: { type: Date },

        // ✅ Respuesta del TALLER
        respuestaTaller: { type: String, default: null },
        fechaRespuestaTaller: { type: Date, default: null },
        respondidoPorTaller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Taller',
            default: null
        },

        // ✅ Respuesta del EMPLEADO
        respuestaEmpleado: { type: String, default: null },
        fechaRespuestaEmpleado: { type: Date, default: null },
        respondidoPorEmpleado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado',
            default: null
        },

        // ✅ Compatibilidad con campos anteriores
        respuesta: { type: String, default: null },
        fechaRespuesta: { type: Date, default: null },
        respondidoPor: { type: mongoose.Schema.Types.ObjectId, default: null },
        respondidoPorTipo: { type: String, default: null },

        // ✅ Reacciones
        reacciones: {
            likes: { type: Number, default: 0 },
            util: { type: Number, default: 0 },
            gracias: { type: Number, default: 0 }
        },
        reaccionesUsuarios: { type: mongoose.Schema.Types.Mixed, default: {} }
    }
}, {
    timestamps: true
});

// Índices para búsquedas rápidas
citaTallerSchema.index({ tallerId: 1, estado: 1 });
citaTallerSchema.index({ tallerId: 1, fecha: -1 });
citaTallerSchema.index({ empleadoAsignado: 1, estado: 1 });
citaTallerSchema.index({ 'empleadoCompletado.id': 1 });
// ⭐ Índice para búsquedas rápidas de citas por expirar
citaTallerSchema.index({ estado: 1, fechaExpiracion: 1 });

export default mongoose.model('CitaTaller', citaTallerSchema);