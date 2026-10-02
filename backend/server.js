const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const { VerifyAdmin, ResetAllRatings, GetUserSessions, CreateDog, UpdateDog, getDogs } = require("./controller/dogController");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

connectDB();

// API Routes
app.post("/verify-admin", VerifyAdmin);
app.post("/admin/reset-ratings", ResetAllRatings);
app.get("/admin/sessions", GetUserSessions);
app.post("/create", CreateDog);
app.post("/update", UpdateDog);
app.post("/list", getDogs);
app.get("/list", getDogs);

// --------------------------deployment------------------------------
const buildPath = path.join(__dirname, "../frontend/build");

app.use(express.static(buildPath));

app.get("*", (req, res) => {
  const indexPath = path.resolve(buildPath, "index.html");
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("FaceMash API is running.. (Frontend build folder not found. Run 'npm run build' first)");
  }
});
// --------------------------deployment------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
