import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/client'
import Navbar from '../components/Navbar'

const STATUSES = ['Reading', 'Completed', 'Plan to Read', 'Dropped']

function StarRating({ rating, onRate }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map(star => (
        <button key={star} onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className={`text-xl transition-colors ${star <= (hovered || rating) ? 'text-yellow-400' : 'text-gray-600'}`}>
          ★
        </button>
      ))}
      {rating > 0 && <span className="text-gray-400 text-sm ml-2 self-center">{rating}/10</span>}
    </div>
  )
}

function UpdateModal({ entry, onClose, onSave }) {
  const [chapter, setChapter] = useState(entry.current_chapter)
  const [status, setStatus] = useState(entry.status)
  const [saving, setSaving] = useState(false)
  const [isEditingChapter, setIsEditingChapter] = useState(false)
  const [inputValue, setInputValue] = useState(String(entry.current_chapter))
  const [totalChapters, setTotalChapters] = useState(entry.total_chapters)
  const [fetchingTotal, setFetchingTotal] = useState(false)
  const [dataSource, setDataSource] = useState('')
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [existingReview, setExistingReview] = useState(null)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => {
    setFetchingTotal(true)
    API.get(`/search/${entry.anilist_id}`)
      .then(anilistRes => {
        if (anilistRes.data.chapters) {
          setTotalChapters(anilistRes.data.chapters)
          setDataSource('AniList')
          setFetchingTotal(false)
        } else {
          API.get(`/mangadex/chapters/${encodeURIComponent(entry.title)}`)
            .then(mdRes => {
              if (mdRes.data.latest_chapter) {
                setTotalChapters(mdRes.data.latest_chapter)
                setDataSource('MangaDex')
              }
            })
            .catch(() => {})
            .finally(() => setFetchingTotal(false))
        }
      })
      .catch(() => setFetchingTotal(false))

    API.get('/reviews/user/me')
      .then(res => {
        const existing = res.data.find(r => r.anilist_id === entry.anilist_id)
        if (existing) {
          setExistingReview(existing)
          setRating(existing.rating)
          setNotes(existing.review_text || '')
        }
      })
      .catch(() => {})
  }, [entry.anilist_id, entry.title])

  const maxChapter = totalChapters || 99999

  const increment = () => { const v = Math.min(chapter+1,maxChapter); setChapter(v); setInputValue(String(v)) }
  const decrement = () => { const v = Math.max(chapter-1,0); setChapter(v); setInputValue(String(v)) }
  const handleInputChange = (e) => setInputValue(e.target.value)
  const handleInputBlur = () => {
    const parsed = parseInt(inputValue)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= maxChapter) { setChapter(parsed); setInputValue(String(parsed)) }
    else setInputValue(String(chapter))
    setIsEditingChapter(false)
  }
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') { setInputValue(String(chapter)); setIsEditingChapter(false) }
  }

  const handleSaveReview = async () => {
    if (rating === 0) return
    setSavingReview(true)
    try {
      if (existingReview) await API.delete(`/reviews/${existingReview.id}`)
      await API.post('/reviews/', { anilist_id: entry.anilist_id, title: entry.title, rating, review_text: notes || null })
      setReviewMessage('Review saved!')
      setTimeout(() => setReviewMessage(''), 2000)
    } catch { setReviewMessage('Failed to save review') }
    finally { setSavingReview(false) }
  }

  const handleSave = async () => {
  setSaving(true)

  try {
    const chapterToSave =
      status === 'Completed' && totalChapters
        ? totalChapters
        : chapter

    const res = await API.patch(
      `/library/${entry.id}/progress`,
      {
        current_chapter: chapterToSave,
        total_chapters: totalChapters,
        status
      }
    )

    onSave(res.data)
    onClose()

  } catch (err) {
    console.error('Failed to update manga:', err)
  } finally {
    setSaving(false)
  }
}

  const progressPercent = totalChapters ? Math.round((chapter / totalChapters) * 100) : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex gap-4 p-6 border-b border-gray-700">
          {entry.cover_image
            ? <img src={entry.cover_image} alt={entry.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0" />
            : <div className="w-16 h-24 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-2xl">📚</span></div>
          }
          <div className="flex flex-col justify-center">
            <h3 className="text-white font-bold text-lg leading-tight">{entry.title}</h3>
            <div className="mt-1">
              {fetchingTotal ? <span className="text-purple-400 text-xs">Fetching latest chapters...</span>
                : totalChapters ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm font-medium">{totalChapters} chapters available</span>
                    {dataSource && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">via {dataSource}</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">Total unknown — set manually:</span>
                    <input type="number" onChange={e => { const v = parseInt(e.target.value); setTotalChapters(isNaN(v)?null:v) }}
                      placeholder="e.g. 129" className="w-20 bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Chapter Progress <span className="text-gray-500 text-xs ml-1">(tap number to type)</span></label>
            <div className="flex items-center gap-4">
              <button onClick={decrement} disabled={chapter<=0} className="w-10 h-10 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-xl font-bold transition-colors flex items-center justify-center">−</button>
              <div className="flex-1 text-center">
                {isEditingChapter
                  ? <input type="number" value={inputValue} onChange={handleInputChange} onBlur={handleInputBlur} onKeyDown={handleInputKeyDown} min={0} max={maxChapter} autoFocus className="w-24 text-center bg-gray-700 text-white text-3xl font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  : <button onClick={() => { setIsEditingChapter(true); setInputValue(String(chapter)) }} className="text-white text-3xl font-bold hover:text-purple-400 transition-colors">{chapter}</button>
                }
                {totalChapters && <span className="text-gray-400 text-lg"> / {totalChapters}</span>}
              </div>
              <button onClick={increment} disabled={chapter>=maxChapter} className="w-10 h-10 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-xl font-bold transition-colors flex items-center justify-center">+</button>
            </div>
            {totalChapters && (
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${Math.min((chapter/totalChapters)*100,100)}%` }} />
                </div>
                <p className="text-gray-400 text-xs mt-1 text-right">{progressPercent}% complete</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="border-t border-gray-700 pt-5">
            <p className="text-gray-400 text-sm font-medium mb-4">Rating & Notes</p>
            <div className="mb-4">
              <label className="block text-gray-400 text-xs mb-2">Your Rating</label>
              <StarRating rating={rating} onRate={setRating} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-xs mb-2">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add your thoughts, favorite arcs, anything..."
                rows={3} className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder-gray-500" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveReview} disabled={rating===0||savingReview}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {savingReview ? 'Saving...' : existingReview ? 'Update Review' : 'Save Review'}
              </button>
              {rating === 0 && <span className="text-gray-500 text-xs">Select a rating first</span>}
              {reviewMessage && <span className="text-green-400 text-xs">{reviewMessage}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Saving...' : 'Update Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [library, setLibrary] = useState([])
  const [activeTab, setActiveTab] = useState('Reading')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState(null)

  useEffect(() => {
    API.get('/library')
      .then(res => setLibrary(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = (updatedEntry) => {
    setLibrary(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e))
  }

  const removeFromLibrary = async (entryId) => {
    if (!confirm('Remove from library?')) return
    try {
      await API.delete(`/library/${entryId}`)
      setLibrary(prev => prev.filter(e => e.id !== entryId))
    } catch (err) { console.error(err) }
  }

  const filtered = library.filter(e => e.status === activeTab)

  return (
    <div className="min-h-screen bg-gray-900">
      {selectedEntry && <UpdateModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} onSave={handleSave} />}
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">My Library</h2>
            <p className="text-gray-400 mt-1">{library.length} series tracked</p>
          </div>
          <Link to="/search" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            + Add Manga
          </Link>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {STATUSES.map(status => (
            <button key={status} onClick={() => setActiveTab(status)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${activeTab === status ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
              {status}
              <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                {library.filter(e => e.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading your library...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No manga in {activeTab}</p>
            <Link to="/search" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">Search and add some →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(entry => (
              <div key={entry.id} className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all">
                {entry.cover_image
                  ? <img src={entry.cover_image} alt={entry.title} className="w-full h-48 object-cover" />
                  : <div className="w-full h-48 bg-gray-700 flex items-center justify-center"><span className="text-gray-500 text-4xl">📚</span></div>
                }
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm truncate mb-1">{entry.title}</h3>
                  <p className="text-gray-400 text-xs mb-2">
                    Ch. {entry.current_chapter}{entry.total_chapters ? ` / ${entry.total_chapters}` : ''}
                  </p>
                  {entry.total_chapters && (
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-3">
                      <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${Math.min((entry.current_chapter/entry.total_chapters)*100,100)}%` }} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedEntry(entry)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 rounded-lg transition-colors">Update</button>
                    <button onClick={() => removeFromLibrary(entry.id)} className="bg-gray-700 hover:bg-red-800 text-gray-300 text-xs py-1.5 px-2 rounded-lg transition-colors">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}