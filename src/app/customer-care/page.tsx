"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  Search,
  Filter,
  Send,
  Paperclip,
  Smile,
  Sparkles,
  Bot,
  Flame,
  Clock,
  CheckCheck,
  Check,
  User,
  MapPin,
  Calendar,
  Wrench,
  FileSpreadsheet,
  Settings,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  Zap,
  Tag,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";

// Mock Lead/Conversation Type
interface Conversation {
  id: string;
  name: string;
  phone: string;
  email: string;
  channel: "facebook" | "whatsapp" | "instagram" | "sms" | "webchat";
  channelHandle?: string;
  status: "NEW_LEAD" | "IN_DISCUSSION" | "QUOTE_SENT" | "SCHEDULED" | "RESOLVED";
  temperature: "HOT" | "WARM" | "COLD";
  unreadCount: number;
  lastMessageTime: string;
  dealValue: number;
  location: string;
  installedUnits: string[];
  recentInvoice?: { number: string; amount: number; date: string };
  openComplaint?: { id: string; subject: string; status: string };
  messages: Array<{
    id: string;
    sender: "client" | "agent" | "bot";
    text: string;
    time: string;
    status?: "sent" | "delivered" | "read";
    attachments?: string[];
  }>;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    name: "Hassan Tariq",
    phone: "+92 300 8472910",
    email: "hassan.tariq@gmail.com",
    channel: "facebook",
    channelHandle: "m.me/hassantariq92",
    status: "NEW_LEAD",
    temperature: "HOT",
    unreadCount: 2,
    lastMessageTime: "3m ago",
    dealValue: 145000,
    location: "Gulberg III, Lahore",
    installedUnits: ["Gree 1.5 Ton Fairy Inverter (2023)"],
    messages: [
      {
        id: "m1",
        sender: "client",
        text: "Hi! I saw your Facebook ad for commercial AC servicing and new unit installation. Do you have 2.0 Ton DC Inverters in stock?",
        time: "10:14 AM",
      },
      {
        id: "m2",
        sender: "agent",
        text: "Hello Hassan! Yes, we have Gree, Haier, and Kenwood 2.0 Ton DC Inverters ready for same-day delivery with warranty.",
        time: "10:16 AM",
        status: "read",
      },
      {
        id: "m3",
        sender: "client",
        text: "Great! Can you please send the quotation for 2 units of Gree 2 Ton Inverter along with copper piping installation?",
        time: "10:19 AM",
      },
    ],
  },
  {
    id: "conv-2",
    name: "Dr. Ayesha Malik",
    phone: "+92 321 9845210",
    email: "dr.ayesha@malikclinic.pk",
    channel: "whatsapp",
    channelHandle: "+923219845210",
    status: "QUOTE_SENT",
    temperature: "HOT",
    unreadCount: 0,
    lastMessageTime: "24m ago",
    dealValue: 380000,
    location: "DHA Phase 5, Lahore",
    installedUnits: ["Haier 4.0 Ton Floor Standing", "Gree 1.5 Ton Solar Hybrid (2x)"],
    recentInvoice: { number: "INV-2026-089", amount: 18500, date: "2026-08-10" },
    messages: [
      {
        id: "m4",
        sender: "client",
        text: "Assalam-o-Alaikum, we need a maintenance check for our clinic's central floor standing unit. It is tripping during peak load.",
        time: "09:30 AM",
      },
      {
        id: "m5",
        sender: "agent",
        text: "Walaikum Assalam Dr. Ayesha. We've logged this as high-priority diagnostic ticket #CMP-894. A senior technician can visit today at 2:30 PM.",
        time: "09:35 AM",
        status: "read",
      },
      {
        id: "m6",
        sender: "client",
        text: "2:30 PM works perfectly. Please make sure they bring capacitor and refrigerant testing gauges.",
        time: "09:42 AM",
      },
      {
        id: "m7",
        sender: "agent",
        text: "Noted! Master Technician Farhan is assigned with complete testing gear. See you at 2:30 PM.",
        time: "09:45 AM",
        status: "read",
      },
    ],
  },
  {
    id: "conv-3",
    name: "Zainab Builders (Khurram Shah)",
    phone: "+92 333 4512998",
    email: "khurram@zainabbuilders.com",
    channel: "instagram",
    channelHandle: "@khurram_zainab",
    status: "IN_DISCUSSION",
    temperature: "WARM",
    unreadCount: 1,
    lastMessageTime: "1h ago",
    dealValue: 750000,
    location: "Bahria Town Sector C, Lahore",
    installedUnits: ["Multi-Split VRF System (4 Indoor Units)"],
    messages: [
      {
        id: "m8",
        sender: "client",
        text: "Hey, loved your Instagram reel showcasing the VRF ducting setup for duplex villas. We have 3 new houses under construction.",
        time: "Yesterday",
      },
      {
        id: "m9",
        sender: "agent",
        text: "Thank you Khurram! We specialize in VRF concealed ducting and piping layout for luxury residential projects.",
        time: "Yesterday",
        status: "read",
      },
      {
        id: "m10",
        sender: "client",
        text: "Can an engineer visit the site on Saturday morning with drawing layouts?",
        time: "1 hour ago",
      },
    ],
  },
  {
    id: "conv-4",
    name: "Bilal Motors Workshop",
    phone: "+92 312 6578901",
    email: "bilalmotors@yahoo.com",
    channel: "sms",
    status: "SCHEDULED",
    temperature: "WARM",
    unreadCount: 0,
    lastMessageTime: "3h ago",
    dealValue: 45000,
    location: "Multan Road Industrial Area",
    installedUnits: ["Kenwood 2.0 Ton Heavy Duty (x2)"],
    openComplaint: { id: "CMP-891", subject: "Blower Motor Noise", status: "ASSIGNED" },
    messages: [
      {
        id: "m11",
        sender: "client",
        text: "SMS: Our waiting room AC is making a rattling noise. Need someone before 4 PM today.",
        time: "08:15 AM",
      },
      {
        id: "m12",
        sender: "agent",
        text: "Hi Bilal Motors, Technician Usama is scheduled to arrive between 1:00 PM - 2:00 PM.",
        time: "08:30 AM",
        status: "delivered",
      },
    ],
  },
  {
    id: "conv-5",
    name: "Fatima Noor",
    phone: "+92 301 5567812",
    email: "fatima.noor@outlook.com",
    channel: "webchat",
    status: "RESOLVED",
    temperature: "COLD",
    unreadCount: 0,
    lastMessageTime: "1d ago",
    dealValue: 12000,
    location: "Model Town, Lahore",
    installedUnits: ["Gree 1.0 Ton Pular Inverter"],
    messages: [
      {
        id: "m13",
        sender: "client",
        text: "Website Chat: Just wanted to confirm that the technician visited and the gas leak was fixed. Thank you for quick service!",
        time: "Yesterday",
      },
      {
        id: "m14",
        sender: "agent",
        text: "You are very welcome Fatima! Your 90-day service warranty is active. Have a great day!",
        time: "Yesterday",
        status: "read",
      },
    ],
  },
];

const CANNED_RESPONSES = [
  {
    title: "AC General Service Fee",
    text: "Our comprehensive AC Master Service is PKR 2,500/unit (includes jet-pump deep coil wash, blower cleaning, electrical diagnostic, and refrigerant pressure check).",
  },
  {
    title: "Schedule Site Inspection",
    text: "We can schedule a certified HVAC engineer to inspect your premises today or tomorrow. Please share your complete address and preferred time slot.",
  },
  {
    title: "New Inverter Pricing Quote",
    text: "Gree 1.5 Ton Fairy Inverter: PKR 148,000 (with 10ft pure copper piping kit, 10-year compressor warranty, and official invoice).",
  },
  {
    title: "Gas Refill & Leak Diagnostic",
    text: "R410A / R32 Full Gas Charge is PKR 6,500 (includes nitrogen pressure leak test, flare nut tightening, and vacuuming).",
  },
];

function CustomerCareContent() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>("conv-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [inputText, setInputText] = useState("");
  const [cannedOpen, setCannedOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Connected channel status
  const [channels, setChannels] = useState({
    facebook: { connected: true, name: "HVAC Services Official Page", pageId: "10982347102" },
    whatsapp: { connected: true, phone: "+92 300 0000000", verified: true },
    instagram: { connected: true, handle: "@hvac_official_pk" },
    sms: { connected: true, provider: "Telenor Business Gateway" },
  });

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConv) return;

    const newMsg = {
      id: `m-${Date.now()}`,
      sender: "agent" as const,
      text: inputText.trim(),
      time: "Just now",
      status: "sent" as const,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            lastMessageTime: "Just now",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setInputText("");
    toast({
      title: "Message Dispatched",
      message: `Delivered via ${activeConv.channel.toUpperCase()} to ${activeConv.name}`,
      type: "success",
    });

    // Simulate client response after 2 seconds
    setTimeout(() => {
      const replyMsg = {
        id: `m-rep-${Date.now()}`,
        sender: "client" as const,
        text: "Thank you for the quick response! That sounds good, please proceed with the arrangements.",
        time: "Just now",
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              lastMessageTime: "Just now",
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
    }, 2500);
  };

  const handleAiSuggest = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const suggestions = [
        `Dear ${activeConv.name}, thank you for contacting HVAC ERP Support. Based on your ${activeConv.installedUnits[0] || "unit"}, we can dispatch our technician today. Would 3:00 PM work for you?`,
        `Assalam-o-Alaikum ${activeConv.name}! We've generated your custom quotation with a 10% seasonal discount for the requested service. Let us know if you'd like to confirm the booking.`,
        `Hello ${activeConv.name}, our diagnostic report indicates a refrigerant top-up with pressure calibration will resolve this. Our certified technician is available in your area (${activeConv.location}).`,
      ];
      const picked = suggestions[Math.floor(Math.random() * suggestions.length)];
      setInputText(picked);
      setAiGenerating(false);
      toast({
        title: "AI Response Drafted",
        message: "Contextual response generated based on customer's HVAC equipment & history.",
        type: "info",
      });
    }, 600);
  };

  const updateLeadStatus = (newStatus: any) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, status: newStatus } : c))
    );
    toast({
      title: "Lead Pipeline Updated",
      message: `Status updated to ${newStatus}`,
      type: "success",
    });
  };

  // Filtered conversation list
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === "ALL" || c.channel === channelFilter.toLowerCase();
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case "facebook":
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">Facebook</span>;
      case "whatsapp":
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">WhatsApp</span>;
      case "instagram":
        return <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-[10px]">Instagram</span>;
      case "sms":
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px]">SMS</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 font-bold text-[10px]">Web Chat</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-8">
      {/* ================= HEADER & OMNICHANNEL CHANNEL STRIP ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Customer Care & Lead Inbox
              </h1>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-200/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Omnichannel Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unified Facebook Messenger, WhatsApp, Instagram DM, SMS, and website chat leads
            </p>
          </div>
        </div>

        {/* Live Channel Status & Connector Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-300">Facebook Page</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">WhatsApp API</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            <span className="text-slate-600 dark:text-slate-300">Instagram DM</span>
          </div>

          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Channel Settings</span>
          </button>
        </div>
      </div>

      {/* ================= 3-COLUMN HIGH-TECH INBOX WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-190px)] min-h-[600px]">
        {/* ================= LEFT COLUMN: CONVERSATION LIST (4 cols) ================= */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Search and Channel Filter Chips */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads, phone, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Channel Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-bold">
              {["ALL", "FACEBOOK", "WHATSAPP", "INSTAGRAM", "SMS"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                    channelFilter === ch
                      ? "bg-blue-500 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No matching leads or messages found
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const active = conv.id === activeConv?.id;
                const lastMsg = conv.messages[conv.messages.length - 1];

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative ${
                      active
                        ? "bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Avatar with Channel Icon Badge */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                        {conv.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {conv.channel === "facebook" && <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">f</div>}
                        {conv.channel === "whatsapp" && <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">W</div>}
                        {conv.channel === "instagram" && <div className="w-4 h-4 rounded-full bg-pink-600 text-white flex items-center justify-center text-[9px] font-bold">IG</div>}
                        {conv.channel === "sms" && <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold">S</div>}
                        {conv.channel === "webchat" && <div className="w-4 h-4 rounded-full bg-slate-600 text-white flex items-center justify-center text-[9px] font-bold">#</div>}
                      </div>
                    </div>

                    {/* Conversation preview info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conv.name}
                          </h4>
                          {conv.temperature === "HOT" && <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageTime}</span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1.5 leading-snug">
                        {lastMsg ? lastMsg.text : "No messages yet"}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {getChannelBadge(conv.channel)}
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                            {conv.location}
                          </span>
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= CENTER COLUMN: CHAT CONVERSATION CANVAS (5 cols) ================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                {activeConv?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{activeConv?.name}</h3>
                  {getChannelBadge(activeConv?.channel || "webchat")}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">{activeConv?.phone}</p>
              </div>
            </div>

            {/* Lead Status Selector */}
            <div className="flex items-center gap-2">
              <select
                value={activeConv?.status}
                onChange={(e) => updateLeadStatus(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="NEW_LEAD">New Lead</option>
                <option value="IN_DISCUSSION">In Discussion</option>
                <option value="QUOTE_SENT">Quote Sent</option>
                <option value="SCHEDULED">Job Scheduled</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Message Thread Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
            {activeConv?.messages.map((msg) => {
              const isMe = msg.sender === "agent";

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-xs"
                        : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-bl-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1 font-mono">
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Assist & Canned Responses Trigger Bar */}
          <div className="px-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAiSuggest}
                disabled={aiGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 font-bold hover:bg-indigo-100 transition-all text-[11px]"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? "animate-spin" : ""}`} />
                <span>AI Draft Reply</span>
              </button>

              <button
                onClick={() => setCannedOpen(!cannedOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all text-[11px]"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Templates</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              Via {activeConv?.channel?.toUpperCase()}
            </span>
          </div>

          {/* Canned Responses Flyout Dropdown */}
          {cannedOpen && (
            <div className="p-2 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1 animate-fadeIn">
              {CANNED_RESPONSES.map((cr, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(cr.text);
                    setCannedOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs transition-colors"
                >
                  <span className="font-bold text-slate-900 dark:text-white block">{cr.title}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">{cr.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Message Input Box */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <textarea
              rows={2}
              placeholder={`Write message to ${activeConv?.name}... (Enter to send)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CUSTOMER CRM & HVAC CONTEXT (3 cols) ================= */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col overflow-y-auto space-y-4">
          {/* Customer Profile Header */}
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white font-black text-lg flex items-center justify-center mx-auto mb-2 shadow-md">
              {activeConv?.name?.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{activeConv?.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeConv?.location}</p>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                {activeConv?.temperature} Lead
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono font-bold text-[11px]">
                Est. PKR {activeConv?.dealValue?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Contact Information</span>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{activeConv?.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{activeConv?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{activeConv?.location}</span>
              </div>
            </div>
          </div>

          {/* Installed HVAC Equipment Inventory */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Registered HVAC Units</span>
            <div className="space-y-1.5">
              {activeConv?.installedUnits?.map((unit, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick ERP Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Quick ERP Actions</span>
            <button
              onClick={() => {
                toast({
                  title: "Draft Invoice Generated",
                  message: `New invoice draft prepared for ${activeConv.name}`,
                  type: "info",
                });
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                <span>Create Invoice Quote</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => {
                toast({
                  title: "Diagnostic Job Ticket Opened",
                  message: `Technician visit logged for ${activeConv.name}`,
                  type: "info",
                });
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                <span>Dispatch Technician</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= CHANNEL CONNECTION SETTINGS MODAL ================= */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Omnichannel Lead Integrations</h3>
                  <p className="text-xs text-slate-400">Connect Facebook Pages, WhatsApp Cloud API & Instagram</p>
                </div>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Facebook Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    f
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Facebook Lead Messenger</h4>
                    <p className="text-[11px] text-slate-400">Sync ad leads & Page Direct Messages automatically</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  Connected
                </span>
              </div>

              {/* WhatsApp Cloud API */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
                    W
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">WhatsApp Business Cloud API</h4>
                    <p className="text-[11px] text-slate-400">Official Meta Webhooks for 2-way messaging</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  Verified
                </span>
              </div>

              {/* Instagram DM */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-pink-600 text-white font-bold flex items-center justify-center text-sm">
                  IG
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Instagram Professional Direct</h4>
                  <p className="text-[11px] text-slate-400">Story mentions and reel direct inquiries</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setConnectModalOpen(false);
                  toast({
                    title: "Channels Synchronized",
                    message: "All social & messaging webhook channels are up to date.",
                    type: "success",
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerCarePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-sans">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Customer Care Hub...
        </div>
      }
    >
      <CustomerCareContent />
    </React.Suspense>
  );
}
