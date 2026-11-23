import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * PUT /api/clientes/:clienteId/vincular-taller
 */
router.put('/:clienteId/vincular-taller', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const { tallerId } = req.body;

        if (!tallerId) {
            return res.status(400).json({ exito: false, mensaje: 'tallerId requerido' });
        }

        const Taller = (await import('../models/Taller.js')).default;
        const taller = await Taller.findById(tallerId);
        if (!taller) {
            return res.status(404).json({ exito: false, mensaje: 'Taller no encontrado' });
        }

        const Cliente = (await import('../models/personaModel.js')).default;
        const cliente = await Cliente.findByIdAndUpdate(
            clienteId,
            { tallerVinculado: tallerId },
            { new: true }
        );

        if (!cliente) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }

        console.log(`✅ Taller vinculado: "${taller.nombre}" → cliente ${clienteId}`);

        res.json({
            exito: true,
            mensaje: 'Taller vinculado exitosamente',
            taller: {
                _id: taller._id,
                nombre: taller.nombre,
                logo: taller.logo,
                direccion: taller.direccion,
                telefono: taller.telefono,
                calificacion: taller.calificacion,
            },
        });
    } catch (error) {
        console.error('❌ Error vinculando taller:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * DELETE /api/clientes/:clienteId/desvincular-taller
 */
router.delete('/:clienteId/desvincular-taller', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const Cliente = (await import('../models/personaModel.js')).default;

        const cliente = await Cliente.findByIdAndUpdate(
            clienteId,
            { tallerVinculado: null },
            { new: true }
        );

        if (!cliente) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }

        console.log(`🔓 Taller desvinculado del cliente ${clienteId}`);
        res.json({ exito: true, mensaje: 'Taller desvinculado exitosamente' });
    } catch (error) {
        console.error('❌ Error desvinculando:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

/**
 * GET /api/clientes/:clienteId/taller-vinculado
 */
router.get('/:clienteId/taller-vinculado', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const Cliente = (await import('../models/personaModel.js')).default;

        const cliente = await Cliente.findById(clienteId)
            .populate('tallerVinculado', 'nombre logo direccion telefono calificacion');

        if (!cliente) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }

        if (!cliente.tallerVinculado) {
            return res.status(404).json({ exito: false, mensaje: 'Sin taller vinculado' });
        }

        res.json({ exito: true, taller: cliente.tallerVinculado });
    } catch (error) {
        console.error('❌ Error obteniendo taller:', error);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

export default router;