// nodejs/tests/pagos.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('💰 Pagos - Rutas Protegidas', () => {
    let token;
    let tallerId;

    beforeEach(async () => {
        const datos = await crearTallerDeTest();
        tallerId = datos.taller._id.toString();

        token = await loginYObtenerToken(request, app, 'taller', {
            email: datos.emailTaller,
            password: 'test1234'
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/:tallerId/pagos
    // ================================================================

    describe('GET /api/talleres/:tallerId/pagos', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/pagos`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/pagos`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.pagos)).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver pagos', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/pagos`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 POST /api/talleres/:tallerId/pagos
    // ================================================================

    describe('POST /api/talleres/:tallerId/pagos', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/pagos`)
                .send({});

            expect(res.status).toBe(401);
        });

        test('debe devolver 400 si faltan campos', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/pagos`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
        });

        test('debe devolver 403 si otro taller intenta crear pago', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .post(`/api/talleres/${tallerId}/pagos`)
                .set('Authorization', `Bearer ${tokenOtro}`)
                .send({});

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 DELETE /api/talleres/:tallerId/pagos/:pagoId
    // ================================================================

    describe('DELETE /api/talleres/:tallerId/pagos/:pagoId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/pagos/123`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 403 si otro taller intenta eliminar', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/pagos/123`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });
});