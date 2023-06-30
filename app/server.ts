const express = require("express");
const WebSocket = require("ws");

const storage = new Storage();
const bucketName = "stuff-samuel-g-2023";

const app = express();
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    // broadcast message to all clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

const server = app.listen(3000);

const saveImageToBucket = async (imageData, fileName) => {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  await file.save(imageData, {
    contentType: "image/png", // Set the appropriate content type for your image
    resumable: false,
  });

  console.log(`Image ${fileName} saved to bucket ${bucketName}`);
};

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
