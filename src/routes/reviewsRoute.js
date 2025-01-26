const express = require("express");

const router = express.Router();
const { reviewsCollection } = require("../collections/collections");

router.get("/", async (req, res) => {
  const reviewsColl = await reviewsCollection();

  const result = await reviewsColl.find().toArray();

  res.send(result);
});

router.post("/", async (req, res) => {
  const reviewsColl = await reviewsCollection();

  const doc = req.body;
  const result = await reviewsColl.insertOne(doc);

  res.send(result);
});

module.exports = router;
