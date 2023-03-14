import "./app.css";
import ImageUpload from "./components/ImageUpload";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hompage from "./components/Hompage";
import Navbar from "./components/Navbar";
import Leaderboard from "./components/Leaderboard";

function App() {
  return (
    <div>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route exact path="/" element={<Hompage />} />
          <Route exact path="/adddog" element={<ImageUpload />} />
          <Route exact path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
