import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Auth, Dashboard } from '../pages';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/app" element={<Dashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
