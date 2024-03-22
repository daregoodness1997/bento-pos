import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import { NextUIProvider } from '@nextui-org/react';

import './App.css';
import { Auth, Dashboard } from '../pages';

const App = () => {
  return (
    <NextUIProvider>
      <main className="dark ">
        <Router>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/app">
              <Route index element={<Dashboard />} />
            </Route>
          </Routes>
        </Router>
      </main>
    </NextUIProvider>
  );
};

export default App;
