# Memory System

Open Orchestra's memory system provides a Neo4j-backed persistent knowledge graph for storing and retrieving project insights, decisions, and context across sessions and projects.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Memory Scopes](#memory-scopes)
- [Memory Operations](#memory-operations)
- [Graph Structure](#graph-structure)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

---

## Overview

The memory system is designed to:

- **Persist Knowledge**: Store decisions, patterns, and insights indefinitely
- **Build Context**: Create a searchable knowledge graph for your project
- **Cross-Session Access**: Retrieve information across different OpenCode sessions
- **Team Collaboration**: Share knowledge through a central knowledge base
- **Semantic Search**: Find related information through relationships

### Key Features

- Dual-scope storage (project and global)
- Automatic relationship tracking
- Tag-based organization
- Full-text search
- Relationship traversal
- No secret storage (security-first)

```mermaid
graph LR
    subgraph Memory["Memory System"]
        API["API Layer"]
        Graph["Neo4j Graph"]
        Index["Search Index"]
    end
    
    subgraph Scopes["Storage Scopes"]
        Project["Project Memory"]
        Global["Global Memory"]
    end
    
    subgraph Nodes["Memory Nodes"]
        Decision["decision:*"]
        Pattern["pattern:*"]
        Architecture["architecture:*"]
        Preference["preference:*"]
    end
    
    API --> Graph
    Graph --> Project
    Graph --> Global
    Graph --> Index
    
    Project --> Decision & Pattern & Architecture
    Global --> Preference
    
    style Memory fill:#6495ED,stroke:#2F4F8F,color:#fff
    style Scopes fill:#FFD700,stroke:#CC8400
```

---

## Setup

### 1. Install Neo4j

```bash
# Using Docker (recommended)
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -d \
  -e NEO4J_AUTH=neo4j/your-password \
  -e NEO4J_PLUGINS=["apoc"] \
  neo4j:latest

# Or using Homebrew
brew install neo4j
neo4j start
```

### 2. Configure Environment

```bash
# Required
export OPENCODE_NEO4J_URI=bolt://localhost:7687
export OPENCODE_NEO4J_USERNAME=neo4j
export OPENCODE_NEO4J_PASSWORD=your-password

# Optional
export OPENCODE_NEO4J_DATABASE=opencode  # defaults to neo4j
```

### 3. Verify Connection

```bash
# Test connection
memory_put({
  key: "test:connection",
  value: "Memory system is working!"
})

# Retrieve test
memory_search({ query: "connection" })

# Clean up test
memory_search({ query: "test:connection" })
```

---

## Memory Scopes

### Project Memory
- Scoped to specific project
- Includes project ID in node properties
- Persists within project workspace
- Ideal for:
  - Architectural decisions
  - Implementation patterns
  - Project-specific preferences
  - Code conventions

### Global Memory
- Shared across all projects
- No project association
- Personal knowledge repository
- Ideal for:
  - General coding standards
  - Tool preferences
  - Language patterns
  - Best practices

```mermaid
graph TB
    subgraph Project["Project A"]
        P1["architecture:db"]
        P2["pattern:repository"]
        P1 -->|RELATES_TO| P2
    end
    
    subgraph Project2["Project B"]
        P3["architecture:api"]
        P4["pattern:circuit-breaker"]
    end
    
    subgraph Global["Global Memory"]
        G1["preference:testing-style"]
        G2["pattern:error-handling"]
        G1 -->|RELATES_TO| G2
    end
    
    style Project fill:#e3f2fd
    style Project2 fill:#e8f5e9
    style Global fill:#fff3e0
```

---

## Memory Operations

### `memory_put`

Create or update a memory entry.

**Parameters:**
```typescript
{
  scope?: "project" | "global";   // Default: "project"
  key: string;                    // Stable identifier
  value: string;                  // Content (no secrets!)
  tags?: string[];                // Optional tags
}
```

**Examples:**
```bash
# Store architectural decision
memory_put({
  key: "architecture:database",
  value: "Using PostgreSQL with Drizzle ORM for type safety and automatic migrations",
  tags: ["database", "orm", "architecture"]
})

# Store global preference
memory_put({
  scope: "global",
  key: "preference:indentation",
  value: "Use 2 spaces for JavaScript/TypeScript, 4 for Python",
  tags: ["style", "formatting"]
})

# Store coding pattern
memory_put({
  key: "pattern:repository",
  value: "Repository pattern with Unit of Work. All repositories inherit from BaseRepository with common CRUD operations",
  tags: ["pattern", "ddd", "repository"]
})
```

### `memory_link`

Create relationships between memory entries.

**Parameters:**
```typescript
{
  scope?: "project" | "global";   // Default: "project"
  fromKey: string;                // Source key
  toKey: string;                  // Target key
  type?: string;                  // Relationship type (default: RELATES_TO)
}
```

**Examples:**
```bash
# Link architecture to pattern
memory_link({
  fromKey: "architecture:database",
  toKey: "pattern:repository",
  type: "IMPLEMENTS"
})

# Link decision to consideration
memory_link({
  fromKey: "decision:use-postgres",
  toKey: "consideration:consistency",
  type: "DUE_TO"
})

# Link pattern to example
memory_link({
  fromKey: "pattern:circuit-breaker",
  toKey: "example:api-gateway",
  type: "HAS_EXAMPLE"
})
```

### `memory_search`

Search memory entries by content or tags.

**Parameters:**
```typescript
{
  scope?: "project" | "global";   // Default: "project"
  query: string;                  // Search query
  limit?: number;                 // Default: 10
  format?: "markdown" | "json";   // Default: "markdown"
}
```

**Examples:**
```bash
# Full-text search
memory_search({ 
  query: "database architecture" 
})

# Tag search
memory_search({ 
  query: "pattern repository" 
})

# Combined search
memory_search({ 
  query: "security authentication jwt" 
})

# Limit results
memory_search({ 
  query: "testing",
  limit: 5 
})
```

**Sample Output:**
```markdown
- `architecture:database` (project) [database, orm, architecture]
  - Using PostgreSQL with Drizzle ORM for type safety and automatic migrations
- `decision:use-postgres` (project) [database, decision]
  - Chose PostgreSQL over MongoDB for ACID compliance and relational integrity
- `pattern:repository` (project) [pattern, ddd, repository]
  - Repository pattern with Unit of Work. All repositories inherit from BaseRepository
```

### `memory_recent`

List recently updated memory entries.

**Parameters:**
```typescript
{
  scope?: "project" | "global";   // Default: "project"
  limit?: number;                 // Default: 10
  format?: "markdown" | "json";   // Default: "markdown"
}
```

**Examples:**
```bash
# Recent project memories
memory_recent({ limit: 10 })

# Recent global memories
memory_recent({ 
  scope: "global",
  limit: 20 
})

# JSON format for processing
memory_recent({ 
  format: "json",
  limit: 5 
})
```

---

## Graph Structure

### Memory Node Properties

```typescript
interface MemoryNode {
  // Identification
  key: string;           // Unique identifier (e.g., "architecture:db")
  scope: "project" | "global";
  projectId?: string;     // Only for project scope
  
  // Content
  value: string;         // The stored knowledge
  tags: string[];        // Searchable tags
  
  // Metadata
  createdAt: number;      // Unix timestamp
  updatedAt: number;      // Unix timestamp
}
```

### Naming Conventions

Use prefixes to organize memory by type:

| Prefix | Purpose | Examples |
|--------|---------|----------|
| `architecture:` | System architecture | `architecture:database`, `architecture:microservices` |
| `decision:` | Architectural decisions | `decision:use-redis`, `decision:rest-vs-graphql` |
| `pattern:` | Design patterns | `pattern:observer`, `pattern:circuit-breaker` |
| `preference:` | Personal/team preferences | `preference:testing-framework`, `preference:linting` |
| `consideration:` | Decision factors | `consideration:scalability`, `consideration:team-skill` |
| `example:` | Code examples | `example:auth-middleware`, `example:dockerfile` |
| `learning:` | Lessons learned | `learning:sql-tuning`, `learning:react-performance` |

### Relationship Types

Common relationship types:

| Type | Usage | Example |
|------|-------|---------|
| `RELATES_TO` | General relationship | Architecture → Pattern |
| `IMPLEMENTS` | Implementation | Decision → Pattern |
| `DUE_TO` | Causation | Decision → Consideration |
| `HAS_EXAMPLE` | Example link | Pattern → Example |
| `BASED_ON` | Foundation | Architecture → Decision |
| `IMPROVES_ON` | Evolution | NewPattern → OldPattern |

---

## Best Practices

### 1. Key Design

```bash
# Good - specific and discoverable
key: "architecture:event-driven-microservices"
key: "decision:use-event-sourcing"
key: "pattern:cqrs"

# Avoid - too generic
key: "architecture"
key: "decision"
key: "pattern"
```

### 2. Content Guidelines

```bash
# Good - concise but complete
value: "Using PostgreSQL with RLS for multi-tenancy. Each tenant gets isolated schema with row-level security for shared tables."

# Avoid - too brief
value: "Postgres"

# Avoid - too verbose (include details elsewhere)
value: "We spent weeks evaluating databases... (long story) ... so we chose PostgreSQL."
```

### 3. Tag Strategy

```bash
# Core tags - always include
tags: ["database", "architecture", "decision"]

# Domain tags
tags: ["web3", "blockchain", "solidity"]

# Technology tags
tags: ["react", "typescript", "nextjs"]

# Quality attributes
tags: ["performance", "security", "scalability"]
```

### 4. Relationship Patterns

```bash
# Decision tracking
memory_link({ from: "decision:use-postgres", to: "consideration:acid-compliance" })
memory_link({ from: "decision:use-postgres", to: "consideration:team-expertise" })

# Pattern implementation
memory_link({ from: "architecture:auth", to: "pattern:repository", type: "IMPLEMENTS" })
memory_link({ from: "pattern:repository", to: "example:user-repository", type: "HAS_EXAMPLE" })
```

### 5. Security Rules

- **NEVER** store secrets, API keys, or passwords
- **NEVER** store PII or sensitive data
- **AVOID** storing production URLs or internal IPs
- **USE** generic descriptions instead of specific values

```bash
# Bad - contains secret
memory_put({
  key: "config:database",
  value: "postgres://user:password123@prod-db.internal:5432/app"
})

# Good - generic description
memory_put({
  key: "architecture:database",
  value: "PostgreSQL cluster with read replicas in VPC, connection via RDS proxy"
})
```

---

## Advanced Usage

### 1. Building a Knowledge Base

```bash
# 1. Document high-level architecture
memory_put({
  key: "architecture:system-overview",
  value: "Event-driven microservices with API Gateway, Kafka for messaging, PostgreSQL for state, Redis for caching",
  tags: ["architecture", "microservices", "events"]
})

# 2. Document each component
memory_put({
  key: "architecture:api-gateway",
  value: "Kong-based API Gateway with rate limiting, authentication, and request routing",
  tags: ["architecture", "gateway", "kong"]
})

# 3. Link components
memory_link({
  fromKey: "architecture:system-overview",
  toKey: "architecture:api-gateway",
  type: "INCLUDES"
})

# 4. Document decisions
memory_put({
  key: "decision:use-kong",
  value: "Chose Kong for built-in plugins and open-source flexibility over Apigee for cost",
  tags: ["decision", "gateway", "kong"]
})

# 5. Link decision to component
memory_link({
  fromKey: "architecture:api-gateway",
  toKey: "decision:use-kong",
  type: "IMPLEMENTS"
})
```

### 2. Query Strategies

```bash
# Find all architecture decisions
memory_search({ query: "decision architecture" })

# Find patterns by technology
memory_search({ query: "pattern react typescript" })

# Find all database-related info
memory_search({ query: "database postgres redis" })

# Find recent changes
memory_recent({ limit: 20 })

# Cross-reference patterns
memory_search({ query: "pattern repository cqrs" })
```

### 3. Project Templates

Create a knowledge base template for new projects:

```bash
# Architecture template
memory_put({
  key: "template:architecture-web-app",
  value: "Three-tier architecture: Frontend (React/Next.js), Backend (Node.js/Express), Database (PostgreSQL)",
  tags: ["template", "architecture", "web"]
})

# Standard patterns
memory_put({
  key: "template:patterns-web",
  value: "Repository, Unit of Work, DTO, Service Layer, Dependency Injection",
  tags: ["template", "patterns", "ddd"]
})

# Development standards
memory_put({
  key: "template:standards",
  value: "ESLint + Prettier, Jest for testing, TypeScript strict mode, Git hooks with Husky",
  tags: ["template", "standards", "tools"]
})
```

---

## Examples

### Example 1: New Project Setup

```bash
# 1. Document initial architecture
memory_put({
  key: "architecture:initial",
  value: "Next.js 14 with App Router, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS",
  tags: ["architecture", "initial"]
})

# 2. Document technology choices
memory_put({
  key: "decision:nextjs",
  value: "Next.js for SSR/SSG capabilities, built-in optimizations, and Vercel deployment",
  tags: ["decision", "framework"]
})

memory_put({
  key: "decision:prisma",
  value: "Prisma for type-safe database access and excellent TypeScript integration",
  tags: ["decision", "orm", "typescript"]
})

# 3. Link decisions
memory_link({
  fromKey: "architecture:initial",
  toKey: "decision:nextjs",
  type: "USES"
})

memory_link({
  fromKey: "architecture:initial",
  toKey: "decision:prisma",
  type: "USES"
})
```

### Example 2: Tracking Evolution

```bash
# Initial approach
memory_put({
  key: "pattern:auth-jwt",
  value: "JWT with access tokens stored in localStorage, refresh tokens in httpOnly cookies",
  tags: ["pattern", "auth", "jwt"]
})

# Evolution
memory_put({
  key: "pattern:auth-jwt-v2",
  value: "JWT with short-lived access tokens (15min), secure httpOnly cookies for both tokens, rotation on refresh",
  tags: ["pattern", "auth", "jwt", "security"]
})

# Link evolution
memory_link({
  fromKey: "pattern:auth-jwt-v2",
  toKey: "pattern:auth-jwt",
  type: "IMPROVES_ON"
})

# Document reason for change
memory_put({
  key: "learning:auth-security",
  value: "localStorage is vulnerable to XSS. Always store tokens in secure, httpOnly cookies",
  tags: ["learning", "security", "auth"]
})
```

### Example 3: Code Review Insights

```bash
# Store common issues
memory_put({
  key: "pattern:error-boundary",
  value: "React Error Boundary with componentDidCatch to catch errors in component tree and log to error service",
  tags: ["pattern", "react", "error-handling"]
})

# Link to example
memory_link({
  fromKey: "pattern:error-boundary",
  toKey: "example:error-boundary-component",
  type: "HAS_EXAMPLE"
})

# Document review checklist
memory_put({
  key: "checklist:react-review",
  value: "1. Error boundaries for async operations 2. Keys for lists 3. Proper dependency arrays 4. No direct state mutation 5. Accessibility attributes",
  tags: ["checklist", "react", "review"]
})
```

### Example 4: Performance Optimization

```bash
# Document optimization techniques
memory_put({
  key: "pattern:react-performance",
  value: "React.memo for expensive components, useMemo for computed values, useCallback for stable refs",
  tags: ["pattern", "react", "performance"]
})

# Store specific optimizations
memory_put({
  key: "optimization:virtual-scroll",
  value: "Implemented react-window for list with 10k+ items, reduced renders from 10k to visible items only",
  tags: ["optimization", "performance", "react"]
})

# Link to performance metrics
memory_put({
  key: "metrics:page-load",
  value: "Reduced initial load from 4.2s to 1.8s through code splitting and image optimization",
  tags: ["metrics", "performance"]
})

# Create relationships
memory_link({
  fromKey: "optimization:virtual-scroll",
  toKey: "pattern:react-performance",
  type: "IMPLEMENTS"
})
```

---

## Integration with Workflows

### Automated Memory Storage

Create a custom worker that automatically stores decisions:

```bash
# In custom architect worker
set_profile_model({
  profileId: "architect-with-memory",
  systemPrompt: `After making any architectural decision or identifying a pattern, 
  automatically store it in memory using the memory_put tool. 
  Use proper naming conventions like 'architecture:*', 'decision:*', or 'pattern:*'.`
})
```

### Memory-First Development

Start each task by checking memory:

```bash
# 1. Search for relevant patterns
memory_search({ query: "authentication pattern" })

# 2. Check for existing decisions
memory_search({ query: "decision auth" })

# 3. Review related examples
memory_search({ query: "example authentication" })

# 4. Make informed decision
# 5. Store new learning
memory_put({
  key: "learning:auth-implementation",
  value: "Discovered that NextAuth.js simplifies OAuth implementation significantly",
  tags: ["learning", "auth", "nextjs"]
})
```

---

## Troubleshooting

### Common Issues

1. **Connection Failed**
   ```bash
   # Check environment variables
   echo $OPENCODE_NEO4J_URI
   echo $OPENCODE_NEO4J_USERNAME
   echo $OPENCODE_NEO4J_PASSWORD
   
   # Test Neo4j is running
   cypher-shell -a bolt://localhost:7687 -u neo4j
   ```

2. **Permission Denied**
   ```bash
   # Check credentials
   memory_put({
     key: "test",
     value: "test"
   })
   ```

3. **Slow Queries**
   ```bash
   # Use specific queries
   memory_search({ query: "exact:term" })
   
   # Limit results
   memory_search({ 
     query: "pattern",
     limit: 5 
   })
   ```

### Maintenance

```bash
# Clean up old test entries
memory_search({ query: "test" })

# Archive old decisions
memory_search({ 
  query: "decision",
  limit: 50 
})

# Update outdated information
memory_put({
  key: "architecture:current",
  value: "Updated architecture description",
  tags: ["architecture", "current"]
})
```