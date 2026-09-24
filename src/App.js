import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./supabase";
import Loader from "./components/Loader";
import AddOn from "./components/AddOn";
import StaffCancellationAlert from "./components/StaffCancellationAlert";

const Login = lazy(() => import("./components/Login"));
// const Signup = lazy(() => import("./components/Signup"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const Services = lazy(() => import("./components/Services"));
const EditServices = lazy(() => import("./components/EditServices"));
const Profile = lazy(() => import("./components/Profile"));
const EditAddOn = lazy(() => import("./components/EditAddOn"));
const EditMainCategory = lazy(() => import("./components/EditMainCategory"));

/* ================= PROTECTED ROUTE ================= */
function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <Loader />;

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

/* ================= APP ================= */
function App() {
  return (
    <Router>
      {/*
        IMPORTANT:
        This component is outside <Routes>, so it stays mounted while the
        Admin moves between Dashboard, Profile, Services, Add-ons, etc.
        Therefore a staff cancellation can alert the Admin on ANY page.
      */}
      <StaffCancellationAlert />

      <Suspense fallback={<Loader />}>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Login />} />
          {/* <Route path="/signup" element={<Signup />} /> */}

          {/* PROTECTED ROUTES */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-on"
            element={
              <ProtectedRoute>
                <AddOn />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-addon/:id"
            element={
              <ProtectedRoute>
                <EditAddOn />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-service/:id"
            element={
              <ProtectedRoute>
                <EditServices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-main-category/:id"
            element={
              <ProtectedRoute>
                <EditMainCategory />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
