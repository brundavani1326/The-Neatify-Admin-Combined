import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function EditMainCategory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    sort_order: "",
    icon_url: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [validationAlert, setValidationAlert] = useState("");

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("main_categories")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setFormData({
          name: data.name || "",
          sort_order: data.sort_order !== null ? data.sort_order : "",
          icon_url: data.icon_url || "",
        });
      }
      if (error) {
        console.error("Error fetching category:", error);
      }
      setLoading(false);
    };

    fetchCategory();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateImageRatio = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width === img.height);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      setValidationAlert("Category Name is required.");
      return;
    }

    setUpdating(true);

    try {
      let iconUrl = formData.icon_url;

      // 1. Upload new image if selected
      if (imageFile) {
        const isValid = await validateImageRatio(imageFile);
        if (!isValid) {
          setValidationAlert("Image ratio must be 1:1. Example size is 1024 X 1024.");
          setUpdating(false);
          return;
        }

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

      // 2. Update main_categories
      const { error } = await supabase
        .from("main_categories")
        .update({
          name: formData.name.trim(),
          sort_order: formData.sort_order ? parseInt(formData.sort_order) : null,
          icon_url: iconUrl,
        })
        .eq("id", id);

      if (error) throw error;

      setShowAlert(true);
    } catch (err) {
      console.error("Error updating category:", err);
      setUpdateError(err.message || "Failed to update category.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div 
      className="auth-page services-edit-page" 
      style={{ 
        position: "relative", 
        minHeight: "100vh", 
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 0" 
      }}
    >
      {updating && <Loader />}
      
      {/* Back Arrow Button */}
      <button
        onClick={() => {
          localStorage.setItem("adminActiveTab", "services");
          localStorage.setItem("servicesActiveTab", "main_category");
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
        title="Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "22px", height: "22px" }}>
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <div className="auth-card" style={{ maxHeight: "90vh", overflowY: "auto", marginTop: "0px" }}>
        <h2 className="auth-title">Edit Main Category</h2>

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
          {formData.icon_url && !imageFile && (
            <img src={formData.icon_url} alt="Current Icon" style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover", marginBottom: "10px", border: "1px solid #ddd" }} />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
        </div>

        <button className="auth-button" onClick={handleSave}>
          Save Changes
        </button>
      </div>

      {/* Success Modal */}
      {showAlert && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              onClick={() => setShowAlert(false)}
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
            <h3 className="modal-title">Success</h3>
            <p style={{ textAlign: "center" }}>Main Category updated successfully!</p>
            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={() => navigate("/dashboard")}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error/Validation Modals */}
      {(updateError || validationAlert) && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title" style={{ color: "red" }}>{updateError ? "Error" : "Input Error"}</h3>
            <p style={{ textAlign: "center" }}>{updateError || validationAlert}</p>
            <button className="auth-button" style={{ width: "100%", marginTop: "15px" }} onClick={() => { setUpdateError(""); setValidationAlert(""); }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditMainCategory;
