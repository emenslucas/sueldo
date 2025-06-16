#!/bin/bash

# Script para configurar los índices de Firestore
# Ejecutar desde la raíz del proyecto

echo "🔥 Configurando índices de Firestore..."

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado."
    echo "📦 Instala Firebase CLI con: npm install -g firebase-tools"
    exit 1
fi

# Verificar si el usuario está autenticado
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Necesitas autenticarte con Firebase"
    echo "🚀 Ejecuta: firebase login"
    exit 1
fi

# Verificar si existe el archivo de configuración de índices
if [ ! -f "firestore.indexes.json" ]; then
    echo "❌ No se encontró el archivo firestore.indexes.json"
    echo "📄 Asegúrate de que el archivo esté en la raíz del proyecto"
    exit 1
fi

echo "📋 Desplegando índices de Firestore..."

# Desplegar los índices
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Índices de Firestore configurados exitosamente!"
    echo "🎉 Los objetivos de ahorro ahora funcionarán correctamente"
    echo ""
    echo "📊 Índices creados:"
    echo "   • savingsGoals: userId + createdAt (desc)"
    echo "   • savingsContributions: userId + date (desc)"
else
    echo "❌ Error al desplegar los índices"
    echo "🔧 Verifica tu configuración de Firebase"
fi
