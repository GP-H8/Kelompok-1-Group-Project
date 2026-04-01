import { useNavigate } from "react-router";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Home() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState("");
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      <div
        className={`w-full max-w-md p-8 rounded-2xl shadow-lg transition ${
          isDark ? "bg-gray-800" : "bg-white"
        }`}
      >
        <h1 className="text-3xl font-bold text-center mb-6">🎮 Tic Tac Toe</h1>

        <button
          onClick={toggleTheme}
          className={`w-full mb-6 py-2 rounded-lg border transition ${
            isDark
              ? "border-gray-600 hover:bg-gray-700"
              : "border-gray-300 hover:bg-gray-100"
          }`}
        >
          {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>

        <button
          onClick={() => navigate("/game-ai")}
          className="w-full mb-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
        >
          🤖 Play vs AI
        </button>

        <button
          onClick={() => navigate("/game")}
          className="w-full mb-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
        >
          👥 Create Room
        </button>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className={`px-3 py-2 rounded-lg border outline-none transition ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-black"
            }`}
          />

          <button
            onClick={() => {
              if (!roomInput) return;
              navigate(`/game?roomId=${roomInput}`);
            }}
            className="py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition"
          >
            🚪 Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
