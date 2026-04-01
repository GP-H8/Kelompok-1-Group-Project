const { getAIMove, checkWinner } = require("../services/aiService");

let rooms = {};
let waitingPlayer = null;

module.exports = (io, socket) => {
  // ini buat room kosong
  socket.on("createRoom", ({ size = 3 }) => {
    const roomId = Math.random().toString(36).substring(7);
    rooms[roomId] = {
      players: [],
      board: Array(size)
        .fill()
        .map(() => Array(size).fill(null)),
      turn: "X",
      winner: null,
      size,
      mode: "multiplayer",
    };
    socket.emit("roomCreated", roomId);
    socket.emit("waitingPlayer");
  });

  // ini gabung room
  socket.on("joinRoom", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length >= 2) return;
    if (room.players.includes(socket.id)) return;

    room.players.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit("playerCount", room.players.length);

    if (room.players.length === 1) socket.emit("waitingPlayer");

    if (room.players.length === 2) {
      io.to(roomId).emit("startGame", {
        roomId,
        board: room.board,
        turn: room.turn,
        size: room.size,
        mode: room.mode,
        players: {
          [room.players[0]]: "X",
          [room.players[1]]: "O",
        },
      });
    }
  });

  //ini matchmaking
  socket.on("findMatch", ({ size = 3 }) => {
    if (waitingPlayer && waitingPlayer.size === size) {
      const roomId = Math.random().toString(36).substring(7);
      rooms[roomId] = {
        players: [waitingPlayer.socket.id, socket.id],
        board: Array(size * size).fill(null),
        turn: "X",
        winner: null,
        size,
        mode: "multiplayer",
      };

      socket.join(roomId);
      waitingPlayer.socket.join(roomId);

      const payload = {
        roomId,
        board: rooms[roomId].board,
        turn: "X",
        size,
        mode: "multiplayer",
        players: {
          [rooms[roomId].players[0]]: "X",
          [rooms[roomId].players[1]]: "O",
        },
      };

      socket.emit("startGame", payload);
      waitingPlayer.emit("startGame", payload);
      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, size };
    }
  });

  //ini mulai vs AI
  socket.on("joinAI", ({ size = 3 }) => {
    const roomId = Math.random().toString(36).substring(7);
    rooms[roomId] = {
      players: [socket.id],
      board: Array(size * size).fill(null),
      turn: "X",
      winner: null,
      size,
      mode: "ai",
      aiSymbol: "O",
    };

    socket.join(roomId);
    socket.emit("startGame", {
      roomId,
      board: rooms[roomId].board,
      turn: "X",
      size,
      mode: "ai",
      playerSymbol: "X",
    });
  });

  // ini untuk giliran, untuk ai pakai openAI
  socket.on("makeMove", async ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.board[index] || room.winner) return;

    // Validasi giliran multiplayer
    if (room.mode === "multiplayer") {
      if (room.players.length < 2) return;
      const playerIndex = room.players.indexOf(socket.id);
      if (
        (room.turn === "X" && playerIndex !== 0) ||
        (room.turn === "O" && playerIndex !== 1)
      )
        return;
    }

    // Validasi giliran vs AI
    if (room.mode === "ai") {
      if (room.turn !== "X") return;
      if (!room.players.includes(socket.id)) return;
    }

    // ini giliran player
    room.board[index] = room.turn;
    const winnerAfterPlayer = checkWinner(room.board, room.size);

    if (winnerAfterPlayer) {
      room.winner = winnerAfterPlayer;
      io.to(roomId).emit("updateGame", {
        board: room.board,
        turn: room.turn,
        winner: room.winner,
      });
      return;
    }

    room.turn = room.turn === "X" ? "O" : "X";
    io.to(roomId).emit("updateGame", {
      board: room.board,
      turn: room.turn,
      winner: null,
    });

    // ini giliran AI
    if (room.mode === "ai" && room.turn === room.aiSymbol) {
      io.to(roomId).emit("aiThinking", { thinking: true });

      try {
        const { index: aiIndex, explanation } = await getAIMove(
          [...room.board], // salin board agar tidak termutasi selama async
          room.aiSymbol,
          room.size,
        );

        // Guard: room bisa saja sudah dihapus selama menunggu respons OpenAI
        if (!rooms[roomId] || room.winner) return;

        room.board[aiIndex] = room.aiSymbol;
        const winnerAfterAI = checkWinner(room.board, room.size);

        if (winnerAfterAI) {
          room.winner = winnerAfterAI;
        } else {
          room.turn = "X";
        }

        io.to(roomId).emit("updateGame", {
          board: room.board,
          turn: room.turn,
          winner: room.winner,
          aiMove: aiIndex,
          aiExplanation: explanation,
        });
      } catch (err) {
        // Seharusnya tidak sampai sini karena aiService sudah handle error,
        // tapi tetap ada guard untuk keamanan
        console.error("[gameSocket] Unexpected AI error:", err.message);
      } finally {
        io.to(roomId).emit("aiThinking", { thinking: false });
      }
    }
  });

  // ini waktu disconnect
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room.players.includes(socket.id)) continue;

      room.players = room.players.filter((id) => id !== socket.id);
      io.to(roomId).emit("playerCount", room.players.length);
      io.to(roomId).emit("playerLeft");

      if (room.players.length === 0) delete rooms[roomId];
    }

    if (waitingPlayer?.id === socket.id) waitingPlayer = null;
  });
};
