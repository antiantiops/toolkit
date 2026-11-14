import { useState, useEffect } from 'react';
import { QrCode, Globe, ExternalLink, RotateCcw, Lock, MousePointer } from 'lucide-react';
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
    scanTitle: '1. Quét mã QR',
    scanDesc: 'Mở ứng dụng Máy ảnh trên điện thoại để quét mã bên trái.',
    openTitle: '2. Mở đường dẫn',
    openDesc: 'Nhấn vào liên kết thông báo chuyển đến cia.nimtechnology.com.',
    loginTitle: '3. Tiếp tục với Google',
    loginDesc: 'Nhấn chọn "Continue with Google" để tham gia tương tác.',
    directLink: 'Hoặc truy cập trực tiếp:',
    replay: 'Phát lại minh hoạ',
    simBadge: 'Minh hoạ thao tác điện thoại',
    simCam: 'Máy ảnh',
    simDetected: 'Tìm thấy cia.nimtechnology.com',
    browserPageTitle: 'Nền tảng CIA',
    browserPageSub: 'cia.nimtechnology.com',
    simAuthTitle: 'Đăng nhập vào CIA',
    simAuthSub: 'Chọn phương thức xác thực nhanh:',
    googleBtn: 'Continue with Google',
    simDisclaimer: 'Minh hoạ luồng tham gia, không yêu cầu mật khẩu.',
  },
  en: {
    kicker: 'JOIN',
    title: 'Open CIA',
    subtitle: 'Scan QR code with phone camera to open website, then sign in with Google.',
    scanTitle: '1. Scan QR Code',
    scanDesc: 'Open camera app on your phone and point at the QR code.',
    openTitle: '2. Open Website',
    openDesc: 'Tap notification banner to open cia.nimtechnology.com.',
    loginTitle: '3. Continue with Google',
    loginDesc: 'Select "Continue with Google" to participate interactively.',
    directLink: 'Or access directly:',
    replay: 'Replay animation',
    simBadge: 'Phone walkthrough illustration',
    simCam: 'Camera',
    simDetected: 'Detected: cia.nimtechnology.com',
    browserPageTitle: 'CIA Platform',
    browserPageSub: 'cia.nimtechnology.com',
    simAuthTitle: 'Sign in to CIA',
    simAuthSub: 'Fast & secure authentication:',
    googleBtn: 'Continue with Google',
    simDisclaimer: 'Demonstration illustration, no credentials needed here.',
  },
};

export function JoinSlide({ active = true, lang = 'vi' }: JoinSlideProps) {
  // stage: 0 = camera scan, 1 = open website browser, 2 = select Google button
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

  return (
    <main className="join-slide" aria-label="Join CIA Workshop">
      {/* Left Column: Clear static QR + Instructions */}
      <section className="join-left">
        <header className="join-header">
          <p className="join-kicker">{t.kicker}</p>
          <h1 className="join-title">{t.title}</h1>
          <p className="join-subtitle">{t.subtitle}</p>
        </header>

        <div className="join-main-content">
          {/* Static scannable QR card */}
          <div className="join-qr-wrapper">
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
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Sequential Step List */}
          <div className="join-steps-list">
            <div className={`join-step-item ${stage === 0 ? 'active' : ''}`}>
              <div className="join-step-num">1</div>
              <div className="join-step-body">
                <h2 className="join-step-title">{t.scanTitle}</h2>
                <p className="join-step-desc">{t.scanDesc}</p>
              </div>
            </div>

            <div className={`join-step-item ${stage === 1 ? 'active' : ''}`}>
              <div className="join-step-num">2</div>
              <div className="join-step-body">
                <h2 className="join-step-title">{t.openTitle}</h2>
                <p className="join-step-desc">{t.openDesc}</p>
              </div>
            </div>

            <div className={`join-step-item ${stage === 2 ? 'active' : ''}`}>
              <div className="join-step-num">3</div>
              <div className="join-step-body">
                <h2 className="join-step-title">{t.loginTitle}</h2>
                <p className="join-step-desc">{t.loginDesc}</p>
              </div>
            </div>
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

      {/* Right Column: Animated Phone Illustration */}
      <section className="join-right" aria-label={t.simBadge}>
        <div className="phone-mockup">
          <div className="phone-island">
            <div className="phone-camera-lens" />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
          </div>

          <div className="phone-screen">
            <div className="phone-sim-tag">{t.simBadge}</div>

            <div className="phone-inner-stage">
              {/* Stage 0: Camera Scanning */}
              {stage === 0 && (
                <div className="stage-camera">
                  <div className="camera-top-bar">
                    <span>{t.simCam}</span>
                    <QrCode size={14} />
                  </div>

                  <div className="camera-viewfinder">
                    <div className="viewfinder-reticle" />
                    <div className="viewfinder-corners">
                      <div className="corner corner-tl" />
                      <div className="corner corner-tr" />
                      <div className="corner corner-bl" />
                      <div className="corner corner-br" />
                    </div>
                    <div className="viewfinder-scan-beam" />
                    <img
                      src="/qr-cia.svg"
                      alt=""
                      className="mock-qr-preview"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="camera-toast-detected">
                    <Globe size={13} color="#60a5fa" />
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
                      <Lock size={10} color="#16a34a" />
                      <span>cia.nimtechnology.com</span>
                    </div>
                  </div>
                  <div className="browser-progress-bar" />

                  <div className="browser-page-body">
                    <div className="browser-hero-icon">
                      <Globe size={26} />
                    </div>
                    <h3 className="browser-page-title">{t.browserPageTitle}</h3>
                    <p className="browser-page-sub">{t.browserPageSub}</p>
                  </div>
                </div>
              )}

              {/* Stage 2: Selecting Continue with Google */}
              {stage === 2 && (
                <div className="stage-auth">
                  <div className="auth-modal-card">
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

                      {/* Animated hand pointer to show selecting */}
                      <div className="sim-tap-cursor">
                        <MousePointer size={18} color="#2563eb" fill="#bfdbfe" />
                      </div>
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
