"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../_components/auth-context";
import { formatToIST } from "@/lib/date";
import ExportControls from "./ExportControls";

type Tab = "dashboard" | "users" | "audit" | "submissions";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "dashboard" },
  { id: "users", label: "users" },
  { id: "audit", label: "audit logs" },
  { id: "submissions", label: "submissions" },
];

interface AdminUser {
  srn: string;
  name: string;
  role: "admin" | "member";
  branch: string;
  semester: string;
  program?: string;
  section?: string;
  email?: string;
  phone?: string;
  campus?: string;
  created_at?: string;
  last_login?: string;
}

interface AuditLog {
  id: number;
  srn: string;
  ip: string | null;
  user_type: string;
  action: string;
  detail: string | null;
  created_at: string;
}

interface IpStat {
  ip: string;
  hits: number;
  last_seen: string;
}

interface ActivityItem {
  type: "audit" | "application";
  srn: string;
  action: string;
  ip: string | null;
  created_at: string;
}

interface Stats {
  metrics: { totalUsers: number; totalSubmissions: number };
  ips: IpStat[];
  activity: ActivityItem[];
}

interface Submission {
  id: number;
  user_srn: string;
  fullName: string;
  srn: string;
  branch: string;
  year: string;
  email: string;
  phone: string;
  domains: string[];
  domainAnswers: Record<string, unknown> | null;
  experience: string | null;
  portfolioUrl: string | null;
  whyJoin: string | null;
  feedback: string | null;
  createdAt: string;
  [key: string]: unknown;
}

function getInitialTab(): Tab {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace("#", "");
  if (TABS.some((t) => t.id === hash)) return hash as Tab;
  return "dashboard";
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    setTab(getInitialTab());
    function onHashChange() {
      setTab(getInitialTab());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    window.location.hash = next;
  }

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      const [usersRes, logsRes, statsRes, submissionsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/audit-logs"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/submissions"),
      ]);

      if (
        !usersRes.ok ||
        !logsRes.ok ||
        !statsRes.ok ||
        !submissionsRes.ok
      ) {
        setFetchError("failed to load one or more admin resources");
      }

      const [usersData, logsData, statsData, submissionsData] = await Promise.all([
        usersRes.json().catch(() => ({})),
        logsRes.json().catch(() => ({})),
        statsRes.json().catch(() => ({})),
        submissionsRes.json().catch(() => ({})),
      ]);

      setUsers(usersData.users ?? []);
      setLogs(logsData.logs ?? []);
      setStats(statsData.metrics ? statsData : null);
      setSubmissions(submissionsData.submissions ?? []);
    } catch {
      setFetchError("could not reach the admin API");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  async function toggleRole(srn: string) {
    await fetch(`/api/admin/users/${srn}/role`, { method: "PATCH" });
    await fetchData();
  }

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <p className="text-fg-dim">loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="term max-w-md">
            <div className="term-bar">
              <div className="term-dots">
                <span className="term-dot" />
                <span className="term-dot" />
                <span className="term-dot" />
              </div>
              <span className="term-title">403</span>
            </div>
            <div className="term-body">
              <p style={{ color: "var(--danger)" }}>
                {"> 403 forbidden"}
              </p>
              <p className="text-fg-dim mt-2">
                you are authenticated as {user.srn}, but this area requires
                the admin role.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="mb-6">
          <span className="kicker">admin</span>
          <h1 className="text-2xl font-display mt-2">control_panel</h1>
        </div>

        <div className="admin-tabs items-center">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`admin-tab ${tab === t.id ? "admin-tab-active" : ""}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            className="admin-tab ml-auto"
            onClick={fetchData}
            disabled={loadingData}
          >
            {loadingData ? "↻ refreshing..." : "↻ refresh"}
          </button>
        </div>

        {fetchError && <p className="field-error mb-4">{fetchError}</p>}

        {tab === "dashboard" && (
          <DashboardTab stats={stats} loading={loadingData} />
        )}

        {tab === "users" && (
          <UsersTab
            users={users}
            currentSrn={user.srn}
            onToggleRole={toggleRole}
            loading={loadingData}
          />
        )}

        {tab === "audit" && <AuditTab logs={logs} loading={loadingData} />}

        {tab === "submissions" && (
          <SubmissionsTab submissions={submissions} loading={loadingData} />
        )}
      </div>
    </div>
  );
}

function DashboardTab({
  stats,
  loading,
}: {
  stats: Stats | null;
  loading: boolean;
}) {
  return (
    <div>
      <div className="admin-metric-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-label">total users</div>
          <div className="admin-metric-value">
            {stats?.metrics.totalUsers ?? (loading ? "..." : 0)}
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-label">total submissions</div>
          <div className="admin-metric-value">
            {stats?.metrics.totalSubmissions ?? (loading ? "..." : 0)}
          </div>
        </div>
      </div>

      <div className="admin-card mb-6">
        <div className="admin-section-title">ip logs</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ip</th>
                <th>hits</th>
                <th>last seen</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.ips ?? []).map((ip) => (
                <tr key={ip.ip}>
                  <td>{ip.ip}</td>
                  <td>{ip.hits}</td>
                  <td>{formatToIST(ip.last_seen)}</td>
                </tr>
              ))}
              {!loading && (stats?.ips ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="text-fg-faint">
                    no ip data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-section-title">activity stream</div>
        <div className="admin-activity-list">
          {(stats?.activity ?? []).map((item, i) => (
            <div className="admin-activity-row" key={i}>
              <span>
                <span className="tag mr-2">{item.type}</span>
                {item.srn} — {item.action}
              </span>
              <span className="text-fg-faint">{formatToIST(item.created_at)}</span>
            </div>
          ))}
          {!loading && (stats?.activity ?? []).length === 0 && (
            <div className="admin-activity-row text-fg-faint">
              no activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({
  users,
  currentSrn,
  onToggleRole,
  loading,
}: {
  users: AdminUser[];
  currentSrn: string;
  onToggleRole: (srn: string) => void;
  loading: boolean;
}) {
  return (
    <div className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>srn</th>
              <th>name</th>
              <th>role</th>
              <th>branch</th>
              <th>sem</th>
              <th>last login</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.srn}>
                <td>{u.srn}</td>
                <td>{u.name}</td>
                <td>
                  <span
                    className={`admin-badge ${
                      u.role === "admin" ? "admin-badge-admin" : ""
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td>{u.branch}</td>
                <td>{u.semester}</td>
                <td>{formatToIST(u.last_login)}</td>
                <td>
                  {u.srn === currentSrn ? (
                    <span className="text-fg-faint">you</span>
                  ) : (
                    <button
                      className={`admin-role-btn ${
                        u.role === "admin"
                          ? "admin-role-btn-demote"
                          : "admin-role-btn-promote"
                      }`}
                      onClick={() => onToggleRole(u.srn)}
                    >
                      {u.role === "admin" ? "demote" : "promote"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="text-fg-faint">
                  no users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTab({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  return (
    <div className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>time</th>
              <th>srn</th>
              <th>ip</th>
              <th>type</th>
              <th>action</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatToIST(l.created_at)}</td>
                <td>{l.srn}</td>
                <td>{l.ip ?? "—"}</td>
                <td>
                  <span className="admin-badge">{l.user_type}</span>
                </td>
                <td>
                  <span
                    className={`admin-badge ${
                      l.action === "role_change" ? "admin-badge-warn" : ""
                    }`}
                  >
                    {l.action}
                  </span>
                </td>
                <td>{l.detail ?? "—"}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-fg-faint">
                  no audit logs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmissionsTab({
  submissions,
  loading,
}: {
  submissions: Submission[];
  loading: boolean;
}) {
  const COLUMNS: { header: string; render: (s: Submission) => ReactNode }[] = [
    { header: "submitted", render: (s) => formatToIST(s.createdAt) },
    { header: "name", render: (s) => s.fullName },
    { header: "srn", render: (s) => s.srn },
    { header: "branch", render: (s) => s.branch },
    { header: "year", render: (s) => s.year },
    { header: "email", render: (s) => s.email },
    { header: "phone", render: (s) => (s.phone as string) ?? "—" },
    {
      header: "domains",
      render: (s) => (
        <>
          {(s.domains ?? []).map((d) => (
            <span className="tag mr-1" key={d}>
              {d}
            </span>
          ))}
        </>
      ),
    },
    { header: "experience", render: (s) => s.experience ?? "—" },
    { header: "portfolio url", render: (s) => s.portfolioUrl ?? "—" },
    { header: "why join", render: (s) => s.whyJoin ?? "—" },
    { header: "tech: cyber experience", render: (s) => (s.techCyberExperience as string) ?? "—" },
    { header: "tech: language", render: (s) => (s.techLanguage as string) ?? "—" },
    { header: "tech: why domain", render: (s) => (s.techWhyDomain as string) ?? "—" },
    { header: "tech: prior experience", render: (s) => (s.techPriorExperience as string) ?? "—" },
    { header: "tech: ctf participated", render: (s) => (s.techCtfParticipated as string) ?? "—" },
    { header: "tech: ctf other", render: (s) => (s.techCtfOther as string) ?? "—" },
    { header: "tech: ctf confidence", render: (s) => (s.techCtfConfidence as string) ?? "—" },
    { header: "tech: github", render: (s) => (s.techGithub as string) ?? "—" },
    { header: "tech: linkedin", render: (s) => (s.techLinkedin as string) ?? "—" },
    { header: "tech: project", render: (s) => (s.techProject as string) ?? "—" },
    { header: "events: why join", render: (s) => (s.eventsWhyJoin as string) ?? "—" },
    { header: "events: prior experience", render: (s) => (s.eventsPriorExperience as string) ?? "—" },
    { header: "events: plan steps", render: (s) => (s.eventsPlanSteps as string) ?? "—" },
    { header: "events: orientation ideas", render: (s) => (s.eventsOrientationIdeas as string) ?? "—" },
    { header: "events: excites", render: (s) => (s.eventsExcites as string) ?? "—" },
    { header: "marketing: why domain", render: (s) => (s.marketingWhyDomain as string) ?? "—" },
    { header: "marketing: experience", render: (s) => (s.marketingExperience as string) ?? "—" },
    { header: "marketing: confidence", render: (s) => (s.marketingConfidence as string) ?? "—" },
    { header: "media: why domain", render: (s) => (s.mediaWhyDomain as string) ?? "—" },
    { header: "media: tools", render: (s) => (s.mediaTools as string) ?? "—" },
    { header: "media: portfolio", render: (s) => (s.mediaPortfolio as string) ?? "—" },
    { header: "design: why domain", render: (s) => (s.designWhyDomain as string) ?? "—" },
    { header: "design: tools", render: (s) => (s.designTools as string) ?? "—" },
    { header: "design: confidence", render: (s) => (s.designConfidence as string) ?? "—" },
    { header: "feedback", render: (s) => s.feedback ?? "—" },
  ];

  return (
    <div className="admin-card">
      <div className="admin-section-title flex items-center justify-between">
        <span>submissions ({submissions.length})</span>
        <ExportControls />
      </div>
      <div className="admin-table-wrap overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.header} className="whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                {COLUMNS.map((col) => (
                  <td key={col.header} className="whitespace-nowrap max-w-xs truncate">
                    {col.render(s)}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && submissions.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-fg-faint">
                  no submissions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}