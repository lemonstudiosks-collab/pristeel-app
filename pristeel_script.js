// =========================================================================
// 1. KONFIGURIMI I FIXUAR I PLATFORMËS (SUPABASE & GEMINI)
// =========================================================================
const _SB_URL = "https://isymxqfqzkchbsrbhucf.supabase.co"; // URL e saktë nga HTML-ja jote
const _SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM";
const GEMINI_API_KEY = "AQ.Ab8RN6Lvz-UHiQmQ3E2olN6t_hMwd58pjfBTq1A7U1Y9KaNdyg"; 

// Overrajdojmë funksionin e vjetër startParsing() që thërret butoni në HTML
async function startParsing() {
    const textarea = document.getElementById('i-text');
    const text = textarea ? textarea.value.trim() : "";
    
    if (text.length < 5) {
        alert('Ngjit tekstin e dokumentit ose ngarko skedar PDF/TXT/CSV.');
        return;
    }

    // Shfaqim kartelën e animacionit të ngarkimit në HTML
    const parsingCard = document.getElementById('parsing-card');
    if (parsingCard) parsingCard.classList.remove('hidden');

    // Animojmë hapat vizualë në ekran fiks siç e ka HTML jote
    const steps = [
        {n:'st1', d:'st1d', msg:'Teksti u lexua me sukses.', p:25},
        {n:'st2', d:'st2d', msg:'Lidhja me Gemini AI u realizua...', p:50},
        {n:'st3', d:'st3d', msg:'Duke strukturuar tabelën e çelikut...', p:75},
        {n:'st4', d:'st4d', msg:'Duke dërguar të dhënat në Supabase Cloud...', p:95}
    ];

    for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        const elNum = document.getElementById(steps[i].n);
        const elDet = document.getElementById(steps[i].d);
        if (elNum) { elNum.className = 'step-num done'; elNum.textContent = '✓'; }
        if (elDet) elDet.textContent = steps[i].msg;
        const prog = document.getElementById('prog');
        if (prog) prog.style.width = steps[i].p + '%';
    }

    const emriProjektit = document.getElementById('i-projname').value.trim() || "Projekt i Ri";

    try {
        // Thërrasim inteligjencën artificiale Gemini
        const listaMaterialeve = await thirrGeminiAPI(text);

        // Ruajmë të dhënat direkt në tabelën bom_items të Supabase
        if (listaMaterialeve && listaMaterialeve.length > 0) {
            const rreshtatPerSupabase = listaMaterialeve.map(item => ({
                project_name: emriProjektit,
                pozicioni: item.pozicioni || "-",
                materiali: item.materiali || "-",
                dimensionet: item.dimensionet || "-",
                sasia: parseInt(item.sasia) || 1
            }));

            // Ekzekutojmë dërgimin në databazë përmes urës standarde të Supabase Rest
            await fetch(_SB_URL + '/rest/v1/bom_items', {
                method: 'POST',
                headers: {
                    'apikey': _SB_KEY,
                    'Authorization': 'Bearer ' + _SB_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rreshtatPerSupabase)
            });
        }

        // Finalizojmë animacionin e progresit
        const prog = document.getElementById('prog');
        if (prog) prog.style.width = '100%';
        const st4d = document.getElementById('st4d');
        if (st4d) st4d.textContent = 'Analiza dhe ruajtja përfundoi me sukses!';

        // Ndryshojmë pamjen te tab-i BOM fiks sipas funksionit showPage të HTML-së tuaj
        setTimeout(() => {
            if (parsingCard) parsingCard.classList.add('hidden');
            // Mbushim variablin global të HTML-së tuaj bomRows që tabela të mos mbetet bosh në ekran
            bomRows = listaMaterialeve.map((item, index) => ({
                id: Date.now() + index,
                pos: item.pozicioni || (index + 1),
                profile: (item.dimensionet ? item.dimensionet.split(' ')[0] : 'HEA'),
                dim: (item.dimensionet ? item.dimensionet.replace(/^[a-zA-Z]+/, '').trim() : '300'),
                grade: item.materiali || 'S355JR',
                std: 'EN 10025-2',
                lenMm: 12000,
                pcs: parseInt(item.sasia) || 1,
                kg: 0, 
                surface: 'none',
                cert: 'EN 10204 3.1',
                conf: 'high'
            }));
            
            // Thërrasim funksionet e uebfaqes tuaj për të hapur faqen dhe vizatuar tabelën në ekran
            showPage('bom');
            if (typeof renderBom === 'function') renderBom();
            // Fshijmë tekstin e mbetur në kuti
            if (textarea) textarea.value = '';
        }, 1000);

    } catch (error) {
        console.error("Gabim gjatë ekzekutimit:", error);
        alert("Ndodhi një gabim: " + error.message);
        if (parsingCard) parsingCard.classList.add('hidden');
    }
}

// =========================================================================
// 2. FUNKSIONI STRUKTURUES I REALE I KËRKESËS GEMINI API
// =========================================================================
async function thirrGeminiAPI(teksti) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `Analizo këtë tekst prokurimi çeliku dhe nxirr të dhënat si JSON Array. Teksti:\n${teksti}` }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            pozicioni: { type: "string" },
                            materiali: { type: "string" },
                            dimensionet: { type: "string" },
                            sasia: { type: "integer" }
                        },
                        required: ["pozicioni", "materiali", "dimensionet", "sasia"]
                    }
                }
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google API Refuzim: ${errText}`);
    }
    
    const result = await response.json();
    const tekstNgaAI = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!tekstNgaAI) throw new Error("AI nuk ktheu asnjë të dhënë.");
    return JSON.parse(tekstNgaAI.trim());
}
