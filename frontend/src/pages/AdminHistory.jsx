import { useState, useEffect } from 'react';
import { apiClient } from '../api';

export const AdminHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiClient('/admin/bookings');
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
      <h2 className="mb-4">Global Booking History</h2>
      
      {history.length === 0 ? (
        <div className="card text-center text-muted">No bookings found in the system.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>User</th>
                <th>Area</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map(b => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td><span className="badge badge-neutral bg-none border" style={{border: '1px solid var(--border-color)'}}>{b.username}</span></td>
                  <td>{b.area_name || b.area_id} <span className="text-muted text-sm">({b.area_id})</span></td>
                  <td>{new Date(b.start_time).toLocaleString()}</td>
                  <td>{new Date(b.end_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
