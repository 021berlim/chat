const chats = {
  geral: {
    name: "Geral",
    image: null,
    messages: [],
    publics: [],
  },
};

exports.initSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("public-key", ({ user, chat, publicJwk }) => {
      const room = chat || "geral";
      socket.username = user;
      socket.chat = room;

      if (!chats[room]) {
        chats[room] = { name: room, image: null, messages: [], publics: [] };
      }
      const idx = chats[room].publics.findIndex((p) => p.user === user);
      if (idx >= 0) chats[room].publics[idx].publicJwk = publicJwk;
      else chats[room].publics.push({ user, publicJwk });

      io.to(room).emit("public-keys", { publics: chats[room].publics });
    });

    socket.on("join", ({ user, chat }) => {
      const room = chat || "geral";
      socket.username = user;
      socket.chat = room;

      if (!chats[room]) {
        chats[room] = { name: room, image: null, messages: [], publics: [] };
      }

      socket.join(room);

      io.to(room).emit("user-joined", { user, chat: room });

      socket.emit("history", {
        messages: chats[room].messages,
        image: chats[room].image,
        publics: chats[room].publics,
      });
    });

    socket.on("message", ({ content, time, chat }) => {
      const chatId = chat || "geral";

      console.log(
        `[Mensagem recebida] Usuário: ${
          socket.username
        } | Chat: ${chatId} | Conteúdo (criptografado): ${content.slice(
          0,
          20
        )}… | Hora: ${time}`
      );

      if (!chats[chatId]) {
        chats[chatId] = {
          name: chatId,
          image: null,
          messages: [],
          publics: [],
        };
      }

      const messageData = {
        user: socket.username,
        text: content,
        time,
        chat: chatId,
      };

      chats[chatId].messages.push(messageData);
      io.to(chatId).emit("message", messageData);
    });
  });
};
