import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  ModuleId,
  PackingOrder,
  InventoryItem,
  SavedProformaInvoice,
  NegotiationRecord,
  ActivityLogItem,
  User,
  PackingSpec,
  OrderRecord,
  DispatchRecord,
  MasterSheetItem,
  OrderDeductionRecord,
  MaterialKey,
  StaffMemberAccess,
  Commodity,
  PortProfile,
  PoSellerConfig,
  FloorPricePolicy,
} from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OrderDashboardView } from './components/OrderDashboardView';
import { DispatchView } from './components/DispatchView';
import { MasterSheetView } from './components/MasterSheetView';
import { UniversalUploadModal } from './components/UniversalUploadModal';
import { DashboardView } from './components/DashboardView';
import { PackingTrackerView } from './components/PackingTrackerView';
import { InventoryView } from './components/InventoryView';
import { OilCostProView } from './components/OilCostProView';
import { AccessControlView } from './components/AccessControlView';
import { PrintModal } from './components/PrintModal';
import { AiBillScannerModal, ScannedBillData } from './components/AiBillScannerModal';
import { PartyDetailModal } from './components/PartyDetailModal';
import { PlaceOrderModal } from './components/PlaceOrderModal';
import {
  INITIAL_ORDERS as INITIAL_PACK_ORDERS,
  INITIAL_INVENTORY,
  INITIAL_PI_HISTORY,
  INITIAL_NEGO_HISTORY,
  INITIAL_ACTIVITY_LOG,
  INITIAL_CLIENTS,
} from './utils/seedData';
import {
  INITIAL_ORDERS as INITIAL_PROD_ORDERS,
  INITIAL_DISPATCHES,
  INITIAL_MASTER_SHEET,
} from './utils/productionData';
import {
  COMMODITIES_CONFIG,
  COMMODITY_KEYS,
  PORT_PROFILES,
  DEFAULT_PO_SELLER_CONFIG,
  buildInitialPackingData,
} from './utils/constants';
import { DEFAULT_FLOOR_PRICE_POLICY, INITIAL_STAFF_DIRECTORY, resolveEffectiveAccess } from './utils/permissions';
import { SoundEngine } from './utils/audio';
import { auth, loginWithGoogle, loginWithGoogleRedirect, completeRedirectLogin, logoutUser } from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('futura_dashboard_theme');
      return saved === 'dark';
    } catch {
      return false;
    }
  });

  // Sound feedback state
  const [isSoundOn, setIsSoundOn] = useState<boolean>(() => SoundEngine.isEnabled());

  // Firebase user state
  const [isFirebaseUser, setIsFirebaseUser] = useState(false);
  // Mandatory sign-in gate: nothing renders until a Firebase session exists
  const [authReady, setAuthReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // User state
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return {
      email: 'tajamul.sales@globaloils.us',
      name: 'Tajamul Sales',
      initials: 'TS',
      role: 'owner',
      isAdmin: true,
    };
  });

  // Listen for Firebase Auth changes
  useEffect(() => {
    // Complete redirect-based Google sign-in (returns after the Google page redirect)
    completeRedirectLogin()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          setIsFirebaseUser(true);
          logActivity('system', 'Firebase Auth', `Signed in via Google redirect as ${user.email}`);
        }
      })
      .catch(err => {
        console.warn('Redirect sign-in error:', err, '| origin:', window.location.origin, '| code:', err?.code);
        if (String(err?.code || '').includes('unauthorized-domain')) {
          setLoginError(
            'This domain is not authorized in Firebase. Add it in Firebase Console → Authentication → Settings → Authorized domains.'
          );
        } else {
          setLoginError('Google Sign-In redirect failed: ' + (err?.message || err));
        }
      });

    const unsubscribe = onAuthStateChanged(auth, fbUser => {
      if (fbUser) {
        const email = fbUser.email || 'user@globaloils.us';
        const name = fbUser.displayName || email.split('@')[0];
        const initials = name
          .split(' ')
          .map(w => w[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        setCurrentUser({
          email,
          name,
          initials: initials || 'G',
          role: 'admin',
          isAdmin: true,
        });
        setIsFirebaseUser(true);
        setIsSignedIn(true);
        setAuthReady(true);
        logActivity('system', 'Firebase Auth', `Signed in via Google Firebase as ${email}`);
      } else {
        setIsFirebaseUser(false);
        setIsSignedIn(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Google Firebase Login
  const handleGoogleLogin = async () => {
    try {
      SoundEngine.play('pop');
      const user = await loginWithGoogle();
      if (user) {
        setCurrentUser(user);
        setIsFirebaseUser(true);
        SoundEngine.play('welcome');
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setLoginError('Google Sign-In: ' + (err.message || 'Window closed or interrupted'));
    }
  };

  const handleLogout = async () => {
    SoundEngine.play('thud');
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setIsFirebaseUser(false);
    setCurrentUser({
      email: 'guest.operator@globaloils.us',
      name: 'Guest Operator',
      initials: 'GO',
      role: 'viewer',
      isAdmin: false,
    });
    logActivity('system', 'Firebase Auth', 'Signed out from Firebase account.');
  };

  // Active module navigation
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  // Authentic May 2026 Production Orders
  const [prodOrders, setProdOrders] = useState<OrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_prod_orders_may2026');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PROD_ORDERS;
  });

  // Authentic May 2026 Dispatches
  const [dispatches, setDispatches] = useState<DispatchRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_dispatches_may2026');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_DISPATCHES;
  });

  // Authentic May 2026 Master Sheet
  const [masterItems, setMasterItems] = useState<MasterSheetItem[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_mastersheet_may2026');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MASTER_SHEET;
  });

  // OilCost Pro commercial config (Commodities / Ports / Seller / Floor policy)
  const [commodities, setCommodities] = useState<Record<string, Commodity>>(() => {
    try {
      const saved = localStorage.getItem('gfi_commodities_config_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return COMMODITIES_CONFIG;
  });

  const [ports, setPorts] = useState<Record<string, PortProfile>>(() => {
    try {
      const saved = localStorage.getItem('gfi_port_profiles_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return PORT_PROFILES;
  });

  const [poSellerConfig, setPoSellerConfig] = useState<PoSellerConfig>(() => {
    try {
      const saved = localStorage.getItem('gfi_po_seller_config_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PO_SELLER_CONFIG;
  });

  const [floorPolicy, setFloorPolicy] = useState<FloorPricePolicy>(() => {
    try {
      const saved = localStorage.getItem('gfi_floor_price_policy_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FLOOR_PRICE_POLICY;
  });

  // Core Data State (Fulfillment & Invoicing)
  const [orders, setOrders] = useState<PackingOrder[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_pack_orders_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PACK_ORDERS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_inv_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INVENTORY;
  });

  const [packingData, setPackingData] = useState<Record<string, PackingSpec[]>>(() => {
    return buildInitialPackingData();
  });

  const [oilPrices, setOilPrices] = useState<Record<string, number>>(() => {
    const prices: Record<string, number> = {};
    COMMODITY_KEYS.forEach(k => {
      prices[k] = COMMODITIES_CONFIG[k].defaultPrice;
    });
    return prices;
  });

  const [savedPIs, setSavedPIs] = useState<SavedProformaInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_acc_invoices');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PI_HISTORY;
  });

  const [negotiations, setNegotiations] = useState<NegotiationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_nego_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_NEGO_HISTORY;
  });

  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>(INITIAL_ACTIVITY_LOG);

  // Modals state
  const [activePrintingPI, setActivePrintingPI] = useState<SavedProformaInvoice | null>(null);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [isUniversalUploadOpen, setIsUniversalUploadOpen] = useState(false);
  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
  const [selectedPartyForDossier, setSelectedPartyForDossier] = useState<{
    code: string;
    name: string;
  } | null>(null);

  // Live Order Deductions History
  const [deductionsHistory, setDeductionsHistory] = useState<OrderDeductionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_deductions_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'DED-INIT-01',
        orderId: 'ORD-P2-01',
        poNo: 'PI/2025-26/50',
        partyCode: 'P2',
        partyName: 'Bake Mate- Alnoor-Riyadh',
        skuCode: 'ALN001',
        skuName: 'Alnoor Brand Acacia Honey in Bucket 2KG (4/case)',
        cases: 2660,
        timestamp: '10:15 AM',
        materialsDeducted: [
          {
            inventoryId: 'inv-bucket-2kg',
            materialName: '2 KG Honey Bucket with Handle & Lid',
            materialType: 'Bottle / Container',
            qtyDeducted: 10640,
            unit: 'Nos',
            prevStock: 12500,
            newStock: 1860,
            isDeficit: false,
          },
          {
            inventoryId: 'inv-carton-2kg',
            materialName: 'Outer Corrugated Carton 2 KG x 4',
            materialType: 'Outer Carton',
            qtyDeducted: 2660,
            unit: 'Nos',
            prevStock: 3000,
            newStock: 340,
            isDeficit: false,
          },
          {
            inventoryId: 'inv-raw-acacia',
            materialName: 'Natural Acacia Honey Bulk Tank',
            materialType: 'Raw Material (Bulk)',
            qtyDeducted: 21280,
            unit: 'KG',
            prevStock: 24500,
            newStock: 3220,
            isDeficit: false,
          },
        ],
      },
    ];
  });

  // Apply dark theme class to documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem('futura_dashboard_theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  // Persist orders
  const handleSaveOrders = (newOrders: PackingOrder[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem('gfi_pack_orders_v2', JSON.stringify(newOrders));
    } catch {}
    logActivity('update', 'Packing Tracker', `Updated orders list (${newOrders.length} orders)`);
  };

  // Persist inventory
  const handleSaveInventory = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    try {
      localStorage.setItem('gfi_inv_items', JSON.stringify(newInventory));
    } catch {}
    logActivity('update', 'Inventory', `Saved inventory modifications (${newInventory.length} items)`);
  };

  // Quick adjust single inventory item
  const handleQuickAdjustInventory = (id: string, delta: number) => {
    SoundEngine.play('tick');
    const updated = inventory.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        quantity: Math.max(0, item.quantity + delta),
        updatedAt: new Date().toISOString(),
      };
    });
    handleSaveInventory(updated);
  };

  // Persist PI
  const handleUpdateCommodities = (next: Record<string, Commodity>) => {
    setCommodities(next);
    try { localStorage.setItem('gfi_commodities_config_v2', JSON.stringify(next)); } catch {}
  };

  const handleUpdatePorts = (next: Record<string, PortProfile>) => {
    setPorts(next);
    try { localStorage.setItem('gfi_port_profiles_v2', JSON.stringify(next)); } catch {}
  };

  const handleUpdatePoSellerConfig = (next: PoSellerConfig) => {
    setPoSellerConfig(next);
    try { localStorage.setItem('gfi_po_seller_config_v2', JSON.stringify(next)); } catch {}
  };

  const handleUpdateFloorPolicy = (next: FloorPricePolicy) => {
    setFloorPolicy(next);
    try { localStorage.setItem('gfi_floor_price_policy_v1', JSON.stringify(next)); } catch {}
  };

  const handleSavePI = (newPI: SavedProformaInvoice) => {
    const updated = [newPI, ...savedPIs.filter(p => p.piNumber !== newPI.piNumber)];
    setSavedPIs(updated);
    try {
      localStorage.setItem('gfi_acc_invoices', JSON.stringify(updated));
    } catch {}
    logActivity('create', 'Invoicing', `Generated and saved Proforma Invoice ${newPI.piNumber} ($${newPI.totalUSD.toLocaleString()})`);
  };

  const handleDeletePI = (piNumber: string) => {
    if (!window.confirm(`Delete PI ${piNumber}?`)) return;
    SoundEngine.play('thud');
    const updated = savedPIs.filter(p => p.piNumber !== piNumber);
    setSavedPIs(updated);
    try {
      localStorage.setItem('gfi_acc_invoices', JSON.stringify(updated));
    } catch {}
    logActivity('delete', 'Invoicing', `Removed PI ${piNumber}`);
  };

  // Persist Negotiation
  const handleSaveNegotiation = (newNego: NegotiationRecord) => {
    const updated = [newNego, ...negotiations.filter(n => n.negoNumber !== newNego.negoNumber)];
    setNegotiations(updated);
    try {
      localStorage.setItem('gfi_nego_history', JSON.stringify(updated));
    } catch {}
    logActivity('create', 'Reverse Costing', `Saved negotiation ${newNego.negoNumber} for ${newNego.clientName} (${newNego.verdict.toUpperCase()})`);
  };

  const handleDeleteNegotiation = (negoNumber: string) => {
    if (!window.confirm(`Delete negotiation ${negoNumber}?`)) return;
    SoundEngine.play('thud');
    const updated = negotiations.filter(n => n.negoNumber !== negoNumber);
    setNegotiations(updated);
    try {
      localStorage.setItem('gfi_nego_history', JSON.stringify(updated));
    } catch {}
  };

  // Process and apply extracted bill from Gemini AI
  const handleApplyBillUpdates = (bill: ScannedBillData) => {
    SoundEngine.play('success');

    // 1. Update Inventory stock
    const updatedInventory = [...inventory];
    let itemsUpdatedCount = 0;

    bill.items.forEach(scannedItem => {
      const matchIndex = updatedInventory.findIndex(
        inv =>
          (inv.sku && inv.sku.toLowerCase() === (scannedItem.matchedSku || '').toLowerCase()) ||
          (inv.materialType === scannedItem.materialType && scannedItem.materialType !== 'none') ||
          inv.name.toLowerCase().includes(scannedItem.itemName.toLowerCase())
      );

      if (matchIndex >= 0) {
        updatedInventory[matchIndex] = {
          ...updatedInventory[matchIndex],
          quantity: updatedInventory[matchIndex].quantity + scannedItem.quantity,
          cost: scannedItem.unitRate > 0 ? scannedItem.unitRate : updatedInventory[matchIndex].cost,
          updatedAt: new Date().toISOString(),
          notes: `Restocked via Bill #${bill.billNumber} from ${bill.vendorName || 'Supplier'} (${scannedItem.quantity} ${scannedItem.unit})`,
        };
        itemsUpdatedCount++;
      } else {
        updatedInventory.push({
          id: `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          name: scannedItem.itemName,
          category: scannedItem.materialType === 'raw_material' ? 'Raw Material' : 'Packaging',
          materialType: (['preform', 'bottle', 'cap', 'wad', 'cst', 'carton', 'label', 'pallet'].includes(scannedItem.materialType as any)
            ? scannedItem.materialType
            : 'none') as MaterialKey | 'none',
          linkedSku: scannedItem.matchedSku || 'General',
          unit: scannedItem.unit || 'pcs',
          quantity: scannedItem.quantity,
          minLevel: Math.round(scannedItem.quantity * 0.3),
          cost: scannedItem.unitRate || 0,
          notes: `Inward receipt from ${bill.vendorName || 'Supplier'} • Bill #${bill.billNumber}`,
          updatedAt: new Date().toISOString(),
        });
        itemsUpdatedCount++;
      }
    });

    handleSaveInventory(updatedInventory);

    // 2. Update matching order material statuses if target container or matching material was received
    if (orders.length > 0) {
      const updatedOrders = orders.map(order => {
        const isTarget = bill.targetContainer
          ? order.container.toLowerCase().includes(bill.targetContainer.toLowerCase())
          : false;

        let orderChanged = false;
        const newMaterials = { ...order.materials };

        bill.items.forEach(item => {
          if (item.materialType !== 'none' && (isTarget || order.item.toLowerCase().includes(item.itemName.toLowerCase()))) {
            const current = newMaterials[item.materialType as keyof typeof newMaterials];
            if (current && ['notstarted', 'ordered', 'delivery'].includes(current.status)) {
              newMaterials[item.materialType as keyof typeof newMaterials] = {
                status: 'received',
                date: bill.billDate || new Date().toISOString().split('T')[0],
                notes: `Bill #${bill.billNumber}`,
              };
              orderChanged = true;
            }
          }
        });

        return orderChanged ? { ...order, materials: newMaterials } : order;
      });

      handleSaveOrders(updatedOrders);
    }

    logActivity(
      'update',
      'AI Bill Scanner',
      `Processed ${bill.documentType} #${bill.billNumber} from ${bill.vendorName || 'Supplier'} — updated ${itemsUpdatedCount} inventory items & order material stages`
    );

    alert(`🎉 Successfully processed ${bill.vendorName || 'Supplier'} Bill #${bill.billNumber}!\nUpdated ${itemsUpdatedCount} inventory items and synchronized order material statuses.`);
  };

  const logActivity = (actionType: ActivityLogItem['actionType'], module: string, summary: string) => {
    const newAct: ActivityLogItem = {
      id: `ACT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      actionType,
      module,
      summary,
      userEmail: currentUser.email,
    };
    setActivityLog(prev => [newAct, ...prev.slice(0, 19)]);
  };

  // Master SKUs list for dropdowns
  const allMasterSkus = Array.from(
    new Set(
      Object.values(packingData)
        .flat()
        .map(s => s.sku)
    )
  );

  // Update Production Order from Dashboard
  const handleUpdateProdOrder = (updatedOrder: OrderRecord) => {
    setProdOrders(prev => {
      const next = prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o));
      try {
        localStorage.setItem('gfi_prod_orders_may2026', JSON.stringify(next));
      } catch {}
      return next;
    });
    logActivity('update', 'Order Dashboard', `Updated order ${updatedOrder.poNo} for ${updatedOrder.partyName}`);
  };

  // Apply Universal Upload Updates (from Excel, CSV, PDF, or Bill Scan)
  const handleApplyUniversalUploadUpdates = (uploadedItems: Partial<InventoryItem>[]) => {
    SoundEngine.play('success');
    setInventory(prev => {
      const updated = [...prev];
      let updatedCount = 0;
      let newCount = 0;

      uploadedItems.forEach(uItem => {
        if (!uItem.name && !uItem.sku) return;
        const existingIdx = updated.findIndex(
          i =>
            (uItem.sku && i.sku.toLowerCase() === uItem.sku.toLowerCase()) ||
            (uItem.name && i.name.toLowerCase().includes(uItem.name.toLowerCase()))
        );

        if (existingIdx !== -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + (uItem.quantity || 0),
            cost: uItem.cost || updated[existingIdx].cost,
            updatedAt: new Date().toISOString(),
          };
          updatedCount++;
        } else {
          updated.push({
            id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            sku: uItem.sku || `PM-${Date.now()}`,
            name: uItem.name || 'New Packaging Material',
            category: uItem.category || 'Packaging',
            materialType: 'bottle',
            linkedSku: 'Universal',
            unit: uItem.unit || 'Nos',
            quantity: uItem.quantity || 100,
            minLevel: 50,
            cost: uItem.cost || 0,
            notes: 'Imported via Universal File Uploader',
            updatedAt: new Date().toISOString(),
          });
          newCount++;
        }
      });

      try {
        localStorage.setItem('gfi_inv_items', JSON.stringify(updated));
      } catch {}
      logActivity(
        'update',
        'Inventory Import',
        `File Import Applied: ${updatedCount} items restocked, ${newCount} new items registered.`
      );
      return updated;
    });
  };

  // Unique existing parties for place order dropdown
  const existingPartiesList = Array.from(
    new Map(prodOrders.map(o => [o.partyCode, { code: o.partyCode, name: o.partyName }])).values()
  );

  // Place Order & Automatically Cut Materials From Warehouse Inventory
  const handleConfirmPlaceOrderAndDeductStock = (orderData: {
    partyCode: string;
    partyName: string;
    poNo: string;
    skuCode: string;
    skuName: string;
    packSize: number;
    packUnit: string;
    qtyPerCs: number;
    planCs: number;
    planKg: number;
    planPallets: number;
    deductions: any[];
    invoiceAttachment?: { name: string; size: string; uploadedAt: string };
  }) => {
    // 1. Deduct exact quantities from Inventory
    const updatedInventory = [...inventory];
    orderData.deductions.forEach(d => {
      const idx = updatedInventory.findIndex(i => i.id === d.inventoryId || i.name === d.materialName);
      if (idx !== -1) {
        updatedInventory[idx] = {
          ...updatedInventory[idx],
          quantity: Math.max(0, updatedInventory[idx].quantity - d.qtyDeducted),
          updatedAt: new Date().toISOString(),
        };
      }
    });
    handleSaveInventory(updatedInventory);

    // 2. Create and insert the new OrderRecord into prodOrders
    const newProdOrder: OrderRecord = {
      id: `ORD-${orderData.partyCode}-${Date.now().toString().slice(-4)}`,
      partyCode: orderData.partyCode,
      partyName: orderData.partyName,
      poNo: orderData.poNo,
      poDate: new Date().toISOString().split('T')[0],
      poExp: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      month: 'May-26',
      skuCode: orderData.skuCode,
      skuName: orderData.skuName,
      packSize: orderData.packSize,
      packUnit: orderData.packUnit,
      qtyPerCs: orderData.qtyPerCs,
      planCs: orderData.planCs,
      planKg: orderData.planKg,
      planLtr: Math.round(orderData.planKg / 0.92),
      planPallets: orderData.planPallets,
      fillingCs: 0,
      dispatchedCs: 0,
      balanceCs: orderData.planCs,
      status: 'In Production',
      remarks: 'Stock auto-deducted upon verified invoice booking',
      invoiceAttachment: orderData.invoiceAttachment,
      bom: orderData.deductions.map(d => ({
        type: d.materialType.toLowerCase().includes('bottle')
          ? 'bottle'
          : d.materialType.toLowerCase().includes('cap')
          ? 'cap'
          : d.materialType.toLowerCase().includes('carton')
          ? 'carton'
          : d.materialType.toLowerCase().includes('raw')
          ? 'raw_material'
          : 'label',
        code: `PM-${d.materialName.slice(0, 6).toUpperCase().replace(/\s/g, '')}`,
        desc: d.materialName,
        consPerCase: Math.round((d.qtyDeducted / orderData.planCs) * 100) / 100,
        requiredQty: d.qtyDeducted,
        availableQty: d.prevStock,
        balanceStk: d.newStock,
        shortExcess: d.prevStock - d.qtyDeducted,
        uom: d.unit,
        status: d.isDeficit ? 'deficit' : 'sufficient',
      })),
    };

    setProdOrders(prev => {
      const next = [newProdOrder, ...prev];
      try {
        localStorage.setItem('gfi_prod_orders_may2026', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Record in deductionsHistory
    const deductionRec: OrderDeductionRecord = {
      id: `DED-${Date.now()}`,
      orderId: newProdOrder.id,
      poNo: orderData.poNo,
      partyCode: orderData.partyCode,
      partyName: orderData.partyName,
      skuCode: orderData.skuCode,
      skuName: orderData.skuName,
      cases: orderData.planCs,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      materialsDeducted: orderData.deductions,
      invoiceAttachment: orderData.invoiceAttachment,
    };

    setDeductionsHistory(prev => {
      const next = [deductionRec, ...prev];
      try {
        localStorage.setItem('gfi_deductions_history', JSON.stringify(next));
      } catch {}
      return next;
    });

    logActivity(
      'create',
      'Order & Stock Deduction',
      `Placed order ${orderData.poNo} for ${orderData.partyName} (${orderData.planCs.toLocaleString()} Cases) — auto-cut ${orderData.deductions.length} materials from warehouse stock!`
    );

    SoundEngine.play('success');
  };

  // ---- RBAC staff directory & effective identity ----
  const [staffDirectory, setStaffDirectory] = useState<StaffMemberAccess[]>(() => {
    try {
      const saved = localStorage.getItem('gfi_staff_directory_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_STAFF_DIRECTORY;
  });

  const [previewingAsEmail, setPreviewingAsEmail] = useState<string | null>(null);

  const handleSaveStaffDirectory = (next: StaffMemberAccess[]) => {
    setStaffDirectory(next);
    try {
      localStorage.setItem('gfi_staff_directory_v1', JSON.stringify(next));
    } catch {}
    logActivity('update', 'Access & Roles', `Updated team access roles (${next.length} members)`);
  };

  const effectiveEmail = previewingAsEmail || currentUser.email;
  const effectiveAccess = resolveEffectiveAccess(effectiveEmail, staffDirectory);
  const effectiveUser: User = previewingAsEmail
    ? {
        email: effectiveEmail,
        name: effectiveAccess.staffRecord?.name || effectiveEmail.split('@')[0],
        initials:
          (effectiveAccess.staffRecord?.name || effectiveEmail)
            .split(' ')
            .map(w => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'U',
        role: effectiveAccess.role,
        isAdmin: effectiveAccess.role === 'super_admin' || effectiveAccess.role === 'admin',
      }
    : {
        ...currentUser,
        role: effectiveAccess.role,
        isAdmin: effectiveAccess.role === 'super_admin' || effectiveAccess.role === 'admin',
      };

  const displayUser = previewingAsEmail ? effectiveUser : currentUser;

  const moduleVisible: Record<ModuleId, boolean> = {
    dashboard: effectiveAccess.permissions.dashboardView,
    orders: effectiveAccess.permissions.ordersView !== false,
    dispatch: effectiveAccess.permissions.dispatchView !== false,
    packing: effectiveAccess.permissions.packingView,
    inventory: effectiveAccess.permissions.inventoryView,
    oilcost: effectiveAccess.permissions.oilcostView,
    mastersheet: effectiveAccess.permissions.mastersheetView !== false,
    access: effectiveAccess.permissions.canManageAccess,
  };
  const visibleModules: ModuleId[] = (
    Object.keys(moduleVisible) as ModuleId[]
  ).filter(id => moduleVisible[id]);

  // Guard: if the active module is not authorized for this user, fall back
  const effectiveModule: ModuleId | null = moduleVisible[activeModule]
    ? activeModule
    : moduleVisible.dashboard
      ? 'dashboard'
      : null;

  // Handle Role Change for RBAC testing
  const handleRoleChange = (newRole: any) => {
    setCurrentUser(prev => ({
      ...prev,
      role: newRole,
      isAdmin: newRole === 'admin' || newRole === 'super_admin' || newRole === 'owner',
      isSuperAdmin: newRole === 'super_admin' || newRole === 'owner',
    }));
    logActivity('update', 'Security & RBAC', `Access control level switched to ${String(newRole).toUpperCase()}`);
  };

  // Mandatory Sign-In Gate — no one enters the ERP without signing in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Global Futura ERP</h1>
              <p className="mt-1 text-sm text-slate-400">
                Enterprise Operations & Costing Suite
              </p>
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              Sign in is mandatory. Use your company Google account — your access is
              managed by the Super Admin in the Access Control console.
            </p>
            <button
              onClick={() => {
                SoundEngine.play('pop');
                loginWithGoogleRedirect().catch(err =>
                  setLoginError('Google Sign-In redirect failed: ' + (err?.message || err))
                );
              }}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all active:scale-95 shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Sign in with Google
            </button>
            {loginError && (
              <div className="w-full rounded-lg border border-rose-400/50 bg-rose-950/40 px-3 py-2 text-[11px] font-semibold text-rose-300">
                {loginError}
              </div>
            )}
            {authReady && (
              <p className="text-[10px] text-slate-600">
                Session not active — every new visit requires a fresh sign-in.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        user={displayUser}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
        onRoleChange={handleRoleChange}
        isFirebaseUser={isFirebaseUser}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        isSoundOn={isSoundOn}
        onToggleSound={() => setIsSoundOn(SoundEngine.toggle())}
      />

      {/* Main Multi-Module Navigation */}
      <Navigation
        activeModule={effectiveModule ?? activeModule}
        onSelectModule={setActiveModule}
        userRole={currentUser.role}
        visibleModules={visibleModules}
        orderCount={orders.filter(o => !o.archived).length}
        lowStockCount={inventory.filter(i => i.quantity <= i.minLevel).length}
        openQuotesCount={savedPIs.length}
        dispatchCount={dispatches.length}
        onOpenScanner={() => setIsAiScannerOpen(true)}
        onOpenUniversalUpload={() => setIsUniversalUploadOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 transition-all">
        {/* Access denied panel (module not granted to this user) */}
        {effectiveModule === null && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Access Restricted</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Your account does not have permission to view this module. Please contact your Super Admin in the Access Control console to grant access.
            </p>
          </div>
        )}

        {/* NEW: Qwen Order Dashboard (Sheet Tab 1 & Tab 2 Popup) */}
        {effectiveModule === 'orders' && (
          <OrderDashboardView
            orders={prodOrders}
            dispatches={dispatches}
            masterItems={masterItems}
            onUpdateOrder={handleUpdateProdOrder}
            onOpenScanner={() => setIsAiScannerOpen(true)}
            onOpenUniversalUpload={() => setIsUniversalUploadOpen(true)}
          />
        )}

        {/* NEW: Container Dispatches View */}
        {effectiveModule === 'dispatch' && (
          <DispatchView dispatches={dispatches} />
        )}

        {/* NEW: Master Sheet View */}
        {effectiveModule === 'mastersheet' && (
          <MasterSheetView
            masterItems={masterItems}
            onSelectParty={party => setSelectedPartyForDossier(party)}
          />
        )}

        {/* Command Center */}
        {effectiveModule === 'dashboard' && (
          <DashboardView
            user={displayUser}
            onNavigate={m => { if (moduleVisible[m]) setActiveModule(m); }}
            visibleModules={visibleModules}
            orders={orders}
            inventory={inventory}
            savedPIs={savedPIs}
            negotiations={negotiations}
            activityLog={activityLog}
            prodOrders={prodOrders}
            dispatches={dispatches}
            masterItems={masterItems}
            deductionsHistory={deductionsHistory}
            isFirebaseUser={isFirebaseUser}
            onGoogleLogin={handleGoogleLogin}
            onLogout={handleLogout}
            onSelectParty={party => setSelectedPartyForDossier(party)}
            onOpenQuickQuote={() => setActiveModule('oilcost')}
            onOpenNewOrder={() => setIsPlaceOrderOpen(true)}
            onOpenPlaceOrderModal={() => setIsPlaceOrderOpen(true)}
            onOpenNewInventory={() => setActiveModule('inventory')}
            onOpenScanBill={() => setIsAiScannerOpen(true)}
            onQuickAdjustInventory={handleQuickAdjustInventory}
          />
        )}

        {/* Packing Tracker */}
        {effectiveModule === 'packing' && (
          <PackingTrackerView
            orders={orders}
            inventory={inventory}
            clients={INITIAL_CLIENTS}
            itemsList={COMMODITY_KEYS.map(k => COMMODITIES_CONFIG[k].label)}
            brands={['Futura Nature\'s Best', 'Healthi Bites', 'Chef Supreme', 'Futura Gold', 'Royal Heritage']}
            skusList={allMasterSkus}
            onSaveOrders={handleSaveOrders}
            onRefreshInventory={() => {
              SoundEngine.play('tick');
              alert('✅ Inventory refreshed with latest warehouse balances.');
            }}
            onOpenScanBill={() => setIsAiScannerOpen(true)}
          />
        )}

        {/* Inventory Control */}
        {effectiveModule === 'inventory' && (
          <InventoryView
            inventory={inventory}
            masterSkus={allMasterSkus}
            onSaveInventory={handleSaveInventory}
            onOpenScanBill={() => setIsAiScannerOpen(true)}
          />
        )}

        {/* OilCost Pro */}
        {effectiveModule === 'oilcost' && (
          <OilCostProView
            user={displayUser}
            commodities={commodities}
            ports={ports}
            packingData={packingData}
            oilPrices={oilPrices}
            savedPIs={savedPIs}
            negotiations={negotiations}
            poSellerConfig={poSellerConfig}
            inventory={inventory}
            orders={orders}
            floorPolicy={floorPolicy}
            onUpdateCommodities={handleUpdateCommodities}
            onUpdatePorts={handleUpdatePorts}
            onUpdatePoSellerConfig={handleUpdatePoSellerConfig}
            onUpdateFloorPolicy={handleUpdateFloorPolicy}
            onSavePI={handleSavePI}
            onSaveNegotiation={handleSaveNegotiation}
            onDeletePI={handleDeletePI}
            onDeleteNegotiation={handleDeleteNegotiation}
            onUpdateOilPrices={setOilPrices}
            onUpdatePackingData={setPackingData}
            onResetCommodityPacking={key => {
              const initialDefaults = buildInitialPackingData();
              const next = { ...packingData, [key]: initialDefaults[key] || [] };
              setPackingData(next);
              try { localStorage.setItem('gfi_packing_master_v2', JSON.stringify(next)); } catch {}
            }}
            onNotify={msg => {
              console.log('notify:', msg);
            }}
            onPrintOfficialPI={setActivePrintingPI}
          />
        )}

        {/* Super Admin Access & RBAC Governance Dashboard */}
        {effectiveModule === 'access' && (
          <AccessControlView
            currentUser={displayUser}
            staffDirectory={staffDirectory}
            floorPolicy={floorPolicy}
            previewingAsEmail={previewingAsEmail}
            onSaveStaffDirectory={handleSaveStaffDirectory}
            onUpdateFloorPolicy={handleUpdateFloorPolicy}
            onPreviewAsUser={setPreviewingAsEmail}
            onNotify={msg => {
              SoundEngine.play('tick');
              alert(msg);
            }}
          />
        )}
      </main>

      {/* AI Camera & Image Bill Scanner Modal */}
      <AiBillScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        onApplyBillUpdates={handleApplyBillUpdates}
      />

      {/* Universal File Upload Modal (PDF, CSV, XLS, XLSX) */}
      <UniversalUploadModal
        isOpen={isUniversalUploadOpen}
        onClose={() => setIsUniversalUploadOpen(false)}
        onApplyInventoryUpdates={handleApplyUniversalUploadUpdates}
      />

      {/* Printable Modal (Official Commercial Invoices) */}
      <PrintModal
        invoice={activePrintingPI}
        onClose={() => setActivePrintingPI(null)}
      />

      {/* 360° Party Dossier Modal (All Orders, Packaging Deficit & Dispatches) */}
      {selectedPartyForDossier && (
        <PartyDetailModal
          isOpen={true}
          partyCode={selectedPartyForDossier.code}
          partyName={selectedPartyForDossier.name}
          allOrders={prodOrders}
          allDispatches={dispatches}
          allMasterItems={masterItems}
          onClose={() => setSelectedPartyForDossier(null)}
          onUpdateOrder={handleUpdateProdOrder}
        />
      )}

      {/* Place Production Order & Auto-Deduct Inventory Modal */}
      <PlaceOrderModal
        isOpen={isPlaceOrderOpen}
        onClose={() => setIsPlaceOrderOpen(false)}
        inventory={inventory}
        existingParties={existingPartiesList}
        onConfirmPlaceOrder={handleConfirmPlaceOrderAndDeductStock}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 dark:text-slate-200">Global Futura Inc.</span>
            <span>•</span>
            <span>500 N Broadway, Suite 163, Jericho, NY 11753</span>
          </div>
          <div className="text-[11px]">
            Enterprise Operations & Costing Suite v2.6.0 • Global Futura Inc. • © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
