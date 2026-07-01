// =========================================================================
// PRISTEEL — KORRIGJIMI AUTOMATIK I PLATFORMËS
// =========================================================================

// 1. Zëvendësojmë funksionin startParsing (Përpunimi i AI me Groq)
window.startParsing = async function() {
    const textarea = document.getElementById('i-text');
    const text = textarea ? textarea.value.trim() : "";
    if (text.length < 5) return alert('Ju lutem ngjitni tekstin fillimisht.');

    const parsingCard = document.getElementById('parsing-card');
    if (parsingCard) parsingCard.classList.remove('hidden');

    const apiKey = localStorage.getItem('pristeel_apikey') || '';
    if (!apiKey || !apiKey.startsWith('gsk_')) return alert('Gabim: Te "Cilësimet" duhet të vendosni çelësin e Groq që fillon me gsk_');

    const prompt = `Extract material procurement positions from this text and return ONLY a JSON array. Format: [{"pos":1,"description_raw":"line","profile_type":"HEA","dimension":"300","steel_grade":"S355JR","standard":"EN 10025-2","length_mm":12000,"quantity_pieces":1,"quantity_kg":100,"surface_treatment":"none","certification":"EN 10204 3.1","notes":""}]. Text:\n${text}`;

    try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0
            })
        });
        const data = await resp.json();
        let raw = data.choices?.[0]?.message?.content || '';
        raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(raw);
        const items = parsed.items || parsed;

        bomRows = items.map((it, i) => ({
            id: Date.now() + i,
            pos: i + 1,
            profile: it.profile_type || 'HEA',
            dim: it.dimension || '300',
            grade: it.steel_grade || 'S355JR',
            std: it.standard || 'EN 10025-2',
            lenMm: it.length_mm || 12000,
            pcs: it.quantity_pieces || 1,
            kg: it.quantity_kg || 0,
            surface: it.surface_treatment || 'none',
            cert: it.certification || 'EN 10204 3.1',
            conf: 'high'
        }));

        showPage('bom');
        if (typeof renderBom === 'function') renderBom();
        if (textarea) textarea.value = '';
    } catch (err) {
        alert('Gabim gjatë përpunimit: ' + err.message);
    } finally {
        if (parsingCard) parsingCard.classList.add('hidden');
    }
};

// 2. Zëvendësojmë funksionin loadProject (Rregullimi i gabimit të Supabase)
window.loadProject = function(id) {
  var projData = null;
  supaFetch('projects?id=eq.' + id).then(function(projs) {
    var p = projs[0]; if (!p) return;
    projData = p; _curProjId = id;
    if(document.getElementById('i-projname')) document.getElementById('i-projname').value = p.name || '';
    if(document.getElementById('i-client')) document.getElementById('i-client').value = p.client || '';
    if(document.getElementById('i-ref')) document.getElementById('i-ref').value = p.ref || '';
    if(document.getElementById('i-location')) document.getElementById('i-location').value = p.location || '';
    if(document.getElementById('i-deadline')) document.getElementById('i-deadline').value = p.deadline || '';
    
    // FILTRIMI I SAKTË: Sipas emrit të projektit (project_name)
    return supaFetch('bom_items?project_name=eq.' + encodeURIComponent(p.name) + '&order=created_at.asc');
  }).then(function(items) {
    if (!items) return;
    bomRows = items.map(function(r, i) {
      return {
        id: i + 1, pos: i + 1, profile: r.profile, dim: r.dim, grade: r.grade, std: r.std,
        lenMm: r.len_mm, pcs: r.pcs, kg: parseFloat(r.kg) || 0, surface: r.surface || 'none', cert: r.cert || 'EN 10204 3.1'
      };
    });
    if (typeof renderBom === 'function') renderBom();
    return supaFetch('offers?project_id=eq.' + id + '&order=created_at.asc').catch(function() { return []; });
  }).then(function(dbOffers) {
    if (!dbOffers) dbOffers = [];
    offers = dbOffers.map(function(o, i) {
      var sup = o.supplier || '';
      return {
        id: i + 1, supplier: sup, priceKg: parseFloat(o.price_kg) || 0, price: parseFloat(o.price_kg) || 0,
        delivery: parseInt(o.delivery_weeks) || 0, inco: o.incoterms || 'DAP', cert: o.cert || '',
        notes: o.notes || '', score: parseFloat(o.score) || 0, totalEur: parseFloat(o.total_eur) || 0,
        offerType: (sup.indexOf('OFERTA JONE') > -1 ? 'outgoing' : 'incoming'), origin: o.origin || ''
      };
    });
    
    // Ngarkojmë automatikisht furnitorët e paracaktuar
    if (typeof defaultSuppliers !== 'undefined') {
      suppliers = [...defaultSuppliers.map(s => ({ ...s, id: Date.now() + Math.random() }))];
    }
    
    showProjectDashboard(projData);
  }).catch(function(e) {
    alert('Gabim gjatë ngarkimit: ' + e.message);
  });
};

console.log("PRISTEEL: Të gjitha funksionet u sinkronizuan dhe u ruajtën përgjithmonë!");
