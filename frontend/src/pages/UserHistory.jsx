import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import { Clock } from 'lucide-react';

export const UserHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiClient('/bookings/my_history');
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div>Loading history...</div>;

  return (
    <>
      <h2 className="mb-4">My Bookings History</h2>
      
      {history.length === 0 ? (
        <div className="card text-center text-muted">You have no booking history.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Area Name</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(b => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{b.area_name || b.area_id}</td>
                  <td>{new Date(b.start_time).toLocaleString()}</td>
                  <td>{new Date(b.end_time).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${b.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                      {b.status}
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
