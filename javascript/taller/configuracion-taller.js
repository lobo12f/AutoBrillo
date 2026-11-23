// ====================================================================
// ⚙️ CONFIGURACIÓN DEL TALLER
// ====================================================================
import { apiFetch } from '../api-client.js';
export class ConfiguracionTaller {

    /**
     * Mostrar mensaje (usa toast si existe, sino alert)
     */
    _mensaje(texto, tipo = 'info') {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(texto, tipo);
        } else if (tipo === 'error' || tipo === 'warning') {
            alert(texto);
        } else {
            console.log(texto);
        }
    }

    constructor(apiUrl) {
        this.API_URL = apiUrl;
        this.tallerActual = null;
        this.logoTemporal = null; // Para guardar el logo temporal antes de subir

        // ✅ COLOR: Evento para actualizar vista previa al cambiar color (NUEVO)
        //    Se configura en el constructor porque el elemento ya existe en el DOM
        //    El evento se agrega una sola vez, no en cada carga
        const colorInput = document.getElementById('config-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.actualizarPreviewColor(e.target.value);
            });
            console.log('🎨 Evento de color configurado');
        }
    }

    // ================================================================
    // 🔹 CARGAR CONFIGURACIÓN
    // ================================================================

    /**
     * Cargar datos del taller en el formulario
     */
    async cargar(tallerActual) {
        this.tallerActual = tallerActual;
        this.logoTemporal = null; // Resetear logo temporal

        try {
            const response = await apiFetch(`/talleres/${tallerActual._id}`);
            const data = await response.json();

            if (data.exito && data.taller) {
                const t = data.taller;

                // ✅ LOGO: Mostrar logo guardado
                const logoEl = document.getElementById('preview-logo-taller');
                const placeholder = document.getElementById('logo-placeholder');
                if (t.logo && logoEl) {
                    logoEl.src = t.logo;
                    logoEl.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                } else if (placeholder) {
                    placeholder.style.display = 'flex';
                }

                // Datos básicos
                document.getElementById('config-nombre').value = t.nombre || '';
                document.getElementById('config-email').value = t.email || '';
                document.getElementById('config-telefono').value = t.telefono || '';
                document.getElementById('config-especialidad').value = t.especialidad || 'GENERAL';

                // Descripción
                const descEl = document.getElementById('config-descripcion');
                if (descEl) descEl.value = t.descripcion || '';

                // Métodos de pago
                const metodos = t.metodosPago || [];
                const checkEfectivo = document.getElementById('config-pago-efectivo');
                const checkTransferencia = document.getElementById('config-pago-transferencia');
                const checkTarjeta = document.getElementById('config-pago-tarjeta');
                if (checkEfectivo) checkEfectivo.checked = metodos.includes('EFECTIVO');
                if (checkTransferencia) checkTransferencia.checked = metodos.includes('TRANSFERENCIA');
                if (checkTarjeta) checkTarjeta.checked = metodos.includes('TARJETA');

                // ✅ TIPOS DE VEHÍCULOS: Cargar checkboxes (CORREGIDO)
                const tiposVehiculos = t.tiposVehiculos || [];
                const checkAuto = document.getElementById('config-vehiculo-auto');
                const checkCamioneta = document.getElementById('config-vehiculo-camioneta');
                const checkMoto = document.getElementById('config-vehiculo-moto');
                const checkCamion = document.getElementById('config-vehiculo-camion');
                const checkBus = document.getElementById('config-vehiculo-bus');
                const checkOtro = document.getElementById('config-vehiculo-otro');

                if (checkAuto) checkAuto.checked = tiposVehiculos.includes('AUTO');
                if (checkCamioneta) checkCamioneta.checked = tiposVehiculos.includes('CAMIONETA');
                if (checkMoto) checkMoto.checked = tiposVehiculos.includes('MOTO');
                if (checkCamion) checkCamion.checked = tiposVehiculos.includes('CAMION');
                if (checkBus) checkBus.checked = tiposVehiculos.includes('BUS');
                if (checkOtro) checkOtro.checked = tiposVehiculos.includes('OTRO');
                console.log('🚗 Tipos de vehículos cargados:', tiposVehiculos);

                // ✅ COLOR: Cargar color del taller
                const colorInput = document.getElementById('config-color');
                if (colorInput) {
                    const colorTaller = t.color || '#00ff88';
                    colorInput.value = colorTaller;
                    this.actualizarPreviewColor(colorTaller);
                    console.log('🎨 Color cargado:', colorTaller);
                }

                // ✅ Vista previa del nombre
                const previewNombre = document.getElementById('preview-color-nombre');
                if (previewNombre) {
                    previewNombre.textContent = t.nombre || 'Mi Taller';
                }

                // Dirección
                document.getElementById('config-calle').value = t.direccion?.calle || '';
                document.getElementById('config-ciudad').value = t.direccion?.ciudad || '';
                document.getElementById('config-provincia').value = t.direccion?.provincia || '';

                // Renderizar horarios dinámicamente
                this.renderizarHorarios(t.horario || {});

                // Coordenadas
                if (t.direccion?.coordenadas?.lat) {
                    document.getElementById('config-lat').value = t.direccion.coordenadas.lat;
                    document.getElementById('config-lng').value = t.direccion.coordenadas.lng;
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }
    // ================================================================
    // 🔹 COLOR (NUEVO)
    // ================================================================

    /**
     * ✅ Actualizar vista previa del color (NUEVO)
     *    Cambia los colores de la tarjeta de vista previa en tiempo real
     *    Convierte el color hex a rgba para fondos semitransparentes
     * @param {string} color - Color en formato hex (#00ff88)
     */
    actualizarPreviewColor(color) {
        const card = document.getElementById('preview-color-card');
        const avatar = document.getElementById('preview-color-avatar');
        const badge = document.getElementById('preview-color-badge');

        if (!card || !avatar || !badge) {
            console.warn('⚠️ Elementos de vista previa no encontrados');
            return;
        }

        // ✅ Convertir hex a rgba para fondos semitransparentes
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // ✅ Aplicar colores a la vista previa
        card.style.borderColor = color;
        avatar.style.borderColor = color;
        avatar.style.background = `rgba(${r}, ${g}, ${b}, 0.08)`;
        badge.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
        badge.style.color = color;

        console.log('🎨 Vista previa actualizada:', color);
    }

    // ================================================================
    // 🔹 LOGO
    // ================================================================

    /**
     * Previsualizar logo seleccionado
     */
    previewLogo(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('⚠️ La imagen es muy grande. Máximo 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('preview-logo-taller');
            const placeholder = document.getElementById('logo-placeholder');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
            // Guardar temporalmente para enviar al guardar
            this.logoTemporal = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Subir logo al servidor
     */
    async subirLogo() {
        if (!this.logoTemporal) return null;

        try {
            // ✅ Convertir Data URL a Blob SIN fetch (evita el bug)
            const blob = this.dataURLtoBlob(this.logoTemporal);

            const formData = new FormData();
            formData.append('imagen', blob, 'logo-taller.jpg');

            console.log('📤 Subiendo logo (tamaño:', (blob.size / 1024).toFixed(1), 'KB)');

            const uploadResponse = await apiFetch(`/upload/imagen`, {
                method: 'POST',
                body: formData
            });

            const data = await uploadResponse.json();
            console.log('📥 Respuesta upload:', data);

            return data.exito ? data.url : null;
        } catch (error) {
            console.error('❌ Error al subir logo:', error);
            return null;
        }
    }

    /**
     * ✅ Convertir Data URL a Blob sin usar fetch
     */
    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], { type: mime });
    }
    // ================================================================
    // 🔹 GUARDAR CONFIGURACIÓN
    // ================================================================

    /**
     * Guardar toda la configuración del taller
     */
    async guardar() {

        // Validar que tallerActual existe
        if (!this.tallerActual || !this.tallerActual._id) {
            console.error('❌ No hay taller cargado.');
            alert('⚠️ Error: No se ha cargado la información del taller. Recarga la página.');
            return false;
        }

        const nombre = document.getElementById('config-nombre')?.value?.trim();

        if (!nombre) {
            alert('⚠️ El nombre del taller es requerido');
            return false;
        }

        // Descripción
        const descEl = document.getElementById('config-descripcion');
        const descripcionVal = descEl?.value?.trim() || '';
        console.log('🔍 DEBUG - Descripción:', descripcionVal || '(vacía)');

        // Métodos de pago
        const checkEfectivo = document.getElementById('config-pago-efectivo');
        const checkTransferencia = document.getElementById('config-pago-transferencia');
        const checkTarjeta = document.getElementById('config-pago-tarjeta');
        console.log('🔍 DEBUG - Efectivo:', checkEfectivo?.checked);
        console.log('🔍 DEBUG - Transferencia:', checkTransferencia?.checked);
        console.log('🔍 DEBUG - Tarjeta:', checkTarjeta?.checked);

        const metodosPago = [];
        if (checkEfectivo?.checked) metodosPago.push('EFECTIVO');
        if (checkTransferencia?.checked) metodosPago.push('TRANSFERENCIA');
        if (checkTarjeta?.checked) metodosPago.push('TARJETA');
        console.log('💳 DEBUG - Métodos recogidos:', metodosPago);

        // ✅ Recoger tipos de vehículos (CORREGIDO - con log)
        const tiposVehiculos = [];
        if (document.getElementById('config-vehiculo-auto')?.checked) tiposVehiculos.push('AUTO');
        if (document.getElementById('config-vehiculo-camioneta')?.checked) tiposVehiculos.push('CAMIONETA');
        if (document.getElementById('config-vehiculo-moto')?.checked) tiposVehiculos.push('MOTO');
        if (document.getElementById('config-vehiculo-camion')?.checked) tiposVehiculos.push('CAMION');
        if (document.getElementById('config-vehiculo-bus')?.checked) tiposVehiculos.push('BUS');
        if (document.getElementById('config-vehiculo-otro')?.checked) tiposVehiculos.push('OTRO');
        console.log('🚗 DEBUG - Tipos vehículos recogidos:', tiposVehiculos);

        // Color
        const colorTaller = document.getElementById('config-color')?.value || '#00ff88';
        console.log('🎨 DEBUG - Color:', colorTaller);

        // Subir logo si hay uno nuevo
        let logoUrl = null;
        if (this.logoTemporal) {
            console.log('📤 Subiendo logo al servidor...');
            logoUrl = await this.subirLogo();
            console.log('📥 Logo subido:', logoUrl || 'FALLÓ');
        }

        // Construir objeto de datos
        const datos = {
            nombre: nombre,
            email: document.getElementById('config-email')?.value?.trim() || '',
            telefono: document.getElementById('config-telefono')?.value?.trim() || '',
            especialidad: document.getElementById('config-especialidad')?.value || 'GENERAL',
            logo: logoUrl || this.tallerActual?.logo || null,
            descripcion: descripcionVal,
            metodosPago: metodosPago,
            tiposVehiculos: tiposVehiculos,  // ✅ Enviar tipos de vehículos
            color: colorTaller,
            direccion: {
                calle: document.getElementById('config-calle')?.value?.trim() || '',
                ciudad: document.getElementById('config-ciudad')?.value?.trim() || '',
                provincia: document.getElementById('config-provincia')?.value?.trim() || '',
                coordenadas: {
                    lat: parseFloat(document.getElementById('config-lat')?.value) || null,
                    lng: parseFloat(document.getElementById('config-lng')?.value) || null
                }
            },
            horario: {}
        };

        // Recoger horarios
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        dias.forEach(dia => {
            datos.horario[dia] = {
                apertura: document.getElementById(`config-${dia}-apertura`)?.value || '',
                cierre: document.getElementById(`config-${dia}-cierre`)?.value || ''
            };
        });

        console.log('📤 Enviando al servidor:', JSON.stringify(datos, null, 2));

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/configuracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            const data = await response.json();
            console.log('📥 Respuesta del servidor:', data);

            if (data.exito) {
                // Actualizar el objeto tallerActual en memoria
                this.tallerActual = { ...this.tallerActual, ...datos };
                this.logoTemporal = null;

                // ACTUALIZAR LOGO EN SIDEBAR
                const sidebarLogo = document.getElementById('sidebar-taller-logo');
                const sidebarIcon = document.getElementById('sidebar-taller-icon');

                if (datos.logo && sidebarLogo) {
                    sidebarLogo.src = datos.logo;
                    sidebarLogo.style.display = 'block';
                    if (sidebarIcon) sidebarIcon.style.display = 'none';
                } else if (sidebarLogo) {
                    sidebarLogo.style.display = 'none';
                    if (sidebarIcon) sidebarIcon.style.display = 'block';
                }

                // Aplicar color al sidebar
                if (typeof window.aplicarColorTaller === 'function') {
                    window.aplicarColorTaller(datos.color);
                }

                // Actualizar nombre en sidebar
                document.getElementById('sidebar-taller-name').textContent = nombre;

                // ✅ Sincronizar con localStorage (ACTUALIZADO con tiposVehiculos)
                const sesion = JSON.parse(localStorage.getItem('taller_sesion') || '{}');
                sesion.nombre = nombre;
                sesion.logo = datos.logo;
                sesion.descripcion = datos.descripcion;
                sesion.metodosPago = datos.metodosPago;
                sesion.tiposVehiculos = datos.tiposVehiculos;  // ✅ Guardar en sesión
                sesion.color = datos.color;
                sesion.direccion = datos.direccion;
                sesion.horario = datos.horario;
                localStorage.setItem('taller_sesion', JSON.stringify(sesion));
                console.log('✅ Sesión actualizada en localStorage');

                if (typeof window.mostrarToast === 'function') {
                    window.mostrarToast('✅ Configuración guardada exitosamente', 'success');
                } else {
                    console.log('✅ Configuración guardada exitosamente');
                }
                return true;
            } else {
                alert('❌ ' + (data.mensaje || 'Error al guardar'));
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión');
            return false;
        }
    }

    // ================================================================
    // 🔹 HORARIOS
    // ================================================================

    /**
     * Renderizar los inputs de horarios dinámicamente
     */
    renderizarHorarios(horarioGuardado = {}) {
        const container = document.getElementById('horarios-container');
        if (!container) return;

        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        container.innerHTML = dias.map(dia => {
            const key = dia.toLowerCase();
            const apertura = horarioGuardado[key]?.apertura || '08:00';
            const cierre = horarioGuardado[key]?.cierre || '18:00';
            const abierto = horarioGuardado[key]?.apertura ? 'checked' : (key === 'domingo' ? '' : 'checked');
            const disabled = !horarioGuardado[key]?.apertura && key === 'domingo' ? 'disabled' : '';

            return `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 60px; gap:8px; margin-bottom:8px; align-items:center;">
            <span style="color:#fff; font-size:0.85rem;">${dia}</span>
            <input type="time" id="config-${key}-apertura" value="${apertura}" ${disabled}
                style="padding:8px; background:#080c14; border:1px solid #1e2a3a; border-radius:6px; color:#fff; font-size:0.8rem;">
            <input type="time" id="config-${key}-cierre" value="${cierre}" ${disabled}
                style="padding:8px; background:#080c14; border:1px solid #1e2a3a; border-radius:6px; color:#fff; font-size:0.8rem;">
            <label style="display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <input type="checkbox" id="config-${key}-abierto" ${abierto}
                    onchange="var a=document.getElementById('config-${key}-apertura');var c=document.getElementById('config-${key}-cierre');a.disabled=!this.checked;c.disabled=!this.checked;">
            </label>
        </div>`;
        }).join('');
    }
}

export default ConfiguracionTaller;