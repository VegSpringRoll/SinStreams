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
function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/mylist" element={<MyList />} />
        <Route path="/details/:type/:id" element={<Details />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/series" element={<Series />} />
        <Route path="/live-tv" element={<LiveTV />} />
      </Routes>
    </>
  )
}

export default App