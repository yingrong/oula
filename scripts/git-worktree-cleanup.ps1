#!/usr/bin/env pwsh

# 脚本名称: git-worktree-cleanup.ps1
# 功能: 清理Git worktree，提供选择功能并在用户确认后执行

# 颜色定义
$GREEN = "\e[0;32m"
$RED = "\e[0;31m"
$YELLOW = "\e[1;33m"
$NC = "\e[0m" # No Color

# 帮助信息
function Show-Help {
    Write-Host "Usage: $($MyInvocation.MyCommand.Name) [--force]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  --force    跳过确认步骤，直接执行清理"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\$($MyInvocation.MyCommand.Name)          # 显示所有worktree并要求确认"
    Write-Host "  .\$($MyInvocation.MyCommand.Name) --force  # 直接清理所有worktree"
    Write-Host "  npm run worktree:cleanup  # 通过npm命令执行"
    Write-Host "  npm run worktree:cleanup -- --force  # 通过npm命令执行并使用--force选项"
}

# 检查Git仓库
if (-not (Test-Path ".git" -PathType Container)) {
    Write-Host -ForegroundColor Red "错误: 当前目录不是Git仓库"
    exit 1
}

# 检查参数
$FORCE = $false
if ($args.Length -eq 1 -and $args[0] -eq "--force") {
    $FORCE = $true
} elseif ($args.Length -eq 1 -and ($args[0] -eq "-h" -or $args[0] -eq "--help")) {
    Show-Help
    exit 0
} elseif ($args.Length -gt 0) {
    Write-Host -ForegroundColor Red "错误: 无效的参数"
    Show-Help
    exit 1
}

# 获取所有worktree
try {
    $WORKTREES = git worktree list --porcelain | Select-String "^worktree" | ForEach-Object { $_.Line.Split()[1] }
} catch {
    Write-Host -ForegroundColor Red "错误: 获取worktree列表失败"
    exit 1
}

# 检查是否有worktree
if (-not $WORKTREES) {
    Write-Host -ForegroundColor Green "没有找到worktree，无需清理"
    exit 0
}

# 获取当前目录（主仓库目录）
$CURRENT_DIR = Get-Location | Select-Object -ExpandProperty Path

# 显示所有worktree（排除主目录）
Write-Host -ForegroundColor Yellow "当前存在的worktree:"
$WORKTREE_ARRAY = @()
$i = 1
foreach ($worktree in $WORKTREES) {
    # 排除主目录
    $worktreePath = Resolve-Path $worktree | Select-Object -ExpandProperty Path
    if ($worktreePath -ne $CURRENT_DIR) {
        $WORKTREE_ARRAY += $worktree
        Write-Host "  $i. $worktree"
        $i++
    }
}

# 检查是否有可清理的worktree
if ($WORKTREE_ARRAY.Length -eq 0) {
    Write-Host -ForegroundColor Green "没有可清理的worktree（主目录不允许清理）"
    exit 0
}

# 如果使用--force选项，直接清理所有worktree（排除主目录）
if ($FORCE) {
    Write-Host -ForegroundColor Yellow "使用--force选项，直接清理所有worktree（主目录不允许清理）"
    foreach ($worktree in $WORKTREE_ARRAY) {
        Write-Host -ForegroundColor Green "清理worktree: $worktree"
        try {
            git worktree remove $worktree
        } catch {
            Write-Host -ForegroundColor Red "错误: 清理worktree $worktree 失败"
        }
    }
    Write-Host -ForegroundColor Green "清理完成！"
    
    # 询问是否执行 prune 操作
    $PRUNE_CONFIRM = Read-Host -Prompt "是否执行 git worktree prune 来彻底清理不再存在的 worktree 引用？(y/n)"
    if ($PRUNE_CONFIRM -eq "y" -or $PRUNE_CONFIRM -eq "Y") {
        Write-Host -ForegroundColor Green "执行 git worktree prune..."
        try {
            git worktree prune
            Write-Host -ForegroundColor Green "Prune 操作完成！"
        } catch {
            Write-Host -ForegroundColor Red "错误: 执行prune操作失败"
        }
    } else {
        Write-Host -ForegroundColor Yellow "跳过 prune 操作"
    }
    exit 0
}

# 让用户选择要清理的worktree
$SELECTION = Read-Host -Prompt "请选择要清理的worktree (多个选项用空格分隔，全部清理输入 'all')"

# 处理用户选择
if ($SELECTION -eq "all") {
    # 确认清理所有worktree
    $CONFIRM = Read-Host -Prompt "确定要清理所有worktree吗？(y/n)"
    if ($CONFIRM -eq "y" -or $CONFIRM -eq "Y") {
        foreach ($worktree in $WORKTREE_ARRAY) {
            Write-Host -ForegroundColor Green "清理worktree: $worktree"
            try {
                git worktree remove $worktree
            } catch {
                Write-Host -ForegroundColor Red "错误: 清理worktree $worktree 失败"
            }
        }
        Write-Host -ForegroundColor Green "清理完成！"
    } else {
        Write-Host -ForegroundColor Yellow "取消清理操作"
    }
} else {
    # 清理用户选择的worktree
    $SELECTED = $SELECTION -split " "
    foreach ($index in $SELECTED) {
        if ($index -match "^\d+$") {
            $numIndex = [int]$index
            if ($numIndex -ge 1 -and $numIndex -lt $i) {
                $worktree = $WORKTREE_ARRAY[$numIndex - 1]
                # 确认清理
                $CONFIRM = Read-Host -Prompt "确定要清理worktree $worktree吗？(y/n)"
                if ($CONFIRM -eq "y" -or $CONFIRM -eq "Y") {
                    Write-Host -ForegroundColor Green "清理worktree: $worktree"
                    try {
                        git worktree remove $worktree
                    } catch {
                        Write-Host -ForegroundColor Red "错误: 清理worktree $worktree 失败"
                    }
                } else {
                    Write-Host -ForegroundColor Yellow "取消清理worktree $worktree"
                }
            } else {
                Write-Host -ForegroundColor Red "无效的选择: $index"
            }
        } else {
            Write-Host -ForegroundColor Red "无效的选择: $index"
        }
    }
    Write-Host -ForegroundColor Green "清理完成！"
    
    # 询问是否执行 prune 操作
    $PRUNE_CONFIRM = Read-Host -Prompt "是否执行 git worktree prune 来彻底清理不再存在的 worktree 引用？(y/n)"
    if ($PRUNE_CONFIRM -eq "y" -or $PRUNE_CONFIRM -eq "Y") {
        Write-Host -ForegroundColor Green "执行 git worktree prune..."
        try {
            git worktree prune
            Write-Host -ForegroundColor Green "Prune 操作完成！"
        } catch {
            Write-Host -ForegroundColor Red "错误: 执行prune操作失败"
        }
    } else {
        Write-Host -ForegroundColor Yellow "跳过 prune 操作"
    }
}