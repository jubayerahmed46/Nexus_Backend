const express = require("express");

const {
  articlesCollection,
  publishersCollection,
  usersCollection,
} = require("../collections/collections");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

// create new article
router.post("/", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();
  const userColl = await usersCollection();
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
  // check is premeume or not
  // if not premium user check in the db and allow only upload 1 article

  const userObj = await userColl.findOne({
    email: req.credetials.email,
  });

  if (!userObj?.premiumeToken && userObj?.role !== "admin") {
    const hasOneItem = await articleCollection
      .find({
        "authorInfo.userId": userObj?._id.toString(),
      })
      .toArray();

    if (!hasOneItem.length) {
      // if a user haven't taken subscription, we allows to upload one article for free
      doc.status = "requested";
      const upload = await articleCollection.insertOne(doc);
      return res.send(upload);
    } else {
      // if a user haven't subscription and trying to upload 1 < article
      return res.status(409).send({
        message:
          "You can't upload post greater than 1. You have to purchage plan for upload unlimited! see more information in the subscription page.",
      });
    }
  }

  doc.status = "requested";
  const result = await articleCollection.insertOne(doc);
  res.send(result);
});

// count views per user observing
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
// get Article details ( one article by it's id)
router.get("/article/:id", async (req, res) => {
  const articleCollection = await articlesCollection();

  /**
   * 1. match the article that i want
   * 2. for fetching user information - get userId from matched data - convert this into object i using aggregate operator - get user info from user collection (foreign collection) by authorId - filter out Unnecessary field - convert author array to object
   * 3. return the final output
   * */
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

// pagination get operation for dashboard ( admin only )
router.get("/", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();
  const { page = 1, limit = 10 } = req.query; // Default page = 1, limit = 10

  // Pagination logic: Skip and limit based on page number and limit
  const skip = (page - 1) * limit;
  const totalArticles = await articleCollection.countDocuments(); // Total number of articles for pagination

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
      {
        $skip: skip, // Skip articles based on pagination
      },
      {
        $limit: parseInt(limit), // Limit the number of articles
      },
    ])
    .toArray();

  res.send({
    articles: result,
    total: totalArticles, // Total articles count for pagination purposes
  });
});

// filter articles based multiple scenario
router.get("/filter", async (req, res) => {
  const articleCollection = await articlesCollection();

  const { title, publisher, tags, sortBy } = req.query;

  // Build a dynamic query object
  const query = {
    status: "published",
  };

  let sortOption = -1;
  if (sortBy === "ascen") {
    sortOption = 1;
  }

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
        { $match: query },
        { $sort: { views: sortOption } },
        { $addFields: { authorId: { $toObjectId: "$authorInfo.userId" } } },
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
            role: 1,
            "authorInfo.fullName": 1,
            "authorInfo.email": 1,
            "authorInfo.profilePhoto": 1,
          },
        },
        { $unwind: "$authorInfo" },
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

// get all published article
router.get("/published", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();
  const sortBy = req.query.sortBy;
  console.log(sortBy);

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

// get latest published articles
router.get("/latest", async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $match: {
          status: "published",
        },
      },

      {
        $sort: { creationTime: -1 },
      },
      {
        $limit: 4,
      },
      {
        $project: {
          _id: 1,
          title: 1,
          publisher: 1,
          isPremium: 1,
          thumbnail: 1,
        },
      },
    ])
    .toArray();

  res.send(result);
});

// get popular articles
router.get("/popular", async (req, res) => {
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

// get all premium article sorting with views ascending
router.get("/premiume", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();
  /**
   * Get premium articles
   * - query article by "isPremium" property
   * - sort them according to the published date ( ascending order )
   * - send it to the frontend
   *
   * */
  const result = await articleCollection
    .aggregate([
      {
        $match: {
          isPremium: true,
        },
      },
      {
        $sort: { creationTime: -1 },
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

// get My-article page articles (based user)
router.get("/my-articles/:userId", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  /**
   * Get premium articles
   * - query article by "isPremium" property
   * - sort them according to the published date ( ascending order )
   * - send it to the frontend
   *
   * */

  const result = await articleCollection
    .aggregate([
      {
        $match: {
          "authorInfo.userId": req.params.userId,
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
          reasonForDecline: 1,
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

// get publishers states
router.get("/states", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $group: {
          _id: "$publisher",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])
    .toArray();
  const toarr = result.map((obj) => [obj._id, obj.count]);

  res.send(toarr);
});

// get tags states
router.get("/tags-state", async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection
    .aggregate([
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])
    .toArray();
  res.send(result);
});

// get Ancient Secret Borneo data
router.get("/ancient-secret-borneo/:id", async (req, res) => {
  const articleCollection = await articlesCollection();
  const id = req.params.id;

  const result = await articleCollection.findOne({ _id: new ObjectId(id) });

  res.send(result);
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

// decline article and change status to "rejected"
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

// update user article as (user)
router.patch("/user/update/:id", verifyToken, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.updateOne(query, {
    $set: { ...req.body },
  });

  res.send(result);
});

// convert article to premium
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

// delete article permanently from database
router.delete("/delete/:id", verifyToken, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const articleCollection = await articlesCollection();

  const result = await articleCollection.deleteOne(query);

  res.send(result);
});

// delete article by user (user article)
router.delete("/user/delete/:id", verifyToken, async (req, res) => {
  const articleCollection = await articlesCollection();

  const result = await articleCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

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
