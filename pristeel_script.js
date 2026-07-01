// =========================================================================
// 1. KONFIGURIMI I PLATFORMËS
// =========================================================================
const SUPABASE_URL = "https://ismxqfqzkchbsrbhucf.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM";
const GEMINI_API_KEY = "AQ.Ab8RN6Lvz-UHiQmQ3E2olN6t_hMwd58pjfBTq1A7U1Y9KaNdyg"; 

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// =========================================================================
// 2. NGARKIMI I FAQES DHE LIDHJA E BUTONAVE
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const btnAnalizo = document.querySelector(".btn-analizo") || document.getElementById("btnAnalizo") || document.querySelector("button"); 
    if (btnAnalizo) btnAnalizo.addEventListener("click", analizoDheBartoTeBOM);
});

// =========================================================================
// 3. FUNKSIONI KRYESOR
// =========================================================================
async function analizoDheBartoTeBOM(event) {
    if (event) event.preventDefault();
    const butoni = this;
    const tekstiOrigjinal = butoni.innerText;
    
    butoni.innerText = "Duke analizuar...";
    butoni.disabled = true;

    try {
        const textarea = document.querySelector("textarea") || document.querySelector(".teksti-raw");
        const tekstiRaw = textarea ? textarea.value : "";
        const inputProjektit = document.querySelector('input[type="text"]') || {value: "Projekt i Ri"};
        const emriProjektit = inputProjektit.value.trim() || "Projekt i Ri";

        if (!tekstiRaw) {
            alert("Ju lutem futni tekstin e materialit!");
            butoni.innerText = tekstiOrigjinal;
            butoni.disabled = false;
            return;
        }

        const lista = await thirrGeminiAPI(tekstiRaw);

        if (supabaseClient && lista && lista.length > 0) {
            for (let item of lista) {
                const { error } = await supabaseClient.from('bom_items').insert([{ 
                    project_name: emriProjektit, 
                    pozicioni: item.pozicioni || "-", 
                    materiali: item.materiali || "-", 
                    dimensionet: item.dimensionet || "-", 
                    sasia: parseInt(item.sasia) || 1 
                }]);
                if (error) console.error("Gabim te Supabase:", error);
            }
        }
        
        ndryshoFaqenAktive(emriProjektit);
    } catch (gabimi) {
        console.error(gabimi);
        alert("Gabim: " + gabimi.message);
    } finally {
        butoni.innerText = tekstiOrigjinal;
        butoni.disabled = false;
    }
}

// =========================================================================
// 4. THIRRJA E GEMINI 1.5 FLASH
// =========================================================================
async function thirrGeminiAPI(teksti) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const promptSistemit = `Je një inxhinier prokurimi. Nxirr nga teksti pozicionet, llojin e materialit, dimensionet dhe sasinë. Kthe VETËM një JSON array të pastër pa thonjëza markdown, si ky format: [{"pozicioni": "Pos. 1", "materiali": "S235JR", "dimensionet": "IPE 200", "sasia": 1}]`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                role: "user",
                parts: [{ text: `${promptSistemit}\n\nTeksti:\n${teksti}` }]
            }]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Error: ${errText}`);
    }
    
    const result = await response.json();
    let tekstNgaAI = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!tekstNgaAI) throw new Error("Përgjigjja e AI është e zbrazët.");

    tekstNgaAI = tekstNgaAI.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(tekstNgaAI);
}

// =========================================================================
// 5. PËRDITËSIMI I PAMJES (RREGULLUAR)
// =========================================================================
async function ndryshoFaqenAktive(emriProjektit) {
    if (supabaseClient) {
        const { data } = await supabaseClient.from('bom_items').select('*').eq('project_name', emriProjektit);
        
        const secImport = document.querySelector(".import-dokument-container") || document.getElementById("importSection") || document.querySelector(".main-content > div");
        const secBOM = document.querySelector(".bom-container") || document.getElementById("bomSection") || document.getElementById("bom-section");

        // RREGULLIMI: Hoqëm .style e tepërt që rrëzonte kodin
        if (secImport) secImport.style.display = "none";
        if (secBOM) secBOM.style.display = "block";
        
        const tbody = document.querySelector("table tbody") || document.getElementById("tabelaBOMBody");
        if (tbody && data) {
            tbody.innerHTML = data.map(item => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td style="padding: 12px; color: #fff;">${item.pozicioni}</td>
                    <td style="padding: 12px; color: #fff; font-weight: bold;">${item.materiali}</td>
                    <td style="padding: 12px; color: #a0aec0;">${item.dimensionet}</td>
                    <td style="padding: 12px; color: #fff; text-align: center;">${item.sasia} Stk</td>
                </tr>
            `).join("");
        }
    }
}
