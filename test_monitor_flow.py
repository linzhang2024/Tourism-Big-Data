#!/usr/bin/env python3
import asyncio
import json
import sys
import subprocess
import importlib.util


def ensure_package(package_name: str, install_name: str = None):
    if install_name is None:
        install_name = package_name
    spec = importlib.util.find_spec(package_name)
    if spec is None:
        print(f"[安装依赖] 正在安装 {install_name}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", install_name, "-q"])
        print(f"[安装依赖] {install_name} 安装完成")


ensure_package("websockets")
ensure_package("httpx")

import websockets
import httpx


WEBSOCKET_URL = "ws://localhost:8000/api/logs"
LOGIN_URL = "http://localhost:8000/api/auth/login"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

received_logs = []
login_triggered = False
found_login_log = False


async def listen_logs():
    global found_login_log
    print("[任务A] 正在连接 WebSocket 监控接口...")
    
    try:
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("[任务A] WebSocket 连接成功，开始监听日志...")
            
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    log_data = json.loads(message)
                    
                    received_logs.append(log_data)
                    
                    log_level = log_data.get("level", "INFO")
                    log_message = log_data.get("message", "")
                    log_logger = log_data.get("logger", "")
                    
                    print(f"[WebSocket 日志] [{log_level}] {log_logger}: {log_message}")
                    
                    if "登录" in log_message or "认证" in log_message or "login" in log_message.lower():
                        if "成功" in log_message or "success" in log_message.lower():
                            print("\n" + "="*60)
                            print("[捕获成功] 检测到登录成功的实时日志!")
                            print(f"[捕获成功] 日志内容: {log_message}")
                            print("="*60 + "\n")
                            found_login_log = True
                            
                except asyncio.TimeoutError:
                    if found_login_log:
                        print("[任务A] 已捕获登录日志，正在退出...")
                        break
                    continue
                    
    except Exception as e:
        print(f"[任务A] WebSocket 连接错误: {e}")
        print("[任务A] 请确保后端服务已启动 (python run_backend.py)")


async def trigger_login():
    global login_triggered
    print("[任务B] 等待 2 秒后触发登录请求...")
    await asyncio.sleep(2)
    
    print(f"[任务B] 正在请求登录接口: {LOGIN_URL}")
    print(f"[任务B] 登录凭据: 用户名='{TEST_USERNAME}', 密码='{TEST_PASSWORD}'")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                LOGIN_URL,
                json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"[任务B] 登录请求成功! 状态码: {response.status_code}")
                print(f"[任务B] 返回用户: {data.get('user', {}).get('username')}")
                print(f"[任务B] 用户角色: {data.get('user', {}).get('role_code')}")
                login_triggered = True
            else:
                print(f"[任务B] 登录请求失败! 状态码: {response.status_code}")
                print(f"[任务B] 响应: {response.text}")
                
        except Exception as e:
            print(f"[任务B] 登录请求错误: {e}")
            print("[任务B] 请确保后端服务已启动 (python run_backend.py)")


async def main():
    print("="*60)
    print("实时日志监控联调测试")
    print("="*60)
    print(f"WebSocket 地址: {WEBSOCKET_URL}")
    print(f"登录接口地址: {LOGIN_URL}")
    print("="*60 + "\n")
    
    task_a = asyncio.create_task(listen_logs())
    task_b = asyncio.create_task(trigger_login())
    
    await task_b
    print("\n[等待] 登录请求已发送，等待 WebSocket 捕获日志...\n")
    
    try:
        await asyncio.wait_for(task_a, timeout=15.0)
    except asyncio.TimeoutError:
        print("[超时] 等待日志捕获超时")
        task_a.cancel()
        try:
            await task_a
        except asyncio.CancelledError:
            pass
    
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    
    if login_triggered:
        print("[OK] 登录请求触发成功")
    else:
        print("[FAIL] 登录请求触发失败")
    
    if found_login_log:
        print("[OK] 实时日志捕获成功 (检测到登录成功日志)")
    else:
        print("[FAIL] 未检测到登录成功日志")
        print(f"[信息] 共收到 {len(received_logs)} 条日志")
        if received_logs:
            print("[信息] 收到的日志消息:")
            for log in received_logs[-10:]:
                print(f"  - [{log.get('level')}] {log.get('message')[:80]}...")
    
    print("="*60)
    
    if login_triggered and found_login_log:
        print("\n[测试结果] 联调测试成功!")
        return 0
    else:
        print("\n[测试结果] 联调测试失败!")
        print("\n提示: 请确保后端服务已启动:")
        print("  1. 打开新终端")
        print("  2. 运行: python run_backend.py")
        print("  3. 等待服务启动后再运行此脚本")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
