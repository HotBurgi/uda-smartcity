// Api utilities encapsulating fetch with credentials
const API_BASE_URL = "http://localhost:5001/api";

export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Needed for session cookies
  };

  const config = { ...defaultOptions, ...options };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMsg = "Si e verificato un errore";
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  // Some endpoints (like logout) might return empty body or simple message
  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};
