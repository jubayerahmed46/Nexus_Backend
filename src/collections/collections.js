const { getDB } = require("../db/db");

const articlesCollection = () => getDB().collection("articles");
const usersCollection = () => getDB().collection("users");
const paymentCollection = () => getDB().collection("payments");

module.exports = { articlesCollection, usersCollection, paymentCollection };
