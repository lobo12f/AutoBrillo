// En vehicle-db.js
const VehicleDB = {
    obtenerTodas: function() {
        try {
            const datos = localStorage.getItem('registro_global_placas');
            return datos ? JSON.parse(datos) : [];
        } catch (e) {
            console.error("❌ Error de acceso al LocalStorage: ", e);
            return []; // Retorna vacío si está bloqueado
        }
    },

    estaRegistrada: function(placa) {
        if (!placa) return false;
        const lista = this.obtenerTodas();
        const placaLimpia = String(placa).trim().toUpperCase();
        
        // LOG PARA DEPURAR
        console.log("--- CHEQUEO DE PLACA ---");
        console.log("Placas en BD Global:", lista);
        console.log("Buscando:", placaLimpia);
        
        const existe = lista.includes(placaLimpia);
        console.log("¿Ya existe?:", existe);
        return existe;
    },

    registrar: function(placa) {
        if (!placa) return false;
        let lista = this.obtenerTodas();
        const placaLimpia = String(placa).trim().toUpperCase();
        
        if (!lista.includes(placaLimpia)) {
            lista.push(placaLimpia);
            try {
                localStorage.setItem('registro_global_placas', JSON.stringify(lista));
                console.log("✅ Guardado global exitoso");
                return true;
            } catch (e) {
                console.error("❌ No se pudo guardar en el sistema:", e);
                return false;
            }
        }
        return false;
    },

    // ESTA ES LA FUNCIÓN QUE TE DABA EL ERROR:
    liberar: function(placa) {
        if (!placa) return;
        let lista = this.obtenerTodas();
        const placaLimpia = String(placa).trim().toUpperCase();
        
        // Filtramos la lista para quitar la placa que queremos liberar
        const nuevaLista = lista.filter(p => p !== placaLimpia);
        
        localStorage.setItem('registro_global_placas', JSON.stringify(nuevaLista));
        console.log(`✅ Placa [${placaLimpia}] liberada del sistema global.`);
    }
};