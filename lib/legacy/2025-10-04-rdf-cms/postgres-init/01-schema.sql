-- Event store schema for append-only provenance logging

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(500) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(500),
    provenance_iri TEXT
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, aggregate_type);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_provenance_iri ON events(provenance_iri) WHERE provenance_iri IS NOT NULL;

COMMENT ON TABLE events IS 'Append-only event store for all RDF graph operations and provenance';
COMMENT ON COLUMN events.provenance_iri IS 'IRI reference to PROV-O entity in the RDF graph';
