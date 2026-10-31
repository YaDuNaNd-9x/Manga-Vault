import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/client'
import Navbar from '../components/Navbar'

const GENRES = ['Action', 'Romance', 'Fantasy', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Slice of Life', 'Mystery', 'Adventure']

export default function Discover() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState('Action')

 useEffect(() => {
  let cancelled = false

  API.get(`/search?q=${encodeURIComponent(activeGenre)}`)
    .then(res => {
      if (!cancelled) setResults(res.data.results)
    })
    .catch(err => {
      if (!cancelled) {
        console.error(err)
        setResults([])
      }
    })
    .finally(() => {
      if (!cancelled) setLoading(false)
    })

  return () => {
    cancelled = true
  }
}, [activeGenre])

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-white mb-2">Discover</h2>
        <p className="text-gray-400 mb-6">Browse popular manga by genre</p>

        {/* Genre pills */}
        {/* Genre pills */}
<div className="flex flex-wrap gap-2 mb-8">
  {GENRES.map(genre => (
    <button
      key={genre}
      onClick={() => {
        if (genre !== activeGenre) {
          setLoading(true)
          setActiveGenre(genre)
        }
      }}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        activeGenre === genre
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      {genre}
    </button>
  ))}
</div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading {activeGenre} manga...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map(manga => (
              <Link key={manga.id} to={`/manga/${manga.id}`}
                className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all group">
                {manga.cover_image
                  ? <img src={manga.cover_image} alt={manga.title} className="w-full h-56 object-cover group-hover:opacity-90 transition-opacity" />
                  : <div className="w-full h-56 bg-gray-700 flex items-center justify-center"><span className="text-4xl">📚</span></div>
                }
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm truncate mb-1">{manga.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{manga.chapters ? `${manga.chapters} ch` : 'Ongoing'}</span>
                    {manga.average_score && <span className="text-yellow-400 text-xs">★ {manga.average_score}</span>}
                  </div>
                  {manga.genres?.slice(0,2).map(g => (
                    <span key={g} className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full mr-1 mt-1">{g}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}