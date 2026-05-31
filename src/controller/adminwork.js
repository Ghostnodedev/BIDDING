const express = require("express")
const mysql = require("mysql2")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const mail = require("nodemailer")
const nodemailer = require("nodemailer");
const db = require("../db.js")

function generateAuctId() {
    const timestamp = Date.now().toString().slice(-4);

    const randomNumber =
        Math.floor(100000 + Math.random() * 900000);

    return `AUCT-ID-${randomNumber}`;
}

exports.createAuction = async (req, res) => {
    try {
        const body = req.body
        console.log(body)
        const { photo, title, description, category, starting_price, reserve_price, minimum_increment, status, start_time, end_time, winner_user_id } = body
        if (!photo || !title || !description || !category || !starting_price || !reserve_price || !minimum_increment || !status || !start_time || !end_time) {
            return res.status(401).
                json({ message: "invalid data or missing data" });
        }

        if (end_time <= start_time) {
            return res.status(400).json({
                message: "Invalid auction duration"
            });
        }

        const auctionID = generateAuctId()
        console.log("AuctionId is :-", auctionID)

        const adminId = req.user.id
        console.log("adminId is :-", adminId)

        const current_price = starting_price;

        if (starting_price <= 0 || current_price <= 0 || reserve_price <= 0 || minimum_increment <= 0) {
            return res.status(400).json({
                message: "Prices must be greater than zero"
            });
        }

        if (reserve_price < starting_price) {
            return res.status(400).json({
                message: "Reserve price cannot be less than starting price"
            });
        }

        const [Inserdata] = await db.query(`INSERT into auctions (auction_id, photo ,title ,description ,category ,starting_price , current_price ,reserve_price ,minimum_increment ,status , start_time ,end_time ,winner_user_id ,created_by ) 
            VALUES(? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ? , ?)`,
            [auctionID, photo, title, description, category, starting_price, current_price, reserve_price, minimum_increment, status, start_time, end_time, winner_user_id, adminId])

        console.log("Inserted Data is :-", Inserdata)
        const data = Inserdata[0]
        console.log(data)

        const email = req.user.email
        console.log("email add is :-", email)
        const sendmail = await mailsystem(email, auctionID, title, description, category, starting_price, current_price, reserve_price, minimum_increment, status, start_time, end_time, adminId)
        console.log("SendingMail :-", sendmail)

        return res.status(200).json({
            success: true,
            message: "Auction And Object Created Sucessfully",
            auctionID: auctionID
        });

    } catch (error) {
        console.log(error)
        return res.status(400).
            json({ message: error.message });
    }
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const mailsystem = async (email, auctionID, title, description, category, starting_price, current_price, reserve_price, minimum_increment, status, start_time, end_time, adminId) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Auction Created Sucessfully",
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #28a745;">Auction Created Successfully</h2>

        <p>
            Your auction/object has been created successfully and will start at
            <strong>${start_time}</strong>.
        </p>

        <table style="border-collapse: collapse; width: 100%;">
            <tr>
                <td><strong>Auction ID</strong></td>
                <td>${auctionID}</td>
            </tr>
            <tr>
                <td><strong>Title</strong></td>
                <td>${title}</td>
            </tr>
            <tr>
                <td><strong>Description</strong></td>
                <td>${description}</td>
            </tr>
            <tr>
                <td><strong>Category</strong></td>
                <td>${category}</td>
            </tr>
            <tr>
                <td><strong>Starting Price</strong></td>
                <td>${starting_price}</td>
            </tr>
            <tr>
                <td><strong>Current Price</strong></td>
                <td>${current_price}</td>
            </tr>
            <tr>
                <td><strong>Reserve Price</strong></td>
                <td>${reserve_price}</td>
            </tr>
            <tr>
                <td><strong>Minimum Increment</strong></td>
                <td>${minimum_increment}</td>
            </tr>
            <tr>
                <td><strong>Status</strong></td>
                <td>${status}</td>
            </tr>
            <tr>
                <td><strong>Start Time</strong></td>
                <td>${start_time}</td>
            </tr>
            <tr>
                <td><strong>End Time</strong></td>
                <td>${end_time}</td>
            </tr>
            <tr>
                <td><strong>Admin ID</strong></td>
                <td>${adminId}</td>
            </tr>
        </table>

        <br />

        <p>
            Thank you for using our auction platform. Participants will be able
            to place bids once the auction starts.
        </p>
    </div>
`
    });

    return ({
        message: "Mail Sent Sucessfully"
    });
}

exports.myauctions = async (req, res) => {
    try {
        const id = req.user.id
        console.log(id)

        const [getdata] = await db.query(`SELECT * from auctions WHERE created_by = ?`, [id])
        console.log(getdata)

        if (getdata.length === 0) {
            return res.status(400).json({
                message: "No Auctions Found"
            });
        }

        return res.status(200).json({
            status: true,
            Auctions: getdata
        });

    } catch (error) {
        console.log(error)
        return res.status(400).
            json({ message: error.message });
    }
}

exports.singleAuction = async (req, res) => {
    try {
        const id = req.params.auctionId;
        console.log(id)

        const [getdata] = await db.query(`SELECT * from auctions WHERE auction_id = ?`, [id])
        console.log(getdata)

        if (getdata.length === 0) {
            return res.status(400).json({
                message: "No Auctions Found"
            });
        }

        return res.status(200).json({
            status: true,
            Auctions: getdata
        });

    } catch (error) {
        console.log(error)
        return res.status(400).
            json({ message: error.message });
    }
}

exports.closeauct = async (req, res) => {
    try {
        const auctionId = req.params.id;
        console.log(auctionId)

        const [highestBid] = await db.query(
            ` SELECT * FROM bids WHERE auction_id = ? ORDER BY bid_amount DESC LIMIT 1 `,
            [auctionId]);

        await db.query(
            `UPDATE auctionsSETwinner_user_id = ?,status = 'closed'WHERE id = ?`,
            [    highestBid[0].user_id,auctionId]
        );

         return res.status(200).json({
            winner: highestBid.winner,
            amount: highestBid.amount
        });
    } catch (error) {

    }
}