import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function AddMainCategory({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    sort_order: "",
  });

  const [showAlert, setShowAlert] = useState(false);
  const [insertError, setInsertError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Custom Validation Alert
  const [validationAlert, setValidationAlert] = useState("");

  const handleChange = (e) => {
    let { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Open confirmation popup
  const saveCategory = () => {
    if (!formData.name) {
      setInsertError("Category Name is required.");
      return;
    }

    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setValidationAlert("Image ratio must be 1:1. Example size is 1024 X 1024.");
          return;
        }
        setShowAlert(true);
      };
      img.src = URL.createObjectURL(imageFile);
    } else {
      setShowAlert(true);
    }
  };

  const closeAlertOnly = () => {
    setShowAlert(false);
  };

  const confirmAlert = async () => {
    setLoading(true);
    let iconUrl = "";

    try {
      // 1. Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `main/category_icon/category_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("category-icons")
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error("Image upload failed: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
        iconUrl = publicUrlData.publicUrl;
      }

      // 2. Insert into main_categories
      const { error } = await supabase
        .from("main_categories")
        .insert([
          {
            name: formData.name.trim(),
            sort_order: formData.sort_order ? parseInt(formData.sort_order) : null,
            icon_url: iconUrl,
          },
        ]);

      if (error) {
        throw error;
      }

      // 3. Success handling
      setShowSuccessModal(true);
      setFormData({ name: "", sort_order: "" });
      setImageFile(null);
      // onSuccess() will be called when they click OK in the modal

    } catch (err) {
      console.error("Error saving main category:", err);
      setInsertError(err.message || "Failed to save category. Please try again.");
    } finally {
      setShowAlert(false);
      setLoading(false);
    }
  };

  return (
    <div 
      className="auth-page services-main-category-page" 
      style={{ 
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 0"
      }}
    >
      {loading && <Loader />}
      
      {/* Back Arrow Button */}
      <button
        onClick={() => {
          if (onBack) {
            onBack();
          } else {
            localStorage.setItem("adminActiveTab", "services");
            localStorage.setItem("servicesActiveTab", "list");
            navigate("/dashboard");
          }
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

      <div 
        className="auth-card" 
        style={{ 
          maxHeight: "90vh", 
          overflowY: "auto", 
          marginTop: "0px"
        }}
      >
        <h2 className="auth-title">Add Main Category</h2>

        {/* Name */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>
            Category Name
          </label>
          <input
            className="auth-input"
            name="name"
            placeholder="e.g. Cleaning Services"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        {/* Sort Order */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>
            Sort Order
          </label>
          <input
            className="auth-input"
            name="sort_order"
            type="number"
            placeholder="e.g. 1"
            value={formData.sort_order}
            onChange={handleChange}
          />
        </div>

        {/* Icon Image */}
        <div className="upload-field">
          <label className="upload-field__label">
            Category Icon <span style={{ color: "red", fontSize: "12px", fontWeight: "normal", textTransform: "none" }}>(1:1 ratio required)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
        </div>

        <button className="auth-button" onClick={saveCategory}>
          Save
        </button>
      </div>

      {/* Confirmation Popup */}
      {showAlert && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span className="modal-close" onClick={closeAlertOnly}>
              ✕
            </span>

            <h3 className="modal-title">Confirm</h3>
            <p style={{ textAlign: "center" }}>
              Do you want to add this main category?
            </p>

            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={confirmAlert}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {insertError && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => setInsertError("")}
            >
              ✕
            </span>

            <h3 className="modal-title" style={{ color: "red" }}>
              Error
            </h3>
            <p style={{ textAlign: "center", marginBottom: "20px" }}>
              {insertError}
            </p>

            <button
              className="auth-button"
              style={{ width: "100%" }}
              onClick={() => setInsertError("")}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Validation Alert UI */}
      {validationAlert && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              onClick={() => setValidationAlert("")}
              className="modal-close"
            >
              ✕
            </span>
            <h3 style={{ color: "#dc2626", marginBottom: "15px" }} className="modal-title">Upload Error</h3>
            <p style={{ color: "#333", fontSize: "14px", textAlign: "center" }}>{validationAlert}</p>
            <button
              onClick={() => setValidationAlert("")}
              className="auth-button"
              style={{ width: "100%", marginTop: "20px", backgroundColor: "#dc2626", color: "#fff" }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => {
                setShowSuccessModal(false);
                if (onSuccess) onSuccess();
              }}
            >
              ✕
            </span>
            <h3 className="modal-title">Success</h3>
            <p style={{ textAlign: "center" }}>
              Main Category added successfully!
            </p>
            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={() => {
                setShowSuccessModal(false);
                if (onSuccess) onSuccess();
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddMainCategory;
