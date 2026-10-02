import { CircularProgress, Grid, Typography, Card, CardActionArea, Box, Button, Paper } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

function shuffleArray(array) {
  let arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Fixed dimensions candidate image component to prevent layout shifts on load/error
const CandidateImage = ({ url, thumbnail, name }) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setLoaded(false);
  }, [url]);

  return (
    <Box
      sx={{
        width: "280px",
        height: "280px",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        position: "relative",
      }}
    >
      {!hasError ? (
        <img
          src={url || thumbnail}
          alt={name || "Candidate"}
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "opacity 0.2s ease-in-out",
            opacity: loaded ? 1 : 0.85,
          }}
        />
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            textAlign: "center",
            p: 2,
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>👤</div>
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            {name || "Candidate"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

function Hompage() {
  const navigate = useNavigate();
  const [pairsQueue, setPairsQueue] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 24-hour voting lock state
  const [isLocked, setIsLocked] = useState(false);

  // Check 24-hour voting lock in local storage
  const checkVotingLock = useCallback(() => {
    const savedLockTime = localStorage.getItem("facemash_vote_lock_time");
    if (savedLockTime) {
      const lastTime = parseInt(savedLockTime, 10);
      const elapsed = Date.now() - lastTime;

      if (elapsed < COOLDOWN_MS) {
        setIsLocked(true);
        return true;
      } else {
        localStorage.removeItem("facemash_vote_lock_time");
        setIsLocked(false);
        return false;
      }
    }
    setIsLocked(false);
    return false;
  }, []);

  // Update voting lock check on mount
  useEffect(() => {
    checkVotingLock();
  }, [checkVotingLock]);

  // Helper to browser-preload images for upcoming pair
  const preloadPairImages = useCallback((pair) => {
    if (!pair) return;
    if (pair[0]?.url) {
      const img1 = new Image();
      img1.src = pair[0].url;
    }
    if (pair[1]?.url) {
      const img2 = new Image();
      img2.src = pair[1].url;
    }
  }, []);

  // Generate all unique 2-candidate combination pairs C(N, 2)
  const generatePairsQueue = useCallback((candidates) => {
    if (!candidates || candidates.length < 2) return [];
    let uniquePairs = [];

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        uniquePairs.push([candidates[i], candidates[j]]);
      }
    }

    let shuffledPairs = shuffleArray(uniquePairs);

    // Reorder to minimize showing the same candidate in consecutive rounds
    let reordered = [];
    let remaining = [...shuffledPairs];

    while (remaining.length > 0) {
      const lastPair = reordered.length > 0 ? reordered[reordered.length - 1] : null;
      let foundIdx = 0;

      if (lastPair) {
        const lastIds = new Set([lastPair[0]._id, lastPair[1]._id]);
        const nextDiffIdx = remaining.findIndex(
          (p) => !lastIds.has(p[0]._id) && !lastIds.has(p[1]._id)
        );
        if (nextDiffIdx !== -1) {
          foundIdx = nextDiffIdx;
        }
      }

      reordered.push(remaining[foundIdx]);
      remaining.splice(foundIdx, 1);
    }

    return reordered;
  }, []);

  const getCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.post("/list");
      const data = res?.data || [];
      if (Array.isArray(data) && data.length >= 2) {
        const queue = generatePairsQueue(data);
        setPairsQueue(queue);
        setCurrentPairIndex(0);

        // Preload first 2 pairs
        if (queue.length > 0) preloadPairImages(queue[0]);
        if (queue.length > 1) preloadPairImages(queue[1]);
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  }, [generatePairsQueue, preloadPairImages]);

  useEffect(() => {
    getCandidates();
  }, [getCandidates]);

  // When currentPairIndex advances, preload subsequent pair
  useEffect(() => {
    if (pairsQueue.length > 0 && !isLocked) {
      const nextIdx = currentPairIndex + 1;
      if (nextIdx < pairsQueue.length) {
        preloadPairImages(pairsQueue[nextIdx]);
      }
    }
  }, [currentPairIndex, pairsQueue, isLocked, preloadPairImages]);

  const handleVote = (selectedIndex) => {
    if (!cand1 || !cand2) return;

    const winnerId = selectedIndex === 1 ? cand1._id : cand2._id;

    // Send ELO update asynchronously
    axios
      .post("/update", {
        id1: cand1._id,
        id2: cand2._id,
        oldRating1: cand1.Rating,
        oldRating2: cand2.Rating,
        winnerId: winnerId,
      })
      .catch((err) => console.error("ELO update error:", err));

    const nextIndex = currentPairIndex + 1;

    // Check if user finished all unique matchups in queue
    if (nextIndex >= pairsQueue.length) {
      // Lock voting in localStorage for 24 hours
      localStorage.setItem("facemash_vote_lock_time", Date.now().toString());
      setIsLocked(true);
    } else {
      setCurrentPairIndex(nextIndex);
    }
  };

  const currentPair = pairsQueue[currentPairIndex] || null;
  const cand1 = currentPair ? currentPair[0] : null;
  const cand2 = currentPair ? currentPair[1] : null;

  const isCompletedOrLocked = isLocked || (pairsQueue.length > 0 && currentPairIndex >= pairsQueue.length);

  return (
    <Box sx={{ py: 4, px: 2, minHeight: "85vh", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography
        variant="subtitle1"
        align="center"
        sx={{ color: "#000000", fontWeight: 500, mb: 1, fontSize: { xs: "0.95rem", md: "1.1rem" } }}
      >
        Were we let in for our looks? No. Will we be judged on them? Yes.
      </Typography>
      <Typography
        variant="h4"
        align="center"
        sx={{ fontWeight: "bold", color: "#8C2519", mb: 4, fontSize: { xs: "1.5rem", md: "2rem" } }}
      >
        Who's Hotter? Click to Choose.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
          <CircularProgress size={60} style={{ color: "#8C2519" }} />
        </Box>
      ) : isCompletedOrLocked ? (
        /* Completion & 24-Hour Cooldown Lock Screen */
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              maxWidth: "500px",
              width: "100%",
              borderRadius: "20px",
              textAlign: "center",
              border: "1px solid #fee2e2",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: "#2e7d32", mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1, color: "#1a202c" }}>
              Done for now!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              You've gone through everyone. The votes have been counted.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Check back tomorrow to vote again!
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<LeaderboardIcon />}
              onClick={() => navigate("/leaderboard")}
              sx={{
                backgroundColor: "#8C2519",
                "&:hover": { backgroundColor: "#6d1c13" },
                py: 1.5,
                px: 3,
                fontSize: "1.1rem",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              See Who's on Top
            </Button>
          </Paper>
        </Box>
      ) : cand1 && cand2 ? (
        <Grid container spacing={3} alignItems="center" justifyContent="center">
          {/* Candidate 1 */}
          <Grid item xs={12} sm={5} md={4}>
            <Card
              sx={{
                borderRadius: "16px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px rgba(140, 37, 25, 0.2)",
                },
              }}
            >
              <CardActionArea onClick={() => handleVote(1)} sx={{ p: 2, textAlign: "center" }}>
                <CandidateImage url={cand1.url} thumbnail={cand1.thumbnail} name={cand1.Name} />
                <Typography variant="h6" sx={{ mt: 2, fontWeight: "bold", color: "#2d3748" }}>
                  {cand1.Name}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* OR Divider */}
          <Grid item xs={12} sm={2} md={1} sx={{ textAlign: "center" }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "900",
                color: "#8C2519",
                my: { xs: 1, sm: 0 },
              }}
            >
              OR
            </Typography>
          </Grid>

          {/* Candidate 2 */}
          <Grid item xs={12} sm={5} md={4}>
            <Card
              sx={{
                borderRadius: "16px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px rgba(140, 37, 25, 0.2)",
                },
              }}
            >
              <CardActionArea onClick={() => handleVote(2)} sx={{ p: 2, textAlign: "center" }}>
                <CandidateImage url={cand2.url} thumbnail={cand2.thumbnail} name={cand2.Name} />
                <Typography variant="h6" sx={{ mt: 2, fontWeight: "bold", color: "#2d3748" }}>
                  {cand2.Name}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", my: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No candidate comparisons available yet.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default Hompage;
