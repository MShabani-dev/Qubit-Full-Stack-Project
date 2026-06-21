// This helper turns any of them into a single readable string.
export function parseError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  // Collect all field error messages into one string.
  const messages = [];
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value)) messages.push(`${key}: ${value.join(" ")}`);
    else if (typeof value === "string") messages.push(`${key}: ${value}`);
  }

  return messages.length ? messages.join("\n") : fallback;
}
