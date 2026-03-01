#!/bin/bash

# 脚本名称: git-branch-rebase-merge.sh
# 功能: 在新的分支下，先 rebase main分支，如果没有问题，再合并回main。如果有问题，停下，人工处理

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# 帮助信息
show_help() {
    echo "Usage: $0"
    echo ""
    echo "功能: 在当前分支上执行 rebase main，成功后合并回 main 分支"
    echo ""
    echo "注意:"
    echo "  - 当前目录必须是 Git 仓库"
    echo "  - 当前分支不能是 main 分支"
    echo "  - main 分支必须存在"
    echo "  - 如果 rebase 过程中出现冲突，脚本会停止并提示人工处理"
    echo ""
    echo "示例:"
    echo "  $0          # 执行 rebase 并合并操作"
    echo "  npm run branch:rebase-merge  # 通过 npm 命令执行"
}

# 检查参数
if [ $# -eq 1 ] && ([ "$1" == "-h" ] || [ "$1" == "--help" ]); then
    show_help
    exit 0
elif [ $# -gt 0 ]; then
    echo -e "${RED}错误: 无效的参数${NC}"
    show_help
    exit 1
fi

# 检查Git仓库
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}错误: 当前目录不是Git仓库${NC}"
    exit 1
fi

# 获取当前分支名称
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    echo -e "${RED}错误: 无法获取当前分支名称${NC}"
    exit 1
fi

# 检查当前分支是否不是main分支
if [ "$CURRENT_BRANCH" == "main" ]; then
    echo -e "${RED}错误: 当前分支不能是main分支${NC}"
    exit 1
fi

# 检查main分支是否存在
if ! git branch --list main > /dev/null 2>&1; then
    echo -e "${RED}错误: main分支不存在${NC}"
    exit 1
fi

# 检查当前分支是否有未提交的更改
echo -e "${YELLOW}检查当前分支是否有未提交的更改...${NC}"
if ! git diff --quiet; then
    echo -e "${RED}错误: 当前分支存在未提交的更改${NC}"
    echo -e "${YELLOW}请先提交或 stash 所有更改后再运行脚本${NC}"
    exit 1
fi

if ! git diff --cached --quiet; then
    echo -e "${RED}错误: 当前分支存在未提交的暂存更改${NC}"
    echo -e "${YELLOW}请先提交或 stash 所有更改后再运行脚本${NC}"
    exit 1
fi

# 检查main分支是否有未提交的更改
echo -e "${YELLOW}检查main分支是否有未提交的更改...${NC}"
MAIN_WORKTREE=$(git worktree list | grep "\[main\]" | awk '{print $1}')
if [ ! -z "$MAIN_WORKTREE" ]; then
    ORIGINAL_DIR=$(pwd -P)
    cd "$MAIN_WORKTREE"
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${RED}错误: main分支存在未提交的更改${NC}"
        echo -e "${YELLOW}请先在main分支所在的worktree中提交或 stash 所有更改后再运行脚本${NC}"
        cd "$ORIGINAL_DIR"
        exit 1
    fi
    cd "$ORIGINAL_DIR"
fi

# 执行rebase main操作
echo -e "${YELLOW}开始执行 git rebase main...${NC}"
git rebase main

# 检查rebase是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: rebase过程中出现冲突，请人工处理${NC}"
    echo -e "${YELLOW}处理冲突后，可以再次运行此脚本继续操作${NC}"
    exit 1
fi

echo -e "${GREEN}rebase 成功完成！${NC}"

# 保存当前目录
ORIGINAL_DIR=$(pwd -P)

# 找到main分支所在的目录
MAIN_WORKTREE=$(git worktree list | grep "\[main\]" | awk '{print $1}')

if [ -z "$MAIN_WORKTREE" ]; then
    echo -e "${RED}错误: 找不到main分支所在的worktree${NC}"
    exit 1
fi

# 切换到main分支所在的目录
echo -e "${YELLOW}切换到main分支所在的目录: ${MAIN_WORKTREE}${NC}"
cd "$MAIN_WORKTREE"

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 切换到main分支所在目录失败${NC}"
    cd "$ORIGINAL_DIR"
    exit 1
fi

# 合并当前分支到main
echo -e "${YELLOW}合并分支 ${CURRENT_BRANCH} 到 main...${NC}"
git merge "${CURRENT_BRANCH}"

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 合并过程中出现问题，请人工处理${NC}"
    cd "$ORIGINAL_DIR"
    exit 1
fi

echo -e "${GREEN}合并成功完成！${NC}"
echo -e "${GREEN}分支 ${CURRENT_BRANCH} 已成功合并到 main 分支${NC}"

# 切换回原来的目录
echo -e "${YELLOW}切换回原来的目录: ${ORIGINAL_DIR}${NC}"
cd "$ORIGINAL_DIR"

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 切换回原来的目录失败${NC}"
    exit 1
fi

echo -e "${GREEN}操作完成！${NC}"
