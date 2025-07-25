import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStockMovements } from '@/hooks/useStockMovements';
import { TransactionFilters } from '@/types/stockTypes';
import { CalendarIcon, Download, Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const StockMovements = () => {
  const isMobile = useIsMobile();
  const {
    transactions,
    stats,
    loading,
    error,
    filters,
    setFilters,
    refresh
  } = useStockMovements();

  const handleExport = () => {
    try {
      const exportData = transactions.map(t => ({
        'Date': new Date(t.created_at).toLocaleString(),
        'Product': t.product_name,
        'Type': t.transaction_type,
        'Quantity': t.quantity,
        'Unit Price': t.unit_price.toFixed(2),
        'Total Value': (t.quantity * t.unit_price).toFixed(2),
        'Reference': t.reference_number || '',
        'Notes': t.notes || '',
        'Supplier': t.supplier_name || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bewegingslijst');
      XLSX.writeFile(wb, `stock-movements-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading stock movements: {error?.toString()}</p>
            <Button variant="outline" onClick={() => refresh()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bewegingslijst</h1>

        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleExport}
          disabled={loading || transactions.length === 0}
        >
          <Download className="h-4 w-4 mr-2 " />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek producten"
              className="pl-8"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>
          <Select
            value={filters.transactionType}
            onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value as 'all' | 'incoming' | 'outgoing' }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Types</SelectItem>
              <SelectItem value="incoming">In</SelectItem>
              <SelectItem value="outgoing">Out</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as 'all' | 'today' | 'week' | 'month' | 'custom' }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Datum</SelectItem>
              <SelectItem value="today">Vandaag</SelectItem>
              <SelectItem value="week">Laatste 7 Dagen</SelectItem>
              <SelectItem value="month">Laatste 30 Dagen</SelectItem>
              <SelectItem value="custom">Aangepast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker (if custom selected) */}
        {filters.dateRange === 'custom' && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "justify-start text-left font-normal",
                  !filters.startDate && "text-muted-foreground"
                )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, "PP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "justify-start text-left font-normal",
                  !filters.endDate && "text-muted-foreground"
                )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "PP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>



      {/* Stats Cards */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Totaal In</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalIncoming}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Totaal Uit</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalOutgoing}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Bewegingen</p>
              <p className="text-2xl font-bold">{stats.transactionCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Huidige Waarde Stock</p>
              <p className="text-2xl font-bold">€{stats.totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gebruiker</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aantal</th>
                {!isMobile && (
                  <>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eenheidsprijs</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totaal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <tr 
                  key={transaction.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100 transition-colors`}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold">{transaction.product_name}</td>
                  <td className="px-4 py-2 text-sm">
                    {transaction.first_name || transaction.last_name
                      ? `${transaction.first_name ?? ''} ${transaction.last_name ?? ''}`.trim()
                      : transaction.email || 'Onbekend'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Badge
                      variant={transaction.transaction_type === 'incoming' ? 'default' : 'destructive'}
                      className={transaction.transaction_type === 'incoming' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {transaction.transaction_type === 'incoming' ? 'In' : 'Uit'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {transaction.transaction_type === 'outgoing' ? (
                      <span className="text-red-600">- {transaction.quantity}</span>
                    ) : (
                      <span className="text-green-600">+ {transaction.quantity}</span>
                    )}
                  </td>
                  {!isMobile && (
                    <>
                      <td className="px-4 py-2 text-right text-sm">
                        €{(transaction.transaction_type === 'incoming'
                          ? (transaction.purchase_price ?? transaction.unit_price)
                          : (transaction.sale_price ?? transaction.unit_price)
                        ).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        {transaction.transaction_type === 'outgoing' ? (
                          <span className="text-green-600">+ €{(transaction.quantity * (transaction.sale_price ?? transaction.unit_price)).toFixed(2)}</span>
                        ) : (
                          <span className="text-red-600">- €{(transaction.quantity * (transaction.purchase_price ?? transaction.unit_price)).toFixed(2)}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};
