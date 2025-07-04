#!/bin/bash

echo "🔥 Configuración de Índices de Firestore"
echo "========================================"
echo ""
echo "Para solucionar los errores de índices, sigue estos pasos:"
echo ""
echo "📋 OPCIÓN 1: Configuración Automática (Recomendada)"
echo "1. Haz clic en estos enlaces para crear los índices automáticamente:"
echo ""
echo "   🎯 Índice para Objetivos de Ahorro:"
echo "   https://console.firebase.google.com/v1/r/project/sueldo-2b36b/firestore/indexes?create_composite=ClFwcm9qZWN0cy9zdWVsZG8tMmIzNmIvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3NhdmluZ3NHb2Fscy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC"
echo ""
echo "   💰 Índice para Contribuciones:"
echo "   https://console.firebase.google.com/v1/r/project/sueldo-2b36b/firestore/indexes?create_composite=Cllwcm9qZWN0cy9zdWVsZG8tMmIzNmIvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3NhdmluZ3NDb250cmlidXRpb25zL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGggKBGRhdGUQAhoMCghfX25hbWVfXxAC"
echo ""
echo "2. En cada enlace, haz clic en 'Crear índice'"
echo "3. Espera a que se complete la creación (puede tomar unos minutos)"
echo ""
echo "📋 OPCIÓN 2: Configuración Manual"
echo "1. Ve a Firebase Console: https://console.firebase.google.com"
echo "2. Selecciona tu proyecto 'sueldo-2b36b'"
echo "3. Ve a Firestore Database > Indexes"
echo "4. Haz clic en 'Crear índice' y configura:"
echo ""
echo "   Índice 1 - savingsGoals:"
echo "   - Campo: userId (Ascendente)"
echo "   - Campo: createdAt (Descendente)"
echo ""
echo "   Índice 2 - savingsContributions:"
echo "   - Campo: userId (Ascendente)"
echo "   - Campo: date (Descendente)"
echo ""
echo "📋 OPCIÓN 3: Firebase CLI"
echo "1. Instala Firebase CLI: npm install -g firebase-tools"
echo "2. Autentícate: firebase login"
echo "3. Inicializa: firebase init firestore"
echo "4. Despliega índices: firebase deploy --only firestore:indexes"
echo ""
echo "⚠️  NOTA IMPORTANTE:"
echo "La aplicación funciona correctamente sin los índices."
echo "Los índices solo mejoran el rendimiento y habilitan el ordenamiento automático."
echo ""
echo "✅ Una vez configurados los índices, los errores desaparecerán automáticamente."
