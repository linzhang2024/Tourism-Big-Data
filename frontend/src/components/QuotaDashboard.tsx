import React, { useState, useEffect } from 'react';
import { TenantWithQuota } from '../types';
import { getMyTenantInfo } from '../api';

const QuotaDashboard: React.FC = () => {
  const [tenantInfo, setTenantInfo] = useState<TenantWithQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyTenantInfo();
      setTenantInfo(data);
    } catch (err) {
      console.error('获取租户信息失败:', err);
      setError(err instanceof Error ? err.message : '获取配额信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantInfo();
    const interval = setInterval(fetchTenantInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 90) return { text: '即将用完', color: '#ef4444' };
    if (percentage >= 70) return { text: '用量较大', color: '#f59e0b' };
    return { text: '充足', color: '#10b981' };
  };

  const renderProgressBar = (
    label: string,
    icon: string,
    used: number,
    limit: number,
    percentage: number,
    remaining: number
  ) => {
    const status = getStatusLabel(percentage);
    
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{icon}</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span 
              style={{ 
                fontSize: '0.875rem', 
                fontWeight: 500,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: status.color === '#10b981' ? '#d1fae5' : 
                           status.color === '#f59e0b' ? '#fef3c7' : '#fee2e2',
                color: status.color
              }}
            >
              {status.text}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {used} / {limit}
            </span>
          </div>
        </div>
        
        <div style={{ 
          height: '16px', 
          background: '#e5e7eb', 
          borderRadius: '8px', 
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div 
            style={{ 
              height: '100%', 
              background: `linear-gradient(90deg, ${getPercentageColor(percentage)}, ${getPercentageColor(percentage)}dd)`,
              width: `${Math.min(percentage, 100)}%`,
              transition: 'width 0.5s ease',
              borderRadius: '8px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#6b7280' }}>
            已使用: <strong style={{ color: '#374151' }}>{used}</strong>
          </span>
          <span style={{ color: '#10b981', fontWeight: 500 }}>
            剩余: <strong>{remaining}</strong>
          </span>
        </div>
      </div>
    );
  };

  const renderGauge = (
    label: string,
    icon: string,
    percentage: number,
    used: number,
    limit: number
  ) => {
    const color = getPercentageColor(percentage);
    const displayPercentage = Math.min(percentage, 100);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (displayPercentage / 100) * circumference;
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        padding: '1rem'
      }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: color }}>
              {displayPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
        
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
            <span>{icon}</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {used} / {limit}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        minHeight: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#6b7280', fontSize: '1rem' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          {' '}加载配额信息中...
        </div>
      </div>
    );
  }

  if (error || !tenantInfo) {
    return (
      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '1.5rem' }}>⚠️</div>
        <div style={{ color: '#6b7280' }}>{error || '无法获取配额信息'}</div>
        <button
          onClick={fetchTenantInfo}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 资源使用配额
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            当前租户: <strong style={{ color: '#374151' }}>{tenantInfo.name}</strong>
            {tenantInfo.code && <span style={{ color: '#9ca3af' }}> ({tenantInfo.code})</span>}
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        {renderGauge('行程数量', '🗺️', tenantInfo.itinerary_percentage, tenantInfo.itinerary_used, tenantInfo.itinerary_limit)}
        {renderGauge('AI调用', '🤖', tenantInfo.ai_calls_percentage, tenantInfo.ai_calls_used, tenantInfo.ai_calls_limit)}
      </div>

      <div style={{ padding: '0 0.5rem' }}>
        {renderProgressBar(
          '行程数量配额',
          '🗺️',
          tenantInfo.itinerary_used,
          tenantInfo.itinerary_limit,
          tenantInfo.itinerary_percentage,
          tenantInfo.itinerary_remaining
        )}
        
        {renderProgressBar(
          'AI调用次数配额',
          '🤖',
          tenantInfo.ai_calls_used,
          tenantInfo.ai_calls_limit,
          tenantInfo.ai_calls_percentage,
          tenantInfo.ai_calls_remaining
        )}
      </div>

      {(tenantInfo.itinerary_percentage >= 70 || tenantInfo.ai_calls_percentage >= 70) && (
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: tenantInfo.itinerary_percentage >= 90 || tenantInfo.ai_calls_percentage >= 90 
            ? '#fee2e2' 
            : '#fef3c7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>
            {tenantInfo.itinerary_percentage >= 90 || tenantInfo.ai_calls_percentage >= 90 ? '🚨' : '⚠️'}
          </span>
          <div>
            <div style={{ 
              fontWeight: 600, 
              color: tenantInfo.itinerary_percentage >= 90 || tenantInfo.ai_calls_percentage >= 90 
                ? '#dc2626' 
                : '#92400e',
              marginBottom: '0.25rem'
            }}>
              配额预警
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: tenantInfo.itinerary_percentage >= 90 || tenantInfo.ai_calls_percentage >= 90 
                ? '#991b1b' 
                : '#78350f'
            }}>
              {tenantInfo.itinerary_percentage >= 70 && (
                <span>行程数量已使用 {tenantInfo.itinerary_percentage}%；</span>
              )}
              {tenantInfo.ai_calls_percentage >= 70 && (
                <span>AI调用次数已使用 {tenantInfo.ai_calls_percentage}%；</span>
              )}
              <span>请联系管理员提升配额。</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotaDashboard;
