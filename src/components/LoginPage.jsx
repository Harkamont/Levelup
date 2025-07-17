import { useState } from 'react'
import { supabase } from '../lib/supabase'

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  console.log('LoginPage rendering')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('로그인 시도:', { username, password })

    try {
      // username과 password로 사용자 검색 - 모든 필드 가져오기
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      console.log('Supabase 응답:', { userProfile, profileError })

      if (profileError || !userProfile) {
        console.log('로그인 실패:', profileError)
        setError('사용자명 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 사용자 객체 생성 - 실제 존재하는 필드만 포함
      const user = {
        id: userProfile.id,
        username: userProfile.username,
        name: userProfile.name || userProfile.username,
        role: userProfile.role,
        grade: userProfile.grade || null,
        group: userProfile.group || null,
        church: userProfile.church || null,
        current_talent: userProfile.current_talent || 0,
        max_talent: userProfile.max_talent || 0,
        talent: userProfile.talent || 0
      }

      console.log('로그인 성공:', user)
      onLogin(user, userProfile.role)
    } catch (err) {
      console.error('로그인 에러:', err)
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#21AFE6] relative overflow-hidden">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: 'url(/background.png)' }}
      />

      {/* 퍼즐 모양 장식 요소들 */}
      <div className="absolute top-16 left-8 w-12 h-12 bg-[#EC6034] opacity-30 rounded-lg transform rotate-12 puzzle-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute top-32 right-12 w-8 h-8 bg-[#EC6034] opacity-25 rounded-md transform -rotate-45 puzzle-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-32 right-8 w-10 h-10 bg-[#EC6034] opacity-35 rounded-lg transform rotate-12 puzzle-float" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-48 left-12 w-14 h-14 bg-[#EC6034] opacity-20 rounded-xl transform -rotate-12 puzzle-float" style={{ animationDelay: '1.5s' }}></div>

      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-[#EC6034] rounded-3xl p-8 shadow-2xl border-4 border-white/20 backdrop-blur-sm">
            {/* 로고 영역 */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
                <div className="text-4xl">🧩</div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Level Up</h1>
              <p className="text-white/80 text-sm">2025 청소년 여름 수련회</p>
              <p className="text-white/80 text-sm">달란트 관리 시스템</p>
            </div>



            {/* 로그인 폼 */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="사용자명 (한글)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/50 text-lg"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/50 text-lg"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-300 rounded-2xl p-3">
                  <p className="text-white text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#EC6034] py-4 rounded-2xl font-bold text-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            {/* 퍼즐 장식 */}
            <div className="flex justify-center mt-6 space-x-2">
              <div className="w-3 h-3 bg-white/30 rounded-sm transform rotate-45"></div>
              <div className="w-3 h-3 bg-white/30 rounded-sm transform rotate-12"></div>
              <div className="w-3 h-3 bg-white/30 rounded-sm transform -rotate-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage