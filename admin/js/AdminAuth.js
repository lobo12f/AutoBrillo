/**
 * class AdminAuth
 * Responsabilidad: Autenticación segura y control de permisos por Rol.
 */
class AdminAuth {
    constructor() {
        this.usuarioActivo = null;
    }

    /**
     * Valida credenciales contra el Núcleo SQL.
     */
    async login(email, password) {
        console.log('🔐 Verificando identidad en SQL...');
        
        // Simulación de respuesta de servidor seguro
        // En la vida real, comparamos el Hash de la contraseña
        if (email === "angel@autobrillo.com" && password === "admin123") {
            this.usuarioActivo = {
                id: 'admin_01',
                nombre: 'Angel',
                rol: 'ADMIN',
                permisos: ['VER_DINERO', 'EDITAR_PRECIOS', 'GESTIONAR_STAFF']
            };
            console.log('✅ Acceso total concedido.');
            return true;
        } else if (email === "empleado@autobrillo.com") {
            this.usuarioActivo = {
                id: 'emp_05',
                nombre: 'Carlos',
                rol: 'STAFF',
                permisos: ['VER_AGENDA', 'CAMBIAR_ESTADO_CARRO']
            };
            console.log('ℹ️ Acceso limitado (Staff).');
            return true;
        }
        
        console.error('❌ Credenciales incorrectas.');
        return false;
    }

    /**
     * Middleware de seguridad para proteger funciones críticas.
     */
    tienePermiso(permisoRequerido) {
        if (!this.usuarioActivo) return false;
        return this.usuarioActivo.permisos.includes(permisoRequerido);
    }

    logout() {
        this.usuarioActivo = null;
        window.location.reload();
    }
}

window.Auth = new AdminAuth();