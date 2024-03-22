import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import { NextUIProvider } from '@nextui-org/react';

import './App.css';
import { Auth, Dashboard } from '../pages';

const App = () => {
  return (
    <NextUIProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/app" element={<Dashboard />} />
        </Routes>
      </Router>
    </NextUIProvider>
  );
};

export default App;
