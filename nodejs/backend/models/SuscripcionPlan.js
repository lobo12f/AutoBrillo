/**
 * ============================================================================
 * MODELO: Suscripción de Plan de Cliente
 * ============================================================================
 * Representa un plan contratado por un cliente en un taller específico.
 * 
 * Guarda un snapshot del plan al momento de la compra (para que si el taller
 * modifica el plan después, la suscripción del cliente no cambie).
 * ============================================================================ */

import mongoose from 'mongoose';

const HistorialUsoSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    citaId: { type: mongoose.Schema.Types.ObjectId, ref: 'CitaTaller' },
    servicio: String,
    monto: { type: Number, default: 0 },
    empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' },
    notas: String,
}, { _id: false });

const SuscripcionPlanSchema = new mongoose.Schema({
    // ==================== REFERENCIAS ====================
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true,
        index: true,
    },
    tallerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taller',
        required: true,
        index: true,
    },
    planId: {
        type: String,
        required: true,
    },

    // ==================== SNAPSHOT DEL PLAN ====================
    planData: {
        nombre: { type: String, required: true },
        precio: { type: Number, required: true },
        duracionDias: { type: Number, default: 30 },
        serviciosIncluidos: { type: Number, default: 0 },
        servicios: [{
            nombre: String,
            precio: Number,
        }],
        nivel: { type: String, default: 'NORMAL' },
        numeroLavados: { type: Number, default: 0 },
    },

    // ==================== FECHAS ====================
    fechaInicio: {
        type: Date,
        default: Date.now,
        required: true,
    },
    fechaVencimiento: {
        type: Date,
        required: true,
    },

    // ==================== ESTADO ====================
    estado: {
        type: String,
        enum: ['ACTIVA', 'VENCIDA', 'CANCELADA', 'SUSPENDIDA'],
        default: 'ACTIVA',
        index: true,
    },

    // ==================== USO DEL PLAN ====================
    serviciosUsados: {
        type: Number,
        default: 0,
    },
    serviciosRestantes: {
        type: Number,
        default: 0,
    },
    lavadosUsados: {
        type: Number,
        default: 0,
    },
    historialUso: [HistorialUsoSchema],

    // ==================== PAGO ====================
    montoPagado: {
        type: Number,
        default: 0,
    },
    metodoPago: {
        type: String,
        enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'],
        default: 'EFECTIVO',
    },
    estadoPago: {
        type: String,
        enum: ['PAGADO', 'PENDIENTE', 'REEMBOLSADO'],
        default: 'PAGADO',
    },
    referenciaPago: String,

    // ==================== METADATA ====================
    notas: String,
    canceladaPor: {
        type: String,
        enum: ['CLIENTE', 'TALLER', null],
        default: null,
    },
    motivoCancelacion: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// ==================== ÍNDICES ====================
SuscripcionPlanSchema.index({ clienteId: 1, tallerId: 1, estado: 1 });
SuscripcionPlanSchema.index({ fechaVencimiento: 1, estado: 1 });

// ==================== MÉTODOS ====================
SuscripcionPlanSchema.methods.estaActiva = function () {
    return this.estado === 'ACTIVA' && new Date() < this.fechaVencimiento;
};

SuscripcionPlanSchema.methods.puedeUsarServicio = function () {
    return this.estaActiva() && this.serviciosRestantes > 0;
};

SuscripcionPlanSchema.methods.calcularDiasRestantes = function () {
    const ahora = new Date();
    const diff = this.fechaVencimiento - ahora;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

SuscripcionPlanSchema.methods.calcularProgreso = function () {
    const total = this.planData.serviciosIncluidos;
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.serviciosUsados / total) * 100));
};

// ==================== MIDDLEWARE ====================
// Antes de guardar: recalcular serviciosRestantes
SuscripcionPlanSchema.pre('save', function () {
    // Sin next() - Mongoose 7+ lo maneja automáticamente
    if (this.planData && this.planData.serviciosIncluidos) {
        this.serviciosRestantes = Math.max(
            0,
            this.planData.serviciosIncluidos - this.serviciosUsados
        );
    }
});



// ==================== MÉTODO ESTÁTICO ====================
// Marcar vencidas automáticamente
SuscripcionPlanSchema.statics.marcarVencidas = async function () {
    const ahora = new Date();
    const result = await this.updateMany(
        {
            estado: 'ACTIVA',
            fechaVencimiento: { $lt: ahora },
        },
        {
            $set: { estado: 'VENCIDA' },
        }
    );
    return result.modifiedCount;
};

const SuscripcionPlan = mongoose.model('SuscripcionPlan', SuscripcionPlanSchema);

export default SuscripcionPlan;