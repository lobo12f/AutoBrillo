import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // ✅ Agregar importación de bcrypt (NUEVO)

const tallerSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    logo: {
        type: String,
        default: null  // URL de la imagen
    },
    descripcion: {
        type: String,
        default: ''
    },
    metodosPago: [{
        type: String,
        enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']
    }],
    // ✅ Contraseña del taller (NUEVO)
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    propietarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Propietario',
        required: true
    },
    direccion: {
        calle: { type: String, required: true },
        ciudad: { type: String, required: true },
        provincia: { type: String, required: true },
        pais: { type: String, default: 'República Dominicana' }, // ⭐ NUEVO
        coordenadas: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null }
        }
    },
    telefono: String,
    email: String,
    horario: {
        lunes: { apertura: String, cierre: String },
        martes: { apertura: String, cierre: String },
        miercoles: { apertura: String, cierre: String },
        jueves: { apertura: String, cierre: String },
        viernes: { apertura: String, cierre: String },
        sabado: { apertura: String, cierre: String },
        domingo: { apertura: String, cierre: String }
    },
    zonaHoraria: {
        type: String,
        default: 'America/Santo_Domingo' // ⭐ Zona horaria por defecto (RD)
    },
    tiposVehiculos: [{
        type: String,
        enum: ['AUTO', 'CAMIONETA', 'MOTO', 'CAMION', 'BUS', 'OTRO'],

    }],
    bahias: [{
        numero: Number,
        nombre: String,
        tipo: {
            type: String,
            enum: ['LAVADO_RAPIDO', 'LAVADO_COMPLETO', 'DETALLADO', 'PULIDO', 'GENERAL']
        },
        estado: {
            type: String,
            enum: ['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO'],
            default: 'DISPONIBLE'
        },
        empleadoAsignado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado'
        }
    }],
    servicios: [{
        nombre: { type: String, required: true },
        descripcion: String,
        precio: { type: Number, required: true },
        duracionEstimada: Number,
        tipo: {
            type: String,
            enum: ['LAVADO', 'DETALLADO', 'PULIDO', 'TRATAMIENTO', 'EXTRA'],
            default: 'LAVADO'
        },
        activo: { type: Boolean, default: true }
    }],
    planes: [{
        nombre: { type: String, required: true },
        descripcion: String,
        precio: { type: Number, required: true },
        serviciosIncluidos: { type: Number, required: true },
        numeroLavados: { type: Number, default: 0 },
        duracionDias: { type: Number, default: 30 },
        tipoServicio: String,
        activo: { type: Boolean, default: true }

    }],
    empleados: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empleado'
    }],
    resenas: [{
        cliente: {
            nombre: String,
            email: String,
            telefono: String,
            foto: String
        },
        vehiculo: {
            marca: String,
            modelo: String,
            placa: String,
            año: Number
        },
        servicio: String,
        servicioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Servicio'
        },
        citaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cita'
        },
        empleadoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado'
        },
        empleadoAsignado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado'
        },
        puntuacion: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        comentario: String,
        fotos: [String],
        fecha: {
            type: Date,
            default: Date.now
        },
        respuesta: String,
        fechaRespuesta: Date,
        respondidoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario'
        },
        respondidoPorTipo: {
            type: String,
            enum: ['taller', 'empleado']
        },
        comentarios: [{
            autor: {
                nombre: String,
                email: String,
                foto: String
            },
            autorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Usuario'
            },
            texto: String,
            foto: String,
            fecha: {
                type: Date,
                default: Date.now
            },
            likes: {
                type: Number,
                default: 0
            },
            likesUsuarios: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Usuario'
            }]
        }],
        activo: {
            type: Boolean,
            default: true
        }
    }],
    calificacion: {
        promedio: { type: Number, default: 0 },
        totalReseñas: { type: Number, default: 0 }
    },
    estado: {
        type: String,
        enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'],
        default: 'ACTIVO'
    },
    metadata: {
        fechaRegistro: { type: Date, default: Date.now },
        ultimaActualizacion: Date
    },
    color: {
        type: String,
        default: '#00ff88'  // Color verde por defecto
    }
},
    {
        timestamps: true
    });

// ================================================================
// 🔒 MÉTODOS DEL MODELO (NUEVO)
// ================================================================

/**
 * ✅ Encriptar contraseña antes de guardar
 *    Se ejecuta automáticamente al crear o modificar el password
 */
tallerSchema.pre('save', async function () {
    // Solo encriptar si el password fue modificado
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * ✅ Comparar contraseña ingresada con la guardada
 *    Usado en login y cambio de contraseña
 * @param {string} password - Contraseña sin encriptar
 * @returns {boolean} true si coinciden
 */
tallerSchema.methods.compararPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export default mongoose.model('Taller', tallerSchema);