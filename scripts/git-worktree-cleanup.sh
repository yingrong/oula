#!/bin/bash

# 脚本名称: git-worktree-cleanup.sh
# 功能: 清理Git worktree，提供选择功能并在用户确认后执行

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# 帮助信息
show_help() {
    echo "Usage: $0 [--force]"
    echo ""
    echo "Options:"
    echo "  --force    跳过确认步骤，直接执行清理"
    echo ""
    echo "Example:"
    echo "  $0          # 显示所有worktree并要求确认"
    echo "  $0 --force  # 直接清理所有worktree"
    echo "  npm run worktree:cleanup  # 通过npm命令执行"
    echo "  npm run worktree:cleanup -- --force  # 通过npm命令执行并使用--force选项"
}

# 检查Git仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 当前目录不是Git仓库${NC}"
    exit 1
fi

# 检查参数
FORCE=false
if [ $# -eq 1 ] && [ "$1" == "--force" ]; then
    FORCE=true
elif [ $# -eq 1 ] && ([ "$1" == "-h" ] || [ "$1" == "--help" ]); then
    show_help
    exit 0
elif [ $# -gt 0 ]; then
    echo -e "${RED}错误: 无效的参数${NC}"
    show_help
    exit 1
fi

# 获取所有worktree
WORKTREES=$(git worktree list --porcelain | grep "^worktree" | awk '{print $2}')

# 检查是否有worktree
if [ -z "$WORKTREES" ]; then
    echo -e "${GREEN}没有找到worktree，无需清理${NC}"
    exit 0
fi

# 获取当前目录（主仓库目录）
CURRENT_DIR=$(pwd -P)

# 显示所有worktree（排除主目录）
echo -e "${YELLOW}当前存在的worktree:${NC}"
WORKTREE_ARRAY=()
i=1
for worktree in $WORKTREES; do
    # 排除主目录
    if [ "$(realpath "$worktree")" != "$CURRENT_DIR" ]; then
        WORKTREE_ARRAY[$i]="$worktree"
        echo -e "  ${i}. ${worktree}"
        i=$((i+1))
    fi
done

# 检查是否有可清理的worktree
if [ ${#WORKTREE_ARRAY[@]} -eq 0 ]; then
    echo -e "${GREEN}没有可清理的worktree（主目录不允许清理）${NC}"
    exit 0
fi

# 如果使用--force选项，直接清理所有worktree（排除主目录）
if [ "$FORCE" = true ]; then
    echo -e "${YELLOW}使用--force选项，直接清理所有worktree（主目录不允许清理）${NC}"
    for worktree in "${WORKTREE_ARRAY[@]}"; do
        echo -e "${GREEN}清理worktree: ${worktree}${NC}"
        git worktree remove "$worktree"
    done
    echo -e "${GREEN}清理完成！${NC}"
    
    # 询问是否执行 prune 操作
    echo -e "${YELLOW}是否执行 git worktree prune 来彻底清理不再存在的 worktree 引用？(y/n):${NC}"
    read -r PRUNE_CONFIRM
    if [ "$PRUNE_CONFIRM" = "y" ] || [ "$PRUNE_CONFIRM" = "Y" ]; then
        echo -e "${GREEN}执行 git worktree prune...${NC}"
        git worktree prune
        echo -e "${GREEN}Prune 操作完成！${NC}"
    else
        echo -e "${YELLOW}跳过 prune 操作${NC}"
    fi
    exit 0
fi

# 让用户选择要清理的worktree
echo -e "${YELLOW}请选择要清理的worktree (多个选项用空格分隔，全部清理输入 'all'):${NC}"
read -r SELECTION

# 处理用户选择
if [ "$SELECTION" = "all" ]; then
    # 确认清理所有worktree
    echo -e "${YELLOW}确定要清理所有worktree吗？(y/n):${NC}"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        for worktree in "${WORKTREE_ARRAY[@]}"; do
            echo -e "${GREEN}清理worktree: ${worktree}${NC}"
            git worktree remove "$worktree"
        done
        echo -e "${GREEN}清理完成！${NC}"
    else
        echo -e "${YELLOW}取消清理操作${NC}"
    fi
else
    # 清理用户选择的worktree
    IFS=' ' read -r -a SELECTED <<< "$SELECTION"
    for index in "${SELECTED[@]}"; do
        if [[ "$index" =~ ^[0-9]+$ ]] && [ "$index" -ge 1 ] && [ "$index" -lt "$i" ]; then
            worktree="${WORKTREE_ARRAY[$index]}"
            # 确认清理
            echo -e "${YELLOW}确定要清理worktree ${worktree}吗？(y/n):${NC}"
            read -r CONFIRM
            if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                echo -e "${GREEN}清理worktree: ${worktree}${NC}"
                git worktree remove "$worktree"
            else
                echo -e "${YELLOW}取消清理worktree ${worktree}${NC}"
            fi
        else
            echo -e "${RED}无效的选择: ${index}${NC}"
        fi
    done
    echo -e "${GREEN}清理完成！${NC}"
    
    # 询问是否执行 prune 操作
    echo -e "${YELLOW}是否执行 git worktree prune 来彻底清理不再存在的 worktree 引用？(y/n):${NC}"
    read -r PRUNE_CONFIRM
    if [ "$PRUNE_CONFIRM" = "y" ] || [ "$PRUNE_CONFIRM" = "Y" ]; then
        echo -e "${GREEN}执行 git worktree prune...${NC}"
        git worktree prune
        echo -e "${GREEN}Prune 操作完成！${NC}"
    else
        echo -e "${YELLOW}跳过 prune 操作${NC}"
    fi
fi
