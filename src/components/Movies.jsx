import { useState, useEffect } from 'react';
import MediaCard from '../components/MediaCard';
import { getMovies } from '../../services/mediaService';

export default function Movies() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    getMovies()
      .then(data => setMovies(data.filter(m => m.type === 'movie')))
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