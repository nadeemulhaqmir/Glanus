/**
 * CORTEX Module — Public API
 * 
 * Multi-model reasoning engine that understands cause, context,
 * and consequence across your infrastructure.
 */

export { analyzeCause, buildRiskProfile } from './reasoning';
export type {
    CausalAnalysis,
    CausalLink,
    Recommendation,
    RiskProfile,
    RiskFactor,
    Explanation,
} from './reasoning';
