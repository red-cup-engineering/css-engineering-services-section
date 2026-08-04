/**
 * carriers - gaming carrier schemas lifted from generated JSON artifacts into
 * as-const literals. The literal is now the single source: FromSchema reads
 * the type and carrierFrom registers the runtime carrier by bare $id.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const arenaSchema = {
  "$id": "gaming/arena",
  "title": "Arena",
  "description": "A polarized prime event structure WITH SYMMETRY (E, ≤, #, Ṽ) — the game/arena, the scale-2 (multi-agent) object of CGS. The structure is the polarized prime event structure (events with causality and conflict); the symmetry groupoid (an array of bijections on event ids) is the agent-sheaf. Mirrors the encodeArena wire shape exactly. Its $id is the bare package-rooted descent path, not a URL.",
  "type": "object",
  "required": [
    "structure",
    "symmetry"
  ],
  "additionalProperties": false,
  "properties": {
    "structure": {
      "$ref": "#/$defs/EventStructure"
    },
    "symmetry": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Bijection"
      }
    }
  },
  "$defs": {
    "EventStructure": {
      "type": "object",
      "required": [
        "events",
        "causality",
        "conflict"
      ],
      "additionalProperties": false,
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Event"
          }
        },
        "causality": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventPair"
          }
        },
        "conflict": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventPair"
          }
        }
      }
    },
    "Event": {
      "type": "object",
      "required": [
        "id",
        "polarity"
      ],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string"
        },
        "polarity": {
          "enum": [
            "positive",
            "negative"
          ]
        }
      }
    },
    "EventPair": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "Bijection": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/EventPair"
      }
    }
  }
} as const;
export const arenaCarrier = carrierFrom(arenaSchema);
export type Arena = FromSchema<typeof arenaSchema>;

export const maskSidesSchema = {
  "$id": "gaming/mask-sides",
  "title": "MaskSides",
  "description": "The A^perp || B Player/Opponent partition of a Mask: the input arena A (Opponent-side coordinates recv, observe) and the output arena B (Player-side coordinates send, actuate). The $id is the bare package-rooted descent path; this carrier mirrors the MaskSides return type of sides() in @red-cup-engineering/gaming's concurrent-game/with-symmetry/strategizing/mask.mts.",
  "type": "object",
  "properties": {
    "kind": {
      "const": "game.mask.sides"
    },
    "input": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/CoordinateFace"
      }
    },
    "output": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/CoordinateFace"
      }
    }
  },
  "required": [
    "kind",
    "input",
    "output"
  ],
  "additionalProperties": false,
  "$defs": {
    "CoordinateFace": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game.mask.face"
        },
        "coordinate": {
          "$ref": "#/$defs/HandednessCoordinate"
        },
        "polarity": {
          "$ref": "#/$defs/Polarity"
        },
        "capacity": {
          "$ref": "#/$defs/ChargeValueName"
        }
      },
      "required": [
        "kind",
        "coordinate",
        "polarity",
        "capacity"
      ],
      "additionalProperties": false
    },
    "HandednessCoordinate": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "animating.agent.handedness.coordinate"
        },
        "name": {
          "$ref": "#/$defs/HandednessCoordinateName"
        },
        "side": {
          "$ref": "#/$defs/HandednessSide"
        },
        "dual": {
          "$ref": "#/$defs/HandednessCoordinateName"
        }
      },
      "required": [
        "kind",
        "name",
        "side",
        "dual"
      ],
      "additionalProperties": false
    },
    "HandednessCoordinateName": {
      "type": "string",
      "enum": [
        "recv",
        "send",
        "actuate",
        "observe"
      ]
    },
    "HandednessSide": {
      "type": "string",
      "enum": [
        "opponent",
        "player"
      ]
    },
    "Polarity": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game.polarity"
        },
        "name": {
          "type": "string",
          "enum": [
            "positive",
            "negative"
          ]
        }
      },
      "required": [
        "kind",
        "name"
      ],
      "additionalProperties": false
    },
    "ChargeValueName": {
      "type": "string",
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ]
    }
  }
} as const;
export const maskSidesCarrier = carrierFrom(maskSidesSchema);
export type MaskSides = FromSchema<typeof maskSidesSchema>;

export const maskSchema = {
  "$id": "gaming/mask",
  "title": "Mask",
  "description": "A CGS participant's I/O FACE turned to an arena: one agent viewed as a concurrent-game morphism shape, an animating Handedness lifted to Player/Opponent polarity and named by an optional label. The $id is the bare package-rooted descent path, not a URL. This carrier mirrors the @red-cup-engineering/gaming Mask interface returned by mask(handedness, label) in structuring/concurrent-game/with-symmetry/strategizing/mask.mts.",
  "type": "object",
  "properties": {
    "kind": {
      "const": "game.mask"
    },
    "label": {
      "type": "string",
      "description": "A label for the participant (the empty string when unnamed)."
    },
    "handedness": {
      "$ref": "#/$defs/Handedness",
      "description": "The agent's four-tuple capacity charges — the bridge's only admission."
    }
  },
  "required": [
    "kind",
    "label",
    "handedness"
  ],
  "additionalProperties": false,
  "$defs": {
    "ChargeValueName": {
      "type": "string",
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ]
    },
    "Handedness": {
      "type": "object",
      "description": "An agent's handedness: the capacity charge it carries at each of the four coordinates, mirroring animating's Handedness.",
      "properties": {
        "kind": {
          "const": "animating.agent.handedness"
        },
        "recv": {
          "$ref": "#/$defs/ChargeValueName"
        },
        "send": {
          "$ref": "#/$defs/ChargeValueName"
        },
        "actuate": {
          "$ref": "#/$defs/ChargeValueName"
        },
        "observe": {
          "$ref": "#/$defs/ChargeValueName"
        }
      },
      "required": [
        "kind",
        "recv",
        "send",
        "actuate",
        "observe"
      ],
      "additionalProperties": false
    }
  }
} as const;
export const maskCarrier = carrierFrom(maskSchema);
export type Mask = FromSchema<typeof maskSchema>;

export const compositeSchema = {
  "$id": "gaming/composite",
  "title": "Composite",
  "description": "The categorical composite of two composable designs f:A⊸B and g:B⊸C — the REAL Hyland–Ong / ludics cut lifted from @red-cup-engineering/playing/ludics (composition.mts::cut), NOT the symmetric knowledge-join shadow (interactionReport). The shadow keeps the UNION of both designs' supports gated by convergence; the real cut runs the dispute on the shared interface B chronicle-by-chronicle, discards the non-dual/non-converging pairs, and transports the settled play — so the composite is NOT the union of supports and DROPS each design's private far-side content. This is the categorical morphism composition of CGS (objects = behaviours, morphisms = designs, composition = cut, identity = fax). The interface field records the cut-interface loci (f's codomain-side B, g's domain-side B); the converged flag marks whether any composed play reached a Daimon collision on B (the cut being defined). Its $id is the bare package-rooted descent path, never a URL.",
  "type": "object",
  "$defs": {
    "Design": {
      "type": "object",
      "description": "A charge valuation in the canonical playing codec: a finite list of {locus, charge} entries whose loci are address arrays. Mirrors encodeDesign.",
      "properties": {
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "locus": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 },
                "description": "The locus address of this entry; the root is []."
              },
              "charge": {
                "type": "string",
                "enum": [
                  "absurd",
                  "potential",
                  "active",
                  "stable"
                ]
              }
            },
            "required": [
              "locus",
              "charge"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "entries"
      ],
      "additionalProperties": false
    }
  },
  "properties": {
    "composite": {
      "$ref": "#/$defs/Design",
      "description": "The composite design A⊸C — the transported, dispute-settled play. Empty (no entries) when no composed play converges (the cut is partial). Crucially this is NOT the union of designA's and designB's supports: the real cut omits each design's private far-side content, which the union-join shadow would retain."
    },
    "interface": {
      "type": "array",
      "description": "The cut-interface locus keys: f's codomain-side B loci (1·1·…) and g's domain-side B loci (0·…) — the shared sub-arena B the dispute runs over and the cut collapses. Recorded as the witness of which interface the composition glued and hid.",
      "items": {
        "type": "string",
        "description": "A cut-interface locus key string."
      }
    },
    "converged": {
      "type": "boolean",
      "description": "True when at least one composed play converged at a Daimon collision on the shared interface B — i.e. the cut is defined."
    }
  },
  "required": [
    "composite",
    "interface",
    "converged"
  ],
  "additionalProperties": false
} as const;
export const compositeCarrier = carrierFrom(compositeSchema);
export type Composite = FromSchema<typeof compositeSchema>;

export const culturalEmbeddingSchema = {
  "$id": "gaming/cultural-embedding",
  "title": "CulturalEmbedding",
  "description": "The codomain of embed-culture: the ludically-structured judgment produced by the cultural-embedding functor Phi, reporting whether a culture is in the image of the ludic embedding via the five image-conditions (I1)-(I5). The $id is the bare package-rooted descent path; this carrier mirrors the embedCultureAction codomain in @red-cup-engineering/gaming-experimental's structuring/concurrent-game/with-symmetry/reading/cultural-embedding.mts.",
  "$defs": {
    "ImageConditions": {
      "type": "object",
      "description": "The five image-conditions (I1)-(I5) of Phi, each projected to its sub-judgment kind (I3 is the plain magic-circle boolean).",
      "properties": {
        "i1": {
          "type": "string"
        },
        "i2": {
          "type": "string"
        },
        "i3": {
          "type": "boolean"
        },
        "i4": {
          "type": "string"
        },
        "i5": {
          "type": "string"
        }
      },
      "required": [
        "i1",
        "i2",
        "i3",
        "i4",
        "i5"
      ],
      "additionalProperties": false
    }
  },
  "type": "object",
  "oneOf": [
    {
      "type": "object",
      "description": "Witness: the structure is ludically structured; all five image-conditions held.",
      "properties": {
        "kind": {
          "const": "game-analysis.ludicallyStructured:witness"
        },
        "satisfied": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "conditions": {
          "$ref": "#/$defs/ImageConditions"
        }
      },
      "required": [
        "kind",
        "satisfied",
        "conditions"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "description": "Obstruction: the structure is outside the image of Phi; lists the image-conditions that failed.",
      "properties": {
        "kind": {
          "const": "game-analysis.ludicallyStructured-obstruction"
        },
        "reason": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "conditions": {
          "$ref": "#/$defs/ImageConditions"
        }
      },
      "required": [
        "kind",
        "reason",
        "conditions"
      ],
      "additionalProperties": false
    }
  ]
} as const;
export const culturalEmbeddingCarrier = carrierFrom(culturalEmbeddingSchema);
export type CulturalEmbedding = FromSchema<typeof culturalEmbeddingSchema>;

export const deepPlaySchema = {
  "$id": "gaming/deep-play",
  "title": "DeepPlay",
  "description": "The Geertz deep-play judgment: the codomain of read-deep-play, judging whether a play's stakes strictly exceed instrumental rationality (a witness carrying symbolicExcess) or stay within it (a shallow obstruction carrying headroom). Its $id is the bare package-rooted descent path, projected by readDeepPlayAction in @red-cup-engineering/gaming-experimental.",
  "type": "object",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.deepPlay:witness"
        },
        "stakes": {
          "$ref": "#/$defs/Rational"
        },
        "instrumentalValue": {
          "$ref": "#/$defs/Rational"
        },
        "symbolicExcess": {
          "$ref": "#/$defs/Rational"
        }
      },
      "required": [
        "kind",
        "stakes",
        "instrumentalValue",
        "symbolicExcess"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.deepPlay-obstruction"
        },
        "stakes": {
          "$ref": "#/$defs/Rational"
        },
        "instrumentalValue": {
          "$ref": "#/$defs/Rational"
        },
        "reason": {
          "const": "shallow"
        },
        "headroom": {
          "$ref": "#/$defs/Rational"
        }
      },
      "required": [
        "kind",
        "stakes",
        "instrumentalValue",
        "reason",
        "headroom"
      ],
      "additionalProperties": false
    }
  ],
  "$defs": {
    "Rational": {
      "type": "object",
      "description": "An exact rational measure projected by rat(): numerator, denominator, and exact decimal string.",
      "properties": {
        "num": {
          "type": "number"
        },
        "den": {
          "type": "number"
        },
        "decimal": {
          "type": "string"
        }
      },
      "required": [
        "num",
        "den",
        "decimal"
      ],
      "additionalProperties": false
    }
  }
} as const;
export const deepPlayCarrier = carrierFrom(deepPlaySchema);
export type DeepPlay = FromSchema<typeof deepPlaySchema>;

export const embeddingImageSchema = {
  "$id": "gaming/embedding-image",
  "title": "EmbeddingImage",
  "description": "The image of a CGS concurrency-paradigm embedding whose codomain is NOT an event-structure arena. Used by the Caires-Pfenning (CGS_CLL) object-map, whose realized image is the CLL proposition naming a concurrent behaviour (not an arena): a session type maps under propositionOfSession to its classical-linear-logic proposition, the syntactic name of a CGS_CLL behaviour. The carrier records which embedding produced it (its name and the CGS sub-*-autonomous-category), the source object it came from, and the realized proposition image. Embeddings whose image IS an arena (Dialectica via F: Dial(Eff) -> CGS, and AGMOS nominal) project to gaming/arena instead; this carrier is for the proposition-valued reading. Its $id is the bare package-rooted descent path, not a URL.",
  "type": "object",
  "required": [
    "kind",
    "embedding",
    "subcategory",
    "proposition"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "gaming.embedding-image"
    },
    "embedding": {
      "enum": [
        "hylandOng",
        "dialectica",
        "nominal",
        "cairesPfenning"
      ]
    },
    "subcategory": {
      "type": "string"
    },
    "session": {
      "type": "object"
    },
    "proposition": {
      "$ref": "#/$defs/Proposition"
    }
  },
  "$defs": {
    "Proposition": {
      "type": "object",
      "required": [
        "kind",
        "connective",
        "operands"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.logic.prop"
        },
        "connective": {
          "enum": [
            "atom",
            "tensor",
            "par",
            "with",
            "plus",
            "one",
            "bottom",
            "top",
            "zero",
            "ofCourse",
            "whyNot",
            "up",
            "down"
          ]
        },
        "operands": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Proposition"
          }
        },
        "polarity": {
          "enum": [
            "positive",
            "negative"
          ]
        },
        "label": {
          "type": "string"
        }
      }
    }
  }
} as const;
export const embeddingImageCarrier = carrierFrom(embeddingImageSchema);
export type EmbeddingImage = FromSchema<typeof embeddingImageSchema>;

export const flowSchema = {
  "$id": "gaming/flow",
  "title": "Flow",
  "description": "The codomain of gaming read-flow: a Csikszentmihalyi challenge-skill flow judgment, projecting either a flow witness (with gap) or a flow obstruction (with reason and mismatch). Its $id is the bare package-rooted descent path. It mirrors the readFlowAction over flowJudgment in lib/gaming-experimental/src/structuring/concurrent-game/with-symmetry/reading/flow.mts.",
  "type": "object",
  "$defs": {
    "Rational": {
      "type": "object",
      "description": "An exact rational projected by the gaming rat() helper.",
      "properties": {
        "num": {
          "type": "number"
        },
        "den": {
          "type": "number"
        },
        "decimal": {
          "type": "string"
        }
      },
      "required": [
        "num",
        "den",
        "decimal"
      ],
      "additionalProperties": false
    }
  },
  "oneOf": [
    {
      "type": "object",
      "description": "Flow witness: the challenge-skill mismatch is within the band.",
      "properties": {
        "kind": {
          "const": "game-analysis.flow:witness"
        },
        "challenge": {
          "type": "number"
        },
        "skill": {
          "type": "number"
        },
        "band": {
          "$ref": "#/$defs/Rational"
        },
        "gap": {
          "type": "number"
        }
      },
      "required": [
        "kind",
        "challenge",
        "skill",
        "band",
        "gap"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "description": "Flow obstruction: the mismatch exceeds the band (anxiety or boredom).",
      "properties": {
        "kind": {
          "const": "game-analysis.flow-obstruction"
        },
        "challenge": {
          "type": "number"
        },
        "skill": {
          "type": "number"
        },
        "band": {
          "$ref": "#/$defs/Rational"
        },
        "reason": {
          "enum": [
            "anxiety",
            "boredom"
          ]
        },
        "mismatch": {
          "type": "number"
        }
      },
      "required": [
        "kind",
        "challenge",
        "skill",
        "band",
        "reason",
        "mismatch"
      ],
      "additionalProperties": false
    }
  ]
} as const;
export const flowCarrier = carrierFrom(flowSchema);
export type Flow = FromSchema<typeof flowSchema>;

export const gameAnalysisSchema = {
  "$id": "gaming/game-analysis",
  "title": "GameAnalysis",
  "description": "The codomain of the gaming `analyze` action: a JSON analysis of a game's arena drawn from the operationalized ludic/game theory (Caillois regime, paidia/ludus placement, configuration count). Its `$id` is the bare package-rooted descent path. It is the wire shape of `analyzeAction` in lib/gaming-experimental/src/actions.mts (over `analyzeGame` in src/running/analysis.mts).",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "events",
    "designs",
    "regime",
    "regimeConditions",
    "paidiaLudus",
    "ludusIndex",
    "configurations"
  ],
  "properties": {
    "id": {
      "type": "string"
    },
    "events": {
      "type": "number"
    },
    "designs": {
      "type": "number"
    },
    "regime": {
      "$ref": "#/$defs/RegimeClassification"
    },
    "regimeConditions": {
      "$ref": "#/$defs/RegimeConditions"
    },
    "paidiaLudus": {
      "type": "object",
      "description": "Shallow JSON projection of the paidia/ludus placement judgment: scalars, strings, string arrays, and projected rationals are kept; nested carriers are dropped.",
      "additionalProperties": true
    },
    "ludusIndex": {
      "type": "object",
      "description": "Shallow JSON projection of the ludus-index judgment in [0,1].",
      "additionalProperties": true
    },
    "configurations": {
      "type": "number"
    }
  },
  "$defs": {
    "Rational": {
      "type": "object",
      "description": "An exact rational projected via `rat`: integer numerator/denominator plus an exact decimal string.",
      "additionalProperties": false,
      "required": [
        "num",
        "den",
        "decimal"
      ],
      "properties": {
        "num": {
          "type": "number"
        },
        "den": {
          "type": "number"
        },
        "decimal": {
          "type": "string"
        }
      }
    },
    "RegimeScores": {
      "type": "object",
      "description": "The four commensurable Caillois regime scores as exact rationals.",
      "additionalProperties": false,
      "required": [
        "agon",
        "alea",
        "mimicry",
        "ilinx"
      ],
      "properties": {
        "agon": {
          "$ref": "#/$defs/Rational"
        },
        "alea": {
          "$ref": "#/$defs/Rational"
        },
        "mimicry": {
          "$ref": "#/$defs/Rational"
        },
        "ilinx": {
          "$ref": "#/$defs/Rational"
        }
      }
    },
    "RegimeClassification": {
      "type": "object",
      "description": "The Caillois regime classification: dominant regime, its score, tie flag, and all four scores.",
      "additionalProperties": false,
      "required": [
        "kind",
        "dominant",
        "dominantScore",
        "tied",
        "scores"
      ],
      "properties": {
        "kind": {
          "const": "game-analysis.regime.classification"
        },
        "dominant": {
          "enum": [
            "agon",
            "alea",
            "mimicry",
            "ilinx"
          ]
        },
        "dominantScore": {
          "$ref": "#/$defs/Rational"
        },
        "tied": {
          "type": "boolean"
        },
        "scores": {
          "$ref": "#/$defs/RegimeScores"
        }
      }
    },
    "RegimeConditions": {
      "type": "object",
      "description": "The three arena-readable Caillois regime necessary-condition judgments, each a witness or obstruction variant.",
      "additionalProperties": false,
      "required": [
        "kind",
        "agonFairness",
        "aleaIndeterminacy",
        "mimicryBoundary"
      ],
      "properties": {
        "kind": {
          "const": "game-analysis.regimeConditions"
        },
        "agonFairness": {
          "$ref": "#/$defs/AgonFairness"
        },
        "aleaIndeterminacy": {
          "$ref": "#/$defs/AleaIndeterminacy"
        },
        "mimicryBoundary": {
          "$ref": "#/$defs/MimicryBoundary"
        }
      }
    },
    "AgonFairness": {
      "description": "The agon fairness condition: a witness ({kind, positive, negative}) or an obstruction ({kind, reason, dominant, positive, negative}).",
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "positive",
            "negative"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.agonFairness:witness"
            },
            "positive": {
              "type": "number"
            },
            "negative": {
              "type": "number"
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "reason",
            "dominant",
            "positive",
            "negative"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.agonFairness-obstruction"
            },
            "reason": {
              "type": "string"
            },
            "dominant": {
              "enum": [
                "positive",
                "negative"
              ]
            },
            "positive": {
              "type": "number"
            },
            "negative": {
              "type": "number"
            }
          }
        }
      ]
    },
    "AleaIndeterminacy": {
      "description": "The alea indeterminacy condition: a witness ({kind, conflicts}) or an obstruction ({kind, reason}).",
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "conflicts"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.aleaIndeterminacy:witness"
            },
            "conflicts": {
              "type": "number"
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "reason"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.aleaIndeterminacy-obstruction"
            },
            "reason": {
              "type": "string"
            }
          }
        }
      ]
    },
    "MimicryBoundary": {
      "description": "The mimicry identity-boundary condition: a witness ({kind, symmetries}) or an obstruction ({kind, reason}).",
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "symmetries"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.mimicryBoundary:witness"
            },
            "symmetries": {
              "type": "number"
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "reason"
          ],
          "properties": {
            "kind": {
              "const": "game-analysis.mimicryBoundary-obstruction"
            },
            "reason": {
              "type": "string"
            }
          }
        }
      ]
    }
  }
} as const;
export const gameAnalysisCarrier = carrierFrom(gameAnalysisSchema);
export type GameAnalysis = FromSchema<typeof gameAnalysisSchema>;

export const gameSchema = {
  "$id": "gaming/game",
  "title": "Game",
  "description": "A running multiplayer game snapshot: the encoded configuration of an arena, the enrolled designs, the current play, and the interaction history -- the codomain of game/play/settle. The $id is the bare package-rooted descent path, not a URL. Mirrors snapshot() over the Game carrier in @red-cup-engineering/gaming-experimental (lib/gaming-experimental/src/running/snapshot.mts and game.mts).",
  "type": "object",
  "properties": {
    "kind": {
      "const": "game.computer.game"
    },
    "id": {
      "type": "string"
    },
    "arena": {
      "type": "object",
      "description": "Encoded arena (encodeArena): a polarized prime event structure with symmetry groupoid. Shape kept permissive; it is a game-algebra carrier."
    },
    "designs": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/GameDesign"
      }
    },
    "play": {
      "$ref": "#/$defs/Play",
      "description": "Encoded current play (encodePlay): the secured linearization reached so far as its move-id sequence."
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/HistoryEntry"
      }
    }
  },
  "required": [
    "kind",
    "id",
    "arena",
    "designs",
    "play",
    "history"
  ],
  "additionalProperties": false,
  "$defs": {
    "GameDesign": {
      "type": "object",
      "description": "A design enrolled in the running game, under a stable string id (encodeGameDesign: { id, design }).",
      "properties": {
        "id": {
          "type": "string"
        },
        "design": {
          "type": "object",
          "description": "Encoded design (encodeDesign): a charge valuation on the locus tree. Shape kept permissive; it is a game-algebra carrier."
        }
      },
      "required": [
        "id",
        "design"
      ],
      "additionalProperties": false
    },
    "HistoryEntry": {
      "description": "One history entry: a move, an interaction, or a terminal settle.",
      "oneOf": [
        {
          "$ref": "#/$defs/MoveEntry"
        },
        {
          "$ref": "#/$defs/InteractionEntry"
        },
        {
          "$ref": "#/$defs/SettleEntry"
        }
      ]
    },
    "MoveEntry": {
      "type": "object",
      "description": "A move appended to the history: the play after a legal extend.",
      "properties": {
        "kind": {
          "const": "game.computer.move"
        },
        "move": {
          "type": "string"
        },
        "play": {
          "$ref": "#/$defs/Play",
          "description": "Encoded play (encodePlay) after the move."
        }
      },
      "required": [
        "kind",
        "move",
        "play"
      ],
      "additionalProperties": false
    },
    "InteractionEntry": {
      "type": "object",
      "description": "An interaction of two enrolled designs, recording the interaction report and the convergence verdict.",
      "properties": {
        "kind": {
          "const": "game.computer.interaction"
        },
        "designIdA": {
          "type": "string"
        },
        "designIdB": {
          "type": "string"
        },
        "report": {
          "type": "object",
          "description": "Encoded interaction report (encodeInteractionReport): the knowledge-join normal form with meeting loci. Shape kept permissive."
        },
        "converged": {
          "type": "boolean"
        }
      },
      "required": [
        "kind",
        "designIdA",
        "designIdB",
        "report",
        "converged"
      ],
      "additionalProperties": false
    },
    "SettleEntry": {
      "type": "object",
      "description": "A terminal settle: the JOINT verdict of ALL enrolled designs. The joint interaction is the parallel-composition (||) combine = superpose over the whole roster; the entry records every participant id, the joint form's report, and whether the N-way knowledge-join converged to the Daimon (top). daimonLoci are recovered from report.daimonLoci on restore.",
      "properties": {
        "kind": {
          "const": "game.computer.settle"
        },
        "designIds": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Every participant folded into the joint interaction, in roster order."
        },
        "report": {
          "type": "object",
          "description": "Encoded interaction report (encodeInteractionReport) of the joint form. Shape kept permissive."
        },
        "converged": {
          "type": "boolean"
        }
      },
      "required": [
        "kind",
        "designIds",
        "report",
        "converged"
      ],
      "additionalProperties": false
    },
    "Play": {
      "type": "array",
      "description": "Wire projection of a play: the event-id move sequence emitted by encodePlay.",
      "items": {
        "type": "string"
      }
    }
  }
} as const;
export const gameCarrier = carrierFrom(gameSchema);
export type Game = FromSchema<typeof gameSchema>;

export const lusorySchema = {
  "$id": "gaming/lusory",
  "title": "GamingLusory",
  "description": "The codomain of read-lusory: Suits' lusory-attitude judgment of a game-with-strategy, either a witness (the witness voluntarily accepts the constitutive rules to reach the prelusory goal, recording the lusory means committed and how many alternative rule-systems were declined) or an obstruction (the chosen rules do not reach the goal, or the commitment is forced rather than voluntary). Its $id is the bare package-rooted descent path. It mirrors the gaming source readLusoryAction in lib/gaming-experimental/src/actions.mts, projecting the LusoryAttitudeJudgment from lib/gaming-experimental/src/structuring/concurrent-game/with-symmetry/reading/lusory-attitude.mts.",
  "type": "object",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.lusoryAttitude:witness"
        },
        "means": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "declined": {
          "type": "number"
        }
      },
      "required": [
        "kind",
        "means",
        "declined"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.lusoryAttitude-obstruction"
        },
        "reason": {
          "type": "string",
          "enum": [
            "goal-unreached",
            "forced-commitment"
          ]
        }
      },
      "required": [
        "kind",
        "reason"
      ],
      "additionalProperties": false
    }
  ]
} as const;
export const lusoryCarrier = carrierFrom(lusorySchema);
export type GamingLusory = FromSchema<typeof lusorySchema>;

export const matchSchema = {
  "$id": "gaming/match",
  "title": "Match",
  "description": "The joint N-player match result — the verdict of the genuine multi-agent interaction of a WHOLE roster of designs over one shared arena. Per federation-is-parallel-composition.md, CGS's monoidal product (‖) IS parallel composition of arenas = concurrent multi-player, and 'the cellwise ∨_k-join followed by closure is the action induced by ‖ at the fiber level'; so the joint interaction of N players is the ‖-combine = the iterated knowledge-join ⊔_k = superpose over the entire roster (NOT a privileged pair). jointForm is superpose(designs) — the union of every player's commitments with ⊔_k resolving any locus more than one commits at. converged is true iff some locus of the joint form is a Daimon (top, stable) collision — read off interactionReport(jointForm, jointForm) (since x ⊔_k x = x, the self-interaction's daimon loci are exactly the loci of jointForm already at top); it requires at least two participants. Because ⊔_k is commutative, associative, and idempotent, superpose is order-independent: the FSym(𝔸) groupoid permuting players acts trivially on the verdict. Mirrors matchAll() over the MatchAll carrier in @red-cup-engineering/gaming-experimental (lib/gaming-experimental/src/running/match.mts). Its $id is the bare package-rooted descent path, never a URL.",
  "type": "object",
  "$defs": {
    "Locus": {
      "type": "array",
      "description": "A locus address: a finite path of non-negative integers from the root of the locus tree (root is []). Mirrors encodeLocus.",
      "items": {
        "type": "integer",
        "minimum": 0
      }
    },
    "ChargeName": {
      "type": "string",
      "description": "The stable name of a bilattice charge value (the apex atom). Mirrors encodeCharge.",
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ]
    },
    "Design": {
      "type": "object",
      "description": "A charge valuation in the canonical playing codec: a finite list of {locus, charge} entries whose loci are address arrays. Mirrors encodeDesign.",
      "properties": {
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "locus": {
                "$ref": "#/$defs/Locus"
              },
              "charge": {
                "$ref": "#/$defs/ChargeName"
              }
            },
            "required": [
              "locus",
              "charge"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "entries"
      ],
      "additionalProperties": false
    }
  },
  "properties": {
    "kind": {
      "const": "game.computer.match"
    },
    "id": {
      "type": "string",
      "description": "Optional stable match id, used by the lobby protocol for formed brackets."
    },
    "pool": {
      "type": "string",
      "description": "Optional source pool id for a lobby-formed match."
    },
    "arena": {
      "type": "object",
      "description": "Optional encoded arena instantiated over the admitted players. This is the existing gaming/arena carrier, not a second match ontology."
    },
    "ticketIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Optional ticket ids consumed exactly once by the lobby protocol."
    },
    "playerIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Optional player names whose FSym permutations act on the match arena."
    },
    "jointForm": {
      "$ref": "#/$defs/Design",
      "description": "The ‖-combine over the WHOLE roster: superpose(designs) — the union of every player's commitments, with the knowledge-join ⊔_k resolving any locus more than one player commits at. This is the iterated parallel-composition of the entire roster, not a privileged pair."
    },
    "converged": {
      "type": "boolean",
      "description": "True iff the joint interaction reaches a Daimon (top, stable) at some meeting locus — the loci where the N-way knowledge-join collided. Requires at least two participants."
    },
    "daimonLoci": {
      "type": "array",
      "description": "The loci where the N-way knowledge-join is stable (top) — the joint give-up points of the play. Read off interactionReport(jointForm, jointForm).",
      "items": {
        "$ref": "#/$defs/Locus"
      }
    },
    "players": {
      "type": "integer",
      "minimum": 0,
      "description": "The roster size folded over — the number of concurrent participants in the joint match."
    }
  },
  "required": [
    "kind",
    "jointForm",
    "converged",
    "daimonLoci",
    "players"
  ],
  "additionalProperties": false
} as const;
export const matchCarrier = carrierFrom(matchSchema);
export type Match = FromSchema<typeof matchSchema>;

export const parallelSchema = {
  "$id": "gaming/parallel",
  "title": "Parallel",
  "description": "The parallel-composition (‖) report — the multi-agent cut of two arenas/designs over the shared locus tree: parallel composition + hiding. This carrier records the concurrent interaction of two dual strategies as the pointwise knowledge-join normal form, the per-locus meetings over the shared support, and the Daimon (top, stable) collision loci that mark convergence/orthogonality. In CGS the composition σ;τ is interaction on the shared arena A^⊥‖B followed by hiding; this report is the present, encodable witness of that cut emitted by encodeInteractionReport (@red-cup-engineering/playing/encoding, re-exported by encoding/index.mts) over interactionReport (strategizing/interaction.mts). A standalone ‖ product carrier over two arenas (A‖B as a prime event structure with the disjoint-union symmetry groupoid) is not yet in the body; when it lands it joins this report. Its $id is the bare package-rooted descent path, never a URL.",
  "type": "object",
  "$defs": {
    "Locus": {
      "type": "array",
      "description": "A locus address: a finite path of non-negative integers from the root of the locus tree (root is []). Mirrors encodeLocus.",
      "items": {
        "type": "integer",
        "minimum": 0
      }
    },
    "ChargeName": {
      "type": "string",
      "description": "The stable name of a bilattice charge value (the apex atom). Mirrors encodeCharge.",
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ]
    },
    "DesignAct": {
      "type": "string",
      "description": "The act a design commits at a locus.",
      "enum": [
        "proponent",
        "opponent",
        "daimon",
        "none"
      ]
    },
    "Design": {
      "type": "object",
      "description": "A charge valuation in the canonical playing codec: a finite list of {locus, charge} entries whose loci are address arrays. Mirrors encodeDesign.",
      "properties": {
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "locus": {
                "$ref": "#/$defs/Locus"
              },
              "charge": {
                "$ref": "#/$defs/ChargeName"
              }
            },
            "required": [
              "locus",
              "charge"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "entries"
      ],
      "additionalProperties": false
    },
    "MeetingPoint": {
      "type": "object",
      "description": "The per-locus meeting of two dual designs under parallel composition: their acts, the knowledge-join charge, and whether they collide into the Daimon (top). Mirrors encodeMeeting; kind game.interaction.meeting.",
      "properties": {
        "locus": {
          "$ref": "#/$defs/Locus"
        },
        "left": {
          "$ref": "#/$defs/DesignAct"
        },
        "right": {
          "$ref": "#/$defs/DesignAct"
        },
        "joined": {
          "$ref": "#/$defs/ChargeName"
        },
        "daimonized": {
          "type": "boolean",
          "description": "True when both designs commit a polarity here and they collide into top (stable)."
        }
      },
      "required": [
        "locus",
        "left",
        "right",
        "joined",
        "daimonized"
      ],
      "additionalProperties": false
    }
  },
  "properties": {
    "normalForm": {
      "$ref": "#/$defs/Design",
      "description": "The interaction normal form: the pointwise knowledge-join of the two designs — the composed concurrent strategy after the ‖ cut."
    },
    "meetings": {
      "type": "array",
      "description": "The per-locus meetings over the shared support of the two designs.",
      "items": {
        "$ref": "#/$defs/MeetingPoint"
      }
    },
    "daimonLoci": {
      "type": "array",
      "description": "Loci where the two designs collide into top — the give-up points of the play.",
      "items": {
        "$ref": "#/$defs/Locus"
      }
    }
  },
  "required": [
    "normalForm",
    "meetings",
    "daimonLoci"
  ],
  "additionalProperties": false
} as const;
export const parallelCarrier = carrierFrom(parallelSchema);
export type Parallel = FromSchema<typeof parallelSchema>;

export const regimeSchema = {
  "$id": "gaming/regime",
  "title": "Regime",
  "description": "The codomain of the gaming-experimental read-regime computation: an arena's Caillois regime reading (agon / alea / mimicry / ilinx) with exact rational scores, dominant classification, and the three arena-readable regime conditions. The $id is the bare package-rooted descent path. Mirrors the readRegimeAction wire shape, projected from reading/regime.mts and reading/regime-conditions.mts.",
  "type": "object",
  "properties": {
    "scores": {
      "$ref": "#/$defs/RegimeScoreSet"
    },
    "classification": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.regime.classification"
        },
        "dominant": {
          "$ref": "#/$defs/RegimeName"
        },
        "dominantScore": {
          "$ref": "#/$defs/Rat"
        },
        "tied": {
          "type": "boolean"
        },
        "scores": {
          "$ref": "#/$defs/RegimeScoreSet"
        }
      },
      "required": [
        "kind",
        "dominant",
        "dominantScore",
        "tied",
        "scores"
      ],
      "additionalProperties": false
    },
    "conditions": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.regimeConditions"
        },
        "agonFairness": {
          "$ref": "#/$defs/AgonFairness"
        },
        "aleaIndeterminacy": {
          "$ref": "#/$defs/AleaIndeterminacy"
        },
        "mimicryBoundary": {
          "$ref": "#/$defs/MimicryBoundary"
        }
      },
      "required": [
        "kind",
        "agonFairness",
        "aleaIndeterminacy",
        "mimicryBoundary"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "scores",
    "classification",
    "conditions"
  ],
  "additionalProperties": false,
  "$defs": {
    "Rat": {
      "type": "object",
      "description": "An exact rational projected to JSON: integer numerator and denominator plus an exact decimal string.",
      "properties": {
        "num": {
          "type": "number"
        },
        "den": {
          "type": "number"
        },
        "decimal": {
          "type": "string"
        }
      },
      "required": [
        "num",
        "den",
        "decimal"
      ],
      "additionalProperties": false
    },
    "RegimeName": {
      "type": "string",
      "enum": [
        "agon",
        "alea",
        "mimicry",
        "ilinx"
      ]
    },
    "RegimeScoreSet": {
      "type": "object",
      "description": "The four commensurable Caillois axis scores, each an exact rational in [0,1].",
      "properties": {
        "agon": {
          "$ref": "#/$defs/Rat"
        },
        "alea": {
          "$ref": "#/$defs/Rat"
        },
        "mimicry": {
          "$ref": "#/$defs/Rat"
        },
        "ilinx": {
          "$ref": "#/$defs/Rat"
        }
      },
      "required": [
        "agon",
        "alea",
        "mimicry",
        "ilinx"
      ],
      "additionalProperties": false
    },
    "AgonFairness": {
      "description": "Agon's fairness condition: witness (balanced polarity) or obstruction (empty/imbalanced).",
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.agonFairness:witness"
            },
            "positive": {
              "type": "number"
            },
            "negative": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "positive",
            "negative"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.agonFairness-obstruction"
            },
            "reason": {
              "type": "string",
              "enum": [
                "empty-board",
                "imbalanced"
              ]
            },
            "dominant": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "positive",
                "negative",
                null
              ]
            },
            "positive": {
              "type": "number"
            },
            "negative": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "reason",
            "dominant",
            "positive",
            "negative"
          ],
          "additionalProperties": false
        }
      ]
    },
    "AleaIndeterminacy": {
      "description": "Alea's indeterminacy condition: witness (conflict present) or obstruction (confluent).",
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.aleaIndeterminacy:witness"
            },
            "conflicts": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "conflicts"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.aleaIndeterminacy-obstruction"
            },
            "reason": {
              "const": "confluent"
            }
          },
          "required": [
            "kind",
            "reason"
          ],
          "additionalProperties": false
        }
      ]
    },
    "MimicryBoundary": {
      "description": "Mimicry's identity-boundary condition: witness (non-identity symmetry) or obstruction (identity-only).",
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.mimicryBoundary:witness"
            },
            "symmetries": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "symmetries"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "game-analysis.mimicryBoundary-obstruction"
            },
            "reason": {
              "const": "identity-only"
            }
          },
          "required": [
            "kind",
            "reason"
          ],
          "additionalProperties": false
        }
      ]
    }
  }
} as const;
export const regimeCarrier = carrierFrom(regimeSchema);
export type Regime = FromSchema<typeof regimeSchema>;

export const rhetoricsSchema = {
  "$id": "gaming/rhetorics",
  "title": "Rhetorics",
  "description": "The codomain of read-rhetorics: a play's constitutive-ambiguity judgment over its hosted Sutton-Smith rhetorics, carrying the rhetorical charge name and, on the witness variant, the incompatible rhetorics held in top-tension. Its $id is the bare package-rooted descent path. It mirrors the gaming source readRhetoricsAction in lib/gaming-experimental/src/actions.mts (constitutiveAmbiguityJudgment over rhetorics.mts).",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.constitutiveAmbiguity:witness"
        },
        "hosted": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "inTension": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "charge": {
          "type": "string"
        }
      },
      "required": [
        "kind",
        "hosted",
        "inTension",
        "charge"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "game-analysis.constitutiveAmbiguity-obstruction"
        },
        "hosted": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "reason": {
          "type": "string"
        },
        "charge": {
          "type": "string"
        }
      },
      "required": [
        "kind",
        "hosted",
        "reason",
        "charge"
      ],
      "additionalProperties": false
    }
  ]
} as const;
export const rhetoricsCarrier = carrierFrom(rhetoricsSchema);
export type Rhetorics = FromSchema<typeof rhetoricsSchema>;

export const strategyReportSchema = {
  "$id": "gaming/strategy-report",
  "title": "StrategyReport",
  "description": "The concurrent-game well-formedness report that is the codomain of gaming's read-strategy action: a strategy judged for valid plays, prefix-closure, receptivity, innocence, and symmetry-invariance. Its $id is the bare package-rooted descent path. It mirrors the strategyReport wire shape from src/structuring/concurrent-game/with-symmetry/strategizing/strategy.mts as projected by readStrategyAction.",
  "type": "object",
  "$defs": {
    "JudgmentKind": {
      "type": "object",
      "properties": {
        "kind": {
          "type": "string"
        }
      },
      "required": [
        "kind"
      ],
      "additionalProperties": false
    }
  },
  "properties": {
    "kind": {
      "const": "game.strategy.report"
    },
    "validPlays": {
      "type": "boolean"
    },
    "wellFormed": {
      "type": "boolean"
    },
    "prefixClosed": {
      "$ref": "#/$defs/JudgmentKind"
    },
    "receptivity": {
      "$ref": "#/$defs/JudgmentKind"
    },
    "innocence": {
      "$ref": "#/$defs/JudgmentKind"
    },
    "symmetryInvariance": {
      "$ref": "#/$defs/JudgmentKind"
    }
  },
  "required": [
    "kind",
    "validPlays",
    "wellFormed",
    "prefixClosed",
    "receptivity",
    "innocence",
    "symmetryInvariance"
  ],
  "additionalProperties": false
} as const;
export const strategyReportCarrier = carrierFrom(strategyReportSchema);
export type StrategyReport = FromSchema<typeof strategyReportSchema>;

export const strategySchema = {
  "$id": "gaming/strategy",
  "title": "Strategy",
  "description": "Wire projection of a concurrent strategy sigma:S->A^perp||B (a map of event structures, receptive/innocent/symmetry-invariant) over an arena-with-symmetry, and/or its well-formedness report. Its $id is the bare package-rooted descent path. The strategy mirrors encodeStrategy in lib/gaming-experimental/src/encoding/strategy.mts, whose output is exactly { arena, plays } over the Strategy carrier in lib/gaming-experimental/src/structuring/concurrent-game/with-symmetry/strategizing/strategy.mts; arena encodes to { structure, symmetry } and each play encodes to its moves array (event ids). The DEFINING condition is symmetry-invariance: the plays set is closed under the arena symmetry-groupoid action (relabel a play by a bijection; at the nominal layer the bijection is induced by an FSym(A) finite name permutation via applyPermutation), so a strategy is a fixed point of closeUnderSymmetry. The report is the four-condition strategyReport (valid plays, prefix-closure, receptivity, innocence, symmetry-invariance). gaming is playing LIFTED along this groupoid: strategyFromDesign(design, arena) admits a playing Design's chronicles as plays and closes them under symmetry; designsOfStrategy reads the maximal plays back as Designs. At trivial symmetry the closure is the identity and the strategy coincides with the playing Design (the playing -> gaming inclusion), so the optional `designs`/`design` round-trip carries that lift.",
  "type": "object",
  "$defs": {
    "Arena": {
      "description": "Wire projection of an arena: a polarized prime event structure paired with a symmetry groupoid (the agent-permutation structure). Mirrors encodeArena's { structure, symmetry }. Both sub-carriers are large nested event-structure data, kept permissive rather than over-specified: structure is the encoded prime event structure; symmetry is an array of bijections, each an array of [from, to] event-id pairs.",
      "type": "object",
      "properties": {
        "structure": {
          "type": "object"
        },
        "symmetry": {
          "type": "array",
          "items": {
            "type": "array",
            "items": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      },
      "required": [
        "structure",
        "symmetry"
      ],
      "additionalProperties": false
    },
    "Play": {
      "description": "Wire projection of a play: a sequence of moves (event ids) every prefix of which is a configuration of the arena. Mirrors encodePlay, whose output is exactly the moves array.",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "Design": {
      "description": "Wire projection of a playing Design (the union of its chronicles). Mirrors encodeDesign in @red-cup-engineering/playing/encoding: { entries: [{ locus, charge }] }, each locus an address array and each charge a charge-value name. Used by the playing-lift round-trip.",
      "type": "object",
      "properties": {
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "locus": {
                "type": "array",
                "items": { "type": "integer", "minimum": 0 }
              },
              "charge": {
                "type": "string"
              }
            },
            "required": [
              "locus",
              "charge"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "entries"
      ],
      "additionalProperties": false
    },
    "Judgment": {
      "description": "A well-formedness judgment for one strategy condition: either a witness or an obstruction, discriminated by its kind string (e.g. game.strategy.receptivity:witness vs game.strategy.receptivity-obstruction). Obstruction payloads (offending play, refused move, competing moves, bijection, missing image) vary by condition and are left open.",
      "type": "object",
      "properties": {
        "kind": {
          "type": "string"
        }
      },
      "required": [
        "kind"
      ],
      "additionalProperties": true
    },
    "StrategyWellFormednessReport": {
      "description": "The four-condition well-formedness report mirroring strategyReport: validPlays plus the prefixClosed/receptivity/innocence/symmetryInvariance judgments and the conjunctive wellFormed flag.",
      "type": "object",
      "properties": {
        "kind": {
          "const": "game.strategy.report"
        },
        "validPlays": {
          "type": "boolean"
        },
        "prefixClosed": {
          "$ref": "#/$defs/Judgment"
        },
        "receptivity": {
          "$ref": "#/$defs/Judgment"
        },
        "innocence": {
          "$ref": "#/$defs/Judgment"
        },
        "symmetryInvariance": {
          "$ref": "#/$defs/Judgment"
        },
        "wellFormed": {
          "type": "boolean"
        }
      },
      "required": [
        "kind",
        "validPlays",
        "prefixClosed",
        "receptivity",
        "innocence",
        "symmetryInvariance",
        "wellFormed"
      ],
      "additionalProperties": false
    }
  },
  "properties": {
    "arena": {
      "description": "The arena-with-symmetry the strategy is a strategy on: a polarized prime event structure plus its symmetry groupoid.",
      "$ref": "#/$defs/Arena"
    },
    "plays": {
      "description": "The non-empty, prefix-closed set of valid plays presenting the strategy; each play is a moves array of event ids.",
      "type": "array",
      "items": {
        "$ref": "#/$defs/Play"
      }
    },
    "report": {
      "description": "Optional accompanying well-formedness report: the strategy judged for valid plays, prefix-closure, receptivity, innocence, and symmetry-invariance (the defining condition).",
      "$ref": "#/$defs/StrategyWellFormednessReport"
    },
    "designs": {
      "description": "Optional playing-lift witness: the strategy's maximal plays read back as playing Designs (one Design per chronicle). Produced by designsOfStrategy; the round-trip of strategyFromDesign at trivial symmetry recovers the input Design here.",
      "type": "array",
      "items": {
        "$ref": "#/$defs/Design"
      }
    },
    "design": {
      "description": "Optional playing-lift witness: the single combined playing Design of the strategy (the union of `designs`), produced by designOfStrategy. At trivial symmetry this equals the Design strategyFromDesign was lifted from.",
      "$ref": "#/$defs/Design"
    },
    "fsym": {
      "description": "Optional FSym(A) symmetry witness: the finite name permutation(s) of the agent-sheaf the plays set is closed under, with the equivariance witness/obstruction kind. Records WHICH groupoid element witnesses (or obstructs) symmetry-invariance — the nominal action installed into the arena symmetry groupoid.",
      "type": "object",
      "properties": {
        "permutation": {
          "type": "object"
        },
        "equivariance": {
          "$ref": "#/$defs/Judgment"
        }
      },
      "additionalProperties": true
    }
  },
  "required": [
    "arena",
    "plays"
  ],
  "additionalProperties": false
} as const;
export const strategyCarrier = carrierFrom(strategySchema);
export type Strategy = FromSchema<typeof strategySchema>;

export const symmetrySchema = {
  "$id": "gaming/symmetry",
  "title": "Symmetry",
  "description": "The symmetry groupoid / nominal layer of a concurrent game: FSym(𝔸) finite name permutations plus strategy equivariance under them (the AGMOS morphism cut). A permutation is the agent-permutation symmetry that says which agents are interchangeable (name-passing among players); the equivariance judgment witnesses (or obstructs) a strategy's invariance once the generated FSym actions are installed into the arena symmetry groupoid. Its $id is the bare package-rooted descent path (not a URL or domain), and this carrier mirrors the gaming wire projection of the nominalizing layer.",
  "type": "object",
  "required": [
    "permutation",
    "equivariance"
  ],
  "additionalProperties": false,
  "properties": {
    "permutation": {
      "$ref": "#/$defs/FinitePermutation"
    },
    "equivariance": {
      "$ref": "#/$defs/EquivarianceJudgment"
    }
  },
  "$defs": {
    "FinitePermutation": {
      "type": "object",
      "required": [
        "kind",
        "mappings"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.fsym.permutation"
        },
        "mappings": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/NamePair"
          }
        }
      }
    },
    "NamePair": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 2,
      "maxItems": 2
    },
    "EquivarianceJudgment": {
      "oneOf": [
        {
          "$ref": "#/$defs/EquivarianceWitness"
        },
        {
          "$ref": "#/$defs/EquivarianceObstruction"
        }
      ]
    },
    "EquivarianceWitness": {
      "type": "object",
      "required": [
        "kind",
        "nominalArena",
        "symmetryInvariance"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.equivariance:witness"
        },
        "nominalArena": {
          "$ref": "#/$defs/NominalArenaWitness"
        },
        "symmetryInvariance": {
          "type": "object"
        }
      }
    },
    "EquivarianceObstruction": {
      "type": "object",
      "required": [
        "kind"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.equivariance-obstruction"
        },
        "nominalArena": {
          "$ref": "#/$defs/NominalArenaObstruction"
        },
        "symmetryInvariance": {
          "type": "object"
        }
      }
    },
    "NominalArenaWitness": {
      "type": "object",
      "required": [
        "kind",
        "arena",
        "labels",
        "actions"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.arena:witness"
        },
        "arena": {
          "type": "object"
        },
        "labels": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventNameLabel"
          }
        },
        "actions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/NominalActionWitness"
          }
        }
      }
    },
    "NominalArenaObstruction": {
      "type": "object",
      "required": [
        "kind",
        "arena",
        "labels",
        "obstruction"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.arena-obstruction"
        },
        "arena": {
          "type": "object"
        },
        "labels": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventNameLabel"
          }
        },
        "obstruction": {
          "$ref": "#/$defs/NominalActionObstruction"
        }
      }
    },
    "EventNameLabel": {
      "type": "object",
      "required": [
        "kind",
        "event",
        "name"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.eventName"
        },
        "event": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      }
    },
    "NominalActionWitness": {
      "type": "object",
      "required": [
        "kind",
        "permutation",
        "bijection",
        "symmetry"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.action:witness"
        },
        "permutation": {
          "$ref": "#/$defs/FinitePermutation"
        },
        "bijection": {
          "$ref": "#/$defs/Bijection"
        },
        "symmetry": {
          "type": "object"
        }
      }
    },
    "NominalActionObstruction": {
      "type": "object",
      "required": [
        "kind",
        "permutation",
        "reason"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "game.nominal.action-obstruction"
        },
        "permutation": {
          "$ref": "#/$defs/FinitePermutation"
        },
        "reason": {
          "enum": [
            "unknown-event",
            "duplicate-name",
            "missing-image",
            "not-symmetry"
          ]
        },
        "event": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "symmetry": {
          "type": "object"
        }
      }
    },
    "Bijection": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/EventPair"
      }
    },
    "EventPair": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 2,
      "maxItems": 2
    }
  }
} as const;
export const symmetryCarrier = carrierFrom(symmetrySchema);
export type Symmetry = FromSchema<typeof symmetrySchema>;

export const ticketSchema = {
  "$id": "gaming/ticket",
  "title": "MatchTicket",
  "description": "A once-only lobby admission ticket: one player name in one matchmaking pool, optionally carrying that player's existing Design. The ticket is a functorial view over the pool's arena admission, not a second player ontology.",
  "type": "object",
  "required": ["kind", "id", "pool", "player", "status"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.lobby.ticket" },
    "id": { "type": "string" },
    "pool": { "type": "string" },
    "player": { "type": "string" },
    "status": { "enum": ["queued", "matched"] },
    "design": {
      "type": "object",
      "description": "Optional encoded playing Design reused by gaming's existing match verdict."
    }
  }
} as const;
export const ticketCarrier = carrierFrom(ticketSchema);
export type Ticket = FromSchema<typeof ticketSchema>;

export const poolSchema = {
  "$id": "gaming/pool",
  "title": "MatchPool",
  "description": "OpenMatch-class pool: an existing gaming/arena carrier plus a once-only ticket ledger. The pool is the admission surface for a concurrent game system; forming matches consumes queued tickets into gaming/match carriers.",
  "type": "object",
  "required": ["kind", "id", "arena", "matchSize", "tickets", "matchedTicketIds"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.lobby.pool" },
    "id": { "type": "string" },
    "arena": {
      "type": "object",
      "description": "Encoded gaming/arena carrier naming the game shape this pool admits players into."
    },
    "matchSize": { "type": "integer", "minimum": 2 },
    "tickets": {
      "type": "array",
      "items": { "$ref": "#/$defs/Ticket" }
    },
    "matchedTicketIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "The once-only delivery ledger: these tickets have already been consumed into matches."
    }
  },
  "$defs": {
    "Ticket": ticketSchema
  }
} as const;
export const poolCarrier = carrierFrom(poolSchema);
export type Pool = FromSchema<typeof poolSchema>;

export const ticketAdmissionSchema = {
  "$id": "gaming/ticket-admission",
  "title": "TicketAdmission",
  "description": "The result of queuing a player into a pool. Replayed queue attempts return the existing ticket with accepted=false, preserving once-only admission.",
  "type": "object",
  "required": ["kind", "accepted", "reason", "ticket", "pool"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.lobby.ticket-admission" },
    "accepted": { "type": "boolean" },
    "reason": { "enum": ["queued", "already-queued", "already-matched"] },
    "ticket": { "$ref": "#/$defs/Ticket" },
    "pool": { "$ref": "#/$defs/Pool" }
  },
  "$defs": {
    "Ticket": ticketSchema,
    "Pool": poolSchema
  }
} as const;
export const ticketAdmissionCarrier = carrierFrom(ticketAdmissionSchema);
export type TicketAdmission = FromSchema<typeof ticketAdmissionSchema>;

export const matchmakingResultSchema = {
  "$id": "gaming/matchmaking-result",
  "title": "MatchmakingResult",
  "description": "The pool -> ticket -> match transition: a new pool with consumed-ticket ledger advanced plus formed gaming/match carriers. Re-running on the returned pool forms no duplicate matches.",
  "type": "object",
  "required": ["kind", "pool", "matches"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.lobby.matchmaking" },
    "pool": { "$ref": "#/$defs/Pool" },
    "matches": {
      "type": "array",
      "items": { "$ref": "#/$defs/Match" }
    }
  },
  "$defs": {
    "Pool": poolSchema,
    "Match": matchSchema
  }
} as const;
export const matchmakingResultCarrier = carrierFrom(matchmakingResultSchema);
export type MatchmakingResult = FromSchema<typeof matchmakingResultSchema>;

export const libp2pSwarmSchema = {
  "$id": "gaming/libp2p-swarm",
  "title": "Libp2pSwarm",
  "description": "libp2p as gaming's many-agent arena transport: peer ids are FSym locus names; the peerstore and DHT are the coherent arena roster; the arena is the existing gaming/arena carrier over those peer names. This is a protocol algebra projection, not a real libp2p runtime binding.",
  "type": "object",
  "required": ["kind", "id", "peers", "peerstore", "dht", "arena"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.libp2p.swarm" },
    "id": { "type": "string" },
    "peers": {
      "type": "array",
      "items": { "$ref": "#/$defs/Peer" }
    },
    "peerstore": {
      "type": "array",
      "items": { "$ref": "#/$defs/RosterEntry" }
    },
    "dht": {
      "type": "array",
      "items": { "$ref": "#/$defs/RosterEntry" }
    },
    "arena": {
      "type": "object",
      "description": "Encoded gaming/arena carrying the FSym roster symmetry."
    }
  },
  "$defs": {
    "Peer": {
      "type": "object",
      "required": ["kind", "peerId", "locus"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.libp2p.peer" },
        "peerId": { "type": "string" },
        "locus": { "type": "string" }
      }
    },
    "RosterEntry": {
      "type": "object",
      "required": ["kind", "peerId", "event"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.libp2p.roster-entry" },
        "peerId": { "type": "string" },
        "event": { "type": "string" }
      }
    }
  }
} as const;
export const libp2pSwarmCarrier = carrierFrom(libp2pSwarmSchema);
export type Libp2pSwarm = FromSchema<typeof libp2pSwarmSchema>;

export const libp2pStreamSchema = {
  "$id": "gaming/libp2p-stream",
  "title": "Libp2pStream",
  "description": "A libp2p multiplexed stream as FSym name-passing into a sub-arena. Dialing names source and target peer loci; multiplexing opens a stream sub-arena whose non-trivial symmetry is the peer-name transposition.",
  "type": "object",
  "required": ["kind", "streamId", "protocol", "source", "target", "multiplexed", "namePassing", "subArena"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.libp2p.stream" },
    "streamId": { "type": "string" },
    "protocol": { "type": "string" },
    "source": { "type": "string" },
    "target": { "type": "string" },
    "multiplexed": { "const": true },
    "namePassing": { "$ref": "#/$defs/FinitePermutation" },
    "subArena": {
      "type": "object",
      "description": "Encoded gaming/arena for this stream's source/target sub-arena."
    }
  },
  "$defs": {
    "FinitePermutation": {
      "type": "object",
      "required": ["kind", "mappings"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "game.nominal.fsym.permutation" },
        "mappings": {
          "type": "array",
          "items": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 2,
            "maxItems": 2
          }
        }
      }
    }
  }
} as const;
export const libp2pStreamCarrier = carrierFrom(libp2pStreamSchema);
export type Libp2pStream = FromSchema<typeof libp2pStreamSchema>;

export const libp2pPubsubSchema = {
  "$id": "gaming/libp2p-pubsub",
  "title": "Libp2pPubsub",
  "description": "libp2p pubsub as concurrent broadcast over the swarm roster. Delivery is sorted by peer name, so permuting join order under arena FSym symmetry yields the same broadcast set.",
  "type": "object",
  "required": ["kind", "topic", "messageId", "from", "deliveries", "broadcast", "symmetryInvariant"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.libp2p.pubsub" },
    "topic": { "type": "string" },
    "messageId": { "type": "string" },
    "from": { "type": "string" },
    "deliveries": {
      "type": "array",
      "items": { "$ref": "#/$defs/Delivery" }
    },
    "broadcast": { "const": true },
    "symmetryInvariant": { "const": true }
  },
  "$defs": {
    "Delivery": {
      "type": "object",
      "required": ["kind", "topic", "messageId", "from", "to"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.libp2p.pubsub.delivery" },
        "topic": { "type": "string" },
        "messageId": { "type": "string" },
        "from": { "type": "string" },
        "to": { "type": "string" }
      }
    }
  }
} as const;
export const libp2pPubsubCarrier = carrierFrom(libp2pPubsubSchema);
export type Libp2pPubsub = FromSchema<typeof libp2pPubsubSchema>;

export const verificationTournamentSchema = {
  "$id": "gaming/verification-tournament",
  "title": "VerificationTournament",
  "description": "A claim-vs-refutation tournament owned by gaming: claims are Dialectica witnesses, refutations are challenges, organizing's organization/theatre signal can supply the social roster, agents are libp2p/FSym peer names, matchmake forms once-only brackets, and the dominance seed is settled by gaming/reachability into a Nash-style fixed-point certificate for the surviving claim. This is a Built+green carrier over existing gaming surfaces with a narrow Lean-backed certificate theorem; the full Dialectica/Nash correspondence remains Roadmap.",
  "type": "object",
  "required": [
    "kind",
    "id",
    "swarm",
    "dialectica",
    "transport",
    "matchmaking",
    "plays",
    "dominanceSeed",
    "equilibrium",
    "namedEquilibrium",
    "verdict",
    "survivingClaims",
    "certificate"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "gaming.verification.tournament" },
    "id": { "type": "string" },
    "swarm": {
      "type": "object",
      "description": "The gaming/libp2p-swarm projection used as the organizing-supplied peer roster."
    },
    "dialectica": {
      "type": "object",
      "required": ["kind", "witnesses", "challenges", "arena"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.dialectica" },
        "witnesses": { "type": "array", "items": { "type": "string" } },
        "challenges": { "type": "array", "items": { "type": "string" } },
        "arena": {
          "type": "object",
          "description": "The encoded gaming/arena image of F: Dial(Eff) -> CGS."
        }
      }
    },
    "transport": {
      "type": "object",
      "required": ["kind", "swarm", "source", "messages"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.transport" },
        "swarm": { "const": "gaming.libp2p.structural-swarm" },
        "source": { "enum": ["agents", "swarm", "organization-signal"] },
        "organizationSignal": { "$ref": "#/$defs/OrganizationSignal" },
        "messages": {
          "type": "array",
          "items": { "$ref": "#/$defs/SwarmMessage" }
        }
      }
    },
    "matchmaking": {
      "type": "object",
      "description": "The gaming/matchmaking-result carrier produced by the existing matchmaker."
    },
    "plays": {
      "type": "array",
      "items": { "$ref": "#/$defs/VerificationPlay" }
    },
    "dominanceSeed": { "type": "string" },
    "equilibrium": {
      "type": "object",
      "description": "The gaming/reachability fixed-point reading over the dominance seed."
    },
    "namedEquilibrium": { "$ref": "#/$defs/VerificationEquilibrium" },
    "verdict": { "enum": ["survived", "refuted", "contested"] },
    "survivingClaims": { "type": "array", "items": { "type": "string" } },
    "certificate": { "$ref": "#/$defs/NashCertificate" }
  },
  "$defs": {
    "VerificationPlay": {
      "type": "object",
      "required": ["kind", "claim", "refutation", "winner", "loser", "verdict", "match"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.play" },
        "claim": { "type": "string" },
        "refutation": { "type": "string" },
        "winner": { "type": "string" },
        "loser": { "type": "string" },
        "verdict": { "enum": ["claim-survives", "claim-refuted"] },
        "match": { "$ref": "#/$defs/VerificationPlayMatch" }
      }
    },
    "VerificationPlayMatch": {
      "type": "object",
      "required": [
        "kind",
        "matchId",
        "pool",
        "claimAgent",
        "refutationAgent",
        "playerIds",
        "ticketIds",
        "matchmaking",
        "stream"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.play-match" },
        "matchId": { "type": "string" },
        "pool": { "type": "string" },
        "claimAgent": { "type": "string" },
        "refutationAgent": { "type": "string" },
        "playerIds": { "type": "array", "items": { "type": "string" }, "minItems": 2 },
        "ticketIds": { "type": "array", "items": { "type": "string" }, "minItems": 2 },
        "matchmaking": {
          "type": "object",
          "description": "The pairwise gaming/matchmaking-result carrier that bracketed this claim/refutation play."
        },
        "stream": {
          "type": "object",
          "description": "The gaming/libp2p-stream projection that carries the matched play between the claim and refutation agents."
        }
      }
    },
    "SwarmMessage": {
      "type": "object",
      "required": ["kind", "topic", "messageId", "from", "about", "phase", "deliveryCount", "pubsub"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.swarm-message" },
        "topic": { "type": "string" },
        "messageId": { "type": "string" },
        "from": { "type": "string" },
        "about": { "type": "string" },
        "phase": { "enum": ["claim", "refutation", "play"] },
        "deliveryCount": { "type": "integer", "minimum": 0 },
        "pubsub": {
          "type": "object",
          "description": "The gaming/libp2p-pubsub projection for this tournament message."
        }
      }
    },
    "OrganizationSignal": {
      "type": "object",
      "required": [
        "kind",
        "sourceKind",
        "identity",
        "observer",
        "peerIds",
        "members",
        "glued",
        "coordination",
        "activeClaims",
        "peerClaims",
        "activityPubActors"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.organization-signal" },
        "sourceKind": { "type": ["string", "null"] },
        "identity": { "type": ["string", "null"] },
        "observer": { "type": ["string", "null"] },
        "peerIds": { "type": "array", "items": { "type": "string" } },
        "members": { "type": ["integer", "null"], "minimum": 0 },
        "glued": { "type": ["boolean", "null"] },
        "coordination": { "type": ["string", "null"] },
        "activeClaims": { "type": "integer", "minimum": 0 },
        "peerClaims": { "type": "integer", "minimum": 0 },
        "activityPubActors": { "type": ["integer", "null"], "minimum": 0 }
      }
    },
    "StrategySettlement": {
      "type": "object",
      "required": ["kind", "id", "role", "wins", "losses", "standing"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.strategy-settlement" },
        "id": { "type": "string" },
        "role": { "enum": ["claim", "refutation"] },
        "wins": { "type": "integer", "minimum": 0 },
        "losses": { "type": "integer", "minimum": 0 },
        "standing": { "enum": ["dominant", "dominated", "contested", "unplayed"] }
      }
    },
    "VerificationEquilibrium": {
      "type": "object",
      "required": ["kind", "fixedPoint", "pure", "mixed", "stableStrategies", "strategies", "correspondence"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.equilibrium" },
        "fixedPoint": { "type": "boolean" },
        "pure": { "type": "boolean" },
        "mixed": { "type": "boolean" },
        "stableStrategies": { "type": "array", "items": { "type": "string" } },
        "settledStrategy": { "type": "string" },
        "settledRole": { "enum": ["claim", "refutation"] },
        "strategies": {
          "type": "array",
          "items": { "$ref": "#/$defs/StrategySettlement" }
        },
        "correspondence": {
          "type": "object",
          "required": [
            "kind",
            "verdict",
            "dialecticaWitnessSurvives",
            "equilibriumMatchesSurvivor"
          ],
          "additionalProperties": false,
          "properties": {
            "kind": { "const": "gaming.verification.equilibrium-correspondence" },
            "verdict": { "enum": ["survived", "refuted", "contested"] },
            "survivingClaim": { "type": "string" },
            "settledStrategy": { "type": "string" },
            "dialecticaWitnessSurvives": { "type": "boolean" },
            "equilibriumMatchesSurvivor": { "type": "boolean" }
          }
        }
      }
    },
    "NashCertificate": {
      "type": "object",
      "required": [
        "kind",
        "stable",
        "fixedPoint",
        "noProfitableDeviation",
        "dialecticaWitnessSurvives",
        "correspondence",
        "proof",
        "formalization",
        "evidence",
        "theorem",
        "maturity"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.nash-certificate" },
        "stable": { "type": "boolean" },
        "fixedPoint": { "type": "boolean" },
        "noProfitableDeviation": { "type": "boolean" },
        "dialecticaWitnessSurvives": { "type": "boolean" },
        "correspondence": { "type": "boolean" },
        "equilibriumStrategy": { "type": "string" },
        "survivingClaim": { "type": "string" },
        "proof": { "$ref": "#/$defs/ProofWitness" },
        "formalization": { "$ref": "#/$defs/FormalizationBoundary" },
        "evidence": { "type": "array", "items": { "type": "string" } },
        "theorem": { "const": "monotone-settling-no-non-trivial-periodic-orbits" },
        "maturity": { "const": "Built+green" }
      }
    },
    "FormalizationBoundary": {
      "type": "object",
      "required": [
        "kind",
        "namedLaw",
        "certificateTheorem",
        "certificateTheoremMaturity",
        "certificateMaturity",
        "leanMaturity",
        "proofBoundary",
        "obligation",
        "leanArtifacts",
        "evidence"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.formalization-boundary" },
        "namedLaw": { "const": "monotone-settling-no-non-trivial-periodic-orbits" },
        "certificateTheorem": { "const": "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading" },
        "certificateTheoremMaturity": { "const": "Proven-in-Lean" },
        "certificateMaturity": { "const": "Built+green" },
        "leanMaturity": { "const": "Roadmap" },
        "proofBoundary": { "const": "finite-runtime-certificate-not-lean-theorem" },
        "obligation": { "const": "formalize-verification-tournament-fixed-point-correspondence" },
        "leanArtifacts": {
          "type": "array",
          "items": {
            "enum": [
              "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
              "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_obligations",
              "RelMath.Gaming.VerificationTournament.settled_verdict_of_closure_certificate"
            ]
          },
          "minItems": 1
        },
        "evidence": { "type": "string" }
      }
    },
    "ProofWitness": {
      "type": "object",
      "required": ["kind", "stable", "fixedPoint", "correspondsToSurvivor", "obligations"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.proof-witness" },
        "stable": { "type": "boolean" },
        "fixedPoint": { "type": "boolean" },
        "correspondsToSurvivor": { "type": "boolean" },
        "obligations": {
          "type": "array",
          "items": { "$ref": "#/$defs/ProofStep" }
        }
      }
    },
    "ProofStep": {
      "type": "object",
      "required": ["kind", "obligation", "satisfied", "maturity", "evidence"],
      "additionalProperties": false,
      "properties": {
        "kind": { "const": "gaming.verification.proof-step" },
        "obligation": {
          "enum": [
            "dialectica-object-map",
            "transport-roster-witnessed",
            "matchmaking-once-only",
            "strategy-play-witnessed",
            "monotone-fixed-point",
            "nash-stability",
            "survivor-correspondence"
          ]
        },
        "satisfied": { "type": "boolean" },
        "maturity": { "enum": ["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"] },
        "evidence": { "type": "string" }
      }
    }
  }
} as const;
export const verificationTournamentCarrier = carrierFrom(verificationTournamentSchema);
export type VerificationTournament = FromSchema<typeof verificationTournamentSchema>;
