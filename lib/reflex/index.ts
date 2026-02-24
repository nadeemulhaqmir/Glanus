/**
 * REFLEX Module — Public API
 * 
 * Autonomous action engine that resolves issues with
 * trust, transparency, and precision.
 */

export {
    assessConsequence,
    getRules,
    saveRule,
    deleteRule,
    getActionQueue,
    processRecommendation,
    executeAction,
} from './automation';

export type {
    AutonomyLevel,
    AutomationRule,
    AutomationTrigger,
    AutomationAction,
    ConsequenceAssessment,
    ActionQueueItem,
} from './automation';
