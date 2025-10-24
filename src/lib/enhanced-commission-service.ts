/**
 * Enhanced Commission Service
 * Handles agent commission calculation with product-specific rules and pre-tax calculations
 */
import { createServiceClient, isSupabaseServiceConfigured } from '../lib/supabase/server';
import type {
  AgentCommissionRule,
  OrderItem
} from '../lib/types';

import { logger } from './logger';

export interface CommissionCalculation {
  order_id: string;
  agent_id: string;
  pre_tax_amount: number;
  gst_amount: number;
  commission_rate: number;
  commission_amount: number;
  rule_id?: string;
  breakdown: CommissionBreakdown[];
}

export interface CommissionBreakdown {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate: number;
  commission_amount: number;
  rule_applied?: string;
}

export interface CommissionRule {
  agent_id?: string;
  product_id?: string;
  product_category?: string;
  commission_rate: number;
  min_order_value?: number;
  valid_from?: string;
  valid_to?: string;
}

export class EnhancedCommissionService {
  private supabase: ReturnType<typeof createServiceClient> | null;

  constructor() {
    this.supabase = isSupabaseServiceConfigured ? createServiceClient() : null;
    if (!this.supabase) {
      logger.warn('enhanced-commission-service.missing_supabase_config');
    }
  }

  /**
   * Calculate commission for an order
   */
  async calculateOrderCommission(
    orderId: string,
    agentId: string
  ): Promise<{
    success: boolean;
    calculation?: CommissionCalculation;
    error?: string;
  }> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.calculate.missing_supabase_config', { orderId, agentId });
        return {
          success: false,
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        };
      }

      // Get order details
  const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // Parse order items (supports legacy JSON string or structured payload)
      const rawItems = typeof order.items === 'string'
        ? JSON.parse(order.items || '[]')
        : order.items;

      const orderItems: OrderItem[] = Array.isArray(rawItems)
        ? rawItems as OrderItem[]
        : Array.isArray(rawItems?.cart_items)
          ? rawItems.cart_items as OrderItem[]
          : [];

      // Get agent commission rules
      const agentRules = await this.getAgentCommissionRules(agentId);

      // Calculate pre-tax amount (total excluding GST)
      const preTaxAmount = order.subtotal; // This should be the amount before GST
      const gstAmount = order.gst_amount;

      let totalCommission = 0;
      const breakdown: CommissionBreakdown[] = [];

      // Calculate commission for each item
      for (const item of orderItems) {
        const itemCommission = await this.calculateItemCommission(
          item,
          agentRules,
          preTaxAmount
        );

        totalCommission += itemCommission.commission_amount;
        breakdown.push(itemCommission);
      }

      // Apply minimum order value rules
      const finalCommissionRate = await this.getFinalCommissionRate(
        agentId,
        preTaxAmount,
        agentRules
      );

      const calculation: CommissionCalculation = {
        order_id: orderId,
        agent_id: agentId,
        pre_tax_amount: preTaxAmount,
        gst_amount: gstAmount,
        commission_rate: finalCommissionRate,
        commission_amount: Math.round(totalCommission * 100) / 100,
        breakdown
      };

      return {
        success: true,
        calculation
      };

    } catch (error) {
      logger.error('Error calculating commission', { error });
      return {
        success: false,
        error: 'Failed to calculate commission'
      };
    }
  }

  /**
   * Save commission record to database
   */
  async saveCommissionRecord(
    calculation: CommissionCalculation
  ): Promise<{
    success: boolean;
    commission_id?: string;
    error?: string;
  }> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.save.missing_supabase_config', { calculation });
        return {
          success: false,
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        };
      }

  const { data: commission, error } = await supabase
        .from('sales_agent_commissions')
        .insert([{
          agent_id: calculation.agent_id,
          order_id: calculation.order_id,
          commission_amount: calculation.commission_amount,
          commission_rate: calculation.commission_rate,
          order_total: calculation.pre_tax_amount + calculation.gst_amount,
          pre_tax_amount: calculation.pre_tax_amount,
          gst_amount: calculation.gst_amount,
          commission_rule_id: calculation.rule_id,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error saving commission record', { error });
        return {
          success: false,
          error: 'Failed to save commission record'
        };
      }

      // Update agent points balance
      await this.updateAgentPoints(calculation.agent_id, calculation.commission_amount);

      return {
        success: true,
        commission_id: commission.id
      };

    } catch (error) {
      logger.error('Error in saveCommissionRecord', { error });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get agent commission rules
   */
  private async getAgentCommissionRules(agentId: string): Promise<AgentCommissionRule[]> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.rules.missing_supabase_config', { agentId });
        return [];
      }

      const { data: rules, error } = await supabase
        .from('agent_commission_rules')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .gte('valid_to', new Date().toISOString());

      if (error) {
        logger.error('Error fetching commission rules', { error, agentId });
        return [];
      }

      return rules || [];

    } catch (error) {
      logger.error('Error in getAgentCommissionRules', { error, agentId });
      return [];
    }
  }

  /**
   * Calculate commission for individual order item
   */
  private async calculateItemCommission(
    item: OrderItem,
    agentRules: AgentCommissionRule[],
    _orderTotal: number
  ): Promise<CommissionBreakdown> {
    // Find applicable rule for this item
    let applicableRule = agentRules.find(rule => rule.product_id === item.productId);
    
    if (!applicableRule) {
      // Try to find by category (would need to fetch product details for category)
      applicableRule = agentRules.find(rule => 
        rule.product_category && !rule.product_id
      );
    }

    if (!applicableRule) {
      // Use default rule (no specific product or category)
      applicableRule = agentRules.find(rule => 
        !rule.product_id && !rule.product_category
      );
    }

    const commissionRate = applicableRule?.commission_rate || 5.0; // Default 5%
    const itemTotal = item.price * item.quantity;
    const commissionAmount = (itemTotal * commissionRate) / 100;

    return {
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: itemTotal,
      commission_rate: commissionRate,
      commission_amount: Math.round(commissionAmount * 100) / 100,
      rule_applied: applicableRule ? 'custom' : 'default'
    };
  }

  /**
   * Get final commission rate considering minimum order value
   */
  private async getFinalCommissionRate(
    agentId: string,
    orderTotal: number,
    rules: AgentCommissionRule[]
  ): Promise<number> {
    // Find rules that apply to the entire order (bonus rates for high-value orders)
    const orderLevelRules = rules.filter(rule => 
      !rule.product_id && 
      !rule.product_category && 
      rule.min_order_value && 
      orderTotal >= rule.min_order_value
    );

    if (orderLevelRules.length > 0) {
      // Return the highest applicable rate
      return Math.max(...orderLevelRules.map(rule => rule.commission_rate));
    }

    // Get agent's default commission rate
    const supabase = this.supabase;
    if (!supabase || !isSupabaseServiceConfigured) {
      logger.error('enhanced-commission-service.final-rate.missing_supabase_config', { agentId });
      return 5.0;
    }

    const { data: agent } = await supabase
      .from('sales_agents')
      .select('commission_rate')
      .eq('id', agentId)
      .single();

    return agent?.commission_rate || 5.0;
  }

  /**
   * Update agent points balance
   */
  private async updateAgentPoints(agentId: string, commissionAmount: number): Promise<void> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.points.missing_supabase_config', { agentId, commissionAmount });
        return;
      }

      // Convert commission to points (1 INR = 1 point)
      const pointsToAdd = commissionAmount;

      // Get current points balance
      const { data: agent } = await supabase
        .from('sales_agents')
        .select('points_balance')
        .eq('id', agentId)
        .single();

      if (agent) {
        const newBalance = (agent.points_balance || 0) + pointsToAdd;
        
        await supabase
          .from('sales_agents')
          .update({ points_balance: newBalance })
          .eq('id', agentId);
      }

    } catch (error) {
      logger.error('Error updating agent points', { error, agentId, commissionAmount });
    }
  }

  /**
   * Create or update commission rule
   */
  async createCommissionRule(rule: CommissionRule): Promise<{
    success: boolean;
    rule_id?: string;
    error?: string;
  }> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.create-rule.missing_supabase_config', { rule });
        return {
          success: false,
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        };
      }

      const { data: newRule, error } = await supabase
        .from('agent_commission_rules')
        .insert([{
          agent_id: rule.agent_id,
          product_id: rule.product_id,
          product_category: rule.product_category,
          commission_rate: rule.commission_rate,
          min_order_value: rule.min_order_value,
          valid_from: rule.valid_from || new Date().toISOString(),
          valid_to: rule.valid_to,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating commission rule', { error, rule });
        return {
          success: false,
          error: 'Failed to create commission rule'
        };
      }

      return {
        success: true,
        rule_id: newRule.id
      };

    } catch (error) {
      logger.error('Error in createCommissionRule', { error, rule });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get agent commission history
   */
  async getAgentCommissions(
    agentId: string,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<any[]> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.commissions.missing_supabase_config', {
          agentId,
          startDate,
          endDate,
          status
        });
        return [];
      }

      let query = supabase
        .from('sales_agent_commissions')
        .select(`
          *,
          orders (
            id,
            customer_name,
            total,
            created_at
          )
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: commissions, error } = await query;

      if (error) {
        logger.error('Error fetching agent commissions', { error, agentId, status });
        return [];
      }

      return commissions || [];

    } catch (error) {
      logger.error('Error in getAgentCommissions', { error, agentId, status });
      return [];
    }
  }

  /**
   * Award commission for an order (calculates and saves)
   */
  async awardCommission(
    orderId: string,
    agentId: string,
    _orderTotal: number
  ): Promise<{
    success: boolean;
    commission_id?: string;
    commission_amount?: number;
    error?: string;
  }> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.award.missing_supabase_config', { orderId, agentId });
        return {
          success: false,
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        };
      }

      // Calculate commission
      const calculationResult = await this.calculateOrderCommission(orderId, agentId);
      
      if (!calculationResult.success) {
        return {
          success: false,
          error: calculationResult.error
        };
      }

      // Save commission record
      const saveResult = await this.saveCommissionRecord(calculationResult.calculation!);
      
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };
      }

      return {
        success: true,
        commission_id: saveResult.commission_id,
        commission_amount: calculationResult.calculation!.commission_amount
      };

    } catch (error) {
      logger.error('Error in awardCommission', { error, orderId });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Process commission payments
   */
  async processCommissionPayment(
    commissionIds: string[],
  _paymentDetails: {
      payment_method: string;
      transaction_id?: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    processed_count?: number;
    error?: string;
  }> {
    try {
      const supabase = this.supabase;
      if (!supabase || !isSupabaseServiceConfigured) {
        logger.error('enhanced-commission-service.process-payment.missing_supabase_config', { commissionIds });
        return {
          success: false,
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        };
      }

      const { error } = await supabase
        .from('sales_agent_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .in('id', commissionIds);

      if (error) {
        logger.error('Error processing commission payment', { error, commissionIds });
        return {
          success: false,
          error: 'Failed to process commission payment'
        };
      }

      return {
        success: true,
        processed_count: commissionIds.length
      };

    } catch (error) {
      logger.error('Error in processCommissionPayment', { error, commissionIds });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}

// Export singleton instance
export const enhancedCommissionService = new EnhancedCommissionService();