# FaceMash

FaceMash application built with Node.js/Express, MongoDB, React, Material UI, and ELO rating algorithm.

## Features
- **Instant Dual-Candidate Swapping**: Voting replaces both candidates with preloaded next candidates for 0ms lag.
- **Fixed Layout Containers**: Prevents cumulative layout shifts (CLS) when loading or if image load fails.
- **Dynamic ELO Calibration**: Higher K-factor ($K=40$) for new entrants (< 10 matches) to calibrate rankings fast; standard K-factor ($K=20$) for established candidates.
- **Password-Secured Admin Upload**: Public upload link is hidden. Uploading requires accessing a secret URL route protected by an Admin Password.
- **Render.com Ready**: Pre-configured build scripts and `render.yaml` blueprint.

---

## Environment Setup

Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/facemash?retryWrites=true&w=majority
ADMIN_PASSWORD=your_secret_admin_password
```

Create a `.env` file in `frontend/` (optional):
```env
REACT_APP_ADMIN_SECRET_PATH=admin-secret-upload
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
```

---

## Running Locally

1. **Install Root & Frontend Dependencies**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Start Backend Server**:
   ```bash
   npm start
   ```

3. **Access Public App**: `http://localhost:5000`
4. **Access Admin Panel**: `http://localhost:5000/admin-secret-upload`

---

## Deploying to Render.com

1. Create a new **Web Service** on [dashboard.render.com](https://dashboard.render.com/).
2. Connect your GitHub repository (`dogmash` or `FaceMash`).
3. Set configuration:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas URI string
   - `ADMIN_PASSWORD`: Your secret admin password
   - `REACT_APP_ADMIN_SECRET_PATH`: `admin-secret-upload` (or custom path)
5. Click **Create Web Service**.
