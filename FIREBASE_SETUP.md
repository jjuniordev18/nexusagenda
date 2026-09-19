# Configuração do Firebase para Autenticação e Isolamento de Dados

## 1. Habilitar Autenticação no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. No menu lateral, vá em **Authentication**
4. Clique em **Get Started**
5. Na aba **Sign-in method**, habilite os provedores desejados:
   - **Email/Password**: Para login com email e senha
   - **Google**: Para login com conta Google (opcional)

## 2. Configurar Regras de Segurança do Realtime Database

1. No Firebase Console, vá em **Realtime Database**
2. Clique na aba **Rules**
3. Substitua as regras existentes pelas regras fornecidas no arquivo `firebase.rules`:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "tasks": {
          ".validate": "newData.hasChildren(['title', 'priority', 'energyLevel', 'status', 'points', 'createdAt'])"
        },
        "categories": {
          ".validate": "newData.hasChildren(['name', 'color'])"
        }
      }
    }
  }
}
```

4. Clique em **Publish**

## 3. Estrutura de Dados no Firebase

Com as novas regras, a estrutura de dados será:

```
/users
  /{uid_do_usuario}
    /tasks
      /{task_id}
        title: "Tarefa"
        priority: "medium"
        energyLevel: 3
        status: "pending"
        points: 15
        createdAt: 1234567890
        description: "Descrição"
        dueDate: "2024-01-01T10:00"
        categoryId: "1"
    /categories
      /{category_id}
        name: "Trabalho"
        color: "#6366f1"
```

## 4. Migrar Dados Existentes (Opcional)

Se você já tem tarefas no banco de dados, precisará migrá-las para a nova estrutura. Você pode:

1. **Exportar dados atuais** usando a funcionalidade de exportação do app (CSV/JSON)
2. **Criar uma conta de usuário**
3. **Importar os dados** novamente (serão salvos na nova estrutura)

Ou usar o Firebase CLI para migrar dados:

```bash
# Exportar dados atuais
firebase database:get / > backup.json

# Após configurar autenticação, importar para o novo caminho
# (substitua UID pelo ID do usuário)
firebase database:set /users/UID/backup.json
```

## 5. Testar a Implementação

1. Execute o projeto:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000/login`
3. Crie uma nova conta ou faça login
4. Verifique se as tarefas são criadas e lidas corretamente
5. Faça logout e crie outra conta
6. Verifique que as tarefas são isoladas por usuário

## 6. Variáveis de Ambiente

Certifique-se de que seu arquivo `.env` contém todas as variáveis necessárias:

```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

## 7. Considerações de Segurança

- **Regras de Segurança**: As regras garantem que cada usuário só possa acessar seus próprios dados
- **Validação de Dados**: As regras também validam a estrutura dos dados salvos
- **Autenticação**: Todos os usuários devem estar autenticados para acessar o banco de dados
- **Isolamento de Dados**: Cada usuário tem seu próprio espaço de dados em `users/{uid}`

## 8. Solução de Problemas

### Erro de Permissão Negada
- Verifique se as regras de segurança estão corretas
- Confirme se o usuário está autenticado
- Verifique se o UID no caminho corresponde ao UID do usuário autenticado

### Tarefas Não Aparecem
- Verifique se o usuário está logado
- Confirme se o caminho do banco de dados está correto
- Verifique o console do navegador para erros

### Logout Não Funciona
- Verifique se o Firebase Auth está configurado corretamente
- Confirme se as dependências estão instaladas