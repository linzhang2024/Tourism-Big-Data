import React, { useState } from 'react';
import { ItineraryForm } from './components/ItineraryForm';
import { ItineraryResult } from './components/ItineraryResult';
import { ItineraryRequest, ItineraryResponse } from './types';
import { generateItinerary } from './api';
import './App.css';

function App() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (request: ItineraryRequest) => {
    setLoading(true);
    setError(null);
    setItinerary(null);
    
    try {
      const response = await generateItinerary(request);
      setItinerary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成行程失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏖️ 智能旅游行程规划平台</h1>
        <p>AI 驱动的个性化旅游行程规划</p>
      </header>
      
      <main className="app-main">
        <div className="container">
          <ItineraryForm onSubmit={handleSubmit} loading={loading} />
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {itinerary && <ItineraryResult itinerary={itinerary} />}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>智能旅游行程规划平台 &copy; 2026</p>
      </footer>
    </div>
  );
}

export default App;
