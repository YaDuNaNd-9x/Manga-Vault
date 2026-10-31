import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import API from '../api/client'
import Navbar from '../components/Navbar'

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#ef4444']

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    Promise.all([
      API.get('/stats/me'),
      API.get('/reviews/user/me')
    ])
      .then(([statsRes, reviewsRes]) => {
        setStats(statsRes.data)
        setReviews(reviewsRes.data)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-purple-400 text-xl">Loading stats...</div>
    </div>
  )

  const pieData = stats ? Object.entries(stats.status_breakdown)
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({ name, value })) : []

  const sortedReviews = [...reviews].sort((a, b) =>
    sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating
  )

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-white mb-8">My Reading Stats</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Library Breakdown</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-gray-400 text-xs">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">Add manga to see your breakdown</div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {stats && Object.entries(stats.status_breakdown).map(([status, count], index) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-24">{status}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: stats.total_series > 0 ? `${(count/stats.total_series)*100}%` : '0%', backgroundColor: COLORS[index] }} />
                  </div>
                  <span className="text-white font-bold text-sm w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">
              My Rated Series
              <span className="text-gray-500 text-sm font-normal ml-2">({reviews.length} reviews)</span>
            </h3>
            {reviews.length > 1 && (
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </select>
            )}
          </div>
          {sortedReviews.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-3">⭐</p>
              <p>Rate series from the Update modal on your library cards</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReviews.map((review, index) => (
                <div key={review.id} className="flex items-center gap-4 bg-gray-700/50 rounded-xl p-4">
                  <span className="text-gray-500 text-sm w-6 text-center font-bold">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{review.title}</p>
                    {review.review_text && <p className="text-gray-400 text-xs mt-0.5 truncate">{review.review_text}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1,2,3,4,5,6,7,8,9,10].map(star => (
                      <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                    ))}
                    <span className="text-white font-bold ml-2">{review.rating}/10</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}