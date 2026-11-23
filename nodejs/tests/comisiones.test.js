// nodejs/tests/comisiones.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('💬 Comisiones - Rutas Protegidas', () => {
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
    // 🔹 GET /api/talleres/:tallerId/comisiones
    // ================================================================

    describe('GET /api/talleres/:tallerId/comisiones', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/comisiones`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/comisiones`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.comisiones)).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver comisiones', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/comisiones`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 POST /api/talleres/:tallerId/comisiones
    // ================================================================

    describe('POST /api/talleres/:tallerId/comisiones', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/comisiones`)
                .send({ porcentaje: 30 });

            expect(res.status).toBe(401);
        });

        test('debe devolver 403 si otro taller intenta crear comisión', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .post(`/api/talleres/${tallerId}/comisiones`)
                .set('Authorization', `Bearer ${tokenOtro}`)
                .send({ porcentaje: 30 });

            expect(res.status).toBe(403);
        });
    });
});