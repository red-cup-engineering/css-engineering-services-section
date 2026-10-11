import ObsmetrologiaComputing.CausalityPacket
import ObsmetrologiaComputing.GameTheory.VerificationTournament
import ObsmetrologiaPhysicalScience.ReactionNetworks.Entropy

namespace BrokerageControl.AlphaSelection

open Obsmetrologia
open Obsmetrologia.GameTheory.VerificationTournament
open Obsmetrologia.ReactionNetworks

/--
The proof-bearing boundary for promoting a paper strategy.

This does not claim market alpha.  It proves that a promotion assembled from
the supplied witnesses is simultaneously:

* a settled verification-tournament survivor;
* non-increasing in the Obsmetrologia entropy of its evidence state;
* presented at the contracted causal boundary; and
* free of a self-reaching event in the supplied causal carrier.
-/
structure PaperPromotionCertificate
    {Species E Q Boundary : Type}
    (cl : Reading.Closure)
    (seed : Reading)
    (cert : Certificate)
    (univ : List Species)
    (before after : State Species)
    (R : Computing.CausalCarrierReadout E Q Boundary)
    (packet : Computing.CausalityPacket R) : Prop where
  tournamentSettled : SettledVerdict cl seed cert
  evidenceEntropyNonincreasing : entropyH univ after ≤ entropyH univ before
  contractedBoundaryPresented : packet.presentation = R.boundaryPresentation
  noSelfReachingEvent : ∀ e : E, ¬ R.Reaches e e

theorem paper_promotion_certificate_of_witnesses
    {Species E Q Boundary : Type}
    (cl : Reading.Closure)
    (seed : Reading)
    (cert : Certificate)
    (univ : List Species)
    (before after : State Species)
    (R : Computing.CausalCarrierReadout E Q Boundary)
    (packet : Computing.CausalityPacket R)
    {k : Nat}
    (hk : 1 ≤ k)
    (hcycle : Reading.iter cl.op k seed = seed)
    (hNoDeviation : cert.noProfitableDeviation)
    (hWitness : cert.dialecticaWitnessSurvives)
    (hCorresponds : cert.equilibriumMatchesSurvivor)
    (hRelaxation : RelaxesVia univ before after) :
    PaperPromotionCertificate cl seed cert univ before after R packet := by
  refine {
    tournamentSettled := ?_
    evidenceEntropyNonincreasing := entropyH_le_of_relaxes hRelaxation
    contractedBoundaryPresented := Computing.causalityPacket_is_boundary_presentation packet
    noSelfReachingEvent := R.reaches_irrefl
  }
  exact settled_verdict_of_closure_certificate
    cl seed hk hcycle cert hNoDeviation hWitness hCorresponds

/-- Finite, serializable projection checked for each runtime promotion. -/
structure RuntimePromotionReading where
  folds : Nat
  candidateNetPnl : List Int
  incumbentNetPnl : List Int
  minimumImprovement : Int
  candidateDrawdown : List Int
  maximumDrawdown : Int
  beforeEntropyRank : Nat
  afterEntropyRank : Nat
  quartetActive : Bool
  causalBoundaryPresented : Bool
  noFutureLeakage : Bool
  noSelfReachingEvent : Bool
  tournamentFixedPoint : Bool
  noProfitableDeviation : Bool
  dialecticaWitnessSurvives : Bool
  equilibriumMatchesSurvivor : Bool
  deriving Repr

def improvementsCheck (minimum : Int) : List Int → List Int → Bool
  | [], [] => true
  | candidate :: candidates, incumbent :: incumbents =>
      decide (incumbent + minimum ≤ candidate) &&
        improvementsCheck minimum candidates incumbents
  | _, _ => false

def runtimePromotionCheck (r : RuntimePromotionReading) : Bool :=
  decide (2 ≤ r.folds) &&
  decide (r.candidateNetPnl.length = r.folds) &&
  decide (r.incumbentNetPnl.length = r.folds) &&
  decide (r.candidateDrawdown.length = r.folds) &&
  improvementsCheck r.minimumImprovement
    r.candidateNetPnl r.incumbentNetPnl &&
  r.candidateDrawdown.all (fun drawdown =>
    decide (drawdown ≤ r.maximumDrawdown)) &&
  decide (r.afterEntropyRank ≤ r.beforeEntropyRank) &&
  r.quartetActive &&
  r.causalBoundaryPresented &&
  r.noFutureLeakage &&
  r.noSelfReachingEvent &&
  r.tournamentFixedPoint &&
  r.noProfitableDeviation &&
  r.dialecticaWitnessSurvives &&
  r.equilibriumMatchesSurvivor

def RuntimePromotionAdmissible (r : RuntimePromotionReading) : Prop :=
  runtimePromotionCheck r = true

end BrokerageControl.AlphaSelection

#print axioms BrokerageControl.AlphaSelection.paper_promotion_certificate_of_witnesses
