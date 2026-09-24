import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

function CategoryHubCounts() {
  const [activeSubTab, setActiveSubTab] = useState("hub_locations");

  // ===== STATE FOR SUB-TAB 1: HUB LOCATIONS =====
  const [hubsList, setHubsList] = useState([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [savingHub, setSavingHub] = useState(false);
  const [editingHubId, setEditingHubId] = useState(null);

  const [inputHubName, setInputHubName] = useState("");
  const [inputLocationName, setInputLocationName] = useState("");
  const [inputPincode, setInputPincode] = useState("");
  const [inputIsActive, setInputIsActive] = useState(true);
  const [hubSearchTerm, setHubSearchTerm] = useState("");

  // ===== STATE FOR SUB-TAB 2: CATEGORY COUNTS =====
  const [categories, setCategories] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [savingCountRecord, setSavingCountRecord] = useState(false);
  const [editingCountId, setEditingCountId] = useState(null);

  // Selected Hub Group (Grouped by Hub Name containing all locations)
  const [selectedHubGroup, setSelectedHubGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [countValue, setCountValue] = useState("");
  const [selectedStaffEmails, setSelectedStaffEmails] = useState([]);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [groupedHubSearchTerm, setGroupedHubSearchTerm] = useState("");

  // Modal notification & delete confirm state
  const [modalMessage, setModalMessage] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const staffDropdownRef = useRef(null);

  const triggerModal = (title, message) => {
    setModalMessage({ title, message });
  };

  useEffect(() => {
    fetchHubsAndLocations();
    fetchCategories();
    fetchStaff();
    fetchRecords();
  }, []);

  // Close staff dropdown when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target)) {
        setIsStaffDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ===== FETCH FUNCTIONS =====

  // 1. Fetch Hubs & Locations from hub_locations table
  const fetchHubsAndLocations = async () => {
    setLoadingHubs(true);
    try {
      const { data, error } = await supabase
        .from("hub_locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Notice: hub_locations table error or not created yet:", error.message);
        setHubsList([]);
      } else if (data) {
        setHubsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch hubs and locations:", err);
      setHubsList([]);
    } finally {
      setLoadingHubs(false);
    }
  };

  // 2. Fetch unique categories from services table
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("service_type");

      if (error) {
        console.error("Error fetching service categories:", error);
        return;
      }

      if (data) {
        const uniqueTypes = [
          ...new Set(
            data
              .map((item) => item.service_type?.trim())
              .filter(Boolean)
          ),
        ].sort();
        setCategories(uniqueTypes);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // 3. Fetch staff and partner profiles
  const fetchStaff = async () => {
    try {
      let combined = [];
      const { data: staffData } = await supabase.from("staff_profile").select("*");
      if (staffData && staffData.length > 0) {
        combined = [...staffData];
      }
      const { data: profilesData } = await supabase.from("profiles").select("*");
      if (profilesData && profilesData.length > 0) {
        profilesData.forEach((p) => {
          const email = p.email || p.staff_email || p.user_email;
          if (email && !combined.some((c) => (c.email || c.staff_email || c.user_email) === email)) {
            combined.push(p);
          }
        });
      }
      setStaffList(combined);
    } catch (err) {
      console.error("Failed to fetch staff/partner profiles:", err);
    }
  };

  // 4. Fetch saved records from hub_category_counts table
  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from("hub_category_counts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Notice: hub_category_counts table error or not created yet:", error.message);
        setRecords([]);
      } else if (data) {
        setRecords(data);
      }
    } catch (err) {
      console.error("Failed to fetch count records:", err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // ===== HANDLERS FOR SUB-TAB 1: HUB LOCATIONS =====

  const handleSaveHubLocation = async (e) => {
    e.preventDefault();

    if (!inputHubName.trim()) {
      triggerModal("Required Field", "Please enter a Hub Name.");
      return;
    }

    if (!inputLocationName.trim()) {
      triggerModal("Required Field", "Please enter a Location / Area.");
      return;
    }

    if (!inputPincode.trim()) {
      triggerModal("Required Field", "Please enter a Pincode.");
      return;
    }

    setSavingHub(true);

    try {
      if (editingHubId) {
        const { error } = await supabase
          .from("hub_locations")
          .update({
            hub_name: inputHubName.trim(),
            location_name: inputLocationName.trim(),
            pincode: inputPincode.trim(),
            is_active: inputIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingHubId);

        if (error) {
          triggerModal("Error Saving", error.message || "Failed to update Hub Location.");
        } else {
          triggerModal("Success", "Hub Location updated successfully.");
          resetHubForm();
          fetchHubsAndLocations();
        }
      } else {
        const { error } = await supabase.from("hub_locations").insert([
          {
            hub_name: inputHubName.trim(),
            location_name: inputLocationName.trim(),
            pincode: inputPincode.trim(),
            is_active: inputIsActive,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) {
          triggerModal(
            "Database Notice",
            error.message || "Failed to save Hub Location. Ensure 'hub_locations' table exists in Supabase."
          );
        } else {
          triggerModal("Success", "Hub Location saved successfully!");
          resetHubForm();
          fetchHubsAndLocations();
        }
      }
    } catch (err) {
      console.error("Hub save error:", err);
      triggerModal("Error", "An unexpected error occurred while saving.");
    } finally {
      setSavingHub(false);
    }
  };

  const handleEditHub = (item) => {
    setEditingHubId(item.id);
    setInputHubName(item.hub_name || item.hub || "");
    setInputLocationName(item.location_name || item.location || "");
    setInputPincode(item.pincode || "");
    setInputIsActive(item.is_active !== undefined ? Boolean(item.is_active) : true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const promptDeleteHub = (id) => {
    setDeleteConfirmItem({
      id,
      type: "hub",
      title: "Delete Hub Location",
      message: "Are you sure you want to delete this Hub Location?",
    });
  };

  const confirmDeleteHub = async (id) => {
    setDeleteConfirmItem(null);
    try {
      const { error } = await supabase
        .from("hub_locations")
        .delete()
        .eq("id", id);

      if (error) {
        triggerModal("Delete Error", error.message || "Failed to delete Hub Location.");
      } else {
        triggerModal("Deleted", "Hub Location deleted successfully.");
        fetchHubsAndLocations();
      }
    } catch (err) {
      console.error("Delete error:", err);
      triggerModal("Error", "Failed to delete Hub Location.");
    }
  };

  const resetHubForm = () => {
    setEditingHubId(null);
    setInputHubName("");
    setInputLocationName("");
    setInputPincode("");
    setInputIsActive(true);
  };

  // ===== HANDLERS FOR SUB-TAB 2: CATEGORY HUB COUNTS =====

  const handleOpenAddCountFormForHubGroup = (hubGroup) => {
    setSelectedHubGroup(hubGroup);
    setEditingCountId(null);
    setSelectedCategory("");
    setCountValue("");
    setSelectedStaffEmails([]);
    setIsStaffDropdownOpen(false);
    setStaffSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCountChange = (val) => {
    setCountValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedStaffEmails((prev) => prev.slice(0, num));
    } else {
      setSelectedStaffEmails([]);
    }
  };

  const toggleStaffEmail = (email) => {
    const countNum = parseInt(countValue, 10) || 0;
    if (selectedStaffEmails.includes(email)) {
      setSelectedStaffEmails((prev) => prev.filter((e) => e !== email));
    } else {
      if (selectedStaffEmails.length < countNum) {
        setSelectedStaffEmails((prev) => [...prev, email]);
      }
    }
  };

  const handleSaveCountRecord = async (e) => {
    e.preventDefault();

    if (!selectedHubGroup) {
      triggerModal("Select Hub", "Please select a Hub first by clicking '+ Add Category Count'.");
      return;
    }

    if (!selectedCategory) {
      triggerModal("Required Field", "Please select a Category.");
      return;
    }

    if (countValue === "" || isNaN(countValue) || Number(countValue) <= 0) {
      triggerModal("Invalid Count", "Please enter a valid positive Count number.");
      return;
    }

    const countNum = parseInt(countValue, 10);

    // Validate that exactly countNum staff members are selected
    if (selectedStaffEmails.length !== countNum) {
      triggerModal(
        "Staff Selection Required",
        `Please select exactly ${countNum} staff/partner member(s). (Currently selected: ${selectedStaffEmails.length})`
      );
      return;
    }

    setSavingCountRecord(true);
    const hubName = selectedHubGroup.hub_name;
    const locationString =
      selectedHubGroup.locations && selectedHubGroup.locations.length > 0
        ? selectedHubGroup.locations.join(", ")
        : "General Area";
    const staffString = selectedStaffEmails.filter(Boolean).join(", ");

    try {
      if (editingCountId) {
        const { error } = await supabase
          .from("hub_category_counts")
          .update({
            hub: hubName,
            location: locationString,
            category: selectedCategory,
            count: countNum,
            assigned_staff: staffString,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCountId);

        if (error) {
          triggerModal("Error Saving", error.message || "Failed to update record in Supabase.");
        } else {
          triggerModal("Success", "Category Count record updated successfully.");
          resetCountForm();
          fetchRecords();
        }
      } else {
        const singleRecord = {
          hub: hubName,
          location: locationString,
          category: selectedCategory,
          count: countNum,
          assigned_staff: staffString,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("hub_category_counts").insert([singleRecord]);

        if (error) {
          triggerModal(
            "Notice",
            error.message || "Could not save to Supabase table. Ensure 'hub_category_counts' table exists."
          );
        } else {
          triggerModal(
            "Success",
            `Saved Category, Count & Staff for ${hubName} successfully!`
          );
          resetCountForm();
          fetchRecords();
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      triggerModal("Error", "An unexpected error occurred while saving.");
    } finally {
      setSavingCountRecord(false);
    }
  };

  const handleEditCountRecord = (record) => {
    setEditingCountId(record.id);
    setSelectedHubGroup({
      hub_name: record.hub,
      locations: record.location ? record.location.split(",").map((l) => l.trim()) : ["General Area"],
    });
    setSelectedCategory(record.category || "");
    const countVal = record.count !== undefined ? String(record.count) : "";
    setCountValue(countVal);

    const staffStr = record.staff || record.assigned_staff || record.staff_emails || "";
    if (staffStr) {
      setSelectedStaffEmails(staffStr.split(",").map((s) => s.trim()));
    } else {
      setSelectedStaffEmails([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const promptDeleteCountRecord = (id) => {
    setDeleteConfirmItem({
      id,
      type: "count",
      title: "Delete Category Count",
      message: "Are you sure you want to delete this Category Count record?",
    });
  };

  const confirmDeleteCountRecord = async (id) => {
    setDeleteConfirmItem(null);
    try {
      const { error } = await supabase
        .from("hub_category_counts")
        .delete()
        .eq("id", id);

      if (error) {
        triggerModal("Delete Error", error.message || "Failed to delete record.");
      } else {
        triggerModal("Deleted", "Record deleted successfully.");
        fetchRecords();
      }
    } catch (err) {
      console.error("Delete error:", err);
      triggerModal("Error", "Failed to delete record.");
    }
  };

  const resetCountForm = () => {
    setSelectedHubGroup(null);
    setEditingCountId(null);
    setSelectedCategory("");
    setCountValue("");
    setSelectedStaffEmails([]);
    setIsStaffDropdownOpen(false);
    setStaffSearchQuery("");
  };

  // ===== COMPUTED GROUPS & PERMISSIONS =====

  // Group hubsList by Hub Name
  const groupedHubs = React.useMemo(() => {
    const map = {};
    hubsList.forEach((item) => {
      const name = item.hub_name || item.hub || "Main Hub";
      if (!map[name]) {
        map[name] = {
          hub_name: name,
          locations: [],
        };
      }
      const loc = item.location_name || item.location;
      if (loc && !map[name].locations.includes(loc)) {
        map[name].locations.push(loc);
      }
    });
    return Object.values(map);
  }, [hubsList]);

  // Categories already configured for the currently selected Hub
  const alreadyAddedCategories = React.useMemo(() => {
    if (!selectedHubGroup || !selectedHubGroup.hub_name) return [];
    return records
      .filter((r) => r.hub === selectedHubGroup.hub_name && r.id !== editingCountId)
      .map((r) => r.category);
  }, [selectedHubGroup, records, editingCountId]);

  // Map staff email to their current hub & category assignments for clear visual display
  const staffAssignmentsMap = React.useMemo(() => {
    const map = {};
    records
      .filter((r) => r.id !== editingCountId)
      .forEach((r) => {
        const staffStr = r.assigned_staff || r.staff || r.staff_emails || "";
        const hubCatInfo = `${r.hub || "Hub"} (${r.category || "General"})`;
        if (staffStr) {
          staffStr.split(",").forEach((email) => {
            const trimmed = email.trim();
            if (trimmed) {
              if (!map[trimmed]) map[trimmed] = [];
              if (!map[trimmed].includes(hubCatInfo)) {
                map[trimmed].push(hubCatInfo);
              }
            }
          });
        }
      });
    return map;
  }, [records, editingCountId]);

  // Filter staff list based on search query in dropdown (all staff members are available across multiple hubs)
  const filteredStaffList = React.useMemo(() => {
    return staffList.filter((stf) => {
      const stfEmail = stf.email || stf.staff_email || stf.user_email || stf.name || "";
      if (!stfEmail) return false;
      if (!staffSearchQuery.trim()) return true;
      const query = staffSearchQuery.toLowerCase().trim();
      const name = (stf.name || stf.full_name || "").toLowerCase();
      const email = stfEmail.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [staffList, staffSearchQuery]);

  // Filtered Hubs for Sub-Tab 1 (individual table)
  const filteredHubs = hubsList.filter(
    (item) =>
      (item.hub_name || item.hub || "").toLowerCase().includes(hubSearchTerm.toLowerCase()) ||
      (item.location_name || item.location || "").toLowerCase().includes(hubSearchTerm.toLowerCase()) ||
      (item.pincode || "").toLowerCase().includes(hubSearchTerm.toLowerCase()) ||
      (item.is_active !== false ? "active true" : "inactive false").includes(hubSearchTerm.toLowerCase())
  );

  // Filtered Grouped Hubs for Sub-Tab 2 (grouped by Hub Name table)
  const filteredGroupedHubs = groupedHubs.filter(
    (group) =>
      group.hub_name.toLowerCase().includes(groupedHubSearchTerm.toLowerCase()) ||
      group.locations.some((loc) => loc.toLowerCase().includes(groupedHubSearchTerm.toLowerCase()))
  );

  // Filtered Saved Records for Sub-Tab 2
  const filteredRecords = records.filter(
    (r) =>
      (r.category || "").toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      (r.hub || "").toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      (r.location || "").toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      (r.staff || r.assigned_staff || "").toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ===== SUB-TABS ROW (Left-Aligned Segmented Pill Style - Image 2 Format) ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "30px",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "12px",
        }}
      >
        <div
          className="sub-tabs-container"
          style={{
            display: "flex",
            gap: "10px",
            background: "#f8fafc",
            padding: "5px",
            borderRadius: "14px",
            border: "1px solid #f1f5f9",
          }}
        >
          {[
            { id: "hub_locations", label: "ADD HUB LOCATIONS" },
            { id: "category_counts", label: "CATEGORY HUB COUNTS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                background: activeSubTab === tab.id ? "#facc15" : "transparent",
                border: "none",
                padding: "8px 20px",
                fontSize: "12px",
                fontWeight: "800",
                fontFamily: "inherit",
                borderRadius: "10px",
                cursor: "pointer",
                color: activeSubTab === tab.id ? "#000000" : "#64748b",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ===== SUB-TAB 1: ADD HUB LOCATIONS ===== */}
      {/* ========================================================= */}
      {activeSubTab === "hub_locations" && (
        <>
          {/* Form Card for Hub Location */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "20px" }}>
              {editingHubId ? "Edit Hub Location" : "Add New Hub Location"}
            </h3>

            <form onSubmit={handleSaveHubLocation}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "20px",
                  marginBottom: "20px",
                }}
              >
                {/* Hub Name Input */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Hub Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hub 1 - Gachibowli, Hub 2 - Nallagandla"
                    value={inputHubName}
                    onChange={(e) => setInputHubName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Location / Area Input */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Location / Area <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, HSR Layout"
                    value={inputLocationName}
                    onChange={(e) => setInputLocationName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Pincode Input */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Pincode <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500032"
                    value={inputPincode}
                    onChange={(e) => setInputPincode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Status / Is Active Select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Status (Is Active) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={inputIsActive ? "true" : "false"}
                    onChange={(e) => setInputIsActive(e.target.value === "true")}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                      outline: "none",
                    }}
                  >
                    <option value="true">Active (TRUE)</option>
                    <option value="false">Inactive (FALSE)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="submit"
                  disabled={savingHub}
                  style={{
                    backgroundColor: "#facc15",
                    color: "#000000",
                    fontWeight: "700",
                    fontSize: "14px",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: savingHub ? "not-allowed" : "pointer",
                    opacity: savingHub ? 0.7 : 1,
                  }}
                >
                  {savingHub ? "Saving..." : editingHubId ? "Update Hub Location" : "Save Hub Location"}
                </button>

                {editingHubId && (
                  <button
                    type="button"
                    onClick={resetHubForm}
                    style={{
                      backgroundColor: "transparent",
                      color: "#64748b",
                      fontWeight: "600",
                      fontSize: "14px",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table Card for Stored Hub Locations */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                Configured Hub Locations ({filteredHubs.length})
              </h3>

              <input
                type="text"
                placeholder="Search Hub, Location, or Pincode..."
                value={hubSearchTerm}
                onChange={(e) => setHubSearchTerm(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  width: "260px",
                  outline: "none",
                }}
              />
            </div>

            {loadingHubs ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Loading Hub Locations...
              </div>
            ) : filteredHubs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No Hub Locations found. Use the form above to add Hub Locations.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Hub Name
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Location / Area
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Pincode
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Status (Is Active)
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569", textAlign: "center" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHubs.map((item) => (
                      <tr key={item.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px", fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                          {item.hub_name || item.hub}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#334155", fontSize: "14px" }}>
                          {item.location_name || item.location}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>
                          {item.pincode || "-"}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: "600" }}>
                          <span
                            style={{
                              backgroundColor: item.is_active !== false ? "#dcfce7" : "#f1f5f9",
                              color: item.is_active !== false ? "#166534" : "#64748b",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: item.is_active !== false ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            {item.is_active !== false ? "Active (TRUE)" : "Inactive (FALSE)"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditHub(item)}
                              style={{
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => promptDeleteHub(item.id)}
                              style={{
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* ===== SUB-TAB 2: CATEGORY HUB COUNTS ===== */}
      {/* ========================================================= */}
      {activeSubTab === "category_counts" && (
        <>
          {/* Active Add / Edit Count Form */}
          {selectedHubGroup && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "32px",
                boxShadow: "0 4px 12px rgba(250, 204, 21, 0.15), 0 2px 4px rgba(0,0,0,0.05)",
                border: "2px solid #facc15",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                  {editingCountId ? "Edit Category Count & Staff" : "Add Category & Count for Selected Hub"}
                </h3>

                <button
                  onClick={resetCountForm}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "18px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                  title="Close form"
                >
                  ✕
                </button>
              </div>

              {/* Selected Hub & Locations Details Badge */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    HUB:
                  </span>{" "}
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginLeft: "4px" }}>
                    {selectedHubGroup.hub_name}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    LOCATIONS ({selectedHubGroup.locations?.length || 0}):
                  </span>{" "}
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginLeft: "4px" }}>
                    {selectedHubGroup.locations?.join(", ") || "All Locations"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveCountRecord}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  {/* Category Dropdown */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "8px",
                      }}
                    >
                      Category <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        color: "#0f172a",
                        backgroundColor: "#ffffff",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((cat, idx) => {
                        const isAlreadyAdded = alreadyAddedCategories.includes(cat);
                        return (
                          <option key={idx} value={cat} disabled={isAlreadyAdded}>
                            {cat} {isAlreadyAdded ? "(Already Selected)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Count Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "8px",
                      }}
                    >
                      Count <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter Count Number"
                      value={countValue}
                      onChange={(e) => handleCountChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Staff / Partner Selection Field (Single Multi-Select Dropdown) */}
                <div
                  ref={staffDropdownRef}
                  style={{
                    marginBottom: "20px",
                    position: "relative",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Select Staff / Partner Email(s) <span style={{ color: "#ef4444" }}>*</span>
                    {countValue && (
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "normal", marginLeft: "6px" }}>
                        (Select max {countValue} staff/partner member{Number(countValue) > 1 ? "s" : ""})
                      </span>
                    )}
                  </label>

                  {/* Single Selection Control Box */}
                  <div
                    onClick={() => {
                      if (!countValue || parseInt(countValue, 10) <= 0) {
                        triggerModal("Enter Count", "Please enter a Count number first.");
                        return;
                      }
                      setIsStaffDropdownOpen(!isStaffDropdownOpen);
                    }}
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "6px",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                  >
                    {selectedStaffEmails.length === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                        {countValue && parseInt(countValue, 10) > 0
                          ? `-- Click to Select Staff / Partner Email(s) (Max ${countValue}) --`
                          : "-- Enter Count first to select staff --"}
                      </span>
                    ) : (
                      selectedStaffEmails.map((email) => (
                        <span
                          key={email}
                          style={{
                            backgroundColor: "#fef9c3",
                            color: "#854d0e",
                            border: "1px solid #fde047",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {email}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStaffEmail(email);
                            }}
                            style={{ cursor: "pointer", fontWeight: "700", marginLeft: "2px" }}
                            title="Remove staff"
                          >
                            ✕
                          </span>
                        </span>
                      ))
                    )}

                    <span
                      style={{
                        marginLeft: "auto",
                        color: "#64748b",
                        fontSize: "12px",
                        pointerEvents: "none",
                      }}
                    >
                      {isStaffDropdownOpen ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Dropdown Options List */}
                  {isStaffDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                        zIndex: 99,
                      }}
                    >
                      {/* Search Bar inside Staff Dropdown */}
                      <div
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Search staff/partner by name or email..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            fontSize: "13px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {filteredStaffList.length === 0 ? (
                        <div style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                          {staffSearchQuery.trim()
                            ? "No matching staff or partner found."
                            : "No staff or partner profiles found."}
                        </div>
                      ) : (
                        filteredStaffList.map((stf, sIdx) => {
                          const stfEmail = stf.email || stf.staff_email || stf.user_email || stf.name || "";
                          if (!stfEmail) return null;

                          const isSelected = selectedStaffEmails.includes(stfEmail);
                          const countNum = parseInt(countValue, 10) || 0;
                          const isLimitReached = !isSelected && selectedStaffEmails.length >= countNum;
                          const existingAssignments = staffAssignmentsMap[stfEmail] || [];

                          return (
                            <div
                              key={sIdx}
                              onClick={() => {
                                if (!isLimitReached) {
                                  toggleStaffEmail(stfEmail);
                                }
                              }}
                              style={{
                                padding: "10px 14px",
                                fontSize: "14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: isLimitReached ? "not-allowed" : "pointer",
                                backgroundColor: isSelected ? "#fefce8" : "#ffffff",
                                opacity: isLimitReached ? 0.55 : 1,
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div>
                                  <span style={{ fontWeight: isSelected ? "700" : "500", color: "#0f172a" }}>
                                    {stf.name || stf.full_name
                                      ? `${stf.name || stf.full_name} (${stfEmail})`
                                      : stfEmail}
                                  </span>
                                  {isLimitReached && (
                                    <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
                                      (Limit of {countNum} reached)
                                    </span>
                                  )}
                                </div>
                                {existingAssignments.length > 0 && (
                                  <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "500" }}>
                                    Assigned: {existingAssignments.join(", ")}
                                  </span>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isLimitReached}
                                readOnly
                                style={{ cursor: isLimitReached ? "not-allowed" : "pointer" }}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="submit"
                    disabled={savingCountRecord}
                    style={{
                      backgroundColor: "#facc15",
                      color: "#000000",
                      fontWeight: "700",
                      fontSize: "14px",
                      padding: "10px 24px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: savingCountRecord ? "not-allowed" : "pointer",
                      opacity: savingCountRecord ? 0.7 : 1,
                    }}
                  >
                    {savingCountRecord ? "Saving..." : editingCountId ? "Update Record" : "Save Record"}
                  </button>

                  <button
                    type="button"
                    onClick={resetCountForm}
                    style={{
                      backgroundColor: "transparent",
                      color: "#64748b",
                      fontWeight: "600",
                      fontSize: "14px",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grouped Hubs List Table */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                  Hubs List ({filteredGroupedHubs.length})
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  Click <b>"+ Add Category Count"</b> on a Hub to set categories, counts, and staff for all its locations.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search Hub Name or Location..."
                value={groupedHubSearchTerm}
                onChange={(e) => setGroupedHubSearchTerm(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  width: "250px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                      Hub Name
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                      Locations Covered
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569", textAlign: "center" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedHubs.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                        No Hubs found. Add Hub Locations under <b>"ADD HUB LOCATIONS"</b> tab first.
                      </td>
                    </tr>
                  ) : (
                    filteredGroupedHubs.map((group, index) => {
                      const isSelected =
                        selectedHubGroup && selectedHubGroup.hub_name === group.hub_name;

                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: isSelected ? "#fefce8" : "transparent",
                          }}
                        >
                          <td style={{ padding: "14px 16px", fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                            {group.hub_name}
                          </td>
                          <td style={{ padding: "14px 16px", color: "#334155", fontSize: "13px" }}>
                            <span style={{ fontWeight: "700", color: "#475569" }}>
                              {group.locations.length} Location(s):
                            </span>{" "}
                            {group.locations.slice(0, 4).join(", ")}
                            {group.locations.length > 4 && ` ... +${group.locations.length - 4} more`}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <button
                              onClick={() => handleOpenAddCountFormForHubGroup(group)}
                              style={{
                                backgroundColor: isSelected ? "#eab308" : "#facc15",
                                color: "#000000",
                                border: "none",
                                borderRadius: "6px",
                                padding: "7px 16px",
                                fontSize: "13px",
                                fontWeight: "700",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {isSelected ? "Currently Selected" : "+ Add Category Count"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configured Category & Hub Counts Table */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                Saved Category & Hub Counts ({filteredRecords.length})
              </h3>

              <input
                type="text"
                placeholder="Search Category, Hub, Location, or Staff..."
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  width: "280px",
                  outline: "none",
                }}
              />
            </div>

            {loadingRecords ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Loading saved records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No configured records yet. Click <b>"+ Add Category Count"</b> on any Hub above to add entries.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Hub Name
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Location
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Category
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Count
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                        Assigned Staff Email(s)
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#475569", textAlign: "center" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px", fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                          {record.hub}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#334155", fontSize: "13px" }}>
                          {record.location || "-"}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: "600", color: "#1e293b", fontSize: "14px" }}>
                          {record.category}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                          <span
                            style={{
                              backgroundColor: "#fef9c3",
                              color: "#854d0e",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: "1px solid #fde047",
                            }}
                          >
                            {record.count}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "13px", color: "#0284c7", fontWeight: "600" }}>
                          {record.staff || record.assigned_staff || record.staff_emails || "-"}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditCountRecord(record)}
                              style={{
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => promptDeleteCountRecord(record.id)}
                              style={{
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== CUSTOM DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirmItem && (
        <div className="modal-overlay" style={{ zIndex: 9999999 }}>
          <div className="modal-card" style={{ textAlign: "center", minWidth: "320px", maxWidth: "400px", position: "relative" }}>
            <span
              className="modal-close"
              onClick={() => setDeleteConfirmItem(null)}
            >
              ✕
            </span>
            <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "20px", fontWeight: "700" }}>
              {deleteConfirmItem.title || "Confirm Delete"}
            </h3>
            <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px", lineHeight: "1.5" }}>
              {deleteConfirmItem.message}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="auth-button"
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: "700",
                  border: "1px solid #cbd5e1"
                }}
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                className="auth-button"
                style={{
                  flex: 1,
                  background: "#facc15",
                  color: "#000000",
                  fontWeight: "700"
                }}
                onClick={() => {
                  if (deleteConfirmItem.type === "hub") {
                    confirmDeleteHub(deleteConfirmItem.id);
                  } else {
                    confirmDeleteCountRecord(deleteConfirmItem.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICATION MODAL ===== */}
      {modalMessage && (
        <div className="modal-overlay" style={{ zIndex: 9999999 }}>
          <div className="modal-card" style={{ textAlign: "center", minWidth: "320px", maxWidth: "400px", position: "relative" }}>
            <span
              className="modal-close"
              onClick={() => setModalMessage(null)}
            >
              ✕
            </span>
            <h3 style={{ color: "#0f172a", marginBottom: "12px" }}>{modalMessage.title}</h3>
            <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
              {modalMessage.message}
            </p>
            <button
              className="auth-button"
              style={{
                width: "100%",
                background: "#facc15",
                color: "#000",
                fontWeight: "700",
              }}
              onClick={() => setModalMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryHubCounts;
