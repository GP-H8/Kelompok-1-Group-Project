import { BrowserRouter, Routes, Route } from "react-router";
import Game from "./components/Game";
import GameAI from "./components/GameAI";
import Home from "./components/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/game-ai" element={<GameAI />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
