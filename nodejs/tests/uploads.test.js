// nodejs/tests/uploads.test.js
import request from 'supertest';
import app from '../server.js';
import { crearTallerDeTest, loginYObtenerToken } from './helpers.js';

describe('📷 Uploads - Rutas Protegidas', () => {
    let token;

    beforeEach(async () => {
        const datos = await crearTallerDeTest();
        token = await loginYObtenerToken(request, app, 'taller', {
            email: datos.emailTaller,
            password: 'test1234'
        });
    });

    // ================================================================
    // 🔹 POST /api/upload/imagen
    // ================================================================

    describe('POST /api/upload/imagen', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .post('/api/upload/imagen');

            expect(res.status).toBe(401);
        });

        test('debe devolver 400 si no hay imagen', async () => {
            const res = await request(app)
                .post('/api/upload/imagen')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body.exito).toBe(false);
        });

        test('debe subir una imagen con token válido', async () => {
            // Crear un buffer de imagen simple (PNG de 1x1 píxel)
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );

            const res = await request(app)
                .post('/api/upload/imagen')
                .set('Authorization', `Bearer ${token}`)
                .attach('imagen', pngBuffer, 'test.png');

            expect(res.status).toBe(200);
            expect(res.body.exito).toBe(true);
            expect(res.body.url).toBeDefined();
            expect(res.body.filename).toBeDefined();
        });
    });

    // ================================================================
    // 🔹 DELETE /api/upload/imagen/:filename
    // ================================================================

    describe('DELETE /api/upload/imagen/:filename', () => {

        test('debe devolver 401 sin token', async () => {
            const res = await request(app)
                .delete('/api/upload/imagen/test.png');

            expect(res.status).toBe(401);
        });

        test('debe devolver 404 si el archivo no existe', async () => {
            const res = await request(app)
                .delete('/api/upload/imagen/no-existe.png')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});