const express = require("express");

const router = express.Router();

const { usersCollection } = require("../collections/collections");
const verifyToken = require("../middlewares/verifyToken");

router.post("/", async (req, res) => {
  const usersColl = await usersCollection();
  const user = req.body;
  /**
   * implement schema using mongoos in future!
   * upload a user to db
   * with this structure
   * {
   *     fullName: "",
   *     email: "",
   *     profilePhoto: "url",
   *     role: "",
   *     premiumeType: "free" || 5d || 10d,
   *     writerInfo: {
   *         name: "",
   *         profileProto: "url",
   *    }
   * }
   * */
  const isExist = await usersColl.findOne({ email: user.email });
  if (isExist) {
    return res.send({ message: "User already exist!" });
  }

  //   if no user exist in db make a admin role
  const userCount = await usersColl.estimatedDocumentCount();

  if (!userCount) {
    user.role = "admin";
    user.premiumeType = "pro-admin";
  } else {
    user.premiumeType = "free";
    user.role = "reader";
    user.premiumeToken = 0;
  }

  const result = await usersColl.insertOne(user);
  res.send(result);
});

// Get all users with pagination
router.get("/", verifyToken, async (req, res) => {
  const usersColl = await usersCollection();
  const { page = 1, limit = 10 } = req.query; // Default page = 1, limit = 10

  // "credetials" from verify token (JWT)
  const query = { email: { $ne: req.credetials.email } };

  // Get the total count of users for pagination purposes
  const totalUsers = await usersColl.countDocuments(query);

  // Fetch the users for the current page and limit
  const users = await usersColl
    .find(query)
    .skip((page - 1) * limit) // Skip based on page number
    .limit(parseInt(limit)) // Limit the number of users returned
    .toArray();

  // Send paginated data including total count for front-end
  res.send({
    users,
    total: totalUsers, // The total number of users
  });
});

// get a user data
router.get("/user/:email", async (req, res) => {
  const usersColl = await usersCollection();
  const query = { email: req.params.email };

  const user = await usersColl.findOne(query);
  res.send(user);
});

// get user role
router.get("/user/role", verifyToken, async (req, res) => {
  const usersColl = await usersCollection();

  const user = await usersColl
    .aggregate([
      {
        $match: {
          email: req.credetials.email,
        },
      },
    ])
    .toArray();

  res.send(user);
});

// get premiume user
router.get("/user/premiume/:email", verifyToken, async (req, res) => {
  const usersColl = await usersCollection();

  const user = await usersColl
    .aggregate([
      {
        $match: {
          email: req.params.email,
        },
      },
      {
        $group: {
          _id: "$premiumeToken",
        },
      },
    ])
    .toArray();

  const premiumeUser = user[0]?._id;

  const today = new Date().getTime();

  if (premiumeUser < today) {
    await usersColl.updateOne(
      { email: req.params.email },
      { $set: { premiumeToken: 0 } },
      { upsert: true }
    );
    const updatedUser = await usersColl
      .aggregate([
        {
          $match: {
            email: req.params.email,
          },
        },
        {
          $group: {
            _id: "$premiumeToken",
          },
        },
      ])
      .toArray();
    res.send({ premiumeUser: updatedUser[0]?._id });
  } else {
    res.send({ premiumeUser });
  }
});

// get home page stistic data
router.get("/statistics", async (req, res) => {
  const usersColl = await usersCollection();

  const result = await usersColl
    .aggregate([
      {
        $facet: {
          // Total User Count
          totalUsers: [{ $count: "count" }],
          // Premium User Count
          premiumUsers: [
            { $match: { premiumeToken: { $gt: 0 } } },
            { $count: "count" },
          ],
          // Normal User Count
          normalUsers: [
            {
              $match: { $or: [{ premiumeToken: 0 }, { premiumeToken: null }] },
            },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalUsers: { $arrayElemAt: ["$totalUsers.count", 0] },
          premiumUsers: { $arrayElemAt: ["$premiumUsers.count", 0] },
          normalUsers: { $arrayElemAt: ["$normalUsers.count", 0] },
        },
      },
    ])
    .toArray();

  res.send(result[0]);
});

// update user name and photo
router.patch("/update/:email", verifyToken, async (req, res) => {
  const usersColl = await usersCollection();

  const body = req.body;
  const updatedData = {
    $set: {
      fullName: body.fullName,
      profilePhoto: body.profilePhoto,
    },
  };

  const updateUser = await usersColl.updateOne(
    { email: req.params.email },
    updatedData
  );
  res.send(updateUser);
});

router.patch("/update/user-role/:email", verifyToken, async (req, res) => {
  const usersColl = await usersCollection();

  const updatedUser = {
    $set: {
      role: "admin",
    },
  };

  const result = await usersColl.updateOne(
    { email: req.params.email },
    updatedUser
  );

  res.send(result);
});

module.exports = router;
