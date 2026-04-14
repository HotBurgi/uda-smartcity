import { useState, useEffect } from "react";
import { apiClient } from "../api";
import { MapPin, Clock } from "lucide-react";

export const UserDashboard = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bookingDateByArea, setBookingDateByArea] = useState({});
  const [bookingTimeByArea, setBookingTimeByArea] = useState({});
  const [bookingDurationByArea, setBookingDurationByArea] = useState({});
  const [bookingInProgress, setBookingInProgress] = useState({});

  const pad = (n) => String(n).padStart(2, "0");

  const toDateValue = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const toTimeValue = (date) =>
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const getDefaultBookingStart = () => {
    const d = new Date();
    const rounded = Math.ceil(d.getMinutes() / 30) * 30;
    d.setMinutes(rounded, 0, 0);
    if (rounded === 60) {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0, 0, 0);
    }
    return {
      date: toDateValue(d),
      time: toTimeValue(d),
    };
  };

  const getTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${pad(hour)}:${pad(minute)}`;
        options.push({ value, label: value });
      }
    }
    return options;
  };

  const TIME_OPTIONS = getTimeOptions();

  const isPastSelection = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return false;
    const selected = new Date(`${dateValue}T${timeValue}`);
    if (Number.isNaN(selected.getTime())) return false;
    return selected.getTime() < Date.now();
  };

  const buildStartDateTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return "";
    return `${dateValue}T${timeValue}`;
  };

  const formatReadableSlot = (startValue, durationMinutes) => {
    if (!startValue || !durationMinutes) return "";
    const start = new Date(startValue);
    if (Number.isNaN(start.getTime())) return "";

    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);

    const fmt = new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${fmt.format(start)} - ${fmt.format(end)} (${durationMinutes} min)`;
  };

  const fetchAreas = async () => {
    try {
      const data = await apiClient("/areas");
      setAreas(data);
      const defaultStartByArea = {};
      for (const area of data) {
        defaultStartByArea[area.id] = getDefaultBookingStart();
      }
      setBookingDateByArea((prev) => {
        const next = { ...prev };
        for (const area of data) {
          if (!next[area.id]) {
            next[area.id] = defaultStartByArea[area.id].date;
          }
        }
        return next;
      });
      setBookingTimeByArea((prev) => {
        const next = { ...prev };
        for (const area of data) {
          if (!next[area.id]) {
            next[area.id] = defaultStartByArea[area.id].time;
          }
        }
        return next;
      });
      setBookingDurationByArea((prev) => {
        const next = { ...prev };
        for (const area of data) {
          if (!next[area.id]) {
            next[area.id] = 60;
          }
        }
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    const interval = setInterval(fetchAreas, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const handleBook = async (areaId) => {
    setActionError("");
    setSuccessMsg("");
    setBookingInProgress((prev) => ({ ...prev, [areaId]: true }));

    const selectedDate = bookingDateByArea[areaId];
    const selectedTime = bookingTimeByArea[areaId];
    const selectedStart = buildStartDateTime(selectedDate, selectedTime);
    const selectedDuration = Number(bookingDurationByArea[areaId] || 60);

    if (!selectedStart) {
      setActionError("Seleziona un orario di inizio.");
      setBookingInProgress((prev) => ({ ...prev, [areaId]: false }));
      return;
    }

    if (isPastSelection(selectedDate, selectedTime)) {
      setActionError("L'orario di inizio deve essere nel futuro.");
      setBookingInProgress((prev) => ({ ...prev, [areaId]: false }));
      return;
    }

    try {
      await apiClient("/bookings", {
        method: "POST",
        body: {
          area_id: areaId,
          start_time: selectedStart,
          duration_minutes: selectedDuration,
        },
      });
      setSuccessMsg(
        "Prenotazione effettuata! La fascia selezionata e stata riservata.",
      );
      fetchAreas();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBookingInProgress((prev) => ({ ...prev, [areaId]: false }));
    }
  };

  if (loading) return <div>Caricamento aree disponibili...</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2>Aree parcheggio disponibili</h2>
      </div>

      {actionError && (
        <div
          className="badge badge-danger mb-4"
          style={{ display: "block", padding: "1rem" }}
        >
          {actionError}
        </div>
      )}
      {successMsg && (
        <div
          className="badge badge-success mb-4"
          style={{ display: "block", padding: "1rem" }}
        >
          {successMsg}
        </div>
      )}

      {areas.length === 0 ? (
        <div className="card text-center text-muted py-5">
          Nessuna area parcheggio configurata dall'amministratore.
        </div>
      ) : (
        <div className="grid">
          {areas.map((a) => {
            const isFull = a.available_capacity === 0;
            const utilization =
              ((a.max_capacity - a.available_capacity) / a.max_capacity) * 100;

            return (
              <div key={a.id} className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="flex items-center gap-2">
                    <MapPin size={20} color="var(--brand)" />
                    {a.name || a.id}
                  </h3>
                  <span
                    className={`badge ${isFull ? "badge-danger" : "badge-success"}`}
                  >
                    {isFull ? "PIENA" : "DISPONIBILE"}
                  </span>
                </div>

                <div className="card-content mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted">Posti disponibili</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                      {a.available_capacity}{" "}
                      <span
                        className="text-muted"
                        style={{ fontSize: "0.875rem" }}
                      >
                        / {a.max_capacity}
                      </span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "var(--border-color)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${utilization}%`,
                        height: "100%",
                        background: isFull
                          ? "var(--danger)"
                          : utilization > 80
                            ? "#f39c12"
                            : "var(--success)",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="card-footer">
                  <div style={{ width: "100%" }}>
                    <label
                      htmlFor={`date-${a.id}`}
                      style={{ fontSize: "0.875rem" }}
                    >
                      <span
                        className="flex items-center gap-2 text-muted"
                        style={{ marginBottom: "0.35rem" }}
                      >
                        <Clock size={16} /> Seleziona fascia oraria
                      </span>
                    </label>
                    <div
                      className="booking-controls"
                      style={{ width: "100%", marginBottom: "0.5rem" }}
                    >
                      <input
                        id={`date-${a.id}`}
                        type="date"
                        className="input booking-date"
                        min={toDateValue(new Date())}
                        value={bookingDateByArea[a.id] || ""}
                        onChange={(e) =>
                          setBookingDateByArea((prev) => ({
                            ...prev,
                            [a.id]: e.target.value,
                          }))
                        }
                      />
                      <select
                        className="input booking-time"
                        value={bookingTimeByArea[a.id] || ""}
                        onChange={(e) =>
                          setBookingTimeByArea((prev) => ({
                            ...prev,
                            [a.id]: e.target.value,
                          }))
                        }
                      >
                        {TIME_OPTIONS.map((option) => {
                          const isPast = isPastSelection(
                            bookingDateByArea[a.id],
                            option.value,
                          );
                          return (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={isPast}
                            >
                              {option.label}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        className="input booking-duration"
                        value={bookingDurationByArea[a.id] || 60}
                        onChange={(e) =>
                          setBookingDurationByArea((prev) => ({
                            ...prev,
                            [a.id]: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={30}>30 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                      <button
                        className="btn btn-primary booking-submit"
                        onClick={() => handleBook(a.id)}
                        disabled={bookingInProgress[a.id]}
                      >
                        {bookingInProgress[a.id]
                          ? "Prenotazione..."
                          : "Prenota posto"}
                      </button>
                    </div>
                    <div
                      className="text-muted"
                      style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}
                    >
                      Fascia selezionata:{" "}
                      {formatReadableSlot(
                        buildStartDateTime(
                          bookingDateByArea[a.id],
                          bookingTimeByArea[a.id],
                        ),
                        bookingDurationByArea[a.id] || 60,
                      ) || "Scegli data, ora e durata"}
                    </div>
                    {isFull && (
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}
                      >
                        Area attualmente piena. Puoi comunque provare a
                        prenotare una fascia oraria futura.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
