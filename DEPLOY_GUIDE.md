# Como Publicar no Netlify via Drag & Drop

## Opção 1: Publicar a Pasta Otimizada (Recomendado)

A pasta `.next` após o build já contém todo o código compilado. Para publicar:

1. **Faça o build localmente** (já feito):
   ```bash
   npm run build
   ```

2. **Crie uma pasta "deploy"** com apenas estes arquivos/pastas:
   ```
   deploy/
   ├── .next/              # Código compilado (~50MB)
   ├── package.json         # Dependências para reinstall
   ├── package-lock.json
   ├── next.config.ts
   ├── public/             # Arquivos estáticos
   ├── netlify.toml        # Configuração do Netlify
   └── (outros arquivos de config)
   ```

3. **Faça o drag & drop da pasta "deploy"** no Netlify

O Netlify vai:
- Detectar `package.json`
- Executar `npm install`
- Usar o `.next` já compilado
- Publicar o site

## Opção 2: Script Automático (Melhor)

Crie um arquivo `prepare-deploy.bat` para preparar a pasta automaticamente:

```batch
@echo off
echo Preparando pasta para deploy...

:: Criar pasta temporaria
mkdir deploy-temp 2>nul

:: Copiar arquivos necessarios
xcopy /E /I /Y .next deploy-temp\.next
xcopy /E /I /Y public deploy-temp\public
copy package.json deploy-temp\
copy package-lock.json deploy-temp\
copy next.config.ts deploy-temp\
copy netlify.toml deploy-temp\
copy .env.example deploy-temp\

:: Remover node_modules da pasta .next (se houver)
if exist deploy-temp\.next\cache\node_modules rd /s /q deploy-temp\.next\cache\node_modules

echo.
echo Pasta "deploy-temp" criada!
echo Arraste esta pasta para o Netlify.
pause
```

## Tamanho Esperado

- **Pasta node_modules**: ~1GB (NÃO incluir)
- **Pasta .next**: ~50MB (INCLUIR)
- **Pasta public**: ~5MB (INCLUIR)
- **Total deploy**: ~60MB (vs 1.37GB original)

## Alternativa: Deploy via Git

Se preferir, conecte o repositório Git ao Netlify:
1. Faça push para GitHub/GitLab
2. Conecte o repo no Netlify
3. Netlify faz build automático a cada push

Esta é a forma mais profissional e recomendada para projetos sérios.
