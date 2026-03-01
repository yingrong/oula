#!/usr/bin/env pwsh

# 脚本名称: git-worktree-setup.ps1
# 功能: 自动创建新的Git分支，关联到新的Git work tree，并切换到该目录

# 颜色定义
$GREEN = "\e[0;32m"
$RED = "\e[0;31m"
$YELLOW = "\e[1;33m"
$NC = "\e[0m" # No Color

# 帮助信息
function Show-Help {
    Write-Host "Usage: $($MyInvocation.MyCommand.Name) <branch-name> [worktree-path] [--cd]"
    Write-Host ""
    Write-Host "Arguments:"
    Write-Host "  branch-name     新分支的名称"
    Write-Host "  worktree-path   可选，新work tree的路径，默认为../<branch-name>"
    Write-Host "  --cd            可选，输出切换到新目录的命令"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\$($MyInvocation.MyCommand.Name) feature/new-feature              # 创建名为feature/new-feature的分支"
    Write-Host "  .\$($MyInvocation.MyCommand.Name) bugfix/issue-123 ../my-worktree  # 创建名为bugfix/issue-123的分支，并指定工作树路径"
    Write-Host "  npm run worktree:setup -- feature/test  # 通过npm命令执行"
}

# 检查参数
if ($args.Length -lt 1 -or $args[0] -eq "-h" -or $args[0] -eq "--help") {
    Show-Help
    exit 0
}

$BRANCH_NAME = $args[0]

# 确定work tree路径
if ($args.Length -eq 2 -and $args[1] -ne "--cd") {
    $WORKTREE_PATH = $args[1]
} else {
    $WORKTREE_PATH = "../$BRANCH_NAME"
}

# 检查Git仓库
if (-not (Test-Path ".git" -PathType Container)) {
    Write-Host -ForegroundColor Red "错误: 当前目录不是Git仓库"
    exit 1
}

# 检查分支是否已存在
try {
    $branchExists = git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"
    if ($LASTEXITCODE -eq 0) {
        Write-Host -ForegroundColor Yellow "警告: 分支 $BRANCH_NAME 已存在"
    } else {
        # 创建新分支
        Write-Host -ForegroundColor Green "创建新分支: $BRANCH_NAME"
        git branch $BRANCH_NAME
        if ($LASTEXITCODE -ne 0) {
            Write-Host -ForegroundColor Red "错误: 创建分支失败"
            exit 1
        }
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 检查分支时出错"
    exit 1
}

# 检查work tree路径是否已存在
if (Test-Path $WORKTREE_PATH -PathType Container) {
    Write-Host -ForegroundColor Red "错误: 路径 $WORKTREE_PATH 已存在"
    exit 1
}

# 创建work tree
Write-Host -ForegroundColor Green "创建新的work tree: $WORKTREE_PATH"
try {
    git worktree add $WORKTREE_PATH $BRANCH_NAME
    if ($LASTEXITCODE -ne 0) {
        Write-Host -ForegroundColor Red "错误: 创建work tree失败"
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 创建work tree时出错"
    exit 1
}

# 切换到新目录
Write-Host -ForegroundColor Green "切换到目录: $WORKTREE_PATH"
try {
    Set-Location $WORKTREE_PATH
    if (-not $?) {
        Write-Host -ForegroundColor Red "错误: 切换目录失败"
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 切换目录时出错"
    exit 1
}

# 显示目录结构
Write-Host -ForegroundColor Green "显示目录结构:"
try {
    $treeCommand = Get-Command tree -ErrorAction SilentlyContinue
    if ($treeCommand) {
        tree /L 2
    } else {
        Write-Host -ForegroundColor Yellow "tree命令未找到，使用ls替代"
        Get-ChildItem -Force
    }
} catch {
    Write-Host -ForegroundColor Yellow "显示目录结构时出错，使用ls替代"
    Get-ChildItem -Force
}

# 完成提示
Write-Host -ForegroundColor Green "操作完成！已成功创建分支 $BRANCH_NAME 并设置对应的work tree"