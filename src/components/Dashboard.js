import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseFunctionsUrl } from "../supabase";
import { SUPPORT_PHONE } from "../constants";
import Services from "./Services";
import Bookings from "./Bookings";
import CategoryHubCounts from "./CategoryHubCounts";
import PromotionalBanners from "./PromotionalBanners";
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
    <div style={{ position: "relative", display: "inline-block", marginTop: "4px" }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
            padding: "5px 10px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          🗺️ {coordsDisplay}
        </span>

        {/* View Map Link */}
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
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "700",
            textDecoration: "none",
            cursor: "pointer"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          📍 View Map
        </a>
      </div>

      {/* Hover Tooltip for Full Address */}
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

function Dashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminActiveTab") || "services";
  });
  const [serviceType, setServiceType] = useState("ALL");
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [staffImage, setStaffImage] = useState(null);

  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStaffAcceptedModal, setShowStaffAcceptedModal] = useState(false);
  const [acceptedBooking, setAcceptedBooking] = useState(null);
  const [showOtp, setShowOtp] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(() => {
    return localStorage.getItem("adminShowAddStaff") === "true";
  });
  const [staffLoading, setStaffLoading] = useState(false);
  const [isStaffViewOpen, setIsStaffViewOpen] = useState(false);
  const [showAvailableDropdown, setShowAvailableDropdown] = useState(false);
  const [showRecentTimeDropdown, setShowRecentTimeDropdown] = useState(false);
  const [recentPayoutFilterDate, setRecentPayoutFilterDate] = useState("");
  const [recentPayoutFilterTime, setRecentPayoutFilterTime] = useState("");
  const dropdownRef = useRef(null);
  const recentTimeDropdownRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAvailableDropdown(false);
      }
      if (recentTimeDropdownRef.current && !recentTimeDropdownRef.current.contains(event.target)) {
        setShowRecentTimeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  const [showEarnings, setShowEarnings] = useState(false);
  const [earningsStaff, setEarningsStaff] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [staffEarnings, setStaffEarnings] = useState({ monthly: 0, weekly: 0, total: 0, jobCount: 0, avgAmount: "₹0" });
  const [staffCancellationsMap, setStaffCancellationsMap] = useState({});

  const [earningsList, setEarningsList] = useState([]);
  const [earningsViewMode, setEarningsViewMode] = useState("summary"); // 'summary' or 'breakdown'
  const [selectedEarningsMetric, setSelectedEarningsMetric] = useState("total");
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

    const sMonthIdx = monthNames.findIndex(m => sTerm.includes(m));
    const sWeekMatch = sTerm.match(/(?:week\s*|w)(\d+)/i);
    const sWeekNum = sWeekMatch ? parseInt(sWeekMatch[1]) : null;

    if (!sTerm) return {
      ...staffEarnings,
      list: (earningsList || []).filter(item => (item.status || "").toLowerCase() === "paid"),
      monthTitle: `${curMonthName} EARNING`,
      weekTitle: `${curWeekName} EARNING`
    };

    const filtered = earningsList.filter(item => {
      const currentStatus = (item.status || item.payment_status || "").toLowerCase();
      if (currentStatus !== "paid") return false;

      // Unified Date Extraction: Prioritize paid_date, then paid_at, then earned_at
      const pAt = item.paid_date ? new Date(item.paid_date) : (item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at));
      const itemFirstOfMonth = new Date(pAt.getFullYear(), pAt.getMonth(), 1);
      const itemFirstSun = new Date(itemFirstOfMonth);
      itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
      // Rounding correction to handle timezone shifts
      const itemDiff = Math.round((pAt.getTime() - itemFirstSun.getTime()) / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(itemDiff / 7) + 1;

      // Unified Display Matching: Matches exactly what you see in the "Week Info" column
      const itemMonthName = pAt.toLocaleString('default', { month: 'long' }).toLowerCase();

      if (sMonthIdx !== -1 || sWeekNum !== null) {
        const monthMatch = sMonthIdx !== -1 ? itemMonthName.includes(monthNames[sMonthIdx]) : true;
        const weekMatch = sWeekNum !== null ? (weekNum === sWeekNum) : true;
        return monthMatch && weekMatch;
      }

      return item.service_title?.toLowerCase().includes(sTerm) || item.booking_id?.toLowerCase().includes(sTerm);
    });

    const sum = filtered.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);

    // Independent Monthly Calculation: Sum of the month ONLY (ignores week search)
    const monthlyOnlyFiltered = sMonthIdx === -1 ? [] : earningsList.filter(item => {
      if ((item.status || "").toLowerCase() !== "paid") return false;
      const pAt = item.paid_date ? new Date(item.paid_date) : (item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at));
      return pAt.getMonth() === sMonthIdx;
    });
    const monthlyOnlySum = monthlyOnlyFiltered.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);

    const finalMonthTitle = sMonthIdx !== -1 ? `${monthNames[sMonthIdx].toUpperCase()} EARNING` : `${curMonthName} EARNING`;
    const finalWeekTitle = (sTerm.includes("week") || sTerm.startsWith("w"))
      ? `${sTerm.toUpperCase()} EARNING`
      : `${curMonthName} WEEK ${curWeekNum} EARNING`;

    return {
      list: filtered,
      weekly: sWeekNum !== null ? `₹${sum.toLocaleString()}` : staffEarnings.weekly,
      monthly: sMonthIdx !== -1 ? `₹${monthlyOnlySum.toLocaleString()}` : staffEarnings.monthly,
      total: staffEarnings.total,
      // Keep Total Jobs and Average undisturbed (Lifetime totals)
      jobCount: staffEarnings.jobCount,
      avgAmount: staffEarnings.avgAmount,
      monthTitle: finalMonthTitle,
      weekTitle: finalWeekTitle
    };
  })();

  // Persist showAddStaff to localStorage

  useEffect(() => {
    localStorage.setItem("adminShowAddStaff", showAddStaff);
  }, [showAddStaff]);



  // Fetch data on initial load if tab demands it
  useEffect(() => {
    const savedTab = localStorage.getItem("adminActiveTab");
    if (savedTab === "coupons") {
      fetchCoupons();
      fetchAllServices();
    } else if (savedTab === "offers") {
      fetchAllServices();
      fetchPopups();
    } else if (savedTab === "staff-summary") {
      fetchStaffCounts();
    } else if (savedTab === "pricing") {
      fetchPricingServices();
    } else if (savedTab === "hero-images") {
      fetchHeroImages();
    } else if (savedTab === "schedule" || savedTab === "service-time") {
      fetchScheduleConfig();
    } else if (savedTab === "partner-payments") {
      fetchPartnerPayments();
      fetchAllStaffEarningsTable();
    } else if (savedTab === "staff-referrals") {
      fetchStaffReferrals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    const channels = [
      supabase.channel("dashboard-coupons")
        .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, async () => {
          try {
            await fetchCoupons();
          } catch (err) {
            console.error("Coupon sync failed:", err);
          }
        }).subscribe(),

      supabase.channel("dashboard-offers")
        .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, async () => {
          try {
            await fetchAllServices();
          } catch (err) {
            console.error("Offer sync failed:", err);
          }
        }).subscribe(),

      supabase.channel("dashboard-popups")
        .on("postgres_changes", { event: "*", schema: "public", table: "app_popups" }, async () => {
          try {
            await fetchPopups();
          } catch (err) {
            console.error("Popup sync failed:", err);
          }
        }).subscribe(),

      supabase.channel("dashboard-staff-summary")
        .on("postgres_changes", { event: "*", schema: "public", table: "staff_profile" }, async () => {
          try {
            await fetchStaffCounts();
            await checkOutOfZoneStaff();
          } catch (err) {
            console.error("Staff summary sync failed:", err);
          }
        }).subscribe(),

      supabase.channel("dashboard-bookings-summary")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, async (payload) => {
          console.log("dashboard-bookings-summary event received:", payload.eventType, payload.new?.id, payload.new?.staff_response);
          try {
            // Run staff counts update in background without blocking
            fetchStaffCounts().catch((err) => console.error("Staff summary sync failed:", err));

            // Handle real-time staff acceptance logic
            if (payload.eventType === "UPDATE") {
              const oldResp = payload.old?.staff_response?.trim()?.toUpperCase();
              const newResp = payload.new?.staff_response?.trim()?.toUpperCase();
              const isApprovedTransition =
                oldResp !== "APPROVED" && oldResp !== "APPROVE" &&
                (newResp === "APPROVED" || newResp === "APPROVE");

              if (isApprovedTransition) {
                let finalStartOtp = payload.new.startotp;
                let finalEndOtp = payload.new.endotp;

                if (!finalStartOtp || !finalEndOtp) {
                  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
                  let sOtp = generateOtp();
                  let eOtp = generateOtp();
                  while (sOtp === eOtp) eOtp = generateOtp();

                  // Try to update DB to ASSIGNED with OTPs
                  const { data: updatedData, error: updateError } = await supabase
                    .from("bookings")
                    .update({
                      startotp: sOtp,
                      endotp: eOtp,
                      work_status: "ASSIGNED",
                      assigned_at: new Date().toISOString()
                    })
                    .eq("id", payload.new.id)
                    .is("startotp", null)
                    .select();

                  if (updateError) {
                    console.error("Error updating booking to ASSIGNED:", updateError);
                  }

                  if (updatedData && updatedData[0]) {
                    finalStartOtp = updatedData[0].startotp;
                    finalEndOtp = updatedData[0].endotp;
                  } else {
                    // Fetch latest from DB in case another client updated it
                    try {
                      const { data: currentBooking } = await supabase
                        .from("bookings")
                        .select("startotp, endotp")
                        .eq("id", payload.new.id)
                        .single();

                      if (currentBooking && currentBooking.startotp && currentBooking.endotp) {
                        finalStartOtp = currentBooking.startotp;
                        finalEndOtp = currentBooking.endotp;
                      } else {
                        finalStartOtp = sOtp;
                        finalEndOtp = eOtp;
                      }
                    } catch (fetchErr) {
                      console.error("Error fetching latest booking OTPs:", fetchErr);
                      finalStartOtp = sOtp;
                      finalEndOtp = eOtp;
                    }
                  }
                }

                // Update staff assigned count in background
                if (payload.new.assigned_staff_email) {
                  (async () => {
                    try {
                      const { data: staffData } = await supabase
                        .from("staff_profile")
                        .select("id")
                        .eq("email", payload.new.assigned_staff_email)
                        .single();
                      if (staffData) {
                        await supabase.rpc("increment_assigned_count", {
                          staff_id: staffData.id,
                        });
                      }
                    } catch (rpcErr) {
                      console.error("Failed to increment staff assigned count:", rpcErr);
                    }
                  })();
                }

                // Retrieve staff name
                let staffName = payload.new.assigned_staff_email || "Staff";
                if (payload.new.assigned_staff_email) {
                  try {
                    const { data: staffProfile } = await supabase
                      .from("staff_profile")
                      .select("name")
                      .eq("email", payload.new.assigned_staff_email)
                      .single();
                    if (staffProfile) {
                      staffName = staffProfile.name;
                    }
                  } catch (nameErr) {
                    console.error("Failed to fetch staff name:", nameErr);
                  }
                }

                // Trigger global modal popup
                setAcceptedBooking({
                  id: payload.new.id,
                  staffName: staffName,
                  startOtp: finalStartOtp,
                  endOtp: finalEndOtp
                });
                setShowOtp(false);
                setShowStaffAcceptedModal(true);
              }
            }
          } catch (err) {
            console.error("Booking summary sync failed:", err);
          }
        }).subscribe((status) => console.log("dashboard-bookings-summary subscription status:", status)),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStaffAssigned = (e) => {
      if (e.detail) {
        setAcceptedBooking({
          staffName: e.detail.staffName,
          startOtp: e.detail.startOtp,
          endOtp: e.detail.endOtp,
        });
        setShowOtp(false);
        setShowStaffAcceptedModal(true);
      }
    };
    window.addEventListener("staff-assigned-modal", handleStaffAssigned);
    return () => window.removeEventListener("staff-assigned-modal", handleStaffAssigned);
  }, []);

  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "staff",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    aadhar_number: "",
    tagged_partner: "",
    referral_code: "",
    referred_by: "",
    referral_form_id: "",
  });

  // Automatic Referral Code Generation
  useEffect(() => {
    if (showAddStaff && !staffForm.referral_code) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setStaffForm(prev => ({ ...prev, referral_code: code }));
    }
  }, [showAddStaff, staffForm.referral_code]);

  const [outOfZoneAlert, setOutOfZoneAlert] = useState({
    show: false,
    staffId: null,
    staffName: "",
    staffPhone: "",
    staffEmail: "",
    hubName: "",
    liveLocation: "",
  });
  const [dismissedOutOfZoneStaffIds, setDismissedOutOfZoneStaffIds] = useState(() => {
    try {
      const saved = localStorage.getItem("dismissedOutOfZoneStaffIds");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const audioRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));
  const lastPlayedStaffIdRef = useRef(null);

  const playAlertSound = () => {
    // 1. Web Audio API chime (instant, offline, zero network latency, guaranteed to play)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        const now = audioCtx.currentTime;

        // Tone 1
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // Tone 2
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1046.5, now + 0.15);
        gain2.gain.setValueAtTime(0.35, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.45);
      }
    } catch (e) {
      console.warn("Web Audio playback failed:", e);
    }

    // 2. Secondary HTML5 Audio fallback
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((e) => console.warn("HTML5 audio playback blocked/failed:", e));
      }
    } catch (e) {
      console.warn("HTML5 audio failed:", e);
    }
  };

  useEffect(() => {
    if (outOfZoneAlert.show && outOfZoneAlert.staffId) {
      if (lastPlayedStaffIdRef.current !== String(outOfZoneAlert.staffId)) {
        playAlertSound();
        lastPlayedStaffIdRef.current = String(outOfZoneAlert.staffId);
      }
    } else {
      lastPlayedStaffIdRef.current = null;
    }
  }, [outOfZoneAlert.show, outOfZoneAlert.staffId]);

  const checkOutOfZoneStaff = useCallback(async () => {
    try {
      const { data: staffList } = await supabase.from("staff_profile").select("*");
      if (!staffList || staffList.length === 0) {
        setOutOfZoneAlert(prev => (prev.show ? { ...prev, show: false, staffId: null } : prev));
        return;
      }

      const outStaffList = staffList.filter((s) => {
        return s.is_out_of_zone === true || s.is_out_of_zone === "true" || s.is_out_of_zone === "TRUE";
      });

      // Reset dismissed tracking for staff members who returned to zone (is_out_of_zone is now FALSE)
      setDismissedOutOfZoneStaffIds(prev => {
        const activeOutIds = outStaffList.map(s => String(s.id));
        const filtered = prev.filter(id => activeOutIds.includes(id));
        if (filtered.length !== prev.length) {
          try {
            localStorage.setItem("dismissedOutOfZoneStaffIds", JSON.stringify(filtered));
          } catch (e) { }
          return filtered;
        }
        return prev;
      });

      if (outStaffList.length > 0) {
        const activeTarget = outStaffList.find((s) => !dismissedOutOfZoneStaffIds.includes(String(s.id)));
        if (activeTarget) {
          let hubName = "N/A";
          try {
            const { data: hCats } = await supabase.from("hub_category_counts").select("*");
            if (hCats && activeTarget.email) {
              const matchedHubs = hCats.filter(hc => hc.assigned_staff && hc.assigned_staff.toLowerCase().includes(activeTarget.email.toLowerCase()));
              if (matchedHubs.length > 0) {
                hubName = Array.from(new Set(matchedHubs.map(h => h.hub).filter(Boolean))).join(", ");
              }
            }
          } catch (hErr) {
            console.error("Error resolving staff hub:", hErr);
          }

          setOutOfZoneAlert({
            show: true,
            staffId: activeTarget.id,
            staffName: activeTarget.name || "Staff Partner",
            staffPhone: activeTarget.phone || "N/A",
            staffEmail: activeTarget.email || "N/A",
            hubName: hubName,
            liveLocation: activeTarget.live_location || "N/A",
          });
        } else {
          setOutOfZoneAlert(prev => (prev.show ? { ...prev, show: false, staffId: null } : prev));
        }
      } else {
        // Automatically hide pop-up when is_out_of_zone is FALSE for all staff members
        setOutOfZoneAlert(prev => (prev.show ? { ...prev, show: false, staffId: null } : prev));
      }
    } catch (err) {
      console.error("Error checking out of zone staff:", err);
    }
  }, [dismissedOutOfZoneStaffIds]);

  useEffect(() => {
    checkOutOfZoneStaff();
    const interval = setInterval(() => {
      checkOutOfZoneStaff();
    }, 4000);
    return () => clearInterval(interval);
  }, [checkOutOfZoneStaff]);

  const handleDismissOutOfZoneAlert = () => {
    if (outOfZoneAlert.staffId) {
      setDismissedOutOfZoneStaffIds(prev => {
        const updated = Array.from(new Set([...prev, String(outOfZoneAlert.staffId)]));
        try {
          localStorage.setItem("dismissedOutOfZoneStaffIds", JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
    }
    setOutOfZoneAlert(prev => ({ ...prev, show: false }));
  };

  const [alertConfig, setAlertConfig] = useState({
    show: false,
    title: "Alert",
    message: "",
    type: "info",
  });
  const [confirmConfig, setConfirmConfig] = useState({
    show: false,
    title: "Confirm",
    message: "",
    onConfirm: null,
  });
  const [staffExistsMsg, setStaffExistsMsg] = useState("");

  const [staffCounts, setStaffCounts] = useState({
    available: 0,
    unassignedBookings: 0,
    assignedStaff: [],
    unassignedStaff: [],
    totalServicesStaff: [],
  });

  const [showStaffServices, setShowStaffServices] = useState(false);
  const [staffServices, setStaffServices] = useState([]);
  const [selectedStaffInfo, setSelectedStaffInfo] = useState({
    name: "",
    email: "",
  });
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingStaffCounts, setLoadingStaffCounts] = useState(false);

  // COUPON STATE
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount: "",
    phone: "",
    serviceIds: [],
  });
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const serviceDropdownRef = useRef(null);



  // Click outside to close service multi-select dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target)
      ) {
        setServiceDropdownOpen(false);
      }
    };

    if (serviceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [serviceDropdownOpen]);

  // OFFERS STATE
  const [allServices, setAllServices] = useState([]);
  const [offerList, setOfferList] = useState([]); // New state for list
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerForm, setOfferForm] = useState({
    category: "",
    serviceId: "",
    percentage: "",
    description: "",
  });

  // POPUP STATE
  const [appPopups, setAppPopups] = useState([]);
  const [loadingPopups, setLoadingPopups] = useState(false);
  const [popupImage, setPopupImage] = useState(null);
  const [popupForm, setPopupForm] = useState({
    title: "",
    description: "",
  });

  // HERO IMAGES STATE
  const [heroTab, setHeroTab] = useState("staff"); // 'staff' | 'web' | 'app'
  const [heroStaffImages, setHeroStaffImages] = useState([]);
  const [heroWebImages, setHeroWebImages] = useState([]);
  const [heroAppImages, setHeroAppImages] = useState([]);
  const [heroUploading, setHeroUploading] = useState(false);
  const [loadingHero, setLoadingHero] = useState(false);
  const [heroStaffFile, setHeroStaffFile] = useState(null);
  const [heroWebFile, setHeroWebFile] = useState(null);
  const [heroAppFile, setHeroAppFile] = useState(null);
  const [heroStaffPriority, setHeroStaffPriority] = useState("");
  const [heroWebPriority, setHeroWebPriority] = useState("");
  const [heroAppPriority, setHeroAppPriority] = useState("");
  const [heroStaffActive, setHeroStaffActive] = useState("");
  const [heroWebActive, setHeroWebActive] = useState("");
  const [heroAppActive, setHeroAppActive] = useState("");
  const [editingHeroId, setEditingHeroId] = useState(null);
  const [editHeroPriority, setEditHeroPriority] = useState("");
  const [editHeroActive, setEditHeroActive] = useState("");

  const [scheduleConfig, setScheduleConfig] = useState({
    time_slots: [],
    years: [],
    service_time_rules: [],
    date_time_slots: {},
  });
  const [selectedSlotDate, setSelectedSlotDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [newSlot, setNewSlot] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newLastBookingTime, setNewLastBookingTime] = useState("");

  // PRICING TAB STATE
  const [pricingServices, setPricingServices] = useState([]);
  const [pricingEdits, setPricingEdits] = useState({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [loadingAllPricing, setLoadingAllPricing] = useState(false);

  // PARTNER PAYMENTS STATE
  const [payoutStaffList, setPayoutStaffList] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutProcessing, setPayoutProcessing] = useState(false);
  const [payoutCycleInfo, setPayoutCycleInfo] = useState({ start: "", end: "", label: "" });
  const [payoutDateMode, setPayoutDateMode] = useState("auto"); // "auto" | "custom"
  const [payoutCustomRange, setPayoutCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPayoutStaff, setSelectedPayoutStaff] = useState(null);
  const [payoutBreakdown, setPayoutBreakdown] = useState([]);
  const [payoutShowHistory, setPayoutShowHistory] = useState(false);
  const [payoutTableData, setPayoutTableData] = useState([]);
  const [payoutTableLoading, setPayoutTableLoading] = useState(false);
  const [payoutFilterMode, setPayoutFilterMode] = useState("all");
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState([]); // array of "pending", "paid" - empty means show all
  const [payoutSearchQuery, setPayoutSearchQuery] = useState("");
  const [payoutFilterMonth, setPayoutFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payoutFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutSelectedRows, setPayoutSelectedRows] = useState(new Set());
  const [payoutAvailableWeeks, setPayoutAvailableWeeks] = useState([]);
  const [payoutTodayWeek, setPayoutTodayWeek] = useState(null); // Track the current week of the current month
  const [payoutFilterWeek, setPayoutFilterWeek] = useState("");
  const [payoutFilterWeekDate, setPayoutFilterWeekDate] = useState("");
  const [staffServicesModalData, setStaffServicesModalData] = useState(null); // { staffName, services[] }
  const [payoutImportRef] = [useRef(null)];
  const [staffReferrals, setStaffReferrals] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [expandedReferrers, setExpandedReferrers] = useState({});
  const referralImportRef = useRef(null);
  const [referralProcessing, setReferralProcessing] = useState(false);


  // Auto-refresh Partner Payments data when filters or tab change
  useEffect(() => {
    if (activeTab === "partner-payments") {
      fetchPartnerPayments(selectedPayoutStaff);
      if (!selectedPayoutStaff) fetchAllStaffEarningsTable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutDateMode, activeTab, payoutShowHistory, payoutStatusFilter, payoutFilterMonth, recentPayoutFilterDate, recentPayoutFilterTime]);

  // Persist pricingEdits to localStorage
  useEffect(() => {
    if (Object.keys(pricingEdits).length > 0) {
      localStorage.setItem("pricingEditsDraft", JSON.stringify(pricingEdits));
    }
  }, [pricingEdits]);

  const heroStaffInputRef = useRef(null);
  const heroWebInputRef = useRef(null);
  const heroAppInputRef = useRef(null);
  const popupImageRef = useRef(null);

  const navigate = useNavigate();
  // ================= ADMIN ACCESS PROTECTION =================
  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/");
          return;
        }

        const { data: adminData } = await supabase
          .from("admin_profile")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        // If user is not admin
        if (!adminData) {
          alert("You are not authorized to access the Admin Dashboard");

          await supabase.auth.signOut();
          navigate("/");
        }

      } catch (err) {
        console.error("Admin verification failed:", err);
        await supabase.auth.signOut();
        navigate("/");
      }
    };

    verifyAdminAccess();
  }, [navigate]);

  // Scroll lock effect for modals
  useEffect(() => {
    const isModalOpen =
      showStaffServices ||
      showAddStaff ||
      alertConfig.show ||
      confirmConfig.show ||
      showLogoutConfirm;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    showStaffServices,
    showAddStaff,
    alertConfig.show,
    confirmConfig.show,
    showLogoutConfirm,
  ]);

  // Safety Link for Staff: Link phone on first login if not already linked
  // This ensures the user can login with Phone OTP next time without creating a duplicate.
  useEffect(() => {
    const linkPhoneIdentity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const metadataPhone = user.user_metadata?.phone;
        const providers = user.app_metadata?.providers || [];
        const isPhoneLinked = providers.includes("phone");

        if (metadataPhone && !isPhoneLinked) {
          console.log("Linking phone identity on first login...");
          const { error } = await supabase.auth.updateUser({
            phone: metadataPhone,
          });
          if (error) {
            console.warn("Auto-linking phone failed:", error.message);
          }
        }
      } catch (err) {
        console.error("First-login link check error:", err);
      }
    };
    linkPhoneIdentity();
  }, []);

  const triggerAlert = (message, title = "Alert", type = "info") => {
    setAlertConfig({ show: true, title, message, type });
  };

  const triggerConfirm = (message, onConfirm, title = "Confirm") => {
    setConfirmConfig({ show: true, title, message, onConfirm });
  };

  const fetchStaffCounts = async () => {
    try {
      setLoadingStaffCounts(true);
      // 1. Fetch all staff profiles
      const { data: staffData } = await supabase
        .from("staff_profile")
        .select("id, name, email, is_available");


      // 2. Fetch all booking assignments
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("assigned_staff_email, work_status");

      const availableCount =
        staffData?.filter((s) => s.is_available).length || 0;
      const unassignedBookingsCount =
        bookingsData?.filter((b) => !b.assigned_staff_email).length || 0;

      const workloadMap = {};
      bookingsData?.forEach((b) => {
        if (b.assigned_staff_email) {
          const emailKey = b.assigned_staff_email.trim().toLowerCase();
          workloadMap[emailKey] = (workloadMap[emailKey] || 0) + 1;
        }
      });

      const assignedStaff = [];
      const unassignedStaff = [];
      const totalServicesStaff = [];

      staffData?.forEach((s) => {
        const emailKey = s.email?.trim()?.toLowerCase();
        const totalCount = workloadMap[emailKey] || 0;

        // Calculate active count (strictly matching "assigned" status)
        const activeCount = bookingsData?.filter(b =>
          b.assigned_staff_email?.trim()?.toLowerCase() === emailKey &&
          b.work_status?.toLowerCase() === "assigned"
        ).length || 0;

        if (activeCount > 0) {
          assignedStaff.push({ ...s, count: activeCount });
        } else {
          unassignedStaff.push({ ...s, count: totalCount });
        }

        if (totalCount > 0) {
          totalServicesStaff.push({ ...s, count: totalCount });
        }
      });

      setStaffCounts({
        available: availableCount,
        unassignedBookings: unassignedBookingsCount,
        assignedStaff,
        unassignedStaff,
        totalServicesStaff,
      });
    } catch (error) {
      console.error("Error fetching staff counts:", error);
    } finally {
      setLoadingStaffCounts(false);
    }
  };

  const handleViewEarnings = async (staff) => {
    if (!staff?.email) return;

    setEarningsStaff(staff);
    setShowEarnings(true);
    setSelectedEarningsMetric("total");
    setEarningsLoading(true);

    try {
      console.log("Fetching earnings for staff email:", staff.email.trim());

      // We no longer need to fetch the profile here as aggregates are calculated dynamically below

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

      // 3. Process Aggregates (Paid + Pending for true performance stats)
      const now = new Date();

      // Calculate accurate current week number based on Sunday-start calendar
      const tempFirst = new Date(now.getFullYear(), now.getMonth(), 1);
      const tempSun = new Date(tempFirst);
      tempSun.setDate(tempSun.getDate() - tempSun.getDay());

      let totalEarning = 0;
      let monthlyEarning = 0;
      let weeklyEarning = 0;
      let paidCount = 0;

      if (rawEarnings && rawEarnings.length > 0) {
        rawEarnings.forEach(record => {
          const status = (record.status || record.payment_status || "").toLowerCase();
          if (status === "paid") {
            const amt = parseFloat(record.amount || 0);
            totalEarning += amt;
            paidCount += 1;

            const date = record.paid_at ? new Date(record.paid_at) : new Date(record.earned_at);

            // Item week calculation
            const itemFirstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const itemFirstSun = new Date(itemFirstOfMonth);
            itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());

            // Show Lifetime Paid totals (matching the main summary table)
            monthlyEarning += amt;
            weeklyEarning += amt;
          }
        });
      }

      console.log("Calculated Paid Earnings Stats:", { weeklyEarning, monthlyEarning, totalEarning });

      const avgPerJob = paidCount > 0 ? (totalEarning / paidCount) : 0;

      setStaffEarnings({
        monthly: `₹${monthlyEarning.toLocaleString()}`,
        weekly: `₹${weeklyEarning.toLocaleString()}`,
        total: `₹${totalEarning.toLocaleString()}`,
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

  const fetchStaffServicesData = async (staff, onlyActive = false) => {
    try {
      setLoadingServices(true);
      setSelectedStaffInfo({ name: staff.name, email: staff.email });
      setShowStaffServices(true);

      let query = supabase
        .from("bookings")
        .select("*")
        .eq("assigned_staff_email", staff.email);

      if (onlyActive) {
        query = query.eq("work_status", "ASSIGNED");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      const filteredData = (onlyActive && data) ? data.filter(b => b.work_status?.toLowerCase() === "assigned") : (data || []);
      setStaffServices(filteredData);
    } catch (err) {
      console.error("Error fetching staff services:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setShowMenu(false);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const cancelLogout = () => {

    setShowLogoutConfirm(false);
  };

  const handleProfile = () => {
    navigate("/profile");
    setShowMenu(false);
  };

  const handleAddStaff = async () => {
    const name = staffForm.name.trim();
    const phone = staffForm.phone.trim();
    const email = staffForm.email.trim().toLowerCase();
    const password = staffForm.password;
    const account_holder_name = staffForm.account_holder_name.trim();
    const account_number = staffForm.account_number.trim();
    const ifsc_code = staffForm.ifsc_code.trim();
    const bank_name = staffForm.bank_name.trim();
    const aadhar_number = (staffForm.aadhar_number || "").trim();
    const tagged_partner = (staffForm.tagged_partner || "").trim();

    if (!name || !phone || !email || !password) return;

    if (phone.length !== 10) {
      triggerAlert("Phone number must be exactly 10 digits", "Error", "error");
      return;
    }

    // Validate image ratio before proceeding
    if (staffImage) {
      const isValid = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width === img.height);
        img.src = URL.createObjectURL(staffImage);
      });
      if (!isValid) {
        triggerAlert("Image ratio must be 1:1", "Upload Error", "error");
        return;
      }
    }

    try {
      setStaffLoading(true);
      setStaffExistsMsg("");
      const formattedPhone = `+91${phone}`;

      // 1. Check if staff already exists in public table
      const { data: existingStaff } = await supabase
        .from("staff_profile")
        .select("id")
        .or(`email.eq.${email},phone.eq.${formattedPhone}`)
        .maybeSingle();

      if (existingStaff) {
        setStaffExistsMsg("Staff with this email or phone already exists");
        setStaffLoading(false);
        return;
      }

      console.log("=== Debugging Staff Addition ===");
      let funcData, funcError;

      // Step A: Invoke Primary Edge Function
      try {
        console.log("Invoking edge function 'create-staff-user'...");
        const invokeRes = await supabase.functions.invoke('create-staff-user', {
          body: { email, password, phone: formattedPhone, name }
        });
        funcData = invokeRes.data;
        funcError = invokeRes.error;
      } catch (e) {
        console.error("Invoke Exception:", e);
        funcError = e;
      }

      // Step B: Error Detection & Fallback
      let errMsg = "";
      if (funcError || !funcData?.success) {
        // Parse error message
        try {
          if (funcError?.context?.json) {
            const errBody = await funcError.context.json();
            errMsg = errBody?.error || errBody?.message || funcError?.message || "Creation failed";
          } else {
            errMsg = funcData?.error || funcError?.message || "Creation failed";
          }
        } catch {
          errMsg = funcError?.message || "Creation failed";
        }

        console.error("Primary Creation Failed:", errMsg);

        // FALLBACK: If "Invalid JWT" or "Unauthorized", retry with No-Auth Fetch
        if (errMsg.includes("Invalid JWT") || errMsg.includes("Unauthorized") || (typeof funcError?.status === 'number' && funcError.status === 401)) {
          console.warn("Detected 401/JWT error. Attempting Fallback Fetch...");
          try {
            const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();
            const rawResponse = await fetch(`${supabaseFunctionsUrl}/create-staff-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
              body: JSON.stringify({ email, password, phone: formattedPhone, name })
            });

            if (rawResponse.ok) {
              funcData = await rawResponse.json();
              funcError = null;
              errMsg = "";
              console.log("Fallback Succeeded:", funcData);
            } else {
              const errBody = await rawResponse.json().catch(() => ({}));
              errMsg = errBody.error || errBody.message || `HTTP ${rawResponse.status}`;
            }
          } catch (e) {
            console.error("Fallback Exception:", e);
          }
        }
      }

      // Step C: Finalize Database Insertion
      if (funcError || !funcData?.success) {
        if (errMsg === "Staff with this email or phone already exists") {
          setStaffExistsMsg(errMsg);
        } else {
          triggerAlert(errMsg || "Creation failed", "Error", "error");
        }
      } else {
        const userId = funcData.user_id;
        let imageUrl = null;

        // Image upload if selected
        if (staffImage) {
          const fileExt = staffImage.name.split(".").pop();
          const fileName = `${name.replace(/\s+/g, "_")}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars").upload(fileName, staffImage, { upsert: true });

          if (!uploadError) {
            imageUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
          } else {
            console.error("Upload Error:", uploadError);
          }
        }

        // Check if staff_profile row already exists (e.g. created by Edge Function or DB trigger)
        const profilePayload = {
          name,
          phone: formattedPhone,
          email,
          role: "staff",
          avatar_url: imageUrl,
          BNF_NAME: account_holder_name,
          BENE_ACC_NO: account_number,
          BENE_IFSC: ifsc_code,
          bank_name,
          aadhar_number,
          tagged_partner,
          referral_code: staffForm.referral_code,
          referred_by: staffForm.referred_by || null,
          referral_form_id: staffForm.referral_form_id || null,
        };

        const { data: existingProf } = await supabase
          .from("staff_profile")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        let insertError;
        if (existingProf) {
          const { error: updateErr } = await supabase
            .from("staff_profile")
            .update(profilePayload)
            .eq("id", userId);
          insertError = updateErr;
        } else {
          const { error: insErr } = await supabase
            .from("staff_profile")
            .insert({
              id: userId,
              ...profilePayload,
            });
          insertError = insErr;
        }

        if (insertError) {
          console.error("DB Save Error:", insertError);
          triggerAlert(insertError.message, "Database Error", "error");
        } else {
          // If onboarding a referred candidate, sync any edited details back to staff_referral_forms
          if (staffForm.referral_form_id) {
            await supabase
              .from("staff_referral_forms")
              .update({
                full_name: name,
                phone_number: formattedPhone.replace(/\+91/, ""),
                email: email,
              })
              .eq("id", staffForm.referral_form_id);
          }

          triggerAlert("Staff added successfully ✅", "Success", "success");
          setStaffForm({
            name: "",
            phone: "",
            email: "",
            password: "",
            role: "staff",
            account_holder_name: "",
            account_number: "",
            ifsc_code: "",
            bank_name: "",
            aadhar_number: "",
            tagged_partner: "",
            referral_code: "",
            referred_by: "",
            referral_form_id: "",
          });
          setStaffImage(null);
        }
      }
    } catch (e) {
      console.error("Critical Failure in handleAddStaff:", e);
      triggerAlert(e.message, "System Error", "error");
    } finally {
      setStaffLoading(false);
    }
  };

  /* ================= COUPON FLOW ================= */
  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      // Delete any NEW_USER_WELCOME record in DB offers table if present
      await supabase.from("offers").delete().eq("service_type", "NEW_USER_WELCOME");
      localStorage.removeItem("adminNewUserOfferEnabled");
      localStorage.removeItem("adminNewUserOfferPercent");
      if (allServices.length === 0) {
        await fetchAllServices();
      }
      const { data, error } = await supabase
        .from("coupons")
        .select("*, services(title)")
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback if relation is not configured in Supabase PostgREST schema cache
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: false });
        if (fallbackError) throw fallbackError;
        setCoupons(fallbackData || []);
      } else {
        setCoupons(data || []);
      }
    } catch (err) {
      console.error("Fetch Coupons Error:", err);
    } finally {
      // Wait, should be false
      setLoadingCoupons(false);
    }
  };

  const handleAddCoupon = async () => {
    const { code, discount, phone, serviceIds } = couponForm;
    if (!code || !discount || !phone) {
      triggerAlert("Please fill all fields", "Input Required", "info");
      return;
    }

    if (phone.length !== 10) {
      triggerAlert("Phone number must be 10 digits", "Error", "error");
      return;
    }

    try {
      setLoadingCoupons(true);
      const insertPayload = {
        coupon_code: code.toUpperCase().trim(),
        discount_percentage: parseFloat(discount),
        phone_number: phone.trim(),
        is_used: false,
      };

      if (serviceIds && serviceIds.length > 0) {
        insertPayload.service_ids = serviceIds;
        insertPayload.service_id = serviceIds[0];
      }

      const { error } = await supabase.from("coupons").insert(insertPayload);

      if (error) {
        if (error.message && error.message.includes("service_ids")) {
          // If column service_ids doesn't exist yet, fallback to single column service_id
          delete insertPayload.service_ids;
          const { error: fallbackErr } = await supabase
            .from("coupons")
            .insert(insertPayload);
          if (fallbackErr) throw fallbackErr;
        } else if (error.code === "23505") {
          triggerAlert("Coupon code already exists!", "Error", "error");
          return;
        } else {
          throw error;
        }
      }

      setCouponForm({ code: "", discount: "", phone: "", serviceIds: [] });
      setServiceDropdownOpen(false);
      setServiceSearch("");
      fetchCoupons();
    } catch (err) {
      console.error("Add Coupon Error:", err);
      triggerAlert(err.message, "Error", "error");
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    triggerConfirm(
      "Are you sure you want to delete this coupon?",
      async () => {
        try {
          const { error } = await supabase
            .from("coupons")
            .delete()
            .eq("id", id);
          if (error) throw error;
          fetchCoupons();
          triggerAlert("Coupon deleted successfully", "Success", "success");
        } catch (err) {
          console.error("Delete Coupon Error:", err);
          triggerAlert(err.message, "Delete Failed", "error");
        }
      },
      "Delete Coupon",
    );
  };

  const handleToggleCoupon = async (coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_used: !coupon.is_used })
        .eq("id", coupon.id);

      if (error) throw error;
      fetchCoupons();
    } catch (err) {
      console.error("Toggle Coupon Error:", err);
    }
  };

  const fetchAllServices = async () => {
    try {
      setLoadingOffers(true);

      // 1. Fetch all services for dropdown
      const { data: servicesData, error: sError } = await supabase
        .from("services")
        .select("id, title, service_type")
        .order("title", { ascending: true });

      if (sError) throw sError;
      setAllServices(servicesData || []);

      // 2. Fetch configured offers from 'offers' table
      const { data: offersData, error: oError } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (oError) {
        console.warn("Offers table might not exist yet:", oError.message);
        setOfferList([]);
      } else {
        setOfferList(offersData || []);
      }
    } catch (err) {
      console.error("Fetch All Services/Offers Error:", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleUpdateOffer = async () => {
    const { serviceId, percentage } = offerForm;
    if (!serviceId || percentage === "") {
      triggerAlert(
        "Please select a service and enter percentage",
        "Selection Required",
        "info",
      );
      return;
    }

    try {
      setLoadingOffers(true);

      // Get the name/category from allServices state for storage
      const selectedService = allServices.find((s) => s.id === serviceId);

      // Disable all app popups first (Mutual Exclusivity)
      await supabase
        .from("app_popups")
        .update({ is_active: false })
        .eq("is_active", true);

      const { error } = await supabase.from("offers").upsert(
        {
          service_type: selectedService?.service_type || offerForm.category,
          title: selectedService?.title || "Unknown",
          offer_percentage: parseFloat(percentage),
          description: offerForm.description,
          is_offer_enabled: true,
        },
        { onConflict: "service_type,title" },
      );

      if (error) throw error;

      setOfferForm({
        category: "",
        serviceId: "",
        percentage: "",
        description: "",
      });
      fetchAllServices();
      fetchPopups(); // Refresh both to reflect exclusivity
      triggerAlert("", "Update Success", "success");
    } catch (err) {
      console.error("Update Offer Error:", err);
      triggerAlert(err.message, "Update Failed", "error");
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleToggleOffer = async (offer) => {
    console.log("FUNCTION CALLED");

    const newStatus = !offer.is_offer_enabled;

    await supabase
      .from("offers")
      .update({ is_offer_enabled: newStatus })
      .eq("id", offer.id);

    if (newStatus) {
      try {
        const { data, error } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              title: "New Offer 🎉",
              body: `${offer.title} is now available!`,
            },
          }
        );

        if (error) {
          console.error("Edge Function Error:", error);
        } else {
          console.log("Notification sent:", data);
        }
      } catch (err) {
        console.error("Invoke Error:", err);
      }
    }

    // ✅ refresh UI
    fetchAllServices();
  };
  const handleResetOffer = async (id) => {
    triggerConfirm(
      "Are you sure you want to delete this offer?",
      async () => {
        try {
          setLoadingOffers(true);
          const { error } = await supabase.from("offers").delete().eq("id", id);
          if (error) throw error;
          fetchAllServices();
          triggerAlert("Offer deleted successfully", "Success", "success");
        } catch (err) {
          console.error("Delete Offer Error:", err);
          triggerAlert(err.message, "Delete Failed", "error");
        } finally {
          setLoadingOffers(false);
        }
      },
      "Delete Offer",
    );
  };

  // ================= POPUP FLOW ================= */
  const fetchPopups = async () => {
    try {
      setLoadingPopups(true);
      const { data, error } = await supabase
        .from("app_popups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("app_popups table might not exist:", error.message);
        setAppPopups([]);
      } else {
        setAppPopups(data || []);
      }
    } catch (err) {
      console.error("Fetch Popups Error:", err);
    } finally {
      setLoadingPopups(false);
    }
  };

  const handleAddPopup = async () => {
    if (!popupForm.title) {
      triggerAlert("Please fill in the Title", "Input Required", "info");
      return;
    }

    // Validate banner image ratio (7:5)
    if (popupImage) {
      const isValidRatio = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          resolve(Math.abs(ratio - 7 / 5) < 0.05);
        };
        img.src = URL.createObjectURL(popupImage);
      });
      if (!isValidRatio) {
        triggerAlert(
          "The image should maintain an aspect ratio of 7:5, with a recommended resolution of 1906 X 1400 pixels",
          "Upload Error",
          "error"
        );
        return;
      }
    }

    try {
      setLoadingPopups(true);
      let imageUrl = "";

      if (popupImage) {
        const fileExt = popupImage.name.split(".").pop();
        const fileName = `popup_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("app_popups")
          .upload(fileName, popupImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("app_popups")
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      // Disable all service offers first (Mutual Exclusivity)
      await supabase
        .from("offers")
        .update({ is_offer_enabled: false })
        .eq("is_offer_enabled", true);

      const { error } = await supabase.from("app_popups").insert({
        type: "GENERAL",
        title: popupForm.title,
        description: popupForm.description,
        image_url: imageUrl,
        is_active: true,
      });

      if (error) throw error;

      setPopupForm({ title: "", description: "" });
      setPopupImage(null);
      fetchPopups();
      fetchAllServices(); // Refresh both
      triggerAlert("", "Success", "success");
    } catch (err) {
      console.error("Add Popup Error:", err);
      triggerAlert(err.message, "Addition Failed", "error");
    } finally {
      setLoadingPopups(false);
    }
  };

  const handleTogglePopup = async (popup) => {
    try {
      const newStatus = !popup.is_active;

      if (newStatus) {
        await supabase
          .from("offers")
          .update({ is_offer_enabled: false })
          .eq("is_offer_enabled", true);
      }

      const { error } = await supabase
        .from("app_popups")
        .update({ is_active: newStatus })
        .eq("id", popup.id);

      if (error) throw error;

      // ✅ FIXED NOTIFICATION
      if (newStatus) {
        await supabase.functions.invoke("send-notification", {
          body: {
            title: popup.title || "New Update 🚀",
            body: popup.description || "Check it now!",
          },
        });
      }

      fetchPopups();
      fetchAllServices();
    } catch (err) {
      console.error("Toggle Popup Error:", err);
      triggerAlert(err.message, "Toggle Failed", "error");
    }
  };

  const handleDeletePopup = async (id) => {
    triggerConfirm(
      "Are you sure you want to delete this popup announcement?",
      async () => {
        try {
          const { error } = await supabase
            .from("app_popups")
            .delete()
            .eq("id", id);
          if (error) throw error;
          fetchPopups();
          triggerAlert("Popup deleted successfully", "Success", "success");
        } catch (err) {
          console.error("Delete Popup Error:", err);
          triggerAlert(err.message, "Delete Failed", "error");
        }
      },
      "Delete Popup",
    );
  };


  // ================== SCHEDULE CONFIG ==================
  const fetchScheduleConfig = async () => {
    try {
      setLoadingSchedule(true);
      const { data, error } = await supabase.from("schedule_config").select("*");
      if (error) throw error;

      const rawSlots = data.find(item => item.config_key === "time_slots")?.config_value || [];
      const rawYears = data.find(item => item.config_key === "years")?.config_value || [];
      const rawRules = data.find(item => item.config_key === "service_time_rules")?.config_value || [];
      const rawDateSlots = data.find(item => item.config_key === "date_time_slots")?.config_value || {};

      // Convert legacy string arrays to objects if necessary
      const formatData = (arr) => arr.map(item =>
        typeof item === "string" || typeof item === "number"
          ? { value: item, active: true }
          : item
      );

      setScheduleConfig({
        time_slots: formatData(rawSlots),
        years: formatData(rawYears),
        service_time_rules: rawRules,
        date_time_slots: rawDateSlots,
      });
    } catch (err) {
      console.error("Fetch Schedule Config Error:", err);
      triggerAlert(err.message, "Fetch Error", "error");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const updateScheduleConfig = async (key, newValue) => {
    try {
      setLoadingSchedule(true);
      const { error } = await supabase
        .from("schedule_config")
        .update({ config_value: newValue })
        .eq("config_key", key);

      if (error) throw error;
      fetchScheduleConfig();
      triggerAlert(`${key.replace("_", " ")} updated successfully!`, "Success", "success");
    } catch (err) {
      console.error("Update Schedule Config Error:", err);
      triggerAlert(err.message, "Update Error", "error");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const addItemToConfig = (key) => {
    if (key === "time_slots") {
      if (!newSlot) return;

      let newSlotsArray = [...scheduleConfig.time_slots];
      const existingIdx = newSlotsArray.findIndex(s => s.value.toLowerCase().trim() === newSlot.toLowerCase().trim());
      if (existingIdx !== -1) {
        newSlotsArray[existingIdx] = { ...newSlotsArray[existingIdx], active: true };
      } else {
        newSlotsArray.push({ value: newSlot, active: true });
      }

      const updatedSlots = newSlotsArray.sort((a, b) => {
        const parseTime = (timeStr) => {
          const match = timeStr.trim().match(/^(\d+):(\d+)\s*(am|pm)$/i);
          if (!match) return 0;
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3].toLowerCase();
          if (period === "pm" && hours !== 12) hours += 12;
          if (period === "am" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        return parseTime(a.value) - parseTime(b.value);
      });
      setScheduleConfig({ ...scheduleConfig, time_slots: updatedSlots });
      updateScheduleConfig("time_slots", updatedSlots);
      setNewSlot("");
    } else if (key === "years") {
      if (!newYear) return;
      const yearVal = parseInt(newYear) || newYear;
      const updatedYears = [...scheduleConfig.years, { value: yearVal, active: true }]
        .sort((a, b) => a.value - b.value);
      setScheduleConfig({ ...scheduleConfig, years: updatedYears });
      updateScheduleConfig("years", updatedYears);
      setNewYear("");
    } else if (key === "service_time_rules") {
      if (!newServiceName || !newLastBookingTime) return;
      const updatedRules = [...scheduleConfig.service_time_rules, { service_name: newServiceName, last_booking_time: newLastBookingTime }]
        .sort((a, b) => a.service_name.localeCompare(b.service_name));
      setScheduleConfig({ ...scheduleConfig, service_time_rules: updatedRules });
      updateScheduleConfig("service_time_rules", updatedRules);
      setNewServiceName("");
      setNewLastBookingTime("");
    }
  };

  const toggleItemActive = (key, index) => {
    const item = scheduleConfig[key][index];

    // If we are UNCHECKING, show confirmation
    if (item.active) {
      setConfirmConfig({
        show: true,
        title: "Confirm Hide",
        message: `Are you sure you want to hide this ${key === "time_slots" ? "time slot" : "year"}? It will no longer be visible to customers.`,
        onConfirm: () => {
          const updatedValue = scheduleConfig[key].map((it, i) =>
            i === index ? { ...it, active: false } : it
          );
          setScheduleConfig({ ...scheduleConfig, [key]: updatedValue });
          updateScheduleConfig(key, updatedValue);
        }
      });
    } else {
      // If we are CHECKING, just do it
      const updatedValue = scheduleConfig[key].map((it, i) =>
        i === index ? { ...it, active: true } : it
      );
      setScheduleConfig({ ...scheduleConfig, [key]: updatedValue });
      updateScheduleConfig(key, updatedValue);
    }
  };

  const removeItemFromConfig = (key, index) => {
    const item = scheduleConfig[key][index];
    setConfirmConfig({
      show: true,
      title: "Confirm Delete",
      message: `Are you sure you want to PERMANENTLY remove "${item.value || item.service_name}"? This action cannot be undone.`,
      onConfirm: () => {
        let updatedValue;
        if (key === "time_slots") {
          updatedValue = scheduleConfig[key].map((it, i) =>
            i === index ? { ...it, active: false } : it
          );
        } else {
          updatedValue = scheduleConfig[key].filter((_, i) => i !== index);
        }
        setScheduleConfig({ ...scheduleConfig, [key]: updatedValue });
        updateScheduleConfig(key, updatedValue);
      }
    });
  };

  const toggleDateSpecificSlot = async (slotValue) => {
    if (!selectedSlotDate) {
      triggerAlert("Please select a date first.", "No Date Selected", "error");
      return;
    }

    const isConfigured = scheduleConfig.date_time_slots[selectedSlotDate] !== undefined;

    // If not configured, it's currently using the active master slots. So we initialize the custom state with those.
    const currentSlots = isConfigured
      ? scheduleConfig.date_time_slots[selectedSlotDate]
      : scheduleConfig.time_slots.filter(s => s.active !== false).map(s => s.value);

    let updatedSlots;

    if (currentSlots.includes(slotValue)) {
      // Remove
      updatedSlots = currentSlots.filter(s => s !== slotValue);
    } else {
      // Add
      updatedSlots = [...currentSlots, slotValue];
    }

    const updatedDateTimeSlots = {
      ...scheduleConfig.date_time_slots,
      [selectedSlotDate]: updatedSlots
    };

    setScheduleConfig({
      ...scheduleConfig,
      date_time_slots: updatedDateTimeSlots
    });

    // Save to DB
    updateScheduleConfig("date_time_slots", updatedDateTimeSlots);
  };

  const toggleAllDateSpecificSlots = () => {
    if (!selectedSlotDate) {
      triggerAlert("Please select a date first.", "No Date Selected", "error");
      return;
    }

    const masterVals = scheduleConfig.time_slots.map(s => s.value);
    const dateVals = scheduleConfig.date_time_slots[selectedSlotDate] || [];
    const combined = [...new Set([...masterVals, ...dateVals])];

    const isConfigured = scheduleConfig.date_time_slots[selectedSlotDate] !== undefined;
    const currentlyEnabledCount = combined.filter(slotValue => {
      return isConfigured
        ? scheduleConfig.date_time_slots[selectedSlotDate].includes(slotValue)
        : (scheduleConfig.time_slots.find(s => s.value === slotValue)?.active !== false);
    }).length;

    const allSelected = currentlyEnabledCount === combined.length && combined.length > 0;

    let updatedSlots = allSelected ? [] : combined;

    const updatedDateTimeSlots = {
      ...scheduleConfig.date_time_slots,
      [selectedSlotDate]: updatedSlots
    };

    setScheduleConfig({
      ...scheduleConfig,
      date_time_slots: updatedDateTimeSlots
    });

    updateScheduleConfig("date_time_slots", updatedDateTimeSlots);
  };

  const resetDateSlotsToDefault = () => {
    if (!selectedSlotDate) return;

    const updatedDateTimeSlots = { ...scheduleConfig.date_time_slots };
    delete updatedDateTimeSlots[selectedSlotDate];

    setScheduleConfig({
      ...scheduleConfig,
      date_time_slots: updatedDateTimeSlots
    });

    updateScheduleConfig("date_time_slots", updatedDateTimeSlots);
  };
  // ================== PRICING TAB ==================
  const fetchPricingServices = async (silent = false, savedId = null) => {
    try {
      if (!silent) setLoadingPricing(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("title", { ascending: true });

      if (error) throw error;
      setPricingServices(data || []);
      // Initialize edits from fetched data
      const edits = {};
      (data || []).forEach((s) => {
        const formatWithRupee = (val) => {
          if (!val) return "";
          const str = String(val).trim();
          return str.startsWith("₹") ? str : `₹${str}`;
        };

        edits[s.id] = {
          title: s.title || "",
          price: s.price || "",
          discount_percent: s.discount_percent || 0,
          admin_amount: calculateAdminAmount(s.price, s.staff_amount, s.discount_percent),
          staff_amount: formatWithRupee(s.staff_amount),
        };
      });
      setPricingEdits((prev) => {
        const merged = { ...edits };

        // Load initial drafts from localStorage if prev is empty
        const draftsStr = localStorage.getItem("pricingEditsDraft");
        const drafts = draftsStr ? JSON.parse(draftsStr) : {};

        // 1. Merge local state (prev) if it exists
        Object.keys(prev).forEach((id) => {
          if (prev[id] && id !== String(savedId)) {
            merged[id] = prev[id];
          }
        });

        // 2. Also merge localStorage drafts (important for page refresh)
        Object.keys(drafts).forEach((id) => {
          if (drafts[id] && id !== String(savedId)) {
            merged[id] = drafts[id];
          }
        });

        return merged;
      });
    } catch (err) {
      console.error("Fetch Pricing Services Error:", err);
      triggerAlert(err.message, "Fetch Error", "error");
    } finally {
      if (!silent) setLoadingPricing(false);
    }
  };

  const calculateAdminAmount = (priceStr, staffAmtStr, discountVal) => {
    const parseNum = (val) => {
      if (!val) return 0;
      let s = String(val).replace(/[₹,%]/g, "").trim();
      return parseFloat(s) || 0;
    };

    const price = parseNum(priceStr);
    const staff = parseNum(staffAmtStr);
    const discount = parseFloat(discountVal) || 0;

    const discountedPrice = price - (price * (discount / 100));
    const adminNum = Math.round(discountedPrice - staff);

    const formatWithRupee = (val) => {
      const isNegative = val < 0;
      const absVal = Math.abs(val).toLocaleString("en-IN");
      return (isNegative ? "-" : "") + "₹" + absVal;
    };

    return formatWithRupee(adminNum);
  };


  const handleSaveAllPricing = async () => {
    try {
      setLoadingAllPricing(true);

      const payload = pricingServices.map(service => {
        const edit = pricingEdits[service.id];
        if (!edit) return null;

        const formatWithRupee = (val) => {
          if (!val) return "";
          let str = String(val).trim();
          if (!str) return "";

          // If it already has rupee symbol anywhere (like -₹100 or ₹100), return as is
          if (str.includes("₹")) return str;

          const isNegative = str.startsWith("-");
          const absVal = str.replace("-", "");
          return (isNegative ? "-" : "") + "₹" + absVal;
        };

        return {
          id: service.id,
          title: edit.title,
          price: edit.price,
          discount_percent: edit.discount_percent,
          admin_amount: formatWithRupee(edit.admin_amount),
          staff_amount: formatWithRupee(edit.staff_amount),
        };
      }).filter(Boolean);

      if (payload.length === 0) return;

      // Update each service individually to avoid constraint errors with upsert
      const updatePromises = payload.map(row =>
        supabase
          .from("services")
          .update({
            title: row.title,
            price: row.price,
            discount_percent: String(row.discount_percent || "0").replace("%", ""),
            admin_amount: row.admin_amount,
            staff_amount: row.staff_amount
          })
          .eq("id", row.id)
      );

      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error)?.error;

      if (firstError) throw firstError;

      localStorage.removeItem("pricingEditsDraft");
      setPricingEdits({});
      triggerAlert("All pricing changes updated successfully! ✅", "Success", "success");
      await fetchPricingServices(true);
    } catch (err) {
      console.error("Save All Pricing Error:", err);
      triggerAlert(err.message, "Save All Error", "error");
    } finally {
      setLoadingAllPricing(false);
    }
  };

  // ================== PARTNER PAYMENTS HELPERS ==================
  const formatPayoutDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const getDayName = (date) => {
    return new Date(date).toLocaleDateString("en-IN", { weekday: "long" });
  };

  const getCurrentCycleRange = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    let start = new Date(now);
    let end = new Date(now);
    let label = "";

    // Sun-Wed (0-3)
    if (currentDay <= 3) {
      start.setDate(now.getDate() - currentDay);
      end.setDate(now.getDate() + (3 - currentDay));
      label = "Sunday to Wednesday";
    } else {
      // Thu-Sat (4-6)
      start.setDate(now.getDate() - (currentDay - 4));
      end.setDate(now.getDate() + (6 - currentDay));
      label = "Thursday to Saturday";
    }
    return { start, end, label };
  };

  // ================== PARTNER PAYMENTS ==================
  const fetchPartnerPayments = async (staffToSelect = null, customStart = null, customEnd = null) => {
    try {
      setPayoutLoading(true);

      // Clear old breakdown data to prevent "glitches" or seeing previous staff data
      if (staffToSelect) {
        setPayoutBreakdown([]);
      }

      let startDate, endDate, cycleLabel;

      if (payoutDateMode === "auto" && !customStart) {
        const range = getCurrentCycleRange();
        startDate = range.start;
        endDate = range.end;
        cycleLabel = range.label;
      } else {
        startDate = new Date(customStart || payoutCustomRange.start);
        endDate = new Date(customEnd || payoutCustomRange.end);

        // VALIDATION: Only allow Sun-Wed or Thu-Sat cycles
        const startDay = startDate.getDay();
        const endDay = endDate.getDay();
        const diffMs = endDate - startDate;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        const isSunToWed = (startDay === 0 && endDay === 3 && diffDays === 3);
        const isThuToSat = (startDay === 4 && endDay === 6 && diffDays === 2);

        if (!isSunToWed && !isThuToSat) {
          triggerAlert(
            "Please select a valid cycle: Sunday to Wednesday or Thursday to Saturday.",
            "Invalid Date Range",
            "warning"
          );
          setPayoutLoading(false);
          return;
        }

        cycleLabel = `${getDayName(startDate)} to ${getDayName(endDate)}`;
      }

      // Set time to absolute start and end
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      setPayoutCycleInfo({
        start: formatPayoutDate(startDate),
        end: formatPayoutDate(endDate),
        label: cycleLabel
      });

      // 1. Fetch all staff profiles
      const { data: staffData } = await supabase
        .from("staff_profile")
        .select("*");

      // 2. Fetch ALL earnings for all staff (to calculate Weekly, Monthly, and Total stats)
      const { data: allEarnings, error: earnError } = await supabase
        .from("staff_earnings")
        .select("staff_email, AMOUNT, payment_status, earned_at, paid_at");

      if (earnError) throw earnError;

      // Group and calculate stats per staff
      const statsMap = {};
      const now = new Date();
      // REAL-TIME KEYS (Independent of filters for the top summary table)

      // Keep filter variables for other cycle calculations
      const [fYear, fMonth] = payoutFilterMonth.split("-").map(Number);

      // Calculate accurate current week number based on Monday-Sunday calendar
      const tempFirst = new Date(fYear, fMonth - 1, 1);
      const tempMon = new Date(tempFirst);
      const dayOfFirst = tempMon.getDay();
      const adj = dayOfFirst === 0 ? 6 : dayOfFirst - 1;
      tempMon.setDate(tempMon.getDate() - adj);
      tempMon.setHours(0, 0, 0, 0);

      // If viewing the current month, use Today's date for 'current' week, otherwise use the first of the month
      const todayYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const referenceDate = (payoutFilterMonth === todayYM) ? now : new Date(fYear, fMonth - 1, 1);
      referenceDate.setHours(0, 0, 0, 0);

      // If a specific week is selected in the UI, use that for the "Weekly" column. 
      // Otherwise, use the calculated week based on the reference date.

      allEarnings?.forEach(e => {
        const email = e.staff_email?.trim()?.toLowerCase();
        if (!email) return;

        if (!statsMap[email]) {
          statsMap[email] = { pending: 0, weekly: 0, monthly: 0, total: 0, count: 0, all_time: 0 };
        }

        const amt = parseFloat(e.AMOUNT || e.amount || 0);
        const status = (e.payment_status || "pending").toLowerCase();

        // 1. Accumulate All-Time and Pending stats
        statsMap[email].all_time += amt;
        if (status === "pending") {
          statsMap[email].pending += amt;
        }

        // 2. Performance Stats (Total Paid and Avg/Job)
        if (status === "paid") {
          statsMap[email].total += amt;
          statsMap[email].count += 1;
        }

        // 3. Period Earnings (Weekly/Monthly) - Based on EARNED_AT for all records (Pending + Paid)
        if (e.earned_at) {
          const d = new Date(e.earned_at);

          // Item week calculation (Monday-Sunday start)
          const itemFirstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
          const itemFirstMon = new Date(itemFirstOfMonth);
          const itemDayOfFirst = itemFirstMon.getDay();
          const itemAdj = itemDayOfFirst === 0 ? 6 : itemDayOfFirst - 1;
          itemFirstMon.setDate(itemFirstMon.getDate() - itemAdj);
          itemFirstMon.setHours(0, 0, 0, 0);

          // Sum of all PAID amounts across all time (Independent of calendar)
          if (status === "paid") {
            statsMap[email].monthly += amt;
            statsMap[email].weekly += amt;
          }
        }
      });

      const formattedStaff = (staffData || []).map(s => {
        const email = s.email?.trim()?.toLowerCase();
        const stats = statsMap[email] || { pending: 0, weekly: 0, monthly: 0, total: 0, count: 0 };
        return {
          ...s,
          cycleAmount: stats.pending,
          weeklyEarning: stats.weekly,
          monthlyEarning: stats.monthly,
          totalEarning: stats.total,
          allTimeEarning: stats.all_time,
          avgEarning: stats.count > 0 ? Math.round(stats.total / stats.count) : 0
        };
      }).sort((a, b) => b.cycleAmount - a.cycleAmount);

      setPayoutStaffList(formattedStaff);

      // 3. fetch breakdown if a specific staff was selected
      if (staffToSelect) {
        const emailToSearch = staffToSelect.email?.trim()?.toLowerCase();
        // Fetch pending earnings - filter by earned_at in Custom Range mode, show all in Active Cycle mode
        let breakdownQuery = supabase
          .from("staff_earnings")
          .select("*")
          .ilike("staff_email", emailToSearch);

        // Always fetch both paid and pending for the detail view calculation
        // The Show History toggle only affects the main page's bottom table
        if (!payoutShowHistory && !staffToSelect) {
          breakdownQuery = breakdownQuery.or("payment_status.eq.pending,payment_status.is.null");
        }

        // Fetch full history for the detail view breakdown (Independent of main filter)
        // No date range applied here to ensure lifetime summaries are accurate in the detail view panels

        const { data: rawEarnings, error: earnErrorBreakdown } = await breakdownQuery
          .order("earned_at", { ascending: false });

        if (earnErrorBreakdown) throw earnErrorBreakdown;

        let enrichedBreakdown = rawEarnings || [];

        // Robust Fetch for Booking Info
        const bookingIds = enrichedBreakdown.map(e => e.booking_id).filter(Boolean);
        if (bookingIds.length > 0) {
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("id, booking_id, services, booking_date")
            .or(`id.in.(${bookingIds.join(',')}),booking_id.in.(${bookingIds.join(',')})`);

          if (bookingData && bookingData.length > 0) {
            const bookingMap = {};
            bookingData.forEach(b => {
              let title = "Service";
              if (Array.isArray(b.services) && b.services.length > 0) {
                title = b.services[0].title || "Service";
              }

              const info = { title, date: b.booking_date };
              if (b.id) bookingMap[b.id] = info;
              if (b.booking_id) bookingMap[b.booking_id] = info;
            });

            enrichedBreakdown = enrichedBreakdown.map(e => {
              const bInfo = bookingMap[e.booking_id];
              return {
                ...e,
                service_title: bInfo?.title || "Service",
                display_date: bInfo?.date || e.earned_at
              };
            });
          } else {
            enrichedBreakdown = enrichedBreakdown.map(e => ({
              ...e,
              service_title: "Service",
              display_date: e.earned_at
            }));
          }
        } else {
          enrichedBreakdown = enrichedBreakdown.map(e => ({
            ...e,
            service_title: "Adjustment/Manual",
            display_date: e.earned_at
          }));
        }

        setPayoutBreakdown(enrichedBreakdown);

        // Calculate the NET PAYABLE from the filtered breakdown so the card matches
        const filteredTotal = enrichedBreakdown.reduce((sum, e) => sum + parseFloat(e.AMOUNT || e.amount || 0), 0);
        const matchedStaff = formattedStaff.find(s => s.email?.trim()?.toLowerCase() === emailToSearch) || staffToSelect;
        setSelectedPayoutStaff({ ...matchedStaff, cycleAmount: filteredTotal });
      }

      // 4. Fetch Recent Payout Activity
      let recentQuery = supabase
        .from("staff_earnings")
        .select("*")
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false });

      // FIX: If a staff member is selected, fetch THEIR recent payouts, not global latest 10
      if (staffToSelect) {
        recentQuery = recentQuery.ilike("staff_email", staffToSelect.email?.trim()?.toLowerCase());
      }

      if (recentPayoutFilterDate) {
        recentQuery = recentQuery
          .gte("paid_at", `${recentPayoutFilterDate}T00:00:00`)
          .lte("paid_at", `${recentPayoutFilterDate}T23:59:59`);
      }

      const { data: recentData, error: recentError } = await recentQuery.limit(recentPayoutFilterTime ? 100 : 10);

      if (recentError) {
        console.error("Recent Payouts Fetch Error:", recentError);
      }

      let enrichedRecent = recentData || [];
      if (staffData && staffData.length > 0) {
        const staffMap = {};
        staffData.forEach(s => {
          if (s.email) staffMap[s.email.trim().toLowerCase()] = s.name;
        });
        enrichedRecent = enrichedRecent.map(r => ({
          ...r,
          staff_name: staffMap[r.staff_email?.trim()?.toLowerCase()] || r.staff_name || "Partner"
        }));
      }

      if (recentPayoutFilterTime) {
        enrichedRecent = enrichedRecent.filter(r => {
          if (!r.paid_at) return false;
          const d = new Date(r.paid_at);
          const h = d.getHours();
          const m = d.getMinutes();
          const merid = h >= 12 ? "pm" : "am";
          const h12 = h % 12 || 12;
          const timeStr = `${h12}:${String(m).padStart(2, '0')} ${merid}`;
          return timeStr.toLowerCase() === recentPayoutFilterTime.toLowerCase();
        });
      }

      setRecentPayouts(enrichedRecent.slice(0, 10));
      setPayoutLoading(false);
    } catch (err) {
      console.error("Partner Payout Fetch Error:", err);
      triggerAlert(err.message, "Error Fetching Payouts", "error");
      setPayoutLoading(false);
    }
  };

  // Robustly load XLSX from CDN if local import fails
  const loadXLSXFromCDN = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error("Failed to load Excel library from CDN."));
      document.head.appendChild(script);
    });
  };

  // Load ExcelJS from CDN for styled exports (colors, alignments, line wrapping)
  const loadExcelJS = () => {
    return new Promise((resolve, reject) => {
      if (window.ExcelJS) return resolve(window.ExcelJS);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js";
      script.onload = () => resolve(window.ExcelJS);
      script.onerror = () => reject(new Error("Failed to load ExcelJS library from CDN."));
      document.head.appendChild(script);
    });
  };

  const handleExportAllPayoutsCSV = async () => {
    const filteredData = getFilteredPayoutTableData();
    if (!filteredData || filteredData.length === 0) {
      triggerAlert("No data available to export.", "Export Failed", "warning");
      return;
    }

    try {
      // Fetch secure settings from admin_settings table in Supabase
      const { data: settingsData, error: settingsError } = await supabase
        .from("admin_settings")
        .select("key, value");

      if (settingsError) {
        console.error("Error fetching settings:", settingsError);
        triggerAlert("Failed to retrieve secure export settings from Supabase. Please ensure the admin_settings table is created.", "Export Error", "error");
        return;
      }

      const settingsMap = {};
      settingsData?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      const debitAccountNo = settingsMap["debit_account_no"] || "";
      const payoutMode = settingsMap["payout_mode"] || "";
      const productCode = settingsMap["product_code"] || "";
      const payoutRemark = settingsMap["payout_remark"] || "Salary De Jan";

      // Fetch bank details for these staff
      const emails = [...new Set(filteredData.map(item => item.staff_email?.trim()?.toLowerCase()).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("staff_profile")
        .select("email, BNF_NAME, BENE_ACC_NO, BENE_IFSC, bank_name")
        .in("email", emails);

      const profileMap = {};
      profiles?.forEach(p => {
        if (p.email) {
          profileMap[p.email.trim().toLowerCase()] = {
            email: p.email,
            account_holder_name: p.BNF_NAME || "N/A",
            account_number: p.BENE_ACC_NO || "N/A",
            ifsc_code: p.BENE_IFSC || "N/A",
            bank_name: p.bank_name || "N/A"
          };
        }
      });

      const ExcelJS = await loadExcelJS();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Payouts");

      // Group by staff (matching the dashboard table view)
      const groupedDataMap = filteredData.reduce((acc, item) => {
        const key = item.staff_email?.trim()?.toLowerCase() || item.staff_name_display || "unknown";
        if (!acc[key]) {
          const profile = profileMap[item.staff_email?.trim()?.toLowerCase()] || {};
          acc[key] = {
            name: item.staff_name_display || "Partner",
            email: item.staff_email || "",
            serviceCount: 0,
            totalAmount: 0,
            allIds: [],
            status: (item.payment_status || "PENDING").toUpperCase(),
            account_holder_name: profile.account_holder_name || "N/A",
            account_number: profile.account_number || "N/A",
            ifsc_code: profile.ifsc_code || "N/A",
            bank_name: profile.bank_name || "N/A",
            payment_date: item.paid_at ? item.paid_at.split('T')[0] : "N/A"
          };
        }
        acc[key].serviceCount += 1;
        acc[key].totalAmount += parseFloat(item.amount || 0);
        acc[key].allIds.push(item.id);
        // If any service is pending, the group is pending
        if (item.payment_status !== "paid") acc[key].status = "PENDING";
        // Capture a payment date if available
        if (acc[key].payment_date === "N/A" && item.paid_at) {
          acc[key].payment_date = item.paid_at.split('T')[0];
        }
        return acc;
      }, {});

      const displayData = Object.values(groupedDataMap);

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const todayFormatted = `${dd}-${mm}-${yyyy}`;

      // 1. Define combined headers (Header Title + Guidelines in a single cell using newlines)
      const headers = [
        "PYMT_PROD_TYPE_CODE\nFixed Value:\nPAB_VENDOR\n(All in block letters)",
        "PYMT_MODE\nAllowed values:\nFT, NEFT, RTGS, IMPS\n(All in block letters)(FT is the Fund Transfer Within Bank)",
        "DEBIT_ACC_NO\nAllowed values:\n12 digit ICICI Bank Account number",
        "BNF_NAME\nName of Beneficiary\n(No Special Characters; Max 500 Alphabetical Characters allowed)",
        "BENE_ACC_NO\nAccount number of Beneficiary (Max 32 Numeric Characters allowed)",
        "BENE_IFSC\nIFSC code of the Beneficiary (IFSC Code is not Mandatory for FT Payment Mode)",
        "AMOUNT\nNumeric value with decimal up to 2 places",
        "PYMT_DATE\nDate format DD-MM-YYYY",
        "REMARK\nNon Mandatory field"
      ];

      // Set column properties (keys and widths)
      worksheet.columns = headers.map((headerText, index) => ({
        header: headerText,
        key: `col_${index}`,
        width: 32
      }));

      // Get and style the header row (Row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 125; // Set tall row height to fit the long guideline text

      headerRow.eachCell((cell, colNumber) => {
        // Red font for columns 1-8, black font for column 9 (REMARK)
        const isRemarkCol = colNumber === 9;
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: isRemarkCol ? { argb: "FF000000" } : { argb: "FFFF0000" }
        };
        // Vertically centered, horizontally centered, and Wrap Text enabled
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
        // Thin gray borders
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D3D3" } },
          left: { style: "thin", color: { argb: "FFD3D3D3" } },
          bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
          right: { style: "thin", color: { argb: "FFD3D3D3" } }
        };
      });

      // 2. Add actual data rows starting at Row 2
      displayData.forEach(item => {
        const dataRow = worksheet.addRow([
          productCode,
          payoutMode,
          debitAccountNo,
          item.account_holder_name,
          item.account_number,
          item.ifsc_code,
          item.totalAmount,
          todayFormatted,
          payoutRemark
        ]);

        dataRow.height = 20; // Set clean height for data rows
        dataRow.eachCell((cell) => {
          cell.font = {
            name: "Calibri",
            size: 10
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center"
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE0E0E0" } },
            left: { style: "thin", color: { argb: "FFE0E0E0" } },
            bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
            right: { style: "thin", color: { argb: "FFE0E0E0" } }
          };
        });
      });

      // Write workbook to buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payouts_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      triggerAlert(`Successfully exported ${displayData.length} partners to Excel.`, "Export Successful", "success");
    } catch (err) {
      console.error("Excel Export Error:", err);
      triggerAlert("Failed to generate Excel file.", "Export Error", "error");
    }
  };

  const handleExportReferralPayoutsExcel = async () => {
    const eligibleReferrals = (staffReferrals || []).filter(
      item =>
        item.status === "approved" &&
        (item.completed_booking !== null && item.completed_booking !== undefined ? item.completed_booking : 0) >= 30 &&
        item.bonus_status !== "paid"
    );

    if (!eligibleReferrals || eligibleReferrals.length === 0) {
      triggerAlert("No eligible referral rewards (with 30+ completed bookings) available to export.", "Export Failed", "warning");
      return;
    }

    try {
      // Fetch secure settings from admin_settings table in Supabase
      const { data: settingsData, error: settingsError } = await supabase
        .from("admin_settings")
        .select("key, value");

      if (settingsError) {
        console.error("Error fetching settings:", settingsError);
        triggerAlert("Failed to retrieve secure export settings from Supabase.", "Export Error", "error");
        return;
      }

      const settingsMap = {};
      settingsData?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      const debitAccountNo = settingsMap["debit_account_no"] || "";
      const payoutMode = settingsMap["payout_mode"] || "";
      const productCode = settingsMap["product_code"] || "";

      // Fetch bank details for these referrers
      const referralCodes = [...new Set(eligibleReferrals.map(item => item.referral_code).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("staff_profile")
        .select("email, referral_code, BNF_NAME, BENE_ACC_NO, BENE_IFSC, bank_name")
        .in("referral_code", referralCodes);

      const profileMap = {};
      profiles?.forEach(p => {
        if (p.referral_code) {
          profileMap[p.referral_code.trim().toUpperCase()] = {
            email: p.email,
            account_holder_name: p.BNF_NAME || "N/A",
            account_number: p.BENE_ACC_NO || "N/A",
            ifsc_code: p.BENE_IFSC || "N/A",
            bank_name: p.bank_name || "N/A"
          };
        }
      });

      // Group referrals by referrer code to aggregate payments
      const groupedDataMap = eligibleReferrals.reduce((acc, item) => {
        const codeKey = item.referral_code?.trim()?.toUpperCase() || "unknown";
        if (!acc[codeKey]) {
          const profile = profileMap[codeKey] || {};
          acc[codeKey] = {
            name: item.referred_name || "Referrer",
            code: item.referral_code || "",
            referralCount: 0,
            totalAmount: 0,
            allIds: [],
            account_holder_name: profile.account_holder_name || "N/A",
            account_number: profile.account_number || "N/A",
            ifsc_code: profile.ifsc_code || "N/A",
            bank_name: profile.bank_name || "N/A"
          };
        }
        acc[codeKey].referralCount += 1;
        acc[codeKey].totalAmount += 1500; // 1500 per referral
        acc[codeKey].allIds.push(item.id);
        return acc;
      }, {});

      const displayData = Object.values(groupedDataMap);

      const ExcelJS = await loadExcelJS();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Referral Payouts");

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const todayFormatted = `${dd}-${mm}-${yyyy}`;

      // 1. Define combined headers (Header Title + Guidelines in a single cell using newlines)
      const headers = [
        "PYMT_PROD_TYPE_CODE\nFixed Value:\nPAB_VENDOR\n(All in block letters)",
        "PYMT_MODE\nAllowed values:\nFT, NEFT, RTGS, IMPS\n(All in block letters)(FT is the Fund Transfer Within Bank)",
        "DEBIT_ACC_NO\nAllowed values:\n12 digit ICICI Bank Account number",
        "BNF_NAME\nName of Beneficiary\n(No Special Characters; Max 500 Alphabetical Characters allowed)",
        "BENE_ACC_NO\nAccount number of Beneficiary (Max 32 Numeric Characters allowed)",
        "BENE_IFSC\nIFSC code of the Beneficiary (IFSC Code is not Mandatory for FT Payment Mode)",
        "AMOUNT\nNumeric value with decimal up to 2 places",
        "PYMT_DATE\nDate format DD-MM-YYYY",
        "REMARK\nNon Mandatory field"
      ];

      // Set column properties (keys and widths)
      worksheet.columns = headers.map((headerText, index) => ({
        header: headerText,
        key: `col_${index}`,
        width: 32
      }));

      // Get and style the header row (Row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 125; // Set tall row height to fit the long guideline text

      headerRow.eachCell((cell, colNumber) => {
        // Red font for columns 1-8, black font for column 9 (REMARK)
        const isRemarkCol = colNumber === 9;
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: isRemarkCol ? { argb: "FF000000" } : { argb: "FFFF0000" }
        };
        // Vertically centered, horizontally centered, and Wrap Text enabled
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
        // Thin gray borders
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D3D3" } },
          left: { style: "thin", color: { argb: "FFD3D3D3" } },
          bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
          right: { style: "thin", color: { argb: "FFD3D3D3" } }
        };
      });

      // 2. Add actual data rows starting at Row 2
      displayData.forEach(item => {
        // Use the referrer name (cleaned of special characters) in the REMARK field
        // so that you can identify who the payment belongs to since BNF_NAME might be blank,
        // while remaining 100% bank-safe.
        const remarkString = (item.name || "Referral Reward").replace(/[^a-zA-Z0-9 ]/g, "");

        const dataRow = worksheet.addRow([
          productCode,
          payoutMode,
          debitAccountNo,
          item.account_holder_name,
          item.account_number,
          item.ifsc_code,
          item.totalAmount,
          todayFormatted,
          remarkString
        ]);

        dataRow.height = 20; // Set clean height for data rows
        dataRow.eachCell((cell) => {
          cell.font = {
            name: "Calibri",
            size: 10
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center"
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE0E0E0" } },
            left: { style: "thin", color: { argb: "FFE0E0E0" } },
            bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
            right: { style: "thin", color: { argb: "FFE0E0E0" } }
          };
        });
      });

      // Write workbook to buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `referral_payouts_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      triggerAlert(`Successfully exported ${displayData.length} referral payments to Excel.`, "Export Successful", "success");
    } catch (err) {
      console.error("Referral Excel Export Error:", err);
      triggerAlert("Failed to generate Excel file.", "Export Error", "error");
    }
  };

  const handleImportReferralsExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setReferralProcessing(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const dataBuffer = evt.target.result;

          const XLSX_CDN = await loadXLSXFromCDN();
          const { read: readFunc, utils: utilsObj } = XLSX_CDN;

          if (typeof readFunc !== 'function') {
            throw new Error("Excel library 'read' function not found. Please try again or refresh the page.");
          }

          const wb = readFunc(new Uint8Array(dataBuffer), { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = utilsObj.sheet_to_json(ws);

          if (!data || data.length === 0) {
            triggerAlert("The Excel file seems to be empty.", "Sync Failed", "warning");
            setReferralProcessing(false);
            return;
          }

          let allPaidIds = [];
          const paidAccountNumbers = [];
          const excelAmounts = {};

          data.forEach(row => {
            const statusKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("remark") || firstLine.includes("status");
            });
            const accKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("bene_acc_no") || firstLine.includes("account number");
            });
            const amtKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("amount");
            });

            const statusVal = row[statusKey]?.toString()?.trim()?.toUpperCase();
            if (statusVal === "PAID") {
              const remarkVal = row[statusKey]?.toString()?.trim();

              // Try to parse record IDs from REMARK (format: REF_IDS:id1,id2,...)
              if (remarkVal && remarkVal.toUpperCase().startsWith("REF_IDS:")) {
                const ids = remarkVal.substring(8).split(",").map(id => id.trim()).filter(Boolean);
                allPaidIds = [...allPaidIds, ...ids];
              } else if (row[accKey]) {
                const accNo = row[accKey].toString().trim();
                paidAccountNumbers.push(accNo);
                if (amtKey) {
                  excelAmounts[accNo] = parseFloat(row[amtKey]) || 0;
                }
              }
            }
          });

          // Fallback check by account numbers if no explicit IDs were parsed from remark
          if (paidAccountNumbers.length > 0) {
            const { data: profiles } = await supabase
              .from("staff_profile")
              .select("email, referral_code, BENE_ACC_NO")
              .in("BENE_ACC_NO", paidAccountNumbers);

            if (profiles && profiles.length > 0) {
              const codes = profiles.map(p => p.referral_code?.trim()).filter(Boolean);

              // Query pending/initiated referral forms for these referrers
              const { data: pendingReferrals } = await supabase
                .from("staff_referral_forms")
                .select("id")
                .in("referral_code", codes)
                .neq("bonus_status", "paid");

              if (pendingReferrals && pendingReferrals.length > 0) {
                const ids = pendingReferrals.map(e => e.id);
                allPaidIds = [...allPaidIds, ...ids];
              }
            }
          }

          if (allPaidIds.length === 0) {
            triggerAlert("No rows marked as 'PAID' were detected in the Excel sheet.", "No Changes Found", "info");
            setReferralProcessing(false);
            return;
          }

          // Fetch current unpaid records for these IDs
          const { data: currentPending, error: fetchErr } = await supabase
            .from("staff_referral_forms")
            .select("*")
            .in("id", allPaidIds)
            .neq("bonus_status", "paid");

          if (fetchErr) throw fetchErr;

          if (!currentPending || currentPending.length === 0) {
            triggerAlert("The records you marked as 'PAID' are already updated in the database.", "Already Synced", "info");
            setReferralProcessing(false);
            return;
          }

          const totalToPay = currentPending.length * 1500;
          setConfirmConfig({
            show: true,
            title: "Confirm Referral Sync",
            message: `Updating ${currentPending.length} referral bonuses to 'PAID' for a total of ₹${totalToPay.toLocaleString()}. Proceed?`,
            onConfirm: async () => {
              try {
                const idsToUpdate = currentPending.map(r => r.id);

                // 1. Update referral forms
                const { error: updateErr } = await supabase
                  .from("staff_referral_forms")
                  .update({ bonus_status: "paid", bonus_amount: 1500 })
                  .in("id", idsToUpdate);

                if (updateErr) throw updateErr;

                // Group completed payments by referrer code to update their staff profiles
                const referrerGroups = {};
                currentPending.forEach(r => {
                  const code = r.referral_code?.trim();
                  if (!code) return;
                  if (!referrerGroups[code]) referrerGroups[code] = { amount: 0, items: [] };
                  referrerGroups[code].amount += 1500;
                  referrerGroups[code].items.push(r);
                });

                for (const [code, group] of Object.entries(referrerGroups)) {
                  const { data: profile } = await supabase.from("staff_profile").select("*").eq("referral_code", code).maybeSingle();
                  if (profile) {
                    const email = profile.email;
                    let totalJson = {}; try { totalJson = typeof profile.total_earnings_json === 'string' ? JSON.parse(profile.total_earnings_json) : (profile.total_earnings_json || {}); } catch (e) { }
                    let monthlyJson = {}; try { monthlyJson = typeof profile.monthly_earnings_json === 'string' ? JSON.parse(profile.monthly_earnings_json) : (profile.monthly_earnings_json || {}); } catch (e) { }
                    let weeklyJson = {}; try { weeklyJson = typeof profile.weekly_earnings_json === 'string' ? JSON.parse(profile.weekly_earnings_json) : (profile.weekly_earnings_json || {}); } catch (e) { }

                    group.items.forEach(() => {
                      const amt = 1500;
                      const d = new Date();
                      const dateStr = formatDateLocal(d);
                      if (!dateStr || dateStr === "Invalid Date") return;

                      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                      // Accurate Week Calculation (Monday-start)
                      const itemFirstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                      const itemFirstMon = new Date(itemFirstOfMonth);
                      const itemDayOfFirst = itemFirstMon.getDay(); // 0=Sun, 1=Mon...
                      const diff = (itemDayOfFirst === 0 ? -6 : 1 - itemDayOfFirst);
                      itemFirstMon.setDate(itemFirstMon.getDate() + diff);
                      itemFirstMon.setHours(0, 0, 0, 0);

                      const itemDiff = Math.floor((d - itemFirstMon) / (1000 * 60 * 60 * 24));
                      const weekKey = `week_${Math.floor(itemDiff / 7) + 1}`;

                      totalJson[dateStr] = (parseFloat(totalJson[dateStr] || 0) + amt);
                      monthlyJson[monthKey] = (parseFloat(monthlyJson[monthKey] || 0) + amt);
                      if (!weeklyJson[monthKey]) weeklyJson[monthKey] = {};
                      weeklyJson[monthKey][weekKey] = (parseFloat(weeklyJson[monthKey][weekKey] || 0) + amt);
                    });

                    await supabase.from("staff_profile").update({
                      total_earnings: (parseFloat(profile.total_earnings || 0) + group.amount),
                      total_earnings_json: JSON.stringify(totalJson),
                      monthly_earnings_json: JSON.stringify(monthlyJson),
                      weekly_earnings_json: JSON.stringify(weeklyJson)
                    }).eq("email", email);

                    // Save notification in DB
                    await supabase
                      .from("notifications")
                      .insert({
                        staff_email: email,
                        title: "Referral Reward Received! 💰",
                        body: `Congratulations! You have received ₹${group.amount.toLocaleString()} as your referral bonus payment.`,
                        type: "payout_received",
                        is_read: false,
                        booking_id: null
                      });

                    if (profile.push_token) {
                      await supabase.functions.invoke("send-staff-notification", {
                        body: {
                          token: profile.push_token,
                          title: "Referral Reward Received! 💰",
                          body: `Congratulations! You have received ₹${group.amount.toLocaleString()} as your referral bonus payment. For queries, contact ${SUPPORT_PHONE}`,
                          data: { screen: "new-services", type: "payout_received", amount: group.amount }
                        }
                      });
                    }

                    // Fire WhatsApp notification for each referral item in the group
                    if (profile.phone) {
                      group.items.forEach(item => {
                        supabase.functions.invoke("send-referral-reward", {
                          body: {
                            staff_name: profile.name || "Partner",
                            referred_person_name: item.full_name || "your referral",
                            amount: "1500",
                            phone: profile.phone
                          }
                        }).catch(err => console.error("Error sending referral reward WhatsApp:", err));
                      });
                    }
                  }
                }

                triggerAlert(`Successfully synced ${currentPending.length} records from Excel.`, "Sync Successful", "success");
                fetchStaffReferrals();
              } catch (err) {
                console.error("Referral Sync Processing Error:", err);
                triggerAlert(`Error updating records: ${err.message}`, "Sync Failed", "error");
              } finally {
                setReferralProcessing(false);
              }
            },
            onCancel: () => setReferralProcessing(false)
          });
        } catch (err) {
          console.error("Excel Read Error:", err);
          triggerAlert(`Could not read the Excel file: ${err.message}`, "Error", "error");
          setReferralProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setReferralProcessing(false);
    }
    e.target.value = null;
  };

  const handleImportPayoutsExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setPayoutProcessing(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const dataBuffer = evt.target.result;

          const XLSX_CDN = await loadXLSXFromCDN();
          const { read: readFunc, utils: utilsObj } = XLSX_CDN;

          if (typeof readFunc !== 'function') {
            throw new Error("Excel library 'read' function not found. Please try again or refresh the page.");
          }

          const wb = readFunc(new Uint8Array(dataBuffer), { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = utilsObj.sheet_to_json(ws);

          if (!data || data.length === 0) {
            triggerAlert("The Excel file seems to be empty.", "Sync Failed", "warning");
            setPayoutProcessing(false);
            return;
          }

          // Find all individual IDs that are now marked as "PAID"
          let allPaidIds = [];
          const paidAccountNumbers = [];
          const excelAmounts = {};

          data.forEach(row => {
            const statusKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("remark") || firstLine.includes("status");
            });
            const idsKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("record ids");
            });
            const accKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("bene_acc_no") || firstLine.includes("account number");
            });
            const amtKey = Object.keys(row).find(k => {
              const firstLine = k.split('\n')[0].trim().toLowerCase();
              return firstLine.includes("amount");
            });

            const statusVal = row[statusKey]?.toString()?.trim()?.toUpperCase();
            if (statusVal === "PAID") {
              if (row[idsKey]) {
                const ids = row[idsKey].toString().split(",").map(id => id.trim()).filter(Boolean);
                allPaidIds = [...allPaidIds, ...ids];
              } else if (row[accKey]) {
                const accNo = row[accKey].toString().trim();
                paidAccountNumbers.push(accNo);
                if (amtKey) {
                  excelAmounts[accNo] = parseFloat(row[amtKey]) || 0;
                }
              }
            }
          });

          if (paidAccountNumbers.length > 0) {
            const { data: profiles } = await supabase
              .from("staff_profile")
              .select("email, BENE_ACC_NO")
              .in("BENE_ACC_NO", paidAccountNumbers);

            if (profiles && profiles.length > 0) {
              const emails = profiles.map(p => p.email?.trim()?.toLowerCase()).filter(Boolean);
              const { data: pendingEarnings } = await supabase
                .from("staff_earnings")
                .select("id")
                .in("staff_email", emails)
                .neq("payment_status", "paid");

              if (pendingEarnings && pendingEarnings.length > 0) {
                const ids = pendingEarnings.map(e => e.id);
                allPaidIds = [...allPaidIds, ...ids];
              }
            }
          }

          if (allPaidIds.length === 0) {
            triggerAlert("No rows marked as 'PAID' were detected. Ensure you typed 'paid' in the REMARK column.", "No Changes Found", "info");
            setPayoutProcessing(false);
            return;
          }

          // Fetch current pending records for these IDs
          const { data: currentPending, error: fetchErr } = await supabase
            .from("staff_earnings")
            .select("*")
            .in("id", allPaidIds)
            .neq("payment_status", "paid");

          if (fetchErr) throw fetchErr;

          if (!currentPending || currentPending.length === 0) {
            triggerAlert("The records you marked as 'PAID' are already updated in the database.", "Already Synced", "info");
            setPayoutProcessing(false);
            return;
          }

          const totalToPay = currentPending.reduce((s, r) => s + parseFloat(r.AMOUNT || r.amount || 0), 0);
          setConfirmConfig({
            show: true,
            title: "Confirm Excel Sync",
            message: `Updating ${currentPending.length} services to 'PAID' for a total of ₹${totalToPay.toLocaleString()}. Proceed?`,
            onConfirm: async () => {
              try {
                const idsToUpdate = currentPending.map(r => r.id);

                const { error: updateErr } = await supabase
                  .from("staff_earnings")
                  .update({ payment_status: "paid", paid_at: new Date().toISOString() })
                  .in("id", idsToUpdate);

                if (updateErr) throw updateErr;

                const staffGroups = {};
                currentPending.forEach(r => {
                  const email = r.staff_email?.trim()?.toLowerCase();
                  if (!staffGroups[email]) staffGroups[email] = { amount: 0, items: [] };
                  staffGroups[email].amount += parseFloat(r.AMOUNT || r.amount || 0);
                  staffGroups[email].items.push(r);
                });

                for (const [email, group] of Object.entries(staffGroups)) {
                  const { data: profile } = await supabase.from("staff_profile").select("*").eq("email", email).single();
                  if (profile) {
                    let totalJson = {}; try { totalJson = typeof profile.total_earnings_json === 'string' ? JSON.parse(profile.total_earnings_json) : (profile.total_earnings_json || {}); } catch (e) { }
                    let monthlyJson = {}; try { monthlyJson = typeof profile.monthly_earnings_json === 'string' ? JSON.parse(profile.monthly_earnings_json) : (profile.monthly_earnings_json || {}); } catch (e) { }
                    let weeklyJson = {}; try { weeklyJson = typeof profile.weekly_earnings_json === 'string' ? JSON.parse(profile.weekly_earnings_json) : (profile.weekly_earnings_json || {}); } catch (e) { }
                    group.items.forEach(item => {
                      const amt = parseFloat(item.AMOUNT || item.amount || 0);
                      const d = new Date(item.earned_at || new Date());
                      const dateStr = formatDateLocal(d);
                      if (!dateStr || dateStr === "Invalid Date") return;

                      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                      // Accurate Week Calculation (Monday-start)
                      const itemFirstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                      const itemFirstMon = new Date(itemFirstOfMonth);
                      const itemDayOfFirst = itemFirstMon.getDay(); // 0=Sun, 1=Mon...
                      const diff = (itemDayOfFirst === 0 ? -6 : 1 - itemDayOfFirst);
                      itemFirstMon.setDate(itemFirstMon.getDate() + diff);
                      itemFirstMon.setHours(0, 0, 0, 0);

                      const itemDiff = Math.floor((d - itemFirstMon) / (1000 * 60 * 60 * 24));
                      const weekKey = `week_${Math.floor(itemDiff / 7) + 1}`;

                      totalJson[dateStr] = (parseFloat(totalJson[dateStr] || 0) + amt);
                      monthlyJson[monthKey] = (parseFloat(monthlyJson[monthKey] || 0) + amt);
                      if (!weeklyJson[monthKey]) weeklyJson[monthKey] = {};
                      weeklyJson[monthKey][weekKey] = (parseFloat(weeklyJson[monthKey][weekKey] || 0) + amt);
                    });

                    const finalNotificationAmount = excelAmounts[profile.BENE_ACC_NO] ? excelAmounts[profile.BENE_ACC_NO] : group.amount;

                    await supabase.from("staff_profile").update({
                      total_earnings: (parseFloat(profile.total_earnings || 0) + finalNotificationAmount),
                      total_earnings_json: JSON.stringify(totalJson),
                      monthly_earnings_json: JSON.stringify(monthlyJson),
                      weekly_earnings_json: JSON.stringify(weeklyJson)
                    }).eq("email", email);

                    // Save notification in DB
                    await supabase
                      .from("notifications")
                      .insert({
                        staff_email: email,
                        title: "Payment Received! 💰",
                        body: `Congratulations! You have received ₹${finalNotificationAmount.toLocaleString()} as your payment.`,
                        type: "payout_received",
                        is_read: false,
                        booking_id: null
                      });

                    if (profile.push_token) {
                      await supabase.functions.invoke("send-staff-notification", {
                        body: {
                          token: profile.push_token,
                          title: "Payment Received! 💰",
                          body: `Congratulations! You have received ₹${finalNotificationAmount.toLocaleString()} as your payment. For queries, contact ${SUPPORT_PHONE}`,
                          data: { screen: "new-services", type: "payout_received", amount: finalNotificationAmount }
                        }
                      });
                    }

                    // Fire WhatsApp notification
                    if (profile.phone) {
                      supabase.functions.invoke("send-partner-payment", {
                        body: {
                          staff_name: profile.name || "Partner",
                          amount: finalNotificationAmount.toString(),
                          phone: profile.phone,
                          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        }
                      }).catch(err => console.error("Error sending partner payment WhatsApp:", err));
                    }
                  }
                }

                triggerAlert(`Successfully synced ${currentPending.length} records from Excel.`, "Sync Successful", "success");
                // Update records in-place so they stay visible with updated status
                setPayoutTableData(prev => prev.map(item =>
                  idsToUpdate.includes(item.id)
                    ? { ...item, payment_status: "paid", paid_at: new Date().toISOString() }
                    : item
                ));
              } catch (err) {
                console.error("Sync Processing Error:", err);
                triggerAlert(`Error updating records: ${err.message}`, "Sync Failed", "error");
              } finally {
                setPayoutProcessing(false);
              }
            },
            onCancel: () => setPayoutProcessing(false)
          });
        } catch (err) {
          console.error("Excel Read Error:", err);
          triggerAlert(`Could not read the Excel file: ${err.message}`, "Error", "error");
          setPayoutProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setPayoutProcessing(false);
    }
    e.target.value = null;
  };

  // ================== ALL STAFF EARNINGS TABLE ==================
  const handleToggleStatusFilter = (status) => {
    setPayoutStatusFilter(prev => {
      // If the clicked status is already the ONLY one selected, clear it to show ALL
      if (prev.length === 1 && prev.includes(status)) {
        return [];
      } else {
        // Otherwise, set it as the ONLY selected status
        return [status];
      }
    });
  };

  const fetchAllStaffEarningsTable = async () => {
    try {
      setPayoutTableLoading(true);
      const { data: staffData } = await supabase.from("staff_profile").select("id, name, email, weekly_earnings_json");

      // Fetch staff cancellations from public.staff_cancellations table
      const { data: cancelData } = await supabase.from("staff_cancellations").select("*");
      const cancelMap = {};
      cancelData?.forEach(c => {
        const email = c.staff_email?.trim()?.toLowerCase();
        if (email) {
          const fee = parseFloat(c.cancellation_fee ?? c.cancellation_amount ?? c.amount ?? 0);
          cancelMap[email] = (cancelMap[email] || 0) + fee;
        }
      });
      setStaffCancellationsMap(cancelMap);

      let query = supabase.from("staff_earnings").select("*");

      const filters = [];
      if (payoutStatusFilter.includes("paid")) filters.push("payment_status.eq.paid");
      if (payoutStatusFilter.includes("pending")) filters.push("payment_status.eq.pending", "payment_status.is.null");

      if (filters.length > 0) {
        query = query.or(filters.join(","));
      }

      const { data: earningsData, error } = await query.order("earned_at", { ascending: false });
      if (error) throw error;

      const staffMap = {};
      staffData?.forEach(s => { staffMap[s.email?.trim()?.toLowerCase()] = s.name; });

      const bookingIds = (earningsData || []).map(e => e.booking_id).filter(Boolean);
      let bookingMap = {};
      if (bookingIds.length > 0) {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("id, booking_id, services, booking_date")
          .or(`id.in.(${bookingIds.join(',')}),booking_id.in.(${bookingIds.join(',')})`);
        bookingData?.forEach(b => {
          const title = Array.isArray(b.services) && b.services.length > 0 ? b.services[0].title || "Service" : "Service";
          const info = { title, date: b.booking_date };
          if (b.id) bookingMap[b.id] = info;
          if (b.booking_id) bookingMap[b.booking_id] = info;
        });
      }

      const enriched = (earningsData || []).map(e => {
        const bInfo = bookingMap[e.booking_id];
        return {
          ...e,
          amount: parseFloat(e.AMOUNT || e.amount || 0),
          staff_name_display: staffMap[e.staff_email?.trim()?.toLowerCase()] || e.staff_name || "Unknown",
          service_title: bInfo?.title || "Service",
          booking_date_display: bInfo?.date || e.earned_at
        };
      });
      setPayoutTableData(enriched);
      setPayoutSelectedRows(new Set());

      // (Dynamic weeks based on full Monday-to-Sunday calendar weeks)
      const [currY, currM] = payoutFilterMonth.split("-").map(Number);
      const firstD = new Date(currY, currM - 1, 1);
      const lastD = new Date(currY, currM, 0);

      // Find the Monday of the week containing the 1st
      const firstMon = new Date(firstD);
      const dayOfFirst = firstMon.getDay(); // 0=Sun, 1=Mon...
      // If 1st is Sun(0), move back 6 days to prev Mon. If Mon(1), stay. If Tue(2), move back 1 day.
      const diff = (dayOfFirst === 0 ? -6 : 1 - dayOfFirst);
      firstMon.setDate(firstMon.getDate() + diff);

      let dynamicWeeks = [];
      let cWeekStart = new Date(firstMon);
      let wIdx = 1;

      while (cWeekStart <= lastD) {
        const cWeekEnd = new Date(cWeekStart);
        cWeekEnd.setDate(cWeekEnd.getDate() + 6);

        dynamicWeeks.push({
          id: `week_${wIdx}`,
          label: `Week ${wIdx}`,
          rangeLabel: `${cWeekStart.toLocaleString('default', { month: 'short' })} ${cWeekStart.getDate()} – ${cWeekEnd.getDate()}`,
          start: formatDateLocal(cWeekStart),
          end: formatDateLocal(cWeekEnd)
        });

        cWeekStart.setDate(cWeekStart.getDate() + 7);
        wIdx++;
      }

      setPayoutAvailableWeeks(dynamicWeeks);

      // For the current month, identify which week is "Today"
      const now = new Date();
      const todayDateStr = formatDateLocal(now);
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let todayWeekIdx = null;
      let checkStart = new Date(firstMon);
      let checkIdx = 1;
      while (checkStart <= lastD) {
        const checkEnd = new Date(checkStart);
        checkEnd.setDate(checkEnd.getDate() + 6);
        const sStr = formatDateLocal(checkStart);
        const eStr = formatDateLocal(checkEnd);
        if (todayDateStr >= sStr && todayDateStr <= eStr) {
          todayWeekIdx = checkIdx;
          break;
        }
        checkStart.setDate(checkStart.getDate() + 7);
        checkIdx++;
      }

      if (payoutFilterMonth === currentYM && todayWeekIdx) {
        const todayId = `week_${todayWeekIdx}`;
        setPayoutTodayWeek(todayId);
        setPayoutAvailableWeeks(dynamicWeeks.filter(w => w.id === todayId));
      } else {
        setPayoutAvailableWeeks(dynamicWeeks);
      }

      // Default to current week if available, otherwise first week
      const defaultWeek = (payoutFilterMonth === currentYM && todayWeekIdx) ? `week_${todayWeekIdx}` : (dynamicWeeks[0]?.id || "");

      if (!payoutFilterWeek && dynamicWeeks.length > 0) setPayoutFilterWeek(defaultWeek);
      else if (payoutFilterWeek && !dynamicWeeks.some(w => w.id === payoutFilterWeek)) setPayoutFilterWeek(defaultWeek);
    } catch (err) {
      console.error("Fetch All Staff Earnings Error:", err);
    } finally {
      setPayoutTableLoading(false);
    }
  };

  const formatDateLocal = (d) => {
    if (!d) return null;
    // Robust parsing: If it's a YYYY-MM-DD string, return it directly to avoid TZ shifts
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.split('T')[0];
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFilteredPayoutTableData = () => {
    let filtered = payoutTableData;

    if (payoutFilterMode === "weekly" && payoutFilterWeek) {
      // Compute the start of the current week (not cycle) for carry-forward cutoff
      const weekNum = parseInt(payoutFilterWeek.replace("week_", ""), 10);
      const [wy, wm] = payoutFilterMonth.split("-").map(Number);
      const wFirstDate = new Date(wy, wm - 1, 1);
      const wFirstSun = new Date(wFirstDate);
      wFirstSun.setDate(wFirstSun.getDate() - wFirstSun.getDay());
      const wStart = new Date(wFirstSun);
      wStart.setDate(wStart.getDate() + (weekNum - 1) * 7);
      const rollingDebtWeekStart = formatDateLocal(wStart);

      if (payoutFilterWeekDate && payoutFilterWeekDate !== "all") {
        // Handle split cycle (comma-separated string) or single date
        const selectedDates = payoutFilterWeekDate.includes(",")
          ? payoutFilterWeekDate.split(",")
          : [payoutFilterWeekDate];

        // Compute cycle type for rolling carry-forward
        const firstDateInSelection = new Date(selectedDates[0] + 'T00:00:00');
        const dayOfWeek = firstDateInSelection.getDay(); // 0=Sun, 1=Mon...
        const isCycle1 = dayOfWeek >= 0 && dayOfWeek <= 3;
        const isCycle2 = dayOfWeek >= 4 && dayOfWeek <= 6;

        filtered = filtered.filter(e => {
          if (!e.earned_at) return false;
          const dateStr = formatDateLocal(e.earned_at);
          const paidDateStr = formatDateLocal(e.paid_at);

          // Show in current if either the service was done now OR it was paid now
          const isCurrent = selectedDates.includes(dateStr) || (paidDateStr && selectedDates.includes(paidDateStr));
          let isCarryForward = false;

          if (e.payment_status !== "paid") {
            if (isCycle1) {
              // Cycle 1 carries forward from PREVIOUS WEEKS only
              isCarryForward = (dateStr < rollingDebtWeekStart);
            } else if (isCycle2) {
              // Cycle 2 carries forward from CYCLE 1 of this week only
              isCarryForward = (dateStr >= rollingDebtWeekStart && dateStr < selectedDates[0]);
            }
          } else {
            // If it is PAID, we still want to show it in the current view if it was paid RECENTLY
            // or if we are looking for paid items specifically.
            // For now, we allow PAID items that were part of the current cycle's dates.
            isCarryForward = false;
          }

          return isCurrent || isCarryForward;
        });
      } else {
        // Fall back to the full week range (Full Calendar-based Weeks: Mon-Sun)
        const weekNum = parseInt(payoutFilterWeek.replace("week_", ""), 10);
        const [y, m] = payoutFilterMonth.split("-").map(Number);

        const firstDate = new Date(y, m - 1, 1);
        const firstSun = new Date(firstDate);
        const dayOfFirst = firstSun.getDay();
        firstSun.setDate(firstSun.getDate() - dayOfFirst);

        // Calculate the actual start and end of this specific week
        const weekStart = new Date(firstSun);
        weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = formatDateLocal(weekStart);
        const endStr = formatDateLocal(weekEnd);

        filtered = filtered.filter(e => {
          if (!e.earned_at) return false;
          const dStr = formatDateLocal(e.earned_at);
          const pStr = formatDateLocal(e.paid_at);
          // Include current week dates (earned OR paid) OR carry forward pending from previous weeks
          const isCurrent = (dStr >= startStr && dStr <= endStr) || (pStr && pStr >= startStr && pStr <= endStr);
          // Only show as carry forward if it is pending OR if it was paid (but we want to see paid items)
          // Actually, if it's paid and dStr < startStr, it shouldn't show up in a LATER week 
          // UNLESS the user is looking at the history.
          const isCarryForward = (e.payment_status !== "paid" && dStr < startStr);
          return isCurrent || isCarryForward;
        });
      }
    } else if (payoutFilterMode === "monthly") {

      filtered = filtered.filter(e => {
        if (!e.earned_at) return false;
        const d = new Date(e.earned_at);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        let pmk = null;
        if (e.paid_at) {
          const pd = new Date(e.paid_at);
          pmk = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
        }

        const isCurrent = (mk === payoutFilterMonth) || (pmk === payoutFilterMonth);
        const isCarryForward = (e.payment_status !== "paid" && mk < payoutFilterMonth);
        return isCurrent || isCarryForward;
      });
    } else if (payoutFilterMode === "byDate") {
      filtered = filtered.filter(e => {
        if (!e.earned_at) return false;
        const earnedDate = new Date(e.earned_at).toISOString().split('T')[0];
        const paidDate = e.paid_at ? new Date(e.paid_at).toISOString().split('T')[0] : null;
        return earnedDate === payoutFilterDate || paidDate === payoutFilterDate;
      });
    }

    // Apply Search Filter
    if (payoutSearchQuery.trim()) {
      const q = payoutSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(e =>
        e.staff_name_display?.toLowerCase().includes(q) ||
        e.staff_email?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };





  const handleExportPayoutCSV = () => {
    if (!payoutBreakdown || payoutBreakdown.length === 0) {
      triggerAlert("No data available to export.", "Warning", "warning");
      return;
    }

    const headers = ["Booking ID", "Service", "Email", "Partner", "Amount", "Status", "Date"];
    const rows = payoutBreakdown.map(item => [
      item.booking_id || "N/A",
      `"${item.service_title || "Service"}"`,
      item.staff_email || selectedPayoutStaff.email || "N/A",
      `"${item.staff_name || selectedPayoutStaff.name || "Partner"}"`,
      item.amount || 0,
      (item.payment_status || "pending").toUpperCase(),
      item.earned_at || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payout_${selectedPayoutStaff.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWeeklySummaryCSV = () => {
    if (!selectedPayoutStaff) return;
    try {
      // FORCE "PAID ONLY" calculation from raw records to match screen
      const weeklyData = {};
      payoutBreakdown.forEach(item => {
        if (item.payment_status === "paid" && item.earned_at) {
          const d = new Date(item.earned_at);
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

          const itemFirstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
          const itemFirstSun = new Date(itemFirstOfMonth);
          itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
          const itemDiff = Math.floor((d - itemFirstSun) / (1000 * 60 * 60 * 24));
          const wKey = `week${Math.floor(itemDiff / 7) + 1}`;

          if (!weeklyData[mKey]) weeklyData[mKey] = {};
          weeklyData[mKey][wKey] = (weeklyData[mKey][wKey] || 0) + parseFloat(item.amount || 0);
        }
      });

      if (Object.keys(weeklyData).length === 0) {
        triggerAlert("No PAID weekly data available to export.", "Warning", "warning"); return;
      }
      const headers = ["Partner", "Month", "Week", "Date Range", "Amount"];
      const rows = [];
      Object.entries(weeklyData).forEach(([monthKey, weeks]) => {
        if (!weeks || typeof weeks !== 'object') return;
        const [year, month] = monthKey.split("-").map(Number);
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        const firstOfMonth = new Date(year, month - 1, 1);
        const firstSun = new Date(firstOfMonth);
        firstSun.setDate(firstSun.getDate() - firstSun.getDay());
        Object.entries(weeks).forEach(([weekKey, amount]) => {
          const weekNum = parseInt(weekKey.toLowerCase().replace(/[^0-9]/g, ""));
          const weekStart = new Date(firstSun);
          weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const fmt = (d) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
          rows.push([
            `"${selectedPayoutStaff.name || 'Partner'}"`,
            `${monthName} ${year}`,
            `WEEK${weekNum}`,
            `"${fmt(weekStart)} - ${fmt(weekEnd)}"`,
            Number(amount) || 0
          ]);
        });
      });
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Weekly_Summary_${selectedPayoutStaff.name}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      triggerAlert("Failed to export weekly summary.", "Error", "error");
    }
  };

  const handleExportMonthlySummaryCSV = () => {
    if (!selectedPayoutStaff) return;
    try {
      // FORCE "PAID ONLY" calculation from raw records to match screen
      const monthlyData = {};
      payoutBreakdown.forEach(item => {
        if (item.payment_status === "paid" && item.earned_at) {
          const d = new Date(item.earned_at);
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthlyData[mKey] = (monthlyData[mKey] || 0) + parseFloat(item.amount || 0);
        }
      });

      if (Object.keys(monthlyData).length === 0) {
        triggerAlert("No PAID monthly data available to export.", "Warning", "warning"); return;
      }
      const headers = ["Partner", "Month", "Amount"];
      const rows = Object.entries(monthlyData).map(([monthKey, amount]) => {
        const [year, month] = String(monthKey).split("-");
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        return [`"${selectedPayoutStaff.name || 'Partner'}"`, `"${monthName}"`, Number(amount) || 0];
      });
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Monthly_Summary_${selectedPayoutStaff.name}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      triggerAlert("Failed to export monthly summary.", "Error", "error");
    }
  };



  const fetchStaffReferrals = async () => {
    try {
      setLoadingReferrals(true);

      // Trigger the milestone check edge function to sync completed bookings and send notifications
      await supabase.functions.invoke("check-referral-milestones").catch(err => {
        console.error("Error invoking check-referral-milestones:", err);
      });

      const { data, error } = await supabase
        .from("staff_referral_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStaffReferrals(data || []);
    } catch (err) {
      console.error("Error fetching staff referrals:", err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleUpdateReferralStatus = async (id, newStatus) => {
    try {
      const { data, error } = await supabase
        .from("staff_referral_forms")
        .update({ status: newStatus })
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        triggerAlert("Failed to update status. Please check permissions.", "Error", "error");
        return;
      }

      triggerAlert(`Referral ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`, "Success", "success");
      fetchStaffReferrals();

      if (newStatus === "approved") {
        const candidate = data[0];
        // Clean phone number to 10-digit numeric format matching form validation
        const cleanPhone = (candidate.phone_number || "").replace(/\D/g, "");
        const finalPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

        // Look up referrer's profile ID based on the referral code
        let referrerId = null;
        if (candidate.referral_code) {
          const { data: referrerProfile } = await supabase
            .from("staff_profile")
            .select("id")
            .eq("referral_code", candidate.referral_code)
            .maybeSingle();
          if (referrerProfile) {
            referrerId = referrerProfile.id;
          }
        }

        triggerConfirm(
          "After accepting the referral, you need to talk with them. After all confirmation, you need to add that referred person by using the Add Staff button. Do you want to onboard them as a staff member now?",
          () => {
            setStaffForm({
              name: candidate.full_name || "",
              phone: finalPhone,
              email: candidate.email || "",
              password: "",
              role: "staff",
              account_holder_name: "",
              account_number: "",
              ifsc_code: "",
              bank_name: "",
              aadhar_number: "",
              tagged_partner: "",
              referral_code: "", // Stays empty to trigger the random 8-character code generation
              referred_by: referrerId || "",
              referral_form_id: candidate.id || "",
            });
            setShowAddStaff(true);
          },
          "Onboard Staff"
        );
      }
    } catch (err) {
      console.error("Error updating referral status:", err);
      triggerAlert("Failed to update status: " + (err.message || "Unknown error"), "Error", "error");
    }
  };

  const handleInitiateBonus = async (id) => {
    try {
      const { error } = await supabase
        .from("staff_referral_forms")
        .update({ bonus_status: "initiated" })
        .eq("id", id);

      if (error) {
        if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
          throw new Error("The 'bonus_status' column is not found in your Supabase table. Please run this SQL in your Supabase SQL Editor: ALTER TABLE staff_referral_forms ADD COLUMN IF NOT EXISTS bonus_status VARCHAR(50) DEFAULT 'pending';");
        }
        throw error;
      }

      triggerAlert("Referral bonus initiated successfully!", "Success", "success");
      fetchStaffReferrals();
    } catch (err) {
      console.error("Error initiating referral bonus:", err);
      triggerAlert(err.message, "Bonus Action Failed", "error");
    }
  };

  const handleCompletePayment = async (id) => {
    try {
      const { error } = await supabase
        .from("staff_referral_forms")
        .update({
          bonus_status: "paid",
          bonus_amount: 1500
        })
        .eq("id", id);

      if (error) {
        if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
          throw new Error("The 'bonus_amount' or 'bonus_status' column is not found in your Supabase table. Please run this SQL in your Supabase SQL Editor:\nALTER TABLE staff_referral_forms ADD COLUMN IF NOT EXISTS bonus_status VARCHAR(50) DEFAULT 'pending';\nALTER TABLE staff_referral_forms ADD COLUMN IF NOT EXISTS bonus_amount INT DEFAULT 0;");
        }
        throw error;
      }

      // FIRE WHATSAPP NOTIFICATION
      const referralRecord = staffReferrals?.find(r => r.id === id);
      if (referralRecord) {
        // Find the staff profile using referral_code
        const { data: staffProfile } = await supabase
          .from("staff_profile")
          .select("name, phone")
          .eq("referral_code", referralRecord.referral_code)
          .single();

        if (staffProfile && staffProfile.phone) {
          supabase.functions.invoke("send-referral-reward", {
            body: {
              staff_name: staffProfile.name || "Partner",
              referred_person_name: referralRecord.full_name || "your referral",
              amount: "1500",
              phone: staffProfile.phone
            }
          }).catch(err => console.error("Error sending referral reward WhatsApp:", err));
        }
      }

      triggerAlert("Referral bonus marked as paid successfully!", "Success", "success");
      fetchStaffReferrals();
    } catch (err) {
      console.error("Error completing payment:", err);
      triggerAlert(err.message, "Payment Action Failed", "error");
    }
  };

  const toggleReferrer = (referrerName) => {
    setExpandedReferrers(prev => ({
      ...prev,
      [referrerName]: !prev[referrerName]
    }));
  };

  const fetchHeroImages = async () => {
    try {
      setLoadingHero(true);
      // Staff App: hero_images table, image_path column
      const { data: staffData } = await supabase
        .from("hero_images")
        .select("id, image_path, priority, is_active")
        .order("priority", { ascending: true });
      setHeroStaffImages(staffData || []);

      // Customer Website: web-hero-images table, image_path column
      const { data: webData } = await supabase
        .from("web-hero-images")
        .select("id, image_path, priority, is_active")
        .order("priority", { ascending: true });
      setHeroWebImages(webData || []);

      // Customer App: hero_banners table, image_path column
      const { data: appData } = await supabase
        .from("hero_banners")
        .select("id, image_path, priority, is_active")
        .order("priority", { ascending: true });
      setHeroAppImages(appData || []);
    } catch (err) {
      console.error("Error fetching hero images:", err);
    } finally {
      setLoadingHero(false);
    }
  };

  /**
   * Unified Helper for Priority Shifting
   * mode: "up" (increment >= priority) or "down" (decrement > priority)
   * Returns true if shifting succeeded, false otherwise.
   */
  const shiftHeroPriorities = async (table, targetPriority, mode, excludeId = null) => {
    const targetP = parseInt(targetPriority) || 1;

    try {
      // 1. Fetch EVERYTHING from the table for a fresh state
      const { data: allImages, error: fetchError } = await supabase
        .from(table)
        .select("id, priority")
        .order("priority", { ascending: true });

      if (fetchError || !allImages) {
        console.error("Priority Fetch Error:", fetchError);
        return false;
      }

      // 2. Prepare the new sequence in JS
      // We exclude the one being handled if passed (for edit mode)
      let currentItems = allImages.filter(img => !excludeId || img.id !== excludeId);

      let updateQueue = [];
      let pointer = 1;

      for (const item of currentItems) {
        // If we are shifting "UP" to make room for a new item at targetP
        if (mode === "up" && pointer === targetP) {
          pointer++; // Skip this slot
        }

        // Only queue an update if the priority actually needs to change
        if (parseInt(item.priority) !== pointer) {
          updateQueue.push({ id: item.id, newPriority: pointer });
        }
        pointer++;
      }

      if (updateQueue.length === 0) return true; // Nothing to shift

      // 3. Sequential Update (Descending order for room-making, Ascending for gap-filling)
      // Higher numbers first is generally safer for "up" shifts.
      updateQueue.sort((a, b) => b.newPriority - a.newPriority);

      let allUpdatesSucceeded = true;

      for (const task of updateQueue) {
        const { data: updatedData, error: updateError } = await supabase
          .from(table)
          .update({ priority: task.newPriority })
          .eq("id", task.id)
          .select();

        if (updateError) {
          console.error(`Priority Update Failed for ID ${task.id}:`, updateError);
          allUpdatesSucceeded = false;
        } else if (!updatedData || updatedData.length === 0) {
          // RLS silently blocked the update — no error but 0 rows affected
          console.warn(`Priority Update for ID ${task.id} affected 0 rows (likely RLS). Attempting direct update...`);

          // Fallback: try updating with explicit columns to work around potential RLS issues
          const { data: retryData, error: retryError } = await supabase
            .from(table)
            .update({ priority: task.newPriority })
            .eq("id", task.id)
            .select("id, priority");

          if (retryError || !retryData || retryData.length === 0) {
            console.error(`Priority Update STILL failed for ID ${task.id}. RLS policy likely missing UPDATE permission.`);
            allUpdatesSucceeded = false;
          }
        }
      }

      return allUpdatesSucceeded;
    } catch (err) {
      console.error("Priority Re-indexing System Error:", err);
      return false;
    }
  };

  const uploadHeroImage = async (type) => {
    // Show requirement alert before uploading
    if (type === "staff") {
      triggerAlert("The image should maintain an aspect ratio of 1:1, with a recommended resolution of 1024 × 1024 pixels", "Upload Info", "error");
    } else if (type === "web") {
      triggerAlert("The image should maintain an aspect ratio of 3:1, with a recommended resolution of 1500 × 500 pixels", "Upload Info", "error");
    } else if (type === "app") {
      triggerAlert("The image should maintain an aspect ratio of 16:9, with a recommended resolution of 4096 × 2304 pixels", "Upload Info", "error");
    }

    const config = {
      staff: { file: heroStaffFile, bucket: "hero-images-staff", table: "hero_images", priority: heroStaffPriority, isActive: heroStaffActive },
      web: { file: heroWebFile, bucket: "web-hero-images", table: "web-hero-images", priority: heroWebPriority, isActive: heroWebActive },
      app: { file: heroAppFile, bucket: "hero-images", table: "hero_banners", priority: heroAppPriority, isActive: heroAppActive },
    }[type];

    if (!config.file) return;

    try {
      setHeroUploading(true);
      let targetPriority = parseInt(config.priority) || 1;

      // 1. Shift existing priorities up
      const shiftOk = await shiftHeroPriorities(config.table, targetPriority, "up");

      if (!shiftOk) {
        // Shifting failed (likely RLS blocking updates). 
        // Fallback: find the current max priority and insert at the end.
        const { data: maxData } = await supabase
          .from(config.table)
          .select("priority")
          .order("priority", { ascending: false })
          .limit(1);

        const maxP = (maxData && maxData.length > 0) ? parseInt(maxData[0].priority) || 0 : 0;
        targetPriority = maxP + 1;
        console.warn(`Priority shift failed. Falling back to priority ${targetPriority} (end of list).`);
      }

      const fileName = `${Date.now()}_${config.file.name}`;

      // 2. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from(config.bucket)
        .upload(fileName, config.file, { upsert: false });

      if (uploadError) {
        triggerAlert(uploadError.message, "Upload Failed", "error");
        return;
      }

      // 3. Insert into DB with the specified priority and is_active
      const { error: insertError } = await supabase
        .from(config.table)
        .insert({
          image_path: fileName,
          priority: targetPriority,
          is_active: config.isActive.toUpperCase() === "TRUE"
        });

      if (insertError) {
        triggerAlert(insertError.message, "Database Error", "error");
        return;
      }

      // Reset inputs
      if (type === "staff") {
        setHeroStaffFile(null);
        setHeroStaffPriority("");
        setHeroStaffActive("");
        if (heroStaffInputRef.current) heroStaffInputRef.current.value = "";
      }
      if (type === "web") {
        setHeroWebFile(null);
        setHeroWebPriority("");
        setHeroWebActive("");
        if (heroWebInputRef.current) heroWebInputRef.current.value = "";
      }
      if (type === "app") {
        setHeroAppFile(null);
        setHeroAppPriority("");
        setHeroAppActive("");
        if (heroAppInputRef.current) heroAppInputRef.current.value = "";
      }

      if (!shiftOk) {
        triggerAlert("Image uploaded but priority shifting failed. Please check Supabase RLS policies for the table. The image was placed at the end.", "Partial Success", "info");
      } else {
        triggerAlert("Image uploaded successfully ✅", "Success", "success");
      }
      fetchHeroImages();
    } catch (err) {
      console.error("Hero upload error:", err);
      triggerAlert(err.message, "Error", "error");
    } finally {
      setHeroUploading(false);
    }
  };

  const deleteHeroImage = async (type, id, imagePath) => {
    const config = {
      staff: { bucket: "hero-images-staff", table: "hero_images" },
      web: { bucket: "web-hero-images", table: "web-hero-images" },
      app: { bucket: "hero-images", table: "hero_banners" },
    }[type];

    // Fetch the priority of the image being deleted
    const { data: imgToDelete } = await supabase
      .from(config.table)
      .select("priority")
      .eq("id", id)
      .single();

    const deletedPriority = imgToDelete?.priority;

    triggerConfirm(
      `Delete "${imagePath}"?`,
      async () => {
        // 1. Remove from Storage
        const { data: storageData, error: storageError } = await supabase.storage.from(config.bucket).remove([imagePath]);

        if (storageError) {
          console.error("Storage delete error:", storageError);
          triggerAlert(`Failed to delete file from storage: ${storageError.message}`, "Storage Error", "error");
        } else if (!storageData || storageData.length === 0) {
          console.warn(`Storage delete returned empty result for "${imagePath}" in bucket "${config.bucket}". File may not exist or SELECT policy may be missing.`);
        }

        // 2. Remove from DB
        const { error: deleteError } = await supabase.from(config.table).delete().eq("id", id);

        if (deleteError) {
          triggerAlert(deleteError.message, "Delete Failed", "error");
          return;
        }

        // 3. Shift subsequent priorities down
        if (deletedPriority) {
          await shiftHeroPriorities(config.table, deletedPriority, "down");
        }

        fetchHeroImages();
        triggerAlert("Image deleted and priorities reordered", "Deleted", "success");
      },
      "Confirm Delete",
    );
  };

  const startEditingHero = (img) => {
    setEditingHeroId(img.id);
    setEditHeroPriority(img.priority || "");
    setEditHeroActive(img.is_active ? "TRUE" : "FALSE");
  };

  const cancelEditingHero = () => {
    setEditingHeroId(null);
    setEditHeroPriority("");
    setEditHeroActive("");
  };

  const updateHeroImage = async (type) => {
    const config = {
      staff: { table: "hero_images" },
      web: { table: "web-hero-images" },
      app: { table: "hero_banners" },
    }[type];

    // Fetch the old image details
    const { data: oldImg } = await supabase
      .from(config.table)
      .select("priority")
      .eq("id", editingHeroId)
      .single();

    if (!oldImg) return;

    const oldPriority = oldImg.priority;
    const newPriority = parseInt(editHeroPriority) || 1;
    const isActiveVal = editHeroActive.toUpperCase() === "TRUE";

    try {
      // 1. Shift priorities if priority has changed
      if (oldPriority !== newPriority) {
        // First, "remove" the old one by shifting subsequent down
        await shiftHeroPriorities(config.table, oldPriority, "down");

        // Then, "insert" into new spot by shifting >= newPriority up
        await shiftHeroPriorities(config.table, newPriority, "up", editingHeroId);
      }

      // 2. Update the record
      const { error: updateError } = await supabase
        .from(config.table)
        .update({
          priority: newPriority,
          is_active: isActiveVal
        })
        .eq("id", editingHeroId);

      if (updateError) throw updateError;

      triggerAlert("Image updated successfully ✅", "Success", "success");
      cancelEditingHero();
      fetchHeroImages();
    } catch (err) {
      triggerAlert(err.message, "Update Failed", "error");
    }
  };

  return (
    <div className="dashboard">
      {/* ===== HEADER ===== */}
      <div
        className="dashboard-logo-row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div className="hide-on-mobile" />

        <div style={{ textAlign: "center" }}>
          <img
            src={neatifyLogo}
            alt="Neatify Logo"
            style={{ width: "200px", marginBottom: "4px" }}
          />
          <p style={{ fontSize: "18px", fontWeight: 600 }}>ADMIN DASHBOARD</p>
        </div>

        <div style={{ textAlign: "right", position: "relative" }}>
          <button
            className="allot-btn"
            style={{ marginRight: "10px" }}
            onClick={() => {
              localStorage.setItem("forceOpenStaff", "true");
              setActiveTab("bookings");
              setIsStaffViewOpen(true);
              window.dispatchEvent(new Event("forceOpenStaffUpdate"));
            }}
          >
            All Staff
          </button>

          <button
            className="allot-btn"
            style={{ marginRight: "10px" }}
            onClick={() => {
              setActiveTab("staff-summary");
              setIsStaffViewOpen(false);
              fetchStaffCounts();
            }}
          >
            Show Staff
          </button>

          <button
            className="allot-btn"
            style={{ marginRight: "10px" }}
            onClick={() => setShowAddStaff(true)}
          >
            Add Staff
          </button>

          <button className="allot-btn" onClick={() => setShowMenu(!showMenu)}>
            👤
          </button>

          {showMenu && (
            <div className="account-dropdown">
              <div onClick={handleProfile}>Profile</div>
              <div onClick={handleLogoutClick}>Logout</div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MAIN TABS ===== */}
      <div className="dashboard-tabs" style={{ justifyContent: "center" }}>
        <button
          className={activeTab === "services" ? "active" : ""}
          onClick={() => {
            setActiveTab("services");
            setIsStaffViewOpen(false);
          }}
        >
          Services
        </button>

        <button
          className={activeTab === "bookings" ? "active" : ""}
          onClick={() => {
            localStorage.setItem("forceOpenStaff", "false");
            window.dispatchEvent(new Event("forceOpenStaffUpdate"));
            setActiveTab("bookings");
            setIsStaffViewOpen(false);
          }}
        >
          Bookings
        </button>

        <button
          className={activeTab === "coupons" ? "active" : ""}
          onClick={() => {
            setActiveTab("coupons");
            setIsStaffViewOpen(false);
            fetchCoupons();
            fetchAllServices();
          }}
        >
          Coupons
        </button>

        <button
          className={activeTab === "offers" ? "active" : ""}
          onClick={() => {
            setActiveTab("offers");
            setIsStaffViewOpen(false);
            fetchAllServices();
            fetchPopups();
          }}
        >
          Offers
        </button>

        <button
          className={activeTab === "hero-images" ? "active" : ""}
          onClick={() => {
            setActiveTab("hero-images");
            setIsStaffViewOpen(false);
            fetchHeroImages();
          }}
        >
          Hero Images
        </button>

        <button
          className={activeTab === "promotional-banners" ? "active" : ""}
          onClick={() => {
            setActiveTab("promotional-banners");
            setIsStaffViewOpen(false);
          }}
        >
          Promotional Banners
        </button>

        <button
          className={activeTab === "schedule" ? "active" : ""}
          onClick={() => {
            setActiveTab("schedule");
            setIsStaffViewOpen(false);
            fetchScheduleConfig();
          }}
        >
          Schedule
        </button>
        <button
          className={activeTab === "service-time" ? "active" : ""}
          onClick={() => {
            setActiveTab("service-time");
            setIsStaffViewOpen(false);
            fetchScheduleConfig();
          }}
        >
          Service Time
        </button>
        <button
          className={activeTab === "pricing" ? "active" : ""}
          onClick={() => {
            setActiveTab("pricing");
            setIsStaffViewOpen(false);
            fetchPricingServices();
          }}
        >
          Pricing
        </button>
        <button
          className={activeTab === "partner-payments" ? "active" : ""}
          onClick={() => {
            setActiveTab("partner-payments");
            setIsStaffViewOpen(false);
            fetchPartnerPayments();
          }}
        >
          Partner Payouts
        </button>

        <button
          className={activeTab === "staff-referrals" ? "active" : ""}
          onClick={() => {
            setActiveTab("staff-referrals");
            setIsStaffViewOpen(false);
            fetchStaffReferrals();
          }}
        >
          Staff Referrals
        </button>

        <button
          className={activeTab === "category-hub-counts" ? "active" : ""}
          onClick={() => {
            setActiveTab("category-hub-counts");
            setIsStaffViewOpen(false);
          }}
        >
          Category Hub Counts
        </button>


      </div>

      {/* ===== TAB CONTENT ===== */}
      {isStaffViewOpen && activeTab !== "bookings" ? (
        <Bookings />
      ) : (
        <>
          {activeTab === "services" && (
            <Services selectedType={serviceType} onTypeChange={setServiceType} />
          )}

          {activeTab === "bookings" && <Bookings />}

          {activeTab === "promotional-banners" && (
            <PromotionalBanners triggerAlert={triggerAlert} triggerConfirm={triggerConfirm} />
          )}

          {activeTab === "hero-images" && (
            <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
              {loadingHero || heroUploading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "400px",
                  }}
                >
                  <Loader />
                </div>
              ) : (
                <>
                  {/* Sub-tabs */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "2px solid #f0f0f0", paddingBottom: "10px" }}>
                    {[
                      { key: "staff", label: "Staff App" },
                      { key: "web", label: "Customer Website" },
                      { key: "app", label: "Customer App" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setHeroTab(t.key)}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: heroTab === t.key ? "700" : "400",
                          background: heroTab === t.key ? "#ffd700" : "#f0f0f0",
                          fontSize: "14px",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* ── STAFF APP ── */}
                  {heroTab === "staff" && (
                    <div>
                      <h3 style={{ marginBottom: "16px" }}>Staff App Hero Images <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal" }}>(The image should maintain an aspect ratio of 1:1, with a recommended resolution of 1024 × 1024 pixels)</span></h3>
                      <div className="upload-field" style={{ marginBottom: "16px", display: "flex", gap: "20px" }}>
                        <div style={{ flex: 1 }}>
                          <label className="upload-field__label">Upload Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            ref={heroStaffInputRef}
                            onChange={(e) => setHeroStaffFile(e.target.files[0])}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Priority</label>
                          <input
                            type="number"
                            placeholder="e.g. 1"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroStaffPriority}
                            onChange={(e) => setHeroStaffPriority(e.target.value)}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Is Active</label>
                          <input
                            type="text"
                            placeholder="TRUE/FALSE"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroStaffActive}
                            onChange={(e) => setHeroStaffActive(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                      <button
                        className="auth-button"
                        style={{ marginBottom: "24px", opacity: (heroUploading || !heroStaffFile) ? 0.6 : 1 }}
                        disabled={heroUploading || !heroStaffFile}
                        onClick={() => uploadHeroImage("staff")}
                      >
                        {heroUploading ? "Uploading…" : "Upload"}
                      </button>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
                        {heroStaffImages.map((img) => (
                          <div key={img.id} style={{ position: "relative", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "8px" }}>
                            <div style={{ position: "absolute", top: "5px", right: "5px", display: "flex", gap: "4px", zIndex: 1 }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <input
                                    type="number"
                                    value={editHeroPriority}
                                    onChange={(e) => setEditHeroPriority(e.target.value)}
                                    style={{ width: "40px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                  />
                                  <select
                                    value={editHeroActive}
                                    onChange={(e) => setEditHeroActive(e.target.value)}
                                    style={{ width: "70px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                                  >
                                    <option value="TRUE">TRUE</option>
                                    <option value="FALSE">FALSE</option>
                                  </select>
                                </>
                              ) : (
                                <>
                                  <div style={{ background: "#ffd700", color: "#000", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
                                    P: {img.priority || "-"}
                                  </div>
                                  <div style={{
                                    background: img.is_active ? "#22c55e" : "#ef4444",
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    fontWeight: "bold",
                                    display: "flex",
                                    alignItems: "center"
                                  }}>
                                    {img.is_active ? "TRUE" : "FALSE"}
                                  </div>
                                </>
                              )}
                            </div>
                            <img
                              src={`https://auth.theneatifyteam.in/storage/v1/object/public/hero-images-staff/${img.image_path}`}
                              alt={img.image_path}
                              style={{
                                width: "140px",
                                height: "100px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                display: "block",
                                filter: img.is_active ? "none" : "grayscale(100%)",
                                opacity: img.is_active ? 1 : 0.6
                              }}
                            />
                            <p style={{ fontSize: "11px", color: "#666", marginTop: "4px", wordBreak: "break-all", maxWidth: "140px" }}>{img.image_path}</p>
                            <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <button
                                    onClick={() => updateHeroImage("staff")}
                                    style={{ flex: 1, background: "#dcfce7", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#166534", fontWeight: "600" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingHero}
                                    style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#475569", fontWeight: "600" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingHero(img)}
                                    style={{ flex: 1, background: "#fef9c3", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#854d0e", fontWeight: "600" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteHeroImage("staff", img.id, img.image_path)}
                                    style={{ flex: 1, background: "#fee2e2", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#dc2626", fontWeight: "600" }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {heroStaffImages.length === 0 && <p style={{ color: "#999" }}>No images yet.</p>}
                      </div>
                    </div>
                  )}

                  {/* ── CUSTOMER WEBSITE ── */}
                  {heroTab === "web" && (
                    <div>
                      <h3 style={{ marginBottom: "16px" }}>Customer Website Hero Images <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal" }}>(The image should maintain an aspect ratio of 3:1, with a recommended resolution of 1500 × 500 pixels)</span></h3>
                      <div className="upload-field" style={{ marginBottom: "16px", display: "flex", gap: "20px" }}>
                        <div style={{ flex: 1 }}>
                          <label className="upload-field__label">Upload Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            ref={heroWebInputRef}
                            onChange={(e) => setHeroWebFile(e.target.files[0])}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Priority</label>
                          <input
                            type="number"
                            placeholder="e.g. 1"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroWebPriority}
                            onChange={(e) => setHeroWebPriority(e.target.value)}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Is Active</label>
                          <input
                            type="text"
                            placeholder="TRUE/FALSE"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroWebActive}
                            onChange={(e) => setHeroWebActive(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                      <button
                        className="auth-button"
                        style={{ marginBottom: "24px", opacity: (heroUploading || !heroWebFile) ? 0.6 : 1 }}
                        disabled={heroUploading || !heroWebFile}
                        onClick={() => uploadHeroImage("web")}
                      >
                        {heroUploading ? "Uploading…" : "Upload"}
                      </button>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
                        {heroWebImages.map((img) => (
                          <div key={img.id} style={{ position: "relative", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "8px" }}>
                            <div style={{ position: "absolute", top: "5px", right: "5px", display: "flex", gap: "4px", zIndex: 1 }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <input
                                    type="number"
                                    value={editHeroPriority}
                                    onChange={(e) => setEditHeroPriority(e.target.value)}
                                    style={{ width: "40px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                  />
                                  <select
                                    value={editHeroActive}
                                    onChange={(e) => setEditHeroActive(e.target.value)}
                                    style={{ width: "70px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                                  >
                                    <option value="TRUE">TRUE</option>
                                    <option value="FALSE">FALSE</option>
                                  </select>
                                </>
                              ) : (
                                <>
                                  <div style={{ background: "#ffd700", color: "#000", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
                                    P: {img.priority || "-"}
                                  </div>
                                  <div style={{
                                    background: img.is_active ? "#22c55e" : "#ef4444",
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    fontWeight: "bold",
                                    display: "flex",
                                    alignItems: "center"
                                  }}>
                                    {img.is_active ? "TRUE" : "FALSE"}
                                  </div>
                                </>
                              )}
                            </div>
                            <img
                              src={`https://auth.theneatifyteam.in/storage/v1/object/public/web-hero-images/${img.image_path}`}
                              alt={img.image_path}
                              style={{
                                width: "140px",
                                height: "100px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                display: "block",
                                filter: img.is_active ? "none" : "grayscale(100%)",
                                opacity: img.is_active ? 1 : 0.6
                              }}
                            />
                            <p style={{ fontSize: "11px", color: "#666", marginTop: "4px", wordBreak: "break-all", maxWidth: "140px" }}>{img.image_path}</p>
                            <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <button
                                    onClick={() => updateHeroImage("web")}
                                    style={{ flex: 1, background: "#dcfce7", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#166534", fontWeight: "600" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingHero}
                                    style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#475569", fontWeight: "600" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingHero(img)}
                                    style={{ flex: 1, background: "#fef9c3", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#854d0e", fontWeight: "600" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteHeroImage("web", img.id, img.image_path)}
                                    style={{ flex: 1, background: "#fee2e2", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#dc2626", fontWeight: "600" }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {heroWebImages.length === 0 && <p style={{ color: "#999" }}>No images yet.</p>}
                      </div>
                    </div>
                  )}

                  {/* ── CUSTOMER APP ── */}
                  {heroTab === "app" && (
                    <div>
                      <h3 style={{ marginBottom: "16px" }}>Customer App Hero Images <span style={{ color: "red", fontSize: "14px", marginLeft: "10px", fontWeight: "normal" }}>(The image should maintain an aspect ratio of 16:9, with a recommended resolution of 4096 × 2304 pixels)</span></h3>
                      <div className="upload-field" style={{ marginBottom: "16px", display: "flex", gap: "20px" }}>
                        <div style={{ flex: 1 }}>
                          <label className="upload-field__label">Upload Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            ref={heroAppInputRef}
                            onChange={(e) => setHeroAppFile(e.target.files[0])}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Priority</label>
                          <input
                            type="number"
                            placeholder="e.g. 1"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroAppPriority}
                            onChange={(e) => setHeroAppPriority(e.target.value)}
                          />
                        </div>
                        <div style={{ width: "120px" }}>
                          <label className="upload-field__label">Is Active</label>
                          <input
                            type="text"
                            placeholder="TRUE/FALSE"
                            className="auth-input"
                            style={{ margin: 0, padding: "8px" }}
                            value={heroAppActive}
                            onChange={(e) => setHeroAppActive(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                      <button
                        className="auth-button"
                        style={{ marginBottom: "24px", opacity: (heroUploading || !heroAppFile) ? 0.6 : 1 }}
                        disabled={heroUploading || !heroAppFile}
                        onClick={() => uploadHeroImage("app")}
                      >
                        {heroUploading ? "Uploading…" : "Upload"}
                      </button>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
                        {heroAppImages.map((img) => (
                          <div key={img.id} style={{ position: "relative", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "8px" }}>
                            <div style={{ position: "absolute", top: "5px", right: "5px", display: "flex", gap: "4px", zIndex: 1 }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <input
                                    type="number"
                                    value={editHeroPriority}
                                    onChange={(e) => setEditHeroPriority(e.target.value)}
                                    style={{ width: "40px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                  />
                                  <select
                                    value={editHeroActive}
                                    onChange={(e) => setEditHeroActive(e.target.value)}
                                    style={{ width: "70px", padding: "2px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                                  >
                                    <option value="TRUE">TRUE</option>
                                    <option value="FALSE">FALSE</option>
                                  </select>
                                </>
                              ) : (
                                <>
                                  <div style={{ background: "#ffd700", color: "#000", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
                                    P: {img.priority || "-"}
                                  </div>
                                  <div style={{
                                    background: img.is_active ? "#22c55e" : "#ef4444",
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    fontWeight: "bold",
                                    display: "flex",
                                    alignItems: "center"
                                  }}>
                                    {img.is_active ? "TRUE" : "FALSE"}
                                  </div>
                                </>
                              )}
                            </div>
                            <img
                              src={`https://auth.theneatifyteam.in/storage/v1/object/public/hero-images/${img.image_path}`}
                              alt={img.image_path}
                              style={{
                                width: "140px",
                                height: "100px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                display: "block",
                                filter: img.is_active ? "none" : "grayscale(100%)",
                                opacity: img.is_active ? 1 : 0.6
                              }}
                            />
                            <p style={{ fontSize: "11px", color: "#666", marginTop: "4px", wordBreak: "break-all", maxWidth: "140px" }}>{img.image_path}</p>
                            <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                              {editingHeroId === img.id ? (
                                <>
                                  <button
                                    onClick={() => updateHeroImage("app")}
                                    style={{ flex: 1, background: "#dcfce7", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#166534", fontWeight: "600" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingHero}
                                    style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#475569", fontWeight: "600" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingHero(img)}
                                    style={{ flex: 1, background: "#fef9c3", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#854d0e", fontWeight: "600" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteHeroImage("app", img.id, img.image_path)}
                                    style={{ flex: 1, background: "#fee2e2", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", fontSize: "12px", color: "#dc2626", fontWeight: "600" }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {heroAppImages.length === 0 && <p style={{ color: "#999" }}>No images yet.</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "schedule" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
              <h2 style={{ marginBottom: "30px", fontWeight: 700, color: "#1e293b" }}>Schedule Configuration</h2>

              {loadingSchedule ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}><Loader /></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

                  {/* DATE SELECTOR SECTION */}
                  <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px", color: "#334155", fontSize: "18px" }}>
                      📅 Select Date to Configure
                    </h3>
                    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <input
                        type="date"
                        className="auth-input"
                        style={{ margin: 0, width: "100%", cursor: "pointer" }}
                        value={selectedSlotDate}
                        onChange={(e) => setSelectedSlotDate(e.target.value)}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      />
                      <div style={{ marginTop: "15px", color: "#10b981", fontWeight: "600", fontSize: "14px" }}>
                        {(() => {
                          const dateSlots = scheduleConfig.date_time_slots[selectedSlotDate];
                          if (dateSlots === undefined) {
                            const defaultCount = scheduleConfig.time_slots.filter(s => s.active).length;
                            return `${defaultCount} slots enabled (using default master slots) for ${new Date(selectedSlotDate).toDateString()}`;
                          } else {
                            return `${dateSlots.length} slots enabled for ${new Date(selectedSlotDate).toDateString()}`;
                          }
                        })()}
                      </div>
                      {scheduleConfig.date_time_slots[selectedSlotDate] !== undefined && (
                        <button
                          onClick={resetDateSlotsToDefault}
                          style={{ marginTop: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", color: "#475569", fontWeight: "600" }}
                        >
                          Reset to Default Master Slots
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DATE-SPECIFIC TIME SLOTS GRID */}
                  <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <h3 style={{ display: "flex", alignItems: "center", gap: "10px", color: "#334155", fontSize: "18px", margin: 0 }}>
                        🕒 Date-Specific Time Slots
                      </h3>
                      {(() => {
                        if (!selectedSlotDate) return null;
                        const masterVals = scheduleConfig.time_slots.map(s => s.value);
                        const dateVals = scheduleConfig.date_time_slots[selectedSlotDate] || [];
                        const combined = [...new Set([...masterVals, ...dateVals])];
                        if (combined.length === 0) return null;

                        const isConfigured = scheduleConfig.date_time_slots[selectedSlotDate] !== undefined;
                        const currentlyEnabledCount = combined.filter(slotValue => {
                          return isConfigured
                            ? scheduleConfig.date_time_slots[selectedSlotDate].includes(slotValue)
                            : (scheduleConfig.time_slots.find(s => s.value === slotValue)?.active !== false);
                        }).length;

                        const allSelected = currentlyEnabledCount === combined.length;

                        return (
                          <div
                            onClick={toggleAllDateSpecificSlots}
                            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              readOnly
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                              Select All
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "25px" }}>
                      Select a date above, then check the time slots you want to enable for <strong>that specific day</strong>.
                    </p>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: "15px"
                    }}>
                      {(() => {
                        const masterVals = scheduleConfig.time_slots.map(s => s.value);
                        const dateVals = scheduleConfig.date_time_slots[selectedSlotDate] || [];
                        const combined = [...new Set([...masterVals, ...dateVals])];

                        combined.sort((a, b) => {
                          const parseTime = (timeStr) => {
                            const match = timeStr.trim().match(/^(\d+):(\d+)\s*(am|pm)$/i);
                            if (!match) return 0;
                            let hours = parseInt(match[1], 10);
                            const minutes = parseInt(match[2], 10);
                            const period = match[3].toLowerCase();
                            if (period === "pm" && hours !== 12) hours += 12;
                            if (period === "am" && hours === 12) hours = 0;
                            return hours * 60 + minutes;
                          };
                          return parseTime(a) - parseTime(b);
                        });

                        if (combined.length === 0) {
                          return <p style={{ color: "#94a3b8", gridColumn: "1 / -1" }}>No slots defined.</p>;
                        }

                        return combined.map((slotValue, idx) => {
                          const isConfigured = scheduleConfig.date_time_slots[selectedSlotDate] !== undefined;
                          const isEnabled = isConfigured
                            ? scheduleConfig.date_time_slots[selectedSlotDate].includes(slotValue)
                            : (scheduleConfig.time_slots.find(s => s.value === slotValue)?.active !== false);

                          return (
                            <div
                              key={idx}
                              onClick={() => toggleDateSpecificSlot(slotValue)}
                              style={{
                                padding: "12px",
                                background: isEnabled ? "#f0f9ff" : "#fff",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                border: isEnabled ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                readOnly
                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                              />
                              <span style={{
                                fontSize: "15px",
                                fontWeight: "600",
                                color: isEnabled ? "#1e40af" : "#475569"
                              }}>
                                {slotValue}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* MASTER SLOT LIST SECTION */}
                  <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "16px", border: "1px dashed #cbd5e1" }}>
                    <h3 style={{ marginBottom: "15px", color: "#475569", fontSize: "16px", fontWeight: "700" }}>
                      Master Slot List (Add/Remove from global options)
                    </h3>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                      {scheduleConfig.time_slots.map((item, idx) => {
                        if (item.active === false) return null;
                        return (
                          <div key={idx} style={{
                            padding: "6px 12px",
                            background: "#fff",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "13px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                          }}>
                            <span style={{ color: "#1e293b", fontWeight: "600" }}>{item.value}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItemFromConfig("time_slots", idx);
                              }}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px", padding: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Add new slot e.g. 11:00 am"
                        style={{ margin: 0, flex: 1, height: "45px" }}
                        value={newSlot}
                        onChange={(e) => setNewSlot(e.target.value)}
                      />
                      <button
                        className="allot-btn"
                        style={{ margin: 0, padding: "0 25px", height: "45px", background: "#facc15", color: "#000" }}
                        onClick={() => addItemToConfig("time_slots")}
                      >
                        Add to Master
                      </button>
                    </div>
                  </div>

                  {/* YEARS SECTION */}
                  <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#334155" }}>
                      📅 Enabled Years
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                      {scheduleConfig.years.map((item, idx) => (
                        <div key={idx} style={{
                          padding: "10px 16px",
                          background: item.active ? "#fff7ed" : "#f8fafc",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          border: item.active ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: item.active ? "#9a3412" : "#64748b",
                          opacity: item.active ? 1 : 0.6,
                          transition: "all 0.2s ease"
                        }}>
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={() => toggleItemActive("years", idx)}
                            style={{ cursor: "pointer", width: "18px", height: "18px" }}
                          />
                          <span>{item.value}</span>
                          <button
                            onClick={() => removeItemFromConfig("years", idx)}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px", padding: 0, marginLeft: "4px" }}
                            title="Delete Permanently"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {scheduleConfig.years.length === 0 && <p style={{ color: "#94a3b8" }}>No years configured.</p>}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="number"
                        className="auth-input"
                        placeholder="e.g. 2029"
                        style={{ margin: 0, flex: 1 }}
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                      />
                      <button
                        className="allot-btn"
                        style={{ margin: 0, padding: "10px 20px", height: "auto" }}
                        onClick={() => addItemToConfig("years")}
                      >
                        Add Year
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {activeTab === "service-time" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
              <h2 style={{ marginBottom: "30px", fontWeight: 700, color: "#1e293b" }}>Service Time Configuration</h2>

              {loadingSchedule ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}><Loader /></div>
              ) : (
                <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#334155" }}>
                    🕒 Last Booking Time Rules
                  </h3>

                  <div style={{ marginBottom: "24px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600" }}>Service Name</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600" }}>Last Booking Time</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleConfig.service_time_rules.map((rule, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "12px", fontWeight: "600", color: "#1e293b" }}>{rule.service_name}</td>
                            <td style={{ padding: "12px", color: "#334155" }}>
                              <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                                {rule.last_booking_time}
                              </span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              <button
                                onClick={() => removeItemFromConfig("service_time_rules", idx)}
                                style={{ background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer", padding: "6px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "13px" }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {scheduleConfig.service_time_rules.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                              No service time rules configured.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", background: "#f8fafc", padding: "20px", borderRadius: "12px" }}>
                    <div style={{ flex: 2, minWidth: "200px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#64748b" }}>Service Name</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Deep Cleaning"
                        style={{ margin: 0, width: "100%" }}
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#64748b" }}>Last Booking Time</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="e.g. 5:00 pm"
                        style={{ margin: 0, width: "100%" }}
                        value={newLastBookingTime}
                        onChange={(e) => setNewLastBookingTime(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button
                        className="allot-btn"
                        style={{ margin: 0, padding: "12px 24px", height: "45px" }}
                        onClick={() => addItemToConfig("service_time_rules")}
                      >
                        Add Rule
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "pricing" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
              <h2 style={{ marginBottom: "30px", fontWeight: 700, color: "#1e293b" }}>Service Pricing Management</h2>

              {loadingPricing ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}><Loader /></div>
              ) : (
                <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>Title</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>Price</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>Discount (%)</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>Admin Amount</th>
                          <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>Staff Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingServices.map((service) => (
                          <tr key={service.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="text"
                                value={pricingEdits[service.id]?.title || ""}
                                onChange={(e) =>
                                  setPricingEdits((prev) => ({
                                    ...prev,
                                    [service.id]: { ...prev[service.id], title: e.target.value },
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  color: "#1e293b",
                                  background: "#f8fafc",
                                  outline: "none",
                                  minWidth: "140px",
                                }}
                              />
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="text"
                                value={pricingEdits[service.id]?.price || ""}
                                onChange={(e) => {
                                  let newPrice = e.target.value;
                                  if (newPrice && !newPrice.startsWith("₹")) newPrice = "₹" + newPrice;

                                  const currentEdit = pricingEdits[service.id] || {};
                                  const newAdmin = calculateAdminAmount(
                                    newPrice,
                                    currentEdit.staff_amount,
                                    currentEdit.discount_percent
                                  );

                                  setPricingEdits((prev) => ({
                                    ...prev,
                                    [service.id]: {
                                      ...prev[service.id],
                                      price: newPrice,
                                      admin_amount: newAdmin
                                    },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#334155",
                                  background: "#f8fafc",
                                  outline: "none",
                                  minWidth: "100px",
                                }}
                              />
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="text"
                                value={pricingEdits[service.id]?.discount_percent ?? "0"}
                                onChange={(e) => {
                                  let newDisc = e.target.value;

                                  const currentEdit = pricingEdits[service.id] || {};
                                  const newAdmin = calculateAdminAmount(
                                    currentEdit.price,
                                    currentEdit.staff_amount,
                                    newDisc
                                  );
                                  setPricingEdits((prev) => ({
                                    ...prev,
                                    [service.id]: {
                                      ...prev[service.id],
                                      discount_percent: newDisc,
                                      admin_amount: newAdmin
                                    },
                                  }));
                                }}
                                onBlur={(e) => {
                                  // Optional: append % on blur if not present and not empty
                                  let val = e.target.value;
                                  if (val && !val.includes("%") && !isNaN(val.replace(/[₹,%]/g, ""))) {
                                    setPricingEdits(prev => ({
                                      ...prev,
                                      [service.id]: { ...prev[service.id], discount_percent: val + "%" }
                                    }));
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#334155",
                                  background: "#f8fafc",
                                  outline: "none",
                                  minWidth: "80px",
                                }}
                              />
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="text"
                                value={pricingEdits[service.id]?.admin_amount || ""}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (val && !val.startsWith("₹")) val = "₹" + val;
                                  setPricingEdits((prev) => ({
                                    ...prev,
                                    [service.id]: { ...prev[service.id], admin_amount: val },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#334155",
                                  background: "#f8fafc",
                                  outline: "none",
                                  minWidth: "100px",
                                }}
                              />
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="text"
                                value={pricingEdits[service.id]?.staff_amount || ""}
                                onChange={(e) => {
                                  let newStaff = e.target.value;
                                  if (newStaff && !newStaff.startsWith("₹")) newStaff = "₹" + newStaff;

                                  const currentEdit = pricingEdits[service.id] || {};
                                  const newAdmin = calculateAdminAmount(
                                    currentEdit.price,
                                    newStaff,
                                    currentEdit.discount_percent
                                  );

                                  setPricingEdits((prev) => ({
                                    ...prev,
                                    [service.id]: {
                                      ...prev[service.id],
                                      staff_amount: newStaff,
                                      admin_amount: newAdmin
                                    },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#334155",
                                  background: "#f8fafc",
                                  outline: "none",
                                  minWidth: "100px",
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                        {pricingServices.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                              No services found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
                    <button
                      className="auth-button"
                      style={{
                        width: "auto",
                        minWidth: "300px",
                        padding: "15px 40px",
                        fontSize: "16px",
                        boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
                        opacity: loadingAllPricing ? 0.7 : 1,
                        cursor: loadingAllPricing ? "wait" : "pointer"
                      }}
                      disabled={loadingAllPricing}
                      onClick={handleSaveAllPricing}
                    >
                      {loadingAllPricing ? "Saving All Changes..." : "Save All Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "offers" && (
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
              {loadingOffers || loadingPopups ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "400px",
                  }}
                >
                  <Loader />
                </div>
              ) : (
                <>
                  {/* SECTION 1: Service Offers */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "30px",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                      marginBottom: "30px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: "20px",
                          color: "#1e293b",
                        }}
                      >
                        Service Popup Message Management
                      </h3>
                      <button
                        onClick={() =>
                          setOfferForm({
                            category: "",
                            serviceId: "",
                            percentage: "",
                            description: "",
                          })
                        }
                        style={{
                          padding: "6px 15px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          background: "#facc15",
                          color: "#000",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Clear Filter
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "20px",
                        marginBottom: "20px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: 600,
                            marginBottom: "5px",
                            color: "#64748b",
                          }}
                        >
                          Service Type
                        </label>
                        <select
                          className="auth-input centered-input"
                          style={{ margin: 0, width: "100%", cursor: "pointer" }}
                          value={offerForm.category}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              category: e.target.value,
                              serviceId: "",
                            })
                          }
                        >
                          <option value="">-- Choose Type --</option>
                          {[...new Set(allServices.map((s) => s.service_type))]
                            .sort()
                            .map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: "250px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: 600,
                            marginBottom: "5px",
                            color: "#64748b",
                          }}
                        >
                          Title
                        </label>
                        <select
                          className="auth-input centered-input"
                          style={{ margin: 0, width: "100%", cursor: "pointer" }}
                          value={offerForm.serviceId}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              serviceId: e.target.value,
                            })
                          }
                          disabled={!offerForm.category}
                        >
                          <option value="">-- Choose a Service --</option>
                          {allServices
                            .filter((s) => s.service_type === offerForm.category)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: 600,
                            marginBottom: "5px",
                            color: "#64748b",
                          }}
                        >
                          Offer Percentage (%)
                        </label>
                        <input
                          type="number"
                          className="auth-input centered-input"
                          placeholder="e.g. 20"
                          style={{ margin: 0, width: "100%" }}
                          value={offerForm.percentage}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              percentage: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                          color: "#64748b",
                        }}
                      >
                        Description (Popup Message)
                      </label>
                      <textarea
                        className="auth-input"
                        placeholder="Message users will see when this offer is live..."
                        style={{
                          margin: 0,
                          width: "100%",
                          height: "80px",
                          padding: "12px",
                          borderRadius: "8px",
                        }}
                        value={offerForm.description}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <button
                      onClick={handleUpdateOffer}
                      disabled={loadingOffers}
                      className="allot-btn"
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "16px",
                        background: "#facc15",
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      Update Popup
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                      overflow: "hidden",
                      marginBottom: "50px",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Service Type
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Title
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Percentage
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Popup Message
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {offerList.length > 0 ? (
                          offerList.map((off) => (
                            <tr
                              key={off.id}
                              style={{ borderBottom: "1px solid #f1f5f9" }}
                            >
                              <td
                                style={{
                                  padding: "15px",
                                  color: "#64748b",
                                  fontSize: "12px",
                                }}
                              >
                                {off.service_type}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  fontWeight: 700,
                                  color: "#1e293b",
                                }}
                              >
                                {off.title}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  color: "#059669",
                                  fontWeight: 600,
                                }}
                              >
                                {off.offer_percentage}% OFF
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  fontSize: "12px",
                                  color: "#64748b",
                                  maxWidth: "200px",
                                }}
                              >
                                {off.description || "-"}
                              </td>
                              <td style={{ padding: "15px" }}>
                                <button
                                  onClick={() => handleToggleOffer(off)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "none",
                                    cursor: "pointer",
                                    background: off.is_offer_enabled
                                      ? "#ecfdf5"
                                      : "#fee2e2",
                                    color: off.is_offer_enabled
                                      ? "#10b981"
                                      : "#ef4444",
                                  }}
                                >
                                  {off.is_offer_enabled ? "Enabled" : "Disabled"}
                                </button>
                              </td>
                              <td style={{ padding: "15px" }}>
                                <button
                                  onClick={() => handleResetOffer(off.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                              }}
                            >
                              {loadingOffers
                                ? "Loading offers..."
                                : "No active offers found. Set one above!"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* SECTION 2: App Popups */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "30px",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                      marginBottom: "30px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: "20px",
                          color: "#1e293b",
                        }}
                      >
                        App Popup Announcements
                      </h3>
                      <button
                        onClick={() => {
                          setPopupForm({ title: "", description: "" });
                          setPopupImage(null);
                          if (popupImageRef.current) popupImageRef.current.value = "";
                        }}
                        style={{
                          padding: "6px 15px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          background: "#facc15",
                          color: "#000",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Clear Filter
                      </button>
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                        }}
                      >
                        Title
                      </label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Diwali Cleaning Special"
                        style={{ margin: 0, width: "100%" }}
                        value={popupForm.title}
                        onChange={(e) =>
                          setPopupForm({ ...popupForm, title: e.target.value })
                        }
                      />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                        }}
                      >
                        Description
                      </label>
                      <textarea
                        className="auth-input"
                        placeholder="Write the message users will see..."
                        style={{
                          margin: 0,
                          width: "100%",
                          height: "80px",
                          padding: "12px",
                          borderRadius: "8px",
                        }}
                        value={popupForm.description}
                        onChange={(e) =>
                          setPopupForm({
                            ...popupForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div style={{ marginBottom: "30px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                        }}
                      >
                        Banner Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={popupImageRef}
                        onChange={(e) => setPopupImage(e.target.files[0])}
                      />
                      <p style={{ color: "red", fontSize: "14px", marginTop: "5px", marginBottom: 0 }}>
                        The image should maintain an aspect ratio of 7:5, with a recommended resolution of 1906 X 1400 pixels
                      </p>
                    </div>

                    <button
                      onClick={handleAddPopup}
                      disabled={loadingPopups}
                      className="allot-btn"
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "16px",
                        background: "#facc15",
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      {loadingPopups ? "Saving..." : "Publish Popup"}
                    </button>
                  </div>

                  {/* Popups List Table */}
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Title
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {appPopups.length > 0 ? (
                          appPopups.map((p) => (
                            <tr
                              key={p.id}
                              style={{ borderBottom: "1px solid #f1f5f9" }}
                            >
                              <td
                                style={{
                                  padding: "15px",
                                  fontWeight: 700,
                                  color: "#1e293b",
                                }}
                              >
                                {p.title}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  fontSize: "12px",
                                  color: "#64748b",
                                  maxWidth: "300px",
                                }}
                              >
                                {p.description}
                              </td>
                              <td style={{ padding: "15px" }}>
                                <button
                                  onClick={() => handleTogglePopup(p)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "none",
                                    cursor: "pointer",
                                    background: p.is_active ? "#ecfdf5" : "#fee2e2",
                                    color: p.is_active ? "#10b981" : "#ef4444",
                                  }}
                                >
                                  {p.is_active ? "Enabled" : "Disabled"}
                                </button>
                              </td>
                              <td style={{ padding: "15px" }}>
                                <button
                                  onClick={() => handleDeletePopup(p.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                              }}
                            >
                              {loadingPopups ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                                  <Loader />
                                </div>
                              ) : (
                                "No popups found. Create one above!"
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "staff-summary" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 40px" }}>
              <h2 style={{ marginBottom: "30px", fontWeight: 700 }}>
                Staff Workload Summary
              </h2>

              {loadingStaffCounts ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "400px",
                  }}
                >
                  <Loader />
                </div>
              ) : (
                <>
                  {/* Badges Section */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "20px",
                      marginBottom: "40px",
                    }}
                  >
                    <div
                      style={{
                        background: "#f0fdf4",
                        padding: "20px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p
                            style={{
                              fontSize: "16px",
                              margin: "0 0 5px",
                              color: "#166534",
                              fontWeight: 600,
                            }}
                          >
                            Available Staff
                          </p>
                          <p
                            style={{
                              fontSize: "28px",
                              fontWeight: 800,
                              margin: 0,
                              color: "#22c55e",
                            }}
                          >
                            {staffCounts.available}
                          </p>
                        </div>

                        <div style={{ position: "relative" }} ref={dropdownRef}>
                          <button
                            onClick={() => setShowAvailableDropdown(!showAvailableDropdown)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "20px",
                              border: "1px solid #dcfce7",
                              background: "#ffffff",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "14px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                          >
                            View Staff Details {showAvailableDropdown ? "▲" : "▼"}
                          </button>

                          {showAvailableDropdown && (
                            <>
                              <div
                                style={{
                                  position: "fixed",
                                  inset: 0,
                                  background: "rgba(0,0,0,0.03)",
                                  backdropFilter: "blur(2px)",
                                  zIndex: 90,
                                  cursor: "default"
                                }}
                                onClick={() => setShowAvailableDropdown(false)}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 10px)",
                                  right: 0,
                                  width: "280px",
                                  maxHeight: "250px",
                                  overflowY: "auto",
                                  overscrollBehavior: "contain",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "10px",
                                  background: "#f0fdf4",
                                  borderRadius: "16px",
                                  padding: "16px",
                                  boxShadow: "0 10px 30px rgba(22, 101, 52, 0.15)",
                                  textAlign: "left",
                                  zIndex: 100,
                                  border: "1px solid #dcfce7",
                                  animation: "fadeIn 0.2s ease-out"
                                }}
                              >
                                {[
                                  ...staffCounts.assignedStaff,
                                  ...staffCounts.unassignedStaff,
                                ]
                                  .filter((s) => s.is_available)
                                  .map((s) => (
                                    <div
                                      key={s.email}
                                      style={{
                                        paddingBottom: "6px",
                                        borderBottom: "1px solid #dcfce7"
                                      }}
                                    >
                                      <strong style={{ fontSize: "15px", color: "#166534" }}>{s.name}</strong>
                                      <br />
                                      <span style={{ color: "#64748b", fontSize: "13px" }}>{s.email}</span>
                                    </div>
                                  ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#fffaf0",
                        padding: "20px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "16px",
                          margin: "0 0 10px",
                          color: "#9a3412",
                          fontWeight: 600,
                        }}
                      >
                        Unassigned Bookings
                      </p>
                      <p
                        style={{
                          fontSize: "28px",
                          fontWeight: 800,
                          margin: 0,
                          color: "#f97316",
                        }}
                      >
                        {staffCounts.unassignedBookings}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: "15px",
                      alignItems: "start",
                    }}
                  >


                    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                      {/* ================= ASSIGNED STAFF (NEW CARD) ================= */}
                      <div>
                        <h5
                          style={{
                            margin: "0 0 15px",
                            fontSize: "18px",
                            color: "#16a34a",
                            fontWeight: 700,
                            borderBottom: "2px solid #16a34a",
                            paddingBottom: "8px",
                          }}
                        >
                          Assigned Staff ({staffCounts.assignedStaff.length})
                        </h5>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          {staffCounts.assignedStaff.length > 0 ? (
                            staffCounts.assignedStaff.map((s) => (
                              <div
                                key={s.email}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "15px",
                                  background: "#fff",
                                  padding: "15px",
                                  borderRadius: "10px",
                                  border: "1px solid #dcfce7",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                }}
                              >
                                <div>
                                  <strong style={{ fontSize: "16px" }}>{s.name}</strong>
                                  <br />
                                  <span style={{ color: "#64748b", fontSize: "13px" }}>
                                    {s.email}
                                  </span>
                                </div>

                                <div style={{ display: "flex" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      padding: "6px 16px",
                                      background: "#dcfce7",
                                      color: "#166534",
                                      borderRadius: "20px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => fetchStaffServicesData(s, true)}
                                  >
                                    Assigned ({s.count})
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      padding: "6px 16px",
                                      background: "#fffbeb",
                                      color: "#92400e",
                                      borderRadius: "20px",
                                      cursor: "pointer",
                                      marginLeft: "10px"
                                    }}
                                    onClick={() => handleViewEarnings(s)}
                                  >
                                    View Earnings
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: "#94a3b8" }}>No staff currently assigned.</p>
                          )}
                        </div>
                      </div>

                      {/* Total Staff List */}
                      <div>
                        <h5
                          style={{
                            margin: "0 0 15px",
                            fontSize: "16px",
                            color: "#3b82f6",
                            fontWeight: 700,
                            borderBottom: "2px solid #3b82f6",
                            paddingBottom: "8px",
                          }}
                        >
                          Total Services (Staff) ({staffCounts.totalServicesStaff.length})
                        </h5>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",

                          }}
                        >
                          {staffCounts.totalServicesStaff.length > 0 ? (
                            staffCounts.totalServicesStaff.map((s) => (
                              <div
                                key={s.email}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "14px",
                                  background: "#fff",
                                  padding: "12px 15px",
                                  borderRadius: "8px",
                                  border: "1px solid #f1f5f9",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                }}
                              >
                                <span>
                                  <strong style={{ fontSize: "15px" }}>
                                    {s.name}
                                  </strong>{" "}
                                  <br />
                                  <span
                                    style={{ color: "#64748b", fontSize: "12px" }}
                                  >
                                    {s.email}
                                  </span>
                                </span>
                                <div style={{ display: "flex" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      padding: "4px 12px",
                                      background: "#dbeafe",
                                      color: "#1e40af",
                                      borderRadius: "20px",
                                      cursor: "pointer",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      display: "flex"
                                    }}
                                    onClick={() => fetchStaffServicesData(s, false)}
                                  >
                                    Total Services ({s.count})
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      padding: "4px 12px",
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      borderRadius: "20px",
                                      cursor: "pointer",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      display: "flex",
                                      marginLeft: "8px"
                                    }}
                                    onClick={() => handleViewEarnings(s)}
                                  >
                                    View Earnings
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                              No staff members currently assigned.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unassigned Staff List */}
                    <div>
                      <h5
                        style={{
                          margin: "0 0 15px",
                          fontSize: "16px",
                          color: "#ef4444",
                          fontWeight: 700,
                          borderBottom: "2px solid #ef4444",
                          paddingBottom: "8px",
                        }}
                      >
                        Unassigned Staff ({staffCounts.unassignedStaff.length})
                      </h5>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {staffCounts.unassignedStaff.length > 0 ? (
                          staffCounts.unassignedStaff.map((s) => (
                            <div
                              key={s.email}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "14px",
                                background: "#fff",
                                padding: "12px 15px",
                                borderRadius: "8px",
                                border: "1px solid #fff1f2",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                              }}
                            >
                              <span>
                                <strong style={{ fontSize: "15px" }}>
                                  {s.name}
                                </strong>{" "}
                                <br />
                                <span
                                  style={{ color: "#64748b", fontSize: "12px" }}
                                >
                                  {s.email}
                                </span>
                              </span>
                              <div style={{ display: "flex" }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    padding: "4px 12px",
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "20px",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => fetchStaffServicesData(s)}
                                >
                                  Total Services ({s.count})
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    padding: "4px 12px",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    borderRadius: "20px",
                                    cursor: "pointer",
                                    marginLeft: "8px"
                                  }}
                                  onClick={() => handleViewEarnings(s)}
                                >
                                  View Earnings
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                            Everyone is currently assigned!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "coupons" && (
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
              <h2 style={{ marginBottom: "20px", fontWeight: 700 }}>
                Coupon Management
              </h2>

              {loadingCoupons ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "400px",
                  }}
                >
                  <Loader />
                </div>
              ) : (
                <>

                  {/* Add Coupon Form */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "25px",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      marginBottom: "30px",
                      display: "flex",
                      gap: "15px",
                      alignItems: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                          color: "#64748b",
                        }}
                      >
                        Coupon Code
                      </label>
                      <input
                        className="auth-input"
                        style={{ margin: 0, width: "100%" }}
                        placeholder="e.g. WELCOME10"
                        value={couponForm.code}
                        onChange={(e) =>
                          setCouponForm({
                            ...couponForm,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                          color: "#64748b",
                        }}
                      >
                        Discount (%)
                      </label>
                      <input
                        className="auth-input"
                        style={{ margin: 0, width: "100%" }}
                        type="number"
                        placeholder="e.g. 10"
                        value={couponForm.discount}
                        onChange={(e) =>
                          setCouponForm({ ...couponForm, discount: e.target.value })
                        }
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                          color: "#64748b",
                        }}
                      >
                        User Phone Number
                      </label>
                      <input
                        className="auth-input"
                        style={{ margin: 0, width: "100%" }}
                        placeholder="10 digit number"
                        value={couponForm.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 10)
                            setCouponForm({ ...couponForm, phone: val });
                        }}
                      />
                    </div>

                    <div ref={serviceDropdownRef} style={{ flex: 1, minWidth: "300px", position: "relative" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "5px",
                          color: "#64748b",
                        }}
                      >
                        Applicable Services ({couponForm.serviceIds.length > 0 ? couponForm.serviceIds.length : "All"})
                      </label>
                      <div
                        onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                        style={{
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "14px",
                          color: "#1e293b",
                          minHeight: "45px",
                          boxSizing: "border-box",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                          {couponForm.serviceIds.length === 0
                            ? "All Services (General)"
                            : couponForm.serviceIds.length === 1
                              ? allServices.find((s) => s.id === couponForm.serviceIds[0])?.title || "1 Service Selected"
                              : `${couponForm.serviceIds.length} Services Selected`}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
                          {serviceDropdownOpen ? "▲" : "▼"}
                        </span>
                      </div>

                      {serviceDropdownOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: "360px",
                            maxWidth: "90vw",
                            zIndex: 1000,
                            background: "#fff",
                            borderRadius: "10px",
                            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                            border: "1px solid #cbd5e1",
                            marginTop: "6px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            boxSizing: "border-box",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Search services..."
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "14px",
                              marginBottom: "12px",
                              boxSizing: "border-box",
                              outline: "none",
                            }}
                          />

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 6px",
                              borderBottom: "1px solid #e2e8f0",
                              marginBottom: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#2563eb",
                            }}
                            onClick={() => {
                              if (couponForm.serviceIds.length === allServices.length) {
                                setCouponForm({ ...couponForm, serviceIds: [] });
                              } else {
                                setCouponForm({
                                  ...couponForm,
                                  serviceIds: allServices.map((s) => s.id),
                                });
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                allServices.length > 0 &&
                                couponForm.serviceIds.length === allServices.length
                              }
                              readOnly
                              style={{ width: "17px", height: "17px", cursor: "pointer" }}
                            />
                            <span>
                              {couponForm.serviceIds.length === allServices.length
                                ? "Deselect All"
                                : "Select All Services"}
                            </span>
                          </div>

                          <div
                            style={{
                              overflowY: "auto",
                              maxHeight: "260px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              paddingRight: "4px",
                            }}
                          >
                            {allServices
                              .filter((s) =>
                                (s.title || "").toLowerCase().includes(serviceSearch.toLowerCase())
                              )
                              .map((service) => {
                                const isChecked = couponForm.serviceIds.includes(service.id);
                                return (
                                  <label
                                    key={service.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      padding: "8px 10px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      color: "#1e293b",
                                      background: isChecked ? "#eff6ff" : "transparent",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCouponForm({
                                            ...couponForm,
                                            serviceIds: [...couponForm.serviceIds, service.id],
                                          });
                                        } else {
                                          setCouponForm({
                                            ...couponForm,
                                            serviceIds: couponForm.serviceIds.filter(
                                              (id) => id !== service.id
                                            ),
                                          });
                                        }
                                      }}
                                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                    />
                                    <span style={{ flex: 1, lineHeight: "1.3" }}>
                                      {service.title}{" "}
                                      {service.service_type ? (
                                        <span style={{ color: "#64748b", fontSize: "12px" }}>
                                          ({service.service_type})
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>

                          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                            <button
                              type="button"
                              onClick={() => setServiceDropdownOpen(false)}
                              style={{
                                padding: "8px 18px",
                                background: "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      className="auth-button"
                      style={{ height: "45px", marginTop: 0 }}
                      onClick={handleAddCoupon}
                      disabled={loadingCoupons}
                    >
                      {loadingCoupons ? "..." : "Create Coupon Popup"}
                    </button>
                  </div>

                  {/* Coupons Table */}
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Code
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Discount
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Phone Number
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Applicable Service
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.length > 0 ? (
                          coupons.map((c) => {
                            let serviceNames = [];
                            if (Array.isArray(c.service_ids) && c.service_ids.length > 0) {
                              serviceNames = c.service_ids
                                .map((id) => allServices.find((s) => s.id === id)?.title)
                                .filter(Boolean);
                            } else if (c.service_id) {
                              const single =
                                c.services?.title ||
                                allServices.find((s) => s.id === c.service_id)?.title;
                              if (single) serviceNames = [single];
                            }

                            return (
                              <tr
                                key={c.id}
                                style={{ borderBottom: "1px solid #f1f5f9" }}
                              >
                                <td
                                  style={{
                                    padding: "15px",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                  }}
                                >
                                  {c.coupon_code}
                                </td>
                                <td
                                  style={{
                                    padding: "15px",
                                    color: "#059669",
                                    fontWeight: 600,
                                  }}
                                >
                                  {c.discount_percentage}%
                                </td>
                                <td style={{ padding: "15px", color: "#475569" }}>
                                  {c.phone_number}
                                </td>
                                <td style={{ padding: "15px", color: "#475569" }}>
                                  {serviceNames.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "4px",
                                        maxWidth: "280px",
                                      }}
                                    >
                                      {serviceNames.map((name, idx) => (
                                        <span
                                          key={idx}
                                          style={{
                                            background: "#eff6ff",
                                            color: "#2563eb",
                                            padding: "3px 8px",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span
                                      style={{
                                        background: "#f1f5f9",
                                        color: "#64748b",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                      }}
                                    >
                                      All Services
                                    </span>
                                  )}
                                </td>

                                <td style={{ padding: "15px" }}>
                                  <button
                                    onClick={() => handleToggleCoupon(c)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "20px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      border: "none",
                                      cursor: "pointer",
                                      background: !c.is_used
                                        ? "#ecfdf5"
                                        : "#fee2e2",
                                      color: !c.is_used ? "#10b981" : "#ef4444",
                                    }}
                                  >
                                    {!c.is_used ? "Enabled" : "Disabled"}
                                  </button>
                                </td>
                                <td style={{ padding: "15px" }}>
                                  <button
                                    onClick={() => handleDeleteCoupon(c.id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan="6"
                              style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                              }}
                            >
                              {loadingCoupons
                                ? "Loading coupons..."
                                : "No coupons found. Create your first one above!"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "partner-payments" && (
            <>
              <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 40px" }}>
                {/* Payout Cycle Reminder Alert - only on breakdown page */}
                {selectedPayoutStaff && (
                  <div style={{
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                    borderRadius: "16px",
                    padding: "15px 25px",
                    marginBottom: "25px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
                  }}>
                    <span style={{ fontSize: "20px" }}>ℹ️</span>
                    <p style={{ margin: 0, color: "#92400e", fontSize: "14px", fontWeight: 600 }}>
                      Note: Payouts are processed in two standard cycles: <strong>Sunday to Wednesday</strong> and <strong>Thursday to Saturday</strong>. Please ensure your custom selections align with these periods.
                    </p>
                  </div>
                )}

                {/* Header Section */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  background: "#fff",
                  padding: "24px 35px",
                  borderRadius: "20px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                  border: "1px solid #f1f5f9"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "30px", flex: 1 }}>
                    <h2 style={{ margin: 0, color: "#1e293b", fontWeight: 800, fontSize: "28px", whiteSpace: "nowrap" }}>Partner Payments</h2>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {selectedPayoutStaff && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          background: "#dbeafe",
                          color: "#1e40af",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 700
                        }}>
                          {payoutCycleInfo.label}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                          {payoutCycleInfo.start} - {payoutCycleInfo.end}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {selectedPayoutStaff && (
                      <div style={{ background: "#f8fafc", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex" }}>
                        <button
                          onClick={() => { setPayoutDateMode("auto"); fetchPartnerPayments(selectedPayoutStaff); }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            border: "none",
                            background: payoutDateMode === "auto" ? "#fff" : "transparent",
                            color: payoutDateMode === "auto" ? "#1e293b" : "#64748b",
                            boxShadow: payoutDateMode === "auto" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          Active Cycle
                        </button>
                        <button
                          onClick={() => setPayoutDateMode("custom")}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            border: "none",
                            background: payoutDateMode === "custom" ? "#fff" : "transparent",
                            color: payoutDateMode === "custom" ? "#1e293b" : "#64748b",
                            boxShadow: payoutDateMode === "custom" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          Custom Range
                        </button>
                      </div>
                    )}

                    {selectedPayoutStaff && (
                      <button
                        onClick={() => { setSelectedPayoutStaff(null); setPayoutDateMode("auto"); }}
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "none",
                          padding: "10px 20px",
                          borderRadius: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Date Picker Bar - only on breakdown page */}
                {payoutDateMode === "custom" && selectedPayoutStaff && (
                  <div style={{
                    background: "#fff",
                    padding: "15px 25px",
                    borderRadius: "16px",
                    marginBottom: "25px",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                    border: "1px solid #f1f5f9",
                    animation: "slideDown 0.3s ease-out"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#475569" }}>From:</span>
                      <input
                        type="date"
                        value={payoutCustomRange.start}
                        onChange={(e) => setPayoutCustomRange({ ...payoutCustomRange, start: e.target.value })}
                        style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", cursor: "pointer" }}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#475569" }}>To:</span>
                      <input
                        type="date"
                        value={payoutCustomRange.end}
                        onChange={(e) => setPayoutCustomRange({ ...payoutCustomRange, end: e.target.value })}
                        style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", cursor: "pointer" }}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      />
                    </div>
                    <button
                      onClick={() => fetchPartnerPayments(selectedPayoutStaff, payoutCustomRange.start, payoutCustomRange.end)}
                      style={{
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        padding: "8px 20px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Apply Range
                    </button>
                  </div>
                )}

                {!selectedPayoutStaff ? (
                  <>
                    <div style={{ animation: "fadeIn 0.3s ease-in" }}>



                      {/* TABLE VIEW: Partner Payout Summary */}
                      {payoutLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader /></div>
                      ) : (
                        <div style={{
                          background: "#fff",
                          borderRadius: "20px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                          overflow: "hidden",
                          border: "1px solid #f1f5f9",
                          marginBottom: "40px"
                        }}>
                          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Partner</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Status</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Paid to Partner</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Total Earnings</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Cancellation Amount</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Payable Amount</th>
                                  <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payoutStaffList.length > 0 ? (
                                  payoutStaffList
                                    .map((s, idx) => {
                                      const cancelAmt = staffCancellationsMap[s.email?.trim()?.toLowerCase()] || 0;
                                      const netPayable = Math.max(0, s.cycleAmount - cancelAmt);

                                      return (
                                        <tr
                                          key={s.id}
                                          style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                                            transition: "background 0.2s"
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc"; }}
                                        >
                                          <td style={{ padding: "14px 20px" }}>
                                            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>{s.name}</div>
                                            <div style={{ fontSize: "12px", color: "#64748b" }}>{s.email}</div>
                                          </td>
                                          <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                            <span style={{
                                              background: netPayable > 0 ? "#ecfdf5" : (s.totalEarning > 0 ? "#eff6ff" : "#f1f5f9"),
                                              color: netPayable > 0 ? "#059669" : (s.totalEarning > 0 ? "#3b82f6" : "#64748b"),
                                              padding: "4px 10px",
                                              borderRadius: "8px",
                                              fontSize: "11px",
                                              fontWeight: 700,
                                              whiteSpace: "nowrap"
                                            }}>
                                              {netPayable > 0 ? "Pending" : (s.totalEarning > 0 ? "Settled" : "No Earnings")}
                                            </span>
                                          </td>
                                          <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, fontSize: "13px", color: "#3b82f6" }}>₹{(s.totalEarning || 0).toLocaleString()}</td>
                                          <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "#64748b" }}>₹{(s.allTimeEarning || 0).toLocaleString()}</td>
                                          <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, fontSize: "13px", color: cancelAmt > 0 ? "#ef4444" : "#64748b" }}>
                                            ₹{cancelAmt.toLocaleString()}
                                          </td>
                                          <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                            <div style={{ fontWeight: 800, color: netPayable > 0 ? "#10b981" : "#1e293b", fontSize: "15px" }}>
                                              ₹{netPayable.toLocaleString()}
                                            </div>
                                          </td>
                                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                                            <button
                                              onClick={() => fetchPartnerPayments(s)}
                                              style={{
                                                background: "#fff",
                                                border: "1px solid #e2e8f0",
                                                padding: "6px 14px",
                                                borderRadius: "10px",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#3b82f6",
                                                cursor: "pointer",
                                                transition: "all 0.2s"
                                              }}
                                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; }}
                                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}
                                            >
                                              View Details
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                ) : (
                                  <tr>
                                    <td colSpan="7" style={{ padding: "80px", textAlign: "center", color: "#94a3b8" }}>
                                      No staff partners found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}





                      {/* Two-Row Filter Bar (Moved to top of Detailed Table) */}
                      <div style={{
                        background: "#fff",
                        padding: "20px 25px",
                        borderRadius: "24px",
                        marginBottom: "25px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px"
                      }}>
                        {/* Row 1: Primary Filters */}
                        <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                          {/* Mode Selector */}
                          <div style={{ background: "#f8fafc", padding: "4px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", gap: "2px" }}>
                            {[
                              { key: "all", label: "All Time" },
                              { key: "monthly", label: "Monthly" },
                              { key: "weekly", label: "Weekly" },
                              { key: "byDate", label: "By Date" }
                            ].map(f => (
                              <button
                                key={f.key}
                                onClick={() => {
                                  setPayoutFilterMode(f.key);
                                  setPayoutSelectedRows(new Set());
                                  if (f.key === "weekly" && payoutTodayWeek) {
                                    setPayoutFilterWeek(payoutTodayWeek);
                                  }
                                }}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "10px",
                                  border: "none",
                                  background: payoutFilterMode === f.key ? "#fff" : "transparent",
                                  color: payoutFilterMode === f.key ? "#1e293b" : "#64748b",
                                  boxShadow: payoutFilterMode === f.key ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>

                          {/* Search Bar */}
                          <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
                            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#3b82f6", fontSize: "14px" }}>🔍</span>
                            <input
                              type="text"
                              placeholder="Search staff by name or email..."
                              value={payoutSearchQuery}
                              onChange={(e) => setPayoutSearchQuery(e.target.value)}
                              style={{ width: "100%", padding: "10px 15px 10px 42px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "14px", fontWeight: "600", outline: "none", transition: "all 0.2s", color: "#1e293b" }}
                            />
                          </div>

                          {/* Status Filter removed for a cleaner UI */}

                        </div>

                        {/* Row 2: Weekly Specific Filters (Merged into one row) */}
                        {payoutFilterMode === "weekly" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "15px", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Week:</span>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                {payoutAvailableWeeks.map((wk) => {
                                  const isActive = payoutFilterWeek === wk.id;
                                  return (
                                    <button
                                      key={wk.id}
                                      onClick={() => { setPayoutFilterWeek(wk.id); setPayoutFilterWeekDate(""); setPayoutSelectedRows(new Set()); }}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: "10px",
                                        border: isActive ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                                        background: isActive ? "#fff" : "#f8fafc",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        textAlign: "center",
                                        minWidth: "80px"
                                      }}
                                    >
                                      <div style={{ fontSize: "11px", fontWeight: 800, color: isActive ? "#3b82f6" : "#475569" }}>
                                        {wk.label} {wk.id === payoutTodayWeek && <span style={{ color: "#10b981", marginLeft: "4px" }}>•</span>}
                                      </div>
                                      <div style={{ fontSize: "9px", fontWeight: 600, color: "#94a3b8" }}>{wk.rangeLabel}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Date:</span>
                              <select
                                value={payoutFilterWeekDate}
                                onChange={(e) => { setPayoutFilterWeekDate(e.target.value); setPayoutSelectedRows(new Set()); }}
                                style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #3b82f6", background: "#eff6ff", fontSize: "12px", fontWeight: 700, color: "#1d4ed8", outline: "none", cursor: "pointer", minWidth: "180px" }}
                              >
                                {(() => {
                                  const activeWk = payoutAvailableWeeks.find(w => w.id === payoutFilterWeek);
                                  if (!activeWk) return <option value="">Select a week first</option>;
                                  const dates = [];
                                  let curr = new Date(activeWk.start + 'T00:00:00');
                                  const end = new Date(activeWk.end + 'T00:00:00');
                                  while (curr <= end) {
                                    dates.push(formatDateLocal(new Date(curr)));
                                    curr.setDate(curr.getDate() + 1);
                                  }
                                  const cycle1 = dates.slice(0, 4).join(",");
                                  const cycle2 = dates.slice(4).join(",");
                                  return (
                                    <>
                                      <option value="">All dates ({activeWk.label})</option>
                                      <option value={cycle1}>Cycle 1 (Mon–Thu)</option>
                                      <option value={cycle2}>Cycle 2 (Fri–Sun)</option>
                                      <optgroup label="Individual Dates">
                                        {dates.map(d => (
                                          <option key={d} value={d}>
                                            {new Date(d + 'T00:00:00').toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                                          </option>
                                        ))}
                                      </optgroup>
                                    </>
                                  );
                                })()}
                              </select>
                            </div>

                            <input
                              type="month"
                              value={payoutFilterMonth}
                              onChange={(e) => { setPayoutFilterMonth(e.target.value); setPayoutSelectedRows(new Set()); }}
                              style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", fontWeight: 700, color: "#1e293b", outline: "none", cursor: "pointer" }}
                            />
                          </div>
                        )}

                        {/* Final Row: Label */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "15px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#1e293b", fontWeight: 800, fontSize: "14px" }}>
                            <span style={{ fontSize: "18px" }}>📅</span>
                            {(() => {
                              if (payoutFilterMode === "monthly") {
                                const d = new Date(payoutFilterMonth + "-01");
                                return d.toLocaleString('default', { month: 'long', year: 'numeric' });
                              } else if (payoutFilterMode === "weekly") {
                                const wk = payoutAvailableWeeks.find(w => w.id === payoutFilterWeek);
                                return `${wk?.label || "Week"}, ${new Date(payoutFilterMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                              } else if (payoutFilterMode === "byDate") {
                                return new Date(payoutFilterDate).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                              }
                              return "All Time Records";
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Table */}
                      {payoutTableLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "80px", background: "#fff", borderRadius: "20px" }}><Loader /></div>
                      ) : (
                        (() => {
                          const filteredData = getFilteredPayoutTableData();

                          // Compute week/month start for carry-forward detection
                          let rollingDebtWeekStart = null;
                          if (payoutFilterMode === "weekly" && payoutFilterWeek) {
                            const cfWeekNum = parseInt(payoutFilterWeek.replace("week_", ""), 10);
                            const [cfY, cfM] = payoutFilterMonth.split("-").map(Number);
                            const cfFirstDate = new Date(cfY, cfM - 1, 1);
                            const cfFirstSun = new Date(cfFirstDate);
                            cfFirstSun.setDate(cfFirstSun.getDate() - cfFirstSun.getDay());
                            const cfWStart = new Date(cfFirstSun);
                            cfWStart.setDate(cfWStart.getDate() + (cfWeekNum - 1) * 7);
                            rollingDebtWeekStart = formatDateLocal(cfWStart);
                          } else if (payoutFilterMode === "monthly") {
                            const [mY, mM] = payoutFilterMonth.split("-").map(Number);
                            rollingDebtWeekStart = formatDateLocal(new Date(mY, mM - 1, 1));
                          }

                          // Group by staff for display
                          const groupedDataMap = filteredData.reduce((acc, item) => {
                            const key = item.staff_email?.trim()?.toLowerCase() || item.staff_name_display || "unknown";
                            if (!acc[key]) {
                              acc[key] = {
                                ...item,
                                service_count: 0,
                                total_amount: 0,
                                pending_amount: 0,
                                paid_amount: 0,
                                carry_forward_amount: 0,
                                current_amount: 0,
                                all_ids: [],
                                pending_ids: [],
                                service_rows: []
                              };
                            }
                            acc[key].service_count += 1;
                            const amt = parseFloat(item.amount || 0);
                            acc[key].total_amount += amt;

                            const isPaidItem = item.payment_status === "paid";
                            if (isPaidItem) {
                              acc[key].paid_amount += amt;
                            } else {
                              acc[key].pending_amount += amt;
                              acc[key].pending_ids.push(item.id);

                              // Track carry-forward vs current pending amounts
                              const recordDate = formatDateLocal(item.earned_at);
                              if (rollingDebtWeekStart && recordDate && recordDate < rollingDebtWeekStart) {
                                acc[key].carry_forward_amount += amt;
                              } else {
                                acc[key].current_amount += amt;
                              }
                            }

                            acc[key].all_ids.push(item.id);
                            acc[key].service_rows.push(item);
                            return acc;
                          }, {});
                          const displayData = Object.values(groupedDataMap);

                          const pendingFilteredData = filteredData.filter(e => e.payment_status !== "paid");
                          const allSelected = pendingFilteredData.length > 0 && pendingFilteredData.every(e => payoutSelectedRows.has(e.id));

                          return (
                            <>
                              <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                                <div style={{ padding: "18px 25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#475569" }}>
                                    All Staff Earnings
                                    <span style={{ marginLeft: "12px", fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>
                                      {filteredData.length} records • {payoutFilterMode === "all" ? "All Time" : payoutFilterMode === "weekly" ? "This Week" : payoutFilterMode === "monthly" ? payoutFilterMonth : payoutFilterDate}
                                    </span>
                                  </h3>
                                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginRight: "10px", background: "#f1f5f9", padding: "4px 12px", borderRadius: "10px" }}>
                                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
                                        <input
                                          type="checkbox"
                                          checked={payoutStatusFilter.includes("pending")}
                                          onChange={() => handleToggleStatusFilter("pending")}
                                          style={{ cursor: "pointer", accentColor: "#f97316" }}
                                        />
                                        Pending
                                      </label>
                                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
                                        <input
                                          type="checkbox"
                                          checked={payoutStatusFilter.includes("paid")}
                                          onChange={() => handleToggleStatusFilter("paid")}
                                          style={{ cursor: "pointer", accentColor: "#22c55e" }}
                                        />
                                        Paid
                                      </label>
                                    </div>
                                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                                      Total: ₹{Math.max(0, displayData.reduce((s, item) => { const cancelFee = staffCancellationsMap[item.staff_email?.trim()?.toLowerCase()] || 0; return s + Math.max(0, item.total_amount - cancelFee); }, 0)).toLocaleString()}
                                    </span>
                                    <div style={{ display: "flex", gap: "8px", borderLeft: "1px solid #e2e8f0", paddingLeft: "15px" }}>
                                      <button
                                        onClick={handleExportAllPayoutsCSV}
                                        title="Export to Excel"
                                        style={{ background: "#fff", color: "#3b82f6", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
                                      >
                                        <span style={{ fontSize: "13px" }}>📄</span> Export
                                      </button>
                                      <button
                                        onClick={() => payoutImportRef.current?.click()}
                                        disabled={payoutProcessing}
                                        title="Sync from Excel"
                                        style={{ background: "#fff", color: "#10b981", border: "1px solid #10b981", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: payoutProcessing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: payoutProcessing ? 0.7 : 1, transition: "all 0.2s" }}
                                      >
                                        <span style={{ fontSize: "13px" }}>📥</span> {payoutProcessing ? "..." : "Sync"}
                                      </button>
                                      <button
                                        onClick={() => fetchAllStaffEarningsTable()}
                                        title="Refresh"
                                        style={{ background: "#f0f9ff", color: "#0ea5e9", border: "1px solid #0ea5e9", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
                                      >
                                        <span style={{ fontSize: "13px" }}>🔄</span>
                                      </button>
                                      <input type="file" ref={payoutImportRef} onChange={handleImportPayoutsExcel} accept=".xlsx, .xls" style={{ display: "none" }} />
                                    </div>
                                  </div>
                                </div>
                                <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead>
                                      <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#fff" }}>
                                        <th style={{ padding: "14px 20px", width: "40px" }}>
                                          <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPayoutSelectedRows(new Set(pendingFilteredData.map(r => r.id)));
                                              } else {
                                                setPayoutSelectedRows(new Set());
                                              }
                                            }}
                                            style={{ width: "17px", height: "17px", cursor: "pointer", accentColor: "#3b82f6" }}
                                          />
                                        </th>
                                        <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>STAFF</th>
                                        <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>SERVICES COMPLETED</th>
                                        <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>TOTAL AMOUNT</th>
                                        <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>STATUS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {displayData.length > 0 ? (
                                        displayData.map((item, idx) => {
                                          const isSelected = item.pending_ids.length > 0 && item.pending_ids.every(id => payoutSelectedRows.has(id));
                                          const isPaid = item.pending_ids.length === 0;

                                          return (
                                            <tr
                                              key={item.staff_email || idx}
                                              style={{
                                                borderBottom: "1px solid #f1f5f9",
                                                background: isSelected ? "#eff6ff" : (idx % 2 === 0 ? "#fff" : "#fafbfc"),
                                                transition: "background 0.15s"
                                              }}
                                            >
                                              <td style={{ padding: "14px 20px" }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  disabled={isPaid}
                                                  onChange={(e) => {
                                                    const next = new Set(payoutSelectedRows);
                                                    if (e.target.checked) {
                                                      item.pending_ids.forEach(id => next.add(id));
                                                    } else {
                                                      item.pending_ids.forEach(id => next.delete(id));
                                                    }
                                                    setPayoutSelectedRows(next);
                                                  }}
                                                  style={{
                                                    width: "17px",
                                                    height: "17px",
                                                    cursor: isPaid ? "not-allowed" : "pointer",
                                                    accentColor: "#3b82f6",
                                                    opacity: isPaid ? 0.5 : 1
                                                  }}
                                                />
                                              </td>
                                              <td style={{ padding: "14px 20px" }}>
                                                <span
                                                  onClick={() => {
                                                    const staffObj = payoutStaffList.find(s => s.email?.trim()?.toLowerCase() === item.staff_email?.trim()?.toLowerCase());
                                                    if (staffObj) fetchPartnerPayments(staffObj);
                                                  }}
                                                  style={{ fontWeight: 700, color: "#3b82f6", cursor: "pointer", fontSize: "14px" }}
                                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                                                >
                                                  {item.staff_name_display}
                                                </span>
                                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.staff_email}</div>
                                              </td>
                                              <td style={{ padding: "14px 20px", fontWeight: 700, color: "#1e293b", fontSize: "14px", textAlign: "center" }}>
                                                <span
                                                  onClick={() => setStaffServicesModalData({ staffName: item.staff_name_display, staffEmail: item.staff_email, services: item.service_rows, rollingDebtWeekStart })}
                                                  style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "10px", cursor: "pointer", display: "inline-block", transition: "all 0.15s" }}
                                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e7ff"; e.currentTarget.style.color = "#4338ca"; }}
                                                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#1e293b"; }}
                                                  title="Click to view individual services"
                                                >
                                                  {item.service_count} Services
                                                </span>
                                              </td>
                                              <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                                {(() => {
                                                  const isPaidStaff = item.pending_ids.length === 0;
                                                  const cancelFee = staffCancellationsMap[item.staff_email?.trim()?.toLowerCase()] || 0;
                                                  const baseAmt = isPaidStaff ? item.total_amount : item.pending_amount;
                                                  const netTotal = Math.max(0, baseAmt - cancelFee);

                                                  return (
                                                    <>
                                                      <span style={{ fontWeight: 700, color: isPaidStaff ? "#64748b" : "#10b981", fontSize: "15px" }}>₹{netTotal.toLocaleString()}</span>
                                                      {baseAmt > 0 && (
                                                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px", fontWeight: 600 }}>
                                                          {isPaidStaff ? (
                                                            `Prev: ₹0 + Current: ₹${item.total_amount.toLocaleString()}`
                                                          ) : (
                                                            `Prev: ₹${item.carry_forward_amount.toLocaleString()} + Current: ₹${item.current_amount.toLocaleString()}`
                                                          )}
                                                          {cancelFee > 0 && (
                                                            <span style={{ color: "#ef4444", marginLeft: "4px" }}>
                                                              - Cancellation: ₹{cancelFee.toLocaleString()}
                                                            </span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </>
                                                  );
                                                })()}
                                              </td>
                                              <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                                <span style={{
                                                  padding: "4px 12px",
                                                  borderRadius: "20px",
                                                  fontSize: "11px",
                                                  fontWeight: 700,
                                                  background: isPaid ? "#dcfce7" : "#fff7ed",
                                                  color: isPaid ? "#166534" : "#9a3412"
                                                }}>
                                                  {isPaid ? "PAID" : "PENDING"}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: "15px" }}>No earnings found for the selected filter.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>


                            </>
                          );
                        })()
                      )}
                    </div>
                  </>
                ) : payoutLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader /></div>
                ) : (
                  /* DETAIL VIEW: Staff Breakdown */
                  <div style={{ animation: "fadeIn 0.3s ease-in" }}>
                    {/* --- DETAILED EARNINGS TABLE --- (Primary View) */}
                    <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                      <div style={{ padding: "20px 25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#475569" }}>
                          Detailed Earnings Log
                          <span style={{ marginLeft: "12px", fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>{payoutBreakdown.length} Records Found</span>
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                          <button
                            onClick={handleExportPayoutCSV}
                            style={{
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#3b82f6", // Blue text for action
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            📄 Export CSV
                          </button>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", cursor: "pointer", fontWeight: 500 }}>
                            <input
                              type="checkbox"
                              checked={payoutShowHistory}
                              onChange={(e) => setPayoutShowHistory(e.target.checked)}
                              style={{ width: "16px", height: "16px", cursor: "pointer" }}
                            />
                            Show Paid History
                          </label>
                        </div>
                      </div>
                      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>BOOKING ID</th>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>SERVICE</th>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>EMAIL</th>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>PARTNER</th>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>AMOUNT</th>
                              <th style={{ padding: "15px 25px", fontSize: "14px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#fff", zIndex: 1, textAlign: "right" }}>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payoutBreakdown.length > 0 ? (
                              payoutBreakdown.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                                  <td style={{ padding: "15px 25px", color: "#64748b", fontSize: "14px" }}>#{item.booking_id?.slice(0, 15)}</td>
                                  <td style={{ padding: "15px 25px", fontWeight: 600, color: "#1e293b", fontSize: "15px" }}>{item.service_title}</td>
                                  <td style={{ padding: "15px 25px", color: "#64748b", fontSize: "14px" }}>{item.staff_email || item.email || selectedPayoutStaff.email || "N/A"}</td>
                                  <td style={{ padding: "15px 25px", color: "#1e293b", fontWeight: 500, fontSize: "15px" }}>{item.staff_name || selectedPayoutStaff.name}</td>
                                  <td style={{ padding: "15px 25px", fontWeight: 700, color: "#16a34a", fontSize: "16px" }}>₹{parseFloat(item.amount).toLocaleString()}</td>
                                  <td style={{ padding: "12px 25px", textAlign: "right" }}>
                                    <span style={{
                                      padding: "4px 10px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      background: item.payment_status === "paid" ? "#dcfce7" : "#fff7ed",
                                      color: item.payment_status === "paid" ? "#166534" : "#9a3412"
                                    }}>
                                      {(item.payment_status || "pending").toUpperCase()}
                                    </span>
                                  </td>

                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No detailed records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* --- NEW EARNINGS TABLES SECTION --- */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "30px" }}>

                      {/* Weekly Earnings Table */}
                      <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                        <div style={{ padding: "20px 25px", background: "#f0fdf4", borderBottom: "1px solid #dcfce7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#166534" }}>
                            Weekly Earnings Summary
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534", background: "#dcfce7", padding: "4px 10px", borderRadius: "8px", whiteSpace: "nowrap" }}>
                              {(() => {
                                try {
                                  const raw = selectedPayoutStaff.weekly_earnings_json || selectedPayoutStaff.weekly_earning_json || selectedPayoutStaff.weekly_earnings_j || {};
                                  const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  return Object.values(d).reduce((sum, weeks) => sum + Object.keys(weeks || {}).length, 0) + " Weeks";
                                } catch { return "0 Weeks"; }
                              })()}
                            </span>
                            <button
                              onClick={handleExportWeeklySummaryCSV}
                              title="Download Weekly Summary"
                              style={{
                                background: "#fff",
                                border: "1px solid #dcfce7",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#166534",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 5px rgba(22,101,52,0.08)",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#dcfce7";
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.transform = "none";
                              }}
                            >
                              <span style={{ fontSize: "16px" }}>📥</span>
                              <span>Export</span>
                            </button>
                          </div>
                        </div>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f0fdf4" }}>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#f0fdf4", zIndex: 1 }}>MONTH / WEEK</th>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textAlign: "right", position: "sticky", top: 0, background: "#f0fdf4", zIndex: 1 }}>AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Calculate Paid-Only data from records
                                const weeklyData = {};
                                payoutBreakdown.forEach(item => {
                                  if (item.payment_status === "paid" && item.earned_at) {
                                    const d = new Date(item.earned_at);
                                    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                                    const itemFirstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                                    const itemFirstSun = new Date(itemFirstOfMonth);
                                    itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
                                    const itemDiff = Math.floor((d - itemFirstSun) / (1000 * 60 * 60 * 24));
                                    const wKey = `week${Math.floor(itemDiff / 7) + 1}`;

                                    if (!weeklyData[mKey]) weeklyData[mKey] = {};
                                    weeklyData[mKey][wKey] = (weeklyData[mKey][wKey] || 0) + parseFloat(item.amount || 0);
                                  }
                                });

                                if (weeklyData && Object.keys(weeklyData).length > 0) {
                                  const now = new Date();
                                  const currentYear = now.getFullYear();
                                  const currentMonth = now.getMonth() + 1;

                                  // Accurate current week number based on Sunday-start calendar
                                  const tempFirst = new Date(currentYear, currentMonth - 1, 1);
                                  const tempSun = new Date(tempFirst);
                                  tempSun.setDate(tempSun.getDate() - tempSun.getDay());
                                  const diffDays = Math.floor((now - tempSun) / (1000 * 60 * 60 * 24));
                                  const currentWeek = Math.floor(diffDays / 7) + 1;

                                  return Object.entries(weeklyData)
                                    .sort((a, b) => a[0].localeCompare(b[0])) // Sort months ascending
                                    .flatMap(([monthKey, weeks]) => {
                                      if (!weeks || typeof weeks !== 'object') return [];
                                      const [rowYear, rowMonth] = monthKey.split("-").map(Number);

                                      return Object.entries(weeks)
                                        .sort((a, b) => a[0].localeCompare(b[0])) // Sort weeks ascending
                                        .filter(([weekKey]) => {
                                          const rowWeekNum = parseInt(weekKey.toLowerCase().replace(/[^0-9]/g, ""));
                                          // Timeline Check: Only show current and past weeks
                                          if (rowYear > currentYear) return false;
                                          if (rowYear === currentYear && rowMonth > currentMonth) return false;
                                          if (rowYear === currentYear && rowMonth === currentMonth && rowWeekNum > currentWeek) return false;
                                          return true;
                                        })
                                        .map(([weekKey, amount]) => (
                                          <tr key={`${monthKey}-${weekKey}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                                            <td style={{ padding: "12px 25px", color: "#1e293b", fontSize: "14px" }}>
                                              {(() => {
                                                const [year, month] = monthKey.split("-").map(Number);
                                                const weekNum = parseInt(weekKey.toLowerCase().replace(/[^0-9]/g, ""));

                                                // Standard logic to find the start/end dates of the week
                                                const firstOfMonth = new Date(year, month - 1, 1);
                                                const firstSun = new Date(firstOfMonth);
                                                firstSun.setDate(firstSun.getDate() - firstSun.getDay());

                                                const weekStart = new Date(firstSun);
                                                weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
                                                const weekEnd = new Date(weekStart);
                                                weekEnd.setDate(weekEnd.getDate() + 6);

                                                const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                                                const fmt = (d) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;

                                                return (
                                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 700, color: "#1e293b" }}>{monthName} {year} - WEEK{weekNum}</span>
                                                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{fmt(weekStart)} – {fmt(weekEnd)}</span>
                                                  </div>
                                                );
                                              })()}
                                            </td>
                                            <td style={{ padding: "12px 25px", textAlign: "right", fontWeight: 700, color: "#16a34a", fontSize: "15px" }}>
                                              ₹{(Number(amount) || 0).toLocaleString()}
                                            </td>
                                          </tr>
                                        ));
                                    });
                                } else {
                                  return <tr><td colSpan="2" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No weekly data found.</td></tr>;
                                }
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Monthly Earnings Table */}
                      <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                        <div style={{ padding: "20px 25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#475569" }}>
                            Monthly Earnings Summary
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569", background: "#e2e8f0", padding: "4px 10px", borderRadius: "8px", whiteSpace: "nowrap" }}>
                              {(() => {
                                try {
                                  const raw = selectedPayoutStaff.monthly_earnings_json || selectedPayoutStaff.monthly_earning_json || selectedPayoutStaff.monthly_earnings_j || selectedPayoutStaff.monthly_e || {};
                                  const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  return Object.keys(d).length + " Months";
                                } catch { return "0 Months"; }
                              })()}
                            </span>
                            <button
                              onClick={handleExportMonthlySummaryCSV}
                              title="Download Monthly Summary"
                              style={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#475569",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 5px rgba(71,85,105,0.08)",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e2e8f0";
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.transform = "none";
                              }}
                            >
                              <span style={{ fontSize: "16px" }}>📥</span>
                              <span>Export</span>
                            </button>
                          </div>
                        </div>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>MONTH</th>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textAlign: "right", position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Calculate Paid-Only data from records
                                const monthlyData = {};
                                payoutBreakdown.forEach(item => {
                                  if (item.payment_status === "paid" && item.earned_at) {
                                    const d = new Date(item.earned_at);
                                    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    monthlyData[mKey] = (monthlyData[mKey] || 0) + parseFloat(item.amount || 0);
                                  }
                                });

                                if (monthlyData && Object.keys(monthlyData).length > 0) {
                                  const now = new Date();
                                  const currentYear = now.getFullYear();
                                  const currentMonth = now.getMonth() + 1;

                                  return Object.entries(monthlyData)
                                    .filter(([monthKey]) => {
                                      const [rowYear, rowMonth] = monthKey.split("-").map(Number);
                                      // Timeline Check: Only show current and past months
                                      if (rowYear > currentYear) return false;
                                      if (rowYear === currentYear && rowMonth > currentMonth) return false;
                                      return true;
                                    })
                                    .sort((a, b) => b[0].localeCompare(a[0]))
                                    .map(([monthKey, amount]) => (
                                      <tr key={monthKey} style={{ borderBottom: "1px solid #f8fafc" }}>
                                        <td style={{ padding: "12px 25px", color: "#1e293b", fontSize: "14px", fontWeight: 600 }}>
                                          {(() => {
                                            const [year, month] = String(monthKey).split("-");
                                            if (!year || !month) return monthKey;
                                            const d = new Date(year, month - 1);
                                            return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
                                          })()}
                                        </td>
                                        <td style={{ padding: "12px 25px", textAlign: "right", fontWeight: 700, color: "#3b82f6", fontSize: "15px" }}>
                                          ₹{(Number(amount) || 0).toLocaleString()}
                                        </td>
                                      </tr>
                                    ));
                                } else {
                                  return <tr><td colSpan="2" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No monthly data found.</td></tr>;
                                }
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Total Earnings History Table */}
                      <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                        <div style={{ padding: "20px 25px", background: "#f0f9ff", borderBottom: "1px solid #e0f2fe" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0369a1", display: "flex", alignItems: "center", gap: "10px" }}>
                            Total Earnings History (By Date)
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", background: "#e0f2fe", padding: "2px 8px", borderRadius: "8px" }}>
                              {(() => {
                                try {
                                  const raw = selectedPayoutStaff.total_earnings_json || selectedPayoutStaff.total_earning_json || {};
                                  const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  return Object.keys(d).length + " Days";
                                } catch { return "0 Days"; }
                              })()}
                            </span>
                          </h3>
                        </div>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f0f9ff" }}>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, position: "sticky", top: 0, background: "#f0f9ff", zIndex: 1 }}>DATE</th>
                                <th style={{ padding: "12px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textAlign: "right", position: "sticky", top: 0, background: "#f0f9ff", zIndex: 1 }}>AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Calculate Paid-Only data from records
                                const totalData = {};
                                payoutBreakdown.forEach(item => {
                                  if (item.payment_status === "paid" && item.earned_at) {
                                    const d = formatDateLocal(item.earned_at);
                                    if (d && d !== "Invalid Date") {
                                      totalData[d] = (totalData[d] || 0) + parseFloat(item.amount || 0);
                                    }
                                  }
                                });

                                if (totalData && Object.keys(totalData).length > 0) {
                                  const todayKey = (() => {
                                    const t = new Date();
                                    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                                  })();
                                  return Object.entries(totalData)
                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                    .map(([dateKey, amount]) => {
                                      const isToday = dateKey === todayKey;
                                      return (
                                        <tr key={dateKey} style={{
                                          borderBottom: "1px solid #f8fafc",
                                          background: isToday ? "#eff6ff" : "transparent",
                                          transition: "background 0.2s"
                                        }}>
                                          <td style={{ padding: "12px 25px", color: isToday ? "#1d4ed8" : "#1e293b", fontSize: "14px", fontWeight: isToday ? 700 : 600 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                              {(() => {
                                                const d = new Date(dateKey);
                                                if (isNaN(d.getTime())) return dateKey;
                                                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                                              })()}
                                              {isToday && (
                                                <span style={{
                                                  fontSize: "10px",
                                                  fontWeight: 700,
                                                  background: "#3b82f6",
                                                  color: "#fff",
                                                  padding: "2px 7px",
                                                  borderRadius: "6px"
                                                }}>Today</span>
                                              )}
                                            </div>
                                          </td>
                                          <td style={{ padding: "12px 25px", textAlign: "right", fontWeight: 700, color: isToday ? "#1d4ed8" : "#0ea5e9", fontSize: "15px" }}>
                                            ₹{parseFloat(amount || 0).toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    });
                                } else {
                                  return <tr><td colSpan="2" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No daily history found.</td></tr>;
                                }
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* ================= RECENT PAYOUT ACTIVITY LOG ================= */}
                <div style={{ marginTop: "50px", animation: "fadeIn 0.5s ease-out" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "20px",
                    padding: "0 10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px"
                      }}>🕒</div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>Recent Payout Activity</h3>
                        <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Live history of processed payments</p>
                      </div>
                    </div>

                    {/* FILTERS */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Filter:</span>
                        <input
                          type="date"
                          value={recentPayoutFilterDate}
                          onChange={(e) => setRecentPayoutFilterDate(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            fontSize: "13px",
                            color: "#1e293b",
                            background: "#f8fafc",
                            outline: "none",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                            cursor: "pointer"
                          }}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                        />
                      </div>

                      <div style={{ position: "relative" }} ref={recentTimeDropdownRef}>
                        <div
                          onClick={() => setShowRecentTimeDropdown(!showRecentTimeDropdown)}
                          style={{
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            fontSize: "13px",
                            color: recentPayoutFilterTime ? "#1e293b" : "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            height: "35px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                            minWidth: "110px",
                            justifyContent: "space-between",
                            fontWeight: 600
                          }}
                        >
                          <span>{recentPayoutFilterTime || "Time"}</span>
                          <span style={{ fontSize: "14px", opacity: 0.6 }}>🕒</span>
                        </div>

                        {showRecentTimeDropdown && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
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
                                  if (!recentPayoutFilterTime) return "";
                                  const match = recentPayoutFilterTime.match(/^(\d{1,2}):/);
                                  if (!match) return "";
                                  let h = parseInt(match[1]);
                                  const merid = recentPayoutFilterTime.split(" ")[1];
                                  if (merid === "pm" && h !== 12) h += 12;
                                  if (merid === "am" && h === 12) h = 0;
                                  return h;
                                })()}
                                onChange={(e) => {
                                  const h = parseInt(e.target.value);
                                  const m = recentPayoutFilterTime ? recentPayoutFilterTime.split(":")[1].split(" ")[0] : "00";
                                  const meridian = h >= 12 ? "pm" : "am";
                                  const h12 = h % 12 || 12;
                                  setRecentPayoutFilterTime(`${h12}:${m} ${meridian}`);
                                }}
                                style={{ border: "1px solid #f1f5f9", borderRadius: "8px", padding: "4px", outline: "none", background: "#f8fafc", width: "50px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
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
                                value={recentPayoutFilterTime ? recentPayoutFilterTime.split(":")[1].split(" ")[0] : ""}
                                onChange={(e) => {
                                  const m = e.target.value;
                                  let hStr = "12";
                                  let merid = "am";
                                  if (recentPayoutFilterTime) {
                                    hStr = recentPayoutFilterTime.split(":")[0];
                                    merid = recentPayoutFilterTime.split(" ")[1];
                                  }
                                  setRecentPayoutFilterTime(`${hStr}:${m} ${merid}`);
                                }}
                                style={{ border: "1px solid #f1f5f9", borderRadius: "8px", padding: "4px", outline: "none", background: "#f8fafc", width: "50px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                              >
                                {Array.from({ length: 60 }).map((_, i) => (
                                  <option key={i} value={String(i).padStart(2, '0')} style={{ padding: "4px", textAlign: "center" }}>{String(i).padStart(2, '0')}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {(recentPayoutFilterDate || recentPayoutFilterTime) && (
                        <button
                          onClick={() => { setRecentPayoutFilterDate(""); setRecentPayoutFilterTime(""); }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "10px",
                            border: "none",
                            background: "#fee2e2",
                            color: "#ef4444",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fee2e2"}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{
                    background: "#fff",
                    borderRadius: "24px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                    border: "1px solid #f1f5f9",
                    overflow: "hidden"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "15px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Staff Member</th>
                          <th style={{ padding: "15px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Amount Paid</th>
                          <th style={{ padding: "15px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Status</th>
                          <th style={{ padding: "15px 25px", fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Payout Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const displayPayouts = selectedPayoutStaff
                            ? recentPayouts.filter(r => r.staff_email?.trim()?.toLowerCase() === selectedPayoutStaff.email?.trim()?.toLowerCase())
                            : recentPayouts;
                          return displayPayouts.length > 0 ? (
                            displayPayouts.map((log, idx) => (
                              <tr key={idx} style={{
                                borderBottom: idx === recentPayouts.length - 1 ? "none" : "1px solid #f1f5f9",
                                background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                                transition: "background 0.2s"
                              }}>
                                <td style={{ padding: "15px 25px" }}>
                                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>{log.staff_name || "Partner"}</div>
                                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{log.staff_email}</div>
                                </td>
                                <td style={{ padding: "15px 25px" }}>
                                  <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontWeight: 800,
                                    color: "#10b981",
                                    fontSize: "15px"
                                  }}>
                                    ₹{parseFloat(log.amount || 0).toLocaleString()}
                                  </div>
                                </td>
                                <td style={{ padding: "15px 25px" }}>
                                  <span style={{
                                    padding: "4px 10px",
                                    background: "#dcfce7",
                                    color: "#166534",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}>
                                    ✓ COMPLETED
                                  </span>
                                </td>
                                <td style={{ padding: "15px 25px", textAlign: "right", color: "#64748b", fontSize: "13px" }}>
                                  {log.paid_at ? (() => {
                                    const d = new Date(log.paid_at);
                                    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                                    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    return `${dateStr} ${timeStr}`;
                                  })() : "Recent"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                                No payout activity recorded yet.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "staff-referrals" && (
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b", margin: 0 }}>Staff Referrals</h2>
                <button
                  onClick={fetchStaffReferrals}
                  disabled={loadingReferrals}
                  style={{
                    background: "#fff",
                    border: "1px solid #000",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: loadingReferrals ? "not-allowed" : "pointer",
                    fontSize: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    transition: "all 0.2s",
                    marginRight: "20px"
                  }}
                  title="Refresh List"
                >
                  {loadingReferrals ? "⌛" : "🔄"}
                </button>
              </div>

              <div className="booking-table-wrapper" style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Phone Number</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Referral Code</th>
                      <th>Referred Name</th>
                      <th style={{ textAlign: "center" }}>Completed Bookings</th>
                      <th>Status</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReferrals ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", padding: "50px" }}>
                          <Loader />
                        </td>
                      </tr>
                    ) : staffReferrals.length > 0 ? (
                      staffReferrals.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: "600", color: "#1e293b" }}>{item.full_name}</td>
                          <td>{item.phone_number}</td>
                          <td>{item.email}</td>
                          <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.address}
                          </td>
                          <td style={{ fontWeight: "700", color: "#4f46e5" }}>{item.referral_code || "N/A"}</td>
                          <td style={{ fontWeight: "600", color: "#1e293b" }}>{item.referred_name || "N/A"}</td>
                          <td style={{ fontWeight: "600", color: "#475569", textAlign: "center" }}>{item.completed_booking !== null && item.completed_booking !== undefined ? item.completed_booking : 0}</td>
                          <td>
                            <span style={{
                              padding: "6px 14px",
                              borderRadius: "20px",
                              fontSize: "14px",
                              fontWeight: "700",
                              background: item.status === "approved" ? "#ecfdf5" : item.status === "rejected" ? "#fee2e2" : "#f1f5f9",
                              color: item.status === "approved" ? "#10b981" : item.status === "rejected" ? "#ef4444" : "#64748b",
                              textTransform: "capitalize"
                            }}>
                              {item.status || "Pending"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                              <button
                                onClick={() => handleUpdateReferralStatus(item.id, "approved")}
                                disabled={item.status === "approved"}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  border: "none",
                                  background: "#10b981",
                                  color: "#fff",
                                  fontWeight: "700",
                                  fontSize: "14px",
                                  cursor: item.status === "approved" ? "not-allowed" : "pointer",
                                  opacity: item.status === "approved" ? 0.6 : 1
                                }}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateReferralStatus(item.id, "rejected")}
                                disabled={item.status === "rejected"}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  border: "none",
                                  background: "#ef4444",
                                  color: "#fff",
                                  fontWeight: "700",
                                  fontSize: "14px",
                                  cursor: item.status === "rejected" ? "not-allowed" : "pointer",
                                  opacity: item.status === "rejected" ? 0.6 : 1
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                          No referral forms found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ===== REFERRAL MILESTONES & BONUS PANEL ===== */}
              <div style={{ marginTop: "40px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
                    Referral Milestones & Bonuses
                  </h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleExportReferralPayoutsExcel}
                      title="Export Referral Payouts to Excel"
                      style={{ background: "#fff", color: "#3b82f6", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
                    >
                      <span style={{ fontSize: "13px" }}>📄</span> Export
                    </button>
                    <button
                      onClick={() => referralImportRef.current?.click()}
                      disabled={referralProcessing}
                      title="Sync Referral Payouts from Excel"
                      style={{ background: "#fff", color: "#10b981", border: "1px solid #10b981", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: referralProcessing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: referralProcessing ? 0.7 : 1, transition: "all 0.2s" }}
                    >
                      <span style={{ fontSize: "13px" }}>📥</span> {referralProcessing ? "..." : "Sync"}
                    </button>
                    <input type="file" ref={referralImportRef} onChange={handleImportReferralsExcel} accept=".xlsx, .xls" style={{ display: "none" }} />
                  </div>
                </div>

                {(() => {
                  // Group only approved/onboarded referrals by their referrer
                  const grouped = {};
                  staffReferrals.forEach(item => {
                    if (item.status === 'approved') {
                      const referrer = item.referred_name || "Unknown Referrer";
                      if (!grouped[referrer]) {
                        grouped[referrer] = [];
                      }
                      grouped[referrer].push(item);
                    }
                  });

                  const referrers = Object.keys(grouped).sort((a, b) => {
                    const minA = Math.min(...grouped[a].map(item => new Date(item.created_at).getTime()));
                    const minB = Math.min(...grouped[b].map(item => new Date(item.created_at).getTime()));
                    return minA - minB;
                  });

                  if (referrers.length === 0) {
                    return (
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "12px", color: "#64748b", textAlign: "center", border: "1px solid #e2e8f0" }}>
                        No approved/onboarded referrals found to track milestones.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", width: "100%", alignItems: "flex-start" }}>
                      {referrers.map((referrerName) => {
                        const referralsList = grouped[referrerName];
                        const isExpanded = !!expandedReferrers[referrerName];
                        const totalReferralsCount = referralsList.length;

                        return (
                          <div
                            key={referrerName}
                            style={{
                              flex: "1 1 580px",
                              maxWidth: "720px",
                              minWidth: "450px",
                              background: "#fff",
                              borderRadius: "12px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                              border: "1px solid #e2e8f0",
                              overflow: "hidden"
                            }}
                          >
                            {/* Header Row */}
                            <div
                              onClick={() => toggleReferrer(referrerName)}
                              style={{
                                padding: "16px 20px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                background: isExpanded ? "#f8fafc" : "#fff",
                                transition: "background 0.2s"
                              }}
                            >
                              {/* Column 1: Staff Name (Left) */}
                              <div style={{ flex: "1", display: "flex", alignItems: "center" }}>
                                <span style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b" }}>
                                  👤 {referrerName}
                                </span>
                              </div>

                              {/* Column 2: Referral Code (Middle) */}
                              <div style={{ flex: "1", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <span style={{
                                  fontSize: "11px",
                                  background: "#e0e7ff",
                                  color: "#4338ca",
                                  padding: "3px 9px",
                                  borderRadius: "4px",
                                  fontWeight: "700",
                                  letterSpacing: "0.5px"
                                }}>
                                  CODE: {referralsList[0]?.referral_code || "N/A"}
                                </span>
                              </div>

                              {/* Column 3: Onboarded & Chevron (Right) */}
                              <div style={{ flex: "1", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                                  Onboarded: <strong style={{ color: "#4f46e5" }}>{totalReferralsCount}</strong>
                                </span>
                                <svg style={{ width: "18px", height: "18px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fill: "#64748b" }} viewBox="0 0 20 20">
                                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                              </div>
                            </div>

                            {/* Collapsible Content */}
                            {isExpanded && (
                              <div style={{ borderTop: "1px solid #e2e8f0", background: "#fff" }}>
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead>
                                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                        <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          Referred Member
                                        </th>
                                        <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          Milestone Progress (30 Bookings)
                                        </th>
                                        <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>
                                          Status & Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {referralsList.map((item, idx) => {
                                        const count = item.completed_booking !== null && item.completed_booking !== undefined ? item.completed_booking : 0;
                                        const isEligible = count >= 30;

                                        return (
                                          <tr
                                            key={item.id}
                                            style={{
                                              borderBottom: idx === referralsList.length - 1 ? "none" : "1px solid #f1f5f9",
                                              background: idx % 2 === 1 ? "#fafafa" : "#fff",
                                              transition: "background 0.2s"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                                            onMouseOut={(e) => e.currentTarget.style.background = idx % 2 === 1 ? "#fafafa" : "#fff"}
                                          >
                                            {/* Column 1: Candidate Bio */}
                                            <td style={{ padding: "14px 20px" }}>
                                              <div style={{ display: "flex", alignItems: "center" }}>
                                                <span style={{ fontWeight: "800", color: "#1e293b", fontSize: "16px" }}>
                                                  {item.full_name}
                                                </span>
                                              </div>
                                              <div style={{ fontSize: "13.5px", color: "#475569", marginTop: "5px" }}>
                                                ✉ {item.email}
                                              </div>
                                              {item.phone_number && (
                                                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>
                                                  📞 {item.phone_number}
                                                </div>
                                              )}
                                            </td>

                                            {/* Column 2: Milestone Progress Bar & Text */}
                                            <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "340px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", fontWeight: "700", color: "#334155" }}>
                                                  <span>{count} Bookings</span>
                                                  <span>Target: 30</span>
                                                </div>
                                                <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                                                  <div style={{
                                                    width: `${Math.min((count / 30) * 100, 100)}%`,
                                                    height: "100%",
                                                    background: item.bonus_status === "paid"
                                                      ? "linear-gradient(90deg, #10b981, #34d399)"
                                                      : item.bonus_status === "initiated"
                                                        ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
                                                        : isEligible
                                                          ? "linear-gradient(90deg, #10b981, #34d399)"
                                                          : "linear-gradient(90deg, #f97316, #fb923c)",
                                                    transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                                                    borderRadius: "6px"
                                                  }}></div>
                                                </div>
                                              </div>
                                            </td>

                                            {/* Column 3: Status / Action Button */}
                                            <td style={{ padding: "14px 20px", textAlign: "right", verticalAlign: "middle" }}>
                                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>

                                                {/* Status Badge (Top: Interactive Button or Static Capsule) */}
                                                {!isEligible ? (
                                                  /* Case 1: Under 30 bookings -> Static Pending */
                                                  <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    fontSize: "13px",
                                                    fontWeight: "700",
                                                    color: "#d97706",
                                                    background: "#fffbeb",
                                                    padding: "4px 12px",
                                                    borderRadius: "30px",
                                                    border: "1px solid #fde68a",
                                                    whiteSpace: "nowrap"
                                                  }}>
                                                    <span style={{
                                                      width: "5.5px",
                                                      height: "5.5px",
                                                      borderRadius: "50%",
                                                      background: "#f59e0b",
                                                      display: "inline-block",
                                                      boxShadow: "0 0 5px #f59e0b"
                                                    }}></span>
                                                    Pending
                                                  </span>
                                                ) : item.bonus_status === "paid" ? (
                                                  /* Case 2: Paid -> Static Paid badge */
                                                  <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    fontSize: "13px",
                                                    fontWeight: "700",
                                                    color: "#059669",
                                                    background: "#ecfdf5",
                                                    padding: "4px 12px",
                                                    borderRadius: "30px",
                                                    border: "1px solid #a7f3d0",
                                                    whiteSpace: "nowrap"
                                                  }}>
                                                    <span style={{
                                                      width: "5.5px",
                                                      height: "5.5px",
                                                      borderRadius: "50%",
                                                      background: "#10b981",
                                                      display: "inline-block",
                                                      boxShadow: "0 0 5px #10b981"
                                                    }}></span>
                                                    Paid
                                                  </span>
                                                ) : item.bonus_status === "initiated" ? (
                                                  /* Case 3: Initiated -> Clickable blue button to complete payment */
                                                  <button
                                                    onClick={() => triggerConfirm(
                                                      "Did you complete the payment? If you have completed the payment then click Yes.",
                                                      () => handleCompletePayment(item.id),
                                                      "Complete Payment"
                                                    )}
                                                    style={{
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "6px",
                                                      fontSize: "13px",
                                                      fontWeight: "700",
                                                      color: "#fff",
                                                      background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                                      padding: "6px 14px",
                                                      borderRadius: "30px",
                                                      border: "none",
                                                      cursor: "pointer",
                                                      whiteSpace: "nowrap",
                                                      boxShadow: "0 2px 4px rgba(59, 130, 246, 0.15)",
                                                      transition: "all 0.2s"
                                                    }}
                                                    onMouseOver={(e) => {
                                                      e.currentTarget.style.transform = "translateY(-1px)";
                                                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.25)";
                                                    }}
                                                    onMouseOut={(e) => {
                                                      e.currentTarget.style.transform = "translateY(0)";
                                                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(59, 130, 246, 0.15)";
                                                    }}
                                                  >
                                                    <span style={{
                                                      width: "5.5px",
                                                      height: "5.5px",
                                                      borderRadius: "50%",
                                                      background: "#fff",
                                                      display: "inline-block",
                                                      boxShadow: "0 0 5px #fff"
                                                    }}></span>
                                                    Initiated
                                                  </button>
                                                ) : (
                                                  /* Case 4: Met bookings but pending -> Clickable green button to initiate */
                                                  <button
                                                    onClick={() => triggerConfirm(
                                                      `Are you sure you want to initiate the referral bonus for ${referrerName} for referring ${item.full_name}?`,
                                                      () => handleInitiateBonus(item.id),
                                                      "Initiate Bonus"
                                                    )}
                                                    style={{
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "6px",
                                                      fontSize: "13px",
                                                      fontWeight: "700",
                                                      color: "#fff",
                                                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                      padding: "6px 14px",
                                                      borderRadius: "30px",
                                                      border: "none",
                                                      cursor: "pointer",
                                                      whiteSpace: "nowrap",
                                                      boxShadow: "0 2px 4px rgba(16, 185, 129, 0.15)",
                                                      transition: "all 0.2s"
                                                    }}
                                                    onMouseOver={(e) => {
                                                      e.currentTarget.style.transform = "translateY(-1px)";
                                                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
                                                    }}
                                                    onMouseOut={(e) => {
                                                      e.currentTarget.style.transform = "translateY(0)";
                                                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.15)";
                                                    }}
                                                  >
                                                    <span style={{
                                                      width: "5.5px",
                                                      height: "5.5px",
                                                      borderRadius: "50%",
                                                      background: "#fff",
                                                      display: "inline-block",
                                                      boxShadow: "0 0 5px #fff"
                                                    }}></span>
                                                    Initiate Bonus
                                                  </button>
                                                )}

                                                {/* Action Info Statement (Bottom: Empty under 30, Completed text when Met) */}
                                                {isEligible && (
                                                  <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    fontSize: "12px",
                                                    fontWeight: "700",
                                                    color: "#059669",
                                                    background: "#ecfdf5",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid #a7f3d0",
                                                    whiteSpace: "nowrap"
                                                  }}>
                                                    30 bookings was completed
                                                  </span>
                                                )}

                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === "category-hub-counts" && <CategoryHubCounts />}
        </>
      )}

      {/* ===== ADD STAFF MODAL ===== */}
      {showAddStaff && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span
              className="modal-close"
              onClick={() => setShowAddStaff(false)}
            >
              ✕
            </span>

            {staffExistsMsg && (
              <p
                style={{
                  color: "green",
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: "10px",
                }}
              >
                {staffExistsMsg}
              </p>
            )}

            {staffLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "200px",
                }}
              >
                <Loader />
              </div>
            ) : (
              <>
                <h3 className="modal-title">Add New Staff</h3>

                <input
                  className="auth-input"
                  placeholder="Name"
                  value={staffForm.name}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, name: e.target.value })
                  }
                />

                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: "700",
                      color: "#64748b",
                      fontSize: "14px",
                      pointerEvents: "none",
                    }}
                  >
                    +91
                  </span>
                  <input
                    className="auth-input"
                    placeholder="10 Digit Mobile Number"
                    style={{ margin: 0, paddingLeft: "45px", width: "100%" }}
                    value={staffForm.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ""); // Only numbers
                      if (val.length <= 10) {
                        setStaffForm({ ...staffForm, phone: val });
                      }
                    }}
                  />
                </div>

                <input
                  className="auth-input"
                  placeholder="Email"
                  value={staffForm.email}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, email: e.target.value })
                  }
                />

                <div className="password-wrapper">
                  <input
                    className="auth-input"
                    type={showStaffPassword ? "text" : "password"}
                    placeholder="Password"
                    value={staffForm.password}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, password: e.target.value })
                    }
                  />

                  <button
                    type="button"
                    className="eye-button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                  >
                    {showStaffPassword ? (
                      /* Eye Open */
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        stroke="#555"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      /* Eye Closed */
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        stroke="#555"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="3" y1="3" x2="21" y2="21" />
                      </svg>
                    )}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="Account Holder Name"
                    value={staffForm.account_holder_name}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, account_holder_name: e.target.value })
                    }
                  />
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="Account Number"
                    value={staffForm.account_number}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, account_number: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="IFSC Code"
                    value={staffForm.ifsc_code}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, ifsc_code: e.target.value.toUpperCase() })
                    }
                  />
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="Bank Name"
                    value={staffForm.bank_name}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, bank_name: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="Aadhar Number"
                    value={staffForm.aadhar_number}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, aadhar_number: e.target.value })
                    }
                  />
                  <input
                    className="auth-input"
                    style={{ margin: 0 }}
                    placeholder="Tagged Partner"
                    value={staffForm.tagged_partner}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, tagged_partner: e.target.value })
                    }
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", marginLeft: "4px" }}>Referral Code</label>
                  <input
                    className="auth-input"
                    style={{ margin: 0, background: "#f8fafc", cursor: "not-allowed" }}
                    placeholder="Referral Code"
                    value={staffForm.referral_code}
                    readOnly
                  />
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="auth-input"
                    style={{ display: "flex", alignItems: "center", padding: "10px 12px" }}
                    onChange={(e) => setStaffImage(e.target.files[0])}
                  />
                  <p style={{ color: "red", fontSize: "14px", marginTop: "4px", marginBottom: 0, textAlign: "center" }}>
                    Image ratio must be 1:1
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "15px",
                  }}
                >
                  <button
                    className="auth-button"
                    onClick={handleAddStaff}
                    disabled={staffLoading}
                  >
                    Add Staff
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== GLOBAL ALERT MODAL ===== */}
      {alertConfig.show && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: "center" }}>
            <span
              className="modal-close"
              onClick={() => setAlertConfig({ ...alertConfig, show: false })}
            >
              ✕
            </span>
            <h3
              style={{
                color:
                  alertConfig.type === "error"
                    ? "#ef4444"
                    : alertConfig.type === "success"
                      ? "#10b981"
                      : "#1e293b",
                marginBottom: "10px",
              }}
            >
              {alertConfig.title}
            </h3>
            <p
              style={{
                color: "#64748b",
                marginBottom: "20px",
                fontSize: "15px",
              }}
            >
              {alertConfig.message}
            </p>
            <button
              className="auth-button"
              style={{
                width: "100%",
                background:
                  alertConfig.type === "error" ? "#ef4444" : "#facc15",
                color: alertConfig.type === "error" ? "#fff" : "#000",
                fontWeight: "700",
              }}
              onClick={() => setAlertConfig({ ...alertConfig, show: false })}
            >
              OK
            </button>
          </div>
        </div>
      )}


      {confirmConfig.show && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: "center" }}>
            <span
              className="modal-close"
              onClick={() =>
                setConfirmConfig({ ...confirmConfig, show: false })
              }
            >
              ✕
            </span>
            <h3 style={{ color: "#1e293b", marginBottom: "10px" }}>
              {confirmConfig.title}
            </h3>
            <p
              style={{
                color: "#64748b",
                marginBottom: "20px",
                fontSize: "15px",
              }}
            >
              {confirmConfig.message}
            </p>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                className="clear-filter-btn"
                style={{ flex: 1, margin: 0 }}
                onClick={() =>
                  setConfirmConfig({ ...confirmConfig, show: false })
                }
              >
                Cancel
              </button>
              <button
                className="auth-button"
                style={{ flex: 1, margin: 0, background: "#ef4444" }}
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  setConfirmConfig({ ...confirmConfig, show: false });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STAFF SERVICES DETAIL MODAL (Payout Table) ===== */}
      {staffServicesModalData && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setStaffServicesModalData(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "400px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>{staffServicesModalData.staffName}</h3>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#94a3b8" }}>{staffServicesModalData.staffEmail}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ background: "#eff6ff", color: "#3b82f6", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                  {staffServicesModalData.services.length} Services
                </span>
                <button
                  onClick={() => setStaffServicesModalData(null)}
                  style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 20px", fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>Service</th>
                    <th style={{ padding: "12px 20px", fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {staffServicesModalData.services.map((svc, i) => {
                    return (
                      <tr key={svc.id || i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                            {svc.service_title || "Service"}
                            {staffServicesModalData.rollingDebtWeekStart && formatDateLocal(svc.earned_at) < staffServicesModalData.rollingDebtWeekStart && (
                              <span style={{ color: "#ef4444", fontSize: "11px", marginLeft: "8px", fontWeight: 700 }}>(Previous)</span>
                            )}
                          </div>
                          {svc.booking_id && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>ID: {String(svc.booking_id).slice(0, 8)}…</div>}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 700, color: "#10b981", fontSize: "14px" }}>
                          ₹{parseFloat(svc.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Total: <strong style={{ color: "#10b981", fontSize: "15px" }}>₹{staffServicesModalData.services.reduce((s, r) => s + parseFloat(r.amount || 0), 0).toLocaleString()}</strong>
              </span>
              <button
                onClick={() => setStaffServicesModalData(null)}
                style={{ background: "#facc15", color: "#000", border: "none", padding: "9px 24px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LOGOUT CONFIRM ===== */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span className="modal-close" onClick={cancelLogout}>
              ✕
            </span>

            <h3 style={{ marginBottom: "15px" }}>Confirm</h3>
            <p style={{ marginBottom: "25px" }}>Are you sure you want to logout?</p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
              }}
            >
              <button
                className="auth-button"
                style={{ margin: 0, display: "inline-block" }}
                onClick={confirmLogout}
              >
                Logout
              </button>
              <button className="clear-filter-btn" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STAFF SERVICES MODAL ===== */}
      {showStaffServices && (
        <div className="modal-overlay">
          <div
            className="modal-card"
            style={{ maxWidth: "800px", width: "90%" }}
          >
            <span
              className="modal-close"
              onClick={() => setShowStaffServices(false)}
            >
              ✕
            </span>

            <h3 style={{ marginBottom: "5px" }}>Staff Services Detail</h3>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>
              <strong>Staff:</strong> {selectedStaffInfo.name} (
              {selectedStaffInfo.email})
            </p>

            {loadingServices ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <Loader />
              </div>
            ) : staffServices.length > 0 ? (
              <>
                <div
                  style={{
                    maxHeight: "60vh",
                    overflowY: "auto",
                    overflowX: "auto",
                    border: "1px solid #f1f5f9",
                    borderRadius: "8px",
                  }}
                >
                  <table
                    className="booking-table"
                    style={{
                      width: "100%",
                      fontSize: "14px",
                      borderCollapse: "separate",
                      borderSpacing: 0,
                    }}
                  >
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Service Name
                        </th>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Customer Name
                        </th>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Customer Phone
                        </th>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Customer Email
                        </th>
                        <th
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffServices.map((booking) => (
                        <tr key={booking.id}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            {booking.services?.[0]?.title || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              fontWeight: 600,
                              color:
                                booking.work_status?.toLowerCase() === "completed"
                                  ? "#22c55e"
                                  : "#f97316",
                            }}
                          >
                            <div>{booking.work_status || "N/A"}</div>
                            {(booking.staff_response?.trim()?.toUpperCase() === "REJECT" ||
                              booking.staff_response?.trim()?.toUpperCase() === "REJECTED") && (
                                <div style={{
                                  color: "#ef4444",
                                  fontSize: "10px",
                                  marginTop: "4px",
                                  fontWeight: "bold"
                                }}>
                                  Staff rejected the booking
                                </div>
                              )}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            {booking.customer_name || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            {booking.phone_number || booking.user_phone || booking.customer_phone || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            {booking.email || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            ₹{booking.total_amount || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#64748b",
                }}
              >
                No services found for this staff member.
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
              }}
            >
              <button
                style={{
                  backgroundColor: "#facc15",
                  color: "#000",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: "400px",
                  fontSize: "16px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onClick={() => setShowStaffServices(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ================= STAFF EARNINGS SCREEN ================= */}
      {showEarnings && earningsStaff && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "#f8fafc",
            width: "100%",
            maxWidth: "900px",
            maxHeight: "90vh",
            borderRadius: "24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 30px",
              background: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e293b" }}>
                  Earnings: {earningsStaff.name}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>{earningsStaff.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowEarnings(false);
                  setEarningsStaff(null);
                  setEarningsViewMode("summary");
                  setSelectedEarningsMetric("total");
                  setEarningsSearch("");
                }}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontWeight: "700",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: "30px 60px", overflowY: "auto" }}>
              {earningsViewMode === "summary" ? (
                <>
                  <div className="staff-grid" style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "24px"
                  }}>
                    {/* Per Job Earning Card */}
                    <div
                      className="staff-card"
                      onClick={() => {
                        setSelectedEarningsMetric("average");
                      }}
                      style={{
                        padding: "30px 15px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        background: "#ffffff",
                        borderRadius: "20px",
                        boxShadow: selectedEarningsMetric === "average" ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "0 4px 20px rgba(0,0,0,0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        border: selectedEarningsMetric === "average" ? "2px solid #3b82f6" : "2px solid transparent",
                        transform: selectedEarningsMetric === "average" ? "translateY(-5px)" : "none"
                      }}
                    >
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "#fff7ed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "8px"
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
                            margin: "8px 0 0"
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
                        borderRadius: "20px",
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
                        borderRadius: "20px",
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
                        borderRadius: "20px",
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

                  {/* Earning Breakdown Table (Main Page View) */}
                  <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "40px" }}>
                    <div style={{ padding: "20px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "700", fontSize: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    <div style={{ padding: "15px 25px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
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
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                            <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>SERVICE</th>
                            {selectedEarningsMetric === "weekly" && (
                              <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>WEEK INFO</th>
                            )}
                            {selectedEarningsMetric === "monthly" && (
                              <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MONTH INFO</th>
                            )}
                            {selectedEarningsMetric === "average" && (
                              <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>CUSTOMER</th>
                            )}
                            <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>BOOKING DATE</th>
                            <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>COMPLETION DATE</th>
                            <th style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earningsLoading ? (
                            <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" || selectedEarningsMetric === "average" ? 5 : 4} style={{ padding: "60px", textAlign: "center" }}><Loader /></td></tr>
                          ) : (() => {
                            const filtered = displayTotals.list;

                            return filtered.length > 0 ? (
                              filtered.map((item, idx) => {
                                const pAt = item.paid_date ? new Date(item.paid_date) : (item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at));
                                const monthName = pAt.toLocaleString('default', { month: 'short' });
                                const itemFirstOfMonth = new Date(pAt.getFullYear(), pAt.getMonth(), 1);
                                const itemFirstSun = new Date(itemFirstOfMonth);
                                itemFirstSun.setDate(itemFirstSun.getDate() - itemFirstSun.getDay());
                                // Match the rounding correction in the filter
                                const itemDiff = Math.round((pAt.getTime() - itemFirstSun.getTime()) / (1000 * 60 * 60 * 24));
                                const weekNum = Math.floor(itemDiff / 7) + 1;
                                const dateNum = pAt.getDate();

                                return (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "12px 20px" }}>
                                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>{item.service_title}</div>
                                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>ID: {item.booking_id?.slice(0, 8)}...</div>
                                    </td>
                                    {selectedEarningsMetric === "weekly" && (
                                      <td style={{ padding: "12px 20px" }}>
                                        <div style={{ fontWeight: "600", color: "#334155", fontSize: "14px" }}>Week {weekNum}</div>
                                        <div style={{ fontSize: "12px", color: "#64748b" }}>{monthName} {dateNum}</div>
                                      </td>
                                    )}
                                    {selectedEarningsMetric === "monthly" && (
                                      <td style={{ padding: "12px 20px" }}>
                                        <div style={{ fontWeight: "600", color: "#334155", fontSize: "14px" }}>{monthName}</div>
                                        <div style={{ fontSize: "12px", color: "#64748b" }}>{pAt.getFullYear()}</div>
                                      </td>
                                    )}
                                    {selectedEarningsMetric === "average" && (
                                      <td style={{ padding: "12px 20px" }}>
                                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>{item.customer_name}</div>
                                      </td>
                                    )}
                                    <td style={{ padding: "12px 20px", color: "#64748b", fontSize: "13px" }}>{item.booking_date}</td>
                                    <td style={{ padding: "12px 20px" }}>
                                      <div style={{ fontWeight: "700", color: "#059669", marginBottom: "4px", fontSize: "13px" }}>PAID</div>
                                      {item.paid_date && (
                                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                          {new Date(item.paid_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: "800", color: "#10b981", fontSize: "16px" }}>
                                      ₹{parseFloat(item.amount).toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" ? 5 : 4} style={{ padding: "80px", textAlign: "center", color: "#94a3b8", fontSize: "18px" }}>No paid records found.</td></tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* Breakdown Detail Mode (The "New Page") */
                <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
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
                      padding: "10px 18px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      color: "#475569",
                      cursor: "pointer",
                      marginBottom: "20px",
                      fontSize: "14px"
                    }}
                  >
                    <span>←</span> Back to Summary
                  </button>

                  <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div style={{ padding: "20px 25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "800", fontSize: "16px", color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    <div style={{ padding: "15px 25px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
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
                          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                            <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>SERVICE</th>
                            {selectedEarningsMetric === "weekly" && (
                              <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>WEEK INFO</th>
                            )}
                            {selectedEarningsMetric === "monthly" && (
                              <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MONTH INFO</th>
                            )}
                            {selectedEarningsMetric === "average" && (
                              <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>CUSTOMER</th>
                            )}
                            <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>BOOKING DATE</th>
                            <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>COMPLETION DATE</th>
                            <th style={{ padding: "15px 20px", fontSize: "14px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earningsLoading ? (
                            <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" || selectedEarningsMetric === "average" ? 5 : 4} style={{ padding: "60px", textAlign: "center" }}><Loader /></td></tr>
                          ) : (() => {
                            const filtered = displayTotals.list.filter(item => {
                              const sTerm = earningsSearch.trim().toLowerCase();
                              if (!sTerm) return true;

                              const pPayoutDate = item.paid_at ? new Date(item.paid_at) : new Date(item.earned_at);
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
                            });

                            const sorted = [...filtered].sort((a, b) => {
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
                                    <td style={{ padding: "18px 20px" }}>
                                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "18px" }}>{item.service_title}</div>
                                      <div style={{ fontSize: "14px", color: "#94a3b8" }}>ID: {item.booking_id?.slice(0, 8)}...</div>
                                    </td>
                                    {selectedEarningsMetric === "weekly" && (
                                      <td style={{ padding: "18px 20px" }}>
                                        <div style={{ fontWeight: "600", color: "#334155", fontSize: "17px" }}>Week {weekNum}</div>
                                        <div style={{ fontSize: "15px", color: "#64748b" }}>{monthName} {dateNum}</div>
                                      </td>
                                    )}
                                    {selectedEarningsMetric === "monthly" && (
                                      <td style={{ padding: "18px 20px" }}>
                                        <div style={{ fontWeight: "600", color: "#334155", fontSize: "17px" }}>{monthName}</div>
                                        <div style={{ fontSize: "15px", color: "#64748b" }}>{pAt.getFullYear()}</div>
                                      </td>
                                    )}
                                    {selectedEarningsMetric === "average" && (
                                      <td style={{ padding: "18px 20px" }}>
                                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "17px" }}>{item.customer_name}</div>
                                      </td>
                                    )}
                                    <td style={{ padding: "18px 20px", color: "#64748b", fontSize: "16px" }}>{item.booking_date}</td>
                                    <td style={{ padding: "18px 20px" }}>
                                      <div style={{ fontWeight: "700", color: "#059669", marginBottom: "4px", fontSize: "16px" }}>PAID</div>
                                      {item.paid_date && (
                                        <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                                          {new Date(item.paid_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "18px 20px", textAlign: "right", fontWeight: "800", color: "#10b981", fontSize: "20px" }}>
                                      ₹{parseFloat(item.amount).toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr><td colSpan={selectedEarningsMetric === "weekly" || selectedEarningsMetric === "monthly" ? 5 : 4} style={{ padding: "80px", textAlign: "center", color: "#94a3b8", fontSize: "18px" }}>No paid records found.</td></tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== GLOBAL STAFF ACCEPTED MODAL ===== */}
      {showStaffAcceptedModal && acceptedBooking && (
        <div className="modal-overlay" style={{ zIndex: 9999999 }}>
          <div className="modal-card" style={{ textAlign: "center", minWidth: "320px", maxWidth: "400px" }}>
            <span
              className="modal-close"
              onClick={() => {
                setShowStaffAcceptedModal(false);
                setAcceptedBooking(null);
                setShowOtp(false);
              }}
            >
              ✕
            </span>
            <h3 style={{ color: "#10b981", marginBottom: "10px" }}>
              Staff Assigned
            </h3>
            <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "15px", lineHeight: "1.5" }}>
              The staff <b>{acceptedBooking.staffName}</b> has been assigned.
            </p>

            {showOtp ? (
              <div style={{
                background: "#f8fafc",
                padding: "15px",
                borderRadius: "12px",
                marginBottom: "20px",
                border: "1px solid #e2e8f0",
                textAlign: "left"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "600", color: "#475569" }}>Start OTP:</span>
                  <span style={{ fontWeight: "700", color: "#1e293b", letterSpacing: "1px" }}>{acceptedBooking.startOtp}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "600", color: "#475569" }}>End OTP:</span>
                  <span style={{ fontWeight: "700", color: "#1e293b", letterSpacing: "1px" }}>{acceptedBooking.endOtp}</span>
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="auth-button"
                style={{
                  flex: 1,
                  background: "#facc15",
                  color: "#000",
                  fontWeight: "700",
                }}
                onClick={() => {
                  setShowStaffAcceptedModal(false);
                  setAcceptedBooking(null);
                  setShowOtp(false);
                }}
              >
                OK
              </button>
              {!showOtp && (
                <button
                  className="auth-button"
                  style={{
                    flex: 1,
                    background: "#e2e8f0",
                    color: "#0f172a",
                    fontWeight: "700",
                  }}
                  onClick={() => setShowOtp(true)}
                >
                  View OTP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OUT OF ZONE ALERT MODAL */}
      {outOfZoneAlert.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
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
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              border: "1px solid #fee2e2",
              padding: "24px",
              position: "relative"
            }}
          >
            {/* Top-Right '✕' Close Button */}
            <button
              onClick={handleDismissOutOfZoneAlert}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
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

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "28px", background: "#fef2f2", padding: "10px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                🚨
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>
                  Staff Out of Hub Zone!
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
                  Attention: Staff member is outside assigned zone.
                </p>
              </div>
            </div>

            {/* Content Card */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", marginBottom: "20px" }}>
              {/* Row 1: STAFF NAME & EMAIL */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>STAFF NAME</span>
                  <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{outOfZoneAlert.staffName}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>EMAIL</span>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{outOfZoneAlert.staffEmail}</div>
                </div>
              </div>

              {/* Row 2: PHONE NUMBER & ASSIGNED HUB */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>PHONE NUMBER</span>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#334155", marginTop: "2px" }}>{outOfZoneAlert.staffPhone}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>ASSIGNED HUB</span>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#c2410c", marginTop: "2px" }}>📍 {outOfZoneAlert.hubName}</div>
                </div>
              </div>

              {/* Row 3: LIVE LOCATION */}
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>LIVE LOCATION</span>
                <div style={{ marginTop: "4px" }}>
                  <LiveLocationCell locationStr={outOfZoneAlert.liveLocation} />
                </div>
              </div>
            </div>

            {/* Warning Notice */}
            <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px", color: "#991b1b", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
              ⚠️ Partner <strong>{outOfZoneAlert.staffName}</strong> has crossed outside their assigned hub zone boundary.
            </div>

            {/* OK Button */}
            <button
              onClick={handleDismissOutOfZoneAlert}
              style={{
                width: "100%",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)"
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

export default Dashboard;


