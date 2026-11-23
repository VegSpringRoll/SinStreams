import './App.css'
import Navbar from './components/Navbar'
import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Watch from './components/Watch'
import Movies from './components/Movies'
import MyList from './components/MyList'
import Series from './components/Series'
import Details from './components/details'
import LiveTV from './components/LiveTV'
import Anime from './components/Anime'
import History from './components/History'

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/series" element={<Series />} />
        <Route path="/anime" element={<Anime />} />
        <Route path="/live-tv" element={<LiveTV />} />
        <Route path="/history" element={<History />} />
        <Route path="/mylist" element={<MyList />} />
        <Route path="/details/:type/:id" element={<Details />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
      </Routes>
    </>
  )
}

export default App