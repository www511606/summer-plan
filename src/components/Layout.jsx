import { useState, useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LogOut, Calendar, Plus, BarChart3, Gift, Settings } from 'lucide-react'
import { supabase, ROLES } from '../lib/constants'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [points, setPoints] = useState(0)

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setUser(session.user)
        setProfile(p)
      } else {
        setUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/auth'); return }
    setUser(session.user)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(p)
    if (p) {
      const { data: pts } = await supabase.from('points').select('*').eq('user_id', session.user.id).single()
      setPoints(pts?.total_points || 0)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  if (!user) return null

  let isParent = profile?.role === ROLES.PARENT
  if (!isParent && profile?.role === ROLES.CHILD) {
    const email = (user.email || '').toLowerCase()
    isParent = email.includes('mom') || email.includes('parent') || email.includes('474513075')
  }

  const allNavItems = [
    { icon: Calendar, label: '计划', path: '/' },
    { icon: Plus, label: '新建', path: '/plan/create' },
    { icon: BarChart3, label: '统计', path: '/stats' },
    { icon: Gift, label: '奖励', path: '/rewards' },
    { icon: Settings, label: '设置', path: '/settings' },
  ]
  const navItems = isParent ? allNavItems : allNavItems.filter(n => n.path !== '/settings')

  return (
    <div className="min-h-screen" style={{ background: '#fef7f0' }}>
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <span className="text-lg font-bold" style={{ color: '#f97316' }}>暑假计划</span>
            {profile?.nickname && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                background: isParent ? '#dbeafe' : '#dcfce7',
                color: isParent ? '#1d4ed8' : '#15803d',
              }}>
                {isParent ? '👨‍👩‍👧 家长' : '👧 孩子'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {points > 0 && (
              <span className="text-sm font-medium" style={{ color: '#d97706' }}>⭐ {points}</span>
            )}
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#94a3b8' }}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 左侧导航 + 右侧内容 */}
      <div className="max-w-6xl mx-auto flex px-4 py-5 gap-6">
        {/* 左侧导航 */}
        <nav className="hidden sm:flex flex-col items-center gap-1 py-4 pr-4" style={{
          width: '72px',
          borderRight: '1px solid #f1f5f9',
          position: 'sticky',
          top: '80px',
          alignSelf: 'flex-start',
        }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-all"
                style={{
                  color: isActive ? '#f97316' : '#94a3b8',
                  ...(isActive ? { background: '#fff7ed' } : {}),
                }}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        {/* 右侧内容 */}
        <main className="flex-1 min-w-0 sm:max-w-2xl lg:max-w-3xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
