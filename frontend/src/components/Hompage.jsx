import { CircularProgress, Grid, Typography } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import LazyImage from "./LazyImage";

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
function Hompage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [left, setLeft] = useState([]);
  const [obj1, setobj1] = useState({});
  const [obj2, setobj2] = useState({});
  const [length, setLength] = useState(0);
  const [loading, setLoading] = useState(null);
  console.log("data = ", data);

  const getDogs = async () => {
    try {
      const res = await axios.post("/list");
      console.log("res = ", res);
      if (res?.data) {
        if (res?.data.length != data.length) {
          setData([...res?.data]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleClick = async (val) => {
    let id1 = obj1?._id;
    let id2 = obj2?._id;
    let oldRating1 = obj1?.Rating;
    let oldRating2 = obj2?.Rating;
    let winnerId = val == 1 ? id1 : id2;
    if (val == 2) {
      setLoading(1);
      let temp = left;
      setobj1(temp.pop());
      setLeft([...temp]);
      setLength(length - 1);
    } else {
      setLoading(2);
      let temp = left;
      setobj2(temp.pop());
      setLeft([...temp]);
      setLength(length - 1);
    }

    try {
      console.log("updated");
      const res = await axios.post("/update", {
        id1,
        id2,
        oldRating1,
        oldRating2,
        winnerId,
      });
      if (res?.success) {
        if (val == 1) {
          let tempObj = obj1;
          tempObj.Rating = res?.winner;
          setobj1(tempObj);
        } else {
          let tempObj = obj2;
          tempObj.Rating = res?.winner;
          setobj2(tempObj);
        }
      } else {
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(null);
  };
  useEffect(() => {
    getDogs();
  }, []);
  useEffect(() => {
    if (data.length > 1) {
      let temp = [...shuffle(data)];
      setLength(data.length - 2);
      setobj1(temp.pop());
      setobj2(temp.pop());
      setLeft([...temp]);
    }
  }, [data]);

  return (
    <div>
      <Grid container spacing={2}>
        <Grid item xs={false} sm={2}></Grid>
        <Grid item xs={12} sm={8}>
          {length > 1 ? (
            <div>
              <Typography
                variant="h5"
                align="center"
                style={{ fontWeight: "bold" }}
              >
                Were we let in for our looks? No. Will we be judged on them?
                Yes.
              </Typography>
              <Typography
                variant="h6"
                align="center"
                style={{ fontWeight: "bold", margin: "1.3rem 0 3.3rem" }}
              >
                Who's Cuter? Click to Choose.
              </Typography>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ cursor: "pointer", marginLeft: "8rem" }}
                  onClick={() => (!loading ? handleClick(1) : null)}
                >
                  {loading == 1 ? (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress />
                    </div>
                  ) : (
                    <>
                      <LazyImage
                        imgSrc={obj1?.url}
                        thumbSrc={obj1?.thumbnail}
                      />
                      <Typography variant="h6" align="center">
                        Name : {obj1?.Name}
                      </Typography>
                      <Typography variant="body1" align="center">
                        Owned By :{obj1?.Owner}
                      </Typography>
                    </>
                  )}
                </div>
                <Typography>
                  <b>OR</b>
                </Typography>
                <div
                  style={{ cursor: "pointer", marginRight: "8rem" }}
                  onClick={() => (!loading ? handleClick(2) : null)}
                >
                  {loading == 2 ? (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress />
                    </div>
                  ) : (
                    <>
                      <LazyImage
                        imgSrc={obj2?.url}
                        thumbSrc={obj2?.thumbnail}
                      />
                      <Typography variant="h6" align="center">
                        Name : {obj2?.Name}
                      </Typography>
                      <Typography variant="body1" align="center">
                        Owned By :{obj2?.Owner}
                      </Typography>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                height: "90vh",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Thats all we have now. If you want to contribute then checkout
              {"  "}
              <b
                onClick={() => {
                  navigate("/addDog");
                }}
                style={{
                  color: "blue",
                  textDecoration: "underline",
                  marginLeft: "3px",
                }}
              >
                {" Add Dog"}
              </b>
            </div>
          )}
        </Grid>
        <Grid item xs={false} sm={2}></Grid>
      </Grid>
    </div>
  );
}

export default Hompage;
