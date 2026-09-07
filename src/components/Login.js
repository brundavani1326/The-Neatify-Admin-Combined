import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../supabase";
import logo from "../neatifylogo.png";
import Loader from "./Loader";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage("Invalid email or password");
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // 🔒 Check if logged user is admin
      const { data: adminData } = await supabase
        .from("admin_profile")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!adminData) {
        setErrorMessage("You are not authorized to access the Admin Dashboard");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // ✅ Only admin reaches dashboard
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="auth-page">
      <div style={{ position: "relative", transform: "translateY(-30px)" }}>
        <img
          src={logo}
          alt="Neatify Logo"
          style={{
            position: "absolute",
            top: "-95px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "200px",
            zIndex: 10,
          }}
        />

        <div className="auth-card">
          <h2 className="auth-title">Admin Login</h2>

          {!isSupabaseConfigured && (
            <div style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              marginBottom: "15px",
              border: "1px solid #ffeeba",
              textAlign: "left"
            }}>
              <strong>⚠️ Setup Required:</strong> Please update your <code>.env</code> file with valid <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code>.
            </div>
          )}

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-wrapper">
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="eye-button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="#555"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="#555"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              )}
            </button>
          </div>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button
            className="auth-button"
            onClick={handleLogin}
            style={{
              display: "block",
              margin: "20px auto 0",
            }}
          >
            Login
          </button>

          <p className="auth-link">
            New account?{" "}
            <Link to="/signup">
              <span>Signup</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;