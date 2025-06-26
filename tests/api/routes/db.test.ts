/**
 * 数据库API路由错误处理测试
 * 测试数据库连接、查询、事务、备份等各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/db/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/database/connection-manager', () => ({
  getConnection: jest.fn(),
  createConnection: jest.fn(),
  closeConnection: jest.fn(),
  testConnection: jest.fn(),
  getConnectionStatus: jest.fn(),
  resetConnectionPool: jest.fn(),
  validateConnectionConfig: jest.fn()
}));

jest.mock('../../../lib/database/query-executor', () => ({
  executeQuery: jest.fn(),
  executeTransaction: jest.fn(),
  executeBatch: jest.fn(),
  validateQuery: jest.fn(),
  optimizeQuery: jest.fn(),
  getQueryPlan: jest.fn(),
  cancelQuery: jest.fn()
}));

jest.mock('../../../lib/database/schema-manager', () => ({
  validateSchema: jest.fn(),
  createTable: jest.fn(),
  alterTable: jest.fn(),
  dropTable: jest.fn(),
  createIndex: jest.fn(),
  dropIndex: jest.fn(),
  getTableInfo: jest.fn(),
  validateTableStructure: jest.fn()
}));

jest.mock('../../../lib/database/backup-manager', () => ({
  createBackup: jest.fn(),
  restoreBackup: jest.fn(),
  listBackups: jest.fn(),
  deleteBackup: jest.fn(),
  validateBackup: jest.fn(),
  scheduleBackup: jest.fn(),
  getBackupStatus: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  checkAdminPermissions: jest.fn(),
  checkDatabasePermissions: jest.fn()
}));

describe('Database API Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('GET /api/db - Database Status and Query', () => {
    it('should handle database connection failure', async () => {
      const { getConnection } = require('../../../lib/database/connection-manager');
      getConnection.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/db?action=status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(data.error.message).toContain('Database connection failed');
    });

    it('should handle database connection timeout', async () => {
      const { getConnection } = require('../../../lib/database/connection-manager');
      getConnection.mockRejectedValue(new Error('Connection timeout after 30 seconds'));

      const request = new NextRequest('http://localhost:3000/api/db?action=status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Connection timeout');
    });

    it('should handle invalid database credentials', async () => {
      const { getConnection } = require('../../../lib/database/connection-manager');
      getConnection.mockRejectedValue(new Error('Authentication failed for database user'));

      const request = new NextRequest('http://localhost:3000/api/db?action=status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Authentication failed');
    });

    it('should handle database not found', async () => {
      const { getConnection } = require('../../../lib/database/connection-manager');
      getConnection.mockRejectedValue(new Error('Database "nonexistent_db" does not exist'));

      const request = new NextRequest('http://localhost:3000/api/db?action=status&database=nonexistent_db');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Database "nonexistent_db" does not exist');
    });

    it('should handle connection pool exhaustion', async () => {
      const { getConnection } = require('../../../lib/database/connection-manager');
      getConnection.mockRejectedValue(new Error('Connection pool exhausted: maximum 100 connections reached'));

      const request = new NextRequest('http://localhost:3000/api/db?action=status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Connection pool exhausted');
    });

    it('should handle invalid SQL query', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Syntax error in SQL query at line 1'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=INVALID SQL');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Syntax error in SQL query');
    });

    it('should handle query execution timeout', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Query execution timeout after 60 seconds'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT * FROM large_table');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Query execution timeout');
    });

    it('should handle insufficient database permissions', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Permission denied for table "restricted_table"'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT * FROM restricted_table', {
        headers: { 'Authorization': 'Bearer limited-user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Permission denied');
    });

    it('should handle table not found', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Table "nonexistent_table" doesn\'t exist'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT * FROM nonexistent_table');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toContain('Table "nonexistent_table" doesn\'t exist');
    });

    it('should handle database disk space full', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Disk full: cannot write to database'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=INSERT INTO logs VALUES (1, \'test\')');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(507); // Insufficient Storage
      expect(data.error.message).toContain('Disk full');
    });

    it('should handle database corruption', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Database corruption detected in table "users"'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT * FROM users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Database corruption detected');
    });
  });

  describe('POST /api/db - Database Operations', () => {
    let validOperationData: any;

    beforeEach(() => {
      validOperationData = {
        operation: 'create_table',
        tableName: 'test_table',
        schema: {
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true },
            { name: 'name', type: 'VARCHAR(255)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
          ]
        }
      };
    });

    it('should handle missing operation type', async () => {
      const invalidData = { ...validOperationData };
      delete invalidData.operation;

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('operation');
    });

    it('should handle invalid table schema', async () => {
      const { validateSchema } = require('../../../lib/database/schema-manager');
      validateSchema.mockRejectedValue(new Error('Invalid column type: INVALID_TYPE'));

      const invalidSchemaData = {
        ...validOperationData,
        schema: {
          columns: [
            { name: 'id', type: 'INVALID_TYPE' }
          ]
        }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(invalidSchemaData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid column type');
    });

    it('should handle table already exists', async () => {
      const { createTable } = require('../../../lib/database/schema-manager');
      createTable.mockRejectedValue(new Error('Table "test_table" already exists'));

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(validOperationData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Table "test_table" already exists');
    });

    it('should handle transaction rollback', async () => {
      const { executeTransaction } = require('../../../lib/database/query-executor');
      executeTransaction.mockRejectedValue(new Error('Transaction rolled back due to constraint violation'));

      const transactionData = {
        operation: 'transaction',
        queries: [
          'INSERT INTO users (name) VALUES (\'John\')',
          'INSERT INTO users (name) VALUES (\'Jane\')',
          'INSERT INTO users (name) VALUES (NULL)' // This should fail
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(transactionData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Transaction rolled back');
    });

    it('should handle foreign key constraint violation', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Foreign key constraint violation: referenced record does not exist'));

      const insertData = {
        operation: 'insert',
        table: 'orders',
        data: {
          user_id: 999, // Non-existent user
          product_id: 1,
          quantity: 2
        }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(insertData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Foreign key constraint violation');
    });

    it('should handle unique constraint violation', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Unique constraint violation: duplicate key value'));

      const insertData = {
        operation: 'insert',
        table: 'users',
        data: {
          email: 'existing@example.com', // Already exists
          name: 'New User'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(insertData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Unique constraint violation');
    });

    it('should handle deadlock detection', async () => {
      const { executeTransaction } = require('../../../lib/database/query-executor');
      executeTransaction.mockRejectedValue(new Error('Deadlock detected and resolved by rolling back transaction'));

      const transactionData = {
        operation: 'transaction',
        queries: [
          'UPDATE accounts SET balance = balance - 100 WHERE id = 1',
          'UPDATE accounts SET balance = balance + 100 WHERE id = 2'
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(transactionData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Deadlock detected');
    });

    it('should handle batch operation with partial failures', async () => {
      const { executeBatch } = require('../../../lib/database/query-executor');
      executeBatch.mockRejectedValue(new Error('Batch operation failed: 2 of 5 operations succeeded'));

      const batchData = {
        operation: 'batch',
        operations: [
          { type: 'insert', table: 'users', data: { name: 'User1' } },
          { type: 'insert', table: 'users', data: { name: 'User2' } },
          { type: 'insert', table: 'users', data: { name: null } }, // Should fail
          { type: 'insert', table: 'users', data: { name: 'User4' } },
          { type: 'insert', table: 'users', data: { name: 'User5' } }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(batchData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.error.message).toContain('Batch operation failed');
    });

    it('should handle database backup creation failure', async () => {
      const { createBackup } = require('../../../lib/database/backup-manager');
      createBackup.mockRejectedValue(new Error('Backup creation failed: insufficient disk space'));

      const backupData = {
        operation: 'backup',
        type: 'full',
        destination: '/backups/db_backup_20231201.sql'
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(backupData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(507);
      expect(data.error.message).toContain('Backup creation failed');
    });

    it('should handle database restore failure', async () => {
      const { restoreBackup } = require('../../../lib/database/backup-manager');
      restoreBackup.mockRejectedValue(new Error('Restore failed: backup file is corrupted'));

      const restoreData = {
        operation: 'restore',
        backupFile: '/backups/corrupted_backup.sql',
        targetDatabase: 'test_db'
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(restoreData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Restore failed: backup file is corrupted');
    });
  });

  describe('PUT /api/db - Database Updates', () => {
    it('should handle table structure modification failure', async () => {
      const { alterTable } = require('../../../lib/database/schema-manager');
      alterTable.mockRejectedValue(new Error('Cannot drop column: column is referenced by foreign key'));

      const alterData = {
        table: 'users',
        operation: 'drop_column',
        column: 'id'
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'PUT',
        body: JSON.stringify(alterData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Cannot drop column');
    });

    it('should handle index creation failure', async () => {
      const { createIndex } = require('../../../lib/database/schema-manager');
      createIndex.mockRejectedValue(new Error('Index creation failed: column does not exist'));

      const indexData = {
        table: 'users',
        operation: 'create_index',
        indexName: 'idx_nonexistent',
        columns: ['nonexistent_column']
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'PUT',
        body: JSON.stringify(indexData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Index creation failed');
    });

    it('should handle concurrent schema modification', async () => {
      const { alterTable } = require('../../../lib/database/schema-manager');
      alterTable.mockRejectedValue(new Error('Table is being modified by another process'));

      const alterData = {
        table: 'users',
        operation: 'add_column',
        column: { name: 'new_field', type: 'VARCHAR(100)' }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'PUT',
        body: JSON.stringify(alterData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Table is being modified by another process');
    });

    it('should handle data type conversion failure', async () => {
      const { alterTable } = require('../../../lib/database/schema-manager');
      alterTable.mockRejectedValue(new Error('Cannot convert VARCHAR to INTEGER: invalid data in column'));

      const alterData = {
        table: 'users',
        operation: 'modify_column',
        column: { name: 'phone', oldType: 'VARCHAR(20)', newType: 'INTEGER' }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'PUT',
        body: JSON.stringify(alterData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Cannot convert VARCHAR to INTEGER');
    });
  });

  describe('DELETE /api/db - Database Deletion Operations', () => {
    it('should handle table not found for deletion', async () => {
      const { dropTable } = require('../../../lib/database/schema-manager');
      dropTable.mockRejectedValue(new Error('Table "nonexistent_table" does not exist'));

      const request = new NextRequest('http://localhost:3000/api/db?table=nonexistent_table', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Table "nonexistent_table" does not exist');
    });

    it('should handle table with foreign key references', async () => {
      const { dropTable } = require('../../../lib/database/schema-manager');
      dropTable.mockRejectedValue(new Error('Cannot drop table: referenced by foreign key constraints'));

      const request = new NextRequest('http://localhost:3000/api/db?table=users', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Cannot drop table: referenced by foreign key constraints');
    });

    it('should handle backup deletion failure', async () => {
      const { deleteBackup } = require('../../../lib/database/backup-manager');
      deleteBackup.mockRejectedValue(new Error('Cannot delete backup: file is in use'));

      const request = new NextRequest('http://localhost:3000/api/db?backup=backup_20231201.sql', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Cannot delete backup: file is in use');
    });

    it('should handle unauthorized table deletion', async () => {
      const { checkDatabasePermissions } = require('../../../lib/auth/session');
      checkDatabasePermissions.mockRejectedValue(new Error('Insufficient permissions to drop table'));

      const request = new NextRequest('http://localhost:3000/api/db?table=critical_table', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer limited-user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('Database Connection Management', () => {
    it('should handle connection pool reset failure', async () => {
      const { resetConnectionPool } = require('../../../lib/database/connection-manager');
      resetConnectionPool.mockRejectedValue(new Error('Failed to reset connection pool: active connections exist'));

      const request = new NextRequest('http://localhost:3000/api/db?action=reset_pool', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Failed to reset connection pool');
    });

    it('should handle invalid connection configuration', async () => {
      const { validateConnectionConfig } = require('../../../lib/database/connection-manager');
      validateConnectionConfig.mockRejectedValue(new Error('Invalid connection configuration: missing host'));

      const configData = {
        operation: 'test_connection',
        config: {
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass'
          // Missing host
        }
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid connection configuration');
    });

    it('should handle connection leak detection', async () => {
      const { getConnectionStatus } = require('../../../lib/database/connection-manager');
      getConnectionStatus.mockRejectedValue(new Error('Connection leak detected: 95 of 100 connections in use'));

      const request = new NextRequest('http://localhost:3000/api/db?action=connection_status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Connection leak detected');
    });
  });

  describe('Query Optimization and Performance', () => {
    it('should handle query optimization failure', async () => {
      const { optimizeQuery } = require('../../../lib/database/query-executor');
      optimizeQuery.mockRejectedValue(new Error('Query optimization failed: query too complex'));

      const request = new NextRequest('http://localhost:3000/api/db?action=optimize&sql=SELECT * FROM users WHERE complex_condition');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Query optimization failed');
    });

    it('should handle query plan generation failure', async () => {
      const { getQueryPlan } = require('../../../lib/database/query-executor');
      getQueryPlan.mockRejectedValue(new Error('Cannot generate query plan: invalid query structure'));

      const request = new NextRequest('http://localhost:3000/api/db?action=explain&sql=INVALID QUERY');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Cannot generate query plan');
    });

    it('should handle query cancellation failure', async () => {
      const { cancelQuery } = require('../../../lib/database/query-executor');
      cancelQuery.mockRejectedValue(new Error('Cannot cancel query: query has already completed'));

      const request = new NextRequest('http://localhost:3000/api/db?action=cancel&queryId=query-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error.message).toContain('Cannot cancel query: query has already completed');
    });
  });

  describe('Database Monitoring and Health', () => {
    it('should handle database health check failure', async () => {
      const { testConnection } = require('../../../lib/database/connection-manager');
      testConnection.mockRejectedValue(new Error('Database health check failed: high CPU usage'));

      const request = new NextRequest('http://localhost:3000/api/db?action=health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Database health check failed');
    });

    it('should handle backup validation failure', async () => {
      const { validateBackup } = require('../../../lib/database/backup-manager');
      validateBackup.mockRejectedValue(new Error('Backup validation failed: checksum mismatch'));

      const request = new NextRequest('http://localhost:3000/api/db?action=validate_backup&file=backup.sql');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Backup validation failed');
    });

    it('should handle backup scheduling conflict', async () => {
      const { scheduleBackup } = require('../../../lib/database/backup-manager');
      scheduleBackup.mockRejectedValue(new Error('Backup scheduling conflict: another backup is already scheduled'));

      const scheduleData = {
        operation: 'schedule_backup',
        schedule: '0 2 * * *', // Daily at 2 AM
        type: 'full'
      };

      const request = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        body: JSON.stringify(scheduleData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Backup scheduling conflict');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide database operation recovery suggestions', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Database temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT 1');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry database operation');
    });

    it('should track database operation performance', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT 1');
      await GET(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include database context in error responses', async () => {
      const { executeQuery } = require('../../../lib/database/query-executor');
      executeQuery.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/db?action=query&sql=SELECT * FROM users');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('executeQuery');
      expect(data.error.context.query).toContain('SELECT * FROM users');
    });
  });
});