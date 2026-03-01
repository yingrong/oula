#!/usr/bin/env pwsh

# 脚本名称: git-branch-rebase-merge.ps1
# 功能: 在新的分支下，先 rebase main分支，如果没有问题，再合并回main。如果有问题，停下，人工处理

# 颜色定义
$GREEN = "\e[0;32m"
$RED = "\e[0;31m"
$YELLOW = "\e[1;33m"
$NC = "\e[0m" # No Color

# 帮助信息
function Show-Help {
    Write-Host "Usage: $($MyInvocation.MyCommand.Name)"
    Write-Host ""
    Write-Host "功能: 在当前分支上执行 rebase main，成功后合并回 main 分支"
    Write-Host ""
    Write-Host "注意:"
    Write-Host "  - 当前目录必须是 Git 仓库"
    Write-Host "  - 当前分支不能是 main 分支"
    Write-Host "  - main 分支必须存在"
    Write-Host "  - 如果 rebase 过程中出现冲突，脚本会停止并提示人工处理"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\$($MyInvocation.MyCommand.Name)          # 执行 rebase 并合并操作"
    Write-Host "  npm run branch:rebase-merge  # 通过 npm 命令执行"
}

# 检查参数
if ($args.Length -eq 1 -and ($args[0] -eq "-h" -or $args[0] -eq "--help")) {
    Show-Help
    exit 0
} elseif ($args.Length -gt 0) {
    Write-Host -ForegroundColor Red "错误: 无效的参数"
    Show-Help
    exit 1
}

# 检查Git仓库
try {
    git rev-parse --is-inside-work-tree | Out-Null
} catch {
    Write-Host -ForegroundColor Red "错误: 当前目录不是Git仓库"
    exit 1
}

# 获取当前分支名称
$CURRENT_BRANCH = git branch --show-current
if (-not $CURRENT_BRANCH) {
    Write-Host -ForegroundColor Red "错误: 无法获取当前分支名称"
    exit 1
}

# 检查当前分支是否不是main分支
if ($CURRENT_BRANCH -eq "main") {
    Write-Host -ForegroundColor Red "错误: 当前分支不能是main分支"
    exit 1
}

# 检查main分支是否存在
try {
    git branch --list main | Out-Null
} catch {
    Write-Host -ForegroundColor Red "错误: main分支不存在"
    exit 1
}

# 检查当前分支是否有未提交的更改
Write-Host -ForegroundColor Yellow "检查当前分支是否有未提交的更改..."
try {
    git diff --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host -ForegroundColor Red "错误: 当前分支存在未提交的更改"
        Write-Host -ForegroundColor Yellow "请先提交或 stash 所有更改后再运行脚本"
        exit 1
    }
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host -ForegroundColor Red "错误: 当前分支存在未提交的暂存更改"
        Write-Host -ForegroundColor Yellow "请先提交或 stash 所有更改后再运行脚本"
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 检查更改时出错"
    exit 1
}

# 检查main分支是否有未提交的更改
Write-Host -ForegroundColor Yellow "检查main分支是否有未提交的更改..."
$MAIN_WORKTREE = git worktree list | Select-String "\[main\]" | ForEach-Object { $_.Line.Split()[0] }
if ($MAIN_WORKTREE) {
    $ORIGINAL_DIR = Get-Location
    try {
        Set-Location $MAIN_WORKTREE
        git diff --quiet
        $diffResult = $LASTEXITCODE
        git diff --cached --quiet
        $diffCachedResult = $LASTEXITCODE
        if ($diffResult -ne 0 -or $diffCachedResult -ne 0) {
            Write-Host -ForegroundColor Red "错误: main分支存在未提交的更改"
            Write-Host -ForegroundColor Yellow "请先在main分支所在的worktree中提交或 stash 所有更改后再运行脚本"
            Set-Location $ORIGINAL_DIR
            exit 1
        }
    } catch {
        Write-Host -ForegroundColor Red "错误: 检查main分支更改时出错"
        Set-Location $ORIGINAL_DIR
        exit 1
    } finally {
        Set-Location $ORIGINAL_DIR
    }
}

# 执行rebase main操作
Write-Host -ForegroundColor Yellow "开始执行 git rebase main..."
try {
    git rebase main
    if ($LASTEXITCODE -ne 0) {
        Write-Host -ForegroundColor Red "错误: rebase过程中出现冲突，请人工处理"
        Write-Host -ForegroundColor Yellow "处理冲突后，可以再次运行此脚本继续操作"
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 执行rebase时出错"
    exit 1
}

Write-Host -ForegroundColor Green "rebase 成功完成！"

# 保存当前目录
$ORIGINAL_DIR = Get-Location

# 找到main分支所在的目录
$MAIN_WORKTREE = git worktree list | Select-String "\[main\]" | ForEach-Object { $_.Line.Split()[0] }

if (-not $MAIN_WORKTREE) {
    Write-Host -ForegroundColor Red "错误: 找不到main分支所在的worktree"
    exit 1
}

# 切换到main分支所在的目录
Write-Host -ForegroundColor Yellow "切换到main分支所在的目录: $MAIN_WORKTREE"
try {
    Set-Location $MAIN_WORKTREE
    if (-not $?) {
        Write-Host -ForegroundColor Red "错误: 切换到main分支所在目录失败"
        Set-Location $ORIGINAL_DIR
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 切换目录时出错"
    Set-Location $ORIGINAL_DIR
    exit 1
}

# 合并当前分支到main
Write-Host -ForegroundColor Yellow "合并分支 $CURRENT_BRANCH 到 main..."
try {
    git merge $CURRENT_BRANCH
    if ($LASTEXITCODE -ne 0) {
        Write-Host -ForegroundColor Red "错误: 合并过程中出现问题，请人工处理"
        Set-Location $ORIGINAL_DIR
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 执行合并时出错"
    Set-Location $ORIGINAL_DIR
    exit 1
}

Write-Host -ForegroundColor Green "合并成功完成！"
Write-Host -ForegroundColor Green "分支 $CURRENT_BRANCH 已成功合并到 main 分支"

# 切换回原来的目录
Write-Host -ForegroundColor Yellow "切换回原来的目录: $ORIGINAL_DIR"
try {
    Set-Location $ORIGINAL_DIR
    if (-not $?) {
        Write-Host -ForegroundColor Red "错误: 切换回原来的目录失败"
        exit 1
    }
} catch {
    Write-Host -ForegroundColor Red "错误: 切换目录时出错"
    exit 1
}

Write-Host -ForegroundColor Green "操作完成！"