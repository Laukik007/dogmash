import { Card, CardContent, Grid, Typography, Box } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const LeaderboardItemImage = ({ url, name }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <Box
      sx={{
        width: "100%",
        height: "240px",
        backgroundColor: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {!hasError && url ? (
        <img
          src={url}
          alt={name}
          onError={() => setHasError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Box sx={{ color: "#64748b", textAlign: "center", p: 2 }}>
          <div style={{ fontSize: "2.5rem" }}>👤</div>
          <Typography variant="body2">{name}</Typography>
        </Box>
      )}
    </Box>
  );
};

function Leaderboard() {
  const [data, setData] = useState([]);

  const getCandidates = async () => {
    try {
      const res = await axios.post("/list");
      if (res?.data && Array.isArray(res.data)) {
        let sorted = [...res.data].sort((a, b) => (b.Rating || 1500) - (a.Rating || 1500));
        setData(sorted);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    }
  };

  useEffect(() => {
    getCandidates();
  }, []);

  return (
    <Box sx={{ padding: { xs: "1.5rem 1rem", md: "2rem" }, maxWidth: "1200px", margin: "0 auto" }}>
      <Typography variant="h4" align="center" sx={{ fontWeight: "bold", mb: 1, color: "#1a202c" }}>
        FaceMash Leaderboard
      </Typography>
      <Typography variant="subtitle1" align="center" sx={{ color: "text.secondary", mb: 4 }}>
        Top Ranked Candidates
      </Typography>

      <Grid container spacing={3}>
        {data.map((obj, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={obj._id || idx}>
            <Card
              sx={{
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                },
              }}
            >
              <LeaderboardItemImage url={obj.url || obj.thumbnail} name={obj.Name} />
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: "1.1rem" }} noWrap>
                    {`#${idx + 1} ${obj.Name}`}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#8C2519", fontWeight: "bold" }}>
                    {obj.Rating || 1500} ({obj.matchesPlayed || 0} votes)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Leaderboard;
