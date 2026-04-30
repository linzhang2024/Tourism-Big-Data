import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { AnalysisResponse, CityHotspot, MonthlyTrend } from '../types';
import { getAnalysis, AnalysisParams } from '../api';

type ErrorType = 'network' | 'auth' | 'forbidden' | 'not_found' | 'server' | 'unknown';

interface ErrorInfo {
  message: string;
  type: ErrorType;
  canRetry: boolean;
  detail?: string;
}

const DataInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [previousData, setPreviousData] = useState<AnalysisResponse | null>(null);

  const parseError = (err: unknown): ErrorInfo => {
    console.error('[DataInsights] 请求错误:', err);
    
    if (err instanceof Error) {
      const error = err as any;
      
      if (error.message === '登录已过期') {
        return {
          message: '登录已过期，请重新登录',
          type: 'auth',
          canRetry: false
        };
      }
      
      if (error.status === 403 || error.message?.includes('被拒绝') || error.message?.includes('权限')) {
        return {
          message: '您没有访问数据分析的权限',
          type: 'forbidden',
          canRetry: false,
          detail: error.message
        };
      }
      
      if (error.status === 404 || error.message?.includes('不存在')) {
        return {
          message: '请求的资源不存在',
          type: 'not_found',
          canRetry: false
        };
      }
      
      if (error.status && error.status >= 500) {
        return {
          message: '服务器错误，请稍后重试',
          type: 'server',
          canRetry: true,
          detail: error.message
        };
      }
      
      if (error.message?.includes('NetworkError') || 
          error.message?.includes('网络') || 
          !error.status) {
        return {
          message: '网络连接失败，请检查网络后重试',
          type: 'network',
          canRetry: true,
          detail: error.message
        };
      }
      
      return {
        message: error.message || '数据加载失败',
        type: 'unknown',
        canRetry: true
      };
    }
    
    return {
      message: '数据加载失败，请稍后重试',
      type: 'unknown',
      canRetry: true
    };
  };

  const getErrorMessageIcon = (type: ErrorType): string => {
    switch (type) {
      case 'network': return '🌐';
      case 'auth': return '🔐';
      case 'forbidden': return '🚫';
      case 'not_found': return '🔍';
      case 'server': return '⚙️';
      default: return '⚠️';
    }
  };

  const fetchData = useCallback(async (params?: AnalysisParams) => {
    setLoading(true);
    setErrorInfo(null);

    try {
      if (analysisData) {
        setPreviousData(analysisData);
      }
      
      const data = await getAnalysis(params);
      setAnalysisData(data);
      setPreviousData(data);
      
      const cities = data.city_hotspots.map(h => h.name);
      setAvailableCities(cities);
      
      console.log('[DataInsights] 数据加载成功');
    } catch (err) {
      const parsedError = parseError(err);
      setErrorInfo(parsedError);
      
      console.error('[DataInsights] 数据加载失败:', parsedError);
    } finally {
      setLoading(false);
    }
  }, [analysisData]);

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

  const getHotspotChartOption = (data: AnalysisResponse): EChartsOption => {
    if (!data || data.city_hotspots.length === 0) {
      return {};
    }

    const hotspots = [...data.city_hotspots].sort((a, b) => b.count - a.count);
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
          const hotspot = analysisData?.city_hotspots.find(h => h.name === data.name);
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

  const getTrendChartOption = (data: AnalysisResponse): EChartsOption => {
    if (!data || data.monthly_trends.length === 0) {
      return {};
    }

    const trends = [...data.monthly_trends].sort((a, b) => a.month.localeCompare(b.month));

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
          const trend = analysisData?.monthly_trends.find(t => t.month === month);
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

  const displayData = analysisData || previousData;

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

      {loading && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 1000
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
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>加载数据分析中...</p>
          </div>
        </div>
      )}

      {errorInfo && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>
              {getErrorMessageIcon(errorInfo.type)}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#dc2626', fontSize: '1.1rem' }}>
                数据加载失败
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                {errorInfo.message}
              </p>
              {errorInfo.detail && (
                <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  详细信息: {errorInfo.detail}
                </p>
              )}
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            {errorInfo.canRetry && (
              <button
                onClick={() => fetchData()}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
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
                🔄 重新加载
              </button>
            )}
            {errorInfo.type === 'auth' && (
              <button
                onClick={() => {
                  window.location.href = '/login';
                }}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🔐 前往登录
              </button>
            )}
          </div>
          
          {previousData && (
            <div style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid #fecaca' 
            }}>
              <p style={{ margin: 0, marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                💡 正在显示最近一次成功加载的数据（可能已过期）
              </p>
            </div>
          )}
        </div>
      )}

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
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#4338ca';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#4f46e5';
            }}
          >
            🔄 应用筛选
          </button>
          
          <button
            onClick={handleResetFilters}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'white';
            }}
          >
            🔙 重置
          </button>
        </div>
      </div>

      {displayData && (
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
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>{displayData.summary.total_itineraries}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总行程数</div>
            </div>
            
            <div style={{ background: '#d1fae5', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#065f46' }}>¥{displayData.summary.total_spending.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总消费金额</div>
            </div>
            
            <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>¥{displayData.summary.avg_spending_per_itinerary.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>平均消费/行程</div>
            </div>
            
            <div style={{ background: '#fce7f3', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏙️</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9d174d' }}>{displayData.summary.total_cities}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>覆盖城市数</div>
            </div>
            
            <div style={{ background: '#e0e7ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3730a3' }}>{displayData.summary.top_city || '-'}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>最热门城市</div>
            </div>
            
            <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#075985' }}>{displayData.summary.top_city_count}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>热门城市行程数</div>
            </div>
          </div>
        </div>
      )}

      {displayData ? (
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
            
            {displayData.city_hotspots.length > 0 ? (
              <ReactECharts
                option={getHotspotChartOption(displayData)}
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
            
            {displayData.monthly_trends.length > 0 ? (
              <ReactECharts
                option={getTrendChartOption(displayData)}
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
      ) : !loading && !errorInfo ? (
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#374151' }}>暂无数据</h3>
          <p style={{ margin: 0, color: '#6b7280' }}>目前还没有行程数据，无法生成数据洞察分析</p>
        </div>
      ) : null}
    </div>
  );
};

export default DataInsights;
