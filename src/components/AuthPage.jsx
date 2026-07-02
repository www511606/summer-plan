import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, LogIn } from 'lucide-react'
import { signUp, signIn } from '../lib/db'

export default function AuthPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState('child')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const data = await signIn(email, password)
        if (data.user) {
          navigate('/')
        }
      } else {
        if (!nickname.trim()) {
          setError('请输入昵称')
          setLoading(false)
          return
        }
        await signUp(email, password, role, nickname)
        setError('注册成功！请登录。')
        setIsLogin(true)
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fef7f0 0%, #fff1e6 50%, #fce7f3 100%)' }}>
      <div className="w-full max-w-md fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}>
            <span className="text-white text-3xl">📋</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#1e293b' }}>暑假学习计划</h1>
          <p className="mt-2" style={{ color: '#64748b', fontSize: '15px' }}>每天进步一点点 ✨</p>
        </div>

        {/* 卡片 */}
        <div className="rounded-2xl shadow-lg p-8" style={{ background: '#ffffff' }}>
          {/* 切换 */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: '#f8fafc' }}>
            <button
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isLogin ? 'text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={isLogin ? { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}
              onClick={() => { setIsLogin(true); setError('') }}
            >
              <LogIn className="inline w-4 h-4 mr-1" />
              登录
            </button>
            <button
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isLogin ? 'text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={!isLogin ? { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}
              onClick={() => { setIsLogin(false); setError('') }}
            >
              <UserPlus className="inline w-4 h-4 mr-1" />
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* 昵称 */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>昵称</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="叫什么名字呀？"
                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    style={{ borderColor: '#e5e7eb', color: '#1e293b' }}
                    required={!isLogin}
                  />
                </div>

                {/* 角色选择 */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>我是</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        role === 'child'
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                      onClick={() => setRole('child')}
                    >
                      👧 小朋友
                    </button>
                    <button
                      type="button"
                      className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        role === 'parent'
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                      onClick={() => setRole('parent')}
                    >
                      👨‍👩‍👧 家长
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                style={{ borderColor: '#e5e7eb', color: '#1e293b' }}
                required
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位密码"
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                style={{ borderColor: '#e5e7eb', color: '#1e293b' }}
                minLength={6}
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-center py-2.5 rounded-xl" style={{
                background: error.includes('成功') ? '#f0fdf4' : '#fef2f2',
                color: error.includes('成功') ? '#16a34a' : '#dc2626',
              }}>
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              style={{ background: loading ? '#fdba74' : 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          {/* 提示 */}
          <p className="text-xs text-center mt-6 leading-relaxed" style={{ color: '#94a3b8' }}>
            💡 首次使用请先注册。<br/>
            注册后家长创建学习计划，孩子登录查看和执行。
          </p>
        </div>
      </div>
    </div>
  )
}
