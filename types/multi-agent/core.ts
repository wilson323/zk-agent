// 多智能体系统核心类型定义
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: Capability[];
  specialization: AgentSpecialization;
  performance: PerformanceMetrics;
  learningModel: LearningModel;
  status: AgentStatus;
  workload: number;
  experience: Experience[];
  config: AgentConfig;
}

export enum AgentType {
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
}

export enum AgentSpecialization {
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  LEARNING = 'learning',
  OFFLINE = 'offline',
  ERROR = 'error',
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  level: number; // 1-10
  category: CapabilityCategory;
}

export enum CapabilityCategory {
  INFORMATION_RETRIEVAL = 'information_retrieval',
  DATA_ANALYSIS = 'data_analysis',
  REASONING = 'reasoning',
  COMMUNICATION = 'communication',
  LEARNING = 'learning',
  COLLABORATION = 'collaboration',
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageResponseTime: number;
  throughput: number;
  resourceUtilization: number;
  completeness: number;
  consistency: number;
  relevance: number;
  learningRate: number;
  adaptability: number;
  knowledgeRetention: number;
  confidence: number;
}

export interface LearningModel {
  id: string;
  type: LearningType;
  algorithm: string;
  parameters: Record<string, any>;
  lastUpdate: Date;
  version: string;
  performance: PerformanceMetrics;
}

export enum LearningType {
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
  REINFORCEMENT = 'reinforcement',
  TRANSFER = 'transfer',
  META = 'meta',
}

export interface Experience {
  id: string;
  taskId: string;
  type: ExperienceType;
  context: Record<string, any>;
  actions: Action[];
  outcomes: Outcome[];
  feedback: Feedback[];
  timestamp: Date;
}

export enum ExperienceType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL_SUCCESS = 'partial_success',
  LEARNING = 'learning',
}

export interface Action {
  id: string;
  type: ActionType;
  description: string;
  parameters: Record<string, any>;
  timestamp: Date;
  result: ActionResult;
}

export enum ActionType {
  SEARCH = 'search',
  ANALYZE = 'analyze',
  SYNTHESIZE = 'synthesize',
  COMMUNICATE = 'communicate',
  LEARN = 'learn',
  COLLABORATE = 'collaborate',
}

export interface ActionResult {
  success: boolean;
  data: any;
  error?: string;
  duration: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface Outcome {
  id: string;
  type: OutcomeType;
  description: string;
  impact: number;
  timestamp: Date;
}

export enum OutcomeType {
  TASK_COMPLETED = 'task_completed',
  INSIGHT_GENERATED = 'insight_generated',
  KNOWLEDGE_ACQUIRED = 'knowledge_acquired',
  COLLABORATION_SUCCESSFUL = 'collaboration_successful',
  ERROR_OCCURRED = 'error_occurred',
}

export interface Feedback {
  id: string;
  source: FeedbackSource;
  type: FeedbackType;
  rating: number;
  comment: string;
  timestamp: Date;
}

export enum FeedbackSource {
  USER = 'user',
  SYSTEM = 'system',
  PEER_AGENT = 'peer_agent',
  SUPERVISOR = 'supervisor',
}

export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  CONSTRUCTIVE = 'constructive',
}

export interface AgentConfig {
  learningEnabled: boolean;
  collaborationEnabled: boolean;
  autoUpdate: boolean;
  resourceLimits: ResourceLimits;
  behaviorSettings: BehaviorSettings;
}

export interface ResourceLimits {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxNetworkBandwidth: number;
  maxStorageUsage: number;
  maxConcurrentTasks: number;
}

export interface BehaviorSettings {
  aggressiveness: number; // 1-10
  collaborativeness: number; // 1-10
  curiosity: number; // 1-10
  riskTolerance: number; // 1-10
  adaptability: number; // 1-10
}

// 研究任务相关类型
export interface ResearchTask {
  id: string;
  title: string;
  description: string;
  complexity: ComplexityLevel;
  domain: Domain[];
  requirements: Requirement[];
  deadline: Date;
  status: TaskStatus;
  priority: TaskPriority;
  creator: User;
  assignedAgents: Agent[];
  subtasks: SubTask[];
  results: TaskResult[];
  learningData: LearningData;
  metadata: TaskMetadata;
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  HIGHLY_COMPLEX = 'highly_complex',
}

export enum TaskStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  DECOMPOSING = 'decomposing',
  EXECUTING = 'executing',
  INTEGRATING = 'integrating',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  parentDomain?: string;
  subDomains: string[];
  keywords: string[];
}

export interface Requirement {
  id: string;
  type: RequirementType;
  description: string;
  priority: RequirementPriority;
  capability: string;
  parameters: Record<string, any>;
}

export enum RequirementType {
  FUNCTIONAL = 'functional',
  NON_FUNCTIONAL = 'non_functional',
  QUALITY = 'quality',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

export enum RequirementPriority {
  MUST_HAVE = 'must_have',
  SHOULD_HAVE = 'should_have',
  COULD_HAVE = 'could_have',
  WONT_HAVE = 'wont_have',
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  assignedAgent: Agent;
  status: TaskStatus;
  dependencies: string[];
  estimatedDuration: number;
  actualDuration?: number;
  result?: TaskResult;
}

export interface TaskResult {
  id: string;
  taskId: string;
  type: ResultType;
  content: any;
  confidence: number;
  sources: Source[];
  timestamp: Date;
  agentId: string;
  metadata: ResultMetadata;
}

export enum ResultType {
  ANALYSIS = 'analysis',
  SYNTHESIS = 'synthesis',
  RECOMMENDATION = 'recommendation',
  PREDICTION = 'prediction',
  INSIGHT = 'insight',
  REPORT = 'report',
}

export interface Source {
  id: string;
  type: SourceType;
  url?: string;
  title: string;
  author?: string;
  publishDate?: Date;
  credibility: number;
  relevance: number;
}

export enum SourceType {
  ACADEMIC_PAPER = 'academic_paper',
  WEB_ARTICLE = 'web_article',
  DATABASE = 'database',
  EXPERT_OPINION = 'expert_opinion',
  INTERNAL_DOCUMENT = 'internal_document',
  API_RESPONSE = 'api_response',
}

export interface ResultMetadata {
  processingTime: number;
  resourceUsage: ResourceUsage;
  qualityMetrics: QualityMetrics;
  validationStatus: ValidationStatus;
}

export interface QualityMetrics {
  accuracy: number;
  completeness: number;
  consistency: number;
  relevance: number;
  timeliness: number;
  credibility: number;
}

export enum ValidationStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REJECTED = 'rejected',
  NEEDS_REVIEW = 'needs_review',
}

export interface LearningData {
  experienceRecords: Experience[];
  performanceHistory: PerformanceHistory[];
  knowledgeUpdates: KnowledgeUpdate[];
  feedbackHistory: FeedbackHistory[];
}

export interface PerformanceHistory {
  timestamp: Date;
  metrics: PerformanceMetrics;
  taskId: string;
  agentId: string;
  context: Record<string, any>;
}

export interface KnowledgeUpdate {
  id: string;
  type: KnowledgeUpdateType;
  content: Knowledge;
  timestamp: Date;
  agentId: string;
  confidence: number;
}

export enum KnowledgeUpdateType {
  NEW_KNOWLEDGE = 'new_knowledge',
  UPDATED_KNOWLEDGE = 'updated_knowledge',
  DEPRECATED_KNOWLEDGE = 'deprecated_knowledge',
  CONFLICTING_KNOWLEDGE = 'conflicting_knowledge',
}

export interface Knowledge {
  id: string;
  content: string;
  type: KnowledgeType;
  domain: Domain;
  source: Source;
  confidence: number;
  timestamp: Date;
  relationships: Relationship[];
  access: AccessControl;
  version: number;
}

export enum KnowledgeType {
  FACT = 'fact',
  RULE = 'rule',
  PATTERN = 'pattern',
  INSIGHT = 'insight',
  HYPOTHESIS = 'hypothesis',
  PROCEDURE = 'procedure',
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  source: string;
  target: string;
  strength: number;
  description: string;
}

export enum RelationshipType {
  CAUSES = 'causes',
  IMPLIES = 'implies',
  SIMILAR_TO = 'similar_to',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
  CONTRADICTS = 'contradicts',
}

export interface AccessControl {
  owner: string;
  permissions: Permission[];
  visibility: Visibility;
  restrictions: Restriction[];
}

export interface Permission {
  userId: string;
  actions: PermissionAction[];
  conditions: PermissionCondition[];
}

export enum PermissionAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  EXECUTE = 'execute',
}

export interface PermissionCondition {
  type: ConditionType;
  value: any;
  operator: ConditionOperator;
}

export enum ConditionType {
  TIME = 'time',
  LOCATION = 'location',
  ROLE = 'role',
  CLEARANCE = 'clearance',
  CONTEXT = 'context',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in',
}

export enum Visibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
}

export interface Restriction {
  type: RestrictionType;
  value: any;
  description: string;
}

export enum RestrictionType {
  GEOGRAPHIC = 'geographic',
  TEMPORAL = 'temporal',
  USAGE = 'usage',
  EXPORT = 'export',
  MODIFICATION = 'modification',
}

export interface FeedbackHistory {
  feedbackId: string;
  timestamp: Date;
  source: FeedbackSource;
  impact: FeedbackImpact;
  processed: boolean;
}

export interface FeedbackImpact {
  performanceChange: number;
  behaviorChange: Record<string, any>;
  knowledgeUpdate: boolean;
  configurationChange: boolean;
}

export interface TaskMetadata {
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration: number;
  actualDuration?: number;
  resourceRequirements: ResourceRequirements;
  qualityRequirements: QualityRequirements;
  tags: string[];
  category: TaskCategory;
}

export interface ResourceRequirements {
  minCpuCores: number;
  minMemoryMb: number;
  minNetworkMbps: number;
  minStorageMb: number;
  preferredAgentType: AgentType;
  requiredCapabilities: string[];
}

export interface QualityRequirements {
  minAccuracy: number;
  minCompleteness: number;
  minRelevance: number;
  maxResponseTime: number;
  confidenceThreshold: number;
}

export enum TaskCategory {
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  SYNTHESIS = 'synthesis',
  PREDICTION = 'prediction',
  OPTIMIZATION = 'optimization',
  CREATIVE = 'creative',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  preferences: UserPreferences;
  profile: UserProfile;
}

export enum UserRole {
  ADMIN = 'admin',
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationPreferences;
  workflowPreferences: WorkflowPreferences;
  displayPreferences: DisplayPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  push: boolean;
  taskCompletion: boolean;
  systemAlerts: boolean;
  learningUpdates: boolean;
}

export interface WorkflowPreferences {
  autoAssignTasks: boolean;
  preferredAgentTypes: AgentType[];
  defaultTaskPriority: TaskPriority;
  collaborationMode: CollaborationMode;
}

export enum CollaborationMode {
  MANUAL = 'manual',
  SEMI_AUTOMATIC = 'semi_automatic',
  FULLY_AUTOMATIC = 'fully_automatic',
}

export interface DisplayPreferences {
  resultsPerPage: number;
  defaultView: ViewType;
  showAdvancedOptions: boolean;
  enableAnimations: boolean;
}

export enum ViewType {
  LIST = 'list',
  GRID = 'grid',
  TIMELINE = 'timeline',
  NETWORK = 'network',
}

export interface UserProfile {
  expertise: string[];
  interests: string[];
  experience: ExperienceLevel;
  departments: string[];
  location: string;
  timezone: string;
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// 系统配置和监控相关类型
export interface SystemConfig {
  multiAgent: MultiAgentConfig;
  learning: LearningConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  integration: IntegrationConfig;
}

export interface MultiAgentConfig {
  maxAgents: number;
  coordinationStrategy: CoordinationStrategy;
  conflictResolution: ConflictResolutionStrategy;
  loadBalancing: LoadBalancingStrategy;
  failover: FailoverStrategy;
}

export enum CoordinationStrategy {
  CENTRALIZED = 'centralized',
  DISTRIBUTED = 'distributed',
  HYBRID = 'hybrid',
}

export enum ConflictResolutionStrategy {
  VOTING = 'voting',
  PRIORITY_BASED = 'priority_based',
  CONSENSUS = 'consensus',
  EXPERT_DECISION = 'expert_decision',
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  CAPABILITY_BASED = 'capability_based',
  PERFORMANCE_BASED = 'performance_based',
}

export enum FailoverStrategy {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  MANUAL = 'manual',
}

export interface LearningConfig {
  enabled: boolean;
  algorithms: LearningAlgorithm[];
  updateFrequency: UpdateFrequency;
  dataRetention: DataRetentionPolicy;
  qualityThresholds: QualityThresholds;
}

export interface LearningAlgorithm {
  name: string;
  type: LearningType;
  parameters: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export enum UpdateFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface DataRetentionPolicy {
  experienceRetentionDays: number;
  performanceHistoryDays: number;
  knowledgeRetentionDays: number;
  feedbackRetentionDays: number;
  automaticCleanup: boolean;
}

export interface QualityThresholds {
  minAccuracy: number;
  minPrecision: number;
  minRecall: number;
  minF1Score: number;
  maxResponseTime: number;
  minThroughput: number;
}

export interface SecurityConfig {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  encryption: EncryptionConfig;
  auditing: AuditingConfig;
  compliance: ComplianceConfig;
}

export interface AuthenticationConfig {
  methods: AuthenticationMethod[];
  sessionTimeout: number;
  maxFailedAttempts: number;
  lockoutDuration: number;
  passwordPolicy: PasswordPolicy;
}

export enum AuthenticationMethod {
  PASSWORD = 'password',
  TWO_FACTOR = 'two_factor',
  BIOMETRIC = 'biometric',
  SSO = 'sso',
  OAUTH = 'oauth',
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

export interface AuthorizationConfig {
  model: AuthorizationModel;
  roles: RoleDefinition[];
  policies: PolicyDefinition[];
  inheritance: boolean;
}

export enum AuthorizationModel {
  RBAC = 'rbac',
  ABAC = 'abac',
  HYBRID = 'hybrid',
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  parent?: string;
}

export interface PolicyDefinition {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  effect: PolicyEffect;
}

export interface PolicyRule {
  subject: string;
  action: string;
  resource: string;
  condition?: string;
}

export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

export interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  keyRotationDays: number;
  dataAtRest: boolean;
  dataInTransit: boolean;
  endToEnd: boolean;
}

export enum EncryptionAlgorithm {
  AES = 'aes',
  RSA = 'rsa',
  ECDSA = 'ecdsa',
}

export interface AuditingConfig {
  enabled: boolean;
  logLevel: LogLevel;
  retention: AuditRetentionPolicy;
  realTimeMonitoring: boolean;
  alerting: AlertingConfig;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export interface AuditRetentionPolicy {
  days: number;
  compression: boolean;
  archiving: boolean;
  automaticDeletion: boolean;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  thresholds: AlertThreshold[];
  rules: AlertRule[];
}

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
}

export interface AlertThreshold {
  metric: string;
  operator: ThresholdOperator;
  value: number;
  severity: AlertSeverity;
}

export enum ThresholdOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  action: AlertAction;
  enabled: boolean;
}

export enum AlertAction {
  NOTIFY = 'notify',
  ESCALATE = 'escalate',
  AUTO_RESOLVE = 'auto_resolve',
  SHUTDOWN = 'shutdown',
}

export interface ComplianceConfig {
  standards: ComplianceStandard[];
  reporting: ComplianceReporting;
  monitoring: ComplianceMonitoring;
}

export enum ComplianceStandard {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOX = 'sox',
  ISO27001 = 'iso27001',
  CCPA = 'ccpa',
}

export interface ComplianceReporting {
  frequency: ReportingFrequency;
  formats: ReportFormat[];
  recipients: string[];
  automaticGeneration: boolean;
}

export enum ReportingFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  CSV = 'csv',
  JSON = 'json',
}

export interface ComplianceMonitoring {
  enabled: boolean;
  realTime: boolean;
  alerting: boolean;
  remediation: boolean;
}

export interface PerformanceConfig {
  monitoring: PerformanceMonitoring;
  optimization: PerformanceOptimization;
  scaling: ScalingConfig;
  caching: CachingConfig;
}

export interface PerformanceMonitoring {
  enabled: boolean;
  metrics: PerformanceMetric[];
  sampling: SamplingConfig;
  alerting: PerformanceAlerting;
}

export interface PerformanceMetric {
  name: string;
  type: MetricType;
  unit: string;
  threshold: number;
  aggregation: AggregationType;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

export interface SamplingConfig {
  rate: number;
  strategy: SamplingStrategy;
  adaptive: boolean;
}

export enum SamplingStrategy {
  RANDOM = 'random',
  SYSTEMATIC = 'systematic',
  STRATIFIED = 'stratified',
}

export interface PerformanceAlerting {
  enabled: boolean;
  thresholds: PerformanceThreshold[];
  escalation: EscalationPolicy;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  duration: number;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  timeout: number;
  maxAttempts: number;
}

export interface EscalationLevel {
  level: number;
  recipients: string[];
  actions: EscalationAction[];
  delay: number;
}

export enum EscalationAction {
  NOTIFY = 'notify',
  PAGE = 'page',
  CALL = 'call',
  AUTO_SCALE = 'auto_scale',
  RESTART = 'restart',
}

export interface PerformanceOptimization {
  enabled: boolean;
  strategies: OptimizationStrategy[];
  autoTuning: AutoTuningConfig;
}

export enum OptimizationStrategy {
  CACHING = 'caching',
  COMPRESSION = 'compression',
  PARALLELIZATION = 'parallelization',
  LOAD_BALANCING = 'load_balancing',
  RESOURCE_POOLING = 'resource_pooling',
}

export interface AutoTuningConfig {
  enabled: boolean;
  algorithm: TuningAlgorithm;
  parameters: TuningParameter[];
  feedback: TuningFeedback;
}

export enum TuningAlgorithm {
  GENETIC = 'genetic',
  SIMULATED_ANNEALING = 'simulated_annealing',
  GRADIENT_DESCENT = 'gradient_descent',
  BAYESIAN_OPTIMIZATION = 'bayesian_optimization',
}

export interface TuningParameter {
  name: string;
  type: ParameterType;
  range: ParameterRange;
  current: any;
  optimal?: any;
}

export enum ParameterType {
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  STRING = 'string',
  ENUM = 'enum',
}

export interface ParameterRange {
  min?: any;
  max?: any;
  values?: any[];
  step?: any;
}

export interface TuningFeedback {
  metric: string;
  target: FeedbackTarget;
  weight: number;
}

export enum FeedbackTarget {
  MAXIMIZE = 'maximize',
  MINIMIZE = 'minimize',
  TARGET = 'target',
}

export interface ScalingConfig {
  enabled: boolean;
  mode: ScalingMode;
  triggers: ScalingTrigger[];
  policies: ScalingPolicy[];
}

export enum ScalingMode {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  PREDICTIVE = 'predictive',
}

export interface ScalingTrigger {
  metric: string;
  threshold: number;
  operator: ThresholdOperator;
  duration: number;
  action: ScalingAction;
}

export enum ScalingAction {
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  SCALE_OUT = 'scale_out',
  SCALE_IN = 'scale_in',
}

export interface ScalingPolicy {
  id: string;
  name: string;
  resource: string;
  minInstances: number;
  maxInstances: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  scaleUpStep: number;
  scaleDownStep: number;
}

export interface CachingConfig {
  enabled: boolean;
  layers: CacheLayer[];
  policies: CachePolicy[];
  invalidation: CacheInvalidation;
}

export interface CacheLayer {
  id: string;
  name: string;
  type: CacheType;
  size: number;
  ttl: number;
  eviction: EvictionPolicy;
}

export enum CacheType {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
  DISK = 'disk',
}

export enum EvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  RANDOM = 'random',
}

export interface CachePolicy {
  id: string;
  name: string;
  pattern: string;
  ttl: number;
  conditions: CacheCondition[];
}

export interface CacheCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: any;
}

export interface CacheInvalidation {
  strategy: InvalidationStrategy;
  triggers: InvalidationTrigger[];
  propagation: InvalidationPropagation;
}

export enum InvalidationStrategy {
  MANUAL = 'manual',
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  DEPENDENCY_BASED = 'dependency_based',
}

export enum InvalidationTrigger {
  DATA_CHANGE = 'data_change',
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  SYSTEM_EVENT = 'system_event',
}

export enum InvalidationPropagation {
  IMMEDIATE = 'immediate',
  EVENTUAL = 'eventual',
  BATCH = 'batch',
}

export interface IntegrationConfig {
  apis: ApiIntegration[];
  databases: DatabaseIntegration[];
  messagingQueues: MessagingIntegration[];
  externalServices: ExternalServiceIntegration[];
}

export interface ApiIntegration {
  id: string;
  name: string;
  type: ApiType;
  endpoint: string;
  authentication: ApiAuthentication;
  rateLimit: RateLimit;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export enum ApiType {
  REST = 'rest',
  GRAPHQL = 'graphql',
  GRPC = 'grpc',
  WEBSOCKET = 'websocket',
}

export interface ApiAuthentication {
  type: AuthenticationType;
  credentials: Record<string, any>;
  tokenRefresh: TokenRefreshConfig;
}

export enum AuthenticationType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  OAUTH = 'oauth',
  API_KEY = 'api_key',
}

export interface TokenRefreshConfig {
  enabled: boolean;
  threshold: number;
  retryAttempts: number;
  backoffStrategy: BackoffStrategy;
}

export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  RANDOM = 'random',
}

export interface RateLimit {
  enabled: boolean;
  requests: number;
  window: number;
  burst: number;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  retryConditions: RetryCondition[];
}

export interface RetryCondition {
  type: RetryConditionType;
  codes: number[];
  exceptions: string[];
}

export enum RetryConditionType {
  HTTP_STATUS = 'http_status',
  EXCEPTION = 'exception',
  TIMEOUT = 'timeout',
  NETWORK_ERROR = 'network_error',
}

export interface DatabaseIntegration {
  id: string;
  name: string;
  type: DatabaseType;
  connection: DatabaseConnection;
  pooling: ConnectionPooling;
  monitoring: DatabaseMonitoring;
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  REDIS = 'redis',
  ELASTICSEARCH = 'elasticsearch',
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  timeout: number;
}

export interface ConnectionPooling {
  enabled: boolean;
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
  maxLifetime: number;
}

export interface DatabaseMonitoring {
  enabled: boolean;
  metrics: DatabaseMetric[];
  slowQueryThreshold: number;
  connectionHealthCheck: boolean;
}

export interface DatabaseMetric {
  name: string;
  query: string;
  interval: number;
  alertThreshold: number;
}

export interface MessagingIntegration {
  id: string;
  name: string;
  type: MessagingType;
  broker: MessageBroker;
  topics: MessageTopic[];
  consumers: MessageConsumer[];
}

export enum MessagingType {
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',
  REDIS_PUBSUB = 'redis_pubsub',
  MQTT = 'mqtt',
}

export interface MessageBroker {
  hosts: string[];
  port: number;
  authentication: BrokerAuthentication;
  ssl: boolean;
  timeout: number;
}

export interface BrokerAuthentication {
  type: BrokerAuthType;
  credentials: Record<string, any>;
}

export enum BrokerAuthType {
  NONE = 'none',
  SASL = 'sasl',
  SSL = 'ssl',
  OAUTH = 'oauth',
}

export interface MessageTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs: number;
  compressionType: CompressionType;
}

export enum CompressionType {
  NONE = 'none',
  GZIP = 'gzip',
  SNAPPY = 'snappy',
  LZ4 = 'lz4',
}

export interface MessageConsumer {
  id: string;
  topic: string;
  groupId: string;
  autoCommit: boolean;
  batchSize: number;
  processingTimeout: number;
}

export interface ExternalServiceIntegration {
  id: string;
  name: string;
  type: ExternalServiceType;
  endpoint: string;
  authentication: ServiceAuthentication;
  healthCheck: HealthCheck;
  circuitBreaker: CircuitBreaker;
}

export enum ExternalServiceType {
  ML_MODEL = 'ml_model',
  SEARCH_ENGINE = 'search_engine',
  TRANSLATION = 'translation',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  KNOWLEDGE_BASE = 'knowledge_base',
}

export interface ServiceAuthentication {
  type: ServiceAuthType;
  credentials: Record<string, any>;
  headers: Record<string, string>;
}

export enum ServiceAuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  CUSTOM = 'custom',
}

export interface HealthCheck {
  enabled: boolean;
  endpoint: string;
  interval: number;
  timeout: number;
  retries: number;
  expectedStatus: number;
}

export interface CircuitBreaker {
  enabled: boolean;
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  expectedExceptions: string[];
}

// 系统监控和状态类型
export interface SystemStatus {
  overall: SystemHealth;
  agents: AgentStatus[];
  resources: ResourceStatus;
  performance: SystemPerformance;
  errors: SystemError[];
  timestamp: Date;
}

export enum SystemHealth {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
}

export interface ResourceStatus {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  network: ResourceMetric;
  storage: ResourceMetric;
  agents: AgentResourceStatus[];
}

export interface ResourceMetric {
  used: number;
  total: number;
  percentage: number;
  trend: TrendDirection;
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export interface AgentResourceStatus {
  agentId: string;
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  tasks: number;
}

export interface SystemPerformance {
  throughput: number;
  latency: number;
  errorRate: number;
  availability: number;
  responseTime: ResponseTimeMetrics;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface SystemError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  timestamp: Date;
  source: ErrorSource;
  stackTrace?: string;
  context: Record<string, any>;
  resolved: boolean;
}

export enum ErrorType {
  SYSTEM = 'system',
  APPLICATION = 'application',
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorSource {
  component: string;
  service: string;
  agent?: string;
  user?: string;
  request?: string;
}
