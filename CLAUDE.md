# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZK-Agent is an enterprise-grade AI multi-agent platform (AI多智能体宇宙平台) featuring a dual-architecture design with distinct **User Portal** and **Admin Management** interfaces. The system integrates two categories of intelligent agents: **Conversational Agents** (FastGPT-based) and **Proprietary Specialized Agents** (self-developed).

### System Architecture Principles
- **Global Consistency**: Unified UI design system and interaction patterns
- **High Availability**: Enterprise-grade reliability and fault tolerance  
- **Advanced Architecture**: Modern, scalable, and maintainable codebase
- **Separation of Concerns**: Clear distinction between user and admin functionalities

## Development Commands

### Building and Development
```bash
npm run dev                    # Start development server
npm run build                  # Production build
npm run start                  # Start production server
npm run build:production       # Production build with NODE_ENV=production
```

### Code Quality
```bash
npm run lint                   # Run ESLint
npm run lint:fix              # Auto-fix ESLint issues
npm run type-check             # TypeScript type checking
npm run type-check:strict      # Strict TypeScript checking
npm run format                 # Format code with Prettier
npm run format:check           # Check code formatting
```

### Testing Commands
The project has extensive testing infrastructure with multiple test configurations:

```bash
# Main test commands
npm run test                   # Default Jest tests
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report
npm run test:e2e               # Playwright end-to-end tests

# Specialized test suites
npm run test:simple            # Simple test configuration
npm run test:chat              # Chat-specific tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:security          # Security tests
npm run test:performance       # Performance tests

# Comprehensive testing
npm run test:all               # Run all test suites
npm run test:ci                # CI pipeline tests
npm run test:comprehensive     # All tests with detailed reporting
```

### Database Operations
```bash
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database
npm run db:migrate             # Run migrations
npm run db:studio              # Open Prisma Studio
npm run db:seed                # Seed database
npm run db:health-check        # Check database connection
```

### Security and Performance
```bash
npm run security:audit         # NPM security audit
npm run security:scan          # Custom security scan
npm run performance:test       # Performance testing
```

## Architecture Overview

### Dual-Portal System Design

#### User Portal (`app/`)
- **Purpose**: End-user interaction with intelligent agents
- **Key Features**: Agent selection, chat interface, CAD analysis, poster generation
- **Pages**: `/` (home), `/chat`, `/cad-analyzer`, `/poster-generator`, `/profile`

#### Admin Management Portal (`app/admin/`)
- **Purpose**: System configuration and monitoring for administrators
- **Key Features**: Agent configuration, AI model management, system monitoring
- **Pages**: `/admin/dashboard`, `/admin/error-monitoring`
- **API Routes**: `/api/admin/*` for administrative functions

### Core Directory Structure

- **`app/`** - Next.js 15 App Router with dual-portal design
  - `api/admin/` - Admin management API endpoints
  - `api/fastgpt/` - FastGPT integration and proxy endpoints
  - `api/ai-models/` - AI model management endpoints
  - `(user-pages)/` - User-facing application pages
  - `admin/` - Administrator management interface

- **`lib/`** - Core business logic and utilities
  - `ag-ui/` - Agent UI protocol and standardized adapters
  - `ai/` - AI service integrations and unified adapters
  - `agents/` - Self-developed specialized agents
  - `ai-models/` - AI model management and registry
  - `services/` - Business logic services
  - `middleware/` - Enterprise-grade middleware stack

- **`components/`** - React components with role-based organization
  - `admin/` - Administrative interface components
  - `chat/` - Conversational interface components
  - `cad/` - CAD analysis components  
  - `poster/` - Poster generation components
  - `ui/` - Shared UI component library

### Key Architectural Patterns

#### 1. Dual-Category Agent System

**A. Conversational Agents (FastGPT-based)**
- **Integration**: Direct FastGPT API integration (`lib/api/fastgpt-client.ts`)
- **Configuration**: Admin configures appId, API key, and endpoint URL
- **Initialization**: Uses `/api/fastgpt/init-chat` to fetch and store agent metadata
- **Data Flow**: All conversation data handled by FastGPT, local system only stores agent configuration
- **Admin Tasks**: Configure FastGPT connection parameters per agent

**B. Proprietary Specialized Agents (Self-developed)**
- **CAD Analysis Agent** (`lib/agents/cad-analysis-agent.ts`) - Advanced CAD file processing
- **Poster Generation Agent** (`lib/agents/poster-generation-agent.ts`) - Marketing material creation
- **Configuration**: Each agent type requires different admin configuration
- **Features**: Built-in error handling, resource management, and fallback strategies

#### 2. FastGPT Integration Architecture
- **Connection Management**: Environment-based configuration with admin override capability
- **Session Initialization**: 
  ```typescript
  // Admin provides: appId, apiKey, baseUrl
  // System calls: /api/fastgpt/init-chat
  // Result: Agent metadata stored locally, conversation data remains in FastGPT
  ```
- **Proxy Layer**: `app/api/fastgpt/[...path]/route.ts` for secure API forwarding
- **No Local Data Storage**: Conversation history managed entirely by FastGPT

#### 3. Admin Configuration Management
- **AI Model Registry** (`lib/ai-models/model-manager.ts`) - Centralized model configuration
- **Agent Model Configuration** (`components/admin/agent-model-config.tsx`) - Per-agent model assignment
- **Dynamic Configuration**: Runtime agent behavior modification through admin interface

#### 4. Enterprise-Grade Infrastructure
- **Global Error Handling** (`lib/middleware/global-error-handler.ts`)
- **Performance Monitoring** (`lib/monitoring/performance-monitor.ts`)
- **Resource Management** - Built-in resource monitoring and optimization
- **High Availability** (`lib/system/high-availability-manager.ts`)

## Testing Strategy

### Test Configuration Files
- `jest.config.js` - Default configuration
- `jest.config.production.js` - Production testing
- `jest.config.enhanced.js` - Enhanced testing with coverage
- `jest.config.simple.js` - Simplified test setup
- `jest.config.chat.js` - Chat-specific testing

### Test Organization
- **Unit Tests** - In `__tests__/` directory, mirroring source structure
- **Integration Tests** - API and database integration tests
- **E2E Tests** - Playwright tests for user workflows
- **Performance Tests** - Load testing with k6

### Running Single Tests
```bash
# Run specific test file
npm test -- __tests__/lib/ai/unified-ai-adapter.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="database connection"

# Run tests for specific module
npm run test:unit -- --testPathPattern=auth
```

## Development Guidelines

### Environment Configuration
- Copy `.env.example` to `.env.local` for development
- Database configuration in `config/database.config.js`
- FastGPT configuration in `config/fastgpt.ts`

### Code Standards
- **TypeScript** - Strict mode enabled, full type coverage required
- **ESLint** - Enforced code quality with React, TypeScript, and import rules
- **Prettier** - Consistent code formatting
- **Husky** - Pre-commit hooks for code quality

### Component Development Standards
- **UI Consistency**: Follow the global design system defined in `lib/component-standards/`
- **Role-Based Components**: Use appropriate component directories (`admin/`, `chat/`, `cad/`, `poster/`)
- **Accessibility**: Implement WCAG 2.1 AA compliance
- **Performance**: Implement lazy loading and optimization patterns

### API Development Guidelines

#### Admin APIs (`app/api/admin/`)
- **Authentication**: Require admin role verification
- **Configuration Management**: Handle AI model and agent configuration
- **Monitoring**: Implement comprehensive logging and monitoring

#### FastGPT Integration APIs (`app/api/fastgpt/`)
- **Proxy Pattern**: Secure API forwarding to FastGPT services
- **Session Management**: Handle chat initialization and context
- **Error Handling**: Robust error recovery and fallback mechanisms

#### Agent APIs
- **Conversational Agents**: Direct FastGPT integration with minimal local processing
- **Specialized Agents**: Full local implementation with advanced error handling

### Agent Development Patterns

#### For Conversational Agents (FastGPT-based)
```typescript
// Use the AG-UI adapter pattern
import { ConversationAgentAdapter } from '@/lib/ag-ui/agents/conversation-agent-adapter'

// Initialize with FastGPT credentials
const agent = new ConversationAgentAdapter(threadId)
await agent.initialize(appId, apiKey, chatId)
```

#### For Specialized Agents (Self-developed)
```typescript
// Implement enterprise-grade patterns
import { CADAnalysisAgent } from '@/lib/agents/cad-analysis-agent'

// Built-in retry mechanisms and resource management
const result = await cadAgent.analyzeWithRetry(file)
```

### Configuration Management

#### FastGPT Agent Configuration
1. **Admin Portal**: Configure connection parameters (appId, apiKey, baseUrl)
2. **Initialization**: System calls `/api/fastgpt/init-chat` to validate and fetch metadata
3. **Storage**: Only agent metadata stored locally, conversation data remains in FastGPT
4. **User Experience**: Seamless agent selection and interaction

#### Specialized Agent Configuration  
1. **Model Assignment**: Admin assigns AI models to specific agent functions
2. **Resource Limits**: Configure memory, CPU, and timeout thresholds
3. **Quality Settings**: Define fallback strategies and quality degradation paths

## Production Deployment

### Build Process
```bash
npm run validate:production    # Validate production readiness
npm run build:production       # Production build
npm run start:production       # Start in production mode
```

### Health Checks
```bash
npm run db:health-check        # Database connectivity
curl http://localhost:3000/api/health  # Application health
```

### Monitoring
- Performance metrics available at `/api/metrics`
- Error logs accessible via `/api/admin/error-logs`
- System monitoring at `/api/admin/system-monitor`

## Key Dependencies

### Core Framework
- **Next.js 15.2.4** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5.4.2** - Type safety

### Database & Caching
- **Prisma 5.22.0** - Database ORM
- **PostgreSQL** - Primary database
- **Redis (ioredis)** - Caching and sessions

### AI & Integrations
- **Axios** - HTTP client for AI service integration
- **WebSocket (ws)** - Real-time communication
- **Zod** - Schema validation

### UI & Styling
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Headless UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Testing & Quality
- **Jest** - Testing framework
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Security Considerations

### Enterprise Security Framework
- **Multi-layer Authentication**: JWT-based user authentication + admin role verification
- **API Security**: Rate limiting, input validation, and request sanitization
- **FastGPT Integration Security**: Secure credential management and API proxy
- **Audit System**: Comprehensive security audit logging (`lib/security/security-audit-system.ts`)

### Data Protection
- **Sensitive Configuration**: Environment-based secrets management
- **Conversation Privacy**: No local storage of FastGPT conversation data
- **Admin Separation**: Role-based access control for administrative functions

## Performance Optimization

### System-Wide Performance
- **Resource Management**: Built-in monitoring for memory, CPU, and network usage
- **Intelligent Caching**: Multi-layer caching strategies (`lib/cache/`)
- **Bundle Optimization**: Code splitting and lazy loading
- **Agent Performance**: Fallback strategies and quality degradation for specialized agents

### Monitoring and Analytics
- **Real-time Monitoring**: Performance metrics collection and analysis
- **Error Tracking**: Comprehensive error monitoring with root cause analysis
- **Resource Optimization**: Automatic resource allocation and optimization

## Development Best Practices

### Global Consistency Requirements
1. **UI Design System**: Strict adherence to design tokens and component standards
2. **API Patterns**: Consistent request/response patterns across all endpoints  
3. **Error Handling**: Standardized error responses and user feedback
4. **Testing Standards**: Comprehensive test coverage for all agent types

### High Availability Implementation
1. **Fault Tolerance**: Graceful degradation and automatic recovery
2. **Resource Monitoring**: Proactive resource management and scaling
3. **Admin Control**: Real-time system monitoring and configuration management
4. **User Experience**: Seamless operation regardless of backend complexity

### Architecture Evolution
- **Modular Design**: Easy addition of new agent types and capabilities
- **Configuration-Driven**: Runtime behavior modification through admin interface
- **Scalable Infrastructure**: Designed for enterprise-scale deployment
- **Maintainable Codebase**: Clear separation of concerns and documented patterns

## Critical Development Guidelines

### 🚨 Architecture Consistency Rules

#### 1. **Configuration Management**
- **NEVER create duplicate configuration files** - use existing unified configuration system
- **Database Config**: Use only `/config/database.config.js` (enterprise-grade)
- **Environment Variables**: Always validate through `/config/env.ts` Zod schema
- **Testing**: Use only `jest.config.js` and `jest.config.production.js`

#### 2. **Component Development Standards**
- **NO duplicate components** - check for existing functionality before creating new components
- **Enhanced vs Basic**: Use enhanced components (e.g., `enhanced-button.tsx`) as the standard
- **Props Interface**: Always extend from `BaseComponentProps` for consistency
- **File Naming**: Use kebab-case for component files (`user-profile.tsx`, not `UserProfile.tsx`)

#### 3. **Type Definition Rules**
- **Centralized Types**: Use `/types/` directory as single source of truth
- **NO duplicate interfaces** - check existing types before creating new ones
- **User Types**: Use only `/types/core/user.types.ts`
- **API Types**: Use only `/types/core/api.types.ts`
- **Agent Types**: Use only `/types/agents/index.ts`

#### 4. **API Development Standards**
- **Consistent Error Handling**: Always use `ApiResponseWrapper.error(ErrorCode, message, details, status)`
- **Unified Response Format**: Use standardized response structure with `success`, `data`, `meta`
- **Route Configuration**: Use `RouteConfigs` predefined configurations
- **Naming Convention**: Use kebab-case for API routes (`/api/error-logs`, not `/api/errorLogs`)

#### 5. **Testing Strategy**
- **Test Configs**: Use only `jest.config.js` (default) and `jest.config.production.js`
- **Setup Files**: Use only `jest.setup.js`
- **Test Organization**: Follow `__tests__/` directory structure
- **Coverage Threshold**: Maintain minimum 70% coverage

### 🔍 Pre-Development Checklist

Before adding any new feature:

1. **Configuration Check**
   ```bash
   # Verify no duplicate configs exist
   find . -name "*.config.*" -type f | grep -v node_modules
   ```

2. **Component Check**
   ```bash
   # Search for existing similar components
   find components/ -name "*[keyword]*" -type f
   ```

3. **Type Check**
   ```bash
   # Search for existing type definitions
   grep -r "interface.*[TypeName]" types/
   ```

4. **API Check**
   ```bash
   # Check for existing API routes
   find app/api/ -name "route.ts" | xargs grep -l "[endpoint]"
   ```

### 🛠️ Development Workflow

#### Configuration Changes
1. **Database Changes**: Only modify `/config/database.config.js`
2. **Environment Variables**: Add to `/config/env.ts` Zod schema first
3. **Testing Changes**: Update `jest.config.js` or `jest.config.production.js` only

#### Component Development
1. **Check Existing**: Search for similar functionality first
2. **Extend Enhanced**: Build upon enhanced components, not basic ones
3. **Follow Patterns**: Use established component patterns and Props interfaces
4. **Document**: Add proper JSDoc and Storybook documentation

#### API Development
1. **Follow RESTful**: Use consistent HTTP methods and status codes
2. **Use Middleware**: Apply `createApiRoute()` wrapper for all routes
3. **Standard Responses**: Use `ApiResponseWrapper` for all responses
4. **Error Handling**: Implement comprehensive error recovery patterns

#### Type Development
1. **Search First**: Check existing types in `/types/` before creating new ones
2. **Central Location**: Add types to appropriate modules in `/types/`
3. **Export Properly**: Use index files for clean imports
4. **Document Types**: Add JSDoc comments for complex interfaces

### 🚧 Code Quality Gates

#### Pre-Commit Requirements
1. **TypeScript**: Must compile without errors
2. **ESLint**: Must pass all linting rules
3. **Tests**: Must maintain coverage threshold
4. **Build**: Must build successfully for production

#### Architecture Validation
```bash
# Run before committing
npm run type-check     # TypeScript validation
npm run lint          # Code quality check
npm run test          # Test suite validation
npm run build         # Production build check
```

### ⚠️ Common Anti-Patterns to Avoid

#### 1. **Configuration Duplication**
```typescript
// ❌ WRONG - Creating duplicate config
const myDatabaseConfig = {
  host: 'localhost',
  // ... duplicate config
}

// ✅ CORRECT - Using unified config
import { getDatabaseConfig } from '@/config/database.config'
const config = getDatabaseConfig()
```

#### 2. **Component Duplication**
```typescript
// ❌ WRONG - Creating similar component
export function MyButton({ ... }) {
  // ... reimplemented button logic
}

// ✅ CORRECT - Extending existing component
import { Button } from '@/components/ui/button'
// Use or extend existing Button component
```

#### 3. **Type Duplication**
```typescript
// ❌ WRONG - Duplicate user interface
interface LocalUser {
  id: string
  name: string
  // ...
}

// ✅ CORRECT - Using central type
import { User } from '@/types/core/user.types'
```

#### 4. **Inconsistent API Responses**
```typescript
// ❌ WRONG - Custom response format
return Response.json({ data: result, ok: true })

// ✅ CORRECT - Unified response wrapper
return ApiResponseWrapper.success(result)
```

### 🎯 Quality Metrics

Maintain these quality standards:
- **Configuration Files**: ≤ 10 total configuration files
- **Duplicate Components**: 0 duplicate functionality
- **Type Coverage**: 100% TypeScript coverage
- **API Consistency**: 100% using ApiResponseWrapper
- **Test Coverage**: ≥ 70% across all modules

When working with this codebase:
1. **Always maintain the dual-portal architecture** - respect user/admin separation
2. **Follow the agent categorization** - distinguish between FastGPT and specialized agents
3. **Check for existing implementations** - avoid creating duplicate functionality
4. **Use unified configuration systems** - never create duplicate configs
5. **Implement proper error handling** - use the established patterns for enterprise reliability
6. **Run comprehensive tests** - ensure both user and admin functionality work correctly
7. **Verify TypeScript compilation** - maintain strict type safety across the platform