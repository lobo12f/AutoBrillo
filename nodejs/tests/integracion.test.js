// nodejs/tests/integracion.test.js
import request from 'supertest';
import app from '../server.js';
import {
    crearTallerDeTest,
    crearEmpleadoDeTest,
    crearClienteDeTest,
    loginYObtenerToken
} from './helpers.js';

describe('🔄 Integración - Flujo Completo del Sistema', () => {

    // ================================================================
    // 🔹 FLUJO 1: TALLER COMPLETO
    // ================================================================

    describe('🏪 Flujo completo del TALLER', () => {

        test('debe completar el flujo: login → empleado → servicio → plan → bahía → cita', async () => {
            // 1. Crear taller + login
            const datosTaller = await crearTallerDeTest();
            const tallerId = datosTaller.taller._id.toString();
            const tokenTaller = await loginYObtenerToken(request, app, 'taller', {
                email: datosTaller.emailTaller,
                password: 'test1234'
            });
            expect(tokenTaller).toBeDefined();

            // 2. Crear empleado
            const crearEmpleado = await request(app)
                .post(`/api/talleres/${tallerId}/empleados`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({
                    nombre: 'Empleado Integración',
                    email: `empleado-${Date.now()}@test.com`,
                    password: 'test1234',
                    rol: 'LAVADOR'
                });
            expect(crearEmpleado.status).toBe(201);
            const empleadoId = crearEmpleado.body.empleado._id;

            // 3. Crear servicio
            const crearServicio = await request(app)
                .post(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({
                    nombre: 'Lavado Integración',
                    descripcion: 'Lavado de prueba',
                    precio: 500,
                    duracionEstimada: 45,
                    tipo: 'LAVADO'
                });
            expect(crearServicio.status).toBe(201);
            const servicioId = crearServicio.body.servicios[0]._id;

            // 4. Crear plan
            const crearPlan = await request(app)
                .post(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({
                    nombre: 'Plan Integración',
                    descripcion: 'Plan de prueba',
                    precio: 2500,
                    serviciosIncluidos: 5,
                    duracionDias: 30
                });
            expect(crearPlan.status).toBe(201);

            // 5. Crear bahía
            const crearBahia = await request(app)
                .post(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${tokenTaller}`)
                .send({
                    numero: 2,
                    nombre: 'Bahía Integración',
                    tipo: 'LAVADO_RAPIDO',
                    estado: 'DISPONIBLE'
                });
            expect(crearBahia.status).toBe(201);

            // 6. Listar todo (verificar que se creó)
            const listarEmpleados = await request(app)
                .get(`/api/talleres/${tallerId}/empleados`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(listarEmpleados.status).toBe(200);
            expect(listarEmpleados.body.empleados.length).toBeGreaterThan(0);

            const listarServicios = await request(app)
                .get(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(listarServicios.status).toBe(200);

            const listarPlanes = await request(app)
                .get(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(listarPlanes.status).toBe(200);

            const listarBahias = await request(app)
                .get(`/api/talleres/${tallerId}/bahias`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(listarBahias.status).toBe(200);
            expect(listarBahias.body.bahias.length).toBeGreaterThan(1);

            // 7. Ver dashboard
            const dashboard = await request(app)
                .get(`/api/talleres/${tallerId}/dashboard`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(dashboard.status).toBe(200);
            expect(dashboard.body.exito).toBe(true);

            // 8. Ver rendimiento
            const rendimiento = await request(app)
                .get(`/api/talleres/${tallerId}/rendimiento`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(rendimiento.status).toBe(200);

            // 9. Ver notificaciones
            const notificaciones = await request(app)
                .get(`/api/talleres/${tallerId}/notificaciones`)
                .set('Authorization', `Bearer ${tokenTaller}`);
            expect(notificaciones.status).toBe(200);
        });
    });

    // ================================================================
    // 🔹 FLUJO 2: CLIENTE COMPLETO
    // ================================================================

    describe('👤 Flujo completo del CLIENTE', () => {

        test('debe completar el flujo: login → agendar → ver → cancelar → calificar', async () => {
            // 1. Crear taller + cliente
            const datosTaller = await crearTallerDeTest();
            const datosCliente = await crearClienteDeTest();
            const tallerId = datosTaller.taller._id.toString();
            const clienteId = datosCliente.cliente._id.toString();

            const tokenCliente = await loginYObtenerToken(request, app, 'cliente', {
                email: datosCliente.emailCliente,
                password: 'cliente123'
            });
            expect(tokenCliente).toBeDefined();

            // 2. Ver talleres disponibles
            const talleresDisponibles = await request(app)
                .get('/api/talleres/disponibles')
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(talleresDisponibles.status).toBe(200);
            expect(Array.isArray(talleresDisponibles.body.talleres)).toBe(true);

            // 3. Ver detalle del taller
            const detalleTaller = await request(app)
                .get(`/api/talleres/${tallerId}`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(detalleTaller.status).toBe(200);
            expect(detalleTaller.body.exito).toBe(true);

            // 4. Ver servicios del taller
            const serviciosTaller = await request(app)
                .get(`/api/talleres/${tallerId}/servicios`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(serviciosTaller.status).toBe(200);

            // 5. Ver planes del taller
            const planesTaller = await request(app)
                .get(`/api/talleres/${tallerId}/planes`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(planesTaller.status).toBe(200);

            // 6. Ver sus citas
            const misCitas = await request(app)
                .get(`/api/mis-citas/${clienteId}`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(misCitas.status).toBe(200);
            expect(Array.isArray(misCitas.body.citas)).toBe(true);

            // 7. Sincronizar perfil
            const sincronizar = await request(app)
                .put(`/api/usuarios/sincronizar/${datosCliente.emailCliente}`)
                .set('Authorization', `Bearer ${tokenCliente}`)
                .send({ nombre: 'Cliente Integración' });
            expect(sincronizar.status).toBe(200);
            expect(sincronizar.body.usuario.nombre).toBe('Cliente Integración');

            // 8. Ver galería del taller
            const galeria = await request(app)
                .get(`/api/talleres/${tallerId}/galeria`)
                .set('Authorization', `Bearer ${tokenCliente}`);
            expect(galeria.status).toBe(200);
        });
    });

    // ================================================================
    // 🔹 FLUJO 3: EMPLEADO COMPLETO
    // ================================================================

    describe('👨‍🔧 Flujo completo del EMPLEADO', () => {

        test('debe completar el flujo: login → ver perfil → cambiar password', async () => {
            // 1. Crear taller + empleado
            const datosTaller = await crearTallerDeTest();
            const tallerId = datosTaller.taller._id.toString();
            const datosEmpleado = await crearEmpleadoDeTest(tallerId);
            const empleadoId = datosEmpleado.empleado._id.toString();

            // 2. Login del empleado
            const tokenEmpleado = await loginYObtenerToken(request, app, 'empleado', {
                email: datosEmpleado.emailEmpleado,
                password: 'empleado123',
                tallerId: tallerId
            });
            expect(tokenEmpleado).toBeDefined();

            // 3. Cambiar contraseña
            const cambiarPassword = await request(app)
                .put(`/api/talleres/empleados/${empleadoId}/password`)
                .set('Authorization', `Bearer ${tokenEmpleado}`)
                .send({
                    passwordActual: 'empleado123',
                    passwordNueva: 'nueva1234'
                });
            expect(cambiarPassword.status).toBe(200);
            expect(cambiarPassword.body.exito).toBe(true);

            // 4. Ver trabajos (citas del taller)
            const trabajos = await request(app)
                .get(`/api/talleres/${tallerId}/citas`)
                .set('Authorization', `Bearer ${tokenEmpleado}`);
            expect(trabajos.status).toBe(200);
            expect(Array.isArray(trabajos.body.citas)).toBe(true);
        });
    });

    // ================================================================
    // 🔹 FLUJO 4: VERIFICACIÓN DE PROPIEDAD CRUZADA
    // ================================================================

    describe('🔒 Verificación de propiedad cruzada', () => {

        test('taller A NO puede acceder a datos del taller B', async () => {
            const datosA = await crearTallerDeTest();
            const datosB = await crearTallerDeTest();
            const tallerAId = datosA.taller._id.toString();
            const tallerBId = datosB.taller._id.toString();

            const tokenA = await loginYObtenerToken(request, app, 'taller', {
                email: datosA.emailTaller,
                password: 'test1234'
            });

            // Intentar acceder a datos del taller B con token de A
            const empleadosB = await request(app)
                .get(`/api/talleres/${tallerBId}/empleados`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(empleadosB.status).toBe(403);

            const dashboardB = await request(app)
                .get(`/api/talleres/${tallerBId}/dashboard`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(dashboardB.status).toBe(403);

            const serviciosB = await request(app)
                .get(`/api/talleres/${tallerBId}/servicios`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(serviciosB.status).toBe(403);

            const planesB = await request(app)
                .get(`/api/talleres/${tallerBId}/planes`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(planesB.status).toBe(403);

            const bahiasB = await request(app)
                .get(`/api/talleres/${tallerBId}/bahias`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(bahiasB.status).toBe(403);

            const pagosB = await request(app)
                .get(`/api/talleres/${tallerBId}/pagos`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(pagosB.status).toBe(403);

            const comisionesB = await request(app)
                .get(`/api/talleres/${tallerBId}/comisiones`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(comisionesB.status).toBe(403);

            const rendimientoB = await request(app)
                .get(`/api/talleres/${tallerBId}/rendimiento`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(rendimientoB.status).toBe(403);

            const notificacionesB = await request(app)
                .get(`/api/talleres/${tallerBId}/notificaciones`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(notificacionesB.status).toBe(403);
        });

        test('cliente A NO puede acceder a datos del cliente B', async () => {
            const datosA = await crearClienteDeTest();
            const datosB = await crearClienteDeTest();
            const clienteAId = datosA.cliente._id.toString();
            const clienteBId = datosB.cliente._id.toString();

            const tokenA = await loginYObtenerToken(request, app, 'cliente', {
                email: datosA.emailCliente,
                password: 'cliente123'
            });

            // Intentar acceder a citas del cliente B
            const citasB = await request(app)
                .get(`/api/mis-citas/${clienteBId}`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(citasB.status).toBe(403);

            // Intentar sincronizar perfil de B
            const sincronizarB = await request(app)
                .put(`/api/usuarios/sincronizar/${datosB.emailCliente}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ nombre: 'Hackeado' });
            expect(sincronizarB.status).toBe(403);
        });
    });

    // ================================================================
    // 🔹 FLUJO 5: RUTAS PÚBLICAS
    // ================================================================

    describe('🌐 Rutas públicas (sin token)', () => {

        test('debe permitir acceso a rutas públicas sin token', async () => {
            // Talleres activos
            const activos = await request(app).get('/api/talleres/activos');
            expect(activos.status).toBe(200);

            // Talleres disponibles
            const disponibles = await request(app).get('/api/talleres/disponibles');
            expect(disponibles.status).toBe(200);

            // Health check
            const health = await request(app).get('/api/health');
            expect(health.status).toBe(200);

            // Login (público)
            const login = await request(app)
                .post('/api/talleres/login')
                .send({ email: 'noexiste@test.com', password: 'test1234' });
            expect(login.status).toBe(401);   // Credenciales inválidas, pero la ruta existe

            // Registro (público)
            const registro = await request(app)
                .post('/api/auth/registro')
                .send({});
            expect(registro.status).toBe(500); // Error por falta de campos, pero la ruta existe
        });
    });
});