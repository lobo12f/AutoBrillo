// ====================================================================
// 🗺️ MAPA DE CONFIGURACIÓN DEL TALLER - Leaflet + OpenStreetMap
// ====================================================================
import { apiFetch } from '../api-client.js';
export class MapaConfigTaller {

    constructor(apiUrl) {
        this.API_URL = apiUrl;
        this.mapa = null;
        this.marcador = null;
        this.tallerActual = null;
    }

    // ================================================================
    // 🔹 INICIALIZAR
    // ================================================================

    async inicializar(tallerActual) {
        this.tallerActual = tallerActual;
        await this.cargarDatosTaller();
        setTimeout(() => this.crearMapa(), 500);
    }

    async cargarDatosTaller() {
        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}`);
            const data = await response.json();
            if (data.exito && data.taller) {
                const t = data.taller;
                document.getElementById('config-nombre').value = t.nombre || '';
                if (t.direccion?.coordenadas?.lat) {
                    document.getElementById('config-lat').value = t.direccion.coordenadas.lat;
                    document.getElementById('config-lng').value = t.direccion.coordenadas.lng;
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // ================================================================
    // 🔹 CREAR MAPA
    // ================================================================

    crearMapa() {
        const container = document.getElementById('mapa-config-taller');
        if (!container) return;

        // Destruir mapa anterior si existe
        if (this.mapa) {
            this.mapa.remove();
            this.mapa = null;
        }

        const lat = parseFloat(document.getElementById('config-lat')?.value) || 18.4605;
        const lng = parseFloat(document.getElementById('config-lng')?.value) || -69.3085;

        // Crear mapa
        this.mapa = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([lat, lng], 17);

        // ✅ Capa de calles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.mapa);

        // Marcador arrastrable con icono personalizado
        this.marcador = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({
                html: `
                <div style="
                    background: #ffbb33;
                    color: #000;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                    border: 3px solid #000;
                    box-shadow: 0 0 25px rgba(255,187,51,0.6);
                    animation: pulse-marker 2s infinite;
                ">🏪</div>`,
                className: '',
                iconSize: [44, 44],
                iconAnchor: [22, 44],
                popupAnchor: [0, -44]
            })
        }).addTo(this.mapa);

        // Popup informativo
        this.marcador.bindPopup(`
            <div style="font-family:Inter,sans-serif;text-align:center;padding:5px;">
                <strong style="color:#000;">🏪 ${this.tallerActual?.nombre || 'Mi Taller'}</strong><br>
                <small style="color:#666;">Arrastra el marcador a tu ubicación exacta</small>
            </div>
        `).openPopup();

        // Eventos
        this.marcador.on('dragend', () => this.actualizarCoordenadas());
        this.mapa.on('click', (e) => {
            this.marcador.setLatLng(e.latlng);
            this.actualizarCoordenadas();
        });

        // Actualizar inputs iniciales
        this.actualizarCoordenadas();

        // Agregar botones
        this.agregarBotonBusqueda();
        this.agregarBotonCentrar();

        // Buscar dirección si no hay coordenadas guardadas
        if (lat === 18.4605 && lng === -69.3085) {
            this.buscarDireccionActual();
        }

        // Forzar redibujar
        setTimeout(() => this.mapa.invalidateSize(), 300);
    }

    // ================================================================
    // 🔹 ACTUALIZAR COORDENADAS
    // ================================================================

    actualizarCoordenadas() {
        const pos = this.marcador.getLatLng();
        document.getElementById('config-lat').value = pos.lat.toFixed(6);
        document.getElementById('config-lng').value = pos.lng.toFixed(6);
        this.reverseGeocodificar(pos.lat, pos.lng);
    }

    // ================================================================
    // 🔹 GEOCODIFICACIÓN (OpenStreetMap - GRATIS)
    // ================================================================

    /**
     ✅ Reverse geocoding: coordenadas → dirección
     */
    async reverseGeocodificar(lat, lng) {
        try {
            // ✅ URL CORRECTA de OpenStreetMap (gratis, sin API key)
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`;

            const response = await apifetch(url);
            const data = await response.json();

            if (data && data.display_name) {
                const dirEl = document.getElementById('config-direccion-detectada');
                if (dirEl) {
                    dirEl.innerHTML = `📍 <strong>Dirección detectada:</strong><br>${data.display_name}`;
                    dirEl.style.color = '#00ff88';
                    dirEl.style.fontSize = '0.85rem';
                }
            }
        } catch (error) {
            console.warn('⚠️ Error en reverse geocoding:', error.message);
        }
    }

    /**
     ✅ Buscar dirección → coordenadas
     */
    async buscarDireccionActual() {
        const direccion = this.tallerActual?.direccion;
        if (!direccion) return;

        const dirCompleta = `${direccion.calle || ''}, ${direccion.ciudad || ''}, ${direccion.provincia || ''}`;
        if (dirCompleta.trim().length < 5) return;

        try {
            // ✅ URL CORRECTA de OpenStreetMap
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dirCompleta)}&limit=1&accept-language=es`;

            const response = await apifetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                this.marcador.setLatLng([lat, lng]);
                this.mapa.setView([lat, lng], 17);
                this.actualizarCoordenadas();
            }
        } catch (error) {
            console.warn('⚠️ Error en geocodificación:', error.message);
        }
    }

    // ================================================================
    // 🔹 BOTONES
    // ================================================================

    agregarBotonBusqueda() {
        // Eliminar botón anterior si existe
        const anterior = document.getElementById('btn-buscar-mapa');
        if (anterior) anterior.remove();

        const btnBuscar = document.createElement('button');
        btnBuscar.id = 'btn-buscar-mapa';
        btnBuscar.innerHTML = '🔍 Buscar dirección';
        btnBuscar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1000;
            background: #131c2b;
            color: #00ff88;
            border: 1px solid #00ff88;
            border-radius: 8px;
            padding: 10px 15px;
            cursor: pointer;
            font-size: 0.8rem;
            font-family: Inter, sans-serif;
            transition: all 0.3s;
        `;

        btnBuscar.addEventListener('click', () => {
            const direccion = prompt('🏪 Ingresa la dirección de tu taller:',
                `${this.tallerActual?.direccion?.calle || ''}, ${this.tallerActual?.direccion?.ciudad || ''}`);

            if (direccion) {
                // ✅ Usar OpenStreetMap directamente
                apifetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&accept-language=es`)
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const lat = parseFloat(data[0].lat);
                            const lng = parseFloat(data[0].lon);
                            this.marcador.setLatLng([lat, lng]);
                            this.mapa.setView([lat, lng], 18);
                            this.actualizarCoordenadas();
                        } else {
                            alert('⚠️ No se encontró la dirección. Intenta con más detalles (ciudad, provincia).');
                        }
                    })
                    .catch(() => alert('❌ Error al buscar la dirección'));
            }
        });

        const container = document.getElementById('mapa-config-taller');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(btnBuscar);
        }
    }

    agregarBotonCentrar() {
        const anterior = document.getElementById('btn-centrar-mapa');
        if (anterior) anterior.remove();

        const btnCentrar = document.createElement('button');
        btnCentrar.id = 'btn-centrar-mapa';
        btnCentrar.innerHTML = '📍 Centrar';
        btnCentrar.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: #131c2b;
            color: #ffbb33;
            border: 1px solid #ffbb33;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.8rem;
            font-family: Inter, sans-serif;
        `;

        btnCentrar.addEventListener('click', () => {
            const pos = this.marcador.getLatLng();
            this.mapa.setView([pos.lat, pos.lng], 18);
        });

        const container = document.getElementById('mapa-config-taller');
        if (container) {
            container.appendChild(btnCentrar);
        }
    }

    // ================================================================
    // 🔹 GUARDAR
    // ================================================================

    async guardar() {
        const lat = parseFloat(document.getElementById('config-lat').value);
        const lng = parseFloat(document.getElementById('config-lng').value);

        if (!lat || !lng) {
            alert('⚠️ Selecciona una ubicación en el mapa');
            return false;
        }

        try {
            const response = await apiFetch(`/talleres/${this.tallerActual._id}/coordenadas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng })
            });
            const data = await response.json();
            if (data.exito) {
                alert('✅ Ubicación guardada exitosamente');
                return true;
            } else {
                alert('❌ ' + (data.mensaje || 'Error'));
            }
        } catch (error) {
            alert('❌ Error de conexión');
        }
        return false;
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    destruir() {
        if (this.mapa) {
            this.mapa.remove();
            this.mapa = null;
            this.marcador = null;
        }
    }
}

export default MapaConfigTaller;