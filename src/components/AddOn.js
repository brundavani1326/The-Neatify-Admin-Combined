import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function AddOn({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    price: "",
    original_price: "",
    discount_percent: "",
    discount_label: "",
    tax_percent: "",
    sort_order: "",
    work_includes: "",
    work_not_included: "",
    image: "",
    description: "",
    max_quantity: "",
    is_active: true,
    service_type: "",
  });

  const [showAlert, setShowAlert] = useState(false);
  const [insertError, setInsertError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Custom Validation Alert
  const [validationAlert, setValidationAlert] = useState("");

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Handle price fields: prepend ₹ if not empty and doesn't already have it
    if (name === "price" || name === "original_price") {
      // Remove any existing ₹ first to prevent duplicates if user types it
      let cleanValue = value.replace(/₹/g, "");
      // Re-add ₹ if there's an actual number being typed
      if (cleanValue.trim() !== "") {
        value = `₹${cleanValue}`;
      } else {
        value = ""; // Empty field instead of just "₹"
      }
    }

    if (name === "service_type") {
      value = value.toUpperCase();
    }

    setFormData({ ...formData, [name]: value });
  };

  // Open confirmation popup
  const saveAddOn = () => {
    if (!formData.title || !formData.price) {
      setInsertError("Title and Price are required.");
      return;
    }

    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setValidationAlert("image ratio must be 1:1 amd example size is 1024 X 1024");
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
    // Upload image if a file was selected
    setLoading(true);
    let imageUrl = "";
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `addon_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageFile);
      if (uploadError) {
        setInsertError("Image upload failed: " + uploadError.message);
        setShowAlert(false);
        setLoading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("add_ons")
      .insert([
        {
          title: formData.title.trim(),
          duration: formData.duration ? parseInt(formData.duration) : null,
          price: formData.price,
          original_price: formData.original_price,
          discount_percent: formData.discount_percent ? parseInt(formData.discount_percent) : null,
          discount_label: formData.discount_label,
          tax_percent: formData.tax_percent,
          sort_order: formData.sort_order ? parseInt(formData.sort_order) : null,
          work_includes: formData.work_includes,
          work_not_included: formData.work_not_included,
          image: imageUrl,
          description: formData.description,
          max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
          is_active: formData.is_active,
          service_type: formData.service_type || "ADDITIONAL SERVICES",
        },
      ])
      .select();

    if (error) {
      console.error("Insert Error:", error);
      setInsertError(error.message || "Failed to save. Check inputs or database connection.");
      setShowAlert(false);
    } else {
      setFormData({
        title: "",
        duration: "",
        price: "",
        original_price: "",
        discount_percent: "",
        discount_label: "",
        tax_percent: "",
        sort_order: "",
        work_includes: "",
        work_not_included: "",
        image: "",
        description: "",
        max_quantity: "",
        is_active: true,
        service_type: "ADDITIONAL SERVICES",
      });
      setImageFile(null);
      if (onSuccess) onSuccess();
    }

    setShowAlert(false);
    setLoading(false);
  };

  return (
    <div className="auth-page services-addon-page" style={{ position: "relative" }}>
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
          marginTop: "0px",
          width: "95%",
          maxWidth: "800px"
        }}
      >
        <h2 className="auth-title">Add On</h2>

        {/* Title */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Add On Title</label>
            <input
              className="auth-input"
              name="title"
              placeholder="Add On Title"
              value={formData.title}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Duration (min)</label>
            <input
              className="auth-input"
              name="duration"
              placeholder="Duration (in minutes)"
              value={formData.duration}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Price (₹)</label>
            <input
              className="auth-input"
              name="price"
              placeholder="Price (₹)"
              value={formData.price}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Original Price (₹)</label>
            <input
              className="auth-input"
              name="original_price"
              placeholder="Original Price (₹)"
              value={formData.original_price}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Discount (%)</label>
            <input
              className="auth-input"
              name="discount_percent"
              placeholder="Discount Percentage (%)"
              value={formData.discount_percent}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Discount Label</label>
            <input
              className="auth-input"
              name="discount_label"
              placeholder="e.g. 5% OFF"
              value={formData.discount_label}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Tax (%)</label>
            <input
              className="auth-input"
              name="tax_percent"
              placeholder="Tax Percentage (%)"
              value={formData.tax_percent}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Sort Order</label>
            <input
              className="auth-input"
              name="sort_order"
              placeholder="Sort Order"
              value={formData.sort_order}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Work Includes</label>
            <input
              className="auth-input"
              name="work_includes"
              placeholder="Work Includes"
              value={formData.work_includes}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Work Not Included</label>
            <input
              className="auth-input"
              name="work_not_included"
              placeholder="Work Not Included"
              value={formData.work_not_included}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {/* Image */}
        <div className="upload-field">
          <label className="upload-field__label" style={{ display: "block", marginBottom: "5px" }}>
            IMAGE <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(image ratio must be 1:1 and example size is 1024 X 1024)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Description</label>
            <input
              className="auth-input"
              name="description"
              placeholder="Add On Description"
              value={formData.description}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Max Quantity</label>
            <input
              className="auth-input"
              name="max_quantity"
              placeholder="Max Quantity"
              value={formData.max_quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_quantity: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Service Type</label>
            <input
              className="auth-input"
              name="service_type"
              placeholder="e.g. KITCHEN"
              value={formData.service_type}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Is Active?</label>
            <select
              className="auth-input"
              name="is_active"
              value={formData.is_active ? "TRUE" : "FALSE"}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "TRUE" })}
              style={{ padding: "0 10px", marginBottom: 0 }}
            >
              <option value="TRUE">TRUE</option>
              <option value="FALSE">FALSE</option>
            </select>
          </div>
        </div>

        <button className="auth-button" onClick={saveAddOn}>
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
              Do you want to add this add-on?
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px 40px",
              borderRadius: "12px",
              textAlign: "center",
              minWidth: "350px",
              position: "relative",
            }}
          >
            <span
              onClick={() => setValidationAlert("")}
              style={{
                position: "absolute",
                top: "12px",
                right: "15px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              ✕
            </span>
            <h3 style={{ color: "#dc2626", marginBottom: "15px" }}>Upload Error</h3>
            <p style={{ color: "#333", fontSize: "14px" }}>{validationAlert}</p>
            <button
              onClick={() => setValidationAlert("")}
              style={{
                marginTop: "20px",
                padding: "8px 25px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontWeight: "600",
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

export default AddOn;