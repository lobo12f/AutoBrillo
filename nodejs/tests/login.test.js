// nodejs/tests/login.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, crearEmpleadoDeTest, crearClienteDeTest } from './helpers.js';

describe('🔐 Login - Taller, Empleado y Cliente', () => {

    describe('POST /api/talleres/login', () => {
        test('debe devolver 200 y token con credenciales válidas', async () => {
            const { taller, password, emailTaller } = await crearTallerDeTest();

            const res = await request(app)
                .post('/api/talleres/login')
                .send({ email: emailTaller, password });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.rol).toBe('PROPIETARIO');
            expect(res.body._id).toBe(taller._id.toString());
        });

        test('debe devolver 401 con contraseña incorrecta', async () => {
            const { emailTaller } = await crearTallerDeTest();

            const res = await request(app)
                .post('/api/talleres/login')
                .send({ email: emailTaller, password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.exito).toBe(false);
            expect(res.body.token).toBeUndefined();
        });

        test('debe devolver 401 con email inexistente', async () => {
            const res = await request(app)
                .post('/api/talleres/login')
                .send({ email: 'noexiste@test.com', password: 'test1234' });

            expect(res.status).toBe(401);
        });

        test('debe devolver 400 si faltan campos', async () => {
            const res = await request(app)
                .post('/api/talleres/login')
                .send({ email: 'taller@test.com' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/talleres/empleados/login', () => {
        test('debe devolver 200 y token con credenciales válidas', async () => {
            const { taller } = await crearTallerDeTest();
            const { password, emailEmpleado } = await crearEmpleadoDeTest(taller._id);

            const res = await request(app)
                .post('/api/talleres/empleados/login')
                .send({
                    email: emailEmpleado,
                    password,
                    tallerId: taller._id.toString()
                });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.empleado).toBeDefined();
            expect(res.body.permisos).toBeDefined();
        });

        test('debe devolver 401 con tallerId incorrecto', async () => {
            const { taller } = await crearTallerDeTest();
            const { emailEmpleado } = await crearEmpleadoDeTest(taller._id);

            const res = await request(app)
                .post('/api/talleres/empleados/login')
                .send({
                    email: emailEmpleado,
                    password: 'empleado123',
                    tallerId: '507f1f77bcf86cd799439011'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/login (cliente)', () => {
        test('debe devolver 200 y token con credenciales válidas', async () => {
            const { password, emailCliente } = await crearClienteDeTest();

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: emailCliente, password });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.usuario).toBeDefined();
            expect(res.body.usuario.token).toBeDefined();
        });

        test('debe devolver 401 con contraseña incorrecta', async () => {
            const { emailCliente } = await crearClienteDeTest();

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: emailCliente, password: 'wrong' });

            expect(res.status).toBe(401);
        });
    });
});