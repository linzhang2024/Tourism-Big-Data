import React, { useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { TrendModel } from '../types';
import { getTrends } from '../api';

interface CityData {
  city: string;
  totalScore: number;
  keywords: { keyword: string; score: number }[];
}

interface TrendDashboardProps {
  cities?: string[];
}

export const TrendDashboard: React.FC<TrendDashboardProps> = ({ cities }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const processData = useCallback((trends: TrendModel[]): CityData[] => {
    const cityMap = new Map<string, CityData>();

    trends.forEach((trend) => {
      if (!cityMap.has(trend.city)) {
        cityMap.set(trend.city, {
          city: trend.city,
          totalScore: 0,
          keywords: [],
        });
      }

      const cityInfo = cityMap.get(trend.city)!;
      cityInfo.totalScore += trend.score;
      cityInfo.keywords.push({
        keyword: trend.keyword,
        score: trend.score,
      });
    });

    return Array.from(cityMap.values()).sort((a, b) => b.totalScore - a.totalScore);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const trends = await getTrends(cities);
        const processed = processData(trends);
        setCityData(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cities, processData]);

  const handleChartClick = (params: any) => {
    const cityName = params.name;
    const city = cityData.find((c) => c.city === cityName);
    if (city) {
      setSelectedCity(city);
      setModalVisible(true);
    }
  };

  const getChartOption = (): EChartsOption => {
    return {
      title: {
        text: '各城市旅游热度排行榜',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0];
          const city = cityData.find((c) => c.city === data.name);
          if (city) {
            let html = `<div style="font-weight: bold; margin-bottom: 8px;">${city.city}</div>`;
            html += `<div style="margin-bottom: 4px;">总热度: ${city.totalScore.toFixed(2)}</div>`;
            html += '<div style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">';
            html += '<div style="font-weight: bold; margin-bottom: 4px;">热门关键词:</div>';
            city.keywords.slice(0, 5).forEach((kw) => {
              html += `<div>${kw.keyword}: ${kw.score.toFixed(2)}</div>`;
            });
            html += '</div>';
            return html;
          }
          return `${data.name}: ${data.value}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: cityData.map((c) => c.city),
        axisLabel: {
          rotate: 30,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        name: '热度评分',
      },
      series: [
        {
          name: '热度评分',
          type: 'bar',
          data: cityData.map((c) => c.totalScore),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];
              return colors[params.dataIndex % colors.length];
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  };

  const onEvents = {
    click: handleChartClick,
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCity(null);
  };

  if (loading) {
    return (
      <div className="trend-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>正在加载旅游趋势数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trend-dashboard error">
        <div className="error-message">
          <h3>❌ 数据加载失败</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      </div>
    );
  }

  return (
    <div className="trend-dashboard">
      <div className="chart-container">
        <ReactECharts
          option={getChartOption()}
          style={{ height: '500px', width: '100%' }}
          onEvents={onEvents}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {modalVisible && selectedCity && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCity.city} - 热门关键词</h3>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="keywords-list">
                {selectedCity.keywords.map((kw, index) => (
                  <div key={index} className="keyword-item">
                    <span className="keyword-rank">#{index + 1}</span>
                    <span className="keyword-name">{kw.keyword}</span>
                    <span className="keyword-score">{kw.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
