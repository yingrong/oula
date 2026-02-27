#!/bin/bash

# 脚本名称: git-worktree-setup.sh
# 功能: 自动创建新的Git分支，关联到新的Git work tree，并切换到该目录

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# 帮助信息
show_help() {
    echo "Usage: $0 <branch-name> [worktree-path] [--cd]"
    echo ""
    echo "Arguments:"
    echo "  branch-name     新分支的名称"
    echo "  worktree-path   可选，新work tree的路径，默认为../<branch-name>"
    echo "  --cd            可选，输出切换到新目录的命令"
    echo ""
    echo "Example:"
    echo "  $0 feature/new-feature              # 创建名为feature/new-feature的分支"
    echo "  $0 bugfix/issue-123 ../my-worktree  # 创建名为bugfix/issue-123的分支，并指定工作树路径"
    echo "  $0 feature/test --cd | source /dev/stdin  # 创建分支并自动切换到新目录"
    echo "  npm run worktree:setup -- feature/test  # 通过npm命令执行"
}

# 检查参数
if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

BRANCH_NAME="$1"

# 确定work tree路径
if [ $# -eq 2 ]; then
    WORKTREE_PATH="$2"
else
    WORKTREE_PATH="../${BRANCH_NAME}"
fi

# 检查Git仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 当前目录不是Git仓库${NC}"
    exit 1
fi

# 检查分支是否已存在
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo -e "${YELLOW}警告: 分支 ${BRANCH_NAME} 已存在${NC}"
else
    # 创建新分支
    echo -e "${GREEN}创建新分支: ${BRANCH_NAME}${NC}"
    if ! git branch "${BRANCH_NAME}"; then
        echo -e "${RED}错误: 创建分支失败${NC}"
        exit 1
    fi
fi

# 检查work tree路径是否已存在
if [ -d "${WORKTREE_PATH}" ]; then
    echo -e "${RED}错误: 路径 ${WORKTREE_PATH} 已存在${NC}"
    exit 1
fi

# 创建work tree
 echo -e "${GREEN}创建新的work tree: ${WORKTREE_PATH}${NC}"
if ! git worktree add "${WORKTREE_PATH}" "${BRANCH_NAME}"; then
    echo -e "${RED}错误: 创建work tree失败${NC}"
    exit 1
fi

# 切换到新目录
# echo -e "${GREEN}切换到目录: ${WORKTREE_PATH}${NC}"
cd "${WORKTREE_PATH}" || {
    echo -e "${RED}错误: 切换目录失败${NC}"
    exit 1
}

# 显示目录结构
echo -e "${GREEN}显示目录结构:${NC}"
if command -v tree &> /dev/null; then
    tree -L 2
else
    echo -e "${YELLOW}tree命令未找到，使用ls -la替代${NC}"
    ls -la
fi

# 完成提示
echo -e "${GREEN}操作完成！已成功创建分支 ${BRANCH_NAME} 并设置对应的work tree${NC}"
