const express = require("express");
const { connectDB } = require("./src/db/db");
const cors = require("cors");
require("dotenv").config();
const articleRouter = require("./src/routes/articleRoute");
const usersRoute = require("./src/routes/usersRoute");
const port = process.env.PORT || 8080;
const app = express();
// connect mongoDB
connectDB();

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nexus-3e632.firebaseapp.com",
      "nexus-3e632.web.app",
    ],
  })
);

// routes
app.use("/api/articles", articleRouter);
app.use("/api/users", usersRoute);

app.get("/", (req, res) => {
  res.send("Server Is Running....");
});
// listen the port
app.listen(port, () => {
  console.log(`Server running port on :${port}`);
});
