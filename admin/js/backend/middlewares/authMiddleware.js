const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Obtener el token del header de la petición
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            msg: "Acceso denegado: No se proporcionó un token de seguridad." 
        });
    }

    try {
        // 2. Verificar el token con la clave secreta del .env
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Inyectar los datos del usuario en la petición para que las rutas los usen
        req.usuario = verificado; 
        
        // 4. Continuar al siguiente paso (la ruta real)
        next(); 
    } catch (error) {
        res.status(403).json({ 
            success: false, 
            msg: "Token inválido o expirado. Intento de hackeo detectado." 
        });
    }
};

module.exports = verificarToken;