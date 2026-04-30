import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { AnalysisResponse, CityHotspot, MonthlyTrend } from '../types';
import { getAnalysis, AnalysisParams } from '../api';

const DataInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const fetchData = useCallback(async (params?: AnalysisParams) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAnalysis(params);
      setAnalysisData(data);
      
      const cities = data.city_hotspots.map(h => h.name);
      setAvailableCities(cities);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据分析失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = () => {
    const params: AnalysisParams = {};
    if (startDate) {
      params.start_date = startDate;
    }
    if (endDate) {
      params.end_date = endDate;
    }
    if (selectedCities.length > 0) {
      params.destination_categories = selectedCities;
    }
    fetchData(params);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCities([]);
    fetchData();
  };

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) {
        return prev.filter(c => c !== city);
      } else {
        return [...prev, city];
      }
    });
  };

  const getHotspotChartOption = (): EChartsOption => {
    if (!analysisData || analysisData.city_hotspots.length === 0) {
      return {};
    }

    const hotspots = [...analysisData.city_hotspots].sort((a, b) => b.count - a.count);
    const topHotspots = hotspots.slice(0, 10);

    return {
      title: {
        text: '热门目的地分布',
        subtext: '按行程数量排序',
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
          const hotspot = analysisData.city_hotspots.find(h => h.name === data.name);
          if (hotspot) {
            return `
              <div style="font-weight: bold; margin-bottom: 8px;">${hotspot.name}</div>
              <div>行程数量: ${hotspot.count} 个</div>
              <div>平均预算: ¥${hotspot.avg_budget.toFixed(2)}</div>
              <div>总消费: ¥${hotspot.total_spending.toFixed(2)}</div>
            `;
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
        data: topHotspots.map(h => h.name),
        axisLabel: {
          rotate: 30,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        name: '行程数量',
      },
      series: [
        {
          name: '行程数量',
          type: 'bar',
          data: topHotspots.map(h => h.count),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b4bd'];
              return colors[params.dataIndex % colors.length];
            },
            borderRadius: [8, 8, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          animationDuration: 1000,
          animationEasing: 'elasticOut',
        },
      ],
    };
  };

  const getTrendChartOption = (): EChartsOption => {
    if (!analysisData || analysisData.monthly_trends.length === 0) {
      return {};
    }

    const trends = [...analysisData.monthly_trends].sort((a, b) => a.month.localeCompare(b.month));

    return {
      title: {
        text: '月度消费趋势',
        subtext: '展示各月的总消费金额和平均预算',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const month = params[0].name;
          const trend = analysisData.monthly_trends.find(t => t.month === month);
          if (trend) {
            return `
              <div style="font-weight: bold; margin-bottom: 8px;">${month}</div>
              <div>行程总数: ${trend.total_itineraries} 个</div>
              <div>总消费: ¥${trend.total_spending.toFixed(2)}</div>
              <div>平均预算: ¥${trend.avg_budget.toFixed(2)}</div>
            `;
          }
          return month;
        },
      },
      legend: {
        data: ['总消费金额', '平均预算'],
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: trends.map(t => t.month),
        axisLabel: {
          rotate: 30,
          interval: 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '总消费金额 (元)',
          position: 'left',
          axisLabel: {
            formatter: '¥{value}',
          },
        },
        {
          type: 'value',
          name: '平均预算 (元)',
          position: 'right',
          axisLabel: {
            formatter: '¥{value}',
          },
        },
      ],
      series: [
        {
          name: '总消费金额',
          type: 'line',
          yAxisIndex: 0,
          data: trends.map(t => t.total_spending),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: '#5470c6',
            width: 3,
          },
          itemStyle: {
            color: '#5470c6',
          },
          areaStyle: {
            color: 'rgba(84, 112, 198, 0.15)',
          },
          animationDuration: 1500,
          animationEasing: 'cubicOut',
        },
        {
          name: '平均预算',
          type: 'line',
          yAxisIndex: 1,
          data: trends.map(t => t.avg_budget),
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: {
            color: '#91cc75',
            width: 3,
          },
          itemStyle: {
            color: '#91cc75',
          },
          animationDuration: 1500,
          animationEasing: 'cubicOut',
        },
      ],
    };
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #667eea', 
            borderRadius: '50%', 
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>加载数据分析中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ 
          background: '#fee2e2', 
          color: '#dc2626', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          错误: {error}
        </div>
        <button 
          onClick={() => fetchData()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📈 数据洞察</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>智能数据可视化分析 - 实时联动筛选条件</p>
      </div>

      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#374151' }}>🔍 筛选条件</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              开始日期
            </label>
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              结束日期
            </label>
            <input
              type="month"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {availableCities.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              目的地筛选（多选）
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityToggle(city)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: '1px solid #d1d5db',
                    background: selectedCities.includes(city) ? '#4f46e5' : 'white',
                    color: selectedCities.includes(city) ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleFilterChange}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4338ca';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4f46e5';
            }}
          >
            🔄 应用筛选
          </button>
          
          <button
            onClick={handleResetFilters}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            🔙 重置
          </button>
        </div>
      </div>

      {analysisData && (
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, marginBottom: '1rem', color: '#374151' }}>📊 数据汇总</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>{analysisData.summary.total_itineraries}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总行程数</div>
            </div>
            
            <div style={{ background: '#d1fae5', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#065f46' }}>¥{analysisData.summary.total_spending.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总消费金额</div>
            </div>
            
            <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>¥{analysisData.summary.avg_spending_per_itinerary.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>平均消费/行程</div>
            </div>
            
            <div style={{ background: '#fce7f3', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏙️</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9d174d' }}>{analysisData.summary.total_cities}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>覆盖城市数</div>
            </div>
            
            <div style={{ background: '#e0e7ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3730a3' }}>{analysisData.summary.top_city || '-'}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>最热门城市</div>
            </div>
            
            <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#075985' }}>{analysisData.summary.top_city_count}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>热门城市行程数</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr',
        gap: '2rem'
      }}>
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#374151' }}>🏙️ 热门目的地分布</h3>
              <p style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
                柱状图展示各城市的行程数量分布
              </p>
            </div>
          </div>
          
          {analysisData && analysisData.city_hotspots.length > 0 ? (
            <ReactECharts
              option={getHotspotChartOption()}
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
            />
          ) : (
            <div style={{ 
              height: '400px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: '#6b7280'
            }}>
              暂无热门目的地数据
            </div>
          )}
        </div>

        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#374151' }}>📉 月度消费趋势</h3>
              <p style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
                折线图展示各月的总消费金额和平均预算走势
              </p>
            </div>
          </div>
          
          {analysisData && analysisData.monthly_trends.length > 0 ? (
            <ReactECharts
              option={getTrendChartOption()}
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
            />
          ) : (
            <div style={{ 
              height: '400px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: '#6b7280'
            }}>
              暂无月度趋势数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataInsights;
