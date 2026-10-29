// src/tools/glossary-data.mjs
//
// Newbie-relevant EVE Online glossary, bundled as reference data for the
// explain_term tool (see market-tools.mjs) and for GUI hover-explanations
// (ROADMAP.md proposed feature 8, "Glossary / mentor mode"). Morgan is a
// newbie and is this project's design center (ROADMAP.md), so entries are
// written for a first-time capsuleer, not a veteran.
//
// Entries are hand-written from EVE Online domain knowledge and
// cross-checked against the live EVE University wiki
// (https://wiki.eveuniversity.org/) on 2026-08-05 — page titles and the
// facts attributed to them below (e.g. tax rates, security thresholds) were
// fetched and read at that time, not guessed. sourceUrl points at the
// canonical article for further reading; it is a "read more" pointer, not a
// verbatim quotation source, per the "different sources have different
// authority" principle in ROADMAP.md (an EVE Assist glossary entry and an
// EVE University wiki page are different kinds of evidence).
//
// Shape: { term, short, longer, sourceUrl, aliases? }
//   term      — canonical display form of the term
//   short     — one sentence, plain language
//   longer    — two to four sentences with the detail a newbie actually needs
//   sourceUrl — EVE University wiki page backing the entry
//   aliases   — optional array of alternate spellings/phrasings explain_term
//               will also match on (e.g. "highsec" -> "High-sec")

export const glossary = [
  {
    term: 'ISK',
    short: 'ISK (interstellar kredits) is EVE Online\'s primary in-game currency.',
    longer:
      'ISK is earned through missions, mining, trading, manufacturing, and countless ' +
      'other activities, and spent on ships, modules, skillbooks, and market fees. It ' +
      'has no fixed real-world value, but PLEX creates an informal ISK-to-real-money ' +
      'exchange rate through the market.',
    sourceUrl: 'https://wiki.eveuniversity.org/EVE_Lexicon',
  },
  {
    term: 'PLEX',
    short:
      'PLEX (Pilot\'s License Extension) is a tradeable item that pays for game time, ' +
      'in-game store purchases, or can be sold to other players for ISK.',
    longer:
      'CCP sells PLEX for real money; players can redeem it for 30 days of Omega ' +
      'subscription time, spend it in the in-game store, or sell it on the market for ' +
      'ISK, which is how most players fund subscriptions and cosmetics without paying ' +
      'twice.',
    sourceUrl: 'https://wiki.eveuniversity.org/Accounts',
  },
  {
    term: 'High-sec',
    short:
      'High-security space: systems with a security status of 0.5 or above, where ' +
      'CONCORD punishes unlawful aggression within seconds.',
    longer:
      'In hisec, CONCORD (an NPC police force) destroys ships that attack other ' +
      'players without a legal reason (a war, or a suspect/criminal flag) very quickly, ' +
      'though it cannot prevent the first hit — which is how a gank fleet can still ' +
      'kill an unsuspecting hauler before CONCORD arrives.',
    sourceUrl: 'https://wiki.eveuniversity.org/Security_status',
    aliases: ['hisec', 'highsec', 'high security', 'high sec'],
  },
  {
    term: 'Low-sec',
    short:
      'Low-security space: systems with a security status from 0.1 to 0.4, where ' +
      'CONCORD does not intervene but faction police may still punish criminals.',
    longer:
      'Lowsec sits between hisec and nullsec: players can freely engage each other ' +
      'without CONCORD retaliation, faction police only attack players with very ' +
      'negative security status, and gates aren\'t camped by NPCs — only by other ' +
      'players.',
    sourceUrl: 'https://wiki.eveuniversity.org/Security_status',
    aliases: ['lowsec', 'low security', 'low sec'],
  },
  {
    term: 'Null-sec',
    short:
      'Null-security space: systems with a security status of 0.0 or below, where ' +
      'CONCORD and faction police do not operate at all.',
    longer:
      'Nullsec is largely player-controlled through sovereignty and is where the ' +
      'biggest fleet battles, richest resources, and highest risks in the game are ' +
      'found; short of the game\'s own rules, anything goes.',
    sourceUrl: 'https://wiki.eveuniversity.org/Security_status',
    aliases: ['nullsec', 'null security', 'null sec'],
  },
  {
    term: 'Gank',
    short:
      'An unprovoked, deliberately fatal attack on another player\'s ship, usually in ' +
      'hisec, accepting CONCORD\'s retaliation as a cost of doing business.',
    longer:
      'A "suicide gank" sacrifices the attacker\'s own ship (which CONCORD destroys ' +
      'moments after the kill) to destroy a much more valuable target — typically an ' +
      'AFK miner or a hauler carrying valuable cargo. Newbies most often meet ganking ' +
      'as the reason a seemingly "safe" hisec belt or trade route wasn\'t safe at all.',
    sourceUrl: 'https://wiki.eveuniversity.org/Suicide_ganking',
    aliases: ['ganking', 'suicide gank', 'ganked'],
  },
  {
    term: 'Warp',
    short:
      'The primary faster-than-light travel method within a single solar system, used ' +
      'to move between celestial objects, gates, and bookmarks.',
    longer:
      'A ship must align to its destination and accelerate to 75% of its maximum ' +
      'velocity before it can enter warp; once warping it is untargetable, then ' +
      'decelerates on arrival. Warp is always intra-system — moving between systems ' +
      'requires a stargate jump (or, for capitals, a jump drive).',
    sourceUrl: 'https://wiki.eveuniversity.org/Warp',
  },
  {
    term: 'Align time',
    short:
      'The time a ship takes to accelerate to 75% of its top speed before it can enter ' +
      'warp.',
    longer:
      'Align time is set by a ship\'s mass and agility (inertia modifier), and is the ' +
      'main number newbies should watch when fitting for survivability: a ' +
      'fast-aligning ship spends less time vulnerable on grid before escaping into ' +
      'warp. "Insta-align" colloquially means aligning in about 2 seconds or less.',
    sourceUrl: 'https://wiki.eveuniversity.org/Warp_mechanics',
    aliases: ['align', 'alignment time'],
  },
  {
    term: 'Dscan',
    short:
      'The directional scanner: a built-in ship instrument that detects ships, ' +
      'structures, drones, and wrecks up to 14 AU away in a chosen direction.',
    longer:
      'Dscan cannot see cloaked ships and doesn\'t give exact distances or bearings ' +
      'without narrowing the scan angle, but it\'s the cheapest, most-used ' +
      'situational-awareness tool in the game — pilots check it constantly before ' +
      'undocking, warping, or engaging.',
    sourceUrl: 'https://wiki.eveuniversity.org/Directional_scanning',
    aliases: ['directional scanner', 'd-scan', 'd scan'],
  },
  {
    term: 'Killmail',
    short:
      'An automatically generated record of a ship\'s destruction, showing the ' +
      'victim, attackers, location, time, fit, and estimated ISK value lost.',
    longer:
      'Killmails are the basic unit of combat evidence in EVE — sites like ' +
      'zKillboard aggregate them for public viewing, and EVE Assist\'s planned ' +
      'loss-autopsy feature reads a killmail to explain in plain language what killed ' +
      'you and why.',
    sourceUrl: 'https://wiki.eveuniversity.org/Killmail',
  },
  {
    term: 'Clone',
    short:
      'A backup body stored at a station that lets a pilot instantly relocate their ' +
      'consciousness there, skipping travel time.',
    longer:
      'Jumping to a clone keeps your skills and standings but leaves your current ' +
      'ship, items, and any implants behind (fitted to whichever clone you leave). ' +
      'It\'s commonly used to stage in a remote region or to protect an expensive ' +
      'implant set from being lost with a pod.',
    sourceUrl: 'https://wiki.eveuniversity.org/Jump_clones',
    aliases: ['jump clone'],
  },
  {
    term: 'Skill queue',
    short:
      'The ordered list of skills a character is currently training, processed one ' +
      'after another in real time even while offline.',
    longer:
      'Training happens continuously as long as the queue isn\'t empty (Omega ' +
      'characters can queue skills far in advance; Alpha clones have shorter queue ' +
      'limits), so keeping the queue filled is one of the simplest ways to make ' +
      'steady long-term progress.',
    sourceUrl: 'https://wiki.eveuniversity.org/Skill_Queue',
  },
  {
    term: 'Doctrine',
    short:
      'A standardized ship type and fit that fleet members are asked to bring, so a ' +
      'fleet fights as a predictable, complementary unit.',
    longer:
      'Doctrines let a fleet commander plan tactics around known damage types, ' +
      'ranges, and roles instead of a random mix of ships, and let corporations ' +
      'bulk-buy or reimburse a small set of hulls rather than everything members ' +
      'might otherwise fly.',
    sourceUrl: 'https://wiki.eveuniversity.org/Doctrines',
    aliases: ['fleet doctrine'],
  },
  {
    term: 'Undock',
    short:
      'Leaving a station (or, for player structures, an Upwell citadel) and ' +
      'returning to open space.',
    longer:
      'Undocking ends station invulnerability immediately; ships spawn along a fixed ' +
      'vector outside the station and are vulnerable to anything already waiting ' +
      'there, which is why checking dscan and local before undocking in dangerous ' +
      'space is standard practice.',
    sourceUrl: 'https://wiki.eveuniversity.org/Station_Geometry',
    aliases: ['undocking'],
  },
  {
    term: 'Station trading',
    short:
      'A trading strategy that buys and resells items within a single station, ' +
      'profiting from the spread between buy and sell orders without hauling ' +
      'anything.',
    longer:
      'It requires no travel risk, just patience, market fees (broker fee and sales ' +
      'tax), and enough capital and order slots to keep multiple items working at ' +
      'once — a common first trading strategy for newbies based near a major hub.',
    sourceUrl: 'https://wiki.eveuniversity.org/Station_Trading',
  },
  {
    term: 'Region',
    short:
      'The largest named subdivision of New Eden\'s map, made up of multiple ' +
      'constellations, each containing multiple solar systems.',
    longer:
      'Regions are the unit most market and logistics tools (including EVE Assist\'s ' +
      'market tools) report prices and routes by; New Eden spans thousands of star ' +
      'systems with stargate connections across dozens of regions of varying ' +
      'security.',
    sourceUrl: 'https://wiki.eveuniversity.org/New_Eden',
  },
  {
    term: 'Jump',
    short: 'Traveling from one solar system to an adjacent one through a stargate.',
    longer:
      'Arriving at a gate always drops a ship out of warp at range, and after ' +
      'jumping there is a short forced invulnerability ("gate cloak") until the ship ' +
      'moves or takes an action — the classic moment gate camps wait to strike.',
    sourceUrl: 'https://wiki.eveuniversity.org/Stargate',
    aliases: ['stargate jump', 'gate jump'],
  },
  {
    term: 'Gate camp',
    short:
      'A group of hostile ships stationed at a stargate, waiting to tackle and ' +
      'destroy whoever jumps through.',
    longer:
      'Camps are most common on well-traveled lowsec and nullsec routes; scouting ' +
      'ahead, checking dscan on arrival, and having an instant-align escape plan are ' +
      'the standard countermeasures. EVE Assist\'s system-activity tool is meant to ' +
      'help spot recent kill activity that hints at a camp before you jump in.',
    sourceUrl: 'https://wiki.eveuniversity.org/Gate_camps',
  },
  {
    term: 'Pod',
    short:
      'The capsule a pilot\'s consciousness rides in — and controls the ship through ' +
      '— once their ship is destroyed.',
    longer:
      'A pod is fast to lose and carries no combat capability; being "podded" ' +
      '(having the pod itself destroyed) is what actually kills the current clone ' +
      'and any implants fitted to it, which is why many pilots warp their pod away ' +
      'the instant their ship dies.',
    sourceUrl: 'https://wiki.eveuniversity.org/Capsule',
    aliases: ['capsule', 'podded'],
  },
  {
    term: 'Omega clone',
    short: 'The paid subscription state, which unlocks training and use of every skill in the game.',
    longer:
      'Omega time can be bought with real money or with PLEX bought from other ' +
      'players, and is required for some high-end activities (capital ships, certain ' +
      'skill levels) that Alpha clones cannot access at all.',
    sourceUrl: 'https://wiki.eveuniversity.org/Clone_states',
    aliases: ['omega'],
  },
  {
    term: 'Alpha clone',
    short:
      'The permanently free-to-play state, with a restricted set of trainable ' +
      'skills and lower skill point gain.',
    longer:
      'Alpha is not a time-limited trial — it\'s playable indefinitely — but several ' +
      'ship classes, skill levels, and activities are Omega-only, so most committed ' +
      'players eventually subscribe.',
    sourceUrl: 'https://wiki.eveuniversity.org/Clone_states',
    aliases: ['alpha'],
  },
  {
    term: 'Salvage',
    short:
      'Scrap components pulled from wrecks after a ship is destroyed, used to build ' +
      'rigs and other items.',
    longer:
      'Salvaging requires a salvager module and, usually, a tractor beam to pull ' +
      'wrecks into range; it\'s a low-skill, relatively safe way for newbies to earn ' +
      'ISK from wrecks left behind by mission runners or ratters.',
    sourceUrl: 'https://wiki.eveuniversity.org/Salvaging',
    aliases: ['salvaging'],
  },
  {
    term: 'Rat',
    short:
      'Slang for an NPC pirate or monster encountered in space, most often in ' +
      'asteroid belts, missions, or combat sites.',
    longer:
      '"Ratting" means killing rats for bounties and loot; belt rats are the small, ' +
      'low-threat spawns newbies meet first, while mission and nullsec rats scale up ' +
      'to genuinely dangerous NPC fleets.',
    sourceUrl: 'https://wiki.eveuniversity.org/Belt_rat',
    aliases: ['npc', 'ratting', 'belt rat'],
  },
  {
    term: 'Mission runner',
    short:
      'A player who repeatedly accepts and completes agent missions for ISK, ' +
      'standings, and loyalty points.',
    longer:
      'Missions are private PvE combat, courier, or trade tasks offered by NPC ' +
      'agents at stations; running them is one of the most structured, low-risk ' +
      'income sources for a new character.',
    sourceUrl: 'https://wiki.eveuniversity.org/Missions',
  },
  {
    term: 'Mining barge',
    short:
      'A dedicated mining ship class (Procurer, Retriever, Covetor) with much larger ' +
      'ore holds and mining bonuses than a mining frigate.',
    longer:
      'Barges trade combat capability and speed for yield and cargo, and their ' +
      'upgraded versions ("exhumers") push that further still; because they\'re ' +
      'slow and often flown semi-AFK, they\'re a classic gank target in hisec.',
    sourceUrl: 'https://wiki.eveuniversity.org/Mining_Barge',
  },
  {
    term: 'Venture',
    short:
      'A cheap, fast, Alpha-friendly mining frigate with an extra ore hold, mining ' +
      'bonuses, and a built-in resistance to being warp scrambled.',
    longer:
      'It\'s usually the first mining ship a new player flies, before graduating to ' +
      'a mining barge, thanks to its low cost and forgiving fit.',
    sourceUrl: 'https://wiki.eveuniversity.org/Venture',
  },
  {
    term: 'Frigate',
    short:
      'The smallest ship class: cheap, fast, and agile, used for tackle, ' +
      'exploration, early combat, and mining (Venture).',
    longer:
      'Frigates are the standard first combat ship for new pilots — inexpensive ' +
      'enough to lose without financial pain while learning the game\'s mechanics.',
    sourceUrl: 'https://wiki.eveuniversity.org/Frigate',
  },
  {
    term: 'Destroyer',
    short:
      'A ship class one size above frigates, trading some agility for extra ' +
      'turret/launcher slots and burst damage.',
    longer:
      'Destroyers are popular for cheap, high-DPS PvP fits and early mission ' +
      'running; specialized subtypes (command destroyers, tactical destroyers) add ' +
      'mobility or role-swapping tricks.',
    sourceUrl: 'https://wiki.eveuniversity.org/Destroyer',
  },
  {
    term: 'Cruiser',
    short:
      'A mid-size ship class balancing tank, damage, and cost, used across mining, ' +
      'mission running, exploration, and PvP doctrines.',
    longer:
      'Cruisers are usually a new pilot\'s step up once frigates and destroyers ' +
      'feel limiting, and remain relevant throughout the game via specialized ' +
      'variants (Heavy Assault Cruisers, Strategic Cruisers, and more).',
    sourceUrl: 'https://wiki.eveuniversity.org/Cruiser',
  },
  {
    term: 'CONCORD',
    short:
      'The NPC police force that punishes unlawful aggression in high-security ' +
      'space, usually by destroying the attacker within seconds.',
    longer:
      'CONCORD cannot prevent the first shot, only retaliate afterward — the ' +
      'loophole suicide ganks exploit — and it has no authority (and does not ' +
      'respond) in lowsec or nullsec.',
    sourceUrl: 'https://wiki.eveuniversity.org/CONCORD',
  },
  {
    term: 'Aggression timer',
    short:
      'A temporary flag that keeps a player "in combat" — vulnerable to further ' +
      'attack and unable to dock or jump safely for a period after fighting.',
    longer:
      'EVE layers several such timers (weapons timer, criminal timer, and others) ' +
      'depending on what happened and where; the practical takeaway for newbies is: ' +
      'if you\'ve recently fought or been aggressed, don\'t assume you can dock or ' +
      'warp away consequence-free.',
    sourceUrl: 'https://wiki.eveuniversity.org/Aggression',
    aliases: ['weapons timer', 'combat timer'],
  },
  {
    term: 'Safety setting',
    short:
      'A per-character setting (green/yellow/red) that restricts which of your own ' +
      'actions the client will let you take, to prevent accidental illegal or ' +
      'hostile actions.',
    longer:
      'On green safety you cannot accidentally shoot another player or steal from ' +
      'their wreck in a way that would flag you as a criminal; lowering it to yellow ' +
      'or red is a deliberate choice to allow riskier or more aggressive actions.',
    sourceUrl: 'https://wiki.eveuniversity.org/Safety_settings',
    aliases: ['safety'],
  },
  {
    term: 'Insurance',
    short:
      'A system where paying an upfront premium on a ship\'s hull refunds part of ' +
      'its value in ISK if it\'s destroyed.',
    longer:
      'Insurance only covers the base hull, never fitted modules or cargo, and ' +
      'payouts scale with the coverage tier purchased; it softens, but never ' +
      'eliminates, the ISK cost of a loss.',
    sourceUrl: 'https://wiki.eveuniversity.org/Insurance',
  },
  {
    term: 'Contract',
    short:
      'A player-created, formal agreement to exchange items, ISK, or courier ' +
      'services, enforced by the game rather than trust.',
    longer:
      'Contract types include item exchange (a fixed-price sale, including bundles ' +
      'the market can\'t handle), auctions, and courier contracts, each visible only ' +
      'to the parties or public region the creator chooses.',
    sourceUrl: 'https://wiki.eveuniversity.org/Contracts',
  },
  {
    term: 'Courier',
    short:
      'A contract that pays a hauler to move cargo from one location to another, ' +
      'backed by a collateral deposit.',
    longer:
      'The requester sets a reward and a collateral amount; if the hauler fails to ' +
      'deliver within the deadline, the requester keeps the collateral instead of ' +
      'the goods, which is what makes hiring a stranger to haul your items viable.',
    sourceUrl: 'https://wiki.eveuniversity.org/Contracts',
    aliases: ['courier contract'],
  },
  {
    term: 'Market order',
    short:
      'A standing offer to buy (buy order) or sell (sell order) a specific item at ' +
      'a specific price, posted at a station or structure\'s market.',
    longer:
      'Orders sit on the regional market until filled, expire, or are canceled; ' +
      'EVE Assist\'s market tools read these public order books to find best ' +
      'prices, compare hubs, and watch for undercuts.',
    sourceUrl: 'https://wiki.eveuniversity.org/Trading',
  },
  {
    term: 'Broker fee',
    short:
      'A percentage fee charged when placing a market order, whether or not it ever ' +
      'fills.',
    longer:
      'The base rate (around 3% at NPC stations) is reduced by standings and the ' +
      'Broker Relations skill; it\'s paid up front, unlike sales tax, which is only ' +
      'paid on a completed sale.',
    sourceUrl: 'https://wiki.eveuniversity.org/Tax',
  },
  {
    term: 'Sales tax',
    short: 'A percentage fee taken from the proceeds of a completed sell order.',
    longer:
      'The base rate is 7.5%, reduced by the Accounting skill and by standings; ' +
      'together with the broker fee it\'s the main cost of doing business as a ' +
      'trader, and the two combined are why "buy low, sell high" margins need to ' +
      'clear a real threshold to be profitable.',
    sourceUrl: 'https://wiki.eveuniversity.org/Tax',
    aliases: ['transaction tax'],
  },
  {
    term: 'Standings',
    short:
      'A -10 to +10 score representing how favorably an NPC corporation, faction, ' +
      'or agent regards a character.',
    longer:
      'Higher standings unlock better mission agents, lower broker fees and sales ' +
      'tax, and reduce how aggressively faction police react to a character\'s ' +
      'security status; standings are raised mainly by running missions and ' +
      'completing agent tasks for that faction.',
    sourceUrl: 'https://wiki.eveuniversity.org/Standings',
  },
  {
    term: 'Agent',
    short:
      'An NPC that offers missions and, for research agents, research points, ' +
      'usually stationed at a specific station.',
    longer:
      'Agents are ranked level 1 through 5 by difficulty/reward and gated by the ' +
      'standing a character has with their corporation or faction; running an ' +
      'agent\'s missions raises that standing over time, unlocking higher-level ' +
      'agents.',
    sourceUrl: 'https://wiki.eveuniversity.org/Agent',
  },
  {
    term: 'LP',
    short:
      'Loyalty points: a faction-specific currency earned mainly from missions, ' +
      'redeemable at that faction\'s LP store for ships, modules, blueprints, and ' +
      'other items.',
    longer:
      'LP has no direct ISK value — its worth depends entirely on what the issuing ' +
      'corporation\'s LP store sells and what those items resell for on the market ' +
      '— so "ISK per LP" is a common way traders and mission runners evaluate which ' +
      'agent to run.',
    sourceUrl: 'https://wiki.eveuniversity.org/Loyalty_Points',
    aliases: ['loyalty points'],
  },
  {
    term: 'Wormhole',
    short:
      'An unstable, randomly-connected passage between two systems, including ' +
      'systems in wormhole space (W-space) that don\'t appear on the normal star ' +
      'map.',
    longer:
      'Wormholes have a mass limit and a lifespan before collapsing, no local chat ' +
      'showing who\'s in system, and their own security quirks, making them a ' +
      'higher-risk, higher-reward environment popular with small, self-sufficient ' +
      'groups.',
    sourceUrl: 'https://wiki.eveuniversity.org/Wormhole_space',
  },
  {
    term: 'Incursion',
    short:
      'A temporary, high-value PvE invasion by the Sansha\'s Nation faction into a ' +
      'constellation, fought by player fleets for large ISK rewards.',
    longer:
      'Incursions form organically across New Eden, move between constellations ' +
      'over their lifespan, and are typically run by structured, high-DPS/' +
      'high-logistics community fleets rather than solo players.',
    sourceUrl: 'https://wiki.eveuniversity.org/Incursion',
  },
  {
    term: 'Abyssal',
    short:
      'Short for abyssal deadspace: a solo, instanced PvE pocket entered with an ' +
      'Abyssal Filament, containing escalating combat rooms and environmental ' +
      'hazards, with a strict time limit to escape.',
    longer:
      'Abyssal running rewards mutated modules and materials but is unforgiving of ' +
      'mistakes — there\'s no calling for help and no leaving early without losing ' +
      'the loot, so ships are usually fit specifically for it.',
    sourceUrl: 'https://wiki.eveuniversity.org/Abyssal_Deadspace',
    aliases: ['abyssal deadspace', 'abyss'],
  },
  {
    term: 'Faction warfare',
    short:
      'An opt-in, low-stakes war between the four empire factions that lets ' +
      'players fight over system control and earn LP for kills and objectives.',
    longer:
      'Joining locks a character to one side\'s militia, changes standings toward ' +
      'the opposing empires, and opens faction warfare complexes and LP rewards as ' +
      'an accessible entry point into large-scale PvP.',
    sourceUrl: 'https://wiki.eveuniversity.org/Faction_warfare',
    aliases: ['fw'],
  },
  {
    term: 'Sov',
    short:
      'Short for sovereignty: the system by which a player alliance claims and ' +
      'holds ownership of nullsec systems, usually via structures like the ' +
      'Sovereignty Hub.',
    longer:
      'Holding sov grants access to that system\'s resources and upgrades but ' +
      'requires ongoing structure defense and activity, which is why sovereignty ' +
      'warfare is one of the largest organized activities in the game.',
    sourceUrl: 'https://wiki.eveuniversity.org/Sovereignty',
    aliases: ['sovereignty'],
  },
  {
    term: 'Alliance',
    short:
      'A formal grouping of multiple corporations under a shared banner, usually ' +
      'for coordinated nullsec, wormhole, or large-scale PvP play.',
    longer:
      'Alliances share standings toward other alliances (wars, blues, enemies) and ' +
      'often share sovereignty, doctrines, and infrastructure across their member ' +
      'corporations.',
    sourceUrl: 'https://wiki.eveuniversity.org/Alliance',
  },
  {
    term: 'Corporation',
    short:
      'A player-run organization — EVE\'s equivalent of a guild — that members join ' +
      'for shared goals, infrastructure, and a group of people to play with.',
    longer:
      'Corporations range from small newbie-friendly groups to large nullsec power ' +
      'blocs; EVE University itself, the source of much of this glossary, is a ' +
      'corporation focused on teaching new players.',
    sourceUrl: 'https://wiki.eveuniversity.org/Corporation',
  },
  {
    term: 'Fleet',
    short:
      'A temporary group of pilots operating together under a fleet commander, ' +
      'with shared broadcasts, waypoints, and squad/wing structure.',
    longer:
      'Fleets range from a two-person mining op to hundred-plus-pilot nullsec ' +
      'battles; joining one is usually the fastest way for a newbie to safely ' +
      'experience higher-risk content.',
    sourceUrl: 'https://wiki.eveuniversity.org/Category:Fleets',
  },
  {
    term: 'Fitting',
    short:
      'The specific combination of modules, rigs, and ammo/drones loaded onto a ' +
      'ship for a given role.',
    longer:
      'A fit determines what a ship can actually do — its tank, damage, speed, and ' +
      'utility — and is usually the first thing more experienced players will ask ' +
      'about or critique when reviewing a loss or a plan.',
    sourceUrl: 'https://wiki.eveuniversity.org/Fitting',
  },
  {
    term: 'Tank',
    short:
      'A ship\'s ability to survive incoming damage, achieved by boosting and/or ' +
      'repairing one of its three defense pools: shield, armor, or hull.',
    longer:
      '"Buffer tanking" stacks raw hitpoints to survive burst damage; "active ' +
      'tanking" repairs damage in real time to survive sustained fights. Most ships ' +
      'are built to tank primarily through one layer while treating the others as ' +
      'backup.',
    sourceUrl: 'https://wiki.eveuniversity.org/Tanking',
    aliases: ['tanking'],
  },
  {
    term: 'Shield tank',
    short:
      'A tanking approach that boosts and/or actively repairs a ship\'s shield, its ' +
      'outermost and (for most races) primary defense layer.',
    longer:
      'Shield modules fit in the mid slots and typically don\'t compete with a ' +
      'ship\'s damage-dealing high or low slots, which is why Caldari and Minmatar ' +
      'ships are traditionally built around shield tanking.',
    sourceUrl: 'https://wiki.eveuniversity.org/Shield_tanking',
    aliases: ['shield tanking'],
  },
  {
    term: 'Armor tank',
    short:
      'A tanking approach that boosts and/or actively repairs a ship\'s armor ' +
      'layer, beneath its shield.',
    longer:
      'Armor modules fit in the low slots, competing with damage and fitting ' +
      'modules for the same slots — the classic trade-off Amarr and Gallente ships ' +
      '(traditionally armor-tanked) are built around.',
    sourceUrl: 'https://wiki.eveuniversity.org/Armor_tanking',
    aliases: ['armor tanking', 'armour tank'],
  },
  {
    term: 'Hull tank',
    short:
      'Relying on a ship\'s raw structural hitpoints as its last line of defense, ' +
      'after shield and armor are exhausted.',
    longer:
      'Very few fits tank primarily through the hull on purpose — it\'s mostly a ' +
      'last-resort buffer — though a handful of niche fits (and desperate last ' +
      'stands) deliberately stack bulkheads and hull hitpoints.',
    sourceUrl: 'https://wiki.eveuniversity.org/Tanking',
    aliases: ['hull tanking'],
  },
  {
    term: 'Capacitor',
    short:
      'A ship\'s onboard energy reserve, drained by most active modules (guns, ' +
      'repairers, propulsion) and recharged passively over time.',
    longer:
      'Running out of capacitor ("cap out") shuts down active modules until it ' +
      'recovers, which is why capacitor management — and capacitor warfare, which ' +
      'drains an enemy\'s cap remotely — is a core part of both PvE and PvP fitting.',
    sourceUrl: 'https://wiki.eveuniversity.org/Capacitor',
    aliases: ['cap'],
  },
  {
    term: 'Module',
    short:
      'An item fitted into one of a ship\'s high, mid, or low slots that changes ' +
      'what the ship can do.',
    longer:
      'Modules range from weapons and repairers to propulsion, electronic warfare, ' +
      'and utility systems; the full set fitted to a ship is its fitting, and ' +
      'figuring out how much of a ship\'s power grid/CPU/capacitor it costs is most ' +
      'of what fitting a ship involves.',
    sourceUrl: 'https://wiki.eveuniversity.org/Modules',
  },
  {
    term: 'Rig',
    short:
      'A permanent, non-removable upgrade fitted into a ship\'s rig slots, usually ' +
      'trading a drawback (like reduced cargo or targeting range) for a ' +
      'significant bonus.',
    longer:
      'Because rigs are destroyed (not returned) when unfit, they represent a more ' +
      'committed choice than regular modules, and are commonly used to specialize a ' +
      'hull for one role — a mining ship\'s ore hold, a combat ship\'s tank, and so ' +
      'on.',
    sourceUrl: 'https://wiki.eveuniversity.org/Rigs',
    aliases: ['rigging'],
  },
  {
    term: 'Drone',
    short:
      'A small robotic ship launched from a ship\'s drone bay to fight, mine, ' +
      'salvage, or provide other support autonomously.',
    longer:
      'Drones are directed to attack, mine, or return to bay by their pilot but act ' +
      'somewhat independently once launched, and are a major part of Gallente ship ' +
      'design in particular.',
    sourceUrl: 'https://wiki.eveuniversity.org/Drones',
  },
  {
    term: 'Ammo types',
    short:
      'Consumable charges loaded into turrets or missile launchers that determine ' +
      'a weapon\'s damage type, range, and tracking.',
    longer:
      'Each weapon system has its own family of ammunition — projectile ammunition ' +
      'for autocannons/artillery, hybrid charges for blasters/railguns, crystals ' +
      'for lasers, and missiles/rockets for launchers — with cheaper tiers trading ' +
      'damage for lower cost and higher tiers doing the reverse.',
    sourceUrl: 'https://wiki.eveuniversity.org/Projectile_ammunition',
    aliases: ['ammo', 'ammunition', 'charges'],
  },
  {
    term: 'Tackle',
    short:
      'Using modules like warp scramblers, disruptors, or webs to stop a target ' +
      'from warping away or slow it down.',
    longer:
      'A dedicated "tackler" — often a fast, cheap frigate — holds a target in ' +
      'place until the rest of the fleet arrives, making tackle one of the most ' +
      'valuable and lowest-cost roles a newbie can fly in a fleet.',
    sourceUrl: 'https://wiki.eveuniversity.org/Tackling',
  },
  {
    term: 'Warp scrambler',
    short:
      'A module that prevents its target from entering warp and, on most ships, ' +
      'also disables microwarpdrives.',
    longer:
      'It has shorter range than a warp disruptor and stacks with other scrambling ' +
      'effects; escaping one usually requires more warp-core-stabilizing strength ' +
      'than the attacker has scramble strength, or destroying/outlasting the ' +
      'tackler.',
    sourceUrl: 'https://wiki.eveuniversity.org/Warp_Scrambler',
    aliases: ['scram'],
  },
  {
    term: 'Cyno',
    short:
      'Short for cynosural field: a beacon effect that lights up a temporary ' +
      'jump-in point other ships can jump to.',
    longer:
      'Lighting a cyno announces your location to everyone in the system and is ' +
      'how capital fleets deploy or "lightspeed" ships in via jump portals; because ' +
      'it\'s so visible, cyno lighting is a common bait/trap tactic in null-sec and ' +
      'low-sec warfare.',
    sourceUrl: 'https://wiki.eveuniversity.org/Cynosural_Field',
    aliases: ['cynosural field'],
  },
  {
    term: 'Titan',
    short:
      'The largest and most expensive player-flyable ship class, capable of ' +
      'fitting a doomsday superweapon and, on most titans, generating jump ' +
      'bridges for a fleet.',
    longer:
      'Titans anchor major nullsec fleet battles and are a primary target/prize in ' +
      'them; losing one is a headline-level event precisely because of the ' +
      'enormous ISK and organizational investment they represent.',
    sourceUrl: 'https://wiki.eveuniversity.org/Titan',
  },
];
