const socket = io();
let currentUser = "";
let activeChatId = "geral";

const chats = {
  geral: {
    id: "geral",
    name: "Geral",
    avatar: null,
    messages: [],
    publics: [],
    chatKey: null,
  },
};

const systemMessageShown = new Set();

const loginSection = document.querySelector(".login");
const chatContainer = document.querySelector(".chat-container");
const loginForm = document.getElementById("loginForm");
const nameInput =
  document.getElementById("nameInput") ||
  loginForm.querySelector("input[type=text]");
const avatarInput = document.getElementById("avatarInput") || { value: "" };
const contactsList = document.getElementById("contactsList");
const newChatBtn = document.getElementById("newChatButton");
const userAvatarContainer = document.querySelector(
  ".sidebar-header .user-avatar"
);
const userNameSpan = document.querySelector(
  ".sidebar-header .user-profile span"
);
const activeChatNameEl = document.getElementById("activeChatName");
const activeChatStatus = document.getElementById("activeChatStatus");
const chatMessages = document.getElementById("chatMessages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const searchInput = document.querySelector(".search-box input");
const backButton = document.querySelector(".back-button");

const svgAvatar = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" 
       viewBox="0 0 24 24" fill="none" stroke="currentColor" 
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="10" r="3"/>
    <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
  </svg>
`;

async function setupKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { keyPair, publicJwk };
}

let myKeyPair;
setupKeyPair().then(({ keyPair, publicJwk }) => {
  myKeyPair = keyPair;
});

async function deriveChatKey(room, publics) {
  const sorted = publics
    .map((p) => JSON.stringify(p.publicJwk))
    .sort()
    .join("");
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sorted),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const salt = encoder.encode(room);
  const chatKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  chats[room].chatKey = chatKey;
}

async function encryptAES(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptAES(dataB64, key) {
  const combined = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return new TextDecoder().decode(plain);
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderSidebar(filter = "") {
  const search = filter.toLowerCase();
  contactsList.innerHTML = Object.values(chats)
    .filter((c) => c.name.toLowerCase().includes(search))
    .map(
      (c) => `
      <div class="contact-item ${
        c.id === activeChatId ? "active" : ""
      }" data-id="${c.id}">
        <div class="contact-avatar">
          ${
            c.avatar
              ? `<img src="${c.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"/>`
              : svgAvatar
          }
        </div>
        <div class="contact-info">
          <h3 class="contact-name">${c.name}</h3>
        </div>
      </div>
    `
    )
    .join("");

  contactsList.querySelectorAll(".contact-item").forEach((item) => {
    item.addEventListener("click", () => setActiveChat(item.dataset.id));
  });
}

function renderMessages() {
  const msgs = chats[activeChatId].messages;
  chatMessages.innerHTML = msgs
    .map((m) => {
      if (m.isSystem) {
        return `
          <div class="message message--system">
            <div class="message-content">
              <em>${m.content}</em>
              <span class="message-time">${m.time}</span>
            </div>
          </div>
        `;
      }
      return `
        <div class="message ${m.isSelf ? "message--self" : "message--other"}">
          <div class="message-content">
            ${
              !m.isSelf
                ? `<span class="message--sender">${m.sender}</span>`
                : ""
            }
            <p>${m.content}</p>
            <span class="message-time">${m.time}</span>
          </div>
        </div>
      `;
    })
    .join("");
  scrollToBottom();
}

async function setActiveChat(chatId) {
  activeChatId = chatId;
  if (!chats[chatId]) {
    chats[chatId] = {
      id: chatId,
      name: chatId,
      avatar: null,
      messages: [],
      publics: [],
      chatKey: null,
    };
  }
  activeChatNameEl.textContent = chats[chatId].name;
  activeChatStatus.textContent = "Online";
  renderSidebar();
  renderMessages();

  if (window.innerWidth <= 768) {
    chatContainer.classList.add("show-chat-mobile");
  }

  socket.emit("join", { user: currentUser, chat: chatId });
  const publicJwk = await crypto.subtle.exportKey("jwk", myKeyPair.publicKey);
  socket.emit("public-key", { user: currentUser, chat: chatId, publicJwk });
}

socket.on("user-joined", ({ user, chat }) => {
  console.log("user-joined event:", user, chat);
  if (user === currentUser) return;
  if (systemMessageShown.has(chat)) return;

  const systemMessage = {
    sender: "Sistema",
    content: `Usuário "${user}" entrou no chat.`,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isSystem: true,
    isSelf: false,
  };

  if (!chats[chat]) return;

  chats[chat].messages.push(systemMessage);

  if (chat === activeChatId) renderMessages();

  systemMessageShown.add(chat);
});

socket.on("history", async ({ messages, image, publics }) => {
  if (!chats[activeChatId]) {
    chats[activeChatId] = {
      id: activeChatId,
      name: activeChatId,
      avatar: image,
      messages: [],
      publics,
      chatKey: null,
    };
  }
  chats[activeChatId].avatar = image || chats[activeChatId].avatar;
  chats[activeChatId].publics = publics;
  await deriveChatKey(activeChatId, publics);

  chats[activeChatId].messages = await Promise.all(
    messages.map(async (m) => ({
      sender: m.user,
      content: await decryptAES(m.text, chats[activeChatId].chatKey),
      time: m.time,
      isSelf: m.user === currentUser,
    }))
  );
  renderSidebar();
  renderMessages();
});

socket.on("public-keys", async ({ publics }) => {
  chats[activeChatId].publics = publics;
  await deriveChatKey(activeChatId, publics);
});

socket.on("message", async (m) => {
  if (m.user === currentUser) return;
  const room = m.chat || "geral";
  if (!chats[room]) return;
  const plain = await decryptAES(m.text, chats[room].chatKey);
  chats[room].messages.push({
    sender: m.user,
    content: plain,
    time: m.time,
    isSelf: false,
  });
  if (room === activeChatId) renderMessages();
});

loginSection.classList.add("active");
chatContainer.classList.add("hidden");

searchInput.addEventListener("input", (e) => {
  renderSidebar(e.target.value);
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return alert("Digite seu nome");
  currentUser = name;
  if (userNameSpan) userNameSpan.textContent = currentUser;
  const avatarUrl = avatarInput.value.trim();
  if (avatarUrl && userAvatarContainer) {
    userAvatarContainer.innerHTML = `<img src="${avatarUrl}" class="user-avatar-img" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"/>`;
  }
  loginSection.classList.remove("active");
  chatContainer.classList.remove("hidden");
  renderSidebar();
  setActiveChat("geral");
});

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const cipher = await encryptAES(text, chats[activeChatId].chatKey);
  socket.emit("message", { content: cipher, time: now, chat: activeChatId });
  chats[activeChatId].messages.push({
    sender: currentUser,
    content: text,
    time: now,
    isSelf: true,
  });
  renderMessages();
  messageInput.value = "";
});

backButton.addEventListener("click", () => {
  chatContainer.classList.remove("show-chat-mobile");
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    chatContainer.classList.remove("show-chat-mobile");
  }
});

newChatBtn.addEventListener("click", () => {
  const name = prompt("Digite o nome da sala:");
  if (!name) return;
  const avatar = prompt("URL da imagem do chat (opcional):");
  if (!chats[name]) {
    chats[name] = {
      id: name,
      name,
      avatar: avatar || null,
      messages: [],
      publics: [],
      chatKey: null,
    };
  }
  setActiveChat(name);
});
