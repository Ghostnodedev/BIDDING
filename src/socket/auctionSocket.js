const db = require("../db");

module.exports = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "User connected:",
            socket.id
        );

        socket.on(
            "join_auction",
            (auctionId) => {

                socket.join(
                    `auction_${auctionId}`
                );

                console.log(
                    `${socket.id} joined auction_${auctionId}`
                );

            }
        );

        socket.on(
            "place_bid",
            async (data) => {

                try {

                    const {
                        auctionId,
                        userId,
                        amount
                    } = data;

                    console.log(
                        "BID RECEIVED:",
                        data
                    );

                    const [auction] =
                        await db.query(
                            `
                            SELECT *
                            FROM auctions
                            WHERE id = ?
                            `,
                            [auctionId]
                        );

                    if (
                        auction.length === 0
                    ) {

                        return socket.emit(
                            "bid_error",
                            {
                                message:
                                    "Auction not found"
                            }
                        );

                    }

                    const currentAuction =
                        auction[0];

                    if (
                        currentAuction.status !== "live"
                    ) {

                        return socket.emit(
                            "bid_error",
                            {
                                message:
                                    "Auction is not live"
                            }
                        );

                    }

                    const minimumBid =
                        Number(
                            currentAuction.current_price
                        )
                        +
                        Number(
                            currentAuction.minimum_increment
                        );

                    if (
                        Number(amount) < minimumBid
                    ) {

                        return socket.emit(
                            "bid_error",
                            {
                                message:
                                    `Minimum bid is ${minimumBid}`
                            }
                        );

                    }

                    const bidId =
                        `BID-${Date.now()}`;

                    await db.query(
                        `
                        INSERT INTO bids
                        (
                            bid_id,
                            auction_id,
                            user_id,
                            bid_amount
                        )
                        VALUES
                        (
                            ?, ?, ?, ?
                        )
                        `,
                        [
                            bidId,
                            currentAuction.id,
                            userId,
                            amount
                        ]
                    );

                    await db.query(
                        `
                        UPDATE auctions
                        SET current_price = ?
                        WHERE id = ?
                        `,
                        [
                            amount,
                            currentAuction.id
                        ]
                    );

                    io.to(
                        `auction_${auctionId}`
                    ).emit(
                        "bid_updated",
                        {
                            bidId,
                            auctionId,
                            userId,
                            amount
                        }
                    );

                    console.log(
                        "Bid Saved Successfully"
                    );

                } catch (error) {

                    console.log(error);

                    socket.emit(
                        "bid_error",
                        {
                            message:
                                "Something went wrong"
                        }
                    );

                }

            }
        );

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "User disconnected:",
                    socket.id
                );

            }
        );

    });

};