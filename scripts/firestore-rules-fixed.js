// REGLAS DE SEGURIDAD CORREGIDAS PARA FIRESTORE
// Estas reglas solucionan el error de permisos

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== COLECCIÓN USERS =====
    match /users/{userId} {
      // Solo el usuario autenticado puede leer y escribir sus propios datos
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
    }
    
    // ===== COLECCIÓN TRANSACTIONS =====
    match /transactions/{transactionId} {
      // Solo el propietario puede leer sus transacciones
      allow read: if request.auth != null 
                 && request.auth.uid == resource.data.userId;
      
      // Solo el propietario puede crear transacciones para sí mismo
      allow create: if request.auth != null 
                   && request.auth.uid == request.resource.data.userId
                   && validateTransactionData(request.resource.data);
      
      // Solo el propietario puede actualizar sus transacciones
      allow update: if request.auth != null 
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId
                   && validateTransactionData(request.resource.data);
      
      // Solo el propietario puede eliminar sus transacciones
      allow delete: if request.auth != null 
                   && request.auth.uid == resource.data.userId;
    }
    
    // ===== FUNCIONES DE VALIDACIÓN =====
    
    // Validar datos de transacciones
    function validateTransactionData(data) {
      return data.keys().hasAll(['userId', 'type', 'amount', 'description', 'date'])
             && data.userId is string
             && data.type is string
             && data.type in ['income', 'expense']
             && data.amount is number
             && data.amount > 0
             && data.description is string
             && data.description.size() <= 200
             && data.date is string;
    }
  }
}
`

console.log("🔒 REGLAS DE SEGURIDAD CORREGIDAS PARA FIRESTORE")
console.log("===============================================")
console.log("")
console.log("📋 INSTRUCCIONES:")
console.log("1. Ve a Firebase Console: https://console.firebase.google.com")
console.log("2. Selecciona tu proyecto: sueldo-2b36b")
console.log("3. Ve a Firestore Database > Rules")
console.log("4. Reemplaza las reglas actuales con las siguientes:")
console.log("")
console.log("🔐 REGLAS DE SEGURIDAD CORREGIDAS:")
console.log(firestoreRules)
console.log("")
console.log("✅ ESTAS REGLAS SOLUCIONAN:")
console.log("   🛡️  Error de permisos denegados")
console.log("   👤 Acceso correcto a transacciones por usuario")
console.log("   ✏️  Validación simplificada pero segura")
console.log("   🔒 Protección contra acceso no autorizado")
console.log("")
console.log("⚠️  IMPORTANTE:")
console.log("   - Estas reglas están optimizadas para la nueva estructura")
console.log("   - Permiten operaciones CRUD en la colección 'transactions'")
console.log("   - Mantienen la seguridad por usuario")
console.log("   - Solucionan el error de permission-denied")
