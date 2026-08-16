"use client";

import React, { useState, useEffect } from "react";
import { Plus, CheckCircle, Clock, Wrench, User, MapPin, Phone, HelpCircle, FileText, CalendarDays, History, Download, Share2, Eye } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/shared/ToastProvider";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

function SupportPageContent() {
  const searchParams = useSearchParams();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "tickets"); // tickets, technicians

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const ticketNum = searchParams.get("ticket");
    if (ticketNum && complaints.length > 0) {
      const found = complaints.find((c) => c.complaintNumber === ticketNum);
      if (found) {
        setSelectedTicket(found);
        setEditStatus(found.status);
        setEditTechId(found.assignedTechnicianId || "");
        setEditAmount(String(found.amount));
        setEditAmountStatus(found.amountStatus || "UNPAID");
      }
    }
  }, [searchParams, complaints]);



  const handleViewPDF = (ticketId?: string) => {
    const id = ticketId || selectedTicket?.id;
    if (!id) return;
    window.open(`/api/pdf?type=complaint&id=${id}&inline=true`, "_blank");
  };

  const handleShareLink = () => {
    if (!selectedTicket) return;
    const url = `${window.location.origin}/support?ticket=${selectedTicket.complaintNumber}`;
    navigator.clipboard.writeText(url);
    alert(`Shareable ticket link copied to clipboard: ${url}`);
  };

  // Toggles
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Technician Form states
  const [isTechOpen, setIsTechOpen] = useState(false);
  const [techName, setTechName] = useState("");
  const [techCnic, setTechCnic] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [techAddress, setTechAddress] = useState("");
  const [techPosition, setTechPosition] = useState("HVAC Technician");
  const [techJoining, setTechJoining] = useState("");
  const [techSalary, setTechSalary] = useState("");
  const [techBank, setTechBank] = useState("");
  const [registering, setRegistering] = useState(false);

  // New Ticket State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [techId, setTechId] = useState("");

  // Update State inside Detail
  const [editStatus, setEditStatus] = useState("");
  const [editTechId, setEditTechId] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAmountStatus, setEditAmountStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { toast } = useToast();
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [bulkTechModalOpen, setBulkTechModalOpen] = useState(false);

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTicketIds.length === 0) return;
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_COMPLAINT_STATUS",
          ids: selectedTicketIds,
          data: { status: newStatus },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Bulk Status Updated", message: json.message, type: "success" });
        setSelectedTicketIds([]);
        fetchData();
      } else {
        toast({ title: "Bulk Action Failed", message: json.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", message: e.message, type: "error" });
    }
  };

  const handleBulkAssignTech = async () => {
    if (selectedTicketIds.length === 0) return;
    const techOptions = technicians.map((t, idx) => `${idx + 1}. ${t.name}`).join("\n");
    const choice = prompt(`Select technician number to assign to ${selectedTicketIds.length} tickets:\n\n${techOptions}`);
    if (!choice) return;
    const selectedIdx = parseInt(choice, 10) - 1;
    if (isNaN(selectedIdx) || !technicians[selectedIdx]) {
      alert("Invalid technician selection");
      return;
    }

    const tech = technicians[selectedIdx];
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_TECHNICIAN",
          ids: selectedTicketIds,
          data: { technicianId: tech.id },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Technician Assigned", message: json.message, type: "success" });
        setSelectedTicketIds([]);
        fetchData();
      } else {
        toast({ title: "Assignment Failed", message: json.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", message: e.message, type: "error" });
    }
  };

  const handleBulkExport = () => {
    const selected = complaints.filter((c) => selectedTicketIds.includes(c.id));
    if (selected.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Complaint #,Customer,Phone,Address,Technician,Status,Amount"]
        .concat(
          selected.map(
            (c) =>
              `"${c.complaintNumber}","${c.customerName}","${c.customerPhone}","${c.customerAddress}","${c.technician?.name || "Unassigned"}","${c.status}",${c.amount || 0}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Selected_Complaints_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", message: `Exported ${selected.length} tickets to CSV.`, type: "info" });
  };

  const fetchData = async (userRole?: string) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const cRes = await fetch("/api/support/complaints", { headers: { Authorization: `Bearer ${token}` } });
      if (cRes.ok) setComplaints((await cRes.json()).complaints || []);

      const role = userRole || currentUser?.role?.name || "";
      if (role !== "Technician") {
        const eRes = await fetch("/api/hrm/employees", { headers: { Authorization: `Bearer ${token}` } });
        if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const token = localStorage.getItem("token");
      let role = "";
      if (token) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            role = data.user?.role?.name || "";
            if (role === "Technician") {
              setActiveTab("tickets");
            }
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      }
      await fetchData(role);
      setMounted(true);
    };
    initPage();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || !description) {
      alert("Please fill out all required customer and job details.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/support/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          description,
          assignedTechnicianId: techId || undefined,
          amount: amount ? Number(amount) : 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to register ticket");
      alert("Service complaint ticket registered successfully.");
      setIsCreateOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setDescription("");
      setAmount("");
      setTechId("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName || !techCnic || !techPhone || !techJoining || !techSalary) {
      alert("Please fill out all required technician fields.");
      return;
    }

    setRegistering(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: techName,
          cnic: techCnic,
          phone: techPhone,
          address: techAddress,
          department: "SERVICE", // Hardcoded for Technicians section
          position: techPosition,
          joiningDate: techJoining,
          baseSalary: Number(techSalary),
          bankDetails: techBank,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to onboard technician");

      alert("Technician profile onboarded successfully.");
      setIsTechOpen(false);
      // Clear fields
      setTechName("");
      setTechCnic("");
      setTechPhone("");
      setTechAddress("");
      setTechPosition("HVAC Technician");
      setTechJoining("");
      setTechSalary("");
      setTechBank("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateTicket = async (generateInvoice = false) => {
    setUpdating(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/support/complaints/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: editStatus || undefined,
          assignedTechnicianId: editTechId === "clear" ? null : (editTechId || undefined),
          remarks: editRemarks,
          amount: editAmount ? Number(editAmount) : undefined,
          amountStatus: editAmountStatus || undefined,
          generateInvoice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update complaint");

      alert(generateInvoice ? "Service charge invoice generated successfully." : "Ticket updated successfully.");
      setEditRemarks("");
      setSelectedTicket(data.complaint); // reload modal state
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/support/complaints/${selectedTicket.id}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload file");
      }

      alert("File uploaded successfully.");
      const cRes = await fetch("/api/support/complaints", { headers: { Authorization: `Bearer ${token}` } });
      if (cRes.ok) {
        const data = await cRes.json();
        const list = data.complaints || [];
        setComplaints(list);
        const updated = list.find((c: any) => c.id === selectedTicket.id);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Filter
  const filteredTickets = complaints.filter((c) => {
    const text = c.complaintNumber.toLowerCase() + c.customerName.toLowerCase() + c.description.toLowerCase();
    const matchesText = text.includes(search.toLowerCase());
    const matchesStatus = status === "" || c.status === status;
    return matchesText && matchesStatus;
  });

  const technicians = employees.filter((e) => e.department === "SERVICE");

  const ticketStatusOptions = [
    { label: "Open / Dispatch Pending", value: "OPEN" },
    { label: "In Progress / Working", value: "IN_PROGRESS" },
    { label: "Done / Completed", value: "DONE" },
    { label: "Resolved", value: "RESOLVED" },
    { label: "Closed / Archived", value: "CLOSED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Customer Service Desk</h2>
            <p className="text-xs text-slate-500 mt-1">Dispatch senior technicians, track repair lifecycles, and issue service billing</p>
          </div>

          {currentUser?.role?.name !== "Technician" && (
            <>
              {activeTab === "technicians" ? (
                <button
                  onClick={() => setIsTechOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 self-start"
                >
                  <Plus className="w-4 h-4" />
                  Onboard Technician
                </button>
              ) : activeTab === "tickets" ? (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 self-start"
                >
                  <Plus className="w-4 h-4" />
                  Log Service Complaint
                </button>
              ) : null}
            </>
          )}
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-4">
          <button
            onClick={() => {
              setActiveTab("tickets");
              setSearch("");
              setStatus("");
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "tickets"
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500"
            }`}
          >
            Service Tickets ({complaints.length})
          </button>
          {currentUser?.role?.name !== "Technician" && (
            <button
              onClick={() => {
                setActiveTab("technicians");
                setSearch("");
                setStatus("");
              }}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === "technicians"
                  ? "border-blue-500 text-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500"
              }`}
            >
              Service Technicians ({technicians.length})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={7} columns={6} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
      ) : activeTab === "tickets" ? (
        <div className="space-y-4">
          <SearchFilter
            placeholder="Search tickets by COMP code, client name, description..."
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            statusOptions={ticketStatusOptions}
          />

          {/* Dashboard Summary Panels */}
          {(() => {
            const totalTickets = complaints.length;
            const totalResolved = complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED" || c.status === "DONE").length;
            const totalInProgress = complaints.filter((c) => c.status === "IN_PROGRESS").length;
            const totalOpen = complaints.filter((c) => c.status === "OPEN").length;

            const totalAmountBilled = complaints.reduce((acc, c) => acc + Number(c.amount || 0), 0);
            const totalAmountReceived = complaints.reduce((acc, c) => acc + (c.amountStatus === "PAID" ? Number(c.amount || 0) : 0), 0);
            const totalAmountPending = complaints.reduce((acc, c) => acc + (c.amountStatus === "UNPAID" ? Number(c.amount || 0) : 0), 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Billing Summary Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-950 dark:to-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed Revenue</span>
                      <span className="text-xl font-extrabold font-mono block mt-2 text-white">PKR {totalAmountBilled.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="px-2 py-1 bg-slate-800/80 rounded-lg text-[9px] font-bold text-slate-300 font-mono">{totalTickets} Jobs Logged</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Average per ticket</span>
                    <span className="font-bold font-mono">PKR {(totalTickets > 0 ? totalAmountBilled / totalTickets : 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Payments Collected Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Payments Collected</span>
                      <span className="text-xl font-extrabold font-mono block mt-2 text-emerald-600 dark:text-emerald-400">PKR {totalAmountReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{totalResolved} Resolved</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-505 dark:text-slate-400">
                    <span>Collection Rate</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {totalAmountBilled > 0 ? Math.round((totalAmountReceived / totalAmountBilled) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Outstanding Receivables Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Pending Receivables</span>
                      <span className="text-xl font-extrabold font-mono block mt-2 text-amber-500">PKR {totalAmountPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-[9px] font-bold text-amber-600 dark:text-amber-400">{totalOpen + totalInProgress} Active</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-505 dark:text-slate-400">
                    <span>Unpaid balance ratio</span>
                    <span className="font-bold text-amber-500 font-mono">
                      {totalAmountBilled > 0 ? Math.round((totalAmountPending / totalAmountBilled) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Dispatch Lifecycles Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Dispatch Roster Stats</span>
                      <span className="text-xl font-extrabold font-mono block mt-2 text-blue-500">
                        {totalResolved} <span className="text-xs text-slate-400 font-medium">/ {totalTickets} Resolved</span>
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-[9px] font-bold text-blue-600 dark:text-blue-400">
                      {totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 0}% Done
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Pending: <strong>{totalOpen}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Working: <strong>{totalInProgress}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Service Complaints Excel-matched Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 text-center w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={filteredTickets.length > 0 && selectedTicketIds.length === filteredTickets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTicketIds(filteredTickets.map((t) => t.id));
                          } else {
                            setSelectedTicketIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3 text-center">Sr.No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Client Name</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Cell</th>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Problem</th>
                    <th className="p-3">Repairing Detail</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Received</th>
                    <th className="p-3 text-right">Pending Amount</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTickets.map((t, idx) => {
                    const amt = Number(t.amount || 0);
                    const rec = t.amountStatus === "PAID" ? amt : 0;
                    const pend = t.amountStatus === "UNPAID" ? amt : 0;
                    const isSelected = selectedTicketIds.includes(t.id);
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-950/20 cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                        onClick={() => {
                          setSelectedTicket(t);
                          setEditStatus(t.status);
                          setEditTechId(t.assignedTechnicianId || "");
                          setEditAmount(String(t.amount));
                          setEditAmountStatus(t.amountStatus || "UNPAID");
                        }}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTicketIds((prev) => [...prev, t.id]);
                              } else {
                                setSelectedTicketIds((prev) => prev.filter((id) => id !== t.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 text-center font-bold font-mono">{idx + 1}</td>
                        <td className="p-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{t.customerName}</td>
                        <td className="p-3 truncate max-w-[120px]" title={t.customerAddress}>{t.customerAddress}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{t.customerPhone}</td>
                        <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                          {t.technician ? t.technician.name : <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="p-3 truncate max-w-[120px]" title={t.description}>{t.description}</td>
                        <td className="p-3 truncate max-w-[120px]" title={t.remarks}>{t.remarks || "-"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === "RESOLVED" || t.status === "CLOSED" || t.status === "DONE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"
                              : t.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40"
                              : t.status === "CANCELLED"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono text-blue-500">{t.invoice ? t.invoice.invoiceNumber : "-"}</td>
                        <td className="p-3 text-right font-mono font-bold">{amt.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-500 font-bold">{rec.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-rose-500 font-bold">{pend.toLocaleString()}</td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTicket(t);
                                setEditStatus(t.status);
                                setEditTechId(t.assignedTechnicianId || "");
                                setEditAmount(String(t.amount));
                                setEditAmountStatus(t.amountStatus || "UNPAID");
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleViewPDF(t.id)}
                              title="View PDF Complaint Sheet"
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/support?ticket=${t.complaintNumber}`;
                                navigator.clipboard.writeText(url);
                                alert(`Shareable ticket link copied to clipboard: ${url}`);
                              }}
                              title="Copy Shareable Link"
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-slate-400">No matching complaint records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bulk Action Bar for Tickets */}
          <BulkActionBar
            selectedCount={selectedTicketIds.length}
            onClear={() => setSelectedTicketIds([])}
            onAssignTech={handleBulkAssignTech}
            onStatusChange={handleBulkStatusChange}
            onBulkExport={handleBulkExport}
            statusOptions={[
              { label: "Set Open", value: "OPEN" },
              { label: "Set In Progress", value: "IN_PROGRESS" },
              { label: "Set Resolved", value: "RESOLVED" },
              { label: "Set Closed", value: "CLOSED" },
            ]}
          />
        </div>
      ) : (
        /* ==================== SERVICE TECHNICIANS TAB ==================== */
        <div className="space-y-4">
          <SearchFilter
            placeholder="Search technicians by name or position..."
            search={search}
            onSearchChange={setSearch}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3">Technician Name</th>
                    <th className="p-3">CNIC / ID</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Address</th>
                    <th className="p-3 text-right">Base Salary (PKR)</th>
                    <th className="p-3">Joining Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {technicians
                    .filter((t) => {
                      const text = t.name.toLowerCase() + t.position.toLowerCase();
                      return text.includes(search.toLowerCase());
                    })
                    .map((tech) => (
                      <tr key={tech.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-bold">{tech.name}</td>
                        <td className="p-3 font-semibold">{tech.cnic}</td>
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{tech.position}</td>
                        <td className="p-3 font-medium">{tech.phone}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate" title={tech.address}>{tech.address || "-"}</td>
                        <td className="p-3 text-right font-bold text-blue-500">{Number(tech.baseSalary).toFixed(2)}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(tech.joiningDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tech.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}>
                            {tech.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {technicians.filter((t) => {
                    const text = t.name.toLowerCase() + t.position.toLowerCase();
                    return text.includes(search.toLowerCase());
                  }).length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">No service technicians registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE COMPLAINT MODAL ==================== */}
      {/* ==================== CREATE COMPLAINT MODAL ==================== */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Register Service Ticket</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-medium">Create customer complaints. Log description, address, technician dispatches, and estimated billing.</p>

            <form onSubmit={handleCreateTicket} className="space-y-6">
              {/* Section 1: Customer Info */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">Client Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Ali"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +923001234567"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Service Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House 4, Street 12, Gulshan-e-Iqbal, Karachi"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 2: Job Scope */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">Job Scope & Assignment</span>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Complaint / Work Scope Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Compressor noise in 1.5 Ton split unit, fan speed is slow"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assign Service Technician (Optional)</label>
                    <select
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={techId}
                      onChange={(e) => setTechId(e.target.value)}
                    >
                      <option value="">Unassigned / Dispatch later</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.position})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimate Charge (PKR) (Optional)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
                >
                  Register Complaint
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== TICKET DETAILS BOARD DRAWER ==================== */}
      {mounted && selectedTicket && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{selectedTicket.complaintNumber}</span>
                    <button
                      onClick={() => handleViewPDF()}
                      title="View PDF Complaint Sheet"
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleShareLink}
                      title="Copy Shareable Link"
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">Complaint Desk File</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
                >
                  ✕
                </button>
              </div>

              {/* Customer summary */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">Client Profile & Job Scope</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <User className="w-4 h-4 text-slate-400" />
                    {selectedTicket.customerName}
                  </p>
                  <p className="flex items-center gap-2 font-mono text-slate-700 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selectedTicket.customerPhone}
                  </p>
                </div>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  {selectedTicket.customerAddress}
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Problem Description</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 leading-relaxed whitespace-pre-line">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Update ticket form inside Drawer */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">Dispatch & Financial Action</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ticket Status</label>
                    {currentUser?.role?.name === "Technician" ? (
                      <select
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        disabled={["CLOSED", "RESOLVED"].includes(selectedTicket.status)}
                      >
                        <option value="OPEN">OPEN (Pending)</option>
                        <option value="IN_PROGRESS">IN PROGRESS (Working)</option>
                        <option value="DONE">DONE (Completed)</option>
                      </select>
                    ) : (
                      <select
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="OPEN">OPEN (Pending)</option>
                        <option value="IN_PROGRESS">IN PROGRESS (Working)</option>
                        <option value="DONE">DONE (Completed)</option>
                        <option value="RESOLVED">RESOLVED (Complete)</option>
                        <option value="CLOSED">CLOSED (Archived)</option>
                        <option value="CANCELLED">CANCELLED (Aborted)</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Change Technician</label>
                    <select
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      value={editTechId}
                      onChange={(e) => setEditTechId(e.target.value)}
                      disabled={currentUser?.role?.name === "Technician"}
                    >
                      <option value="">Leave Unassigned</option>
                      <option value="clear">Clear Assignee</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Service Amount (PKR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-60"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      disabled={currentUser?.role?.name === "Technician"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Status</label>
                    <select
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-emerald-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      value={editAmountStatus}
                      onChange={(e) => setEditAmountStatus(e.target.value)}
                      disabled={currentUser?.role?.name === "Technician"}
                    >
                      <option value="UNPAID">UNPAID (Pending)</option>
                      <option value="PAID">PAID (Collected)</option>
                      <option value="WAIVED">WAIVED (Free / Claim)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Repairing details / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Enter repairing details done or assignment remarks..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateTicket(false)}
                    disabled={updating}
                    className="flex-grow py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    {updating ? "Saving..." : "Save Ticket Changes"}
                  </button>

                  {/* Generate service invoice trigger */}
                  {currentUser?.role?.name !== "Technician" && Number(selectedTicket.amount) > 0 && !selectedTicket.invoice && (
                    <button
                      type="button"
                      onClick={() => handleUpdateTicket(true)}
                      disabled={updating}
                      className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                    >
                      <FileText className="w-3.5 h-3.5" /> Invoice Client
                    </button>
                  )}
                </div>
              </div>

              {/* Attachments & Scan Copies Upload Section */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  Complaint Scan Copies & Documents
                </span>

                {/* Upload Prompt if Status is not CLOSED or CANCELLED */}
                {selectedTicket.status !== "CLOSED" && selectedTicket.status !== "CANCELLED" && (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center space-y-2 hover:border-blue-500 transition-all bg-white dark:bg-slate-900">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Please upload reference documents, scan copies, or images for the complaint
                    </p>
                    <input
                      type="file"
                      id="complaint-file-upload"
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <label
                      htmlFor="complaint-file-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      {uploadingFile ? "Uploading..." : "Choose File / Capture Scan"}
                    </label>
                  </div>
                )}

                  {/* View Attachments */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {selectedTicket.attachments.map((file: any) => {
                        const isImage = file.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.fileName);
                        return (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all"
                          >
                            {isImage ? (
                              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img
                                  src={file.fileUrl}
                                  alt={file.fileName}
                                  className="w-full h-full object-cover hover:scale-110 transition-all duration-300"
                                />
                              </a>
                            ) : (
                              <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 text-blue-500">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                                {file.fileType || "Document"}
                              </p>
                            </div>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline font-bold"
                            >
                              View
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-center text-slate-400 py-2">No documents uploaded yet.</p>
                  )}
                </div>

              {/* Vertical Audit log Timeline history */}
              {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <History className="w-4 h-4 text-slate-400" />
                    Timeline Audit History
                  </h4>
                  <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-4">
                    {selectedTicket.timeline.map((log: any) => (
                      <div key={log.id} className="relative text-[10px]">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />

                        <div className="flex justify-between text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{log.changedBy?.name || "Support User"}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">{log.remarks}</p>
                        {log.fromStatus !== log.toStatus && (
                          <span className="inline-block mt-1 bg-slate-100 dark:bg-slate-800 text-[8px] text-slate-500 px-1 py-0.5 rounded font-mono font-bold">
                            {log.fromStatus} → {log.toStatus}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== ONBOARD TECHNICIAN MODAL ==================== */}
      {mounted && isTechOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Onboard Service Technician</h3>
              <button
                type="button"
                onClick={() => setIsTechOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Create a new employee profile in the SERVICE department to dispatch for tickets.</p>

            <form onSubmit={handleCreateTechnician} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CNIC / National ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 42101-1234567-1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techCnic}
                    onChange={(e) => setTechCnic(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923001234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Position / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HVAC Technician"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techPosition}
                    onChange={(e) => setTechPosition(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techJoining}
                    onChange={(e) => setTechJoining(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Base Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={techSalary}
                    onChange={(e) => setTechSalary(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Residential Address</label>
                <textarea
                  placeholder="e.g. House 123, Sector G, Islamabad"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                  value={techAddress}
                  onChange={(e) => setTechAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bank Payment Details</label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank - Account: 12345"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={techBank}
                  onChange={(e) => setTechBank(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTechOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {registering ? "Onboarding..." : "Onboard Technician"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Support...</div>}>
      <SupportPageContent />
    </React.Suspense>
  );
}
