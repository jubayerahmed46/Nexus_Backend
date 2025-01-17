const { verify } = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  // get token from fronend using header -> (check how the token stored in frontend)
  const token = req.headers?.authorization;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized!" });
  }

  verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }

    req.credetials = decoded;
    next();
  });
}

module.exports = verifyToken;
