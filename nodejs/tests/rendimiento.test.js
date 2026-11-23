// nodejs/tests/rendimiento.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('📊 Rendimiento - Rutas Protegidas', () => {
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
    // 🔹 GET /api/talleres/:tallerId/rendimiento
    // ================================================================

    describe('GET /api/talleres/:tallerId/rendimiento', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.rendimientoMensual)).toBe(true);
            expect(res.body.rendimientoMensual.length).toBe(12);
        });

        test('debe devolver 403 si otro taller intenta ver', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/:tallerId/rendimiento-empleados
    // ================================================================

    describe('GET /api/talleres/:tallerId/rendimiento-empleados', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento-empleados`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento-empleados`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.empleados)).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento-empleados`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });
});