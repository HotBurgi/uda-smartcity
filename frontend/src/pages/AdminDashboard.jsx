import { useState, useEffect } from "react";
import { apiClient } from "../api";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export const AdminDashboard = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAreas = async () => {
    try {
      const data = await apiClient("/areas");
      setAreas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiClient("/admin/areas", {
        method: "POST",
        body: { id, name, max_capacity: maxCapacity },
      });
      setSuccess("Area creata con successo");
      setId("");
      setName("");
      setMaxCapacity("");
      fetchAreas();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Caricamento...</div>;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
      <div>
        <div className="card">
          <h3 className="mb-4">Aggiungi nuova area</h3>
          {error && (
            <div
              className="badge badge-danger mb-4"
              style={{ display: "block" }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="badge badge-success mb-4"
              style={{ display: "block" }}
            >
              {success}
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>ID area</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="es. P1"
                required
              />
            </div>
            <div className="form-group">
              <label>Nome (Opzionale)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Stazione Nord"
              />
            </div>
            <div className="form-group">
              <label>Capacita massima</label>
              <input
                type="number"
                min="1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block mt-4 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Crea area
            </button>
          </form>
        </div>
      </div>

      <div>
        <h3 className="mb-4">Aree gestite</h3>
        <div className="grid">
          {areas.map((a) => (
            <div key={a.id} className="card">
              <div className="card-header flex justify-between items-center">
                <h4>
                  {a.name || a.id}{" "}
                  <span className="text-muted" style={{ fontSize: "0.875rem" }}>
                    ({a.id})
                  </span>
                </h4>
              </div>
              <div className="card-content mt-2">
                <p>
                  Capacita:{" "}
                  <strong className="text-brand">{a.max_capacity}</strong>
                </p>
                <div className="mt-4">
                  <Link
                    to={`/admin/trends/${a.id}`}
                    className="btn btn-outline"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                  >
                    Visualizza trend 30 giorni
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        {areas.length === 0 && (
          <p className="text-muted text-center pt-8">Nessuna area creata.</p>
        )}
      </div>
    </div>
  );
};
