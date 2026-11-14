import { useState, useEffect } from 'react';
import { QrCode, Globe, ExternalLink, RotateCcw, Lock, MousePointer, Check } from 'lucide-react';
import './join-slide.css';

interface JoinSlideProps {
  active?: boolean;
  lang?: 'en' | 'vi';
}

const copy = {
  vi: {
    kicker: 'THAM GIA',
    title: 'Mở CIA',
    subtitle: 'Quét mã QR bằng điện thoại để mở website và đăng nhập bằng Google.',
    scanTitle: 'Quét mã QR',
    scanDesc: 'Mở Máy ảnh trên điện thoại và hướng vào mã QR.',
    openTitle: 'Mở đường dẫn',
    openDesc: 'Chạm thông báo để truy cập cia.nimtechnology.com.',
    loginTitle: 'Tiếp tục với Google',
    loginDesc: 'Chọn "Continue with Google" để tham gia tương tác.',
    directLink: 'Truy cập trực tiếp:',
    replay: 'Phát lại',
    simBadge: 'Minh hoạ thao tác',
    simCam: 'Máy ảnh',
    simDetected: 'Tìm thấy cia.nimtechnology.com',
    browserPageTitle: 'Nền tảng CIA',
    browserPageSub: 'Trợ lý AI tương tác thời gian thực',
    browserStatus: 'Sẵn sàng kết nối',
    simAuthTitle: 'Đăng nhập vào CIA',
    simAuthSub: 'Xác thực nhanh bằng tài khoản Google',
    googleBtn: 'Continue with Google',
    simSuccess: 'Đã xác thực thành công',
    simDisclaimer: 'Minh hoạ luồng tham gia, không yêu cầu mật khẩu.',
  },
  en: {
    kicker: 'JOIN',
    title: 'Open CIA',
    subtitle: 'Scan the QR code with your phone to open the site and sign in with Google.',
    scanTitle: 'Scan QR Code',
    scanDesc: 'Open phone camera and point at the QR code.',
    openTitle: 'Open Website',
    openDesc: 'Tap the banner to open cia.nimtechnology.com.',
    loginTitle: 'Continue with Google',
    loginDesc: 'Select "Continue with Google" to join interactively.',
    directLink: 'Direct access:',
    replay: 'Replay',
    simBadge: 'Phone simulation',
    simCam: 'Camera',
    simDetected: 'Detected: cia.nimtechnology.com',
    browserPageTitle: 'CIA Platform',
    browserPageSub: 'Real-time interactive AI workspace',
    browserStatus: 'Connected',
    simAuthTitle: 'Sign in to CIA',
    simAuthSub: 'Fast authentication with Google',
    googleBtn: 'Continue with Google',
    simSuccess: 'Signed in successfully',
    simDisclaimer: 'Flow preview only, no credentials needed here.',
  },
};

export function JoinSlide({ active = true, lang = 'vi' }: JoinSlideProps) {
  // stage: 0 = camera scan, 1 = browser load, 2 = google sign-in sheet
  const [stage, setStage] = useState<number>(0);
  const [replayKey, setReplayKey] = useState<number>(0);

  const t = copy[lang] || copy.vi;
  const targetUrl = 'https://cia.nimtechnology.com';

  useEffect(() => {
    setStage(0);
    if (!active) return;

    const t1 = setTimeout(() => {
      setStage(1);
    }, 3200);

    const t2 = setTimeout(() => {
      setStage(2);
    }, 6400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, replayKey]);

  const handleReplay = () => {
    setStage(0);
    setReplayKey((prev) => prev + 1);
  };

  const steps = [
    { num: 1, title: t.scanTitle, desc: t.scanDesc },
    { num: 2, title: t.openTitle, desc: t.openDesc },
    { num: 3, title: t.loginTitle, desc: t.loginDesc },
  ];

  return (
    <main className="join-slide" aria-label="Join CIA Workshop">
      <div className="join-grid-bg" aria-hidden="true" />

      {/* Left Column: Title + Glowing QR Card + Direct URL */}
      <section className="join-left">
        <header className="join-header">
          <p className="join-kicker">{t.kicker}</p>
          <h1 className="join-title">{t.title}</h1>
          <p className="join-subtitle">{t.subtitle}</p>
        </header>

        <div className="join-qr-zone">
          <div className="join-qr-card">
            <img
              src="/qr-cia.svg"
              alt="QR Code to cia.nimtechnology.com"
              className="join-qr-img"
              width={200}
              height={200}
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

      {/* CSS-only curved particle data stream from QR to Phone */}
      <div className="join-data-stream" aria-hidden="true">
        <span className="join-particle join-p1" />
        <span className="join-particle join-p2" />
        <span className="join-particle join-p3" />
        <span className="join-particle join-p4" />
        <span className="join-particle join-p5" />
      </div>

      {/* Right Column: Vertical Neon Timeline + Slim 9:19.5 Phone */}
      <section className="join-right" aria-label={t.simBadge}>
        {/* Vertical Timeline Steps */}
        <ol className="join-timeline">
          <div className="join-timeline-track" aria-hidden="true">
            <div className={`join-timeline-fill stage-${stage}`} />
          </div>
          {steps.map((s, idx) => {
            const isDone = stage > idx;
            const isActive = stage === idx;
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

        {/* Slim Phone Mockup (max-width 220px, max-height 420px, ~9:19.5) */}
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

              {/* Stage 1: Browser Opening cia.nimtechnology.com */}
              {stage === 1 && (
                <div className="stage-browser">
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
                        <Globe size={22} />
                      </div>
                      <h3 className="browser-page-title">{t.browserPageTitle}</h3>
                      <p className="browser-page-sub">{t.browserPageSub}</p>
                      <div className="browser-status-pill">
                        <span className="browser-status-dot" />
                        <span>{t.browserStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 2: iOS Bottom Auth Sheet + Google Button + Tap + Success */}
              {stage === 2 && (
                <div className="stage-auth">
                  <div className="auth-backdrop-content">
                    <div className="auth-mini-logo">CIA</div>
                  </div>

                  <div className="auth-sheet">
                    <div className="auth-sheet-handle" />
                    <div className="auth-brand-logo">CIA</div>
                    <h3 className="auth-headline">{t.simAuthTitle}</h3>
                    <p className="auth-instructions">{t.simAuthSub}</p>

                    <div className="google-auth-btn">
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
                      <span>{t.googleBtn}</span>

                      <div className="sim-tap-cursor" aria-hidden="true">
                        <MousePointer size={16} color="#020617" fill="#67e8f9" />
                      </div>
                    </div>

                    <div className="auth-success-toast">
                      <span className="auth-success-icon">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{t.simSuccess}</span>
                    </div>

                    <p className="sim-auth-disclaimer">{t.simDisclaimer}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="phone-home-indicator" />
          </div>
        </div>
      </section>
    </main>
  );
}
export default JoinSlide;
