import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ArrowLeft } from "lucide-react";

// Registra i componenti Chart.js usati nel grafico a barre.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export const AdminTrends = () => {
  // Pagina trend: mostra l'andamento prenotazioni area negli ultimi 30 giorni.
  const { areaId } = useParams();
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ricarica i dati quando cambia l'ID area nella route.
    const fetchTrends = async () => {
      try {
        const data = await apiClient(`/admin/areas/${areaId}/trends`);
        setTrends(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [areaId]);

  if (loading) return <div>Caricamento trend...</div>;

  const data = {
    // Trasforma i dati API nel formato richiesto da react-chartjs-2.
    labels: trends.map((t) =>
      new Date(t.date).toLocaleDateString("it-IT", {
        month: "short",
        day: "numeric",
      }),
    ),
    datasets: [
      {
        label: "Prenotazioni giornaliere",
        data: trends.map((t) => t.count),
        backgroundColor: "rgba(139, 92, 246, 0.7)",
        borderColor: "hsl(265, 89%, 66%)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    // Configurazione visuale del grafico.
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "hsl(0, 0%, 98%)" } },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: "hsl(220, 10%, 65%)" },
        grid: { color: "hsl(220, 20%, 20%)" },
      },
      x: {
        ticks: { color: "hsl(220, 10%, 65%)", maxTicksLimit: 15 },
        grid: { display: false },
      },
    },
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/admin"
          className="btn btn-outline"
          style={{ padding: "0.5rem", borderRadius: "50%" }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h2>
          Trend prenotazioni 30 giorni:{" "}
          <span className="text-brand">{areaId}</span>
        </h2>
      </div>

      <div className="card" style={{ height: "500px", padding: "2rem" }}>
        <Bar options={options} data={data} />
      </div>
    </>
  );
};
