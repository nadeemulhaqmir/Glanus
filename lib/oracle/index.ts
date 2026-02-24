/**
 * ORACLE Module — Public API
 * 
 * Prediction engine that forecasts failures, capacity,
 * and risk before they happen.
 */

export { forecastFailures, getCapacityIntelligence, getSLOStatus } from './predictions';
export type {
    FailureForecast,
    CapacityIntelligence,
    ResourceCapacity,
    SLOStatus,
} from './predictions';
