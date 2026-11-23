// nodejs/tests/auth.test.js
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// ✅ Importar las funciones del middleware
const authModule = await import('../backend/middleware/auth.js');
const { generarToken, verificarToken, JWT_SECRET } = authModule;

describe('🔐 JWT - Generación y Verificación', () => {

    describe('generarToken()', () => {
        test('debe generar un token válido', () => {
            const payload = {
                id: '507f1f77bcf86cd799439011',
                tipo: 'TALLER',
                rol: 'PROPIETARIO',
                tallerId: '507f1f77bcf86cd799439011'
            };

            const token = generarToken(payload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3);   // Header.Payload.Signature
        });

        test('el token debe contener el payload correcto', () => {
            const payload = {
                id: '507f1f77bcf86cd799439011',
                tipo: 'EMPLEADO',
                rol: 'LAVADOR',
                tallerId: '507f1f77bcf86cd799439012'
            };

            const token = generarToken(payload);
            const decoded = jwt.verify(token, JWT_SECRET);

            expect(decoded.id).toBe(payload.id);
            expect(decoded.tipo).toBe('EMPLEADO');
            expect(decoded.rol).toBe('LAVADOR');
            expect(decoded.tallerId).toBe(payload.tallerId);
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
        });

        test('el token debe expirar', () => {
            const payload = { id: 'test', tipo: 'TEST' };
            const token = generarToken(payload);
            const decoded = jwt.verify(token, JWT_SECRET);

            // Debe expirar en el futuro (7 días)
            expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });

    describe('verificarToken() middleware', () => {
        test('debe llamar a next() con token válido', () => {
            const token = generarToken({ id: 'test', tipo: 'TALLER' });
            const req = { headers: { authorization: `Bearer ${token}` } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificarToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.usuario).toBeDefined();
            expect(req.usuario.tipo).toBe('TALLER');
            expect(res.status).not.toHaveBeenCalled();
        });

        test('debe responder 401 si no hay token', () => {
            const req = { headers: {} };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificarToken(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ exito: false })
            );
        });

        test('debe responder 401 si el header no empieza con Bearer', () => {
            const req = { headers: { authorization: 'token-sin-bearer' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificarToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('debe responder 403 si el token es inválido', () => {
            const req = { headers: { authorization: 'Bearer token-invalido' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificarToken(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('debe responder 401 si el token expiró', () => {
            // Crear token expirado
            const tokenExpirado = jwt.sign(
                { id: 'test' },
                JWT_SECRET,
                { expiresIn: '-1s' }
            );
            const req = { headers: { authorization: `Bearer ${tokenExpirado}` } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificarToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ mensaje: expect.stringContaining('expirado') })
            );
        });
    });
});