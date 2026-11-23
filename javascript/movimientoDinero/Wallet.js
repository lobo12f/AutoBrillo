/**
 * Clase encargada de toda la lógica financiera del cliente.
 * Principio: Única fuente de verdad para transacciones.
 */
export class Wallet {
    #cliente;
    
    constructor(usuarioInstancia) {
        this.#cliente = usuarioInstancia; // Recibe la instancia del Cliente
        this.PRECIO_ESTANDAR = 20.00; // Precio estándar para citas o servicios 
    }

    /**
     * Actualiza la referencia interna al cliente
     * Útil cuando window.user se actualiza desde el servidor
     */
    sincronizarCliente() {
        if (window.user && window.user !== this.#cliente) {
            this.#cliente = window.user;
            console.log("🔄 Wallet sincronizada con la instancia global del cliente.");
        }
    }

    /**
     * Procesa una recarga de saldo
     */
    recargar(monto) {
        if (isNaN(monto) || monto <= 0) throw new Error("Monto de recarga inválido.");
        
        this.sincronizarCliente(); // Aseguramos referencia actualizada
        this.#cliente.saldo += monto;
        // ✅ CORREGIDO: Ya no llamamos a sincronizar() porque el setter de Cliente
        // ya guarda automáticamente en localStorage mediante _guardarEstadoLocal()
        console.log(`💰 [Wallet] Recarga exitosa: +$${monto}`);
        return this.#cliente.saldo;
    }

    /**
     * Valida y descuenta saldo para un pago genérico
     */
    pagar(monto, concepto = "Servicio") {
        this.sincronizarCliente();
        
        if (this.#cliente.saldo < monto) {
            throw new Error(`Saldo insuficiente para: ${concepto}. Faltan $${(monto - this.#cliente.saldo).toFixed(2)}`);
        }

        this.#cliente.saldo -= monto;
        console.log(`💸 [Wallet] Pago procesado: ${concepto} por $${monto}`);
        return true;
    }

    /**
     * Verifica si el usuario puede pagar algo
     */
    puedePagar(monto) {
        this.sincronizarCliente();
        return this.#cliente.saldo >= monto;
    }

    /**
     * Retorna el saldo actual (método seguro)
     */
    getSaldo() {
        this.sincronizarCliente();
        return this.#cliente.saldo;
    }

    /**
     * Valida y procesa el pago de una cita nueva
     * SOLO descuenta recursos, NO agrega la cita al array
     */
    confirmarYPayCita(datosBaseCita) {
        this.sincronizarCliente();
        
        const tieneServicios = this.#cliente.serviciosDisponibles > 0;
        const tieneSaldo = this.#cliente.saldo >= this.PRECIO_ESTANDAR;

        if (!tieneServicios && !tieneSaldo) {
            throw new Error("No tienes servicios ni saldo suficiente.");
        }

        // Determinar método de pago
        const metodoSugerido = tieneServicios ? "CUPO_PLAN" : "SALDO";

        // Aplicar descuento inmediato
        if (metodoSugerido === "CUPO_PLAN") {
            this.#cliente.serviciosDisponibles -= 1;
            console.log(`🔄 [Wallet] Cupo de plan usado. Restantes: ${this.#cliente.serviciosDisponibles}`);
        } else {
            this.#cliente.saldo -= this.PRECIO_ESTANDAR;
            console.log(`💳 [Wallet] Pago con saldo: $${this.PRECIO_ESTANDAR}`);
        }

        // IMPORTANTE: No agregamos la cita al array
        // El servidor es el único que debe hacer eso
        
        return { 
            exito: true, 
            metodo: metodoSugerido,
            monto: metodoSugerido === "SALDO" ? this.PRECIO_ESTANDAR : 0
        };
    }

    /**
     * Cambia el estado de una cita a "EN PROCESO"
     */
    iniciarTrabajoVehiculo(idCita) {
        this.sincronizarCliente();
        
        const citas = this.#cliente.misCitas;
        const index = citas.findIndex(c => 
            String(c._id || c.id) === String(idCita)
        );

        if (index !== -1) {
            citas[index].estado = "EN PROCESO";
            
            // Si no se ha pagado, forzar cobro
            if (!citas[index].pagado) {
                this.procesarCobroReal(idCita);
            }

            this.#cliente.misCitas = citas;
            console.log(`🔧 [Wallet] Iniciando trabajo en cita ${idCita}`);
            return true;
        }
        return false;
    }

    /**
     * Cobro real de una cita específica
     */
    procesarCobroReal(idCita) {
        const citas = this.#cliente.misCitas;
        const index = citas.findIndex(c => 
            String(c._id || c.id) === String(idCita)
        );

        if (index !== -1) {
            const cita = citas[index];
            if (!cita.pagado) {
                const resultado = this.cobrarCita();
                cita.pagado = true;
                cita.metodoPago = resultado.metodo;
                this.#cliente.misCitas = citas;
                console.log(`💰 [Wallet] Cobro procesado: ${resultado.metodo}`);
            }
        }
    }

    /**
     * Lógica central de cobro (cupo o saldo)
     */
    cobrarCita() {
        if (this.#cliente.serviciosDisponibles > 0) {
            this.#cliente.serviciosDisponibles -= 1;
            return { metodo: "CUPO_PLAN", exito: true };
        } else if (this.#cliente.saldo >= this.PRECIO_ESTANDAR) {
            this.#cliente.saldo -= this.PRECIO_ESTANDAR;
            return { metodo: "SALDO", exito: true };
        }
        throw new Error("No tienes fondos ni cupos disponibles.");
    }

    /**
     * Procesa pago de confirmación de cita
     */
    procesarPagoConfirmacion(cita) {
        this.sincronizarCliente();
        
        if (cita.metodoPago === "CUPO_PLAN") {
            if (this.#cliente.serviciosDisponibles > 0) {
                this.#cliente.serviciosDisponibles--;
                return true;
            } else {
                alert("❌ No tienes servicios disponibles en tu plan.");
                return false;
            }
        } else {
            if (this.#cliente.saldo >= this.PRECIO_ESTANDAR) {
                console.log(`Procesando pago de $${this.PRECIO_ESTANDAR} para la cita...`);
                this.#cliente.saldo -= this.PRECIO_ESTANDAR;
                return true;
            } else {
                alert(`❌ Saldo insuficiente ($${this.PRECIO_ESTANDAR} requeridos).`);
                return false;
            }
        }
    }

    /**
     * Reembolso por cancelación de cita
     */
    reembolsarCita(idCita) {
        this.sincronizarCliente(); // ✅ CORREGIDO: Usamos el método en lugar de window.user
        
        const citas = this.#cliente.misCitas;
        const idBuscado = String(idCita).trim();

        console.log("🔍 Buscando cita para cancelar:", idBuscado);

        const index = citas.findIndex(c => 
            String(c._id || c.id) === idBuscado
        );

        if (index === -1) {
            console.error("❌ Cita no encontrada. ID buscado:", idBuscado);
            return { exito: false, mensaje: "Cita no encontrada en la billetera." };
        }

        const cita = citas[index];
        const estadoActual = (cita.estado || "PENDIENTE").toUpperCase();

        // Verificar que se pueda cancelar
        const bloqueados = ["EN PROCESO", "LISTO PARA ENTREGA", "ENTREGADA"];
        if (bloqueados.includes(estadoActual)) {
            return { exito: false, mensaje: "Este servicio ya está en curso y no se puede cancelar." };
        }

        // Devolver recursos según método de pago
        if (cita.metodoPago === "SALDO") {
            const monto = cita.montoPagado || this.PRECIO_ESTANDAR;
            this.#cliente.saldo += (estadoActual === "CONFIRMADA") ? (monto / 2) : monto;
            console.log(`💰 Reembolso en saldo: RD$ ${(estadoActual === "CONFIRMADA") ? (monto / 2) : monto}`);
        } else if (cita.metodoPago === "CUPO_PLAN") {
            this.#cliente.serviciosDisponibles += 1;
            console.log("🔄 Servicio devuelto al plan");
        }

        // Eliminar la cita del array
        citas.splice(index, 1);
        this.#cliente.misCitas = citas;

        console.log("✅ Cita eliminada correctamente");
        return { exito: true, mensaje: "Cita cancelada y recursos devueltos." };
    }

    /**
     * Compra de plan mensual/anual
     */
    comprarPlan(nombre, precio, cupos) {
        this.sincronizarCliente();
        const costo = parseFloat(precio);

        if (this.#cliente.saldo < costo) {
            throw new Error(`Saldo insuficiente. El plan cuesta $${costo.toFixed(2)} y solo tienes $${this.#cliente.saldo.toFixed(2)}`);
        }

        this.#cliente.saldo -= costo;
        this.#cliente.planActual = nombre;
        this.#cliente.serviciosDisponibles = parseInt(cupos);

        // Registro en historial
        if (this.#cliente.extrasPagos) {
            const historial = this.#cliente.extrasPagos;
            historial.push({
                id: Date.now(),
                nombre: `Suscripción: ${nombre}`,
                precio: costo,
                fecha: new Date().toLocaleDateString(),
                estado: "COMPLETO"
            });
            this.#cliente.extrasPagos = historial;
        }

        console.log(`✅ [Wallet] Plan ${nombre} adquirido.`);
        return true;
    }

    /**
     * Compra de servicios extra
     */
    comprarServicioExtra(nombre, precio) {
        this.sincronizarCliente();
        const costo = parseFloat(precio);

        if (this.#cliente.saldo < costo) {
            throw new Error(`Saldo insuficiente. Necesitas $${costo.toFixed(2)}.`);
        }

        this.#cliente.saldo -= costo;

        const historial = this.#cliente.extrasPagos;
        historial.push({
            id: Date.now(),
            nombre: nombre,
            precio: costo,
            fecha: new Date().toLocaleDateString(),
            estado: "COMPLETO"
        });
        this.#cliente.extrasPagos = historial;

        console.log(`✅ [Wallet] Servicio extra pagado: ${nombre}`);
        return true;
    }
}

window.Wallet = Wallet;