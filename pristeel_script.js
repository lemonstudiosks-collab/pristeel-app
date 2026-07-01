<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <title>PRISTEEL — Procurement & BOM AI Manager</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    :root {
      --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --text3: #94a3b8;
      --primary: #3b82f6; --primary-hover: #2563eb; --border: #334155; --success: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; display: flex; gap: 20px; }
    .sidebar { width: 280px; background: var(--card); border: 1px solid var(--border); padding: 20px; border-radius: 12px; height: calc(100vh - 40px); position: sticky; top: 20px; display: flex; flex-direction: column; }
    .main-content { flex: 1; background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 12px; min-height: calc(100vh - 40px); }
    h2, h3 { margin-bottom: 15px; font-weight: 600; color: #fff; }
    .nav-btn { display: block; width: 100%; padding: 12px; background: transparent; border: 1px solid transparent; color: var(--text3); text-align: left; border-radius: 8px; cursor: pointer; margin-bottom: 8px; font-size: 14px; transition: all 0.2s; }
    .nav-btn:hover, .nav-btn.active { background: #2d3748; color: #fff; border-color: var(--border); }
    .nav-btn.active { border-left: 4px solid var(--primary); }
    .card { background: #1a202c; border: 1px solid var(--border); padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .card-title { font-size: 14px; font-weight: bold; color: var(--text3); text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; font-size: 13px; color: var(--text3); margin-bottom: 6px; }
    input, textarea, select { width: 100%; padding: 10px; background: #2d3748; border: 1px solid var(--border); color: #fff; border-radius: 6px; font-size: 14px; }
    input:focus, textarea:focus { border-color: var(--primary); outline: none; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: var(--primary-hover); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-success { background: var(--success); }
    .btn-success:hover { background: #16a34a; }
    .hidden { display: none !important; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { background: #2d3748; color: var(--text3); font-weight: 600; text-align: left; padding: 10px; border-bottom: 2px solid var(--border); }
    td { padding: 10px; border-bottom: 1px solid var(--border); color: #e2e8f0; }
    tr:hover td { background: #242f41; }
    .project-item { padding: 10px; background: #2d3748; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .project-item:hover { border-color: var(--primary); }
    .rfq-block { background: #1a202c; border: 1px solid var(--border); padding: 15px; border-radius: 8px; margin-bottom: 15px; }
  </style>
</head>
<body>

<div class="container">
  <div class="sidebar">
    <div style="margin-bottom:25px; text-align:center;">
      <h2 style="color:var(--primary); letter-spacing:1px;">PRISTEEL</h2>
      <p style="font-size:11px; color:var(--text3);">Procurement & BOM Manager v19</p>
    </div>
    <div style="flex:1;">
      <button class="nav-btn active" id="btn-import" onclick="showPage('import')">📥 Import Dokument</button>
      <button class="nav-btn" id="btn-dashboard" onclick="showPage('dashboard')">📊 Dashboard Projekti</button>
      <button class="nav-btn" id="btn-bom" onclick="showPage('bom')">📋 Tabela BOM</button>
      <button class="nav-btn" id="btn-rfq" onclick="showPage('rfq')">✉️ Gjenero RFQ</button>
    </div>
    <div>
      <button class="nav-btn" id="btn-settings" onclick="showPage('settings')">⚙️ Cilësimet</button>
    </div>
  </div>

  <div class="main-content">
    
    <div id="page-import" class="page">
      <h2>Import Dokumenti me AI</h2>
      <div class="card">
        <div class="form-group">
          <label>Emri i Projektit / Ndërtesës</label>
          <input type="text" id="i-projname" placeholder="Psh. Hala Industriale Zona Industriale Prishtinë">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
          <div class="form-group"><label>Klienti</label><input type="text" id="i-client"></div>
          <div class="form-group"><label>Referenca / Tenderi</label><input type="text" id="i-ref"></div>
          <div class="form-group"><label>Lokacioni</label><input type="text" id="i-location"></div>
          <div class="form-group"><label>Afati i Dorëzimit</label><input type="date" id="i-deadline"></div>
        </div>
        <div class="form-group">
          <label>Teksti nga Dokumenti (Copy-Paste nga PDF, Email, etj.)</label>
          <textarea id="i-text" rows="10" placeholder="Ngjitni specifikimet këtu..."></textarea>
        </div>
        <button class="btn btn-success" onclick="startParsing()">⚡ Analizo me AI & Krijo BOM</button>
      </div>

      <div id="parsing-card" class="card hidden" style="text-align:center; background:#1e3a8a;">
        <p>🔄 Duke analizuar tekstin me Llama 3.3 AI... Ju lutem prisni pak sekonda.</p>
      </div>

      <h3>Projektet e Ruajtura në Supabase</h3>
      <div id="saved-projects-list"></div>
    </div>

    <div id="page-dashboard" class="page hidden">
      <h2>Dashboard i Projektit</h2>
      <div style="display:flex; gap:10px; margin-bottom:15px;">
        <button class="btn btn-sm" onclick="showPage('bom')">Shiko BOM</button>
        <button class="btn btn-sm" onclick="showPage('rfq')">Gjenero RFQ</button>
      </div>
      <div class="card">
        <div class="card-title">Informacioni i Përgjithshëm</div>
        <p><strong>Projekti:</strong> <span id="dash-title">-</span></p>
        <p><strong>Klienti:</strong> <span id="dash-client">-</span></p>
        <p><strong>Referenca:</strong> <span id="dash-ref">-</span></p>
        <p><strong>Vendi:</strong> <span id="dash-location">-</span></p>
      </div>
    </div>

    <div id="page-bom" class="page hidden">
      <h2>Tabela Zyrtare BOM (Bill of Materials)</h2>
      <div style="margin-bottom:15px;">
        <button class="btn btn-sm btn-success" onclick="saveBomToSupabase()">💾 Ruaj në Supabase</button>
        <button class="btn btn-sm" onclick="showPage('rfq')">Vazhdo te RFQ ➔</button>
      </div>
      <div class="card" style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Profil</th>
              <th>Dimenzioni</th>
              <th>Gradë</th>
              <th>Standard</th>
              <th>Gjatësi (mm)</th>
              <th>Copa</th>
              <th>Pesha (kg)</th>
              <th>Sipërfaqja</th>
              <th>Certifikatë</th>
            </tr>
          </thead>
          <tbody id="bom-table-body"></tbody>
        </table>
      </div>
    </div>

    <div id="page-rfq" class="page hidden">
      <h2>Gjeneratori i RFQ (Kërkesë për Ofertë)</h2>
      <p style="color:var(--text3); margin-bottom:15px;">Më poshtë janë gjeneruar email-et zyrtare për secilin furnitor të paracaktuar bazuar në materialet e BOM-it.</p>
      <div id="rfq-container"></div>
    </div>

    <div id="page-settings" class="page hidden">
      <h2>Cilësimet e Sistemit</h2>
      <div class="card">
        <div class="card-title">Çelësat e API-ve</div>
        <div class="form-group">
          <label>Groq API Key (Duhet të fillojë me gsk_)</label>
          <input type="password" id="s-apikey" onchange="saveApiKey()">
        </div>
      </div>
    </div>

  </div>
</div>

<script>
  // =========================================================================
  // KONFIGURIMI DHE VARIABLAT GLOBALË
  // =========================================================================
  let bomRows = [];
  let _curProjId = null;
  
  const defaultSuppliers = [
    { name: "Eurosteel", email: "info@eurosteel.com" },
    { name: "Aktiva MK", email: "info@aktiva.com.mk" },
    { name: "Galvasteel", email: "info@galvasteel.com" },
    { name: "IGM Trade", email: "info@igm.com.mk" },
    { name: "Makstil", email: "info@makstil.com" },
    { name: "MTA", email: "info@mta-ks.com" }
  ];

  // Mbushja e Supabase Kredencialeve tuaja origjinale automatikisht
  const SUPABASE_URL = "https://isymxqfqzkchbsrbhucf.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk1MDczMTksImV4cCI6MjAzN
