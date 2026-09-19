#!/bin/bash
# Script de Deploy para Netlify

echo "🚀 Preparando deploy..."

# Verifica se tem node_modules na pasta deploy-optimized
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install --production
fi

echo "✅ Pronto para deploy!"
echo ""
echo "Escolha uma opção:"
echo "1) Deploy via Netlify CLI (recomendado - rápido)"
echo "2) Preparar pasta para drag & drop"
echo ""
read -p "Opção: " opcao

if [ "$opcao" = "1" ]; then
    echo "📡 Fazendo deploy..."
    npx netlify deploy --prod
elif [ "$opcao" = "2" ]; then
    echo "📁 Pasta preparada: deploy-optimized"
    echo "Arraste esta pasta para Netlify"
else
    echo "Opção inválida"
fi