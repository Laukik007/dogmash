const dog = require("../models/dogModel");
const UserSession = require("../models/userSessionModel");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// ELO: Smooth K-factor decay (mimics chess.com / FIDE "provisional → established")
//
// K starts at 40 for brand new candidates (matches 0-9)
// Then smoothly decays between matches 10–30 from 40 → 20
// Settles at 20 for matches 31-100
// For very high rated players (>2000) K drops to 16 to protect the top
// ─────────────────────────────────────────────────────────────────────────────
const getKFactor = (matchesPlayed = 0, rating = 1500) => {
  if (matchesPlayed < 10) return 40;             // Provisional: rapid calibration
  if (matchesPlayed < 30) {
    // Linear interpolation 40 → 20 over matches 10..30
    const t = (matchesPlayed - 10) / 20;         // 0.0 at match 10, 1.0 at match 30
    return Math.round(40 - t * 20);              // 40 → 20 smooth ramp
  }
  if (rating > 2000) return 16;                 // Top-tier master: extra stability
  return 20;                                    // Standard established
};

// ─────────────────────────────────────────────────────────────────────────────
// Anonymous fingerprint: SHA-256 hash of IP + User-Agent (never store raw data)
// ─────────────────────────────────────────────────────────────────────────────
const buildFingerprint = (req) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex");
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Verify password
// ─────────────────────────────────────────────────────────────────────────────
const VerifyAdmin = async (req, res) => {
  try {
    const { password } = req.body;
    const requiredPassword = process.env.ADMIN_PASSWORD;
    if (!requiredPassword || password === requiredPassword) {
      return res.status(200).json({ success: true, message: "Authenticated" });
    }
    return res.status(401).json({ success: false, message: "Invalid Admin Password" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get all user sessions (admin-only)
// ─────────────────────────────────────────────────────────────────────────────
const GetUserSessions = async (req, res) => {
  try {
    const requiredPassword = process.env.ADMIN_PASSWORD;
    if (requiredPassword) {
      const adminPassHeader = req.headers["x-admin-password"];
      if (adminPassHeader !== requiredPassword) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const sessions = await UserSession.find({}).sort({ lastSeenAt: -1 }).limit(500);
    const candidates = await dog.find({}, { _id: 1, Name: 1 });
    const candidateMap = {};
    candidates.forEach((c) => {
      candidateMap[c._id.toString()] = c.Name;
    });

    res.status(200).json({ success: true, sessions, candidateMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE: Add new candidate
// ─────────────────────────────────────────────────────────────────────────────
const CreateDog = async (req, res) => {
  try {
    const requiredPassword = process.env.ADMIN_PASSWORD;
    if (requiredPassword) {
      const adminPassHeader = req.headers["x-admin-password"];
      if (adminPassHeader !== requiredPassword) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid Admin Password" });
      }
    }

    const { Name, Owner, url, thumbnail } = req.body;
    const newDog = new dog({
      Name,
      Owner,
      url,
      thumbnail,
      Rating: 1500,
      matchesPlayed: 0,
    });
    const createdDog = await newDog.save();
    res.status(200).json({ success: true, Dog: createdDog });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || err });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Record vote & recalculate ELO ratings
// ─────────────────────────────────────────────────────────────────────────────
const UpdateDog = async (req, res) => {
  try {
    const { id1, id2, oldRating1, oldRating2, winnerId } = req.body;
    const fingerprint = buildFingerprint(req);

    // Fetch candidates from DB for accurate current state
    const doc1 = await dog.findById(id1);
    const doc2 = await dog.findById(id2);

    const r1 = doc1 ? doc1.Rating : (oldRating1 || 1500);
    const r2 = doc2 ? doc2.Rating : (oldRating2 || 1500);
    const m1 = doc1 ? (doc1.matchesPlayed || 0) : 0;
    const m2 = doc2 ? (doc2.matchesPlayed || 0) : 0;

    const k1 = getKFactor(m1, r1);
    const k2 = getKFactor(m2, r2);

    const expected1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
    const expected2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400));

    const s1 = winnerId == id1 ? 1 : 0;
    const s2 = winnerId == id2 ? 1 : 0;

    const newRating1 = Math.round(r1 + k1 * (s1 - expected1));
    const newRating2 = Math.round(r2 + k2 * (s2 - expected2));

    await dog.findByIdAndUpdate(id1, { Rating: newRating1, $inc: { matchesPlayed: 1 } });
    await dog.findByIdAndUpdate(id2, { Rating: newRating2, $inc: { matchesPlayed: 1 } });

    // Track anonymous user session vote
    try {
      const voteKey = `votesFor.${winnerId}`;
      await UserSession.findOneAndUpdate(
        { fingerprint },
        {
          $inc: { totalVotes: 1, [voteKey]: 1 },
          $set: { lastVotedAt: new Date(), lastSeenAt: new Date() },
          $setOnInsert: { sessionCount: 1 },
        },
        { upsert: true, new: true }
      );
    } catch (sessionErr) {
      // Non-critical: silently ignore session tracking errors
      console.error("Session tracking error (non-critical):", sessionErr.message);
    }

    res.status(200).json({
      success: true,
      winner: s1 === 1 ? newRating1 : newRating2,
      newRating1,
      newRating2,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || err });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST: Get all candidates
// ─────────────────────────────────────────────────────────────────────────────
const getDogs = async (req, res) => {
  try {
    // Track visit fingerprint passively
    const fingerprint = buildFingerprint(req);
    UserSession.findOneAndUpdate(
      { fingerprint },
      { $set: { lastSeenAt: new Date() }, $inc: { sessionCount: 0 } },
      { upsert: true }
    ).catch(() => {}); // Fire and forget, non-blocking

    // Fast lean Mongoose query for 5x faster JSON serialization
    const result = await dog.find({}).lean();
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || err });
  }
};

module.exports = {
  VerifyAdmin,
  GetUserSessions,
  CreateDog,
  UpdateDog,
  getDogs,
};
