module.exports = (io, socket) => {
    socket.on("gameState", (turn, row, column, board) => {
        const newBoard = board.map((boardRow, i) => {
            if (i === row - 1) {
                return boardRow.map((cell, j) => {
                    if (j === column - 1) {
                        return turn;
                    }
                    return cell;
                });
            }
            return boardRow;
        });
        turn = turn === "X" ? "O" : "X";
        io.emit("gameState", {turn, board: newBoard})
    })
}