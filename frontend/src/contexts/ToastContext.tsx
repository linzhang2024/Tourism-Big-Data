import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  hideToast: (id: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  confirm: (message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [nextId, setNextId] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration: number = 4000) => {
    const id = nextId;
    setNextId(prev => prev + 1);
    
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [nextId, hideToast]);

  const success = useCallback((message: string, title?: string, duration?: number) => {
    showToast('success', message, title, duration);
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    showToast('error', message, title, duration);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    showToast('warning', message, title, duration);
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    showToast('info', message, title, duration);
  }, [showToast]);

  const confirm = useCallback((message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => {
    setConfirmDialog({
      visible: true,
      title: title || '确认操作',
      message,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(null);
        onCancel?.();
      },
    });
  }, []);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
    }
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
          borderColor: '#34d399',
          color: '#065f46',
          iconColor: '#10b981',
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          borderColor: '#f87171',
          color: '#991b1b',
          iconColor: '#ef4444',
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderColor: '#fbbf24',
          color: '#92400e',
          iconColor: '#f59e0b',
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderColor: '#60a5fa',
          color: '#1e40af',
          iconColor: '#3b82f6',
        };
    }
  };

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
    confirm,
  };

  const toastContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '500px',
    width: 'calc(100% - 40px)',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  };

  const dialogStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
    padding: '2rem',
    maxWidth: '450px',
    width: 'calc(100% - 40px)',
  };

  return (
    <ToastContext.Provider value={value}>
      <>{children}</>
      
      <div style={toastContainerStyle}>
        {toasts.map(toast => {
          const style = getToastStyle(toast.type);
          const toastItemStyle: React.CSSProperties = {
            padding: '16px 20px',
            borderRadius: '12px',
            border: `1px solid ${style.borderColor}`,
            background: style.background,
            color: style.color,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          };
          
          return (
            <div
              key={toast.id}
              style={toastItemStyle}
              onClick={() => hideToast(toast.id)}
            >
              <div style={{
                fontSize: '1.25rem',
                color: style.iconColor,
                flexShrink: 0,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.6)',
              }}>
                {getToastIcon(toast.type)}
              </div>
              <div style={{
                flex: 1,
                minWidth: 0,
              }}>
                {toast.title && (
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    marginBottom: '4px',
                  }}>
                    {toast.title}
                  </div>
                )}
                <div style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {toast.message}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hideToast(toast.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  opacity: 0.6,
                  padding: '0',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {confirmDialog && confirmDialog.visible && (
        <div style={overlayStyle} onClick={confirmDialog.onCancel}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '1rem',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}>
                ?
              </div>
              <h3 style={{
                margin: 0,
                color: '#374151',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}>
                {confirmDialog.title}
              </h3>
            </div>
            
            <div style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
              paddingLeft: '52px',
            }}>
              {confirmDialog.message}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
