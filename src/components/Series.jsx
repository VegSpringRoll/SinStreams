import { useState, useEffect } from 'react';
import axios from 'axios';
import MediaCard from '../components/MediaCard';
import { getShows } from '../../services/mediaService';
export default function Series() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call the new backend route
    axios.get("http://localhost:5000/api/media/series")
      .then(res => {
        setSeries(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Series Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
  getShows().then(data => setSeries(data));
}, []);

  return (
    <div style={{ padding: '100px 32px', background: '#080c14', minHeight: '100vh' }}>
      <h1 style={{ color: '#e8eaf0', marginBottom: '30px' }}>Trending Series</h1>
      
      {loading ? (
        <p style={{ color: '#8892a4' }}>Loading shows...</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: '20px' 
        }}>
          {series.map((show, i) => (
            <MediaCard 
              key={show._id} 
              media={show} 
              type="series" 
              index={i} 
            />
          ))}
        </div>
      )}
    </div>
  );
}