import mongoose from 'mongoose';

const notificacionTallerSchema = new mongoose.Schema({
    tallerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        required: true
    },
    tipo: {
        type: String,
        required: true,
        enum: [
            'CITA_CANCELADA',
            'CITA_REPROGRAMADA',
            'NUEVA_CITA',
            'CITA_CONFIRMADA',
            'TRABAJO_INICIADO',
            'TRABAJO_FINALIZADO',
            'VEHICULO_LISTO',
            'VEHICULO_ENTREGADO',
            'PAGO_REALIZADO',
            'PAGO_RECIBIDO',
            'CLIENTE_LLEGO',
            'BAHIA_LIBERADA',
            'ALERTA_STOCK',
            'MANTENIMIENTO',
            'OTRO'
        ]
    },
    titulo: {
        type: String,
        required: true
    },
    mensaje: {
        type: String,
        required: true
    },
    detalle: {
        citaId: mongoose.Schema.Types.ObjectId,
        vehiculo: String,
        fecha: String,
        hora: String,
        servicio: String,
        motivoCancelacion: String,
        cliente: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            email: String,
            telefono: String
        },
        empleado: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        bahia: {
            numero: Number,
            nombre: String
        }
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta', 'urgente'],
        default: 'media'
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    leida: {
        type: Boolean,
        default: false
    },
    leidaPor: [{
        empleadoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Empleado'
        },
        fecha: {
            type: Date,
            default: Date.now
        }
    }],
    acciones: [{
        tipo: {
            type: String,
            enum: ['VER_CITA', 'LLAMAR_CLIENTE', 'REAGENDAR', 'LIBERAR_BAHIA', 'CONTACTAR']
        },
        label: String,
        url: String,
        completada: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

// ✅ Índices para búsquedas rápidas
notificacionTallerSchema.index({ tallerId: 1, fecha: -1 });
notificacionTallerSchema.index({ tallerId: 1, leida: 1 });
notificacionTallerSchema.index({ tipo: 1, fecha: -1 });
notificacionTallerSchema.index({ 'detalle.citaId': 1 });

// ✅ ÍNDICE ÚNICO PARA PREVENIR DUPLICADOS
// Solo se aplica cuando detalle.citaId existe (para no bloquear notificaciones sin cita)
notificacionTallerSchema.index(
    { tallerId: 1, tipo: 1, 'detalle.citaId': 1 },
    {
        unique: true,
        partialFilterExpression: { 'detalle.citaId': { $exists: true } }
    }
);
// Método para marcar como leída
notificacionTallerSchema.methods.marcarLeida = async function (empleadoId) {
    this.leida = true;
    if (empleadoId) {
        this.leidaPor.push({
            empleadoId,
            fecha: new Date()
        });
    }
    return this.save();
};

// Método estático para obtener no leídas
notificacionTallerSchema.statics.obtenerNoLeidas = function (tallerId) {
    return this.find({ tallerId, leida: false })
        .sort({ fecha: -1 })
        .limit(20);
};

// Método estático para crear notificación de cancelación
notificacionTallerSchema.statics.crearCancelacion = async function (data) {
    const notificacion = new this({
        tallerId: data.tallerId,
        tipo: 'CITA_CANCELADA',
        titulo: '❌ Cita Cancelada por Cliente',
        mensaje: `${data.cliente.nombre} ha cancelado su cita del ${data.fecha} a las ${data.hora}`,
        detalle: {
            citaId: data.citaId,
            vehiculo: data.vehiculo,
            fecha: data.fecha,
            hora: data.hora,
            servicio: data.servicio,
            motivoCancelacion: data.motivo,
            cliente: data.cliente
        },
        prioridad: 'alta',
        acciones: [
            {
                tipo: 'VER_CITA',
                label: 'Ver detalles',
                url: `/taller/citas/${data.citaId}`
            },
            {
                tipo: 'LLAMAR_CLIENTE',
                label: `Llamar a ${data.cliente.nombre}`,
                url: `tel:${data.cliente.telefono || ''}`
            },
            {
                tipo: 'REAGENDAR',
                label: 'Reagendar cita',
                url: '/taller/citas/nueva'
            }
        ]
    });

    return notificacion.save();
};

const NotificacionTaller = mongoose.model('NotificacionTaller', notificacionTallerSchema);

export default NotificacionTaller;