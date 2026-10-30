
import React, { useEffect, useState } from "react";
import {
  getAppVersionConfig,
  updateAppVersionConfig,
} from "../services/appVersionConfigService";
import "./AppConfiguration.css";

const EMPTY_FORM = {
  latest_version: "",
  latest_version_code: "",
  minimum_version_code: "",
  update_policy: "optional",
  update_message: "",
  update_enabled: false,
  play_store_url: "",
};

export default function AppConfiguration() {
  const [activeApp, setActiveApp] = useState("customer");
  const [configs, setConfigs] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfigurations() {
      setLoading(true);
      setError("");

      try {
        const [customer, partner] = await Promise.all([
          getAppVersionConfig("customer"),
          getAppVersionConfig("partner"),
        ]);

        if (cancelled) return;

        setConfigs({ customer, partner });
        setForm(customer);
        setDirty(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load configurations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfigurations();

    return () => {
      cancelled = true;
    };
  }, []);

  function changeApp(appType) {
    if (saving || loading) return;

    if (dirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Switch app without saving?"
      );
      if (!confirmed) return;
    }

    setActiveApp(appType);
    setForm(configs[appType] || EMPTY_FORM);
    setDirty(false);
    setError("");
    setSuccess("");
  }

  function changeField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setDirty(true);
    setSuccess("");
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();
    if (saving || loading) return;

    setError("");
    setSuccess("");

    const latestCode = Number(form.latest_version_code);
    const minimumCode = Number(form.minimum_version_code);

    if (
      !Number.isSafeInteger(latestCode) ||
      !Number.isSafeInteger(minimumCode) ||
      latestCode <= 0 ||
      minimumCode <= 0 ||
      minimumCode > latestCode
    ) {
      setError(
        "Enter valid version codes. Minimum code must not exceed latest code."
      );
      return;
    }

    if (!String(form.latest_version).trim()) {
      setError("Latest version is required.");
      return;
    }

    const confirmed = window.confirm(
      `Save version configuration for ${
        activeApp === "customer" ? "Customer App" : "Partner App"
      }?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const updated = await updateAppVersionConfig(activeApp, form);

      setConfigs((previous) => ({
        ...previous,
        [activeApp]: updated,
      }));

      setForm(updated);
      setDirty(false);
      setSuccess("App configuration saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="appconfig-page">
      <div className="appconfig-card">
        <div className="appconfig-header">
          <div>
            <h2>App Version Management</h2>
            <p>Manage Customer and Partner app update settings</p>
          </div>
          <span className="appconfig-header-icon">▣</span>
        </div>

        <div className="appconfig-tabs">
          <button
            type="button"
            className={activeApp === "customer" ? "selected" : ""}
            onClick={() => changeApp("customer")}
            disabled={loading || saving}
          >
            Customer App
          </button>
          <button
            type="button"
            className={activeApp === "partner" ? "selected" : ""}
            onClick={() => changeApp("partner")}
            disabled={loading || saving}
          >
            Partner App
          </button>
        </div>

        {loading ? (
          <div className="appconfig-loading">
            Loading configuration from Supabase...
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="appconfig-grid">
              <div className="appconfig-field">
                <label htmlFor="app-latest-version">
                  Latest Play Store version
                </label>
                <input
                  id="app-latest-version"
                  type="text"
                  value={form.latest_version ?? ""}
                  placeholder="e.g. 1.0.4"
                  onChange={(e) =>
                    changeField("latest_version", e.target.value)
                  }
                  required
                />
              </div>

              <div className="appconfig-field">
                <label htmlFor="app-latest-code">
                  Latest version code
                </label>
                <input
                  id="app-latest-code"
                  type="number"
                  min="1"
                  step="1"
                  value={form.latest_version_code ?? ""}
                  onChange={(e) =>
                    changeField("latest_version_code", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="appconfig-field">
              <label htmlFor="app-minimum-code">
                Minimum supported version code
              </label>
              <input
                id="app-minimum-code"
                type="number"
                min="1"
                step="1"
                value={form.minimum_version_code ?? ""}
                onChange={(e) =>
                  changeField("minimum_version_code", e.target.value)
                }
                required
              />
              <span className="appconfig-hint">
                Versions below this code can be required to update.
              </span>
            </div>

            <div className="appconfig-field">
              <label>Update policy</label>

              <div className="appconfig-radio-group">
                <label className="appconfig-radio">
                  <input
                    type="radio"
                    name="update-policy"
                    value="optional"
                    checked={form.update_policy === "optional"}
                    onChange={() =>
                      changeField("update_policy", "optional")
                    }
                  />
                  <span>Optional — Update Now / Later</span>
                </label>

                <label className="appconfig-radio">
                  <input
                    type="radio"
                    name="update-policy"
                    value="mandatory"
                    checked={form.update_policy === "mandatory"}
                    onChange={() =>
                      changeField("update_policy", "mandatory")
                    }
                  />
                  <span>
                    Mandatory — Update required before continuing
                  </span>
                </label>
              </div>
            </div>
        
        
<div className="appconfig-field">
  <label htmlFor="app-play-store-url">
    Play Store URL
  </label>

  <input
    id="app-play-store-url"
    type="url"
    value={form.play_store_url ?? ""}
    placeholder="https://play.google.com/store/apps/details?id=..."
    onChange={(e) =>
      changeField("play_store_url", e.target.value)
    }
  />

  <span className="appconfig-hint">
    Users will be redirected to this link when they choose to update.
  </span>

  {form.play_store_url && (
    <a
      href={form.play_store_url}
      target="_blank"
      rel="noopener noreferrer"
      className="appconfig-store-link"
    >
      <span>View Play Store Link ↗</span>
    </a>
  )}
</div>

            <div className="appconfig-field">
              <label htmlFor="app-update-message">
                Update message
              </label>
              <textarea
                id="app-update-message"
                rows="3"
                value={form.update_message ?? ""}
                placeholder="Enter update notification message"
                onChange={(e) =>
                  changeField("update_message", e.target.value)
                }
              />
            </div>

            <label className="appconfig-checkbox">
              <input
                type="checkbox"
                checked={form.update_enabled === true}
                onChange={(e) =>
                  changeField("update_enabled", e.target.checked)
                }
              />
              <span>Enable update notification</span>
            </label>

            {error && (
              <div className="appconfig-alert appconfig-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="appconfig-alert appconfig-success" role="status">
                {success}
              </div>
            )}

            <div className="appconfig-footer">
              <span>
                {dirty
                  ? "Unsaved changes"
                  : "Configuration loaded from Supabase"}
              </span>

              <button
                type="submit"
                className="appconfig-save"
                disabled={saving || !dirty}
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
