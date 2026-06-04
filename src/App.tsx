import React, { useState, useEffect } from "react";
import {
  Database,
  RefreshCw,
  Plus,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Table as TableIcon,
  Layers,
  ChevronRight,
  User,
  Clock,
  Code2,
  Trash2,
  Eye,
  Info,
  Check,
  X
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import {
  DatabaseConfig,
  ConnectionStatus,
  TableMetadata,
  ColumnMetadata,
  WidgetConfig,
  SystemLog,
  WidgetResult,
  SchemaSyncResult
} from "./types";

export default function App() {
  // Current logged in user context
  const currentUserEmail = "quangzero98@gmail.com";

  const getThemeClasses = (themeName: string) => {
    switch (themeName) {
      case "emerald":
        return {
          bg: "bg-stone-55 text-stone-900",
          card: "bg-white border-stone-200",
          header: "bg-stone-100 border-stone-200",
          textDark: "text-stone-900",
          textMute: "text-stone-500",
          accentColor: "#059669",
          btnAccent: "bg-emerald-600 hover:bg-emerald-700 text-white",
          btnAccentMute: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-250",
          borderColor: "border-stone-200",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
          codeBg: "bg-stone-900 text-stone-100",
          railActive: "bg-emerald-600 text-white shadow-sm",
        };
      case "sunburst":
        return {
          bg: "bg-amber-50/20 text-slate-900",
          card: "bg-white border-orange-100",
          header: "bg-amber-50 border-orange-100",
          textDark: "text-slate-900",
          textMute: "text-slate-500",
          accentColor: "#ea580c",
          btnAccent: "bg-orange-600 hover:bg-orange-750 text-white",
          btnAccentMute: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
          borderColor: "border-orange-150",
          badge: "bg-orange-50 text-orange-850 border-orange-200",
          codeBg: "bg-slate-900 text-slate-100",
          railActive: "bg-orange-600 text-white shadow-sm",
        };
      case "cyber":
        return {
          bg: "bg-slate-950 text-slate-100",
          card: "bg-slate-900/90 border-slate-800 backdrop-blur-sm",
          header: "bg-slate-950/80 border-slate-800 backdrop-blur-sm",
          textDark: "text-slate-100",
          textMute: "text-slate-400",
          accentColor: "#6366f1",
          btnAccent: "bg-indigo-600 hover:bg-indigo-700 text-white",
          btnAccentMute: "bg-slate-800 text-slate-100 hover:bg-slate-700 border-clip-border border-slate-700",
          borderColor: "border-slate-800",
          badge: "bg-slate-800 text-indigo-300 border-indigo-900/50",
          codeBg: "bg-black text-slate-200",
          railActive: "bg-indigo-600 text-white shadow-sm",
        };
      case "corporate":
      default:
        return {
          bg: "bg-slate-50 text-slate-900",
          card: "bg-white border-slate-200",
          header: "bg-slate-50 border-slate-200",
          textDark: "text-slate-900",
          textMute: "text-slate-500",
          accentColor: "#2563eb",
          btnAccent: "bg-blue-600 hover:bg-blue-700 text-white",
          btnAccentMute: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
          borderColor: "border-slate-200",
          badge: "bg-blue-50 text-blue-800 border-blue-200",
          codeBg: "bg-slate-800 text-slate-150",
          railActive: "bg-blue-600 text-white shadow-sm",
        };
    }
  };

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"connection" | "builder" | "dashboard" | "logs">("connection");

  // Database Connection states
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: "",
    port: 5432,
    database: "",
    user: "",
    password: "",
    type: "postgres",
  });

  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverIp, setServerIp] = useState<string>("");

  // Synced Schema metadata
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [schemaSynced, setSchemaSynced] = useState(false);

  // Theme configuration state
  const [appTheme, setAppTheme] = useState<"corporate" | "emerald" | "sunburst" | "cyber">("corporate");

  // Widget Designer states
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [newWidget, setNewWidget] = useState<{
    name: string;
    tableName: string;
    xAxisColumn: string;
    yAxisColumn: string;
    aggregate: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE' | '';
    chartType: 'bar' | 'line' | 'table' | 'kpi';
    colorPalette: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose';
    showGridLines: boolean;
    showLabels: boolean;
  }>({
    name: "",
    tableName: "",
    xAxisColumn: "",
    yAxisColumn: "",
    aggregate: "",
    chartType: "bar",
    colorPalette: "blue",
    showGridLines: true,
    showLabels: false,
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Dashboard Runtime state
  const [widgetResults, setWidgetResults] = useState<Record<string, WidgetResult>>({});
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Systems Logs states
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  // Fetch initial logs, check local storage configurations if any
  useEffect(() => {
    fetchLogs();
    fetchServerIp();
    
    // Load config from localStorage if it exists
    const savedTheme = localStorage.getItem("app_theme");
    if (savedTheme) {
      setAppTheme(savedTheme as any);
    }

    const savedConfig = localStorage.getItem("db_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setDbConfig(parsed);
      } catch (e) {
        console.error("Lỗi đọc config lưu trữ:", e);
      }
    }

    const savedWidgets = localStorage.getItem("widgets_config");
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        setWidgets(parsed);
      } catch (e) {
        console.error("Lỗi đọc widgets lưu trữ:", e);
      }
    }
  }, []);

  const fetchServerIp = async () => {
    try {
      const res = await fetch("/api/server-ip");
      const data = await res.json();
      if (data.success) {
        setServerIp(data.ip);
      }
    } catch (e) {
      console.error("Lỗi lấy IP của server:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setSystemLogs(data);
    } catch (err) {
      console.error("Lỗi lấy nhật ký hệ thống:", err);
    }
  };

  const saveConfigToLocal = (config: DatabaseConfig) => {
    localStorage.setItem("db_config", JSON.stringify(config));
  };

  const handleDbValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let typedValue: any = value;
    if (name === "port") {
      typedValue = value ? parseInt(value, 10) : "";
    }
    const updated = { ...dbConfig, [name]: typedValue };
    
    // Automatically adjust port default if database type changes
    if (name === "type") {
      updated.port = value === "postgres" ? 5432 : 3306;
    }

    setDbConfig(updated);
    saveConfigToLocal(updated);
  };

  // 1. Verify Database credentials
  const checkConnection = async () => {
    setIsConnecting(true);
    setConnStatus(null);
    setValidationError(null);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const data: ConnectionStatus = await res.json();
      setConnStatus(data);
      
      // Auto-refresh schema if connection is successful
      if (data.success) {
        syncSchema(dbConfig);
      }
      fetchLogs();
    } catch (err: any) {
      setConnStatus({
        success: false,
        message: err.message || "Không thể kết nối đến server backend api"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // 2. Refresh Schema
  const syncSchema = async (configOverride?: DatabaseConfig) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configOverride || dbConfig }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data: SchemaSyncResult = await res.json();
      setTables(data.tables || []);
      setColumns(data.columns || []);
      setSchemaSynced(true);
      fetchLogs();
    } catch (err: any) {
      alert("Đồng bộ Schema thất bại: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Sync SQL code formulation logic
  const generateSql = (w: typeof newWidget): string => {
    if (!w.tableName) return "";

    const escapedTable = `"${w.tableName}"`;
    const escapedY = w.yAxisColumn ? `"${w.yAxisColumn}"` : "*";
    const escapedX = w.xAxisColumn ? `"${w.xAxisColumn}"` : "";

    let sql = "";

    if (w.aggregate && w.aggregate !== "NONE") {
      const aggExpr = `${w.aggregate}(${escapedY})`;
      if (escapedX) {
        sql = `SELECT \n  ${escapedX}, \n  ${aggExpr} AS "value" \nFROM ${escapedTable} \nGROUP BY ${escapedX} \nORDER BY ${escapedX} ASC \nLIMIT 100;`;
      } else {
        sql = `SELECT \n  ${aggExpr} AS "value" \nFROM ${escapedTable};`;
      }
    } else {
      // In strict mode, aggregate calculation must exist for drawing summaries
      if (escapedX) {
        sql = `SELECT \n  ${escapedX}, \n  ${escapedY} \nFROM ${escapedTable} \nLIMIT 100;`;
      } else {
        sql = `SELECT \n  ${escapedY} \nFROM ${escapedTable} \nLIMIT 100;`;
      }
    }
    return sql;
  };

  // Handles adding new widget or updating existing one inside custom list
  const addWidget = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate connection is open & schemas exist
    if (!schemaSynced || tables.length === 0) {
      setValidationError("Chưa đủ dữ liệu cấu hình. Vui lòng cấu hình thủ công bằng cách kết nối database.");
      return;
    }

    if (!newWidget.name.trim()) {
      setValidationError("Vui lòng nhập tên Widget.");
      return;
    }
    if (!newWidget.tableName) {
      setValidationError("Vui lòng chọn bảng dữ liệu.");
      return;
    }
    if (!newWidget.yAxisColumn) {
      setValidationError("Vui lòng chọn một cột giá trị.");
      return;
    }
    if (!newWidget.aggregate) {
      setValidationError("Vui lòng chọn hàm tổng hợp.");
      return;
    }

    const generatedWidgetSql = generateSql({
      name: newWidget.name,
      tableName: newWidget.tableName,
      xAxisColumn: newWidget.xAxisColumn,
      yAxisColumn: newWidget.yAxisColumn,
      aggregate: newWidget.aggregate,
      chartType: newWidget.chartType,
    });

    let targetWidget: WidgetConfig;
    let updatedWidgets: WidgetConfig[];

    if (editingWidgetId) {
      targetWidget = {
        id: editingWidgetId,
        name: newWidget.name,
        tableName: newWidget.tableName,
        columnName: newWidget.yAxisColumn,
        xAxisColumn: newWidget.xAxisColumn,
        aggregate: newWidget.aggregate as any,
        chartType: newWidget.chartType,
        colorPalette: newWidget.colorPalette,
        showGridLines: newWidget.showGridLines,
        showLabels: newWidget.showLabels,
        sql: generatedWidgetSql,
      };
      updatedWidgets = widgets.map(w => w.id === editingWidgetId ? targetWidget : w);
      setEditingWidgetId(null);
    } else {
      targetWidget = {
        id: `widget_${Date.now()}`,
        name: newWidget.name,
        tableName: newWidget.tableName,
        columnName: newWidget.yAxisColumn,
        xAxisColumn: newWidget.xAxisColumn,
        aggregate: newWidget.aggregate as any,
        chartType: newWidget.chartType,
        colorPalette: newWidget.colorPalette,
        showGridLines: newWidget.showGridLines,
        showLabels: newWidget.showLabels,
        sql: generatedWidgetSql,
      };
      updatedWidgets = [...widgets, targetWidget];
    }

    setWidgets(updatedWidgets);
    localStorage.setItem("widgets_config", JSON.stringify(updatedWidgets));

    // Clear form
    setNewWidget({
      name: "",
      tableName: "",
      xAxisColumn: "",
      yAxisColumn: "",
      aggregate: "",
      chartType: "bar",
      colorPalette: "blue",
      showGridLines: true,
      showLabels: false,
    });

    // Execute query for this design widget
    executeQueryForWidget(targetWidget);
  };

  const startEditWidget = (w: WidgetConfig) => {
    setEditingWidgetId(w.id);
    setNewWidget({
      name: w.name,
      tableName: w.tableName,
      xAxisColumn: w.xAxisColumn || "",
      yAxisColumn: w.columnName,
      aggregate: w.aggregate,
      chartType: w.chartType,
      colorPalette: w.colorPalette || "blue",
      showGridLines: w.showGridLines !== undefined ? w.showGridLines : true,
      showLabels: w.showLabels !== undefined ? w.showLabels : false,
    });
    setActiveTab("builder");
  };

  const cancelEditWidget = () => {
    setEditingWidgetId(null);
    setNewWidget({
      name: "",
      tableName: "",
      xAxisColumn: "",
      yAxisColumn: "",
      aggregate: "",
      chartType: "bar",
      colorPalette: "blue",
      showGridLines: true,
      showLabels: false,
    });
  };

  // Remove a widget
  const removeWidget = (id: string) => {
    const updated = widgets.filter(w => w.id !== id);
    setWidgets(updated);
    localStorage.setItem("widgets_config", JSON.stringify(updated));

    const updatedResults = { ...widgetResults };
    delete updatedResults[id];
    setWidgetResults(updatedResults);
  };

  // Execute database query for a specific widget
  const executeQueryForWidget = async (widget: WidgetConfig) => {
    try {
      setWidgetResults(prev => ({
        ...prev,
        [widget.id]: {
          widgetId: widget.id,
          status: "success",
          message: "Đang tải...",
        } as any
      }));

      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: widget.sql,
          widgetId: widget.id,
          config: dbConfig
        }),
      });

      const result: WidgetResult = await res.json();
      setWidgetResults(prev => ({
        ...prev,
        [widget.id]: result
      }));
    } catch (err: any) {
      setWidgetResults(prev => ({
        ...prev,
        [widget.id]: {
          widgetId: widget.id,
          status: "error",
          message: err.message || "Failed to execute database query"
        }
      }));
    }
  };

  // Refresh dynamic widget database results
  const refreshDashboardData = async () => {
    if (widgets.length === 0) return;
    setIsRefreshingData(true);

    try {
      // Execute all widgets queries concurrently
      await Promise.all(widgets.map(w => executeQueryForWidget(w)));
      fetchLogs();
    } catch (err) {
      console.error("Lỗi khi cập nhật dữ liệu:", err);
    } finally {
      setIsRefreshingData(false);
    }
  };

  // Filter columns belonging only to the selected design table
  const selectedTableColumns = columns.filter(col => col.tableName === newWidget.tableName);

  const theme = getThemeClasses(appTheme);

  return (
    <div id="main_container" className={`min-h-screen ${theme.bg} text-slate-900 font-sans flex flex-col antialiased transition-colors duration-200`}>
      {/* Upper Navigation Header */}
      <header id="site_header" className={`sticky top-0 z-50 ${theme.card} border-b px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <div className="text-white p-2.5 rounded-[4px]" style={{ backgroundColor: theme.accentColor }}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2" style={{ color: theme.textDark === "text-slate-100" ? "#fff" : "#0f172a" }}>
              KRF<span className="font-black" style={{ color: theme.accentColor }}>ENGINE</span>
              <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 font-mono font-bold px-2 py-0.5 rounded-[4px]">
                STRICT METADATA MODE
              </span>
            </h1>
            <p className={`text-[11px] mt-0.5 ${theme.textMute}`}>
              Cấu hình trực quan hóa bằng dữ liệu gốc từ database Postgres / MySQL. Không giả lập.
            </p>
          </div>
        </div>

        {/* Header Rightside controls integration (Themes + Connection stats) */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Mẫu giao diện (Themes) Selector */}
          <div className="flex items-center gap-2 border-r pr-4 border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase font-mono tracking-wider" style={{ color: theme.accentColor }}>Giao diện:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: "corporate", name: "Corporate Blue", color: "bg-blue-600" },
                { id: "emerald", name: "Emerald Sage", color: "bg-emerald-600" },
                { id: "sunburst", name: "Sunset Amber", color: "bg-orange-500" },
                { id: "cyber", name: "Cyber Slate", color: "bg-indigo-500" },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setAppTheme(t.id as any);
                    localStorage.setItem("app_theme", t.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] font-bold font-sans border transition-all cursor-pointer ${
                    appTheme === t.id 
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 font-extrabold text-slate-900 dark:text-white" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${t.color} shrink-0`}></span>
                  <span>{t.name.split(" ")[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] text-xs font-medium border ${theme.card}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connStatus?.success ? "bg-emerald-400" : "bg-red-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connStatus?.success ? "bg-emerald-500" : "bg-red-500"}`}></span>
              </span>
              <span className="font-mono text-[11px] font-semibold">
                {connStatus?.success 
                  ? `DB: ${connStatus.databaseType} (${connStatus.databaseName})` 
                  : "Chưa kết nối Database"}
              </span>
            </div>

            <button
              id="sync_schema_main_btn"
              disabled={!connStatus?.success || isSyncing}
              onClick={() => syncSchema()}
              className={`flex items-center gap-2 text-xs font-mono font-bold px-4 py-2 rounded-[4px] border transition ${
                connStatus?.success 
                  ? `${theme.card} hover:bg-slate-150 text-slate-800 pointer-events-auto cursor-pointer` 
                  : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 cursor-not-allowed"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              Đồng bộ Schema
            </button>
          </div>
        </div>
      </header>

      {/* Primary Layout Wrapper */}
      <div className="flex flex-1">
        {/* Navigation Rail */}
        <aside id="layout_rail" className={`w-64 ${theme.card} border-r p-6 flex flex-col gap-6 hidden md:flex transition-all duration-200`}>
          <div className="flex flex-col gap-1.5">
            <span className={`text-[10px] font-bold tracking-wider uppercase font-mono px-3 mb-1 ${theme.textMute}`}>
              Cấu hình & Tích hợp
            </span>
            <button
              id="nav_conn_btn"
              type="button"
              onClick={() => setActiveTab("connection")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-xs font-mono font-bold tracking-wide uppercase transition cursor-pointer border border-transparent ${
                activeTab === "connection" 
                  ? theme.railActive 
                  : "text-slate-600 dark:text-slate-350 hover:bg-slate-100/40 dark:hover:bg-slate-800"
              }`}
            >
              <Settings className="w-4 h-4" />
              Kết nối & Bảng dữ liệu
            </button>
            <button
              id="nav_builder_btn"
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-xs font-mono font-bold tracking-wide uppercase transition cursor-pointer border border-transparent ${
                activeTab === "builder" 
                  ? theme.railActive 
                  : "text-slate-600 dark:text-slate-350 hover:bg-slate-100/40 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              Thiết kế Widgets & SQL
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={`text-[10px] font-bold tracking-wider uppercase font-mono px-3 mb-1 ${theme.textMute}`}>
              Trực quan hóa
            </span>
            <button
              id="nav_dashboard_btn"
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-xs font-mono font-bold tracking-wide uppercase transition cursor-pointer border border-transparent ${
                activeTab === "dashboard" 
                  ? theme.railActive 
                  : "text-slate-600 dark:text-slate-350 hover:bg-slate-100/40 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Runtime
              {widgets.length > 0 && (
                <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] border border-slate-200 dark:border-slate-700">
                  {widgets.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={`text-[10px] font-bold tracking-wider uppercase font-mono px-3 mb-1 ${theme.textMute}`}>
              Hệ thống & Sự kiện
            </span>
            <button
              id="nav_logs_btn"
              type="button"
              onClick={() => {
                setActiveTab("logs");
                fetchLogs();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-xs font-mono font-bold tracking-wide uppercase transition cursor-pointer border border-transparent ${
                activeTab === "logs" 
                  ? theme.railActive 
                  : "text-slate-600 dark:text-slate-350 hover:bg-slate-100/40 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              Xem Logs Hệ Thống
            </button>
          </div>

          <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-2">
            <div className={`border rounded-[4px] p-3 animate-fade-in ${theme.card}`}>
              <span className={`text-[10px] font-mono font-bold tracking-wider block ${theme.textMute}`}>PHIÊN ĐĂNG NHẬP</span>
              <span className="text-xs font-mono font-semibold truncate block mt-1" title={currentUserEmail}>
                {currentUserEmail}
              </span>
            </div>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 text-center font-mono py-1">
              v1.0.0 (June 2026)
            </p>
          </div>
        </aside>

        {/* Mobile Navbar Tab-Bar */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-brand-dark text-white rounded-[4px] p-2 flex justify-between items-center shadow-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("connection")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase transition ${
              activeTab === "connection" ? "bg-brand-accent text-white" : "text-slate-400"
            }`}
          >
            <Settings className="w-4 h-4" />
            Kết nối
          </button>
          <button
            onClick={() => setActiveTab("builder")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase transition ${
              activeTab === "builder" ? "bg-brand-accent text-white" : "text-slate-400"
            }`}
          >
            <Layers className="w-4 h-4" />
            Cấu hình
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase transition ${
              activeTab === "dashboard" ? "bg-brand-accent text-white" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab("logs");
              fetchLogs();
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase transition ${
              activeTab === "logs" ? "bg-brand-accent text-white" : "text-slate-400"
            }`}
          >
            <FileText className="w-4 h-4" />
            Logs
          </button>
        </div>

        {/* Main Content Workspace Container */}
        <main id="workspace_viewport" className="flex-1 p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
          
          {/* TAB 1: CONNECTION CONFIGURATION */}
          {activeTab === "connection" && (
            <div className="flex flex-col gap-6 max-w-4xl">
              <section className="bg-white rounded-[4px] border border-brand-border overflow-hidden shadow-none">
                <div className="bg-brand-panel-header border-b border-brand-border px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-bold tracking-wider text-brand-mute uppercase">Thiết lập kết nối cơ sở dữ liệu thực tế</h2>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-[4px] border border-brand-border">
                    MANDATORY
                  </span>
                </div>

                <div className="p-6 flex flex-col gap-5">
                  {/* Validation checking list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_type" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Loại cơ sở dữ liệu</label>
                      <select
                        id="db_type"
                        name="type"
                        value={dbConfig.type}
                        onChange={handleDbValueChange}
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      >
                        <option value="postgres">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_host" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Máy chủ (Host)</label>
                      <input
                        id="db_host"
                        name="host"
                        type="text"
                        value={dbConfig.host}
                        onChange={handleDbValueChange}
                        placeholder="Ví dụ: db.myproject.supabase.co hoặc localhost"
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      />
                    </div>

                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_port" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Cổng kết nối (Port)</label>
                      <input
                        id="db_port"
                        name="port"
                        type="number"
                        value={dbConfig.port || ""}
                        onChange={handleDbValueChange}
                        placeholder={dbConfig.type === "postgres" ? "5432" : "3306"}
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      />
                    </div>

                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_name" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Tên Database (Database Name)</label>
                      <input
                        id="db_name"
                        name="database"
                        type="text"
                        value={dbConfig.database}
                        onChange={handleDbValueChange}
                        placeholder="Tên database của bạn"
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      />
                    </div>

                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_user" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Tên người dùng (Username)</label>
                      <input
                        id="db_user"
                        name="user"
                        type="text"
                        value={dbConfig.user}
                        onChange={handleDbValueChange}
                        placeholder="postgres / root"
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      />
                    </div>

                    <div className="flex flex-col gap-1.55">
                      <label htmlFor="db_password" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Mật khẩu (Password)</label>
                      <input
                        id="db_password"
                        name="password"
                        type="password"
                        value={dbConfig.password}
                        onChange={handleDbValueChange}
                        placeholder="••••••••••••"
                        className="bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-100 pt-5">
                    <p className="text-[11px] text-brand-mute max-w-md">
                      ⚠️ Kết nối thực hiện từ máy chủ backend qua giao thức mạng. Vui lòng cấp quyền truy cập IP hoặc mở tường lửa nếu cần thiết.
                    </p>
                    <div className="flex gap-3">
                      <button
                        id="check_connection_action_btn"
                        type="button"
                        onClick={checkConnection}
                        disabled={isConnecting}
                        className="bg-brand-accent hover:bg-brand-accent-hover font-mono font-bold text-white px-5 py-2.5 rounded-[4px] text-xs flex items-center gap-2 transition cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Đang kết nối...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Kiểm tra kết nối
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Status and privileges results visualization */}
              {connStatus && (
                <section className={`rounded-[4px] border p-5 flex flex-col gap-4 ${
                  connStatus.success ? "bg-emerald-50/50 border-emerald-300" : "bg-red-50/50 border-red-300"
                }`}>
                  <div className="flex items-start gap-3">
                    {connStatus.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-xs font-bold tracking-wider uppercase font-mono ${connStatus.success ? "text-emerald-900" : "text-red-900"}`}>
                        {connStatus.success ? "CONNECT SECURED" : "CONNECT FAILED"}
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${connStatus.success ? "text-emerald-800 font-mono" : "text-red-800"}`}>
                        {connStatus.message}
                      </p>
                    </div>
                  </div>

                  {connStatus.success && (
                    <div className="bg-white border border-emerald-200 rounded-[4px] p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-brand-mute font-mono block">CƠ SỞ DỮ LIỆU</span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{connStatus.databaseType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-mute font-mono block">DATABASE NAME</span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{connStatus.databaseName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-mute font-mono block">CURRENT USER</span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{connStatus.currentUser}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-mute font-mono block">TỔNG BẢNG (PUBLIC)</span>
                        <span className="text-xs font-bold text-slate-900 font-mono">{connStatus.totalTables}</span>
                      </div>
                      <div className="col-span-2 md:col-span-4 border-t border-slate-100 pt-3 mt-1">
                        <span className="text-[10px] text-brand-mute font-mono block">DATABASE VERSION</span>
                        <span className="text-[11px] font-semibold text-slate-700 font-mono truncate block" title={connStatus.version}>
                          {connStatus.version}
                        </span>
                      </div>
                    </div>
                  )}

                  {!connStatus.success && (
                    <div className="flex flex-col gap-4 mt-1">
                      {connStatus.errorCode && (
                        <div className="bg-white border border-red-200 rounded-[4px] p-4 flex flex-col gap-1">
                          <span className="text-[10px] text-red-600 font-bold font-mono block tracking-wider uppercase">MÃ LỖI (ERROR CODE)</span>
                          <span className="text-xs font-bold text-red-910 font-mono">{connStatus.errorCode}</span>
                        </div>
                      )}

                      <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-amber-800">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <h4 className="text-xs font-bold font-mono uppercase tracking-wider">HƯỚNG DẪN KHẮC PHỤC LỖI KẾT NỐI (TIMEOUT / ACCESS DENIED)</h4>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          Hiện tại Google Cloud SQL đang chặn kết nối đến từ ứng dụng này. Vì các yêu cầu truy vấn được xử lý từ phía <strong>Backend Server (Cloud Run)</strong> của Dashboard thay vì trình duyệt của bạn, bạn cần thêm địa chỉ IP này vào danh sách cho phép truy cập:
                        </p>
                        
                        <div className="bg-white border border-amber-200 rounded-[4px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                          <div>
                            <span className="text-[10px] text-brand-mute block font-bold">IP OUTGOING CỦA APP SERVER (CLOUDRUN)</span>
                            <span className="text-sm font-bold text-slate-800 select-all">{serverIp || "(Đang truy vấn IP của server...)"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (serverIp) {
                                navigator.clipboard.writeText(serverIp);
                                alert("Đã sao chép IP Server vào clipboard: " + serverIp);
                              }
                            }}
                            disabled={!serverIp}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold px-3 py-1.5 rounded-[4px] text-[11px] font-mono transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed border border-amber-200"
                          >
                            Sao chép IP
                          </button>
                        </div>

                        <div className="text-xs text-amber-900 flex flex-col gap-2 mt-1">
                          <span className="font-bold">Các bước cấu hình trên Google Cloud Console:</span>
                          <ul className="list-decimal list-inside space-y-1.5 leading-relaxed pl-1 text-[11px]">
                            <li>Mở trang quản trị thực thể Cloud SQL <strong>{dbConfig.database || "krf2026"}</strong> của bạn trên Google Cloud Console.</li>
                            <li>Chọn mục <strong>Connections</strong> từ thanh menu bên trái, và chọn tiếp tab <strong>Networking</strong>.</li>
                            <li>Cuộn xuống mục <strong>Security / Authorized networks</strong> (Mạng được ủy quyền).</li>
                            <li>Bấm <strong>Add network</strong>, đặt tên (ví dụ: <code>Dashboard App</code>).</li>
                            <li>Nhập địa chỉ IP hiển thị phía trên: <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">{serverIp || "IP_HIỂN_THỊ_BÊN_TRÊN"}</code> rồi nhấn <strong>Done</strong>.</li>
                            <li>Nhấn nút <strong>Save</strong> ở cuối trang để lưu lại cài đặt.</li>
                            <li>Quay lại giao diện này và bấm <strong>Kiểm tra kết nối</strong> để hoàn tất đồng bộ hóa Schema.</li>
                          </ul>
                          <p className="text-[10px] text-amber-800 italic mt-1 leading-relaxed">
                            💡 Mẹo nhanh: Bạn có thể nhập <code>0.0.0.0/0</code> làm IP ủy quyền tạm thời để kiểm thử nhanh xem cổng kết nối có thông hay không, sau đó thu hẹp cấu hình khi hoạt động chính thức để bảo mật.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Schema explorer database info panels */}
              {schemaSynced && (
                <section className="bg-white rounded-[4px] border border-brand-border overflow-hidden shadow-none flex flex-col">
                  <div className="bg-brand-panel-header border-b border-brand-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-slate-700" />
                      <h3 className="text-xs font-bold tracking-wider text-brand-mute uppercase">Chi tiết Schema đồng bộ trực tiếp</h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 border border-brand-border px-2 py-0.5 rounded-[4px]">
                      {tables.length} tables, {columns.length} columns
                    </span>
                  </div>

                  <div className="p-6 flex flex-col gap-6">
                    {tables.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-slate-600 text-sm font-semibold">Chưa tìm thấy bảng dữ liệu nào ở public schema.</p>
                        <p className="text-xs text-slate-400">Vui lòng tạo bảng trên DB trước khi đồng bộ.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tables.map(tbl => {
                           const tblCols = columns.filter(col => col.tableName === tbl.tableName);
                           return (
                            <div key={tbl.tableName} className="border border-brand-border rounded-[4px] p-4 flex flex-col bg-slate-50/50">
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-brand-border w-full pb-2">
                                <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                                <span className="font-mono text-xs">{tbl.tableName}</span>
                                <span className="text-[10px] ml-auto font-mono bg-white text-slate-600 border border-brand-border px-1.5 py-0.5 rounded-[4px]">
                                  {tblCols.length} COLUMNS
                                </span>
                              </h4>

                              <div className="flex flex-col gap-1.5 mt-3">
                                {tblCols.map(col => (
                                  <div key={`${col.tableName}_${col.columnName}`} className="flex items-center justify-between text-xs py-0.5">
                                    <div className="flex items-center gap-1.5 font-mono">
                                      <span className={`${col.isPrimaryKey ? "text-brand-accent font-bold" : "text-slate-700"}`}>
                                        {col.columnName}
                                      </span>
                                      {col.isPrimaryKey && <span className="text-[10px]" title="Primary Key">🔑</span>}
                                      {col.isForeignKey && <span className="text-[10px]" title={`Foreign Key references ${col.foreignTable}.${col.foreignColumn}`}>🔗</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-mono">
                                      <span>{col.dataType}</span>
                                      <span className="bg-white border border-brand-border text-slate-400 px-1 rounded-[4px]">
                                        {col.isNullable ? "null" : "not null"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 2: WIDGET DESIGNER & SQL */}
          {activeTab === "builder" && (
            <div className="flex flex-col gap-6 max-w-5xl">
              
              {/* Checking connection requirement warning */}
              {!schemaSynced || tables.length === 0 ? (
                <div className="bg-white border border-brand-border rounded-[4px] p-8 text-center max-w-2xl mx-auto flex flex-col items-center gap-4">
                  <div className="bg-slate-50 text-brand-accent p-4 rounded-[4px] border border-brand-border">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-brand-dark uppercase font-mono">Chưa đủ dữ liệu cấu hình. Vui lòng cấu hình thủ công.</h3>
                    <p className="text-xs text-brand-mute mt-1.5 max-w-md leading-relaxed">
                      Hệ thống hoạt động ở chế độ <strong className="font-mono text-brand-dark">STRICT METADATA MODE</strong>. 
                      Vui lòng quay lại tab <strong>Kết nối & Bảng dữ liệu</strong>, điền thông tin máy chủ thật và kiểm tra kết nối để đồng bộ Schema.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("connection")}
                    className="bg-brand-accent hover:bg-brand-accent-hover text-white font-mono font-bold px-5 py-2.5 rounded-[4px] text-xs transition cursor-pointer"
                  >
                    Đi tới bước Cấu hình Kết nối &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Design configuration block */}
                  <div className="lg:col-span-5 bg-white border border-brand-border rounded-[4px] shadow-none overflow-hidden h-fit">
                    <div className="bg-brand-panel-header border-b border-brand-border px-4 py-3 flex items-center justify-between">
                      <h3 className="text-xs font-bold tracking-wider text-brand-mute uppercase">
                        {editingWidgetId ? "Hiệu chỉnh thuộc tính Widget" : "Thiết kế Widget Đo lường mới"}
                      </h3>
                      {editingWidgetId && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold px-2 py-0.5 rounded-[4px]">
                          Đang sửa
                        </span>
                      )}
                    </div>

                    <form onSubmit={addWidget} className="p-6 flex flex-col gap-4">
                      {/* Name input */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_name" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Tên Widget (Nhãn hiển thị)</label>
                        <input
                          id="widget_name"
                          type="text"
                          value={newWidget.name}
                          onChange={(e) => setNewWidget(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ví dụ: Tổng doanh thu, Thống kê đơn hàng"
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                        />
                      </div>

                      {/* Select target Table */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_table" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Bảng dữ liệu gán (Table)</label>
                        <select
                          id="widget_table"
                          value={newWidget.tableName}
                          onChange={(e) => setNewWidget(prev => ({ 
                            ...prev, 
                            tableName: e.target.value,
                            xAxisColumn: "", // Reset columns selection block
                            yAxisColumn: ""
                          }))}
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                        >
                          <option value="">-- Chọn bảng từ schema đã đồng bộ --</option>
                          {tables.map(tbl => (
                            <option key={tbl.tableName} value={tbl.tableName}>{tbl.tableName}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select X Axis representation group column (Optional) */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_xaxis" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">
                          Cột phân loại / Nhóm (Group By) <span className="text-slate-400 font-normal font-sans">(Tùy chọn)</span>
                        </label>
                        <select
                          id="widget_xaxis"
                          disabled={!newWidget.tableName}
                          value={newWidget.xAxisColumn}
                          onChange={(e) => setNewWidget(prev => ({ ...prev, xAxisColumn: e.target.value }))}
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Không phân nhóm (KPI Trực tiếp) --</option>
                          {selectedTableColumns.map(col => (
                            <option key={col.columnName} value={col.columnName}>{col.columnName} ({col.dataType})</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-brand-mute">Chọn nếu muốn vẽ biểu đồ phân loại theo danh mục, ngày tháng.</p>
                      </div>

                      {/* Select Target Measure / Value Column */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_yaxis" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Cột giá trị tính toán (Measure)</label>
                        <select
                          id="widget_yaxis"
                          disabled={!newWidget.tableName}
                          value={newWidget.yAxisColumn}
                          onChange={(e) => setNewWidget(prev => ({ ...prev, yAxisColumn: e.target.value }))}
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Chọn cột chỉ số --</option>
                          {selectedTableColumns.map(col => (
                            <option key={col.columnName} value={col.columnName}>{col.columnName} ({col.dataType})</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Aggregate calculations constraint */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_aggregate" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">
                          Hàm tổng hợp (Aggregate Function) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                          id="widget_aggregate"
                          value={newWidget.aggregate}
                          onChange={(e) => setNewWidget(prev => ({ ...prev, aggregate: e.target.value as any }))}
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                        >
                          <option value="">-- Bắt buộc chọn KPI --</option>
                          <option value="SUM">SUM (Tính tổng giá trị)</option>
                          <option value="AVG">AVG (Trung bình cộng)</option>
                          <option value="COUNT">COUNT (Đếm số lượng bản ghi)</option>
                          <option value="MIN">MIN (Giá trị nhỏ nhất)</option>
                          <option value="MAX">MAX (Giá trị lớn nhất)</option>
                          <option value="NONE">NONE (Hiển thị dữ liệu thô giới hạn 100 bản ghi)</option>
                        </select>
                        <p className="text-[10px] text-brand-mute">
                          Trong Strict mode, hệ thống tuyệt đối không tự ý giả định SUM hay COUNT. Phải cấu hình tường minh.
                        </p>
                      </div>

                      {/* Select Visual Graphic Type */}
                      <div className="flex flex-col gap-1.55">
                        <label htmlFor="widget_chart" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Loại hiển thị (Chart Type)</label>
                        <select
                          id="widget_chart"
                          value={newWidget.chartType}
                          onChange={(e) => setNewWidget(prev => ({ ...prev, chartType: e.target.value as any }))}
                          className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                        >
                          <option value="bar">Biểu đồ Cột (Bar Chart)</option>
                          <option value="line">Biểu đồ Đường (Line Chart)</option>
                          <option value="table">Bảng dữ liệu chi tiết (Table)</option>
                          <option value="kpi">Thẻ số đơn lẻ (KPI Dashboard Card)</option>
                        </select>
                      </div>

                      {/* Formatting pane & advanced visual themes (Power BI design panels) */}
                      <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.55">
                          <label htmlFor="widget_palette" className="text-[10px] font-bold tracking-wider text-brand-mute uppercase">Bảng màu hiển thị (Power BI Theme)</label>
                          <select
                            id="widget_palette"
                            value={newWidget.colorPalette}
                            onChange={(e) => setNewWidget(prev => ({ ...prev, colorPalette: e.target.value as any }))}
                            className="w-full bg-slate-50 border border-brand-border rounded-[4px] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent transition-all"
                          >
                            <option value="blue">Xanh lục cổ điển (Classic Business Blue)</option>
                            <option value="emerald">Trúc diệp lục (Emerald Garden Mint)</option>
                            <option value="orange">San hô ấm áp (Warm Sunburst Coral)</option>
                            <option value="purple">Huyền ảo tím (Tech Royal Amethyst)</option>
                            <option value="rose">Hồng lựu quân tử (Vibrant Rose Quartz)</option>
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 py-1">
                          <label className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newWidget.showGridLines}
                              onChange={(e) => setNewWidget(prev => ({ ...prev, showGridLines: e.target.checked }))}
                              className="rounded border-slate-300 text-brand-accent focus:ring-brand-accent h-4 w-4"
                            />
                            Hiện đường lưới (Grid)
                          </label>

                          <label className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newWidget.showLabels}
                              onChange={(e) => setNewWidget(prev => ({ ...prev, showLabels: e.target.checked }))}
                              className="rounded border-slate-300 text-brand-accent focus:ring-brand-accent h-4 w-4"
                            />
                            Hiện số liệu (Labels)
                          </label>
                        </div>
                      </div>

                      {validationError && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-[4px] flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="font-mono">{validationError}</span>
                        </div>
                      )}

                      {editingWidgetId ? (
                        <div className="grid grid-cols-2 gap-3 mt-2 pr-0.5">
                          <button
                            id="add_widget_action_btn"
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 font-mono font-bold text-white py-2.5 px-4 rounded-[4px] text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-none"
                          >
                            <Check className="w-4 h-4" />
                            Cập nhật widget
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditWidget}
                            className="bg-slate-100 hover:bg-slate-150 font-mono font-bold text-slate-700 py-2.5 px-4 rounded-[4px] text-xs flex items-center justify-center gap-1.5 cursor-pointer transition border border-slate-200"
                          >
                            <X className="w-4 h-4" />
                            Hủy sửa
                          </button>
                        </div>
                      ) : (
                        <button
                          id="add_widget_action_btn"
                          type="submit"
                          style={{ backgroundColor: theme.accentColor }}
                          className="hover:opacity-90 font-mono font-bold text-white py-2.5 px-4 rounded-[4px] text-xs mt-3 flex items-center justify-center gap-2 cursor-pointer transition shadow-none"
                        >
                          <Plus className="w-4 h-4" />
                          Từng bước Khởi tạo Widget & Sinh SQL
                        </button>
                      )}
                    </form>
                  </div>

                  {/* SQL preview auto generator */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="bg-white border border-brand-border rounded-[4px] shadow-none overflow-hidden flex-1 flex flex-col min-h-[350px]">
                      <div className="bg-brand-panel-header border-b border-brand-border px-4 py-3 flex items-center justify-between">
                        <h4 className="text-xs font-bold tracking-wider text-brand-mute uppercase flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-brand-accent" />
                          Truy vấn SQL Tự động sinh (Xem trước)
                        </h4>
                        <span className="text-[10px] bg-slate-100 text-brand-dark font-mono font-bold px-2 py-0.5 rounded-[4px] border border-brand-border">
                          GENERATED SQL
                        </span>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                        {newWidget.tableName ? (
                          <div className="flex-1 flex flex-col gap-3">
                            <div className="bg-brand-code-bg text-slate-200 font-mono text-xs rounded-[4px] p-5 border border-slate-800 whitespace-pre-wrap flex-1 select-all overflow-auto leading-relaxed">
                              {generateSql(newWidget)}
                            </div>
                            <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 border border-brand-border p-3 rounded-[4px] leading-relaxed">
                              <Info className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                              <p>
                                SQL này được biên soạn tường minh từ Schema & cấu hình người dùng cung cấp. Người dùng có thể sao chép để chạy bên ngoài nhưng không chỉnh sửa trong chương trình cấu hình.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <Code2 className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-mute font-mono">CHỌN SCHEMA & CẤU HÌNH</p>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">Cấu trúc SQL tự động sinh tuân định dạng chuẩn xác của PostgreSQL / MySQL.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active widget config manager */}
                    <div className="bg-white border border-brand-border rounded-[4px] shadow-none p-5">
                      <h4 className="text-xs font-bold tracking-wider text-brand-mute uppercase border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                        Thiết kế cấu hình danh sách Widgets hiện tại ({widgets.length})
                      </h4>
                      {widgets.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 font-mono font-medium">Chưa có Widget nào được khởi tạo.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {widgets.map(w => (
                            <div key={w.id} className="border border-brand-border rounded-[4px] p-3 bg-slate-50/50 flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <span className="text-xs font-bold text-slate-900 block">{w.name}</span>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <span className="text-[10px] font-mono bg-white text-slate-700 px-1.5 py-0.5 rounded-[4px] border border-brand-border">
                                    Table: {w.tableName}
                                  </span>
                                  <span className="text-[10px] font-mono bg-blue-50 text-brand-accent px-1.5 py-0.5 rounded-[4px] border border-blue-100">
                                    Measure: {w.columnName} ({w.aggregate})
                                  </span>
                                  <span className="text-[10px] font-mono bg-white text-slate-700 px-1.5 py-0.5 rounded-[4px] border border-brand-border">
                                    Type: {w.chartType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditWidget(w)}
                                  className={`p-2 rounded-[4px] border transition ${
                                    editingWidgetId === w.id 
                                      ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-brand-border"
                                  }`}
                                  title="Chỉnh sửa cấu hình Widget"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => executeQueryForWidget(w)}
                                  className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-[4px] transition border border-transparent hover:border-brand-border"
                                  title="Thử truy vấn kiểm nghiệm"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeWidget(w.id)}
                                  className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-[4px] transition border border-transparent hover:border-red-200"
                                  title="Xóa widget"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DASHBOARD RUNTIME WORKSPACE */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              
              {/* Header runtime controls */}
              <div className="flex items-center justify-between border-b border-brand-border pb-5 gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-bold tracking-wider text-brand-dark uppercase font-mono">Bảng điều hướng trực quan Dashboard</h2>
                  <p className="text-xs text-brand-mute mt-1.5">
                    Truy vấn động thời gian thực đến PostgreSQL/MySQL. Không sử dụng dữ liệu định sẵn hay cached.
                  </p>
                </div>

                <button
                  id="refresh_data_action_btn"
                  disabled={widgets.length === 0 || isRefreshingData}
                  onClick={refreshDashboardData}
                  className={`flex items-center gap-2 font-mono font-bold px-5 py-2.5 rounded-[4px] border text-xs transition ${
                    widgets.length > 0 
                      ? "bg-brand-accent hover:bg-brand-accent-hover text-white border-brand-accent cursor-pointer" 
                      : "bg-slate-50 text-slate-400 border-brand-border cursor-not-allowed"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingData ? "animate-spin" : ""}`} />
                  Làm mới dữ liệu (Live query)
                </button>
              </div>

              {/* No widgets added validation display checking */}
              {widgets.length === 0 ? (
                <div className="bg-white border border-brand-border rounded-[4px] p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4 shadow-none">
                  <LayoutDashboard className="w-12 h-12 text-slate-300 stroke-1" />
                  <div>
                    <h4 className="text-xs font-bold tracking-wider text-brand-dark uppercase font-mono">Không có dữ liệu để hiển thị.</h4>
                    <p className="text-xs text-brand-mute mt-2 leading-relaxed">
                      Chưa cấu hình bất kỳ Widget nào. Vui lòng thiết lập kết nối cơ sở dữ liệu và thêm Widgets trong mục thiết kế.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("builder")}
                    className="bg-brand-accent hover:bg-brand-accent-hover font-mono font-bold text-white px-5 py-2.5 rounded-[4px] text-xs transition cursor-pointer"
                  >
                    Đi tới bước Thiết kế Widget &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                  {widgets.map(w => {
                    const result = widgetResults[w.id];

                    return (
                      <div key={w.id} className="lg:col-span-6 bg-white border border-brand-border rounded-[4px] overflow-hidden shadow-none flex flex-col min-h-[420px]">
                        {/* Widget title & header block */}
                        <div className="bg-brand-panel-header border-b border-brand-border p-4 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{w.name}</span>
                            <span className="text-[10px] text-brand-mute font-mono uppercase font-semibold block mt-0.5">
                              Bảng: {w.tableName} | Nhóm: {w.xAxisColumn || "Không"}
                            </span>
                          </div>
                          
                          {/* Execution stats */}
                          {result?.status === "success" && (
                            <div className="text-right text-[10px] font-mono text-brand-mute">
                              <span className="block font-bold">{result.recordCount} RECORDS</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">{result.executionTimeMs}ms execution</span>
                            </div>
                          )}
                        </div>

                        {/* Widget content client area */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                          {/* Runtime error visualization */}
                          {result?.status === "error" && (
                            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-red-50/50 border border-red-200 rounded-[4px] p-4">
                              <XCircle className="w-8 h-8 text-red-500 mb-2" />
                              <span className="text-xs font-bold text-red-900 block font-mono uppercase tracking-wider">Lỗi thực thi SQL</span>
                              <p className="text-[11px] text-red-700 mt-1 max-w-sm whitespace-pre-wrap font-mono leading-relaxed bg-white border border-red-100 p-2.5 rounded-[4px]">
                                {result.message}
                              </p>
                            </div>
                          )}

                          {/* Loading Status */}
                          {result?.message === "Đang tải..." && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400">
                              <RefreshCw className="w-10 h-10 animate-spin mb-2" style={{ color: theme.accentColor }} />
                              <span className="text-xs font-semibold font-mono">Đang truy cập database thực tế...</span>
                            </div>
                          )}

                          {/* Zero elements check */}
                          {result?.status === "success" && (!result.data || result.data.length === 0) && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400">
                              <AlertTriangle className="w-10 h-10 mb-2" style={{ color: theme.accentColor }} />
                              <span className="text-xs font-bold tracking-wider uppercase font-mono">Không có dữ liệu</span>
                              <p className="text-[10px] text-slate-400 mt-1 font-mono">Bảng dữ liệu trả về rỗng từ phép quy nạp SQL.</p>
                            </div>
                          )}

                          {/* Render Charts correctly with real database results */}
                          {result?.status === "success" && result.data && result.data.length > 0 && (
                            <div className="flex-1 min-h-[220px] flex flex-col justify-center">
                              {/* 1. Bar Chart */}
                              {w.chartType === "bar" && (
                                <ResponsiveContainer width="100%" height={220}>
                                  <BarChart data={result.data} margin={{ top: w.showLabels ? 25 : 10, right: 10, left: -20, bottom: 0 }}>
                                    {w.showGridLines !== false && (
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    )}
                                    <XAxis dataKey={w.xAxisColumn || Object.keys(result.data[0])[0]} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} stroke="#64748B" />
                                    <YAxis tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} stroke="#64748B" />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, fontFamily: "var(--font-sans)", border: "1px solid var(--color-brand-border)" }} />
                                    <Bar dataKey="value" fill={w.colorPalette ? (w.colorPalette === "emerald" ? "#059669" : w.colorPalette === "orange" ? "#ea580c" : w.colorPalette === "purple" ? "#7c3aed" : w.colorPalette === "rose" ? "#db2777" : theme.accentColor) : theme.accentColor} radius={[2, 2, 0, 0]}>
                                      {w.showLabels && (
                                        <LabelList dataKey="value" position="top" style={{ fill: "#475569", fontSize: 9, fontWeight: "bold" }} />
                                      )}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}

                              {/* 2. Line Chart */}
                              {w.chartType === "line" && (
                                <ResponsiveContainer width="100%" height={220}>
                                  <LineChart data={result.data} margin={{ top: w.showLabels ? 20 : 10, right: 10, left: -20, bottom: 0 }}>
                                    {w.showGridLines !== false && (
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    )}
                                    <XAxis dataKey={w.xAxisColumn || Object.keys(result.data[0])[0]} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} stroke="#64748B" />
                                    <YAxis tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} stroke="#64748B" />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, fontFamily: "var(--font-sans)", border: "1px solid var(--color-brand-border)" }} />
                                    <Line type="monotone" dataKey="value" stroke={w.colorPalette ? (w.colorPalette === "emerald" ? "#059669" : w.colorPalette === "orange" ? "#ea580c" : w.colorPalette === "purple" ? "#7c3aed" : w.colorPalette === "rose" ? "#db2777" : theme.accentColor) : theme.accentColor} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
                                      {w.showLabels && (
                                        <LabelList dataKey="value" position="top" style={{ fill: "#475569", fontSize: 9, fontWeight: "bold" }} />
                                      )}
                                    </Line>
                                  </LineChart>
                                </ResponsiveContainer>
                              )}

                              {/* 3. KPI Display Single value representation */}
                              {w.chartType === "kpi" && (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                  <span className="text-[10px] font-bold text-brand-mute font-mono tracking-wider uppercase block">
                                    KPI MEASURED ({w.aggregate})
                                  </span>
                                  <h3 className="text-4xl font-black tracking-tight mt-2 font-mono" style={{ color: w.colorPalette ? (w.colorPalette === "emerald" ? "#059669" : w.colorPalette === "orange" ? "#ea580c" : w.colorPalette === "purple" ? "#7c3aed" : w.colorPalette === "rose" ? "#db2777" : theme.accentColor) : theme.accentColor }}>
                                    {String(result.data[0]?.value ?? result.data[0]?.[Object.keys(result.data[0])[0]] ?? "N/A")}
                                  </h3>
                                  <div className="mt-4 flex items-center gap-15 text-[10px] font-mono bg-slate-50 text-brand-mute px-3 py-1 rounded-[4px] border border-brand-border">
                                    <span>Field: {w.columnName}</span>
                                  </div>
                                </div>
                              )}

                              {/* 4. Table Representation */}
                              {w.chartType === "table" && (
                                <div className="flex-1 overflow-auto border border-brand-border rounded-[4px] max-h-[220px]">
                                  <table className="min-w-full divide-y divide-brand-border text-left text-xs bg-white font-mono">
                                    <thead className="bg-slate-50 font-bold text-slate-700">
                                      <tr>
                                        {Object.keys(result.data[0]).map(key => (
                                          <th key={key} className="px-4 py-2 font-bold text-brand-mute text-[10px] tracking-wider uppercase border-b border-brand-border">{key}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {result.data.slice(0, 10).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition">
                                          {Object.values(row).map((val: any, k) => (
                                            <td key={k} className="px-4 py-2 text-slate-600 text-[11px]">{String(val)}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SYSTEM LOGS AUDIT */}
          {activeTab === "logs" && (
            <div className="flex flex-col gap-6 max-w-4xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-brand-dark uppercase font-mono">Nhật ký Hệ thống (Real-time logs)</h3>
                  <p className="text-xs text-brand-mute mt-1.5">Ghi lại toàn bộ hành trình truy cập database, biên dịch schema và kết quả thực thi SQL.</p>
                </div>
                <button
                  id="refresh_logs_btn"
                  onClick={fetchLogs}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-brand-border font-mono font-bold px-4 py-2 rounded-[4px] text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Làm mới
                </button>
              </div>

              <div className="bg-white border border-brand-border rounded-[4px] overflow-hidden shadow-none">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brand-border text-left text-xs bg-white font-mono">
                    <thead className="bg-slate-50 text-brand-mute font-bold uppercase tracking-wider text-[10px] border-b border-brand-border">
                      <tr>
                        <th className="px-6 py-3.5 font-bold">Thời gian</th>
                        <th className="px-6 py-3.5 font-bold">Người thực hiện</th>
                        <th className="px-6 py-3.5 font-bold">Hành động</th>
                        <th className="px-6 py-3.5 font-bold">Kết quả</th>
                        <th className="px-6 py-3.5 font-bold">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans text-xs">
                            Không có nhật ký hệ thống khả dụng.
                          </td>
                        </tr>
                      ) : (
                        systemLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-3 text-slate-500 font-medium text-[11px] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-6 py-3 text-slate-700 font-medium whitespace-nowrap font-sans">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {log.user}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                              {log.action}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-[11px]">
                              <span className={`px-2 py-0.5 rounded-[4px] border font-bold ${
                                log.result === "Thành công" 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                  : "bg-red-50 text-red-800 border-red-200"
                              }`}>
                                {log.result}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-[11px] max-w-sm truncate" title={log.detail}>
                              {log.detail || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
