import baseUrl from '../constant/baseUrl';
import axios from 'axios';
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client';

export default function Game() {
    const [currentTurn, setCurrentTurn] = useState(null);
    const [gameBoard, setGameBoard] = useState(Array(9).fill(null));
    const [winner, setWinner] = useState(null);
    const socket = io(baseUrl);

    async function handleMove(row, column) {
        try {
            if (winner) throw new Error("Game already done!");
            if (gameBoard[row][column]) throw new Error("Cell occupied!");
            if (currentTurn === "X" && socket.id !== players[0]) throw new Error("Not your turn!");
            if (currentTurn === "O" && socket.id !== players[1]) throw new Error("Not your turn!");

            if (currentTurn === "X") {
                gameBoard[row][column] = "X";
            } else {
                gameBoard[row][column] = "O";
            }
            socket.emit("gameState", { turn: currentTurn, row, column, board: gameBoard });
        } catch (error) {
            console.error(error.response.data.message);
        }
    }


    useEffect(() => {
        socket.on("startGame", ({ turn, size, roomId, board, players }) => {
            setCurrentTurn(turn);
            setGameBoard(board);
        });
        socket.on("gameState", ({ turn, row, column, board }) => {
            setGameBoard(board);
            setCurrentTurn(turn);
        });
        socket.on("updateGame", ({ board, turn, winner }) => {
            setGameBoard(board);
            setCurrentTurn(turn);
            setWinner(winner);
        });
    }, [gameBoard, currentTurn]);

  return (
    <div>
        {winner && <h2>Winner: {winner}</h2>}
        {!winner && <h3>Current Turn: {currentTurn}</h3>}
        <div>
            {gameBoard.map((row, index) => (
                <div key={index}>
                    {row.map((cell, cellId) => (
                        <button key={cellId} onClick={(e) => handleMove(index, cellId)}>{cell}</button>
                    ))}
                </div>
            ))}
        </div>
    </div>
  );
}