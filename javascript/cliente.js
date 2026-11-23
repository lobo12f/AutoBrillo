/**
 * CLASE CLIENTE - AutoBrillo D. (Versión 2026 - Optimizada)
 * Modelo de datos del usuario con getters/setters y persistencia local.
 */

export class Cliente {
    // Configuración
    static LIMITES = {
        CITAS_PENDIENTES_MAX: 10,
        CITAS_HISTORIAL_MAX: 5,
        TAMANO_MAX_LOCALSTORAGE_MB: 5
    };

    // Propiedades privadas
    #id;
    #nombre;
    #email;
    #apellido;
    #whatsapp;
    #fotoPerfil;
    #saldo;
    #serviciosDisponibles;
    #planActual;
    #misCitas;
    #extrasPagos;
    #garaje;
    #garajeHistorial;

    constructor(datos = {}) {
        this.#id = datos._id || datos.id || null;
        this.#nombre = datos.nombre || "Usuario";
        this.#email = datos.email || "";
        this.#apellido = datos.apellido || "";
        this.#whatsapp = datos.whatsapp || "";
        this.#fotoPerfil = datos.fotoPerfil || "";
        this.#saldo = parseFloat(datos.saldo) || 0;
        this.#serviciosDisponibles = parseInt(datos.serviciosDisponibles) || 0;
        this.#planActual = datos.planActual || "Ninguno";
        this.#misCitas = Array.isArray(datos.misCitas) ? datos.misCitas : [];
        this.#extrasPagos = Array.isArray(datos.extrasPagos) ? datos.extrasPagos : [];
        this.#garaje = Array.isArray(datos.garaje) ? datos.garaje : [];
        this.#garajeHistorial = Array.isArray(datos.garajeHistorial) ? datos.garajeHistorial : [];

        // Guardar estado inicial
        this._guardarEstadoLocal();
    }

    // ================================================================
    // 🔹 GETTERS
    // ================================================================

    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get email() { return this.#email; }
    get apellido() { return this.#apellido; }      // ← AÑADIR
    get whatsapp() { return this.#whatsapp; }
    get fotoPerfil() { return this.#fotoPerfil; }
    get saldo() { return this.#saldo; }
    get serviciosDisponibles() { return this.#serviciosDisponibles; }
    get planActual() { return this.#planActual; }
    get extrasPagos() { return [...this.#extrasPagos]; }
    get garaje() { return [...this.#garaje]; }
    get garajeHistorial() { return [...this.#garajeHistorial]; }

    get misCitas() {
        // Devolver copia para evitar mutaciones externas
        return this.#misCitas.map(cita => ({ ...cita }));
    }

    get citasPendientes() {
        const estadosActivos = ["PENDIENTE", "CONFIRMADA", "EN_RECEPCION", "EN_PROCESO", "LISTO"];
        return this.#misCitas.filter(c =>
            estadosActivos.includes(c.estado?.toUpperCase())
        );
    }

    get citasHistorial() {
        const estadosFinales = ["ENTREGADA", "ENTREGADO", "CANCELADA"];
        return this.#misCitas.filter(c =>
            estadosFinales.includes(c.estado?.toUpperCase())
        );
    }

    get totalCitas() { return this.#misCitas.length; }
    get totalVehiculos() { return this.#garaje.length; }

    get tienePlanActivo() {
        return this.#planActual !== "Ninguno" && this.#serviciosDisponibles > 0;
    }

    // ================================================================
    // 🔹 SETTERS
    // ================================================================

    set nombre(val) {
        if (val && typeof val === 'string') {
            this.#nombre = val.trim();
            this._guardarEstadoLocal();
        }
    }

    set email(val) {
        if (val && val.includes('@')) {
            this.#email = val.toLowerCase().trim();
            this._guardarEstadoLocal();
        } else if (val) {
            console.warn("⚠️ Formato de email inválido:", val);
        }
    }
    set apellido(val) {
        if (val && typeof val === 'string') {
            this.#apellido = val.trim();
            this._guardarEstadoLocal();
        }
    }

    set whatsapp(val) {
        if (val) {
            this.#whatsapp = val.trim();
            this._guardarEstadoLocal();
        }
    }
    set fotoPerfil(val) {
        this.#fotoPerfil = val;
        this._guardarEstadoLocal();
    }

    set saldo(val) {
        const nuevoSaldo = parseFloat(val);
        if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
            console.warn("⚠️ Saldo inválido:", val);
            return;
        }
        this.#saldo = nuevoSaldo;
        this._guardarEstadoLocal();
    }

    set serviciosDisponibles(val) {
        const nuevos = parseInt(val);
        this.#serviciosDisponibles = isNaN(nuevos) ? 0 : Math.max(0, nuevos);
        this._guardarEstadoLocal();
    }

    set planActual(val) {
        this.#planActual = val || "Ninguno";
        this._guardarEstadoLocal();
    }

    set misCitas(lista) {
        if (!Array.isArray(lista)) {
            console.error("❌ misCitas debe ser un array");
            return;
        }
        this.#misCitas = lista;
        this._guardarEstadoLocal();
    }

    set extrasPagos(lista) {
        if (!Array.isArray(lista)) return;
        this.#extrasPagos = lista;
        this._guardarEstadoLocal();
    }

    set garaje(lista) {
        if (!Array.isArray(lista)) return;
        this.#garaje = lista;
        this._guardarEstadoLocal();
    }

    set garajeHistorial(lista) {
        if (!Array.isArray(lista)) return;
        this.#garajeHistorial = lista;
        this._guardarEstadoLocal();
    }

    // ================================================================
    // 🔹 MÉTODOS DE GESTIÓN DE CITAS
    // ================================================================

    /**
     * Agrega una nueva cita al listado.
     */
    agregarCita(cita) {
        if (!cita) return;

        // Evitar duplicados por ID
        const idCita = String(cita._id || cita.id || '');
        const existe = this.#misCitas.some(c =>
            String(c._id || c.id) === idCita
        );

        if (existe) {
            console.warn("⚠️ Cita duplicada, actualizando en lugar de agregar");
            this.actualizarCita(cita);
            return;
        }

        this.#misCitas.push(cita);
        this._guardarEstadoLocal();
        console.log(`📅 Cita agregada. Total: ${this.#misCitas.length}`);
    }

    /**
     * Actualiza una cita existente.
     */
    actualizarCita(citaActualizada) {
        const idBuscado = String(citaActualizada._id || citaActualizada.id);
        const index = this.#misCitas.findIndex(c =>
            String(c._id || c.id) === idBuscado
        );

        if (index !== -1) {
            this.#misCitas[index] = { ...this.#misCitas[index], ...citaActualizada };
            this._guardarEstadoLocal();
            return true;
        }

        // Si no existe, la agregamos
        this.#misCitas.push(citaActualizada);
        this._guardarEstadoLocal();
        return true;
    }

    /**
     * Elimina una cita por su ID.
     */
    eliminarCita(idCita) {
        const idBuscado = String(idCita);
        const index = this.#misCitas.findIndex(c =>
            String(c._id || c.id) === idBuscado
        );

        if (index !== -1) {
            this.#misCitas.splice(index, 1);
            this._guardarEstadoLocal();
            console.log(`🗑️ Cita eliminada: ${idCita}`);
            return true;
        }
        return false;
    }

    /**
     * Busca una cita por su ID.
     */
    obtenerCita(idCita) {
        const idBuscado = String(idCita);
        return this.#misCitas.find(c =>
            String(c._id || c.id) === idBuscado
        ) || null;
    }

    // ================================================================
    // 🔹 MÉTODOS DE GESTIÓN DE GARAJE
    // ================================================================

    /**
     * Agrega un vehículo al garaje.
     */
    agregarVehiculo(vehiculo) {
        if (!vehiculo?.placa) {
            console.error("❌ El vehículo debe tener placa");
            return false;
        }

        // Verificar duplicados por placa
        const placaLimpia = vehiculo.placa.toUpperCase().trim();
        if (this.#garaje.some(v => v.placa?.toUpperCase() === placaLimpia)) {
            console.warn("⚠️ Ya existe un vehículo con esa placa");
            return false;
        }

        this.#garaje.push({
            ...vehiculo,
            placa: placaLimpia,
            id: vehiculo.id || Date.now()
        });

        this._guardarEstadoLocal();
        console.log(`🚗 Vehículo agregado: ${vehiculo.marca} ${vehiculo.modelo}`);
        return true;
    }

    /**
     * Elimina un vehículo del garaje (lo mueve al historial).
     */
    eliminarVehiculo(idVehiculo) {
        const index = this.#garaje.findIndex(v =>
            String(v.id || v._id) === String(idVehiculo)
        );

        if (index === -1) return false;

        const eliminado = this.#garaje.splice(index, 1)[0];

        // Archivar en historial
        this.#garajeHistorial.push({
            ...eliminado,
            fechaBaja: new Date().toISOString()
        });

        this._guardarEstadoLocal();
        console.log(`🗑️ Vehículo eliminado: ${eliminado.placa}`);
        return true;
    }

    /**
     * Actualiza un vehículo del garaje.
     */
    actualizarVehiculo(idVehiculo, datos) {
        const index = this.#garaje.findIndex(v =>
            String(v.id || v._id) === String(idVehiculo)
        );

        if (index === -1) return false;

        this.#garaje[index] = { ...this.#garaje[index], ...datos };
        this._guardarEstadoLocal();
        return true;
    }

    // ================================================================
    // 🔹 MÉTODOS DE SINCRONIZACIÓN
    // ================================================================

    /**
     * Actualiza los datos desde el servidor.
     */
    actualizarDesdeServidor(datosServidor) {
        if (!datosServidor) return;

        this.#nombre = datosServidor.nombre || this.#nombre;
        this.#email = datosServidor.email || this.#email;
        this.#apellido = datosServidor.apellido || this.#apellido;
        this.#whatsapp = datosServidor.whatsapp || this.#whatsapp;
        this.#fotoPerfil = datosServidor.fotoPerfil || this.#fotoPerfil;
        this.#saldo = parseFloat(datosServidor.saldo) ?? this.#saldo;
        this.#serviciosDisponibles = parseInt(datosServidor.serviciosDisponibles) ?? this.#serviciosDisponibles;
        this.#planActual = datosServidor.planActual || this.#planActual;
        this.#garaje = Array.isArray(datosServidor.garaje) ? datosServidor.garaje : this.#garaje;
        this.#garajeHistorial = Array.isArray(datosServidor.garajeHistorial) ? datosServidor.garajeHistorial : this.#garajeHistorial;
        this.#extrasPagos = Array.isArray(datosServidor.extrasPagos) ? datosServidor.extrasPagos : this.#extrasPagos;

        // Fusionar citas del servidor con las locales
        if (Array.isArray(datosServidor.misCitas)) {
            this.#fusionarCitas(datosServidor.misCitas);
        }

        console.log("🔄 Datos actualizados desde el servidor");
    }

    /**
     * Fusiona citas del servidor con las locales, priorizando el servidor.
     */
    #fusionarCitas(citasServidor) {
        const mapaCitas = new Map();

        // Indexar citas locales por ID
        this.#misCitas.forEach(c => {
            const id = String(c._id || c.id);
            if (id) mapaCitas.set(id, c);
        });

        // Sobrescribir con datos del servidor
        citasServidor.forEach(c => {
            const id = String(c._id || c.id);
            if (id) mapaCitas.set(id, { ...mapaCitas.get(id) || {}, ...c });
        });

        this.#misCitas = Array.from(mapaCitas.values());
    }

    // ================================================================
    // 🔹 SERIALIZACIÓN
    // ================================================================

    /**
     * Convierte el cliente a un objeto plano para guardar en localStorage/API.
     * NO elimina fotos, pero las limita a URLs (no base64).
     */
    toJSON() {
        // ✅ Preservar el token de la sesión guardada
        let tokenActual = null;
        try {
            const sesionGuardada = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
            tokenActual = sesionGuardada.token || null;
        } catch (e) { /* ignorar */ }

        return {
            _id: this.#id,
            id: this.#id,
            nombre: this.#nombre,
            email: this.#email,
            apellido: this.#apellido,
            whatsapp: this.#whatsapp,
            fotoPerfil: this.#fotoPerfil,
            saldo: this.#saldo,
            serviciosDisponibles: this.#serviciosDisponibles,
            planActual: this.#planActual,
            misCitas: this.#misCitas.map(c => this.#limpiarCitaParaGuardar(c)),
            garaje: this.#garaje.map(v => this.#limpiarVehiculoParaGuardar(v)),   // ✅ AÑADIDO
            extrasPagos: this.#extrasPagos,                                       // ✅ AÑADIDO
            garajeHistorial: this.#garajeHistorial,
            token: tokenActual     // ✅ AÑADIDO
        };
    }

    /**
     * Limpia una cita para guardado (mantiene solo datos esenciales).
     */
    #limpiarCitaParaGuardar(cita) {
        const { fotos, fotoFinal, notas, ...datosLimpios } = cita;
        return {
            ...datosLimpios,
            // Mantener URLs de fotos pero no base64
            fotoFinal: fotoFinal?.startsWith('http') ? fotoFinal : undefined,
            fotos: fotos ? {
                antes: (fotos.antes || []).filter(f => f.url?.startsWith('http')).slice(-3),
                durante: (fotos.durante || []).filter(f => f.url?.startsWith('http')).slice(-3),
                despues: (fotos.despues || []).filter(f => f.url?.startsWith('http')).slice(-3)
            } : undefined
        };
    }

    /**
     * Limpia un vehículo para guardado.
     */
    #limpiarVehiculoParaGuardar(vehiculo) {
        const { foto, ...datosLimpios } = vehiculo;
        return {
            ...datosLimpios,
            // Solo mantener URL de foto, no base64
            foto: foto?.startsWith('http') ? foto : undefined
        };
    }

    // ================================================================
    // 🔹 PERSISTENCIA LOCAL
    // ================================================================

    /**
     * Guarda el estado actual en localStorage con control de tamaño.
     */
    _guardarEstadoLocal() {
        try {
            const datos = this.toJSON();
            const jsonStr = JSON.stringify(datos);
            const sizeMB = (jsonStr.length * 2) / (1024 * 1024);

            if (sizeMB > Cliente.LIMITES.TAMANO_MAX_LOCALSTORAGE_MB) {
                console.warn(`⚠️ Datos pesados (${sizeMB.toFixed(1)}MB). Reduciendo...`);
                this._guardarVersionMinima();
                return;
            }

            localStorage.setItem('sesion_activa', jsonStr);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn("⚠️ Cuota de localStorage excedida");
                this._guardarVersionMinima();
            } else {
                console.error("❌ Error al guardar:", error.message);
            }
        }
    }

    /**
     * Guarda una versión mínima cuando hay problemas de espacio.
     */
    _guardarVersionMinima() {
        try {
            // ✅ Preservar el token de la sesión guardada
            let tokenActual = null;
            try {
                const sesionGuardada = JSON.parse(localStorage.getItem('sesion_activa') || '{}');
                tokenActual = sesionGuardada.token || null;
            } catch (e) { /* ignorar */ }

            const datosMinimos = {
                _id: this.#id,
                id: this.#id,
                nombre: this.#nombre,
                email: this.#email,
                saldo: this.#saldo,
                serviciosDisponibles: this.#serviciosDisponibles,
                planActual: this.#planActual,
                misCitas: this.#misCitas.slice(-5).map(c => ({
                    _id: c._id,
                    id: c.id,
                    vehiculo: c.vehiculo,
                    fecha: c.fecha,
                    hora: c.hora,
                    estado: c.estado,
                    servicio: c.servicio,
                    sucursal: c.sucursal
                })),
                garaje: this.#garaje.map(v => ({
                    id: v.id,
                    marca: v.marca,
                    modelo: v.modelo,
                    placa: v.placa,
                    color: v.color
                })),
                extrasPagos: this.#extrasPagos,          // ✅ AÑADIR
                garajeHistorial: this.#garajeHistorial,  // ✅ AÑADIR
                token: tokenActual     // ✅ AÑADIDO
            };

            localStorage.setItem('sesion_activa', JSON.stringify(datosMinimos));
            console.log('💾 Versión mínima guardada');
        } catch (error) {
            console.error('❌ Error crítico al guardar:', error.message);
        }
    }
}