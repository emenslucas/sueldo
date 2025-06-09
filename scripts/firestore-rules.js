// Reglas de seguridad para Firestore
// Copia y pega estas reglas en Firebase Console > Firestore Database > Rules

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Los usuarios solo pueden acceder a sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Los gastos solo pueden ser accedidos por su propietario
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
`

console.log("🔒 REGLAS DE SEGURIDAD PARA FIRESTORE")
console.log("=====================================")
console.log("")
console.log("Para configurar la seguridad de tu base de datos:")
console.log("")
console.log("1. Ve a Firebase Console: https://console.firebase.google.com")
console.log("2. Selecciona tu proyecto: sueldo-2b36b")
console.log("3. Ve a Firestore Database > Rules")
console.log("4. Reemplaza las reglas actuales con las siguientes:")
console.log("")
console.log(firestoreRules)
console.log("")
console.log("5. Haz clic en 'Publicar' para aplicar las reglas")
console.log("")
console.log("✅ Estas reglas aseguran que:")
console.log("   - Solo usuarios autenticados pueden acceder a los datos")
console.log("   - Cada usuario solo puede ver sus propios gastos y configuración")
console.log("   - Los datos están protegidos contra acceso no autorizado")
