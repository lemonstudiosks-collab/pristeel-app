// =========================================================================
// 1. KONFIGURIMI I PLATFORMËS (SUPABASE DHE GEMINI API)
// =========================================================================
const SUPABASE_URL = "https://ismxqfqzkchbsrbhucf.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM";
const GEMINI_API_KEY = "AQ.Ab8RN6LdbL37xbG-gpc9kJpD6an6MT8VLn8qMhp9Q67n4recuw"; 

// Inicializimi i klientit të Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// E emëruam 'pristeelDelay' që të mos përplaset me kodin tënd të vjetër në HTML
const pristeelDelay = ms => new Promise(res => setTimeout(res, ms));

// =========================================================================
// 2. NGARKIMI I FAQES DHE LIDHJA E BUTONAVE
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!supabaseClient) {
        console.error("Supabase nuk u ngarkua!");
    }

    const btnAnalizo = document.querySelector(".btn-analizo") || 
                       document.getElementById("btnAnalizo") || 
                       document.querySelector("button.btn-primary") ||
                       document.querySelector("button"); 

    if (btnAnalizo) {
        btnAnalizo.addEventListener("click", analizoDheBartoTeBOM);
    } else {
        const gjitheButonat = document.querySelectorAll("button");
        gjitheButonat.forEach(btn => {
            if (btn.innerText.toLowerCase().includes("analizo")) {
                btn.addEventListener("click", analizoDheBartoTeBOM);
            }
        });
    }
});

// =========================================================================
// 3. FUNKSIONI KRYESOR: ANALIZA DHE BARTJA E TË DHËNAVE
// =========================================================================
async function analizoDheBartoTeBOM(event) {
    if (event) event.preventDefault();

    const butoni = this || document.querySelector(".btn-analizo") || document.getElementById("btnAnalizo");
    if (!butoni) return;

    const tekstiOrigjinal = butoni.innerText;
    butoni.innerText = "Duke analizuar me AI...";
    butoni.disabled = true;

    try {
        const textarea = document.querySelector("textarea") || document.querySelector(".teksti-raw");
        const tekstiRaw = textarea ? textarea.value : "";
        
        const inputProjektit = document.querySelector('input[placeholder*="STACON"]') || 
                               document.querySelector('.emri-projektit') ||
                               document.getElementById("emriProjektit") ||
                               document.querySelector('input[type="text"]'); 
        
        const emriProjektit = inputProjektit && inputProjektit.value.trim() !== "" ? inputProjektit.value : "Projekt i Ri Çeliku";

        if (!tekstiRaw || tekstiRaw.trim() === "") {
            shfaqMesazhGabimi("Ju lutem ngarkoni një dokument ose ngjitni tekstin e materialit më parë!");
            butoni.innerText = tekstiOrigjinal;
            butoni.disabled = false;
            return;
        }

        const listaBOMStrukturuar = await thirrGeminiAPI(tekstiRaw);

        if (!listaBOMStrukturuar || listaBOMStrukturuar.length === 0) {
            throw new Error("AI nuk arriti të nxjerrë asnjë pozicion të vlefshëm.");
        }

        if (supabaseClient) {
            for (let item of listaBOMStrukturuar) {
                const { error } = await supabaseClient
                    .from('bom_items')
                    .insert([
                        { 
                            project_name: emriProjektit, 
                            pozicioni: item.pozicioni || "-", 
                            materiali: item.materiali || "-", 
                            dimensionet: item.dimensionet || "-", 
                            sasia: parseInt(item.sasia) || 1 
                        }
                    ]);
                
                if (error) {
                    console.error("Gabim gjatë ruajtjes në Supabase:", error);
                }
            }
        }

        ndryshoFaqenAktive("BOM", emriProjektit);

    } catch (gabimi) {
        console.error("Gabim gjatë procesit:", gabimi);
        shfaqMesazhGabimi("Ndodhi një gabim: " + gabimi.message);
    } finally {
        butoni.innerText = tekstiOrigjinal;
        butoni.disabled = false;
    }
}

// =========================================================================
// 4. THIRRJA E MODELIT GEMINI (RREGULLUAR PËR ÇELËSAT E RINJ 'AQ.')
// =========================================================================
async function thirrGeminiAPI(tekstiPerAnalize) {
    // E pastruam linkun nga çelësi dhe vendosëm modelin më stabil '1.5-flash'
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    const promptSistemit = `Je një inxhinier prokurimi profesionist për platformën PRISTEEL. 
Detyra jote është të lexosh tekstin e paorganizuar që vjen nga një projekt, vizatim CAD apo specifikim teknik i çelikut.
Nxjerr vetëm pozicionet (Pos.), llojin e saktë të materialit/metalit (si S235JR, S355, EN-AW 5083, etj.), dimensionet (trashësia, profilet IPE/HEA, gjatësitë) dhe sasinë (Stk/Copa).

RREGULLI I SAKTSISË: Ktheje përgjigjen TANDEM DHE VETËM si një JSON Array të pastër, pa asnjë fjalë tjetër hyrëse ose sqaruese (pa thonjëza markdown \`\`\`json).
Nëse nuk ka sasi të specifikuar, vendos vlerën 1 si parazgjedhje.

Formati i kthimit duhet të jetë ekzaktësisht kështu:
[{"pozicioni": "Pos. 1", "materiali": "EN-AW 5083", "dimensionet": "A3", "sasia": 1}]`;

    const payload = {
        contents: [{
            parts: [{ text: tekstiPerAnalize }]
        }],
        systemInstruction: {
            parts: [{ text: promptSistemit }]
        },
        generationConfig: {
            responseMimeType: "application/json" 
        }
    };

    let tentimi = 0;
    const vonesat = [1000, 2000, 4000, 8000, 16000]; 

    while (tentimi < 5) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY  // <--- Çelësi AQ i fshehur sipas rregullave të Google
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const statusText = await response.text();
                throw new Error(`Google API Gabim (${response.status}): ${statusText}`);
            }

            const result = await response.json();
            let tekstNgaAI = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!tekstNgaAI) {
                throw new Error("Përgjigjja e AI është e zbrazët.");
            }

            tekstNgaAI = tekstNgaAI.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(tekstNgaAI);

        } catch (error) {
            tentimi++;
            if (tentimi >= 5) {
                throw new Error("Lidhja me AI dështoi: " + error.message);
            }
            await pristeelDelay(vonesat[tentimi - 1]);
        }
    }
}

// =========================================================================
// 5. NAVIGIMI DHE PËRDITËSIMI I PAMJES
// =========================================================================
async function ndryshoFaqenAktive(emriFaqes, emriProjektit) {
    const menute = document.querySelectorAll(".prosesi div, .prosesi li, .prosesi a, .sidebar a");
    menute.forEach(m => {
        if (m.innerText.toLowerCase().includes(emriFaqes.toLowerCase())) {
            m.classList.add("active");
        } else {
            m.classList.remove("active");
        }
    });

    if (supabaseClient) {
        const { data: bomItems, error } = await supabaseClient
            .from('bom_items')
            .select('*')
            .eq('project_name', emriProjektit);

        if (error) {
            console.error("Gabim gjatë leximit të të dhënave:", error);
            return;
        }

        const seksioniImport = document.getElementById("importSection") || 
                               document.querySelector(".import-dokument-container") || 
                               document.getElementById("import-section") ||
                               document.querySelector(".main-content > div"); 

        const seksioniBOM = document.getElementById("bomSection") || 
                             document.querySelector(".bom-container") || 
                             document.getElementById("bom-section");

        if (seksioniImport) seksioniImport.style.display = "none";
        if (seksioniBOM) {
            seksioniBOM.style.display = "block";
            ndërtoTabelenBOM(bomItems);
        } else {
            console.log("Të dhënat e nxjerra për BOM:", bomItems);
            shfaqMesazhGabimi("Të dhënat u ruajtën! Por seksioni 'BOM' në HTML duhet të ketë id='bomSection' që të shfaqet automatikisht.");
        }
    }
}

function ndërtoTabelenBOM(teDhenat) {
    const tabelaBody = document.querySelector("#tabelaBOM tbody") || 
                       document.querySelector(".tabela-bom-items") || 
                       document.getElementById("tabelaBOMBody") ||
                       document.querySelector("table tbody"); 
                       
    if (!tabelaBody) return;

    tabelaBody.innerHTML = ""; 

    if (teDhenat.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Nuk u gjet asnjë material për këtë projekt.</td></tr>`;
        return;
    }

    teDhenat.forEach(item => {
        const rreshti = `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 12px; color: #fff;">${item.pozicioni}</td>
                <td style="padding: 12px; color: #fff; font-weight: bold;">${item.materiali}</td>
                <td style="padding: 12px; color: #a0aec0;">${item.dimensionet}</td>
                <td style="padding: 12px; color: #fff; text-align: center;">${item.sasia} Stk</td>
            </tr>
        `;
        tabelaBody.innerHTML += rreshti;
    });
}

function shfaqMesazhGabimi(mesazhi) {
    const errorBox = document.createElement("div");
    errorBox.style.position = "fixed";
    errorBox.style.bottom = "20px";
    errorBox.style.right = "20px";
    errorBox.style.backgroundColor = "#e53e3e";
    errorBox.style.color = "white";
    errorBox.style.padding = "15px 25px";
    errorBox.style.borderRadius = "8px";
    errorBox.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    errorBox.style.zIndex = "9999";
    errorBox.innerText = mesazhi;

    document.body.appendChild(errorBox);

    setTimeout(() => { errorBox.remove(); }, 5000);
}
