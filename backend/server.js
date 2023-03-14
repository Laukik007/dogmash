const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { CreateDog, UpdateDog, getDogs } = require("./controller/dogController");
const path = require("path");
const app = express();

app.use(express.json());

// --------------------------deployment------------------------------
__dirname = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}
// --------------------------deployment------------------------------

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;
app.post("/create", CreateDog);
app.post("/update", UpdateDog);
app.post("/list", getDogs);
app.listen(PORT, console.log(`server started on port ${PORT}`));
