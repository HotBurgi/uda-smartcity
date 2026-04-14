// Utility API: incapsula fetch con credenziali e gestione errori.
const API_BASE_URL = "http://localhost:5001/api";

export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Necessario per inviare i cookie di sessione.
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

  // Alcuni endpoint (es. logout) possono rispondere senza body JSON.
  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};
