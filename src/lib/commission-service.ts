// Re-export the enhanced commission service as the default commission service
export { enhancedCommissionService as commissionService } from './enhanced-commission-service';
export { 
  EnhancedCommissionService as CommissionService,
  type CommissionCalculation,
  type CommissionBreakdown,
  type CommissionRule
} from './enhanced-commission-service';
