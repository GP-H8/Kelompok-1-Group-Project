const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function checkWinner(board, size) {
  for (let row = 0; row < size; row++) {
    const first = board[r][0];
    if (first && board[row].every((cell) => cell === first)) return first;
  }

  for (let col = 0; col < size; col++) {
    const first = board[0][col];
    if (first && Array.from({ length: size }, (_, row) => board[row][col]).every((cell) => cell === first)) {
      return first;
    }
  }

  const diagFirst = board[0][0];
  if (diagFirst && Array.from({ length: size }, (_, i) => board[i][i]).every((cell) => cell === diagFirst)) {
    return diagFirst;
  }

  const antiDiagFirst = board[0][size - 1];
  if (
    antiDiagFirst &&
    Array.from({ length: size }, (_, i) => board[i][size - 1 - i]).every((cell) => cell === antiDiagFirst)
  ) {
    return antiDiagFirst;
  }

  if (board.every((row) => row.every((cell) => cell !== null))) return "draw";
  return null;
}

// ini logic ketika openAI gagal, jadi tetap bisa jalan

function fallbackMove(board, aiSymbol, size) {
  const humanSymbol = aiSymbol === "X" ? "O" : "X";
  const empty = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null) empty.push({ row: r, col: c, index: r * size + c });
    }
  }

  // 1. Menang langsung
  for (const move of empty) {
    const copy = board.map((row) => [...row]);
    copy[move.row][move.col] = aiSymbol;
    if (checkWinner(copy, size) === aiSymbol) return move.index;
  }

  // 2. Blokir kemenangan lawan
  for (const move of empty) {
    const copy = board.map((row) => [...row]);
    copy[move.row][move.col] = humanSymbol;
    if (checkWinner(copy, size) === humanSymbol) return move.index;
  }

  // 3. Tengah
  const center = Math.floor(size / 2);
  const centerMove = empty.find((move) => move.row === center && move.col === center);
  if (centerMove) return centerMove.index;

  // 4. Sudut
  const cornerIndexes = [0, size - 1, size * (size - 1), size * size - 1];
  const freeCorner = empty.find((move) => cornerIndexes.includes(move.index));
  if (freeCorner) return freeCorner.index;

  // 5. Acak dari yang tersisa
  return empty[Math.floor(Math.random() * empty.length)].index;
}

function formatBoardForPrompt(board, size) {
  let result = "";
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      row.push(board[r][c] ?? String(i + 1)); // tampilkan nomor kalau kosong
    }
    result += row.join(" | ");
    if (r < size - 1) result += "\n" + "-".repeat(size * 4 - 3) + "\n";
  }
  return result;
}

async function getAIMove(board, aiSymbol, size) {
  const humanSymbol = aiSymbol === "X" ? "O" : "X";
  const emptyCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null) emptyCells.push(r * size + c + 1);
    }
  }
  const boardText = formatBoardForPrompt(board, size);

  const prompt = `Kamu adalah AI pemain Tic Tac Toe yang bermain sebagai "${aiSymbol}".
Lawan bermain sebagai "${humanSymbol}".

Papan ${size}x${size} saat ini (angka = kotak kosong):
${boardText}

Kotak yang tersedia (nomor 1-${size * size}): ${emptyCells.join(", ")}

Tugas kamu:
1. Analisis papan
2. Pilih kotak kosong yang paling strategis
3. Prioritaskan: menang sekarang > blokir lawan menang > posisi strategis

Balas HANYA dengan format JSON berikut, tanpa teks lain:
{"index": <nomor kotak 1-${size * size}>, "explanation": "<alasan singkat dalam Bahasa Indonesia, maks 20 kata>"}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 100,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah AI Tic Tac Toe. Selalu balas hanya dengan JSON valid sesuai format yang diminta.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);

    // Validasi: index harus ada di daftar kotak kosong
    const indexOneBased = Number(parsed.index);
    const indexZeroBased = indexOneBased - 1;

    if (
      !Number.isInteger(indexOneBased) ||
      indexOneBased < 1 ||
      indexOneBased > size * size ||
      board[Math.floor(indexZeroBased / size)][indexZeroBased % size] !== null // kotak sudah terisi
    ) {
      console.warn(
        "[AI] OpenAI memberi index tidak valid:",
        parsed.index,
        "→ pakai fallback",
      );
      return {
        index: fallbackMove(board, aiSymbol, size),
        explanation: "AI memilih langkah strategis terbaik.",
      };
    }

    return {
      index: indexZeroBased, // kembalikan 0-based untuk board array
      explanation: parsed.explanation ?? "AI telah memilih langkah terbaiknya.",
    };
  } catch (err) {
    // OpenAI timeout, rate limit, atau error jaringan → pakai fallback
    console.error("[AI] OpenAI error:", err.message, "pakai fallback");
    return {
      index: fallbackMove(board, aiSymbol, size),
      explanation: "AI memilih langkah strategis terbaik.",
    };
  }
}

module.exports = { getAIMove, checkWinner };
