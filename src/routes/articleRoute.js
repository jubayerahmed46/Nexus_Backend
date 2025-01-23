const express = require("express");

const { articlesCollection } = require("../collections/collections");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
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

// get a article
router.get("/article/:id", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $match: { _id: new ObjectId(req.params.id) },
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
          status: 1,
          views: 1,
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
  res.send(result[0]);
});

router.get("/", verifyToken, async (req, res) => {
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
          views: 1,
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
  console.log(result);

  res.send(result);
});

// filter articles with worst way <---------------------------------------------------------
router.get("/filter", async (req, res) => {
  const articleCollection = await articlesCollection();

  const { title, publisher, tags } = req.query;
  /**
   * - get only published articles
   * - convert user in to objectId for getting user information from users collection
   * - fetch user data using local( mean article associeted userId)
   * - define which field match with users collection
   * - using "as" keyword create a new array and push all the value of user object
   * - at last convert array to an object
   * */
  // Build a dynamic query object based on the provided filters
  const query = {
    status: "published",
  };

  if (title) {
    query.title = { $regex: title, $options: "i" };
  }
  if (publisher) {
    query.publisher = { $regex: publisher, $options: "i" };
  }
  if (tags) {
    query.tags = { $in: tags.split(",") };
  }

  try {
    const result = await articleCollection
      .aggregate([
        {
          $match: {
            ...query,
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
            status: 1,
            isPremium: 1,
            views: 1,
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
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "An error occurred while filtering articles" });
  }
});

// approve article and change status to "published"
router.patch("/approve/:id", verifyToken, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.updateOne(query, {
    $set: { status: "published" },
  });

  res.send(result);
});

// decline the article and change status to "rejected"
router.patch("/reject/:id", verifyToken, async (req, res) => {
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
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.deleteOne(query);

  res.send(result);
});

// convert article to premiume
router.patch("/premiume/:id", verifyToken, async (req, res) => {
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

// get all pulished article
router.get("/published", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $match: {
          status: "published",
        },
      },
    ])
    .toArray();

  res.send(result);
});

// count views
router.post("/views/:id", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const query = { _id: new ObjectId(req.params.id) };
  const result = await articleCollection.updateOne(
    query,
    {
      $inc: { views: 1 },
    },
    { $upsert: true }
  );

  res.send(result);
});

// get popular articles
router.get("/popular", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $match: {
          status: "published",
        },
      },
      {
        $sort: { views: -1 },
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
          status: 1,
          isPremium: 1,
          views: 1,
          "authorInfo.fullName": 1,
          "authorInfo.email": 1,
          "authorInfo.profilePhoto": 1,
        },
      },
      {
        $limit: 5,
      },
      {
        $unwind: "$authorInfo",
      },
    ])
    .toArray();

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
