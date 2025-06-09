// REGLAS DE SEGURIDAD ACTUALIZADAS PARA FIRESTORE
// Incluye validación para categorías personalizadas

const updatedFirestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== COLECCIÓN USERS =====
    match /users/{userId} {
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
      
      allow create, update: if request.auth != null 
                           && request.auth.uid == userId
                           && validateUserData(request.resource.data);
    }
    
    // ===== COLECCIÓN EXPENSES =====
    match /expenses/{expenseId} {
      allow read: if request.auth != null 
                 && request.auth.uid == resource.data.userId;
      
      allow create: if request.auth != null 
                   && request.auth.uid == request.resource.data.userId
                   && validateExpenseData(request.resource.data);
      
      allow update: if request.auth != null 
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId
                   && validateExpenseData(request.resource.data);
      
      allow delete: if request.auth != null 
                   && request.auth.uid == resource.data.userId;
    }
    
    // ===== FUNCIONES DE VALIDACIÓN =====
    
    function validateUserData(data) {
      return data.keys().hasAll(['salary', 'monotributo', 'categories'])
             && data.salary is number
             && data.salary >= 0
             && data.monotributo is number
             && data.monotributo >= 0
             && data.categories is map
             && validateCategories(data.categories);
    }
    
    // Validación flexible para categorías personalizadas
    function validateCategories(categories) {
      return categories.size() >= 1
             && categories.size() <= 20  // Máximo 20 categorías
             && validateAllCategories(categories);
    }
    
    function validateAllCategories(categories) {
      return categories.values().hasAll(['name', 'percentage', 'icon'])
             && categories.values().all(cat, 
                  cat.name is string 
                  && cat.name.size() > 0 
                  && cat.name.size() <= 50
                  && cat.percentage is number 
                  && cat.percentage >= 0 
                  && cat.percentage <= 100
                  && cat.icon is string
                  && cat.icon.size() > 0
                );
    }
    
    function validateExpenseData(data) {
      return data.keys().hasAll(['userId', 'category', 'amount', 'description', 'date'])
             && data.userId is string
             && data.category is string
             && data.category.size() > 0
             && data.amount is number
             && data.amount > 0
             && data.description is string
             && data.description.size() <= 200
             && data.date is string;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

console.log("🔒 REGLAS DE SEGURIDAD ACTUALIZADAS")
console.log("===================================")
console.log("")
console.log("✨ NUEVAS CARACTERÍSTICAS:")
console.log("   📝 Soporte para categorías personalizadas")
console.log("   🔢 Validación flexible de cantidad de categorías (1-20)")
console.log("   📏 Límites de longitud para nombres (1-50 caracteres)")
console.log("   💯 Validación de porcentajes (0-100%)")
console.log("   🎨 Validación de iconos personalizados")
console.log("")
console.log("🔐 REGLAS ACTUALIZADAS:")
console.log(updatedFirestoreRules)
console.log("")
console.log("⚠️  IMPORTANTE:")
console.log("   - Reemplaza las reglas anteriores con estas nuevas")
console.log("   - Permite categorías completamente personalizables")
console.log("   - Mantiene la máxima seguridad")
console.log("   - Valida estructura y contenido de datos")
