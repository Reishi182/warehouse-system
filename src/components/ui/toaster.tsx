import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X, ExternalLink, Sparkles } from 'lucide-react';
import { toastLinks } from '@/hooks/use-toast';

// Super Premium Toast Component with Advanced Glassmorphism & Dark Mode Support
export function Toaster() {
  const handleNavigate = (toastId: string) => {
    const link = toastLinks.get(toastId);
    if (link) {
      toast.dismiss(toastId);
      window.location.href = link;
    }
  };

  return (
    <>
      {/* Global Styles for Super Premium Toast */}
      <style>{`
        @keyframes toast-slide-in {
          0% {
            transform: translateX(120%) scale(0.8) rotateY(-10deg);
            opacity: 0;
            filter: blur(4px);
          }
          50% {
            transform: translateX(-5%) scale(1.02) rotateY(0deg);
            filter: blur(0px);
          }
          100% {
            transform: translateX(0) scale(1) rotateY(0deg);
            opacity: 1;
            filter: blur(0px);
          }
        }
        
        @keyframes toast-slide-out {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
            filter: blur(4px);
          }
        }
        
        @keyframes progress-shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        
        @keyframes icon-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.15) rotate(-5deg); }
          50% { transform: scale(1.05) rotate(0deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px var(--glow-color),
                        0 0 40px var(--glow-color),
                        0 0 60px var(--glow-color-faded);
          }
          50% { 
            box-shadow: 0 0 30px var(--glow-color),
                        0 0 60px var(--glow-color),
                        0 0 80px var(--glow-color-faded);
          }
        }
        
        @keyframes shimmer-wave {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        
        @keyframes border-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        
        .premium-toast {
          animation: toast-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          perspective: 1000px;
        }
        
        .premium-toast[data-visible="false"] {
          animation: toast-slide-out 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        .premium-toast-icon {
          animation: icon-bounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .premium-toast-progress {
          animation: progress-shrink linear forwards;
          transform-origin: left;
        }
        
        .premium-toast-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg, 
            transparent, 
            rgba(255,255,255,0.15), 
            transparent
          );
          animation: shimmer-wave 3s infinite;
          pointer-events: none;
        }
        
        .premium-toast-glow {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        
        .premium-toast-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .premium-toast-border {
          animation: border-glow 2s ease-in-out infinite;
        }
        
        .premium-toast-link {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .premium-toast-link:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.1);
        }
        
        .premium-toast-link:active {
          transform: translateY(0px) scale(0.98);
        }
        
        .premium-toast-dismiss {
          transition: all 0.2s ease;
        }
        
        .premium-toast-dismiss:hover {
          transform: rotate(90deg) scale(1.1);
        }
        
        /* Dark mode detection */
        @media (prefers-color-scheme: dark) {
          .premium-toast-container {
            --bg-opacity: 0.85;
          }
        }
      `}</style>

      <HotToaster
        position="top-right"
        reverseOrder={false}
        gutter={16}
        containerStyle={{
          top: 24,
          right: 24,
        }}
        toastOptions={{
          duration: 4000,
        }}
      >
        {(t) => {
          const hasLink = toastLinks.has(t.id);

          // Define theme colors for each type
          const themes = {
            error: {
              primary: '#ef4444',
              secondary: '#dc2626',
              accent: '#fca5a5',
              bg: 'linear-gradient(145deg, rgba(127, 29, 29, 0.95) 0%, rgba(153, 27, 27, 0.9) 50%, rgba(185, 28, 28, 0.85) 100%)',
              bgLight: 'linear-gradient(145deg, rgba(254, 226, 226, 0.98) 0%, rgba(254, 202, 202, 0.95) 100%)',
              text: '#fecaca',
              textLight: '#7f1d1d',
              glow: 'rgba(239, 68, 68, 0.4)',
              glowFaded: 'rgba(239, 68, 68, 0.1)',
              border: 'rgba(239, 68, 68, 0.5)',
              icon: XCircle,
            },
            success: {
              primary: '#10b981',
              secondary: '#059669',
              accent: '#6ee7b7',
              bg: 'linear-gradient(145deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.9) 50%, rgba(5, 150, 105, 0.85) 100%)',
              bgLight: 'linear-gradient(145deg, rgba(209, 250, 229, 0.98) 0%, rgba(167, 243, 208, 0.95) 100%)',
              text: '#a7f3d0',
              textLight: '#064e3b',
              glow: 'rgba(16, 185, 129, 0.4)',
              glowFaded: 'rgba(16, 185, 129, 0.1)',
              border: 'rgba(16, 185, 129, 0.5)',
              icon: CheckCircle,
            },
            warning: {
              primary: '#f59e0b',
              secondary: '#d97706',
              accent: '#fcd34d',
              bg: 'linear-gradient(145deg, rgba(120, 53, 15, 0.95) 0%, rgba(146, 64, 14, 0.9) 50%, rgba(180, 83, 9, 0.85) 100%)',
              bgLight: 'linear-gradient(145deg, rgba(254, 243, 199, 0.98) 0%, rgba(253, 230, 138, 0.95) 100%)',
              text: '#fde68a',
              textLight: '#78350f',
              glow: 'rgba(245, 158, 11, 0.4)',
              glowFaded: 'rgba(245, 158, 11, 0.1)',
              border: 'rgba(245, 158, 11, 0.5)',
              icon: AlertTriangle,
            },
            info: {
              primary: '#6366f1',
              secondary: '#4f46e5',
              accent: '#a5b4fc',
              bg: 'linear-gradient(145deg, rgba(49, 46, 129, 0.95) 0%, rgba(67, 56, 202, 0.9) 50%, rgba(79, 70, 229, 0.85) 100%)',
              bgLight: 'linear-gradient(145deg, rgba(238, 242, 255, 0.98) 0%, rgba(224, 231, 255, 0.95) 100%)',
              text: '#c7d2fe',
              textLight: '#312e81',
              glow: 'rgba(99, 102, 241, 0.4)',
              glowFaded: 'rgba(99, 102, 241, 0.1)',
              border: 'rgba(99, 102, 241, 0.5)',
              icon: Info,
            },
          };

          // Get theme based on toast type
          const themeKey = t.type === 'error' ? 'error' : t.type === 'success' ? 'success' : 'info';
          const theme = themes[themeKey];
          const IconComponent = theme.icon;

          // Check if dark mode (using CSS custom property or system preference)
          const isDarkMode = typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;

          return (
            <div
              className="premium-toast premium-toast-float"
              data-visible={t.visible}
              style={{
                '--glow-color': theme.glow,
                '--glow-color-faded': theme.glowFaded,
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '440px',
                minWidth: '340px',
                background: isDarkMode ? theme.bg : theme.bgLight,
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '20px',
                boxShadow: `
                  0 25px 50px -12px ${theme.glow},
                  0 12px 24px -8px rgba(0, 0, 0, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, ${isDarkMode ? '0.1' : '0.8'}),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                `,
                border: `1px solid ${theme.border}`,
                overflow: 'hidden',
                position: 'relative',
              } as React.CSSProperties}
            >
              {/* Animated Shimmer Wave */}
              <div className="premium-toast-shimmer" />

              {/* Glowing Border Effect */}
              <div
                className="premium-toast-border"
                style={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: '20px',
                  background: `linear-gradient(135deg, ${theme.primary}40, transparent, ${theme.secondary}40)`,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              {/* Main Content Row */}
              <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
                {/* Left Gradient Accent Bar */}
                <div
                  style={{
                    width: '5px',
                    background: `linear-gradient(180deg, ${theme.accent} 0%, ${theme.primary} 50%, ${theme.secondary} 100%)`,
                    borderRadius: '20px 0 0 20px',
                    flexShrink: 0,
                    boxShadow: `0 0 20px ${theme.glow}`,
                  }}
                />

                {/* Content Container */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '18px 20px',
                  }}
                >
                  {/* Premium Animated Icon */}
                  <div
                    className="premium-toast-icon premium-toast-glow"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                      boxShadow: `
                        0 8px 20px -4px ${theme.glow},
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                      `,
                      '--glow-color': theme.glow,
                      '--glow-color-faded': theme.glowFaded,
                    } as React.CSSProperties}
                  >
                    <IconComponent size={26} color="white" strokeWidth={2.5} />
                  </div>

                  {/* Message Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isDarkMode ? theme.text : theme.textLight,
                        lineHeight: 1.5,
                        letterSpacing: '-0.01em',
                        textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {typeof t.message === 'string' ? t.message : 'Notification'}
                    </p>
                  </div>

                  {/* Premium Dismiss Button */}
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="premium-toast-dismiss"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: isDarkMode
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      color: isDarkMode ? theme.text : theme.textLight,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Clickable Link Button */}
              {hasLink && (
                <button
                  onClick={() => handleNavigate(t.id)}
                  className="premium-toast-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px 20px',
                    margin: '0 18px 14px 18px',
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    boxShadow: `
                      0 8px 20px -4px ${theme.glow},
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Sparkles size={16} strokeWidth={2} />
                  <span>Lihat Detail</span>
                  <ExternalLink size={14} strokeWidth={2.5} />
                </button>
              )}

              {/* Animated Progress Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: isDarkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  zIndex: 1,
                }}
              >
                <div
                  className="premium-toast-progress"
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary}, ${theme.secondary})`,
                    animationDuration: `${t.duration || 4000}ms`,
                    opacity: t.visible ? 1 : 0,
                    boxShadow: `0 0 10px ${theme.glow}`,
                  }}
                />
              </div>
            </div>
          );
        }}
      </HotToaster>
    </>
  );
}
