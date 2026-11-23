#!/bin/bash
# ============================================================
# LIMPIEZA FINAL DEFINITIVA - AUTOBRILLO
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ ! -d "css" ] || [ ! -d "html" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   🧹 LIMPIEZA FINAL DEFINITIVA - AUTOBRILLO        ${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""

# PASO 1: BACKUP
echo -e "${YELLOW}📦 PASO 1: Creando backup...${NC}"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r css "$BACKUP_DIR/css-backup"
cp -r html "$BACKUP_DIR/html-backup"
echo -e "  ${GREEN}✅${NC} Backup en: $BACKUP_DIR/"
echo ""

# PASO 2: FUSIONAR CARPETAS VIEJAS
echo -e "${YELLOW}🔗 PASO 2: Fusionando carpetas viejas...${NC}"

# Fusionar empleado/
if [ -d "css/empleado" ]; then
    mkdir -p css/pages/empleado
    [ ! -f "css/pages/empleado/empleado.css" ] && touch css/pages/empleado/empleado.css
    
    if [ -f "css/empleado/empleado-dashboard.css" ]; then
        echo "" >> css/pages/empleado/empleado.css
        echo "/* ==== Fusionado: empleado-dashboard.css ==== */" >> css/pages/empleado/empleado.css
        cat css/empleado/empleado-dashboard.css >> css/pages/empleado/empleado.css
        echo -e "  ${GREEN}✅${NC} empleado-dashboard.css → empleado.css"
    fi
    
    if [ -f "css/empleado/empleado-inline.css" ]; then
        echo "" >> css/pages/empleado/empleado.css
        echo "/* ==== Fusionado: empleado-inline.css ==== */" >> css/pages/empleado/empleado.css
        cat css/empleado/empleado-inline.css >> css/pages/empleado/empleado.css
        echo -e "  ${GREEN}✅${NC} empleado-inline.css → empleado.css"
    fi
    
    rm -rf css/empleado
    echo -e "  ${GREEN}✅${NC} Carpeta css/empleado/ eliminada"
fi

# Fusionar taller/
if [ -d "css/taller" ]; then
    if [ -f "css/taller/dashboard-inline.css" ]; then
        echo "" >> css/pages/taller/dashboard.css
        echo "/* ==== Fusionado: dashboard-inline.css ==== */" >> css/pages/taller/dashboard.css
        cat css/taller/dashboard-inline.css >> css/pages/taller/dashboard.css
        echo -e "  ${GREEN}✅${NC} dashboard-inline.css → dashboard.css"
    fi
    
    if [ -f "css/taller/registro.css" ]; then
        if [ -f "css/pages/taller/registro.css" ]; then
            cat css/taller/registro.css >> css/pages/taller/registro.css
        else
            mv css/taller/registro.css css/pages/taller/registro.css
        fi
        echo -e "  ${GREEN}✅${NC} taller/registro.css → pages/taller/registro.css"
    fi
    
    rm -rf css/taller
    echo -e "  ${GREEN}✅${NC} Carpeta css/taller/ eliminada"
fi
echo ""

# PASO 3: HUÉRFANOS EN RAÍZ
echo -e "${YELLOW}🗂️  PASO 3: Procesando huérfanos...${NC}"

# styla.css → utilities.css
if [ -f "css/styla.css" ]; then
    echo "" >> css/core/utilities.css
    echo "/* ==== Fusionado: styla.css ==== */" >> css/core/utilities.css
    cat css/styla.css >> css/core/utilities.css
    rm css/styla.css
    echo -e "  ${GREEN}✅${NC} styla.css → utilities.css"
fi

# regitro.css (typo) → registro.css
if [ -f "css/regitro.css" ]; then
    if [ -f "css/pages/taller/registro.css" ]; then
        echo "" >> css/pages/taller/registro.css
        echo "/* ==== Fusionado: regitro.css ==== */" >> css/pages/taller/registro.css
        cat css/regitro.css >> css/pages/taller/registro.css
        rm css/regitro.css
    else
        mv css/regitro.css css/pages/taller/registro.css
    fi
    echo -e "  ${GREEN}✅${NC} regitro.css → registro.css"
fi

# inicioDeSecion.css → pages/auth/login.css
if [ -f "css/inicioDeSecion.css" ]; then
    mkdir -p css/pages/auth
    if [ -f "css/pages/auth/login.css" ]; then
        cat css/inicioDeSecion.css >> css/pages/auth/login.css
        rm css/inicioDeSecion.css
    else
        mv css/inicioDeSecion.css css/pages/auth/login.css
    fi
    echo -e "  ${GREEN}✅${NC} inicioDeSecion.css → pages/auth/login.css"
fi

# dashboard.css (raíz) → verificar duplicado
if [ -f "css/dashboard.css" ]; then
    if [ -f "css/pages/taller/dashboard.css" ]; then
        echo "" >> css/pages/taller/dashboard.css
        echo "/* ==== Fusionado: dashboard.css (raíz) ==== */" >> css/pages/taller/dashboard.css
        cat css/dashboard.css >> css/pages/taller/dashboard.css
    fi
    rm css/dashboard.css
    echo -e "  ${GREEN}✅${NC} dashboard.css (raíz) eliminado"
fi

# secionesExpeciales.css → pages/cliente/
if [ -f "css/secionesExpeciales.css" ]; then
    mkdir -p css/pages/cliente
    mv css/secionesExpeciales.css css/pages/cliente/secciones-especiales.css
    echo -e "  ${GREEN}✅${NC} secionesExpeciales.css → pages/cliente/secciones-especiales.css"
fi
echo ""

# PASO 4: CREAR FALTANTES
echo -e "${YELLOW}📝 PASO 4: Creando archivos faltantes...${NC}"

if [ ! -f "css/components/badges.css" ]; then
    cat > css/components/badges.css << 'CSSEOF'
/* ============================================================================
   AUTOBRILLO - BADGES
   ============================================================================ */

.badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
    white-space: nowrap;
}

.badge-accent {
    background: var(--accent-bg);
    color: var(--accent-color);
    border: 1px solid var(--accent-border);
}

.badge-success {
    background: rgba(var(--color-success-rgb), 0.1);
    color: var(--color-success);
}

.badge-warning {
    background: rgba(var(--color-warning-rgb), 0.1);
    color: var(--color-warning);
}

.badge-danger {
    background: rgba(var(--color-danger-rgb), 0.1);
    color: var(--color-danger);
}

.badge-info {
    background: rgba(var(--color-info-rgb), 0.1);
    color: var(--color-info);
}

/* Estados de cita */
.estado-pendiente { background: rgba(var(--color-warning-rgb), 0.15); color: var(--color-warning); }
.estado-confirmada { background: rgba(var(--color-info-rgb), 0.15); color: var(--color-info); }
.estado-en_proceso, .estado-en-proceso { background: rgba(var(--accent-color-rgb), 0.15); color: var(--accent-color); }
.estado-listo { background: rgba(0, 128, 255, 0.15); color: #0080ff; }
.estado-entregado { background: rgba(136, 146, 164, 0.15); color: var(--text-secondary); }

/* Estados de empleado */
.estado-disponible { background: rgba(var(--accent-color-rgb), 0.1); color: var(--accent-color); }
.estado-ocupado { background: rgba(var(--color-warning-rgb), 0.1); color: var(--color-warning); }
.estado-descansando { background: rgba(var(--color-info-rgb), 0.1); color: var(--color-info); }
.estado-inactivo { background: rgba(136, 146, 164, 0.1); color: var(--text-muted); }
CSSEOF
    echo -e "  ${GREEN}✅${NC} Creado components/badges.css"
fi

if [ ! -f "css/components/tema-selector.css" ]; then
    cat > css/components/tema-selector.css << 'CSSEOF'
/* ============================================================================
   AUTOBRILLO - SELECTOR DE TEMAS
   ============================================================================ */

.temas-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
}

.tema-btn {
    padding: var(--space-md) var(--space-sm);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    text-align: center;
    cursor: pointer;
    transition: all var(--transition-base);
    background: var(--bg-input);
}

.tema-btn:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
}

.tema-btn.active {
    border-color: var(--accent-color);
    background: var(--accent-bg);
    box-shadow: 0 0 0 3px var(--accent-glow);
}

.tema-btn-color {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin: 0 auto var(--space-xs);
}

.tema-btn-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    display: block;
    line-height: 1.2;
}

.tema-btn.active .tema-btn-label {
    color: var(--accent-color);
    font-weight: 600;
}

.paletas-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
}

.paleta-btn {
    padding: var(--space-sm) 6px;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-base);
    text-align: center;
}

.paleta-btn:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
}

.paleta-preview {
    width: 100%;
    height: 35px;
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-xs);
}

.paleta-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    display: block;
}

.btn-densidad, .btn-font {
    flex: 1;
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    transition: all var(--transition-base);
}

.btn-densidad:hover, .btn-font:hover {
    border-color: var(--accent-color);
}

.btn-densidad.active, .btn-font.active {
    background: var(--accent-bg);
    color: var(--accent-color);
    border: 2px solid var(--accent-color);
}

@media (max-width: 640px) {
    .temas-grid, .paletas-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
CSSEOF
    echo -e "  ${GREEN}✅${NC} Creado components/tema-selector.css"
fi
echo ""

# PASO 5: ACTUALIZAR HTMLs
echo -e "${YELLOW}📝 PASO 5: Actualizando HTMLs...${NC}"

find html -name "*.html" -type f | while read html; do
    depth=$(echo "$html" | tr -cd '/' | wc -c)
    
    case $depth in
        1) ruta_css="css/main.css"; ruta_js="javascript/css-manager.js" ;;
        2) ruta_css="../css/main.css"; ruta_js="../javascript/css-manager.js" ;;
        3) ruta_css="../../css/main.css"; ruta_js="../../javascript/css-manager.js" ;;
        *) ruta_css="../../../css/main.css"; ruta_js="../../../javascript/css-manager.js" ;;
    esac
    
    python3 - "$html" "$ruta_css" "$ruta_js" << 'PYEOF'
import sys, re
html_file, ruta_css, ruta_js = sys.argv[1], sys.argv[2], sys.argv[3]

with open(html_file, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Eliminar links CSS viejos
contenido = re.sub(
    r'<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\'][^"\']*\.css["\'][^>]*>\s*\n?',
    '', contenido
)
# Eliminar css-manager duplicado
contenido = re.sub(
    r'<script[^>]*src=["\'][^"\']*css-manager\.js["\'][^>]*></script>\s*\n?',
    '', contenido
)

# Verificar si ya está actualizado
if f'href="{ruta_css}"' not in contenido:
    nuevo_head = f'''    <!-- CSS UNIFICADO -->
    <link rel="stylesheet" href="{ruta_css}">
    <script type="module" src="{ruta_js}"></script>
</head>'''
    contenido = contenido.replace('</head>', nuevo_head, 1)
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print(f"  ✅ {html}")
else:
    print(f"  ⏭️  {html} (ya OK)")
PYEOF
done
echo ""

# PASO 6: VERIFICACIÓN
echo -e "${YELLOW}🔍 PASO 6: Verificación...${NC}"

TOTAL=$(find css -type f -name "*.css" | wc -l | tr -d ' ')
echo -e "  📊 Total CSS: ${TOTAL} archivos"

HUERFANOS=$(find css -maxdepth 1 -name "*.css" -not -name "main.css" | wc -l | tr -d ' ')
if [ "$HUERFANOS" -eq 0 ]; then
    echo -e "  ${GREEN}✅${NC} Sin huérfanos en raíz"
else
    echo -e "  ${RED}❌${NC} Aún hay $HUERFANOS huérfanos"
fi

if [ -d "css/empleado" ] || [ -d "css/taller" ]; then
    echo -e "  ${RED}❌${NC} Carpetas viejas existen"
else
    echo -e "  ${GREEN}✅${NC} Carpetas viejas eliminadas"
fi

ROTAS=$(grep -r "css/temas.css\|css/servicioTallar\|css/empleado/variables" \
    --include="*.html" html/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$ROTAS" -eq 0 ]; then
    echo -e "  ${GREEN}✅${NC} Sin referencias rotas"
else
    echo -e "  ${RED}❌${NC} $ROTAS referencias rotas"
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ LIMPIEZA COMPLETADA${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📁 Estructura final:"
find css -type f -name "*.css" | sort | sed 's/^/  /'
echo ""
echo -e "📦 Backup en: ${CYAN}$BACKUP_DIR/${NC}"
echo -e "   Para restaurar: ${CYAN}mv $BACKUP_DIR/css-backup css && mv $BACKUP_DIR/html-backup html${NC}"
echo ""
