"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Truck,
  FileSpreadsheet,
  Receipt,
  Users,
  Wrench,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  User,
  ShoppingBag,
  Store,
  UserCheck,
  BookOpen,
  Scale,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bot,
  ShieldCheck,
  TrendingUp,
  Sliders,
  Mail,
  ChevronDown,
  Bell,
  Headphones,
  Zap,
  Info,
  ExternalLink,
  ArrowLeftRight,
  FileText,
} from "lucide-react";
import { ToastProvider } from "@/components/shared/ToastProvider";
import SpeedDialFAB from "@/components/shared/SpeedDialFAB";
import MobileBottomNav from "@/components/shared/MobileBottomNav";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[]; // Allowed roles fallback
  permissions?: string[]; // Allowed RBAC permissions
}

interface NavigationGroup {
  id: string;
  title: string;
  defaultOpen?: boolean;
  items: MenuItem[];
}

const PINNED_ITEMS: MenuItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permissions: ["VIEW_DASHBOARD"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["Admin"], permissions: ["MANAGE_USERS", "MANAGE_ROLES"] },
];

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "financials",
    title: "Financials & Accounts",
    defaultOpen: true,
    items: [
      { name: "Debit / Credit Entry", href: "/financials?tab=record", icon: ArrowLeftRight, roles: ["Admin", "Accountant"], permissions: ["VIEW_FINANCIALS", "VIEW_REPORTS"] },
      { name: "General Ledger", href: "/financials?tab=general-ledger", icon: BookOpen, roles: ["Admin", "Accountant"], permissions: ["VIEW_FINANCIALS", "VIEW_REPORTS"] },
      { name: "Financial Insights", href: "/financials", icon: TrendingUp, roles: ["Admin", "Accountant", "Investor"], permissions: ["VIEW_FINANCIALS"] },
    ],
  },
  {
    id: "sales-customers",
    title: "Sales & Customers",
    defaultOpen: true,
    items: [
      { name: "Customers", href: "/sales?tab=customers", icon: Users, roles: ["Admin", "Sales", "Accountant", "Support"], permissions: ["MANAGE_SALES", "MANAGE_SUPPORT", "VIEW_FINANCIALS"] },
      { name: "Quotations", href: "/sales?tab=quotations", icon: FileText, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES", "VIEW_FINANCIALS"] },
      { name: "Invoicing", href: "/sales?tab=invoices", icon: FileSpreadsheet, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES", "VIEW_FINANCIALS"] },
      { name: "Sales Setup", href: "/sales?tab=sales_setup", icon: Settings, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES"] },
      { name: "Delivery Order", href: "/sales?tab=dos", icon: Receipt, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES", "MANAGE_INVENTORY"] },
      { name: "Returns", href: "/sales?tab=customer_returns", icon: ShoppingBag, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES"] },
      { name: "Customer Care", href: "/customer-care", icon: Headphones, roles: ["Admin", "Support", "Sales", "Accountant"], permissions: ["MANAGE_SUPPORT", "MANAGE_SALES"] },
      { name: "Automations", href: "/automations", icon: Zap, roles: ["Admin", "Sales", "Accountant"], permissions: ["MANAGE_SALES", "MANAGE_SUPPORT"] },
    ],
  },
  {
    id: "field-operations",
    title: "Field Operations",
    defaultOpen: true,
    items: [
      { name: "Complaints", href: "/support", icon: Wrench, roles: ["Admin", "Support", "Technician", "Sales", "Accountant"], permissions: ["MANAGE_SUPPORT"] },
      { name: "Technicians", href: "/support?tab=technicians", icon: UserCheck, roles: ["Admin", "Support", "Technician", "Sales", "Accountant"], permissions: ["MANAGE_SUPPORT", "MANAGE_HRM"] },
    ],
  },
  {
    id: "warehouse-procurement",
    title: "Warehouse & Procurement",
    defaultOpen: true,
    items: [
      { name: "Purchase Order", href: "/procurement?tab=pos", icon: Truck, roles: ["Admin", "Inventory/Procurement", "Accountant"], permissions: ["MANAGE_PROCUREMENT"] },
      { name: "Stock", href: "/inventory", icon: Box, roles: ["Admin", "Inventory/Procurement", "Accountant"], permissions: ["MANAGE_INVENTORY"] },
      { name: "Vendors", href: "/procurement?tab=vendors", icon: Store, roles: ["Admin", "Inventory/Procurement", "Accountant"], permissions: ["MANAGE_PROCUREMENT", "VIEW_FINANCIALS"] },
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    defaultOpen: true,
    items: [
      { name: "Employees & Payroll", href: "/hrm", icon: Users, roles: ["Admin", "Accountant"], permissions: ["MANAGE_HRM"] },
    ],
  },
  {
    id: "business-pulse",
    title: "Reports & Analytics",
    defaultOpen: true,
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3, roles: ["Admin", "Accountant", "Investor"], permissions: ["VIEW_REPORTS"] },
      { name: "Report Builder", href: "/reports/builder", icon: Sliders, roles: ["Admin", "Accountant"], permissions: ["VIEW_REPORTS"] },
      { name: "Scheduled Reports", href: "/reports/schedules", icon: Mail, roles: ["Admin", "Accountant"], permissions: ["VIEW_REPORTS"] },
      { name: "AI Copilot", href: "/copilot", icon: Bot, roles: ["Admin", "Accountant", "Sales", "Inventory/Procurement", "Support", "Technician", "Investor"], permissions: ["VIEW_DASHBOARD", "VIEW_FINANCIALS", "MANAGE_SALES", "MANAGE_SUPPORT", "MANAGE_PROCUREMENT"] },
    ],
  },
  {
    id: "system",
    title: "System",
    defaultOpen: false, // Collapsed by default
    items: [
      { name: "Audit Trail", href: "/audit", icon: ShieldCheck, roles: ["Admin"], permissions: ["MANAGE_ROLES", "MANAGE_USERS"] },
      { name: "System Info", href: "/system-info", icon: Info, roles: ["Admin", "Accountant"], permissions: ["VIEW_DASHBOARD"] },
    ],
  },
];

const ALL_MENU_ITEMS: MenuItem[] = [
  ...PINNED_ITEMS,
  ...NAVIGATION_GROUPS.flatMap((g) => g.items),
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [universalSearch, setUniversalSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Collapsible Accordion Groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    financials: true,
    "sales-customers": true,
    "field-operations": true,
    "warehouse-procurement": true,
    "human-resources": true,
    "business-pulse": true,
    system: false, // Collapsed by default
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (href: string) => {
    const currentSearch = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    const currentFullUrl = pathname + currentSearch;

    if (href.includes("?")) {
      return currentFullUrl === href || currentFullUrl.startsWith(href + "&");
    }

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    if (pathname === href) {
      return !currentSearch;
    }

    if (pathname.startsWith(href + "/")) {
      const hasMoreSpecificItem = ALL_MENU_ITEMS.some((other) => other.href === pathname || other.href === currentFullUrl);
      return !hasMoreSpecificItem && !currentSearch;
    }

    return false;
  };

  // Auto-expand group when navigating to an item inside it
  useEffect(() => {
    NAVIGATION_GROUPS.forEach((group) => {
      const hasActiveItem = group.items.some((item) => isItemActive(item.href));
      if (hasActiveItem) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!universalSearch.trim() || universalSearch.length < 2) {
      setGlobalSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(universalSearch)}`);
        const data = await res.json();
        if (data.success) {
          setGlobalSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Global search fetch error", err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [universalSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("universal-search-input");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    setCollapsed(isCollapsed);
  }, []);

  const toggleCollapse = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    localStorage.setItem("sidebar-collapsed", String(nextCollapsed));
  };

  // 1. Theme configuration
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    if (nextDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  // 2. Authentication check - Allow public routes without login redirect
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/delivery/confirm");

  const isPdfPage = pathname.endsWith("/pdf") || pathname.includes("/pdf/");

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    const verifySession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/");
          return;
        }

        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        console.error("Auth verification failed", err);
        localStorage.removeItem("token");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [pathname, router, isPublicPage]);

  // Real-time live counts
  useEffect(() => {
    if (isPublicPage || isPdfPage) return;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.summary) {
            setStats(data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats in Shell", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 45000); // poll every 45s
    return () => clearInterval(interval);
  }, [isPublicPage, isPdfPage]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("token");
      setCurrentUser(null);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on public page (login, reset password, or delivery QR verification), bypass sidebar shell layout entirely
  if (isPublicPage) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">{children}</div>;
  }

  // If on dedicated PDF print page (Invoice, PO, DO), bypass sidebar, top bar, floating widgets, and shell chrome entirely
  if (isPdfPage) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 print:bg-white text-slate-800 dark:text-slate-100">
        {children}
      </div>
    );
  }

  // Filter menu items by dynamic RBAC permissions and user role
  const userRole = currentUser?.role?.name || "";
  const userPermissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isAdmin = userRole.toLowerCase() === "admin";

  const isItemVisible = (item: MenuItem) => {
    if (isAdmin) return true;
    // 1. Dynamic RBAC permissions check: if user has any assigned permission matching this item
    if (item.permissions && item.permissions.some((p) => userPermissions.includes(p))) {
      return true;
    }
    // 2. Static role check fallback
    if (item.roles && item.roles.includes(userRole)) {
      return true;
    }
    // 3. If no restrictions defined, item is visible to all authenticated users
    if (!item.roles && !item.permissions) {
      return true;
    }
    return false;
  };

  const filteredPinnedItems = PINNED_ITEMS.filter(isItemVisible);
  const filteredMenuItems = ALL_MENU_ITEMS.filter(isItemVisible);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-all"
        />
      )}

      {/* Sidebar navigation panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transform lg:translate-x-0 lg:static lg:h-screen transition-all duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Brand header */}
          <div className="h-20 flex items-center justify-center px-4 border-b border-slate-100 dark:border-slate-800/80 relative flex-shrink-0">
            {!collapsed ? (
              <div className="flex items-center justify-center h-16 w-full animate-fadeIn">
                <img src="/logo.png" alt="TCE Logo" className="h-14 w-auto object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 w-full animate-fadeIn">
                <img src="/logo.png" alt="TCE Logo" className="h-10 w-auto object-contain" />
              </div>
            )}
            <button
              onClick={toggleCollapse}
              className="absolute right-2 hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute right-4 top-6 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Links navigation list with PINNED & COLLAPSIBLE GROUPS */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {/* PINNED (ALWAYS VISIBLE OUTSIDE GROUPS) */}
            <div className="space-y-1">
              {filteredPinnedItems.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setSidebarOpen(false);
                      router.push(item.href);
                    }}
                    title={collapsed ? item.name : undefined}
                    className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      active
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    } ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </button>
                );
              })}
            </div>

            {/* DIVIDER */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {/* COLLAPSIBLE NAVIGATION GROUPS */}
            <div className="space-y-2.5">
              {NAVIGATION_GROUPS.map((group) => {
                const visibleItems = group.items.filter(isItemVisible);
                if (visibleItems.length === 0) return null;

                const isOpen = !!openGroups[group.id];
                const hasActiveItem = visibleItems.some((item) => isItemActive(item.href));

                return (
                  <div key={group.id} className="space-y-1">
                    {/* Group Header Button */}
                    {!collapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-2.5 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${hasActiveItem ? "bg-blue-500" : "bg-transparent"}`} />
                          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 truncate">
                            {group.title}
                          </span>
                        </div>
                        <div className="text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    ) : (
                      <div className="w-full border-t border-slate-100 dark:border-slate-800/60 my-1.5" />
                    )}

                    {/* Group Items (Collapsible with smooth hierarchy line) */}
                    {(isOpen || collapsed) && (
                      <div className={`${!collapsed ? "space-y-0.5 ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800" : "space-y-1"}`}>
                        {visibleItems.map((item) => {
                          const active = isItemActive(item.href);
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.href}
                              onClick={() => {
                                setSidebarOpen(false);
                                router.push(item.href);
                              }}
                              title={collapsed ? item.name : undefined}
                              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                                active
                                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-bold"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                              } ${collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-1.5"}`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              {!collapsed && <span className="truncate">{item.name}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* User logout section bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className={`flex items-center mb-4 px-2 ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{userRole}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-sm font-bold transition-all ${
              collapsed ? "justify-center p-3" : "gap-3 px-4 py-2"
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase hidden xl:block">
              {pathname.split("/").filter(Boolean).join(" / ") || "Dashboard"}
            </h1>
          </div>

          {/* Center actions: Live DB Metrics & Shortcuts */}
          <div className="flex items-center gap-4 flex-1 justify-center max-w-xl px-4">
            {/* Universal Search Bar */}
            <div className="relative hidden md:block w-full">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="universal-search-input"
                  type="text"
                  placeholder="Search database or pages..."
                  className="w-full pl-9 pr-16 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all"
                  value={universalSearch}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={(e) => setUniversalSearch(e.target.value)}
                />
                <div className="absolute right-2 top-1.5 flex items-center pointer-events-none text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded px-1.5 py-0.5 shadow-xs">
                  Ctrl + K
                </div>
              </div>

              {showDropdown && (
                <div className="absolute top-11 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-2 animate-fadeIn">
                  {/* Navigation Matches */}
                  {filteredMenuItems.filter((item) =>
                    item.name.toLowerCase().includes(universalSearch.toLowerCase())
                  ).length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 block tracking-wider">
                        Pages & Modules
                      </span>
                      {filteredMenuItems
                        .filter((item) =>
                          item.name.toLowerCase().includes(universalSearch.toLowerCase())
                        )
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.href}
                              onMouseDown={() => {
                                router.push(item.href);
                                setUniversalSearch("");
                                setShowDropdown(false);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span>{item.name}</span>
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {/* Database Matches */}
                  {globalSearchResults.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 block tracking-wider border-t border-slate-100 dark:border-slate-800 pt-2">
                        Database Records ({globalSearchResults.length})
                      </span>
                      {globalSearchResults.map((res, idx) => (
                        <button
                          key={idx}
                          onMouseDown={() => {
                            router.push(res.url);
                            setUniversalSearch("");
                            setShowDropdown(false);
                          }}
                          className="w-full px-3 py-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-xl flex flex-col text-left transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {res.title}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
                              {res.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 truncate mt-0.5">{res.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchLoading && (
                    <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2 justify-center">
                      <Search className="w-3.5 h-3.5 animate-spin text-blue-500" /> Searching database...
                    </div>
                  )}

                  {!searchLoading &&
                    globalSearchResults.length === 0 &&
                    filteredMenuItems.filter((item) =>
                      item.name.toLowerCase().includes(universalSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-4 text-xs text-slate-400 text-center font-medium">
                        No matching records or pages found
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* DB Alerts indicators */}
            {stats && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                {stats.lowStockCount > 0 && (
                  <button
                    onClick={() => router.push("/inventory")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/40 font-bold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                    title={`${stats.lowStockCount} Low stock items`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{stats.lowStockCount}</span>
                  </button>
                )}
                {stats.openComplaintsCount > 0 && (
                  <button
                    onClick={() => router.push("/support")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/40 font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors"
                    title={`${stats.openComplaintsCount} Open complaints`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{stats.openComplaintsCount}</span>
                  </button>
                )}
                {stats.pendingPOItemsCount > 0 && (
                  <button
                    onClick={() => router.push("/procurement?tab=pos")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                    title={`${stats.pendingPOItemsCount} PO delivery items pending`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{stats.pendingPOItemsCount}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right actions panel */}
          <div className="flex items-center gap-3">
            {/* Gradient Ask Copilot shortcut */}
            {pathname !== "/copilot" && (
              <button
                onClick={() => router.push("/copilot")}
                className="relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Bot className="w-4 h-4 animate-bounce" style={{ animationDuration: "2s" }} />
                <span>Ask AI</span>
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              </button>
            )}

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 transition-all"
              title="Toggle Light/Dark Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Logged in profile dropdown menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn flex flex-col gap-0.5">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize block mt-0.5 font-semibold">
                      {userRole}
                    </span>
                  </div>
                  <button
                    onMouseDown={() => router.push("/settings")}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings</span>
                  </button>
                  <button
                    onMouseDown={() => router.push("/system-info")}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <span>System Info</span>
                  </button>
                  <button
                    onMouseDown={handleLogout}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6 no-scrollbar flex flex-col justify-between">
          <div className="max-w-7xl mx-auto w-full animate-fadeIn flex-1">{children}</div>

          {/* Universal Dashboard / Page Footer */}
          <footer className="max-w-7xl mx-auto w-full mt-10 pt-5 pb-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">&copy; {new Date().getFullYear()} TCE ERP</span>
              <span>•</span>
              <span>Technicool Engineering</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span>Powered by</span>
              <a
                href="https://omnysync.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 transition-colors"
              >
                OMNYSYNC
                <ExternalLink className="w-3 h-3 inline-block" />
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* Global Quick Add Speed Dial FAB */}
      <SpeedDialFAB />

      {/* Mobile Bottom Thumb Navigation Bar */}
      <MobileBottomNav />
    </div>
    </ToastProvider>
  );
}
