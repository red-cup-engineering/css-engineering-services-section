/**
 * governing — stage 4 of the descent and the interior agent it settles to.
 *
 * `individuate` reads the finite/individual carrier (the glued sheaf, H¹=0); the
 * agent module builds the interior agent that IS that sheaf, read as a
 * perceive→act loop, with the spiral re-entry (`reseed`) it re-poses itself by.
 */
export { individuate } from "./individuate.mjs";
export type { Governing } from "./carriers.mjs";
export {
  classifySkillfulWork,
  jointProjection,
  advanceMeaning,
  advanceExecution,
  CLOSURE_OF_KIND,
  SKILLFUL_WORK_KINDS,
  type SkillfulWork,
  type SkillfulWorkKind,
  type WorkClosure,
} from "./skillful-work.mjs";
export {
  skill,
  invokeSkill,
  skillSuccess,
  skillError,
  type Perform,
  type SkillErrorClass,
} from "./skill.mjs";
export {
  SKILL_PLAY_ATTRIBUTE_KIND,
  SKILL_PLAY_FEED,
  skillEcologyLogReading,
  skillPlayFeed,
  skillPlayWitness,
  witnessSkillPlay,
  readSkillPlayWitnesses,
  candidateSkillsFromWitnessLog,
  skillEcologyTraceFromWitnessLog,
  skillPracticeFromWitnessLog,
  skillObstructionsFromWitnessLog,
  induceSkillsFromWitnessLog,
  publishSkillEcology,
  closeWitnessedSkillLoop,
  type SkillEcologyTheory,
  type SkillLearningRegime,
  type MeadActPhase,
  type MorrisSemioticAxis,
  type SkillOptionPolicy,
  type SkillEcologyTrace,
  type SkillPlayObservation,
  type SkillPracticeProfile,
  type SkillObstruction,
  type SkillCapabilityProjection,
  type SkillPublicationSurface,
  type CandidateSkill,
  type SkillInductionReport,
  type SkillInductionOptions,
  type WitnessedSkillLoopInput,
  type WitnessedSkillLoop,
} from "./skill-induction.mjs";
export { agentCarrier, skillCarrier } from "./carriers.mjs";
export type { Skill, SkillResult } from "./carriers.mjs";
export {
  buildAgent,
  agent,
  perceive,
  act,
  reseed,
  type GoalInput,
  type AgentOptions,
  type ActOutput,
  type Agent,
  type Goal,
} from "./agent.mjs";
