import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router";
import baseUrl from "../constant/baseUrl";
import { useTheme } from "../context/ThemeContext";

export default function Game() {
  const socketRef = useRef(null);
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const size = 3;
  const urlRoomId = searchParams.get("roomId");

  const [board, setBoard] = useState(
    Array(size)
      .fill()
      .map(() => Array(size).fill(null)),
  );
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);

  function handleMove(r, c) {
    if (!socketRef.current) return;
    if (winner) return;
    if (turn !== playerSymbol) return;
    if (board[r][c]) return;

    const index = r * size + c;
    socketRef.current.emit("makeMove", { roomId, index });
  }

  useEffect(() => {
    const socket = io(baseUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("roomCreated", (id) => {
      setRoomId(id);
      setIsWaiting(true);
      window.history.replaceState(null, "", `/game?roomId=${id}`);
    });

    socket.on("waitingPlayer", () => setIsWaiting(true));

    socket.on("playerLeft", () => {
      setIsWaiting(true);
      setWinner(null);
    });

    socket.on("startGame", (data) => {
      setBoard(data.board);
      setTurn(data.turn);
      setRoomId(data.roomId);
      setWinner(null);
      setIsWaiting(false);

      const mySymbol = data.players[socket.id];
      setPlayerSymbol(mySymbol);
    });

    socket.on("updateGame", ({ board, turn, winner }) => {
      setBoard(board);
      setTurn(turn);
      setWinner(winner);
    });

    if (urlRoomId) {
      socket.emit("joinRoom", urlRoomId);
    } else {
      socket.emit("createRoom", { size });
    }

    return () => socket.disconnect();
  }, []);

  function copyRoomId() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied!");
  }

  return (
    <div className={`min-h-screen flex items-center justify-center
      ${isDark ? "bg-gray-900" : "bg-gray-100"} px-4`}>
      <div className={`p-8 rounded-2xl shadow-lg text-center w-full max-w-md
        ${isDark ? "bg-gray-700" : "bg-white"}`}>
        <h2 className="text-2xl font-bold mb-2">👥 Multiplayer</h2>

        {roomId && (
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-gray-500">Room:</span>
            <b>{roomId}</b>
            <button
              onClick={copyRoomId}
              className="text-blue-500 hover:underline text-xs"
            >
              copy
            </button>
          </div>
        )}

        {playerSymbol && (
          <p className="text-sm mb-2">
            You are: <b>{playerSymbol}</b>
          </p>
        )}

        {isWaiting ? (
          <h3 className="text-yellow-500 mb-4 animate-pulse">
            Waiting for opponent...
          </h3>
        ) : winner ? (
          <h2 className="text-green-500 font-bold mb-4">🎉 Winner: {winner}</h2>
        ) : (
          <h3 className="mb-4">
            Turn: <b>{turn}</b>
          </h3>
        )}

        {!isWaiting && (
          <div className={`grid grid-cols-3 mt-4 w-fit mx-auto border-4
            ${isDark ? "border-gray-500" : "border-black"}`}>
            {board.flat().map((cell, i) => {
              const r = Math.floor(i / size);
              const c = i % size;

              return (
                <button
                  key={i}
                  onClick={() => handleMove(r, c)}
                  disabled={!!cell || winner || turn !== playerSymbol}
                  className={`
          w-20 h-20 text-2xl font-bold
          flex items-center justify-center
          transition
          ${cell ? isDark ? "bg-gray-600" : "bg-gray-200" : isDark ? "hover:bg-blue-500" : "hover:bg-blue-100"}
          ${isDark ? "border border-gray-500" : "border border-black"}
        `}
                  style={{
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {cell}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
