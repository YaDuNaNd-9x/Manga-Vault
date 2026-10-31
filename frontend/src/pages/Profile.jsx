import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth'
import API from '../api/client'
import Navbar from '../components/Navbar'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#ef4444']

const DEFAULT_BANNER = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKBUDDS6L.jpg'

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, login } = useAuth()
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState([])
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null)
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || DEFAULT_BANNER)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  useEffect(() => {
    // Fetch fresh user data to get saved avatar/banner
    API.get('/auth/me').then(res => {
      if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url)
      if (res.data.banner_url) setBannerUrl(res.data.banner_url)
    }).catch(() => {})

    Promise.all([
      API.get('/stats/me'),
      API.get('/reviews/user/me'),
      API.get('/library')
    ])
      .then(([statsRes, reviewsRes, libraryRes]) => {
        setStats(statsRes.data)
        setReviews(reviewsRes.data)
        setLibrary(libraryRes.data)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }
    setUploadingAvatar(true)
    try {
      const base64 = await imageToBase64(file)
    await API.patch('/auth/me/update', { avatar_url: base64 })
      setAvatarUrl(base64)
      // Update auth context with new avatar
      const token = localStorage.getItem('token')
      login(token, { ...user, avatar_url: base64 })
    } catch (err) {
      console.error(err)
      alert('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Banner must be under 5MB')
      return
    }
    setUploadingBanner(true)
    try {
      const base64 = await imageToBase64(file)
      await API.patch('/auth/me/update', { banner_url: base64 })
      setBannerUrl(base64)
    } catch (err) {
      console.error(err)
      alert('Failed to upload banner')
    } finally {
      setUploadingBanner(false)
    }
  }

  const pieData = stats ? Object.entries(stats.status_breakdown)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value })) : []

  const recentActivity = [...library]
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      {/* Banner */}
      <div className="relative h-52 overflow-hidden group">
        <img
          src={bannerUrl}
          alt="banner"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

        {/* Banner upload button */}
        <button
          onClick={() => bannerInputRef.current?.click()}
          disabled={uploadingBanner}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1.5"
        >
          {uploadingBanner ? '⏳ Uploading...' : '📷 Change Banner'}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end gap-5 -mt-12 mb-6">
          {/* Avatar with upload */}
          <div className="relative group flex-shrink-0 z-10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-24 h-24 rounded-full border-4 border-gray-900 object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-purple-600 rounded-full border-4 border-gray-900 flex items-center justify-center text-white text-4xl font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
            >
              {uploadingAvatar ? '...' : '📷'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="pb-2">
            <h1 className="text-2xl font-bold text-white">{user?.username}</h1>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-700">
          {['overview', 'library', 'statistics'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-medium text-sm capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading profile...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
                <div className="md:col-span-2">
                  <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500">No activity yet — start reading!</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                          {entry.cover_image
                            ? <img src={entry.cover_image} alt={entry.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                            : <div className="w-10 h-14 bg-gray-700 rounded-lg flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 text-sm">
                              <span className="text-white font-medium">{entry.status}</span>
                              {' — '}
                              <span className="text-purple-400">{entry.title}</span>
                            </p>
                            {entry.current_chapter > 0 && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                Ch. {entry.current_chapter}{entry.total_chapters ? ` / ${entry.total_chapters}` : ''}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            entry.status === 'Reading' ? 'bg-purple-900/50 text-purple-300' :
                            entry.status === 'Completed' ? 'bg-green-900/50 text-green-300' :
                            entry.status === 'Dropped' ? 'bg-red-900/50 text-red-300' :
                            'bg-blue-900/50 text-blue-300'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">Reading Status</h3>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {pieData.map((entry, i) => (
                          <div key={entry.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                              <span className="text-gray-400 text-sm">{entry.name}</span>
                            </div>
                            <span className="text-white font-bold text-sm">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Add manga to see your stats</p>
                  )}
                </div>
              </div>
            )}

            {/* LIBRARY TAB */}
            {activeTab === 'library' && (
              <div className="pb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {['Reading', 'Completed', 'Plan to Read', 'Dropped'].map((s, i) => (
                    <div key={s} className="bg-gray-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold" style={{ color: COLORS[i] }}>
                        {library.filter(e => e.status === s).length}
                      </p>
                      <p className="text-gray-400 text-sm">{s}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {library.map(entry => (
                    <div key={entry.id} className="bg-gray-800 rounded-xl overflow-hidden">
                      {entry.cover_image
                        ? <img src={entry.cover_image} alt={entry.title} className="w-full h-40 object-cover" />
                        : <div className="w-full h-40 bg-gray-700 flex items-center justify-center"><span className="text-3xl">📚</span></div>
                      }
                      <div className="p-2">
                        <p className="text-white text-xs font-medium truncate">{entry.title}</p>
                        <p className="text-gray-400 text-xs">Ch. {entry.current_chapter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STATISTICS TAB */}
            {activeTab === 'statistics' && (
              <div className="pb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Series', value: stats?.total_series ?? 0, color: 'text-purple-400' },
                    { label: 'Chapters Read', value: stats?.total_chapters_read ?? 0, color: 'text-blue-400' },
                    { label: 'Completion Rate', value: `${stats?.completion_rate ?? 0}%`, color: 'text-green-400' },
                    { label: 'Avg Rating', value: stats?.average_rating ?? '—', color: 'text-yellow-400' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-800 rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                      <p className="text-gray-400 text-sm mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>

                {reviews.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4">My Reviews</h3>
                    <div className="space-y-3">
                      {reviews.sort((a, b) => b.rating - a.rating).map((r, i) => (
                        <div key={r.id} className="flex items-center gap-4 bg-gray-700/50 rounded-xl p-3">
                          <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{r.title}</p>
                            {r.review_text && <p className="text-gray-400 text-xs truncate">{r.review_text}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5,6,7,8,9,10].map(s => (
                              <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                            ))}
                            <span className="text-white font-bold ml-1 text-sm">{r.rating}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}