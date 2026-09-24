import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function EditAddOn() {
  const { id } = useParams();
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

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [validationAlert, setValidationAlert] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAddOn = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("add_ons")
      .select("*")
      .eq("id", id)
      .single();

    if (data && !error) {
      setFormData({
        title: data.title || "",
        duration: data.duration || "",
        price: data.price || "",
        original_price: data.original_price || "",
        discount_percent: data.discount_percent || "",
        discount_label: data.discount_label || "",
        tax_percent: data.tax_percent || "",
        sort_order: data.sort_order || "",
        work_includes: data.work_includes || "",
        work_not_included: data.work_not_included || "",
        image: data.image || "",
        description: data.description || "",
        max_quantity: data.max_quantity || "",
        is_active: data.is_active ?? true,
        service_type: data.service_type || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAddOn();
  }, [fetchAddOn]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Handle price fields: prepend ₹ if not empty and doesn't already have it
    if (name === "price" || name === "original_price") {
      let cleanValue = value.replace(/₹/g, "");
      if (cleanValue.trim() !== "") {
        value = `₹${cleanValue}`;
      } else {
        value = "";
      }
    }

    if (name === "service_type") {
      value = value.toUpperCase();
    }

    setFormData({ ...formData, [name]: value });
  };

  // 🔵 OPEN CONFIRM POPUP
  const updateAddOn = () => {
    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setValidationAlert("image ratio must be 1:1 amd example size is 1024 X 1024");
          return;
        }
        setShowConfirm(true);
      };
      img.src = URL.createObjectURL(imageFile);
    } else {
      setShowConfirm(true);
    }
  };

  // 🟡 ACTUAL UPDATE
  const confirmUpdate = async () => {
    setLoading(true);
    // Upload new image if file selected
    let imageUrl = formData.image;
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `addon_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageFile, { upsert: true });
      if (uploadError) {
        console.error("Image upload failed:", uploadError);
        setShowConfirm(false);
        setLoading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("add_ons")
      .update({
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
        service_type: formData.service_type,
      })
      .eq("id", id);

    setShowConfirm(false);
    setLoading(false);

    if (!error) {
      setShowSuccess(true);
    } else {
      console.error("Update Error:", error);
    }
  };

  return (
    <div className="auth-page services-addon-page" style={{ position: "relative" }}>
      {loading && <Loader />}
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

      <div
        className="auth-card"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          marginTop: "20px",
          width: "95%",
          maxWidth: "800px"
        }}
      >
        <h2 className="auth-title">Edit Add On</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Add On Title</label>
            <input
              className="auth-input"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Duration (min)</label>
            <input
              className="auth-input"
              name="duration"
              value={formData.duration}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              placeholder="Duration (minutes)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Price (₹)</label>
            <input
              className="auth-input"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Price (₹)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Original Price (₹)</label>
            <input
              className="auth-input"
              name="original_price"
              value={formData.original_price}
              onChange={handleChange}
              placeholder="Original Price (₹)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Discount (%)</label>
            <input
              className="auth-input"
              name="discount_percent"
              value={formData.discount_percent}
              onChange={handleChange}
              placeholder="Discount Percentage (%)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Discount Label</label>
            <input
              className="auth-input"
              name="discount_label"
              value={formData.discount_label}
              onChange={handleChange}
              placeholder="Discount Label (e.g. 5% OFF)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Tax (%)</label>
            <input
              className="auth-input"
              name="tax_percent"
              value={formData.tax_percent}
              onChange={handleChange}
              placeholder="Tax Percentage (%)"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Sort Order</label>
            <input
              className="auth-input"
              name="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              placeholder="Sort Order"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Work Includes</label>
            <input
              className="auth-input"
              name="work_includes"
              value={formData.work_includes}
              onChange={handleChange}
              placeholder="Work Includes"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Work Not Included</label>
            <input
              className="auth-input"
              name="work_not_included"
              value={formData.work_not_included}
              onChange={handleChange}
              placeholder="Work Not Included"
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <div className="upload-field">
          <label className="upload-field__label" style={{ display: "block", marginBottom: "5px" }}>
            UPDATE IMAGE <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(image ratio must be 1:1 amd example size is 1024 X 1024)</span>
          </label>
          {formData.image && !imageFile && (
            <img src={formData.image} alt="Current" className="upload-field__preview" />
          )}
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
              value={formData.description}
              onChange={handleChange}
              placeholder="Description"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Max Quantity</label>
            <input
              className="auth-input"
              name="max_quantity"
              value={formData.max_quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_quantity: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              placeholder="Max Quantity"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Service Type</label>
            <input
              className="auth-input"
              name="service_type"
              value={formData.service_type}
              onChange={handleChange}
              placeholder="Service Type (e.g. KITCHEN, BATHROOM)"
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

        <button className="auth-button" onClick={updateAddOn}>
          Update
        </button>
      </div>

      {/* 🔵 CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => setShowConfirm(false)}
            >
              ✕
            </span>

            <h3 className="modal-title">Confirm</h3>
            <p style={{ textAlign: "center" }}>
              Do you want to update this add-on?
            </p>

            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={confirmUpdate}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* 🟢 SUCCESS MODAL */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => {
                setShowSuccess(false);
                navigate("/dashboard");
              }}
            >
              ✕
            </span>

            <h3 className="modal-title">Success</h3>
            <p style={{ textAlign: "center" }}>
              Updated Successfully ✅
            </p>

            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={() => {
                setShowSuccess(false);
                navigate("/dashboard");
              }}
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

export default EditAddOn;
