import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "./Loader";
import ServiceHowItWorksVideos from "./ServiceHowItWorksVideos";

function EditService() {
  const { id } = useParams();
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
    cancellation_fee: "",
    partner_cancellation_amount: "",
    image: "",
    gallery_images: "",
    service_type: "",
    work_includes: "",
    work_not_included: "",
    description: "",
    sort_order: "",
    category_order: "",
    main_category_id: "",
    category_icon_url: "",
  });
  const [categoryIconFile, setCategoryIconFile] = useState(null);
  const [mainCategories, setMainCategories] = useState([]);
  const [addons, setAddons] = useState([]);

  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(false);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [validationAlert, setValidationAlert] = useState("");

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        const defaultFee = (Number(String(data.price || "").replace(/[^0-9]/g, '')) >= 2000 || /deep/i.test(data.title || "") || /deep/i.test(data.service_type || "")) ? "299" : "99";
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          duration: data.duration || "",
          price: data.price || "",
          original_price: data.original_price || "",
          discount_percent: data.discount_percent !== null ? data.discount_percent : "",
          discount_label: data.discount_label || "",
          tax_percent: data.tax_percent !== null ? data.tax_percent : "",
          cancellation_fee: data.cancellation_fee !== undefined && data.cancellation_fee !== null ? data.cancellation_fee : defaultFee,
          partner_cancellation_amount: data.partner_cancellation_amount !== undefined && data.partner_cancellation_amount !== null ? data.partner_cancellation_amount : "99",
          image: data.image || "",
          gallery_images: data.gallery_images ? data.gallery_images.join(", ") : "",
          service_type: data.service_type || "",
          work_includes: data.work_includes || "",
          work_not_included: data.work_not_included || "",
          description: data.description || "",
          sort_order: data.sort_order !== null ? data.sort_order : "",
          category_order: data.category_order !== null ? data.category_order : "",
          main_category_id: data.main_category_id || "",
          category_icon_url: data.category_icon_url || "",
        });

        // Fetch related addons BASED ON data.service_type
        if (data.service_type) {
          const { data: addonData } = await supabase
            .from("add_ons")
            .select("*")
            .ilike("service_type", data.service_type.trim());
          
          if (addonData && addonData.length > 0) {
            setAddons(addonData.map(a => ({
              ...a,
              title: a.title ? a.title.charAt(0).toUpperCase() + a.title.slice(1) : "",
              is_active: a.is_active ? "TRUE" : "FALSE"
            })));
          } else {
            console.log("No addons found for:", data.service_type);
            setAddons([]);
          }
        }
      }
      setLoading(false);
    };

    fetchService();
  }, [id]);

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

  // Improved Effect: Auto-fill category_order
  useEffect(() => {
    const updateOrder = async () => {
      // 1. Priority: If a Main Category is selected, use its sort_order
      if (formData.main_category_id && mainCategories.length > 0) {
        const selectedCat = mainCategories.find(c => c.id === String(formData.main_category_id));
        if (selectedCat && selectedCat.sort_order !== null && selectedCat.sort_order !== undefined) {
          setFormData(prev => ({ ...prev, category_order: selectedCat.sort_order }));
          return;
        }
      }

      // 2. Fallback: If service_type exists, fetch from existing services (only if current category_order is empty)
      if (formData.service_type && !formData.category_order) {
        const { data } = await supabase
          .from("services")
          .select("category_order")
          .eq("service_type", formData.service_type)
          .limit(1)
          .single();
        if (data && data.category_order !== null && data.category_order !== undefined) {
          setFormData(prev => ({ ...prev, category_order: data.category_order }));
        }
      }
    };

    updateOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.main_category_id, formData.service_type, mainCategories]);

  // Handle service_type change manually to fetch new addons
  useEffect(() => {
    if (!loading && formData.service_type) {
      const fetchNewAddons = async () => {
        const { data: addonData } = await supabase
          .from("add_ons")
          .select("*")
          .ilike("service_type", formData.service_type.trim());
        
        if (addonData) {
          setAddons(addonData.map(a => ({
            ...a,
            title: a.title ? a.title.charAt(0).toUpperCase() + a.title.slice(1) : "",
            is_active: a.is_active ? "TRUE" : "FALSE"
          })));
        }
      };
      fetchNewAddons();
    }
  }, [formData.service_type, loading]);

  const handleChange = (e) => {
    let { name, value } = e.target;

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

  const handleAddonChange = (index, e) => {
    const { name, value } = e.target;
    const updatedAddons = [...addons];
    let val = value;
    if (name === "title" && val.length > 0) {
      val = val.charAt(0).toUpperCase() + val.slice(1);
    } else if (name === "is_active") {
      val = val.toUpperCase();
    }
    updatedAddons[index] = { ...updatedAddons[index], [name]: val };
    setAddons(updatedAddons);
  };

  const updateService = async () => {
    setLoading(true);
    const proceedWithUpdate = async () => {
      // Upload images to category-icons bucket under main/{service_type_title_case}/
      const folderPath = `category_icons`;

      let mainImageUrl = formData.image;
      if (mainImageFile) {
        const fileExt = mainImageFile.name.split(".").pop();
        const fileName = `${folderPath}/main_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("category-icons")
          .upload(fileName, mainImageFile, { upsert: true });
        if (uploadError) {
          console.error("Main image upload failed:", uploadError);
          setLoading(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
        mainImageUrl = publicUrlData.publicUrl;
      }

      // Upload gallery images if new files were chosen
      let galleryUrls = formData.gallery_images
        ? formData.gallery_images.split(",").map((img) => img.trim())
        : [];
      if (galleryImageFiles.length > 0) {
        galleryUrls = [];
        for (let i = 0; i < galleryImageFiles.length; i++) {
          const file = galleryImageFiles[i];
          const fileExt = file.name.split(".").pop();
          const fileName = `${folderPath}/gallery_${Date.now()}_${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("category-icons")
            .upload(fileName, file, { upsert: true });
          if (uploadError) {
            console.error("Gallery image upload failed:", uploadError);
            setLoading(false);
            return;
          }
          const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
          galleryUrls.push(publicUrlData.publicUrl);
        }
      }

      let categoryIconUrl = formData.category_icon_url;
      if (categoryIconFile) {
        const fileExt = categoryIconFile.name.split(".").pop();
        const fileName = `${folderPath}/category_icon_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("category-icons")
          .upload(fileName, categoryIconFile, { upsert: true });
        if (uploadError) {
          console.error("Category icon upload failed:", uploadError);
          setLoading(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
        categoryIconUrl = publicUrlData.publicUrl;
      }

      const payload = {
        title: formData.title,
        slug: formData.slug,
        duration: formData.duration,
        price: formData.price,
        original_price: formData.original_price,
        discount_percent: formData.discount_percent ? Number(formData.discount_percent) : null,
        discount_label: formData.discount_label,
        tax_percent: formData.tax_percent ? Number(formData.tax_percent) : null,
        cancellation_fee: formData.cancellation_fee !== "" && formData.cancellation_fee !== null ? Number(String(formData.cancellation_fee).replace(/[^0-9.]/g, '')) : null,
        partner_cancellation_amount: formData.partner_cancellation_amount !== "" && formData.partner_cancellation_amount !== null ? Number(String(formData.partner_cancellation_amount).replace(/[^0-9.]/g, '')) : null,
        sort_order: formData.sort_order !== "" ? Number(formData.sort_order) : null,
        image: mainImageUrl,
        service_type: formData.service_type,
        work_includes: formData.work_includes,
        work_not_included: formData.work_not_included,
        description: formData.description,
        main_category_id: formData.main_category_id || null,
        category_icon_url: categoryIconUrl,
        gallery_images: galleryUrls,
      };

      const { error: updateError } = await supabase.from("services").update(payload).eq("id", id);
      if (updateError) {
        console.error("Update error:", updateError);
        alert("Update error: " + updateError.message);
        setLoading(false);
        return;
      }

      // Update addons
      if (addons.length > 0) {
        for (const addon of addons) {
          await supabase
            .from("add_ons")
            .update({
              title: addon.title,
              is_active: addon.is_active === "TRUE",
              price: addon.price,
              duration: addon.duration,
            })
            .eq("id", addon.id);
        }
      }

      setShowAlert(true);
      setUpdated(true);
      setLoading(false);
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
          setLoading(false);
          return;
        }
      }

      if (galleryImageFiles.length > 0) {
        for (let i = 0; i < galleryImageFiles.length; i++) {
          const isValid = await validateImageRatio(galleryImageFiles[i]);
          if (!isValid) {
            setValidationAlert("image ratio must be 1:1 amd example size is 1024 X 1024");
            setLoading(false);
            return;
          }
        }
      }

      await proceedWithUpdate();
    };

    validateAllImages();
  };

  // ❌ X → just close alert
  const closeAlertOnly = () => {
    setShowAlert(false);
  };

  // OK → close alert only (do not navigate automatically)
  const confirmAlert = () => {
    setShowAlert(false);
  };

  if (loading) return <Loader />;

  console.log("[EditServices] Rendering with id:", id);

  return (
    <div
      className="auth-page services-edit-page"
      style={{
        minHeight: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "60px 0",
        position: "relative",
      }}
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
        <h2 className="auth-title">Edit Service</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Service Title</label>
            <input
              className="auth-input"
              name="title"
              placeholder="Service Title"
              value={formData.title}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Slug</label>
            <input
              className="auth-input"
              name="slug"
              placeholder="Slug (e.g. Neatify-5-Bathroom)"
              value={formData.slug}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Duration</label>
            <input
              className="auth-input"
              name="duration"
              placeholder="Duration (e.g. 1 hr)"
              value={formData.duration}
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

        <div className="upload-field">
          <label className="upload-field__label">Main Image <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal", textTransform: "none" }}>(image ratio must be 1:1 amd example size is 1024 X 1024)</span></label>
          {formData.image && !mainImageFile && (
            <img src={formData.image} alt="Current" className="upload-field__preview" />
          )}
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
          {formData.category_icon_url && !categoryIconFile && (
            <div style={{ marginTop: "10px" }}>
              <img src={formData.category_icon_url} alt="Category Icon" style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover", border: "1px solid #ddd" }} />
              <p style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>Current Icon</p>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
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
              value={formData.category_order}
              onChange={handleChange}
              style={{ border: "1px solid #ddd", marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Sort Order</label>
            <input
              className="auth-input"
              name="sort_order"
              placeholder="e.g. 5"
              value={formData.sort_order}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <textarea
          className="auth-input"
          name="work_includes"
          placeholder="Work Includes"
          value={formData.work_includes}
          onChange={handleChange}
          rows={6}
          style={{ resize: "vertical", minHeight: "120px" }}
        />

        <textarea
          className="auth-input"
          name="work_not_included"
          placeholder="Work Not Included"
          value={formData.work_not_included}
          onChange={handleChange}
          rows={6}
          style={{ resize: "vertical", minHeight: "120px" }}
        />

        <input
          className="auth-input"
          name="description"
          placeholder="Service Description"
          value={formData.description}
          onChange={handleChange}
        />

        <ServiceHowItWorksVideos serviceId={id} />

        {/* Addons Section */}
        <div style={{ marginTop: "30px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
          <h3 style={{ marginBottom: "20px", color: "#333", fontSize: "1.2rem" }}>Addons Management</h3>
          {addons.length > 0 ? (
            addons.map((addon, index) => (
              <div key={addon.id} style={{ marginBottom: "25px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <div style={{ marginBottom: "10px", fontWeight: "600", color: "#555" }}>Addon</div>
                
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Title</label>
                <input
                  className="auth-input"
                  name="title"
                  placeholder="Addon Title"
                  value={addon.title}
                  onChange={(e) => handleAddonChange(index, e)}
                  style={{ marginBottom: "12px" }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Price</label>
                    <input
                      className="auth-input"
                      name="price"
                      placeholder="Price"
                      value={addon.price}
                      onChange={(e) => handleAddonChange(index, e)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Duration</label>
                    <input
                      className="auth-input"
                      name="duration"
                      placeholder="Duration"
                      value={addon.duration}
                      onChange={(e) => handleAddonChange(index, e)}
                    />
                  </div>
                </div>

                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px", marginTop: "12px" }}>Is Active</label>
                <select
                  className="auth-input"
                  name="is_active"
                  value={addon.is_active}
                  onChange={(e) => handleAddonChange(index, e)}
                  style={{ padding: "12px" }}
                >
                  <option value="TRUE">TRUE</option>
                  <option value="FALSE">FALSE</option>
                </select>
              </div>
            ))
          ) : (
            <p style={{ color: "#888", textAlign: "center", fontStyle: "italic" }}>
              No addons found for "{formData.service_type || 'no category'}"
            </p>
          )}
        </div>

        {/* ✅ Button Changes Here */}
        {!updated ? (
          <button className="auth-button" onClick={updateService}>
            Update Service
          </button>
        ) : (
          <button
            className="auth-button"
            onClick={() => navigate("/dashboard")}
          >
            Back
          </button>
        )}
      </div>

      {/* ✅ Custom Alert */}
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

            <h3>Success</h3>
            <p>Service updated successfully</p>

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

export default EditService;
