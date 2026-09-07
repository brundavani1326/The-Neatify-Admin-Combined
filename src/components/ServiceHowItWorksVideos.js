import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

const ServiceHowItWorksVideos = ({ serviceId }) => {
  console.log("[ServiceHowItWorksVideos] Rendered with serviceId:", serviceId);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("error"); // "error" or "success"

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    sort_order: 1,
    is_active: true,
  });
  const [videoFile, setVideoFile] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_how_it_works_videos")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setVideos(data);
    } else {
      console.error("Error fetching videos:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (serviceId) {
      fetchVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      description: "",
      sort_order: videos.length > 0 ? videos[videos.length - 1].sort_order + 1 : 1,
      is_active: true,
    });
    setVideoFile(null);
    setCurrentVideoUrl("");
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (video) => {
    setFormData({
      title: video.title || "",
      description: video.description || "",
      sort_order: video.sort_order,
      is_active: video.is_active,
    });
    setVideoFile(null);
    setCurrentVideoUrl(video.video_url);
    setIsEditing(true);
    setEditingId(video.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setVideoFile(null);
  };

  const showAlert = (msg, type = "error") => {
    setAlertMsg(msg);
    setAlertType(type);
  };

  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = function () {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = function () {
        resolve(-1);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showAlert("Video Title is required.");
      return;
    }
    if (!isEditing && !videoFile) {
      showAlert("Video File is required.");
      return;
    }

    setUploading(true);

    let publicVideoUrl = currentVideoUrl;
    let oldVideoUrl = null;

    if (videoFile) {
      // Validate file type
      const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
      if (!validTypes.includes(videoFile.type)) {
        showAlert("Please upload a valid video file (MP4, MOV, or WebM).");
        setUploading(false);
        return;
      }

      // Validate file size (50MB = 50 * 1024 * 1024 bytes)
      if (videoFile.size > 50 * 1024 * 1024) {
        showAlert("Video file is too large. Maximum size is 50 MB.");
        setUploading(false);
        return;
      }

      // Validate duration
      const duration = await validateVideoDuration(videoFile);
      if (duration === -1) {
        showAlert("Failed to read video file metadata. Please try a different file.");
        setUploading(false);
        return;
      }
      if (duration > 30.5) { // Adding a small buffer for 30s videos
        showAlert("Video must be 30 seconds or less.");
        setUploading(false);
        return;
      }

      // Upload to Supabase Storage
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${serviceId}/video-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("service-how-it-works-videos")
        .upload(fileName, videoFile, { upsert: true });

      if (uploadError) {
        console.error("Video upload failed:", uploadError);
        showAlert("Failed to upload video. Please try again.");
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("service-how-it-works-videos")
        .getPublicUrl(fileName);
      
      publicVideoUrl = publicUrlData.publicUrl;
      
      if (isEditing && currentVideoUrl) {
         oldVideoUrl = currentVideoUrl;
      }
    }

    const payload = {
      service_id: serviceId,
      title: formData.title,
      description: formData.description || null,
      video_url: publicVideoUrl,
      sort_order: Number(formData.sort_order),
      is_active: formData.is_active,
    };

    if (isEditing) {
      payload.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("service_how_it_works_videos")
        .update(payload)
        .eq("id", editingId);

      if (updateError) {
        console.error("Failed to update video record:", updateError);
        showAlert("Video uploaded, but saving video details failed.");
        setUploading(false);
        return;
      }
      
      // Optionally try to delete old video from storage
      if (oldVideoUrl) {
         try {
             const urlObj = new URL(oldVideoUrl);
             const pathParts = urlObj.pathname.split('/service-how-it-works-videos/');
             if (pathParts.length > 1) {
                 const filePath = pathParts[1];
                 await supabase.storage.from('service-how-it-works-videos').remove([filePath]);
             }
         } catch(e) {
             console.log("Could not delete old video file", e);
         }
      }
      
    } else {
      const { error: insertError } = await supabase
        .from("service_how_it_works_videos")
        .insert([payload]);

      if (insertError) {
        console.error("Failed to insert video record:", insertError);
        showAlert("Video uploaded, but saving video details failed.");
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    handleCloseModal();
    fetchVideos();
  };

  const handleToggleActive = async (video) => {
    const { error } = await supabase
      .from("service_how_it_works_videos")
      .update({ is_active: !video.is_active, updated_at: new Date().toISOString() })
      .eq("id", video.id);

    if (error) {
      console.error("Toggle active error:", error);
      alert("Failed to update status.");
    } else {
      fetchVideos();
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    
    // Delete from DB first
    const { error } = await supabase
      .from("service_how_it_works_videos")
      .delete()
      .eq("id", video.id);

    if (error) {
      console.error("Delete error:", error);
      alert("Unable to delete video. Please try again.");
      return;
    }

    // Attempt to delete from storage
    if (video.video_url) {
        try {
            const urlObj = new URL(video.video_url);
            const pathParts = urlObj.pathname.split('/service-how-it-works-videos/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                await supabase.storage.from('service-how-it-works-videos').remove([filePath]);
            }
        } catch(e) {
            console.log("Could not delete video file from storage", e);
        }
    }

    fetchVideos();
  };

  return (
    <div style={{ marginTop: "30px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ color: "#333", fontSize: "1.2rem", margin: 0 }}>How It Works Videos</h3>
        <button
          onClick={handleOpenAdd}
          style={{
            padding: "8px 16px",
            backgroundColor: "#ffd700",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          + Add Video
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888", textAlign: "center" }}>Loading videos...</p>
      ) : videos.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", border: "1px dashed #ccc", borderRadius: "8px" }}>
          <p style={{ color: "#888", marginBottom: "15px" }}>No How It Works videos added yet.</p>
          <button
            onClick={handleOpenAdd}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            + Add First Video
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
          {videos.map((video) => (
            <div key={video.id} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", background: "#fafafa" }}>
              <div style={{ width: "120px", height: "80px", borderRadius: "8px", overflow: "hidden", background: "#000", flexShrink: 0 }}>
                <video src={video.video_url} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 5px 0", fontSize: "16px", color: "#333" }}>{video.title}</h4>
                {video.description && <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>{video.description}</p>}
                
                <div style={{ display: "flex", gap: "15px", fontSize: "13px", color: "#555" }}>
                  <span><strong>Order:</strong> {video.sort_order}</span>
                  <span><strong>Status:</strong> {video.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(video)}
                  style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(video)}
                  style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >
                  {video.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(video)}
                  style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10000
        }}>
          <div style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            width: "95%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative"
          }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>{isEditing ? "Edit Video" : "Add Video"}</h3>
            
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Video Title *</label>
            <input
              className="auth-input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Toilet Deep Cleaning"
              style={{ marginBottom: "15px" }}
            />

            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Description</label>
            <textarea
              className="auth-input"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Optional description"
              rows={3}
              style={{ marginBottom: "15px", minHeight: "80px", paddingTop: "10px", resize: "vertical" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Display Order *</label>
                <input
                  type="number"
                  className="auth-input"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase" }}>Status</label>
                <select
                  className="auth-input"
                  value={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                  style={{ marginBottom: 0, padding: "0 10px" }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="upload-field" style={{ marginBottom: "20px" }}>
              <label className="upload-field__label">Video File {isEditing ? "" : "*"}</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => setVideoFile(e.target.files[0])}
              />
              <span style={{ fontSize: "11px", color: "#666", display: "block", marginTop: "4px" }}>Max 30 seconds, 50MB (MP4, MOV, WebM)</span>
              
              {isEditing && currentVideoUrl && !videoFile && (
                <div style={{ marginTop: "10px" }}>
                  <p style={{ fontSize: "12px", color: "#555", marginBottom: "5px" }}>Current Video:</p>
                  <video src={currentVideoUrl} controls preload="metadata" style={{ width: "100%", maxHeight: "150px", borderRadius: "6px", background: "#000" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={uploading}
                style={{ padding: "10px 20px", border: "1px solid #ccc", background: "#fff", borderRadius: "6px", cursor: uploading ? "not-allowed" : "pointer", fontWeight: "600" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading}
                style={{ padding: "10px 20px", border: "none", background: "#ffd700", borderRadius: "6px", cursor: uploading ? "not-allowed" : "pointer", fontWeight: "bold" }}
              >
                {uploading ? "Saving..." : (isEditing ? "Save Changes" : "Upload Video")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMsg && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001
        }}>
          <div style={{ background: "#fff", padding: "30px 40px", borderRadius: "12px", textAlign: "center", minWidth: "350px", position: "relative" }}>
            <span onClick={() => setAlertMsg("")} style={{ position: "absolute", top: "12px", right: "15px", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>✕</span>
            <h3 style={{ color: alertType === "error" ? "#dc2626" : "#059669", marginBottom: "15px" }}>
              {alertType === "error" ? "Error" : "Success"}
            </h3>
            <p style={{ color: "#333", fontSize: "14px" }}>{alertMsg}</p>
            <button type="button" onClick={() => setAlertMsg("")} style={{ marginTop: "20px", padding: "8px 25px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: alertType === "error" ? "#dc2626" : "#facc15", color: alertType === "error" ? "#fff" : "#000", fontWeight: "600" }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHowItWorksVideos;
