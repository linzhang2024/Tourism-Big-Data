import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional, List, Dict, Any


class Visualizer:
    """可视化工具类，负责生成各种图表"""
    
    def __init__(self, theme: str = "plotly_white"):
        """
        初始化可视化工具
        
        Args:
            theme: Plotly 图表主题
        """
        self.theme = theme
        self.color_palette = {
            'primary': '#1f77b4',
            'secondary': '#ff7f0e',
            'accent': '#2ca02c',
            'warning': '#d62728',
            'info': '#9467bd',
            'success': '#8c564b',
            'light': '#e377c2',
            'dark': '#7f7f7f'
        }
    
    def create_top_cities_chart(self, data: pd.DataFrame, top_n: int = 10) -> go.Figure:
        """
        创建热门旅游城市排行柱状图
        
        Args:
            data: 包含城市和游客数量的数据框
            top_n: 显示前 N 个城市
            
        Returns:
            Plotly 图表对象
        """
        if data.empty:
            return go.Figure()
        
        # 确保数据按游客数量排序并取前 N 个
        plot_data = data.sort_values('total_visitors', ascending=True).tail(top_n)
        
        # 创建柱状图
        fig = px.bar(
            plot_data,
            x='total_visitors',
            y='city',
            orientation='h',
            title=f'热门旅游城市排行 (Top {top_n})',
            labels={
                'total_visitors': '游客总数',
                'city': '城市'
            },
            color='total_visitors',
            color_continuous_scale='Viridis',
            text='total_visitors'
        )
        
        # 更新布局
        fig.update_layout(
            template=self.theme,
            xaxis_title='游客总数',
            yaxis_title='城市',
            title_x=0.5,
            showlegend=False,
            height=500
        )
        
        # 更新数据标签格式
        fig.update_traces(
            texttemplate='%{text:,.0f}',
            textposition='auto'
        )
        
        return fig
    
    def create_monthly_trend_chart(self, data: pd.DataFrame) -> go.Figure:
        """
        创建月度游客趋势折线图
        
        Args:
            data: 包含月份和游客数量的数据框
            
        Returns:
            Plotly 图表对象
        """
        if data.empty:
            return go.Figure()
        
        # 确保数据按月份排序
        plot_data = data.sort_values('month')
        
        # 创建折线图
        fig = go.Figure()
        
        # 添加游客数量折线
        fig.add_trace(
            go.Scatter(
                x=plot_data['month'],
                y=plot_data['total_visitors'],
                mode='lines+markers+text',
                name='游客数量',
                line=dict(
                    color=self.color_palette['primary'],
                    width=3
                ),
                marker=dict(
                    size=10,
                    color=self.color_palette['primary'],
                    line=dict(width=2, color='white')
                ),
                text=plot_data['total_visitors'],
                textposition='top center',
                texttemplate='%{text:,.0f}'
            )
        )
        
        # 创建月份标签
        month_labels = {
            1: '1月', 2: '2月', 3: '3月', 4: '4月', 5: '5月', 6: '6月',
            7: '7月', 8: '8月', 9: '9月', 10: '10月', 11: '11月', 12: '12月'
        }
        
        # 更新布局
        fig.update_layout(
            template=self.theme,
            title='月度游客趋势',
            title_x=0.5,
            xaxis_title='月份',
            yaxis_title='游客数量',
            xaxis=dict(
                tickmode='array',
                tickvals=list(month_labels.keys()),
                ticktext=list(month_labels.values())
            ),
            height=450,
            hovermode='x unified'
        )
        
        return fig
    
    def create_consumption_pie_chart(self, data: pd.DataFrame) -> go.Figure:
        """
        创建消费分布饼图
        
        Args:
            data: 包含消费类别和金额的数据框
            
        Returns:
            Plotly 图表对象
        """
        if data.empty:
            return go.Figure()
        
        # 创建饼图
        fig = px.pie(
            data,
            values='total_consumption',
            names='category',
            title='消费分布',
            color='category',
            color_discrete_map={
                '住宿': '#1f77b4',
                '餐饮': '#ff7f0e',
                '交通': '#2ca02c',
                '购物': '#d62728',
                '景点': '#9467bd'
            },
            hole=0.4,
            labels={
                'total_consumption': '消费金额',
                'category': '消费类别'
            }
        )
        
        # 更新布局
        fig.update_layout(
            template=self.theme,
            title_x=0.5,
            height=450,
            legend=dict(
                orientation='h',
                yanchor='bottom',
                y=-0.2,
                xanchor='center',
                x=0.5
            )
        )
        
        # 更新数据标签
        fig.update_traces(
            textposition='inside',
            textinfo='percent+label',
            texttemplate='%{label}<br>%{percent:.1%}',
            hovertemplate='%{label}<br>消费金额: %{value:,.0f} 元<br>占比: %{percent:.1%}<extra></extra>'
        )
        
        return fig
    
    def create_consumption_trend_chart(self, data: pd.DataFrame) -> go.Figure:
        """
        创建消费趋势折线图
        
        Args:
            data: 包含月份和消费金额的数据框
            
        Returns:
            Plotly 图表对象
        """
        if data.empty:
            return go.Figure()
        
        # 确保数据按月份排序
        plot_data = data.sort_values('month')
        
        # 创建折线图
        fig = go.Figure()
        
        # 添加消费金额折线
        fig.add_trace(
            go.Scatter(
                x=plot_data['month'],
                y=plot_data['total_consumption'],
                mode='lines+markers+text',
                name='消费金额',
                line=dict(
                    color=self.color_palette['accent'],
                    width=3
                ),
                marker=dict(
                    size=10,
                    color=self.color_palette['accent'],
                    line=dict(width=2, color='white')
                ),
                text=plot_data['total_consumption'],
                textposition='top center',
                texttemplate='%{text:,.0f}'
            )
        )
        
        # 创建月份标签
        month_labels = {
            1: '1月', 2: '2月', 3: '3月', 4: '4月', 5: '5月', 6: '6月',
            7: '7月', 8: '8月', 9: '9月', 10: '10月', 11: '11月', 12: '12月'
        }
        
        # 更新布局
        fig.update_layout(
            template=self.theme,
            title='月度消费趋势',
            title_x=0.5,
            xaxis_title='月份',
            yaxis_title='消费金额 (元)',
            xaxis=dict(
                tickmode='array',
                tickvals=list(month_labels.keys()),
                ticktext=list(month_labels.values())
            ),
            height=450,
            hovermode='x unified'
        )
        
        return fig


# 全局可视化工具实例
_visualizer_instance: Optional[Visualizer] = None


def get_visualizer() -> Visualizer:
    """
    获取全局可视化工具实例（单例模式）
    
    Returns:
        可视化工具实例
    """
    global _visualizer_instance
    
    if _visualizer_instance is None:
        _visualizer_instance = Visualizer()
    
    return _visualizer_instance
