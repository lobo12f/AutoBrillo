// nodejs/backend/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'autobrillo-secret-dev-2026';
const JWT_EXPIRES = '7d';   // 7 días

/**
 * Genera un token JWT.
 * @param {Object} payload - { id, tipo, rol, tallerId, ... }
 */
export function generarToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Middleware que verifica el JWT del header Authorization.
 * Si es válido, adjunta el payload a req.usuario.
 */
export function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            exito: false,
            mensaje: 'Acceso denegado. Token no proporcionado.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                exito: false,
                mensaje: 'Token expirado. Vuelve a iniciar sesión.'
            });
        }
        return res.status(403).json({
            exito: false,
            mensaje: 'Token inválido.'
        });
    }
}

/**
 * Middleware opcional: verifica token pero NO bloquea si no viene.
 * Útil para rutas públicas que se benefician de saber quién es el usuario.
 */
export function verificarTokenOpcional(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
    } catch (e) {
        // ignorar token inválido en rutas opcionales
    }
    next();
}

export { JWT_SECRET };