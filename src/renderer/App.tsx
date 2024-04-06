import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { NextUIProvider } from '@nextui-org/react';
import useDarkMode from 'use-dark-mode';

import { Analytics, Auth, Dashboard, Sales, Settings } from 'pages';

import './App.css';

const App = () => {
  const darkMode = useDarkMode(true);

  return (
    <NextUIProvider>
      <main
        className={`${darkMode.value ? 'dark' : ''} text-foreground bg-background`}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/app">
              <Route index element={<Dashboard />} />
              <Route path="/app/analytics" element={<Analytics />} />
              <Route path="/app/sales" element={<Sales />} />
              <Route path="/app/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>{' '}
      </main>
    </NextUIProvider>
  );
};

export default App;
