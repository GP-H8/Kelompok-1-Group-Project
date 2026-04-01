import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import baseUrl from '../constant/baseUrl';

export default function Game() {
    const [currentTurn, setCurrentTurn] = useState("X");
    const [gameBoard, setGameBoard] = useState(Array(size).fill().map(() => Array(size).fill(null)));
    const [winner, setWinner] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [playerSymbol, setPlayerSymbol] = useState("X");
    const [mode, setMode] = useState("multiplayer");

    async function handleMove(row, column) {
        try {
            if (winner) throw new Error("Game already done!");
            if (!roomId) throw new Error("Room is not ready yet.");
            if (currentTurn !== playerSymbol) throw new Error("Not your turn!");
            if (gameBoard[row][column]) throw new Error("Cell occupied!");

            socket.emit("makeMove", { roomId, row, column });
        } catch (error) {
            console.error(error.message);
        }
    }


    useEffect(() => {
        const socket = io(baseUrl);
        const onStartGame = ({ turn, board, mode, roomId: nextRoomId, playerSymbol: nextPlayerSymbol }) => {
            setCurrentTurn(turn);
            setGameBoard(board);
            setRoomId(nextRoomId);
            setMode(mode);
            if (nextPlayerSymbol) {
                setPlayerSymbol(nextPlayerSymbol);
            }
            setWinner(null);
        };

        const onUpdateGame = ({ board, turn, winner: gameWinner }) => {
            setGameBoard(board);
            setCurrentTurn(turn);
            setWinner(gameWinner);
        };

        socket.on("startGame", onStartGame);
        socket.on("updateGame", onUpdateGame);

        return () => {
            socket.off("startGame", onStartGame);
            socket.off("updateGame", onUpdateGame);
            socket.disconnect();
        };
    }, [socket]);

  return (
    <div>
        {winner && <h2>Winner: {winner}</h2>}
        {!winner && <h3>Current Turn: {currentTurn}</h3>}
        <div className="flex flex-col">
            {gameBoard.map((row, rowIndex) => (
                <div className="flex flex-row" key={rowIndex}>
                    {row.map((cell, columnIndex) => (
                        <button className="border-gray-100 w-16 h-16" key={columnIndex} onClick={() => handleMove(rowIndex, columnIndex)}>{cell}</button>
                    ))}
                </div>
            ))}
        </div>
    </div>
  );
}