const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);

app.use("/", chatRoutes);

io.on("connection", (socket) => {

  socket.on("join", (username) => {
    socket.username = username;
  });
  
  socket.on("message", (msg) => {
    console.log("Mensagem recebida:", msg);
    io.emit("message", msg);
  });

});

const PORT = 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
