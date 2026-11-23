// nodejs/tests/dashboard.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('📊 Dashboard del Taller - Rutas Protegidas', () => {
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
    // 🔹 GET /api/talleres/:tallerId/dashboard
    // ================================================================

    describe('GET /api/talleres/:tallerId/dashboard', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/dashboard`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/dashboard`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.citasHoy).toBeDefined();
            expect(res.body.enProceso).toBeDefined();
            expect(res.body.ingresosDia).toBeDefined();
            expect(Array.isArray(res.body.bahias)).toBe(true);
            expect(Array.isArray(res.body.proximasCitas)).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/dashboard`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });
});