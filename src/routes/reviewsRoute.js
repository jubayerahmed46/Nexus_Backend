const express = require("express");

const router = express.Router();
const { reviewsCollection } = require("../collections/collections");

router.get("/", async (req, res) => {
  const reviewsColl = await reviewsCollection();

  const result = await reviewsColl.find().toArray();

  console.log(result);

  res.send(result);
});

router.post("/", async (req, res) => {
  const reviewsColl = await reviewsCollection();

  const doc = req.body;
  const result = await reviewsColl.insertOne(doc);

  console.log(result);

  res.send(result);
});

module.exports = router;
