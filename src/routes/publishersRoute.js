const express = require("express");

const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { publishersCollection } = require("../collections/collections");

router.post("/create", verifyToken, async (req, res) => {
  const publishersColl = await publishersCollection();

  const doc = req.body;

  const result = await publishersColl.insertOne(doc);
  res.send(result);
});

router.get("/", verifyToken, async (req, res) => {
  const publishersColl = await publishersCollection();

  const result = await publishersColl.find().toArray();
  res.send(result);
});
module.exports = router;
