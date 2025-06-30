/**
 * @file lib/security/review-tracker.ts
 * @description Review tracking and audit logging system for security code reviews
 * @author Security Team
 * @lastUpdate 2024-12-19
 * @security Production-level review tracking and audit logging
 */

import { Logger } from '@/lib/utils/logger';
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from './security-audit-system';
import { CodeReviewResult, SecurityViolation } from './code-review-system';
import { getErrorMessage } from '@/lib/utils/error-handler';

const logger = new Logger('ReviewTracker');

// Review status tracking
export enum ReviewStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_CHANGES = 'requires_changes',
  CANCELLED = 'cancelled',
}

// Review priority levels
export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

// Reviewer role types
export enum ReviewerRole {
  JUNIOR_DEVELOPER = 'junior_developer',
  SENIOR_DEVELOPER = 'senior_developer',
  SECURITY_SPECIALIST = 'security_specialist',
  TECH_LEAD = 'tech_lead',
  SECURITY_ARCHITECT = 'security_architect',
  AUTOMATED = 'automated',
}

// Review tracking entry
export interface ReviewTrackingEntry {
  id: string;
  reviewId: string;
  fileId: string;
  filePath: string;
  status: ReviewStatus;
  priority: ReviewPriority;
  assignedTo?: string;
  assignedRole: ReviewerRole;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  estimatedEffort: number; // in minutes
  actualEffort?: number; // in minutes
  metadata: {
    fileSize: number;
    linesOfCode: number;
    complexity: 'low' | 'medium' | 'high';
    language: string;
    framework?: string;
  };
  violations: SecurityViolation[];
  comments: ReviewComment[];
  approvals: ReviewApproval[];
  tags: string[];
}

// Review comment
export interface ReviewComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  timestamp: Date;
  content: string;
  type: 'general' | 'security' | 'performance' | 'maintainability';
  severity: 'info' | 'warning' | 'error';
  line?: number;
  column?: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

// Review approval
export interface ReviewApproval {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  timestamp: Date;
  decision: 'approved' | 'rejected' | 'requires_changes';
  confidence: 'low' | 'medium' | 'high';
  conditions?: string[];
  comments?: string;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  reviewId: string;
  action: string;
  actor: {
    id: string;
    name: string;
    role: ReviewerRole;
    ip?: string;
  };
  timestamp: Date;
  details: Record<string, any>;
  previousState?: any;
  newState?: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Review metrics
export interface ReviewMetrics {
  averageReviewTime: number;
  reviewerWorkload: Map<string, number>;
  violationTrends: Array<{
    date: string;
    total: number;
    critical: number;
    high: number;
    resolved: number;
  }>;
  performanceMetrics: {
    meanTimeToReview: number;
    meanTimeToApproval: number;
    reviewerEfficiency: Map<string, number>;
    automatedVsManualDetection: {
      automated: number;
      manual: number;
    };
  };
}

export class ReviewTracker {
  private static instance: ReviewTracker;
  private reviews: Map<string, ReviewTrackingEntry> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private metrics: ReviewMetrics = {
    averageReviewTime: 0,
    reviewerWorkload: new Map(),
    violationTrends: [],
    performanceMetrics: {
      meanTimeToReview: 0,
      meanTimeToApproval: 0,
      reviewerEfficiency: new Map(),
      automatedVsManualDetection: {
        automated: 0,
        manual: 0,
      },
    },
  };

  private constructor() {
    this.initializeMetrics();
    this.startBackgroundTasks();
  }

  public static getInstance(): ReviewTracker {
    if (!ReviewTracker.instance) {
      ReviewTracker.instance = new ReviewTracker();
    }
    return ReviewTracker.instance;
  }

  /**
   * Create new review tracking entry
   */
  async createReview(params: {
    reviewId: string;
    fileId: string;
    filePath: string;
    priority: ReviewPriority;
    violations: SecurityViolation[];
    metadata: ReviewTrackingEntry['metadata'];
    assignedTo?: string;
    assignedRole: ReviewerRole;
    dueDate?: Date;
    tags?: string[];
  }): Promise<string> {
    const entryId = this.generateEntryId();
    const now = new Date();

    const entry: ReviewTrackingEntry = {
      id: entryId,
      reviewId: params.reviewId,
      fileId: params.fileId,
      filePath: params.filePath,
      status: ReviewStatus.PENDING,
      priority: params.priority,
      assignedTo: params.assignedTo,
      assignedRole: params.assignedRole,
      createdAt: now,
      updatedAt: now,
      dueDate: params.dueDate,
      estimatedEffort: this.calculateEstimatedEffort(params.violations, params.metadata),
      metadata: params.metadata,
      violations: params.violations,
      comments: [],
      approvals: [],
      tags: params.tags || [],
    };

    this.reviews.set(entryId, entry);

    // Log audit entry
    await this.logAuditEntry({
      reviewId: params.reviewId,
      action: 'review_created',
      actor: {
        id: 'system',
        name: 'System',
        role: ReviewerRole.AUTOMATED,
      },
      details: {
        entryId,
        filePath: params.filePath,
        priority: params.priority,
        violations: params.violations.length,
        assignedTo: params.assignedTo,
      },
      riskLevel: this.calculateRiskLevel(params.violations),
    });

    // Cache high-priority reviews
    if (params.priority === ReviewPriority.CRITICAL || params.priority === ReviewPriority.EMERGENCY) {
      await enhancedCacheManager.set(
        `security:review:high-priority:${entryId}`,
        entry,
        { ttl: 86400000, tags: ['security', 'review', 'high-priority'] }
      );
    }

    // Record security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.SECURITY_SCAN,
      severity: this.mapPriorityToSeverity(params.priority),
      ip: '127.0.0.1',
      details: {
        action: 'review_tracking_created',
        entryId,
        reviewId: params.reviewId,
        filePath: params.filePath,
        violations: params.violations.length,
        priority: params.priority,
      },
      riskScore: this.calculateEntryRiskScore(params.violations),
    });

    logger.info('Review tracking entry created', {
      entryId,
      reviewId: params.reviewId,
      filePath: params.filePath,
      priority: params.priority,
      violations: params.violations.length,
    });

    return entryId;
  }

  /**
   * Update review status
   */
  async updateReviewStatus(entryId: string, status: ReviewStatus, actor: {
    id: string;
    name: string;
    role: ReviewerRole;
    ip?: string;
  }): Promise<boolean> {
    const entry = this.reviews.get(entryId);
    if (!entry) {
      return false;
    }

    const previousStatus = entry.status;
    const now = new Date();

    entry.status = status;
    entry.updatedAt = now;

    if (status === ReviewStatus.APPROVED || status === ReviewStatus.REJECTED) {
      entry.completedAt = now;
      entry.actualEffort = this.calculateActualEffort(entry.createdAt, now);
    }

    // Log audit entry
    await this.logAuditEntry({
      reviewId: entry.reviewId,
      action: 'status_updated',
      actor,
      details: {
        entryId,
        previousStatus,
        newStatus: status,
        filePath: entry.filePath,
      },
      previousState: { status: previousStatus },
      newState: { status },
      riskLevel: status === ReviewStatus.REJECTED ? 'high' : 'low',
    });

    // Update metrics
    this.updateMetrics(entry);

    logger.info('Review status updated', {
      entryId,
      previousStatus,
      newStatus: status,
      actor: actor.name,
    });

    return true;
  }

  /**
   * Add review comment
   */
  async addComment(entryId: string, comment: Omit<ReviewComment, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const entry = this.reviews.get(entryId);
    if (!entry) {
      throw new Error('Review entry not found');
    }

    const commentId = this.generateCommentId();
    const newComment: ReviewComment = {
      id: commentId,
      timestamp: new Date(),
      resolved: false,
      ...comment,
    };

    entry.comments.push(newComment);
    entry.updatedAt = new Date();

    // Log audit entry
    await this.logAuditEntry({
      reviewId: entry.reviewId,
      action: 'comment_added',
      actor: {
        id: comment.reviewerId,
        name: comment.reviewerName,
        role: comment.reviewerRole,
      },
      details: {
        entryId,
        commentId,
        commentType: comment.type,
        severity: comment.severity,
        line: comment.line,
      },
      riskLevel: comment.severity === 'error' ? 'medium' : 'low',
    });

    logger.info('Review comment added', {
      entryId,
      commentId,
      reviewer: comment.reviewerName,
      type: comment.type,
      severity: comment.severity,
    });

    return commentId;
  }

  /**
   * Add review approval
   */
  async addApproval(entryId: string, approval: Omit<ReviewApproval, 'id' | 'timestamp'>): Promise<string> {
    const entry = this.reviews.get(entryId);
    if (!entry) {
      throw new Error('Review entry not found');
    }

    const approvalId = this.generateApprovalId();
    const newApproval: ReviewApproval = {
      id: approvalId,
      timestamp: new Date(),
      ...approval,
    };

    entry.approvals.push(newApproval);
    entry.updatedAt = new Date();

    // Auto-update status based on approval
    if (approval.decision === 'approved' && this.hasRequiredApprovals(entry)) {
      await this.updateReviewStatus(entryId, ReviewStatus.APPROVED, {
        id: approval.reviewerId,
        name: approval.reviewerName,
        role: approval.reviewerRole,
      });
    } else if (approval.decision === 'rejected') {
      await this.updateReviewStatus(entryId, ReviewStatus.REJECTED, {
        id: approval.reviewerId,
        name: approval.reviewerName,
        role: approval.reviewerRole,
      });
    }

    // Log audit entry
    await this.logAuditEntry({
      reviewId: entry.reviewId,
      action: 'approval_added',
      actor: {
        id: approval.reviewerId,
        name: approval.reviewerName,
        role: approval.reviewerRole,
      },
      details: {
        entryId,
        approvalId,
        decision: approval.decision,
        confidence: approval.confidence,
        conditions: approval.conditions,
      },
      riskLevel: approval.decision === 'rejected' ? 'high' : 'low',
    });

    logger.info('Review approval added', {
      entryId,
      approvalId,
      reviewer: approval.reviewerName,
      decision: approval.decision,
      confidence: approval.confidence,
    });

    return approvalId;
  }

  /**
   * Get review by ID
   */
  getReview(entryId: string): ReviewTrackingEntry | null {
    return this.reviews.get(entryId) || null;
  }

  /**
   * Get reviews by status
   */
  getReviewsByStatus(status: ReviewStatus): ReviewTrackingEntry[] {
    return Array.from(this.reviews.values()).filter(r => r.status === status);
  }

  /**
   * Get reviews by assignee
   */
  getReviewsByAssignee(assigneeId: string): ReviewTrackingEntry[] {
    return Array.from(this.reviews.values()).filter(r => r.assignedTo === assigneeId);
  }

  /**
   * Get overdue reviews
   */
  getOverdueReviews(): ReviewTrackingEntry[] {
    const now = new Date();
    return Array.from(this.reviews.values()).filter(r => 
      r.dueDate && 
      r.dueDate < now && 
      r.status !== ReviewStatus.APPROVED && 
      r.status !== ReviewStatus.REJECTED
    );
  }

  /**
   * Get review metrics
   */
  getMetrics(): ReviewMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit log
   */
  getAuditLog(filters: {
    reviewId?: string;
    actor?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
  } = {}): AuditLogEntry[] {
    let log = [...this.auditLog];

    if (filters.reviewId) {
      log = log.filter(entry => entry.reviewId === filters.reviewId);
    }

    if (filters.actor) {
      log = log.filter(entry => entry.actor.id === filters.actor);
    }

    if (filters.action) {
      log = log.filter(entry => entry.action === filters.action);
    }

    if (filters.startDate) {
      log = log.filter(entry => entry.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      log = log.filter(entry => entry.timestamp <= filters.endDate!);
    }

    if (filters.riskLevel) {
      log = log.filter(entry => entry.riskLevel === filters.riskLevel);
    }

    return log.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    summary: {
      totalReviews: number;
      completedReviews: number;
      averageReviewTime: number;
      overdueReviews: number;
      highRiskReviews: number;
    };
    complianceMetrics: {
      reviewCoverage: number;
      approvalRate: number;
      avgTimeToApproval: number;
      reviewerParticipation: number;
    };
    violations: {
      total: number;
      resolved: number;
      critical: number;
      high: number;
      byCategory: Record<string, number>;
    };
    recommendations: string[];
  }> {
    const reviews = Array.from(this.reviews.values())
      .filter(r => r.createdAt >= timeRange.start && r.createdAt <= timeRange.end);

    const completedReviews = reviews.filter(r => 
      r.status === ReviewStatus.APPROVED || r.status === ReviewStatus.REJECTED
    );

    const totalViolations = reviews.reduce((sum, r) => sum + r.violations.length, 0);
    const resolvedViolations = reviews.reduce((sum, r) => 
      sum + r.violations.filter(v => r.comments.some(c => c.resolved && c.line === v.line)).length, 0
    );

    const violationsByCategory: Record<string, number> = {};
    reviews.forEach(r => {
      r.violations.forEach(v => {
        violationsByCategory[v.category] = (violationsByCategory[v.category] || 0) + 1;
      });
    });

    const summary = {
      totalReviews: reviews.length,
      completedReviews: completedReviews.length,
      averageReviewTime: this.calculateAverageReviewTime(completedReviews),
      overdueReviews: this.getOverdueReviews().length,
      highRiskReviews: reviews.filter(r => 
        r.violations.some(v => v.severity === 'critical' || v.severity === 'high')
      ).length,
    };

    const complianceMetrics = {
      reviewCoverage: reviews.length > 0 ? (completedReviews.length / reviews.length) * 100 : 0,
      approvalRate: completedReviews.length > 0 ? 
        (completedReviews.filter(r => r.status === ReviewStatus.APPROVED).length / completedReviews.length) * 100 : 0,
      avgTimeToApproval: this.calculateAverageApprovalTime(completedReviews),
      reviewerParticipation: this.calculateReviewerParticipation(reviews),
    };

    const violations = {
      total: totalViolations,
      resolved: resolvedViolations,
      critical: reviews.reduce((sum, r) => sum + r.violations.filter(v => v.severity === 'critical').length, 0),
      high: reviews.reduce((sum, r) => sum + r.violations.filter(v => v.severity === 'high').length, 0),
      byCategory: violationsByCategory,
    };

    const recommendations = this.generateComplianceRecommendations(summary, complianceMetrics, violations);

    return {
      summary,
      complianceMetrics,
      violations,
      recommendations,
    };
  }

  /**
   * Private: Initialize metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      averageReviewTime: 0,
      reviewerWorkload: new Map(),
      violationTrends: [],
      performanceMetrics: {
        meanTimeToReview: 0,
        meanTimeToApproval: 0,
        reviewerEfficiency: new Map(),
        automatedVsManualDetection: {
          automated: 0,
          manual: 0,
        },
      },
    };
  }

  /**
   * Private: Start background tasks
   */
  private startBackgroundTasks(): void {
    // Update metrics every hour
    setInterval(() => {
      this.recalculateMetrics();
    }, 3600000);

    // Check for overdue reviews every 30 minutes
    setInterval(() => {
      this.checkOverdueReviews();
    }, 1800000);

    // Clean up old audit logs daily
    setInterval(() => {
      this.cleanupAuditLog();
    }, 86400000);

    logger.info('Review tracker background tasks started');
  }

  /**
   * Private: Log audit entry
   */
  private async logAuditEntry(params: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      ...params,
    };

    this.auditLog.push(entry);

    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    // Cache critical audit entries
    if (entry.riskLevel === 'critical') {
      await enhancedCacheManager.set(
        `security:audit:critical:${entry.id}`,
        entry,
        { ttl: 604800000, tags: ['security', 'audit', 'critical'] }
      );
    }
  }

  /**
   * Private: Utility methods
   */
  private generateEntryId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateApprovalId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateEstimatedEffort(violations: SecurityViolation[], metadata: ReviewTrackingEntry['metadata']): number {
    let effort = 30; // Base 30 minutes

    // Add time based on violations
    effort += violations.length * 5; // 5 minutes per violation
    effort += violations.filter(v => v.severity === 'critical').length * 15; // Extra time for critical
    effort += violations.filter(v => v.severity === 'high').length * 10; // Extra time for high

    // Add time based on file complexity
    if (metadata.complexity === 'high') {effort *= 1.5;}
    else if (metadata.complexity === 'medium') {effort *= 1.2;}

    // Add time based on file size
    if (metadata.linesOfCode > 1000) {effort *= 1.3;}
    else if (metadata.linesOfCode > 500) {effort *= 1.1;}

    return Math.round(effort);
  }

  private calculateActualEffort(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // Convert to minutes
  }

  private calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) {return 'critical';}
    if (highCount > 2) {return 'high';}
    if (highCount > 0 || violations.length > 5) {return 'medium';}
    return 'low';
  }

  private mapPriorityToSeverity(priority: ReviewPriority): SecuritySeverity {
    switch (priority) {
      case ReviewPriority.EMERGENCY:
      case ReviewPriority.CRITICAL:
        return SecuritySeverity.CRITICAL;
      case ReviewPriority.HIGH:
        return SecuritySeverity.HIGH;
      case ReviewPriority.MEDIUM:
        return SecuritySeverity.MEDIUM;
      default:
        return SecuritySeverity.LOW;
    }
  }

  private calculateEntryRiskScore(violations: SecurityViolation[]): number {
    let score = 0;
    violations.forEach(v => {
      switch (v.severity) {
        case 'critical': score += 10; break;
        case 'high': score += 6; break;
        case 'medium': score += 3; break;
        case 'low': score += 1; break;
        default: score += 0.5; break;
      }
    });
    return Math.min(score / violations.length || 0, 10);
  }

  private hasRequiredApprovals(entry: ReviewTrackingEntry): boolean {
    const approvals = entry.approvals.filter(a => a.decision === 'approved');
    const highRiskViolations = entry.violations.filter(v => v.severity === 'critical' || v.severity === 'high');

    // High-risk changes need security specialist approval
    if (highRiskViolations.length > 0) {
      return approvals.some(a => 
        a.reviewerRole === ReviewerRole.SECURITY_SPECIALIST || 
        a.reviewerRole === ReviewerRole.SECURITY_ARCHITECT
      );
    }

    // Regular changes need at least one senior developer approval
    return approvals.some(a => 
      a.reviewerRole === ReviewerRole.SENIOR_DEVELOPER ||
      a.reviewerRole === ReviewerRole.TECH_LEAD ||
      a.reviewerRole === ReviewerRole.SECURITY_SPECIALIST ||
      a.reviewerRole === ReviewerRole.SECURITY_ARCHITECT
    );
  }

  private updateMetrics(entry: ReviewTrackingEntry): void {
    // Update metrics based on completed review
    if (entry.completedAt && entry.actualEffort) {
      // Update average review time
      const allCompletedReviews = Array.from(this.reviews.values())
        .filter(r => r.completedAt && r.actualEffort);
      
      const totalTime = allCompletedReviews.reduce((sum, r) => sum + (r.actualEffort || 0), 0);
      this.metrics.averageReviewTime = totalTime / allCompletedReviews.length;

      // Update reviewer workload
      if (entry.assignedTo) {
        const currentWorkload = this.metrics.reviewerWorkload.get(entry.assignedTo) || 0;
        this.metrics.reviewerWorkload.set(entry.assignedTo, currentWorkload + entry.actualEffort);
      }
    }
  }

  private recalculateMetrics(): void {
    // Recalculate all metrics
    logger.info('Recalculating review metrics');
  }

  private async checkOverdueReviews(): Promise<void> {
    const overdueReviews = this.getOverdueReviews();
    
    for (const review of overdueReviews) {
      await securityAuditSystem.recordEvent({
        type: SecurityEventType.ADMIN_ACTION,
        severity: SecuritySeverity.MEDIUM,
        ip: '127.0.0.1',
        details: {
          action: 'review_overdue',
          reviewId: review.reviewId,
          entryId: review.id,
          filePath: review.filePath,
          dueDate: review.dueDate,
          assignedTo: review.assignedTo,
        },
        riskScore: 5,
      });
    }

    if (overdueReviews.length > 0) {
      logger.warn('Overdue reviews detected', {
        count: overdueReviews.length,
        reviews: overdueReviews.map(r => ({ id: r.id, filePath: r.filePath, dueDate: r.dueDate })),
      });
    }
  }

  private cleanupAuditLog(): void {
    const cutoffTime = Date.now() - 90 * 24 * 3600000; // 90 days ago
    const initialLength = this.auditLog.length;
    
    this.auditLog = this.auditLog.filter(entry => entry.timestamp.getTime() >= cutoffTime);
    
    const removedCount = initialLength - this.auditLog.length;
    if (removedCount > 0) {
      logger.info('Audit log cleaned up', {
        removedEntries: removedCount,
        remainingEntries: this.auditLog.length,
      });
    }
  }

  private calculateAverageReviewTime(reviews: ReviewTrackingEntry[]): number {
    const reviewsWithTime = reviews.filter(r => r.actualEffort);
    if (reviewsWithTime.length === 0) {return 0;}
    
    const totalTime = reviewsWithTime.reduce((sum, r) => sum + (r.actualEffort || 0), 0);
    return totalTime / reviewsWithTime.length;
  }

  private calculateAverageApprovalTime(reviews: ReviewTrackingEntry[]): number {
    const approvedReviews = reviews.filter(r => r.status === ReviewStatus.APPROVED && r.completedAt);
    if (approvedReviews.length === 0) {return 0;}
    
    const totalTime = approvedReviews.reduce((sum, r) => {
      if (r.completedAt && r.createdAt) {
        return sum + (r.completedAt.getTime() - r.createdAt.getTime()) / (1000 * 60); // Convert to minutes
      }
      return sum;
    }, 0);
    
    return totalTime / approvedReviews.length;
  }

  private calculateReviewerParticipation(reviews: ReviewTrackingEntry[]): number {
    const totalReviews = reviews.length;
    const reviewsWithComments = reviews.filter(r => r.comments.length > 0).length;
    
    return totalReviews > 0 ? (reviewsWithComments / totalReviews) * 100 : 0;
  }

  private generateComplianceRecommendations(
    summary: any, 
    complianceMetrics: any, 
    violations: any
  ): string[] {
    const recommendations: string[] = [];

    if (complianceMetrics.reviewCoverage < 90) {
      recommendations.push('Increase review coverage to meet compliance standards (target: 90%+)');
    }

    if (complianceMetrics.approvalRate < 80) {
      recommendations.push('Review approval process - low approval rate may indicate quality issues');
    }

    if (summary.overdueReviews > 0) {
      recommendations.push('Address overdue reviews to maintain compliance timelines');
    }

    if (violations.resolved / violations.total < 0.8) {
      recommendations.push('Increase violation resolution rate (target: 80%+)');
    }

    if (violations.critical > 0) {
      recommendations.push('Prioritize resolution of critical security violations');
    }

    return recommendations;
  }
}

// Export singleton instance
export const reviewTracker = ReviewTracker.getInstance();

// Export convenience methods
export const createReview = reviewTracker.createReview.bind(reviewTracker);
export const updateReviewStatus = reviewTracker.updateReviewStatus.bind(reviewTracker);
export const addComment = reviewTracker.addComment.bind(reviewTracker);
export const addApproval = reviewTracker.addApproval.bind(reviewTracker);
export const getReviewMetrics = reviewTracker.getMetrics.bind(reviewTracker);