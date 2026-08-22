"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  ClipboardCheck,
  FileText,
  DollarSign,
  Users,
  CalendarDays,
  Receipt,
  Download,
  Save,
  CheckCircle2,
  Clock,
  Utensils,
  CreditCard,
  Building2,
  Calendar,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/shared/ToastProvider";

export default function HrmPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"employees" | "attendance" | "salary-sheet">("salary-sheet");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Employee States (Create & Edit)
  const [isEmpOpen, setIsEmpOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empNo, setEmpNo] = useState("");
  const [empName, setEmpName] = useState("");
  const [empCnic, setEmpCnic] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empAddress, setEmpAddress] = useState("");
  const [empDept, setEmpDept] = useState("SERVICE");
  const [empPos, setEmpPos] = useState("HVAC Senior Tech");
  const [empJoining, setEmpJoining] = useState(new Date().toISOString().split("T")[0]);
  const [empSalary, setEmpSalary] = useState("");
  const [empStatus, setEmpStatus] = useState("ACTIVE");
  const [empBank, setEmpBank] = useState("");
  const [empFatherName, setEmpFatherName] = useState("");
  const [empFatherPhone, setEmpFatherPhone] = useState("");
  const [empResponsiblePerson, setEmpResponsiblePerson] = useState("");
  const [empRefPhone, setEmpRefPhone] = useState("");

  // Mark Attendance States
  const [isAttOpen, setIsAttOpen] = useState(false);
  const [attEmpId, setAttEmpId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attStatus, setAttStatus] = useState("PRESENT");
  const [checkIn, setCheckIn] = useState("09:00");
  const [checkOut, setCheckOut] = useState("18:00");

  // =========================================================================
  // MONTHLY SALARY SHEET STATES
  // =========================================================================
  const currentDate = new Date();
  const [salaryMonth, setSalaryMonth] = useState<string>(String(currentDate.getMonth() + 1));
  const [salaryYear, setSalaryYear] = useState<string>(String(currentDate.getFullYear()));
  const [salarySheet, setSalarySheet] = useState<any[]>([]);
  const [salarySummary, setSalarySummary] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salarySaving, setSalarySaving] = useState(false);

  // Disbursement Modal States
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<"ALL" | any>("ALL");
  const [disburseAccount, setDisburseAccount] = useState("Bank Account (Meezan Bank)");
  const [disburseMethod, setDisburseMethod] = useState("BANK_TRANSFER");
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split("T")[0]);
  const [disburseNotes, setDisburseNotes] = useState("");
  const [isDisbursing, setIsDisbursing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [eRes, aRes] = await Promise.all([
        fetch("/api/hrm/employees", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/hrm/attendance", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      if (aRes.ok) setAttendanceList((await aRes.json()).attendance || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load HR data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalarySheet = async (m = salaryMonth, y = salaryYear) => {
    setSalaryLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/hrm/payroll?month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSalarySheet(data.salarySheet || []);
        setSalarySummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load monthly salary sheet", err);
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSalarySheet(salaryMonth, salaryYear);
    setMounted(true);
  }, []);

  const liveSummary = React.useMemo(() => {
    const totalEmployees = salarySheet.length;
    const totalBaseSalary = salarySheet.reduce((s, r) => s + Number(r.baseSalary || 0), 0);
    const totalEarnedBase = salarySheet.reduce((s, r) => {
      const totalDays = Number(r.totalDays || 30);
      const presentDays = Number(r.presentDays !== undefined ? r.presentDays : totalDays);
      const dailyWage = Number(r.baseSalary || 0) / (totalDays || 30);
      return s + Math.round(dailyWage * presentDays * 100) / 100;
    }, 0);
    const totalAbsentDeductions = Math.max(0, totalBaseSalary - totalEarnedBase);
    const totalOvertime = salarySheet.reduce((s, r) => s + Number(r.overtimeAmount || 0), 0);
    const totalAllowances = salarySheet.reduce((s, r) => s + Number(r.allowances || 0), 0);
    const totalMessDeductions = salarySheet.reduce((s, r) => s + Number(r.messDeductions || 0), 0);
    const totalAdvanceDeductions = salarySheet.reduce((s, r) => s + Number(r.advanceDeductions || 0), 0);
    const totalOtherDeductions = salarySheet.reduce((s, r) => s + Number(r.otherDeductions || 0), 0);
    const totalDeductions = totalAbsentDeductions + totalMessDeductions + totalAdvanceDeductions + totalOtherDeductions;
    const totalNetPay = salarySheet.reduce((s, r) => s + Number(r.netPay || 0), 0);
    const paidCount = salarySheet.filter((r) => r.status === "PAID").length;
    const pendingCount = salarySheet.filter((r) => r.status === "PENDING").length;

    return {
      totalEmployees,
      totalBaseSalary,
      totalEarnedBase,
      totalAbsentDeductions,
      totalOvertime,
      totalAllowances,
      totalMessDeductions,
      totalAdvanceDeductions,
      totalOtherDeductions,
      totalDeductions,
      totalNetPay,
      paidCount,
      pendingCount,
    };
  }, [salarySheet]);

  const handleMonthChange = (newMonth: string) => {
    setSalaryMonth(newMonth);
    fetchSalarySheet(newMonth, salaryYear);
  };

  const handleYearChange = (newYear: string) => {
    setSalaryYear(newYear);
    fetchSalarySheet(salaryMonth, newYear);
  };

  const handleUpdateSalaryRow = (empId: string, field: string, value: any) => {
    setSalarySheet((prev) => {
      const idx = prev.findIndex((r) => r.employeeId === empId);
      if (idx === -1) return prev;

      const next = [...prev];
      const item = { ...next[idx], [field]: Number(value) || 0 };

      const baseSalary = Number(item.baseSalary || 0);
      const totalDays = Number(item.totalDays || 30);
      let presentDays = Number(item.presentDays !== undefined ? item.presentDays : 30);

      if (field === "presentDays") {
        presentDays = Math.min(totalDays, Math.max(0, Number(value)));
        item.presentDays = presentDays;
        item.absentDays = Math.max(0, totalDays - presentDays);
      } else if (field === "absentDays") {
        const absentDays = Math.min(totalDays, Math.max(0, Number(value)));
        item.absentDays = absentDays;
        item.presentDays = Math.max(0, totalDays - absentDays);
        presentDays = item.presentDays;
      }

      const dailyWage = baseSalary / (totalDays || 30);
      const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
      const overtimeAmount = Number(item.overtimeAmount || 0);
      const allowances = Number(item.allowances || 0);
      const messDeductions = Number(item.messDeductions || 0);
      const advanceDeductions = Number(item.advanceDeductions || 0);
      const otherDeductions = Number(item.otherDeductions || 0);
      const totalDeductions = Math.round((messDeductions + advanceDeductions + otherDeductions) * 100) / 100;

      item.deductions = totalDeductions;
      item.netPay = Math.max(0, Math.round((earnedBase + overtimeAmount + allowances - totalDeductions) * 100) / 100);

      next[idx] = item;
      return next;
    });
  };

  const handleSaveSalarySheet = async () => {
    setSalarySaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          month: parseInt(salaryMonth),
          year: parseInt(salaryYear),
          items: salarySheet,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary sheet");
      toast({
        title: "Salary Sheet Saved",
        message: "Attendance, overtime, mess & advance data saved successfully.",
        type: "success",
      });
      fetchSalarySheet(salaryMonth, salaryYear);
    } catch (err: any) {
      toast({ title: "Save Failed", message: err.message, type: "error" });
    } finally {
      setSalarySaving(false);
    }
  };

  const handleOpenDisburseModal = (target: "ALL" | any) => {
    setDisburseTarget(target);
    setIsDisburseModalOpen(true);
  };

  const handleExecuteDisburse = async () => {
    setIsDisbursing(true);
    const token = localStorage.getItem("token");
    try {
      // 1. Auto-save sheet first so that latest user inputs and DB records are synced
      const saveRes = await fetch("/api/hrm/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          month: parseInt(salaryMonth),
          year: parseInt(salaryYear),
          items: salarySheet,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save sheet prior to payout");

      // 2. Resolve run IDs to disburse
      let runIdsToDisburse: string[] = [];
      if (disburseTarget === "ALL") {
        runIdsToDisburse = (saveData.runs || []).filter((r: any) => r.status === "PENDING").map((r: any) => r.id);
      } else {
        const match = (saveData.runs || []).find((r: any) => r.employeeId === disburseTarget.employeeId);
        if (match) runIdsToDisburse = [match.id];
      }

      if (runIdsToDisburse.length === 0) {
        toast({ title: "No Pending Payouts", message: "Selected staff members are already marked as PAID.", type: "info" });
        setIsDisburseModalOpen(false);
        return;
      }

      // 3. Post double-entry disbursement
      const disburseRes = await fetch("/api/hrm/payroll/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          runIds: runIdsToDisburse,
          paymentAccount: disburseAccount,
          paymentMethod: disburseMethod,
          paymentDate: disburseDate,
          notes: disburseNotes,
        }),
      });

      const disburseData = await disburseRes.json();
      if (!disburseRes.ok) throw new Error(disburseData.error || "Disbursement failed");

      toast({
        title: "Salaries Disbursed Successfully",
        message: `Processed ${disburseData.results?.length || 0} payout(s) from ${disburseAccount}. General ledger updated.`,
        type: "success",
      });

      setIsDisburseModalOpen(false);
      fetchSalarySheet(salaryMonth, salaryYear);
      fetchData();
    } catch (err: any) {
      toast({ title: "Disbursement Error", message: err.message, type: "error" });
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleDownloadMasterPDF = () => {
    const token = localStorage.getItem("token") || "";
    const url = `/api/pdf?type=salary-sheet&month=${salaryMonth}&year=${salaryYear}&token=${token}&inline=true`;
    window.open(url, "_blank");
  };

  const handleDownloadPayslip = (runId: string) => {
    const token = localStorage.getItem("token") || "";
    const url = `/api/pdf?type=payslip&id=${runId}&token=${token}&inline=true`;
    window.open(url, "_blank");
  };

  // Employee creation / edit
  const handleOpenCreateEmployee = () => {
    setEditingEmpId(null);
    setEmpNo("");
    setEmpName("");
    setEmpCnic("");
    setEmpPhone("");
    setEmpAddress("");
    setEmpDept("SERVICE");
    setEmpPos("HVAC Senior Tech");
    setEmpJoining(new Date().toISOString().split("T")[0]);
    setEmpSalary("");
    setEmpStatus("ACTIVE");
    setEmpBank("");
    setEmpFatherName("");
    setEmpFatherPhone("");
    setEmpResponsiblePerson("");
    setEmpRefPhone("");
    setIsEmpOpen(true);
  };

  const handleOpenEditEmployee = (emp: any) => {
    setEditingEmpId(emp.id);
    setEmpNo(emp.employeeNo || "");
    setEmpName(emp.name || "");
    setEmpCnic(emp.cnic || "");
    setEmpPhone(emp.phone || "");
    setEmpAddress(emp.address || "");
    setEmpDept(emp.department || "SERVICE");
    setEmpPos(emp.position || "");
    setEmpJoining(emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setEmpSalary(String(emp.baseSalary || ""));
    setEmpStatus(emp.status || "ACTIVE");
    setEmpBank(emp.bankDetails || "");
    setEmpFatherName(emp.fatherName || "");
    setEmpFatherPhone(emp.fatherPhone || "");
    setEmpResponsiblePerson(emp.responsiblePerson || "");
    setEmpRefPhone(emp.refPhone || "");
    setIsEmpOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empCnic || !empPhone || !empJoining || !empSalary) {
      toast({ title: "Required Fields Missing", message: "Please fill out Name, CNIC, Phone, Joining Date, and Salary.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    const payload = {
      employeeNo: empNo || undefined,
      name: empName,
      cnic: empCnic,
      phone: empPhone,
      address: empAddress,
      department: empDept,
      position: empPos,
      joiningDate: empJoining,
      baseSalary: Number(empSalary),
      status: empStatus,
      bankDetails: empBank,
      fatherName: empFatherName,
      fatherPhone: empFatherPhone,
      responsiblePerson: empResponsiblePerson,
      refPhone: empRefPhone,
    };

    try {
      if (editingEmpId) {
        const res = await fetch(`/api/hrm/employees/${editingEmpId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update employee");
        toast({ title: "Profile Updated", message: `${empName}'s profile has been updated.`, type: "success" });
      } else {
        const res = await fetch("/api/hrm/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to onboard employee");
        toast({ title: "Employee Onboarded", message: `${empName} added with a dedicated financial account.`, type: "success" });
      }
      setIsEmpOpen(false);
      fetchData();
      fetchSalarySheet();
    } catch (err: any) {
      toast({ title: "Save Failed", message: err.message, type: "error" });
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId || !attDate) {
      toast({ title: "Missing Info", message: "Please select employee and date.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeId: attEmpId,
          date: attDate,
          status: attStatus,
          checkIn: attStatus === "PRESENT" || attStatus === "HALF_DAY" ? checkIn : null,
          checkOut: attStatus === "PRESENT" || attStatus === "HALF_DAY" ? checkOut : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save attendance");
      toast({ title: "Attendance Logged", message: "Attendance record updated successfully.", type: "success" });
      setIsAttOpen(false);
      fetchData();
      fetchSalarySheet();
    } catch (err: any) {
      toast({ title: "Attendance Failed", message: err.message, type: "error" });
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      (e.employeeNo && e.employeeNo.toLowerCase().includes(search.toLowerCase())) ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()) ||
      e.cnic.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSalarySheet = salarySheet.filter(
    (r) =>
      (r.employeeNo && r.employeeNo.toLowerCase().includes(search.toLowerCase())) ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.position.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Main Navigation Dock */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Employees & Monthly Salary Sheet</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage employee rosters, daily attendance, end-of-month salary sheets, mess & overtime deductions, and double-entry payroll disbursements.
            </p>
          </div>

          {/* Top Tabs */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl text-xs font-bold gap-1 self-start sm:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("salary-sheet")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "salary-sheet"
                  ? "bg-blue-600 text-white shadow-md font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Monthly Salary Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("employees")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "employees"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Employees Directory</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "attendance"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Daily Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MONTHLY SALARY SHEET                                              */}
      {/* ========================================================================= */}
      {activeTab === "salary-sheet" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar: Month Picker, Year Picker, Save, Download PDF, Disburse All */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Month & Year Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-500">Period:</span>
                  <select
                    className="bg-transparent text-xs font-black text-slate-800 dark:text-white focus:outline-hidden"
                    value={salaryMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-white dark:bg-slate-900">
                        {new Date(2026, i, 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <select
                    className="bg-transparent text-xs font-black text-slate-800 dark:text-white focus:outline-hidden border-l border-slate-200 dark:border-slate-800 pl-2"
                    value={salaryYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                  >
                    <option value="2025" className="bg-white dark:bg-slate-900">2025</option>
                    <option value="2026" className="bg-white dark:bg-slate-900">2026</option>
                    <option value="2027" className="bg-white dark:bg-slate-900">2027</option>
                  </select>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff in sheet..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSalarySheet}
                  disabled={salarySaving}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-blue-600" />
                  <span>{salarySaving ? "Saving Draft..." : "Save Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMasterPDF}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Master Sheet (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDisburseModal("ALL")}
                  disabled={liveSummary.pendingCount === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay All Unpaid Salaries</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Base Payroll</span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                PKR {Math.round(liveSummary.totalBaseSalary).toLocaleString()}
              </div>
              <span className="text-[10.5px] text-slate-500">{liveSummary.totalEmployees} Active Employees</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Overtime & Allowances</span>
              <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                + PKR {Math.round(liveSummary.totalOvertime + liveSummary.totalAllowances).toLocaleString()}
              </div>
              <span className="text-[10.5px] text-slate-500">
                OT: PKR {Math.round(liveSummary.totalOvertime).toLocaleString()} | Allow: PKR {Math.round(liveSummary.totalAllowances).toLocaleString()}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Mess & Advances Deducted</span>
              <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                - PKR {Math.round(liveSummary.totalDeductions).toLocaleString()}
              </div>
              <span className="text-[10.5px] text-slate-500">
                Mess: PKR {Math.round(liveSummary.totalMessDeductions).toLocaleString()} | Adv: PKR {Math.round(liveSummary.totalAdvanceDeductions).toLocaleString()}
              </span>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl space-y-1 shadow-md shadow-blue-500/20">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Total Net Disbursable</span>
              <div className="text-lg font-black font-mono">
                PKR {Math.round(liveSummary.totalNetPay).toLocaleString()}
              </div>
              <span className="text-[10.5px] opacity-80">
                {liveSummary.paidCount} Paid / {liveSummary.pendingCount} Pending
              </span>
            </div>
          </div>

          {/* Master Salary Sheet Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5 text-right">Base Salary</th>
                    <th className="p-3.5 text-center">Duty Days</th>
                    <th className="p-3.5 text-center">Absent Days</th>
                    <th className="p-3.5 text-right">Overtime (PKR)</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Mess Exp.</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Adv. Deduct</th>
                    <th className="p-3.5 text-right">Allowances</th>
                    <th className="p-3.5 text-right font-black">Net Salary (PKR)</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSalarySheet.map((item, idx) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Employee Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{item.employeeName}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {item.employeeNo || "EMP"} • {item.position}
                        </span>
                      </td>

                      {/* Base Salary */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        PKR {Math.round(item.baseSalary).toLocaleString()}
                        <span className="block text-[9.5px] font-normal text-slate-400">
                          (PKR {Math.round(item.baseSalary / (item.totalDays || 30))}/day)
                        </span>
                      </td>

                      {/* Duty / Present Days */}
                      <td className="p-3.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.totalDays || 30}
                          disabled={item.status === "PAID"}
                          value={item.presentDays ?? (item.totalDays || 30)}
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "presentDays", e.target.value)}
                          className="w-16 px-2 py-1 text-center font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 disabled:opacity-75"
                        />
                      </td>

                      {/* Absent Days */}
                      <td className="p-3.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.totalDays || 30}
                          disabled={item.status === "PAID"}
                          value={item.absentDays ?? 0}
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "absentDays", e.target.value)}
                          className={`w-16 px-2 py-1 text-center font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-75 ${
                            item.absentDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                          }`}
                        />
                      </td>

                      {/* Overtime PKR */}
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={item.status === "PAID"}
                          value={item.overtimeAmount !== undefined && item.overtimeAmount !== 0 ? item.overtimeAmount : ""}
                          placeholder="0"
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "overtimeAmount", e.target.value)}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-blue-600 dark:text-blue-400 disabled:opacity-75"
                        />
                      </td>

                      {/* Mess / Food Deduction */}
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={item.status === "PAID"}
                          value={item.messDeductions !== undefined && item.messDeductions !== 0 ? item.messDeductions : ""}
                          placeholder="0"
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "messDeductions", e.target.value)}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-rose-600 dark:text-rose-400 disabled:opacity-75"
                        />
                      </td>

                      {/* Advance Salary Deduction */}
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={item.status === "PAID"}
                          value={item.advanceDeductions !== undefined && item.advanceDeductions !== 0 ? item.advanceDeductions : ""}
                          placeholder="0"
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "advanceDeductions", e.target.value)}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-rose-600 dark:text-rose-400 disabled:opacity-75"
                        />
                      </td>

                      {/* Allowances / Bonus */}
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={item.status === "PAID"}
                          value={item.allowances !== undefined && item.allowances !== 0 ? item.allowances : ""}
                          placeholder="0"
                          onChange={(e) => handleUpdateSalaryRow(item.employeeId, "allowances", e.target.value)}
                          className="w-20 px-2 py-1 text-right font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 disabled:opacity-75"
                        />
                      </td>

                      {/* Net Salary Payable */}
                      <td className="p-3.5 text-right font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                        PKR {Math.round(item.netPay).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                            item.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "PAID" ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadPayslip(item.id)}
                              title="Download Payslip PDF"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>Slip</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDisburseModal(item)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black transition-all flex items-center gap-1"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYEES DIRECTORY                                               */}
      {/* ========================================================================= */}
      {activeTab === "employees" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, phone, CNIC, designation..."
                className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium w-full focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateEmployee}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Onboard Staff Member</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">ID / Name</th>
                    <th className="p-3.5">CNIC / ID Card</th>
                    <th className="p-3.5">Phone / Contact</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5 text-right">Base Salary</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {emp.name}
                        <span className="block text-[10px] text-slate-400 font-mono">{emp.employeeNo || "EMP"}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{emp.cnic}</td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{emp.phone}</td>
                      <td className="p-3.5">{emp.department}</td>
                      <td className="p-3.5 font-medium">{emp.position}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        PKR {Number(emp.baseSalary || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEmployee(emp)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                        >
                          Edit Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAILY ATTENDANCE                                                   */}
      {/* ========================================================================= */}
      {activeTab === "attendance" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Daily Attendance Register</h3>
              <p className="text-xs text-slate-500">Log daily check-ins, half days, and absences.</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAttOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>+ Mark Daily Attendance</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Staff Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Check In</th>
                    <th className="p-3.5">Check Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceList.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono">{new Date(att.date).toLocaleDateString()}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{att.employee?.name || "Staff"}</td>
                      <td className="p-3.5">{att.employee?.department || "SERVICE"}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                            att.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : att.status === "HALF_DAY"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DISBURSEMENT / PAY SALARY MODAL                                           */}
      {/* ========================================================================= */}
      {mounted && isDisburseModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Confirm Salary Payout</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {disburseTarget === "ALL"
                    ? `Disbursing all pending salaries for ${new Date(parseInt(salaryYear), parseInt(salaryMonth) - 1, 1).toLocaleString("default", { month: "long" })} ${salaryYear}`
                    : `Disbursing salary for ${disburseTarget.employeeName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Account Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Payout From Account (Bank / Cash)
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={disburseAccount}
                  onChange={(e) => setDisburseAccount(e.target.value)}
                >
                  <option value="Bank Account (Meezan Bank)">Bank Account (Meezan Bank)</option>
                  <option value="Bank Account (HBL)">Bank Account (HBL)</option>
                  <option value="Cash in Hand">Cash in Hand</option>
                </select>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    value={disburseMethod}
                    onChange={(e) => setDisburseMethod(e.target.value)}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (IBFT)</option>
                    <option value="CASH">Cash Voucher</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={disburseDate}
                    onChange={(e) => setDisburseDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary batch transfer"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                <span className="font-black block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Automated Double-Entry General Ledger Postings</span>
                </span>
                <p className="text-[11px] opacity-90">
                  This payout will automatically debit <strong>Salary & Wage Expense</strong>, credit <strong>{disburseAccount}</strong>, and credit/settle any active staff advance recoveries in the company General Ledger.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisbursing}
                onClick={handleExecuteDisburse}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isDisbursing ? "Processing Payout..." : "Confirm & Post Payment"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ONBOARD / EDIT EMPLOYEE MODAL                                             */}
      {/* ========================================================================= */}
      {mounted && isEmpOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingEmpId ? "Edit Staff Profile" : "Onboard Staff Member"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingEmpId
                    ? "Update employee information and salary details."
                    : "Create new employee profile. A dedicated financial account is opened automatically."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmpOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Emp # (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto: EMP-100x"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Mehmood"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CNIC / ID Card</label>
                  <input
                    type="text"
                    required
                    placeholder="42101-1234567-1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={empCnic}
                    onChange={(e) => setEmpCnic(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                  >
                    <option value="SERVICE">SERVICE</option>
                    <option value="SALES">SALES</option>
                    <option value="PROCUREMENT">PROCUREMENT</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Position / Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Field Technician"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    value={empPos}
                    onChange={(e) => setEmpPos(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={empJoining}
                    onChange={(e) => setEmpJoining(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base Monthly Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-black text-blue-600 dark:text-blue-400"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Account / Payment Details</label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank, A/C: 0101010101, Title: Asif Mehmood"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                  value={empBank}
                  onChange={(e) => setEmpBank(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Address details..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  value={empAddress}
                  onChange={(e) => setEmpAddress(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingEmpId ? "Save Changes" : "Confirm Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MARK ATTENDANCE MODAL                                                     */}
      {/* ========================================================================= */}
      {mounted && isAttOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Mark Daily Attendance</h3>
              <button
                type="button"
                onClick={() => setIsAttOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Staff Member</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                  value={attEmpId}
                  onChange={(e) => setAttEmpId(e.target.value)}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeNo || "EMP"}) • {e.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value)}
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="HALF_DAY">HALF_DAY</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="LEAVE">LEAVE</option>
                  </select>
                </div>
              </div>

              {(attStatus === "PRESENT" || attStatus === "HALF_DAY") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check In</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check Out</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAttOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Log Attendance
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
