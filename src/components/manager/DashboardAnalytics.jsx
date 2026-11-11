import { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, MapPin, Ticket, Trash2, X, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { getOrderDiscount } from '../../utils/voucherUtils';
import { getOrdersByDateRange } from '../../supabase';

export default function DashboardAnalytics({
  orders = [],
  ordersLoadStatus = 'loaded',
  ordersLoadError = '',
  refreshOrders,
  archivedAnalytics = [],
  branches = [],
  selectedBranchId,
  setSelectedBranchId,
  products = [],
  categories = [],
  foodWastage = []
}) {
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [startDate, setStartDate] = useState(todayDateStr);
  const [endDate, setEndDate] = useState(todayDateStr);
  const [historicalOrders, setHistoricalOrders] = useState(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const analyticsCache = useRef(new Map());
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSizes, setExpandedSizes] = useState({});

  // Calculate dynamic branch context ID (guarantees All branches by default unless specific branch is selected)
  const activeBranchId = selectedBranchId || 'All';
  const isTodayRange = startDate === todayDateStr && endDate === todayDateStr;

  // Fetch range orders on demand if viewing past period
  useEffect(() => {
    if (isTodayRange) {
      return;
    }

    const cacheKey = `${startDate}_${endDate}_${activeBranchId}`;
    if (analyticsCache.current.has(cacheKey)) {
      setHistoricalOrders(analyticsCache.current.get(cacheKey));
      return;
    }

    let isMounted = true;
    setIsLoadingRange(true);
    getOrdersByDateRange(startDate, endDate, activeBranchId)
      .then(res => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        analyticsCache.current.set(cacheKey, list);
        setHistoricalOrders(list);
      })
      .catch(err => {
        console.error("Could not fetch analytics range orders:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingRange(false);
      });

    return () => { isMounted = false; };
  }, [startDate, endDate, activeBranchId, isTodayRange]);

  const activeOrdersSource = isTodayRange
    ? orders
    : (historicalOrders !== null ? historicalOrders : orders);

  // Filter orders by date range and selected branch context
  const filteredOrders = activeOrdersSource.filter(order => {
    // 1. Branch filter
    if (activeBranchId && activeBranchId !== 'All' && order.branch_id && order.branch_id !== activeBranchId) return false;
    
    // 2. Date filters
    const rawDate = order.timestamp || order.created_at || '';
    const orderDate = rawDate ? rawDate.split('T')[0] : '';
    if (startDate && orderDate && orderDate < startDate) return false;
    if (endDate && orderDate && orderDate > endDate) return false;
    
    return true;
  });

  // Filter archived summaries overlapping selected range & branch
  const filteredArchives = (archivedAnalytics || []).filter(arch => {
    if (activeBranchId && activeBranchId !== 'All' && arch.branch_id !== 'All' && arch.branch_id !== activeBranchId) return false;
    if (startDate && arch.end_date < startDate) return false;
    if (endDate && arch.start_date > endDate) return false;
    return true;
  });
  const archivedOrderIds = new Set(
    filteredArchives.flatMap(archive =>
      Array.isArray(archive.order_ids) ? archive.order_ids.map(String) : []
    )
  );
  const ordersForAnalytics = filteredOrders.filter(order => !archivedOrderIds.has(String(order.order_id)));

  // Filter food wastage events overlapping selected range & branch
  const filteredWastage = (foodWastage || []).filter(w => {
    if (activeBranchId && activeBranchId !== 'All' && w.branch_id && w.branch_id !== activeBranchId) return false;
    const rawDate = w.timestamp || w.created_at || w.date || '';
    const wDate = rawDate ? rawDate.split('T')[0] : '';
    if (startDate && wDate && wDate < startDate) return false;
    if (endDate && wDate && wDate > endDate) return false;
    return true;
  });

  const totalWastageCost = filteredWastage.reduce((sum, w) => sum + (Number(w.total_cost) || ((Number(w.quantity) || 0) * (Number(w.unit_cost) || 0)) || 0), 0);
  const totalWastageCount = filteredWastage.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);

  const nonCancelledOrders = ordersForAnalytics.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

  let totalRevenue = 0;
  let totalCost = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  let dineInCount = 0;
  let deliveryCount = 0;
  let pickupCount = 0;
  const itemCounts = {};

  // Helper to extract size string from an item object
  const extractSize = (itemObj) => {
    if (!itemObj) return '';
    if (typeof itemObj.size === 'string' && itemObj.size.trim()) {
      return itemObj.size.trim();
    }
    if (itemObj.size && typeof itemObj.size === 'object' && itemObj.size.name) {
      return String(itemObj.size.name).trim();
    }
    if (typeof itemObj.selectedSize === 'string' && itemObj.selectedSize.trim()) {
      return itemObj.selectedSize.trim();
    }
    if (itemObj.selectedSize && typeof itemObj.selectedSize === 'object' && itemObj.selectedSize.name) {
      return String(itemObj.selectedSize.name).trim();
    }
    return '';
  };

  // Helper to resolve an order item into constituent products (unpacking deals)
  const resolveItemConstituents = (it) => {
    const qty = Number(it.quantity) || 1;
    const result = [];

    const unpack = (itemObj, multiplier, depth = 0) => {
      if (depth > 5) return; // Prevent any circular references

      // 1. Check if the item explicitly has deal_items attached and is marked as a deal
      if (itemObj.is_deal === true && itemObj.deal_items && Array.isArray(itemObj.deal_items) && itemObj.deal_items.length > 0) {
        itemObj.deal_items.forEach(dItem => {
          const dProdId = dItem.product_id ? String(dItem.product_id).trim() : '';
          const targetProd = (dProdId ? products.find(p => String(p.id) === dProdId) : null) ||
            products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
          const dQty = (Number(dItem.quantity) || 1) * multiplier;
          if (targetProd && targetProd.is_deal === true && Array.isArray(targetProd.deal_items) && targetProd.deal_items.length > 0) {
            unpack(targetProd, dQty, depth + 1);
          } else {
            const name = targetProd?.name || dItem.name || (dProdId ? `Item #${dProdId}` : 'Unknown Item');
            const size = extractSize(dItem);
            result.push({ name, size, count: dQty });
          }
        });
        return;
      }

      // 2. Check if the item matches a deal product in products list (only if is_deal is strictly true)
      const itProdId = (itemObj.product_id || itemObj.id) ? String(itemObj.product_id || itemObj.id).trim() : '';
      const matchedProduct = (itProdId ? products.find(p => String(p.id) === itProdId) : null) ||
        products.find(p => p.name && itemObj.name && p.name.trim().toLowerCase() === itemObj.name.trim().toLowerCase());

      if (matchedProduct && matchedProduct.is_deal === true && Array.isArray(matchedProduct.deal_items) && matchedProduct.deal_items.length > 0) {
        matchedProduct.deal_items.forEach(dItem => {
          const dProdId = dItem.product_id ? String(dItem.product_id).trim() : '';
          const targetProd = (dProdId ? products.find(p => String(p.id) === dProdId) : null) ||
            products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
          const dQty = (Number(dItem.quantity) || 1) * multiplier;
          if (targetProd && targetProd.is_deal === true && Array.isArray(targetProd.deal_items) && targetProd.deal_items.length > 0) {
            unpack(targetProd, dQty, depth + 1);
          } else {
            const name = targetProd?.name || dItem.name || (dProdId ? `Item #${dProdId}` : 'Unknown Item');
            const size = extractSize(dItem);
            result.push({ name, size, count: dQty });
          }
        });
        return;
      }

      // 3. Regular individual item
      const name = itemObj.name || matchedProduct?.name || 'Unknown Item';
      const size = extractSize(itemObj);
      result.push({ name, size, count: multiplier });
    };

    unpack(it, qty);
    return result;
  };

  const recordItemConstituent = (c) => {
    const rawName = (c.name || 'Unknown Item').trim();
    const rawSize = (c.size || '').trim();
    const hasSizeInName = rawSize && rawName.toLowerCase().includes(rawSize.toLowerCase());
    const displayName = rawSize && !hasSizeInName ? `${rawName} (${rawSize})` : rawName;
    const key = `${rawName.toLowerCase()}:::${rawSize.toLowerCase()}`;

    // Lookup product to find category
    const matchedProd = products.find(p => 
      p.name && p.name.trim().toLowerCase() === rawName.toLowerCase()
    );

    let catName = 'Other';
    if (matchedProd?.category_id) {
      const foundCat = categories.find(cat => cat.id === matchedProd.category_id);
      catName = foundCat?.name || matchedProd.category_id;
    } else if (matchedProd?.category) {
      catName = matchedProd.category;
    } else if (rawName.toLowerCase().includes('pizza')) {
      catName = 'Pizzas';
    } else if (rawName.toLowerCase().includes('burger')) {
      catName = 'Burgers';
    } else if (rawName.toLowerCase().includes('drink') || rawName.toLowerCase().includes('cola')) {
      catName = 'Drinks';
    } else if (rawName.toLowerCase().includes('shawarma')) {
      catName = 'Shawarmas';
    } else if (rawName.toLowerCase().includes('wing')) {
      catName = 'Wings';
    }

    if (!itemCounts[key]) {
      itemCounts[key] = {
        name: rawName,
        size: rawSize,
        displayName,
        category: catName,
        count: 0
      };
    }
    itemCounts[key].count += c.count;
  };

  // 1. Process active live orders (all non-cancelled orders, including newly placed pending orders)
  nonCancelledOrders.forEach(o => {
    const statusLower = (o.status || '').toLowerCase();
    if (statusLower !== 'cancelled') {
      const discount = getOrderDiscount(o);
      totalRevenue += (Number(o.total_amount) || 0);
      totalDiscounts += discount;
      totalDeliveryFees += (Number(o.delivery_fee) || 0);

      const typeLower = (o.order_type || '').toLowerCase();
      if (typeLower === 'dine-in') dineInCount++;
      else if (typeLower === 'delivery') deliveryCount++;
      else if (typeLower === 'pickup' || typeLower === 'takeaway') pickupCount++;

      if (o.items) {
        o.items.forEach(it => {
          totalCost += (Number(it.unitCost) || 0) * (Number(it.quantity) || 1);
          const constituents = resolveItemConstituents(it);
          constituents.forEach(recordItemConstituent);
        });
      }
    }
  });

  // 2. Merge pre-aggregated historical rollups
  let archivedCompletedCount = 0;
  let archivedCancelledCount = 0;
  filteredArchives.forEach(arch => {
    totalRevenue += (Number(arch.gross_revenue) || 0);
    totalCost += (Number(arch.total_cost) || 0);
    totalDiscounts += (Number(arch.total_discounts) || 0);
    totalDeliveryFees += (Number(arch.total_delivery_fees) || 0);
    archivedCompletedCount += (Number(arch.completed_orders) || 0);
    archivedCancelledCount += (Number(arch.cancelled_orders) || 0);

    if (arch.order_types) {
      dineInCount += (Number(arch.order_types['Dine-In']) || 0);
      deliveryCount += (Number(arch.order_types['Delivery']) || 0);
      pickupCount += (Number(arch.order_types['Takeaway']) || 0);
    }

    if (arch.item_breakdown && Array.isArray(arch.item_breakdown)) {
      arch.item_breakdown.forEach(it => {
        const constituents = resolveItemConstituents(it);
        constituents.forEach(recordItemConstituent);
      });
    }
  });

  // Net Profit is calculated by subtracting both COGS and Food Wastage from Gross Revenue
  const totalProfit = totalRevenue - totalCost - totalWastageCost;

  // Compute all ordered items sorted by count (each size listed separately)
  const allOrderedItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count);

  // Group ordered items by Category -> Size (for Pizza/sized items) -> Specific Product Flavour
  const catMap = {};
  Object.values(itemCounts).forEach(item => {
    const cat = item.category || 'Other';
    if (!catMap[cat]) {
      catMap[cat] = {
        name: cat,
        totalCount: 0,
        sizes: {} // sizeName -> { totalCount, flavours: [ { name, count } ] }
      };
    }

    catMap[cat].totalCount += item.count;

    const sizeKey = item.size ? item.size : 'Standard / Regular';
    if (!catMap[cat].sizes[sizeKey]) {
      catMap[cat].sizes[sizeKey] = {
        name: sizeKey,
        totalCount: 0,
        flavours: []
      };
    }

    catMap[cat].sizes[sizeKey].totalCount += item.count;
    catMap[cat].sizes[sizeKey].flavours.push({
      name: item.name,
      displayName: item.displayName,
      count: item.count
    });
  });

  // Sort categories by totalCount descending
  const categoryGroupedItems = Object.values(catMap)
    .map(cat => ({
      ...cat,
      sizesList: Object.values(cat.sizes)
        .map(s => ({
          ...s,
          flavours: s.flavours.sort((a, b) => b.count - a.count)
        }))
        .sort((a, b) => b.totalCount - a.totalCount)
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const toggleSize = (sizeKey) => {
    setExpandedSizes(prev => ({ ...prev, [sizeKey]: !prev[sizeKey] }));
  };

  const topSellingItem = allOrderedItems.length > 0 ? allOrderedItems[0].displayName : 'N/A';

  const totalOrders = nonCancelledOrders.length + archivedCompletedCount;
  const pendingOrders = nonCancelledOrders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
  const completedOrders = nonCancelledOrders.filter(o => (o.status || '').toLowerCase() === 'completed').length + archivedCompletedCount;
  
  const liveCancelledCount = ordersForAnalytics.length - nonCancelledOrders.length;
  const cancelledOrdersCount = liveCancelledCount + archivedCancelledCount;
  const totalAllAttempts = (ordersForAnalytics.length + archivedCompletedCount + archivedCancelledCount);
  const cancellationRate = totalAllAttempts > 0 ? Math.round((cancelledOrdersCount / totalAllAttempts) * 100) : 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(200, 16, 46); // #C8102E Premium crimson
      doc.rect(0, 0, 210, 35, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("MR. KUKOOO - ANALYTICS SUMMARY", 15, 22);
      
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.text(`Timeline: ${startDate} to ${endDate}`, 15, 45);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 51);
      doc.text(`Branch ID Scope: ${activeBranchId || 'All Branches'}`, 15, 57);
      
      doc.setLineWidth(0.5);
      doc.line(15, 61, 195, 61);
      
      // Stats Summaries
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PERFORMANCE METRICS", 15, 71);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Column 1
      doc.text(`Total Orders Placed: ${totalOrders}`, 20, 81);
      doc.text(`Completed Orders: ${completedOrders}`, 20, 87);
      doc.text(`Pending Actions: ${pendingOrders}`, 20, 93);
      doc.text(`Cancellation Rate: ${cancellationRate}%`, 20, 99);
      doc.text(`Top Selling Item: ${topSellingItem.substring(0, 20)}`, 20, 105);
      doc.text(`Dine-in: ${dineInCount} | Delivery: ${deliveryCount} | Pickup: ${pickupCount}`, 20, 111);

      // Column 2
      doc.text(`Gross Revenue: Rs. ${totalRevenue}`, 110, 78);
      doc.text(`Total COGS: Rs. ${totalCost}`, 110, 84);
      doc.text(`Food Wastage Loss: Rs. ${totalWastageCost}`, 110, 90);
      doc.text(`Net Profit (after wastage): Rs. ${totalProfit}`, 110, 96);
      doc.text(`Total Discounts: Rs. ${totalDiscounts}`, 110, 102);
      doc.text(`Delivery Fees Collected: Rs. ${totalDeliveryFees}`, 110, 108);
      doc.text(`Average Order Value: Rs. ${avgOrderValue}`, 110, 114);
      
      // Divider
      doc.line(15, 119, 195, 119);
      
      // All Items Breakdown Section (Category-wise and Size-wise hierarchy)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("ORDERED ITEMS BREAKDOWN (CATEGORY & SIZE-WISE)", 15, 129);
      
      doc.setFontSize(9);
      doc.text("Category / Size / Flavour", 15, 137);
      doc.text("Quantity Sold", 150, 137);
      doc.line(15, 140, 195, 140);
      
      let currentY = 147;

      const ensurePageSpace = (neededSpace = 8) => {
        if (currentY + neededSpace > 275) {
          doc.addPage();
          currentY = 25;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("Category / Size / Flavour", 15, currentY);
          doc.text("Quantity Sold", 150, currentY);
          doc.line(15, currentY + 3, 195, currentY + 3);
          currentY += 10;
        }
      };
      
      categoryGroupedItems.forEach((cat) => {
        ensurePageSpace(12);

        // Level 1: Category Header (Bold with subtle gray fill bar)
        doc.setFillColor(245, 245, 245);
        doc.rect(15, currentY - 4.5, 180, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);
        doc.text(cat.name.toUpperCase(), 17, currentY);
        doc.text(`${cat.totalCount} pcs`, 150, currentY);
        currentY += 8;

        cat.sizesList.forEach((sizeGroup) => {
          ensurePageSpace(8);
          const isMultiFlavour = sizeGroup.flavours.length > 1 || (sizeGroup.flavours[0]?.name && sizeGroup.flavours[0]?.name !== sizeGroup.name);

          // Level 2: Size / Item Header
          doc.setFont("helvetica", isMultiFlavour ? "bold" : "normal");
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          
          if (isMultiFlavour) {
            doc.text(`• ${sizeGroup.name} (${sizeGroup.flavours.length} flavours)`, 22, currentY);
          } else {
            doc.text(`• ${sizeGroup.flavours[0]?.name || sizeGroup.name}`, 22, currentY);
          }
          doc.text(`${sizeGroup.totalCount} pcs`, 150, currentY);
          currentY += 6;

          // Level 3: Specific Flavours (if multi-flavour size like 3 Fajita, 5 Tikka, 2 Cheese Lover)
          if (isMultiFlavour) {
            sizeGroup.flavours.forEach((flavour) => {
              ensurePageSpace(6);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(90, 90, 90);
              doc.text(`- ${flavour.name}`, 28, currentY);
              doc.text(`${flavour.count} pcs`, 150, currentY);
              currentY += 5;
            });
          }
        });

        currentY += 3;
      });

      doc.setTextColor(17, 17, 17);
      ensurePageSpace(10);
      
      // Divider before Ledger
      doc.line(15, currentY + 1, 195, currentY + 1);
      currentY += 10;

      // Orders Table Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TRANSACTION LEDGER LOG", 15, currentY);
      currentY += 10;
      
      doc.setFontSize(8);
      doc.text("Order ID", 15, currentY);
      doc.text("Customer", 35, currentY);
      doc.text("Items & Addons", 70, currentY);
      doc.text("Type", 130, currentY);
      doc.text("Amount", 145, currentY);
      doc.text("Profit", 165, currentY);
      doc.text("Status", 185, currentY);
      doc.line(15, currentY + 3, 195, currentY + 3);
      
      let yPos = currentY + 10;
      doc.setFont("helvetica", "normal");
      
      filteredOrders.forEach((o) => {
        const itemNames = o.items.map(it => {
          const addonText = it.addons && it.addons.length > 0 ? ` (+${it.addons.map(a => a.name).join(', ')})` : '';
          return `${it.quantity}x ${it.name}${addonText}`;
        }).join(' | ');

        const oCost = (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0);
        const oProfit = o.total_amount - oCost;

        if (yPos > 270) {
          doc.addPage();
          yPos = 25;
          // Subpage Headers
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("Order ID", 15, yPos);
          doc.text("Customer", 35, yPos);
          doc.text("Items & Addons", 70, yPos);
          doc.text("Type", 130, yPos);
          doc.text("Amount", 145, yPos);
          doc.text("Profit", 165, yPos);
          doc.text("Status", 185, yPos);
          doc.line(15, yPos + 3, 195, yPos + 3);
          yPos += 10;
          doc.setFont("helvetica", "normal");
        }
        
        doc.text(o.order_id || 'N/A', 15, yPos);
        doc.text(o.customer_name?.substring(0, 12) || 'N/A', 35, yPos);
        
        const truncatedItems = itemNames.substring(0, 36);
        doc.text(truncatedItems, 70, yPos);
        
        doc.text(o.order_type || 'N/A', 130, yPos);
        doc.text(`Rs. ${o.total_amount || 0}`, 145, yPos);
        doc.text(`Rs. ${oProfit || 0}`, 165, yPos);
        doc.text(o.status || 'N/A', 185, yPos);
        
        const oDiscount = getOrderDiscount(o);
        if (oDiscount > 0) {
          yPos += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(200, 16, 46);
          doc.text(`*Discount: -Rs. ${oDiscount}${o.voucher_code ? ` (Code: ${o.voucher_code})` : ''}`, 70, yPos);
          doc.setTextColor(17, 17, 17);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        if (o.special_instructions) {
          yPos += 4;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.text(`*Instructions: ${o.special_instructions.substring(0, 80)}`, 70, yPos);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        yPos += 7.5;
      });
      // Output as blob and create manual download link to force correct filename
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `MrKukooo_Sales_Report_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  if (ordersLoadStatus === 'loading') {
    return (
      <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
        Loading orders from the database before calculating analytics...
      </div>
    );
  }

  if (ordersLoadStatus === 'error') {
    return (
      <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
        <div>
          <strong className="block font-black">Could not load live orders for analytics.</strong>
          <span>{ordersLoadError || 'Check your staff session, database permissions, and connection.'}</span>
        </div>
        <button
          type="button"
          onClick={refreshOrders}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-black hover:bg-red-100"
        >
          Retry database read
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top filter row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-250 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl w-full xs:w-auto">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-accent/50">Timeline:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-bold text-[11px] sm:text-xs border-none focus:outline-none cursor-pointer"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-bold text-[11px] sm:text-xs border-none focus:outline-none cursor-pointer"
            />
            {isLoadingRange && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary inline shrink-0" />
            )}
          </div>

          {/* Quick preset timeline chips */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Today', getDates: () => [todayDateStr, todayDateStr] },
              { id: 'yesterday', label: 'Yesterday', getDates: () => {
                const y = new Date(); y.setDate(y.getDate() - 1);
                const ds = y.toISOString().split('T')[0];
                return [ds, ds];
              }},
              { id: 'last7', label: '7D', getDates: () => {
                const p = new Date(); p.setDate(p.getDate() - 6);
                return [p.toISOString().split('T')[0], todayDateStr];
              }},
              { id: 'last30', label: '30D', getDates: () => {
                const p = new Date(); p.setDate(p.getDate() - 29);
                return [p.toISOString().split('T')[0], todayDateStr];
              }}
            ].map(p => {
              const [s, e] = p.getDates();
              const isMatch = startDate === s && endDate === e;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setStartDate(s); setEndDate(e); }}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                    isMatch ? 'bg-secondary text-accent comic-border-sm shadow-xs' : 'text-gray-500 hover:text-accent'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-250 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl">
              <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
              <select
                value={activeBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-black text-[11px] sm:text-xs border-none focus:outline-none pr-3 cursor-pointer"
              >
                <option value="All">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredArchives.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg sm:rounded-xl border border-blue-200 flex items-center gap-1">
              📦 Includes {filteredArchives.length} Archive{filteredArchives.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-secondary hover:bg-secondary-hover active:scale-95 text-accent font-black text-xs rounded-xl sm:rounded-2xl comic-border-sm transition-colors cursor-pointer text-center"
        >
          📄 Export PDF Report
        </button>
      </div>

      {/* KPI metric cards horizontally scrollable row */}
      <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2.5 pt-0.5 px-0.5 flex-nowrap scroll-smooth">
        {/* Metric 1 - Revenue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[190px] sm:min-w-[210px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Total Revenue</span>
            <h3 className="text-base sm:text-lg font-black text-accent whitespace-nowrap">Rs. {totalRevenue}</h3>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/10 shrink-0 ml-2">
            <DollarSign className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric Total COGS */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[190px] sm:min-w-[210px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Total COGS</span>
            <h3 className="text-base sm:text-lg font-black text-gray-700 whitespace-nowrap">Rs. {totalCost}</h3>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200 shrink-0 ml-2">
            <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric Food Wastage */}
        <div 
          onClick={() => setIsWastageModalOpen(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between border-2 border-red-200 hover:border-red-400 cursor-pointer transition-all hover:scale-[1.02] group shrink-0 min-w-[200px] sm:min-w-[220px] flex-1"
          title="Click to view food wastage breakdown"
        >
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-black text-red-500 uppercase tracking-wider block leading-tight">Food Wastage</span>
              <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black">View</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-red-600 whitespace-nowrap">Rs. {totalWastageCost}</h3>
            <span className="text-[9px] text-gray-400 font-bold block truncate">{totalWastageCount} pcs ({filteredWastage.length} logs)</span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-600 border border-red-200 shrink-0 ml-2 transition-colors">
            <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric Net Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[200px] sm:min-w-[220px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Net Profit</span>
            <h3 className="text-base sm:text-lg font-black text-green-600 whitespace-nowrap">Rs. {totalProfit}</h3>
            <span className="text-[9px] text-gray-400 font-bold block truncate">Gross - COGS - Wastage</span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0 ml-2">
            <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric Discounts */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[190px] sm:min-w-[210px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Discounts</span>
            <h3 className="text-base sm:text-lg font-black text-orange-600 whitespace-nowrap">Rs. {totalDiscounts}</h3>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 shrink-0 ml-2">
            <Ticket className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric 2 - Orders */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[190px] sm:min-w-[210px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Order Volume</span>
            <h3 className="text-base sm:text-lg font-black text-accent whitespace-nowrap">{totalOrders}</h3>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0 ml-2">
            <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>

        {/* Metric 3 - Avg Ticket */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between shrink-0 min-w-[190px] sm:min-w-[210px] flex-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Avg Ticket</span>
            <h3 className="text-base sm:text-lg font-black text-accent whitespace-nowrap">Rs. {avgOrderValue}</h3>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 ml-2">
            <BarChart3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>
      </div>

      {/* Main reporting splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* All Ordered items list */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h4 className="text-sm font-black text-accent uppercase tracking-wider">Ordered Items</h4>
            </div>
            {allOrderedItems.length > 0 && (
              <span className="text-[10px] font-black bg-secondary/15 text-accent px-2 py-0.5 rounded-lg">
                {allOrderedItems.length} Products
              </span>
            )}
          </div>
          {categoryGroupedItems.length > 0 ? (
            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
              {categoryGroupedItems.map((cat, catIdx) => {
                const isCatExpanded = !!expandedCategories[cat.name];
                return (
                  <div key={cat.name} className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {/* Level 1: Category Row */}
                    <div 
                      onClick={() => toggleCategory(cat.name)}
                      className="p-3 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0"
                          title={isCatExpanded ? "Collapse Category" : "Expand Category"}
                        >
                          {isCatExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="w-5.5 h-5.5 rounded-lg bg-gray-200 flex items-center justify-center font-black text-xs text-accent/70 shrink-0">
                          {catIdx + 1}
                        </span>
                        <span className="text-xs font-black text-accent truncate">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-xs bg-secondary/20 text-accent px-2.5 py-1 rounded-xl font-black shrink-0">
                        {cat.totalCount} pcs
                      </span>
                    </div>

                    {/* Level 2: Sized Groups under this Category */}
                    {isCatExpanded && (
                      <div className="p-2.5 space-y-2 bg-white divide-y divide-gray-100">
                        {cat.sizesList.map((sizeGroup) => {
                          const sizeKey = `${cat.name}___${sizeGroup.name}`;
                          const isSizeExpanded = !!expandedSizes[sizeKey];
                          const hasFlavours = sizeGroup.flavours.length > 0;
                          const isMultiFlavour = sizeGroup.flavours.length > 1 || (sizeGroup.flavours[0]?.name && sizeGroup.flavours[0]?.name !== sizeGroup.name);

                          return (
                            <div key={sizeGroup.name} className="pt-2 first:pt-0">
                              {/* Sized Header (e.g. "Small: 10 pcs") */}
                              <div
                                onClick={() => isMultiFlavour && toggleSize(sizeKey)}
                                className={`flex items-center justify-between gap-2 p-1.5 rounded-xl transition-colors ${
                                  isMultiFlavour ? 'cursor-pointer hover:bg-blue-50/60' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pl-1">
                                  {isMultiFlavour ? (
                                    <button
                                      type="button"
                                      className="w-4 h-4 rounded text-blue-600 flex items-center justify-center shrink-0"
                                      title={isSizeExpanded ? "Collapse Flavours" : "Expand Flavours"}
                                    >
                                      {isSizeExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-blue-600" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-blue-500" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-300">•</span>
                                  )}
                                  <span className="text-xs font-extrabold text-gray-800 truncate">
                                    {sizeGroup.name}
                                    {isMultiFlavour && (
                                      <span className="text-[10px] text-gray-400 font-bold ml-1.5">
                                        ({sizeGroup.flavours.length} flavours)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-black shrink-0">
                                  {sizeGroup.totalCount} pcs
                                </span>
                              </div>

                              {/* Level 3: Flavour / Specific Product Breakdown (3 Fajita, 5 Tikka, 2 Cheese Lover) */}
                              {isMultiFlavour && isSizeExpanded && hasFlavours && (
                                <div className="mt-1.5 pl-6 pr-1 space-y-1 bg-gray-50/50 rounded-xl p-2 border border-gray-150">
                                  {sizeGroup.flavours.map((flavour, fIdx) => (
                                    <div key={fIdx} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-b-0">
                                      <span className="font-bold text-gray-700 truncate pr-2">
                                        {flavour.name}
                                      </span>
                                      <span className="font-black text-accent text-[11px] shrink-0 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {flavour.count} pcs
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
              No sales records found
            </div>
          )}
        </div>

        {/* Date range context ledger summary */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm lg:col-span-2 space-y-4">
          <h4 className="text-sm font-black text-accent uppercase tracking-wider border-b border-gray-100 pb-3">
            Ledger Activity Feed ({filteredOrders.length} transactions)
          </h4>
          <div className="overflow-y-auto max-h-72 pr-1 space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(o => (
                <div
                  key={o.order_id}
                  className="flex items-center justify-between border-b border-gray-50 pb-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-primary">{o.order_id}</span>
                      {getOrderDiscount(o) > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                          -Rs. {getOrderDiscount(o)} {o.voucher_code || o.items?.[0]?._order_voucher_code ? `(${o.voucher_code || o.items?.[0]?._order_voucher_code})` : 'discount'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-500 mt-0.5">
                      {o.customer_name} • {o.order_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-accent block">Rs. {o.total_amount}</span>
                    <span className="text-[10px] text-green-600 font-black uppercase block">Profit: Rs. {o.total_amount - (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0)}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
                No orders inside timeframe
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOD WASTAGE BREAKDOWN MODAL */}
      {isWastageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl comic-border comic-shadow max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b-2 border-gray-150 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 border border-red-200 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 font-black uppercase tracking-wider">Cost Audit</span>
                  <h3 className="text-lg font-black text-accent mt-0.5">Food Wastage Report</h3>
                  <p className="text-[11px] text-gray-500 font-bold">{startDate} to {endDate} • {activeBranchId === 'All' ? 'All Branches' : activeBranchId}</p>
                </div>
              </div>
              <button
                onClick={() => setIsWastageModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Wastage Summary Pills */}
            <div className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-black uppercase block">Total Loss</span>
                <span className="text-base font-black text-red-600">Rs. {totalWastageCost}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-black uppercase block">Items Wasted</span>
                <span className="text-base font-black text-accent">{totalWastageCount} pcs</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-black uppercase block">Incidents</span>
                <span className="text-base font-black text-accent">{filteredWastage.length} events</span>
              </div>
            </div>

            {/* Wastage Records Table */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {filteredWastage.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredWastage.map((item, idx) => (
                    <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-accent text-sm">{item.item_name}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                            item.item_type === 'product' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.item_type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 text-[11px] font-bold">
                          <span>Qty: <strong className="text-accent">{item.quantity}</strong></span>
                          <span>Unit Cost: <strong className="text-accent">Rs. {item.unit_cost}</strong></span>
                          <span>Reason: <strong className="text-red-600">{item.reason}</strong></span>
                          {item.notes && <span className="italic text-gray-400">"{item.notes}"</span>}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-red-600 block">- Rs. {item.total_cost || (item.quantity * item.unit_cost)}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Subtracted from Profit</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 font-bold">
                  <p className="text-sm">No food wastage recorded for this timeline.</p>
                  <p className="text-[11px] mt-1 text-gray-400">Record food wastage from the Inventory Manager tab.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setIsWastageModalOpen(false)}
                className="px-5 py-2 bg-accent text-white font-black text-xs rounded-xl hover:bg-accent/90 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
