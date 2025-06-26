# ZK-Agent 生产级 Dockerfile
# 多阶段构建，优化镜像大小和安全性

# 阶段1：依赖安装和构建
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm@latest

# 安装依赖
RUN pnpm install --frozen-lockfile --prod=false

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN pnpm db:generate

# 构建应用
RUN pnpm build

# 阶段2：生产运行时
FROM node:20-alpine AS runner

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 安装运行时依赖
RUN apk add --no-cache \
    libc6-compat \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    dumb-init

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制必要的配置文件
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# 创建必要的目录
RUN mkdir -p /app/uploads /app/logs /app/temp

# 设置文件权限
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /app
RUN chmod -R 777 /app/uploads /app/logs /app/temp

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# 启动应用
CMD ["dumb-init", "node", "server.js"]