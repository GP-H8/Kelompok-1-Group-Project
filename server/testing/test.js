const { io } = require("socket.io-client");

const URL = "http://localhost:3000";

function findEmptyIndex(board) {
  const size = board.length;
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    if (board[r][c] === null) return i;
  }
  return -1;
}

function printBoard(board) {
  console.log(
    board.map((row) => row.map((c) => c || "-").join(" ")).join("\n"),
  );
  console.log("----------");
}

const p1 = io(URL);
const p2 = io(URL);

let roomId;
let p1Ready = false;
let p2Ready = false;

function tryStart() {
  if (p1Ready && p2Ready) {
    p1.emit("createRoom", { size: 3 });
  }
}

p1.on("connect", () => {
  console.log("P1 connected:", p1.id);
  p1Ready = true;
  tryStart();
});

p2.on("connect", () => {
  console.log("P2 connected:", p2.id);
  p2Ready = true;
  tryStart();
});

p1.on("roomCreated", (id) => {
  roomId = id;
  console.log("Room created:", roomId);

  p1.emit("joinRoom", roomId);
  setTimeout(() => p2.emit("joinRoom", roomId), 200);
});

p1.on("startGame", (data) => {
  console.log("P1 startGame:", data.players[p1.id]);

  if (data.players[p1.id] === "X") {
    setTimeout(() => {
      console.log("P1 move: 0");
      p1.emit("makeMove", { roomId: data.roomId, index: 0 });
    }, 300);
  }
});

p2.on("startGame", (data) => {
  console.log("P2 startGame:", data.players[p2.id]);
});

p1.on("updateGame", (data) => {
  console.log("P1 update");
  printBoard(data.board);

  if (data.winner) {
    console.log("Winner:", data.winner);
    return;
  }

  if (data.turn === "X") {
    const idx = findEmptyIndex(data.board);
    if (idx === -1) return;

    setTimeout(() => {
      console.log("P1 move:", idx);
      p1.emit("makeMove", { roomId, index: idx });
    }, 300);
  }
});

p2.on("updateGame", (data) => {
  console.log("P2 update");
  printBoard(data.board);

  if (data.winner) {
    console.log("P2 sees winner:", data.winner);
    return;
  }

  if (data.turn === "O") {
    const idx = findEmptyIndex(data.board);
    if (idx === -1) return;

    setTimeout(() => {
      console.log("P2 move:", idx);
      p2.emit("makeMove", { roomId, index: idx });
    }, 300);
  }
});

const playerVsAI = io(URL);
let aiRoomId;

playerVsAI.on("connect", () => {
  console.log("\n=== VS AI TEST ===");
  playerVsAI.emit("joinAI", { size: 3 });
});

playerVsAI.on("startGame", (data) => {
  aiRoomId = data.roomId;

  console.log("Start VS AI");
  printBoard(data.board);

  setTimeout(() => {
    console.log("Player move: 4");
    playerVsAI.emit("makeMove", { roomId: aiRoomId, index: 4 });
  }, 300);
});

playerVsAI.on("aiThinking", (data) => {
  console.log("AI thinking:", data.thinking);
});

playerVsAI.on("updateGame", (data) => {
  console.log("VS AI update");
  printBoard(data.board);

  if (data.aiExplanation) {
    console.log("AI:", data.aiExplanation);
  }

  if (data.winner) {
    console.log("Winner:", data.winner);
    return;
  }

  if (data.turn === "X") {
    const idx = findEmptyIndex(data.board);
    if (idx === -1) return;

    setTimeout(() => {
      console.log("Player move:", idx);
      playerVsAI.emit("makeMove", { roomId: aiRoomId, index: idx });
    }, 300);
  }
});

p1.on("connect_error", (err) => console.error("P1 error:", err.message));
p2.on("connect_error", (err) => console.error("P2 error:", err.message));
playerVsAI.on("connect_error", (err) =>
  console.error("AI error:", err.message),
);

setTimeout(() => {
  console.log("\n=== TEST SELESAI ===");
  p1.disconnect();
  p2.disconnect();
  playerVsAI.disconnect();
  process.exit(0);
}, 60000);
