---
name: "semantic hypertext packet"
description: "The unit the Group's web server serves and the form in which the Group's web applications and web platform communicate."
aliases:
  - "SHP"
  - "semantic-hypertext-packet"
date-created: 2026-10-10
provenance:
  utterances:
    - "ni:///sha-256;jC_6mrO6J59SwmuBVZqR_z1DnP2IXumKbEmO3wTcCcs"
---

A **semantic hypertext packet** (SHP) is part of the Group's web-server
technology stack. The Group's web server serves semantic hypertext packets,
and the Group's web applications and web platform communicate in them (Leader,
2026-09-22).

The current carriers are the HTML structural projection service's SHP profile
(`computer-serialized-content-engineering-services-section/services/html-engineering-services-section/services/html-structural-projection-service/src/html/shp-profile.mjs`)
and the `semantic-hypertext-packet/{shp,lint,normalize}` exports of the older
`computer` package. A packet carries JSON, so it can carry ActivityStreams 2.0
objects and Horsetail programs.

## Open

- The SHP format has no specification in the house. The Leader's 2026-09-23
  ecosystem note asks the same for the semiotic content address and the
  semiotic expression notation that a packet would carry.
- `examples/shp-profile.json`, once under
  `multi-agent-computer-platform-system-engineering-services-section`, is of
  unknown purpose (the Leader: "dunno what this file itself is").
