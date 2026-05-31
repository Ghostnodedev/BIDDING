require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("./crom.js")
const authRoutes = require("./route/route");
const auctionSocket = require("./socket/auctionSocket");
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(authRoutes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Server Running"
    });
});

auctionSocket(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {

    console.log(
        `Server running on ${PORT}`
    );

});