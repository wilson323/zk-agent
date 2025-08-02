# 多智能体系统 Docker 镜像
# 基于 Python 3.11 官方镜像构建

FROM python:3.11-slim

# 设置维护者信息
LABEL maintainer="ZK-Agent Team <team@zk-agent.com>"
LABEL version="1.0.0"
LABEL description="Multi-Agent System with AutoGen, CrewAI, and LangGraph"

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 升级 pip
RUN pip install --upgrade pip setuptools wheel

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p logs data temp

# 设置权限
RUN chmod +x *.py

# 创建非 root 用户
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# 暴露端口
EXPOSE 8000

# 设置启动命令
CMD ["python", "multi_agent_system_complete_example.py"]