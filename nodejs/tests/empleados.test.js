// nodejs/tests/empleados.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, crearEmpleadoDeTest, loginYObtenerToken } from './helpers.js';

describe('👥 Empleados - CRUD Protegido', () => {
    let token;
    let tallerId;
    let emailTaller;

    beforeEach(async () => {
        const datos = await crearTallerDeTest();
        tallerId = datos.taller._id.toString();
        emailTaller = datos.emailTaller;

        // ✅ Login con el email único del taller
        token = await loginYObtenerToken(request, app, 'taller', {
            email: emailTaller,
            password: 'test1234'
        });
    });

    describe('GET /api/talleres/:tallerId/empleados', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/empleados`);

            expect(res.status).toBe(401);
            expect(res.body.exito).toBe(false);
        });

        test('debe devolver 403 con token inválido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/empleados`)
                .set('Authorization', 'Bearer token-invalido');

            expect(res.status).toBe(403);
        });

        test('debe devolver 200 con token válido', async () => {
            const res = await request(app)
                .get(`/api/talleres/${tallerId}/empleados`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.empleados)).toBe(true);
        });
    });

    describe('POST /api/talleres/:tallerId/empleados', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post(`/api/talleres/${tallerId}/empleados`)
                .send({ nombre: 'Test', email: 'test@test.com', password: 'test1234' });

            expect(res.status).toBe(401);
        });

        test('debe crear un empleado con token válido', async () => {
            const emailUnico = `nuevo-${Date.now()}@test.com`;

            const res = await request(app)
                .post(`/api/talleres/${tallerId}/empleados`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nombre: 'Nuevo Empleado',
                    email: emailUnico,
                    password: 'test1234',
                    rol: 'LAVADOR'
                });

            expect(res.status).toBe(201);
            expect(res.body.exito).toBe(true);
            expect(res.body.empleado.nombre).toBe('Nuevo Empleado');
            expect(res.body.empleado.password).toBeUndefined();
        });
    });

    describe('DELETE /api/talleres/:tallerId/empleados/:empleadoId', () => {

        test('debe devolver 401 sin token', async () => {
            const { empleado } = await crearEmpleadoDeTest(tallerId);

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/empleados/${empleado._id}`);

            expect(res.status).toBe(401);
        });

        test('debe eliminar un empleado con token válido', async () => {
            const { empleado } = await crearEmpleadoDeTest(tallerId);

            const res = await request(app)
                .delete(`/api/talleres/${tallerId}/empleados/${empleado._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });

    describe('Rutas públicas NO requieren token', () => {

        test('GET /api/talleres/activos debe funcionar sin token', async () => {
            const res = await request(app)
                .get('/api/talleres/activos');

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('POST /api/talleres/login debe funcionar sin token', async () => {
            const res = await request(app)
                .post('/api/talleres/login')
                .send({ email: 'noexiste@test.com', password: 'test1234' });

            // El login sí devuelve 401 si las credenciales son incorrectas,
            // pero eso es un 401 semántico, no de token
            expect(res.status).toBe(401);
        });
    });
});