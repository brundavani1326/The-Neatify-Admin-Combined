import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuth(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return <Loader />;

  return isAuth ? children : <Navigate to="/" replace />;
}

export default ProtectedRoute;
