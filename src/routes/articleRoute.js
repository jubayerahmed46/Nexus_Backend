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
  doc.status = "requested";
  const result = await articleCollection.insertOne(doc);
  res.send(result);
});

router.get("/", async (req, res) => {
  const articleCollection = await articlesCollection();
  console.log("start");

  /**
   * - get only published articles
   * - convert user in to objectId for getting user information from users collection
   * - fetch user data using local( mean article associeted userId)
   * - define which field match with users collection
   * - using "as" keyword create a new array and push all the value of user object
   * - at last convert array to an object
   * */
  const result = await articleCollection
    .aggregate([
      {
        $match: {
          status: "published",
        },
      },
      {
        $addFields: {
          authorId: { $toObjectId: "$authorInfo.userId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "authorInfo",
        },
      },

      {
        $project: {
          title: 1,
          description: 1,
          creationTime: 1,
          publisher: 1,
          tags: 1,
          thumbnail: 1,
          "authorInfo.fullName": 1,
          "authorInfo.email": 1,
          "authorInfo.profilePhoto": 1,
        },
      },
      {
        $unwind: "$authorInfo",
      },
    ])
    .toArray();

  res.send(result);
});
module.exports = router;
