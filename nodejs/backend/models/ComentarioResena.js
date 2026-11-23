import mongoose from 'mongoose';

const comentarioResenaSchema = new mongoose.Schema({
    citaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CitaTaller',
        required: true
    },
    tallerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        required: true
    },
    // ✅ ESTE ES EL CAMPO CLAVE: A quién responde este comentario
    respuestaA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ComentarioResena',
        default: null  // null = comentario raíz, con valor = respuesta a otro comentario
    },
    // ✅ NUEVO: Nivel de anidación (0 = raíz, 1 = primera respuesta, 2 = respuesta a respuesta)
    nivel: {
        type: Number,
        default: 0
    },
    // ✅ NUEVO: Comentario raíz (para búsquedas rápidas)
    comentarioRaizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ComentarioResena',
        default: null
    },
    texto: {
        type: String,
        default: ''
    },
    foto: {
        type: String,
        default: null
    },
    autor: {
        id: String,
        nombre: String,
        // ✅ NUEVO: Tipo de autor para distinguir
        tipo: {
            type: String,
            enum: ['CLIENTE', 'EMPLEADO', 'TALLER'],
            default: 'CLIENTE'
        },
        foto: {
            type: String,
            default: null
        },
        // ✅ Si es empleado, guardar referencia
        empleadoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado',
            default: null
        },
        // ✅ Si es taller, guardar referencia
        tallerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Taller',
            default: null
        }
    },

    // ✅ NUEVO: Quién puede responder (para control de permisos)
    puedeResponder: {
        type: String,
        enum: ['TALLER', 'EMPLEADO', 'AMBOS', 'NINGUNO'],
        default: 'AMBOS'
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    likes: {
        type: Number,
        default: 0
    },
    likesUsuarios: [String],
    // ✅ NUEVO: Estado del comentario
    estado: {
        type: String,
        enum: ['ACTIVO', 'OCULTO', 'ELIMINADO'],
        default: 'ACTIVO'
    }
}, {
    timestamps: true
});

// Índices
comentarioResenaSchema.index({ citaId: 1, fecha: -1 });
comentarioResenaSchema.index({ citaId: 1, respuestaA: 1 });
comentarioResenaSchema.index({ tallerId: 1 });
comentarioResenaSchema.index({ 'autor.tipo': 1 });
comentarioResenaSchema.index({ 'autor.empleadoId': 1 });

const ComentarioResena = mongoose.model('ComentarioResena', comentarioResenaSchema);

export default ComentarioResena;