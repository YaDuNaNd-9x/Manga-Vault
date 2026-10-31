import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api/client'
import Navbar from '../components/Navbar'

const STATUSES = ['Reading', 'Completed', 'Plan to Read', 'Dropped']

export default function MangaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [manga, setManga] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('Reading')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    API.get(`/search/${id}`)
      .then(res => setManga(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  const addToLibrary = async () => {
    setAdding(true)
    try {
      await API.post('/library/add', {
        anilist_id: manga.id,
        title: manga.title,
        cover_image: manga.cover_image,
        status,
        current_chapter: 0,
        total_chapters: manga.chapters || null
      })
      setAdded(true)
      setMessage(`Added to ${status}!`)
    } catch (err) {
      setMessage(err.response?.data?.detail === 'Already in your library'
        ? 'Already in your library!'
        : 'Failed to add. Try again.')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-purple-400 text-xl">Loading...</div>
    </div>
  )

  if (!manga) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-red-400 text-xl">Manga not found</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900">
      {manga.banner_image && (
        <div className="h-48 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${manga.banner_image})` }} />
      )}

      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
          ← Back
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            {manga.cover_image
              ? <img src={manga.cover_image} alt={manga.title} className="w-48 h-72 object-cover rounded-xl shadow-2xl" />
              : <div className="w-48 h-72 bg-gray-700 rounded-xl flex items-center justify-center"><span className="text-5xl">📚</span></div>
            }
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{manga.title}</h1>
            {manga.title_romaji && manga.title_romaji !== manga.title && (
              <p className="text-gray-400 mb-4">{manga.title_romaji}</p>
            )}

            <div className="flex flex-wrap gap-4 mb-6">
              {manga.average_score && (
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-yellow-400 font-bold">★ {manga.average_score}</span>
                  <span className="text-gray-400 text-sm ml-1">/ 100</span>
                </div>
              )}
              {manga.chapters && (
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-white font-bold">{manga.chapters}</span>
                  <span className="text-gray-400 text-sm ml-1">chapters</span>
                </div>
              )}
              {manga.status && (
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className={`font-bold ${manga.status === 'FINISHED' ? 'text-green-400' : 'text-blue-400'}`}>
                    {manga.status}
                  </span>
                </div>
              )}
              {manga.format && (
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-gray-300">{manga.format}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {manga.genres?.map(g => (
                <span key={g} className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-700">{g}</span>
              ))}
            </div>

            <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={addToLibrary} disabled={adding || added}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                {adding ? 'Adding...' : added ? '✓ Added!' : '+ Add to Library'}
              </button>
              {message && <span className={`text-sm ${added ? 'text-green-400' : 'text-red-400'}`}>{message}</span>}
            </div>

            {manga.description && (
              <div>
                <h3 className="text-white font-semibold mb-2">Synopsis</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {manga.description.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            )}
          </div>
        </div>

        {manga.tags?.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white font-semibold mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {manga.tags.map(tag => (
                <span key={tag} className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs border border-gray-700">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}