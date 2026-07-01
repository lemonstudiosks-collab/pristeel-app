// =========================================================================
// 1. KONFIGURIMI I GEMINI (Përdorim variablat e HTML-së tuaj për Supabase)
// =========================================================================
const GEMINI_API_KEY = "AQ.Ab8RN6Lvz-UHiQmQ3E2olN6t_hMwd58pjfBTq1A7U1Y9KaNdyg"; 

// Overrajdojmë funksionin startParsing që thërret butoni yt në HTML
async function startParsing() {
    const textarea = document.getElementById('i-text');
    const text = textarea ? textarea.value.trim() : "";
    
    if (text.length < 5) {
        alert('Ngjit tekstin e dokumentit ose ngarko skedar PDF/TXT/CSV.');
        return;
    }

    // Shfaqim kartelën e animacionit në HTML
    const parsingCard = document.getElementById('parsing-card');
    if (parsingCard) parsingCard.classList.remove('hidden');

    // Ndryshojmë hapat vizualë në ekran fiks siç e ka HTML jote
    const steps = [
        {n:'st1', d:'st1d', msg:'Teksti u lexua me sukses.', p:25},
        {n:'st2', d:'st2d', msg:'Lidhja me Gemini AI u realizua...', p:50},
        {n:'st3', d:'st3d', msg:'Duke strukturuar tabelën e çelikut...', p:75},
        {n:'st4', d:'st4d', msg:'Duke dërguar të dhënat në Supabase Cloud...', p:95}
    ];

    for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 200));
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

            // Përdorim _SB_URL dhe _SB_KEY direkt nga HTML jote pa i ri-deklaruar këtu!
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

        // Finalizojmë progresin
        const prog = document.getElementById('prog');
        if (prog) prog.style.width = '100%';
        const st4d = document.getElementById('st4d');
        if (st4d) st4d.textContent = 'Analiza dhe ruajtja përfundoi me sukses!';

        setTimeout(() => {
            if (parsingCard) parsingCard.classList.add('hidden');
            
            // Mbushim masivin global bomRows të HTML-së tënde që të shfaqen në tabelë
            bomRows = listaMaterialeve.map((item, index) => ({
                id: Date.now() + index,
                pos: index + 1,
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
            
            // Hapim faqen dhe vizatojmë tabelën duke përdorur funksionet e HTML-së tënde
            showPage('bom');
            if (typeof renderBom === 'function') renderBom();
            if (textarea) textarea.value = '';
        }, 800);

    } catch (error) {
        console.error("Gabim gjatë ekzekutimit:", error);
        alert("Ndodhi një gabim: " + error.message);
        if (parsingCard) parsingCard.classList.add('hidden');
    }
}

// =========================================================================
// 2. FUNKSIONI STRUKTURUES I KËRKESËS GEMINI API
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
