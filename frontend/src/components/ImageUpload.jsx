import React, { useState, useEffect } from "react";
import ImageCropper from "./ImageCropper";
import axios from "axios";
import imageCompression from "browser-image-compression";
import { LoadingButton } from "@mui/lab";
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
  Box,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  LinearProgress,
  Chip,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Helper to convert Blob to Base64 Data URI
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const ImageUpload = () => {
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [inputImg, setInputImg] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Staged multi-add queue & completed upload history
  const [stagedCandidates, setStagedCandidates] = useState([]);
  const [uploadedSessionCandidates, setUploadedSessionCandidates] = useState([]);

  // Admin password security state
  const [adminPassword, setAdminPassword] = useState(sessionStorage.getItem("adminPassword") || "");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Admin Reset Ratings state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetAllRatings = async () => {
    setResetting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await axios.post(
        "/admin/reset-ratings",
        {},
        { headers: { "x-admin-password": adminPassword } }
      );
      if (res.data?.success) {
        localStorage.removeItem("facemash_pair_index");
        localStorage.removeItem("facemash_vote_lock_time");
        setSuccessMsg("All candidate ratings and vote counts have been reset to 1500 & 0!");
        setResetDialogOpen(false);
      }
    } catch (err) {
      console.error("Reset error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to reset ratings");
    } finally {
      setResetting(false);
    }
  };

  // Verify admin password on mount or when adminPassword changes
  useEffect(() => {
    const verifyPass = async () => {
      if (!adminPassword) {
        setIsAuthorized(false);
        return;
      }
      try {
        const res = await axios.post("/verify-admin", { password: adminPassword });
        if (res.data?.success) {
          setIsAuthorized(true);
          sessionStorage.setItem("adminPassword", adminPassword);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      }
    };
    verifyPass();
  }, [adminPassword]);

  const handleAdminAuthSubmit = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setPassError("");
    try {
      const res = await axios.post("/verify-admin", { password: passInput });
      if (res.data?.success) {
        setAdminPassword(passInput);
        sessionStorage.setItem("adminPassword", passInput);
        setIsAuthorized(true);
      } else {
        setPassError("Invalid Admin Password");
      }
    } catch (err) {
      setPassError(err.response?.data?.message || "Authentication Failed");
    } finally {
      setVerifying(false);
    }
  };

  const getBlob = (b) => {
    setBlob(b);
    if (b) {
      setPreviewUrl(URL.createObjectURL(b));
    }
  };
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const onInputChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    handleClickOpen();

    reader.addEventListener(
      "load",
      () => {
        setInputImg(reader.result);
      },
      false
    );

    reader.readAsDataURL(file);
    e.target.value = null; // reset input so same file can be selected again
  };

  const handleName = (e) => {
    setName(e.target.value);
  };

  // Add current item to multi-add staging queue
  const handleAddToQueue = () => {
    if (!name.trim()) {
      setErrorMsg("Candidate Name is required!");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }
    if (!blob) {
      setErrorMsg("Please upload and crop a photo first!");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    const newItem = {
      id: Date.now() + Math.random(),
      name: name.trim(),
      blob: blob,
      previewUrl: previewUrl || URL.createObjectURL(blob),
    };

    setStagedCandidates((prev) => [...prev, newItem]);
    setName("");
    setBlob(null);
    setPreviewUrl("");
    setInputImg("");
    setErrorMsg("");
  };

  // Remove single item from staging queue
  const handleRemoveStagedItem = (id) => {
    setStagedCandidates((prev) => prev.filter((item) => item.id !== id));
  };

  // Batch upload all staged candidates to MongoDB
  const handleBatchUpload = async () => {
    if (stagedCandidates.length === 0) {
      setErrorMsg("No staged candidates to upload!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setUploadProgress(0);

    const uploadedNew = [];
    const total = stagedCandidates.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = stagedCandidates[i];

        // 1. Compress main photo (600px max dimension -> ~40-60KB JPEG)
        const mainOptions = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 600,
          useWebWorker: true,
          initialQuality: 0.85,
        };
        const mainCompressedBlob = await imageCompression(item.blob, mainOptions);
        const mainBase64 = await blobToBase64(mainCompressedBlob);

        // 2. Compress thumbnail (200px max dimension -> ~15KB JPEG)
        const thumbOptions = {
          maxSizeMB: 0.03,
          maxWidthOrHeight: 200,
          useWebWorker: true,
          initialQuality: 0.75,
        };
        const thumbCompressedBlob = await imageCompression(item.blob, thumbOptions);
        const thumbBase64 = await blobToBase64(thumbCompressedBlob);

        // 3. Save Candidate Base64 string directly to MongoDB Database
        const res = await axios.post(
          "/create",
          {
            Name: item.name,
            Owner: "",
            url: mainBase64,
            thumbnail: thumbBase64,
          },
          {
            headers: {
              "x-admin-password": adminPassword,
            },
          }
        );

        uploadedNew.push({
          id: item.id,
          name: item.name,
          previewUrl: item.previewUrl,
          dbRecord: res.data?.Dog,
        });

        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      setUploadedSessionCandidates((prev) => [...uploadedNew, ...prev]);
      setStagedCandidates([]);
      setSuccessMsg(`Successfully uploaded ${total} candidate${total > 1 ? "s" : ""}!`);
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to upload candidate batch");
    } finally {
      setLoading(false);
    }
  };

  // Password Prompt Screen if not authorized
  if (!isAuthorized) {
    return (
      <Box sx={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Paper elevation={4} sx={{ p: 4, maxWidth: "450px", width: "100%", borderRadius: "16px", textAlign: "center" }}>
          <LockIcon sx={{ fontSize: 50, color: "#8C2519", mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
            Admin Access Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This page is restricted. Enter your Admin Password to add candidates.
          </Typography>
          <form onSubmit={handleAdminAuthSubmit}>
            <TextField
              type="password"
              variant="outlined"
              label="Admin Password"
              placeholder="Enter Admin Password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            {passError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passError}
              </Alert>
            )}
            <LoadingButton
              type="submit"
              loading={verifying}
              variant="contained"
              fullWidth
              sx={{ backgroundColor: "#8C2519", "&:hover": { backgroundColor: "#6d1c13" }, py: 1.2 }}
            >
              Authenticate
            </LoadingButton>
          </form>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: "1100px", margin: "0 auto" }}>
      <Grid container spacing={3}>
        {/* Form Column */}
        <Grid item xs={12} md={5}>
          <Paper elevation={3} style={{ borderRadius: "16px", padding: "1.5rem" }}>
            <Typography variant="h5" align="center" style={{ fontWeight: "bold", color: "#1a202c" }}>
              Add Candidates
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" style={{ marginBottom: "1.5rem" }}>
              Crop photo, type name, and click + to add to queue.
            </Typography>

            <Dialog open={open && Boolean(inputImg)} onClose={handleClose} maxWidth="md" fullWidth>
              <DialogTitle>
                <b>Crop Candidate Image (1:1 Square)</b>
              </DialogTitle>
              <DialogContent style={{ position: "relative", minHeight: "22rem" }}>
                {inputImg && <ImageCropper getBlob={getBlob} inputImg={inputImg} />}
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setInputImg("");
                    setBlob(null);
                    setPreviewUrl("");
                    handleClose();
                  }}
                >
                  Remove Photo
                </Button>
                <Button variant="contained" style={{ backgroundColor: "#8C2519" }} onClick={handleClose}>
                  Looks Good!
                </Button>
              </DialogActions>
            </Dialog>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Preview Box if blob selected */}
              {previewUrl && (
                <Box
                  sx={{
                    width: "160px",
                    height: "160px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    margin: "0 auto",
                    border: "2px solid #8C2519",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
              )}

              <Button
                color="secondary"
                fullWidth
                variant="outlined"
                startIcon={<AddAPhotoIcon />}
                component="label"
                style={{ height: "48px" }}
              >
                {previewUrl ? "Change Photo" : "Upload & Crop Photo"}
                <input type="file" accept="image/*" hidden onChange={onInputChange} />
              </Button>

              <TextField
                variant="outlined"
                label="Candidate Name"
                placeholder="Enter Candidate Name"
                value={name}
                onChange={handleName}
                fullWidth
              />

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddToQueue}
                style={{ backgroundColor: "#2e7d32", height: "48px", fontSize: "1rem", fontWeight: "bold" }}
              >
                + Add to Staging Queue
              </Button>
            </Box>

            {errorMsg && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error">{errorMsg}</Alert>
              </Box>
            )}

            {successMsg && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success">{successMsg}</Alert>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Staging Queue Column */}
        <Grid item xs={12} md={7}>
          <Paper elevation={3} style={{ borderRadius: "16px", padding: "1.5rem", minHeight: "350px" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" style={{ fontWeight: "bold" }}>
                Staging Queue ({stagedCandidates.length})
              </Typography>
              {stagedCandidates.length > 0 && (
                <Chip label={`${stagedCandidates.length} ready`} color="primary" style={{ backgroundColor: "#8C2519" }} />
              )}
            </Box>

            {loading && (
              <Box sx={{ width: "100%", mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Uploading candidates... {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
            )}

            {stagedCandidates.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "200px",
                  color: "#94a3b8",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  p: 3,
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body1" align="center">
                  No candidates in queue.
                </Typography>
                <Typography variant="caption" align="center">
                  Upload a photo, type candidate name, and click <b>+ Add to Staging Queue</b> above!
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3, maxHeight: "400px", overflowY: "auto", pr: 1 }}>
                  {stagedCandidates.map((item) => (
                    <Grid item xs={6} sm={4} key={item.id}>
                      <Card sx={{ position: "relative", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <IconButton
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            backgroundColor: "rgba(255,255,255,0.9)",
                            "&:hover": { backgroundColor: "#fee2e2", color: "#dc2626" },
                          }}
                          onClick={() => handleRemoveStagedItem(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <CardMedia component="img" height="120" image={item.previewUrl} alt={item.name} sx={{ objectFit: "cover" }} />
                        <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                          <Typography variant="subtitle2" noWrap align="center" sx={{ fontWeight: "bold" }}>
                            {item.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <LoadingButton
                  loading={loading}
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  onClick={handleBatchUpload}
                  style={{ backgroundColor: "#8C2519", height: "48px", fontSize: "1.1rem", fontWeight: "bold" }}
                >
                  Upload All {stagedCandidates.length} Candidates
                </LoadingButton>
              </>
            )}

            {/* Session Upload History */}
            {uploadedSessionCandidates.length > 0 && (
              <Box sx={{ mt: 4, pt: 2, borderTop: "1px solid #e2e8f0" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1, color: "#2e7d32", display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon fontSize="small" /> Recently Uploaded In This Session ({uploadedSessionCandidates.length})
                </Typography>
                <Grid container spacing={1}>
                  {uploadedSessionCandidates.map((item) => (
                    <Grid item xs={4} sm={3} key={item.id}>
                      <Box sx={{ textAlign: "center" }}>
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover", display: "block", margin: "0 auto" }}
                        />
                        <Typography variant="caption" noWrap display="block" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {item.name}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Admin User Tracking Analytics & Reset Ratings Action Buttons */}
            <Box sx={{ mt: 4, pt: 2, borderTop: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => {
                  setAnalyticsOpen(true);
                  fetchAnalytics();
                }}
                fullWidth
                sx={{ color: "#475569", borderColor: "#cbd5e1", "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" } }}
              >
                View Anonymous User Tracking & Vote Logs
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={() => setResetDialogOpen(true)}
                fullWidth
              >
                Reset All Ratings to 1500 & 0 Votes
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Closable Admin User Tracking Modal */}
      <Dialog open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>User Voting & Session Analytics (Admin Only)</span>
          <Chip label={`${analyticsData.sessions?.length || 0} unique users`} size="small" color="primary" />
        </DialogTitle>
        <DialogContent dividers>
          {analyticsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <LinearProgress sx={{ width: "100%" }} />
            </Box>
          ) : analyticsData.sessions?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              No user sessions recorded yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>User ID Hash</th>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>Total Votes</th>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>Last Active</th>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>Votes Breakdown (Candidate: Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.sessions.map((sess, idx) => (
                    <tr key={sess._id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#334155" }}>
                        {sess.fingerprint ? `${sess.fingerprint.slice(0, 10)}...` : "Anonymous"}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold" }}>{sess.totalVotes || 0}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>
                        {sess.lastSeenAt ? new Date(sess.lastSeenAt).toLocaleString() : "N/A"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {sess.votesFor && Object.keys(sess.votesFor).length > 0 ? (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {Object.entries(sess.votesFor).map(([candId, count]) => (
                              <Chip
                                key={candId}
                                label={`${analyticsData.candidateMap[candId] || candId.slice(-4)}: ${count}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem" }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>No votes yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)} variant="contained" style={{ backgroundColor: "#8C2519" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#dc2626" }}>
          Reset All Candidate Ratings?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to reset all candidate ratings back to <b>1500</b> and set all match/vote counts back to <b>0</b>?
          </Typography>
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 1.5, fontWeight: "bold" }}>
            ⚠️ This will also clear all user voting session logs. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <LoadingButton
            loading={resetting}
            onClick={handleResetAllRatings}
            variant="contained"
            color="error"
          >
            Confirm Reset
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageUpload;
