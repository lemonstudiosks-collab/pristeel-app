// =========================================================================
// 1. KONFIGURIMI I PLATFORMËS
// =========================================================================
const SUPABASE_URL = "https://ismxqfqzkchbsrbhucf.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM";

const GEMINI_API_KEY = "AQ.Ab8RN6Lvz-UHiQmQ3E2olN6t_hMwd58pjfBTq1A7U1Y9KaNdyg";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const pristeelDelay = ms => new Promise(res => setTimeout(res, ms));

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

        if (!tekstiRaw) throw new Error("Futni tekstin e materialit!");

        const lista = await thirrGeminiAPI(tekstiRaw);

        if (supabaseClient && lista.length > 0) {
            for (let item of lista) {
                await supabaseClient.from('bom_items').insert([{ 
                    project_name: emriProjektit, pozicioni: item.pozicioni || "-", 
                    materiali: item.materiali || "-", dimensionet: item.dimensionet || "-", 
                    sasia: parseInt(item.sasia) || 1 
                }]);
            }
        }
        
        ndryshoFaqenAktive("BOM", emriProjektit);
    } catch (gabimi) {
        console.error(gabimi);
        alert("Gabim: " + gabimi.message);
    } finally {
        butoni.innerText = tekstiOrigjinal;
        butoni.disabled = false;
    }
}

// =========================================================================
// 4. METODA E RE: ÇELËSI AQ. DIREKT NË URL
// =========================================================================
async function thirrGeminiAPI(teksti) {
    // Tani çelësi kalon përmes ?key=, kjo zhbllokon problemin e AQ.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const promptSistemit = `Nxjerr vetëm: pozicionin, materialin, dimensionet, sasinë. Kthe VETËM një JSON array të pastër: [{"pozicioni": "Pos. 1", "materiali": "S235", "dimensionet": "IPE 200", "sasia": 1}]`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Kemi hequr x-goog-api-key nga këtu!
        body: JSON.stringify({
            contents: [{ parts: [{ text: teksti }] }],
            systemInstruction: { parts: [{ text: promptSistemit }] },
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Error: ${errText}`);
    }
    
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

// =========================================================================
// 5. PËRDITËSIMI I PAMJES
// =========================================================================
async function ndryshoFaqenAktive(emri, emriProjektit) {
    if (supabaseClient) {
        const { data } = await supabaseClient.from('bom_items').select('*').eq('project_name', emriProjektit);
        const secImport = document.querySelector(".import-dokument-container") || document.getElementById("importSection");
        const secBOM = document.querySelector(".bom-container") || document.getElementById("bomSection");

        if (secImport) secImport.style.display = "none";
        if (secBOM && data) {
            secBOM.style.display = "block";
            const tbody = document.querySelector("table tbody");
            if (tbody) {
                tbody.innerHTML = data.map(item => `<tr><td>${item.pozicioni}</td><td>${item.materiali}</td><td>${item.dimensionet}</td><td>${item.sasia}</td></tr>`).join("");
            }
        }
    }
}
