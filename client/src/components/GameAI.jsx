import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import baseUrl from "../constant/baseUrl";
import { useNavigate } from "react-router";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { useTheme } from "../context/ThemeContext";

export default function GameAI() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const size = 3;

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [board, setBoard] = useState(
    Array(size)
      .fill()
      .map(() => Array(size).fill(null)),
  );
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [isThinking, setIsThinking] = useState(false);

  function showToast(text, color = "#ef4444") {
    Toastify({
      text,
      duration: 2000,
      gravity: "bottom",
      position: "right",
      style: { background: color },
    }).showToast();
  }

  function handleMove(r, c) {
    if (!socketRef.current) return;
    if (winner) return;

    const index = r * size + c;
    socketRef.current.emit("makeMove", { roomId, index });
  }

  useEffect(() => {
    const socket = io(baseUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("startGame", (data) => {
      setBoard(data.board);
      setTurn(data.turn);
      setRoomId(data.roomId);
      setWinner(null);
    });

    socket.on("updateGame", ({ board, turn, winner }) => {
      setBoard(board);
      setTurn(turn);
      setWinner(winner);

      if (winner) {
        showToast(`Winner: ${winner}`, "#22c55e");
      }
    });

    socket.on("aiThinking", ({ thinking }) => {
      setIsThinking(thinking);
    });

    socket.emit("joinAI", { size });

    return () => socket.disconnect();
  }, []);

  function resetGame() {
    socketRef.current.emit("joinAI", { size });
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <div
        className={`p-8 rounded-2xl shadow-lg text-center w-full max-w-md ${
          isDark ? "bg-gray-700" : "bg-white"
        }`}
      >
        <h2 className="text-2xl font-bold mb-2">🤖 VS AI</h2>

        {winner ? (
          <h2 className="text-green-500 font-bold mb-4">🎉 Winner: {winner}</h2>
        ) : (
          <h3 className="mb-2">
            Turn: <b>{turn}</b>
          </h3>
        )}

        {isThinking && (
          <p className="text-blue-500 animate-pulse mb-4">
            🤖 AI is thinking...
          </p>
        )}

        <div
          className={`grid grid-cols-3 mt-4 border-4 ${
            isDark ? "border-gray-500" : "border-black"
          }`}
        >
          {board.flat().map((cell, i) => {
            const r = Math.floor(i / size);
            const c = i % size;

            return (
              <button
                key={i}
                onClick={() => handleMove(r, c)}
                disabled={winner || turn !== "X" || isThinking}
                className={`
                  w-full aspect-square
                  text-2xl font-bold
                  flex items-center justify-center
                  leading-none
                  ${
                    cell
                      ? isDark
                        ? "bg-gray-600"
                        : "bg-gray-200"
                      : isDark
                        ? "hover:bg-blue-500"
                        : "hover:bg-blue-100"
                  }
                  ${isDark ? "border border-gray-500" : "border border-black"}
                `}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() =>
              navigate("/", {
                state: { message: "Successfully back to home!" },
              })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Back to home
          </button>

          {winner && (
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              🔄 Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
