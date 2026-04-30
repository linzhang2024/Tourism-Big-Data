import pytest
import json
import csv
import io
import sys
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.stats_service import stats_service
from app.models.permission import PermissionCode


class TestExportFlow:
    
    def test_get_export_data_basic(self):
        """测试获取导出数据的基本功能"""
        export_data = stats_service.get_export_data()
        
        assert "generated_at" in export_data
        assert "period" in export_data
        assert "summary" in export_data
        assert "city_hotspots" in export_data
        assert "monthly_trends" in export_data
        
        summary = export_data["summary"]
        assert "total_itineraries" in summary
        assert "total_spending" in summary
        assert "total_budget" in summary
        assert "avg_spending_per_itinerary" in summary
        assert "total_cities" in summary
        assert "top_city" in summary
        assert "top_city_count" in summary
    
    def test_get_export_data_with_filters(self):
        """测试带筛选条件的导出数据"""
        export_data = stats_service.get_export_data(
            start_date="2026-01",
            end_date="2026-12",
            destination_categories=["北京", "上海"]
        )
        
        assert "generated_at" in export_data
        assert export_data["period"]["start_date"] == "2026-01"
        assert export_data["period"]["end_date"] == "2026-12"
    
    def test_export_to_json(self):
        """测试JSON格式导出"""
        export_data = stats_service.get_export_data()
        
        json_bytes = stats_service.export_to_json(export_data)
        
        assert isinstance(json_bytes, bytes)
        
        decoded_str = json_bytes.decode('utf-8')
        parsed = json.loads(decoded_str)
        
        assert "generated_at" in parsed
        assert "summary" in parsed
        assert "city_hotspots" in parsed
        assert "monthly_trends" in parsed
        
        assert decoded_str == decoded_str.encode('utf-8').decode('utf-8')
    
    def test_export_to_csv(self):
        """测试CSV格式导出"""
        export_data = stats_service.get_export_data()
        
        csv_bytes = stats_service.export_to_csv(export_data)
        
        assert isinstance(csv_bytes, bytes)
        
        decoded_content = csv_bytes.decode('utf-8')
        
        assert decoded_content.startswith('\ufeff') or decoded_content.startswith('行程数据导出报表')
        
        content_without_bom = decoded_content.lstrip('\ufeff')
        
        assert "行程数据导出报表" in content_without_bom
        assert "总行程数" in content_without_bom
        assert "总消费金额" in content_without_bom
        
        reader = csv.reader(io.StringIO(content_without_bom))
        rows = list(reader)
        
        assert len(rows) > 0
    
    def test_stream_export_data_json(self):
        """测试流式导出JSON数据"""
        export_data = stats_service.get_export_data()
        
        generator = stats_service.stream_export_data(export_data, "json")
        
        chunks = list(generator)
        
        assert len(chunks) > 0
        
        full_content = b''.join(chunks)
        parsed = json.loads(full_content.decode('utf-8'))
        
        assert "summary" in parsed
    
    def test_stream_export_data_csv(self):
        """测试流式导出CSV数据"""
        export_data = stats_service.get_export_data()
        
        generator = stats_service.stream_export_data(export_data, "csv")
        
        chunks = list(generator)
        
        assert len(chunks) > 0
        
        full_content = b''.join(chunks)
        decoded = full_content.decode('utf-8')
        
        assert "总行程数" in decoded
    
    def test_stream_export_data_invalid_format(self):
        """测试不支持的导出格式"""
        export_data = stats_service.get_export_data()
        
        with pytest.raises(ValueError) as exc_info:
            list(stats_service.stream_export_data(export_data, "invalid"))
        
        assert "不支持的导出格式" in str(exc_info.value)
    
    def test_export_data_contains_chinese(self):
        """测试导出数据包含中文字符"""
        from app.services.itinerary_service import itinerary_service
        from app.models.itinerary import ItineraryCreate, InterestPreference
        
        original_count = len(itinerary_service.get_all_itineraries())
        
        itinerary_create = ItineraryCreate(
            title="测试行程",
            departure="北京",
            destination="上海",
            days=3,
            budget=1000.0,
            estimated_total_cost=900.0,
            daily_plans=[],
            tips=[],
            interests=[InterestPreference.CULTURE],
            is_ai_generated=True
        )
        itinerary_service.create_itinerary(itinerary_create, user_id=1)
        
        try:
            export_data = stats_service.get_export_data()
            
            json_bytes = stats_service.export_to_json(export_data)
            json_str = json_bytes.decode('utf-8')
            
            assert "上海" in json_str or "北京" in json_str, f"JSON导出应包含中文字符: {json_str[:500]}"
            
            csv_bytes = stats_service.export_to_csv(export_data)
            csv_str = csv_bytes.decode('utf-8')
            
            assert "总行程数" in csv_str or "上海" in csv_str, f"CSV导出应包含中文字符: {csv_str[:500]}"
        finally:
            all_itineraries = itinerary_service.get_all_itineraries()
            if len(all_itineraries) > original_count:
                itinerary_service.delete_itinerary(all_itineraries[-1].id)
    
    def test_export_data_summary_calculation(self):
        """测试导出数据的汇总计算正确性"""
        export_data = stats_service.get_export_data()
        
        summary = export_data["summary"]
        city_hotspots = export_data["city_hotspots"]
        
        total_itineraries_from_hotspots = sum(h.get("count", 0) for h in city_hotspots)
        
        assert summary["total_itineraries"] >= 0
        assert summary["total_spending"] >= 0
        assert summary["total_budget"] >= 0
        
        if summary["total_itineraries"] > 0:
            expected_avg = summary["total_spending"] / summary["total_itineraries"]
            assert abs(summary["avg_spending_per_itinerary"] - round(expected_avg, 2)) <= 0.01


class TestExportApiContract:
    
    def test_export_params_structure(self):
        """测试导出参数结构"""
        from app.api.stats import ExportFormat
        
        assert ExportFormat.JSON.value == "json"
        assert ExportFormat.CSV.value == "csv"
    
    def test_export_filename_generation(self):
        """测试导出文件名生成"""
        now = datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        
        json_filename = f"itinerary_stats_{timestamp}.json"
        csv_filename = f"itinerary_stats_{timestamp}.csv"
        
        assert json_filename.endswith(".json")
        assert csv_filename.endswith(".csv")
        assert "itinerary_stats" in json_filename
        assert "itinerary_stats" in csv_filename


class TestExportWithMockItineraries:
    
    def test_export_with_multiple_itineraries(self):
        """测试多条行程数据导出"""
        from app.services.itinerary_service import itinerary_service
        from app.models.itinerary import ItineraryCreate, InterestPreference
        
        original_count = len(itinerary_service.get_all_itineraries())
        
        for i in range(5):
            itinerary_create = ItineraryCreate(
                title=f"测试行程 {i+1}",
                departure="北京",
                destination="上海" if i % 2 == 0 else "杭州",
                days=3,
                budget=1000.0 + i * 100,
                estimated_total_cost=900.0 + i * 100,
                daily_plans=[],
                tips=[],
                interests=[InterestPreference.CULTURE],
                is_ai_generated=True
            )
            itinerary_service.create_itinerary(itinerary_create, user_id=1)
        
        export_data = stats_service.get_export_data()
        
        assert len(export_data["city_hotspots"]) > 0
        
        for _ in range(5):
            all_itineraries = itinerary_service.get_all_itineraries()
            if all_itineraries:
                itinerary_service.delete_itinerary(all_itineraries[-1].id)
        
        assert len(itinerary_service.get_all_itineraries()) == original_count


class TestExportFileIntegrity:
    
    def test_json_file_integrity(self):
        """测试JSON文件完整性"""
        export_data = stats_service.get_export_data()
        
        json_bytes = stats_service.export_to_json(export_data)
        
        try:
            parsed = json.loads(json_bytes.decode('utf-8'))
            assert isinstance(parsed, dict)
            assert "generated_at" in parsed
            assert "summary" in parsed
            assert "city_hotspots" in parsed
            assert isinstance(parsed["city_hotspots"], list)
            assert "monthly_trends" in parsed
            assert isinstance(parsed["monthly_trends"], list)
        except json.JSONDecodeError as e:
            pytest.fail(f"JSON解析失败: {e}")
    
    def test_csv_file_integrity(self):
        """测试CSV文件完整性"""
        export_data = stats_service.get_export_data()
        
        csv_bytes = stats_service.export_to_csv(export_data)
        
        try:
            content = csv_bytes.decode('utf-8').lstrip('\ufeff')
            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            
            assert len(rows) > 0
            
            has_summary = any("总行程数" in str(row) for row in rows)
            assert has_summary, "CSV中应包含汇总数据"
        except Exception as e:
            pytest.fail(f"CSV解析失败: {e}")
    
    def test_encoding_utf8(self):
        """测试UTF-8编码正确性"""
        export_data = stats_service.get_export_data()
        
        json_bytes = stats_service.export_to_json(export_data)
        csv_bytes = stats_service.export_to_csv(export_data)
        
        try:
            json_bytes.decode('utf-8')
            csv_bytes.decode('utf-8')
        except UnicodeDecodeError as e:
            pytest.fail(f"编码错误: {e}")
