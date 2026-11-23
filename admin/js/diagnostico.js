// Script de diagnóstico para localStorage - AutoBrillo
// Ejecutar en la consola del navegador (F12 > Console)

console.log("🔍 DIAGNÓSTICO DE LOCALSTORAGE - AUTOBRILLO");
console.log("==============================================");

try {
    const dbData = localStorage.getItem('db_autobrillo');
    const sessionData = localStorage.getItem('sesion_activa');

    console.log("📦 db_autobrillo:", dbData ? "✅ Presente" : "❌ Ausente");
    console.log("👤 sesion_activa:", sessionData ? "✅ Presente" : "❌ Ausente");

    if (dbData) {
        try {
            const parsed = JSON.parse(dbData);
            console.log("📊 Tipo de db_autobrillo:", Array.isArray(parsed) ? "✅ Array" : "❌ " + typeof parsed);
            if (Array.isArray(parsed)) {
                console.log("👥 Usuarios registrados:", parsed.length);
                parsed.forEach((user, i) => {
                    console.log(`   ${i+1}. ${user.nombre} (${user.email})`);
                });
            } else {
                console.log("⚠️ Contenido (no array):", parsed);
            }
        } catch (e) {
            console.error("❌ db_autobrillo corrupto:", e.message);
        }
    }

    if (sessionData) {
        try {
            const parsed = JSON.parse(sessionData);
            console.log("👤 Usuario en sesión:", parsed.nombre || "Sin nombre");
            console.log("📧 Email:", parsed.email || "Sin email");
            console.log("🚗 Vehículos en garaje:", parsed.garaje ? parsed.garaje.length : 0);
        } catch (e) {
            console.error("❌ sesion_activa corrupta:", e.message);
        }
    }

    console.log("\n🛠️ ACCIONES DISPONIBLES:");
    console.log("   - Limpiar datos corruptos: localStorage.removeItem('db_autobrillo')");
    console.log("   - Limpiar sesión: localStorage.removeItem('sesion_activa')");
    console.log("   - Ver todo localStorage: console.log(localStorage)");

} catch (e) {
    console.error("❌ Error general en diagnóstico:", e);
}

console.log("==============================================");