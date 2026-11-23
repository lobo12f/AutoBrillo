// nodejs/tests/perfil-cliente.test.js
import request from 'supertest';
import app from '../server.js';
import { crearClienteDeTest, loginYObtenerToken } from './helpers.js';

describe('👤 Perfil del Cliente - Actualización', () => {
    let cliente;
    let token;
    let emailCliente;

    beforeEach(async () => {
        const datos = await crearClienteDeTest();
        cliente = datos.cliente;
        emailCliente = datos.emailCliente;

        token = await loginYObtenerToken(request, app, 'cliente', {
            email: emailCliente,
            password: 'cliente123'
        });
    });

    // ================================================================
    // 🔹 PUT /api/usuarios/sincronizar/:email
    // ================================================================

    describe('PUT /api/usuarios/sincronizar/:email', () => {

        test('debe actualizar el nombre del cliente', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ nombre: 'Nuevo Nombre' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.usuario.nombre).toBe('Nuevo Nombre');
        });

        test('debe actualizar el teléfono del cliente', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ telefono: '8091234567' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe actualizar la foto de perfil del cliente', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ fotoPerfil: 'https://example.com/foto.jpg' });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.usuario.fotoPerfil).toBe('https://example.com/foto.jpg');
        });

        test('debe actualizar el garaje del cliente', async () => {
            const garaje = [
                {
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    placa: 'TEST123',
                    color: '#ff0000'
                }
            ];

            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ garaje });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.usuario.garaje.length).toBe(1);
            expect(res.body.usuario.garaje[0].marca).toBe('Toyota');
        });

        test('NO debe actualizar el email (protegido)', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'nuevo@test.com' });

            expect(res.status).toBe(200);
            expect(res.body.usuario.email).toBe(emailCliente);
        });

        test('NO debe actualizar el password (protegido)', async () => {
            const res = await request(app)
                .put(`/api/usuarios/sincronizar/${emailCliente}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ password: 'nuevo123' });

            expect(res.status).toBe(200);
            expect(res.body.usuario.password).toBeUndefined();
        });
    });

    // ================================================================
    // 🔹 POST /api/usuarios/update-password
    // ================================================================

    describe('POST /api/usuarios/update-password', () => {

        test('debe cambiar la contraseña con datos válidos', async () => {
            const res = await request(app)
                .post('/api/usuarios/update-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: emailCliente,
                    passwordActual: 'cliente123',
                    passwordNueva: 'nueva12345'
                });

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
        });

        test('debe devolver 401 con contraseña actual incorrecta', async () => {
            const res = await request(app)
                .post('/api/usuarios/update-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: emailCliente,
                    passwordActual: 'incorrecta',
                    passwordNueva: 'nueva12345'
                });

            expect(res.status).toBe(401);
        });

        test('debe devolver 403 si intenta cambiar contraseña de OTRO cliente', async () => {
            const datosOtro = await crearClienteDeTest();

            const res = await request(app)
                .post('/api/usuarios/update-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: datosOtro.emailCliente,
                    passwordActual: 'cliente123',
                    passwordNueva: 'hackeado'
                });

            expect(res.status).toBe(403);
        });
    });
});