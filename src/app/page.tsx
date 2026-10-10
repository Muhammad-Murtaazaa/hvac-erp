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
  KeyRound,
  Check,
} from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password mode states (OTP Flow)
  const [forgotMode, setForgotMode] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1); // 1 = Enter Email, 2 = Enter OTP & New Password
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Company selection states
  const [selectedCompany, setSelectedCompany] = useState<"TCE" | "TECAIR">("TCE");
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<
    { id: "TCE" | "TECAIR"; name: string; role: string }[]
  >([]);
  const [pendingAuthData, setPendingAuthData] = useState<any>(null);
  const [switchingCompany, setSwitchingCompany] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize Remembered Credentials & Redirect if already authenticated
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("token")) {
        if (localStorage.getItem("is_developer") === "true") {
          router.push("/dev");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Sync saved company preference
      const savedCompany = localStorage.getItem("active_company");
      if (savedCompany === "TECAIR" || savedCompany === "TCE") {
        setSelectedCompany(savedCompany as "TCE" | "TECAIR");
      }

      // Check for saved remember me preferences
      const savedEmail = localStorage.getItem("tce_remember_email");
      const savedRemember = localStorage.getItem("tce_remember_me");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(savedRemember !== "false");
      }
    }
  }, [router]);


  const handleSelectCompany = async (companyId: "TCE" | "TECAIR") => {
    if (!pendingAuthData) return;
    setSwitchingCompany(true);
    try {
      const res = await fetch("/api/auth/switch-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingAuthData.token}`,
        },
        body: JSON.stringify({ company: companyId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to activate ${companyId} workspace`);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("active_company", companyId);
        document.cookie = `active_company=${companyId}; path=/; max-age=2592000; SameSite=Lax`;

        const isDev = Boolean(
          data.user?.isDeveloper ||
          data.user?.email?.toLowerCase() === "muhammad.murtaazaa@gmail.com"
        );

        if (isDev) {
          router.push("/dev");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message);
      setShowCompanyPicker(false);
    } finally {
      setSwitchingCompany(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, company: selectedCompany }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      const isDev = Boolean(
        data.user?.isDeveloper ||
        data.user?.email?.toLowerCase() === "muhammad.murtaazaa@gmail.com"
      );

      // Handle Remember Me storage
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("tce_remember_email", email.trim());
          localStorage.setItem("tce_remember_me", "true");
        } else {
          localStorage.removeItem("tce_remember_email");
          localStorage.removeItem("tce_remember_me");
        }

        if (isDev) {
          localStorage.setItem("is_developer", "true");
        } else {
          localStorage.removeItem("is_developer");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("active_company", data.activeCompany || "TCE");
        document.cookie = `active_company=${data.activeCompany || "TCE"}; path=/; max-age=2592000; SameSite=Lax`;
      }

      // If user has access to multiple companies and selection is required, display Company Picker Interstitial
      if (data.requiresCompanySelection && data.availableCompanies && data.availableCompanies.length > 1) {
        setPendingAuthData(data);
        setAvailableCompanies(data.availableCompanies);
        setShowCompanyPicker(true);
        return;
      }

      if (isDev) {
        router.push("/dev");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Step 1: Request 6-digit OTP code to email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setOtpStep(2);
      setSuccessMessage(data.message || `A 6-digit verification code was sent to ${resetEmail.trim()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Validate OTP and Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: otpCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      // Switch back to Login view with success message and pre-filled email
      setEmail(resetEmail.trim());
      setPassword("");
      setForgotMode(false);
      setOtpStep(1);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Password reset successfully! Please sign in with your new password.");
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
        <div className="absolute inset-0 bg-gradient-to-tr from-[#070b14] via-[#0f172a] to-[#1e1b4b] opacity-95" />
        <div className="absolute -top-24 -left-24 w-[550px] h-[550px] bg-gradient-to-br from-sky-400/25 via-blue-500/20 to-transparent rounded-full blur-[100px] animate-pulse duration-1000" />
        <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/25 via-purple-600/15 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-t from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(7,11,20,0.6)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Main Split Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6),0_0_50px_rgba(59,130,246,0.12)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] relative z-10 border border-white/40">
        
        {/* LEFT COLUMN: Modern Branded Artwork */}
        <div
          className={`lg:col-span-6 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
            selectedCompany === "TECAIR"
              ? "bg-gradient-to-br from-teal-800 via-cyan-900 to-slate-950"
              : "bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950"
          }`}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
              <path d="M 100 0 Q 300 200 100 400 T 100 800" fill="none" stroke="white" strokeWidth="1.5" />
              <path d="M 250 0 Q 450 200 250 400 T 250 800" fill="none" stroke="white" strokeWidth="1.5" />
              <path d="M 400 0 Q 600 200 400 400 T 400 800" fill="none" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Top Branding */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wider uppercase text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>{selectedCompany === "TECAIR" ? "TECAIR Systems Workspace" : "Enterprise Operations"}</span>
            </div>
          </div>

          {/* Center Hero */}
          <div className="my-auto py-8 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white mb-3">
              {selectedCompany === "TECAIR" ? "TECAIR Systems" : "Welcome back!"}
            </h1>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm">
              {selectedCompany === "TECAIR"
                ? "Sign in to access your dedicated TECAIR ERP platform with 100% database & accounting segregation."
                : "Log in with your credentials to access your Technicool Engineering unified management console."}
            </p>
          </div>

          {/* Bottom Security Badge */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TLS 256-bit Encrypted Session</span>
            </div>
            <span>{selectedCompany === "TECAIR" ? "TECAIR Systems (Pvt) Ltd" : "Technicool Engineering"}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean Login & Forgot Password Form */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-white relative">
          
          <div>
            {/* Prominent Company Workspace Switcher */}
            <div className="mb-6">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Select Company Workspace:
              </label>
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCompany("TCE")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedCompany === "TCE"
                      ? "bg-white text-blue-700 shadow-md shadow-blue-500/10 border border-slate-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/40"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedCompany === "TCE" ? "bg-blue-600 animate-pulse" : "bg-slate-300"}`} />
                  <span>🏢 TCE (Technicool)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCompany("TECAIR")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedCompany === "TECAIR"
                      ? "bg-white text-teal-700 shadow-md shadow-teal-500/10 border border-slate-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/40"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedCompany === "TECAIR" ? "bg-teal-500 animate-pulse" : "bg-slate-300"}`} />
                  <span>❄️ TECAIR Systems</span>
                </button>
              </div>
            </div>

            {/* Enlarged Logo Container with Dynamic Branding */}
            <div className="mb-6 flex items-center justify-start">
              {selectedCompany === "TECAIR" ? (
                <div className="bg-white px-6 py-3.5 rounded-2xl border border-teal-200/80 shadow-[0_4px_20px_rgba(20,184,166,0.12)] inline-flex items-center justify-center animate-fadeIn">
                  <img
                    src="/tecair-logo.png"
                    alt="TECAIR Systems Logo"
                    className="h-12 w-auto object-contain drop-shadow-sm max-w-[220px]"
                  />
                </div>
              ) : (
                <div className="bg-white px-6 py-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] inline-flex items-center justify-center animate-fadeIn">
                  <img
                    src="/logo.png"
                    alt="Technicool Engineering Logo"
                    className="h-12 w-auto object-contain drop-shadow-sm max-w-[200px]"
                  />
                </div>
              )}
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {forgotMode
                  ? otpStep === 1
                    ? "Reset Your Password"
                    : "Enter Verification Code"
                  : selectedCompany === "TECAIR"
                  ? "Sign in to TECAIR ERP"
                  : "Sign in to TCE ERP"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {forgotMode
                  ? otpStep === 1
                    ? "Enter your account email to receive a 6-digit OTP verification code."
                    : `Enter the 6-digit code sent to ${resetEmail} and your new password.`
                  : selectedCompany === "TECAIR"
                  ? "Enter your credentials to access the TECAIR database & operations."
                  : "Please enter your enterprise credentials to continue"}
              </p>
            </div>


            {/* Error Alert Box */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <p className="font-medium leading-tight">{error}</p>
              </div>
            )}

            {/* Success Alert Box */}
            {successMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <p className="font-medium leading-tight">{successMessage}</p>
              </div>
            )}

            {/* ================= NORMAL SIGN IN FORM ================= */}
            {!forgotMode ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Email address"
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
                      className={`w-4 h-4 rounded border-slate-300 cursor-pointer ${
                        selectedCompany === "TECAIR"
                          ? "text-teal-600 focus:ring-teal-500"
                          : "text-blue-600 focus:ring-blue-500"
                      }`}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setOtpStep(1);
                      setResetEmail(email);
                      setError("");
                      setSuccessMessage("");
                    }}
                    className={`font-medium hover:underline transition-colors ${
                      selectedCompany === "TECAIR"
                        ? "text-teal-600 hover:text-teal-700"
                        : "text-blue-600 hover:text-blue-700"
                    }`}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-3 disabled:opacity-60 text-white py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer ${
                    selectedCompany === "TECAIR"
                      ? "bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40"
                      : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
                  }`}
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
              /* ================= 2-STEP OTP FORGOT PASSWORD FORM ================= */
              <div>
                {otpStep === 1 ? (
                  /* Step 1: Send OTP */
                  <form onSubmit={handleRequestOtp} className="space-y-4">
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
                          <span>Sending OTP Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send 6-Digit OTP Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Validate OTP & Set New Password */
                  <form onSubmit={handleResetPassword} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1">
                        6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 849201"
                          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 text-base font-mono tracking-widest focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-center"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1">
                        New Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          placeholder="New password (min. 6 characters)"
                          className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-normal"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Check className="w-4 h-4" />
                        </span>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          placeholder="Confirm new password"
                          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-normal"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Reset Password & Sign In</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep(1);
                          setError("");
                        }}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Didn't receive code? Re-send OTP
                      </button>
                    </div>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setOtpStep(1);
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-2 mt-2 transition-colors hover:underline text-center block"
                >
                  ← Back to Login
                </button>
              </div>
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

      {/* Company Picker Interstitial Modal */}
      {showCompanyPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative p-6 sm:p-8">
            <div className="text-center max-w-md mx-auto mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-4 border border-blue-100 shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Select Active Organization
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Your credentials are authorized for multiple enterprise entities. Choose which company workspace you want to load:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Option 1: TCE */}
              <button
                type="button"
                disabled={switchingCompany}
                onClick={() => handleSelectCompany("TCE")}
                className="group relative text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/30 transition-all hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Primary
                    </span>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600">
                      TCE
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                    🏢 Technicool (TCE)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Primary HVAC enterprise operations, commercial contracting, and service ledger.
                  </p>
                  {availableCompanies.find((c) => c.id === "TCE")?.role && (
                    <div className="mt-3 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Role: <strong className="text-slate-800">{availableCompanies.find((c) => c.id === "TCE")?.role}</strong>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Open TCE ERP</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 2: TECAIR */}
              <button
                type="button"
                disabled={switchingCompany}
                onClick={() => handleSelectCompany("TECAIR")}
                className="group relative text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-teal-600 bg-white hover:bg-teal-50/30 transition-all hover:shadow-xl hover:shadow-teal-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                      Dedicated
                    </span>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-teal-600">
                      TECAIR
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 flex items-center gap-1.5">
                    ❄️ TECAIR Systems
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Separate operating database with 100% data and accounting isolation.
                  </p>
                  {availableCompanies.find((c) => c.id === "TECAIR")?.role && (
                    <div className="mt-3 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Role: <strong className="text-slate-800">{availableCompanies.find((c) => c.id === "TECAIR")?.role}</strong>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
                  <span>Open TECAIR ERP</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {switchingCompany && (
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 mb-3 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Initializing organization database connection...</span>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCompanyPicker(false);
                  setPendingAuthData(null);
                  localStorage.removeItem("token");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
              >
                Cancel and return to login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

