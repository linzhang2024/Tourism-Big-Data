import pytest
import json
import sys
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import health_check


class TestHealthCheck:
    
    @pytest.mark.asyncio
    async def test_check_backend_api_up(self, mocker):
        """测试后端服务正常运行的情况"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        
        async def mock_get(*args, **kwargs):
            return mock_response
        
        with patch("httpx.AsyncClient.get", new=mock_get):
            result = await health_check.check_backend_api()
        
        assert result["status"] == "UP"
        assert "后端服务运行正常" in result["message"]
        assert result["details"] == {"status": "healthy"}
    
    @pytest.mark.asyncio
    async def test_check_backend_api_down_connect_error(self, mocker):
        """测试后端服务连接失败的情况"""
        from httpx import ConnectError
        
        with patch("httpx.AsyncClient.get", side_effect=ConnectError("连接失败")):
            result = await health_check.check_backend_api()
        
        assert result["status"] == "DOWN"
        assert "无法连接到后端服务" in result["message"]
        assert result["details"] is None
    
    @pytest.mark.asyncio
    async def test_check_backend_api_down_timeout(self, mocker):
        """测试后端服务连接超时的情况"""
        from httpx import TimeoutException
        
        with patch("httpx.AsyncClient.get", side_effect=TimeoutException("连接超时")):
            result = await health_check.check_backend_api()
        
        assert result["status"] == "DOWN"
        assert "连接后端服务超时" in result["message"]
        assert result["details"] is None
    
    @pytest.mark.asyncio
    async def test_check_backend_api_down_unexpected_status(self, mocker):
        """测试后端服务返回非预期状态码的情况"""
        mock_response = Mock()
        mock_response.status_code = 500
        
        async def mock_get(*args, **kwargs):
            return mock_response
        
        with patch("httpx.AsyncClient.get", new=mock_get):
            result = await health_check.check_backend_api()
        
        assert result["status"] == "DOWN"
        assert "非预期状态码: 500" in result["message"]
        assert result["details"] is None
    
    def test_check_port_listening_port_in_use(self, mocker):
        """测试端口被占用的情况（前端服务运行中）"""
        with patch("socket.socket.connect_ex", return_value=0):
            result = health_check.check_port_listening("127.0.0.1", 3000)
        
        assert result is True
    
    def test_check_port_listening_port_closed(self, mocker):
        """测试端口关闭的情况（前端服务未运行）"""
        with patch("socket.socket.connect_ex", return_value=10061):
            result = health_check.check_port_listening("127.0.0.1", 3000)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_check_frontend_service_up(self, mocker):
        """测试前端服务端口在监听的情况"""
        with patch.object(health_check, "check_port_listening", return_value=True):
            result = await health_check.check_frontend_service()
        
        assert result["status"] == "UP"
        assert "前端服务端口在监听" in result["message"]
        assert result["details"]["host"] == "127.0.0.1"
        assert result["details"]["port"] == 3000
    
    @pytest.mark.asyncio
    async def test_check_frontend_service_down(self, mocker):
        """测试前端服务端口未在监听的情况"""
        with patch.object(health_check, "check_port_listening", return_value=False):
            result = await health_check.check_frontend_service()
        
        assert result["status"] == "DOWN"
        assert "前端服务端口未在监听" in result["message"]
        assert result["details"]["host"] == "127.0.0.1"
        assert result["details"]["port"] == 3000
    
    def test_check_httpx_installed_success(self, mocker):
        """测试 httpx 包已安装的情况"""
        import httpx
        expected_version = httpx.__version__
        
        result = health_check.check_httpx_installed()
        
        assert result["status"] == "UP"
        assert f"httpx 已安装，版本: {expected_version}" in result["message"]
        assert result["details"]["version"] == expected_version
    
    def test_check_httpx_installed_failure(self, mocker):
        """测试 httpx 包未安装的情况"""
        with patch("builtins.__import__", side_effect=ImportError("No module named 'httpx'")):
            result = health_check.check_httpx_installed()
        
        assert result["status"] == "DOWN"
        assert "httpx 未安装" in result["message"]
        assert result["details"] is None
    
    @pytest.mark.asyncio
    async def test_run_health_checks_all_up(self, mocker):
        """测试所有服务正常运行的情况"""
        import httpx
        
        with patch.object(health_check, "check_backend_api", return_value={
            "status": "UP",
            "message": "后端服务运行正常",
            "details": {"status": "healthy"}
        }):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "UP",
                "message": "前端服务端口在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "UP",
                    "message": f"httpx 已安装，版本: {httpx.__version__}",
                    "details": {"version": httpx.__version__}
                }):
                    results = await health_check.run_health_checks(attempt_fix=False)
        
        assert results["status"] == "UP"
        assert "timestamp" in results
        assert "checks" in results
        assert results["checks"]["backend"]["status"] == "UP"
        assert results["checks"]["frontend"]["status"] == "UP"
        assert results["checks"]["httpx"]["status"] == "UP"
    
    @pytest.mark.asyncio
    async def test_run_health_checks_backend_down(self, mocker):
        """测试后端服务未运行的情况"""
        import httpx
        
        with patch.object(health_check, "check_backend_api", return_value={
            "status": "DOWN",
            "message": "无法连接到后端服务",
            "details": None
        }):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "UP",
                "message": "前端服务端口在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "UP",
                    "message": f"httpx 已安装，版本: {httpx.__version__}",
                    "details": {"version": httpx.__version__}
                }):
                    results = await health_check.run_health_checks(attempt_fix=False)
        
        assert results["status"] == "DEGRADED"
        assert results["checks"]["backend"]["status"] == "DOWN"
        assert results["checks"]["frontend"]["status"] == "UP"
        assert results["checks"]["httpx"]["status"] == "UP"
    
    @pytest.mark.asyncio
    async def test_run_health_checks_httpx_down(self, mocker):
        """测试 httpx 未安装的情况"""
        with patch.object(health_check, "check_backend_api", return_value={
            "status": "UP",
            "message": "后端服务运行正常",
            "details": {"status": "healthy"}
        }):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "UP",
                "message": "前端服务端口在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "DOWN",
                    "message": "httpx 未安装",
                    "details": None
                }):
                    results = await health_check.run_health_checks(attempt_fix=False)
        
        assert results["status"] == "DOWN"
        assert results["checks"]["backend"]["status"] == "UP"
        assert results["checks"]["frontend"]["status"] == "UP"
        assert results["checks"]["httpx"]["status"] == "DOWN"
    
    @pytest.mark.asyncio
    async def test_run_health_checks_all_down(self, mocker):
        """测试所有服务都未运行的情况"""
        with patch.object(health_check, "check_backend_api", return_value={
            "status": "DOWN",
            "message": "无法连接到后端服务",
            "details": None
        }):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "DOWN",
                "message": "前端服务端口未在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "DOWN",
                    "message": "httpx 未安装",
                    "details": None
                }):
                    results = await health_check.run_health_checks(attempt_fix=False)
        
        assert results["status"] == "DOWN"
        assert results["checks"]["backend"]["status"] == "DOWN"
        assert results["checks"]["frontend"]["status"] == "DOWN"
        assert results["checks"]["httpx"]["status"] == "DOWN"
    
    def test_print_json_report(self, mocker, capsys):
        """测试打印 JSON 格式的状态报告"""
        import httpx
        
        test_results = {
            "timestamp": "2026-04-25T12:00:00Z",
            "status": "UP",
            "checks": {
                "backend": {
                    "status": "UP",
                    "message": "后端服务运行正常",
                    "details": {"status": "healthy"}
                },
                "frontend": {
                    "status": "UP",
                    "message": "前端服务端口在监听",
                    "details": {"host": "127.0.0.1", "port": 3000}
                },
                "httpx": {
                    "status": "UP",
                    "message": f"httpx 已安装，版本: {httpx.__version__}",
                    "details": {"version": httpx.__version__}
                }
            }
        }
        
        health_check.print_json_report(test_results)
        
        captured = capsys.readouterr()
        output = captured.out
        
        parsed_output = json.loads(output)
        
        assert parsed_output["status"] == "UP"
        assert parsed_output["timestamp"] == "2026-04-25T12:00:00Z"
        assert parsed_output["checks"]["backend"]["status"] == "UP"
        assert parsed_output["checks"]["frontend"]["status"] == "UP"
        assert parsed_output["checks"]["httpx"]["status"] == "UP"
    
    @pytest.mark.asyncio
    async def test_run_health_checks_with_attempt_fix(self, mocker):
        """测试尝试自动修复后端服务的情况"""
        import httpx
        
        call_count = {"count": 0}
        
        async def mock_check_backend_api():
            if call_count["count"] == 0:
                call_count["count"] += 1
                return {
                    "status": "DOWN",
                    "message": "无法连接到后端服务",
                    "details": None
                }
            else:
                return {
                    "status": "UP",
                    "message": "后端服务运行正常",
                    "details": {"status": "healthy"}
                }
        
        def mock_try_start_backend():
            return {
                "success": True,
                "message": "后端服务已启动 (PID: 12345)",
                "pid": 12345
            }
        
        with patch.object(health_check, "check_backend_api", mock_check_backend_api):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "UP",
                "message": "前端服务端口在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "UP",
                    "message": f"httpx 已安装，版本: {httpx.__version__}",
                    "details": {"version": httpx.__version__}
                }):
                    with patch.object(health_check, "try_start_backend", mock_try_start_backend):
                        with patch("time.sleep"):
                            results = await health_check.run_health_checks(attempt_fix=True)
        
        assert "backend_attempt_fix" in results
        assert results["backend_attempt_fix"]["success"] is True
        assert "backend_after_fix" in results["checks"]
        assert results["checks"]["backend_after_fix"]["status"] == "UP"
    
    @pytest.mark.asyncio
    async def test_run_health_checks_attempt_fix_failed(self, mocker):
        """测试尝试自动修复但失败的情况"""
        import httpx
        
        with patch.object(health_check, "check_backend_api", return_value={
            "status": "DOWN",
            "message": "无法连接到后端服务",
            "details": None
        }):
            with patch.object(health_check, "check_frontend_service", return_value={
                "status": "UP",
                "message": "前端服务端口在监听",
                "details": {"host": "127.0.0.1", "port": 3000}
            }):
                with patch.object(health_check, "check_httpx_installed", return_value={
                    "status": "UP",
                    "message": f"httpx 已安装，版本: {httpx.__version__}",
                    "details": {"version": httpx.__version__}
                }):
                    with patch.object(health_check, "try_start_backend", return_value={
                        "success": False,
                        "message": "后端服务启动失败",
                        "stdout": "",
                        "stderr": "Error: Could not import module"
                    }):
                        with patch("time.sleep"):
                            results = await health_check.run_health_checks(attempt_fix=True)
        
        assert "backend_attempt_fix" in results
        assert results["backend_attempt_fix"]["success"] is False
        assert results["status"] == "DEGRADED"