import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const empleadoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    tallerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Taller', required: true },
    rol: { type: String, enum: ['LAVADOR', 'DETALLADOR', 'SUPERVISOR', 'ADMIN'], default: 'LAVADOR' },
    especialidades: [String],
    telefono: String,
    foto: String,
    fotoPerfil: { type: String, default: null }, // ✅ NUEVO: para base64 o URL
    horario: { inicio: { type: String, default: '08:00' }, fin: { type: String, default: '17:00' } },
    estado: { type: String, enum: ['DISPONIBLE', 'OCUPADO', 'DESCANSANDO', 'INACTIVO'], default: 'DISPONIBLE' },
    metricas: { trabajosCompletados: { type: Number, default: 0 }, calificacionPromedio: { type: Number, default: 0 } },
    ultimoAcceso: Date,
    bio: { type: String, maxlength: 200, default: '' },
    anosExperiencia: { type: Number, default: 0, min: 0 },

    metricas: {
        trabajosCompletados: { type: Number, default: 0 },
        calificacionPromedio: { type: Number, default: 0 },
        totalResenas: { type: Number, default: 0 }  // ⭐ NUEVO
    },
}, { timestamps: true });

// ✅ Solo encriptar si la contraseña es nueva o fue modificada
empleadoSchema.pre('save', async function () {
    if (this.isModified('password') && this.password && !this.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Método para comparar contraseñas
empleadoSchema.methods.compararPassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model('Empleado', empleadoSchema);