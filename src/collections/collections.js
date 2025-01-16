const { getDB } = require("../db/db");

const articlesCollection = () => getDB().collection("articles");
const usersCollection = () => getDB().collection("users");

module.exports = { articlesCollection, usersCollection };
