#!/bin/bash
# ============================================================
# CREAR CSS FALTANTES - AUTOBRILLO
# Crea 9 archivos CSS para páginas específicas
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}   📝 CREANDO CSS FALTANTES${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Crear carpetas
mkdir -p css/pages/taller
mkdir -p css/pages/empleado
mkdir -p css/pages/cliente

# ============================================================
# 1. TALLER: bahias.css
# ============================================================
if [ ! -f "css/pages/taller/bahias.css" ]; then
    cat > css/pages/taller/bahias.css << 'EOF'
/* ============================================================================
   TALLER - BAHÍAS
   ============================================================================ */

.bahias-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-md);
}

.bahia-card {
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    text-align: center;
    transition: var(--transition);
    cursor: pointer;
}

.bahia-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}

.bahia-card.disponible {
    border-color: var(--accent-color);
    background: rgba(var(--accent-color-rgb), 0.03);
}

.bahia-card.ocupada {
    border-color: var(--color-warning);
    background: rgba(var(--color-warning-rgb), 0.05);
}

.bahia-card.mantenimiento {
    border-color: var(--color-danger);
    background: rgba(var(--color-danger-rgb), 0.05);
}

.bahia-numero {
    font-size: var(--font-size-5xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-xs);
}

.bahia-card.disponible .bahia-numero { color: var(--accent-color); }
.bahia-card.ocupada .bahia-numero { color: var(--color-warning); }
.bahia-card.mantenimiento .bahia-numero { color: var(--color-danger); }

.bahia-estado {
    font-size: var(--font-size-base);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    color: var(--text-secondary);
}

.bahia-empleado {
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    margin-top: var(--space-sm);
}

/* Card de bahía en panel principal */
.bahia-panel-card {
    background: rgba(255, 255, 255, 0.02);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    transition: var(--transition);
    cursor: pointer;
}

.bahia-panel-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-color);
}

/* Admin grid */
.bahias-admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-lg);
}

.bahia-admin-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    transition: var(--transition);
}

.bahia-admin-card:hover {
    border-color: var(--accent-color);
}

.bahia-admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
}

.bahia-admin-estado {
    padding: 5px 10px;
    border-radius: var(--radius-pill);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
    .bahias-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 480px) {
    .bahias-grid { grid-template-columns: 1fr; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/bahias.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/bahias.css"
fi

# ============================================================
# 2. TALLER: empleados.css
# ============================================================
if [ ! -f "css/pages/taller/empleados.css" ]; then
    cat > css/pages/taller/empleados.css << 'EOF'
/* ============================================================================
   TALLER - EMPLEADOS Y COMISIONES
   ============================================================================ */

.empleados-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-md);
    width: 100%;
}

.empleado-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
}

.empleado-card:hover {
    border-color: var(--accent-color);
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}

.empleado-avatar {
    font-size: var(--font-size-5xl);
    text-align: center;
    margin-bottom: var(--space-sm);
}

.empleado-avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto var(--space-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-5xl);
    background: var(--accent-bg);
    border: 2px solid var(--accent-color);
    overflow: hidden;
    transition: var(--transition);
}

.empleado-avatar-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.empleado-card:hover .empleado-avatar-circle {
    transform: scale(1.1);
    box-shadow: 0 0 25px var(--accent-glow);
}

.empleado-nombre {
    font-weight: var(--font-weight-semibold);
    text-align: center;
    margin-bottom: var(--space-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
}

.empleado-rol {
    text-align: center;
    font-size: var(--font-size-base);
    color: var(--accent-color);
    margin-bottom: var(--space-sm);
}

.empleado-estado {
    text-align: center;
    font-size: var(--font-size-base);
    padding: 5px 10px;
    border-radius: var(--radius-pill);
    display: inline-block;
    width: 100%;
}

/* Tabla de comisiones */
#tabla-empleados-rendimiento {
    width: 100%;
    border-collapse: collapse;
}

#tabla-empleados-rendimiento th {
    padding: var(--space-md);
    text-align: left;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    border-bottom: 2px solid var(--border-color);
    background: var(--bg-secondary);
}

#tabla-empleados-rendimiento td {
    padding: var(--space-md);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    border-bottom: 1px solid var(--border-color);
}

#tabla-empleados-rendimiento tbody tr {
    transition: var(--transition-fast);
}

#tabla-empleados-rendimiento tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
}

@media (max-width: 768px) {
    .empleados-grid { grid-template-columns: 1fr; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/empleados.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/empleados.css"
fi

# ============================================================
# 3. TALLER: historial.css
# ============================================================
if [ ! -f "css/pages/taller/historial.css" ]; then
    cat > css/pages/taller/historial.css << 'EOF'
/* ============================================================================
   TALLER - HISTORIAL, PAGOS, RENDIMIENTO
   ============================================================================ */

#stats-historial {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
}

#tabla-historial,
#tabla-pagos {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-card);
}

#tabla-historial th,
#tabla-pagos th {
    padding: var(--space-md);
    text-align: left;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    border-bottom: 2px solid var(--border-color);
    background: var(--bg-secondary);
    font-weight: var(--font-weight-semibold);
}

#tabla-historial td,
#tabla-pagos td {
    padding: var(--space-md);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    border-bottom: 1px solid var(--border-color);
}

#tabla-historial tbody tr,
#tabla-pagos tbody tr {
    transition: var(--transition-fast);
}

#tabla-historial tbody tr:hover,
#tabla-pagos tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
}

#paginacion-historial {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
}

#resumen-pagos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
}

#rendimiento-mensual {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-3xl);
}

/* Filtros de historial */
.filtros-row {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    background: var(--bg-card);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    margin-bottom: var(--space-lg);
    align-items: center;
}

.filtro-select,
.filtro-input {
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    font-family: var(--font-family);
    transition: var(--transition);
}

.filtro-select:focus,
.filtro-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-glow);
}

.filtro-input--flex {
    flex: 1;
    min-width: 200px;
}

/* Historial row hover con transformación */
.historial-row {
    transition: all var(--transition-base) !important;
}

.historial-row:hover {
    background: rgba(var(--accent-color-rgb), 0.05) !important;
    transform: scale(1.005);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 900px) {
    #tabla-historial,
    #tabla-pagos {
        font-size: var(--font-size-sm);
    }
    
    #tabla-historial th,
    #tabla-historial td,
    #tabla-pagos th,
    #tabla-pagos td {
        padding: var(--space-sm);
    }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/historial.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/historial.css"
fi

# ============================================================
# 4. TALLER: galeria.css
# ============================================================
if [ ! -f "css/pages/taller/galeria.css" ]; then
    cat > css/pages/taller/galeria.css << 'EOF'
/* ============================================================================
   TALLER - GALERÍA (Estilo Instagram/Masonry)
   ============================================================================ */

#galeria-taller-grid {
    columns: 4 250px;
    column-gap: var(--space-md);
}

.galeria-item-taller {
    break-inside: avoid;
    margin-bottom: var(--space-md);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    transition: var(--transition);
    cursor: pointer;
    position: relative;
}

.galeria-item-taller:hover {
    border-color: var(--accent-color);
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
}

.galeria-item-taller img {
    width: 100%;
    display: block;
    transition: transform var(--transition-base);
}

.galeria-item-taller:hover img {
    transform: scale(1.05);
}

.galeria-item-info {
    padding: var(--space-md);
}

.galeria-item-info h4 {
    color: var(--text-primary);
    font-size: var(--font-size-base);
    margin: 0 0 var(--space-xs);
    font-weight: var(--font-weight-semibold);
}

.galeria-item-info p {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
    margin: 0;
    line-height: 1.5;
}

/* Botón expandir sobre la imagen */
.btn-expandir-galeria {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    cursor: pointer;
    font-size: var(--font-size-sm);
    opacity: 0;
    transition: var(--transition);
}

.galeria-item-taller:hover .btn-expandir-galeria {
    opacity: 1;
}

/* Filtros de galería */
.btn-filtro-galeria {
    padding: 8px 18px;
    background: transparent;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-pill);
    color: var(--text-secondary);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
    transition: var(--transition);
    font-family: var(--font-family);
}

.btn-filtro-galeria:hover,
.btn-filtro-galeria.active {
    border-color: var(--accent-color);
    color: var(--accent-color);
    background: var(--accent-bg);
}

/* Estado vacío */
.empty-galeria {
    column-span: all;
    text-align: center;
    padding: 80px var(--space-xl);
    color: var(--text-muted);
}

.empty-galeria .icon {
    font-size: 5rem;
    display: block;
    margin-bottom: var(--space-lg);
    opacity: 0.5;
}

@media (max-width: 900px) {
    #galeria-taller-grid { columns: 2 250px; }
}

@media (max-width: 600px) {
    #galeria-taller-grid { columns: 1; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/galeria.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/galeria.css"
fi

# ============================================================
# 5. TALLER: configuracion.css
# ============================================================
if [ ! -f "css/pages/taller/configuracion.css" ]; then
    cat > css/pages/taller/configuracion.css << 'EOF'
/* ============================================================================
   TALLER - CONFIGURACIÓN Y PERSONALIZACIÓN VISUAL
   ============================================================================ */

#configuracion .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xl);
}

#configuracion .form-group {
    margin-bottom: var(--space-xl);
}

#configuracion label {
    display: block;
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    margin-bottom: var(--space-xs);
    font-weight: var(--font-weight-semibold);
}

#configuracion input[type="text"],
#configuracion input[type="email"],
#configuracion input[type="tel"],
#configuracion input[type="password"],
#configuracion textarea,
#configuracion select {
    width: 100%;
    padding: 12px 15px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-family: var(--font-family);
    transition: var(--transition);
}

#configuracion input:focus,
#configuracion textarea:focus,
#configuracion select:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-glow);
}

#configuracion h3 {
    color: var(--text-primary);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-xl);
}

#mapa-config-taller {
    width: 100%;
    height: 300px;
    border-radius: var(--radius-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    overflow: hidden;
}

#horarios-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.horario-row {
    display: grid;
    grid-template-columns: 100px 1fr 1fr 60px;
    gap: var(--space-sm);
    align-items: center;
    padding: var(--space-sm);
    background: var(--bg-input);
    border-radius: var(--radius-sm);
}

#configuracion input[type="checkbox"] {
    width: auto;
    accent-color: var(--accent-color);
    cursor: pointer;
}

#configuracion label:has(input[type="checkbox"]) {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: var(--bg-input);
    padding: 10px 15px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
}

#configuracion label:has(input[type="checkbox"]):hover {
    border-color: var(--accent-color);
}

/* Botón guardar configuración */
#btn-guardar-config {
    padding: 15px 50px;
    background: var(--accent-color);
    color: var(--on-accent);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
    text-align: center;
    transition: var(--transition);
    display: inline-block;
    font-family: var(--font-family);
}

#btn-guardar-config:hover {
    box-shadow: 0 0 30px var(--accent-glow);
    transform: translateY(-2px);
}

/* Cambiar contraseña */
#configuracion .card-password {
    background: var(--bg-card);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-lg);
    padding: var(--space-2xl);
    margin-bottom: var(--space-xl);
}

#configuracion .card-password h3 {
    color: var(--color-warning);
}

#btn-cambiar-password {
    width: 100%;
    padding: 12px;
    background: var(--color-warning);
    color: var(--on-accent);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
    transition: var(--transition);
    text-align: center;
    font-family: var(--font-family);
}

#btn-cambiar-password:hover {
    box-shadow: 0 0 20px rgba(var(--color-warning-rgb), 0.4);
}

/* Preview del color */
#preview-color-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-card);
    border-radius: var(--radius-md);
    border: 2px solid var(--accent-color);
    transition: var(--transition);
}

#preview-color-avatar {
    width: 45px;
    height: 45px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-2xl);
    border: 2px solid var(--accent-color);
}

@media (max-width: 968px) {
    #configuracion .config-grid { grid-template-columns: 1fr; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/configuracion.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/configuracion.css"
fi

# ============================================================
# 6. TALLER: resenas.css
# ============================================================
if [ ! -f "css/pages/taller/resenas.css" ]; then
    cat > css/pages/taller/resenas.css << 'EOF'
/* ============================================================================
   TALLER - RESEÑAS
   ============================================================================ */

#stats-resenas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-sm);
    margin-bottom: var(--space-xl);
}

#lista-resenas-taller,
#lista-resenas-empleado {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.resena-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    transition: var(--transition);
}

.resena-card:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.resena-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
    gap: var(--space-sm);
}

.resena-cliente {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
}

.resena-cliente small {
    color: var(--text-muted);
    font-weight: var(--font-weight-normal);
    font-size: var(--font-size-xs);
}

.resena-estrellas {
    color: var(--color-warning);
    font-size: var(--font-size-lg);
    letter-spacing: 2px;
}

.resena-comentario {
    color: var(--text-secondary);
    line-height: var(--line-height-relaxed);
    margin-bottom: var(--space-md);
    font-size: var(--font-size-base);
}

.resena-fecha {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
}

.resena-respuesta {
    background: rgba(var(--accent-color-rgb), 0.05);
    border-left: 3px solid var(--accent-color);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    margin-top: var(--space-md);
}

.resena-respuesta strong {
    color: var(--accent-color);
    font-size: var(--font-size-sm);
    display: block;
    margin-bottom: var(--space-xs);
}

.resena-respuesta p {
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    line-height: var(--line-height-relaxed);
    margin: 0;
}

/* Modal responder */
#resena-original {
    background: var(--bg-input);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    border-left: 3px solid var(--color-warning);
}

#respuesta-texto {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    resize: vertical;
    transition: var(--transition);
}

#respuesta-texto:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-glow);
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/resenas.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/resenas.css"
fi

# ============================================================
# 7. TALLER: notificaciones.css
# ============================================================
if [ ! -f "css/pages/taller/notificaciones.css" ]; then
    cat > css/pages/taller/notificaciones.css << 'EOF'
/* ============================================================================
   TALLER - NOTIFICACIONES
   ============================================================================ */

#modal-notificaciones {
    display: none;
    position: fixed;
    inset: 0;
    background: var(--bg-overlay);
    z-index: var(--z-modal-top);
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
}

#modal-notificaciones[style*="display: flex"],
#modal-notificaciones:not(.d-none) {
    display: flex !important;
}

#modal-notificaciones > div {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl);
    max-width: 550px;
    width: 95%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
}

#lista-notificaciones {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding-right: var(--space-xs);
}

#lista-notificaciones::-webkit-scrollbar {
    width: 6px;
}

#lista-notificaciones::-webkit-scrollbar-track {
    background: transparent;
}

#lista-notificaciones::-webkit-scrollbar-thumb {
    background: var(--accent-color);
    border-radius: 10px;
}

.notif-item {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-input);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
}

.notif-item:hover {
    background: rgba(255, 255, 255, 0.03);
    transform: translateX(3px);
}

.notif-item.no-leida {
    border-left-color: var(--accent-color);
    background: rgba(var(--accent-color-rgb), 0.05);
}

.notif-icono {
    font-size: var(--font-size-3xl);
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
}

.notif-contenido {
    flex: 1;
    min-width: 0;
}

.notif-titulo {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
    margin-bottom: var(--space-xxs);
}

.notif-mensaje {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-xs);
    line-height: 1.4;
}

.notif-fecha {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
}

/* Filtros de notificaciones */
.filtro-notif {
    padding: 6px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-family: var(--font-family);
    transition: var(--transition);
}

.filtro-notif.active,
.filtro-notif:hover {
    border-color: var(--accent-color);
    background: var(--accent-bg);
    color: var(--accent-color);
}

/* Badge de notificación en header */
#badge-notificaciones {
    position: absolute;
    top: -5px;
    right: -8px;
    background: var(--color-danger);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    animation: pulse-badge 0.5s ease;
}

#badge-notificaciones:not(.d-none),
#badge-notificaciones[style*="display: flex"] {
    display: flex !important;
}

@keyframes pulse-badge {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/taller/notificaciones.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/taller/notificaciones.css"
fi

# ============================================================
# 8. CLIENTE: garaje.css
# ============================================================
if [ ! -f "css/pages/cliente/garaje.css" ]; then
    cat > css/pages/cliente/garaje.css << 'EOF'
/* ============================================================================
   CLIENTE - GARAJE
   ============================================================================ */

.garage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
}

.car-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-md);
    transition: var(--transition);
    cursor: pointer;
}

.car-card:hover {
    border-color: var(--accent-color);
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}

.car-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-md);
    background: var(--bg-input);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-3xl);
    flex-shrink: 0;
    overflow: hidden;
    border: 2px solid var(--border-color);
    transition: var(--transition);
}

.car-card:hover .car-icon {
    border-color: var(--accent-color);
}

.car-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.car-info {
    flex: 1;
    min-width: 0;
}

.car-info h4 {
    font-size: var(--font-size-base);
    color: var(--text-primary);
    margin: 0 0 var(--space-xxs);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: var(--font-weight-semibold);
}

.car-model {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
    margin-bottom: var(--space-xs);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.car-plate {
    display: inline-block;
    background: rgba(var(--accent-color-rgb), 0.1);
    color: var(--accent-color);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 1px;
    font-family: 'Courier New', monospace;
}

.car-actions {
    display: flex;
    gap: var(--space-xs);
    flex-shrink: 0;
}

.car-action-btn {
    width: 35px;
    height: 35px;
    border-radius: var(--radius-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-base);
}

.car-action-btn:hover {
    background: var(--accent-color);
    color: var(--on-accent);
    border-color: var(--accent-color);
}

.car-action-btn.delete:hover {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
}

/* Estado vacío */
.empty-garage {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px var(--space-xl);
    color: var(--text-muted);
}

.empty-garage-icon {
    font-size: 4rem;
    margin-bottom: var(--space-md);
    opacity: 0.5;
    display: block;
}

.empty-garage p {
    margin-bottom: var(--space-md);
    font-size: var(--font-size-base);
}

.btn-add-first-car {
    background: transparent;
    border: 2px dashed var(--accent-color);
    color: var(--accent-color);
    padding: 10px 24px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-base);
    transition: var(--transition);
    font-family: var(--font-family);
}

.btn-add-first-car:hover {
    background: var(--accent-bg);
    border-style: solid;
}

@media (max-width: 479px) {
    .garage-grid { grid-template-columns: 1fr; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/cliente/garaje.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/cliente/garaje.css"
fi

# ============================================================
# 9. CLIENTE: perfil.css
# ============================================================
if [ ! -f "css/pages/cliente/perfil.css" ]; then
    cat > css/pages/cliente/perfil.css << 'EOF'
/* ============================================================================
   CLIENTE - PERFIL
   ============================================================================ */

.user-main-card {
    background: linear-gradient(145deg, var(--bg-card), var(--bg-secondary));
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--space-3xl) var(--space-xl);
    text-align: center;
    position: relative;
    overflow: hidden;
}

.user-main-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 20%, rgba(var(--accent-color-rgb), 0.05) 0%, transparent 50%);
    pointer-events: none;
}

#foto-perfil-grande {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid var(--accent-color);
    box-shadow: 0 0 25px var(--accent-glow);
    object-fit: cover;
    transition: var(--transition);
    position: relative;
    z-index: 1;
}

#foto-perfil-grande:hover {
    box-shadow: 0 0 40px rgba(var(--accent-color-rgb), 0.4);
}

.avatar-overlay {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background: var(--accent-color);
    color: var(--on-accent);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: var(--transition);
    border: 2px solid var(--bg-card);
    z-index: 2;
}

.avatar-overlay:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 15px var(--accent-glow);
}

#display-nombre {
    color: var(--text-primary);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    margin: var(--space-md) 0 var(--space-xs);
    position: relative;
    z-index: 1;
}

#display-email {
    color: var(--text-muted);
    font-size: var(--font-size-base);
    margin: 0 0 var(--space-lg);
    position: relative;
    z-index: 1;
}

.plan-badge-container {
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
}

.badge-plan {
    background: rgba(var(--accent-color-rgb), 0.1);
    color: var(--accent-color);
    padding: 6px 16px;
    border-radius: var(--radius-pill);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    border: 1px solid rgba(var(--accent-color-rgb), 0.2);
    display: inline-block;
}

.user-stats-mini {
    display: flex;
    justify-content: center;
    gap: var(--space-2xl);
    margin-bottom: var(--space-xl);
    padding: var(--space-lg) 0;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    position: relative;
    z-index: 1;
}

.user-stat-item {
    text-align: center;
}

.user-stat-value {
    display: block;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--accent-color);
}

.user-stat-label {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    margin-top: var(--space-xxs);
}

.user-actions {
    display: flex;
    gap: var(--space-sm);
    width: 100%;
    position: relative;
    z-index: 1;
}

.btn-user-action {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-size-base);
    font-family: var(--font-family);
    transition: var(--transition);
}

.btn-user-action:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
    background: var(--accent-bg);
}

/* Layout de perfil */
.profile-layout {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-xl);
    margin-bottom: var(--space-2xl);
}

@media (max-width: 900px) {
    .profile-layout { grid-template-columns: 1fr; }
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/cliente/perfil.css"
else
    echo -e "  ${YELLOW}⏭️${NC}  Ya existe: pages/cliente/perfil.css"
fi

# ============================================================
# ACTUALIZAR main.css CON NUEVOS @IMPORT
# ============================================================
echo ""
echo -e "${YELLOW}📝 Actualizando main.css...${NC}"

# Verificar si ya están los imports
if ! grep -q "pages/taller/bahias.css" css/main.css; then
    # Agregar imports de taller
    sed -i "/@import url('.\/pages\/taller\/registro.css');/a\\
@import url('./pages/taller/bahias.css');\\
@import url('./pages/taller/empleados.css');\\
@import url('./pages/taller/historial.css');\\
@import url('./pages/taller/galeria.css');\\
@import url('./pages/taller/configuracion.css');\\
@import url('./pages/taller/resenas.css');\\
@import url('./pages/taller/notificaciones.css');" css/main.css
    echo -e "  ${GREEN}✅${NC} Añadidos 7 imports de taller"
else
    echo -e "  ${YELLOW}⏭️${NC}  Imports de taller ya están en main.css"
fi

if ! grep -q "pages/empleado/historial.css" css/main.css; then
    sed -i "/@import url('.\/pages\/empleado\/configuracion.css');/a\\
@import url('./pages/empleado/historial.css');" css/main.css
    echo -e "  ${GREEN}✅${NC} Añadido import de empleado/historial"
else
    echo -e "  ${YELLOW}⏭️${NC}  Import de empleado/historial ya existe"
fi

if ! grep -q "pages/cliente/garaje.css" css/main.css; then
    sed -i "/@import url('.\/pages\/cliente\/cliente.css');/a\\
@import url('./pages/cliente/garaje.css');\\
@import url('./pages/cliente/perfil.css');" css/main.css
    echo -e "  ${GREEN}✅${NC} Añadidos imports de cliente"
else
    echo -e "  ${YELLOW}⏭️${NC}  Imports de cliente ya existen"
fi

# Crear empleado/historial.css si no existe
if [ ! -f "css/pages/empleado/historial.css" ]; then
    cat > css/pages/empleado/historial.css << 'EOF'
/* ============================================================================
   EMPLEADO - HISTORIAL
   ============================================================================ */

#stats-historial,
.historial-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-sm);
    width: 100%;
}

#tabla-historial {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
    background: var(--bg-card);
}

#tabla-historial th {
    padding: var(--space-md);
    text-align: left;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    border-bottom: 2px solid var(--border-color);
    background: var(--bg-secondary);
}

#tabla-historial td {
    padding: var(--space-md);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    border-bottom: 1px solid var(--border-color);
}

#tabla-historial tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
}

#paginacion-historial {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
}
EOF
    echo -e "  ${GREEN}✅${NC} Creado: pages/empleado/historial.css"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ CSS FALTANTES CREADOS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""
echo "📁 Archivos nuevos en pages/taller/:"
ls -1 css/pages/taller/*.css 2>/dev/null | sed 's/^/   /'
echo ""
echo "📁 Archivos nuevos en pages/cliente/:"
ls -1 css/pages/cliente/*.css 2>/dev/null | sed 's/^/   /'
echo ""
echo "📁 Archivos nuevos en pages/empleado/:"
ls -1 css/pages/empleado/*.css 2>/dev/null | sed 's/^/   /'
echo ""
echo "🎯 Próximo paso: Verificar con"
echo "   cat css/main.css"
echo ""
