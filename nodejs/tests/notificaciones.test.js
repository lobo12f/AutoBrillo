// nodejs/tests/notificaciones.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('🔔 Notificaciones - Rutas Protegidas', () => {
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
    // 🔹 GET /api/talleres/:tallerId/notificaciones
    // ================================================================

    describe('GET /api/talleres/:tallerId/notificaciones', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.notificaciones)).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta ver notificaciones', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/:tallerId/notificaciones/resumen
    // ================================================================

    describe('GET /api/talleres/:tallerId/notificaciones/resumen', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones/resumen`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones/resumen`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.totalNoLeidas).toBeDefined();
        });

        test('debe devolver 403 si otro taller intenta ver resumen', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones/resumen`)
                .set('Authorization', `Bearer ${tokenOtro}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 PUT /api/talleres/:tallerId/notificaciones/leer-todas
    // ================================================================

    describe('PUT /api/talleres/:tallerId/notificaciones/leer-todas', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/notificaciones/leer-todas`)
                .send({});

            expect(res.status).toBe(401);
        });

        test('debe marcar todas como leídas con token válido', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/notificaciones/leer-todas`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si otro taller intenta marcar', async () => {
            const datosOtro = await crearTallerDeTest();
            const tokenOtro = await loginYObtenerToken(request, app, 'taller', {
                email: datosOtro.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .put(`/api/talleres/${tallerId}/notificaciones/leer-todas`)
                .set('Authorization', `Bearer ${tokenOtro}`)
                .send({});

            expect(res.status).toBe(403);
        });
    });
});