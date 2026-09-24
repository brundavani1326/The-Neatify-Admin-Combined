import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";

function AddService({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    duration: "",
    price: "",
    original_price: "",
    discount_percent: "",
    discount_label: "",
    tax_percent: "",
    cancellation_fee: "99",
    partner_cancellation_amount: "99",
    service_type: "",
    work_includes: "",
    work_not_included: "",
    description: "",
    main_category_id: "",
  });
  const [isCancellationFeeUserEdited, setIsCancellationFeeUserEdited] = useState(false);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [insertError, setInsertError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainCategories, setMainCategories] = useState([]);
  const [categoryIconFile, setCategoryIconFile] = useState(null);
  
  // Custom Validation Alert
  const [validationAlert, setValidationAlert] = useState("");

  useEffect(() => {
    const fetchMainCategories = async () => {
      const { data, error } = await supabase
        .from("main_categories")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });
      if (!error && data) {
        setMainCategories(data);
      }
    };
    fetchMainCategories();
  }, []);

  // Combined Effect: Auto-fill category_order
  useEffect(() => {
    const updateOrder = async () => {
      // 1. Priority: If a Main Category is selected, use its sort_order
      if (formData.main_category_id && mainCategories.length > 0) {
        const selectedCat = mainCategories.find(c => c.id === String(formData.main_category_id));
        if (selectedCat && selectedCat.sort_order !== null && selectedCat.sort_order !== undefined) {
          setCategoryOrder(selectedCat.sort_order);
          return;
        }
      }

      // 2. Fallback: If service_type exists, fetch from existing services
      if (formData.service_type) {
        const { data } = await supabase
          .from("services")
          .select("category_order")
          .eq("service_type", formData.service_type)
          .limit(1)
          .single();
        if (data && data.category_order !== null && data.category_order !== undefined) {
          setCategoryOrder(data.category_order);
          return;
        }
      }

      // 3. Reset if nothing found
      if (!formData.main_category_id && !formData.service_type) {
        setCategoryOrder("");
      }
    };

    updateOrder();
  }, [formData.main_category_id, formData.service_type, mainCategories]);

  // Auto calculate default cancellation fee based on price & service title/type if not manually edited
  useEffect(() => {
    if (isCancellationFeeUserEdited) return;

    const rawPrice = Number((formData.price || "").replace(/[^0-9]/g, "")) || 0;
    const titleAndType = `${formData.title} ${formData.service_type}`;
    const isDeepCleaning = /deep/i.test(titleAndType);

    const calculatedDefaultFee = (rawPrice >= 2000 || isDeepCleaning) ? "299" : "99";
    setFormData(prev => ({ ...prev, cancellation_fee: calculatedDefaultFee }));
  }, [formData.price, formData.title, formData.service_type, isCancellationFeeUserEdited]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "cancellation_fee") {
      setIsCancellationFeeUserEdited(true);
    }

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

    // Handle service type: force uppercase
    if (name === "service_type") {
      value = value.toUpperCase();
    }

    // Handle slug validation: no spaces allowed
    if (name === "slug") {
      if (value.includes(" ")) {
        setSlugError('Invalid format! Use hyphens instead of spaces, e.g. "Neatify-5-Bathroom"');
      } else {
        setSlugError("");
      }
    }

    setFormData({ ...formData, [name]: value });
  };


  const saveService = () => {
    // Block save if slug has spaces
    if (formData.slug.includes(" ")) {
      setSlugError('Invalid format! Use hyphens instead of spaces, e.g. "Neatify-5-Bathroom"');
      return;
    }

    const proceedWithSave = () => {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        duration: formData.duration,
        // price and original_price are text columns — keep ₹ symbol
        price: formData.price,
        original_price: formData.original_price,
        // discount_percent is numeric — strip any non-numeric chars
        discount_percent: formData.discount_percent ? Number(formData.discount_percent) : null,
        discount_label: formData.discount_label,
        tax_percent: formData.tax_percent,
        cancellation_fee: formData.cancellation_fee !== "" && formData.cancellation_fee !== null ? Number(String(formData.cancellation_fee).replace(/[^0-9.]/g, '')) : null,
        partner_cancellation_amount: formData.partner_cancellation_amount !== "" && formData.partner_cancellation_amount !== null ? Number(String(formData.partner_cancellation_amount).replace(/[^0-9.]/g, '')) : null,
        category_order: categoryOrder !== "" ? Number(categoryOrder) : null,
        sort_order: sortOrder !== "" ? Number(sortOrder) : null,
        image: formData.image,
        service_type: formData.service_type,
        work_includes: formData.work_includes,
        work_not_included: formData.work_not_included,
        description: formData.description,
        main_category_id: formData.main_category_id || null,
        category_icon_url: "", // Will be filled before insert
        gallery_images: formData.gallery_images
          ? formData.gallery_images.split(",").map((img) => img.trim())
          : [],
      };
      setInsertError("");
      setPendingPayload(payload);
      setShowAlert(true);
    };

    // Helper to validate a single file
    const validateImageRatio = (file) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve(img.width === img.height);
        };
        img.src = URL.createObjectURL(file);
      });
    };

    const validateAllImages = async () => {
      if (mainImageFile) {
        const isMainValid = await validateImageRatio(mainImageFile);
        if (!isMainValid) {
          setValidationAlert("image ratio must be 1:1 amd example size is 1024 X 1024");
          return;
        }
      }

      if (galleryImageFiles.length > 0) {
        for (let i = 0; i < galleryImageFiles.length; i++) {
          const isValid = await validateImageRatio(galleryImageFiles[i]);
          if (!isValid) {
            setValidationAlert("image ratio must be 1:1 amd example size is 1024 X 1024");
            return;
          }
        }
      }

      proceedWithSave();
    };

    validateAllImages();
  };

  const closeAlertOnly = () => {
    setShowAlert(false);
    setPendingPayload(null);
  };

  const confirmAlert = async () => {
    if (!pendingPayload) return;

    setLoading(true);

    // 1. If sort_order is provided, we need to shift existing ones down
    if (pendingPayload.sort_order !== null) {
      // Find all services with same type and sort_order >= the new one
      const { data: existingToShift } = await supabase
        .from("services")
        .select("id, sort_order")
        .eq("service_type", pendingPayload.service_type)
        .gte("sort_order", pendingPayload.sort_order);

      // Increment their sort_order by 1
      if (existingToShift && existingToShift.length > 0) {
        for (const service of existingToShift) {
          await supabase
            .from("services")
            .update({ sort_order: service.sort_order + 1 })
            .eq("id", service.id);
        }
      }
    }

    // 2. Upload images to category-icons bucket under main/{service_type_title_case}/
    const folderPath = `category_icons`;

    let mainImageUrl = "";
    if (mainImageFile) {
      const fileExt = mainImageFile.name.split(".").pop();
      const fileName = `${folderPath}/main_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("category-icons")
        .upload(fileName, mainImageFile);
      if (uploadError) {
        setInsertError("Main image upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
      mainImageUrl = publicUrlData.publicUrl;
    }

    let galleryUrls = [];
    if (galleryImageFiles.length > 0) {
      for (let i = 0; i < galleryImageFiles.length; i++) {
        const file = galleryImageFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${folderPath}/gallery_${Date.now()}_${i}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("category-icons")
          .upload(fileName, file);
        if (uploadError) {
          setInsertError("Gallery image upload failed: " + uploadError.message);
          setLoading(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
        galleryUrls.push(publicUrlData.publicUrl);
      }
    }

    let categoryIconUrl = "";
    if (categoryIconFile) {
      const fileExt = categoryIconFile.name.split(".").pop();
      const fileName = `${folderPath}/category_icon_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("category-icons")
        .upload(fileName, categoryIconFile);
      if (uploadError) {
        setInsertError("Category icon upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
      categoryIconUrl = publicUrlData.publicUrl;
    }

    // 3. Insert the new service
    const finalPayload = {
      ...pendingPayload,
      image: mainImageUrl,
      gallery_images: galleryUrls,
      category_icon_url: categoryIconUrl
    };

    const { error } = await supabase.from("services").insert([finalPayload]);
    if (!error) {
      setShowAlert(false);
      setPendingPayload(null);
      setLoading(false);
      onSuccess();
    } else {
      console.error("Insert error:", error);
      setInsertError(error.message || "Failed to save. Check column names/types.");
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page services-add-page"
      style={{
        minHeight: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "60px 0", // ✅ this creates top & bottom space
        position: "relative",
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
          marginTop: "0px",
          width: "95%",
          maxWidth: "800px"
        }}
      >
        <h2 className="auth-title">Add Service</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Service Title</label>
            <input
              className="auth-input"
              name="title"
              placeholder="Service Title"
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Slug</label>
            <input
              className="auth-input"
              name="slug"
              placeholder='e.g. Neatify-5-Bathroom'
              onChange={handleChange}
              style={{ borderColor: slugError ? "red" : undefined, marginBottom: 0 }}
            />
            {slugError && (
              <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                ⚠️ {slugError}
              </p>
            )}
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Duration</label>
            <input
              className="auth-input"
              name="duration"
              placeholder="e.g. 1 hr"
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Price (₹)</label>
            <input
              className="auth-input"
              name="price"
              placeholder="Price (₹)"
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
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Customer Cancellation Fee (₹)</label>
            <input
              className="auth-input"
              name="cancellation_fee"
              value={formData.cancellation_fee}
              placeholder="e.g. 99 or 299"
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
            <span style={{ fontSize: "11px", color: "#666", marginTop: "2px", display: "block" }}>
              Deducted on customer cancellation
            </span>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Staff / Partner Cancellation Fee (₹)</label>
            <input
              className="auth-input"
              name="partner_cancellation_amount"
              value={formData.partner_cancellation_amount}
              placeholder="e.g. 99"
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
            <span style={{ fontSize: "11px", color: "#666", marginTop: "2px", display: "block" }}>
              Cancellation fee allocated to staff / partner
            </span>
          </div>
        </div>
        {/* ✅ END */}

        <div className="upload-field">
          <label className="upload-field__label">Main Image <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(image ratio must be 1:1 amd example size is 1024 X 1024)</span></label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setMainImageFile(e.target.files[0])}
          />
        </div>

        <div className="upload-field">
          <label className="upload-field__label">Gallery Images <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(image ratio must be 1:1 amd example size is 1024 X 1024)</span></label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setGalleryImageFiles((prev) => [
                ...prev,
                ...Array.from(e.target.files),
              ])
            }
          />
          {galleryImageFiles.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "12px", color: "#444" }}>
                {galleryImageFiles.length} file{galleryImageFiles.length > 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={() => setGalleryImageFiles([])}
                style={{ fontSize: "11px", background: "#fee2e2", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", color: "#dc2626", fontWeight: "600" }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="upload-field">
          <label className="upload-field__label">Category Icon <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(Required for app category display)</span></label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCategoryIconFile(e.target.files[0])}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Service Type</label>
            <input
              className="auth-input"
              name="service_type"
              placeholder="e.g. KITCHEN"
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Main Category</label>
            <select
              className="auth-input"
              name="main_category_id"
              value={formData.main_category_id}
              onChange={handleChange}
              style={{ padding: "0 10px", marginBottom: 0 }}
            >
              <option value="">Select Main Category</option>
              {mainCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Category Order</label>
            <input
              className="auth-input"
              name="category_order"
              type="number"
              placeholder="e.g. 1"
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(e.target.value)}
              style={{ border: "1px solid #ddd", marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Sort Order</label>
            <input
              className="auth-input"
              name="sort_order"
              placeholder="e.g. 5"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <textarea
          className="auth-input"
          name="work_includes"
          placeholder="Work Includes"
          onChange={handleChange}
          rows={6}
          style={{ resize: "vertical", minHeight: "120px" }}
        />

        <textarea
          className="auth-input"
          name="work_not_included"
          placeholder="Work Not Included"
          onChange={handleChange}
          rows={6}
          style={{ resize: "vertical", minHeight: "120px" }}
        />

        <input
          className="auth-input"
          name="description"
          placeholder="Service Description"
          onChange={handleChange}
        />

        <button className="auth-button" onClick={saveService}>
          Save
        </button>
      </div>

      {showAlert && (
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
              onClick={closeAlertOnly}
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
            <h3>Confirm</h3>
            <p>Do you want to add this service?</p>
            {insertError && (
              <p style={{ color: "red", fontSize: "13px", marginTop: "8px" }}>
                Error: {insertError}
              </p>
            )}
            <button
              onClick={confirmAlert}
              style={{
                marginTop: "15px",
                padding: "8px 25px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                backgroundColor: "#facc15",
                color: "#000",
                fontWeight: "600",
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

export default AddService;
