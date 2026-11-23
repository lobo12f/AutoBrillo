// nodejs/tests/helpers.js
import bcrypt from 'bcrypt';
import Taller from '../backend/models/Taller.js';
import Propietario from '../backend/models/Propietario.js';
import Empleado from '../backend/models/Empleado.js';
import Usuario from '../backend/models/personaModel.js';
import CitaTaller from '../backend/models/CitaTaller.js';

let contador = 0;
function idUnico() {
    return `${Date.now()}-${++contador}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Crea un propietario + taller en la DB de test con email único.
 */
export async function crearTallerDeTest() {
    const sufijo = idUnico();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('test1234', salt);

    const emailPropietario = `propietario-${sufijo}@test.com`;
    const emailTaller = `taller-${sufijo}@test.com`;

    const propietario = await Propietario.create({
        nombre: 'Propietario Test',
        email: emailPropietario,
        password: passwordHash,
        tipoPlan: 'BASICO',
        maxTalleres: 1,
        maxEmpleados: 3
    });

    const taller = await Taller.create({
        nombre: 'Taller Test',
        email: emailTaller,
        telefono: '8091234567',
        password: passwordHash,
        propietarioId: propietario._id,
        direccion: {
            calle: 'Calle Test 123',
            ciudad: 'Santo Domingo',
            provincia: 'Distrito Nacional'
        },
        especialidad: 'GENERAL',
        bahias: [{
            numero: 1,
            nombre: 'Bahía Test',
            tipo: 'GENERAL',
            estado: 'DISPONIBLE'
        }]
    });

    propietario.talleres.push(taller._id);
    await propietario.save();

    return {
        taller,
        propietario,
        password: 'test1234',
        emailTaller,
        emailPropietario
    };
}

/**
 * Crea un empleado de test con email único.
 */
export async function crearEmpleadoDeTest(tallerId) {
    const sufijo = idUnico();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('empleado123', salt);

    const emailEmpleado = `empleado-${sufijo}@test.com`;

    const empleado = await Empleado.create({
        nombre: 'Empleado Test',
        email: emailEmpleado,
        password: passwordHash,
        tallerId,
        rol: 'LAVADOR',
        estado: 'DISPONIBLE',
        especialidades: ['Lavado']
    });

    return { empleado, password: 'empleado123', emailEmpleado };
}

/**
 * Crea un cliente de test con email único.
 */
export async function crearClienteDeTest() {
    const sufijo = idUnico();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('cliente123', salt);

    const emailCliente = `cliente-${sufijo}@test.com`;

    const cliente = await Usuario.create({
        nombre: 'Cliente Test',
        email: emailCliente,
        password: passwordHash,
        rol: 'CLIENTE',
        saldo: 1000,
        serviciosDisponibles: 0,
        planActual: 'Ninguno'
    });

    return { cliente, password: 'cliente123', emailCliente };
}

/**
 * Hace login y devuelve el token.
 */
export async function loginYObtenerToken(request, app, tipo, datos = {}) {
    let url, body;

    if (tipo === 'taller') {
        url = '/api/talleres/login';
        body = { email: datos.email || 'taller@test.com', password: datos.password || 'test1234' };
    } else if (tipo === 'empleado') {
        url = '/api/talleres/empleados/login';
        body = {
            email: datos.email || 'empleado@test.com',
            password: datos.password || 'empleado123',
            tallerId: datos.tallerId
        };
    } else if (tipo === 'cliente') {
        url = '/api/auth/login';
        body = { email: datos.email || 'cliente@test.com', password: datos.password || 'cliente123' };
    }

    const res = await request(app).post(url).send(body);
    return res.body.token;
}

/**
 * Crea una cita de test.
 */
export async function crearCitaDeTest(tallerId, clienteId, estadoInicial = 'PENDIENTE') {
    const cita = await CitaTaller.create({
        tallerId,
        clienteId,
        vehiculo: {
            marca: 'Toyota',
            modelo: 'Corolla',
            placa: 'TEST123',
            color: '#000000'
        },
        servicio: {
            nombre: 'Lavado Básico',
            precio: 500,
            duracionEstimada: 45
        },
        fecha: new Date().toISOString().split('T')[0],
        hora: '10:00',
        estado: estadoInicial,
        fechas: {
            cita: new Date()
        },
        pago: {
            metodo: 'EFECTIVO',
            monto: 500,
            pagado: false
        },
        notas: []
    });

    return cita;
}