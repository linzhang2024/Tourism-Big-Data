import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TrendDashboard } from './TrendDashboard';
import { getTrends } from '../api';
import { TrendModel } from '../types';

vi.mock('../api', () => ({
  getTrends: vi.fn(),
}));

vi.mock('echarts-for-react', () => ({
  default: vi.fn(({ option, onEvents, style }) => {
    const mockOnClick = onEvents?.click;
    return (
      <div
        data-testid="mock-echarts"
        style={style}
        onClick={() => {
          if (mockOnClick && option?.xAxis?.data?.length > 0) {
            mockOnClick({ name: option.xAxis.data[0] });
          }
        }}
      >
        <div data-testid="chart-title">{option?.title?.text}</div>
        <div data-testid="chart-cities">
          {option?.xAxis?.data?.join(', ')}
        </div>
      </div>
    );
  }),
}));

const mockTrendData: TrendModel[] = [
  { city: '北京', keyword: '美食探店', score: 95.5 },
  { city: '北京', keyword: '景点打卡', score: 88.3 },
  { city: '北京', keyword: '历史文化', score: 92.1 },
  { city: '上海', keyword: '购物血拼', score: 90.2 },
  { city: '上海', keyword: '美食街', score: 85.6 },
  { city: '广州', keyword: '美食探店', score: 93.8 },
  { city: '广州', keyword: '夜市', score: 87.4 },
  { city: '深圳', keyword: '主题公园', score: 82.5 },
  { city: '深圳', keyword: '海滨度假', score: 79.3 },
];

describe('TrendDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    vi.mocked(getTrends).mockImplementation(
      () => new Promise(() => {})
    );

    render(<TrendDashboard />);

    expect(screen.getByText('正在加载旅游趋势数据...')).toBeInTheDocument();
  });

  it('should fetch and render data successfully', async () => {
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    render(<TrendDashboard />);

    expect(screen.getByText('正在加载旅游趋势数据...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    expect(getTrends).toHaveBeenCalledTimes(1);
    expect(getTrends).toHaveBeenCalledWith(undefined);
  });

  it('should pass cities parameter to API when provided', async () => {
    const testCities = ['北京', '上海'];
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    render(<TrendDashboard cities={testCities} />);

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    expect(getTrends).toHaveBeenCalledWith(testCities);
  });

  it('should show error message when API fails', async () => {
    const errorMessage = '获取旅游趋势数据失败';
    vi.mocked(getTrends).mockRejectedValue(new Error(errorMessage));

    render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.getByText('❌ 数据加载失败')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should have reload button when error occurs', async () => {
    const errorMessage = '获取旅游趋势数据失败';
    vi.mocked(getTrends).mockRejectedValue(new Error(errorMessage));

    const { container } = render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.getByText('重新加载')).toBeInTheDocument();
    });

    const reloadButton = screen.getByText('重新加载');
    expect(reloadButton).toBeInTheDocument();
  });

  it('should render chart container with correct data', async () => {
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    const { container } = render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toBeInTheDocument();

    const mockEcharts = screen.getByTestId('mock-echarts');
    expect(mockEcharts).toBeInTheDocument();

    const chartTitle = screen.getByTestId('chart-title');
    expect(chartTitle).toHaveTextContent('各城市旅游热度排行榜');

    const chartCities = screen.getByTestId('chart-cities');
    expect(chartCities.textContent).toContain('北京');
    expect(chartCities.textContent).toContain('上海');
  });

  it('should show keyword modal when clicking on a city bar', async () => {
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    const { container } = render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();

    const mockEcharts = screen.getByTestId('mock-echarts');
    fireEvent.click(mockEcharts);

    await waitFor(() => {
      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    const keywordItems = container.querySelectorAll('.keyword-item');
    expect(keywordItems.length).toBeGreaterThan(0);

    expect(screen.getByText('美食探店')).toBeInTheDocument();
    expect(screen.getByText('景点打卡')).toBeInTheDocument();
    expect(screen.getByText('历史文化')).toBeInTheDocument();
  });

  it('should close modal when clicking close button', async () => {
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    const { container } = render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    const mockEcharts = screen.getByTestId('mock-echarts');
    fireEvent.click(mockEcharts);

    await waitFor(() => {
      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();
    });
  });

  it('should call API only once on mount', async () => {
    vi.mocked(getTrends).mockResolvedValue(mockTrendData);

    render(<TrendDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('正在加载旅游趋势数据...')).not.toBeInTheDocument();
    });

    expect(getTrends).toHaveBeenCalledTimes(1);
  });
});
