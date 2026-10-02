import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './app.css';
import Hompage from './components/Hompage';
import ImageUpload from './components/ImageUpload';
import Leaderboard from './components/Leaderboard';
import Navbar from './components/Navbar';

function App() {
  const adminSecretPath =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_ADMIN_SECRET_PATH) ||
    process.env.REACT_APP_ADMIN_SECRET_PATH ||
    'admin-secret-upload';

  return (
    <div>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route exact path='/' element={<Hompage />} />
          <Route exact path='/leaderboard' element={<Leaderboard />} />
          <Route exact path={`/${adminSecretPath}`} element={<ImageUpload />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
