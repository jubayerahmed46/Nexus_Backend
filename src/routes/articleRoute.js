const express = require("express");

const { articlesCollection } = require("../collections/collections");

const router = express.Router();

router.post("/", async (req, res) => {
  const articleCollection = await articlesCollection();
  const doc = req.body;
  /**
   * implement schema using mongoos in future!
   * upload a article to db
   * with this structure
   * {
   *     title: "",
   *     description: "",
   *     thumbnail: "url",
   *     tags: [{}],
   *     buplisher: {},
   *     creationTime: ""
   *     writerInfo: {
   *         name: "",
   *         profileProto: "url",
   *    }
   * }
   * */

  const result = await articleCollection.insertOne(doc);
  res.send(result);
});

module.exports = router;
