const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const router = express.Router();
const secretKey = process.env.SECRET_KEY;

router.post("/create", async (req, res) => {
  // get user email from request body
  const { email } = req.body;
  // create token

  const token = jwt.sign({ email }, secretKey);

  res.send({ token });
});

router.post("/remove", async (req, res) => {});

module.exports = router;
