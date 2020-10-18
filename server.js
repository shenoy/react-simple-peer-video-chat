const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

app.use(express.static(path.join(__dirname, "build")));

var users = {};
var strangerQueue = false;
var sockets = {};
var total = 0;
// let random = parseInt(Math.random() * strangerQueue.length);
// let randomStranger = strangerQueue[random];

io.on("connection", (socket) => {
  if (!users[socket.id]) {
    sockets[socket.id] = socket;
    users[socket.id] = { connectedTo: -1, previousPeer: -1 };
    console.log(socket.id, "  just connected");
  }

  if (
    strangerQueue !== false &&
    users[strangerQueue].previousPeer !== socket.id
  ) {
    users[socket.id].connectedTo = strangerQueue;
    users[strangerQueue].connectedTo = socket.id;
    strangerQueue = false;
    socket.emit("conn");
    if (strangerQueue) sockets[strangerQueue].emit("conn");
  } else {
    strangerQueue = socket.id;
  }

  socket.emit("yourID", socket.id);
  io.sockets.emit("allUsers", users);

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("acceptCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("next", () => {
    console.log("===============================");
    console.log(socket.id, "<----Peer clicked next");
    socket.emit("next user");
    var connTo = users[socket.id].connectedTo;
    if (strangerQueue === socket.id || strangerQueue === connTo) {
      strangerQueue = false;
    }
    users[socket.id].connectedTo = -1;
    users[socket.id].previousPeer = connTo;
    if (sockets[connTo]) {
      users[connTo].connectedTo = -1;
      users[connTo].previousPeer = socket.id;
      sockets[connTo].emit("next user");
    }
    console.log(connTo, "---is also now unconnected");

    if (
      strangerQueue !== false &&
      users[strangerQueue].previousPeer !== socket.id
    ) {
      users[socket.id].connectedTo = strangerQueue;
      users[strangerQueue].connectedTo = socket.id;
      socket.emit("conn");
      sockets[strangerQueue].emit("conn");
      strangerQueue = false;
    } else {
      strangerQueue = socket.id;
    }

    // unpairedUsers = Object.entries(users).filter(
    //   (x) => x[1].connectedTo === -1
    // );
    // console.log(unpairedUsers, "UNPAIRED USERS");

    //find the user connected to the disconnected user

    console.log(
      "USERS",
      users,
      "NUMBER OF USERS ---->",
      Object.keys(users).length
    );
    console.log("strangerQueue ----> ", strangerQueue);

    console.log("==================================");
  });

  socket.on("previous user", (previousPeer) => {
    console.log("PREVIOUS USER", previousPeer);
  });

  socket.on("disconnect", () => {
    if (strangerQueue === socket.id) {
      strangerQueue = false;
    } else {
      socket.emit("user left");

      console.log(socket.id, "Disconnected from server");
    }
    delete users[socket.id];
    delete sockets[socket];

    console.log(
      "USERS",
      users,
      "NUMBER OF USERS ---->",
      Object.keys(users).length
    );
    console.log("==================================");
  });

  // console.log("USERS LIST---->", Object.entries(users));
  console.log(
    "USERS---->",
    users,
    "NUMBER OF USERS ---->",
    Object.keys(users).length
  );
  console.log("strangerQueue queue", strangerQueue);
});

app.get("*", function (req, res) {
  const index = path.join(__dirname, "build", "index.html");
  res.sendFile(index);
});

const port = process.env.PORT || 3000;

server.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
