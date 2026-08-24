"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { validateEmail } from "@/lib/emailValidation";
import "../../globals.css";

export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle Sign In (Direct email + password for existing registered users)
  const handleSignInDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
        isSignUp: "false",
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Sign in failed.");
      setLoading(false);
    }
  };

  // Handle Sign Up Step 1: Validate email and send OTP to email address
  const handleSendSignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Email format and disposable domain validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error || "Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isSignUp: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      setStep("otp");
      setResendCooldown(60);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  // Handle Sign Up Step 2: Verify OTP and create account
  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
        isSignUp: "true",
        otp: otp.trim(),
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Account creation failed.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        Loading session...
      </div>
    );
  }

  return (
    <div className="layout" style={{ justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)', zIndex: -1 }}></div>

      <div className="neu-flat" style={{ width: '420px', textAlign: 'center', padding: '3rem 2.25rem' }}>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '1.75rem', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <h1>⚡ ZeroConfig</h1>
        </div>

        <h2 style={{ fontSize: '1.45rem', marginBottom: '0.4rem', color: 'var(--text-main)', fontWeight: 800 }}>
          {isSignUp 
            ? (step === "otp" ? "Check Your Email" : "Create an Account") 
            : "Welcome Back"}
        </h2>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.925rem', lineHeight: 1.5 }}>
          {isSignUp
            ? (step === "otp" 
                ? `We've sent a 6-digit verification code to ${email}. Please enter it below.`
                : "Register with a verified email to receive your access token.")
            : "Sign in to access your workspaces and active tunnels."}
        </p>

        {error && (
          <div style={{ 
            color: 'var(--error)', 
            background: 'rgba(229, 62, 62, 0.08)', 
            border: '1px solid rgba(229, 62, 62, 0.2)', 
            borderRadius: 'var(--radius-sm)', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.5rem', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Existing User Sign In Form (Direct Email + Password) */}
        {!isSignUp && (
          <form onSubmit={handleSignInDirect} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                EMAIL
              </label>
              <input 
                type="email" 
                className="neu-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                PASSWORD
              </label>
              <input 
                type="password" 
                className="neu-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit"
              className="neu-btn" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', color: 'var(--accent)', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        )}

        {/* New User Sign Up (Step 1: Credentials -> Send OTP to Email) */}
        {isSignUp && step === "credentials" && (
          <form onSubmit={handleSendSignUpOtp} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                EMAIL
              </label>
              <input 
                type="email" 
                className="neu-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="developer@company.com"
                required
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                PASSWORD
              </label>
              <input 
                type="password" 
                className="neu-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit"
              className="neu-btn" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', color: 'var(--accent)', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send Verification Code to Email →"}
            </button>
          </form>
        )}

        {/* New User Sign Up (Step 2: Enter 6-digit OTP from Email) */}
        {isSignUp && step === "otp" && (
          <form onSubmit={handleVerifySignUpOtp} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                6-DIGIT VERIFICATION CODE
              </label>
              <input 
                type="text" 
                className="neu-input"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                autoFocus
                required
                disabled={loading}
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em' }}
              />
            </div>

            <button 
              type="submit"
              className="neu-btn" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', color: 'var(--accent)', fontSize: '0.95rem', marginBottom: '1rem' }}
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Code & Create Account →"}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => { setStep("credentials"); setError(""); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                ← Change Email
              </button>

              <button 
                type="button"
                onClick={handleSendSignUpOtp}
                disabled={resendCooldown > 0 || loading}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent)', 
                  cursor: resendCooldown > 0 ? 'default' : 'pointer', 
                  fontWeight: 700, 
                  padding: 0 
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* Google OAuth & Mode Toggle */}
        {step !== "otp" && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.75rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              <span style={{ margin: '0 1rem', color: 'var(--text-muted)', fontSize: '0.825rem', fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            </div>

            <button 
              className="neu-btn" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8rem', marginBottom: '1.75rem' }}
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            >
              <svg style={{ width: '1.2rem', height: '1.2rem', marginRight: '0.5rem' }} viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(!isSignUp); setStep("credentials"); setError(""); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
