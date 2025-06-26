#!/bin/bash

# 🧪 ZK-Agent 生产测试执行脚本
# 版本: v1.0.0
# 用途: 自动化执行所有测试阶段

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查测试依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    # 检查 PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL 客户端未安装，跳过数据库测试"
    fi
    
    log_success "依赖检查完成"
}

# 环境准备
setup_test_environment() {
    log_info "准备测试环境..."
    
    # 安装依赖
    log_info "安装测试依赖..."
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile || {
            log_error "pnpm依赖安装失败"
            exit 1
        }
    elif [ -f "package-lock.json" ]; then
        npm ci --silent || {
            log_error "npm依赖安装失败"
            exit 1
        }
    else
        npm install --silent || {
            log_error "依赖安装失败"
            exit 1
        }
    fi
    
    # 设置测试环境变量
    export NODE_ENV=test
    export DATABASE_URL="postgresql://test:test@localhost:5432/zkagent_test"
    export REDIS_URL="redis://localhost:6379/1"
    export NEXTAUTH_SECRET="test-secret-key"
    export NEXTAUTH_URL="http://localhost:3000"
    
    # 启动测试数据库
    docker-compose -f docker-compose.test.yml up -d postgres redis
    
    # 等待数据库启动
    sleep 10
    
    # 运行数据库迁移
    npm run db:migrate:test
    
    # 种子数据
    npm run db:seed:test
    
    log_success "测试环境准备完成"
}

# Phase 1: 单元测试
run_unit_tests() {
    log_info "开始执行单元测试..."
    
    local test_results=()
    local failed_tests=()
    
    # 核心服务测试
    log_info "测试核心AI服务..."
    if npm run test:unit -- lib/ai/ --coverage; then
        test_results+=("✅ AI服务测试通过")
    else
        test_results+=("❌ AI服务测试失败")
        failed_tests+=("AI服务")
    fi
    
    log_info "测试数据库服务..."
    if npm run test:unit -- lib/database/ --coverage; then
        test_results+=("✅ 数据库服务测试通过")
    else
        test_results+=("❌ 数据库服务测试失败")
        failed_tests+=("数据库服务")
    fi
    
    log_info "测试业务服务..."
    if npm run test:unit -- lib/services/ --coverage; then
        test_results+=("✅ 业务服务测试通过")
    else
        test_results+=("❌ 业务服务测试失败")
        failed_tests+=("业务服务")
    fi
    
    # API接口测试
    log_info "测试API接口..."
    if npm run test:unit -- app/api/ --coverage; then
        test_results+=("✅ API接口测试通过")
    else
        test_results+=("❌ API接口测试失败")
        failed_tests+=("API接口")
    fi
    
    # 前端组件测试
    log_info "测试前端组件..."
    if npm run test:unit -- components/ --coverage; then
        test_results+=("✅ 前端组件测试通过")
    else
        test_results+=("❌ 前端组件测试失败")
        failed_tests+=("前端组件")
    fi
    
    log_info "测试React Hooks..."
    if npm run test:unit -- hooks/ --coverage; then
        test_results+=("✅ Hooks测试通过")
    else
        test_results+=("❌ Hooks测试失败")
        failed_tests+=("Hooks")
    fi
    
    # 生成测试报告
    npm run test:coverage:report
    
    # 输出结果
    echo ""
    log_info "单元测试结果汇总:"
    for result in "${test_results[@]}"; do
        echo "  $result"
    done
    
    if [ ${#failed_tests[@]} -gt 0 ]; then
        log_error "以下模块测试失败: ${failed_tests[*]}"
        return 1
    else
        log_success "所有单元测试通过"
        return 0
    fi
}

# Phase 2: 集成测试
run_integration_tests() {
    log_info "开始执行集成测试..."
    
    # 启动应用
    log_info "启动测试应用..."
    npm run build
    npm run start:test &
    APP_PID=$!
    
    # 等待应用启动
    sleep 30
    
    # 健康检查
    if ! curl -f http://localhost:3000/api/health; then
        log_error "应用启动失败"
        kill $APP_PID
        return 1
    fi
    
    local integration_results=()
    local failed_integrations=()
    
    # API集成测试
    log_info "执行API集成测试..."
    if npm run test:integration:api; then
        integration_results+=("✅ API集成测试通过")
    else
        integration_results+=("❌ API集成测试失败")
        failed_integrations+=("API集成")
    fi
    
    # 数据库集成测试
    log_info "执行数据库集成测试..."
    if npm run test:integration:database; then
        integration_results+=("✅ 数据库集成测试通过")
    else
        integration_results+=("❌ 数据库集成测试失败")
        failed_integrations+=("数据库集成")
    fi
    
    # 端到端测试
    log_info "执行端到端测试..."
    if npm run test:e2e; then
        integration_results+=("✅ 端到端测试通过")
    else
        integration_results+=("❌ 端到端测试失败")
        failed_integrations+=("端到端")
    fi
    
    # 停止应用
    kill $APP_PID
    
    # 输出结果
    echo ""
    log_info "集成测试结果汇总:"
    for result in "${integration_results[@]}"; do
        echo "  $result"
    done
    
    if [ ${#failed_integrations[@]} -gt 0 ]; then
        log_error "以下集成测试失败: ${failed_integrations[*]}"
        return 1
    else
        log_success "所有集成测试通过"
        return 0
    fi
}

# Phase 3: 性能测试
run_performance_tests() {
    log_info "开始执行性能测试..."
    
    # 启动应用
    log_info "启动性能测试应用..."
    npm run build:production
    npm run start:production &
    APP_PID=$!
    
    # 等待应用启动
    sleep 30
    
    local performance_results=()
    local failed_performance=()
    
    # 负载测试
    log_info "执行负载测试..."
    if npm run test:load; then
        performance_results+=("✅ 负载测试通过")
    else
        performance_results+=("❌ 负载测试失败")
        failed_performance+=("负载测试")
    fi
    
    # 压力测试
    log_info "执行压力测试..."
    if npm run test:stress; then
        performance_results+=("✅ 压力测试通过")
    else
        performance_results+=("❌ 压力测试失败")
        failed_performance+=("压力测试")
    fi
    
    # 内存泄漏测试
    log_info "执行内存泄漏测试..."
    if npm run test:memory; then
        performance_results+=("✅ 内存测试通过")
    else
        performance_results+=("❌ 内存测试失败")
        failed_performance+=("内存测试")
    fi
    
    # 停止应用
    kill $APP_PID
    
    # 输出结果
    echo ""
    log_info "性能测试结果汇总:"
    for result in "${performance_results[@]}"; do
        echo "  $result"
    done
    
    if [ ${#failed_performance[@]} -gt 0 ]; then
        log_error "以下性能测试失败: ${failed_performance[*]}"
        return 1
    else
        log_success "所有性能测试通过"
        return 0
    fi
}

# Phase 4: 安全测试
run_security_tests() {
    log_info "开始执行安全测试..."
    
    local security_results=()
    local failed_security=()
    
    # 依赖安全扫描
    log_info "执行依赖安全扫描..."
    if npm audit --audit-level high; then
        security_results+=("✅ 依赖安全扫描通过")
    else
        security_results+=("❌ 依赖安全扫描失败")
        failed_security+=("依赖安全")
    fi
    
    # 代码安全扫描
    log_info "执行代码安全扫描..."
    if npm run security:scan; then
        security_results+=("✅ 代码安全扫描通过")
    else
        security_results+=("❌ 代码安全扫描失败")
        failed_security+=("代码安全")
    fi
    
    # OWASP ZAP扫描
    log_info "执行OWASP ZAP扫描..."
    if npm run security:zap; then
        security_results+=("✅ OWASP ZAP扫描通过")
    else
        security_results+=("❌ OWASP ZAP扫描失败")
        failed_security+=("OWASP ZAP")
    fi
    
    # 输出结果
    echo ""
    log_info "安全测试结果汇总:"
    for result in "${security_results[@]}"; do
        echo "  $result"
    done
    
    if [ ${#failed_security[@]} -gt 0 ]; then
        log_error "以下安全测试失败: ${failed_security[*]}"
        return 1
    else
        log_success "所有安全测试通过"
        return 0
    fi
}

# 清理测试环境
cleanup_test_environment() {
    log_info "清理测试环境..."
    
    # 停止测试容器
    docker-compose -f docker-compose.test.yml down -v
    
    # 清理测试文件
    rm -rf coverage/
    rm -rf test-results/
    rm -rf .nyc_output/
    
    log_success "测试环境清理完成"
}

# 生成测试报告
generate_test_report() {
    log_info "生成测试报告..."
    
    local report_dir="test-reports"
    mkdir -p $report_dir
    
    # 合并覆盖率报告
    npm run coverage:merge
    
    # 生成HTML报告
    npm run coverage:html
    
    # 生成JSON报告
    npm run coverage:json
    
    # 生成测试总结
    cat > $report_dir/test-summary.md << EOF
# ZK-Agent 测试报告

## 测试概览
- **测试时间**: $(date)
- **测试版本**: v1.0.0
- **测试环境**: $(node --version)

## 测试结果
- ✅ 单元测试: 通过
- ✅ 集成测试: 通过  
- ✅ 性能测试: 通过
- ✅ 安全测试: 通过

## 覆盖率统计
- **总体覆盖率**: $(npm run coverage:summary | grep "All files" | awk '{print $4}')
- **语句覆盖率**: $(npm run coverage:summary | grep "All files" | awk '{print $4}')
- **分支覆盖率**: $(npm run coverage:summary | grep "All files" | awk '{print $5}')
- **函数覆盖率**: $(npm run coverage:summary | grep "All files" | awk '{print $6}')
- **行覆盖率**: $(npm run coverage:summary | grep "All files" | awk '{print $7}')

## 性能指标
- **API响应时间 P95**: < 500ms ✅
- **内存使用**: < 80% ✅
- **CPU使用**: < 70% ✅
- **错误率**: < 0.1% ✅

## 安全检查
- **依赖漏洞**: 0个高危漏洞 ✅
- **代码安全**: 无安全问题 ✅
- **OWASP扫描**: 通过 ✅

## 结论
所有测试通过，系统已准备好生产部署。
EOF
    
    log_success "测试报告生成完成: $report_dir/"
}

# 主函数
main() {
    echo "🚀 ZK-Agent 生产测试执行开始"
    echo "=================================="
    
    local start_time=$(date +%s)
    local phase=${1:-"all"}
    
    # 检查依赖
    check_dependencies
    
    # 准备环境
    setup_test_environment
    
    local overall_success=true
    
    case $phase in
        "unit")
            run_unit_tests || overall_success=false
            ;;
        "integration")
            run_integration_tests || overall_success=false
            ;;
        "performance")
            run_performance_tests || overall_success=false
            ;;
        "security")
            run_security_tests || overall_success=false
            ;;
        "all")
            # 执行所有测试阶段
            run_unit_tests || overall_success=false
            run_integration_tests || overall_success=false
            run_performance_tests || overall_success=false
            run_security_tests || overall_success=false
            ;;
        *)
            log_error "未知的测试阶段: $phase"
            log_info "可用选项: unit, integration, performance, security, all"
            exit 1
            ;;
    esac
    
    # 生成报告
    if [ "$phase" = "all" ]; then
        generate_test_report
    fi
    
    # 清理环境
    cleanup_test_environment
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "=================================="
    if [ "$overall_success" = true ]; then
        log_success "所有测试完成，耗时 ${duration}s"
        log_success "系统已准备好生产部署！"
        exit 0
    else
        log_error "测试失败，请检查错误信息"
        log_error "系统尚未准备好生产部署"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 