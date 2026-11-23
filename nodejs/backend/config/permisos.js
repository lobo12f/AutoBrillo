/**
 * Define los permisos según el rol del empleado
 */
function obtenerPermisosPorRol(rol) {
    const permisos = {
        // LAVADOR: Solo ve y gestiona sus propias citas
        LAVADOR: {
            puedeVerTodasCitas: false,
            puedeConfirmarCitas: false,
            puedeAsignarTrabajos: false,
            puedeCambiarEstados: true,      // Puede iniciar/finalizar SUS trabajos
            puedeFinalizarTrabajos: true,
            puedeSubirFotos: true,
            puedeVerEstadisticas: false,
            puedeGestionarEmpleados: false,
            puedeVerHistorial: false,
            puedeConfigurarTaller: false
        },
        
        // DETALLADOR: Similar al lavador pero con especialidad
        DETALLADOR: {
            puedeVerTodasCitas: false,
            puedeConfirmarCitas: false,
            puedeAsignarTrabajos: false,
            puedeCambiarEstados: true,
            puedeFinalizarTrabajos: true,
            puedeSubirFotos: true,
            puedeVerEstadisticas: false,
            puedeGestionarEmpleados: false,
            puedeVerHistorial: false,
            puedeConfigurarTaller: false
        },
        
        // SUPERVISOR: Ve todo, gestiona empleados
        SUPERVISOR: {
            puedeVerTodasCitas: true,
            puedeConfirmarCitas: true,
            puedeAsignarTrabajos: true,
            puedeCambiarEstados: true,
            puedeFinalizarTrabajos: true,
            puedeSubirFotos: true,
            puedeVerEstadisticas: true,
            puedeGestionarEmpleados: true,
            puedeVerHistorial: true,
            puedeConfigurarTaller: false
        },
        
        // ADMIN: Acceso total
        ADMIN: {
            puedeVerTodasCitas: true,
            puedeConfirmarCitas: true,
            puedeAsignarTrabajos: true,
            puedeCambiarEstados: true,
            puedeFinalizarTrabajos: true,
            puedeSubirFotos: true,
            puedeVerEstadisticas: true,
            puedeGestionarEmpleados: true,
            puedeVerHistorial: true,
            puedeConfigurarTaller: true
        }
    };

    return permisos[rol] || permisos.LAVADOR;
}

/**
 * Genera un token simple para la sesión
 */
function generarTokenSimple(id) {
    return Buffer.from(JSON.stringify({ 
        id, 
        fecha: Date.now() 
    })).toString('base64');
}

// Exportar para usar en otros archivos
export { obtenerPermisosPorRol, generarTokenSimple };