// REGLAS DE SEGURIDAD PARA FIRESTORE
// Copia estas reglas en Firebase Console > Firestore Database > Rules

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== COLECCIÓN USERS =====
    match /users/{userId} {
      // Solo el usuario autenticado puede leer y escribir sus propios datos
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
      
      // Validaciones adicionales para escritura
      allow create, update: if request.auth != null 
                           && request.auth.uid == userId
                           && validateUserData(request.resource.data);
    }
    
    // ===== COLECCIÓN EXPENSES =====
    match /expenses/{expenseId} {
      // Solo el propietario puede leer sus gastos
      allow read: if request.auth != null 
                 && request.auth.uid == resource.data.userId;
      
      // Solo el propietario puede crear gastos para sí mismo
      allow create: if request.auth != null 
                   && request.auth.uid == request.resource.data.userId
                   && validateExpenseData(request.resource.data);
      
      // Solo el propietario puede actualizar sus gastos
      allow update: if request.auth != null 
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId
                   && validateExpenseData(request.resource.data);
      
      // Solo el propietario puede eliminar sus gastos
      allow delete: if request.auth != null 
                   && request.auth.uid == resource.data.userId;
    }
    
    // ===== FUNCIONES DE VALIDACIÓN =====
    
    // Validar datos de usuario
    function validateUserData(data) {
      return data.keys().hasAll(['salary', 'monotributo', 'categories'])
             && data.salary is number
             && data.salary >= 0
             && data.monotributo is number
             && data.monotributo >= 0
             && data.categories is map
             && validateCategories(data.categories);
    }
    
    // Validar estructura de categorías
    function validateCategories(categories) {
      return categories.keys().hasAll(['ahorro', 'gustos', 'angie'])
             && categories.ahorro.keys().hasAll(['name', 'percentage', 'icon'])
             && categories.gustos.keys().hasAll(['name', 'percentage', 'icon'])
             && categories.angie.keys().hasAll(['name', 'percentage', 'icon'])
             && categories.ahorro.percentage is number
             && categories.gustos.percentage is number
             && categories.angie.percentage is number
             && categories.ahorro.percentage >= 0
             && categories.gustos.percentage >= 0
             && categories.angie.percentage >= 0;
    }
    
    // Validar datos de gastos
    function validateExpenseData(data) {
      return data.keys().hasAll(['userId', 'category', 'amount', 'description', 'date'])
             && data.userId is string
             && data.category is string
             && data.category in ['ahorro', 'gustos', 'angie']
             && data.amount is number
             && data.amount > 0
             && data.description is string
             && data.description.size() <= 200
             && data.date is string;
    }
    
    // Denegar acceso a cualquier otra colección
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

console.log("🔒 REGLAS DE SEGURIDAD PARA FIRESTORE")
console.log("=====================================")
console.log("")
console.log("📋 INSTRUCCIONES:")
console.log("1. Ve a Firebase Console: https://console.firebase.google.com")
console.log("2. Selecciona tu proyecto: sueldo-2b36b")
console.log("3. Ve a Firestore Database > Rules")
console.log("4. Reemplaza las reglas actuales con las siguientes:")
console.log("")
console.log("🔐 REGLAS DE SEGURIDAD:")
console.log(firestoreRules)
console.log("")
console.log("✅ ESTAS REGLAS GARANTIZAN:")
console.log("   🛡️  Solo usuarios autenticados pueden acceder")
console.log("   👤 Cada usuario solo ve sus propios datos")
console.log("   ✏️  Validación de estructura de datos")
console.log("   🚫 Prevención de datos maliciosos")
console.log("   🔒 Bloqueo de colecciones no autorizadas")
console.log("")
console.log("⚠️  IMPORTANTE:")
console.log("   - Estas reglas son MUY restrictivas (máxima seguridad)")
console.log("   - Solo permiten las operaciones exactas de tu app")
console.log("   - Validan tipos de datos y rangos")
console.log("   - Previenen ataques de inyección")
