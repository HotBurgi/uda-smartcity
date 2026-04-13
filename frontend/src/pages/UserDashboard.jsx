import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import { MapPin, Clock } from 'lucide-react';

export const UserDashboard = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAreas = async () => {
    try {
      const data = await apiClient('/areas');
      setAreas(data);
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
    setActionError('');
    setSuccessMsg('');
    try {
      await apiClient('/bookings', { method: 'POST', body: { area_id: areaId } });
      setSuccessMsg('Booking successful! Valid for 1 hour.');
      fetchAreas();
    } catch (e) {
      setActionError(e.message);
    }
  };

  if (loading) return <div>Loading available areas...</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2>Available Parking Areas</h2>
      </div>

      {actionError && <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '1rem' }}>{actionError}</div>}
      {successMsg && <div className="badge badge-success mb-4" style={{ display: 'block', padding: '1rem' }}>{successMsg}</div>}

      {areas.length === 0 ? (
        <div className="card text-center text-muted py-5">
          No parking areas configured by the admin yet.
        </div>
      ) : (
        <div className="grid">
          {areas.map(a => {
            const isFull = a.available_capacity === 0;
            const utilization = ((a.max_capacity - a.available_capacity) / a.max_capacity) * 100;
            
            return (
              <div key={a.id} className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="flex items-center gap-2">
                    <MapPin size={20} color="var(--brand)" />
                    {a.name || a.id}
                  </h3>
                  <span className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`}>
                    {isFull ? 'FULL' : 'AVAILABLE'}
                  </span>
                </div>
                
                <div className="card-content mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted">Available Spots</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                      {a.available_capacity} <span className="text-muted" style={{ fontSize: '0.875rem' }}>/ {a.max_capacity}</span>
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${utilization}%`, 
                      height: '100%', 
                      background: isFull ? 'var(--danger)' : (utilization > 80 ? '#f39c12' : 'var(--success)') 
                    }}></div>
                  </div>
                </div>
                
                <div className="card-footer">
                  <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.875rem' }}>
                    <Clock size={16} /> 1 Hour Limit
                  </span>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleBook(a.id)}
                    disabled={isFull}
                  >
                    Reserve Spot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
