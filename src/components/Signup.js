import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabase";
import neatifyLogo from "../neatifylogo.png";
import Loader from "./Loader";

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    setLoading(true);
    setErrorMessage("");

    // 1️⃣ Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    // 2️⃣ Store admin profile data
    const userId = data.user?.id;

    if (!userId) {
      setErrorMessage("User creation failed");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("admin_signup")
      .insert([
        {
          id: userId,
          full_name: fullName,
          email: email,
          phone: phone,
        },
      ]);

    if (insertError) {
      setErrorMessage("Signup failed while saving admin details");
      setLoading(false);
      return;
    }

    // 3️⃣ Redirect to dashboard
    navigate("/dashboard");
  };

  if (loading) return <Loader />;

  return (
    <div className="auth-page">
      <div style={{ position: "relative", transform: "translateY(-30px)" }}>
        {/* ✅ LOGO */}
        <img
          src={neatifyLogo}
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

        {/* ✅ CARD */}
        <div className="auth-card">
          <h2 className="auth-title">Admin Signup</h2>

          <input
            className="auth-input"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="auth-input"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMessage && (
            <p className="auth-error">{errorMessage}</p>
          )}

          <button className="auth-button" onClick={handleSignup}>
            Signup
          </button>

          {/* ✅ BACK TO LOGIN */}
          <p className="auth-link">
            Already have an account?{" "}
            <Link to="/">
              <span>Login</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
