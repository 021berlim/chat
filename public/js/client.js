const socket = io();

const login = document.querySelector(".login");
const loginForm = login.querySelector(".login__form");
const loginInput = login.querySelector(".login__input");

const chat = document.querySelector(".chat");
const chatForm = chat.querySelector(".chat__form");
const chatInput = chat.querySelector(".chat__input");
const chatMessages = chat.querySelector(".chat__messages");

const colors = [
  "cadetblue",
  "darkgoldenrod",
  "cornflowerblue",
  "darkkhaki",
  "hotpink",
  "gold",
];

let user = { id: "", name: "", color: "" };

const SECRET_KEY = "minha-chave-secreta-123";

function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function createMessageSelfElement(content) {
  const div = document.createElement("div");
  div.classList.add("message--self");
  div.textContent = content;
  return div;
}

function createMessageOtherElement(content, sender, senderColor) {
  const div = document.createElement("div");
  const span = document.createElement("span");

  div.classList.add("message--other");

  span.classList.add("message--sender");
  span.style.color = senderColor;
  span.textContent = sender;

  div.appendChild(span);
  div.appendChild(document.createTextNode(" " + content));

  return div;
}

function scrollScreen() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function processMessage({ userId, userName, userColor, content }) {
  let decrypted = "";
  try {
    const bytes = CryptoJS.AES.decrypt(content, SECRET_KEY);
    decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) decrypted = "(Mensagem inválida)";
  } catch {
    decrypted = "(Erro ao descriptografar)";
  }

  const msgEl =
    userId === user.id
      ? createMessageSelfElement(decrypted)
      : createMessageOtherElement(decrypted, userName, userColor);

  chatMessages.appendChild(msgEl);
  scrollScreen();
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = loginInput.value.trim();
  if (!name) return alert("Informe seu nome!");

  user.id = crypto.randomUUID();
  user.name = name;
  user.color = getRandomColor();

  login.style.display = "none";
  chat.style.display = "flex";

  socket.emit("join", { userId: user.id, userName: user.name, userColor: user.color });
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const messageText = chatInput.value.trim();
  if (!messageText) return;

  const encryptedMessage = CryptoJS.AES.encrypt(messageText, SECRET_KEY).toString();

  socket.emit("message", {
    userId: user.id,
    userName: user.name,
    userColor: user.color,
    content: encryptedMessage,
  });

  chatInput.value = "";
});

socket.on("message", (data) => {
  processMessage(data);
});
