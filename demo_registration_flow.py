import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

def print_response(title, response):
    print(f"\n{'='*60}")
    print(f"[*] {title}")
    print(f"{'='*60}")
    print(f"状态码: {response.status_code}")
    try:
        print(f"响应数据: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"响应文本: {response.text}")

# 1. 新用户注册
print("\n" + "="*60)
print("第1步: 新用户注册申请")
print("="*60)
register_data = {
    "username": "newuser_demo",
    "password": "Test123456",
    "email": "newuser_demo@test.com",
    "tenant_id": 2
}
print(f"注册信息: {json.dumps(register_data, indent=2, ensure_ascii=False)}")
print(f"\n请求: POST /api/auth/register")

response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
print_response("注册响应", response)

if response.status_code == 201:
    print("\n[OK] 注册申请提交成功！用户状态已设置为 PENDING（待审核）")
    print("     新用户现在无法登录，需要等待管理员审批")

# 2. 尝试用PENDING状态用户登录
print("\n" + "="*60)
print("第2步: 验证PENDING状态用户无法登录")
print("="*60)
login_data = {
    "username": "newuser_demo",
    "password": "Test123456"
}
print(f"登录信息: 用户名='newuser_demo'")
print(f"\n请求: POST /api/auth/login")

response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print_response("登录响应", response)

if response.status_code == 403:
    print("\n[OK] 登录失败！正如预期，PENDING状态用户被禁止登录")
    print("     错误信息: '您的账号正在审核中，请等待管理员审批'")

# 3. 管理员登录
print("\n" + "="*60)
print("第3步: 管理员登录获取访问令牌")
print("="*60)
admin_login = {
    "username": "admin",
    "password": "admin123"
}
print(f"管理员账号: admin / admin123")
print(f"\n请求: POST /api/auth/login")

response = requests.post(f"{BASE_URL}/auth/login", json=admin_login)
print_response("管理员登录响应", response)

admin_token = None
if response.status_code == 200:
    admin_token = response.json()["access_token"]
    print("\n[OK] 管理员登录成功！")
    print(f"     获取到访问令牌 (长度: {len(admin_token)} 字符)")

# 4. 管理员查看待审核用户列表
print("\n" + "="*60)
print("第4步: 管理员查看待审核用户列表")
print("="*60)
print("请求: GET /api/auth/pending")
print("需要权限: sys:manage (系统管理权限)")

headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
response = requests.get(f"{BASE_URL}/auth/pending", headers=headers)
print_response("待审核用户列表", response)

pending_users = []
if response.status_code == 200:
    pending_users = response.json()
    print(f"\n[OK] 获取到 {len(pending_users)} 个待审核用户")
    for user in pending_users:
        print(f"\n     用户信息:")
        print(f"       - ID: {user['id']}")
        print(f"       - 用户名: {user['username']}")
        print(f"       - 邮箱: {user.get('email', '未设置')}")
        print(f"       - 目标租户ID: {user.get('tenant_id', '未设置')}")
        print(f"       - 状态: {user['status']}")
        print(f"       - 申请时间: {user['created_at']}")
        print(f"       - 角色: {user['role_code']}")

# 5. 管理员审批通过
print("\n" + "="*60)
print("第5步: 管理员审批通过用户申请")
print("="*60)

if pending_users:
    user_to_approve = None
    for user in pending_users:
        if user['username'] == 'newuser_demo':
            user_to_approve = user
            break
    if not user_to_approve:
        user_to_approve = pending_users[0]
    
    user_id = user_to_approve["id"]
    print(f"审批用户: ID={user_id}, 用户名='{user_to_approve['username']}'")
    print(f"\n请求: POST /api/auth/approve/{user_id}")
    
    response = requests.post(f"{BASE_URL}/auth/approve/{user_id}", headers=headers)
    print_response("审批响应", response)
    
    if response.status_code == 200:
        approved_user = response.json()
        print("\n[OK] 审批通过成功！")
        print(f"     用户状态变化: PENDING -> {approved_user['status']} (ACTIVE)")
        print(f"     已自动绑定至租户ID: {approved_user.get('tenant_id')}")
        print(f"     已分配默认角色: {approved_user['role_code']}")
        print(f"\n     该用户现在可以正常登录了！")

# 6. 验证审批通过后用户可以登录
print("\n" + "="*60)
print("第6步: 验证审批通过后用户可正常登录")
print("="*60)
print(f"尝试登录: 用户名='newuser_demo', 密码='Test123456'")
print(f"\n请求: POST /api/auth/login")

response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print_response("登录响应", response)

if response.status_code == 200:
    login_result = response.json()
    user_info = login_result["user"]
    print("\n[OK] 登录成功！审批流程完整验证通过！")
    print(f"\n     用户信息:")
    print(f"       - ID: {user_info['id']}")
    print(f"       - 用户名: {user_info['username']}")
    print(f"       - 状态: {user_info['status']} (ACTIVE - 活跃)")
    print(f"       - 租户ID: {user_info.get('tenant_id')}")
    print(f"       - 角色: {user_info['role_code']}")
    print(f"       - 权限: {user_info.get('permissions', [])}")
    print(f"\n     访问令牌已生成，用户可以正常访问系统资源")

print("\n" + "="*60)
print("[OK] 完整流程演示完成！")
print("="*60)
print("""
流程总结:
----------------------------------------------------------------
1) 新用户注册
   - 选择"所属租户"（租户A - TENANT_A）
   - 提交注册申请
   - 后端设置用户状态为 PENDING
   
2) PENDING状态用户尝试登录
   - 后端检测到状态为 PENDING
   - 返回 403 错误，提示"正在审核中"
   - 前端禁止用户登录
   
3) 管理员登录
   - 使用 admin / admin123 登录
   - 获取访问令牌和 sys:manage 权限
   
4) 管理员查看待审核列表
   - 调用 GET /api/auth/pending
   - 展示新用户的申请信息
   
5) 管理员审批通过
   - 调用 POST /api/auth/approve/{user_id}
   - 用户状态从 PENDING -> ACTIVE
   - 自动绑定 tenant_id
   - 分配默认角色（USER）
   
6) 新用户正常登录
   - 登录成功，获取访问令牌
   - 可正常访问该租户的资源

----------------------------------------------------------------
""")
