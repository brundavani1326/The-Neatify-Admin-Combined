import { useEffect, useState, useRef } from "react";
import { supabase, supabaseFunctionsUrl } from "../supabase";
import Loader from "./Loader";
import neatifyLogo from "../neatifylogo.png";

const LiveLocationCell = ({ locationStr }) => {
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!locationStr || locationStr === "N/A") {
    return <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "500" }}>N/A</span>;
  }

  const coordsDisplay = locationStr;
  const mapsUrl = locationStr.startsWith("http")
    ? locationStr
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}`;

  const fetchAddress = async () => {
    if (address || loadingAddress) return;
    if (locationStr.includes(",")) {
      const parts = locationStr.split(",");
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        try {
          setLoadingAddress(true);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parts[0].trim()}&lon=${parts[1].trim()}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress("Address details unavailable");
          }
        } catch (err) {
          setAddress("Unable to fetch address");
        } finally {
          setLoadingAddress(false);
        }
      } else {
        setAddress(locationStr);
      }
    } else {
      setAddress(locationStr);
    }
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
    fetchAddress();
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
        {/* Coordinates Display with hover trigger & pointer cursor */}
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            fontWeight: "700",
            color: "#0f172a",
            backgroundColor: "#f1f5f9",
            padding: "3px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            cursor: "pointer"
          }}
        >
          {coordsDisplay}
        </span>

        {/* View Maps Link */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: "700",
            textDecoration: "none",
            cursor: "pointer"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          🗺️ View Maps
        </a>
      </div>

      {/* Hover Tooltip / Popover for Full Address */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "12px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            whiteSpace: "normal",
            width: "260px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            zIndex: 99999,
            pointerEvents: "none",
            textAlign: "left"
          }}
        >
          <div style={{ fontWeight: "800", color: "#facc15", marginBottom: "6px", fontSize: "12px", letterSpacing: "0.3px" }}>
            📍 LOCATION & ADDRESS:
          </div>
          <div style={{ fontSize: "12px", color: "#ffffff", marginBottom: "6px" }}>
            <strong>Coords:</strong> {coordsDisplay}
          </div>
          <div style={{ fontSize: "12px", color: "#ffffff", lineHeight: "1.4" }}>
            <strong>Address:</strong>{" "}
            {loadingAddress ? "Fetching full address..." : address || "Resolving address..."}
          </div>
        </div>
      )}
    </div>
  );
};

const StaffMapViewModal = ({
  bookingLat,
  bookingLng,
  bookingPincode,
  bookingHubName,
  maxRadiusKm,
  sortedStaffList,
  hubLocations = [],
  onClose
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const hasFittedBoundsRef = useRef(false);

  const staffKey = (sortedStaffList || []).map((s) => `${s.id || s.name}-${s.live_location}`).join("|");
  const hubKey = (hubLocations || []).map((h) => `${h.id || h.hub_name}-${h.location}`).join("|");

  useEffect(() => {
    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) {
          resolve(window.L);
          return;
        }

        if (!document.getElementById("leaflet-css")) {
          const css = document.createElement("link");
          css.id = "leaflet-css";
          css.rel = "stylesheet";
          css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(css);
        }

        if (!document.getElementById("leaflet-js")) {
          const js = document.createElement("script");
          js.id = "leaflet-js";
          js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          js.onload = () => resolve(window.L);
          document.head.appendChild(js);
        } else {
          const checkL = setInterval(() => {
            if (window.L) {
              clearInterval(checkL);
              resolve(window.L);
            }
          }, 100);
        }
      });
    };

    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      try {
        const centerLat = bookingLat || 17.445;
        const centerLng = bookingLng || 78.38;

        // Reuse existing map instance to prevent resetting user's zoom & pan
        let map = mapInstanceRef.current;
        if (!map) {
          if (mapContainerRef.current._leaflet_id) {
            delete mapContainerRef.current._leaflet_id;
          }
          map = L.map(mapContainerRef.current, {
            maxZoom: 22,
            minZoom: 3,
            zoomControl: true
          }).setView([centerLat, centerLng], 12);

          mapInstanceRef.current = map;

          const tileLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
            maxZoom: 22,
            maxNativeZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            attribution: "&copy; Google Maps"
          });

          // Prevent tile 404 errors from triggering window.onerror
          tileLayer.on("tileerror", () => { });
          tileLayer.addTo(map);

          layerGroupRef.current = L.layerGroup().addTo(map);
        }

        // Clear existing markers layer without resetting zoom
        if (layerGroupRef.current) {
          layerGroupRef.current.clearLayers();
        }

        const layerGroup = layerGroupRef.current || map;

        // Customer Location Marker
        if (bookingLat && bookingLng) {
          try {
            const customerIcon = L.divIcon({
              className: "custom-customer-pin",
              html: `<div style="background:#ef4444;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;">📍</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            });

            const customerMarker = L.marker([bookingLat, bookingLng], { icon: customerIcon }).addTo(layerGroup);
            customerMarker.bindTooltip(`
              <div style="font-family:sans-serif;padding:4px;">
                <strong style="color:#0f172a;font-size:13px;">📍 Customer Location</strong><br/>
                <span style="font-size:12px;color:#475569;">Pincode: <strong>${bookingPincode || "N/A"}</strong></span><br/>
                <span style="font-size:12px;color:#d97706;">Hub: <strong>${bookingHubName || "N/A"}</strong></span>
              </div>
            `, { permanent: false, direction: "top" });

            // Draw Radius Circle
            if (maxRadiusKm > 0) {
              const circle = L.circle([bookingLat, bookingLng], {
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.12,
                radius: maxRadiusKm * 1000
              }).addTo(layerGroup);

              // Fit bounds ONLY ONCE on initial map opening so user manual zoom is preserved
              if (!hasFittedBoundsRef.current) {
                map.fitBounds(circle.getBounds(), { padding: [30, 30] });
                hasFittedBoundsRef.current = true;
              }
            }
          } catch (err) {
            console.error("Customer marker error:", err);
          }
        }

        // Staff Markers (with offset handling for close/overlapping coordinates)
        const plottedCoords = [];
        if (bookingLat && bookingLng) {
          plottedCoords.push({ lat: bookingLat, lng: bookingLng });
        }

        (sortedStaffList || []).forEach((staff) => {
          try {
            let coords = (staff.live_location && staff.live_location.includes(",") && staff.live_location.trim().toUpperCase() !== "N/A")
              ? {
                lat: parseFloat(staff.live_location.split(",")[0]),
                lng: parseFloat(staff.live_location.split(",")[1])
              }
              : null;

            // Only plot staff members on the map if they have valid live location coordinates
            if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
              return;
            }

            // Apply a small visual offset if markers overlap at identical or very close coordinates
            let finalLat = coords.lat;
            let finalLng = coords.lng;

            let overlapCount = 0;
            plottedCoords.forEach((p) => {
              const dLat = Math.abs(p.lat - finalLat);
              const dLng = Math.abs(p.lng - finalLng);
              if (dLat < 0.0006 && dLng < 0.0006) {
                overlapCount++;
              }
            });

            if (overlapCount > 0) {
              const angle = (overlapCount * 2 * Math.PI) / 6;
              const offsetDist = 0.0009 * (1 + Math.floor(overlapCount / 6) * 0.4);
              finalLat += offsetDist * Math.cos(angle);
              finalLng += offsetDist * Math.sin(angle);
            }

            plottedCoords.push({ lat: finalLat, lng: finalLng });

            const isHubPartner = Boolean(staff.isHubMatched);
            const pinBg = isHubPartner ? "#f59e0b" : "#2563eb";
            const pinSymbol = isHubPartner ? "🏢" : "👤";

            const staffIcon = L.divIcon({
              className: "custom-staff-pin",
              html: `<div style="background:${pinBg};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">${pinSymbol}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            });

            const marker = L.marker([finalLat, finalLng], { icon: staffIcon }).addTo(layerGroup);

            // Calculate exact distance between customer location and staff/hub location
            let displayDistStr = "N/A";
            if (bookingLat != null && bookingLng != null && coords && coords.lat != null && coords.lng != null) {
              const R = 6371;
              const dLat = ((coords.lat - bookingLat) * Math.PI) / 180;
              const dLon = ((coords.lng - bookingLng) * Math.PI) / 180;
              const aVal =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((bookingLat * Math.PI) / 180) *
                Math.cos((coords.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
              const cVal = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
              const rawDistKm = R * cVal;

              if (rawDistKm < 0.1) {
                displayDistStr = rawDistKm === 0 ? "0 km" : `${rawDistKm.toFixed(2)} km`;
              } else {
                displayDistStr = `${rawDistKm.toFixed(1)} km`;
              }
            } else if (staff.distKm != null) {
              displayDistStr = `${staff.distKm} km`;
            }

            const statusColor = staff.is_blocked ? "#ef4444" : "#16a34a";
            const statusLabel = staff.is_blocked ? "Blocked / Unavailable" : "Active";

            marker.bindTooltip(`
              <div style="font-family:sans-serif;padding:6px;min-width:180px;">
                <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:4px;">
                  ${staff.name || "Staff Member"}
                  ${isHubPartner ? '<span style="background:#fef3c7;color:#d97706;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;">Hub Partner</span>' : ''}
                </div>
                <div style="font-size:12px;color:#334155;margin-bottom:2px;">
                  🚗 Distance: <strong style="color:#2563eb;">${displayDistStr}</strong>
                </div>
                <div style="font-size:12px;color:#334155;margin-bottom:2px;">
                  🏢 Hub Name: <strong>${staff.hubName || "N/A"}</strong>
                </div>
                <div style="font-size:12px;color:#334155;margin-bottom:2px;">
                  📍 Coords: <strong>${staff.live_location && staff.live_location !== "N/A" ? staff.live_location : `${coords.lat}, ${coords.lng}`}</strong>
                </div>
                <div style="font-size:12px;color:${statusColor};font-weight:700;margin-top:4px;">
                  ● Status: ${statusLabel}
                </div>
              </div>
            `, { permanent: false, direction: "top", opacity: 0.95 });
          } catch (err) {
            console.error("Staff marker error:", err);
          }
        });
      } catch (err) {
        console.error("Leaflet map initialization error:", err);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) { }
        mapInstanceRef.current = null;
        hasFittedBoundsRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingLat, bookingLng, bookingPincode, bookingHubName, maxRadiusKm, staffKey, hubKey]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1100px",
          height: "85vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
              🗺️ Staff Proximity & Location Map
            </h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Center: Customer Location • Radius: {maxRadiusKm === 0 ? "All Distances" : `${maxRadiusKm} km`} • Staff Count: {sortedStaffList.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            ✕ Close Map
          </button>
        </div>

        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};

function BookingPage() {
  const [bookings, setBookings] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [reviewsMap, setReviewsMap] = useState({});
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("bookingsActiveTab") || "unassigned";
  });
  const [loading, setLoading] = useState(true);

  const [showStaff, setShowStaff] = useState(() => {
    return localStorage.getItem("bookingsShowStaff") === "true";
  });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [hubLocations, setHubLocations] = useState([]);
  const [hubCategoryCounts, setHubCategoryCounts] = useState([]);
  const [maxRadiusKm, setMaxRadiusKm] = useState(10);
  const [staffStatusFilter, setStaffStatusFilter] = useState("all");
  const [showStaffMapView, setShowStaffMapView] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(() => {
    const saved = localStorage.getItem("bookingsSelectedBooking");
    return saved ? JSON.parse(saved) : null;
  });

  const [showDutyLogsModal, setShowDutyLogsModal] = useState(false);
  const [selectedDutyLogsStaff, setSelectedDutyLogsStaff] = useState(null);
  const [dutyLogsLoading, setDutyLogsLoading] = useState(false);

  // Customer Checklist states
  const [customerChecklists, setCustomerChecklists] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedChecklistTasks, setSelectedChecklistTasks] = useState([]);

  const formatMinutesToHoursStr = (mins) => {
    const totalMins = parseInt(mins || 0, 10);
    if (isNaN(totalMins) || totalMins <= 0) return "0 hrs 0 mins";
    const hrs = Math.floor(totalMins / 60);
    const remainingMins = totalMins % 60;
    if (hrs === 0) return `${remainingMins} mins`;
    if (remainingMins === 0) return `${hrs} hrs`;
    return `${hrs} hrs ${remainingMins} mins`;
  };

  const handleOpenDutyLogs = async (staff) => {
    if (!staff) return;
    setSelectedDutyLogsStaff(staff);
    setShowDutyLogsModal(true);
    setDutyLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_profile")
        .select("*")
        .eq("id", staff.id)
        .single();
      if (data && !error) {
        setSelectedDutyLogsStaff(data);
      }
    } catch (err) {
      console.error("Error refreshing duty logs profile:", err);
    } finally {
      setDutyLogsLoading(false);
    }
  };

  const parseDutyLogsEntries = (rawJson) => {
    if (!rawJson) return [];
    let parsed = rawJson;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
      } catch (e) {
        return [];
      }
    }
    if (!parsed) return [];

    const entries = [];
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          if (item.date) {
            const mins = parseInt(item.minutes ?? item.duty_minutes ?? item.mins ?? 0, 10);
            entries.push([String(item.date), isNaN(mins) ? 0 : mins]);
          } else {
            Object.entries(item).forEach(([k, v]) => {
              const mins = parseInt(v ?? 0, 10);
              entries.push([String(k), isNaN(mins) ? 0 : mins]);
            });
          }
        }
      });
    } else if (typeof parsed === "object") {
      Object.entries(parsed).forEach(([k, v]) => {
        const mins = parseInt(v ?? 0, 10);
        entries.push([String(k), isNaN(mins) ? 0 : mins]);
      });
    }

    return entries.sort((a, b) => b[0].localeCompare(a[0]));
  };

  const renderChecklistTasksModal = () => {
    if (!showChecklistModal || selectedChecklistTasks.length === 0) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: "24px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>📝 Customer Checklist Tasks</h2>
            <button
              onClick={() => {
                setShowChecklistModal(false);
                setSelectedChecklistTasks([]);
              }}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontWeight: "700"
              }}
            >
              ✕
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px", color: "#64748b" }}>Task Title</th>
                <th style={{ padding: "12px", color: "#64748b", width: "120px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedChecklistTasks.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px", fontWeight: "600", color: "#1e293b" }}>{t.task_title || "N/A"}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: (t.customer_completed === true || t.customer_completed === "Completed" || t.customer_completed === "Yes") ? "#dcfce7" : "#fef9c3",
                        color: (t.customer_completed === true || t.customer_completed === "Completed" || t.customer_completed === "Yes") ? "#166534" : "#ca8a04",
                      }}
                    >
                      {(t.customer_completed === true || t.customer_completed === "Completed" || t.customer_completed === "Yes") ? "Completed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDutyLogsModal = () => {
    if (!showDutyLogsModal || !selectedDutyLogsStaff) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "470px",
            overflowY: "auto",
            overscrollBehavior: "contain",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0",
            padding: "22px"
          }}
        >
          {/* Modal Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⏱️</span> Staff Working Hours & Duty Logs
              </h2>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#3b82f6", marginTop: "4px" }}>
                {selectedDutyLogsStaff.name} <span style={{ color: "#64748b", fontWeight: "400" }}>({selectedDutyLogsStaff.email || "No email"})</span>
              </div>
            </div>
            <button
              onClick={() => {
                setShowDutyLogsModal(false);
                setSelectedDutyLogsStaff(null);
              }}
              style={{
                background: "#f1f5f9",
                color: "#64748b",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>
          </div>

          {/* Summary Cards: Daily, Weekly, Monthly Duty Minutes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px", borderRadius: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Daily Working Hours</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#1e40af", marginTop: "6px" }}>
                {formatMinutesToHoursStr(selectedDutyLogsStaff.today_duty_minutes)}
              </div>
              <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px", fontWeight: "600" }}>
                ({selectedDutyLogsStaff.today_duty_minutes || 0} mins)
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px", borderRadius: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px" }}>Weekly Working Hours</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#166534", marginTop: "6px" }}>
                {formatMinutesToHoursStr(selectedDutyLogsStaff.weekly_duty_minutes)}
              </div>
              <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px", fontWeight: "600" }}>
                ({selectedDutyLogsStaff.weekly_duty_minutes || 0} mins)
              </div>
            </div>

            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: "14px", borderRadius: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Working Hours</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#6b21a8", marginTop: "6px" }}>
                {formatMinutesToHoursStr(selectedDutyLogsStaff.monthly_duty_minutes)}
              </div>
              <div style={{ fontSize: "11px", color: "#a855f7", marginTop: "2px", fontWeight: "600" }}>
                ({selectedDutyLogsStaff.monthly_duty_minutes || 0} mins)
              </div>
            </div>
          </div>

          {/* Date-wise Duty Logs History Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              📅 Date-wise Duty Logs History
            </h3>
          </div>

          {/* Display formatted Duty Logs JSON */}
          {dutyLogsLoading ? (
            <div style={{ padding: "40px", textAlign: "center" }}><Loader /></div>
          ) : (
            (() => {
              const entries = parseDutyLogsEntries(selectedDutyLogsStaff.duty_logs_json);

              if (entries.length === 0) {
                return (
                  <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "30px", borderRadius: "12px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    No date-wise duty logs recorded yet.
                  </div>
                );
              }

              return (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "700" }}>DATE</th>
                        <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "700", textAlign: "center" }}>DUTY MINUTES</th>
                        <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "700", textAlign: "right" }}>WORKING HOURS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(([dateKey, minutesVal], idx) => (
                        <tr key={dateKey || idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fafbfc" }}>
                          <td style={{ padding: "10px 16px", fontWeight: "700", color: "#1e293b" }}>📅 {dateKey}</td>
                          <td style={{ padding: "10px 16px", textAlign: "center", color: "#475569", fontWeight: "600" }}>{minutesVal} mins</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: "700", color: "#2563eb" }}>
                            {formatMinutesToHoursStr(minutesVal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}

          {/* Close button at bottom */}
          <div style={{ marginTop: "24px", textAlign: "right" }}>
            <button
              onClick={() => {
                setShowDutyLogsModal(false);
                setSelectedDutyLogsStaff(null);
              }}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchHubData = async () => {
      try {
        const { data: hLocs } = await supabase.from("hub_locations").select("*");
        const { data: hCats } = await supabase.from("hub_category_counts").select("*");
        if (hLocs) setHubLocations(hLocs);
        if (hCats) setHubCategoryCounts(hCats);
      } catch (err) {
        console.error("Error fetching hub data:", err);
      }
    };
    fetchHubData();
  }, []);
  const [showEditStaff, setShowEditStaff] = useState(false);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const [editStaffImage, setEditStaffImage] = useState(null);
  const [editStaffForm, setEditStaffForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    aadhar_number: "",
    tagged_partner: "",
    avatar_url: "",
  });
  const [selectedStaff, setSelectedStaff] = useState(() => {
    const saved = localStorage.getItem("bookingsSelectedStaff");
    return saved ? JSON.parse(saved) : null;
  });
  const [assignmentDone, setAssignmentDone] = useState(false);
  const [commonModalTitle, setCommonModalTitle] = useState("");
  const [showCommonModal, setShowCommonModal] = useState(false);


  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showCommonSuccess, setShowCommonSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [targetRefundId, setTargetRefundId] = useState(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalImageLabels, setModalImageLabels] = useState([]);
  const [uploadsMap, setUploadsMap] = useState({});
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [imgLoading, setImgLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState(null);

  const [showBookingDeleteConfirm, setShowBookingDeleteConfirm] = useState(false);
  const [targetBookingId, setTargetBookingId] = useState(null);
  const [copiedBookingId, setCopiedBookingId] = useState(null);
  const [editingRazorpayId, setEditingRazorpayId] = useState(null);
  const [showRazorpayDeleteConfirm, setShowRazorpayDeleteConfirm] = useState(false);

  // Assignment Slot State
  const [assignDate, setAssignDate] = useState("");

  /* ===== FILTER STATE ===== */
  const [filterDate, setFilterDate] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const timeDropdownRef = useRef(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterDate, filterTime, filterPaymentStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "N/A") return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      // Convert YYYY-MM-DD to DD-MM-YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const normalizeTime = (time) => {
    if (!time) return "";
    let t = time.toLowerCase().trim();
    t = t.replace(/\s+/g, " "); // Normalize spaces

    // Add :00 if missing (e.g., "2 pm" -> "2:00 pm" or "2" -> "2:00")
    if (!t.includes(":")) {
      if (t.match(/\d\s*(am|pm)/i)) {
        t = t.replace(/(\d)\s*(am|pm)/i, "$1:00 $2");
      } else if (t.match(/^\d{1,2}$/)) {
        t += ":00";
      }
    }

    // Ensure space before am/pm (e.g., "2:00pm" -> "2:00 pm")
    t = t.replace(/(\d)\s*(am|pm)/i, "$1 $2");

    // If missing AM/PM, assume based on common service hours (9am-5pm)
    if (!t.match(/(am|pm)/i) && t.match(/^\d{1,2}:\d{2}$/)) {
      const [h] = t.split(":").map(Number);
      if (h >= 1 && h <= 7) t += " pm";
      else if (h >= 8 && h <= 11) t += " am";
      else if (h === 12) t += " pm";
    }

    // Remove leading zero from hour (e.g., "02:00 pm" -> "2:00 pm")
    t = t.replace(/^0(\d:)/, "$1");
    return t;
  };

  // Staff Calendar State
  const [showStaffCalendar, setShowStaffCalendar] = useState(false);
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] = useState(null);
  const [calendarAvailability, setCalendarAvailability] = useState({});
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [calLoading, setCalLoading] = useState(false);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(null);

  // Staff Earnings State
  const [showEarnings, setShowEarnings] = useState(false);
  const [earningsStaff, setEarningsStaff] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [staffEarnings, setStaffEarnings] = useState({ monthly: 0, weekly: 0, total: 0, jobCount: 0, avgAmount: "₹0" });

  const [earningsList, setEarningsList] = useState([]);
  const [selectedEarningsMetric, setSelectedEarningsMetric] = useState("total");
  const [earningsViewMode, setEarningsViewMode] = useState("summary"); // 'summary' or 'breakdown'
  const [earningsSearch, setEarningsSearch] = useState("");

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const displayTotals = (() => {
    const sTerm = earningsSearch.trim().toLowerCase();
    const now = new Date();
    const curMonthName = now.toLocaleString('default', { month: 'long' }).toUpperCase();

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstSun = new Date(firstOfMonth);
    firstSun.setDate(firstSun.getDate() - firstSun.getDay());
    const diff = Math.floor((now - firstSun) / (1000 * 60 * 60 * 24));
    const curWeekNum = Math.floor(diff / 7) + 1;
    const curWeekName = `${curMonthName} WEEK ${curWeekNum}`;

    if (!sTerm) return {
      ...staffEarnings,
      list: (earningsList || []).filter(item => (item.status || "").toLowerCase() === "paid"),
      monthTitle: `${curMonthName} EARNING`,
      weekTitle: `${curWeekName} EARNING`
    };

    const filtered = earningsList.filter(item => {
      const currentStatus = (item.status || "").toLowerCase();
      if (currentStatus !== "paid") return false;

      const pPayoutDate = item.paid_date ? new Date(item.paid_date) : (item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at));
      const monthMatch = monthNames.findIndex(m => m.startsWith(sTerm));

      const itemFirstOfMonth = new Date(pPayoutDate.getFullYear(), pPayoutDate.getMonth(), 1);
      const itemFirstSun = new Date(itemFirstOfMonth);
      itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
      const itemDiff = Math.floor((pPayoutDate - itemFirstSun) / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(itemDiff / 7) + 1;
      const weekStr = `week ${weekNum}`;
      const weekShortStr = `w${weekNum}`;

      if (monthMatch !== -1) return pPayoutDate.getMonth() === monthMatch;
      if (sTerm.includes("week") || (sTerm.startsWith("w") && !isNaN(sTerm.slice(1)))) {
        return weekStr.includes(sTerm) || weekShortStr.includes(sTerm);
      }
      return item.service_title?.toLowerCase().includes(sTerm) || item.booking_id?.toLowerCase().includes(sTerm);
    });

    const sum = filtered.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);
    const monthMatch = monthNames.findIndex(m => m.startsWith(sTerm));
    let displayMonth = curMonthName;
    if (monthMatch !== -1) displayMonth = monthNames[monthMatch].toUpperCase();

    const monthMatched = monthNames.findIndex(m => m.startsWith(sTerm)) !== -1;
    const weekMatched = sTerm.includes("week") || (sTerm.startsWith("w") && !isNaN(sTerm.slice(1)));

    return {
      list: filtered,
      weekly: weekMatched ? `₹${sum.toLocaleString()}` : staffEarnings.weekly,
      monthly: monthMatched ? `₹${sum.toLocaleString()}` : staffEarnings.monthly,
      total: staffEarnings.total,
      jobCount: filtered.length,
      avgAmount: filtered.length > 0 ? `₹${Math.round(sum / filtered.length).toLocaleString()}` : "₹0",
      monthTitle: `${displayMonth} EARNING`,
      weekTitle: sTerm.includes("week") || sTerm.startsWith("w") ? `${sTerm.toUpperCase()} EARNING` : `${displayMonth} WEEK ${curWeekNum} EARNING`
    };
  })();

  // NEW: Manual Booking States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualBookingLoading, setManualBookingLoading] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [allAddOns, setAllAddOns] = useState([]);
  const [showAddonDropdown, setShowAddonDropdown] = useState(false);
  const [refundingId, setRefundingId] = useState(null);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [showAutoRefundConfirm, setShowAutoRefundConfirm] = useState(false);
  const [pendingAutoRefundBooking, setPendingAutoRefundBooking] = useState(null);
  const [initiateData, setInitiateData] = useState({
    booking: null,
    amount: "",
    note: ""
  });
  const [manualBookingData, setManualBookingData] = useState({
    user_name: "",
    user_phone: "",
    user_email: "",
    address: "",
    location_link: "",
    latitude: "",
    longitude: "",
    booking_date: "",
    booking_time: "",
    price: "",
    service_id: "",
    startotp: "",
    endotp: "",
    selected_addons: [],
    service_base_price: "",
    advance_amount: "",
    pending_amount: "",
    remarks: ""
  });


  // Track staff response for real-time alerts
  const lastStaffResponse = useRef(null);

  // Reschedule State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [enteredRescheduleOtp, setEnteredRescheduleOtp] = useState("");
  const [rescheduleOtpSent, setRescheduleOtpSent] = useState(false);
  const [masterSlots, setMasterSlots] = useState([]);
  const [dateSpecificSlots, setDateSpecificSlots] = useState({});

  // Cancellation State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [targetCancelBooking, setTargetCancelBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  useEffect(() => {
    fetchBookings();

    // If showStaff was true on initialization (from localStorage), fetch staff now.
    if (showStaff) {
      fetchAllStaffProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: Fetch services for manual booking
  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from("services").select("*").order("title", { ascending: true });
      if (data) setAllServices(data);
    };
    fetchServices();

    const fetchAddOns = async () => {
      const { data } = await supabase.from("add_ons").select("*").order("title", { ascending: true });
      if (data) setAllAddOns(data);
    };
    fetchAddOns();

    // Fetch dynamic time slots from schedule_config
    const fetchScheduleConfig = async () => {
      const { data } = await supabase.from("schedule_config").select("config_key, config_value");
      if (data) {
        const master = data.find(item => item.config_key === "time_slots")?.config_value || [];
        const dateSpecific = data.find(item => item.config_key === "date_time_slots")?.config_value || {};
        setMasterSlots(master);
        setDateSpecificSlots(dateSpecific);
      }
    };
    fetchScheduleConfig();
  }, []);

  const validateManualBookingTime = (bookingDate, bookingTime) => {
    if (!bookingDate || !bookingTime) return true;

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      // More flexible regex: supports 5:00 PM, 5 PM, 5:00PM, etc.
      const parts = timeStr.trim().match(/^(\d+)(?::(\d+))?\s*(am|pm)$/i);
      if (!parts) return null;
      let hours = parseInt(parts[1], 10);
      const minutes = parts[2] ? parseInt(parts[2], 10) : 0;
      const modifier = parts[3].toLowerCase();
      if (modifier === 'pm' && hours < 12) hours += 12;
      if (modifier === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const selectedTimeInMinutes = parseTime(bookingTime);
    if (selectedTimeInMinutes === null) {
      // If it's not a complete time string yet, don't alert during typing
      if (bookingTime.length < 4) return true;
      triggerModal("Invalid Time", "Please enter time in format '10:00 AM' or '4:30 PM'");
      return false;
    }

    // Check Business Hours (9:00 AM to 4:30 PM)
    if (selectedTimeInMinutes < 540 || selectedTimeInMinutes > 990) {
      triggerModal("Business Hours", "Please select a booking time between 9:00 AM and 4:30 PM.");
      return false;
    }

    // Check 1.5 Hour Lead Time for Today (using local date)
    const now = new Date();
    const localToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    if (bookingDate === localToday) {
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      if (selectedTimeInMinutes < currentTimeInMinutes + 90) {
        triggerModal("Booking Time Alert", "For today's bookings, please select a time at least 1 hour and 30 minutes from now.");
        return false;
      }
    }
    return true;
  };



  const getBookingAddOnsDisplay = (b) => {
    const addons = b.add_ons || b.services?.[0]?.add_ons;
    if (!addons) return "N/A";
    let list = [];
    if (Array.isArray(addons)) {
      list = addons;
    } else if (typeof addons === "string") {
      try {
        const parsed = JSON.parse(addons);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        return addons;
      }
    } else if (typeof addons === "object") {
      list = Object.values(addons);
    }
    if (!list || list.length === 0) return "N/A";
    return list.map(item => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const title = item.title || item.name || "Add-on";
        const price = item.price !== undefined && item.price !== null ? (String(item.price).startsWith("₹") ? item.price : `₹${item.price}`) : "";
        return price ? `${title} - ${price}` : title;
      }
      return String(item);
    }).join(", ");
  };

  // Helper to extract numeric value from strings like "₹1,000"
  const cleanNumeric = (val) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const calculateAddOnsTotal = (addonsList = []) => {
    return addonsList.reduce((sum, item) => sum + cleanNumeric(item.price), 0);
  };

  const handleToggleAddOn = (addon) => {
    const isSelected = (manualBookingData.selected_addons || []).some(a => String(a.id) === String(addon.id));
    let updatedAddons = [];
    if (isSelected) {
      updatedAddons = (manualBookingData.selected_addons || []).filter(a => String(a.id) !== String(addon.id));
    } else {
      updatedAddons = [
        ...(manualBookingData.selected_addons || []),
        {
          id: addon.id,
          title: addon.title,
          price: addon.price ? String(addon.price) : "0"
        }
      ];
    }

    const sPriceNum = cleanNumeric(manualBookingData.service_base_price);
    const addonsTotal = calculateAddOnsTotal(updatedAddons);
    const newFinalPrice = sPriceNum + addonsTotal;
    const advNum = cleanNumeric(manualBookingData.advance_amount);
    const newPending = Math.max(0, newFinalPrice - advNum);

    setManualBookingData({
      ...manualBookingData,
      selected_addons: updatedAddons,
      price: newFinalPrice > 0 ? String(newFinalPrice) : "",
      pending_amount: newPending >= 0 ? String(newPending) : "0"
    });
  };

  const handleCreateManualBooking = async () => {
    if (!manualBookingData.user_name || !manualBookingData.user_phone || !manualBookingData.service_id || !manualBookingData.booking_date || !manualBookingData.booking_time) {
      triggerModal("Incomplete Data", "Please fill in all required fields including Date and Time.");
      return;
    }

    if (!validateManualBookingTime(manualBookingData.booking_date, manualBookingData.booking_time)) {
      return;
    }

    setManualBookingLoading(true);
    const selectedService = allServices.find(s => String(s.id) === String(manualBookingData.service_id));

    const finalTotalAmount = cleanNumeric(manualBookingData.price);
    const advanceAmt = cleanNumeric(manualBookingData.advance_amount);
    const pendingAmt = Math.max(0, finalTotalAmount - advanceAmt);

    const addOnsJson = (manualBookingData.selected_addons || []).map(a => ({
      id: a.id,
      title: a.title,
      price: a.price
    }));

    // Format service as array JSONB as expected by the DB
    const servicesJson = [{
      id: selectedService?.id,
      title: selectedService?.title,
      price: manualBookingData.service_base_price || selectedService?.staff_amount || "0",
      type: selectedService?.service_type,
      add_ons: addOnsJson,
      advance_amount: advanceAmt,
      pending_amount: pendingAmt,
      remarks: manualBookingData.remarks || ""
    }];

    // Use valid UUID for booking_id
    const newBookingId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );

    const insertData = {
      booking_id: newBookingId,
      customer_name: manualBookingData.user_name,
      phone_number: manualBookingData.user_phone,
      email: manualBookingData.user_email || `${newBookingId.slice(0, 8)}@manual.com`,
      full_address: manualBookingData.address,
      location_link: manualBookingData.location_link || null,
      latitude: manualBookingData.latitude ? parseFloat(manualBookingData.latitude) : null,
      longitude: manualBookingData.longitude ? parseFloat(manualBookingData.longitude) : null,
      booking_date: manualBookingData.booking_date,
      booking_time: manualBookingData.booking_time,
      services: servicesJson,
      add_ons: addOnsJson,
      total_amount: finalTotalAmount,
      advance_amount: advanceAmt,
      pending_amount: pendingAmt,
      remarks: manualBookingData.remarks || null,
      work_status: "PENDING",
      payment_method: "MANUAL",
      payment_status: "paid",
      payment_verified: true,
      platform: "Admin Manual",
      startotp: manualBookingData.startotp,
      endotp: manualBookingData.endotp,
      created_at: new Date().toISOString()
    };

    let { error } = await supabase.from("bookings").insert([insertData]);

    if (error && error.message && error.message.includes("column")) {
      // Fallback: strip top-level fields that may not exist as columns, keeping them inside services JSON
      const fallbackInsertData = { ...insertData };
      delete fallbackInsertData.add_ons;
      delete fallbackInsertData.advance_amount;
      delete fallbackInsertData.pending_amount;
      delete fallbackInsertData.remarks;
      const res = await supabase.from("bookings").insert([fallbackInsertData]);
      error = res.error;
    }

    setManualBookingLoading(false);
    if (error) {
      console.error("Manual Booking Error Logic Check:", {
        error,
        insertData
      });
      triggerModal("Error", `Detail: ${error.message}. ${error.details || ""}`);
    } else {
      setShowManualModal(false);
      setShowAddonDropdown(false);
      setManualBookingData({
        user_name: "", user_phone: "", user_email: "", address: "", location_link: "",
        latitude: "", longitude: "",
        booking_date: "", booking_time: "", price: "", service_id: "",
        startotp: "", endotp: "",
        selected_addons: [], service_base_price: "", advance_amount: "", pending_amount: "", remarks: ""
      });
      triggerModal("Success", `Manual Booking ${newBookingId} created successfully!`);
      fetchBookings(); // Refresh list
    }
  };

  useEffect(() => {
    const handleForceOpen = () => {
      const forceOpen = localStorage.getItem("forceOpenStaff");
      if (forceOpen === "true") {
        setShowStaff(true);
        setSelectedBooking(null);
        setSelectedStaff(null);
        // Initialize date for the view if not set
        if (!assignDate) {
          setAssignDate(new Date().toISOString().split("T")[0]);
        }
        fetchAllStaffProfiles();
        localStorage.removeItem("forceOpenStaff");
      } else if (forceOpen === "false") {
        setShowStaff(false);
        localStorage.removeItem("forceOpenStaff");
      }
    };

    handleForceOpen();
    window.addEventListener("forceOpenStaffUpdate", handleForceOpen);

    // REAL-TIME SUBSCRIPTION
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        async () => {
          try {
            await fetchBookings(true);
          } catch (err) {
            console.error("Real-time sync failed:", err);
          }
        }
      )
      .subscribe();

    // AUTO-SYNC FALLBACK (Checks every 10 seconds in the background)
    const syncInterval = setInterval(async () => {
      try {
        await fetchBookings(true);
      } catch (err) {
        console.error("Auto-sync failed:", err);
      }
    }, 10000);

    return () => {
      window.removeEventListener("forceOpenStaffUpdate", handleForceOpen);
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("bookingsActiveTab", activeTab);
  }, [activeTab]);

  // Real-time alert for staff approval/rejection
  useEffect(() => {
    if (!selectedBooking || !showStaff) {
      lastStaffResponse.current = null;
      return;
    }

    const currentB = bookings.find(b => String(b.id) === String(selectedBooking.id));
    const currentResponse = currentB?.staff_response?.trim()?.toUpperCase();

    if (lastStaffResponse.current === null) {
      lastStaffResponse.current = currentResponse || "NONE";
      return;
    }

    const normalizedLast = lastStaffResponse.current === "NONE" ? null : lastStaffResponse.current;

    if (currentResponse && currentResponse !== normalizedLast) {
      if (currentResponse === "APPROVED") {
        setShowCommonModal(false);
      } else if (currentResponse === "REJECT" || currentResponse === "REJECTED") {
        triggerModal("Staff Rejected", "The staff has rejected the booking request.");
      }
      lastStaffResponse.current = currentResponse;
    } else if (!currentResponse) {
      lastStaffResponse.current = "NONE";
    }
  }, [bookings, selectedBooking, showStaff]);

  useEffect(() => {
    localStorage.setItem("bookingsShowStaff", showStaff);
    if (!showStaff) {
      localStorage.removeItem("bookingsSelectedBooking");
      localStorage.removeItem("bookingsSelectedStaff");
      localStorage.setItem("bookingsShowStaff", "false");
      setShowCommonModal(false);
    }
  }, [showStaff]);

  useEffect(() => {
    if (selectedBooking) {
      localStorage.setItem("bookingsSelectedBooking", JSON.stringify(selectedBooking));
    } else {
      localStorage.removeItem("bookingsSelectedBooking");
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (selectedStaff) {
      localStorage.setItem("bookingsSelectedStaff", JSON.stringify(selectedStaff));
    } else {
      localStorage.removeItem("bookingsSelectedStaff");
    }
  }, [selectedStaff]);

  const triggerModal = (title, message) => {
    setCommonModalTitle(title);
    setSuccessMessage(message);
    setShowCommonModal(true);
  };

  const handleOpenReschedule = (booking) => {
    setReschedulingBooking(booking);
    setRescheduleDate(booking.booking_date || "");
    setRescheduleTime(booking.booking_time || "");
    setRescheduleReason("");
    setEnteredRescheduleOtp("");
    setRescheduleOtpSent(false);
    setShowRescheduleModal(true);
  };

  const handleSendRescheduleOtp = async () => {
    if (!reschedulingBooking) return;

    if (!rescheduleDate || !rescheduleTime) {
      triggerModal("Incomplete Data", "Please select both date and time.");
      return;
    }

    try {
      setRescheduleLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "send-reschedule-otp",
        {
          body: {
            booking_id: reschedulingBooking.id,
            new_date: rescheduleDate,
            new_time: rescheduleTime,
            reason: rescheduleReason,
            phone_number: reschedulingBooking.phone_number || reschedulingBooking.user_phone || reschedulingBooking.customer_phone,
            email: reschedulingBooking.email || reschedulingBooking.user_email || reschedulingBooking.customer_email,
          },
        }
      );

      setRescheduleLoading(false);

      if (error || !data?.success) {
        console.error("OTP Edge Function Error:", error, data);
        const errMsg = error?.message || data?.message || "Failed to send OTP. Please check your Supabase logs.";
        triggerModal("OTP Failed", errMsg);
        return;
      }

      setRescheduleOtpSent(true);

      triggerModal(
        "OTP Sent",
        "OTP has been sent successfully to the customer."
      );
    } catch (err) {
      console.error(err);
      setRescheduleLoading(false);
      triggerModal("Error", "Something went wrong while sending OTP.");
    }
  };

  const handleUpdateSchedule = async () => {
    if (!reschedulingBooking) return;

    if (!enteredRescheduleOtp) {
      triggerModal("OTP Required", "Please enter OTP.");
      return;
    }

    try {
      setRescheduleLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "verify-reschedule-otp",
        {
          body: {
            booking_id: reschedulingBooking.id,
            otp: enteredRescheduleOtp,
            reason: rescheduleReason,
          },
        }
      );

      setRescheduleLoading(false);

      if (error || !data?.success) {
        triggerModal(
          "Verification Failed",
          data?.message || "Invalid OTP"
        );
        return;
      }

      setShowRescheduleModal(false);

      triggerModal(
        "Success",
        "Booking schedule updated successfully."
      );

      // Call the WhatsApp edge function silently in the background
      supabase.functions.invoke("send-booking-rescheduled", {
        body: {
          customer_name: reschedulingBooking.customer_name,
          service_name: reschedulingBooking.services?.[0]?.title || "Service",
          booking_id: reschedulingBooking.id,
          old_datetime: `${reschedulingBooking.booking_date} at ${reschedulingBooking.booking_time}`,
          new_datetime: `${rescheduleDate} at ${rescheduleTime}`,
          phone: reschedulingBooking.phone_number || reschedulingBooking.user_phone || reschedulingBooking.customer_phone
        }
      }).catch(err => console.error("Error sending reschedule WhatsApp:", err));

      fetchBookings();
    } catch (err) {
      console.error(err);
      setRescheduleLoading(false);
      triggerModal("Error", "Something went wrong.");
    }
  };

  const handleCancelBooking = async () => {
    if (!targetCancelBooking) return;

    try {
      setCancelLoading(true);

      const finalReason = cancelReasonInput.trim() || "Cancelled by Admin";
      const customEmailMessage = cancelReasonInput.trim()
        ? `We regret to inform you that your booking has been cancelled for the following reason:\n\n"${cancelReasonInput.trim()}"`
        : "We are sorry to inform you that your booking has been cancelled. We apologize for any inconvenience caused.";

      // 1. Update status in Supabase
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          work_status: "CANCELLED",
          cancel_time: new Date().toISOString(),
          cancel_reason: finalReason
        })
        .eq("id", targetCancelBooking.id);

      if (updateError) throw updateError;

      // 2. Send cancellation email via Edge Function
      const { error: functionError } = await supabase.functions.invoke(
        "send-cancellation-email",
        {
          body: {
            booking_id: targetCancelBooking.id,
            customer_name: targetCancelBooking.customer_name,
            email: targetCancelBooking.email,
            phone_number: targetCancelBooking.phone_number,
            service_title: targetCancelBooking.services?.[0]?.title || "Service",
            message: customEmailMessage
          },
        }
      );

      if (functionError) {
        console.warn("Email Edge Function Error:", functionError);
        // We don't throw here to ensure the UI updates even if email fails, 
        // but we'll log it.
      }

      // 3. Send cancellation WhatsApp message via Edge Function
      const { error: whatsappError } = await supabase.functions.invoke(
        "send-booking-cancellation-whatsapp",
        {
          body: {
            booking_id: targetCancelBooking.id,
            customer_name: targetCancelBooking.customer_name,
            customer_phone: targetCancelBooking.phone_number,
            service_title: targetCancelBooking.services?.[0]?.title || "Service",
            reason: finalReason
          },
        }
      );

      if (whatsappError) {
        console.warn("WhatsApp Edge Function Error:", whatsappError);
      }

      setShowCancelConfirm(false);
      setTargetCancelBooking(null);
      setCancelReasonInput("");

      triggerModal(
        "Booking Cancelled",
        "Booking has been successfully cancelled and notification mail has been sent."
      );

      fetchBookings();
    } catch (err) {
      console.error("Cancellation Error:", err);
      triggerModal("Error", "Failed to cancel the booking. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleAllotStaff = async (staff) => {
    if (!selectedBooking) {
      triggerModal("Booking Selection Required", "Please select a booking first to assign this staff member.");
      return;
    }

    if (staff.is_blocked === true) {
      triggerModal("Partner Blocked", "This staff member is currently blocked and cannot be assigned to bookings.");
      return;
    }

    setStaffLoading(true);

    const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
    let sOtp = selectedBooking.startotp || generateOtp();
    let eOtp = selectedBooking.endotp || generateOtp();
    while (sOtp === eOtp) eOtp = generateOtp();

    const { error } = await supabase
      .from("bookings")
      .update({
        assigned_staff_email: staff.email,
        staff_response: "APPROVED",
        work_status: "ASSIGNED",
        startotp: sOtp,
        endotp: eOtp,
        assigned_at: new Date().toISOString()
      })
      .eq("id", selectedBooking.id);

    setStaffLoading(false);
    if (!error) {
      setSelectedStaff(staff);
      window.dispatchEvent(
        new CustomEvent("staff-assigned-modal", {
          detail: {
            staffName: staff.name || staff.email,
            startOtp: sOtp,
            endOtp: eOtp,
          },
        })
      );
    } else {
      console.error("Error alloting staff:", error);
      triggerModal("Assignment Error", error.message || "Failed to allot staff. Please check your Supabase RLS policies and table schema.");
    }
  };

  const fetchBookings = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("booking_id, comment");

      const rMap = {};
      reviewsData?.forEach((r) => {
        if (r.booking_id) rMap[r.booking_id] = r.comment;
      });

      const bookingIds = data?.map((b) => b.id).filter(Boolean) || [];
      let upMap = {};
      let uploadEmails = [];
      if (bookingIds.length > 0) {
        const { data: uploadsData, error: uploadsError } = await supabase
          .from("service_uploads")
          .select("*")
          .in("booking_id", bookingIds);

        if (uploadsError) {
          console.error("Error fetching service_uploads:", uploadsError);
        } else if (uploadsData) {
          uploadsData.forEach((u) => {
            const email = u.staff_email || u.email;
            let parsedUploads = u.uploads;
            if (typeof parsedUploads === "string") {
              try {
                parsedUploads = JSON.parse(parsedUploads);
              } catch (err) {
                console.error("Error parsing service_uploads JSON string:", err);
              }
            }
            upMap[u.booking_id] = {
              uploads: parsedUploads,
              email: email
            };
            if (email) {
              uploadEmails.push(email);
            }
          });
        }
      }

      const emails = [
        ...(data?.map((b) => b.assigned_staff_email).filter(Boolean) || []),
        ...uploadEmails
      ];
      const uniqueEmails = [...new Set(emails)];

      let sMap = {};
      if (uniqueEmails.length) {
        const { data: staffData } = await supabase
          .from("staff_profile")
          .select("name, email")
          .in("email", uniqueEmails);

        staffData?.forEach((s) => (sMap[s.email] = s.name));
      }

      // UPDATE ALL STATE AT ONCE TO PREVENT FLICKERING
      setBookings(data || []);
      setReviewsMap(rMap);
      setStaffMap(sMap);
      setUploadsMap(upMap);

      const fetchCustomerChecklists = async () => {
        try {
          // 1. Fetch only from booking_checklists first (clean & reliable)
          const { data: checklistData, error: checklistErr } = await supabase
            .from("booking_checklists")
            .select("*")
            .order("updated_at", { ascending: false });

          console.log("Raw Checklist Data from Supabase:", checklistData);
          console.log("Checklist Error (if any):", checklistErr);

          if (checklistErr) {
            alert("Error fetching checklists: " + checklistErr.message);
            return;
          }

          if (checklistData && checklistData.length > 0) {
            // 2. Group items by booking_id and map with existing bookings array safely
            const grouped = Object.values(
              checklistData.reduce((acc, curr) => {
                if (!acc[curr.booking_id]) {
                  // Find matching booking from the main 'data' array
                  const matchedBooking = (data || []).find(b => String(b.id) === String(curr.booking_id));

                  acc[curr.booking_id] = {
                    booking_id: curr.booking_id,
                    created_at: curr.created_at,
                    bookings: matchedBooking || { customer_name: "N/A", phone: "N/A", service: "N/A" },
                    tasks: []
                  };
                }

                acc[curr.booking_id].tasks.push({
                  task_title: curr.task_title,
                  customer_completed: curr.customer_completed
                });

                return acc;
              }, {})
            );

            setCustomerChecklists(grouped);
          } else {
            setCustomerChecklists([]);
          }
        } catch (err) {
          console.error("Fetch Exception:", err);
        }
      };

      await fetchCustomerChecklists();

    } catch (error) {
      console.error("fetchBookings failed:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  /* ================= REFUND FUNCTION ================= */

  const calculateRecommendedRefund = (b, servicesList = []) => {
    if (!b) return null;

    const totalAmount = Number(String(b.total_amount || b.price || 0).replace(/[^0-9.]/g, '')) || 0;

    // Match service
    const matchedService = (servicesList || []).find(s =>
      (s.id && b.service_id && s.id === b.service_id) ||
      (s.title && b.services?.[0]?.title && s.title.toLowerCase().trim() === b.services[0].title.toLowerCase().trim()) ||
      (s.service_type && b.service_type && s.service_type.toUpperCase().trim() === b.service_type.toUpperCase().trim())
    );

    let cancellationFee = 99;
    if (matchedService && matchedService.cancellation_fee !== null && matchedService.cancellation_fee !== undefined) {
      cancellationFee = Number(matchedService.cancellation_fee);
    } else if (totalAmount >= 2000 || /deep/i.test(b.services?.[0]?.title || "") || /deep/i.test(b.service_type || "")) {
      cancellationFee = 299;
    }

    // Parse scheduled service date & time
    let scheduledDateTime = null;
    if (b.booking_date) {
      const datePart = String(b.booking_date).split("T")[0]; // YYYY-MM-DD
      const datePieces = datePart.split("-").map(Number);

      let hours = 9; // Default 9 AM if time missing
      let minutes = 0;
      if (b.booking_time) {
        const timeClean = String(b.booking_time).trim();
        const match = timeClean.match(/^(\d+)(?::(\d+))?\s*(am|pm)?$/i);
        if (match) {
          hours = parseInt(match[1], 10);
          minutes = match[2] ? parseInt(match[2], 10) : 0;
          const period = match[3] ? match[3].toLowerCase() : null;
          if (period === "pm" && hours < 12) hours += 12;
          if (period === "am" && hours === 12) hours = 0;
        }
      }

      if (datePieces.length === 3 && datePieces[0] && datePieces[1] && datePieces[2]) {
        scheduledDateTime = new Date(datePieces[0], datePieces[1] - 1, datePieces[2], hours, minutes);
      }
    }

    // Parse cancellation time
    let cancelDateTime = new Date();
    if (b.cancel_time) {
      cancelDateTime = new Date(b.cancel_time);
    } else if (b.updated_at) {
      cancelDateTime = new Date(b.updated_at);
    }

    // Difference in hours
    let diffInHours = 24;
    if (scheduledDateTime && !isNaN(scheduledDateTime.getTime()) && !isNaN(cancelDateTime.getTime())) {
      diffInHours = (scheduledDateTime.getTime() - cancelDateTime.getTime()) / (1000 * 60 * 60);
    }

    const isFullRefund = diffInHours >= 6;
    let recommendedAmount = totalAmount;
    let appliedFee = 0;

    if (!isFullRefund) {
      appliedFee = cancellationFee;
      recommendedAmount = Math.max(0, totalAmount - cancellationFee);
    }

    const roundedHours = Math.round(diffInHours * 10) / 10;
    const defaultNote = isFullRefund
      ? `Full refund applied (Cancelled ${roundedHours > 0 ? roundedHours + 'h' : 'in advance'} before service slot)`
      : `Cancelled within 6h of slot (${roundedHours}h left). Service cancellation fee of ₹${cancellationFee} applied.`;

    const scheduledTimeStr = scheduledDateTime
      ? scheduledDateTime.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) + " at " + scheduledDateTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })
      : (b.booking_date + " " + (b.booking_time || ""));

    const cancelTimeStr = cancelDateTime
      ? cancelDateTime.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) + " at " + cancelDateTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })
      : "N/A";

    return {
      totalAmount,
      cancellationFee,
      appliedFee,
      recommendedAmount,
      isFullRefund,
      diffInHours: roundedHours,
      defaultNote,
      scheduledTimeStr,
      cancelTimeStr
    };
  };

  const handleOpenInitiateRefund = (b) => {
    const calc = calculateRecommendedRefund(b, allServices);
    setInitiateData({
      booking: b,
      amount: String(calc.recommendedAmount),
      note: calc.defaultNote,
      calcDetails: calc
    });
    setShowInitiateModal(true);
  };

  const handleInitiateConfirm = async () => {
    if (!initiateData.booking || !initiateData.amount) return;

    setIsInitiating(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        refund_status: "REFUND_PENDING",
        refund_amount: parseFloat(initiateData.amount),
        refund_note: initiateData.note
      })
      .eq("id", initiateData.booking.id);

    if (!error) {
      setShowInitiateModal(false);
      triggerModal("Refund Initiated", "Success! The booking is now tracked in the Refund Management tab.");
      fetchBookings();
    } else {
      console.error("Initiate error:", error);
      triggerModal("Initiation Failed", "Failed to update refund status. Please try again.");
    }
    setIsInitiating(false);
  };

  const handleCompleteAutoRefund = async (booking) => {
    if (!booking.razorpay_payment_id) {
      triggerModal("Missing ID", "Razorpay Payment ID not found. Cannot process automatic refund.");
      return;
    }
    // Show custom confirm modal instead of window.confirm
    setPendingAutoRefundBooking(booking);
    setShowAutoRefundConfirm(true);
  };

  const confirmAutoRefund = async () => {
    const booking = pendingAutoRefundBooking;
    if (!booking) return;
    setShowAutoRefundConfirm(false);
    setPendingAutoRefundBooking(null);

    const rAmount = booking.refund_amount || booking.total_amount;
    setRefundingId(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-refund", {
        body: {
          payment_id: booking.razorpay_payment_id,
          amount: rAmount,
          booking_id: booking.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSuccessMessage(`Automatic refund successful! ID: ${data.refund_id}`);
        setShowCommonSuccess(true);

        // Send WhatsApp Refund Notification
        supabase.functions.invoke("send-payment-refund", {
          body: {
            customer_phone: booking.phone_number || booking.user_phone || booking.customer_phone,
            customer_name: booking.customer_name || booking.user_name || "Customer",
            refund_amount: String(rAmount),
            service_name: booking.services?.[0]?.title || "Our Service"
          }
        }).catch(err => console.error("Error sending refund WhatsApp:", err));

        fetchBookings();
      } else {
        triggerModal("Refund Failed", data?.message || "Razorpay could not process the refund.");
      }
    } catch (err) {
      console.error("Auto Refund Error:", err);
      let errorMsg = "Failed to contact the refund service.";
      if (err.context?.json?.message) {
        errorMsg = err.context.json.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      triggerModal("Refund Error", errorMsg);
    } finally {
      setRefundingId(null);
    }
  };

  const handleConfirmRefund = async () => {
    const booking = bookings.find(b => b.id === targetRefundId);
    const { error } = await supabase
      .from("bookings")
      .update({
        refund_status: "REFUNDED",
        refund_time: new Date().toISOString(),
      })
      .eq("id", targetRefundId);

    if (!error) {
      setShowRefundConfirm(false);
      setSuccessMessage("Refund marked as completed ✅");
      setShowCommonSuccess(true);

      // Send WhatsApp Refund Notification
      if (booking) {
        const rAmount = booking.refund_amount || booking.total_amount;
        supabase.functions.invoke("send-payment-refund", {
          body: {
            customer_phone: booking.phone_number || booking.user_phone || booking.customer_phone,
            customer_name: booking.customer_name || booking.user_name || "Customer",
            refund_amount: String(rAmount),
            service_name: booking.services?.[0]?.title || "Our Service"
          }
        }).catch(err => console.error("Error sending refund WhatsApp:", err));
      }

      fetchBookings();
    }
  };

  const updateRazorpayId = async (bookingId, newId) => {
    const { error } = await supabase
      .from("bookings")
      .update({ rayzorpay_refund_id: newId })
      .eq("id", bookingId);

    if (!error) {
      setEditingRazorpayId(null);
      setShowRazorpayDeleteConfirm(false);
      if (newId) {
        setSuccessMessage("razorpay refund id added successfull");
        setShowCommonSuccess(true);
      }
      fetchBookings();
    } else {
      console.error("Error updating rayzorpay_refund_id:", error);
    }
  };

  /* ================= STAFF FLOW ================= */
  const fetchAllStaffProfiles = async () => {
    setStaffLoading(true);
    const { data, error } = await supabase
      .from("staff_profile")
      .select("*");

    if (error) {
      console.error("Error fetching staff profiles:", error);
    }

    const mappedData = (data || []).map(staff => ({
      ...staff,
      account_holder_name: staff.BNF_NAME || "",
      account_number: staff.BENE_ACC_NO || "",
      ifsc_code: staff.BENE_IFSC || "",
      aadhar_number: staff.aadhar_number || "",
      tagged_partner: staff.tagged_partner || "",
    }));

    setStaffList(mappedData);
    setStaffLoading(false);
  };

  const handleToggleBlockStaff = async (staff) => {
    const isCurrentlyBlocked = Boolean(staff.is_blocked);
    const newBlockedStatus = !isCurrentlyBlocked;

    const { error } = await supabase
      .from("staff_profile")
      .update({ is_blocked: newBlockedStatus })
      .eq("id", staff.id);

    if (!error) {
      triggerModal(
        newBlockedStatus ? "Staff Blocked" : "Staff Unblocked",
        `Partner ${staff.name} has been ${newBlockedStatus ? "blocked" : "unblocked"} successfully.`
      );
      fetchAllStaffProfiles();
    } else {
      console.error("Error updating block status:", error);
      triggerModal("Error", `Failed to ${newBlockedStatus ? "block" : "unblock"} staff partner.`);
    }
  };

  const handleEditStaffClick = (staff) => {
    setEditStaffForm({
      id: staff.id,
      name: staff.name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      account_holder_name: staff.account_holder_name || "",
      account_number: staff.account_number || "",
      ifsc_code: staff.ifsc_code || "",
      bank_name: staff.bank_name || "",
      aadhar_number: staff.aadhar_number || "",
      tagged_partner: staff.tagged_partner || "",
      avatar_url: staff.avatar_url || "",
    });
    setEditStaffImage(null);
    setShowEditStaff(true);
  };

  const handleUpdateStaff = async () => {
    if (!editStaffForm.id) return;
    setIsUpdatingStaff(true);

    // Validate image ratio if a new image is selected
    if (editStaffImage) {
      const isValid = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width === img.height);
        img.src = URL.createObjectURL(editStaffImage);
      });
      if (!isValid) {
        setIsUpdatingStaff(false);
        triggerModal("Upload Error", "Image ratio must be 1:1");
        return;
      }
    }

    let imageUrl = editStaffForm.avatar_url || null;

    // Upload new image if selected
    if (editStaffImage) {
      const fileExt = editStaffImage.name.split(".").pop();
      const fileName = `${editStaffForm.name.replace(/\s+/g, "_")}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars").upload(fileName, editStaffImage, { upsert: true });

      if (!uploadError) {
        imageUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
      } else {
        console.error("Upload Error:", uploadError);
      }
    }

    const { error } = await supabase
      .from("staff_profile")
      .update({
        name: editStaffForm.name,
        phone: editStaffForm.phone,
        BNF_NAME: editStaffForm.account_holder_name,
        BENE_ACC_NO: editStaffForm.account_number,
        BENE_IFSC: editStaffForm.ifsc_code,
        bank_name: editStaffForm.bank_name,
        aadhar_number: editStaffForm.aadhar_number,
        tagged_partner: editStaffForm.tagged_partner,
        avatar_url: imageUrl,
      })
      .eq("id", editStaffForm.id);

    setIsUpdatingStaff(false);
    if (!error) {
      setShowEditStaff(false);
      setEditStaffImage(null);
      triggerModal("Success", "Staff profile updated successfully ✅");
      fetchAllStaffProfiles(); // Refresh the list
    } else {
      console.error("Update staff error:", error);
      triggerModal("Error", "Failed to update staff profile.");
    }
  };

  const fetchStaff = async (booking) => {
    setSelectedBooking(booking);
    setAssignDate(booking.booking_date || "");
    setShowStaff(true);
    setSelectedStaff(null);
    setAssignmentDone(false);

    await fetchAllStaffProfiles();
  };

  const generateOtp = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  /* ================= STAFF FLOW ================= */


  const getImages = (img) => {
    if (!img) return [];
    if (Array.isArray(img)) return img;
    if (typeof img === "string" && img.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(img);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If it's a string like "[Skipped]..." it might fail JSON parse, 
        // but we'll treat it as a single string outside the try/catch
      }
    }
    return [img];
  };

  const isImageUrl = (str) => {
    if (typeof str !== "string") return false;
    const s = str.toLowerCase().trim();
    return s.startsWith("http") || s.startsWith("https") || s.startsWith("data:image/");
  };


  const fetchStaffAvailability = async (email, name, date) => {
    try {
      setCalLoading(true);

      const { data, error } = await supabase
        .from("staff_monthly_availability")
        .select("*")
        .eq("staff_email", email);

      if (error) throw error;

      let mergedData = {};
      if (data && data.length > 0) {
        data.forEach((row) => {
          let rowData = row.calendar_data || row.calender_data || {};
          if (typeof rowData === "string") {
            try {
              rowData = JSON.parse(rowData);
            } catch {
              rowData = {};
            }
          }
          mergedData = { ...mergedData, ...rowData };
        });
      }
      setCalendarAvailability(mergedData);
    } catch (err) {
      console.error("Error fetching staff availability:", err);
      setCalendarAvailability({});
    } finally {
      setCalLoading(false);
    }
  };

  const handleOpenCalendar = (staff) => {
    setSelectedStaffForCalendar(staff);
    const now = new Date();
    setCalViewDate(now);
    setShowStaffCalendar(true);
    fetchStaffAvailability(staff.email, staff.name, now);
  };

  const handleViewEarnings = async (staff) => {
    if (!staff?.email) return;

    setEarningsStaff(staff);
    setShowEarnings(true);
    setSelectedEarningsMetric("total");
    setEarningsLoading(true);

    try {
      console.log("Fetching earnings for staff email:", staff.email.trim());

      // We no longer need to fetch the profile data as aggregates are calculated dynamically below

      // 2. Fetch ALL earnings from 'staff_earnings' to calculate accurate PAID totals
      const emailToSearch = staff.email.trim();
      const { data: rawEarnings, error: earnError } = await supabase
        .from("staff_earnings")
        .select("*")
        .ilike("staff_email", emailToSearch)
        .order("earned_at", { ascending: false });

      if (earnError) {
        console.error("Database error fetching breakdown:", earnError);
      }

      // 3. Process Aggregates (Strictly PAID Only)
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Calculate accurate current week number based on Sunday-start calendar
      const tempFirst = new Date(now.getFullYear(), now.getMonth(), 1);
      const tempSun = new Date(tempFirst);
      tempSun.setDate(tempSun.getDate() - tempSun.getDay());
      const diffDays = Math.floor((now - tempSun) / (1000 * 60 * 60 * 24));
      const currentWeekKey = `week${Math.floor(diffDays / 7) + 1}`;

      let totalPaid = 0;
      let monthlyPaid = 0;
      let weeklyPaid = 0;
      if (rawEarnings && rawEarnings.length > 0) {
        rawEarnings.forEach(record => {
          const status = (record.status || record.payment_status || "").toLowerCase();
          if (status === "paid") {
            const amt = parseFloat(record.AMOUNT || record.amount || 0);
            totalPaid += amt;

            const date = record.paid_at ? new Date(record.paid_at) : new Date(record.earned_at);
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            // Item week calculation
            const itemFirstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const itemFirstSun = new Date(itemFirstOfMonth);
            itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
            const itemDiff = Math.floor((date - itemFirstSun) / (1000 * 60 * 60 * 24));
            const wKey = `week${Math.floor(itemDiff / 7) + 1}`;

            // Current Period Totals
            if (mKey === currentMonthKey) {
              monthlyPaid += amt;
              if (wKey === currentWeekKey) {
                weeklyPaid += amt;
              }
            }
          }
        });
      }

      console.log("Calculated Paid Totals:", { weeklyPaid, monthlyPaid, totalPaid });

      const paidCount = rawEarnings?.filter(r => r.payment_status?.toLowerCase() === "paid").length || 0;
      const avgPerJob = paidCount > 0 ? (totalPaid / paidCount) : 0;

      setStaffEarnings({
        monthly: `₹${monthlyPaid.toLocaleString()}`,
        weekly: `₹${weeklyPaid.toLocaleString()}`,
        total: `₹${totalPaid.toLocaleString()}`,
        jobCount: paidCount,
        avgAmount: `₹${Math.round(avgPerJob).toLocaleString()}`
      });

      // 4. Enrich breakdown with booking info for display
      let formattedList = [];
      if (rawEarnings && rawEarnings.length > 0) {
        const bookingIds = rawEarnings.map(e => e.booking_id).filter(Boolean);
        let bMap = {};

        if (bookingIds.length > 0) {
          const { data: bData, error: bError } = await supabase
            .from("bookings")
            .select("id, booking_id, services, booking_date, customer_name")
            .or(`id.in.(${bookingIds.join(',')}),booking_id.in.(${bookingIds.join(',')})`);

          if (bError) console.error("Error fetching linked bookings:", bError);

          bData?.forEach(b => {
            const mainService = b.services?.[0]?.title || "Service";
            if (b.id) bMap[b.id] = { title: mainService, date: b.booking_date, customer: b.customer_name };
            if (b.booking_id) bMap[b.booking_id] = { title: mainService, date: b.booking_date, customer: b.customer_name };
          });
        }

        formattedList = rawEarnings.map(e => {
          const linkedBooking = bMap[e.booking_id];
          return {
            ...e,
            amount: parseFloat(e.AMOUNT || e.amount || 0),
            service_title: linkedBooking?.title || "Service Details",
            customer_name: linkedBooking?.customer || "N/A",
            booking_date: linkedBooking?.date || e.earned_at?.split("T")[0] || "N/A",
            status: e.status || e.payment_status || "pending",
            paid_date: e.paid_at
          };
        });
      }

      setEarningsList(formattedList);
      setEarningsLoading(false);
    } catch (err) {
      console.error("Critical error in handleViewEarnings:", err);
      setEarningsLoading(false);
    }
  };


  const handleViewStatus = async (booking) => {
    setSelectedBooking(booking);

    // We need the full staff profile for the view
    setStaffLoading(true);

    // Try to find in current staffList first
    let staff = staffList.find(s => s.email === booking.assigned_staff_email);

    if (!staff) {
      const { data } = await supabase
        .from("staff_profile")
        .select("id, name, email, phone, avatar_url")
        .eq("email", booking.assigned_staff_email)
        .maybeSingle();
      staff = data;
    }

    if (staff) {
      setSelectedStaff(staff);
    }
    setStaffLoading(false);
    setShowStaff(true);
    triggerModal("Waiting for Staff", "Waiting for the staff to accept the booking.");
  };

  const changeCalMonth = (offset) => {
    const newDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + offset, 1);
    setCalViewDate(newDate);
    fetchStaffAvailability(selectedStaffForCalendar.email, selectedStaffForCalendar.name, newDate);
  };

  const handleDeleteStaff = (staffId) => {
    setTargetStaffId(staffId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteBooking = (bookingId) => {
    setTargetBookingId(bookingId);
    setShowBookingDeleteConfirm(true);
  };

  const confirmDeleteBooking = async () => {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", targetBookingId);

    if (!error) {
      setShowBookingDeleteConfirm(false);
      fetchBookings();
    }
  };

  const confirmDeleteStaff = async () => {
    const targetStaff = staffList.find((s) => s.id === targetStaffId);
    if (!targetStaff) return;

    try {
      // Step A: Invoke Primary Edge Function
      let funcError = null;
      try {
        const invokeRes = await supabase.functions.invoke('delete-staff-user', {
          body: { email: targetStaff.email }
        });
        funcError = invokeRes.error;
      } catch (e) {
        funcError = e;
      }

      // Step B: Error Detection & Fallback
      if (funcError) {
        console.error("Primary Deletion Failed:", funcError);
        if (funcError.message?.includes("Invalid JWT") || funcError.message?.includes("Unauthorized") || funcError.status === 401) {
          try {
            const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();
            await fetch(`${supabaseFunctionsUrl}/delete-staff-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
              body: JSON.stringify({ email: targetStaff.email })
            });
          } catch (e) {
            console.error("Fallback Exception:", e);
          }
        }
      }

      // Just in case edge function fails or only deletes auth, delete from DB directly as well
      await supabase.from("staff_profile").delete().eq("id", targetStaffId);

      setStaffList((prev) =>
        prev.filter((staff) => staff.id !== targetStaffId),
      );
      setShowDeleteConfirm(false);
      triggerModal("Deleted", `${targetStaff.name} was deleted successfully`);
    } catch (err) {
      console.error("Critical Failure in confirmDeleteStaff:", err);
    }
  };

  const copyBookingDetails = (b) => {
    const staffName = staffMap[b.assigned_staff_email] || "Not Assigned";
    const locationValue = b.location_link || "N/A";
    const functionalUrl = (() => {
      if (!locationValue || locationValue === "N/A") return "N/A";
      if (locationValue.startsWith("http")) return locationValue;
      // Smart Fallback: Use only the first part if it's a Plus Code (has +), otherwise use the full address
      const target = locationValue.includes('+') ? locationValue.split(',')[0].trim() : locationValue;
      return `https://www.google.com/maps/place/${encodeURIComponent(target)}`;
    })();

    const plainText = [
      `Customer Name: ${b.customer_name || "N/A"}`,
      `Phone: ${b.phone_number || b.user_phone || b.customer_phone || "N/A"}`,
      `Address: ${b.full_address || "N/A"}`,
      `Location Link: ${functionalUrl}`,
      `Service: ${b.services?.[0]?.title || "N/A"}`,
      `Date: ${formatDate(b.booking_date) || "N/A"}`,
      `Time: ${b.booking_time || "N/A"}`,
      `Total Amount: ${b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}`,
      `Staff Name: ${staffName}`,
    ].join("\n");

    const htmlText = `
      Customer Name: ${b.customer_name || "N/A"}<br>
      Phone: ${b.phone_number || b.user_phone || b.customer_phone || "N/A"}<br>
      Address: ${b.full_address || "N/A"}<br>
      Location Link: ${(() => {
        if (!b.location_link || b.location_link === "N/A") return "N/A";
        if (b.location_link.startsWith("http")) return `<a href="${b.location_link}" style="color: #3b82f6; text-decoration: underline;">${b.location_link}</a>`;
        // Smart Fallback: Use only the first part if it's a Plus Code (has +), otherwise use the full address
        const target = b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link;
        const url = `https://www.google.com/maps/place/${encodeURIComponent(target)}`;
        return `<a href="${url}" style="color: #3b82f6; text-decoration: underline;">${b.location_link}</a>`;
      })()}<br>
      Service: ${b.services?.[0]?.title || "N/A"}<br>
      Date: ${formatDate(b.booking_date) || "N/A"}<br>
      Time: ${b.booking_time || "N/A"}<br>
      Total Amount: ${b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}<br>
      Staff Name: ${staffName}
    `;

    const handleSuccess = () => {
      setCopiedBookingId(b.id);
      setTimeout(() => setCopiedBookingId(null), 1500);
    };

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const data = [
          new ClipboardItem({
            "text/plain": new Blob([plainText], { type: "text/plain" }),
            "text/html": new Blob([htmlText], { type: "text/html" }),
          }),
        ];
        navigator.clipboard.write(data).then(handleSuccess).catch(() => {
          navigator.clipboard.writeText(plainText).then(handleSuccess);
        });
      } catch (err) {
        navigator.clipboard.writeText(plainText).then(handleSuccess);
      }
    } else {
      navigator.clipboard.writeText(plainText).then(handleSuccess);
    }
  };

  /* ================= TAB GROUPS ================= */
  const rescheduledBookings = bookings.filter((b) =>
    b.work_status?.toUpperCase() === "RESCHEDULED"
  );

  const refundPendingBookings = bookings.filter((b) =>
    b.work_status?.toUpperCase() !== "RESCHEDULED" &&
    ["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status)
  );

  const completedBookings = bookings.filter((b) =>
    (b.work_status?.toLowerCase() === "completed" || Boolean(b.work_ended_at)) &&
    b.work_status?.toUpperCase() !== "RESCHEDULED" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status)
  );

  const cancelledBookings = bookings.filter((b) =>
    b.work_status?.toLowerCase() === "cancelled" &&
    b.work_status?.toUpperCase() !== "RESCHEDULED" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status)
  );

  const assignedBookings = bookings.filter((b) =>
    b.work_status?.toUpperCase() === "ASSIGNED" &&
    b.work_status?.toLowerCase() !== "completed" &&
    !b.work_ended_at &&
    b.work_status?.toLowerCase() !== "cancelled" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status) &&
    b.work_status?.toUpperCase() !== "RESCHEDULED"
  );

  const rejectedBookings = bookings.filter((b) =>
    (b.staff_response?.trim()?.toUpperCase() === "REJECT" ||
      b.staff_response?.trim()?.toUpperCase() === "REJECTED") &&
    b.work_status?.toUpperCase() !== "ASSIGNED" &&
    b.work_status?.toLowerCase() !== "completed" &&
    !b.work_ended_at &&
    b.work_status?.toLowerCase() !== "cancelled" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status) &&
    b.work_status?.toUpperCase() !== "RESCHEDULED"
  );

  const waitingBookings = bookings.filter((b) =>
    b.work_status?.toUpperCase() !== "ASSIGNED" &&
    b.work_status?.toLowerCase() !== "cancelled" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status) &&
    b.work_status?.toLowerCase() !== "completed" &&
    !b.work_ended_at &&
    b.work_status?.toUpperCase() !== "RESCHEDULED" &&
    b.assigned_staff_email && b.staff_response?.trim()?.toUpperCase() === "PENDING"
  );

  const unassignedBookings = bookings.filter((b) =>
    b.work_status?.toUpperCase() !== "ASSIGNED" &&
    b.work_status?.toLowerCase() !== "cancelled" &&
    !["REFUND_PENDING", "REFUND_INITIATED", "REFUNDED"].includes(b.refund_status) &&
    b.work_status?.toLowerCase() !== "completed" &&
    !b.work_ended_at &&
    b.work_status?.toUpperCase() !== "RESCHEDULED" &&
    !(b.staff_response?.trim()?.toUpperCase() === "REJECT" || b.staff_response?.trim()?.toUpperCase() === "REJECTED") &&
    !(b.assigned_staff_email && b.staff_response?.trim()?.toUpperCase() === "PENDING")
  );



  const applyFilters = (data) =>
    data.filter((b) => {
      // Date Filter
      if (filterDate && b.booking_date !== filterDate) return false;

      // Time Filter
      if (filterTime) {
        if (normalizeTime(b.booking_time) !== filterTime) return false;
      }

      // Payment Status Filter
      if (filterPaymentStatus) {
        const statusLower = (b.payment_status || "").toLowerCase().trim();
        if (filterPaymentStatus === "Success") {
          if (statusLower !== "paid" && statusLower !== "captured") return false;
        } else if (filterPaymentStatus === "Pending") {
          if (statusLower !== "pending" && statusLower !== "" && statusLower !== "authorized") return false;
        } else if (filterPaymentStatus === "Failed") {
          if (statusLower !== "failed") return false;
        }
      }

      return true;
    });

  const getSortedList = (list, tab) => {
    return [...list].sort((a, b) => {
      let timeA, timeB;
      if (tab === "cancelled") {
        timeA = new Date(a.cancel_time || a.created_at).getTime();
        timeB = new Date(b.cancel_time || b.created_at).getTime();
      } else if (tab === "completed") {
        timeA = new Date(a.work_ended_at || a.created_at).getTime();
        timeB = new Date(b.work_ended_at || b.created_at).getTime();
      } else if (tab === "refund_management") {
        timeA = new Date(a.refund_time || a.created_at).getTime();
        timeB = new Date(b.refund_time || b.created_at).getTime();
      } else if (tab === "assigned") {
        timeA = new Date(a.assigned_at || a.created_at).getTime();
        timeB = new Date(b.assigned_at || b.created_at).getTime();
      } else {
        timeA = new Date(a.created_at).getTime();
        timeB = new Date(b.created_at).getTime();
      }
      return timeB - timeA;
    });
  };

  const visibleBookings =
    activeTab === "customer_checklist"
      ? customerChecklists
      : activeTab === "unassigned"
        ? getSortedList(applyFilters(unassignedBookings), "unassigned")
        : activeTab === "assigned"
          ? getSortedList(applyFilters(assignedBookings), "assigned")
          : activeTab === "rejected"
            ? getSortedList(applyFilters(rejectedBookings), "rejected")
            : activeTab === "waiting"
              ? getSortedList(applyFilters(waitingBookings), "waiting")
              : activeTab === "completed"
                ? getSortedList(applyFilters(completedBookings), "completed")
                : activeTab === "refund_management"
                  ? getSortedList(applyFilters(refundPendingBookings), "refund_management")
                  : activeTab === "rescheduled"
                    ? getSortedList(applyFilters(rescheduledBookings), "rescheduled")
                    : getSortedList(applyFilters(cancelledBookings), "cancelled");

  const totalPages = Math.ceil(visibleBookings.length / rowsPerPage);
  const paginatedBookings = visibleBookings.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  /* ================= STAFF CONFIRM SCREEN ================= */
  if (showStaff && selectedBooking && selectedStaff) {
    return (
      <div className="dashboard">
        <h2>Assign Staff</h2>

        <div className="staff-card" style={{ marginTop: "20px" }}>
          <p>
            <b>Name:</b> {selectedStaff.name}
          </p>
          <p>
            <b>Email:</b> {selectedStaff.email}
          </p>
          <p>
            <b>Phone:</b> {selectedStaff.phone}
          </p>
          {(() => {
            const currentB = bookings.find(b => String(b.id) === String(selectedBooking.id));
            const currentRespUpper = currentB?.staff_response?.trim()?.toUpperCase();
            const isApproved = currentRespUpper === "APPROVED";
            const isRejected = currentRespUpper === "REJECT" || currentRespUpper === "REJECTED";

            if (assignmentDone || isApproved || currentB?.work_status?.toUpperCase() === "ASSIGNED") {
              return (
                <button className="allot-btn" disabled>
                  Assigned
                </button>
              );
            }

            if (isRejected) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    className="allot-btn"
                    disabled
                    style={{
                      backgroundColor: "#ef4444",
                      color: "#ffffff",
                      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                      border: "none",
                      cursor: "default"
                    }}
                  >
                    Staff Rejected
                  </button>
                  <button
                    className="allot-btn"
                    onClick={() => setSelectedStaff(null)}
                    style={{
                      backgroundColor: "transparent",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer"
                    }}
                  >
                    Click to Re-Assign
                  </button>
                </div>
              );
            }

            return (
              <button
                className="allot-btn"
                onClick={() => {
                  triggerModal("Pending", "Waiting for the staff to accept the booking");
                }}
                style={{
                  opacity: 0.6,
                  cursor: "pointer"
                }}
              >
                Waiting for Acceptance...
              </button>
            );
          })()}

          <button
            className="allot-btn"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              margin: 0,
              padding: "4px 8px",
              fontSize: "12px",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCalendar(selectedStaff);
            }}
          >
            Calendar
          </button>
        </div>

        <div className="staff-back-center">
          <button
            className="allot-btn"
            onClick={() => {
              setShowStaff(false);
              setShowCommonModal(false);
            }}
          >
            Back to Bookings
          </button>
        </div>




        {showCommonModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999999,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "25px 35px",
                borderRadius: "16px",
                textAlign: "center",
                minWidth: "320px",
                maxWidth: "400px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                position: "relative",
              }}
            >
              <span
                onClick={() => setShowCommonModal(false)}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "16px",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#64748b",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                &times;
              </span>
              <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "700", color: "#1e293b" }}>
                {commonModalTitle}
              </h3>
              <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "16px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                {successMessage}
              </p>
              <button
                onClick={() => setShowCommonModal(false)}
                style={{
                  padding: "8px 28px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#facc15",
                  color: "#000",
                  fontWeight: "700",
                  fontSize: "14px"
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

  /* ================= STAFF EARNINGS SCREEN ================= */
  if (showEarnings && earningsStaff) {
    return (
      <div
        className="dashboard"
        style={{ paddingLeft: "80px", paddingRight: "80px" }}
        onClick={() => setSelectedEarningsMetric(null)}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          gap: "20px",
          flexWrap: "wrap"
        }}>
          <h2 style={{ margin: 0 }}>Earnings: {earningsStaff.name}</h2>
          <button
            className="allot-btn"
            style={{
              margin: 0
            }}
            onClick={() => {
              setShowEarnings(false);
              setEarningsStaff(null);
              setEarningsViewMode("summary");
              setSelectedEarningsMetric("total");
              setEarningsSearch("");
            }}
          >
            Back to Total Staff
          </button>
        </div>

        {earningsViewMode === "summary" ? (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="staff-grid" style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px"
            }}>
              {/* Per Job Earning Card */}
              <div
                className="staff-card"
                onClick={() => {
                  setSelectedEarningsMetric("average");
                }}
                style={{
                  padding: "20px 10px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: selectedEarningsMetric === "average" ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: selectedEarningsMetric === "average" ? "2px solid #3b82f6" : "2px solid transparent",
                  transform: selectedEarningsMetric === "average" ? "translateY(-5px)" : "none"
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "4px"
                }}>
                  <span style={{ fontSize: "20px" }}>🎯</span>
                </div>
                <h3 style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  margin: 0
                }}>Total Jobs</h3>
                {earningsLoading ? (
                  <div style={{ padding: "10px" }}><Loader /></div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <p style={{
                      fontSize: "30px",
                      fontWeight: "800",
                      color: "#f59e0b",
                      margin: "6px 0 0"
                    }}>{displayTotals.jobCount}</p>
                    <p style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#64748b",
                      margin: "2px 0 0"
                    }}>{displayTotals.avgAmount} Avg. per job</p>
                  </div>
                )}
              </div>

              {/* Weekly Earning Card */}
              <div
                className="staff-card"
                onClick={() => {
                  setSelectedEarningsMetric("weekly");
                }}
                style={{
                  padding: "30px 15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: selectedEarningsMetric === "weekly" ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: selectedEarningsMetric === "weekly" ? "2px solid #3b82f6" : "2px solid transparent",
                  transform: selectedEarningsMetric === "weekly" ? "translateY(-5px)" : "none"
                }}
              >
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>📅</span>
                </div>
                <h3 style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  margin: 0
                }}>{displayTotals.weekTitle || "Weekly Earning"}</h3>
                {earningsLoading ? (
                  <div style={{ padding: "10px" }}><Loader /></div>
                ) : (
                  <p style={{
                    fontSize: "30px",
                    fontWeight: "800",
                    color: "#22c55e",
                    margin: "8px 0 0"
                  }}>{displayTotals.weekly}</p>
                )}
              </div>

              {/* Monthly Earning Card */}
              <div
                className="staff-card"
                onClick={() => {
                  setSelectedEarningsMetric("monthly");
                }}
                style={{
                  padding: "30px 15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: selectedEarningsMetric === "monthly" ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: selectedEarningsMetric === "monthly" ? "2px solid #3b82f6" : "2px solid transparent",
                  transform: selectedEarningsMetric === "monthly" ? "translateY(-5px)" : "none"
                }}
              >
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>📊</span>
                </div>
                <h3 style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  margin: 0
                }}>{displayTotals.monthTitle || "Monthly Earning"}</h3>
                {earningsLoading ? (
                  <div style={{ padding: "10px" }}><Loader /></div>
                ) : (
                  <p style={{
                    fontSize: "30px",
                    fontWeight: "800",
                    color: "#1e293b",
                    margin: "8px 0 0"
                  }}>{displayTotals.monthly}</p>
                )}
              </div>

              {/* Total Earning Card */}
              <div
                className="staff-card"
                onClick={() => {
                  setSelectedEarningsMetric("total");
                }}
                style={{
                  padding: "30px 15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: selectedEarningsMetric === "total" ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: selectedEarningsMetric === "total" ? "2px solid #3b82f6" : "2px solid transparent",
                  transform: selectedEarningsMetric === "total" ? "translateY(-5px)" : "none"
                }}
              >
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#f0f9ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                </div>
                <h3 style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  margin: 0
                }}>Total Earning</h3>
                {earningsLoading ? (
                  <div style={{ padding: "10px" }}><Loader /></div>
                ) : (
                  <p style={{
                    fontSize: "30px",
                    fontWeight: "800",
                    color: "#3b82f6",
                    margin: "8px 0 0"
                  }}>{displayTotals.total}</p>
                )}
              </div>
            </div>

            {/* Breakdown Table (Moved to Summary) */}
            <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "40px" }}>
              <div style={{ padding: "20px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "700", fontSize: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly"
                    ? `${selectedEarningsMetric.toUpperCase()} BREAKDOWN`
                    : `${(selectedEarningsMetric || "total").toUpperCase()} BREAKDOWN`
                  }
                </span>
                <button
                  onClick={() => {
                    setSelectedEarningsMetric("total");
                    setEarningsSearch("");
                  }}
                  style={{ fontSize: "13px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}
                >Reset Filter</button>
              </div>

              {/* Search Bar */}
              <div style={{ padding: "15px 24px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search service or booking ID..."
                    value={earningsSearch}
                    onChange={(e) => setEarningsSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 15px 10px 35px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      outline: "none",
                      transition: "border-color 0.2s"
                    }}
                  />
                  {earningsSearch && (
                    <button
                      onClick={() => setEarningsSearch("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "#f1f5f9",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                        color: "#64748b"
                      }}
                    >✕</button>
                  )}
                </div>
                {earningsSearch && (
                  <button
                    onClick={() => setEarningsSearch("")}
                    style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                  >Clear Search</button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Service Name</th>
                      {selectedEarningsMetric === "weekly" && (
                        <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Week Info</th>
                      )}
                      {selectedEarningsMetric === "monthly" && (
                        <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Month Info</th>
                      )}
                      {selectedEarningsMetric === "average" && (
                        <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Customer</th>
                      )}
                      <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Booking Date</th>
                      <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Earned Date</th>
                      <th style={{ padding: "12px 24px", fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earningsLoading ? (
                      <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" || selectedEarningsMetric === "average" ? 5 : 4} style={{ padding: "40px", textAlign: "center" }}><Loader /></td></tr>
                    ) : (() => {
                      const listToDisplay = displayTotals.list;
                      const sorted = [...listToDisplay].sort((a, b) => {
                        const dateA = a.paid_at ? new Date(a.paid_at) : (a.paid_date ? new Date(a.paid_date) : new Date(a.earned_at));
                        const dateB = b.paid_at ? new Date(b.paid_at) : (b.paid_date ? new Date(b.paid_date) : new Date(b.earned_at));
                        return dateB - dateA;
                      });

                      return sorted.length > 0 ? (
                        sorted.map((item, idx) => {
                          const pAt = item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at);
                          const monthName = pAt.toLocaleString('default', { month: 'short' });

                          const itemFirstOfMonth = new Date(pAt.getFullYear(), pAt.getMonth(), 1);
                          const itemFirstSun = new Date(itemFirstOfMonth);
                          itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
                          const itemDiff = Math.floor((pAt - itemFirstSun) / (1000 * 60 * 60 * 24));
                          const weekNum = Math.floor(itemDiff / 7) + 1;
                          const dateNum = pAt.getDate();

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 24px" }}>
                                <div style={{ fontWeight: "700", color: "#1e293b", marginBottom: "4px", fontSize: "15px" }}>{item.service_title}</div>
                                <div style={{ fontSize: "12px", color: "#94a3b8" }}>ID: {item.booking_id?.slice(0, 8)}...</div>
                              </td>
                              {selectedEarningsMetric === "weekly" && (
                                <td style={{ padding: "12px 24px" }}>
                                  <div style={{ fontWeight: "600", color: "#334155", fontSize: "14px" }}>Week {weekNum}</div>
                                  <div style={{ fontSize: "12px", color: "#64748b" }}>{monthName} {dateNum}</div>
                                </td>
                              )}
                              {selectedEarningsMetric === "monthly" && (
                                <td style={{ padding: "12px 24px" }}>
                                  <div style={{ fontWeight: "600", color: "#334155", fontSize: "14px" }}>{monthName}</div>
                                  <div style={{ fontSize: "12px", color: "#64748b" }}>{pAt.getFullYear()}</div>
                                </td>
                              )}
                              {selectedEarningsMetric === "average" && (
                                <td style={{ padding: "12px 24px" }}>
                                  <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>{item.customer_name}</div>
                                </td>
                              )}
                              <td style={{ padding: "12px 24px", color: "#64748b", fontSize: "13px" }}>{item.booking_date}</td>
                              <td style={{ padding: "12px 24px" }}>
                                <div style={{ fontWeight: "700", color: "#22c55e", fontSize: "13px", marginBottom: "4px" }}>Paid</div>
                                {item.paid_date && (
                                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                    {new Date(item.paid_date).toLocaleDateString()}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "12px 24px", textAlign: "right", fontWeight: "800", color: "#22c55e", fontSize: "16px" }}>
                                ₹{parseFloat(item.amount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" || selectedEarningsMetric === "average" ? 5 : 4} style={{ padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: "18px" }}>No paid earnings found for this period.</td></tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Breakdown View drill-down */
          <div style={{ animation: "fadeIn 0.3s ease" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEarningsViewMode("summary");
                setEarningsSearch("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#f1f5f9",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                fontWeight: "700",
                color: "#475569",
                cursor: "pointer",
                marginBottom: "30px",
                fontSize: "14px"
              }}
            >
              <span>←</span> Back to Summary
            </button>

            <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "800", fontSize: "16px", color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly"
                    ? `${selectedEarningsMetric.toUpperCase()} BREAKDOWN`
                    : `${selectedEarningsMetric.toUpperCase()} BREAKDOWN`
                  }
                </span>
                <button
                  onClick={() => {
                    setSelectedEarningsMetric("total");
                    setEarningsSearch("");
                  }}
                  style={{ fontSize: "13px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}
                >Reset Filter</button>
              </div>

              {/* Search Bar */}
              <div style={{ padding: "15px 24px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search service or booking ID..."
                    value={earningsSearch}
                    onChange={(e) => setEarningsSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 15px 10px 35px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      outline: "none",
                      transition: "border-color 0.2s"
                    }}
                  />
                  {earningsSearch && (
                    <button
                      onClick={() => setEarningsSearch("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "#f1f5f9",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                        color: "#64748b"
                      }}
                    >✕</button>
                  )}
                </div>
                {earningsSearch && (
                  <button
                    onClick={() => setEarningsSearch("")}
                    style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                  >Clear Search</button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Service Name</th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Booking Date</th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Earned Date</th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earningsLoading ? (
                      <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center" }}><Loader /></td></tr>
                    ) : (() => {
                      const now = new Date();
                      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                      // Accurate Week Calculation
                      const tempFirst = new Date(now.getFullYear(), now.getMonth(), 1);
                      const tempSun = new Date(tempFirst);
                      tempSun.setDate(tempSun.getDate() - tempSun.getDay());
                      const diffDays = Math.floor((now - tempSun) / (1000 * 60 * 60 * 24));
                      const currentWeekKey = `week${Math.floor(diffDays / 7) + 1}`;

                      const sTerm = earningsSearch.trim().toLowerCase();

                      const filtered = earningsList.filter(item => {
                        if (item.status !== "paid") return false;

                        const pPayoutDate = item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at);
                        const mKey = `${pPayoutDate.getFullYear()}-${String(pPayoutDate.getMonth() + 1).padStart(2, '0')}`;

                        // Item week calculation
                        const itemFirstOfMonth = new Date(pPayoutDate.getFullYear(), pPayoutDate.getMonth(), 1);
                        const itemFirstSun = new Date(itemFirstOfMonth);
                        itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
                        const itemDiff = Math.floor((pPayoutDate - itemFirstSun) / (1000 * 60 * 60 * 24));
                        const wKey = `week${Math.floor(itemDiff / 7) + 1}`;

                        // SEARCH MODE
                        if (sTerm) {
                          const monthMatch = monthNames.findIndex(m => m.startsWith(sTerm));

                          const itemFirstOfMonth = new Date(pPayoutDate.getFullYear(), pPayoutDate.getMonth(), 1);
                          const itemFirstSun = new Date(itemFirstOfMonth);
                          itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
                          const itemDiff = Math.floor((pPayoutDate - itemFirstSun) / (1000 * 60 * 60 * 24));
                          const weekNum = Math.floor(itemDiff / 7) + 1;
                          const weekStr = `week ${weekNum}`;
                          const weekShortStr = `w${weekNum}`;

                          if (monthMatch !== -1) {
                            return pPayoutDate.getMonth() === monthMatch;
                          } else if (sTerm.includes("week") || (sTerm.startsWith("w") && !isNaN(sTerm.slice(1)))) {
                            return weekStr.includes(sTerm) || weekShortStr.includes(sTerm);
                          } else {
                            return (
                              item.service_title?.toLowerCase().includes(sTerm) ||
                              item.booking_id?.toLowerCase().includes(sTerm)
                            );
                          }
                        }

                        // DEFAULT MODE
                        if (selectedEarningsMetric === "weekly") {
                          return mKey === currentMonthKey && wKey === currentWeekKey;
                        } else if (selectedEarningsMetric === "monthly") {
                          return mKey === currentMonthKey;
                        }
                        return true;
                      });

                      return filtered.length > 0 ? (
                        filtered.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "17px", marginBottom: "4px" }}>{item.service_title}</div>
                              <div style={{ fontSize: "14px", color: "#94a3b8" }}>ID: {item.booking_id?.slice(0, 8)}...</div>
                            </td>
                            <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "17px" }}>{item.booking_date}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ fontWeight: "700", color: "#22c55e", fontSize: "16px", marginBottom: "4px" }}>Paid</div>
                              {item.paid_date && (
                                <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                                  {new Date(item.paid_date).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "800", color: "#22c55e", fontSize: "18px" }}>
                              ₹{parseFloat(item.amount).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>No paid earnings found for this period.</td></tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}




        {/* ✅ REUSABLE COMMON NOTIFICATION MODAL */}
        {showCommonModal && (
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
              zIndex: 10000,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "30px 40px",
                borderRadius: "20px",
                textAlign: "center",
                minWidth: "350px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                position: "relative",
              }}
            >
              <span
                onClick={() => setShowCommonModal(false)}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "20px",
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#64748b",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  lineHeight: 1
                }}
              >
                &times;
              </span>
              <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                {commonModalTitle}
              </h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "15px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                {successMessage}
              </p>
              <button
                onClick={() => setShowCommonModal(false)}
                style={{
                  padding: "10px 30px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#facc15",
                  color: "#1e293b",
                  fontWeight: "700",
                  fontSize: "14px"
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

  /* ================= STAFF LIST SCREEN ================= */
  if (showStaff) {
    return (
      <div className="dashboard services-wrapper" style={{ padding: "20px 60px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#fff",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px"
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Total Staff</h2>
            {selectedBooking && (() => {
              const bookingPincodeMatch = (selectedBooking.full_address || selectedBooking.location_link || "").match(/\b\d{6}\b/);
              const bookingPincode = bookingPincodeMatch ? bookingPincodeMatch[0] : null;
              const activeHubForBooking = hubLocations.find(
                (h) => h.is_active !== false && String(h.pincode).trim() === String(bookingPincode).trim()
              );
              const bookingHubName = activeHubForBooking?.hub_name || null;
              const bookingCategoryTitle = (
                selectedBooking?.services?.[0]?.title ||
                selectedBooking?.service_name ||
                selectedBooking?.category_name ||
                selectedBooking?.service ||
                ""
              ).toUpperCase();

              return (
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <span>📍 <strong>Booking Pincode:</strong> {bookingPincode || "N/A"}</span>
                  {bookingHubName && <span>🏢 <strong>Hub:</strong> <strong style={{ color: "#d97706" }}>{bookingHubName}</strong></span>}
                  {bookingCategoryTitle && <span>🏷️ <strong>Service:</strong> {bookingCategoryTitle}</span>}
                </div>
              );
            })()}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* View / Status Filter (Left side of Distance Radius) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
              <span>👁️ View:</span>
              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: "700",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Staff</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Radius Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
              <span>🚗 Distance Radius:</span>
              <select
                value={maxRadiusKm}
                onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: "700",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer"
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
                <option value={0}>All Distances</option>
              </select>
            </div>

            <button
              onClick={() => setShowStaffMapView(!showStaffMapView)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: showStaffMapView ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                fontSize: "13px",
                fontWeight: "700",
                backgroundColor: showStaffMapView ? "#2563eb" : "#f8fafc",
                color: showStaffMapView ? "#ffffff" : "#1e293b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease"
              }}
            >
              🗺️ {showStaffMapView ? "Hide Map View" : "Map View"}
            </button>

            <button
              className="allot-btn"
              onClick={() => setShowStaff(false)}
              style={{ margin: 0 }}
            >
              Back to Bookings
            </button>
          </div>
        </div>

        <div className="booking-table-wrapper" style={{ width: "100%", margin: "20px 0" }}>
          <table className="booking-table">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "15px 20px" }}>PHOTO</th>
                <th style={{ padding: "15px 20px" }}>STAFF NAME</th>
                <th style={{ padding: "15px 20px" }}>CONTACT INFO</th>
                <th style={{ padding: "15px 20px", textAlign: "center" }}>HUB NAME</th>
                <th style={{ padding: "15px 20px" }}>BOOKINGS TO COMPLETE</th>
                <th style={{ padding: "15px 20px", width: "180px" }}>ASSIGN STAFF</th>
                <th style={{ padding: "15px 20px", width: "160px", textAlign: "center" }}>CURRENT STATUS</th>
                <th style={{ padding: "15px 20px", width: "160px", textAlign: "center" }}>LIVE LOCATION</th>
                {selectedBooking && (
                  <th style={{ padding: "15px 20px", width: "140px", textAlign: "center" }}>DISTANCE</th>
                )}
                <th style={{ padding: "15px 20px", textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {staffLoading ? (
                <tr>
                  <td colSpan={selectedBooking ? "10" : "9"} style={{ padding: "60px", textAlign: "center" }}>
                    <Loader />
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={selectedBooking ? "10" : "9"} style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                    <h3>There is no staff</h3>
                  </td>
                </tr>
              ) : (() => {
                // Haversine Distance Calculator Helper
                const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
                  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
                  const nLat1 = parseFloat(lat1);
                  const nLon1 = parseFloat(lon1);
                  const nLat2 = parseFloat(lat2);
                  const nLon2 = parseFloat(lon2);
                  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

                  const R = 6371; // Earth radius in km
                  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
                  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((nLat1 * Math.PI) / 180) *
                    Math.cos((nLat2 * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  const d = R * c;
                  if (d < 0.1) {
                    return d === 0 ? 0 : Math.round(d * 100) / 100;
                  }
                  return Math.round(d * 10) / 10;
                };

                // Helper to extract (lat, lng) from objects, Google Maps URLs, or coordinate strings
                const extractCoordinates = (target) => {
                  if (!target) return null;

                  // Direct object numeric/string lat & lng properties
                  if (typeof target === "object") {
                    const lat = target.latitude ?? target.lat ?? target.work_start_lat;
                    const lng = target.longitude ?? target.lng ?? target.work_start_lng;
                    if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                      return { lat: parseFloat(lat), lng: parseFloat(lng) };
                    }
                  }

                  // Search through string representations
                  const searchStrings = typeof target === "string"
                    ? [target]
                    : [
                      target.work_start_location,
                      target.location_link,
                      target.full_address,
                      target.location,
                      target.customer_location,
                      target.address,
                      target.live_location
                    ].filter(Boolean);

                  for (const str of searchStrings) {
                    if (typeof str !== "string") continue;

                    // Match pattern like "17.4538865, 78.3058372" or inside Google Maps URLs (q=17.45..., @17.45...)
                    const match = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                    if (match) {
                      const lat = parseFloat(match[1]);
                      const lng = parseFloat(match[2]);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        return { lat, lng };
                      }
                    }
                  }

                  return null;
                };

                // Parse Booking Pincode & Coordinates
                const bookingPincodeMatch = selectedBooking
                  ? (selectedBooking.full_address || selectedBooking.location_link || "").match(/\b\d{6}\b/)
                  : null;
                const bookingPincode = bookingPincodeMatch ? bookingPincodeMatch[0] : null;

                // Match Active Hub for Booking Pincode
                const activeHubForBooking = hubLocations.find(
                  (h) => h.is_active !== false && String(h.pincode).trim() === String(bookingPincode).trim()
                );
                const bookingHubName = activeHubForBooking?.hub_name || null;

                let bookingCoords = extractCoordinates(selectedBooking);
                if (!bookingCoords && activeHubForBooking) {
                  bookingCoords = extractCoordinates(activeHubForBooking);
                }
                const bookingLat = bookingCoords?.lat ?? null;
                const bookingLng = bookingCoords?.lng ?? null;

                // Match Category via public.services table and public.hub_category_counts table
                const rawBookingServiceTitle = (
                  selectedBooking?.services?.[0]?.title ||
                  selectedBooking?.service_name ||
                  selectedBooking?.category_name ||
                  selectedBooking?.service ||
                  ""
                ).trim();

                // Map booking service title to service_type in Supabase 'services' table
                const matchedServiceObj = allServices.find((s) => {
                  if (!s.title || !rawBookingServiceTitle) return false;
                  const sTitle = s.title.toLowerCase().trim();
                  const bTitle = rawBookingServiceTitle.toLowerCase().trim();
                  return sTitle === bTitle || sTitle.includes(bTitle) || bTitle.includes(sTitle);
                });

                // Target category / service_type (e.g. "KITCHEN", "BATHROOM", "BALCONY CLEANING", "DEEP CLEANING")
                const targetServiceType = (matchedServiceObj?.service_type || rawBookingServiceTitle).toUpperCase().trim();

                // Helper to check if a hub_category_counts row category matches targetServiceType exactly
                const isCategoryMatch = (serviceTypeStr, hubCatStr) => {
                  if (!serviceTypeStr || !hubCatStr) return false;

                  const tNorm = serviceTypeStr.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
                  const hNorm = hubCatStr.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();

                  return tNorm === hNorm;
                };

                // Find all category records in hubCategoryCounts across all hubs matching targetServiceType
                const matchingCategoryRecords = hubCategoryCounts.filter((hc) =>
                  isCategoryMatch(targetServiceType, hc.category)
                );

                // Extract all staff emails assigned to this category across all hubs
                const categoryAssignedEmails = Array.from(
                  new Set(
                    matchingCategoryRecords.flatMap((hc) =>
                      hc.assigned_staff
                        ? hc.assigned_staff.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
                        : []
                    )
                  )
                );

                // Specific Hub match for badge & top priority
                const matchingHubCat = matchingCategoryRecords.find((hc) => {
                  if (!bookingHubName || !hc.hub) return false;
                  return hc.hub.toLowerCase().trim() === bookingHubName.toLowerCase().trim();
                });

                const hubAssignedEmails = matchingHubCat?.assigned_staff
                  ? matchingHubCat.assigned_staff.split(",").map((e) => e.trim().toLowerCase())
                  : [];

                // Strictly filter staff to display category-wise assigned staff across hubs for any selected booking
                const categoryFilteredStaffList = selectedBooking
                  ? staffList.filter((staff) => staff.email && categoryAssignedEmails.includes(staff.email.toLowerCase().trim()))
                  : staffList;

                // Process and Sort Staff by Nearest Distance and Hub Priority
                const sortedStaffList = [...categoryFilteredStaffList].map((staff) => {
                  // Fetch staff assigned hub name from hubCategoryCounts (prioritize matching booking hub if assigned to multiple)
                  const staffHubRecord = hubCategoryCounts.find((hc) => {
                    if (!hc.assigned_staff || !staff.email) return false;
                    const emails = hc.assigned_staff.split(",").map((e) => e.trim().toLowerCase());
                    return emails.includes(staff.email.toLowerCase().trim()) && hc.hub && hc.hub.toLowerCase().trim() === (bookingHubName || "").toLowerCase().trim();
                  }) || hubCategoryCounts.find((hc) => {
                    if (!hc.assigned_staff || !staff.email) return false;
                    const emails = hc.assigned_staff.split(",").map((e) => e.trim().toLowerCase());
                    return emails.includes(staff.email.toLowerCase().trim());
                  });
                  const hubName = staffHubRecord?.hub || "N/A";

                  // Extract staff coordinates (check live_location from staff_profile first)
                  let staffCoords = extractCoordinates(staff.live_location || staff);
                  if (!staffCoords) {
                    const matchedHub = hubLocations.find(
                      (h) => h.hub_name && hubName && h.hub_name.toLowerCase().trim() === hubName.toLowerCase().trim()
                    );
                    if (matchedHub) {
                      staffCoords = extractCoordinates(matchedHub.location || matchedHub.location_link || matchedHub);
                    }
                  }

                  const staffLat = staffCoords?.lat ?? null;
                  const staffLng = staffCoords?.lng ?? null;

                  const distKm = calculateHaversineDistanceKm(bookingLat, bookingLng, staffLat, staffLng);
                  const isHubMatched = staff.email && hubAssignedEmails.includes(staff.email.toLowerCase().trim());

                  return {
                    ...staff,
                    distKm,
                    isHubMatched,
                    hubName
                  };
                }).sort((a, b) => {
                  // Priority 1: Hub & Category Assigned Staff
                  if (a.isHubMatched && !b.isHubMatched) return -1;
                  if (!a.isHubMatched && b.isHubMatched) return 1;

                  // Priority 2: Within Radius (nearest to farthest)
                  const aWithinRadius = a.distKm !== null && (maxRadiusKm === 0 || a.distKm <= maxRadiusKm);
                  const bWithinRadius = b.distKm !== null && (maxRadiusKm === 0 || b.distKm <= maxRadiusKm);

                  if (aWithinRadius && !bWithinRadius) return -1;
                  if (!aWithinRadius && bWithinRadius) return 1;

                  // Priority 3: Sort by Distance Ascending (nearest staff on top!)
                  if (a.distKm !== null && b.distKm !== null) {
                    return a.distKm - b.distKm;
                  }
                  if (a.distKm !== null) return -1;
                  if (b.distKm !== null) return 1;

                  // Fallback: Name
                  return (a.name || "").localeCompare(b.name || "");
                });

                const filteredStaffListByStatus = sortedStaffList.filter((staff) => {
                  if (staffStatusFilter === "all" || !staffStatusFilter) return true;

                  const isBlocked = staff.is_blocked === true || staff.is_blocked === "true";
                  const isStaffAvailable =
                    staff.is_available !== false &&
                    staff.is_available !== "false" &&
                    staff.is_available !== "FALSE" &&
                    staff.is_active !== false &&
                    !isBlocked;

                  if (staffStatusFilter === "blocked") {
                    return isBlocked;
                  }
                  if (staffStatusFilter === "available") {
                    return !isBlocked && isStaffAvailable;
                  }
                  if (staffStatusFilter === "unavailable") {
                    return !isBlocked && !isStaffAvailable;
                  }
                  return true;
                });

                const staffRows = filteredStaffListByStatus.map((staff) => {
                  const latestB = selectedBooking ? bookings.find((b) => String(b.id) === String(selectedBooking?.id)) : null;
                  const hasActiveAssignment = bookings.some((b) =>
                    b.assigned_staff_email === staff.email &&
                    b.work_status?.toUpperCase() === "ASSIGNED" &&
                    b.id !== selectedBooking?.id
                  );
                  const isCurrentlyAssigned = latestB
                    ? staff.email === latestB?.assigned_staff_email
                    : hasActiveAssignment;
                  const isRejectionMatch = isCurrentlyAssigned &&
                    (latestB?.staff_response?.trim()?.toUpperCase() === "REJECT" ||
                      latestB?.staff_response?.trim()?.toUpperCase() === "REJECTED");

                  // Calculate Real-time Staff Status (Working / Available / Unavailable)
                  const isActivelyWorkingOnJob = bookings.some((b) => {
                    if (!staff.email || b.assigned_staff_email?.toLowerCase().trim() !== staff.email?.toLowerCase().trim()) return false;
                    return Boolean(b.work_started_at) && !b.work_ended_at;
                  });

                  let realtimeStatusKey = "available";
                  let realtimeStatusLabel = "🟢 Available";
                  let realtimeStatusColor = "#15803d";

                  const isStaffAvailable =
                    staff.is_available !== false &&
                    staff.is_available !== "false" &&
                    staff.is_available !== "FALSE" &&
                    staff.is_active !== false &&
                    staff.is_blocked !== true;

                  if (isActivelyWorkingOnJob) {
                    realtimeStatusKey = "working";
                    realtimeStatusLabel = "🟠 Working";
                    realtimeStatusColor = "#c2410c";
                  } else if (!isStaffAvailable) {
                    realtimeStatusKey = "unavailable";
                    realtimeStatusLabel = "🔴 Unavailable";
                    realtimeStatusColor = "#b91c1c";
                  } else {
                    realtimeStatusKey = "available";
                    realtimeStatusLabel = "🟢 Available";
                    realtimeStatusColor = "#15803d";
                  }

                  // Sync calculated status to staff_profile in Supabase asynchronously
                  if (staff.id && staff.status !== realtimeStatusKey) {
                    supabase
                      .from("staff_profile")
                      .update({ status: realtimeStatusKey })
                      .eq("id", staff.id)
                      .then(({ error }) => {
                        if (error) {
                          console.warn("Notice: staff_profile status sync fallback:", error.message);
                        }
                      });
                  }

                  const normalizeDateString = (dStr) => {
                    if (!dStr) return "";
                    const str = String(dStr).trim();
                    const parts = str.split("T")[0].split(/[/-]/);
                    if (parts.length === 3) {
                      let p0 = parts[0].padStart(2, '0');
                      let p1 = parts[1].padStart(2, '0');
                      let p2 = parts[2];
                      if (p2.length === 2) p2 = "20" + p2;
                      if (p0.length === 4) {
                        return `${p2.padStart(2, '0')}-${p1}-${p0}`;
                      }
                      return `${p0}-${p1}-${p2}`;
                    }
                    return str.toLowerCase();
                  };

                  const selectedDateNormalized = selectedBooking?.booking_date
                    ? normalizeDateString(selectedBooking.booking_date)
                    : null;

                  const pendingBookingsForStaff = bookings.filter((b) => {
                    if (!staff.email || b.assigned_staff_email?.toLowerCase().trim() !== staff.email?.toLowerCase().trim()) return false;

                    // Exclude the current selected booking itself
                    if (selectedBooking && String(b.id) === String(selectedBooking.id)) return false;

                    const workStatus = (b.work_status || "").toUpperCase();
                    const mainStatus = (b.status || "").toUpperCase();
                    const paymentStatus = (b.payment_status || "").toUpperCase();

                    if (
                      workStatus === "COMPLETED" || mainStatus === "COMPLETED" ||
                      workStatus === "CANCELLED" || mainStatus === "CANCELLED" ||
                      workStatus === "WORK_ENDED" || mainStatus === "WORK_ENDED" ||
                      workStatus === "FAILED" || mainStatus === "FAILED" ||
                      paymentStatus === "PAYMENT FAILED" || paymentStatus === "FAILED" ||
                      b.work_ended_at
                    ) {
                      return false;
                    }

                    const isActive = (
                      workStatus === "ASSIGNED" || workStatus === "PENDING" || workStatus === "STARTED" || workStatus === "IN_PROGRESS" ||
                      mainStatus === "ASSIGNED" || mainStatus === "PENDING" || mainStatus === "STARTED" || mainStatus === "IN_PROGRESS" ||
                      (!workStatus && !mainStatus)
                    );

                    if (!isActive) return false;

                    // Filter for the exact date of the selected booking being allotted!
                    if (selectedDateNormalized) {
                      const bDateNorm = normalizeDateString(b.booking_date);
                      return bDateNorm === selectedDateNormalized;
                    }

                    return true;
                  });

                  return (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isRejectionMatch ? "#fff1f2" : "transparent"
                      }}
                    >
                      {/* Photo */}
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          {staff.avatar_url ? (
                            <img
                              src={staff.avatar_url}
                              alt={staff.name}
                              onClick={() => setPreviewAvatarUrl(staff.avatar_url)}
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "2px solid #facc15",
                                cursor: "pointer",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "50%",
                                background: "#facc15",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#000",
                              }}
                            >
                              {staff.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Staff Name */}
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "15px" }}>{staff.name}</span>
                          {staff.is_blocked === true && (
                            <span style={{
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fee2e2",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}>
                              BLOCKED
                            </span>
                          )}
                          {staff.isHubMatched && (
                            <span style={{
                              background: "#fef3c7",
                              color: "#d97706",
                              border: "1px solid #fde047",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}>
                              📍 Hub Partner
                            </span>
                          )}
                          {selectedBooking && staff.distKm !== null && (
                            <span style={{
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}>
                              🚗 {staff.distKm} km away
                            </span>
                          )}
                        </div>
                        {isRejectionMatch && (
                          <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>
                            REJECTED BOOKING
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "2px" }}>{staff.email}</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>{staff.phone}</div>
                      </td>

                      {/* Hub Name */}
                      <td style={{ padding: "12px 20px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: staff.hubName && staff.hubName !== "N/A" ? "#fff7ed" : "#f1f5f9",
                            color: staff.hubName && staff.hubName !== "N/A" ? "#c2410c" : "#64748b",
                            border: staff.hubName && staff.hubName !== "N/A" ? "1px solid #ffedd5" : "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "13px",
                            fontWeight: "700"
                          }}
                        >
                          {staff.hubName || "N/A"}
                        </span>
                      </td>

                      {/* Bookings to Complete */}
                      <td style={{ padding: "14px 16px", minWidth: "320px", verticalAlign: "middle", textAlign: "center" }}>
                        {pendingBookingsForStaff.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                            <div style={{ fontSize: "11px", fontWeight: "800", color: "#854d0e", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>
                              📋 Bookings on {selectedBooking?.booking_date || "Selected Date"} ({pendingBookingsForStaff.length}):
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto", width: "100%", paddingRight: "4px" }}>
                              {pendingBookingsForStaff.map((pBook, pIdx) => {
                                const serviceName =
                                  pBook.services?.[0]?.title ||
                                  pBook.service_name ||
                                  pBook.category_name ||
                                  pBook.service ||
                                  "N/A";
                                const bDate = pBook.booking_date || "N/A";
                                const bTime = pBook.booking_time || pBook.time || "N/A";
                                const statusText = pBook.work_status || pBook.status || "ASSIGNED";

                                return (
                                  <div
                                    key={pBook.id || pIdx}
                                    style={{
                                      backgroundColor: "#fffdf0",
                                      border: "1px solid #fef08a",
                                      borderRadius: "8px",
                                      padding: "8px 12px",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                      textAlign: "center"
                                    }}
                                  >
                                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13px", marginBottom: "4px" }}>
                                      {serviceName}
                                    </div>
                                    <div style={{ color: "#475569", fontSize: "12px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "4px" }}>
                                      <span>📅 <strong>Date:</strong> {bDate}</span>
                                      <span>⏰ <strong>Time:</strong> {bTime}</span>
                                    </div>
                                    <div>
                                      <span
                                        style={{
                                          display: "inline-block",
                                          backgroundColor: statusText.toUpperCase() === "PENDING" ? "#fff7ed" : "#f0f9ff",
                                          color: statusText.toUpperCase() === "PENDING" ? "#c2410c" : "#0369a1",
                                          border: statusText.toUpperCase() === "PENDING" ? "1px solid #ffedd5" : "1px solid #bae6fd",
                                          borderRadius: "4px",
                                          padding: "2px 8px",
                                          fontSize: "11px",
                                          fontWeight: "700"
                                        }}
                                      >
                                        Status: {statusText}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                backgroundColor: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "13px",
                                fontWeight: "600",
                                textAlign: "center"
                              }}
                            >
                              ✓ Free on {selectedBooking?.booking_date || "Selected Date"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Assign Staff */}
                      <td style={{ padding: "12px 20px", width: "180px" }}>
                        <button
                          className="allot-btn"
                          style={{
                            margin: 0,
                            padding: "8px 14px",
                            fontSize: "13px",
                            fontWeight: "700",
                            opacity: staff.is_blocked === true ? 0.7 : 1,
                            cursor: staff.is_blocked === true ? "not-allowed" : "pointer",
                            backgroundColor: staff.is_blocked === true ? "#fee2e2" : "#facc15",
                            color: staff.is_blocked === true ? "#dc2626" : "#1e293b",
                            border: staff.is_blocked === true ? "1px solid #fecaca" : "none",
                            width: "100%",
                            borderRadius: "8px"
                          }}
                          disabled={staff.is_blocked === true}
                          onClick={() => handleAllotStaff(staff)}
                        >
                          {staff.is_blocked === true ? "Blocked Partner" : "Assign Staff"}
                        </button>
                      </td>

                      {/* Current Status */}
                      <td style={{ padding: "12px 20px", width: "160px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              textAlign: "center",
                              color: realtimeStatusColor,
                              fontSize: "14px",
                              fontWeight: "700",
                              letterSpacing: "0.3px",
                              padding: "2px 0"
                            }}
                          >
                            {realtimeStatusLabel}
                          </span>
                          <span
                            onClick={() => handleOpenDutyLogs(staff)}
                            style={{
                              background: "#f0fdf4",
                              color: "#15803d",
                              border: "1px solid #bbf7d0",
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "6px 14px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                              marginTop: "2px"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dcfce7";
                              e.currentTarget.style.transform = "scale(1.03)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f0fdf4";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                            title="Click to view daily, weekly, monthly working hours & duty logs"
                          >
                            ⏱️ Duty Logs
                          </span>
                        </div>
                      </td>

                      {/* Live Location */}
                      <td style={{ padding: "12px 20px", width: "190px", textAlign: "center" }}>
                        <LiveLocationCell locationStr={staff.live_location} />
                      </td>

                      {/* Distance */}
                      {selectedBooking && (
                        <td style={{ padding: "12px 20px", width: "140px", textAlign: "center", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                          {staff.distKm !== null && staff.distKm !== undefined ? `${staff.distKm} km` : "N/A"}
                        </td>
                      )}

                      {/* Actions */}
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }}>
                          <button
                            title="View Earning"
                            style={{
                              background: "#fffbeb",
                              color: "#d97706",
                              border: "1px solid #fef3c7",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fef3c7";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#fffbeb";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleViewEarnings(staff)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="M6 13l8.5 8" /><path d="M6 13h3a5 5 0 0 0 5-5 5 5 0 0 0-5-5" /></svg>
                          </button>
                          <button
                            title="Availability Calendar"
                            style={{
                              background: "#f0f9ff",
                              color: "#0284c7",
                              border: "1px solid #e0f2fe",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#e0f2fe";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f0f9ff";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleOpenCalendar(staff)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                          </button>
                          <button
                            title="Duty Logs & Working Hours"
                            style={{
                              background: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dcfce7";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f0fdf4";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleOpenDutyLogs(staff)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </button>
                          <button
                            title="Edit Profile"
                            style={{
                              background: "#f8fafc",
                              color: "#475569",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f1f5f9";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleEditStaffClick(staff)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {/* Block / Unblock Button */}
                          <button
                            title={staff.is_blocked === true ? "Unblock Partner" : "Block Partner"}
                            style={{
                              background: staff.is_blocked === true ? "#ecfdf5" : "#fef2f2",
                              color: staff.is_blocked === true ? "#10b981" : "#dc2626",
                              border: staff.is_blocked === true ? "1px solid #a7f3d0" : "1px solid #fee2e2",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = staff.is_blocked === true ? "#d1fae5" : "#fee2e2";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = staff.is_blocked === true ? "#ecfdf5" : "#fef2f2";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleToggleBlockStaff(staff)}
                          >
                            {staff.is_blocked === true ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </button>
                          <button
                            title="Delete Staff"
                            style={{
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fee2e2",
                              borderRadius: "8px",
                              width: "34px",
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fee2e2";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#fef2f2";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });

                return (
                  <>
                    {filteredStaffListByStatus.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
                          No staff found for status "{staffStatusFilter}".
                        </td>
                      </tr>
                    ) : (
                      staffRows
                    )}
                    {showStaffMapView && (
                      <StaffMapViewModal
                        bookingLat={bookingLat}
                        bookingLng={bookingLng}
                        bookingPincode={bookingPincode}
                        bookingHubName={bookingHubName}
                        maxRadiusKm={maxRadiusKm}
                        sortedStaffList={filteredStaffListByStatus}
                        hubLocations={hubLocations}
                        onClose={() => setShowStaffMapView(false)}
                      />
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>


        {/* ✅ ADD DELETE MODAL HERE */}
        {previewAvatarUrl && (
          <div
            onClick={() => setPreviewAvatarUrl(null)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              cursor: "zoom-out",
            }}
          >
            <span
              onClick={() => setPreviewAvatarUrl(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "28px",
                fontSize: "36px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
                lineHeight: 1,
              }}
            >
              &times;
            </span>
            <img
              src={previewAvatarUrl}
              alt="Staff profile"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: "12px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                objectFit: "contain",
                cursor: "default",
              }}
            />
          </div>
        )}

        {/* ✅ ADD DELETE MODAL HERE */}
        {showDeleteConfirm && (
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
                padding: "30px",
                borderRadius: "16px",
                textAlign: "center",
                minWidth: "350px",
                maxWidth: "400px",
                position: "relative",
                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              }}
            >
              {/* Close (X) Button */}
              <span
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "20px",
                  fontSize: "26px",
                  fontWeight: "700",
                  color: "#94a3b8",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  lineHeight: 1
                }}
                onMouseEnter={(e) => (e.target.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.target.style.color = "#94a3b8")}
              >
                &times;
              </span>

              <h3 style={{ margin: "0 0 15px", fontSize: "22px", fontWeight: "700", color: "#1e293b" }}>Confirm Delete</h3>
              <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "16px" }}>Do you want to delete this staff?</p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "15px",
                }}
              >
                <button
                  onClick={confirmDeleteStaff}
                  style={{
                    padding: "10px 30px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "#facc15",
                    color: "#000",
                    fontWeight: "600",
                    fontSize: "15px",
                    transition: "transform 0.1s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.transform = "scale(1.02)"}
                  onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                >
                  OK
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: "10px 25px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: "600",
                    fontSize: "15px",
                    transition: "background 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f1f5f9"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f8fafc"}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAFF CALENDAR MODAL */}
        {showStaffCalendar && selectedStaffForCalendar && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 10000,
              }}
              onClick={() => setShowStaffCalendar(false)}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#fff",
                borderRadius: "24px",
                padding: "24px",
                width: "90%",
                maxWidth: "400px",
                zIndex: 10001,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ width: "24px" }} /> {/* Spacer */}
                <img src={neatifyLogo} alt="Logo" style={{ height: "40px" }} />
                <button
                  onClick={() => setShowStaffCalendar(false)}
                  style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#1e293b" }}
                >
                  ✕
                </button>
              </div>

              <h2 style={{ fontSize: "20px", fontWeight: "700", textAlign: "center", margin: "0 0 20px" }}>Staff Availability Calendar</h2>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <div style={{ flex: 1, background: "#22c55e", color: "#fff", padding: "10px", borderRadius: "12px", textAlign: "center", fontWeight: "600" }}>Available</div>
                <div style={{ flex: 1, background: "#ef4444", color: "#fff", padding: "10px", borderRadius: "12px", textAlign: "center", fontWeight: "600" }}>Not Available</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <button onClick={() => changeCalMonth(-1)} style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: "18px", cursor: "pointer" }}>◀</button>
                <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#1e293b" }}>
                  {calViewDate.toLocaleString('default', { month: 'long' })} {calViewDate.getFullYear()}
                </h3>
                <button onClick={() => changeCalMonth(1)} style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: "18px", cursor: "pointer" }}>▶</button>
              </div>

              <div style={{ position: "relative" }}>
                {calLoading && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)", zIndex: 1, borderRadius: "8px" }}>
                    <Loader />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center" }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", marginBottom: "8px" }}>{day}</div>
                  ))}
                  {(() => {
                    const days = [];
                    const firstDay = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), 1).getDay();
                    const totalDays = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 0).getDate();
                    const prevMonthDays = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), 0).getDate();

                    // Prev month padding
                    for (let i = firstDay - 1; i >= 0; i--) {
                      days.push(<div key={`prev-${i}`} style={{ color: "#e2e8f0", fontSize: "14px", padding: "8px" }}>{prevMonthDays - i}</div>);
                    }

                    // Current month days
                    for (let d = 1; d <= totalDays; d++) {
                      const dateStr = `${calViewDate.getFullYear()}-${String(calViewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const unpaddedDateStr = `${calViewDate.getFullYear()}-${calViewDate.getMonth() + 1}-${d}`;

                      // Support both padded and unpadded keys
                      const status = calendarAvailability?.[dateStr] ||
                        calendarAvailability?.[unpaddedDateStr] ||
                        calendarAvailability?.[String(d)] ||
                        calendarAvailability?.[d];

                      const statusLower = status?.toString().toLowerCase().trim() || "";

                      const isAvailable = statusLower === "available";
                      const isNotAvailable = statusLower === "not_available" || statusLower === "not available";

                      days.push(
                        <div
                          key={d}
                          style={{
                            fontSize: "14px",
                            padding: "8px",
                            borderRadius: "50%",
                            background: isAvailable ? "#22c55e" : (isNotAvailable ? "#ef4444" : "none"),
                            color: (isAvailable || isNotAvailable) ? "#fff" : "#1e293b",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "38px",
                            height: "38px",
                            margin: "auto"
                          }}
                        >
                          {d}
                        </div>
                      );
                    }
                    return days;
                  })()}
                </div>
              </div>

              <button
                style={{
                  width: "100%",
                  background: "#facc15",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "16px",
                  fontWeight: "700",
                  marginTop: "24px",
                  cursor: "pointer"
                }}
                onClick={() => setShowStaffCalendar(false)}
              >
                Close
              </button>
            </div>
          </>
        )}
        {/* EDIT STAFF MODAL */}
        {showEditStaff && (
          <div className="modal-overlay">
            <div className="modal-card">
              <span className="modal-close" onClick={() => setShowEditStaff(false)}>✕</span>
              <h3 className="modal-title">Edit Staff Profile</h3>

              <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "5px" }}>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "5px", fontWeight: "600" }}>BASIC DETAILS</p>
                <div style={{ marginBottom: "15px", textAlign: "center" }}>
                  {editStaffImage || editStaffForm.avatar_url ? (
                    <img
                      src={editStaffImage ? URL.createObjectURL(editStaffImage) : editStaffForm.avatar_url}
                      alt="Avatar"
                      style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #facc15" }}
                    />
                  ) : (
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: "24px", color: "#94a3b8" }}>
                      {editStaffForm.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    id="edit-staff-avatar"
                    hidden
                    accept="image/*"
                    onChange={(e) => setEditStaffImage(e.target.files[0])}
                  />
                  <label htmlFor="edit-staff-avatar" style={{ display: "block", fontSize: "12px", color: "#3b82f6", marginTop: "8px", cursor: "pointer", fontWeight: "600" }}>
                    Change Photo
                  </label>
                </div>
                <input
                  className="auth-input"
                  placeholder="Name"
                  value={editStaffForm.name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                />
                <input
                  className="auth-input"
                  placeholder="Phone"
                  value={editStaffForm.phone}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                />

                <p style={{ fontSize: "12px", color: "#64748b", margin: "15px 0 5px", fontWeight: "600" }}>BANK DETAILS</p>
                <input
                  className="auth-input"
                  placeholder="Account Holder Name"
                  value={editStaffForm.account_holder_name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, account_holder_name: e.target.value })}
                />
                <input
                  className="auth-input"
                  placeholder="Account Number"
                  value={editStaffForm.account_number}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, account_number: e.target.value })}
                />
                <input
                  className="auth-input"
                  placeholder="IFSC Code"
                  value={editStaffForm.ifsc_code}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, ifsc_code: e.target.value.toUpperCase() })}
                />
                <input
                  className="auth-input"
                  placeholder="Bank Name"
                  value={editStaffForm.bank_name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, bank_name: e.target.value })}
                />
                <p style={{ fontSize: "12px", color: "#64748b", margin: "15px 0 5px", fontWeight: "600" }}>ADDITIONAL DETAILS</p>
                <input
                  className="auth-input"
                  placeholder="Aadhar Number"
                  value={editStaffForm.aadhar_number}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, aadhar_number: e.target.value })}
                />
                <input
                  className="auth-input"
                  placeholder="Tagged Partner"
                  value={editStaffForm.tagged_partner}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, tagged_partner: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  className="auth-button"
                  style={{ flex: 1, margin: 0 }}
                  onClick={handleUpdateStaff}
                  disabled={isUpdatingStaff}
                >
                  {isUpdatingStaff ? "Updating..." : "Save Changes"}
                </button>
                <button
                  className="auth-button"
                  style={{ flex: 1, margin: 0, backgroundColor: "#facc15", color: "#000" }}
                  onClick={() => setShowEditStaff(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ REUSABLE COMMON NOTIFICATION MODAL */}
        {showCommonModal && (
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
              zIndex: 10000,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "30px 40px",
                borderRadius: "20px",
                textAlign: "center",
                minWidth: "350px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                position: "relative",
              }}
            >
              {/* CLOSE X MARK */}
              <span
                onClick={() => setShowCommonModal(false)}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "20px",
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#64748b",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  lineHeight: 1
                }}
                onMouseEnter={(e) => (e.target.style.color = "#1e293b")}
                onMouseLeave={(e) => (e.target.style.color = "#64748b")}
              >
                &times;
              </span>
              <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                {commonModalTitle}
              </h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "15px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                {successMessage}
              </p>

              <button
                onClick={() => setShowCommonModal(false)}
                style={{
                  padding: "10px 30px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#facc15",
                  color: "#1e293b",
                  fontWeight: "700",
                  fontSize: "14px",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* ✅ STAFF DUTY LOGS & WORKING HOURS MODAL */}
        {renderChecklistTasksModal()}
        {renderDutyLogsModal()}
      </div>
    );
  }

  /* ================= BOOKINGS TABLE ================= */

  return (
    <div className="dashboard services-wrapper">
      {(loading || staffLoading) && <Loader />}

      {/* Header with Title and Global Filters */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "30px",
        position: "relative",
        zIndex: 20
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", color: "#000", fontWeight: "800" }}>No of Bookings</h2>
          <h1 style={{ margin: "5px 0 0", fontSize: "32px", fontWeight: "800", color: "#000" }}>{bookings.length}</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            style={{
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              outline: "none",
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              color: filterDate ? "#000" : "#94a3b8",
              fontFamily: "inherit"
            }}
          />

          <div style={{ position: "relative" }} ref={timeDropdownRef}>
            <div
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              style={{
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: "14px",
                color: filterTime ? "#000" : "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "38px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                minWidth: "120px",
                justifyContent: "space-between"
              }}
            >
              <span style={{ fontWeight: filterTime ? "700" : "500" }}>{filterTime || "HH : MM"}</span>
              <span style={{ fontSize: "16px", opacity: 0.6 }}>🕒</span>
            </div>

            {showTimeDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "6px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                display: "flex",
                padding: "10px",
                gap: "8px",
                zIndex: 2000
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", marginBottom: "4px" }}>HH</span>
                  <select
                    size="8"
                    value={(() => {
                      if (!filterTime) return "";
                      const match = filterTime.match(/^(\d{1,2}):/);
                      if (!match) return "";
                      let h = parseInt(match[1]);
                      const merid = filterTime.split(" ")[1];
                      if (merid === "pm" && h !== 12) h += 12;
                      if (merid === "am" && h === 12) h = 0;
                      return h;
                    })()}
                    onChange={(e) => {
                      const h = parseInt(e.target.value);
                      const m = filterTime ? filterTime.split(":")[1].split(" ")[0] : "00";
                      const meridian = h >= 12 ? "pm" : "am";
                      const h12 = h % 12 || 12;
                      setFilterTime(`${h12}:${m} ${meridian}`);
                    }}
                    className="custom-time-select"
                    style={{ border: "1px solid #f1f5f9", borderRadius: "8px", padding: "4px", outline: "none", background: "#f8fafc", width: "55px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i} style={{ padding: "4px", textAlign: "center" }}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", marginBottom: "4px" }}>MM</span>
                  <select
                    size="8"
                    value={filterTime ? filterTime.split(":")[1].split(" ")[0] : ""}
                    onChange={(e) => {
                      const m = e.target.value;
                      let hStr = "12";
                      let merid = "am";
                      if (filterTime) {
                        hStr = filterTime.split(":")[0];
                        merid = filterTime.split(" ")[1];
                      }
                      setFilterTime(`${hStr}:${m} ${merid}`);
                    }}
                    className="custom-time-select"
                    style={{ border: "1px solid #f1f5f9", borderRadius: "8px", padding: "4px", outline: "none", background: "#f8fafc", width: "55px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')} style={{ padding: "4px", textAlign: "center" }}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>

              </div>
            )}
          </div>

          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            style={{
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              outline: "none",
              fontSize: "15px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            <option value="">Payment Tracking</option>
            <option value="Success">Success</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>

          <button
            className="allot-btn"
            style={{
              margin: 0,
              padding: "8px 20px",
              height: "auto",
              borderRadius: "10px"
            }}
            onClick={() => {
              setFilterDate("");
              setFilterTime("");
              setFilterPaymentStatus("");
            }}
          >
            Clear Filter
          </button>

          <button
            onClick={() => {
              const s = generateOtp();
              let e = generateOtp();
              while (s === e) e = generateOtp();
              setManualBookingData({ ...manualBookingData, startotp: s, endotp: e });
              setShowManualModal(true);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#22c55e",
              color: "#fff",
              fontWeight: "700",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.2)",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            + Create Manual Booking
          </button>
        </div>
      </div>

      {/* Tabs Row (Now on its own line) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: "10px",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "5px"
        }}
      >
        <div className="dashboard-tabs" style={{ margin: 0, gap: "30px" }}>
          <span
            className={activeTab === "unassigned" ? "active" : ""}
            onClick={() => setActiveTab("unassigned")}
          >
            Unassigned ({unassignedBookings.length})
          </span>
          <span
            className={activeTab === "assigned" ? "active" : ""}
            onClick={() => setActiveTab("assigned")}
          >
            Assigned ({assignedBookings.length})
          </span>
          <span
            className={activeTab === "completed" ? "active" : ""}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({completedBookings.length})
          </span>
          <span
            className={activeTab === "rescheduled" ? "active" : ""}
            onClick={() => setActiveTab("rescheduled")}
          >
            Rescheduled ({rescheduledBookings.length})
          </span>
          <span
            className={activeTab === "cancelled" ? "active" : ""}
            onClick={() => setActiveTab("cancelled")}
          >
            Cancelled ({cancelledBookings.length})
          </span>
          <span
            className={activeTab === "refund_management" ? "active" : ""}
            onClick={() => setActiveTab("refund_management")}
          >
            Refund Management ({refundPendingBookings.length})
          </span>
          <span
            className={activeTab === "customer_checklist" ? "active" : ""}
            onClick={() => setActiveTab("customer_checklist")}
          >
            Customer Checklist ({customerChecklists.length})
          </span>
        </div>
      </div>

      <div className="booking-table-wrapper">
        <table className="booking-table">
          <thead>
            {activeTab === "completed" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "100px" }}>Platform</th>
                <th style={{ minWidth: "120px" }}>Total Amount</th>
                <th style={{ minWidth: "130px" }}>Payment Status</th>
                <th style={{ minWidth: "180px" }}>Transaction ID</th>
                <th style={{ minWidth: "160px" }}>Customer Name</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "180px" }}>Service Title</th>
                <th style={{ minWidth: "120px" }}>Service Price</th>
                <th style={{ minWidth: "100px" }}>Time</th>
                <th style={{ minWidth: "160px" }}>Service Ended</th>
                <th style={{ minWidth: "350px" }}>Full Address</th>
                <th style={{ minWidth: "160px" }}>Location</th>
                <th style={{ minWidth: "160px" }}>Staff Name</th>
                <th style={{ minWidth: "200px" }}>Staff Email</th>
                <th style={{ minWidth: "250px" }}>Feedback</th>
                <th style={{ minWidth: "100px" }}>Start Image</th>
                <th style={{ minWidth: "100px" }}>End Image</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
                <th style={{ minWidth: "80px" }}>Copy</th>
              </tr>
            ) : activeTab === "refund_management" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "160px" }}>Customer Name</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "180px" }}>Service</th>
                <th style={{ minWidth: "120px" }}>Service Price</th>
                <th style={{ minWidth: "120px" }}>Refund Amount</th>
                <th style={{ minWidth: "250px" }}>Reason Note</th>
                <th style={{ minWidth: "140px" }}>Action</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
              </tr>
            ) : activeTab === "customer_checklist" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "160px" }}>Customer Name</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "180px" }}>Service Title</th>
                <th style={{ minWidth: "200px" }}>Task Title</th>
                <th style={{ minWidth: "130px" }}>Customer Status</th>
                <th style={{ minWidth: "200px", textAlign: "left", paddingLeft: "12px" }}>
                  Work Done By (Staff Email)
                </th>
              </tr>
            ) : activeTab === "cancelled" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "100px" }}>Platform</th>
                <th style={{ minWidth: "120px" }}>Total Amount</th>
                <th style={{ minWidth: "130px" }}>Payment Status</th>
                <th style={{ minWidth: "160px" }}>Customer Name</th>
                <th style={{ minWidth: "200px" }}>Email</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "350px" }}>Full Address</th>
                <th style={{ minWidth: "160px" }}>Location Link</th>
                <th style={{ minWidth: "180px" }}>Service</th>
                <th style={{ minWidth: "120px" }}>Date</th>
                <th style={{ minWidth: "100px" }}>Time</th>
                <th style={{ minWidth: "180px" }}>Transaction ID</th>
                <th style={{ minWidth: "200px" }}>Razorpay Refund ID</th>
                <th style={{ minWidth: "130px" }}>Status</th>
                <th style={{ minWidth: "160px" }}>Cancel Time</th>
                <th style={{ minWidth: "250px" }}>Cancel Reason</th>
                <th style={{ minWidth: "130px" }}>Refund Status</th>
                <th style={{ minWidth: "140px" }}>Action</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
                <th style={{ minWidth: "80px" }}>Copy</th>
              </tr>
            ) : activeTab === "rescheduled" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "100px" }}>Platform</th>
                <th style={{ minWidth: "120px" }}>Total Amount</th>
                <th style={{ minWidth: "130px" }}>Payment Status</th>
                <th style={{ minWidth: "180px" }}>Customer</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "200px" }}>Email</th>
                <th style={{ minWidth: "350px" }}>Full Address</th>
                <th style={{ minWidth: "160px" }}>Location</th>
                <th style={{ minWidth: "180px" }}>Service</th>
                <th style={{ minWidth: "180px" }}>Original Schedule</th>
                <th style={{ minWidth: "180px" }}>New Schedule</th>
                <th style={{ minWidth: "250px" }}>Reschedule Reason</th>
                <th style={{ minWidth: "160px" }}>Assigned Staff</th>
                <th style={{ minWidth: "140px" }}>Action</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
                <th style={{ minWidth: "80px" }}>Copy</th>
              </tr>
            ) : activeTab === "unassigned" ? (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "100px" }}>Platform</th>
                <th style={{ minWidth: "120px" }}>Total Amount</th>
                <th style={{ minWidth: "130px" }}>Payment Status</th>
                <th style={{ minWidth: "180px" }}>Transaction ID</th>
                <th style={{ minWidth: "160px" }}>Customer</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "200px" }}>Email</th>
                <th style={{ minWidth: "350px" }}>Full Address</th>
                <th style={{ minWidth: "160px" }}>Location</th>
                <th style={{ minWidth: "180px" }}>Service</th>
                <th style={{ minWidth: "250px" }}>Add-on</th>
                <th style={{ minWidth: "120px" }}>Date</th>
                <th style={{ minWidth: "100px" }}>Time</th>
                <th style={{ minWidth: "120px" }}>Final Price</th>
                <th style={{ minWidth: "140px" }}>Advance Amount</th>
                <th style={{ minWidth: "140px" }}>Pending Amount</th>
                <th style={{ minWidth: "250px" }}>Remarks</th>
                <th style={{ minWidth: "160px" }}>Assigned Staff</th>
                <th style={{ minWidth: "140px" }}>Action</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
                <th style={{ minWidth: "80px" }}>Copy</th>
              </tr>
            ) : (
              <tr>
                <th style={{ minWidth: "160px" }}>Created At</th>
                <th style={{ minWidth: "100px" }}>Platform</th>
                <th style={{ minWidth: "120px" }}>Total Amount</th>
                <th style={{ minWidth: "130px" }}>Payment Status</th>
                <th style={{ minWidth: "180px" }}>Transaction ID</th>
                <th style={{ minWidth: "160px" }}>Customer</th>
                <th style={{ minWidth: "130px" }}>Phone</th>
                <th style={{ minWidth: "200px" }}>Email</th>
                <th style={{ minWidth: "350px" }}>Full Address</th>
                <th style={{ minWidth: "160px" }}>Location</th>
                <th style={{ minWidth: "180px" }}>Service</th>
                <th style={{ minWidth: "120px" }}>Date</th>
                <th style={{ minWidth: "100px" }}>Time</th>
                <th style={{ minWidth: "160px" }}>Assigned Staff</th>
                <th style={{ minWidth: "140px" }}>Action</th>
                <th style={{ minWidth: "80px" }}>Delete</th>
                <th style={{ minWidth: "80px" }}>Copy</th>
              </tr>
            )}
          </thead>

          <tbody>
            {activeTab === "completed"
              ? paginatedBookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="date-time-container">
                      <span className="date-part">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                      </span>
                      <span className="time-part">
                        {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                      </span>
                    </div>
                  </td>
                  <td>{b.platform || "N/A"}</td>
                  <td style={{ fontWeight: "700", color: "#0f172a" }}>
                    {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                  </td>
                  <td>
                    {(() => {
                      const status = (b.payment_status || "").toLowerCase();
                      if (status === "paid" || status === "captured") return <span style={{ color: "#22c55e", fontWeight: "700" }}>Success</span>;
                      if (status === "failed") return <span style={{ color: "#ef4444", fontWeight: "700" }}>Failed</span>;
                      return <span style={{ color: "#eab308", fontWeight: "700" }}>Pending</span>;
                    })()}
                  </td>
                  <td>{b.razorpay_payment_id || "N/A"}</td>
                  <td>{b.customer_name}</td>
                  <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                  <td>{b.services?.[0]?.title}</td>
                  <td>{b.services?.[0]?.price}</td>
                  <td>{b.booking_time}</td>
                  <td>
                    {b.work_ended_at
                      ? new Date(b.work_ended_at).toLocaleString("en-IN")
                      : "N/A"}
                  </td>
                  <td>
                    {b.full_address ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.full_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6", textDecoration: "underline" }}
                      >
                        {b.full_address}
                      </a>
                    ) : "N/A"}
                  </td>
                  <td>
                    {b.location_link && b.location_link !== "N/A" ? (
                      <a
                        href={b.location_link.startsWith("http") ? b.location_link : `https://www.google.com/maps/place/${encodeURIComponent(b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6", textDecoration: "underline", display: "inline-block", maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
                        title={b.location_link}
                      >
                        {b.location_link}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  {(() => {
                    const uploadData = uploadsMap[b.id];
                    const email = uploadData?.email || b.assigned_staff_email;

                    let rawUploads = uploadData?.uploads;
                    if (typeof rawUploads === "string") {
                      try {
                        rawUploads = JSON.parse(rawUploads);
                      } catch (e) {
                        rawUploads = null;
                      }
                    }

                    const extractUrlsAndLabels = (sectionObj) => {
                      let urls = [];
                      let labels = [];
                      if (!sectionObj) return { urls, labels };
                      if (typeof sectionObj === "string") {
                        if (sectionObj.trim()) {
                          urls.push(sectionObj.trim());
                          labels.push("");
                        }
                      } else if (Array.isArray(sectionObj)) {
                        sectionObj.forEach((item, idx) => {
                          if (typeof item === "string" && item.trim()) {
                            urls.push(item.trim());
                            labels.push(`upload_${idx + 1}`);
                          } else if (item && typeof item === "object") {
                            const uUrl = item.url || item.src || item.path || Object.values(item)[0];
                            if (typeof uUrl === "string" && uUrl.trim()) {
                              urls.push(uUrl.trim());
                              labels.push(item.label || item.name || `upload_${idx + 1}`);
                            }
                          }
                        });
                      } else if (typeof sectionObj === "object") {
                        Object.entries(sectionObj).forEach(([key, val]) => {
                          if (typeof val === "string" && val.trim()) {
                            urls.push(val.trim());
                            labels.push(key);
                          } else if (Array.isArray(val)) {
                            val.forEach((v) => {
                              if (typeof v === "string" && v.trim()) {
                                urls.push(v.trim());
                                labels.push(key);
                              }
                            });
                          }
                        });
                      }
                      return { urls, labels };
                    };

                    // Start Image parsing (before)
                    const { urls: startUrls, labels: startLabels } = extractUrlsAndLabels(rawUploads?.before);
                    const hasStartUploads = startUrls.length > 0;
                    const fallbackStartUrls = getImages(b.start_photo_url);
                    const finalStartUrls = hasStartUploads ? startUrls : fallbackStartUrls;
                    const finalStartLabels = hasStartUploads ? startLabels : [];

                    // End Image parsing (after)
                    const { urls: endUrls, labels: endLabels } = extractUrlsAndLabels(rawUploads?.after);
                    const hasEndUploads = endUrls.length > 0;
                    const fallbackEndUrls = getImages(b.end_photo_url);
                    const finalEndUrls = hasEndUploads ? endUrls : fallbackEndUrls;
                    const finalEndLabels = hasEndUploads ? endLabels : [];

                    return (
                      <>
                        <td>
                          {staffMap[email] ? (
                            staffMap[email]
                          ) : (
                            <span>
                              {email || "N/A"} {email && <span style={{ color: "#ef4444", fontSize: "12px", marginLeft: "4px" }}>(Deleted Staff)</span>}
                            </span>
                          )}
                        </td>
                        <td>{email || "N/A"}</td>
                        <td>{reviewsMap[b.id] || "-"}</td>
                        <td>
                          <button
                            className="allot-btn"
                            disabled={b.payment_status !== "paid"}
                            style={{
                              opacity: b.payment_status === "paid" ? 1 : 0.5,
                              cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                            }}
                            onClick={() => {
                              if (finalStartUrls && finalStartUrls.length > 0) {
                                setModalImages(finalStartUrls);
                                setModalImageLabels(finalStartLabels);
                              } else {
                                setModalImages(["No start images available"]);
                                setModalImageLabels([]);
                              }
                              setCurrentImgIndex(0);
                              setImgLoading(true);
                              setShowImageModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          <button
                            className="allot-btn"
                            disabled={b.payment_status !== "paid"}
                            style={{
                              opacity: b.payment_status === "paid" ? 1 : 0.5,
                              cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                            }}
                            onClick={() => {
                              if (finalEndUrls && finalEndUrls.length > 0) {
                                setModalImages(finalEndUrls);
                                setModalImageLabels(finalEndLabels);
                              } else {
                                setModalImages(["No end images available"]);
                                setModalImageLabels([]);
                              }
                              setCurrentImgIndex(0);
                              setImgLoading(true);
                              setShowImageModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </>
                    );
                  })()}
                  <td>
                    <button
                      className="allot-btn"
                      style={{
                        backgroundColor: "#ff4d4d",
                        color: "#fff",
                      }}
                      onClick={() => handleDeleteBooking(b.id)}
                    >
                      Delete
                    </button>
                  </td>
                  <td>
                    <button
                      className="allot-btn"
                      onClick={() => copyBookingDetails(b)}
                    >
                      {copiedBookingId === b.id ? "Copied!" : "Copy"}
                    </button>
                  </td>
                </tr>
              ))
              : activeTab === "refund_management"
                ? paginatedBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="date-time-container">
                        <span className="date-part">
                          {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                        </span>
                        <span className="time-part">
                          {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                        </span>
                      </div>
                    </td>
                    <td>{b.customer_name}</td>
                    <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                    <td>{b.services?.[0]?.title}</td>
                    <td>{b.services?.[0]?.price}</td>
                    <td style={{ fontWeight: "700", color: "#f59e0b" }}>₹{b.refund_amount || b.total_amount}</td>
                    <td>{b.refund_note || "N/A"}</td>
                    <td>
                      {b.refund_status === "REFUND_PENDING" ? (
                        <button
                          className="allot-btn"
                          disabled={refundingId === b.id}
                          style={{
                            backgroundColor: "#22c55e",
                            color: "#fff",
                            opacity: !refundingId ? 1 : 0.5,
                            cursor: !refundingId ? "pointer" : "not-allowed",
                            fontSize: "12px",
                            padding: "8px 20px",
                            minWidth: "160px",
                            fontWeight: "700",
                            textAlign: "center"
                          }}
                          onClick={() => handleCompleteAutoRefund(b)}
                        >
                          {refundingId === b.id ? "Processing..." : "Complete Auto Refund"}
                        </button>
                      ) : b.refund_status === "REFUND_INITIATED" ? (
                        <span style={{ fontSize: "15px", color: "#eab308", fontWeight: "700" }}>
                          Refund Initiated
                        </span>
                      ) : (
                        <span style={{ fontSize: "15px", color: "#22c55e", fontWeight: "700" }}>
                          Refunded
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="allot-btn"
                        style={{
                          backgroundColor: "#ff4d4d",
                          color: "#fff",
                        }}
                        onClick={() => handleDeleteBooking(b.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
                : activeTab === "customer_checklist"
                  ? paginatedBookings.map((cl) => {
                    const staffEmail = uploadsMap[cl.booking_id]?.email
                      || cl.bookings?.assigned_staff_email
                      || (cl.bookings?.assigned_staff_id && staffList.find(s => String(s.id) === String(cl.bookings.assigned_staff_id))?.email)
                      || "N/A";

                    return (
                      <tr key={cl.booking_id}>
                        <td>
                          <div className="date-time-container">
                            <span className="date-part">
                              {cl.created_at ? new Date(cl.created_at).toLocaleDateString("en-IN") : "N/A"}
                            </span>
                            <span className="time-part">
                              {cl.created_at ? new Date(cl.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                            </span>
                          </div>
                        </td>
                        <td>{cl.bookings?.customer_name || "N/A"}</td>
                        <td>{cl.bookings?.phone_number || cl.bookings?.user_phone || cl.bookings?.customer_phone || "N/A"}</td>
                        <td>{cl.bookings?.services?.[0]?.title || "N/A"}</td>
                        {cl.tasks.length > 1 ? (
                          <>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedChecklistTasks(cl.tasks);
                                  setShowChecklistModal(true);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #3b82f6",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontWeight: "600",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                View Tasks ({cl.tasks.length})
                              </button>
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                                {cl.tasks.filter(t => (t.customer_completed === true || t.customer_completed === "Completed" || t.customer_completed === "Yes")).length} Completed / {cl.tasks.filter(t => !(t.customer_completed === true || t.customer_completed === "Completed" || t.customer_completed === "Yes")).length} Pending
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{cl.tasks[0]?.task_title || "N/A"}</td>
                            <td>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  backgroundColor: (cl.tasks[0]?.customer_completed === true || cl.tasks[0]?.customer_completed === "Completed" || cl.tasks[0]?.customer_completed === "Yes") ? "#dcfce7" : "#fef9c3",
                                  color: (cl.tasks[0]?.customer_completed === true || cl.tasks[0]?.customer_completed === "Completed" || cl.tasks[0]?.customer_completed === "Yes") ? "#166534" : "#ca8a04",
                                }}
                              >
                                {(cl.tasks[0]?.customer_completed === true || cl.tasks[0]?.customer_completed === "Completed" || cl.tasks[0]?.customer_completed === "Yes") ? "Completed" : "Pending"}
                              </span>
                            </td>
                          </>
                        )}
                        <td style={{ textAlign: "left", paddingLeft: "12px" }}>
                          {staffEmail}
                        </td>
                      </tr>
                    );
                  })
                  : activeTab === "cancelled"
                    ? paginatedBookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="date-time-container">
                            <span className="date-part">
                              {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                            </span>
                            <span className="time-part">
                              {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                            </span>
                          </div>
                        </td>
                        <td>{b.platform || "N/A"}</td>
                        <td style={{ fontWeight: "700", color: "#0f172a" }}>
                          {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                        </td>
                        <td>
                          {(() => {
                            const status = (b.payment_status || "").toLowerCase();
                            if (status === "paid" || status === "captured") return <span style={{ color: "#22c55e", fontWeight: "700" }}>Success</span>;
                            if (status === "failed") return <span style={{ color: "#ef4444", fontWeight: "700" }}>Failed</span>;
                            return <span style={{ color: "#eab308", fontWeight: "700" }}>Pending</span>;
                          })()}
                        </td>
                        <td>{b.customer_name}</td>
                        <td>{b.email}</td>
                        <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                        <td>
                          {b.full_address ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.full_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#3b82f6", textDecoration: "underline" }}
                            >
                              {b.full_address}
                            </a>
                          ) : "N/A"}
                        </td>
                        <td>
                          {b.location_link && b.location_link !== "N/A" ? (
                            <a
                              href={b.location_link.startsWith("http") ? b.location_link : `https://www.google.com/maps/place/${encodeURIComponent(b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#3b82f6", textDecoration: "underline", display: "inline-block", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
                              title={b.location_link}
                            >
                              {b.location_link}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{b.services?.[0]?.title}</td>
                        <td>{formatDate(b.booking_date)}</td>
                        <td>{b.booking_time}</td>
                        <td>{b.total_amount}</td>
                        <td>{b.razorpay_payment_id || "N/A"}</td>
                        <td>
                          {editingRazorpayId === b.id ? (
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                defaultValue={b.rayzorpay_refund_id || ""}
                                id={`razorpay-input-${b.id}`}
                                className="auth-input"
                                style={{
                                  margin: 0,
                                  padding: "4px 8px",
                                  fontSize: "14px",
                                  height: "30px",
                                  minWidth: "120px"
                                }}
                                placeholder="Enter Razorpay Refund ID"
                              />
                              <button
                                className="allot-btn"
                                style={{
                                  padding: "4px 8px",
                                  margin: 0,
                                  fontSize: "12px",
                                  height: "30px",
                                  backgroundColor: "#facc15",
                                  color: "#000"
                                }}
                                onClick={() => {
                                  const input = document.getElementById(`razorpay-input-${b.id}`);
                                  updateRazorpayId(b.id, input.value);
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="allot-btn"
                                style={{
                                  padding: "4px 8px",
                                  margin: 0,
                                  fontSize: "12px",
                                  height: "30px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#475569"
                                }}
                                onClick={() => setEditingRazorpayId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span>{b.rayzorpay_refund_id || "N/A"}</span>
                              <button
                                className="allot-btn"
                                style={{
                                  padding: "2px 8px",
                                  margin: 0,
                                  fontSize: "12px",
                                  height: "24px",
                                  backgroundColor: "#facc15",
                                  color: "#000"
                                }}
                                onClick={() => setEditingRazorpayId(b.id)}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td>{b.work_status}</td>
                        <td>{b.cancel_time}</td>
                        <td>{b.cancel_reason}</td>
                        <td
                          style={{
                            fontWeight: "bold",
                            color:
                              b.refund_status === "REFUNDED" ? "green" : "orange",
                          }}
                        >
                          {b.refund_status === "REFUNDED" ? "Refunded" : "Pending"}
                        </td>
                        <td>
                          {b.refund_status === "REFUNDED" && (
                            <span style={{ fontSize: "15px", color: "#22c55e", fontWeight: "700" }}>
                              Refunded
                            </span>
                          )}
                          {b.refund_status === "REFUND_INITIATED" && (
                            <span style={{ fontSize: "15px", color: "#eab308", fontWeight: "700" }}>
                              Refund Initiated
                            </span>
                          )}
                          {b.refund_status !== "REFUNDED" && b.refund_status !== "REFUND_PENDING" && b.refund_status !== "REFUND_INITIATED" && (
                            <button
                              className="allot-btn"
                              disabled={b.payment_status !== "paid"}
                              style={{
                                backgroundColor: "#22c55e",
                                color: "#fff",
                                opacity: b.payment_status === "paid" ? 1 : 0.5,
                                cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                                fontSize: "14px",
                                padding: "8px 15px",
                                minWidth: "130px",
                                fontWeight: "600",
                                textAlign: "center"
                              }}
                              onClick={() => handleOpenInitiateRefund(b)}
                            >
                              Initiate Refund
                            </button>

                          )}
                          {b.refund_status === "REFUND_PENDING" && (
                            <span style={{ fontSize: "15px", color: "#eab308", fontWeight: "700" }}>
                              Moved to Management
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="allot-btn"
                            style={{
                              backgroundColor: "#ff4d4d",
                              color: "#fff",
                            }}
                            onClick={() => handleDeleteBooking(b.id)}
                          >
                            Delete
                          </button>
                        </td>
                        <td>
                          <button
                            className="allot-btn"
                            style={{
                              backgroundColor: "#facc15",
                              color: "#000",
                            }}
                            onClick={() => copyBookingDetails(b)}
                          >
                            {copiedBookingId === b.id ? "Copied!" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))
                    : activeTab === "rescheduled"
                      ? paginatedBookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div className="date-time-container">
                              <span className="date-part">
                                {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                              </span>
                              <span className="time-part">
                                {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                              </span>
                            </div>
                          </td>
                          <td>{b.platform || "N/A"}</td>
                          <td style={{ fontWeight: "700", color: "#0f172a" }}>
                            {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                          </td>
                          <td>
                            {(() => {
                              const status = (b.payment_status || "").toLowerCase();
                              if (status === "paid" || status === "captured") return <span style={{ color: "#22c55e", fontWeight: "700" }}>Success</span>;
                              if (status === "failed") return <span style={{ color: "#ef4444", fontWeight: "700" }}>Failed</span>;
                              return <span style={{ color: "#eab308", fontWeight: "700" }}>Pending</span>;
                            })()}
                          </td>
                          <td>{b.customer_name}</td>
                          <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                          <td>{b.email}</td>
                          <td>
                            {b.full_address ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.full_address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#3b82f6", textDecoration: "underline" }}
                              >
                                {b.full_address}
                              </a>
                            ) : "N/A"}
                          </td>
                          <td>
                            {b.location_link && b.location_link !== "N/A" ? (
                              <a
                                href={b.location_link.startsWith("http") ? b.location_link : `https://www.google.com/maps/place/${encodeURIComponent(b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#3b82f6", textDecoration: "underline", display: "inline-block", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
                                title={b.location_link}
                              >
                                {b.location_link}
                              </a>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td>{b.services?.[0]?.title || "N/A"}</td>
                          <td>
                            {b.original_date ? (
                              <div style={{ color: "#0f172a" }}>
                                {formatDate(b.original_date)} at {b.original_time || "N/A"}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <div style={{ color: "#0f172a" }}>
                              {formatDate(b.booking_date)} at {b.booking_time}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontStyle: "italic", color: "#0f172a" }}>
                              {b.reschedule_reason || "No reason provided"}
                            </div>
                          </td>
                          <td>
                            {b.assigned_staff_email ? (
                              <div>
                                <div style={{ fontWeight: "600" }}>
                                  {staffMap[b.assigned_staff_email] ? (
                                    staffMap[b.assigned_staff_email]
                                  ) : (
                                    <span>
                                      {b.assigned_staff_email} <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "normal", marginLeft: "4px" }}>(Deleted Staff)</span>
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => triggerModal("OTP Details", `Start OTP: ${b.startotp || "N/A"}\nEnd OTP: ${b.endotp || "N/A"}`)}
                                  style={{
                                    background: "transparent",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#475569",
                                    cursor: "pointer",
                                    marginTop: "6px"
                                  }}
                                >
                                  View OTP
                                </button>
                              </div>
                            ) : (
                              "Not Assigned"
                            )}
                          </td>
                          <td>
                            <button
                              className="allot-btn"
                              disabled={b.payment_status !== "paid"}
                              style={{
                                opacity: b.payment_status === "paid" ? 1 : 0.5,
                                cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                              }}
                              onClick={() => fetchStaff(b)}
                            >
                              {b.assigned_staff_email
                                ? "Change Staff"
                                : "Allot Staff"}
                            </button>

                            <button
                              className="allot-btn"
                              disabled={b.payment_status !== "paid"}
                              style={{
                                marginTop: "8px",
                                backgroundColor: "#fef2f2",
                                color: "#991b1b",
                                border: "1px solid #fee2e2",
                                opacity: b.payment_status === "paid" ? 1 : 0.5,
                                cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                              }}
                              onClick={() => {
                                setTargetCancelBooking(b);
                                setShowCancelConfirm(true);
                              }}
                            >
                              Cancel
                            </button>

                            <button
                              className="allot-btn"
                              disabled={b.payment_status !== "paid"}
                              style={{
                                marginTop: "8px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                                opacity: b.payment_status === "paid" ? 1 : 0.5,
                                cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                              }}
                              onClick={() => handleOpenReschedule(b)}
                            >
                              Reschedule
                            </button>

                            {b.assigned_staff_email && b.staff_response?.trim()?.toUpperCase() === "PENDING" && (
                              <button
                                className="allot-btn"
                                style={{ marginTop: "8px", backgroundColor: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" }}
                                onClick={() => handleViewStatus(b)}
                              >
                                View Status
                              </button>
                            )}
                          </td>
                          <td>
                            <button
                              className="allot-btn"
                              style={{
                                backgroundColor: "#ff4d4d",
                                color: "#fff",
                              }}
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              Delete
                            </button>
                          </td>
                          <td>
                            <button
                              className="allot-btn"
                              onClick={() => copyBookingDetails(b)}
                            >
                              {copiedBookingId === b.id ? "Copied!" : "Copy"}
                            </button>
                          </td>
                        </tr>
                      ))
                      : activeTab === "unassigned"
                        ? paginatedBookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <div className="date-time-container">
                                <span className="date-part">
                                  {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                                </span>
                                <span className="time-part">
                                  {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                                </span>
                              </div>
                            </td>
                            <td>{b.platform || "N/A"}</td>
                            <td style={{ fontWeight: "700", color: "#0f172a" }}>
                              {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                            </td>
                            <td>
                              {(() => {
                                const status = (b.payment_status || "").toLowerCase();
                                if (status === "paid" || status === "captured") return <span style={{ color: "#22c55e", fontWeight: "700" }}>Success</span>;
                                if (status === "failed") return <span style={{ color: "#ef4444", fontWeight: "700" }}>Failed</span>;
                                return <span style={{ color: "#eab308", fontWeight: "700" }}>Pending</span>;
                              })()}
                            </td>
                            <td>{b.razorpay_payment_id || "N/A"}</td>
                            <td>{b.customer_name}</td>
                            <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                            <td>{b.email}</td>
                            <td>
                              {b.full_address ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.full_address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                                >
                                  {b.full_address}
                                </a>
                              ) : "N/A"}
                            </td>
                            <td>
                              {b.location_link && b.location_link !== "N/A" ? (
                                <a
                                  href={b.location_link.startsWith("http") ? b.location_link : `https://www.google.com/maps/place/${encodeURIComponent(b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#3b82f6", textDecoration: "underline", display: "inline-block", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
                                  title={b.location_link}
                                >
                                  {b.location_link}
                                </a>
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td>{b.services?.[0]?.title || "N/A"}</td>
                            <td>{getBookingAddOnsDisplay(b)}</td>
                            <td>{formatDate(b.booking_date)}</td>
                            <td>{b.booking_time}</td>
                            <td style={{ fontWeight: "700", color: "#0f172a" }}>
                              {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                            </td>
                            <td style={{ fontWeight: "600", color: "#1e293b" }}>
                              {b.advance_amount !== undefined && b.advance_amount !== null
                                ? `₹${b.advance_amount}`
                                : b.services?.[0]?.advance_amount !== undefined && b.services?.[0]?.advance_amount !== null
                                  ? `₹${b.services[0].advance_amount}`
                                  : "N/A"}
                            </td>
                            <td style={{ fontWeight: "700", color: "#ef4444" }}>
                              {b.pending_amount !== undefined && b.pending_amount !== null
                                ? `₹${b.pending_amount}`
                                : b.services?.[0]?.pending_amount !== undefined && b.services?.[0]?.pending_amount !== null
                                  ? `₹${b.services[0].pending_amount}`
                                  : "N/A"}
                            </td>
                            <td>{b.remarks || b.services?.[0]?.remarks || "N/A"}</td>
                            <td>
                              {b.assigned_staff_email ? (
                                <div>
                                  <div style={{ fontWeight: "600" }}>
                                    {staffMap[b.assigned_staff_email] ? (
                                      staffMap[b.assigned_staff_email]
                                    ) : (
                                      <span>
                                        {b.assigned_staff_email} <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "normal", marginLeft: "4px" }}>(Deleted Staff)</span>
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => triggerModal("OTP Details", `Start OTP: ${b.startotp || "N/A"}\nEnd OTP: ${b.endotp || "N/A"}`)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "3px 8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      color: "#475569",
                                      cursor: "pointer",
                                      marginTop: "6px"
                                    }}
                                  >
                                    View OTP
                                  </button>
                                </div>
                              ) : (
                                "Not Assigned"
                              )}
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                disabled={b.payment_status !== "paid"}
                                style={{
                                  opacity: b.payment_status === "paid" ? 1 : 0.5,
                                  cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                                }}
                                onClick={() => fetchStaff(b)}
                              >
                                {b.assigned_staff_email ? "Change Staff" : "Allot Staff"}
                              </button>

                              <button
                                className="allot-btn"
                                disabled={b.payment_status !== "paid"}
                                style={{
                                  marginTop: "8px",
                                  backgroundColor: "#fef2f2",
                                  color: "#991b1b",
                                  border: "1px solid #fee2e2",
                                  opacity: b.payment_status === "paid" ? 1 : 0.5,
                                  cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                                }}
                                onClick={() => {
                                  setTargetCancelBooking(b);
                                  setShowCancelConfirm(true);
                                }}
                              >
                                Cancel
                              </button>

                              <button
                                className="allot-btn"
                                disabled={b.payment_status !== "paid"}
                                style={{
                                  marginTop: "8px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#475569",
                                  border: "1px solid #e2e8f0",
                                  opacity: b.payment_status === "paid" ? 1 : 0.5,
                                  cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                                }}
                                onClick={() => handleOpenReschedule(b)}
                              >
                                Reschedule
                              </button>

                              {b.assigned_staff_email && b.staff_response?.trim()?.toUpperCase() === "PENDING" && (
                                <button
                                  className="allot-btn"
                                  style={{ marginTop: "8px", backgroundColor: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" }}
                                  onClick={() => handleViewStatus(b)}
                                >
                                  View Status
                                </button>
                              )}
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                style={{
                                  backgroundColor: "#ff4d4d",
                                  color: "#fff",
                                }}
                                onClick={() => handleDeleteBooking(b.id)}
                              >
                                Delete
                              </button>
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                onClick={() => copyBookingDetails(b)}
                              >
                                {copiedBookingId === b.id ? "Copied!" : "Copy"}
                              </button>
                            </td>
                          </tr>
                        ))
                        : paginatedBookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <div className="date-time-container">
                                <span className="date-part">
                                  {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "N/A"}
                                </span>
                                <span className="time-part">
                                  {b.created_at ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                                </span>
                              </div>
                            </td>
                            <td>{b.platform || "N/A"}</td>
                            <td style={{ fontWeight: "700", color: "#0f172a" }}>
                              {b.total_amount !== undefined && b.total_amount !== null ? `₹${b.total_amount}` : "N/A"}
                            </td>
                            <td>
                              {(() => {
                                const status = (b.payment_status || "").toLowerCase();
                                if (status === "paid" || status === "captured") return <span style={{ color: "#22c55e", fontWeight: "700" }}>Success</span>;
                                if (status === "failed") return <span style={{ color: "#ef4444", fontWeight: "700" }}>Failed</span>;
                                return <span style={{ color: "#eab308", fontWeight: "700" }}>Pending</span>;
                              })()}
                            </td>
                            <td>{b.razorpay_payment_id || "N/A"}</td>
                            <td>{b.customer_name}</td>
                            <td>{b.phone_number || b.user_phone || b.customer_phone || "N/A"}</td>
                            <td>{b.email}</td>
                            <td>
                              {b.full_address ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.full_address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                                >
                                  {b.full_address}
                                </a>
                              ) : "N/A"}
                            </td>
                            <td>
                              {b.location_link && b.location_link !== "N/A" ? (
                                <a
                                  href={b.location_link.startsWith("http") ? b.location_link : `https://www.google.com/maps/place/${encodeURIComponent(b.location_link.includes('+') ? b.location_link.split(',')[0].trim() : b.location_link)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#3b82f6", textDecoration: "underline", display: "inline-block", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
                                  title={b.location_link}
                                >
                                  {b.location_link}
                                </a>
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td>{b.services?.[0]?.title || "N/A"}</td>
                            <td>{formatDate(b.booking_date)}</td>
                            <td>{b.booking_time}</td>
                            <td>
                              {b.assigned_staff_email ? (
                                <div>
                                  <div style={{ fontWeight: "600" }}>
                                    {staffMap[b.assigned_staff_email] ? (
                                      staffMap[b.assigned_staff_email]
                                    ) : (
                                      <span>
                                        {b.assigned_staff_email} <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "normal", marginLeft: "4px" }}>(Deleted Staff)</span>
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => triggerModal("OTP Details", `Start OTP: ${b.startotp || "N/A"}\nEnd OTP: ${b.endotp || "N/A"}`)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "3px 8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      color: "#475569",
                                      cursor: "pointer",
                                      marginTop: "6px"
                                    }}
                                  >
                                    View OTP
                                  </button>
                                </div>
                              ) : (
                                "Not Assigned"
                              )}
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                disabled={b.payment_status !== "paid"}
                                style={{
                                  opacity: b.payment_status === "paid" ? 1 : 0.5,
                                  cursor: b.payment_status === "paid" ? "pointer" : "not-allowed",
                                }}
                                onClick={() => fetchStaff(b)}
                              >
                                {b.assigned_staff_email
                                  ? "Change Staff"
                                  : "Allot Staff"}
                              </button>

                              {(activeTab === "unassigned" || activeTab === "assigned") && (
                                <button
                                  className="allot-btn"
                                  disabled={b.payment_status !== "paid"}
                                  style={{
                                    marginTop: "8px",
                                    backgroundColor: "#fef2f2",
                                    color: "#991b1b",
                                    border: "1px solid #fee2e2",
                                    opacity: b.payment_status === "paid" ? 1 : 0.5,
                                    cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                                  }}
                                  onClick={() => {
                                    setTargetCancelBooking(b);
                                    setShowCancelConfirm(true);
                                  }}
                                >
                                  Cancel
                                </button>
                              )}

                              {(activeTab === "unassigned" || activeTab === "assigned") && (
                                <button
                                  className="allot-btn"
                                  disabled={b.payment_status !== "paid"}
                                  style={{
                                    marginTop: "8px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                    opacity: b.payment_status === "paid" ? 1 : 0.5,
                                    cursor: b.payment_status === "paid" ? "pointer" : "not-allowed"
                                  }}
                                  onClick={() => handleOpenReschedule(b)}
                                >
                                  Reschedule
                                </button>
                              )}

                              {b.assigned_staff_email && b.staff_response?.trim()?.toUpperCase() === "PENDING" && (
                                <button
                                  className="allot-btn"
                                  style={{ marginTop: "8px", backgroundColor: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" }}
                                  onClick={() => handleViewStatus(b)}
                                >
                                  View Status
                                </button>
                              )}
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                style={{
                                  backgroundColor: "#ff4d4d",
                                  color: "#fff",
                                }}
                                onClick={() => handleDeleteBooking(b.id)}
                              >
                                Delete
                              </button>
                            </td>
                            <td>
                              <button
                                className="allot-btn"
                                onClick={() => copyBookingDetails(b)}
                              >
                                {copiedBookingId === b.id ? "Copied!" : "Copy"}
                              </button>
                            </td>
                          </tr>
                        ))}

          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", color: "#64748b", fontSize: "14px", fontWeight: "700", marginTop: "20px", fontFamily: "'Outfit', sans-serif" }}>
        Total Bookings: {visibleBookings.length} | Remaining: {visibleBookings.length - ((currentPage - 1) * rowsPerPage)}
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          marginTop: "20px",
          marginBottom: "30px",
          fontFamily: "'Outfit', sans-serif"
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
              fontSize: "14px",
              fontWeight: "600",
              color: "#475569"
            }}
          >
            Previous
          </button>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {(() => {
              const maxButtons = 3;
              const startPage = Math.max(1, Math.min(currentPage, totalPages - maxButtons + 1));
              const visiblePages = Array.from(
                { length: Math.min(maxButtons, totalPages) },
                (_, i) => startPage + i
              );

              return visiblePages.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: currentPage === page ? "#facc15" : "#e2e8f0",
                    background: currentPage === page ? "#facc15" : "#fff",
                    color: currentPage === page ? "#000" : "#475569",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                    transition: "all 0.2s"
                  }}
                >
                  {page}
                </button>
              ));
            })()}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontSize: "14px",
              fontWeight: "600",
              color: "#475569"
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 9998,
            }}
            onClick={() => setShowRescheduleModal(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              borderRadius: "12px",
              zIndex: 9999,
              width: "340px",
              padding: "20px",
              boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span
              onClick={() => setShowRescheduleModal(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "15px",
                fontSize: "22px",
                fontWeight: "bold",
                color: "#000",
                cursor: "pointer",
                lineHeight: "1"
              }}
            >
              &times;
            </span>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "17px", fontWeight: "700", color: "#1e293b" }}>
              Reschedule Booking
            </h3>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                New Booking Date
              </label>
              <input
                type="date"
                className="auth-input"
                style={{ width: "100%", margin: 0, padding: "8px 10px", fontSize: "13px", cursor: "pointer" }}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                New Booking Time
              </label>
              <select
                className="auth-input"
                style={{ width: "100%", margin: 0, padding: "8px 10px", fontSize: "13px", cursor: "pointer" }}
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              >
                <option value="">Select Time</option>
                {(() => {
                  // 1. Check if the selected date has specific slots
                  const slotsForDate = dateSpecificSlots[rescheduleDate];

                  // 2. If it does, use those. If not, use all active master slots.
                  if (slotsForDate !== undefined) {
                    return slotsForDate.map(slot => (
                      <option key={slot} value={slot}>{slot.toUpperCase()}</option>
                    ));
                  } else {
                    return masterSlots
                      .filter(slot => slot.active !== false)
                      .map(slot => (
                        <option key={slot.value} value={slot.value}>{slot.value.toUpperCase()}</option>
                      ));
                  }
                })()}
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>
                Reason for Rescheduling
              </label>
              <textarea
                className="auth-input"
                style={{
                  width: "100%",
                  margin: 0,
                  padding: "8px 10px",
                  fontSize: "13px",
                  height: "60px",
                  resize: "none",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  outline: "none"
                }}
                placeholder="Enter reason for rescheduling..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                disabled={rescheduleOtpSent}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              {!rescheduleOtpSent ? (
                <button
                  className="allot-btn"
                  style={{
                    margin: 0,
                    background: "#fef9c3",
                    color: "#854d0e",
                    border: "1px solid #fde047",
                    cursor: rescheduleLoading ? "not-allowed" : "pointer",
                    opacity: rescheduleLoading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  onClick={handleSendRescheduleOtp}
                  disabled={rescheduleLoading}
                >
                  {rescheduleLoading ? (
                    <>
                      <div style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid #854d0e",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "reschedule-spin 0.8s linear infinite"
                      }}></div>
                      <span>Sending...</span>
                      <style>{`
                        @keyframes reschedule-spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                    </>
                  ) : "Send OTP to Customer"}
                </button>
              ) : (
                <>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                    Enter OTP from Customer
                  </label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter 6-digit OTP"
                    style={{ width: "100%", margin: 0, textAlign: "center", letterSpacing: "4px", fontSize: "18px", fontWeight: "700" }}
                    maxLength={6}
                    value={enteredRescheduleOtp}
                    onChange={(e) => setEnteredRescheduleOtp(e.target.value)}
                  />
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{ fontSize: "12px", color: "#6366f1", cursor: "pointer", textDecoration: "underline" }}
                      onClick={handleSendRescheduleOtp}
                    >
                      Resend OTP
                    </span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "30px" }}>
              <button
                className="allot-btn"
                style={{ flex: 1, margin: 0, background: "#f1f5f9", color: "#475569" }}
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
              <button
                className="allot-btn"
                style={{
                  flex: 1,
                  margin: 0,
                  background: (rescheduleOtpSent && enteredRescheduleOtp.length === 6) ? "#facc15" : "#e2e8f0",
                  color: "#000"
                }}
                onClick={handleUpdateSchedule}
                disabled={rescheduleLoading}
              >
                {rescheduleLoading ? "Updating..." : "Update Schedule"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* IMAGE MODAL */}
      {showImageModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 9998,
            }}
          />
          <div
            className="image-modal-content"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              borderRadius: "16px",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "400px",
              maxWidth: "90%",
              padding: "20px"
            }}
          >
            <button
              className="modal-nav-btn prev"
              onClick={() => {
                setImgLoading(true);
                setCurrentImgIndex((prev) => prev - 1);
              }}
              disabled={currentImgIndex === 0}
              style={{
                position: "absolute",
                left: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                background: currentImgIndex === 0 ? "#eee" : "#facc15",
                color: currentImgIndex === 0 ? "#999" : "#000",
                opacity: currentImgIndex === 0 ? 0.5 : 1,
                zIndex: 2,
              }}
            >
              &lt;
            </button>

            <button
              className="modal-nav-btn next"
              onClick={() => {
                setImgLoading(true);
                setCurrentImgIndex((prev) => prev + 1);
              }}
              disabled={currentImgIndex === modalImages.length - 1}
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                background:
                  currentImgIndex === modalImages.length - 1
                    ? "#eee"
                    : "#facc15",
                color:
                  currentImgIndex === modalImages.length - 1
                    ? "#999"
                    : "#000",
                zIndex: 2,
                opacity: currentImgIndex === modalImages.length - 1 ? 0.5 : 1,
              }}
            >
              &gt;
            </button>

            <div style={{ position: "relative", display: "inline-block", width: "100%", textAlign: "center", padding: "40px" }}>
              {(() => {
                const label = modalImageLabels && modalImageLabels[currentImgIndex];
                if (!label) return null;
                const formattedLabel = label
                  .split(/[_-]/)
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return (
                  <h3 style={{ margin: "0 0 15px 0", fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
                    {formattedLabel}
                  </h3>
                );
              })()}
              {imgLoading && isImageUrl(modalImages[currentImgIndex]) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.8)",
                    zIndex: 1,
                    borderRadius: "8px",
                  }}
                >
                  <Loader />
                </div>
              )}
              {isImageUrl(modalImages[currentImgIndex]) ? (
                <img
                  className="modal-work-img"
                  src={modalImages[currentImgIndex]}
                  alt="Work"
                  onLoad={() => setImgLoading(false)}
                  onError={() => setImgLoading(false)}
                  style={{
                    display: "block",
                    margin: "0 auto 10px",
                    borderRadius: "8px",
                    maxWidth: "100%",
                    maxHeight: "70vh"
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "20px",
                    fontSize: "18px",
                    color: "#1e293b",
                    fontWeight: "600",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "2px dashed #e2e8f0",
                    margin: "20px"
                  }}
                >
                  {modalImages[currentImgIndex]}
                </div>
              )}
            </div>

            <button
              className="allot-btn modal-ok-btn"
              onClick={() => setShowImageModal(false)}
              style={{ margin: "0 auto 20px" }}
            >
              OK
            </button>
          </div>
        </>
      )}

      {/* ✅ REFUND CONFIRM MODAL */}
      {showRefundConfirm && (
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
              onClick={() => setShowRefundConfirm(false)}
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

            <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Confirm</h3>
            <p style={{ margin: "0 0 20px", color: "#666" }}>
              Confirm you have completed the refund in Razorpay?
            </p>

            <div
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <button
                onClick={handleConfirmRefund}
                style={{
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
              <button
                onClick={() => setShowRefundConfirm(false)}
                style={{
                  padding: "8px 25px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "#333",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMMON SUCCESS MODAL */}
      {showCommonSuccess && (
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
            zIndex: 200000,
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
            {/* CLOSE X MARK */}
            <span
              onClick={() => setShowCommonSuccess(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                fontSize: "24px",
                fontWeight: "700",
                color: "#64748b",
                cursor: "pointer",
                transition: "color 0.2s ease",
                lineHeight: 1
              }}
              onMouseEnter={(e) => (e.target.style.color = "#1e293b")}
              onMouseLeave={(e) => (e.target.style.color = "#64748b")}
            >
              &times;
            </span>
            <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Success</h3>
            <p style={{ margin: "0 0 20px", color: "#666" }}>
              {successMessage}
            </p>

            <button
              onClick={() => setShowCommonSuccess(false)}
              style={{
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

      {/* ✅ BOOKING DELETE CONFIRM MODAL */}
      {showBookingDeleteConfirm && (
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
            }}
          >
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this booking?</p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
              }}
            >
              <button
                onClick={confirmDeleteBooking}
                style={{
                  padding: "8px 25px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#ff4d4d",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                Delete
              </button>

              <button
                onClick={() => setShowBookingDeleteConfirm(false)}
                style={{
                  padding: "8px 25px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "#333",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ BOOKING CANCEL CONFIRM MODAL */}
      {showCancelConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px 40px",
              borderRadius: "16px",
              textAlign: "center",
              minWidth: "400px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              position: "relative"
            }}
          >
            {/* CLOSE X MARK */}
            <span
              onClick={() => {
                setShowCancelConfirm(false);
                setTargetCancelBooking(null);
                setCancelReasonInput("");
              }}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                fontSize: "24px",
                fontWeight: "700",
                color: "#9ca3af",
                cursor: "pointer",
                lineHeight: 1
              }}
            >
              &times;
            </span>
            <div style={{ marginBottom: "15px" }}>
              <div style={{
                backgroundColor: "#fee2e2",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 15px"
              }}>
                <span style={{ fontSize: "30px" }}>⚠️</span>
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "22px", color: "#111827" }}>Cancel Booking</h3>
              <p style={{ margin: "0", color: "#4b5563", fontSize: "16px", lineHeight: "1.5" }}>
                Are you sure you want to cancel this booking?<br />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#991b1b" }}>
                  A cancellation email will be sent to the customer.
                </span>
              </p>
            </div>

            {/* Custom Cancellation Reason Textarea */}
            <div style={{ marginTop: "15px", marginBottom: "20px", textAlign: "left" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "6px" }}>
                Reason for Cancellation
              </label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Enter cancellation reason here (e.g., Slot time conflict, staff unavailable...)"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#1e293b",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                style={{
                  padding: "10px 25px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: cancelLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "15px",
                  flex: 1,
                  opacity: cancelLoading ? 0.7 : 1
                }}
              >
                {cancelLoading ? "Processing..." : "Yes, Cancel"}
              </button>

              <button
                disabled={cancelLoading}
                onClick={() => {
                  setShowCancelConfirm(false);
                  setTargetCancelBooking(null);
                  setCancelReasonInput("");
                }}
                style={{
                  padding: "10px 25px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  cursor: cancelLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#fff",
                  color: "#374151",
                  fontWeight: "700",
                  fontSize: "15px",
                  flex: 1
                }}
              >
                No, Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ RAZORPAY ID DELETE CONFIRM MODAL */}
      {showRazorpayDeleteConfirm && (
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
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Confirm Delete</h3>
            <p style={{ margin: "0 0 20px", color: "#666" }}>
              Are you sure you want to delete this Razorpay ID?
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "15px" }}>
              <button
                onClick={() => updateRazorpayId(targetRefundId, "")}
                style={{
                  padding: "8px 25px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#ff4d4d",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowRazorpayDeleteConfirm(false)}
                style={{
                  padding: "8px 25px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "#333",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* NEW: MANUAL BOOKING MODAL */}
      {showManualModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100000, padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#fff", padding: "30px", borderRadius: "16px",
            width: "500px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto",
            position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }}>
            <span onClick={() => setShowManualModal(false)}
              style={{ position: "absolute", top: "20px", right: "20px", fontSize: "24px", cursor: "pointer", color: "#64748b" }}>&times;</span>

            <h2 style={{ margin: "0 0 25px", fontSize: "22px", fontWeight: "800", color: "#1e293b" }}>Create Manual Booking</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>CUSTOMER NAME *</label>
                <input type="text" placeholder="Full Name" value={manualBookingData.user_name}
                  onChange={(e) => setManualBookingData({ ...manualBookingData, user_name: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>PHONE *</label>
                  <input type="text" placeholder="Phone Number" value={manualBookingData.user_phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 10) {
                        setManualBookingData({ ...manualBookingData, user_phone: val });
                      }
                    }}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>EMAIL (OPTIONAL)</label>
                  <input type="email" placeholder="Email Address" value={manualBookingData.user_email}
                    onChange={(e) => setManualBookingData({ ...manualBookingData, user_email: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>ADDRESS *</label>
                <textarea placeholder="Enter full address" value={manualBookingData.address}
                  onChange={(e) => setManualBookingData({ ...manualBookingData, address: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", height: "80px", resize: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>LOCATION LINK (GOOGLE MAPS)</label>
                <input type="text" placeholder="https://maps.app.goo.gl/..." value={manualBookingData.location_link}
                  onChange={(e) => setManualBookingData({ ...manualBookingData, location_link: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>LATITUDE</label>
                  <input type="number" step="any" placeholder="e.g. 12.971598" value={manualBookingData.latitude}
                    onChange={(e) => setManualBookingData({ ...manualBookingData, latitude: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>LONGITUDE</label>
                  <input type="number" step="any" placeholder="e.g. 77.594562" value={manualBookingData.longitude}
                    onChange={(e) => setManualBookingData({ ...manualBookingData, longitude: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>SELECT SERVICE *</label>
                <select value={manualBookingData.service_id}
                  onChange={(e) => {
                    const serv = allServices.find(s => String(s.id) === String(e.target.value));

                    // Clean the price from the database (remove ₹ and commas)
                    let basePrice = serv?.price ? String(serv.price).replace(/[^0-9.]/g, "") : "";
                    let finalServicePrice = basePrice;

                    // If there's a discount, calculate the discounted price
                    if (serv && serv.discount_percent && serv.discount_percent > 0) {
                      const base = parseFloat(basePrice) || 0;
                      if (base > 0) {
                        const discounted = base - (base * serv.discount_percent / 100);
                        finalServicePrice = String(Math.round(discounted));
                      }
                    }

                    const sPriceNum = cleanNumeric(finalServicePrice);
                    const addonsTotal = calculateAddOnsTotal(manualBookingData.selected_addons);
                    const newFinalPrice = sPriceNum + addonsTotal;
                    const advNum = cleanNumeric(manualBookingData.advance_amount);
                    const newPending = Math.max(0, newFinalPrice - advNum);

                    setManualBookingData({
                      ...manualBookingData,
                      service_id: e.target.value,
                      service_base_price: finalServicePrice,
                      price: newFinalPrice > 0 ? String(newFinalPrice) : "",
                      pending_amount: newPending >= 0 ? String(newPending) : "0"
                    });
                  }}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }}>
                  <option value="">Select a service</option>
                  {allServices.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({s.price || "N/A"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>ADD-ONS</label>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddonDropdown(prev => !prev)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#fff",
                      textAlign: "left",
                      fontSize: "14px",
                      color: (manualBookingData.selected_addons || []).length > 0 ? "#1e293b" : "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(manualBookingData.selected_addons || []).length > 0
                        ? (manualBookingData.selected_addons || []).map(a => `${a.title} (${a.price || '₹0'})`).join(", ")
                        : "Select Add-ons"}
                    </span>
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748b" }}>▼</span>
                  </button>

                  {showAddonDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        backgroundColor: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        marginTop: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                        padding: "4px"
                      }}
                    >
                      {allAddOns && allAddOns.length > 0 ? (
                        allAddOns.map((addon) => {
                          const isSelected = (manualBookingData.selected_addons || []).some(a => String(a.id) === String(addon.id));
                          return (
                            <div
                              key={addon.id}
                              onClick={() => handleToggleAddOn(addon)}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                backgroundColor: isSelected ? "#eff6ff" : "transparent",
                                color: isSelected ? "#1d4ed8" : "#1e293b",
                                fontWeight: isSelected ? "600" : "400",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "13px",
                                marginBottom: "2px"
                              }}
                            >
                              <span>{isSelected ? "✓ " : ""}{addon.title}</span>
                              <span style={{ fontWeight: "700" }}>{addon.price || "₹0"}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: "10px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
                          No add-ons available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>DATE *</label>
                  <input type="date" value={manualBookingData.booking_date}
                    onChange={(e) => setManualBookingData({ ...manualBookingData, booking_date: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", cursor: "pointer" }}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>TIME *</label>
                  <select
                    value={manualBookingData.booking_time}
                    onChange={(e) => setManualBookingData({ ...manualBookingData, booking_time: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", cursor: "pointer", backgroundColor: "#fff" }}
                  >
                    <option value="">Select Time</option>
                    {(() => {
                      const slotsForDate = dateSpecificSlots[manualBookingData.booking_date];
                      if (slotsForDate !== undefined) {
                        return slotsForDate.map(slot => (
                          <option key={slot} value={slot}>{slot.toUpperCase()}</option>
                        ));
                      } else {
                        return masterSlots
                          .filter(slot => slot.active !== false)
                          .map(slot => (
                            <option key={slot.value} value={slot.value}>{slot.value.toUpperCase()}</option>
                          ));
                      }
                    })()}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>START OTP</label>
                  <input type="text" value={manualBookingData.startotp} readOnly
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "#f8fafc" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>END OTP</label>
                  <input type="text" value={manualBookingData.endotp} readOnly
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "#f8fafc" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>FINAL PRICE (₹)</label>
                <input type="text" placeholder="Amount" value={manualBookingData.price}
                  onChange={(e) => {
                    const val = e.target.value;
                    const valNum = cleanNumeric(val);
                    const advNum = cleanNumeric(manualBookingData.advance_amount);
                    const newPending = Math.max(0, valNum - advNum);
                    setManualBookingData({
                      ...manualBookingData,
                      price: val,
                      pending_amount: String(newPending)
                    });
                  }}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>ADVANCE AMOUNT (₹)</label>
                  <input type="number" placeholder="e.g. 1000" value={manualBookingData.advance_amount}
                    onChange={(e) => {
                      const advVal = e.target.value;
                      const advNum = cleanNumeric(advVal);
                      const finalPriceNum = cleanNumeric(manualBookingData.price);
                      const newPending = Math.max(0, finalPriceNum - advNum);
                      setManualBookingData({
                        ...manualBookingData,
                        advance_amount: advVal,
                        pending_amount: String(newPending)
                      });
                    }}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>PENDING AMOUNT (₹)</label>
                  <input type="text" placeholder="Auto calculated" value={manualBookingData.pending_amount} readOnly
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "#f8fafc", fontWeight: "700", color: "#0f172a" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>REMARKS</label>
                <textarea placeholder="Enter manual booking remarks/information" value={manualBookingData.remarks}
                  onChange={(e) => setManualBookingData({ ...manualBookingData, remarks: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", height: "70px", resize: "none" }} />
              </div>

              <button
                onClick={handleCreateManualBooking}
                disabled={manualBookingLoading}
                style={{
                  marginTop: "10px", padding: "15px", borderRadius: "10px", border: "none",
                  background: "#22c55e", color: "#fff", fontWeight: "800", fontSize: "16px",
                  cursor: manualBookingLoading ? "not-allowed" : "pointer"
                }}
              >
                {manualBookingLoading ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ AUTO REFUND CONFIRM MODAL */}
      {showAutoRefundConfirm && pendingAutoRefundBooking && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100002,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px 40px",
              borderRadius: "20px",
              textAlign: "center",
              minWidth: "360px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
              Confirm Auto Refund
            </h3>
            <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "15px", lineHeight: "1.5" }}>
              Ready to send <b>₹{pendingAutoRefundBooking.refund_amount || pendingAutoRefundBooking.total_amount}</b> to the customer via Razorpay automatically?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                onClick={confirmAutoRefund}
                style={{
                  padding: "10px 28px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#22c55e",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                OK
              </button>
              <button
                onClick={() => { setShowAutoRefundConfirm(false); setPendingAutoRefundBooking(null); }}
                style={{
                  padding: "10px 28px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "#333",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INITIATE REFUND MODAL */}
      {showInitiateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100001,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px",
              borderRadius: "20px",
              width: "400px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: "700" }}>Initiate Refund</h3>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>
              Step 2: Enter refund details for <b>{initiateData.booking?.customer_name}</b>
            </p>

            {/* Auto-Calculation Breakdown Card */}
            {initiateData.calcDetails && (
              <div style={{
                backgroundColor: initiateData.calcDetails.isFullRefund ? "#f0fdf4" : "#fff7ed",
                border: initiateData.calcDetails.isFullRefund ? "1px solid #bbf7d0" : "1px solid #fed7aa",
                padding: "14px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#334155"
              }}>
                <div style={{ fontWeight: "700", marginBottom: "8px", color: initiateData.calcDetails.isFullRefund ? "#15803d" : "#c2410c", fontSize: "14px" }}>
                  {initiateData.calcDetails.isFullRefund
                    ? "✓ Full Refund Eligible (Cancelled ≥6h before service)"
                    : "⚠️ Cancellation Charge Applicable (Cancelled <6h before service)"}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Original Booking Amount:</span>
                  <b>₹{initiateData.calcDetails.totalAmount}</b>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Service Slot:</span>
                  <span>{initiateData.calcDetails.scheduledTimeStr}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Cancellation Time:</span>
                  <span>{initiateData.calcDetails.cancelTimeStr}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Deducted Cancellation Charge:</span>
                  <b style={{ color: initiateData.calcDetails.isFullRefund ? "#16a34a" : "#dc2626" }}>
                    {initiateData.calcDetails.isFullRefund ? "₹0" : `- ₹${initiateData.calcDetails.cancellationFee}`}
                  </b>
                </div>

                <div style={{
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: "1px dashed #cbd5e1",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a"
                }}>
                  <span>Auto Recommended Refund:</span>
                  <span style={{ color: "#16a34a", fontSize: "16px" }}>₹{initiateData.calcDetails.recommendedAmount}</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600" }}>Refund Amount (₹)</label>
              <input
                type="number"
                value={initiateData.amount}
                onChange={(e) => setInitiateData({ ...initiateData, amount: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  outline: "none"
                }}
                placeholder="Enter amount"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600" }}>Reason Note</label>
              <textarea
                value={initiateData.note}
                onChange={(e) => setInitiateData({ ...initiateData, note: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  outline: "none",
                  minHeight: "80px",
                  resize: "none"
                }}
                placeholder="e.g., Cleaner was late"
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleInitiateConfirm}
                disabled={isInitiating}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#facc15",
                  color: "#000",
                  fontWeight: "700",
                  cursor: isInitiating ? "not-allowed" : "pointer"
                }}
              >
                {isInitiating ? "Saving..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowInitiateModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ✅ COMMON NOTIFICATION MODAL (MAIN SCREEN) */}
      {showCommonModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "25px 35px",
              borderRadius: "16px",
              textAlign: "center",
              minWidth: "320px",
              maxWidth: "400px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <span
              onClick={() => setShowCommonModal(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "16px",
                fontSize: "20px",
                fontWeight: "700",
                color: "#64748b",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              &times;
            </span>
            <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "700", color: "#1e293b" }}>
              {commonModalTitle}
            </h3>
            <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "16px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
              {successMessage}
            </p>
            <button
              onClick={() => setShowCommonModal(false)}
              style={{
                padding: "8px 28px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor: "#facc15",
                color: "#1e293b",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* ✅ STAFF DUTY LOGS & WORKING HOURS MODAL */}
      {renderChecklistTasksModal()}
      {renderDutyLogsModal()}
    </div>
  );
}

export default BookingPage;

/* eslint-disable no-unused-vars */
