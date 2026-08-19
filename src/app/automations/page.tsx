"use client";

import React, { useState } from "react";
import {
  Zap,
  Play,
  Pause,
  Sparkles,
  Star,
  Share2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  MessageCircle,
  Send,
  Plus,
  Settings,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Wrench,
  X,
  Copy,
  Check,
  Facebook,
  Instagram,
  Eye,
  Sliders,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";
import Link from "next/link";

interface AutomationWorkflow {
  id: string;
  title: string;
  description: string;
  category: "growth" | "reviews" | "social";
  categoryLabel: string;
  isActive: boolean;
  channel: "whatsapp" | "sms" | "multichannel";
  trigger: string;
  condition: string;
  delay: string;
  action: string;
  totalTriggered: number;
  successRate: number;
  metricLabel: string;
  metricValue: string;
  templateMessage: string;
  steps: Array<{
    type: "trigger" | "condition" | "delay" | "action" | "outcome";
    title: string;
    description: string;
  }>;
}

const PRESET_AUTOMATIONS: AutomationWorkflow[] = [
  {
    id: "auto-1",
    title: "Database Reactivation & Seasonal AC Tune-Up Campaign",
    description: "Re-engages dormant HVAC customers who haven't booked service in >180 days with a 15% seasonal AC tune-up voucher.",
    category: "growth",
    categoryLabel: "Database Reactivation",
    isActive: true,
    channel: "whatsapp",
    trigger: "On-demand execution for customers with no recent job in >180 days",
    condition: "Has at least 1 registered HVAC unit in system",
    delay: "Dispatched immediately upon execution",
    action: "Send personalized WhatsApp with seasonal booking voucher",
    totalTriggered: 480,
    successRate: 28.4,
    metricLabel: "Reactivated Revenue",
    metricValue: "PKR 490,000",
    templateMessage: "Assalam-o-Alaikum {{customer_name}}! ❄️ Before peak heat sets in, get your AC deep-cleaned with our Technicool Master Jet-Wash service. Use code SUMMER15 for 15% off. Reply to book your priority technician slot!",
    steps: [
      { type: "trigger", title: "User Clicks Execute Campaign", description: "Scans active customer database for eligible contacts" },
      { type: "condition", title: "Unit & History Check", description: "Verifies customer contact info and unit history" },
      { type: "action", title: "Dispatch WhatsApp Campaign", description: "Delivers personalized promotional offer" },
      { type: "outcome", title: "Log Execution in Activity CRM", description: "Tracks replies and bookings in customer log" },
    ],
  },
  {
    id: "auto-2",
    title: "Google Maps 5-Star Review Funnel Booster",
    description: "Dispatches 5-star Google review invitations to clients with recently completed service or installation jobs.",
    category: "reviews",
    categoryLabel: "Google Reviews",
    isActive: true,
    channel: "whatsapp",
    trigger: "On-demand execution for clients with COMPLETED service tickets",
    condition: "Job marked resolved/completed in technician portal",
    delay: "Dispatched immediately upon execution",
    action: "Send WhatsApp review prompt with direct 1-click Google Maps review link",
    totalTriggered: 312,
    successRate: 46.2,
    metricLabel: "Reviews Generated",
    metricValue: "144 Reviews (4.9 ⭐)",
    templateMessage: "Hi {{customer_name}}, thank you for choosing Technicool Engineering! If you had a great experience with our team, could you please take 10 seconds to leave us a 5-star review on Google? It helps our local technicians immensely: https://g.page/r/technicool/review",
    steps: [
      { type: "trigger", title: "User Clicks Execute Campaign", description: "Fetches completed jobs from service database" },
      { type: "condition", title: "Quality Check", description: "Filters customers with resolved service tickets" },
      { type: "action", title: "Send Direct Review URL", description: "Opens Google Maps review dialog in 1 click" },
      { type: "outcome", title: "Customer Loyalty Tag", description: "Marks customer profile as Reviewed VIP" },
    ],
  },
  {
    id: "auto-3",
    title: "Social Media Community & Follower Magnet (FB & IG)",
    description: "Invites verified customers to join the Technicool Facebook and Instagram communities for seasonal maintenance tips and discounts.",
    category: "social",
    categoryLabel: "Social Growth",
    isActive: true,
    channel: "multichannel",
    trigger: "On-demand execution for all active customer contacts",
    condition: "Customer has mobile number on file",
    delay: "Dispatched immediately upon execution",
    action: "Send WhatsApp & SMS invitation with official social handles",
    totalTriggered: 620,
    successRate: 34.0,
    metricLabel: "New Social Followers",
    metricValue: "+210 Followers",
    templateMessage: "Thank you {{customer_name}}! 🌟 Stay updated with AC energy-saving tips, inverter voltage guides, and seasonal giveaways on our official pages: 👍 Facebook: fb.com/technicool 📸 Instagram: @technicool_pk",
    steps: [
      { type: "trigger", title: "User Clicks Execute Campaign", description: "Loads active customer records" },
      { type: "action", title: "Deliver Social Follower Invitation", description: "Sends interactive WhatsApp & SMS invitation" },
      { type: "outcome", title: "Tag Customer in CRM", description: "Adds Social Follower VIP tag" },
    ],
  },
];

export default function AutomationsPage() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(PRESET_AUTOMATIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeWorkflow, setActiveWorkflow] = useState<AutomationWorkflow | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AutomationWorkflow | null>(null);
  const [executingWorkflow, setExecutingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New automation wizard form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<any>("growth");
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newChannel, setNewChannel] = useState<any>("whatsapp");

  const toggleAutomation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const nextState = !auto.isActive;
          toast({
            title: nextState ? "Automation Ready" : "Automation Disabled",
            message: `${auto.title} is now ${nextState ? "READY" : "PAUSED"}.`,
            type: nextState ? "success" : "info",
          });
          return { ...auto, isActive: nextState };
        }
        return auto;
      })
    );
  };

  const handleExecuteCampaign = async () => {
    if (!executingWorkflow) return;
    setIsExecuting(true);

    try {
      // Simulate dispatch execution
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setAutomations((prev) =>
        prev.map((a) => {
          if (a.id === executingWorkflow.id) {
            return {
              ...a,
              totalTriggered: a.totalTriggered + 25,
            };
          }
          return a;
        })
      );

      toast({
        title: "Campaign Executed Successfully",
        message: `Dispatched "${executingWorkflow.title}" to target audience via ${executingWorkflow.channel.toUpperCase()}.`,
        type: "success",
      });

      setExecutingWorkflow(null);
    } catch (err: any) {
      toast({
        title: "Execution Error",
        message: err.message || "Failed to execute campaign.",
        type: "error",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCreateAutomation = () => {
    if (!newTitle.trim() || !newTrigger.trim()) {
      toast({ title: "Missing Fields", message: "Please enter a title and trigger condition.", type: "error" });
      return;
    }

    const created: AutomationWorkflow = {
      id: `auto-${Date.now()}`,
      title: newTitle,
      description: `Custom ${newCategory} automated sequence.`,
      category: newCategory,
      categoryLabel: newCategory.toUpperCase(),
      isActive: true,
      channel: newChannel,
      trigger: newTrigger,
      condition: "Target match customer criteria",
      delay: "Instant on user execution",
      action: newAction || "Send automated message to client",
      totalTriggered: 0,
      successRate: 0,
      metricLabel: "Conversions",
      metricValue: "0",
      templateMessage: "Hello {{customer_name}}, this is an update regarding your Technicool Engineering HVAC system.",
      steps: [
        { type: "trigger", title: "User Clicks Execute", description: "Manual trigger from Automations console" },
        { type: "condition", title: "Audience Filter", description: "Verifies eligibility criteria" },
        { type: "action", title: "Deliver Message", description: `Sends via ${newChannel.toUpperCase()}` },
        { type: "outcome", title: "Log Outcome", description: "Records response in customer activity history" },
      ],
    };

    setAutomations((prev) => [created, ...prev]);
    setCreateModalOpen(false);
    setNewTitle("");
    setNewTrigger("");
    setNewAction("");

    toast({
      title: "Automation Created",
      message: `Workflow "${created.title}" is ready for execution.`,
      type: "success",
    });
  };

  const filteredAutomations = automations.filter((auto) => {
    if (selectedCategory === "ALL") return true;
    return auto.category === selectedCategory;
  });

  const totalTriggered = automations.reduce((acc, a) => acc + a.totalTriggered, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ================= HEADER & TOP KPI STRIP ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-xl text-white shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Customer Automations & Campaigns
              </h1>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold border border-blue-200/40">
                User-Triggered Execution
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Execute customer outreach campaigns on demand. Scheduled email reports run automatically under{" "}
              <Link href="/reports/schedules" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Scheduled Reports
              </Link>.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* ================= 3 TOP IMPACT STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Total Messages Dispatched</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalTriggered.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Across WhatsApp, SMS & Social</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Google 5-Star Reviews</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">144 Reviews</p>
          <p className="text-[11px] text-emerald-500 font-semibold mt-1">4.9 ⭐ Average Rating</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Reactivated Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">PKR 490,000</p>
          <p className="text-[11px] text-slate-400 mt-1">From dormant customer tune-up promos</p>
        </div>
      </div>

      {/* ================= CATEGORY FILTER TABS ================= */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "ALL", label: "All Campaigns" },
          { id: "growth", label: "Database Reactivation" },
          { id: "reviews", label: "Google Maps Reviews" },
          { id: "social", label: "Social Media Growth" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === tab.id
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= AUTOMATION WORKFLOW CARDS GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {filteredAutomations.map((auto) => (
          <div
            key={auto.id}
            onClick={() => setActiveWorkflow(auto)}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            {/* Header: Title, Category Badge */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase">
                  {auto.categoryLabel}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                  {auto.channel}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                {auto.title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                {auto.description}
              </p>
            </div>

            {/* Workflow Trigger / Action Flow Summary */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-16 shrink-0">Trigger</span>
                <span className="truncate font-semibold">{auto.trigger}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-16 shrink-0">Action</span>
                <span className="truncate font-semibold">{auto.action}</span>
              </div>
            </div>

            {/* Execution CTA Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{auto.metricLabel}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs font-mono">{auto.metricValue}</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExecutingWorkflow(auto);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Campaign</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ================= EXECUTION CONFIRMATION MODAL ================= */}
      {executingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-blue-600">
                  <Play className="w-5 h-5 fill-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Execute Campaign
                  </h3>
                  <span className="text-xs text-slate-500">{executingWorkflow.categoryLabel}</span>
                </div>
              </div>
              <button
                onClick={() => setExecutingWorkflow(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Campaign Target</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{executingWorkflow.title}</p>
                <p className="text-slate-500 mt-1">{executingWorkflow.description}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <span className="text-[10px] uppercase font-bold block mb-1">Message Preview</span>
                <p className="italic">{executingWorkflow.templateMessage}</p>
              </div>

              <div className="flex items-center justify-between text-xs p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                <span>Delivery Channel:</span>
                <span className="font-bold uppercase text-slate-900 dark:text-white">{executingWorkflow.channel}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setExecutingWorkflow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCampaign}
                disabled={isExecuting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Campaign...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Execute & Dispatch Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKFLOW STEP FLOWCHART MODAL ================= */}
      {activeWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase">
                  {activeWorkflow.categoryLabel} Blueprint
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {activeWorkflow.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveWorkflow(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Step-by-Step Canvas */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sequence Flow</span>
              <div className="space-y-2">
                {activeWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>

                    <div className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{step.title}</h4>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                          {step.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveWorkflow(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE AUTOMATION MODAL ================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Campaign Workflow
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Campaign Title</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Customer AC Recommissioning Offer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="growth">Database Reactivation</option>
                    <option value="reviews">Google Reviews</option>
                    <option value="social">Social Media Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Channel</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="whatsapp">WhatsApp Business</option>
                    <option value="sms">SMS Priority</option>
                    <option value="multichannel">Multi-Channel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trigger Condition</label>
                <input
                  type="text"
                  placeholder="e.g. When user executes campaign for customers with past AC service"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Action Description</label>
                <input
                  type="text"
                  placeholder="e.g. Send WhatsApp message with seasonal promo voucher"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAutomation}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
