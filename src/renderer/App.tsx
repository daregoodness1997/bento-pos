import type { ReactElement } from 'react';
import {
  MemoryRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { NextUIProvider } from '@nextui-org/react';

import {
  AuthProvider,
  ConfirmProvider,
  OrderProvider,
  PrintProvider,
  StoreProvider,
  useAuth,
  useStore,
} from 'context';
import type { Permission } from 'context';
import { IdleLock } from 'components';
import {
  Activity,
  Auth,
  Dashboard,
  Forms,
  History,
  Home,
  OrderDetail,
  PinLock,
  Reports,
  Sales,
  Settings,
  Setup,
  Stock,
  Vendors,
} from 'pages';

import './App.css';
import './admin.css';

interface ProtectedProps {
  children: ReactElement;
  permission?: Permission;
}

const Protected = ({ children, permission = undefined }: ProtectedProps) => {
  const { isAuthenticated } = useAuth();
  const { can } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

Protected.defaultProps = {
  permission: undefined,
};

const AppRoutes = () => {
  const { user, locked } = useAuth();

  if (locked) {
    return <PinLock />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/app" replace /> : <Auth />}
      />
      <Route path="/app">
        <Route
          index
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
        <Route
          path="pos"
          element={
            <Protected permission="usePos">
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="stock"
          element={
            <Protected permission="viewStock">
              <Stock />
            </Protected>
          }
        />
        <Route
          path="vendors"
          element={
            <Protected permission="viewVendors">
              <Vendors />
            </Protected>
          }
        />
        <Route
          path="history"
          element={
            <Protected permission="viewHistory">
              <History />
            </Protected>
          }
        />
        <Route
          path="reports"
          element={
            <Protected permission="viewReports">
              <Reports />
            </Protected>
          }
        />
        <Route
          path="forms"
          element={
            <Protected permission="recordSale">
              <Forms />
            </Protected>
          }
        />
        <Route
          path="setup"
          element={
            <Protected permission="manageSettings">
              <Setup />
            </Protected>
          }
        />
        <Route
          path="activity"
          element={
            <Protected permission="viewHistory">
              <Activity />
            </Protected>
          }
        />
        <Route
          path="sales"
          element={
            <Protected permission="viewHistory">
              <Sales />
            </Protected>
          }
        />
        <Route
          path="sales/:id"
          element={
            <Protected permission="viewHistory">
              <OrderDetail />
            </Protected>
          }
        />
        <Route
          path="settings"
          element={
            <Protected permission="manageSettings">
              <Settings />
            </Protected>
          }
        />
        <Route
          path="analytics"
          element={<Navigate to="/app/reports" replace />}
        />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <NextUIProvider>
      <main className="dark text-foreground bg-background app-root">
        <StoreProvider>
          <OrderProvider>
            <AuthProvider>
              <ConfirmProvider>
                <PrintProvider>
                  <Router>
                    <IdleLock />
                    <AppRoutes />
                  </Router>
                </PrintProvider>
              </ConfirmProvider>
            </AuthProvider>
          </OrderProvider>
        </StoreProvider>
      </main>
    </NextUIProvider>
  );
};

export default App;
