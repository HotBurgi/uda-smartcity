import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../api";
import { MapPin, Clock } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

const toDateValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTimeValue = (date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getDefaultBookingStart = () => {
  // Arrotonda al prossimo slot da 30 minuti.
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

// Dashboard utente: mostra disponibilita aree e form di prenotazione.
export const UserDashboard = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bookingDateByArea, setBookingDateByArea] = useState({});
  const [bookingTimeByArea, setBookingTimeByArea] = useState({});
  const [bookingDurationByArea, setBookingDurationByArea] = useState({});
  const [bookingInProgress, setBookingInProgress] = useState({});
  const [slotAvailabilityByArea, setSlotAvailabilityByArea] = useState({});
  const [slotLoadingByArea, setSlotLoadingByArea] = useState({});
  const [nowTs, setNowTs] = useState(() => Date.now());

  const getTimeOptions = () => {
    // Genera opzioni orarie giornaliere (step 30 minuti).
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
    // Verifica che la data/ora scelta non sia nel passato.
    if (!dateValue || !timeValue) return false;
    const selected = new Date(`${dateValue}T${timeValue}`);
    if (Number.isNaN(selected.getTime())) return false;
    return selected.getTime() < nowTs;
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

  const fetchAreas = useCallback(async () => {
    try {
      const data = await apiClient("/areas");
      setAreas(data);
      // Inizializza valori di default solo per aree non ancora presenti nello stato locale.
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
  }, []);

  useEffect(() => {
    // Refresh periodico per aggiornare la disponibilita in tempo reale.
    const initialTimerId = setTimeout(() => {
      void fetchAreas();
    }, 0);
    const interval = setInterval(() => {
      void fetchAreas();
    }, 30000); // 30s refresh
    return () => {
      clearTimeout(initialTimerId);
      clearInterval(interval);
    };
  }, [fetchAreas]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Ricalcola la disponibilita per la fascia selezionata ogni volta che cambia data/ora/durata.
    if (areas.length === 0) return;

    let cancelled = false;

    const fetchSelectedSlotAvailability = async () => {
      await Promise.all(
        areas.map(async (area) => {
          const selectedDate = bookingDateByArea[area.id];
          const selectedTime = bookingTimeByArea[area.id];
          const selectedDuration = Number(bookingDurationByArea[area.id] || 60);
          const selectedStart = buildStartDateTime(selectedDate, selectedTime);

          if (!selectedStart) {
            if (!cancelled) {
              setSlotAvailabilityByArea((prev) => ({
                ...prev,
                [area.id]: null,
              }));
              setSlotLoadingByArea((prev) => ({
                ...prev,
                [area.id]: false,
              }));
            }
            return;
          }

          if (!cancelled) {
            setSlotLoadingByArea((prev) => ({
              ...prev,
              [area.id]: true,
            }));
          }

          try {
            const params = new URLSearchParams({
              start_time: selectedStart,
              duration_minutes: String(selectedDuration),
            });
            const data = await apiClient(`/areas?${params.toString()}`);
            const selectedAreaData = Array.isArray(data)
              ? data.find((row) => row.id === area.id)
              : null;
            if (!cancelled) {
              setSlotAvailabilityByArea((prev) => ({
                ...prev,
                [area.id]: selectedAreaData || null,
              }));
            }
          } catch {
            if (!cancelled) {
              setSlotAvailabilityByArea((prev) => ({
                ...prev,
                [area.id]: null,
              }));
            }
          } finally {
            if (!cancelled) {
              setSlotLoadingByArea((prev) => ({
                ...prev,
                [area.id]: false,
              }));
            }
          }
        }),
      );
    };

    fetchSelectedSlotAvailability();

    return () => {
      cancelled = true;
    };
  }, [areas, bookingDateByArea, bookingTimeByArea, bookingDurationByArea]);

  const handleBook = async (areaId) => {
    // Crea una prenotazione per l'area selezionata con data/ora e durata scelte.
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
      await fetchAreas();
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
            const slotAvailability = slotAvailabilityByArea[a.id];
            const selectedAvailable =
              slotAvailability?.available_capacity ?? a.available_capacity;
            const maxCap =
              a.max_capacity && a.max_capacity > 0 ? a.max_capacity : 1;
            const isFull = selectedAvailable === 0;
            const rawUtilization =
              ((maxCap - selectedAvailable) / maxCap) * 100;
            const utilization = Math.max(
              0,
              Math.min(100, Math.max(rawUtilization, 0)),
            ); // Ensure between 0-100

            // Per far si che un parcheggio vuoto mostri un minimo di verde, possiamo mostrare una barra vuota o 1%
            const displayUtilization = utilization > 0 ? utilization : 2;

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
                      {selectedAvailable}{" "}
                      <span
                        className="text-muted"
                        style={{ fontSize: "0.875rem" }}
                      >
                        / {a.max_capacity}
                      </span>
                    </span>
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                    {slotLoadingByArea[a.id]
                      ? "Calcolo disponibilita fascia selezionata..."
                      : "Disponibilita per data/ora selezionate"}
                  </div>

                  {/* Barra di utilizzo area */}
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
                        width: `${displayUtilization}%`,
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
