// ====================================================================
// 🗺️ MAPA INTERACTIVO DEL TALLER - Leaflet + OpenStreetMap
// ====================================================================
import { apiFetch } from '../api-client.js';
export class MapaTaller {

    constructor() {
        this.mapasActivos = {};
        this.coordenadasCache = {};
        this.ubicacionCliente = null; // ✅ Guardar ubicación del cliente
    }

    // ================================================================
    // 🔹 OBTENER UBICACIÓN DEL CLIENTE
    // ================================================================

    /**
     * Obtener ubicación actual del cliente
     */
    /**
   * Obtener ubicación actual del cliente con máxima precisión
   */
    obtenerUbicacionCliente() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                // ✅ Fallback: Intentar obtener ubicación por IP
                this.obtenerUbicacionPorIP().then(resolve).catch(reject);
                return;
            }

            // ✅ Intentar GPS primero
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const precision = position.coords.accuracy; // Precisión en metros

                    console.log(`📍 GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (precisión: ${precision}m)`);

                    // Si la precisión es muy mala (> 500m), intentar IP como respaldo
                    if (precision > 500) {
                        console.warn('⚠️ GPS impreciso, intentando IP...');
                        this.obtenerUbicacionPorIP()
                            .then(coords => {
                                // Usar el promedio de GPS e IP
                                this.ubicacionCliente = {
                                    lat: (lat + coords.lat) / 2,
                                    lng: (lng + coords.lng) / 2
                                };
                                resolve(this.ubicacionCliente);
                            })
                            .catch(() => {
                                this.ubicacionCliente = { lat, lng };
                                resolve(this.ubicacionCliente);
                            });
                    } else {
                        this.ubicacionCliente = { lat, lng };
                        resolve(this.ubicacionCliente);
                    }
                },
                (error) => {
                    console.warn('⚠️ GPS falló:', error.message);
                    // Fallback a IP
                    this.obtenerUbicacionPorIP().then(resolve).catch(() => {
                        reject(new Error('No se pudo obtener ubicación'));
                    });
                },
                {
                    enableHighAccuracy: true,  // ✅ Máxima precisión
                    timeout: 15000,            // 15 segundos de espera
                    maximumAge: 0              // No usar caché, siempre fresca
                }
            );
        });
    }

    /**
     * Obtener ubicación por IP (fallback)
     */
    async obtenerUbicacionPorIP() {
        try {
            // Usar múltiples servicios para mejor precisión
            const [resp1, resp2] = await Promise.allSettled([
                fetch('https://ipapi.co/json/'),
                fetch('https://ipinfo.io/json')
            ]);

            let lat = null, lng = null;
            let count = 0;

            // Servicio 1: ipapi.co
            if (resp1.status === 'fulfilled') {
                const data = await resp1.value.json();
                if (data.latitude && data.longitude) {
                    lat = (lat || 0) + data.latitude;
                    lng = (lng || 0) + data.longitude;
                    count++;
                    console.log('📍 ipapi.co:', data.city, data.region);
                }
            }

            // Servicio 2: ipinfo.io
            if (resp2.status === 'fulfilled') {
                const data = await resp2.value.json();
                if (data.loc) {
                    const [lat2, lng2] = data.loc.split(',').map(Number);
                    lat = (lat || 0) + lat2;
                    lng = (lng || 0) + lng2;
                    count++;
                    console.log('📍 ipinfo.io:', data.city, data.region);
                }
            }

            if (count > 0) {
                const coords = {
                    lat: lat / count,
                    lng: lng / count
                };
                console.log('📍 Ubicación IP (promedio):', coords);
                return coords;
            }
        } catch (error) {
            console.warn('Error al obtener ubicación por IP:', error);
        }

        // Si todo falla, usar ubicación por defecto (San Pedro de Macorís)
        const coordsDefault = { lat: 18.4605, lng: -69.3085 };
        console.log('📍 Usando ubicación por defecto:', coordsDefault);
        return coordsDefault;
    }


    /**
 * Permitir al cliente buscar su ubicación por dirección
 */
    async buscarMiUbicacion(direccion) {
        if (!direccion || direccion.trim() === '') return null;

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                this.ubicacionCliente = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                console.log('📍 Ubicación manual encontrada:', data[0].display_name);
                return this.ubicacionCliente;
            }
        } catch (error) {
            console.warn('Error al buscar dirección:', error);
        }

        return null;
    }
    // ================================================================
    // 🔹 INICIALIZAR MAPA
    // ================================================================

    async inicializar(tallerId, direccion, nombre, coordenadasGuardadas = null) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const container = document.getElementById(`mapa-taller-${tallerId}`);
        if (!container || container.dataset.cargado) return;
        container.dataset.cargado = 'true';

        let lat, lng;
        let usarCoordenadasExactas = false;

        if (coordenadasGuardadas?.lat && coordenadasGuardadas?.lng) {
            lat = coordenadasGuardadas.lat;
            lng = coordenadasGuardadas.lng;
            usarCoordenadasExactas = true;
        } else {
            const coords = await this.geocodificar(direccion);
            lat = coords.lat;
            lng = coords.lng;
        }

        // ✅ Intentar obtener ubicación del cliente
        try {
            await this.obtenerUbicacionCliente();
        } catch (error) {
            this.ubicacionCliente = null;
        }

        // Limpiar placeholder y crear mapa
        container.innerHTML = '';
        this.crearMapa(container, lat, lng, nombre, direccion, tallerId, usarCoordenadasExactas);
    }

    // ================================================================
    // 🔹 GEOCODIFICACIÓN
    // ================================================================

    async geocodificar(direccion) {
        if (this.coordenadasCache[direccion]) {
            return this.coordenadasCache[direccion];
        }

        const coordsDefault = { lat: 18.4605, lng: -69.3085 };

        if (!direccion || direccion.length < 5) {
            return coordsDefault;
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=do`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                this.coordenadasCache[direccion] = coords;
                return coords;
            }
        } catch (error) {
            console.warn('⚠️ Error al geocodificar:', error.message);
        }

        return coordsDefault;
    }

    // ================================================================
    // 🔹 CREAR MAPA CON RUTA
    // ================================================================

    crearMapa(container, lat, lng, nombre, direccion, tallerId, esExacta = false) {
        if (this.mapasActivos[tallerId]) {
            this.mapasActivos[tallerId].remove();
        }

        const zoom = esExacta ? 16 : 14;

        const map = L.map(container, {
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: true
        }).setView([lat, lng], zoom);

        // Capa oscura
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        // ✅ Si tenemos ubicación del cliente, trazar ruta
        if (this.ubicacionCliente) {
            this.trazarRuta(map, this.ubicacionCliente, { lat, lng }, nombre);

            // Ajustar vista para mostrar ambos puntos
            const bounds = L.latLngBounds(
                [this.ubicacionCliente.lat, this.ubicacionCliente.lng],
                [lat, lng]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Marcador del taller
            const marcador = this.crearMarcador(lat, lng, nombre, direccion, esExacta, false);
            marcador.addTo(map);

            // Botón para obtener ubicación
            this.agregarBotonUbicacion(map, container, lat, lng, nombre, direccion, esExacta, tallerId);
        }

        // Control de zoom
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Botón expandir
        this.agregarBotonExpandir(map, container);

        if (esExacta) {
            const badge = document.createElement('div');
            badge.style.cssText = `
                position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
                background: rgba(0,255,136,0.9); color: #000; padding: 5px 15px;
                border-radius: 20px; font-size: 0.7rem; font-weight: 700; z-index: 1000;
            `;
            badge.textContent = '📍 Ubicación exacta';
            container.appendChild(badge);
        }

        this.mapasActivos[tallerId] = map;
        setTimeout(() => map.invalidateSize(), 300);
    }

    // ================================================================
    // 🔹 TRAZAR RUTA
    // ================================================================

    /**
     * Trazar ruta desde el cliente hasta el taller
     */
    async trazarRuta(map, origen, destino, nombreTaller) {
        // Marcador del cliente (origen)
        L.marker([origen.lat, origen.lng], {
            icon: L.divIcon({
                html: `
                    <div style="
                        background: #00d4ff;
                        color: #000;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        border: 3px solid #000;
                        box-shadow: 0 0 20px rgba(0,212,255,0.7);
                        animation: pulse 2s infinite;
                    ">📍</div>
                `,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 36]
            })
        }).addTo(map).bindPopup('<strong>📍 Tu ubicación</strong>');

        // Marcador del taller (destino)
        this.crearMarcador(destino.lat, destino.lng, nombreTaller, '', true, true).addTo(map);

        // ✅ Trazar línea de ruta (línea recta + intentar ruta real)
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes?.length > 0) {
                const ruta = data.routes[0];
                const distancia = (ruta.distance / 1000).toFixed(1);
                const duracion = Math.round(ruta.duration / 60);

                // Dibujar ruta
                const coordenadas = ruta.geometry.coordinates.map(c => [c[1], c[0]]);
                L.polyline(coordenadas, {
                    color: '#00ff88',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '10, 10'
                }).addTo(map);

                // Mostrar info de la ruta
                const infoRuta = document.createElement('div');
                infoRuta.style.cssText = `
                    position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.85); color: #fff; padding: 8px 15px;
                    border-radius: 20px; font-size: 0.75rem; z-index: 1000;
                    display: flex; gap: 15px;
                `;
                infoRuta.innerHTML = `
                    <span>📏 ${distancia} km</span>
                    <span>⏱️ ${duracion} min</span>
                `;
                map.getContainer().appendChild(infoRuta);
            }
        } catch (error) {
            // Si falla, dibujar línea recta
            L.polyline([[origen.lat, origen.lng], [destino.lat, destino.lng]], {
                color: '#00d4ff',
                weight: 2,
                opacity: 0.5,
                dashArray: '5, 10'
            }).addTo(map);

            // Calcular distancia en línea recta
            const distancia = this.calcularDistancia(origen.lat, origen.lng, destino.lat, destino.lng);

            const infoRuta = document.createElement('div');
            infoRuta.style.cssText = `
                position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
                background: rgba(0,0,0,0.85); color: #fff; padding: 8px 15px;
                border-radius: 20px; font-size: 0.75rem; z-index: 1000;
            `;
            infoRuta.innerHTML = `<span>📏 ~${distancia.toFixed(1)} km (línea recta)</span>`;
            map.getContainer().appendChild(infoRuta);
        }
    }

    /**
     * Calcular distancia entre dos puntos (fórmula Haversine)
     */
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ================================================================
    // 🔹 BOTÓN OBTENER UBICACIÓN
    // ================================================================

    agregarBotonUbicacion(map, container, lat, lng, nombre, direccion, esExacta, tallerId) {
        const btn = document.createElement('button');
        btn.innerHTML = '📍 Mi ubicación';
        btn.title = 'Usar mi ubicación actual para trazar ruta';
        btn.style.cssText = `
            position: absolute; bottom: 50px; left: 10px; z-index: 1000;
            background: rgba(0,212,255,0.9); color: #000; border: none;
            border-radius: 20px; padding: 8px 15px; cursor: pointer;
            font-size: 0.75rem; font-weight: 600;
            transition: all 0.3s;
        `;

        btn.addEventListener('mouseover', () => {
            btn.style.background = '#00ff88';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.background = 'rgba(0,212,255,0.9)';
        });

        btn.addEventListener('click', async () => {
            btn.textContent = '⏳ Obteniendo...';
            btn.disabled = true;

            try {
                await this.obtenerUbicacionCliente();
                if (this.ubicacionCliente) {
                    // Redibujar el mapa con la ruta
                    container.innerHTML = '';
                    this.crearMapa(container, lat, lng, nombre, direccion, tallerId, esExacta);
                }
            } catch (error) {
                alert('⚠️ No se pudo obtener tu ubicación. Verifica los permisos de GPS.');
                btn.textContent = '📍 Mi ubicación';
                btn.disabled = false;
            }
        });

        container.appendChild(btn);
    }

    // ================================================================
    // 🔹 MARCADOR
    // ================================================================

    crearMarcador(lat, lng, nombre, direccion, esExacta, esDestino = false) {
        const color = esExacta ? '#00ff88' : '#ffbb33';

        const icono = L.divIcon({
            html: `
                <div style="
                    background: ${color};
                    color: #000;
                    width: ${esDestino ? '44' : '44'}px;
                    height: ${esDestino ? '44' : '44'}px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                    border: 3px solid #000;
                    box-shadow: 0 0 25px ${color}66;
                    animation: pulse 2s infinite;
                ">🏪</div>
            `,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 44],
            popupAnchor: [0, -44]
        });

        const marker = L.marker([lat, lng], { icon: icono });

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

        marker.bindPopup(`
            <div style="font-family:Inter, sans-serif; padding:5px; min-width:180px;">
                <strong>${nombre || 'Taller'}</strong><br>
                <small style="color:#666;">${direccion}</small>
                <div style="margin-top:8px; display:flex; gap:6px;">
                    <a href="${googleMapsUrl}" target="_blank" 
                        style="flex:1; background:#00ff88; color:#000; padding:8px; border-radius:6px; text-decoration:none; font-size:0.75rem; font-weight:600; text-align:center;">🗺️ Maps</a>
                    <a href="${wazeUrl}" target="_blank" 
                        style="flex:1; background:#33CCFF; color:#000; padding:8px; border-radius:6px; text-decoration:none; font-size:0.75rem; font-weight:600; text-align:center;">🚗 Waze</a>
                </div>
            </div>
        `);

        return marker;
    }

    // ================================================================
    // 🔹 BOTÓN EXPANDIR
    // ================================================================

    agregarBotonExpandir(map, container) {
        const btn = document.createElement('button');
        btn.innerHTML = '🔍';
        btn.title = 'Expandir mapa';
        btn.style.cssText = `
            position: absolute; top: 10px; right: 10px; z-index: 1000;
            background: rgba(0,0,0,0.7); color: #fff; border: 1px solid #444;
            border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 1rem;
        `;

        let expandido = false;
        btn.addEventListener('click', () => {
            expandido = !expandido;
            container.style.height = expandido ? '500px' : '300px';
            setTimeout(() => map.invalidateSize(), 300);
        });

        container.appendChild(btn);
    }

    // ================================================================
    // 🔹 UTILIDADES
    // ================================================================

    destruir(tallerId) {
        if (this.mapasActivos[tallerId]) {
            this.mapasActivos[tallerId].remove();
            delete this.mapasActivos[tallerId];
        }
    }

    destruirTodos() {
        Object.keys(this.mapasActivos).forEach(id => {
            this.mapasActivos[id]?.remove();
        });
        this.mapasActivos = {};
    }
}

export default MapaTaller;