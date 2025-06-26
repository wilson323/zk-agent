## 人脸增强环境需求

### 最低配置
| 组件 | 规格 | 备注 |
|------|------|-----|
| GPU | NVIDIA A10G (24GB) | 需支持MIG分区 |
| CPU | 4核 (Xeon 3.0GHz+) | AVX-512指令集 |
| 内存 | 32GB DDR4 | ECC内存必需 |
| 存储 | 500GB NVMe SSD | 4K随机读写≥500K IOPS |

### 推荐生产配置
```yaml
cluster:
  nodeGroups:
    - name: face-enhance
      instanceType: g5.2xlarge
      minSize: 3
      maxSize: 10
      labels:
        accelerator: nvidia-t4
      taints:
        - key: face-enhance
          value: "true"
          effect: NoSchedule
```

3. 资源评估矩阵：
```markdown:docs/RESOURCE-ASSESSMENT.md
## 人脸增强资源评估

### 单节点容量
| 分辨率 | 并发数 | 显存消耗 | CPU使用 | 网络吞吐 |
|-------|--------|---------|--------|---------|
| 1080P | 8      | 9.8GB   | 35%    | 120Mbps |
| 4K    | 3      | 10.2GB  | 45%    | 280Mbps |

### 集群规划公式
```
所需节点数 = CEIL(总QPS / 单节点QPS) × 冗余系数(1.3)

示例：
- 预期QPS: 150
- 单节点QPS: 25 (1080P)
- 计算：CEIL(150/25) × 1.3 = 6 × 1.3 ≈ 8节点 