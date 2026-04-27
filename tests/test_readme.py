"""
README.md 验证测试脚本

验证内容：
1. README.md 文件是否存在
2. README.md 中是否包含 "FastAPI" 关键字
3. README.md 中是否包含 "React" 关键字
"""

import os
import sys
from pathlib import Path

import pytest


class TestReadmeValidation:
    """README.md 验证测试类"""

    @pytest.fixture
    def project_root(self):
        """获取项目根目录路径"""
        return Path(__file__).resolve().parent.parent

    @pytest.fixture
    def readme_path(self, project_root):
        """获取 README.md 文件路径"""
        return project_root / "README.md"

    def test_readme_file_exists(self, readme_path):
        """测试 README.md 文件是否存在"""
        assert readme_path.exists(), f"README.md 文件不存在: {readme_path}"
        assert readme_path.is_file(), f"路径不是文件: {readme_path}"
        assert readme_path.stat().st_size > 0, f"README.md 文件为空"

    def test_readme_contains_fastapi(self, readme_path):
        """测试 README.md 中是否包含 FastAPI 关键字"""
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "FastAPI" in content, "README.md 中不包含 'FastAPI' 关键字"
        assert "fastapi" in content.lower(), "README.md 中不包含 'fastapi' (小写) 关键字"

    def test_readme_contains_react(self, readme_path):
        """测试 README.md 中是否包含 React 关键字"""
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "React" in content, "README.md 中不包含 'React' 关键字"
        assert "react" in content.lower(), "README.md 中不包含 'react' (小写) 关键字"

    def test_readme_has_required_sections(self, readme_path):
        """测试 README.md 是否包含必要的章节"""
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        required_sections = [
            ("项目简介", "缺少项目简介章节"),
            ("技术栈", "缺少技术栈章节"),
            ("环境配置", "缺少环境配置章节"),
            ("健康检查", "缺少健康检查章节"),
        ]

        for section, error_msg in required_sections:
            assert section in content, f"README.md {error_msg}"

    def test_readme_health_check_usage(self, readme_path):
        """测试 README.md 中是否包含 health_check.py 的使用说明"""
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "health_check.py" in content, "README.md 中不包含 'health_check.py' 使用说明"
        assert "npm run health" in content, "README.md 中不包含 'npm run health' 命令说明"

    def test_readme_setup_script_usage(self, readme_path):
        """测试 README.md 中是否包含一键安装脚本的使用说明"""
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "setup.bat" in content, "README.md 中不包含 'setup.bat' 安装脚本说明"
        assert "一键安装" in content, "README.md 中不包含 '一键安装' 说明"


def validate_readme_simple():
    """
    简单的 README.md 验证函数（不依赖 pytest）
    
    返回:
        bool: 验证通过返回 True，失败返回 False
    """
    print("=" * 60)
    print("  README.md 验证测试")
    print("=" * 60)
    print()

    project_root = Path(__file__).resolve().parent.parent
    readme_path = project_root / "README.md"

    all_passed = True

    # 测试 1: 文件是否存在
    print("[测试 1/5] 检查 README.md 文件是否存在...")
    if readme_path.exists() and readme_path.is_file():
        print(f"  [通过] 文件存在: {readme_path}")
        if readme_path.stat().st_size > 0:
            print(f"  [通过] 文件大小: {readme_path.stat().st_size} 字节")
        else:
            print("  [失败] 文件为空")
            all_passed = False
    else:
        print(f"  [失败] 文件不存在: {readme_path}")
        all_passed = False

    # 如果文件不存在，直接返回
    if not readme_path.exists():
        print()
        print("=" * 60)
        print("  验证结果: 失败 - README.md 文件不存在")
        print("=" * 60)
        return False

    # 读取文件内容
    try:
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"  [失败] 无法读取文件: {e}")
        return False

    # 测试 2: 是否包含 FastAPI
    print()
    print("[测试 2/5] 检查是否包含 'FastAPI' 关键字...")
    if "FastAPI" in content:
        print("  [通过] 包含 'FastAPI' 关键字")
    else:
        print("  [失败] 不包含 'FastAPI' 关键字")
        all_passed = False

    # 测试 3: 是否包含 React
    print()
    print("[测试 3/5] 检查是否包含 'React' 关键字...")
    if "React" in content:
        print("  [通过] 包含 'React' 关键字")
    else:
        print("  [失败] 不包含 'React' 关键字")
        all_passed = False

    # 测试 4: 是否包含 health_check.py 使用说明
    print()
    print("[测试 4/5] 检查是否包含 'health_check.py' 使用说明...")
    has_health_check = "health_check.py" in content
    has_npm_health = "npm run health" in content

    if has_health_check:
        print("  [通过] 包含 'health_check.py' 使用说明")
    else:
        print("  [失败] 不包含 'health_check.py' 使用说明")
        all_passed = False

    if has_npm_health:
        print("  [通过] 包含 'npm run health' 命令说明")
    else:
        print("  [警告] 建议添加 'npm run health' 命令说明")

    # 测试 5: 是否包含 setup.bat 说明
    print()
    print("[测试 5/5] 检查是否包含 'setup.bat' 安装脚本说明...")
    has_setup_bat = "setup.bat" in content
    has_one_click_install = "一键安装" in content

    if has_setup_bat:
        print("  [通过] 包含 'setup.bat' 安装脚本说明")
    else:
        print("  [失败] 不包含 'setup.bat' 安装脚本说明")
        all_passed = False

    if has_one_click_install:
        print("  [通过] 包含 '一键安装' 说明")
    else:
        print("  [警告] 建议添加 '一键安装' 说明")

    # 输出总结
    print()
    print("=" * 60)
    if all_passed:
        print("  验证结果: 全部通过")
    else:
        print("  验证结果: 部分失败")
    print("=" * 60)
    print()

    return all_passed


if __name__ == "__main__":
    # 运行简单验证
    success = validate_readme_simple()
    
    # 根据结果设置退出码
    sys.exit(0 if success else 1)
