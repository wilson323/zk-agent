// @ts-nocheck
import { Pool } from "pg"

export interface CADAnalysisRecord {
  id: string
  userId: string
  fileName: string
  fileSize: number
  fileType: string
  analysisConfig: any
  analysisResult: any
  devices: any[]
  risks: any[]
  complianceStatus: any
  createdAt: Date
  updatedAt: Date
  status: "pending" | "processing" | "completed" | "failed"
  processingTime?: number
  errorMessage?: string
}

export interface DeviceRecord {
  id: string
  analysisId: string
  name: string
  category: string
  type: string
  specifications: any
  location: {
    x: number
    y: number
    z: number
    room?: string
    zone?: string
  }
  connections: any
  status: string
  installDate?: Date
  warrantyExpiry?: Date
  maintenanceSchedule?: string
  riskFactors?: string[]
  aiConfidence?: number
  createdAt: Date
  updatedAt: Date
}

export interface RiskRecord {
  id: string
  analysisId: string
  deviceId?: string
  title: string
  description: string
  category: string
  severity: "low" | "medium" | "high" | "critical"
  location: any
  recommendations: string[]
  status: "open" | "acknowledged" | "resolved" | "false_positive"
  assignedTo?: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export class CADDatabase {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  /**
   * 初始化数据库表
   */
  async initializeTables(): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query("BEGIN")

      // 创建CAD分析记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS cad_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          file_name VARCHAR(500) NOT NULL,
          file_size BIGINT NOT NULL,
          file_type VARCHAR(50) NOT NULL,
          analysis_config JSONB NOT NULL DEFAULT '{}',
          analysis_result JSONB NOT NULL DEFAULT '{}',
          devices JSONB NOT NULL DEFAULT '[]',
          risks JSONB NOT NULL DEFAULT '[]',
          compliance_status JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          processing_time INTEGER,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // 创建设备记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS cad_devices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_id UUID NOT NULL REFERENCES cad_analyses(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          type VARCHAR(100) NOT NULL,
          specifications JSONB NOT NULL DEFAULT '{}',
          location JSONB NOT NULL DEFAULT '{}',
          connections JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          install_date DATE,
          warranty_expiry DATE,
          maintenance_schedule TEXT,
          risk_factors JSONB DEFAULT '[]',
          ai_confidence DECIMAL(3,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // 创建风险记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS cad_risks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_id UUID NOT NULL REFERENCES cad_analyses(id) ON DELETE CASCADE,
          device_id UUID REFERENCES cad_devices(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          location JSONB NOT NULL DEFAULT '{}',
          recommendations JSONB NOT NULL DEFAULT '[]',
          status VARCHAR(50) NOT NULL DEFAULT 'open',
          assigned_to VARCHAR(255),
          due_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_cad_analyses_user_id ON cad_analyses(user_id);
        CREATE INDEX IF NOT EXISTS idx_cad_analyses_status ON cad_analyses(status);
        CREATE INDEX IF NOT EXISTS idx_cad_analyses_created_at ON cad_analyses(created_at);
        CREATE INDEX IF NOT EXISTS idx_cad_devices_analysis_id ON cad_devices(analysis_id);
        CREATE INDEX IF NOT EXISTS idx_cad_devices_category ON cad_devices(category);
        CREATE INDEX IF NOT EXISTS idx_cad_risks_analysis_id ON cad_risks(analysis_id);
        CREATE INDEX IF NOT EXISTS idx_cad_risks_severity ON cad_risks(severity);
        CREATE INDEX IF NOT EXISTS idx_cad_risks_status ON cad_risks(status);
      `)

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 保存CAD分析记录
   */
  async saveAnalysis(record: Omit<CADAnalysisRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        INSERT INTO cad_analyses (
          user_id, file_name, file_size, file_type, analysis_config,
          analysis_result, devices, risks, compliance_status, status,
          processing_time, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
        [
          record.userId,
          record.fileName,
          record.fileSize,
          record.fileType,
          JSON.stringify(record.analysisConfig),
          JSON.stringify(record.analysisResult),
          JSON.stringify(record.devices),
          JSON.stringify(record.risks),
          JSON.stringify(record.complianceStatus),
          record.status,
          record.processingTime,
          record.errorMessage,
        ],
      )

      return result.rows[0].id
    } finally {
      client.release()
    }
  }

  /**
   * 批量保存设备记录
   */
  async saveDevices(devices: Omit<DeviceRecord, "id" | "createdAt" | "updatedAt">[]): Promise<string[]> {
    if (devices.length === 0) {return []}

    const client = await this.pool.connect()

    try {
      await client.query("BEGIN")

      const deviceIds: string[] = []

      for (const device of devices) {
        const result = await client.query(
          `
          INSERT INTO cad_devices (
            analysis_id, name, category, type, specifications, location,
            connections, status, install_date, warranty_expiry,
            maintenance_schedule, risk_factors, ai_confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `,
          [
            device.analysisId,
            device.name,
            device.category,
            device.type,
            JSON.stringify(device.specifications),
            JSON.stringify(device.location),
            JSON.stringify(device.connections),
            device.status,
            device.installDate,
            device.warrantyExpiry,
            device.maintenanceSchedule,
            JSON.stringify(device.riskFactors || []),
            device.aiConfidence,
          ],
        )

        deviceIds.push(result.rows[0].id)
      }

      await client.query("COMMIT")
      return deviceIds
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 批量保存风险记录
   */
  async saveRisks(risks: Omit<RiskRecord, "id" | "createdAt" | "updatedAt">[]): Promise<string[]> {
    if (risks.length === 0) {return []}

    const client = await this.pool.connect()

    try {
      await client.query("BEGIN")

      const riskIds: string[] = []

      for (const risk of risks) {
        const result = await client.query(
          `
          INSERT INTO cad_risks (
            analysis_id, device_id, title, description, category, severity,
            location, recommendations, status, assigned_to, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `,
          [
            risk.analysisId,
            risk.deviceId,
            risk.title,
            risk.description,
            risk.category,
            risk.severity,
            JSON.stringify(risk.location),
            JSON.stringify(risk.recommendations),
            risk.status,
            risk.assignedTo,
            risk.dueDate,
          ],
        )

        riskIds.push(result.rows[0].id)
      }

      await client.query("COMMIT")
      return riskIds
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 获取用户的分析历史
   */
  async getUserAnalyses(userId: string, limit = 50, offset = 0): Promise<CADAnalysisRecord[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id, user_id, file_name, file_size, file_type, analysis_config,
          analysis_result, devices, risks, compliance_status, status,
          processing_time, error_message, created_at, updated_at
        FROM cad_analyses 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `,
        [userId, limit, offset],
      )

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        fileName: row.file_name,
        fileSize: row.file_size,
        fileType: row.file_type,
        analysisConfig: row.analysis_config,
        analysisResult: row.analysis_result,
        devices: row.devices,
        risks: row.risks,
        complianceStatus: row.compliance_status,
        status: row.status,
        processingTime: row.processing_time,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } finally {
      client.release()
    }
  }

  /**
   * 获取分析详情
   */
  async getAnalysisById(id: string): Promise<CADAnalysisRecord | null> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id, user_id, file_name, file_size, file_type, analysis_config,
          analysis_result, devices, risks, compliance_status, status,
          processing_time, error_message, created_at, updated_at
        FROM cad_analyses 
        WHERE id = $1
      `,
        [id],
      )

      if (result.rows.length === 0) {return null}

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        fileName: row.file_name,
        fileSize: row.file_size,
        fileType: row.file_type,
        analysisConfig: row.analysis_config,
        analysisResult: row.analysis_result,
        devices: row.devices,
        risks: row.risks,
        complianceStatus: row.compliance_status,
        status: row.status,
        processingTime: row.processing_time,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    } finally {
      client.release()
    }
  }

  /**
   * 获取分析的设备列表
   */
  async getAnalysisDevices(analysisId: string): Promise<DeviceRecord[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id, analysis_id, name, category, type, specifications, location,
          connections, status, install_date, warranty_expiry, maintenance_schedule,
          risk_factors, ai_confidence, created_at, updated_at
        FROM cad_devices 
        WHERE analysis_id = $1
        ORDER BY created_at ASC
      `,
        [analysisId],
      )

      return result.rows.map((row) => ({
        id: row.id,
        analysisId: row.analysis_id,
        name: row.name,
        category: row.category,
        type: row.type,
        specifications: row.specifications,
        location: row.location,
        connections: row.connections,
        status: row.status,
        installDate: row.install_date,
        warrantyExpiry: row.warranty_expiry,
        maintenanceSchedule: row.maintenance_schedule,
        riskFactors: row.risk_factors,
        aiConfidence: row.ai_confidence,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } finally {
      client.release()
    }
  }

  /**
   * 获取分析的风险列表
   */
  async getAnalysisRisks(analysisId: string): Promise<RiskRecord[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id, analysis_id, device_id, title, description, category, severity,
          location, recommendations, status, assigned_to, due_date,
          created_at, updated_at
        FROM cad_risks 
        WHERE analysis_id = $1
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          created_at ASC
      `,
        [analysisId],
      )

      return result.rows.map((row) => ({
        id: row.id,
        analysisId: row.analysis_id,
        deviceId: row.device_id,
        title: row.title,
        description: row.description,
        category: row.category,
        severity: row.severity,
        location: row.location,
        recommendations: row.recommendations,
        status: row.status,
        assignedTo: row.assigned_to,
        dueDate: row.due_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } finally {
      client.release()
    }
  }

  /**
   * 更新分析状态
   */
  async updateAnalysisStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query(
        `
        UPDATE cad_analyses 
        SET status = $1, error_message = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [status, errorMessage, id],
      )
    } finally {
      client.release()
    }
  }

  /**
   * 更新风险状态
   */
  async updateRiskStatus(id: string, status: string, assignedTo?: string): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query(
        `
        UPDATE cad_risks 
        SET status = $1, assigned_to = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [status, assignedTo, id],
      )
    } finally {
      client.release()
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(userId?: string): Promise<any> {
    const client = await this.pool.connect()

    try {
      const whereClause = userId ? "WHERE user_id = $1" : ""
      const params = userId ? [userId] : []

      const analysisStats = await client.query(
        `
        SELECT 
          COUNT(*) as total_analyses,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_analyses,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_analyses,
          AVG(processing_time) as avg_processing_time
        FROM cad_analyses 
        ${whereClause}
      `,
        params,
      )

      const deviceStats = await client.query(
        `
        SELECT 
          COUNT(*) as total_devices,
          COUNT(DISTINCT category) as device_categories,
          category,
          COUNT(*) as count
        FROM cad_devices d
        JOIN cad_analyses a ON d.analysis_id = a.id
        ${whereClause.replace("user_id", "a.user_id")}
        GROUP BY category
      `,
        params,
      )

      const riskStats = await client.query(
        `
        SELECT 
          COUNT(*) as total_risks,
          severity,
          COUNT(*) as count
        FROM cad_risks r
        JOIN cad_analyses a ON r.analysis_id = a.id
        ${whereClause.replace("user_id", "a.user_id")}
        GROUP BY severity
      `,
        params,
      )

      return {
        analyses: analysisStats.rows[0],
        devices: {
          total: deviceStats.rows.reduce((sum, row) => sum + Number.parseInt(row.count), 0),
          categories: deviceStats.rows.length,
          breakdown: deviceStats.rows,
        },
        risks: {
          total: riskStats.rows.reduce((sum, row) => sum + Number.parseInt(row.count), 0),
          breakdown: riskStats.rows,
        },
      }
    } finally {
      client.release()
    }
  }

  /**
   * 删除分析记录
   */
  async deleteAnalysis(id: string): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query("DELETE FROM cad_analyses WHERE id = $1", [id])
    } finally {
      client.release()
    }
  }

  /**
   * 清理旧记录
   */
  async cleanupOldRecords(daysOld = 90): Promise<number> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(`
        DELETE FROM cad_analyses 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND status IN ('completed', 'failed')
      `)

      return result.rowCount || 0
    } finally {
      client.release()
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}

// 创建单例实例
export const cadDatabase = new CADDatabase()
