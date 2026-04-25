#!/usr/bin/env python3
"""
系统监控与健康检查脚本
检查后端 FastAPI、前端 Vite 服务状态，以及 httpx 依赖是否安装
"""

import json
import logging
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Union

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 3000
HEALTH_CHECK_TIMEOUT = 5.0


def check_port_listening(host: str, port: int) -> bool:
    """
    检查指定端口是否在监听
    
    Args:
        host: 主机地址
        port: 端口号
        
    Returns:
        端口是否在监听
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(HEALTH_CHECK_TIMEOUT)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.error(f"检查端口 {host}:{port} 时出错: {e}")
        return False


async def check_backend_api() -> Dict[str, Union[str, bool]]:
    """
    检查后端 FastAPI 服务是否存活
    
    Returns:
        包含状态信息的字典
    """
    try:
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "UP",
                    "message": "后端服务运行正常",
                    "details": data
                }
            else:
                return {
                    "status": "DOWN",
                    "message": f"后端服务返回非预期状态码: {response.status_code}",
                    "details": None
                }
    except httpx.ConnectError:
        return {
            "status": "DOWN",
            "message": "无法连接到后端服务",
            "details": None
        }
    except httpx.TimeoutException:
        return {
            "status": "DOWN",
            "message": "连接后端服务超时",
            "details": None
        }
    except Exception as e:
        logger.error(f"检查后端服务时出错: {e}")
        return {
            "status": "DOWN",
            "message": f"检查后端服务时出错: {str(e)}",
            "details": None
        }


async def check_frontend_service() -> Dict[str, Union[str, bool]]:
    """
    检查前端 Vite 服务是否在监听
    
    Returns:
        包含状态信息的字典
    """
    if check_port_listening(FRONTEND_HOST, FRONTEND_PORT):
        return {
            "status": "UP",
            "message": "前端服务端口在监听",
            "details": {
                "host": FRONTEND_HOST,
                "port": FRONTEND_PORT
            }
        }
    else:
        return {
            "status": "DOWN",
            "message": "前端服务端口未在监听",
            "details": {
                "host": FRONTEND_HOST,
                "port": FRONTEND_PORT
            }
        }


def check_httpx_installed() -> Dict[str, Union[str, bool]]:
    """
    检查 httpx 包是否已安装
    
    Returns:
        包含状态信息的字典
    """
    try:
        import httpx
        return {
            "status": "UP",
            "message": f"httpx 已安装，版本: {httpx.__version__}",
            "details": {
                "version": httpx.__version__
            }
        }
    except ImportError:
        return {
            "status": "DOWN",
            "message": "httpx 未安装",
            "details": None
        }
    except Exception as e:
        logger.error(f"检查 httpx 安装状态时出错: {e}")
        return {
            "status": "DOWN",
            "message": f"检查 httpx 安装状态时出错: {str(e)}",
            "details": None
        }


def try_start_backend() -> Dict[str, Union[str, bool]]:
    """
    尝试启动后端服务
    
    Returns:
        包含启动结果的字典
    """
    logger.info("尝试启动后端服务...")
    
    try:
        backend_dir = str(BACKEND_DIR)
        logger.info(f"后端目录: {backend_dir}")
        
        if not os.path.exists(backend_dir):
            return {
                "success": False,
                "message": f"后端目录不存在: {backend_dir}"
            }
        
        if sys.platform == "win32":
            cmd = [
                sys.executable, "-m", "uvicorn",
                "app.main:app",
                "--host", "127.0.0.1",
                "--port", "8000",
                "--reload"
            ]
        else:
            cmd = [
                sys.executable, "-m", "uvicorn",
                "app.main:app",
                "--host", "127.0.0.1",
                "--port", "8000",
                "--reload"
            ]
        
        logger.info(f"执行命令: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        
        time.sleep(3)
        
        if process.poll() is None:
            logger.info(f"后端服务启动进程 PID: {process.pid}")
            return {
                "success": True,
                "message": f"后端服务已启动 (PID: {process.pid})",
                "pid": process.pid
            }
        else:
            stdout, stderr = process.communicate()
            logger.error(f"后端服务启动失败")
            logger.error(f"stdout: {stdout.decode('utf-8', errors='ignore')}")
            logger.error(f"stderr: {stderr.decode('utf-8', errors='ignore')}")
            
            return {
                "success": False,
                "message": "后端服务启动失败，请检查日志",
                "stdout": stdout.decode("utf-8", errors="ignore"),
                "stderr": stderr.decode("utf-8", errors="ignore")
            }
            
    except Exception as e:
        logger.error(f"尝试启动后端服务时出错: {e}")
        return {
            "success": False,
            "message": f"尝试启动后端服务时出错: {str(e)}"
        }


async def run_health_checks(attempt_fix: bool = True) -> Dict[str, Union[str, Dict]]:
    """
    运行所有健康检查
    
    Args:
        attempt_fix: 是否尝试自动修复
        
    Returns:
        包含所有检查结果的字典
    """
    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "UP",
        "checks": {}
    }
    
    logger.info("开始系统健康检查...")
    
    backend_status = await check_backend_api()
    results["checks"]["backend"] = backend_status
    
    if backend_status["status"] == "DOWN":
        results["status"] = "DEGRADED"
        if attempt_fix:
            logger.warning("后端服务未运行，尝试自动启动...")
            fix_result = try_start_backend()
            results["backend_attempt_fix"] = fix_result
            
            if fix_result["success"]:
                logger.info("等待后端服务启动...")
                time.sleep(5)
                backend_status = await check_backend_api()
                results["checks"]["backend_after_fix"] = backend_status
    
    frontend_status = await check_frontend_service()
    results["checks"]["frontend"] = frontend_status
    
    if frontend_status["status"] == "DOWN":
        if results["status"] == "UP":
            results["status"] = "DEGRADED"
    
    httpx_status = check_httpx_installed()
    results["checks"]["httpx"] = httpx_status
    
    if httpx_status["status"] == "DOWN":
        results["status"] = "DOWN"
    
    all_up = all(
        check.get("status") == "UP" 
        for check in results["checks"].values()
        if isinstance(check, dict) and "status" in check
    )
    
    if all_up:
        results["status"] = "UP"
    elif results["checks"]["httpx"]["status"] == "DOWN":
        results["status"] = "DOWN"
    else:
        results["status"] = "DEGRADED"
    
    logger.info(f"健康检查完成，整体状态: {results['status']}")
    
    return results


def print_json_report(results: Dict) -> None:
    """
    打印 JSON 格式的状态报告
    
    Args:
        results: 健康检查结果
    """
    print(json.dumps(results, indent=2, ensure_ascii=False))


async def main():
    """
    主函数
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="系统监控与健康检查脚本")
    parser.add_argument(
        "--no-fix", 
        action="store_true", 
        help="不尝试自动修复"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="json",
        choices=["json", "text"],
        help="输出格式 (json 或 text)"
    )
    
    args = parser.parse_args()
    
    attempt_fix = not args.no_fix
    
    results = await run_health_checks(attempt_fix=attempt_fix)
    
    if args.output == "json":
        print_json_report(results)
    else:
        logger.info("健康检查结果:")
        for check_name, check_result in results["checks"].items():
            if isinstance(check_result, dict) and "status" in check_result:
                status = check_result["status"]
                message = check_result["message"]
                logger.info(f"  {check_name}: {status} - {message}")
        logger.info(f"整体状态: {results['status']}")
    
    if results["status"] == "DOWN":
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())