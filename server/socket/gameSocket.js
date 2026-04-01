let rooms = {};
let waitingPlayer = null;

module.exports = (io, socket) => {
  socket.on("createRoom", ({ size = 3 }) => {
    const roomId = Math.random().toString(36).substring(7);

    rooms[roomId] = {
      players: [],
      board: Array(size).fill().map(() => Array(size).fill(null)),
      turn: "X",
      winner: null,
      size,
    };

    socket.emit("roomCreated", roomId);
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
        players: {
          [room.players[0]]: "X",
          [room.players[1]]: "O",
        },
      });
    }
  });

  socket.on("findMatch", ({ size = 3 }) => {
    if (waitingPlayer) {
      const roomId = Math.random().toString(36).substring(7);

      rooms[roomId] = {
        players: [waitingPlayer.id, socket.id],
        board: Array(size).fill().map(() => Array(size).fill(null)),
        turn: "X",
        winner: null,
        size,
      };

      socket.join(roomId);
      waitingPlayer.join(roomId);

      const payload = {
        roomId,
        board: rooms[roomId].board,
        turn: "X",
        size,
        players: {
          [rooms[roomId].players[0]]: "X",
          [rooms[roomId].players[1]]: "O",
        },
      };

      socket.emit("startGame", payload);
      waitingPlayer.emit("startGame", payload);

      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
    }
  });

  socket.on("makeMove", ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players.length < 2) return;

    const playerIndex = room.players.indexOf(socket.id);

    if (
      (room.turn === "X" && playerIndex !== 0) ||
      (room.turn === "O" && playerIndex !== 1)
    )
      return;

    if (room.board[index] || room.winner) return;

    room.board[index] = room.turn;

    const winLength = room.size;

    const winner = checkWinner(room.board, room.size, winLength);

    if (winner) {
      room.winner = winner;
    } else {
      room.turn = room.turn === "X" ? "O" : "X";
    }

    io.to(roomId).emit("updateGame", {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
    });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.players.includes(socket.id)) {
        room.players = room.players.filter((id) => id !== socket.id);

        io.to(roomId).emit("playerCount", room.players.length);

        io.to(roomId).emit("playerLeft");

        if (room.players.length === 0) {
          delete rooms[roomId];
        }
      }
    }

    if (waitingPlayer?.id === socket.id) {
      waitingPlayer = null;
    }
  });
};
