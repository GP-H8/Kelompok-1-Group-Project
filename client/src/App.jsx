import { BrowserRouter, Routes, Route } from 'react-router';
import './App.css'
import Game from './components/Game';
import GameAI from './components/GameAI';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/aiGame" element={<GameAI />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
