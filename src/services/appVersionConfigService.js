
import { supabase } from "../supabase";

const TABLE_NAME = "app_version_config";

/**
 * Fetch app version configuration for Customer or Partner.
 */
export async function getAppVersionConfig(appType) {
  if (!["customer", "partner"].includes(appType)) {
    throw new Error("Invalid app type.");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("app_type", appType)
    .eq("platform", "android")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update an existing app version configuration.
 */
export async function updateAppVersionConfig(appType, values) {
  if (!["customer", "partner"].includes(appType)) {
    throw new Error("Invalid app type.");
  }

  const latestCode = Number(values.latest_version_code);
  const minimumCode = Number(values.minimum_version_code);

  if (
    !Number.isSafeInteger(latestCode) ||
    !Number.isSafeInteger(minimumCode) ||
    latestCode <= 0 ||
    minimumCode <= 0 ||
    minimumCode > latestCode
  ) {
    throw new Error(
      "Version codes must be positive integers. Minimum version code cannot exceed latest version code."
    );
  }

  const version = String(values.latest_version || "").trim();

  if (!version) {
    throw new Error("Latest version is required.");
  }

  if (!["optional", "mandatory"].includes(values.update_policy)) {
    throw new Error("Invalid update policy.");
  }

  
const storeUrl = String(values.play_store_url || "").trim();

if (storeUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(storeUrl);
  } catch {
    throw new Error("Please enter a valid Play Store URL.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== "play.google.com"
  ) {
    throw new Error(
      "Play Store URL must be an HTTPS Google Play link."
    );
  }
}

const payload = {
  latest_version: version,
  latest_version_code: latestCode,
  minimum_version_code: minimumCode,
  update_policy: values.update_policy,
  update_message: values.update_message || "",
  update_enabled: values.update_enabled === true,
  play_store_url: storeUrl || null,
  updated_at: new Date().toISOString(),
};

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq("app_type", appType)
    .eq("platform", "android")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
