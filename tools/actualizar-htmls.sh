#!/bin/bash
# ============================================================
# ACTUALIZAR HTMLs - AUTOBRILLO
# ============================================================
# Reemplaza múltiples <link> CSS por uno solo (main.css)
# y asegura que css-manager.js esté cargado.
#
# Uso:
#   ./tools/actualizar-htmls.sh
# ============================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar que estamos en la raíz
if [ ! -d "html" ] || [ ! -d "css" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
    echo "   (la carpeta que contiene html/ y css/)"
    exit 1
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   📝 ACTUALIZANDO HTMLs - AUTOBRILLO${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""

# ============================================================
# PASO 1: BACKUP
# ============================================================
echo -e "${YELLOW}📦 PASO 1: Creando backup...${NC}"

BACKUP_DIR="backup-html-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copiar todos los HTMLs con su estructura de carpetas
find html -name "*.html" -not -path "*/backup-*" | while read -r file; do
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
done

TOTAL_HTML=$(find html -name "*.html" -not -path "*/backup-*" | wc -l)
echo -e "  ${GREEN}✅${NC} Backup creado: $BACKUP_DIR/"
echo -e "  ${GREEN}✅${NC} $TOTAL_HTML HTMLs respaldados"
echo ""

# ============================================================
# PASO 2: PROCESAR CADA HTML
# ============================================================
echo -e "${YELLOW}🔧 PASO 2: Procesando HTMLs...${NC}"
echo ""

# Python script embebido para el procesamiento
python3 << 'PYEOF'
import os
import re
import sys

GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
CYAN = '\033[0;36m'
NC = '\033[0m'

def calcular_ruta_relativa(html_path):
    """Calcula la ruta relativa desde el HTML hasta la raíz del proyecto."""
    # html/taller/dashboard.html → ../../
    # html/taller/empleado/x.html → ../../../
    # html/index.html → ../
    
    # Normalizar: quitar 'html/' del inicio
    path = html_path
    if path.startswith('./'):
        path = path[2:]
    
    # Contar niveles dentro de html/
    parts = path.split('/')
    # parts[0] = 'html'
    # parts[1..n-1] = subcarpetas
    # parts[n] = archivo.html
    
    subniveles = len(parts) - 2  # -1 por 'html', -1 por el archivo
    
    if subniveles == 0:
        return '..'  # html/dashboard.html
    else:
        return '../' * (subniveles + 1)  # +1 por 'html/'

def procesar_html(filepath):
    """Procesa un HTML para actualizar sus referencias CSS."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        contenido = f.read()
    
    # Calcular ruta base
    base = calcular_ruta_relativa(filepath)
    ruta_css = f'{base}css/main.css'
    ruta_manager = f'{base}javascript/css-manager.js'
    
    # Patrones
    patron_link_css = r'<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\'][^"\']*\.css["\'][^>]*>\s*\n?'
    patron_script_manager = r'<script[^>]*src=["\'][^"\']*css-manager\.js["\'][^>]*>\s*</script>\s*\n?'
    
    # Eliminar TODOS los <link> CSS (excepto fuentes de Google y Leaflet)
    def reemplazar_link(match):
        texto = match.group(0)
        # Conservar links externos (Google Fonts, Leaflet, CDN)
        if any(dominio in texto for dominio in [
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'unpkg.com',
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'kit.fontawesome.com',
        ]):
            return texto  # Conservar
        return ''  # Eliminar
    
    contenido = re.sub(patron_link_css, reemplazar_link, contenido)
    
    # Eliminar css-manager duplicado
    contenido = re.sub(patron_script_manager, '', contenido)
    
    # Verificar si ya está actualizado
    ya_actualizado = f'href="{ruta_css}"' in contenido
    
    if not ya_actualizado:
        # Insertar los nuevos links antes de </head>
        nuevos_links = (
            f'    <!-- ⭐ CSS UNIFICADO -->\n'
            f'    <link rel="stylesheet" href="{ruta_css}">\n'
            f'    <!-- ⭐ CSS MANAGER -->\n'
            f'    <script type="module" src="{ruta_manager}"></script>\n'
            f'</head>'
        )
        
        contenido = contenido.replace('</head>', nuevos_links, 1)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(contenido)
        
        return True  # Modificado
    else:
        return False  # Ya estaba actualizado

# Procesar todos los HTMLs
modificados = 0
ya_ok = 0
errores = 0

for root, dirs, files in os.walk('html'):
    # Saltar backups
    if 'backup-' in root:
        continue
    
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            try:
                modificado = procesar_html(filepath)
                if modificado:
                    print(f'  {GREEN}✅{NC} Actualizado: {filepath}')
                    modificados += 1
                else:
                    print(f'  {YELLOW}⏭️{NC}  Ya OK:     {filepath}')
                    ya_ok += 1
            except Exception as e:
                print(f'  {RED}❌{NC} Error en {filepath}: {e}')
                errores += 1

print('')
print(f'  {CYAN}─────────────────────────────────────{NC}')
print(f'  Modificados: {GREEN}{modificados}{NC}')
print(f'  Ya OK:       {YELLOW}{ya_ok}{NC}')
print(f'  Errores:     {RED}{errores}{NC}')
print(f'  {CYAN}─────────────────────────────────────{NC}')
PYEOF

echo ""

# ============================================================
# PASO 3: VERIFICACIÓN
# ============================================================
echo -e "${YELLOW}🔍 PASO 3: Verificando resultados...${NC}"
echo ""

# Verificar cada HTML
for html in $(find html -name "*.html" -not -path "*/backup-*" 2>/dev/null | sort); do
    # Contar links CSS propios (no externos)
    LINKS_TOTAL=$(grep -c 'rel="stylesheet"' "$html" 2>/dev/null || echo "0")
    LINKS_EXTERNOS=$(grep 'rel="stylesheet"' "$html" 2>/dev/null | grep -cE 'fonts\.googleapis|unpkg\.com|cdn\.' || echo "0")
    LINKS_PROPIOS=$((LINKS_TOTAL - LINKS_EXTERNOS))
    
    # Verificar main.css
    MAIN_CSS=$(grep -c 'css/main\.css' "$html" 2>/dev/null || echo "0")
    
    # Verificar css-manager
    MANAGER=$(grep -c 'css-manager' "$html" 2>/dev/null || echo "0")
    
    if [ "$MAIN_CSS" -ge 1 ] && [ "$MANAGER" -ge 1 ]; then
        echo -e "  ${GREEN}✅${NC} $html"
        echo -e "     main.css: ✅ | css-manager: ✅ | links propios: $LINKS_PROPIOS"
    else
        echo -e "  ${RED}❌${NC} $html"
        echo -e "     main.css: $MAIN_CSS | css-manager: $MANAGER"
    fi
done

echo ""

# ============================================================
# PASO 4: RESUMEN
# ============================================================
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ ACTUALIZACIÓN COMPLETADA${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📦 Backup:  ${CYAN}$BACKUP_DIR/${NC}"
echo -e "🔄 Restaurar: ${CYAN}cp -r $BACKUP_DIR/html/* html/${NC}"
echo ""
echo -e "🎯 Próximos pasos:"
echo -e "   1. Recarga los HTMLs en el navegador con ${CYAN}Ctrl+Shift+R${NC}"
echo -e "   2. Verifica que todo se vea bien"
echo -e "   3. Si algo falla, restaura desde el backup"
echo ""
