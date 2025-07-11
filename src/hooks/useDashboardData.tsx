import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useBranches } from './useBranches';

export interface DashboardMetrics {
  totalStockValue: number;
  totalProducts: number;
  incomingToday: number;
  outgoingToday: number;
  lowStockAlerts: number;
}

export interface StockTrendData {
  date: string;
  value: number;
}

export interface CategoryData {
  name: string;
  value: number;
  products: number;
}

export interface DailyActivityData {
  date: string;
  incoming: number;
  outgoing: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  stockTrends: StockTrendData[];
  categoryData: CategoryData[];
  dailyActivity: DailyActivityData[];
}

export interface UseDashboardDataParams {
  dateFrom?: Date;
  dateTo?: Date;
}

export const useDashboardData = ({ dateFrom, dateTo }: UseDashboardDataParams = {}) => {
  const { user } = useAuth();
  const { activeBranch } = useBranches();

  const fetchDashboardData = async () => {
    if (!user || !activeBranch) throw new Error('Geen gebruiker of filiaal');

    try {
      // Fetch total stock value and product count
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('quantity_in_stock, unit_price, minimum_stock_level')
        .eq('branch_id', activeBranch.branch_id);

      if (productsError) throw new Error('Failed to fetch products data');

      // Calculate metrics
      const totalValue = productsData?.reduce((sum, product) => 
        sum + (product.quantity_in_stock * product.unit_price), 0) || 0;
      const lowStockCount = productsData?.filter(product => 
        product.quantity_in_stock <= product.minimum_stock_level).length || 0;

      // Get transactions for the selected range
      let query = supabase
        .from('stock_transactions')
        .select('transaction_type, quantity, created_at')
        .eq('branch_id', activeBranch.branch_id);
      if (dateFrom) query = query.gte('created_at', dateFrom.toISOString());
      if (dateTo) query = query.lte('created_at', dateTo.toISOString());
      const { data: transactions, error: transactionError } = await query;
      if (transactionError) throw new Error('Failed to fetch transactions data');

      // Calculate incoming/outgoing today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const incomingToday = transactions
        ?.filter(t => t.transaction_type === 'incoming' && new Date(t.created_at) >= today)
        .reduce((sum, t) => sum + t.quantity, 0) || 0;
      const outgoingToday = transactions
        ?.filter(t => t.transaction_type === 'outgoing' && new Date(t.created_at) >= today)
        .reduce((sum, t) => sum + t.quantity, 0) || 0;

      // Generate daily activity (voor gekozen bereik)
      const activity = [];
      let start = dateFrom ? new Date(dateFrom) : new Date();
      let end = dateTo ? new Date(dateTo) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      // Loop van start t/m end (inclusief)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);
        const dayTransactions = transactions?.filter((t) => {
          const tDate = new Date(t.created_at);
          return tDate >= d && tDate < nextDay;
        }) || [];
        const incoming = dayTransactions.filter((t) => t.transaction_type === 'incoming')
          .reduce((sum, t) => sum + t.quantity, 0);
        const outgoing = dayTransactions.filter((t) => t.transaction_type === 'outgoing')
          .reduce((sum, t) => sum + t.quantity, 0);
        activity.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          incoming,
          outgoing,
        });
      }


      // Generate stock trends (last 7 days, optional)
      const trends = [];
      // ...optioneel: trends vullen...

      return {
        metrics: {
          totalStockValue: totalValue,
          totalProducts: productsData?.length || 0,
          incomingToday,
          outgoingToday,
          lowStockAlerts: lowStockCount,
        },
        stockTrends: trends,
        dailyActivity: activity,
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'An error occurred while fetching dashboard data');
    }
  };

  const {
    data: dashboardData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboardData', activeBranch?.branch_id, user?.id, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: fetchDashboardData,
    enabled: !!user && !!activeBranch,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 2,
  });

  return {
    metrics: dashboardData?.metrics ?? {
      totalStockValue: 0,
      totalProducts: 0,
      incomingToday: 0,
      outgoingToday: 0,
      lowStockAlerts: 0,
    },
    stockTrends: dashboardData?.stockTrends ?? [],
    categoryData: dashboardData?.categoryData ?? [],
    dailyActivity: dashboardData?.dailyActivity ?? [],
    loading,
    error,
    refresh: refetch,
  };
};

// Extra hook voor alleen het aantal producten
export const useProductCount = () => {
  const { user } = useAuth();
  const { activeBranch } = useBranches();
  const queryClient = useQueryClient();

  const fetchProductCount = async () => {
    if (!user || !activeBranch) return 0;
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', activeBranch.branch_id);
    if (error) return 0;
    return count || 0;
  };

  useEffect(() => {
    if (!activeBranch) return;
    // Maak altijd een nieuwe channel instance aan
    const channel = supabase.channel('products-count-' + activeBranch.branch_id + '-' + Math.random().toString(36).substr(2, 9))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `branch_id=eq.${activeBranch.branch_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['productCount', activeBranch.branch_id, user?.id] });
        }
      );
    try {
      channel.subscribe();
    } catch (e) {
      console.error('Supabase subscribe error:', e);
    }
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBranch, user, queryClient]);

  const { data: productCount, isLoading } = useQuery({
    queryKey: ['productCount', activeBranch?.branch_id, user?.id],
    queryFn: fetchProductCount,
    enabled: !!user && !!activeBranch,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 2,
  });

  return { productCount: productCount ?? 0, isLoading };
};
