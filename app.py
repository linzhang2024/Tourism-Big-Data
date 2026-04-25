import streamlit as st
from pathlib import Path
import sys

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from utils.data_loader import get_data_loader, DataLoader
from utils.visualization import get_visualizer


def init_session_state():
    """初始化会话状态"""
    if 'data_source' not in st.session_state:
        st.session_state['data_source'] = 'default'  # 'default' 或 'uploaded'
    if 'uploaded_file_valid' not in st.session_state:
        st.session_state['uploaded_file_valid'] = False
    if 'upload_error' not in st.session_state:
        st.session_state['upload_error'] = None
    if 'data_loader' not in st.session_state:
        st.session_state['data_loader'] = None


def handle_file_upload():
    """处理文件上传"""
    uploaded_file = st.sidebar.file_uploader(
        "上传旅游数据CSV文件",
        type=['csv'],
        help="请上传包含必要字段的CSV文件"
    )
    
    if uploaded_file is not None:
        # 创建新的数据加载器实例
        data_loader = DataLoader()
        
        # 校验文件
        validation_result = data_loader.validate_uploaded_file(uploaded_file)
        
        if validation_result['valid']:
            try:
                # 重置文件指针
                uploaded_file.seek(0)
                # 加载数据
                data_loader.load_from_uploaded_file(uploaded_file)
                
                # 更新会话状态
                st.session_state['data_source'] = 'uploaded'
                st.session_state['uploaded_file_valid'] = True
                st.session_state['upload_error'] = None
                st.session_state['data_loader'] = data_loader
                
                st.sidebar.success(f"✅ 成功加载数据，共 {len(data_loader.get_data())} 条记录")
                
            except Exception as e:
                st.session_state['uploaded_file_valid'] = False
                st.session_state['upload_error'] = str(e)
                st.sidebar.error(f"❌ 数据加载失败: {str(e)}")
        else:
            st.session_state['uploaded_file_valid'] = False
            if 'error' in validation_result:
                st.session_state['upload_error'] = validation_result['error']
                st.sidebar.error(f"❌ 文件校验失败: {validation_result['error']}")
            else:
                missing_fields = ', '.join(validation_result['missing'])
                available_fields = ', '.join(validation_result['available'])
                error_msg = f"缺少必要字段: {missing_fields}"
                st.session_state['upload_error'] = error_msg
                
                # 显示详细的错误信息
                st.sidebar.error(f"❌ {error_msg}")
                st.sidebar.info(
                    f"📋 必要字段: {', '.join(DataLoader.REQUIRED_FIELDS)}\n"
                    f"📄 您的文件包含: {available_fields if available_fields else '无'}"
                )
    else:
        # 如果没有上传文件，使用默认数据
        if st.session_state.get('data_source') == 'uploaded':
            st.session_state['data_source'] = 'default'
            st.session_state['data_loader'] = None
        
        # 显示必要字段说明
        st.sidebar.info(
            f"📋 必要字段说明:\n"
            f"- date: 日期 (如: 2024-01-15)\n"
            f"- city: 城市名称\n"
            f"- visitors: 游客数量\n"
            f"- consumption: 消费金额\n"
            f"- category: 消费类别"
        )
    
    return uploaded_file


def get_current_data_loader():
    """获取当前使用的数据加载器"""
    if st.session_state['data_source'] == 'uploaded' and st.session_state.get('data_loader'):
        return st.session_state['data_loader']
    else:
        # 使用默认数据加载器
        if st.session_state.get('data_loader') is None:
            try:
                data_loader = get_data_loader()
                data_loader.load_data()
                st.session_state['data_loader'] = data_loader
            except Exception as e:
                st.error(f"默认数据加载失败: {e}")
                return None
        return st.session_state['data_loader']


def set_page_config():
    """配置页面"""
    st.set_page_config(
        page_title="旅游大数据分析平台",
        page_icon="🏖️",
        layout="wide",
        initial_sidebar_state="expanded",
        menu_items={
            'About': "旅游大数据分析平台 - 基于 Python + Streamlit"
        }
    )


def load_custom_css():
    """加载自定义 CSS 样式"""
    st.markdown("""
        <style>
        .main-header {
            font-size: 2.5rem;
            color: #1f77b4;
            text-align: center;
            margin-bottom: 0.5rem;
        }
        .sub-header {
            font-size: 1.2rem;
            color: #6c757d;
            text-align: center;
            margin-bottom: 2rem;
        }
        .metric-card {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #1f77b4;
        }
        .metric-label {
            font-size: 1rem;
            color: #6c757d;
            margin-top: 0.5rem;
        }
        </style>
    """, unsafe_allow_html=True)


def init_data():
    """初始化数据"""
    try:
        data_loader = get_data_loader()
        data_loader.load_data()
        return data_loader
    except Exception as e:
        st.error(f"数据加载失败: {e}")
        return None


def display_key_metrics(data_loader):
    """显示关键指标"""
    data = data_loader.get_data()
    
    # 计算关键指标
    total_visitors = data['visitors'].sum()
    total_consumption = data['consumption'].sum()
    total_cities = data['city'].nunique()
    total_records = len(data)
    
    # 创建四列布局
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{total_visitors:,.0f}</div>
            <div class="metric-label">游客总数</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">¥{total_consumption:,.0f}</div>
            <div class="metric-label">消费总额</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{total_cities}</div>
            <div class="metric-label">覆盖城市</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{total_records}</div>
            <div class="metric-label">数据记录</div>
        </div>
        """, unsafe_allow_html=True)


def display_charts(data_loader, visualizer):
    """显示图表"""
    # 获取数据
    top_cities = data_loader.get_top_cities(top_n=10)
    monthly_trend = data_loader.get_monthly_trend()
    consumption_dist = data_loader.get_consumption_distribution()
    
    # 创建两列布局
    col1, col2 = st.columns(2)
    
    with col1:
        # 热门旅游城市排行
        st.subheader("🔥 热门旅游城市排行")
        cities_chart = visualizer.create_top_cities_chart(top_cities, top_n=10)
        st.plotly_chart(cities_chart, use_container_width=True)
    
    with col2:
        # 消费分布饼图
        st.subheader("💰 消费分布")
        pie_chart = visualizer.create_consumption_pie_chart(consumption_dist)
        st.plotly_chart(pie_chart, use_container_width=True)
    
    # 月度游客趋势
    st.subheader("📈 月度游客趋势")
    trend_chart = visualizer.create_monthly_trend_chart(monthly_trend)
    st.plotly_chart(trend_chart, use_container_width=True)


def display_sidebar(data_loader):
    """显示侧边栏"""
    st.sidebar.title("⚙️ 控制面板")
    
    # 数据信息
    st.sidebar.subheader("📊 数据信息")
    try:
        available_years = data_loader.get_available_years()
        available_cities = data_loader.get_available_cities()
        
        st.sidebar.write(f"**数据年份**: {', '.join(map(str, available_years))}")
        st.sidebar.write(f"**覆盖城市**: {len(available_cities)} 个")
        
        # 城市选择器
        st.sidebar.subheader("🌍 城市筛选")
        selected_cities = st.sidebar.multiselect(
            "选择城市",
            options=available_cities,
            default=available_cities
        )
        
        # 年份选择器
        st.sidebar.subheader("📅 年份筛选")
        selected_year = st.sidebar.selectbox(
            "选择年份",
            options=["全部"] + available_years,
            index=0
        )
        
        return {
            "selected_cities": selected_cities,
            "selected_year": selected_year
        }
    except Exception as e:
        st.sidebar.error(f"获取数据信息失败: {e}")
        return None


def main():
    """主函数"""
    # 设置页面配置
    set_page_config()
    
    # 加载自定义样式
    load_custom_css()
    
    # 初始化会话状态
    init_session_state()
    
    # 在侧边栏添加文件上传入口
    st.sidebar.title("📁 数据上传")
    handle_file_upload()
    
    # 获取当前数据加载器
    data_loader = get_current_data_loader()
    if data_loader is None:
        st.error("无法加载数据，请检查文件或使用默认数据")
        return
    
    # 获取可视化工具
    visualizer = get_visualizer()
    
    # 页面标题
    st.markdown('<h1 class="main-header">🏖️ 旅游大数据分析平台</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">基于 Python + Streamlit 的旅游数据分析与可视化平台</p>', unsafe_allow_html=True)
    
    # 显示数据来源信息
    if st.session_state['data_source'] == 'uploaded':
        st.success("✅ 当前使用上传的自定义数据")
    else:
        st.info("ℹ️ 当前使用内置示例数据，您可以在侧边栏上传自己的数据")
    
    # 显示侧边栏
    sidebar_filters = display_sidebar(data_loader)
    
    # 显示关键指标
    st.markdown("---")
    st.subheader("📊 关键指标概览")
    display_key_metrics(data_loader)
    
    # 显示图表
    st.markdown("---")
    display_charts(data_loader, visualizer)
    
    # 页脚
    st.markdown("---")
    st.markdown(
        """
        <div style='text-align: center; color: #6c757d;'>
            <p>旅游大数据分析平台 | 数据仅供演示</p>
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
