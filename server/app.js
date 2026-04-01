require("dotenv").config();
const PORT = process.env.PORT || 3000;

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const gameSocket = require("./socket/gameSocket");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  gameSocket(io, socket);
});

app.use(cors());

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
