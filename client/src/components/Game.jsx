import baseUrl from '../constant/baseUrl';
import axios from 'axios';
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client';

export default function Game() {
    const [currentTurn, setCurrentTurn] = useState(null);
    const [gameBoard, setGameBoard] = useState(Array(9).fill(null));
    const socket = io(baseUrl);

    useEffect(() => {
        socket.on("startGame", ({ turn, size, roomId, board, players }) => {
            setCurrentTurn(turn);
            setGameBoard(board);
        });
    }, []);

  return (
    <div>
        <h2>Current player turn: {currentTurn}</h2>
        <div>
            {gameBoard.map((row, index) => (
                <div key={index}>
                    {row.map((cell, cellId) => (
                        <button key={cellId}>{cell}</button>
                    ))}
                </div>
            ))}
        </div>
    </div>
  );
}