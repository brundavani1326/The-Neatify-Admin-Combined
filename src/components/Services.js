import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import AddService from "./AddService";
import AddOn from "./AddOn";
import AddMainCategory from "./AddMainCategory";
import Loader from "./Loader";

function Services() {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("ALL");
  const [mainCategories, setMainCategories] = useState([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("ALL");
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("servicesActiveTab") || "list";
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [isAddOnMode, setIsAddOnMode] = useState(false);

  const navigate = useNavigate();

  // ===========================
  // FETCH SERVICES OR ADD-ONS
  // ===========================
  const fetchServices = useCallback(async () => {
    setLoading(true);

    try {
      if (selectedType === "ADD ON") {
        setIsAddOnMode(true);

        const { data } = await supabase
          .from("add_ons")
          .select("*")
          .order("sort_order", { ascending: true });

        setServices(data || []);
      } else {
        setIsAddOnMode(false);

        let query = supabase
          .from("services")
          .select("*")
          .order("sort_order", { ascending: true });

        if (selectedType !== "ALL") {
          query = query.eq("service_type", selectedType);
        }

        if (selectedMainCategory !== "ALL") {
          query = query.eq("main_category_id", selectedMainCategory);
        }

        const { data } = await query;
        setServices(data || []);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }, [selectedType, selectedMainCategory]);

  // ===========================
  // FETCH SERVICE TYPES
  // ===========================
  const fetchServiceTypes = useCallback(async () => {
    // Fetch unique service types ordered by category_order then sort_order
    let query = supabase.from("services")
      .select("service_type, category_order, sort_order")
      .order("category_order", { ascending: true })
      .order("sort_order", { ascending: true });
    
    if (selectedMainCategory !== "ALL") {
      query = query.eq("main_category_id", selectedMainCategory);
    }

    const { data } = await query;

    const uniqueTypes = [
      "ALL",
      "NONE",
      ...new Set((data || []).map((d) => d.service_type)),
      "ADD ON",
    ];

    setServiceTypes(uniqueTypes);
  }, [selectedMainCategory]);

  const fetchMainCategories = async () => {
    const { data } = await supabase
      .from("main_categories")
      .select("id, name, icon_url, sort_order")
      .order("sort_order", { ascending: true });
    
    setMainCategories(data || []);
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchServiceTypes();
    // Reset the sub-category filter when main category changes
    setSelectedType("ALL");
  }, [fetchServiceTypes]);

  useEffect(() => {
    fetchMainCategories();
  }, []);

  // REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    const channels = [
      supabase.channel("services-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "services" }, async () => {
          setIsSyncing(true);
          await fetchServices();
          await fetchServiceTypes();
          setIsSyncing(false);
        }).subscribe(),

      supabase.channel("addons-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "add_ons" }, async () => {
          setIsSyncing(true);
          await fetchServices();
          setIsSyncing(false);
        }).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchServices]);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("servicesActiveTab", activeTab);
  }, [activeTab]);

  // ===========================
  // DELETE
  // ===========================
  const deleteService = (id) => {
    setDeleteId(id);
    setDeleteType(isAddOnMode ? "addon" : "service");
    setShowAlert(true);
  };

  const deleteMainCategory = (id) => {
    setDeleteId(id);
    setDeleteType("main_category");
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === "main_category") {
        const { error } = await supabase
          .from("main_categories")
          .delete()
          .eq("id", deleteId);
        if (error) {
          console.error("Error deleting main category:", error);
          alert(error.message); // Inform the user in case of foreign key constraint errors
        } else {
          if (selectedMainCategory === deleteId) {
            setSelectedMainCategory("ALL");
            setSelectedType("ALL");
          }
          fetchMainCategories();
        }
      } else if (deleteType === "addon") {
        const { error } = await supabase
          .from("add_ons")
          .delete()
          .eq("id", deleteId);
        if (error) console.error("Error deleting addon:", error);
        fetchServices();
      } else {
        const { error } = await supabase
          .from("services")
          .delete()
          .eq("id", deleteId);
        if (error) console.error("Error deleting service:", error);
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    }

    setShowAlert(false);
    setDeleteId(null);
    setDeleteType(null);
  };

  const clearFilters = () => {
    setSelectedMainCategory("ALL");
    setSelectedType("ALL");
  };

  if (loading) return <Loader />;

  return (
    <div className="services-wrapper">
      {/* ===== HEADER ROW (TABS + FILTERS) ===== */}
      <div className="services-header-row" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "35px",
        borderBottom: "1px solid #f1f5f9",
        paddingBottom: "8px"
      }}>
        {/* SUB TABS (Segmented Pill Style) */}
        <div className="sub-tabs-container" style={{ 
          display: "flex", 
          gap: "10px", 
          background: "#f8fafc", 
          padding: "5px", 
          borderRadius: "14px",
          border: "1px solid #f1f5f9",
          marginLeft: "20px" 
        }}>
          {[
            { id: "list", label: "All Services" },
            { id: "add", label: "Add Service" },
            { id: "addon", label: "Add On" },
            { id: "main_category", label: "Main Category" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#000000";
                  e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.background = "transparent";
                }
              }}
              style={{
                background: activeTab === tab.id ? "#facc15" : "transparent",
                border: "none",
                padding: "8px 20px",
                fontSize: "12px",
                fontWeight: "800",
                fontFamily: "inherit",
                color: activeTab === tab.id ? "#000000" : "#64748b",
                borderRadius: "10px",
                cursor: "pointer",
                position: "relative",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                boxShadow: activeTab === tab.id 
                  ? "0 4px 12px rgba(0,0,0,0.12), 0 0 10px rgba(255, 215, 0, 0.1)" 
                  : "none",
                transform: activeTab === tab.id ? "translateY(-1px)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {tab.label}

            </button>
          ))}
        </div>

        {/* FILTERS (ONLY IN LIST VIEW) */}
        {activeTab === "list" && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="allot-btn"
              style={{ 
                margin: 0, 
                padding: "8px 20px", 
                height: "auto",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700"
              }}
              onClick={clearFilters}
            >
              Clear Filter
            </button>
            <select
              className="service-filter"
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value)}
              style={{ 
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: "#f8fafc",
                width: "160px"
              }}
            >
              <option value="ALL">ALL CATEGORIES</option>
              {mainCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              className="service-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ 
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: "#f8fafc",
                width: "140px"
              }}
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ===== LIST VIEW ===== */}
      {activeTab === "list" && (
        <div className="services-grid">
          {/* Main Category Card (Prepend if filtered) */}
          {selectedMainCategory !== "ALL" && (selectedType === "ALL" || selectedType === "NONE") && (
            <div className="service-card main-category-special">
              {mainCategories.find(c => c.id === selectedMainCategory)?.icon_url ? (
                <img 
                  src={mainCategories.find(c => c.id === selectedMainCategory).icon_url} 
                  alt="Category" 
                  style={{ borderBottom: "4px solid #ffd700" }} 
                />
              ) : (
                <div style={{ height: "180px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "50px" }}>📁</span>
                </div>
              )}
              <div className="service-card-content">
                <p style={{ color: "#ffd700", fontWeight: "800", fontSize: "10px", textTransform: "uppercase", marginBottom: "4px" }}>
                  Category Management
                </p>
                <h3>{mainCategories.find(c => c.id === selectedMainCategory)?.name}</h3>
                <p>Role: Main Category</p>
                <p>Priority: {mainCategories.find(c => c.id === selectedMainCategory)?.sort_order}</p>
              </div>
              <div className="service-card-actions">
                <button
                  className="edit-btn"
                  onClick={() => deleteMainCategory(selectedMainCategory)}
                >
                  Delete
                </button>
                <button
                  className="edit-btn"
                  onClick={() => navigate(`/edit-main-category/${selectedMainCategory}`)}
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {services.map((service) => (
            <div key={service.id} className="service-card">
              <img src={service.image} alt={service.title} />

              <div className="service-card-content">
                <h3>{service.title}</h3>

                {!isAddOnMode && (
                  <p>Category: {service.service_type}</p>
                )}

                <p>Duration: {service.duration}</p>

                {service.max_quantity && (
                  <p>Max Quantity: {service.max_quantity}</p>
                )}

                <div className="price-container">
                  {service.original_price && (
                    <span className="original-price">
                      {String(service.original_price).includes("₹")
                        ? service.original_price
                        : `₹${service.original_price}`}
                    </span>
                  )}
                  <span className="price">
                    {String(service.price).includes("₹")
                      ? service.price
                      : `₹${service.price}`}
                  </span>
                </div>

                {service.discount_label && (
                  <p className="discount-label">{service.discount_label}</p>
                )}

                {!isAddOnMode && (
                  <p style={{ marginTop: "4px", fontSize: "13px", color: "#dc2626", fontWeight: "600" }}>
                    Cancellation Fee: ₹{
                      service.cancellation_fee !== null && service.cancellation_fee !== undefined
                        ? service.cancellation_fee
                        : (Number(String(service.price || "").replace(/[^0-9]/g, '')) >= 2000 || /deep/i.test(service.title || "") || /deep/i.test(service.service_type || ""))
                          ? 299
                          : 99
                    }
                  </p>
                )}
              </div>

              <div className="service-card-actions">
                <button
                  className="edit-btn"
                  onClick={() => deleteService(service.id)}
                >
                  Delete
                </button>

                <button
                  className="edit-btn"
                  onClick={() =>
                    isAddOnMode
                      ? navigate(`/edit-addon/${service.id}`)
                      : navigate(`/edit-service/${service.id}`)
                  }
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ADD SERVICE ===== */}
      {activeTab === "add" && (
        <AddService 
          onSuccess={() => setActiveTab("list")} 
          onBack={() => setActiveTab("list")}
        />
      )}

      {/* ===== ADD ON ===== */}
      {activeTab === "addon" && (
        <AddOn 
          onSuccess={() => setActiveTab("list")} 
          onBack={() => setActiveTab("list")}
        />
      )}

      {/* ===== ADD MAIN CATEGORY ===== */}
      {activeTab === "main_category" && (
        <AddMainCategory 
          onSuccess={() => {
            setActiveTab("list");
            fetchMainCategories();
          }} 
          onBack={() => setActiveTab("list")}
        />
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {showAlert && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => setShowAlert(false)}
            >
              ✕
            </span>
            <h3 className="modal-title">Confirm</h3>
            <p style={{ textAlign: "center", fontWeight: deleteType === "main_category" ? "bold" : "normal", color: deleteType === "main_category" ? "#ef4444" : "inherit" }}>
              {deleteType === "main_category"
                ? "Are you sure? This will permanently delete this Main Category AND all the services inside it!"
                : "Are you sure you want to delete this item?"}
            </p>

            <button
              className="auth-button"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={confirmDelete}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* SYNC LOADER */}
      {isSyncing && <Loader />}
    </div>
  );
}

export default Services;
