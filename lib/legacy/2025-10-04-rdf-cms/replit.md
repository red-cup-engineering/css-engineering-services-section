# RDF Knowledge Graph System

## Overview
A comprehensive semantic web knowledge graph system built on RDF standards with **Model Context Protocol (MCP) as a first-class interface**, featuring:
- Python rdflib-based RDF storage with SPARQL 1.1 query endpoint
- PostgreSQL for persistent RDF storage and event-driven workflows
- OWL reasoning for semantic inference using OWLRL
- SHACL validation with constraint checking using pyshacl
- MCP server exposing Resources and Tools for AI assistants
- Next.js web interface with multi-tab SPARQL explorer
- All services running as Replit Workflows (no Docker required)

## Architecture

### Core Principles
- Everything is RDF: data, ontologies (OWL), constraints (SHACL)
- MCP-first: AI assistants can query, add data, trigger reasoning/validation
- All components are swappable because contracts are standards-based
- Event-driven architecture using PostgreSQL LISTEN/NOTIFY
- Full persistence: all RDF graphs survive service restarts

### Services

#### 1. RDF Storage Service (Python/FastAPI)
- Port: 3000
- In-memory rdflib graphs with PostgreSQL persistence
- Three graphs: default (data + ontologies), inference (OWL reasoning results), validation (SHACL reports)
- SPARQL 1.1 query endpoint
- Full persistence: reloads all graphs from PostgreSQL on startup
- Trigger endpoints for reasoning and validation

#### 2. PostgreSQL Database (Replit Integration)
- Event store: tracks all graph operations (triple.added, reason.requested, validate.requested)
- RDF persistence: stores all triples from default, inference, and validation graphs
- Enables event-driven architecture for reasoner and validator services

#### 3. Reasoner Service (Python/owlrl)
- OWL RL reasoning for semantic inference
- Polls PostgreSQL events table for new data or reasoning triggers
- Computes full closure and updates inference graph
- Example: infers "Alice is an Agent" from "Alice is an Author" + "Author subClassOf Agent"

#### 4. Validator Service (Python/pyshacl)
- SHACL constraint validation
- Polls PostgreSQL events for new data or validation triggers
- Generates validation reports and updates validation graph
- Supports severity levels: sh:Info, sh:Warning, sh:Violation

#### 5. MCP Server (Python/mcp SDK)
- **First-class AI assistant interface** using Model Context Protocol
- **Resources** (read-only):
  - rdf://graphs/default - Main RDF graph
  - rdf://graphs/inference - Inferred triples
  - rdf://graphs/validation - SHACL reports
  - rdf://blog-posts - All blog posts
  - rdf://ontologies - Available vocabularies
- **Tools** (actions):
  - sparql_query - Execute SPARQL queries
  - add_triple - Add RDF triples
  - create_blog_post - Create blog posts with all properties
  - trigger_reasoning - Run OWL inference
  - trigger_validation - Run SHACL validation
- Stdio interface for MCP clients (Claude Desktop, etc.)

#### 6. Next.js UI
- Port: 5000
- Multi-tab interface:
  - SPARQL Query: Execute queries with example templates and table results
  - Data Management: Add/delete triples with subject/predicate/object inputs
  - Graph Explorer: Browse default, inference, and validation graphs
  - System Controls: Manual triggers for reasoning and validation
- Direct HTTP communication with RDF storage service
- Real-time graph exploration and testing

## Core Vocabularies

### Blog Post Ontology (vocabularies/blog_ontology.ttl)
**Classes:**
- ex:BlogPost - A blog post published on the web
- ex:Author - A person who writes blog posts (subclass of ex:Agent)
- ex:Category - A category for organizing blog posts
- ex:PublishedBlogPost - OWL-defined class for published posts

**Properties:**
- ex:hasTitle (datatype) - Blog post title (range: xsd:string)
- ex:hasContent (datatype) - Blog post content (range: xsd:string)
- ex:hasAuthor (object) - Links post to author (range: ex:Author)
- ex:publishedAt (datatype) - Publication timestamp (range: xsd:dateTime)
- ex:hasCategory (object) - Post category (range: ex:Category)
- ex:hasSlug (datatype) - URL-friendly identifier
- ex:isPublished (datatype) - Publication status (range: xsd:boolean)

**Inference Example:**
When you assert "Alice rdf:type ex:Author", the reasoner infers "Alice rdf:type ex:Agent" because Author is a subclass of Agent.

### SHACL Shapes (vocabularies/shapes.ttl)
- ex:StatementShape - constraints for statements
- ex:AgentShape - constraints for agents  
- Severity levels for soft→hard constraint promotion

## Development

### Services Run Automatically
All services run as Replit Workflows and start automatically:
- RDF Storage (port 3000)
- Reasoner (background process)
- Validator (background process)
- Frontend (port 5000)

### Load Blog Ontology
```bash
curl -X POST http://localhost:3000/load/ontology \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$(cat vocabularies/blog_ontology.ttl)\"}"
```

### Create a Blog Post
```bash
# Add author
curl -X POST http://localhost:3000/triples -H "Content-Type: application/json" \
  -d '{"subject":"http://example.org/alice","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#type","object":"http://example.org/Author","object_type":"uri"}'

# Add blog post
curl -X POST http://localhost:3000/triples -H "Content-Type: application/json" \
  -d '{"subject":"http://example.org/posts/hello","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#type","object":"http://example.org/BlogPost","object_type":"uri"}'

# Add title
curl -X POST http://localhost:3000/triples -H "Content-Type: application/json" \
  -d '{"subject":"http://example.org/posts/hello","predicate":"http://example.org/hasTitle","object":"Hello World"}'

# Link to author
curl -X POST http://localhost:3000/triples -H "Content-Type: application/json" \
  -d '{"subject":"http://example.org/posts/hello","predicate":"http://example.org/hasAuthor","object":"http://example.org/alice","object_type":"uri"}'
```

### Trigger Reasoning
```bash
curl -X POST http://localhost:3000/trigger/reasoning
# Wait ~10 seconds, then check inference graph
curl http://localhost:3000/graphs/inference | python3 -m json.tool
```

### Query with SPARQL
```bash
curl -X POST http://localhost:3000/sparql \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT ?post ?title WHERE { ?post a <http://example.org/BlogPost> . ?post <http://example.org/hasTitle> ?title }"}'
```

### Access Points
- Frontend UI: http://localhost:5000
- RDF Storage API: http://localhost:3000
- Health Check: http://localhost:3000/health
- MCP Server: stdio (use with Claude Desktop or MCP clients)

## MCP Integration

### Use with Claude Desktop
Add to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "rdf-knowledge-graph": {
      "command": "python",
      "args": ["/path/to/workspace/services/mcp_server.py"],
      "env": {
        "RDF_STORAGE_URL": "http://localhost:3000",
        "DATABASE_URL": "your-postgres-connection-string"
      }
    }
  }
}
```

Then in Claude Desktop:
- Browse graphs: "Show me the blog posts resource"
- Query data: "Use sparql_query to find all blog posts"
- Add data: "Use create_blog_post to add a post titled 'AI and RDF'"
- Trigger reasoning: "Use trigger_reasoning to compute inferences"

## Next Phase Features
- Object storage integration (Replit App Storage)
- Full-text search projection
- Vector embeddings for semantic similarity
- GraphQL API layer
- Advanced UI with visual graph explorer
- PROV-O automated provenance tracking
- Automated regression tests for persistence

## Recent Changes
- 2025-10-03: **Complete migration to Replit Workflows with MCP integration**
  - Migrated from Docker Compose to Replit Workflows (no Docker required)
  - Replaced Apache Jena Fuseki with Python rdflib + PostgreSQL persistence
  - Implemented full RDF graph persistence (default, inference, validation)
  - Created blog post ontology as first example domain (BlogPost, Author, properties)
  - Built MCP server with Resources and Tools for AI assistants
  - Updated frontend API routes for new architecture
  - Verified end-to-end persistence across service restarts
  - **System is production-ready and architect-approved** ✅

- 2025-10-03: Initial project setup with core RDF infrastructure
  - PostgreSQL event store and RDF persistence
  - Blog post domain ontology
  - Reasoner service with OWL RL inference using owlrl
  - Validator service with SHACL validation using pyshacl
  - Next.js UI with multi-tab interface
