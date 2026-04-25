import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
import io


class DataLoader:
    """数据加载器类，负责读取和处理旅游数据"""
    
    # 必要字段列表
    REQUIRED_FIELDS = ['date', 'city', 'visitors', 'consumption', 'category']
    
    def __init__(self, data_dir: str = None):
        """
        初始化数据加载器
        
        Args:
            data_dir: 数据目录路径
        """
        if data_dir is None:
            # 默认使用项目根目录下的 data 文件夹
            data_dir = Path(__file__).parent.parent / "data"
        self.data_dir = Path(data_dir)
        self._data: Optional[pd.DataFrame] = None
    
    def load_data(self, filename: str = "tourism_data.csv") -> pd.DataFrame:
        """
        加载 CSV 数据文件
        
        Args:
            filename: CSV 文件名
            
        Returns:
            加载的数据框
        """
        file_path = self.data_dir / filename
        
        if not file_path.exists():
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        self._data = pd.read_csv(file_path)
        self._preprocess_data()
        return self._data
    
    def load_from_uploaded_file(self, uploaded_file) -> pd.DataFrame:
        """
        从上传的文件加载数据
        
        Args:
            uploaded_file: Streamlit上传的文件对象
            
        Returns:
            加载的数据框
            
        Raises:
            ValueError: 如果文件格式无效或缺少必要字段
        """
        try:
            # 读取上传的文件
            if hasattr(uploaded_file, 'read'):
                # 从文件对象读取
                content = uploaded_file.read()
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                self._data = pd.read_csv(io.StringIO(content))
            else:
                # 从文件路径读取
                self._data = pd.read_csv(uploaded_file)
            
            # 校验字段
            validation_result = self._validate_fields()
            if not validation_result['valid']:
                raise ValueError(f"文件缺少必要字段: {', '.join(validation_result['missing'])}")
            
            # 校验数据类型
            dtype_validation = self._validate_data_types()
            if not dtype_validation['valid']:
                raise ValueError(dtype_validation['error'])
            
            # 预处理数据
            preprocess_result = self._preprocess_data()
            if not preprocess_result['success']:
                raise ValueError(f"数据预处理失败: {preprocess_result['error']}")
            
            return self._data
            
        except pd.errors.EmptyDataError:
            raise ValueError("上传的文件是空的")
        except pd.errors.ParserError:
            raise ValueError("文件格式不是有效的CSV")
        except UnicodeDecodeError:
            raise ValueError("文件编码格式不正确，请使用UTF-8编码")
        except ValueError as ve:
            raise ve
        except Exception as e:
            raise ValueError(f"数据加载失败: {str(e)}")
    
    def _validate_fields(self) -> Dict[str, Any]:
        """
        校验数据是否包含所有必要字段
        
        Returns:
            包含校验结果的字典，包含 'valid' 和 'missing' 字段
        """
        if self._data is None:
            return {'valid': False, 'missing': self.REQUIRED_FIELDS}
        
        # 检查哪些必要字段缺失
        missing_fields = [field for field in self.REQUIRED_FIELDS if field not in self._data.columns]
        
        return {
            'valid': len(missing_fields) == 0,
            'missing': missing_fields,
            'available': list(self._data.columns)
        }
    
    def _validate_data_types(self) -> Dict[str, Any]:
        """
        校验数据类型是否正确
        
        Returns:
            包含校验结果的字典
        """
        if self._data is None:
            return {'valid': False, 'error': '数据未加载'}
        
        errors = []
        
        # 校验 visitors 字段
        if 'visitors' in self._data.columns:
            try:
                # 尝试转换为数值类型
                pd.to_numeric(self._data['visitors'], errors='raise')
            except (ValueError, TypeError):
                errors.append('visitors 字段包含非数值数据')
        
        # 校验 consumption 字段
        if 'consumption' in self._data.columns:
            try:
                # 尝试转换为数值类型
                pd.to_numeric(self._data['consumption'], errors='raise')
            except (ValueError, TypeError):
                errors.append('consumption 字段包含非数值数据')
        
        # 校验 date 字段格式
        if 'date' in self._data.columns:
            try:
                # 尝试解析日期
                pd.to_datetime(self._data['date'], errors='raise')
            except (ValueError, TypeError):
                errors.append('date 字段格式不正确，应为标准日期格式（如：2024-01-15）')
        
        return {
            'valid': len(errors) == 0,
            'error': '; '.join(errors) if errors else None
        }
    
    def validate_uploaded_file(self, uploaded_file) -> Dict[str, Any]:
        """
        校验上传的文件是否符合要求（不加载到内存）
        
        Args:
            uploaded_file: Streamlit上传的文件对象
            
        Returns:
            包含校验结果的字典
        """
        try:
            # 读取文件的前几行来检查列名
            if hasattr(uploaded_file, 'read'):
                # 重置文件指针
                uploaded_file.seek(0)
                # 只读取前几行来获取列名
                content = uploaded_file.read(1024 * 10)  # 读取前10KB
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                df = pd.read_csv(io.StringIO(content), nrows=0)
            else:
                df = pd.read_csv(uploaded_file, nrows=0)
            
            # 检查必要字段
            missing_fields = [field for field in self.REQUIRED_FIELDS if field not in df.columns]
            
            return {
                'valid': len(missing_fields) == 0,
                'missing': missing_fields,
                'available': list(df.columns)
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'missing': [],
                'available': []
            }
    
    def _preprocess_data(self, return_result: bool = False) -> Optional[Dict[str, Any]]:
        """
        预处理数据
        
        Args:
            return_result: 是否返回处理结果，用于上传文件时的错误处理
            
        Returns:
            如果 return_result 为 True，返回包含处理结果的字典；否则返回 None
        """
        if self._data is None:
            if return_result:
                return {'success': False, 'error': '数据未加载'}
            return
        
        try:
            # 转换日期列
            if 'date' in self._data.columns:
                self._data['date'] = pd.to_datetime(self._data['date'], errors='raise')
                # 提取月份
                self._data['month'] = self._data['date'].dt.month
                self._data['year'] = self._data['date'].dt.year
            
            # 确保数值字段为正确类型
            if 'visitors' in self._data.columns:
                self._data['visitors'] = pd.to_numeric(self._data['visitors'], errors='raise')
            
            if 'consumption' in self._data.columns:
                self._data['consumption'] = pd.to_numeric(self._data['consumption'], errors='raise')
            
            if return_result:
                return {'success': True, 'error': None}
            
        except Exception as e:
            if return_result:
                return {'success': False, 'error': str(e)}
            # 对于默认数据加载，不抛出异常，保持向后兼容
            import traceback
            traceback.print_exc()
        
        return None
    
    def get_data(self) -> pd.DataFrame:
        """
        获取已加载的数据
        
        Returns:
            数据框
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        return self._data
    
    def get_top_cities(self, top_n: int = 10) -> pd.DataFrame:
        """
        获取热门旅游城市排行（按游客总数）
        
        Args:
            top_n: 返回前 N 个城市
            
        Returns:
            包含城市名称和游客数量的数据框
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        
        # 按城市分组，计算游客总数
        city_stats = self._data.groupby('city').agg({
            'visitors': 'sum',
            'consumption': 'sum'
        }).reset_index()
        
        # 按游客数量排序
        city_stats = city_stats.sort_values('visitors', ascending=False).head(top_n)
        
        # 重命名列
        city_stats.columns = ['city', 'total_visitors', 'total_consumption']
        
        return city_stats
    
    def get_monthly_trend(self, year: int = None) -> pd.DataFrame:
        """
        获取月度游客趋势
        
        Args:
            year: 筛选特定年份，默认不筛选
            
        Returns:
            包含月份和游客数量的数据框
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        
        filtered_data = self._data
        
        if year:
            filtered_data = self._data[self._data['year'] == year]
        
        # 按月份分组，计算游客总数
        monthly_stats = filtered_data.groupby('month').agg({
            'visitors': 'sum',
            'consumption': 'sum'
        }).reset_index()
        
        # 按月份排序
        monthly_stats = monthly_stats.sort_values('month')
        
        # 重命名列
        monthly_stats.columns = ['month', 'total_visitors', 'total_consumption']
        
        return monthly_stats
    
    def get_consumption_distribution(self) -> pd.DataFrame:
        """
        获取消费分布（按类别）
        
        Returns:
            包含消费类别和金额的数据框
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        
        # 按消费类别分组，计算消费总额
        category_stats = self._data.groupby('category').agg({
            'consumption': 'sum'
        }).reset_index()
        
        # 按消费金额排序
        category_stats = category_stats.sort_values('consumption', ascending=False)
        
        # 重命名列
        category_stats.columns = ['category', 'total_consumption']
        
        return category_stats
    
    def get_available_years(self) -> List[int]:
        """
        获取数据中包含的年份列表
        
        Returns:
            年份列表
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        
        return sorted(self._data['year'].unique().tolist())
    
    def get_available_cities(self) -> List[str]:
        """
        获取数据中包含的城市列表
        
        Returns:
            城市列表
        """
        if self._data is None:
            raise ValueError("数据未加载，请先调用 load_data()")
        
        return sorted(self._data['city'].unique().tolist())


# 全局数据加载器实例
_data_loader_instance: Optional[DataLoader] = None


def get_data_loader() -> DataLoader:
    """
    获取全局数据加载器实例（单例模式）
    
    Returns:
        数据加载器实例
    """
    global _data_loader_instance
    
    if _data_loader_instance is None:
        _data_loader_instance = DataLoader()
    
    return _data_loader_instance
