# Chat

Chat em tempo real baseado em Socket.IO, com interface intuitiva e criptografia ponta a ponta simples (AES) para proteger as mensagens do usuário.

---

## Funcionalidades

- Login simples com nome de usuário
- Chat em tempo real usando WebSocket com Socket.IO
- Envio e recepção de mensagens criptografadas no cliente
- Estilo moderno inspirado no Telegram
- Suporte a emojis na mensagem
- Mensagens exibidas com cores e estilo diferenciados para remetente e destinatário
- Mensagens exibidas no console do servidor (sem descriptografar)

---

## Tecnologias utilizadas

- Node.js
- Express
- Socket.IO
- AES (Web Crypto API no cliente)
- HTML, CSS e JavaScript puros
- EJS para renderização (opcional)

---

## Estrutura do projeto

```

/public
/css
style.css
/js
client.js
/views
index.html (ou index.ejs)
/controllers
chatController.js
/routes
chatRoutes.js
server.js
README.md

````

---

## Como rodar localmente

1. Clone o repositório:

```bash
git clone https://github.com/seuusuario/chat.git
cd chat
````

2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor:

```bash
node server.js
```

4. Acesse em `http://localhost:3000`

---

## Como usar

* Digite seu nome no campo de login e entre no chat
* Digite mensagens e envie; as mensagens são criptografadas e enviadas ao servidor
* O servidor retransmite as mensagens para todos os clientes conectados
* Os clientes descriptografam e exibem as mensagens recebidas

---

## Sobre a criptografia

A criptografia é feita no cliente usando AES-GCM com uma chave secreta compartilhada (hardcoded para fins didáticos). O servidor apenas retransmite as mensagens cifradas sem acesso ao conteúdo.

> **Nota:** Por motivos de simplicidade, a chave está visível no cliente. Em produção, recomenda-se usar protocolos de troca segura de chaves (ex: Diffie-Hellman) para garantir segurança real.

---

## Licença

Este projeto está licenciado sob a MIT License.

---

## Autor

João Motta
