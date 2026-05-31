const express = require("express")
const mysql = require("mysql2")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const otp = require("otp-generator")
const mail = require("nodemailer")
const nodemailer = require("nodemailer");
const db = require("../db.js")

function generateUserId() {
    const timestamp = Date.now().toString().slice(-4);

    const randomNumber =
        Math.floor(100000 + Math.random() * 900000);

    return `USR-${timestamp}${randomNumber}`;
}
// console.log(generateUserId());

exports.register = async (req, res) => {
    const body = req.body
    console.log("req body is:-", body)
    try {

        const { first_name, last_name, email, phone, password, gender, age, profession, profile_image, is_active, is_verified } = body

        if (!first_name || !last_name || !email || !phone || !password || !gender || !age || !profession) {
            return res.status(401).
                json({ message: "invalid data or missing data" });
        }

        const hashed = await bcrypt.hash(password, 15)
        console.log(hashed)

        const user_id = generateUserId()
        console.log(user_id)

        const [callquery] = await db.query(`SELECT * from users where email = ?`, [email])
        console.log("callquery is :-", callquery)

        if (callquery.length > 0) {
            return res.status(400).json({ message: "User already exists" })
        }

        const [createdata] = await db.query(
            `INSERT INTO users
    (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        password_hash,
        gender,
        age,
        profession,
        role,
        profile_image,
        is_active,
        is_verified
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                first_name,
                last_name,
                email,
                phone,
                hashed,
                gender,
                age,
                profession,
                "user",
                null,
                1,
                0
            ]
        );

        console.log(createdata)

        const otpCode = otp.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        console.log("generaated Otp is :- ", otpCode);

        const otpid = Math.floor(1000 + Math.random() * 9000);
        console.log(otpid);

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        console.log(expiresAt);

        const [sendata] = await db.query(`INSERT into user_otps (otp_id, user_id , otp_code , expires_at , is_used) VALUES(? ,?,?,?,?)`,
            [otpid, user_id, otpCode, expiresAt, 0]
        )

        console.log("otp data is  -", sendata)

        const sendmail = await mailsystem(email, otpCode)
        console.log("sending mail system is working :-", sendmail)
        return res.status(200).
            json({
                message: "user loggedin sucessfully",
                Otp: `Otp Have been send to you provided Email address`,
                id: user_id
            });

    } catch (error) {
        console.log(error)
        return res.status(400).
            json({ message: error.message });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body
        console.log(email, password)

        if (!email || !password) {
            return res.status(401).
                json({ message: "invalid data or missing data" });
        }

        const [check] = await db.query(`SELECT * from users WHERE email = ?`, [email])
        console.log(check)
        if (check.length === 0) {
            return res.status(400).json({
                message: "No User Found"
            })
        }

        const data = check[0]
        console.log(data)

        const opass = await bcrypt.compare(password, data.password_hash)
        if (!opass) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const jwtkey = process.env.JWT_SECRET

        const token = jwt.sign(
            { id: data.id, user_id: data.user_id, role: data.role, email: email },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        console.log("Token is :-", token)

        return res.status(200).json({
            success: true,
            message: "User LoggedIn Sucessfully",
            Token: token,
            user: data.user_id
        });

    } catch (error) {
        console.log(error)
        return res.status(400).
            json({ message: error.message });
    }
}

exports.verify = async (req, res) => {
    try {
        const { email, otp } = req.body
        console.log(email, otp)

        if (!email || !otp) {
            return res.status(401).
                json({ message: "invalid data or missing data" });
        }

        const [user] = await db.query(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );

        if (user.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const [otpData] = await db.query(
            ` SELECT * FROM user_otps WHERE user_id = ? ORDER BY id DESC LIMIT 1 `,
            [user[0].user_id]
        );

        if (otpData.length === 0) {
            return res.status(404).json({
                message: "OTP not found"
            });
        }

        if (otpData[0].is_used === 1) {
            return res.status(400).json({
                message: "OTP already used"
            });
        }

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        const currentTime = new Date();

        if (currentTime > new Date(otpData[0].expires_at)) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        if (otpData[0].otp_code !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        await db.query(
            ` UPDATE users SET is_verified = 1 WHERE user_id = ? `,
            [user[0].user_id]
        );

        await db.query(
            ` UPDATE user_otps SET is_used = 1 WHERE id = ? `,
            [otpData[0].id]
        );

        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {

    }
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const mailsystem = async (email, otpCode) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Auction Platform Test",
        html: `
                <h1>${otpCode}</h1>
            `
    });

    return ({
        message: "Mail Sent Sucessfully"
    });
}
