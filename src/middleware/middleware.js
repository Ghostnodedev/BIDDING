const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const express = require("express")

const dotenv = require("dotenv")
dotenv.config()

exports.middlewre = async (req, res, next) => {
    try {
    const token = req.headers.authorization
    console.log("middleware toekn is ;- ",token)

    if (!token) {
        return res.status(401).json
        { message: "Token is missing" }
    }

    const newauth = token.split(" ")[1]
    console.log("split token is :-",newauth)

    const verify = jwt.verify(newauth , process.env.JWT_SECRET)
    console.log("Verified daata is :- ",newauth)

    req.user = verify
    next()
     } catch (error) {
        console.log(error)
        return res.status(401).json
        { message: error.message }
    }
}

exports.roleauth = (req, res, next) => {
    console.log(req.user);
    if(req.user.role !== "admin"){
        return res.status(403).json({
            message: "Admin access only"
        });
    }
    next();
}