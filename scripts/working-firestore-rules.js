// REGLAS DE FIRESTORE CORREGIDAS Y FUNCIONALES
// Copia estas reglas en Firebase Console > Firestore Database > Rules

const workingFirestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== COLECCIÓN USERS =====
    match /users/{userId} {
      // Solo el usuario autenticado puede leer y escribir sus propios datos
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ===== COLECCIÓN EXPENSES =====
    match /expenses/{expenseId} {
      // Permitir lectura si el usuario está autenticado y es el propietario
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      
      // Permitir creación si el usuario está autenticado y crea para sí mismo
      allow create: if request.auth != null 
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.keys().hasAll(['userId', 'category', 'amount', 'description', 'date'])
                   && request.resource.data.userId is string
                   && request.resource.data.category is string
                   && request.resource.data.amount is number
                   && request.resource.data.amount > 0
                   && request.resource.data.description is string
                   && request.resource.data.date is string;
      
      // Permitir actualización si es el propietario
      allow update: if request.auth != null 
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId;
      
      // Permitir eliminación si es el propietario
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Denegar acceso a cualquier otra colección
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

console.log("🔒 REGLAS DE FIRESTORE CORREGIDAS")
console.log("=================================")
console.log("")
console.log("🚨 PROBLEMA IDENTIFICADO:")
console.log("   • Las reglas anteriores eran demasiado restrictivas")
console.log("   • Validaciones complejas causaban fallos")
console.log("   • Estas nuevas reglas son más simples y funcionales")
console.log("")
console.log("📋 INSTRUCCIONES PARA APLICAR:")
console.log("   1. Ve a Firebase Console: https://console.firebase.google.com")
console.log("   2. Selecciona tu proyecto: sueldo-2b36b")
console.log("   3. Ve a Firestore Database > Rules")
console.log("   4. REEMPLAZA todas las reglas actuales con estas:")
console.log("")
console.log("🔐 REGLAS CORREGIDAS:")
console.log(workingFirestoreRules)
console.log("")
console.log("✅ ESTAS REGLAS PERMITEN:")
console.log("   ✓ Crear gastos con estructura correcta")
console.log("   ✓ Leer solo tus propios datos")
console.log("   ✓ Actualizar y eliminar tus gastos")
console.log("   ✓ Validación básica pero funcional")
console.log("")
console.log("⚠️  IMPORTANTE:")
console.log("   • Aplica estas reglas INMEDIATAMENTE")
console.log("   • Haz clic en 'Publicar' en Firebase Console")
console.log("   • Espera 1-2 minutos para que se propaguen")
console.log("   • Luego prueba agregar un gasto")
