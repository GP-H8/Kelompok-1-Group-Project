const { getAIMove, checkWinner } = require("../services/aiService");

let rooms = {};
let waitingPlayer = null;

module.exports = (io, socket) => {
  socket.on("createRoom", ({ size = 3 }) => {
    const roomId = Math.random().toString(36).substring(7);

    rooms[roomId] = {
      players: [socket.id],
      board: Array(size)
        .fill()
        .map(() => Array(size).fill(null)),
      turn: "X",
      winner: null,
      size,
      mode: "multiplayer",
    };

    socket.join(roomId);

    socket.emit("roomCreated", roomId);
    socket.emit("waitingPlayer");
  });

  socket.on("joinRoom", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length >= 2) return;
    if (room.players.includes(socket.id)) return;

    room.players.push(socket.id);
    socket.join(roomId);

    io.to(roomId).emit("playerCount", room.players.length);

    if (room.players.length === 1) {
      socket.emit("waitingPlayer");
    }

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

  socket.on("findMatch", ({ size = 3 }) => {
    if (waitingPlayer && waitingPlayer.size === size) {
      const roomId = Math.random().toString(36).substring(7);

      rooms[roomId] = {
        players: [waitingPlayer.socket.id, socket.id],
        board: Array(size)
          .fill()
          .map(() => Array(size).fill(null)),
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
      waitingPlayer.socket.emit("startGame", payload);

      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, size };
    }
  });

  socket.on("joinAI", ({ size = 3 }) => {
    const roomId = Math.random().toString(36).substring(7);

    rooms[roomId] = {
      players: [socket.id],
      board: Array(size)
        .fill()
        .map(() => Array(size).fill(null)),
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

  socket.on("makeMove", async ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.winner) return;

    const row = Math.floor(index / room.size);
    const col = index % room.size;

    if (row < 0 || row >= room.size || col < 0 || col >= room.size) return;

    if (room.board[row][col] !== null) return;

    if (room.mode === "multiplayer") {
      if (room.players.length < 2) return;

      const playerIndex = room.players.indexOf(socket.id);

      if (
        (room.turn === "X" && playerIndex !== 0) ||
        (room.turn === "O" && playerIndex !== 1)
      )
        return;
    }

    if (room.mode === "ai") {
      if (room.turn !== "X") return;
      if (!room.players.includes(socket.id)) return;
    }

    room.board[row][col] = room.turn;

    let winner = checkWinner(room.board, room.size);

    const isDraw = room.board.every((r) => r.every((c) => c !== null));

    if (winner || isDraw) {
      room.winner = winner || "draw";

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

    if (room.mode === "ai" && room.turn === room.aiSymbol) {
      io.to(roomId).emit("aiThinking", { thinking: true });

      try {
        const { index: aiIndex, explanation } = await getAIMove(
          room.board.map((r) => [...r]),
          room.aiSymbol,
          room.size,
        );

        const currentRoom = rooms[roomId];
        if (!currentRoom || currentRoom.winner) return;

        const aiRow = Math.floor(aiIndex / currentRoom.size);
        const aiCol = aiIndex % currentRoom.size;

        if (currentRoom.board[aiRow][aiCol] !== null) return;

        currentRoom.board[aiRow][aiCol] = currentRoom.aiSymbol;

        let aiWinner = checkWinner(currentRoom.board, currentRoom.size);
        const isDrawAI = currentRoom.board.every((r) =>
          r.every((c) => c !== null),
        );

        if (aiWinner || isDrawAI) {
          currentRoom.winner = aiWinner || "draw";
        } else {
          currentRoom.turn = "X";
        }

        io.to(roomId).emit("updateGame", {
          board: currentRoom.board,
          turn: currentRoom.turn,
          winner: currentRoom.winner,
          aiMove: aiIndex,
          aiExplanation: explanation,
        });
      } catch (err) {
        console.error("[AI ERROR]", err.message);
      } finally {
        io.to(roomId).emit("aiThinking", { thinking: false });
      }
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (!room.players.includes(socket.id)) continue;

      room.players = room.players.filter((id) => id !== socket.id);

      if (room.players.length === 1) {
        io.to(roomId).emit("waitingPlayer");
      }

      if (room.players.length === 0) {
        delete rooms[roomId];
      }
    }

    if (waitingPlayer?.socket.id === socket.id) {
      waitingPlayer = null;
    }
  });
};
