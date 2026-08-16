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
} from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";

interface AutomationWorkflow {
  id: string;
  title: string;
  description: string;
  category: "growth" | "reviews" | "social" | "retention" | "finance";
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
    title: "Database Reactivation & Seasonal Tune-Up Promo",
    description: "Re-engages dormant HVAC customers who haven't booked service in >180 days with a 15% seasonal AC tune-up voucher.",
    category: "growth",
    categoryLabel: "Database Reactivation",
    isActive: true,
    channel: "whatsapp",
    trigger: "Customer last service date > 180 days ago",
    condition: "Has at least 1 registered HVAC unit in system",
    delay: "Scheduled every Tuesday & Thursday at 11:00 AM",
    action: "Send personalized WhatsApp with seasonal booking voucher",
    totalTriggered: 480,
    successRate: 28.4,
    metricLabel: "Reactivated Revenue",
    metricValue: "PKR 490,000",
    templateMessage: "Assalam-o-Alaikum {{customer_name}}! ❄️ Before peak summer sets in, get your {{installed_unit}} deep-cleaned with our Master Jet-Wash service. Use code SUMMER15 for 15% off. Click here to book your priority slot: https://hvac.pk/book",
    steps: [
      { type: "trigger", title: "Customer Inactive > 180 Days", description: "Scans database for clients with no logged jobs since 6 months" },
      { type: "condition", title: "Unit Check", description: "Verifies client has active HVAC unit records on file" },
      { type: "action", title: "Dispatch WhatsApp Message", description: "Sends interactive WhatsApp template with discount code" },
      { type: "delay", title: "Wait 48 Hours", description: "Monitors if client replies or clicks booking link" },
      { type: "outcome", title: "Follow-up SMS or Agent Notification", description: "Alerts sales rep if client initiates chat inquiry" },
    ],
  },
  {
    id: "auto-2",
    title: "Google Maps 5-Star Review Funnel Booster",
    description: "Automatically requests 5-star Google Maps reviews after a technician marks a service complaint or installation as COMPLETED.",
    category: "reviews",
    categoryLabel: "Google Reviews",
    isActive: true,
    channel: "whatsapp",
    trigger: "Service complaint or installation status changed to COMPLETED",
    condition: "Client rating >= 4 stars on initial feedback prompt",
    delay: "2 Hours after job completion",
    action: "Send WhatsApp review prompt with direct 1-click Google Maps review URL",
    totalTriggered: 312,
    successRate: 46.2,
    metricLabel: "Reviews Generated",
    metricValue: "144 Reviews (4.9 ⭐)",
    templateMessage: "Hi {{customer_name}}, thank you for choosing HVAC ERP Services! Technician {{technician_name}} recently completed your service. If you had a great experience, could you please take 10 seconds to drop us a 5-star review on Google? {{google_review_link}} - It helps our local team immensely!",
    steps: [
      { type: "trigger", title: "Job Marked COMPLETED", description: "Technician marks ticket finished in technician portal" },
      { type: "delay", title: "Wait 2 Hours", description: "Allows cooling effect and customer to inspect HVAC performance" },
      { type: "action", title: "Send Review Link on WhatsApp", description: "Direct link opening Google Maps review dialog directly" },
      { type: "outcome", title: "Review Verification & 90-Day Warranty Certificate", description: "Automatically texts client their digital warranty card" },
    ],
  },
  {
    id: "auto-3",
    title: "Social Media Follower Magnet (FB & IG)",
    description: "Invites customers to follow the official Facebook page and Instagram after payment to receive maintenance tips and seasonal coupons.",
    category: "social",
    categoryLabel: "Social Growth",
    isActive: true,
    channel: "multichannel",
    trigger: "Invoice status updated to PAID",
    condition: "Customer has mobile number on file",
    delay: "10 Minutes after payment receipt",
    action: "Send WhatsApp message with Facebook Page & Instagram follow links",
    totalTriggered: 620,
    successRate: 34.0,
    metricLabel: "New Social Followers",
    metricValue: "210 Followers",
    templateMessage: "Payment Received! Thank you {{customer_name}}. 🌟 Stay updated with AC energy-saving tips, inverter voltage protection guides, and exclusive follower giveaways on our social pages: 👍 Facebook: https://fb.com/hvacerp 📸 Instagram: @hvac_official_pk",
    steps: [
      { type: "trigger", title: "Invoice Marked PAID", description: "Cash, Card, or Bank payment logged in ERP" },
      { type: "delay", title: "Wait 10 Minutes", description: "Short delay after digital receipt dispatch" },
      { type: "action", title: "Deliver Social Follower Invitation", description: "Sends interactive WhatsApp & SMS invitation with social handles" },
      { type: "outcome", title: "Tag Customer in CRM", description: "Adds 'Social Follower VIP' tag to customer CRM profile" },
    ],
  },
  {
    id: "auto-4",
    title: "Preventive Maintenance & Filter Expiry Alert",
    description: "Automated seasonal reminder alerting customers when their inverter filters and coils are due for routine servicing.",
    category: "retention",
    categoryLabel: "Retention & Care",
    isActive: true,
    channel: "whatsapp",
    trigger: "120 Days elapsed since last maintenance check",
    condition: "No pending open complaint in support queue",
    delay: "At 10:00 AM on 120th day",
    action: "Send WhatsApp health inspection reminder with 1-click slot picker",
    totalTriggered: 290,
    successRate: 31.0,
    metricLabel: "Booked Inspections",
    metricValue: "90 Jobs Booked",
    templateMessage: "Dear {{customer_name}}, clean air filters save up to 25% on electricity bills! Your {{installed_unit}} was last serviced 4 months ago. Reply 'YES' to schedule a quick 30-minute filter & gas pressure inspection this week.",
    steps: [
      { type: "trigger", title: "120 Days Since Service", description: "Automated timer trigger based on invoice history" },
      { type: "condition", title: "Queue Check", description: "Ensures no unresolved complaints exist for this client" },
      { type: "action", title: "Deliver Filter Health Reminder", description: "Dispatches WhatsApp message with energy savings calculation" },
      { type: "outcome", title: "Auto-create Diagnostic Ticket", description: "If client replies YES, automatically opens service ticket" },
    ],
  },
  {
    id: "auto-5",
    title: "Overdue Invoice & Payment Chaser Sequence",
    description: "Gentle automated payment reminders sent before invoice due date, on due date, and at 7 days overdue with online payment link.",
    category: "finance",
    categoryLabel: "Finance & Cash Flow",
    isActive: true,
    channel: "sms",
    trigger: "Invoice status is UNPAID and due date approaching / passed",
    condition: "Outstanding balance > PKR 1,000",
    delay: "D-3 (Upcoming), Due Date, and D+7 (Overdue)",
    action: "Send SMS & WhatsApp payment reminder with bank IBAN and online pay link",
    totalTriggered: 180,
    successRate: 72.0,
    metricLabel: "Collected Revenue",
    metricValue: "PKR 1,120,000",
    templateMessage: "Reminder: Invoice #{{invoice_number}} for PKR {{invoice_amount}} is due on {{due_date}}. You can pay via online bank transfer to Habib Bank Limited IBAN: PK36HABB000123456789. View invoice PDF: https://hvac.pk/inv/{{invoice_id}}",
    steps: [
      { type: "trigger", title: "Invoice Due Date Approaching / Past", description: "ERP ledger monitors invoice due date schedules" },
      { type: "condition", title: "Unpaid Balance Check", description: "Verifies invoice still has remaining unpaid balance" },
      { type: "action", title: "Multi-channel Reminder Sequence", description: "Sends SMS on D-3, WhatsApp on Due Date, and Call Reminder on D+7" },
      { type: "outcome", title: "Automatic Payment Reconciliation", description: "Stops sequence immediately once payment is posted" },
    ],
  },
];

function AutomationsContent() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(PRESET_AUTOMATIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeWorkflow, setActiveWorkflow] = useState<AutomationWorkflow | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AutomationWorkflow | null>(null);
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
            title: nextState ? "Automation Activated" : "Automation Paused",
            message: `${auto.title} is now ${nextState ? "LIVE" : "PAUSED"}.`,
            type: nextState ? "success" : "info",
          });
          return { ...auto, isActive: nextState };
        }
        return auto;
      })
    );
  };

  const handleTestRun = (auto: AutomationWorkflow, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: `Simulated Trigger Dispatched: ${auto.categoryLabel}`,
      message: `Test message dispatched to sample contact via ${auto.channel.toUpperCase()}.`,
      type: "success",
    });
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
      delay: "Instant / 1 Hour delay",
      action: newAction || "Send automated message to client",
      totalTriggered: 0,
      successRate: 0,
      metricLabel: "Conversions",
      metricValue: "0",
      templateMessage: "Hello {{customer_name}}, this is an automated update regarding your HVAC system.",
      steps: [
        { type: "trigger", title: newTrigger, description: "Monitors ERP event" },
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
      message: `Workflow "${created.title}" is now active and live.`,
      type: "success",
    });
  };

  const filteredAutomations = automations.filter((auto) => {
    if (selectedCategory === "ALL") return true;
    return auto.category === selectedCategory;
  });

  const totalActive = automations.filter((a) => a.isActive).length;
  const totalTriggered = automations.reduce((acc, a) => acc + a.totalTriggered, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ================= HEADER & TOP KPI STRIP ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-violet-600 rounded-xl text-white shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Automations & Marketing Engine
              </h1>
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold border border-amber-200/40">
                {totalActive} Active Workflows
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Database reactivation, 5-star Google review boosters, social follower magnets & payment reminders
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation Workflow</span>
        </button>
      </div>

      {/* ================= 4 TOP IMPACT KPI STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Automations Dispatched</span>
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
          <p className="text-[11px] text-slate-400 mt-1">From dormant customer campaigns</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase mb-1">
            <span>Social Followers Boost</span>
            <Share2 className="w-4 h-4 text-pink-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">+210 Follows</p>
          <p className="text-[11px] text-slate-400 mt-1">Facebook & Instagram communities</p>
        </div>
      </div>

      {/* ================= CATEGORY FILTER TABS ================= */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "ALL", label: "All Automations" },
          { id: "growth", label: "Database Reactivation" },
          { id: "reviews", label: "Google Maps Reviews" },
          { id: "social", label: "Social Media Growth (FB/IG)" },
          { id: "retention", label: "Seasonal & Maintenance" },
          { id: "finance", label: "Invoice Collections" },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredAutomations.map((auto) => (
          <div
            key={auto.id}
            onClick={() => setActiveWorkflow(auto)}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            {/* Header: Title, Category Badge & Live Toggle */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
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
                </div>

                {/* Active / Paused Pill Toggle */}
                <button
                  onClick={(e) => toggleAutomation(auto.id, e)}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    auto.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${auto.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  <span>{auto.isActive ? "Active" : "Paused"}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {auto.description}
              </p>
            </div>

            {/* Workflow Trigger / Action Flow Summary */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-16 shrink-0">Trigger</span>
                <span className="truncate font-semibold">{auto.trigger}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-16 shrink-0">Action</span>
                <span className="truncate font-semibold">{auto.action}</span>
              </div>
            </div>

            {/* Performance Stats Strip & Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Triggered</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{auto.totalTriggered}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{auto.metricLabel}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{auto.metricValue}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleTestRun(auto, e)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
                  title="Dispatch simulated test to sample phone"
                >
                  <Send className="w-3 h-3 text-blue-500" />
                  <span>Test Run</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTemplate(auto);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Edit Template</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= WORKFLOW STEP FLOWCHART MODAL ================= */}
      {activeWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase">
                  {activeWorkflow.categoryLabel} Workflow Blueprint
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
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sequence Flow Canvas</span>
              <div className="space-y-2">
                {activeWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    {/* Step Icon */}
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

            {/* Template Message Preview */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Live Message Copy</span>
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 font-sans text-xs leading-relaxed">
                {activeWorkflow.templateMessage}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={(e) => handleTestRun(activeWorkflow, e)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Simulate Trigger</span>
              </button>

              <button
                onClick={() => setActiveWorkflow(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Close Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT TEMPLATE COPY MODAL ================= */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Automation Message Template</h3>
                <p className="text-xs text-slate-400">{editingTemplate.title}</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Copy (With Dynamic Merge Tags)</label>
              <textarea
                rows={5}
                defaultValue={editingTemplate.templateMessage}
                id="template-textarea"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Merge Tag Chips */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Available Variables (Click to copy)</span>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                {["{{customer_name}}", "{{installed_unit}}", "{{google_review_link}}", "{{invoice_amount}}", "{{due_date}}"].map((tag) => (
                  <span
                    key={tag}
                    onClick={() => {
                      navigator.clipboard.writeText(tag);
                      toast({ title: "Copied to Clipboard", message: tag, type: "info" });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-500 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById("template-textarea") as HTMLTextAreaElement)?.value;
                  if (val) {
                    setAutomations((prev) =>
                      prev.map((a) => (a.id === editingTemplate.id ? { ...a, templateMessage: val } : a))
                    );
                  }
                  setEditingTemplate(null);
                  toast({
                    title: "Template Saved",
                    message: "Live automated copy updated successfully.",
                    type: "success",
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE NEW AUTOMATION WIZARD MODAL ================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Custom Automation</h3>
                <p className="text-xs text-slate-400">Build an event-driven messaging sequence</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Automation Title</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Customer AC Gas Refill Promo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="growth">Database Reactivation</option>
                    <option value="reviews">Google Maps Reviews</option>
                    <option value="social">Social Media Growth</option>
                    <option value="retention">Seasonal & Maintenance</option>
                    <option value="finance">Invoice Collections</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Dispatch Channel</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp Business</option>
                    <option value="sms">SMS Gateway</option>
                    <option value="multichannel">Multi-Channel (WhatsApp + SMS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Trigger Event</label>
                <input
                  type="text"
                  placeholder="e.g. When client spends over PKR 50,000"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Automated Action</label>
                <input
                  type="text"
                  placeholder="e.g. Send VIP loyalty card code on WhatsApp"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAutomation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Publish & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-sans">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Automations Engine...
        </div>
      }
    >
      <AutomationsContent />
    </React.Suspense>
  );
}
