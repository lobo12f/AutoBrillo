// nodejs/tests/resenas.test.js
import request from 'supertest';
import app from '../server.js';
import {
    crearTallerDeTest,
    crearClienteDeTest,
    crearCitaDeTest,
    loginYObtenerToken
} from './helpers.js';

describe('⭐ Reseñas - Rutas Protegidas', () => {
    let tokenTaller;
    let tallerId;
    let cliente;
    let citaId;

    beforeEach(async () => {
        const datosTaller = await crearTallerDeTest();
        tallerId = datosTaller.taller._id.toString();

        const datosCliente = await crearClienteDeTest();
        cliente = datosCliente.cliente;

        tokenTaller = await loginYObtenerToken(request, app, 'taller', {
            email: datosTaller.emailTaller,
            password: 'test1234'
        });

        // Crear una cita ENTREGADA con calificación
        const cita = await crearCitaDeTest(tallerId, cliente._id, 'ENTREGADO');
        cita.calificacion = {
            puntuacion: 5,
            comentario: 'Excelente servicio',
            fecha: new Date()
        };
        await cita.save();
        citaId = cita._id.toString();
    });

    // ================================================================
    // 🔹 GET /api/talleres/:tallerId/resenas-admin
    // ================================================================

    describe('GET /api/talleres/:tallerId/resenas-admin', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/resenas-admin`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/resenas-admin`)
                .set('Authorization', `Bearer ${tokenTaller}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver reseñas', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/resenas-admin`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 POST /api/talleres/:tallerId/resenas/:resenaId/reaccionar
    // ================================================================

    describe('POST /api/talleres/:tallerId/resenas/:resenaId/reaccionar', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/resenas/${citaId}/reaccionar`)
                .send({ tipo: 'likes' });

            expect(res.status).toBe(401);
        });

        test('debe reaccionar con token válido', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/resenas/${citaId}/reaccionar`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({ tipo: 'likes' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/:tallerId/resenas-social (pública)
    // ================================================================

    describe('GET /api/talleres/:tallerId/resenas-social', () => {

        test('debe devolver 200 sin token (ruta pública)', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/resenas-social`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });
});