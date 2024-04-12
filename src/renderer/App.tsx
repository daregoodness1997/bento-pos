import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { NextUIProvider } from '@nextui-org/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

import { Analytics, Auth, Dashboard, Sales, Settings } from 'pages';
import { OrderContext } from 'context';

import './App.css';

const App = () => {
  return (
    <OrderContext.Provider>
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="dark">
          <main className="dark text-foreground bg-background">
            <Toaster position="bottom-center" reverseOrder={false} />
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
            </Router>
          </main>
        </NextThemesProvider>
      </NextUIProvider>
    </OrderContext.Provider>
  );
};

export default App;
