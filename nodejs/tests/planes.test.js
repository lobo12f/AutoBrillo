// nodejs/tests/planes.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('📦 Planes - CRUD Protegido', () => {
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

    describe('GET /api/talleres/:tallerId/planes', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/planes`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.planes)).toBe(true);
        });
    });

    describe('POST /api/talleres/:tallerId/planes', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .send({
                    nombre: 'Plan Bronce',
                    precio: 500,
                    serviciosIncluidos: 3
                });

            expect(res.status).toBe(401);
        });

        test('debe crear un plan con token válido', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Plan Bronce',
                    descripcion: 'Plan básico',
                    precio: 500,
                    serviciosIncluidos: 3,
                    duracionDias: 30,
                    nivel: 'BASICO'
                });

            expect(res.status).toBe(201);
            expect(res.body.exito).toBe(true);
            expect(res.body.planes.length).toBe(1);
            expect(res.body.planes[0].nombre).toBe('Plan Bronce');
        });

        test('debe devolver 400 si faltan campos', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${token}`)
                .send({ nombre: 'Plan Incompleto' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/talleres/:tallerId/planes/:planId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/planes/123`)
                .send({ precio: 600 });

            expect(res.status).toBe(401);
        });

        test('debe actualizar un plan con token válido', async () => {
            // Crear plan primero
            const crear = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Plan Test',
                    precio: 500,
                    serviciosIncluidos: 3
                });

            const planId = crear.body.planes[0]._id;

            const res = await request(app)
                .put(`/api/talleres/${tallerId}/planes/${planId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ precio: 600 });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });

    describe('DELETE /api/talleres/:tallerId/planes/:planId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/planes/123`);

            expect(res.status).toBe(401);
        });

        test('debe eliminar un plan con token válido', async () => {
            const crear = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Plan Test',
                    precio: 500,
                    serviciosIncluidos: 3
                });

            const planId = crear.body.planes[0]._id;

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/planes/${planId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.planes.length).toBe(0);
        });
    });

    describe('Verificación de propiedad', () => {

        test('no debe permitir a un taller ver planes de OTRO taller', async () => {
            const datosB = await crearTallerDeTest();
            const tokenB = await loginYObtenerToken(request, app, 'taller', {
                email: datosB.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${tokenB}`);

            expect(res.status).toBe(403);
        });
    });
});