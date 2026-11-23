// nodejs/tests/cliente.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, crearClienteDeTest, loginYObtenerToken } from './helpers.js';

describe('👤 Cliente - Rutas Protegidas', () => {

    let clienteA, clienteB;
    let tokenA, tokenB;
    let emailA, emailB;

    beforeEach(async () => {
        // Crear 2 clientes para verificar aislamiento
        const datosA = await crearClienteDeTest();
        const datosB = await crearClienteDeTest();

        clienteA = datosA.cliente;
        clienteB = datosB.cliente;
        emailA = datosA.emailCliente;
        emailB = datosB.emailCliente;

        // Login de ambos
        tokenA = await loginYObtenerToken(request, app, 'cliente', {
            email: emailA,
            password: 'cliente123'
        });

        tokenB = await loginYObtenerToken(request, app, 'cliente', {
            email: emailB,
            password: 'cliente123'
        });
    });

    // ================================================================
    // 🔹 GET /api/mis-citas/:usuarioId
    // ================================================================

    describe('GET /api/mis-citas/:usuarioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/mis-citas/${clienteA._id}`);

            expect(res.status).toBe(401);
            expect(res.body.exito).toBe(false);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .get(`/api/mis-citas/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(Array.isArray(res.body.citas)).toBe(true);
        });

        test('debe devolver 403 si intenta ver citas de OTRO cliente', async () => {
            const res = await request(app)
                .get(`/api/mis-citas/${clienteB._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(403);
            expect(res.body.exito).toBe(false);
            expect(res.body.mensaje).toContain('permiso');
        });
    });

    // ================================================================
    // 🔹 GET /api/citas/usuario/:usuarioId
    // ================================================================

    describe('GET /api/citas/usuario/:usuarioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/citas/usuario/${clienteA._id}`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .get(`/api/citas/usuario/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta ver citas de OTRO cliente', async () => {
            const res = await request(app)
                .get(`/api/citas/usuario/${clienteB._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/citas/cliente/:usuarioId
    // ================================================================

    describe('GET /api/talleres/citas/cliente/:usuarioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/citas/cliente/${clienteA._id}`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .get(`/api/talleres/citas/cliente/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta ver citas de OTRO cliente', async () => {
            const res = await request(app)
                .get(`/api/talleres/citas/cliente/${clienteB._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 GET /api/talleres/estados-cliente/:usuarioId
    // ================================================================

    describe('GET /api/talleres/estados-cliente/:usuarioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/talleres/estados-cliente/${clienteA._id}`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .get(`/api/talleres/estados-cliente/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta ver estados de OTRO cliente', async () => {
            const res = await request(app)
                .get(`/api/talleres/estados-cliente/${clienteB._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 GET /api/limpiar-canceladas/:usuarioId
    // ================================================================

    describe('GET /api/limpiar-canceladas/:usuarioId', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/limpiar-canceladas/${clienteA._id}`);

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .get(`/api/limpiar-canceladas/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta limpiar de OTRO cliente', async () => {
            const res = await request(app)
                .get(`/api/limpiar-canceladas/${clienteB._id}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 PUT /api/usuarios/sincronizar/:email
    // ================================================================

    describe('PUT /api/usuarios/sincronizar/:email', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailA}`)
                .send({ nombre: 'Test' });

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailA}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ nombre: 'Cliente Actualizado' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta modificar a OTRO cliente', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailB}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ nombre: 'Hackeado' });

            expect(res.status).toBe(403);
            expect(res.body.exito).toBe(false);
        });
    });

    // ================================================================
    // 🔹 POST /api/usuarios/update-password
    // ================================================================

    describe('POST /api/usuarios/update-password', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post('/api/usuarios/update-password')
                .send({
                    email: emailA,
                    passwordActual: 'cliente123',
                    passwordNueva: 'nueva123'
                });

            expect(res.status).toBe(401);
        });

        test('debe devolver 200 con su propio token', async () => {
            const res = await request(app)
                .post('/api/usuarios/update-password')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    email: emailA,
                    passwordActual: 'cliente123',
                    passwordNueva: 'nueva123'
                });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 403 si intenta cambiar contraseña de OTRO cliente', async () => {
            const res = await request(app)
                .post('/api/usuarios/update-password')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    email: emailB,
                    passwordActual: 'cliente123',
                    passwordNueva: 'hackeado'
                });

            expect(res.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 VERIFICAR QUE TALLER PUEDE VER DATOS DE CLIENTES
    // ================================================================

    describe('Taller puede ver citas de sus clientes', () => {

        test('taller puede acceder a /api/mis-citas/:usuarioId', async () => {
            const { emailTaller } = await crearTallerDeTest();
            const tokenTaller = await loginYObtenerToken(request, app, 'taller', {
                email: emailTaller,
                password: 'test1234'
            });

            const res = await request(app)
                .get(`/api/mis-citas/${clienteA._id}`)
                .set('Authorization', `Bearer ${tokenTaller}`);

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });
    });
});