const cron = require("node-cron");
const db = require("../db");

cron.schedule("* * * * *", async () => {

    try {

        console.log("Checking expired auctions...");

        const [expiredAuctions] = await db.query(`
            SELECT *
            FROM auctions
            WHERE status = 'live'
            AND end_time <= NOW()
        `);

        if (expiredAuctions.length === 0) {

            console.log(
                "No expired auctions found"
            );

            return;

        }

        for (const auction of expiredAuctions) {

            console.log(
                `Closing Auction ${auction.id}`
            );

            const [highestBid] = await db.query(
                `
                SELECT *
                FROM bids
                WHERE auction_id = ?
                ORDER BY bid_amount DESC
                LIMIT 1
                `,
                [auction.id]
            );

            if (highestBid.length === 0) {

                await db.query(
                    `
                    UPDATE auctions
                    SET status = 'closed'
                    WHERE id = ?
                    `,
                    [auction.id]
                );

                console.log(
                    `Auction ${auction.id} closed with no bids`
                );

                continue;

            }

            const winner = highestBid[0];

            await db.query(
                `
                UPDATE auctions
                SET
                    winner_user_id = ?,
                    status = 'closed'
                WHERE id = ?
                `,
                [
                    winner.user_id,
                    auction.id
                ]
            );

            console.log(
                `Auction ${auction.id} won by User ${winner.user_id}`
            );

        }

    } catch (error) {

        console.log(error);

    }

});