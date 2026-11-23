// nodejs/tests/bahias.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('🏗️ Bahías - CRUD Protegido', () => {
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

    describe('GET /api/talleres/:tallerId/bahias', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/bahias`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.bahias)).toBe(true);
            expect(res.body.bahias.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/talleres/:tallerId/bahias', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/bahias`)
                .send({ numero: 2, nombre: 'Bahía 2', tipo: 'GENERAL' });

            expect(res.status).toBe(401);
        });

        test('debe crear una bahía con token válido', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    numero: 2,
                    nombre: 'Bahía 2',
                    tipo: 'LAVADO_RAPIDO',
                    estado: 'DISPONIBLE'
                });

            expect(res.status).toBe(201);
            expect(res.body.exito).toBe(true);
            expect(res.body.bahias.length).toBe(2);
        });

        test('no debe permitir número de bahía duplicado', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${token}`)
                .send({ numero: 1, nombre: 'Bahía Duplicada', tipo: 'GENERAL' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/talleres/:tallerId/bahias/:bahiaId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/bahias/1`)
                .send({ estado: 'OCUPADA' });

            expect(res.status).toBe(401);
        });

        test('debe actualizar una bahía con token válido', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/bahias/1`)
                .set('Authorization', `Bearer ${token}`)
                .send({ estado: 'OCUPADA' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });

    describe('DELETE /api/talleres/:tallerId/bahias/:bahiaId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/bahias/1`);

            expect(res.status).toBe(401);
        });

        test('no debe eliminar una bahía ocupada', async () => {
            // Primero marcar como ocupada
            await request(app)
                .put(`/api/talleres/${tallerId}/bahias/1`)
                .set('Authorization', `Bearer ${token}`)
                .send({ estado: 'OCUPADA' });

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/bahias/1`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });
    });

    describe('Verificación de propiedad', () => {

        test('no debe permitir a un taller modificar bahías de OTRO taller', async () => {
            const datosB = await crearTallerDeTest();
            const tokenB = await loginYObtenerToken(request, app, 'taller', {
                email: datosB.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${tokenB}`);

            expect(res.status).toBe(403);
        });
    });
});