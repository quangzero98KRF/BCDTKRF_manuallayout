import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import mysql from "mysql2/promise";
import net from "net";
import https from "https";
import { DatabaseConfig, ConnectionStatus, SchemaSyncResult, SystemLog, WidgetResult } from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/api/ping", (req, res) => {
  res.json({
    success: true,
    server: "running",
    time: new Date().toISOString()
  });
});

app.get("/api/server-ip", (req, res) => {
  https.get("https://api.ipify.org?format=json", (response) => {
    let data = "";
    response.on("data", (chunk) => {
      data += chunk;
    });
    response.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.json({ success: true, ip: parsed.ip });
      } catch (e) {
        res.json({ success: true, ip: data.trim() });
      }
    });
  }).on("error", (err) => {
    // If ipify fails, try ifconfig.me as fallback
    https.get("https://ifconfig.me/ip", (resp) => {
      let extIp = "";
      resp.on("data", (c) => { extIp += c; });
      resp.on("end", () => {
        res.json({ success: true, ip: extIp.trim() });
      });
    }).on("error", (fallbackErr) => {
      res.json({ success: false, error: err.message, fallbackError: fallbackErr.message });
    });
  });
});

app.get("/api/test-db-port", (req, res) => {
  const socket = new net.Socket();

  socket.setTimeout(10000);

  socket.connect(5432, "34.143.138.57", () => {
    res.json({
      success: true,
      message: "PostgreSQL port reachable"
    });

    socket.destroy();
  });

  socket.on("timeout", () => {
    res.json({
      success: false,
      error: "timeout"
    });

    socket.destroy();
  });

  socket.on("error", (err) => {
    res.json({
      success: false,
      error: err.message
    });
  });
});

// In-memory state for active database configuration and logs
let currentConfig: DatabaseConfig | null = null;
const systemLogs: SystemLog[] = [];

function addLog(user: string, action: string, result: string, detail?: string) {
  const log: SystemLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    user: user || "quangzero98@gmail.com",
    action,
    result,
    detail
  };
  systemLogs.unshift(log);
}

// 1. Connection status and verification
app.post("/api/connect", async (req, res) => {
  console.log("========== CONNECT ==========");
  console.log(new Date().toISOString());
  console.log(req.body);
  const config: DatabaseConfig = req.body;
  const user = "quangzero98@gmail.com"; // Current user email

  // Host Port Database Name username password fields checking
  if (!config.host) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu Host.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu Host." });
  }
  if (!config.port) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu Port.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu Port." });
  }
  if (!config.database) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu Database Name.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu Database Name." });
  }
  if (!config.user) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu Username.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu Username." });
  }
  if (config.password === undefined || config.password === null) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu Password.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu Password." });
  }
  if (!config.type) {
    addLog(user, "Kiểm tra kết nối", "Thất bại", "Thiếu loại Database.");
    return res.json({ success: false, errorCode: "DB_CONN_FAIL", message: "Thiếu loại Database." });
  }

  const startTime = Date.now();

  if (config.type === "postgres") {
    const client = new pg.Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();

      // Check access rights and version
      const authQuery = await client.query(`
        SELECT 
          current_database() as db, 
          current_user as usr, 
          version() as ver;
      `);

      // Count table size
      const tablesQuery = await client.query(`
        SELECT COUNT(table_name)::int as total
        FROM information_schema.tables 
        WHERE table_schema='public';
      `);

      const dbName = authQuery.rows[0].db;
      const dbUser = authQuery.rows[0].usr;
      const dbVersionStr = authQuery.rows[0].ver;
      const totalTables = tablesQuery.rows[0].total;

      await client.end();

      currentConfig = config;
      addLog(user, "Kiểm tra kết nối", "Thành công", `Đã kết nối PostgreSQL: ${dbName} | User: ${dbUser}`);

      return res.json({
        success: true,
        databaseType: "PostgreSQL",
        databaseName: dbName,
        version: dbVersionStr,
        currentUser: dbUser,
        totalTables: totalTables,
        message: "Kết nối thành công"
      });

    } catch (err: any) {
      addLog(user, "Kiểm tra kết nối", "Thất bại", `Lỗi kết nối PostgreSQL: ${err.message}`);
      return res.json({
        success: false,
        errorCode: "PG_CONN_ERROR",
        message: err.message || "Sai mật khẩu đăng nhập hoặc không thể kết nối tới server"
      });
    }

  } else if (config.type === "mysql") {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        connectTimeout: 5000,
      });

      const [authRows] = await connection.query(`
        SELECT DATABASE() as db, USER() as usr, VERSION() as ver;
      `);

      const [tablesRows] = await connection.query(`
        SELECT COUNT(table_name) as total 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE();
      `);

      const dbInfo: any = (authRows as any[])[0];
      const tableInfo: any = (tablesRows as any[])[0];

      await connection.end();

      currentConfig = config;
      addLog(user, "Kiểm tra kết nối", "Thành công", `Đã kết nối MySQL: ${dbInfo.db} | User: ${dbInfo.usr}`);

      return res.json({
        success: true,
        databaseType: "MySQL",
        databaseName: dbInfo.db,
        version: dbInfo.ver,
        currentUser: dbInfo.usr,
        totalTables: Number(tableInfo.total),
        message: "Kết nối thành công"
      });

    } catch (err: any) {
      addLog(user, "Kiểm tra kết nối", "Thất bại", `Lỗi kết nối MySQL: ${err.message}`);
      return res.json({
        success: false,
        errorCode: "MYSQL_CONN_ERROR",
        message: err.message || "Sai mật khẩu hoặc thông tin kết nối tới MySQL"
      });
    }
  } else {
    return res.json({ success: false, errorCode: "INVALID_DB_TYPE", message: "Database type unsupported" });
  }
});

// 2. Sync Schema directly from database metadata tables
app.post("/api/schema", async (req, res) => {
  const config: DatabaseConfig = req.body.config || currentConfig;
  const user = "quangzero98@gmail.com";

  if (!config) {
    return res.status(400).json({ success: false, message: "Chưa cấu hình cơ sở dữ liệu." });
  }

  const startTime = Date.now();

  if (config.type === "postgres") {
    const client = new pg.Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });

    try {
      await client.connect();

      // Read Tables
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public'
        ORDER BY table_name;
      `);

      // Read Columns with specific detailed metadata
      const columnsRes = await client.query(`
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          character_maximum_length, 
          numeric_precision, 
          numeric_scale,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema='public'
        ORDER BY table_name, ordinal_position;
      `);

      // Read PK constraints
      const pkRes = await client.query(`
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public';
      `);

      // Read FK constraints
      const fkRes = await client.query(`
        SELECT
          kcu.table_name AS table_name,
          kcu.column_name AS column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `);

      await client.end();

      const pks = new Set(pkRes.rows.map(r => `${r.table_name}.${r.column_name}`));
      const fks = new Map(fkRes.rows.map(r => [`${r.table_name}.${r.column_name}`, { fTable: r.foreign_table_name, fCol: r.foreign_column_name }]));

      const tables = tablesRes.rows.map(row => ({ tableName: row.table_name }));
      const columns = columnsRes.rows.map(row => {
        const tName = row.table_name;
        const cName = row.column_name;
        const pkKey = `${tName}.${cName}`;

        // Keep raw exact database datatype (formatting maximum length/precision scale cleanly if present)
        let formattedType = String(row.data_type).toUpperCase();
        if (formattedType === 'CHARACTER VARYING' || formattedType === 'VARCHAR') {
          formattedType = `VARCHAR(${row.character_maximum_length || 255})`;
        } else if (formattedType === 'NUMERIC' || formattedType === 'DECIMAL') {
          if (row.numeric_precision !== null && row.numeric_scale !== null) {
            formattedType = `NUMERIC(${row.numeric_precision},${row.numeric_scale})`;
          }
        }

        const isPk = pks.has(pkKey);
        const fkInfo = fks.get(pkKey);

        return {
          tableName: tName,
          columnName: cName,
          dataType: formattedType,
          isNullable: row.is_nullable === 'YES',
          isPrimaryKey: isPk,
          isForeignKey: !!fkInfo,
          foreignTable: fkInfo?.fTable,
          foreignColumn: fkInfo?.fCol
        };
      });

      const duration = Date.now() - startTime;
      addLog(user, "Đồng bộ Schema", "Thành công", `Thời gian: ${duration}ms, Đồng bộ ${tables.length} bảng, ${columns.length} cột.`);

      currentConfig = config;
      return res.json({ tables, columns });

    } catch (err: any) {
      addLog(user, "Đồng bộ Schema", "Thất bại", `Lỗi đồng bộ Schema: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message || "Lỗi đồng bộ Schema" });
    }

  } else if (config.type === "mysql") {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
      });

      // Read tables
      const [tableRows] = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY table_name;
      `);

      // Read columns
      const [columnRows] = await connection.query(`
        SELECT table_name, column_name, column_type as data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        ORDER BY table_name, ordinal_position;
      `);

      // Read PK constraints
      const [pkRows] = await connection.query(`
        SELECT table_name, column_name
        FROM information_schema.key_column_usage
        WHERE constraint_name = 'PRIMARY'
          AND table_schema = DATABASE();
      `);

      // Read FK constraints
      const [fkRows] = await connection.query(`
        SELECT 
          table_name,
          column_name,
          referenced_table_name as foreign_table_name,
          referenced_column_name as foreign_column_name
        FROM information_schema.key_column_usage
        WHERE referenced_table_name IS NOT NULL
          AND table_schema = DATABASE();
      `);

      await connection.end();

      const pks = new Set((pkRows as any[]).map(r => `${r.table_name}.${r.column_name}`));
      const fks = new Map((fkRows as any[]).map(r => [`${r.table_name}.${r.column_name}`, { fTable: r.foreign_table_name, fCol: r.foreign_column_name }]));

      const tables = (tableRows as any[]).map(row => ({ tableName: row.table_name }));
      const columns = (columnRows as any[]).map(row => {
        const tName = row.table_name;
        const cName = row.column_name;
        const pkKey = `${tName}.${cName}`;

        const isPk = pks.has(pkKey);
        const fkInfo = fks.get(pkKey);

        return {
          tableName: tName,
          columnName: cName,
          dataType: String(row.data_type).toUpperCase(),
          isNullable: row.is_nullable === 'YES' || row.is_nullable === 'yes',
          isPrimaryKey: isPk,
          isForeignKey: !!fkInfo,
          foreignTable: fkInfo?.fTable,
          foreignColumn: fkInfo?.fCol
        };
      });

      const duration = Date.now() - startTime;
      addLog(user, "Đồng bộ Schema", "Thành công", `Thời gian: ${duration}ms, Đồng bộ ${tables.length} bảng, ${columns.length} cột.`);

      currentConfig = config;
      return res.json({ tables, columns });

    } catch (err: any) {
      addLog(user, "Đồng bộ Schema", "Thất bại", `Lỗi đồng bộ Schema: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message || "Lỗi đồng bộ Schema" });
    }
  } else {
    return res.status(400).json({ success: false, message: "Chưa cấu hình loại cơ sở dữ liệu hoặc không được hỗ trợ." });
  }
});

// 3. Execution of widget querying
app.post("/api/query", async (req, res) => {
  const { sql, widgetId, config } = req.body;
  const dbConfig = config || currentConfig;
  const user = "quangzero98@gmail.com";

  if (!dbConfig) {
    return res.json({
      widgetId,
      status: "error",
      message: "Chưa cấu hình kết nối database."
    });
  }

  if (!sql) {
    return res.json({
      widgetId,
      status: "error",
      message: "Chưa chọn cấu hình phù hợp để sinh SQL."
    });
  }

  const startTime = Date.now();

  if (dbConfig.type === "postgres") {
    const client = new pg.Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    try {
      await client.connect();
      const queryRes = await client.query(sql);
      await client.end();

      const duration = Date.now() - startTime;
      addLog(user, "Thực thi Dashboard", "Thành công", `Widget: ${widgetId} | SQL: ${sql} | Thời gian: ${duration}ms`);

      return res.json({
        widgetId,
        status: "success",
        recordCount: queryRes.rowCount || queryRes.rows.length,
        executionTimeMs: duration,
        data: queryRes.rows,
        sql
      });

    } catch (err: any) {
      const duration = Date.now() - startTime;
      addLog(user, "Thực thi Dashboard", "Thất bại", `Widget: ${widgetId} | SQL: ${sql} | Lỗi: ${err.message}`);
      return res.json({
        widgetId,
        status: "error",
        message: err.message || "Không thể thực thi SQL trên PostgreSQL",
        sql
      });
    }

  } else if (dbConfig.type === "mysql") {
    try {
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      });

      const [rows] = await connection.query(sql);
      await connection.end();

      const duration = Date.now() - startTime;
      addLog(user, "Thực thi Dashboard", "Thành công", `Widget: ${widgetId} | SQL: ${sql} | Thời gian: ${duration}ms`);

      const dataArray = rows as any[];
      return res.json({
        widgetId,
        status: "success",
        recordCount: dataArray.length,
        executionTimeMs: duration,
        data: dataArray,
        sql
      });

    } catch (err: any) {
      const duration = Date.now() - startTime;
      addLog(user, "Thực thi Dashboard", "Thất bại", `Widget: ${widgetId} | SQL: ${sql} | Lỗi: ${err.message}`);
      return res.json({
        widgetId,
        status: "error",
        message: err.message || "Không thể thực thi SQL trên MySQL",
        sql
      });
    }
  } else {
    return res.json({
      widgetId,
      status: "error",
      message: "Database type unsupported"
    });
  }
});

// 4. Retrieve Logs
app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

// 5. Submit client-side actions to System logs
app.post("/api/logs", (req, res) => {
  const { user, action, result, detail } = req.body;
  addLog(user, action, result, detail);
  res.json({ success: true });
});

// Setup Vite Dev server or Serve build folder (Production setup)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
