import { useState, useEffect } from "react";
import { apiClient } from "../api";

// Storico amministratore: mostra tutte le prenotazioni del sistema.
export const AdminHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carica lo storico globale al primo render.
    const fetchHistory = async () => {
      try {
        const data = await apiClient("/admin/bookings");
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div>Caricamento storico...</div>;

  return (
    <>
      <h2 className="mb-4">Storico globale prenotazioni</h2>

      {history.length === 0 ? (
        <div className="card text-center text-muted">
          Nessuna prenotazione trovata nel sistema.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID prenotazione</th>
                <th>Utente</th>
                <th>Area</th>
                <th>Ora inizio</th>
                <th>Ora fine</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>
                    <span
                      className="badge badge-neutral bg-none border"
                      style={{ border: "1px solid var(--border-color)" }}
                    >
                      {b.username}
                    </span>
                  </td>
                  <td>
                    {b.area_name || b.area_id}{" "}
                    <span className="text-muted text-sm">({b.area_id})</span>
                  </td>
                  <td>{new Date(b.start_time).toLocaleString("it-IT")}</td>
                  <td>{new Date(b.end_time).toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
