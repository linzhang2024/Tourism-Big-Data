import React from 'react';
import { ItineraryResponse } from '../types';

interface ItineraryResultProps {
  itinerary: ItineraryResponse;
}

export const ItineraryResult: React.FC<ItineraryResultProps> = ({ itinerary }) => {
  return (
    <div className="result-card">
      <div className="result-header">
        <h2>🎉 您的专属行程已生成</h2>
        <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>{itinerary.title}</h3>
        <div className="result-summary">
          <div className="summary-item">
            <div className="summary-label">🚀 出发地</div>
            <div className="summary-value">{itinerary.departure}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">📍 目的地</div>
            <div className="summary-value">{itinerary.destination}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">📅 行程天数</div>
            <div className="summary-value">{itinerary.days} 天</div>
          </div>
          {itinerary.estimated_total_cost !== undefined && (
            <div className="summary-item">
              <div className="summary-label">💰 预估总费用</div>
              <div className="summary-value">¥{itinerary.estimated_total_cost.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#333', marginBottom: '1rem', fontSize: '1.25rem' }}>📋 详细行程</h3>
        {itinerary.daily_plans.map((dayPlan) => (
          <div key={dayPlan.day} className="day-plan">
            <div className="day-header">
              <div className="day-number">{dayPlan.day}</div>
              <div className="day-title">{dayPlan.summary}</div>
            </div>
            <div className="activity-list">
              {dayPlan.activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-time">{activity.time}</div>
                  <div className="activity-name">{activity.name}</div>
                  {activity.description && (
                    <div className="activity-details" style={{ marginBottom: '0.25rem' }}>
                      {activity.description}
                    </div>
                  )}
                  <div className="activity-details">
                    {activity.location && (
                      <span className="activity-location">📍 {activity.location}</span>
                    )}
                    {activity.estimated_cost !== undefined && activity.estimated_cost > 0 && (
                      <span className="activity-cost">¥{activity.estimated_cost}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {itinerary.tips && itinerary.tips.length > 0 && (
        <div className="tips-section">
          <h3>💡 温馨提示</h3>
          <ul className="tips-list">
            {itinerary.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
