import React, { useState } from 'react';
import { ItineraryRequest, InterestPreference } from '../types';

interface ItineraryFormProps {
  onSubmit: (request: ItineraryRequest) => void;
  loading: boolean;
}

const interestOptions: { value: InterestPreference; label: string }[] = [
  { value: 'culture', label: '🏛️ 文化古迹' },
  { value: 'nature', label: '🌿 自然风光' },
  { value: 'food', label: '🍜 美食探索' },
  { value: 'shopping', label: '🛍️ 购物血拼' },
  { value: 'adventure', label: '🧗 户外冒险' },
  { value: 'relaxation', label: '🧘 休闲放松' },
];

export const ItineraryForm: React.FC<ItineraryFormProps> = ({ onSubmit, loading }) => {
  const [departure, setDeparture] = useState('北京');
  const [destination, setDestination] = useState('三亚');
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState('5000');
  const [interests, setInterests] = useState<InterestPreference[]>(['culture', 'food']);

  const toggleInterest = (interest: InterestPreference) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      departure,
      destination,
      days,
      budget: budget ? parseFloat(budget) : undefined,
      interests: interests.length > 0 ? interests : undefined,
    });
  };

  return (
    <div className="form-card">
      <h2>✨ 规划您的完美旅行</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="departure">🚀 出发地</label>
            <input
              id="departure"
              type="text"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              placeholder="例如：北京"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="destination">📍 目的地</label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="例如：三亚"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="days">📅 行程天数</label>
            <select
              id="days"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 30].map(d => (
                <option key={d} value={d}>{d} 天</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="budget">💰 预算金额（元）</label>
            <input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="例如：5000"
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label>🎯 兴趣偏好</label>
          <div className="checkbox-group">
            {interestOptions.map(option => (
              <div
                key={option.value}
                className={`checkbox-item ${interests.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleInterest(option.value)}
              >
                <input
                  type="checkbox"
                  checked={interests.includes(option.value)}
                  onChange={() => toggleInterest(option.value)}
                  style={{ display: 'none' }}
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? '⏳ AI 正在规划您的行程...' : '🚀 开始规划行程'}
        </button>
      </form>
    </div>
  );
};
