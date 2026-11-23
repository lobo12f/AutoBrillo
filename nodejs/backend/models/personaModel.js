import mongoose from 'mongoose';

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    // En tallerSchema
    zonaHoraria: {
        type: String,
        default: 'America/Santo_Domingo' // ⭐ Zona horaria por defecto (RD)
    },
    apellido: {
        type: String,
        default: ''
    },
    whatsapp: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: true
    },
    fotoPerfil: {
        type: String,
        default: ""
    },
    saldo: {
        type: Number,
        default: 0
    },
    serviciosDisponibles: {
        type: Number,
        default: 0
    },
    planActual: {
        type: String,
        default: 'Ninguno'
    },
    // CORRECCIÓN: Cambiado de [ObjectId] a Array para aceptar los objetos de las citas
    misCitas: {
        type: Array,
        default: []
    },
    extrasPagos: {
        type: Array,
        default: []
    },
    garaje: {
        type: Array,
        default: []
    },
    tallerVinculado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

export default mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);