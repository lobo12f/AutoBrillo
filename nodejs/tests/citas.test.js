// nodejs/tests/citas.test.js
import request from 'supertest';
import app from '../server.js';
import {
    crearTallerDeTest,
    crearClienteDeTest,
    crearCitaDeTest,
    loginYObtenerToken
} from './helpers.js';

describe('📅 Citas - Acciones Protegidas', () => {
    let tokenTaller;
    let tallerId;
    let cliente;
    let citaId;

    beforeEach(async () => {
        // Crear taller + cliente
        const datosTaller = await crearTallerDeTest();
        tallerId = datosTaller.taller._id.toString();

        const datosCliente = await crearClienteDeTest();
        cliente = datosCliente.cliente;

        // Login del taller
        tokenTaller = await loginYObtenerToken(request, app, 'taller', {
            email: datosTaller.emailTaller,
            password: 'test1234'
        });

        // Crear una cita PENDIENTE
        const cita = await crearCitaDeTest(tallerId, cliente._id, 'PENDIENTE');
        citaId = cita._id.toString();
    });

    // ================================================================
    // 🔹 PUT /api/talleres/citas/:citaId/confirmar
    // ================================================================

    describe('PUT /api/talleres/citas/:citaId/confirmar', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .send({ notas: 'Confirmada' });

            expect(res.status).toBe(401);
        });

        test('debe confirmar la cita con token válido', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ notas: 'Confirmada' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.cita.estado).toBe('CONFIRMADA');
        });

        test('debe devolver 403 si otro taller intenta confirmar', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .set('Authorization', `Bearer ${tokenOtro}`)
                .send({ notas: 'Intento ajeno' });

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 PUT /api/talleres/citas/:citaId/recepcion
    // ================================================================

    describe('PUT /api/talleres/citas/:citaId/recepcion', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/recepcion`)
                .send({ bahiaNumero: 1 });

            expect(res.status).toBe(401);
        });

        test('debe recibir el vehículo con token válido', async () => {
            // Primero confirmar
            await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/recepcion`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ bahiaNumero: 1, notas: 'Recibido' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.cita.estado).toBe('EN_RECEPCION');
        });
    });

    // ================================================================
    // 🔹 PUT /api/talleres/citas/:citaId/iniciar
    // ================================================================

    describe('PUT /api/talleres/citas/:citaId/iniciar', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/iniciar`)
                .send({});

            expect(res.status).toBe(401);
        });

        test('debe iniciar el trabajo con token válido', async () => {
            await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            await request(app)
                .put(`/api/talleres/citas/${citaId}/recepcion`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/iniciar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ notas: 'Iniciado' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.cita.estado).toBe('EN_PROCESO');
        });
    });

    // ================================================================
    // 🔹 PUT /api/talleres/citas/:citaId/finalizar
    // ================================================================

    describe('PUT /api/talleres/citas/:citaId/finalizar', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/finalizar`)
                .send({});

            expect(res.status).toBe(401);
        });

        test('debe finalizar el trabajo con token válido', async () => {
            await request(app)
                .put(`/api/talleres/citas/${citaId}/confirmar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            await request(app)
                .put(`/api/talleres/citas/${citaId}/recepcion`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            await request(app)
                .put(`/api/talleres/citas/${citaId}/iniciar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({});

            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/finalizar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ notas: 'Finalizado' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.cita.estado).toBe('LISTO');
        });
    });

    // ================================================================
    // 🔹 PUT /api/talleres/citas/:citaId/cancelar
    // ================================================================

    describe('PUT /api/talleres/citas/:citaId/cancelar', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/cancelar`)
                .send({ motivo: 'Test' });

            expect(res.status).toBe(401);
        });

        test('debe cancelar la cita con token válido', async () => {
            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/cancelar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ motivo: 'Cliente no vino', canceladoPor: 'TALLER' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.cita.estado).toBe('CANCELADA');
        });

        test('debe devolver 403 si otro taller intenta cancelar', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .put(`/api/talleres/citas/${citaId}/cancelar`)
                .set('Authorization', `Bearer ${tokenOtro}`)
                .send({ motivo: 'Intento ajeno' });

            expect(res.status).toBe(403);
        });
    });
});