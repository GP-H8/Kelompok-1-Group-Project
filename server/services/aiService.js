const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function checkWinner(board, size) {
  const winLength = size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const first = board[r * size + c];
      if (!first) continue;
      if (
        Array.from(
          { length: winLength },
          (_, i) => board[r * size + c + i],
        ).every((v) => v === first)
      )
        return first;
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winLength; r++) {
      const first = board[r * size + c];
      if (!first) continue;
      if (
        Array.from(
          { length: winLength },
          (_, i) => board[(r + i) * size + c],
        ).every((v) => v === first)
      )
        return first;
    }
  }

  for (let r = 0; r <= size - winLength; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const first = board[r * size + c];
      if (!first) continue;
      if (
        Array.from(
          { length: winLength },
          (_, i) => board[(r + i) * size + (c + i)],
        ).every((v) => v === first)
      )
        return first;
    }
  }

  for (let r = 0; r <= size - winLength; r++) {
    for (let c = winLength - 1; c < size; c++) {
      const first = board[r * size + c];
      if (!first) continue;
      if (
        Array.from(
          { length: winLength },
          (_, i) => board[(r + i) * size + (c - i)],
        ).every((v) => v === first)
      )
        return first;
    }
  }

  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

// ini logic ketika openAI gagal, jadi tetap bisa jalan

function fallbackMove(board, aiSymbol, size) {
  const humanSymbol = aiSymbol === "X" ? "O" : "X";
  const empty = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i !== -1);

  // 1. Menang langsung
  for (const i of empty) {
    const copy = [...board];
    copy[i] = aiSymbol;
    if (checkWinner(copy, size) === aiSymbol) return i;
  }

  // 2. Blokir kemenangan lawan
  for (const i of empty) {
    const copy = [...board];
    copy[i] = humanSymbol;
    if (checkWinner(copy, size) === humanSymbol) return i;
  }

  // 3. Tengah
  const center = Math.floor((size * size) / 2);
  if (empty.includes(center)) return center;

  // 4. Sudut
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  const freeCorner = corners.find((i) => empty.includes(i));
  if (freeCorner !== undefined) return freeCorner;

  // 5. Acak dari yang tersisa
  return empty[Math.floor(Math.random() * empty.length)];
}

function formatBoardForPrompt(board, size) {
  let result = "";
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      row.push(board[i] ?? String(i + 1)); // tampilkan nomor kalau kosong
    }
    result += row.join(" | ");
    if (r < size - 1) result += "\n" + "-".repeat(size * 4 - 3) + "\n";
  }
  return result;
}

async function getAIMove(board, aiSymbol, size) {
  const humanSymbol = aiSymbol === "X" ? "O" : "X";
  const emptyCells = board
    .map((v, i) => (v === null ? i + 1 : null)) // 1-based untuk prompt
    .filter(Boolean);
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
      board[indexZeroBased] !== null // kotak sudah terisi
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
