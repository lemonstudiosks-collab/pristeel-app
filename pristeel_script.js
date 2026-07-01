// =========================================================================
// 1. KONFIGURIMI I PLATFORMËS (SUPABASE DHE GEMINI API)
// =========================================================================
// KUJDES: Zëvendëso këto vlera me çelësat e tu realë!
const SUPABASE_URL = "https://ismxqfqzkchbsrbhucf.supabase.co"; 
const SUPABASE_ANON_KEY = "VENDOS_KËTU_ANON_KEY_TË_SUPABASE";
const GEMINI_API_KEY = "VENDOS_KËTU_API_KEY_TË_GEMINI"; 

// Inicializimi i klientit të Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Ndihmës për vonesat (përdoret për Exponential Backoff gjatë thirrjes së AI)
const delay = ms => new Promise(res => setTimeout(res, ms));

// =========================================================================
// 2. NGARKIMI I FAQES DHE LIDHJA E BUTONAVE (EVENT LISTENERS)
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!supabaseClient) {
        console.error("Supabase nuk u ngarkua! Kontrollo nëse ke shtuar CDN-in e Supabase në index.html ose pristeel-procurement.html.");
    }

    // Gjejmë butonin "Analizo me AI"
    const btnAnalizo = document.querySelector(".btn-analizo") || 
                       document.getElementById("btnAnalizo") || 
                       document.querySelector("button.btn-primary") ||
                       document.querySelector("button"); // Fallback te butoni i parë

    if (btnAnalizo) {
        btnAnalizo.addEventListener("click", analizoDheBartoTeBOM);
    } else {
        // Provë rezervë nëse butoni nuk gjehet direkt
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
        // I. Merr tekstin e paorganizuar nga kutia e tekstit (Textarea)
        const textarea = document.querySelector("textarea") || document.querySelector(".teksti-raw");
        const tekstiRaw = textarea ? textarea.value : "";
        
        // II. Merr emrin e projektit nga inputi
        const inputProjektit = document.querySelector('input[placeholder*="STACON"]') || 
                               document.querySelector('.emri-projektit') ||
                               document.getElementById("emriProjektit") ||
                               document.querySelector('input[type="text"]'); // Fallback te inputi i parë i tekstit
        
        const emriProjektit = inputProjektit && inputProjektit.value.trim() !== "" ? inputProjektit.value : "Projekt i Ri Çeliku";

        if (!tekstiRaw || tekstiRaw.trim() === "") {
            shfaqMesazhGabimi("Ju lutem ngarkoni një dokument ose ngjitni tekstin e materialit më parë!");
            butoni.innerText = tekstiOrigjinal;
            butoni.disabled = false;
            return;
        }

        // III. Thirrja e Gemini API me Exponential Backoff (Maksimumi 5 tentime)
        const listaBOMStrukturuar = await thirrGeminiAPI(tekstiRaw);

        if (!listaBOMStrukturuar || listaBOMStrukturuar.length === 0) {
            throw new Error("AI nuk arriti të nxjerrë asnjë pozicion të vlefshëm.");
        }

        // IV. Ruajtja e të dhënave në tabelën e Supabase `bom_items`
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

        // V. Ndryshimi i pamjes vizuale (Navigimi automatik te tab-i BOM)
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
// 4. THIRRJA E MODELIT GEMINI (ME RETRY LOGIC / EXPONENTIAL BACKOFF)
// =========================================================================
async function thirrGeminiAPI(tekstiPerAnalize) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
    
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
            responseMimeType: "application/json" // Siguron që Gemini të kthejë vetëm strukturë JSON
        }
    };

    // Implementimi i Exponential Backoff (Rregulla e API-së)
    let tentimi = 0;
    const vonesat = [1000, 2000, 4000, 8000, 16000]; // 1s, 2s, 4s, 8s, 16s

    while (tentimi < 5) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gabim nga serveri i Google: ${response.statusText}`);
            }

            const result = await response.json();
            let tekstNgaAI = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!tekstNgaAI) {
                throw new Error("Përgjigjja e AI është e zbrazët.");
            }

            // Pastrojmë kodin në rast se ka thonjëza markdown aksidentale
            tekstNgaAI = tekstNgaAI.replace(/```json/g, "").replace(/```/g, "").trim();
            
            return JSON.parse(tekstNgaAI);

        } catch (error) {
            tentimi++;
            if (tentimi >= 5) {
                throw new Error("Lidhja me inteligjencën artificiale dështoi pas disa tentimesh. Ju lutem kontrolloni internetin ose API Key-n tuaj.");
            }
            await delay(vonesat[tentimi - 1]);
        }
    }
}

// =========================================================================
// 5. NAVIGIMI DHE PËRDITËSIMI I PAMJES (BOM DASHBOARD)
// =========================================================================
async function ndryshoFaqenAktive(emriFaqes, emriProjektit) {
    // 1. Përditëso menunë aktive në shiritin anësor (Sidebar)
    const menute = document.querySelectorAll(".prosesi div, .prosesi li, .prosesi a, .sidebar a");
    menute.forEach(m => {
        if (m.innerText.toLowerCase().includes(emriFaqes.toLowerCase())) {
            m.classList.add("active");
        } else {
            m.classList.remove("active");
        }
    });

    // 2. Lexojmë të dhënat e sapokrijuara nga Supabase
    if (supabaseClient) {
        const { data: bomItems, error } = await supabaseClient
            .from('bom_items')
            .select('*')
            .eq('project_name', emriProjektit);

        if (error) {
            console.error("Gabim gjatë leximit të të dhënave nga Supabase:", error);
            return;
        }

        // 3. Shfaqim panelin e BOM dhe fshehim panelin e Importit
        const seksioniImport = document.getElementById("importSection") || 
                               document.querySelector(".import-dokument-container") || 
                               document.getElementById("import-section") ||
                               document.querySelector(".main-content > div"); // Fallback te div-i i parë i përmbajtjes

        const seksioniBOM = document.getElementById("bomSection") || 
                             document.querySelector(".bom-container") || 
                             document.getElementById("bom-section");

        if (seksioniImport) seksioniImport.style.display = "none";
        if (seksioniBOM) {
            seksioniBOM.style.display = "block";
            // Ndërtojmë dhe shfaqim tabelën vizualisht
            ndërtoTabelenBOM(bomItems);
        } else {
            // Nëse nuk keni ndarë akoma seksionet me ID, shfaqim të dhënat në konsolë
            console.log("Të dhënat e nxjerra për BOM:", bomItems);
            shfaqMesazhGabimi("Të dhënat u ruajtën! Por seksioni 'BOM' në HTML duhet të ketë id='bomSection' që të shfaqet automatikisht.");
        }
    }
}

// Ndërton rreshtat e tabelës te faqja BOM
function ndërtoTabelenBOM(teDhenat) {
    const tabelaBody = document.querySelector("#tabelaBOM tbody") || 
                       document.querySelector(".tabela-bom-items") || 
                       document.getElementById("tabelaBOMBody") ||
                       document.querySelector("table tbody"); // Fallback te trupi i parë i tabelës
                       
    if (!tabelaBody) {
        console.error("Nuk u gjet tabela ku duhet të vendosen materialet e BOM-it!");
        return;
    }

    tabelaBody.innerHTML = ""; // Pastrojmë rreshtat testues ekzistues

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

// Funksion i thjeshtë për të shfaqur mesazhet e gabimit pa përdorur alert()
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

    setTimeout(() => {
        errorBox.remove();
    }, 5000);
}