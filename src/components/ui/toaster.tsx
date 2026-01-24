import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, X, ExternalLink } from 'lucide-react';
import { toastLinks } from '@/hooks/use-toast';

// Premium Toast Component with Glassmorphism Design
export function Toaster() {
  const handleNavigate = (toastId: string) => {
    const link = toastLinks.get(toastId);
    if (link) {
      toast.dismiss(toastId);
      // Use window.location for navigation since we're outside React Router context
      window.location.href = link;
    }
  };

  return (
    <>
      {/* Global Styles for Premium Toast */}
      <style>{`
        @keyframes toast-slide-in {
          0% {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes toast-slide-out {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
        }
        
        @keyframes progress-shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        
        @keyframes icon-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        .premium-toast {
          animation: toast-slide-in 0.4s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }
        
        .premium-toast[data-visible="false"] {
          animation: toast-slide-out 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }
        
        .premium-toast-icon {
          animation: icon-pulse 0.6s ease-out;
        }
        
        .premium-toast-progress {
          animation: progress-shrink linear forwards;
          transform-origin: left;
        }
        
        .premium-toast-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        .premium-toast-link {
          transition: all 0.2s ease;
        }
        
        .premium-toast-link:hover {
          transform: translateX(2px);
        }
      `}</style>

      <HotToaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000,
        }}
      >
        {(t) => {
          const hasLink = toastLinks.has(t.id);

          return (
            <div
              className="premium-toast"
              data-visible={t.visible}
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '420px',
                minWidth: '320px',
                background: t.type === 'error'
                  ? 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 202, 202, 0.9) 100%)'
                  : t.type === 'success'
                    ? 'linear-gradient(135deg, rgba(220, 252, 231, 0.95) 0%, rgba(187, 247, 208, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: t.type === 'error'
                  ? '0 20px 40px -12px rgba(239, 68, 68, 0.25), 0 8px 16px -8px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                  : t.type === 'success'
                    ? '0 20px 40px -12px rgba(34, 197, 94, 0.25), 0 8px 16px -8px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                    : '0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 8px 16px -8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                border: t.type === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : t.type === 'success'
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(229, 231, 235, 0.8)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Shimmer Effect Overlay */}
              <div
                className="premium-toast-shimmer"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  pointerEvents: 'none',
                  opacity: 0.3,
                }}
              />

              {/* Main Content Row */}
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                {/* Left Accent Bar */}
                <div
                  style={{
                    width: '4px',
                    background: t.type === 'error'
                      ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                      : t.type === 'success'
                        ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '4px 0 0 4px',
                    flexShrink: 0,
                  }}
                />

                {/* Content Container */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                  }}
                >
                  {/* Premium Icon with Gradient Background */}
                  <div
                    className="premium-toast-icon"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: t.type === 'error'
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : t.type === 'success'
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: t.type === 'error'
                        ? '0 4px 12px -2px rgba(239, 68, 68, 0.4)'
                        : t.type === 'success'
                          ? '0 4px 12px -2px rgba(34, 197, 94, 0.4)'
                          : '0 4px 12px -2px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    {t.type === 'error' ? (
                      <XCircle size={24} color="white" strokeWidth={2.5} />
                    ) : t.type === 'success' ? (
                      <CheckCircle size={24} color="white" strokeWidth={2.5} />
                    ) : (
                      <Info size={24} color="white" strokeWidth={2.5} />
                    )}
                  </div>

                  {/* Message Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: t.type === 'error'
                          ? '#991b1b'
                          : t.type === 'success'
                            ? '#166534'
                            : '#1f2937',
                        lineHeight: 1.5,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {typeof t.message === 'string' ? t.message : 'Notification'}
                    </p>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'rgba(0, 0, 0, 0.05)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                      color: t.type === 'error'
                        ? '#991b1b'
                        : t.type === 'success'
                          ? '#166534'
                          : '#6b7280',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <X size={16} strokeWidth={2.5} />
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
                    gap: '8px',
                    padding: '10px 18px',
                    margin: '0 16px 12px 16px',
                    background: t.type === 'error'
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : t.type === 'success'
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    boxShadow: t.type === 'error'
                      ? '0 4px 12px -2px rgba(239, 68, 68, 0.35)'
                      : t.type === 'success'
                        ? '0 4px 12px -2px rgba(34, 197, 94, 0.35)'
                        : '0 4px 12px -2px rgba(59, 130, 246, 0.35)',
                  }}
                >
                  <span>Lihat Detail</span>
                  <ExternalLink size={14} strokeWidth={2.5} />
                </button>
              )}

              {/* Progress Bar */}
              <div
                className="premium-toast-progress"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: t.type === 'error'
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : t.type === 'success'
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  animationDuration: `${t.duration || 4000}ms`,
                  opacity: t.visible ? 1 : 0,
                }}
              />
            </div>
          );
        }}
      </HotToaster>
    </>
  );
}

