import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Globe,
  ExternalLink,
  RotateCcw,
  Lock,
  MousePointer,
  Check,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import './join-slide.css';

interface JoinSlideProps {
  active?: boolean;
  lang?: 'en' | 'vi';
}

const copy = {
  vi: {
    kicker: 'THAM GIA',
    title: 'Mở bài thuyết trình',
    subtitle: 'Quét mã QR bằng điện thoại để xem bài thuyết trình và đăng nhập nhanh bằng Google.',
    scanTitle: 'Quét mã QR',
    scanDesc: 'Mở Máy ảnh trên điện thoại và hướng vào mã QR.',
    loginTitle: 'Đăng nhập Google',
    loginDesc: 'Xác thực tài khoản và vào bài thuyết trình nhanh.',
    viewTitle: 'Xem bài thuyết trình',
    viewDesc: 'Theo dõi slide bài nói trực tiếp theo thời gian thực.',
    directLink: 'Truy cập trực tiếp:',
    replay: 'Phát lại',
    simBadge: 'Minh hoạ thao tác',
    simSessionNote: 'Phiên đã lưu có thể bỏ qua bước đăng nhập',
    simCam: 'Máy ảnh',
    simDetected: 'Tìm thấy cia.nimtechnology.com',
    browserPageTitle: 'AI BODY — Bài thuyết trình',
    browserPageSub: 'Bài nói tương tác trực tiếp qua di động',
    browserStatus: 'Sẵn sàng kết nối',
    googleBtn: 'Continue with Google',
    googleSignIn: 'Đăng nhập',
    googleSub: 'để tiếp tục với nimtechnology.com',
    googleEmailLabel: 'Email hoặc số điện thoại',
    googleForgotEmail: 'Bạn quên địa chỉ email?',
    googleCreateAccount: 'Tạo tài khoản',
    googleNext: 'Tiếp theo',
    googleWelcome: 'Chào mừng',
    googlePasswordLabel: 'Nhập mật khẩu',
    googleShowPassword: 'Hiện mật khẩu',
    googleTryAnother: 'Thử cách khác',
    googleConsentTitle: 'Đăng nhập vào nimtechnology.com',
    googleConsentScope:
      'Google sẽ chia sẻ tên, địa chỉ email và ảnh hồ sơ của bạn với nimtechnology.com.',
    googleConsentNotice: 'Minh hoạ quyền cơ bản (tên, email, ảnh đại diện).',
    googleCancel: 'Huỷ',
    googleContinue: 'Tiếp tục',
    presHeader: 'AI BODY',
    presLive: 'TRỰC TIẾP',
    presKicker: 'BÀI THUYẾT TRÌNH',
    presTitle: 'Nội dung bài nói AI BODY',
    presBlock1: 'Slide thuyết trình',
    presBlock2: 'Tương tác trực tiếp',
    presCounter: '01 / 12',
  },
  en: {
    kicker: 'JOIN',
    title: 'Open Presentation',
    subtitle: 'Scan the QR code with your phone to access this talk and sign in with Google.',
    scanTitle: 'Scan QR Code',
    scanDesc: 'Open phone camera and point at the QR code.',
    loginTitle: 'Google Sign-in',
    loginDesc: 'Authenticate account and open presentation instantly.',
    viewTitle: 'View Presentation',
    viewDesc: 'Follow talk slides and interact in real time.',
    directLink: 'Direct access:',
    replay: 'Replay',
    simBadge: 'Phone simulation',
    simSessionNote: 'Saved sessions may skip login steps',
    simCam: 'Camera',
    simDetected: 'Detected: cia.nimtechnology.com',
    browserPageTitle: 'AI BODY — Presentation',
    browserPageSub: 'Interactive live talk companion',
    browserStatus: 'Connected',
    googleBtn: 'Continue with Google',
    googleSignIn: 'Sign in',
    googleSub: 'to continue to nimtechnology.com',
    googleEmailLabel: 'Email or phone',
    googleForgotEmail: 'Forgot email?',
    googleCreateAccount: 'Create account',
    googleNext: 'Next',
    googleWelcome: 'Welcome',
    googlePasswordLabel: 'Enter your password',
    googleShowPassword: 'Show password',
    googleTryAnother: 'Try another way',
    googleConsentTitle: 'Sign in to nimtechnology.com',
    googleConsentScope:
      'Google will share your name, email address and profile picture with nimtechnology.com.',
    googleConsentNotice: 'Illustrative basic scope (name, email, profile photo).',
    googleCancel: 'Cancel',
    googleContinue: 'Continue',
    presHeader: 'AI BODY',
    presLive: 'LIVE',
    presKicker: 'PRESENTATION',
    presTitle: 'AI BODY Talk Slides',
    presBlock1: 'Talk Slides',
    presBlock2: 'Live Interactions',
    presCounter: '01 / 12',
  },
};

function GoogleGIcon() {
  return (
    <svg className="google-g-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.14C3.25 21.35 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.6H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.4l4.02-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.26 6.6l4.02 3.14c.95-2.84 3.6-4.97 6.72-4.97z"
      />
    </svg>
  );
}

function DataFlowBridge({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const ribbons = [
      { count: 28, amp: 16, freq: 0.045, speed: 34, phase: 0, radius: 1.8 },
      { count: 26, amp: 12, freq: 0.055, speed: 42, phase: 2.1, radius: 1.5 },
      { count: 24, amp: 8, freq: 0.065, speed: 28, phase: 4.2, radius: 1.3 },
    ];

    const bokeh = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 29) % width,
      y: 10 + ((i * 31) % (height - 20)),
      r: 1.2 + (i % 4) * 0.55,
      speed: 8 + (i % 5) * 3.5,
      bobAmp: 2.5 + (i % 3) * 1.1,
      phase: i * 0.85,
      alpha: 0.14 + (i % 4) * 0.07,
    }));

    const lerpColor = (t: number) => {
      const r = 0;
      const g = Math.round(242 + (114 - 242) * t);
      const b = Math.round(254 + (255 - 254) * t);
      return `${r}, ${g}, ${b}`;
    };

    const drawFrame = (sec: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const p of bokeh) {
        const x = (p.x + sec * p.speed) % width;
        const y = p.y + Math.sin(sec * 1.4 + p.phase) * p.bobAmp;
        const rgb = lerpColor(x / width);
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx.fill();
      }

      for (const ribbon of ribbons) {
        for (let i = 0; i < ribbon.count; i++) {
          const baseX = (i / ribbon.count) * width;
          const x = (baseX + sec * ribbon.speed) % width;
          const t = x / width;
          const y =
            height / 2 +
            Math.sin(x * ribbon.freq - sec * 2.2 + ribbon.phase) * ribbon.amp;
          const edgeFade = Math.sin(t * Math.PI);
          const alpha = 0.25 + 0.7 * edgeFade;
          const rgb = lerpColor(t);

          ctx.beginPath();
          ctx.arc(x, y, ribbon.radius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.24})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, ribbon.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
          ctx.fill();
        }
      }
    };

    if (prefersReduced) {
      drawFrame(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      drawFrame((now - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className={`join-gap-connector stage-${stage}`} aria-hidden="true">
      <canvas ref={canvasRef} className="join-particle-canvas" width={220} height={96} />
      <svg className="join-circuit-overlay" viewBox="0 0 220 96" fill="none">
        <path d="M 6 28 L 46 28 L 66 48 L 154 48 L 174 68 L 214 68" stroke="rgba(0, 242, 254, 0.35)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 6 68 L 38 68 L 58 48 L 162 48 L 182 28 L 214 28" stroke="rgba(0, 114, 255, 0.35)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6" cy="28" r="2.8" fill="#00f2fe" filter="drop-shadow(0 0 4px #00f2fe)" />
        <circle cx="66" cy="48" r="2.2" fill="#00c6ff" filter="drop-shadow(0 0 3px #00c6ff)" />
        <circle cx="154" cy="48" r="2.2" fill="#0072ff" filter="drop-shadow(0 0 3px #0072ff)" />
        <circle cx="214" cy="68" r="2.8" fill="#00f2fe" filter="drop-shadow(0 0 4px #00f2fe)" />
        <circle cx="6" cy="68" r="2.4" fill="#0072ff" filter="drop-shadow(0 0 4px #0072ff)" />
        <circle cx="214" cy="28" r="2.4" fill="#00c6ff" filter="drop-shadow(0 0 4px #00c6ff)" />
        <g className="join-circuit-chevrons">
          <path d="M 92 42 L 98 48 L 92 54" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 102 42 L 108 48 L 102 54" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 112 42 L 118 48 L 112 54" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 122 42 L 128 48 L 122 54" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

export function JoinSlide({ active = true, lang = 'vi' }: JoinSlideProps) {
  // stages:
  // 0: camera scan (3.2s)
  // 1: browser open cia.nimtechnology.com + Continue with Google tap (2.8s)
  // 2: google email entry learner@example.com (4.0s)
  // 3: google password entry masked bullets (4.0s)
  // 4: google consent screen (4.0s)
  // 5: miniature presentation visible (5.0s hold)
  const [stage, setStage] = useState<number>(0);
  const [replayKey, setReplayKey] = useState<number>(0);

  const t = copy[lang] || copy.vi;
  const targetUrl = 'https://cia.nimtechnology.com';

  useEffect(() => {
    setStage(0);
    if (!active) return;

    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;
    let t4: ReturnType<typeof setTimeout> | undefined;
    let t5: ReturnType<typeof setTimeout> | undefined;
    let tLoop: ReturnType<typeof setTimeout> | undefined;

    const runCycle = () => {
      setStage(0);
      t1 = setTimeout(() => {
        setStage(1);
      }, 3200);

      t2 = setTimeout(() => {
        setStage(2);
      }, 6000);

      t3 = setTimeout(() => {
        setStage(3);
      }, 10000);

      t4 = setTimeout(() => {
        setStage(4);
      }, 14000);

      t5 = setTimeout(() => {
        setStage(5);
      }, 18000);

      // Total cycle: 3.2s + 2.8s + 4.0s + 4.0s + 4.0s + 5.0s = 23.0s
      tLoop = setTimeout(() => {
        setReplayKey((k) => k + 1);
      }, 23000);
    };

    runCycle();

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (t4) clearTimeout(t4);
      if (t5) clearTimeout(t5);
      if (tLoop) clearTimeout(tLoop);
    };
  }, [active, replayKey]);

  const handleReplay = () => {
    setStage(0);
    setReplayKey((prev) => prev + 1);
  };

  const steps = [
    { num: 1, title: t.scanTitle, desc: t.scanDesc },
    { num: 2, title: t.loginTitle, desc: t.loginDesc },
    { num: 3, title: t.viewTitle, desc: t.viewDesc },
  ];

  return (
    <main className="join-slide" aria-label="Join Presentation">
      <div className="join-grid-bg" aria-hidden="true" />
      <div className="join-stripe" aria-hidden="true" />

      {/* Left Column: Header + QR + Controls */}
      <section className="join-left">
        <header className="join-header">
          <p className="join-kicker">{t.kicker}</p>
          <h1 className="join-title">{t.title}</h1>
          <p className="join-subtitle">{t.subtitle}</p>
        </header>

        <div className="join-qr-zone">
          <div className="join-qr-card">
            <span className="hud-corner hud-tl" aria-hidden="true" />
            <span className="hud-corner hud-tr" aria-hidden="true" />
            <span className="hud-corner hud-bl" aria-hidden="true" />
            <span className="hud-corner hud-br" aria-hidden="true" />
            <img
              src="/qr-cia.svg"
              alt="QR Code to cia.nimtechnology.com"
              className="join-qr-img"
              width={176}
              height={176}
            />
          </div>

          <div className="join-direct-link-box">
            <span className="join-direct-label">{t.directLink}</span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="join-url-link"
            >
              <span>cia.nimtechnology.com</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </div>

        <footer className="join-controls">
          <button
            type="button"
            className="join-replay-btn"
            onClick={handleReplay}
            aria-label={t.replay}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{t.replay}</span>
          </button>
          <span className="join-badge-note">{t.simBadge}</span>
        </footer>
      </section>

      {/* Center Data-Flow Bridge across QR-to-Timeline gap */}
      <DataFlowBridge stage={stage} />

      {/* Right Column: Vertical Neon Timeline + Slim 9:19.5 Phone */}
      <section className="join-right" aria-label={t.simBadge}>
        {/* Vertical Timeline Steps (3 broad groups) */}
        <ol className="join-timeline">
          <div className="join-timeline-track" aria-hidden="true">
            <div className={`join-timeline-fill stage-${stage}`} />
          </div>
          {steps.map((s, idx) => {
            let isDone = false;
            let isActive = false;
            if (idx === 0) {
              isActive = stage === 0;
              isDone = stage > 0;
            } else if (idx === 1) {
              isActive = stage >= 1 && stage <= 4;
              isDone = stage >= 5;
            } else if (idx === 2) {
              isActive = stage === 5;
              isDone = false;
            }

            return (
              <li
                key={s.num}
                className={`join-step-node ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              >
                <div className="join-step-dot" aria-hidden="true">
                  {isDone ? <Check size={12} strokeWidth={3} /> : <span>{s.num}</span>}
                </div>
                <div className="join-step-text">
                  <h2 className="join-step-title">{s.title}</h2>
                  <p className="join-step-desc">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Slim Phone Mockup */}
        <div className="join-phone-wrap" key={replayKey}>
          <div className="phone-mockup">
            <div className="phone-island">
              <span className="phone-camera-lens" />
              <span className="phone-sensor-dot" />
            </div>

            <div className="phone-screen">
              {/* Stage 0: Dark Camera Viewfinder */}
              {stage === 0 && (
                <div className="stage-camera">
                  <div className="camera-top-bar">
                    <span>{t.simCam}</span>
                    <QrCode size={13} />
                  </div>

                  <div className="camera-viewfinder">
                    <div className="viewfinder-corners">
                      <span className="corner corner-tl" />
                      <span className="corner corner-tr" />
                      <span className="corner corner-bl" />
                      <span className="corner corner-br" />
                    </div>
                    <img
                      src="/qr-cia.svg"
                      alt=""
                      className="mock-qr-preview"
                      aria-hidden="true"
                    />
                    <div className="viewfinder-scan-beam" />
                  </div>

                  <div className="camera-toast-detected">
                    <Globe size={12} />
                    <span>{t.simDetected}</span>
                  </div>

                  <div className="camera-shutter-row">
                    <div className="shutter-btn">
                      <div className="shutter-btn-inner" />
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 1: Browser Opening cia.nimtechnology.com + Continue with Google tap */}
              {stage === 1 && (
                <div className="stage-browser stage-cia-landing">
                  <div className="browser-bar">
                    <div className="browser-url-pill">
                      <Lock size={10} />
                      <span>cia.nimtechnology.com</span>
                    </div>
                  </div>
                  <div className="browser-progress-track">
                    <div className="browser-progress-bar" />
                  </div>

                  <div className="browser-page-body">
                    <div className="browser-hero-card">
                      <div className="browser-hero-icon">
                        <Globe size={20} />
                      </div>
                      <h3 className="browser-page-title">{t.browserPageTitle}</h3>
                      <p className="browser-page-sub">{t.browserPageSub}</p>

                      <div className="google-auth-btn cia-google-trigger">
                        <GoogleGIcon />
                        <span>{t.googleBtn}</span>
                        <div className="sim-tap-cursor tap-step-1" aria-hidden="true">
                          <MousePointer size={14} color="#020617" fill="#67e8f9" />
                        </div>
                      </div>

                      <div className="browser-status-pill">
                        <span className="browser-status-dot" />
                        <span>{t.browserStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 2: Google Email Entry (accounts.google.com) */}
              {stage === 2 && (
                <div className="stage-browser stage-email">
                  <div className="browser-bar">
                    <div className="browser-url-pill">
                      <Lock size={10} />
                      <span>accounts.google.com</span>
                    </div>
                  </div>

                  <div className="google-screen-body">
                    <div className="google-top-brand">
                      <GoogleGIcon />
                      <span className="google-brand-text">Sign in with Google</span>
                    </div>

                    <div className="google-header-block">
                      <h3 className="google-page-title">{t.googleSignIn}</h3>
                      <p className="google-page-subtitle">{t.googleSub}</p>
                    </div>

                    <div className="google-field-group">
                      <div className="google-outlined-field is-focused">
                        <span className="google-floating-label">{t.googleEmailLabel}</span>
                        <div className="google-fake-input">
                          <span className="sim-typing-email">learner@example.com</span>
                          <span className="sim-cursor-caret" aria-hidden="true" />
                        </div>
                      </div>
                      <span className="google-inline-link">{t.googleForgotEmail}</span>
                    </div>

                    <div className="google-card-footer">
                      <span className="google-inline-link">{t.googleCreateAccount}</span>
                      <div className="google-primary-btn">
                        <span>{t.googleNext}</span>
                        <div className="sim-tap-cursor tap-step-2" aria-hidden="true">
                          <MousePointer size={14} color="#020617" fill="#67e8f9" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 3: Google Password Entry (accounts.google.com) */}
              {stage === 3 && (
                <div className="stage-browser stage-password">
                  <div className="browser-bar">
                    <div className="browser-url-pill">
                      <Lock size={10} />
                      <span>accounts.google.com</span>
                    </div>
                  </div>

                  <div className="google-screen-body">
                    <div className="google-top-brand">
                      <GoogleGIcon />
                      <span className="google-brand-text">Sign in with Google</span>
                    </div>

                    <div className="google-header-block">
                      <h3 className="google-page-title">{t.googleWelcome}</h3>
                      <div className="google-account-chip">
                        <div className="google-chip-avatar">
                          <User size={10} />
                        </div>
                        <span className="google-chip-email">learner@example.com</span>
                        <ChevronDown size={10} />
                      </div>
                    </div>

                    <div className="google-field-group">
                      <div className="google-outlined-field is-focused">
                        <span className="google-floating-label">{t.googlePasswordLabel}</span>
                        <div className="google-fake-input">
                          <span className="sim-masked-password">••••••••</span>
                          <span className="sim-cursor-caret" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="google-checkbox-row">
                        <span className="google-fake-checkbox" />
                        <span className="google-checkbox-label">{t.googleShowPassword}</span>
                      </div>
                    </div>

                    <div className="google-card-footer">
                      <span className="google-inline-link">{t.googleTryAnother}</span>
                      <div className="google-primary-btn">
                        <span>{t.googleNext}</span>
                        <div className="sim-tap-cursor tap-step-3" aria-hidden="true">
                          <MousePointer size={14} color="#020617" fill="#67e8f9" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 4: Google Consent Screen (accounts.google.com) */}
              {stage === 4 && (
                <div className="stage-browser stage-consent">
                  <div className="browser-bar">
                    <div className="browser-url-pill">
                      <Lock size={10} />
                      <span>accounts.google.com</span>
                    </div>
                  </div>

                  <div className="google-screen-body consent-body">
                    <div className="google-top-brand">
                      <GoogleGIcon />
                      <span className="google-brand-text">Sign in with Google</span>
                    </div>

                    <div className="google-header-block">
                      <h3 className="google-page-title consent-title">{t.googleConsentTitle}</h3>
                      <div className="google-account-chip">
                        <div className="google-chip-avatar">
                          <User size={10} />
                        </div>
                        <span className="google-chip-email">learner@example.com</span>
                      </div>
                    </div>

                    <div className="google-consent-box">
                      <div className="consent-icon-row">
                        <ShieldCheck size={14} className="consent-shield" />
                        <p className="consent-scope-desc">{t.googleConsentScope}</p>
                      </div>
                      <p className="consent-notice">{t.googleConsentNotice}</p>
                    </div>

                    <div className="google-card-footer consent-footer">
                      <span className="google-secondary-btn">{t.googleCancel}</span>
                      <div className="google-primary-btn">
                        <span>{t.googleContinue}</span>
                        <div className="sim-tap-cursor tap-step-4" aria-hidden="true">
                          <MousePointer size={14} color="#020617" fill="#67e8f9" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 5: Miniature Presentation (cia.nimtechnology.com) */}
              {stage === 5 && (
                <div className="stage-browser stage-presentation">
                  <div className="browser-bar">
                    <div className="browser-url-pill">
                      <Lock size={10} />
                      <span>cia.nimtechnology.com</span>
                    </div>
                  </div>

                  <div className="mini-pres-container">
                    <header className="mini-pres-header">
                      <div className="mini-pres-brand">
                        <span className="mini-pres-logo-dot" />
                        <span className="mini-pres-brand-name">{t.presHeader}</span>
                      </div>
                      <div className="mini-pres-live-tag">
                        <span className="live-dot-pulse" />
                        <span>{t.presLive}</span>
                      </div>
                    </header>

                    <div className="mini-pres-slide-card">
                      <span className="mini-slide-kicker">{t.presKicker}</span>
                      <h4 className="mini-slide-title">{t.presTitle}</h4>

                      <div className="mini-slide-grid">
                        <div className="mini-grid-card">
                          <span className="mini-card-tag">01</span>
                          <span className="mini-card-text">{t.presBlock1}</span>
                          <div className="mini-metric-bar">
                            <div className="mini-metric-fill" />
                          </div>
                        </div>
                        <div className="mini-grid-card">
                          <span className="mini-card-tag">02</span>
                          <span className="mini-card-text">{t.presBlock2}</span>
                          <div className="mini-metric-bar">
                            <div className="mini-metric-fill v2" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <footer className="mini-pres-controls">
                      <div className="mini-nav-btn is-disabled">
                        <ChevronLeft size={12} />
                      </div>
                      <span className="mini-page-indicator">{t.presCounter}</span>
                      <div className="mini-nav-btn">
                        <ChevronRight size={12} />
                      </div>
                    </footer>
                  </div>
                </div>
              )}
            </div>

            <div className="phone-home-indicator" />
          </div>

          <div className="phone-sim-caption">
            <span className="phone-sim-badge">{t.simBadge}</span>
            <span className="phone-sim-note">{t.simSessionNote}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
export default JoinSlide;
