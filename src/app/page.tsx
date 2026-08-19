"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password mode states
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      if (rememberMe) {
        localStorage.setItem("token", data.token);
      } else {
        sessionStorage.setItem("token", data.token);
        localStorage.setItem("token", data.token);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reset request failed");
      }

      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#090d16] relative overflow-hidden text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Dynamic Dark & Light Aesthetic Gradient Background Meshes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Base multi-stop atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#070b14] via-[#0f172a] to-[#1e1b4b] opacity-95" />
        
        {/* Luminous Light Aura 1: Top-Left Cyan/Sky Glow */}
        <div className="absolute -top-24 -left-24 w-[550px] h-[550px] bg-gradient-to-br from-sky-400/25 via-blue-500/20 to-transparent rounded-full blur-[100px] animate-pulse duration-1000" />
        
        {/* Luminous Light Aura 2: Top-Right Violet/Indigo Light */}
        <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/25 via-purple-600/15 to-transparent rounded-full blur-[120px]" />
        
        {/* Luminous Light Aura 3: Center-Bottom Subtle Blue Ambient Spotlight */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-t from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-[130px]" />

        {/* Ambient Radial Spotlight Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(7,11,20,0.6)_100%)]" />

        {/* Minimalist delicate dot matrix pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Main Split Container Card with High-End Elevated Shadows */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6),0_0_50px_rgba(59,130,246,0.12)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] relative z-10 border border-white/40">
        
        {/* LEFT COLUMN: Modern Branded Artwork */}
        <div className="lg:col-span-6 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Topographical & Geometric Vector Patterns */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
              <path
                d="M 100 0 Q 300 200 100 400 T 100 800"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M 250 0 Q 450 200 250 400 T 250 800"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M 400 0 Q 600 200 400 400 T 400 800"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M 550 0 Q 750 200 550 400 T 550 800"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
              {/* Dot Grid */}
              <g fill="white" opacity="0.6">
                <circle cx="650" cy="80" r="3" />
                <circle cx="680" cy="80" r="3" />
                <circle cx="710" cy="80" r="3" />
                <circle cx="650" cy="110" r="3" />
                <circle cx="680" cy="110" r="3" />
                <circle cx="710" cy="110" r="3" />
                <circle cx="650" cy="140" r="3" />
                <circle cx="680" cy="140" r="3" />
                <circle cx="710" cy="140" r="3" />
                <circle cx="650" cy="170" r="3" />
                <circle cx="680" cy="170" r="3" />
                <circle cx="710" cy="170" r="3" />
              </g>
            </svg>
          </div>

          {/* Glowing gradient sphere */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Left Header Brand Badge & Welcome Text */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide text-blue-100 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>TCE Enterprise Ecosystem</span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back!
            </h2>
            <p className="text-blue-100/80 text-sm sm:text-base mt-4 leading-relaxed max-w-md font-normal">
              You can sign in to access and manage your Technicool Engineering operations, inventory, financial ledgers, and service tickets.
            </p>
          </div>

          {/* Left Footer Info */}
          <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/70 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-300" />
              <span>TLS 256-Bit Encrypted</span>
            </div>
            <span>v2.4 Production</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Minimalist Clean Sign In Form with Prominent Big White Logo */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 flex flex-col justify-between">
          <div>
            {/* Prominent Large Logo with Clean White Background */}
            <div className="flex items-center justify-center sm:justify-start mb-8">
              <div className="bg-white border border-slate-200/80 shadow-md hover:shadow-lg transition-all rounded-2xl px-6 py-3.5 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="TCE Logo"
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm"
                />
              </div>
            </div>

            {/* Form Title */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {forgotMode ? "Reset Password" : "Sign In"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                {forgotMode
                  ? "Enter your email address to receive password reset instructions."
                  : "Enter your TCE credentials to access the ERP dashboard."}
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {!forgotMode ? (
              /* Regular Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Username or email"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-normal"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-normal"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 rounded-sm cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError("");
                      setResetSent(false);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all transform active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Forgot Password Recovery Mode */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {!resetSent ? (
                  <>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="Registered account email (e.g. admin@tceerp.com)"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-normal"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center p-5 bg-emerald-50 border border-emerald-200 rounded-2xl animate-fadeIn">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-900">Reset Request Dispatched</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Check your email inbox or server logs for your secure password reset link.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError("");
                  }}
                  className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-2 transition-colors hover:underline text-center block"
                >
                  ← Back to Login
                </button>
              </form>
            )}
          </div>

          {/* Right Bottom Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span>&copy; {new Date().getFullYear()} TCE ERP</span>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span>Powered by</span>
              <a
                href="https://omnysync.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline inline-flex items-center gap-0.5 transition-colors"
              >
                OMNYSYNC
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
