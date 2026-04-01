const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function checkWinner(board, size) {
  for (let i = 0; i < size; i++) {
    if (board[i][0] && board[i].every((c) => c === board[i][0]))
      return board[i][0];
    if (board[0][i] && board.every((row) => row[i] === board[0][i]))
      return board[0][i];
  }

  if (board[0][0] && board.every((row, i) => row[i] === board[0][0]))
    return board[0][0];
  if (
    board[0][size - 1] &&
    board.every((row, i) => row[size - 1 - i] === board[0][size - 1])
  )
    return board[0][size - 1];

  return null;
}

async function getAIMove(board, aiSymbol, size) {
  const empty = [];

  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    if (board[r][c] === null) empty.push(i);
  }

  if (empty.length === 0) return { index: -1 };

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Pilih langkah TicTacToe terbaik. Balas hanya angka index.",
        },
        {
          role: "user",
          content: `Board: ${JSON.stringify(board)}\nEmpty: ${empty.join(",")}`,
        },
      ],
    });

    const index = Number(res.choices[0].message.content);

    if (empty.includes(index)) {
      return { index };
    }
  } catch (err) {
    console.error("AI error:", err.message);
  }

  return {
    index: empty[Math.floor(Math.random() * empty.length)],
  };
}

module.exports = { getAIMove, checkWinner };
