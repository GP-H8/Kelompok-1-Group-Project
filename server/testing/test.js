// ini cuma untuk ngecek apakah sudah bisa jalan / belum socketnya, kalau mau dihapus gapapa

// test.js
const { io } = require("socket.io-client");

console.log("tes sebelum connect localhost");

// const socket = io("http://localhost:3000");

// console.log("Script started...");

const p1 = io("http://localhost:3000");
const p2 = io("http://localhost:3000");

console.log("tes setelah connect localhost");
let roomId;
let p1Connected = false;
let p2Connected = false;

function tryStart() {
  // Tunggu keduanya connect dulu
  if (!p1Connected || !p2Connected) return;

  p1.emit("createRoom", { size: 3 });
}

p1.on("connect", () => {
  console.log("P1 connected:", p1.id);
  p1Connected = true;
  tryStart();
});

p2.on("connect", () => {
  console.log("P2 connected:", p2.id);
  p2Connected = true;
  tryStart();
});

p1.on("roomCreated", (id) => {
  roomId = id;
  console.log("Room created:", roomId);
  // P1 join dulu, baru P2
  p1.emit("joinRoom", roomId);
  setTimeout(() => p2.emit("joinRoom", roomId), 100); // delay kecil agar P1 masuk duluan
});

p1.on("startGame", (data) => {
  const p1Symbol = data.players[p1.id];
  console.log("P1 startGame, symbol:", p1Symbol);

  if (p1Symbol === "X") {
    console.log("P1 makeMove index 0");
    p1.emit("makeMove", { roomId: data.roomId, index: 0 });
  }
});

p2.on("startGame", (data) => {
  const p2Symbol = data.players[p2.id];
  console.log("P2 startGame, symbol:", p2Symbol);
});

p1.on("updateGame", (data) => {
  console.log("P1 updateGame board:", data.board);
  console.log("Giliran:", data.turn);
  if (data.winner) console.log("Pemenang:", data.winner);

  if (data.turn === "X") {
    const emptyIndex = data.board.findIndex((cell) => cell === null);
    console.log("P1 makeMove index", emptyIndex);
    p1.emit("makeMove", { roomId, index: emptyIndex });
  }
});

p2.on("updateGame", (data) => {
  console.log("P2 updateGame board:", data.board);
  if (data.winner) {
    console.log("P2 lihat pemenang:", data.winner);
    return;
  }

  if (data.turn === "O") {
    const emptyIndex = data.board.findIndex((cell) => cell === null);
    console.log("P2 makeMove index", emptyIndex);
    p2.emit("makeMove", { roomId, index: emptyIndex });
  }
});

// ===== TEST VS AI =====
const playerVsAI = io("http://localhost:3000");
let aiRoomId;

playerVsAI.on("connect", () => {
  console.log("\n=== TEST VS AI ===");
  console.log("Player connected:", playerVsAI.id);
  playerVsAI.emit("joinAI", { size: 3 });
});

playerVsAI.on("startGame", (data) => {
  aiRoomId = data.roomId;
  console.log("VS AI startGame:", data);

  // Player langsung gerak di index 4 (tengah)
  console.log("Player makeMove index 4");
  playerVsAI.emit("makeMove", { roomId: aiRoomId, index: 4 });
});

playerVsAI.on("aiThinking", (data) => {
  console.log("AI thinking:", data.thinking);
});

playerVsAI.on("updateGame", (data) => {
  console.log("VS AI board:", data.board);
  console.log("Giliran:", data.turn);

  if (data.aiExplanation) {
    console.log("AI explanation:", data.aiExplanation);
  }

  if (data.winner) {
    console.log("Pemenang:", data.winner);
    return;
  }

  // Kalau giliran X lagi (player), balas move
  if (data.turn === "X") {
    const emptyIndex = data.board.findIndex((cell) => cell === null);
    console.log("Player makeMove index", emptyIndex);
    playerVsAI.emit("makeMove", { roomId: aiRoomId, index: emptyIndex });
  }
});

playerVsAI.on("connect_error", (err) =>
  console.error("VS AI gagal konek:", err.message),
);

p1.on("connect_error", (err) => console.error("P1 gagal konek:", err.message));
p2.on("connect_error", (err) => console.error("P2 gagal konek:", err.message));

setTimeout(() => {
  console.log("Test selesai");
  p1.disconnect();
  p2.disconnect();
  playerVsAI.disconnect();
  process.exit(0);
}, 60000);
