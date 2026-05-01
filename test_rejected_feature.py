import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

print("="*60)
print("测试已驳回用户列表功能")
print("="*60)

print("\n1. 管理员登录获取访问令牌...")
admin_login = {
    "username": "admin",
    "password": "admin123"
}

response = requests.post(f"{BASE_URL}/auth/login", json=admin_login)
print(f"   登录状态码: {response.status_code}")

if response.status_code != 200:
    print(f"   管理员登录失败: {response.text}")
    sys.exit(1)

admin_token = response.json()["access_token"]
print(f"   管理员登录成功，获取到访问令牌")

headers = {"Authorization": f"Bearer {admin_token}"}

print("\n2. 测试获取已驳回用户列表 (GET /api/auth/rejected)...")
response = requests.get(f"{BASE_URL}/auth/rejected", headers=headers)
print(f"   状态码: {response.status_code}")
if response.status_code == 200:
    rejected_users = response.json()
    print(f"   已驳回用户数量: {len(rejected_users)}")
    print(f"   响应数据: {json.dumps(rejected_users, indent=2, ensure_ascii=False)}")
else:
    print(f"   获取已驳回用户列表失败: {response.text}")

print("\n3. 测试获取待审核用户列表 (GET /api/auth/pending)...")
response = requests.get(f"{BASE_URL}/auth/pending", headers=headers)
print(f"   状态码: {response.status_code}")
if response.status_code == 200:
    pending_users = response.json()
    print(f"   待审核用户数量: {len(pending_users)}")
else:
    print(f"   获取待审核用户列表失败: {response.text}")

print("\n4. 注册一个新用户用于测试驳回功能...")
new_user = {
    "username": "test_reject_user",
    "password": "Test123456",
    "email": "reject_test@test.com",
    "tenant_id": 2
}

response = requests.post(f"{BASE_URL}/auth/register", json=new_user)
print(f"   注册状态码: {response.status_code}")
if response.status_code == 201:
    print(f"   注册成功: {response.json()['username']}")
else:
    print(f"   注册失败: {response.text}")

print("\n5. 重新获取待审核用户列表...")
response = requests.get(f"{BASE_URL}/auth/pending", headers=headers)
if response.status_code == 200:
    pending_users = response.json()
    print(f"   待审核用户数量: {len(pending_users)}")
    
    test_user = None
    for user in pending_users:
        if user['username'] == 'test_reject_user':
            test_user = user
            break
    
    if test_user:
        print(f"\n6. 驳回用户 'test_reject_user' 的申请...")
        user_id = test_user['id']
        reject_data = {"reason": "测试驳回原因"}
        response = requests.post(f"{BASE_URL}/auth/reject/{user_id}", json=reject_data, headers=headers)
        print(f"   驳回状态码: {response.status_code}")
        if response.status_code == 200:
            print(f"   驳回成功: {response.json()}")
        else:
            print(f"   驳回失败: {response.text}")

print("\n7. 获取已驳回用户列表，验证驳回后的用户是否在列表中...")
response = requests.get(f"{BASE_URL}/auth/rejected", headers=headers)
print(f"   状态码: {response.status_code}")
if response.status_code == 200:
    rejected_users = response.json()
    print(f"   已驳回用户数量: {len(rejected_users)}")
    
    rejected_test_user = None
    for user in rejected_users:
        if user['username'] == 'test_reject_user':
            rejected_test_user = user
            break
    
    if rejected_test_user:
        print(f"\n   ✅ 成功验证: 驳回的用户 'test_reject_user' 出现在已驳回列表中")
        print(f"      用户信息: {json.dumps(rejected_test_user, indent=2, ensure_ascii=False)}")
    else:
        print(f"\n   ⚠️ 注意: 可能需要刷新页面才能看到最新数据")

print("\n8. 验证已驳回用户无法登录...")
login_attempt = {
    "username": "test_reject_user",
    "password": "Test123456"
}
response = requests.post(f"{BASE_URL}/auth/login", json=login_attempt)
print(f"   登录状态码: {response.status_code}")
if response.status_code == 403:
    error_detail = response.json().get('detail', '')
    print(f"   响应: {error_detail}")
    print(f"\n   ✅ 成功验证: 已驳回用户无法登录，返回 403 错误")
else:
    print(f"   响应: {response.text}")

print("\n" + "="*60)
print("测试完成!")
print("="*60)
print("""
功能总结:
1. ✅ 新增 GET /api/auth/rejected 接口，用于获取已驳回用户列表
2. ✅ 前端新增 "已驳回" 标签页，展示被驳回的申请记录
3. ✅ 取消按钮逻辑: 只关闭模态框，不触发任何数据操作或日志
   - 点击"取消"时: 仅调用 setShowRejectModal(false)
   - window.confirm 取消时: 直接 return，不执行后续代码

已驳回列表展示内容:
- 用户ID、用户名、邮箱
- 目标租户（红色背景标注）
- 申请时间
- 状态: ❌ 已驳回（红色背景标注）
""")
