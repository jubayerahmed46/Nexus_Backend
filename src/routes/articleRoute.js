const express = require("express");

const { articlesCollection } = require("../collections/collections");
const { ObjectId } = require("mongodb");

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
      // {
      //   $match: {
      //     status: "published",
      //   },
      // },
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
          status: 1,
          isPremium: 1,
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

// approve article and change status to "published"
router.patch("/approve/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.updateOne(query, {
    $set: { status: "published" },
  });

  res.send(result);
});

// decline the article and change status to "rejected"
router.patch("/reject/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const { declineReason } = req.body;
  const articleCollection = await articlesCollection();

  const result = await articleCollection.updateOne(
    query,
    {
      $set: { status: "rejected", reasonForDecline: declineReason },
    },
    { $upsert: true }
  );

  res.send(result);
});

// delete the article from db
router.delete("/delete/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.deleteOne(query);

  res.send(result);
});

// convert article to premiume
router.patch("/premiume/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.updateOne(
    query,
    {
      $set: {
        isPremium: true,
      },
    },
    {
      $upsert: true,
    }
  );

  res.send(result);
});

module.exports = router;

// .aggregate([
//   {
//     $match: {
//       status: "published",
//     },
//   },
//   {
//     $addFields: {
//       authorId: { $toObjectId: "$authorInfo.userId" },
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "authorId",
//       foreignField: "_id",
//       as: "authorInfo",
//     },
//   },

//   {
//     $project: {
//       title: 1,
//       description: 1,
//       creationTime: 1,
//       publisher: 1,
//       tags: 1,
//       thumbnail: 1,
//       status: 1,
//       "authorInfo.fullName": 1,
//       "authorInfo.email": 1,
//       "authorInfo.profilePhoto": 1,
//     },
//   },
//   {
//     $unwind: "$authorInfo",
//   },
// ])
// .toArray();
