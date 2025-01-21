const express = require("express");
const {
  paymentCollection,
  usersCollection,
} = require("../collections/collections");
const verifyToken = require("../middlewares/verifyToken");
const stripe = require("stripe")(process.env.stripe_secret_key);
require("dotenv").config();

const router = express.Router();

router.post("/create-payment-intent", verifyToken, async (req, res) => {
  /**
   * Steps to create payment intent ->
   * - get amouont from frontend
   * - convert the amount to 100x caouse stripe calcalate money this way
   * - create a payment intent with the plan amount using "stripe.paymentIntents.create({})"
   * - after creating intent, stripe will return a client secret -> send it to the client side
   *
   * - client will receave the secret onload by "useEffect" hook and set the secret to a state
   * - then confirm the payment doing soem others steps
   *
   * */
  const { amount } = req.body;

  const convertToPaisa = parseInt(amount * 100);
  const intent = await stripe.paymentIntents.create({
    amount: convertToPaisa, // from front end
    currency: "usd", // the currency that want to need
    payment_method_types: ["card"], // method how in frontend created
  });

  res.send({ clientSecret: intent.client_secret });
});

// store user succeded paymnet data on databage
router.post("/payments-data", verifyToken, async (req, res) => {
  const paymentColl = await paymentCollection();
  const userColl = await usersCollection();

  const doc = req.body;

  // store payment info to database
  await paymentColl.insertOne(doc);

  // update user token based user plan
  const filter = { email: req.credetials.email };

  // set plan token time based on user prefferance - store as millisecond
  const premiumeCardEstimatedTime = new Date().getTime() + doc.tokenDate;
  // if user already taken plan and wanna again buy get
  const isAlreadyPremiume = await userColl.findOne(filter);
  if (isAlreadyPremiume.premiumeToken) {
    const result = await userColl.updateOne(filter, {
      $set: { premiumeToken: isAlreadyPremiume.premiumeToken + doc.tokenDate },
    });

    return res.send(result);
  }

  const result = await userColl.updateOne(
    filter,
    { $set: { premiumeToken: premiumeCardEstimatedTime } },
    { upsert: true }
  );
  res.send(result);
});

module.exports = router;
