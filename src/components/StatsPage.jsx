import { useState, useEffect } from 'react'
import { BarChart3, Award, Flame } from 'lucide-react'
import { supabase } from '../lib/constants'

export default function StatsPage() {
  const [stats, setStats] = useState({
    totalTasks: 0, completedTasks: 0, totalPoints: 0, streak: 0,
    todayCompleted: 0, todayTotal: 0, subjectStats: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: pts } = await supabase.from('points').select('*').eq('user_id', user.id).single()
      const { data: tasks } = await supabase.from('tasks').select('*, plan:plans(subject)').eq('user_id', user.id)
      const allTasks = tasks || []
      const completed = allTasks.filter(t => t.status === 'completed')
      const today = new Date().toISOString().split('T')[0]
      const todayTasks = allTasks.filter(t => t.due_date === today)
      const todayCompleted = todayTasks.filter(t => t.status === 'completed').length

      let streak = 0
      const dates = [...new Set(allTasks.filter(t => t.status === 'completed').map(t => t.due_date))].sort().reverse()
      let checkDate = new Date()
      for (let i = 0; i < dates.length; i++) {
        if (dates.includes(checkDate.toISOString().split('T')[0])) { streak++; checkDate.setDate(checkDate.getDate() - 1) }
        else break
      }

      const subjectMap = {}
      allTasks.forEach(t => {
        const subj = t.plan?.subject || 'other'
        if (!subjectMap[subj]) subjectMap[subj] = { total: 0, completed: 0 }
        subjectMap[subj].total++
        if (t.status === 'completed') subjectMap[subj].completed++
      })
      const subjectStats = Object.entries(subjectMap).map(([key, val]) => ({
        subject: key, ...val, rate: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
      }))

      setStats({ totalTasks: allTasks.length, completedTasks: completed.length, totalPoints: pts?.total_points || 0, streak, todayCompleted, todayTotal: todayTasks.length, subjectStats })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const overallRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
  const sc = { chinese: '#ef4444', math: '#f59e0b', english: '#3b82f6', calligraphy: '#8b5cf6', reading: '#22c55e', exercise: '#f97316', other: '#64748b' }
  const sl = { chinese: '语文', math: '数学', english: '英语', calligraphy: '书法', reading: '阅读', exercise: '运动', other: '其他' }

  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-5" style={{ color: '#1e293b' }}>📊 学习统计</h1>

      {loading ? (
        <div className="text-center py-12" style={{ color: '#94a3b8' }}>加载中...</div>
      ) : (
        <>
          {/* 概览卡片 */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { icon: '📋', value: stats.totalTasks, label: '总任务', color: '#64748b' },
              { icon: '✅', value: stats.completedTasks, label: '已完成', color: '#22c55e' },
              { icon: '⭐', value: stats.totalPoints, label: '积分', color: '#f59e0b' },
              { icon: '🔥', value: stats.streak, label: '连续天数', color: '#f97316' },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl p-4 text-center shadow-sm" style={{ background: '#ffffff' }}>
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* 今日完成 */}
          {stats.todayTotal > 0 && (
            <div className="rounded-2xl p-5 mb-5 shadow-sm" style={{ background: '#ffffff' }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>今日完成</p>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#g)" strokeWidth="3" strokeDasharray={`${stats.todayCompleted / stats.todayTotal * 100}, 100`} strokeLinecap="round" />
                    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{stats.todayCompleted}/{stats.todayTotal}</span>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: '#f97316' }}>{overallRate}%</div>
                  <div className="text-sm" style={{ color: '#94a3b8' }}>总体完成率</div>
                </div>
              </div>
            </div>
          )}

          {/* 各科统计 */}
          {stats.subjectStats.length > 0 && (
            <div className="rounded-2xl p-5 mb-5 shadow-sm" style={{ background: '#ffffff' }}>
              <p className="text-sm font-medium mb-4" style={{ color: '#374151' }}>各科完成度</p>
              <div className="space-y-4">
                {stats.subjectStats.map(item => (
                  <div key={item.subject}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium" style={{ color: '#374151' }}>{sl[item.subject] || item.subject}</span>
                      <span style={{ color: '#94a3b8' }}>{item.completed}/{item.total} ({item.rate}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2.5" style={{ background: '#f1f5f9' }}>
                      <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${item.rate}%`, background: sc[item.subject] || '#64748b' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 成就 */}
          <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}>
            <p className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#92400e' }}>
              <Award className="w-4 h-4" />成就墙
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '🌱', name: '初次尝试', desc: '完成1个任务', cond: stats.totalTasks >= 1 },
                { emoji: '📚', name: '学习达人', desc: '完成10个任务', cond: stats.completedTasks >= 10 },
                { emoji: '🏆', name: '超级学霸', desc: '完成30个任务', cond: stats.completedTasks >= 30 },
                { emoji: '🔥', name: '坚持不懈', desc: '连续3天', cond: stats.streak >= 3 },
                { emoji: '💪', name: '一周全勤', desc: '连续7天', cond: stats.streak >= 7 },
                { emoji: '💎', name: '积分达人', desc: '100积分', cond: stats.totalPoints >= 100 },
              ].map((a, i) => (
                <div key={i} className="text-center p-3 rounded-xl transition-all" style={{ background: a.cond ? '#ffffff' : 'rgba(255,255,255,0.5)', opacity: a.cond ? 1 : 0.5 }}>
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: '#374151' }}>{a.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
