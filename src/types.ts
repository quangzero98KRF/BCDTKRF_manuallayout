export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  type?: 'postgres' | 'mysql';
}

export interface ConnectionStatus {
  success: boolean;
  databaseType?: string;
  databaseName?: string;
  version?: string;
  currentUser?: string;
  totalTables?: number;
  message: string;
  errorCode?: string;
}

export interface TableMetadata {
  tableName: string;
}

export interface ColumnMetadata {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignTable?: string;
  foreignColumn?: string;
}

export interface SchemaSyncResult {
  tables: TableMetadata[];
  columns: ColumnMetadata[];
}

export interface WidgetConfig {
  id: string;
  name: string;
  tableName: string;
  columnName: string;
  xAxisColumn: string;
  aggregate: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE';
  chartType: 'bar' | 'line' | 'table' | 'kpi';
  sql: string;
  colorPalette?: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose';
  showGridLines?: boolean;
  showLabels?: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  result: string;
  detail?: string;
}

export interface WidgetResult {
  widgetId: string;
  status: 'success' | 'error';
  recordCount?: number;
  executionTimeMs?: number;
  data?: any[];
  message?: string;
  sql?: string;
}
