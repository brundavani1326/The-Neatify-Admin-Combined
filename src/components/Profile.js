import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function MyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
  });

  const fetchProfile = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Fetch signup data
    const { data: signupData } = await supabase
      .from("admin_signup")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();

    // Fetch profile data
    const { data: profileData } = await supabase
      .from("admin_profile")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile({
      full_name: profileData?.full_name ?? signupData?.full_name ?? "",
      email: signupData?.email ?? "",
      phone: profileData?.phone ?? signupData?.phone ?? "",
      address: profileData?.address ?? "",
      pincode: profileData?.pincode ?? "",
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Validate phone number: must be exactly 10 digits
    const cleanPhone = (profile.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMessage("Phone number must be exactly 10 digits");
      return;
    }

    // 1️⃣ Update admin_profile table
    const { error: profileError } = await supabase
      .from("admin_profile")
      .upsert({
        id: user.id,
        full_name: profile.full_name || null,
        phone: cleanPhone,
        address: profile.address || null,
        pincode: profile.pincode || null,
      });

    if (profileError) {
      console.error("Profile update failed:", profileError.message);
      setErrorMessage("Profile update failed: " + profileError.message);
      return;
    }

    // 2️⃣ ALSO update admin_signup table
    const { error: signupError } = await supabase
      .from("admin_signup")
      .update({
        full_name: profile.full_name,
        phone: cleanPhone,
      })
      .eq("id", user.id);

    if (signupError) {
      console.error("Signup update failed:", signupError.message);
      setErrorMessage("Signup update failed: " + signupError.message);
      return;
    }

    setShowSuccess(true);
    setIsEdit(false);
  };

  if (loading) return <Loader />;

  return (
    <div
      className="auth-page services-profile-page"
    >
      {/* Back Arrow Button */}
      <button
        onClick={() => {
          localStorage.setItem("adminActiveTab", "services");
          localStorage.setItem("servicesActiveTab", "list");
          navigate("/dashboard");
        }}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          backgroundColor: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "45px",
          height: "45px",
          fontSize: "24px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          zIndex: 10,
          color: "#333",
        }}
        title="Back to Dashboard"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "22px", height: "22px" }}
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <div className="auth-card" style={{ width: "360px" }}>
        <h2 className="auth-title">My Profile</h2>

        <input
          className="auth-input"
          value={profile.full_name}
          disabled={!isEdit}
          placeholder="Full Name"
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
        />

        <input
          className="auth-input"
          value={profile.phone}
          disabled={!isEdit}
          placeholder="Phone"
          maxLength={10}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            setProfile({ ...profile, phone: val });
          }}
        />

        <input
          className="auth-input"
          value={profile.address}
          disabled={!isEdit}
          placeholder="Address"
          onChange={(e) =>
            setProfile({ ...profile, address: e.target.value })
          }
        />

        <input
          className="auth-input"
          value={profile.pincode}
          disabled={!isEdit}
          placeholder="Pincode"
          onChange={(e) =>
            setProfile({ ...profile, pincode: e.target.value })
          }
        />

        {!isEdit ? (
          <button className="auth-button" onClick={() => setIsEdit(true)}
           style={{
           display: "block",
          margin: "20px auto 0"
          }}>
            Edit Profile
          </button>
        ) : (
          <button className="auth-button" onClick={handleUpdate}
           style={{
          display: "block",
          margin: "20px auto 0"
          }}>
            Update Profile
          </button>
        )}

        <p
          className="auth-link"
          onClick={() => navigate("/dashboard")}
        >
          <b>Back to Dashboard</b>
        </p>
      </div>
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: "center" }}>
            <h3>Success</h3>
            <p>Profile updated successfully</p>
            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={() => setShowSuccess(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: "center" }}>
            <h3 style={{ color: "#ff4d4d", marginBottom: "10px" }}>Error</h3>
            <p>{errorMessage}</p>
            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px", backgroundColor: "#ff4d4d", border: "none" }}
              onClick={() => setErrorMessage("")}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default MyProfile;
