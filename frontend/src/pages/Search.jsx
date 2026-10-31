import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/client'
import Navbar from '../components/Navbar'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSuggestLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await API.get(`/search?q=${encodeURIComponent(query)}`)
        setSuggestions(res.data.results.slice(0, 6))
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setShowSuggestions(false)
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(query)}`)
      setResults(res.data.results)
    } catch {
      setError('Search failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title)
    setShowSuggestions(false)
    setResults([suggestion])
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-white mb-6">Search Manga</h2>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search for manga or manhwa..."
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {suggestLoading && <div className="px-4 py-2 text-gray-500 text-sm">Searching...</div>}
                {suggestions.map(s => (
                  <button key={s.id} type="button" onMouseDown={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left">
                    {s.cover_image
                      ? <img src={s.cover_image} alt={s.title} className="w-8 h-10 object-cover rounded flex-shrink-0" />
                      : <div className="w-8 h-10 bg-gray-600 rounded flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.title}</p>
                      <p className="text-gray-400 text-xs">
                        {s.format} · {s.chapters ? `${s.chapters} ch` : 'Ongoing'}
                        {s.average_score ? ` · ★ ${s.average_score}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {results.length > 0 && (
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
                  {manga.genres?.slice(0, 2).map(g => (
                    <span key={g} className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full mr-1 mt-1">{g}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && !showSuggestions && (
          <div className="text-center text-gray-400 py-20">No results found for "{query}"</div>
        )}

        {!query && results.length === 0 && (
          <div className="text-center text-gray-400 py-20">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-xl">Search for any manga or manhwa</p>
            <p className="text-sm mt-2">Powered by AniList — suggestions appear as you type</p>
          </div>
        )}
      </div>
    </div>
  )
}