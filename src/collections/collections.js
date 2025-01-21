const { getDB } = require("../db/db");

const articlesCollection = () => getDB().collection("articles");
const usersCollection = () => getDB().collection("users");
const paymentCollection = () => getDB().collection("payments");
const publishersCollection = () => getDB().collection("publishers");

module.exports = {
  articlesCollection,
  usersCollection,
  paymentCollection,
  publishersCollection,
};
