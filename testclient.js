const io = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {

    console.log("CONNECTED");

    socket.emit("join_auction", 6);

    setTimeout(() => {

        console.log("SENDING BID");

        socket.emit("place_bid", {
            auctionId: 6,
            userId: 11,
            amount: 52000
        });

    }, 3000);

});

socket.on("bid_updated", (data) => {

    console.log(
        "NEW BID:",
        data
    );

});

socket.on("bid_error", (data) => {

    console.log(
        "BID ERROR:",
        data
    );

});