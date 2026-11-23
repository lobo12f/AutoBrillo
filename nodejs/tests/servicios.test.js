// nodejs/tests/servicios.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('🔧 Servicios - CRUD Protegido', () => {
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

    describe('GET /api/talleres/:tallerId/servicios', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/servicios`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.servicios)).toBe(true);
        });
    });

    describe('POST /api/talleres/:tallerId/servicios', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .send({ nombre: 'Lavado', precio: 500 });

            expect(res.status).toBe(401);
        });

        test('debe crear un servicio con token válido', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Lavado Básico',
                    descripcion: 'Lavado exterior',
                    precio: 500,
                    duracionEstimada: 45,
                    tipo: 'LAVADO'
                });

            expect(res.status).toBe(201);
            expect(res.body.exito).toBe(true);
            expect(res.body.servicios.length).toBe(1);
        });

        test('debe devolver 400 si faltan campos', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${token}`)
                .send({ nombre: 'Servicio Incompleto' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/talleres/:tallerId/servicios/:servicioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/talleres/${tallerId}/servicios/123`)
                .send({ precio: 600 });

            expect(res.status).toBe(401);
        });

        test('debe actualizar un servicio con token válido', async () => {
            const crear = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Lavado Test',
                    precio: 500
                });

            const servicioId = crear.body.servicios[0]._id;

            const res = await request(app)
                .put(`/api/talleres/${tallerId}/servicios/${servicioId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ precio: 600 });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });

    describe('DELETE /api/talleres/:tallerId/servicios/:servicioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/servicios/123`);

            expect(res.status).toBe(401);
        });

        test('debe eliminar un servicio con token válido', async () => {
            const crear = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Servicio Test',
                    precio: 500
                });

            const servicioId = crear.body.servicios[0]._id;

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/servicios/${servicioId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.servicios.length).toBe(0);
        });
    });

    describe('Verificación de propiedad', () => {

        test('no debe permitir a un taller ver servicios de OTRO taller', async () => {
            const datosB = await crearTallerDeTest();
            const tokenB = await loginYObtenerToken(request, app, 'taller', {
                email: datosB.emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${tokenB}`);

            expect(res.status).toBe(403);
        });
    });
});