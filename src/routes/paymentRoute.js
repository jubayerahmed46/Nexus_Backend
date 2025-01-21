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

  console.log(doc);

  const result = await paymentColl.insertOne(doc);
  const filter = { email: req.credetials.email };
  await userColl.updateOne(
    filter,
    { premiumeToken: doc.estimatedTokenDate },
    { upsert: true }
  );
  res.send(result);
});

module.exports = router;
