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
ITINERARY_URL = "http://localhost:8000/api/itinerary/"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

received_logs = []
login_triggered = False
found_login_log = False
found_permission_log = False
access_token = None


async def listen_logs_continuous():
    global found_login_log, found_permission_log
    
    reconnect_attempts = 0
    max_reconnects = 10
    
    while reconnect_attempts < max_reconnects:
        if found_login_log and found_permission_log:
            break
            
        try:
            print(f"[任务A] 正在连接 WebSocket 监控接口 (尝试 {reconnect_attempts + 1})...")
            
            async with websockets.connect(WEBSOCKET_URL) as websocket:
                print("[任务A] WebSocket 连接成功，开始监听日志...")
                reconnect_attempts = 0
                
                while True:
                    if found_login_log and found_permission_log:
                        print("[任务A] 已捕获所有目标日志，正在退出...")
                        return
                    
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        log_data = json.loads(message)
                        
                        received_logs.append(log_data)
                        
                        log_level = log_data.get("level", "INFO")
                        log_message = log_data.get("message", "")
                        log_logger = log_data.get("logger", "")
                        
                        print(f"[WebSocket 日志] [{log_level}] {log_logger}: {log_message}")
                        
                        if "权限校验" in log_message:
                            if not found_permission_log:
                                print("\n" + "="*60)
                                print("[捕获成功] 检测到 [权限校验] 实时日志!")
                                print(f"[捕获成功] 日志内容: {log_message}")
                                print("="*60 + "\n")
                                found_permission_log = True
                        
                        if not found_login_log and ("登录" in log_message or "认证" in log_message):
                            if "成功" in log_message:
                                print("\n" + "="*60)
                                print("[捕获成功] 检测到登录成功的实时日志!")
                                print(f"[捕获成功] 日志内容: {log_message}")
                                print("="*60 + "\n")
                                found_login_log = True
                            
                    except asyncio.TimeoutError:
                        continue
                        
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[任务A] WebSocket 连接关闭: {e.code}")
            if not (found_login_log and found_permission_log):
                reconnect_attempts += 1
                if reconnect_attempts < max_reconnects:
                    print(f"[任务A] 等待服务恢复，2秒后重连...")
                    await asyncio.sleep(2)
                else:
                    print("[任务A] 重连次数已达上限")
                    
        except Exception as e:
            print(f"[任务A] WebSocket 错误: {e}")
            if not (found_login_log and found_permission_log):
                reconnect_attempts += 1
                if reconnect_attempts < max_reconnects:
                    print(f"[任务A] 2秒后尝试重连...")
                    await asyncio.sleep(2)


async def trigger_login_and_verify():
    global login_triggered, access_token
    
    await asyncio.sleep(3)
    
    print(f"\n[任务B] 正在请求登录接口: {LOGIN_URL}")
    print(f"[任务B] 登录凭据: 用户名='{TEST_USERNAME}', 密码='{TEST_PASSWORD}'")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                LOGIN_URL,
                json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                print(f"[任务B] 登录请求成功! 状态码: {response.status_code}")
                print(f"[任务B] 返回用户: {data.get('user', {}).get('username')}")
                print(f"[任务B] 用户角色: {data.get('user', {}).get('role_code')}")
                login_triggered = True
                
                await asyncio.sleep(1)
                print(f"\n[任务B] 正在使用 Token 访问 /api/itinerary/ 接口 (触发权限校验)...")
                
                headers = {"Authorization": f"Bearer {access_token}"}
                itinerary_response = await client.get(ITINERARY_URL, headers=headers)
                
                if itinerary_response.status_code == 200:
                    itinerary_data = itinerary_response.json()
                    print(f"[任务B] /api/itinerary/ 请求成功!")
                    print(f"[任务B] 行程数量: {len(itinerary_data)}")
                else:
                    print(f"[任务B] /api/itinerary/ 请求失败! 状态码: {itinerary_response.status_code}")
                    print(f"[任务B] 响应: {itinerary_response.text}")
            else:
                print(f"[任务B] 登录请求失败! 状态码: {response.status_code}")
                print(f"[任务B] 响应: {response.text}")
                
        except Exception as e:
            print(f"[任务B] 请求错误: {e}")
            print("[任务B] 请确保后端服务已启动 (python run_backend.py)")


async def main():
    print("="*60)
    print("实时日志监控联调测试")
    print("="*60)
    print(f"WebSocket 地址: {WEBSOCKET_URL}")
    print(f"登录接口地址: {LOGIN_URL}")
    print(f"行程接口地址: {ITINERARY_URL} (触发权限校验)")
    print("="*60 + "\n")
    
    task_a = asyncio.create_task(listen_logs_continuous())
    task_b = asyncio.create_task(trigger_login_and_verify())
    
    await task_b
    print("\n[等待] 业务请求已发送，等待 WebSocket 捕获日志...\n")
    
    try:
        await asyncio.wait_for(task_a, timeout=30.0)
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
    
    if found_permission_log:
        print("[OK] 实时日志捕获成功 (检测到 [权限校验] 日志)")
    else:
        print("[FAIL] 未检测到 [权限校验] 日志")
        print(f"[信息] 共收到 {len(received_logs)} 条日志")
        if received_logs:
            print("[信息] 收到的日志消息:")
            for log in received_logs[-15:]:
                msg = log.get('message', '')[:80]
                print(f"  - [{log.get('level')}] {msg}...")
    
    print("="*60)
    
    all_passed = login_triggered and found_login_log and found_permission_log
    if all_passed:
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
