# Nexus - Agenda Inteligente

Organize suas tarefas com facilidade. Uma aplicação de gerenciamento de tarefas com sistema de pontos, níveis de energia e integração em tempo real com Firebase.

## Funcionalidades

- Criar, editar e excluir tarefas
- Categorias com cores personalizáveis
- 4 níveis de prioridade (Baixa, Média, Alta, Urgente)
- Sistema de energia (1-5) com pontuação gamificada
- Modo Foco com timer
- Visualização em Calendário
- Notificações de tarefas
- Tema claro/escuro
- Exportação de tarefas (CSV/JSON)
- Atalhos de teclado (N, F, C, /, Esc)
- Dados sincronizados em tempo real com Firebase Realtime Database

## Tecnologias

- **Framework:** Next.js 16
- **Linguagem:** TypeScript
- **UI:** React 19, Tailwind CSS 4, Radix UI, Framer Motion
- **Banco de dados:** Firebase Realtime Database
- **Validação:** Zod
- **Deploy:** Netlify (estático)

## Pré-requisitos

- Node.js 20+
- npm ou yarn
- Conta Firebase com Realtime Database criado

## Instalação

```bash
git clone <url-do-repositorio>
cd nexus-agenda-inteligente
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto com as variáveis do Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seu_projeto-default-rtdb.firebaseio.com
```

## Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Build

```bash
npm run build
```

Gera arquivos estáticos na pasta `out/`.

## Deploy no Netlify

1. Execute `npm run build`
2. Arraste a pasta `out/` para [app.netlify.com/drop](https://app.netlify.com/drop)

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| N | Nova tarefa |
| F | Modo Foco |
| C | Calendário |
| / | Mostrar atalhos |
| Esc | Fechar modal |

## Licença

Privado
