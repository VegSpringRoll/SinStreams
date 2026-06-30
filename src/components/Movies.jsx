import { useState, useEffect } from 'react';
import axios from 'axios';
import MediaCard from '../components/MediaCard';

export default function Movies() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    // Use the proxy to avoid CORS issues
    axios.get("http://localhost:5000/api/media/movies")
      .then(res => setMovies(res.data.filter(m => m.type === 'movie')))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: '100px 32px', background: '#080c14', minHeight: '100vh' }}>
      <h1 style={{ color: '#e8eaf0', marginBottom: '30px' }}>All Movies</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
        {movies.map((movie, i) => (
          <MediaCard key={movie._id} media={movie} type="movie" index={i} />
        ))}
      </div>
    </div>
  );
}