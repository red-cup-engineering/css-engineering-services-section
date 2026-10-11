# Discord reaction-system observation service

This service observes a declared, bounded set of Discord configuration messages and their aggregate reactions. It makes only GET requests, never lists reaction users, never fetches channel histories, and publishes message content only from an explicitly configured administrator allowlist. Member-specific permission overwrites are redacted.

Callers provide all guild, selector, role, channel, integration, mapping, and output coordinates. The service contains no server-specific identifiers, credentials, policy copy, environment loading, or network writes.
