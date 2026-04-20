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

  const formatDateTime = (value) => {
    if (!value) return "-";

    // I valori backend sono naive-local (YYYY-MM-DDTHH:MM:SS): li forziamo a Date locale.
    const m = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );

    if (m) {
      const [, y, mo, d, h, mi, s] = m;
      const localDate = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s || 0),
      );
      return localDate.toLocaleString("it-IT");
    }

    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime())
      ? String(value)
      : fallback.toLocaleString("it-IT");
  };

  const statusMeta = {
    Active: { label: "Attiva", badge: "badge-success" },
    Upcoming: { label: "In arrivo", badge: "badge-neutral" },
    Expired: { label: "Scaduta", badge: "badge-danger" },
  };

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
                  <td>{formatDateTime(b.start_time)}</td>
                  <td>{formatDateTime(b.end_time)}</td>
                  <td>
                    {(() => {
                      const meta = statusMeta[b.status] || {
                        label: b.status || "-",
                        badge: "badge-neutral",
                      };
                      return (
                        <span className={`badge ${meta.badge}`}>
                          {meta.label}
                        </span>
                      );
                    })()}
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
