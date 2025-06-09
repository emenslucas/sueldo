// Instrucciones para configurar Firebase:

console.log(`
🔥 CONFIGURACIÓN DE FIREBASE

Para que la aplicación funcione correctamente, necesitas:

1. Crear un proyecto en Firebase Console (https://console.firebase.google.com)

2. Habilitar Authentication:
   - Ve a Authentication > Sign-in method
   - Habilita "Email/Password"

3. Crear Firestore Database:
   - Ve a Firestore Database
   - Crear base de datos en modo "test" (puedes cambiar las reglas después)

4. Obtener la configuración:
   - Ve a Project Settings > General
   - En "Your apps" agrega una Web app
   - Copia la configuración

5. Configurar variables de entorno:
   Crea un archivo .env.local en la raíz del proyecto con:

   NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

6. Reglas de seguridad recomendadas para Firestore:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Expenses can only be accessed by their owner
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}

¡Listo! Tu aplicación estará funcionando con Firebase.
`)
