const express = require("express");
const { connectDB, getDB } = require("./src/db/db"); // Import getDB if needed
const cors = require("cors");
require("dotenv").config();
const articleRouter = require("./src/routes/articleRoute");
const usersRoute = require("./src/routes/usersRoute");
const jwtRoute = require("./src/routes/jwtRoute");
const paymentRoute = require("./src/routes/paymentRoute");
const publisherRoute = require("./src/routes/publishersRoute");
const reviewsRoute = require("./src/routes/reviewsRoute");

// port and app
const port = process.env.PORT || 8080;
const app = express();

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nexus-3e632.firebaseapp.com",
      "https://nexus-3e632.web.app",
    ],
  })
);
(async function startServer() {
  try {
    await connectDB();
    console.log("Database connected successfully");

    // Routes
    app.use("/api/articles", articleRouter);
    app.use("/api/users", usersRoute);
    app.use("/api/jwt", jwtRoute);
    app.use("/api/payment", paymentRoute);
    app.use("/api/publisher", publisherRoute);
    app.use("/api/reviews", reviewsRoute);

    app.get("/", (_, res) => {
      res.send("Server Is Running....");
    });

    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
    });
  } catch (error) {
    console.error(`Failed to start the server: ${error.message}`);
  }
})();
