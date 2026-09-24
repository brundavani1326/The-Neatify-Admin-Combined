import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

const POLL_INTERVAL_MS = 5000;
const RECENT_ROWS_LIMIT = 20;

function StaffCancellationAlert() {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [cancellation, setCancellation] = useState(null);
  const [reassignLoading, setReassignLoading] = useState(false);

  const seenIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const checkingRef = useRef(false);

  const closePopup = useCallback(() => {
    setShowPopup(false);
    setCancellation(null);
    setReassignLoading(false);
  }, []);

  const processCancellation = useCallback(async (record) => {
    if (!record?.id) return;

    const [{ data: booking, error: bookingError }, { data: staffProfile, error: staffError }] =
      await Promise.all([
        record.booking_id
          ? supabase
              .from("bookings")
              .select("*")
              .eq("id", record.booking_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        record.staff_email
          ? supabase
              .from("staff_profile")
              .select("name,email")
              .eq("email", record.staff_email)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (bookingError) {
      console.error("❌ Error fetching cancelled booking:", bookingError);
    }
    if (staffError) {
      console.warn("⚠️ Could not fetch staff profile:", staffError);
    }

    setCancellation({
      ...record,
      booking: booking || null,
      staff_name: staffProfile?.name || record.staff_email || "N/A",
    });
    setShowPopup(true);
  }, []);

  const checkStaffCancellations = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("staff_cancellations")
        .select("*")
        .order("cancelled_at", { ascending: false })
        .limit(RECENT_ROWS_LIMIT);

      if (error) {
        console.error("❌ Staff cancellation check error:", error);
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      // First successful check only seeds existing records. This prevents an
      // old cancellation from popping up when an Admin opens the app.
      if (!initializedRef.current) {
        rows.forEach((row) => {
          if (row?.id != null) seenIdsRef.current.add(String(row.id));
        });
        initializedRef.current = true;
        console.log("✅ Staff cancellation listener initialized");
        return;
      }

      const newRows = rows.filter(
        (row) => row?.id != null && !seenIdsRef.current.has(String(row.id))
      );

      rows.forEach((row) => {
        if (row?.id != null) seenIdsRef.current.add(String(row.id));
      });

      if (newRows.length === 0) return;

      newRows.sort(
        (a, b) =>
          new Date(b.cancelled_at || 0).getTime() -
          new Date(a.cancelled_at || 0).getTime()
      );

      const newestCancellation = newRows[0];
      console.log("🚨 NEW STAFF CANCELLATION:", newestCancellation);
      await processCancellation(newestCancellation);
    } catch (error) {
      console.error("❌ Staff cancellation check failed:", error);
    } finally {
      checkingRef.current = false;
    }
  }, [processCancellation]);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      if (mounted) await checkStaffCancellations();
    };

    start();
    const interval = setInterval(() => {
      if (mounted) checkStaffCancellations();
    }, POLL_INTERVAL_MS);

    // Realtime is a fast path. Polling above remains the fallback in case
    // staff_cancellations is not enabled for Supabase Realtime.
    const channel = supabase
      .channel("admin-staff-cancellation-alert")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_cancellations",
        },
        async (payload) => {
          const record = payload?.new;
          if (!record?.id) return;

          const id = String(record.id);
          if (seenIdsRef.current.has(id)) return;
          seenIdsRef.current.add(id);

          try {
            await processCancellation(record);
          } catch (error) {
            console.error("❌ Staff cancellation realtime error:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("Staff cancellation realtime status:", status);
      });

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [checkStaffCancellations, processCancellation]);

  const handleReassign = async () => {
    const booking = cancellation?.booking;

    if (!booking?.id) {
      window.alert(
        "The cancelled booking could not be loaded. Please open Bookings and refresh the page."
      );
      return;
    }

    try {
      setReassignLoading(true);

      // Preserve the cancelled booking so the existing Staff screen can open
      // with THIS booking selected. No staff is assigned automatically here.
      localStorage.setItem(
        "staffCancellationReassignBooking",
        JSON.stringify(booking)
      );

      // Open Dashboard -> Bookings -> All Staff (the existing Staff screen).
      // Bookings reads these values on mount and calls the existing fetchStaff()
      // flow, which lets Admin choose a NEW staff member manually.
      localStorage.setItem("adminActiveTab", "bookings");
      localStorage.setItem("forceOpenStaff", "true");
      localStorage.setItem("bookingsShowStaff", "true");
      localStorage.setItem("bookingsSelectedBooking", JSON.stringify(booking));

      closePopup();
      navigate("/dashboard");

      // Also support the case where Bookings is already mounted.
      window.setTimeout(() => {
        window.dispatchEvent(new Event("forceOpenStaffUpdate"));
        window.dispatchEvent(new Event("staffCancellationReassignReady"));
      }, 350);
    } catch (error) {
      console.error("❌ Reassign navigation failed:", error);
      setReassignLoading(false);
    }
  };

  if (!showPopup || !cancellation) return null;

  const booking = cancellation.booking;
  const customerName =
    cancellation.customer_name ||
    booking?.customer_name ||
    booking?.user_name ||
    "N/A";
  const cancelledAt = cancellation.cancelled_at
    ? new Date(cancellation.cancelled_at).toLocaleString("en-IN")
    : "N/A";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.72)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 2147483647,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="staff-cancellation-title"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
          border: "1px solid #e2e8f0",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "58px",
              height: "58px",
              margin: "0 auto 10px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
            }}
          >
            ⚠️
          </div>
          <h2
            id="staff-cancellation-title"
            style={{
              margin: 0,
              color: "#b91c1c",
              fontSize: "22px",
              fontWeight: "800",
            }}
          >
            Staff Cancellation
          </h2>
          <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: "14px" }}>
            The assigned partner has cancelled this booking.
          </p>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "17px",
          }}
        >
          <InfoRow label="Booking ID" value={cancellation.booking_id || "N/A"} blue />
          <InfoRow label="Customer Name" value={customerName} />
          <InfoRow
            label="Cancelled Staff"
            value={cancellation.staff_name || cancellation.staff_email || "N/A"}
            secondary={cancellation.staff_email || ""}
          />

          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: "10px",
              padding: "13px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#9a3412",
                fontWeight: "800",
                textTransform: "uppercase",
              }}
            >
              Cancellation Reason
            </div>
            <div
              style={{
                marginTop: "5px",
                color: "#7c2d12",
                fontWeight: "700",
                lineHeight: "1.4",
                whiteSpace: "pre-wrap",
              }}
            >
              {cancellation.cancellation_reason || "Not specified"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "15px",
              marginBottom: "10px",
            }}
          >
            <span style={{ color: "#475569", fontWeight: "600" }}>
              Cancellation Fee
            </span>
            <strong style={{ color: "#dc2626" }}>
              ₹{cancellation.cancellation_fee ?? 0}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "15px",
            }}
          >
            <span style={{ color: "#475569", fontWeight: "600" }}>
              Cancelled At
            </span>
            <span
              style={{
                color: "#334155",
                fontSize: "13px",
                textAlign: "right",
              }}
            >
              {cancelledAt}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: "17px",
            padding: "11px 13px",
            borderRadius: "9px",
            background: "#fef2f2",
            color: "#991b1b",
            textAlign: "center",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          This booking is now available for reassignment.
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={closePopup}
            disabled={reassignLoading}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: "9px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              cursor: reassignLoading ? "not-allowed" : "pointer",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleReassign}
            disabled={reassignLoading}
            style={{
              flex: 1.25,
              padding: "12px 14px",
              borderRadius: "9px",
              border: "none",
              background: reassignLoading ? "#fde68a" : "#facc15",
              color: "#0f172a",
              cursor: reassignLoading ? "wait" : "pointer",
              fontWeight: "800",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(250,204,21,0.3)",
            }}
          >
            {reassignLoading ? "Opening Assign Staff..." : "🔄 Reassign Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, secondary, blue }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          fontWeight: "700",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "4px",
          color: blue ? "#1d4ed8" : "#0f172a",
          fontWeight: "800",
          fontSize: "13px",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      {secondary ? (
        <div style={{ marginTop: "2px", color: "#475569", fontSize: "13px" }}>
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

export default StaffCancellationAlert;
