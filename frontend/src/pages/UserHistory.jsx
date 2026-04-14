import { useState, useEffect } from "react";
import { apiClient } from "../api";

// Storico utente: visualizza le prenotazioni personali.
export const UserHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carica lo storico una sola volta all'apertura pagina.
    const fetchHistory = async () => {
      try {
        const data = await apiClient("/bookings/my_history");
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
      <h2 className="mb-4">Storico delle mie prenotazioni</h2>

      {history.length === 0 ? (
        <div className="card text-center text-muted">
          Non hai prenotazioni nello storico.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID prenotazione</th>
                <th>Nome area</th>
                <th>Ora inizio</th>
                <th>Ora fine</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{b.area_name || b.area_id}</td>
                  <td>{new Date(b.start_time).toLocaleString("it-IT")}</td>
                  <td>{new Date(b.end_time).toLocaleString("it-IT")}</td>
                  <td>
                    <span
                      className={`badge ${b.status === "Active" ? "badge-success" : "badge-neutral"}`}
                    >
                      {b.status === "Active" ? "Attiva" : b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
