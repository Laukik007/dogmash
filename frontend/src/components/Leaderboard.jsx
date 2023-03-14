import { Card, CardContent, CardMedia, Grid, Typography } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

function Leaderboard() {
  const [data, setData] = useState([]);

  const getDogs = async () => {
    try {
      const res = await axios.post("/list");
      if (res?.data) {
        if (res?.data.length != data.length) {
          let temp = res?.data.sort(function (a, b) {
            var keyA = a.Rating;
            var keyB = b.Rating;
            // Compare the 2 dates
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
          });
          setData([...temp]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  console.log(data);
  useEffect(() => {
    getDogs();
  }, []);
  return (
    <Grid container spacing={2} style={{ padding: "1rem" }}>
      {data.map((obj, idx) => (
        <Grid item xs={3} key={idx}>
          <Card>
            <CardMedia component="img" image={obj?.url} alt={obj?.Name} />
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                {`#${idx + 1} ${obj?.Name}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Added By : {obj?.Owner}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default Leaderboard;
