"use client"

import { useState, useEffect } from 'react'
import { User, LogOut, Mail, Info, Loader2, Settings as SettingsIcon, Bug, Plus, Minus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/hooks/useSettings'
import { useFocusedCountry } from '@/hooks/useFocusedCountry'
import { triggerCountriesRefetch } from '@/hooks/useCountries'

export function AuthProfile() {
  const [session, setSession] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')

  const { settings, updateSettings } = useSettings()
  const focusedCountry = useFocusedCountry()

  // ── Debug population controls ──────────────────────────────────────────────
  const [debugAmount, setDebugAmount] = useState(1)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugMsg, setDebugMsg] = useState('')

  const adjustPopulation = async (delta: number) => {
    if (!focusedCountry) return
    setDebugLoading(true)
    setDebugMsg('')
    const newPop = Math.max(0, focusedCountry.population + delta)

    console.log('[DEBUG] adjustPopulation →', {
      id: focusedCountry.id,
      idType: typeof focusedCountry.id,
      currentPop: focusedCountry.population,
      delta,
      newPop,
    })

    const { data, error } = await supabase.rpc('debug_set_population', {
      target_country_id: focusedCountry.id,
      new_population: newPop,
    })

    console.log('[DEBUG] RPC response →', { data, error })

    if (error) {
      setDebugMsg(`Error: ${error.message}`)
    } else {
      triggerCountriesRefetch()   // force Scene to re-render with fresh population
      setDebugMsg(`${delta > 0 ? '+' : ''}${delta} → ${newPop.toLocaleString()}`)
      setTimeout(() => setDebugMsg(''), 2000)
    }
    setDebugLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setIsGoogleLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsEmailLoading(true)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      })
      if (error) throw error
      setMessage('Check your email for the login link!')
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
  }

  // Get user initial or avatar
  const userInitials = session?.user?.email?.charAt(0).toUpperCase() || '?'
  const avatarUrl = session?.user?.user_metadata?.avatar_url

  return (
    <div className="fixed top-4 right-4 z-50 flex items-start gap-4">
      {/* Settings Modal Setup */}
      <div className="relative">
        <button
          onClick={() => {
            setIsSettingsOpen(!isSettingsOpen)
            if (isOpen) setIsOpen(false)
          }}
          className="w-12 h-12 rounded-full backdrop-blur-md bg-black/40 border-2 border-cyan-500/50 hover:border-cyan-400 transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]"
        >
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
        </button>

        {isSettingsOpen && (
          <div className="absolute top-16 right-0 w-72 backdrop-blur-xl bg-gray-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-2xl text-white">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 mb-4">
              System Settings
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-cyan-50">Experimental WebGPU</div>
                  <div className="text-xs text-gray-400">Use next-gen 3D graphics (may be unstable)</div>
                </div>
                <button
                  onClick={() => updateSettings({ webgpu: !settings.webgpu })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.webgpu ? 'bg-cyan-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.webgpu ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-cyan-50">FPS Counter</div>
                  <div className="text-xs text-gray-400">Display performance metrics</div>
                </div>
                <button
                  onClick={() => updateSettings({ showFps: !settings.showFps })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.showFps ? 'bg-cyan-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.showFps ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* ── Debug: Population Control (shown when a country is focused) ── */}
            {focusedCountry && (
              <div className="mt-2 pt-4 border-t border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Debug: Population</span>
                </div>
                <div className="text-xs text-gray-400 mb-2 truncate">
                  <span className="text-yellow-300 font-mono">{focusedCountry.name}</span>
                  {' '}&mdash; current:{' '}
                  <span className="text-white font-bold">{focusedCountry.population.toLocaleString()}</span>
                </div>

                {/* Amount selector */}
                <div className="flex gap-1 mb-2 flex-wrap">
                  {[1, 5, 10, 50, 100, 500, 1000].map(n => (
                    <button
                      key={n}
                      onClick={() => setDebugAmount(n)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                        debugAmount === n
                          ? 'bg-yellow-500 text-black font-bold'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {n.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Add / Remove buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => adjustPopulation(-debugAmount)}
                    disabled={debugLoading || focusedCountry.population === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
                    Remove
                  </button>
                  <button
                    onClick={() => adjustPopulation(debugAmount)}
                    disabled={debugLoading}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    {debugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add
                  </button>
                </div>

                {debugMsg && (
                  <div className="mt-2 text-[10px] font-mono text-center text-yellow-300 bg-yellow-500/10 rounded px-2 py-1">
                    {debugMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Setup */}
      <div className="relative">
        {/* Profile Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            if (isSettingsOpen) setIsSettingsOpen(false)
          }}
        className="w-12 h-12 rounded-full backdrop-blur-md bg-black/40 border-2 border-cyan-500/50 hover:border-cyan-400 transition-colors flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.5)]"
      >
        {session ? (
          avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-cyan-400 font-bold text-lg">{userInitials}</span>
          )
        ) : (
          <User className="w-6 h-6 text-cyan-400" />
        )}
      </button>

      {/* Auth Modal / Dropdown */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-80 backdrop-blur-xl bg-gray-900/90 border border-cyan-500/30 rounded-xl p-6 shadow-2xl text-white">
          {session ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-4 border-b border-cyan-500/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-cyan-500/50" />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-cyan-500/50 flex items-center justify-center bg-cyan-950/50">
                    <span className="text-cyan-400 font-bold">{userInitials}</span>
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate text-cyan-50">{session.user.user_metadata?.full_name || 'Cyber Citizen'}</p>
                  <p className="text-xs text-cyan-400/80 truncate">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full py-2.5 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                  Access Portal
                </h3>
                <p className="text-xs text-gray-400 mt-1">Authenticate to access global systems.</p>
              </div>

              {message && (
                <div className="flex items-start gap-2 text-xs p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  <Info className="w-4 h-4 shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 font-medium disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-cyan-500/30 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isEmailLoading || !email}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Magic Link</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
