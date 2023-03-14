import React, { useState } from "react";
import ImageCropper from "./ImageCropper";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../firebase";
import imageCompression from "browser-image-compression";
import { LoadingButton } from "@mui/lab";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import PetsIcon from "@mui/icons-material/Pets";

async function handleImageUpload(event) {
  const imageFile = event.target.files[0];
  console.log("originalFile instanceof Blob", imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);
}

const ImageUpload = () => {
  const [blob, setBlob] = useState(null);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inputImg, setInputImg] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [owner, setOwner] = useState("");
  const getBlob = (blob) => {
    setBlob(blob);
  };
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  let uid = uuidv4();
  const onInputChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    handleClickOpen();

    reader.addEventListener(
      "load",
      () => {
        setInputImg(reader.result);
      },
      false
    );

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleName = (e) => {
    console.log(e.target.value);
    setName(e.target.value);
  };
  const handleOwner = (e) => {
    console.log(e.target.value);
    setOwner(e.target.value);
  };

  const handleSubmitImage = async (e) => {
    e.preventDefault();
    setLoading(true);
    const uploadTask = storage
      .ref(`/images/${uid}}`)
      .put(blob, { contentType: blob.type });
    uploadTask.on("state_changed", fn1, fn2, fn3);
    function fn1(snapshot) {
      let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log(`Upload is ${progress} done.`);
    }
    function fn2(error) {
      setErrorMsg(error);
      setTimeout(() => {
        setErrorMsg("");
      }, 5000);

      return;
    }
    function fn3() {
      uploadTask.snapshot.ref.getDownloadURL().then(async (url) => {
        console.log(url);
        setUrl(url);
        const options = {
          maxSizeMB: 1,
          alwaysKeepResolution: true,
          useWebWorker: true,
        };
        try {
          const compressedFile = await imageCompression(blob, options);
          console.log(
            "compressedFile instanceof Blob",
            compressedFile instanceof Blob
          ); // true
          console.log(
            `compressedFile size ${compressedFile.size / 1024 / 1024} MB`
          ); // smaller than maxSizeMB

          const uploadTask2 = storage
            .ref(`/thumbnail/${uid}}`)
            .put(compressedFile, { contentType: compressedFile.type });
          uploadTask2.on("state_changed", fn12, fn22, fn32);
          function fn12(snapshot) {
            let progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress} done.`);
          }
          function fn22(error) {
            setTimeout(() => {}, 2000);
            setErrorMsg(error);
            setTimeout(() => {
              setErrorMsg("");
            }, 5000);

            return;
          }
          function fn32() {
            uploadTask.snapshot.ref.getDownloadURL().then(async (thumbnail) => {
              console.log("thumbnailurl", thumbnail);
              setThumbnail(thumbnail);

              const obj = {
                Name: name,
                Owner: owner,
                url: url,
                thumbnail: thumbnail,
              };
              console.log("obj", obj);

              const doc = await axios.post("/create", {
                Name: name,
                Owner: owner,
                url: url,
                thumbnail: thumbnail,
              });
            });
          }
          navigate("/");
        } catch (error) {
          console.error(error);
          setErrorMsg(error);
          setTimeout(() => {
            setErrorMsg("");
          }, 5000);
        }
      });
    }
    setLoading(false);
  };

  const handleCheck = (e) => {
    if (name == "") {
      setErrorMsg("Your Dog Needs A Name!!");
      setTimeout(() => {
        setErrorMsg("");
      }, 5000);
    } else if (owner == "") {
      setErrorMsg("Who the dog belong to ??");
      setTimeout(() => {
        setErrorMsg("");
      }, 5000);
    } else if (!inputImg) {
      setErrorMsg("You have not selected any image to upload");
      setTimeout(() => {
        setErrorMsg("");
      }, 5000);
    } else {
      handleSubmitImage(e);
    }
  };
  return (
    <div className="addDogMain">
      <Grid container>
        <Grid item xs={false} sm={2}></Grid>
        <Grid item xs={12} sm={8} style={{ marginTop: "2rem" }}>
          <Paper>
            <Typography
              variant="h4"
              align="center"
              style={{ paddingTop: "1rem" }}
            >
              Add a Doggo
            </Typography>
            <div>
              <div>
                <Dialog
                  open={open && inputImg}
                  onClose={handleClose}
                  maxWidth="md"
                  fullWidth
                >
                  <DialogTitle>
                    <b>Crop Your Image</b>
                  </DialogTitle>
                  <DialogContent
                    style={{ position: "relative", minHeight: "20rem" }}
                  >
                    {inputImg && (
                      <ImageCropper getBlob={getBlob} inputImg={inputImg} />
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setInputImg("");
                        handleClose();
                      }}
                    >
                      Remove Photo
                    </Button>
                    <Button variant="contained" onClick={handleClose}>
                      Looks Good!
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
              <div
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <TextField
                  variant="outlined"
                  label="Doogo Name"
                  placeholder={"Name Your Doggo"}
                  value={name}
                  onChange={handleName}
                  margin="none"
                  fullWidth
                />
                <TextField
                  variant="outlined"
                  label="Your Name"
                  placeholder={"Enter Your Name"}
                  value={owner}
                  onChange={handleOwner}
                  margin="none"
                  fullWidth
                />
                <Button
                  color="secondary"
                  fullWidth={true}
                  variant="contained"
                  margin="dense"
                  startIcon={<PetsIcon />}
                  component="label"
                >
                  {inputImg ? "Change Photo" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onInputChange}
                  />
                </Button>
                <LoadingButton
                  loading={loading}
                  loadingPosition="start"
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={(e) => handleCheck(e)}
                >
                  Submit
                </LoadingButton>
              </div>
            </div>
            <div style={errorMsg ? { padding: "1rem" } : { display: "none" }}>
              {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            </div>
          </Paper>
        </Grid>
        <Grid item xs={false} sm={2}></Grid>
      </Grid>
    </div>
  );
};

export default ImageUpload;
