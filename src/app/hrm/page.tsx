"use client";

import React, { useState, useEffect } from "react";
import { Plus, ListFilter, ClipboardCheck, ArrowUpRight, ArrowDownRight, Layers, FileText, CheckCircle2, DollarSign, Users, CalendarDays, Receipt, Eye } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import { createPortal } from "react-dom";

export default function HrmPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("employees"); // employees, attendance, payroll
  const [search, setSearch] = useState("");

  // Create Employee States
  const [isEmpOpen, setIsEmpOpen] = useState(false);
  const [empNo, setEmpNo] = useState("");
  const [empName, setEmpName] = useState("");
  const [empCnic, setEmpCnic] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empAddress, setEmpAddress] = useState("");
  const [empDept, setEmpDept] = useState("SERVICE");
  const [empPos, setEmpPos] = useState("HVAC Technician");
  const [empJoining, setEmpJoining] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [empBank, setEmpBank] = useState("");
  const [empFatherName, setEmpFatherName] = useState("");
  const [empFatherPhone, setEmpFatherPhone] = useState("");
  const [empResponsiblePerson, setEmpResponsiblePerson] = useState("");
  const [empRefPhone, setEmpRefPhone] = useState("");

  // Log Attendance States
  const [isAttOpen, setIsAttOpen] = useState(false);
  const [attEmpId, setAttEmpId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attStatus, setAttStatus] = useState("PRESENT");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Compile Payroll States
  const [payMonth, setPayMonth] = useState(String(new Date().getMonth() + 1));
  const [payYear, setPayYear] = useState(String(new Date().getFullYear()));
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const eRes = await fetch("/api/hrm/employees", { headers: { Authorization: `Bearer ${token}` } });
      const aRes = await fetch("/api/hrm/attendance", { headers: { Authorization: `Bearer ${token}` } });
      const pRes = await fetch(`/api/hrm/payroll?month=${payMonth}&year=${payYear}`, { headers: { Authorization: `Bearer ${token}` } });

      if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      if (aRes.ok) setAttendanceList((await aRes.json()).attendance || []);
      if (pRes.ok) setPayrollRuns((await pRes.json()).payrollRuns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, [payMonth, payYear]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empCnic || !empPhone || !empJoining || !empSalary) {
      alert("Please fill out all required profile fields.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeNo: empNo || undefined,
          name: empName,
          cnic: empCnic,
          phone: empPhone,
          address: empAddress,
          department: empDept,
          position: empPos,
          joiningDate: empJoining,
          baseSalary: Number(empSalary),
          bankDetails: empBank,
          fatherName: empFatherName,
          fatherPhone: empFatherPhone,
          responsiblePerson: empResponsiblePerson,
          refPhone: empRefPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add employee");

      alert("Employee profile onboarded successfully.");
      setIsEmpOpen(false);
      // clear fields
      setEmpNo("");
      setEmpName("");
      setEmpCnic("");
      setEmpPhone("");
      setEmpAddress("");
      setEmpSalary("");
      setEmpBank("");
      setEmpFatherName("");
      setEmpFatherPhone("");
      setEmpResponsiblePerson("");
      setEmpRefPhone("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId || !attDate || !attStatus) {
      alert("Please select employee, date and status.");
      return;
    }

    const token = localStorage.getItem("token");
    const payload = {
      employeeId: attEmpId,
      date: attDate,
      status: attStatus,
      checkIn: checkIn ? `${attDate}T${checkIn}:00Z` : undefined,
      checkOut: checkOut ? `${attDate}T${checkOut}:00Z` : undefined,
    };

    try {
      const res = await fetch("/api/hrm/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save attendance");
      alert("Attendance record updated successfully.");
      setIsAttOpen(false);
      setAttEmpId("");
      setCheckIn("");
      setCheckOut("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ month: parseInt(payMonth), year: parseInt(payYear) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate monthly payroll runs");

      alert("Monthly payroll runs calculated based on attendance logs.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePaySalary = async (runId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hrm/payroll/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payrollRunId: runId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");

      alert("Payslip marked PAID. Journal recorded in ledger.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadPayslip = async (runId: string, employeeName: string, month: number, year: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/pdf?type=payslip&id=${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${employeeName.replace(/\s+/g, "_")}-${month}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter
  const filteredEmployees = employees.filter((e) =>
    (e.employeeNo && e.employeeNo.toLowerCase().includes(search.toLowerCase())) ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.cnic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">HRM & Daily Payroll</h2>
            <p className="text-xs text-slate-500 mt-1">Manage employee rosters, log attendance, and run payroll reconciliations</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEmpOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              Onboard Employee
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-4">
          {[
            { id: "employees", label: `Employees List (${employees.length})` },
            { id: "payroll", label: `Payroll Runs (${payrollRuns.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
      ) : (
        /* ==================== HRM LISTS ==================== */
        <div className="space-y-4">
          <SearchFilter placeholder="Search lists..." search={search} onSearchChange={setSearch} />

          {/* 1. EMPLOYEES TAB */}
          {activeTab === "employees" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">Emp #</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">CNIC / ID</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Position</th>
                      <th className="p-3 text-right">Base Salary (PKR)</th>
                      <th className="p-3">Joining Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {emp.employeeNo || "-"}
                        </td>
                        <td className="p-3">
                          <span className="font-bold block">{emp.name}</span>
                          <span className="text-[10px] text-slate-500">{emp.phone}</span>
                        </td>
                        <td className="p-3 font-semibold">{emp.cnic}</td>
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{emp.department}</td>
                        <td className="p-3">{emp.position}</td>
                        <td className="p-3 text-right font-bold text-blue-500">{Number(emp.baseSalary).toFixed(2)}</td>
                        <td className="p-3 text-slate-500">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => window.open(`/api/pdf?type=employee-form&id=${emp.id}&inline=true`, "_blank")}
                            title="View Employment Form PDF"
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 transition-all inline-flex items-center gap-1 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Form</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* 3. PAYROLL RUNS TAB */}
          {activeTab === "payroll" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <select
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(2026, i, 1).toLocaleString("default", { month: "long" })}</option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    value={payYear}
                    onChange={(e) => setPayYear(e.target.value)}
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                <button
                  onClick={handleGeneratePayroll}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  {generating ? "Calculating Payslips..." : "Compile Payroll Runs"}
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3">Employee</th>
                        <th className="p-3 text-right">Base Salary</th>
                        <th className="p-3 text-right text-rose-500">Deductions (Absences)</th>
                        <th className="p-3 text-right">Allowances</th>
                        <th className="p-3 text-right font-extrabold text-blue-500">Net Pay</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {payrollRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3">
                            <span className="font-bold">{run.employee.name}</span>
                            <span className="block text-[9px] text-slate-500">{run.employee.position}</span>
                          </td>
                          <td className="p-3 text-right">{Number(run.baseSalary).toFixed(2)}</td>
                          <td className="p-3 text-right text-rose-500">({Number(run.deductions).toFixed(2)})</td>
                          <td className="p-3 text-right">{Number(run.allowances).toFixed(2)}</td>
                          <td className="p-3 text-right font-extrabold text-blue-500">{Number(run.netPay).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              run.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="p-3 text-center flex items-center justify-center gap-2">
                            {run.status === "PENDING" ? (
                              <button
                                onClick={() => handlePaySalary(run.id)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" /> Reconcile / Pay
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownloadPayslip(run.id, run.employee.name, run.month, run.year)}
                                className="inline-block p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-500"
                                title="Download Payslip PDF"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CREATE EMPLOYEE MODAL ==================== */}
      {mounted && isEmpOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Onboard Employee Profile</h3>
              <button
                type="button"
                onClick={() => setIsEmpOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Create new active employee profiles for daily rosters and monthly payroll calculation runs.</p>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Emp # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto: EMP-100x"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CNIC / ID Card</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 42101-1234567-1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empCnic}
                    onChange={(e) => setEmpCnic(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +92333"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empJoining}
                    onChange={(e) => setEmpJoining(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Position / Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Technician"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empPos}
                    onChange={(e) => setEmpPos(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Base Monthly Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-blue-500"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bank Account details</label>
                <input
                  type="text"
                  placeholder="e.g. HBL Title: John Doe A/C: 123456789"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={empBank}
                  onChange={(e) => setEmpBank(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street details..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={empAddress}
                  onChange={(e) => setEmpAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Father's Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Shakeel Ahmad"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empFatherName}
                    onChange={(e) => setEmpFatherName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Father's Contact# (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. +92308..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={empFatherPhone}
                    onChange={(e) => setEmpFatherPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Responsible Person (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rana Rizwan"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={empResponsiblePerson}
                    onChange={(e) => setEmpResponsiblePerson(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reference / Contact# (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. +92312..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={empRefPhone}
                    onChange={(e) => setEmpRefPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  Confirm Onboard
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
