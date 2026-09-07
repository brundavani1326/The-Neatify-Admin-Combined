import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import Loader from "./Loader";

function PromotionalBanners({ triggerAlert, triggerConfirm }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [file, setFile] = useState(null);
  const [priority, setPriority] = useState("");
  const [isActive, setIsActive] = useState("true");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Condition states
  const [customerType, setCustomerType] = useState("everyone");
  const [bookingCondition, setBookingCondition] = useState("all");
  const [pincodeScope, setPincodeScope] = useState("all");
  const [serviceScope, setServiceScope] = useState("all");
  const [offerPercentage, setOfferPercentage] = useState("");

  const [hubLocations, setHubLocations] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDependencies();
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fetchDependencies = async () => {
    try {
      const [hubsRes, servsRes] = await Promise.all([
        supabase.from("hub_locations").select("*"),
        supabase.from("services").select("*")
      ]);
      if (hubsRes.data) setHubLocations(hubsRes.data);
      if (servsRes.data) setServicesList(servsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*, promotional_banner_locations ( location_id ), promotional_banner_services ( service_id )")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error(err);
      triggerAlert(err.message, "Fetch Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const shiftPriorities = async (targetPriority, direction = "up") => {
    const { data: existing } = await supabase
      .from("promotional_banners")
      .select("id, display_order")
      .gte("display_order", targetPriority)
      .order("display_order", { ascending: true });

    if (!existing || existing.length === 0) return true;

    for (const item of existing) {
      const newOrder = direction === "up" ? item.display_order + 1 : item.display_order - 1;
      const { error } = await supabase
        .from("promotional_banners")
        .update({ display_order: newOrder })
        .eq("id", item.id);
      if (error) {
        console.error("Shift error:", error);
        return false;
      }
    }
    return true;
  };

  const resetForm = () => {
    setEditingBannerId(null);
    setEditingBanner(null);
    setFile(null);
    setPriority("");
    setIsActive("true");
    setStartDate("");
    setEndDate("");
    setCustomerType("everyone");
    setBookingCondition("all");
    setPincodeScope("all");
    setServiceScope("all");
    setOfferPercentage("");
    setSelectedLocations([]);
    setSelectedServices([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditClick = (banner) => {
    setEditingBannerId(banner.id);
    setEditingBanner(banner);
    setPriority(banner.display_order.toString());
    setIsActive(banner.is_active ? "true" : "false");
    setStartDate(banner.start_date ? banner.start_date.substring(0, 16) : "");
    setEndDate(banner.end_date ? banner.end_date.substring(0, 16) : "");
    setCustomerType(banner.customer_type || "everyone");
    setBookingCondition(banner.booking_condition || "all");
    setPincodeScope(banner.pincode_scope || "all");
    setServiceScope(banner.service_scope || "all");
    setOfferPercentage(banner.offer_percentage ? banner.offer_percentage.toString() : "");
    setSelectedLocations(banner.promotional_banner_locations?.map(l => l.location_id) || []);
    setSelectedServices(banner.promotional_banner_services?.map(s => s.service_id) || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpload = async () => {
    if (!file && !editingBannerId) {
      triggerAlert("Please select an image file first.", "Required", "info");
      return;
    }

    // Validation
    if (customerType === "new" && bookingCondition === "booked_before") {
      triggerAlert("New Customers cannot have 'Booked Before' condition.", "Validation Error", "error");
      return;
    }
    if (customerType === "existing" && bookingCondition === "first_booking") {
      triggerAlert("Existing Customers cannot have 'First Booking' condition.", "Validation Error", "error");
      return;
    }
    if (pincodeScope === "selected" && selectedLocations.length === 0) {
      triggerAlert("Please select at least one location.", "Validation Error", "error");
      return;
    }
    if (!offerPercentage || isNaN(offerPercentage) || Number(offerPercentage) < 1 || Number(offerPercentage) > 100) {
      triggerAlert("Please enter a valid Offer Percentage between 1 and 100.", "Validation Error", "error");
      return;
    }
    if (serviceScope === "selected" && selectedServices.length === 0) {
      triggerAlert("Please select at least one service.", "Validation Error", "error");
      return;
    }

    setUploading(true);
    try {
      let targetPriority = parseInt(priority);

      // Calculate priority if empty
      if (!priority) {
        if (editingBannerId) {
          targetPriority = editingBanner.display_order;
        } else {
          const { data: maxData } = await supabase
            .from("promotional_banners")
            .select("display_order")
            .order("display_order", { ascending: false })
            .limit(1);
          const maxP = (maxData && maxData.length > 0) ? parseInt(maxData[0].display_order) || 0 : 0;
          targetPriority = maxP + 1;
        }
      } else if (!editingBannerId || (editingBannerId && targetPriority !== editingBanner.display_order)) {
        // Shift priorities only if priority explicitly changed or new banner
        let shiftOk = await shiftPriorities(targetPriority, "up");
        if (!shiftOk) {
          console.warn("Priority shift failed.");
        }
      }

      let imageUrl = editingBanner?.image_url;
      let uniqueName = editingBanner?.storage_path;

      // Upload to Storage if new file
      if (file) {
        const fileExt = file.name.split(".").pop();
        uniqueName = `${Date.now()}_banner.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("promotional_banners")
          .upload(uniqueName, file, { upsert: false });

        if (uploadError) {
          triggerAlert(uploadError.message, "Upload Failed", "error");
          setUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("promotional_banners")
          .getPublicUrl(uniqueName);

        imageUrl = publicUrlData.publicUrl;

        // Optionally delete old file if replacing
        if (editingBannerId && editingBanner.storage_path) {
          await supabase.storage.from("promotional_banners").remove([editingBanner.storage_path]);
        }
      }

      const payload = {
        image_url: imageUrl,
        storage_path: uniqueName,
        display_order: targetPriority,
        is_active: isActive === "true",
        start_date: startDate || null,
        end_date: endDate || null,
        customer_type: customerType,
        booking_condition: bookingCondition,
        pincode_scope: pincodeScope,
        service_scope: serviceScope,
        offer_percentage: Number(offerPercentage),
        updated_at: new Date().toISOString()
      };

      let bannerId = editingBannerId;

      // Update or Insert Banner
      if (editingBannerId) {
        const { error: updateError } = await supabase
          .from("promotional_banners")
          .update(payload)
          .eq("id", editingBannerId);
        if (updateError) throw updateError;
      } else {
        const { data: newBanner, error: insertError } = await supabase
          .from("promotional_banners")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        bannerId = newBanner.id;
      }

      // Handle Relations
      if (editingBannerId) {
        await supabase.from("promotional_banner_locations").delete().eq("banner_id", bannerId);
        await supabase.from("promotional_banner_services").delete().eq("banner_id", bannerId);
      }

      if (pincodeScope === "selected" && selectedLocations.length > 0) {
        const locPayload = selectedLocations.map(id => ({ banner_id: bannerId, location_id: id }));
        const { error } = await supabase.from("promotional_banner_locations").insert(locPayload);
        if (error) console.error(error);
      }

      if (serviceScope === "selected" && selectedServices.length > 0) {
        const servPayload = selectedServices.map(id => ({ banner_id: bannerId, service_id: id }));
        const { error } = await supabase.from("promotional_banner_services").insert(servPayload);
        if (error) console.error(error);
      }

      triggerAlert(editingBannerId ? "Banner updated successfully ?" : "Banner uploaded successfully ?", "Success", "success");
      resetForm();
      fetchBanners();
    } catch (err) {
      console.error(err);
      triggerAlert(err.message, "Error", "error");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (banner) => {
    const { error } = await supabase
      .from("promotional_banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      triggerAlert(error.message, "Toggle Failed", "error");
    } else {
      fetchBanners();
    }
  };

  const handleDelete = (banner) => {
    triggerConfirm("Delete this promotional banner?", async () => {
      try {
        if (banner.storage_path) {
          const { error: storageError } = await supabase.storage
            .from("promotional_banners")
            .remove([banner.storage_path]);
          if (storageError) {
            console.error("Storage delete error:", storageError);
          }
        }

        const { error: deleteError } = await supabase
          .from("promotional_banners")
          .delete()
          .eq("id", banner.id);

        if (deleteError) {
          triggerAlert(deleteError.message, "Delete Failed", "error");
          return;
        }

        await shiftPriorities(banner.display_order, "down");
        fetchBanners();
        triggerAlert("Banner deleted", "Deleted", "success");
      } catch (err) {
        triggerAlert(err.message, "Error", "error");
      }
    }, "Confirm Delete");
  };

  const handleToggleLocation = (locId) => {
    setSelectedLocations(prev => prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]);
  };

  const handleToggleService = (srvId) => {
    setSelectedServices(prev => prev.includes(srvId) ? prev.filter(id => id !== srvId) : [...prev, srvId]);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {loading || uploading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <Loader />
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#1e293b" }}>
            Promotional Banners
          </h2>

          {/* ADD/EDIT NEW BANNER */}
          <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#334155", margin: 0 }}>
                {editingBannerId ? "Edit Banner" : "Add New Banner"}
              </h3>
              {editingBannerId && (
                <button onClick={resetForm} style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>
                  Cancel Edit
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", alignItems: "end", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                  Image File (Full Design) {editingBannerId && "(Leave empty to keep existing)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                  Display Order / Priority (Leave blank to add to end)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="e.g. 1"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Start Date (Optional)</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>End Date (Optional)</label>
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Status</label>
                <select value={isActive} onChange={(e) => setIsActive(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", fontWeight: "500", boxSizing: "border-box" }}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* CONDITIONS SECTION */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "15px", marginTop: "15px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "15px", color: "#334155" }}>Display Conditions</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                    Offer Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={offerPercentage}
                    onChange={(e) => setOfferPercentage(e.target.value)}
                    placeholder="e.g. 40"
                    min="1"
                    max="100"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Customer Type</label>
                  <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}>
                    <option value="everyone">Everyone</option>
                    <option value="new">New Customers</option>
                    <option value="existing">Existing Customers</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Booking Condition</label>
                  <select value={bookingCondition} onChange={(e) => setBookingCondition(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}>
                    <option value="all">No Booking Restriction</option>
                    <option value="first_booking">First Booking Only</option>
                    <option value="booked_before">Customers Who Have Booked Before</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Location</label>
                  <select value={pincodeScope} onChange={(e) => setPincodeScope(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box", marginBottom: "10px" }}>
                    <option value="all">All Locations</option>
                    <option value="selected">Selected Locations</option>
                  </select>

                  {pincodeScope === "selected" && (
                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", backgroundColor: "#fff" }}>
                      {hubLocations.map(loc => (
                        <div key={loc.id} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                          <input type="checkbox" id={`loc-${loc.id}`} checked={selectedLocations.includes(loc.id)} onChange={() => handleToggleLocation(loc.id)} style={{ marginRight: "8px" }} />
                          <label htmlFor={`loc-${loc.id}`} style={{ fontSize: "13px", color: "#334155", cursor: "pointer" }}>{loc.hub_name} ({loc.pincode})</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Service Applicability</label>
                  <select value={serviceScope} onChange={(e) => setServiceScope(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontSize: "14px", boxSizing: "border-box", marginBottom: "10px" }}>
                    <option value="all">All Services</option>
                    <option value="selected">Selected Services</option>
                  </select>

                  {serviceScope === "selected" && (
                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", backgroundColor: "#fff" }}>
                      {servicesList.map(srv => (
                        <div key={srv.id} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                          <input type="checkbox" id={`srv-${srv.id}`} checked={selectedServices.includes(srv.id)} onChange={() => handleToggleService(srv.id)} style={{ marginRight: "8px" }} />
                          <label htmlFor={`srv-${srv.id}`} style={{ fontSize: "13px", color: "#334155", cursor: "pointer" }}>{srv.title}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <button
                onClick={handleUpload}
                style={{
                  width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                  backgroundColor: "#0f172a", color: "#ffffff", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", transition: "background-color 0.2s", boxSizing: "border-box"
                }}
              >
                {editingBannerId ? "Update Banner" : "Upload Banner"}
              </button>
            </div>
          </div>

          {/* LIST BANNERS */}
          {banners.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              No promotional banners uploaded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    padding: "15px",
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#facc15", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "14px", fontWeight: "700", color: "#000000", flexShrink: 0 }}>
                    {banner.display_order}
                  </div>

                  <div style={{ width: "160px", height: "90px", borderRadius: "8px", overflow: "hidden", backgroundColor: "#f1f5f9", flexShrink: 0, border: "1px solid #e2e8f0" }}>
                    <img src={banner.image_url} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", backgroundColor: banner.is_active ? "#dcfce7" : "#f1f5f9", color: banner.is_active ? "#166534" : "#64748b" }}>
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#475569", display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>{banner.offer_percentage}% OFF</span>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>User: {banner.customer_type}</span>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Booking: {banner.booking_condition}</span>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Loc: {banner.pincode_scope} {banner.pincode_scope === "selected" && "(...)"}</span>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Srv: {banner.service_scope} {banner.service_scope === "selected" && "(...)"}</span>
                    </div>

                    {(banner.start_date || banner.end_date) && (
                      <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "15px" }}>
                        {banner.start_date && <span>Start: {new Date(banner.start_date).toLocaleString()}</span>}
                        {banner.end_date && <span>End: {new Date(banner.end_date).toLocaleString()}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                    <button
                      onClick={() => handleEditClick(banner)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", color: "#334155", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(banner)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#334155", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                    >
                      {banner.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #fecaca", backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PromotionalBanners;

