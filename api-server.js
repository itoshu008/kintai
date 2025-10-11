const http = require('http');
const url = require('url');

// CORSヘッダーを設定する関数
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

// JSONレスポンスを送信する関数
function sendJSON(res, data, statusCode = 200) {
  setCORSHeaders(res);
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

// サーバー作成
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // OPTIONSリクエスト（CORS preflight）
  if (method === 'OPTIONS') {
    setCORSHeaders(res);
    res.writeHead(200);
    res.end();
    return;
  }

  // departments エンドポイントの実装
  if (path === '/api/admin/departments' && method === 'GET') {
    const data = { 
      departments: [
        { id: 1, name: 'Sales' },
        { id: 2, name: 'HR' },
        { id: 3, name: 'IT' }
      ] 
    };
    sendJSON(res, data);
    return;
  }

  // ヘルスチェックエンドポイント
  if (path === '/health' && method === 'GET') {
    const data = { 
      ok: true, 
      service: 'api-server',
      timestamp: new Date().toISOString(),
      port: 8001
    };
    sendJSON(res, data);
    return;
  }

  // その他のAPIエンドポイント（基本的な実装）
  if (path === '/api/employees' && method === 'GET') {
    const data = { 
      employees: [
        { id: 1, code: '001', name: '田中太郎', department: 1 },
        { id: 2, code: '002', name: '佐藤花子', department: 2 }
      ] 
    };
    sendJSON(res, data);
    return;
  }

  if (path === '/api/attendance' && method === 'GET') {
    const data = { 
      attendance: [],
      message: 'Attendance data endpoint'
    };
    sendJSON(res, data);
    return;
  }

  // 404エラー
  sendJSON(res, { error: 'Not Found' }, 404);
});

const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`🚀 API Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏢 Departments: http://localhost:${PORT}/api/admin/departments`);
});
