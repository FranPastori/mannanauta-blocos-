# Quiz "É IoT ou não é?" · mannaIoT Módulo 01

- `index.html`: quiz para os estudantes (entram com a conta Google; o resultado é salvo).
- `professor.html`: painel da professora com quem respondeu, acertos, data, respostas e planilha CSV.
- `firebase-config.js`: dados do projeto Firebase (preencher uma vez).

## Configurar o Firebase (uma vez, gratuito)

1. Acesse https://console.firebase.google.com e crie um projeto (ex.: `mannaiot-quiz`). O Google Analytics pode ficar desligado.
2. **Authentication → Começar → Google → Ativar**. Escolha o e-mail de suporte e salve.
3. **Authentication → Configurações → Domínios autorizados → Adicionar domínio**: `franpastori.github.io`.
4. **Firestore Database → Criar banco de dados** → modo de produção → região `southamerica-east1` (São Paulo).
5. **Firestore → Regras**: cole as regras abaixo, troque o e-mail pelo seu e clique em **Publicar**.
6. **Configurações do projeto (engrenagem) → Seus apps → Web (`</>`)**: registre o app e copie `apiKey`, `authDomain`,
   `projectId` e `appId` para o arquivo `firebase-config.js`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resultados/{id} {
      // o estudante logado só grava o próprio resultado
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.email == request.auth.token.email;
      // só a professora lê os resultados
      allow read: if request.auth != null
                  && request.auth.token.email in ['SEU-EMAIL@gmail.com'];
    }
  }
}
```

A `apiKey` do Firebase não é secreta: quem protege os dados são as regras acima.
