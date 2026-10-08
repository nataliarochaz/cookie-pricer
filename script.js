const KEY = "cookie-pricer-v1";

const defaultData = {
  ingredients: [],
  packaging: [],
  recipes: [],
  salesFormats: [],
  settings: {
    targetMargin: 50,
    indirectCosts: []
  }
};

let db = loadDB();
let currentIngredientTab = "ingredients";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function num(v) { return Math.max(0, Number(v) || 0); }
function uid(prefix="id") { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function money(v) { return Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"}); }
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function escapeAttr(s){return escapeHtml(s)}

function normalizeDB(saved) {
  const incoming = saved || {};
  const out = {
    ...structuredClone(defaultData),
    ...incoming,
    ingredients: Array.isArray(incoming.ingredients) ? incoming.ingredients : [],
    packaging: Array.isArray(incoming.packaging) ? incoming.packaging : [],
    recipes: Array.isArray(incoming.recipes) ? incoming.recipes : [],
    salesFormats: Array.isArray(incoming.salesFormats) ? incoming.salesFormats : [],
    settings: {...defaultData.settings, ...(incoming.settings || {})}
  };

  // Migration from the first V1: old formats lived inside each recipe.
  const knownBySignature = new Map();
  const signature = (f) => JSON.stringify({
    name: String(f?.name || "Formato de venda").trim().toLowerCase(),
    cookieCount: num(f?.cookieCount) || 1,
    packaging: (f?.packaging || []).map(p => ({packagingId:p.packagingId, quantity:num(p.quantity)||1}))
  });
  const findOrCreateFormat = (f) => {
    const sig = signature(f);
    if (knownBySignature.has(sig)) return knownBySignature.get(sig);
    const existing = out.salesFormats.find(x => signature(x) === sig);
    if (existing) { knownBySignature.set(sig, existing.id); return existing.id; }
    const item = {
      id: uid("fmt"),
      name: String(f?.name || "Formato de venda").trim() || "Formato de venda",
      cookieCount: num(f?.cookieCount) || 1,
      packaging: (f?.packaging || []).map(p => ({packagingId:p.packagingId, quantity:num(p.quantity)||1})).filter(p=>p.packagingId)
    };
    out.salesFormats.push(item);
    knownBySignature.set(sig, item.id);
    return item.id;
  };
  out.recipes = out.recipes.map(r => {
    let formatIds = Array.isArray(r.formatIds) ? [...r.formatIds] : [];
    if (!formatIds.length && Array.isArray(r.formats)) formatIds = r.formats.map(findOrCreateFormat);
    const next = {...r, formatIds};
    delete next.formats;
    return next;
  });

  // Migration of the old combined gas/energy and labor settings.
  if (!Array.isArray(out.settings.indirectCosts)) out.settings.indirectCosts = [];
  if (num(incoming.settings?.energy) > 0 && !out.settings.indirectCosts.some(x=>x.legacyKey === "energy")) {
    out.settings.indirectCosts.push({id:uid("cost"), name:"Gás / energia (configuração antiga)", price:num(incoming.settings.energy), packageQty:1, packageUnit:"un", mode:"perRecipe", usage:1, legacyKey:"energy"});
  }
  if (num(incoming.settings?.labor) > 0 && !out.settings.indirectCosts.some(x=>x.legacyKey === "labor")) {
    out.settings.indirectCosts.push({id:uid("cost"), name:"Mão de obra", price:num(incoming.settings.labor), packageQty:1, packageUnit:"un", mode:"perRecipe", usage:1, legacyKey:"labor"});
  }
  delete out.settings.energy;
  delete out.settings.labor;
  return out;
}

function loadDB() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return normalizeDB(saved);
  } catch { return structuredClone(defaultData); }
}
function saveDB() {
  localStorage.setItem(KEY, JSON.stringify(db));
  const el = $("#saveStatus");
  if (el) { el.textContent = "● Salvo automaticamente"; el.style.color = "var(--green)"; }
}

function unitLabel(unit) { return {g:"g",kg:"kg",ml:"ml",l:"L",un:"un",m:"m",cm:"cm"}[unit] || unit; }
function baseQuantity(qty, unit) {
  qty = num(qty);
  if (unit === "kg" || unit === "l") return qty * 1000;
  if (unit === "cm") return qty / 100;
  return qty;
}
function baseUnit(unit) {
  if (unit === "kg") return "g";
  if (unit === "l") return "ml";
  if (unit === "cm") return "cm";
  return unit;
}
function costPerBase(item) {
  const q = baseQuantity(item.packageQty, item.packageUnit);
  return q > 0 ? num(item.price) / q : 0;
}
function ingredientCost(item) {
  const ref = db.ingredients.find(x => x.id === item.ingredientId);
  if (!ref) return 0;
  const amount = baseQuantity(item.amount, item.unit);
  if (baseUnit(ref.packageUnit) !== baseUnit(item.unit)) return 0;
  return amount * costPerBase(ref);
}
function packagingCost(item) {
  const ref = db.packaging.find(x => x.id === item.packagingId);
  return ref ? num(item.quantity) * costPerBase(ref) : 0;
}

function indirectCostValue(item) {
  if (!item) return 0;
  if (item.mode === "perRecipe") return num(item.price);
  const q = baseQuantity(item.packageQty, item.packageUnit);
  if (q <= 0) return 0;
  return num(item.price) / q * baseQuantity(item.usage, item.packageUnit);
}
function totalIndirectPerRecipe() {
  return (db.settings.indirectCosts || []).reduce((s,x)=>s+indirectCostValue(x),0);
}

function recipeStats(recipe) {
  const ingredientTotal = (recipe.ingredients || []).reduce((s, i) => s + ingredientCost(i), 0);
  const estimatedMass = (recipe.ingredients || []).reduce((s, i) => {
    if (baseUnit(i.unit) === "g") return s + baseQuantity(i.amount, i.unit);
    return s;
  }, 0);
  const doughMass = num(recipe.massOverride) || estimatedMass;
  const individualMass = num(recipe.cookieMass) || 80;
  const estimatedYield = individualMass > 0 ? Math.floor(doughMass / individualMass) : 0;
  const realYield = num(recipe.realYield);
  const yieldUsed = realYield > 0 ? realYield : estimatedYield;
  // Recheio is intentionally entered per cookie, not for the whole batch.
  const fillingPerCookie = (recipe.fillingIngredients || []).reduce((s, i) => s + ingredientCost(i), 0);
  const indirectPerRecipe = totalIndirectPerRecipe();
  const baseBatchCost = ingredientTotal + indirectPerRecipe;
  const baseCostPerCookie = yieldUsed > 0 ? baseBatchCost / yieldUsed : 0;
  const costPerCookie = baseCostPerCookie + fillingPerCookie;
  return {
    ingredientTotal, fillingPerCookie, indirectPerRecipe, baseBatchCost,
    totalCost: baseBatchCost + (fillingPerCookie * yieldUsed),
    estimatedMass:doughMass, individualMass, estimatedYield, yieldUsed, costPerCookie, baseCostPerCookie
  };
}

function pricingForCost(cost) {
  const margin = Math.min(95, Math.max(1, num(db.settings.targetMargin) || 50));
  const ideal = cost > 0 ? cost / (1 - margin/100) : 0;
  return {replacement:cost, ideal, targetMargin:margin};
}
function marginFor(price,cost) { return num(price)>0 ? ((num(price)-cost)/num(price))*100 : null; }

function getFormat(id){ return db.salesFormats.find(x=>x.id===id); }
function formatCost(format, stats) {
  if (!format) return {packCost:0,cookieCount:1,total:stats.costPerCookie,saleTotal:0,costPerCookie:stats.costPerCookie};
  const count = num(format.cookieCount) || 1;
  const packCost = (format.packaging || []).reduce((s,p)=>s+packagingCost(p),0);
  const total = stats.costPerCookie * count + packCost;
  return {packCost,cookieCount:count,total,costPerCookie:count>0?total/count:total,saleTotal:0};
}

function navigate(page) {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  const meta = {dashboard:["VISÃO GERAL","Dashboard"], ingredients:["CADASTRO","Insumos"], recipes:["PRODUÇÃO","Receitas"], settings:["SISTEMA","Configurações"]}[page];
  $("#pageEyebrow").textContent = meta[0]; $("#pageTitle").textContent = meta[1];
  if (page === "dashboard") renderDashboard();
  if (page === "ingredients") renderIngredients();
  if (page === "recipes") renderRecipes();
  if (page === "settings") renderSettings();
}
$$(".nav-item").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
$$("[data-go]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.go)));

function infoIcon(text){ return `<span class="info-tip" tabindex="0" title="${escapeAttr(text)}">i</span>`; }

function renderDashboard() {
  $("#statRecipes").textContent = db.recipes.length;
  $("#statIngredients").textContent = db.ingredients.length + db.packaging.length;
  const stats = db.recipes.map(recipeStats);
  const avgCost = stats.length ? stats.reduce((s,x)=>s+x.costPerCookie,0)/stats.length : 0;
  const priced = db.recipes.map((r,i)=>({r,s:stats[i],p:num(r.salePrice)})).filter(x=>x.p>0);
  const avgMargin = priced.length ? priced.reduce((s,x)=>s+(marginFor(x.p,x.s.costPerCookie)||0),0)/priced.length : 0;
  $("#statAvgCost").textContent = money(avgCost);
  $("#statAvgMargin").innerHTML = `${avgMargin.toFixed(1)}% ${infoIcon("Margem é a porcentagem do preço de venda que sobra depois de pagar o custo do cookie. Ex.: vender por R$ 10 e gastar R$ 2 significa R$ 8 de lucro bruto e 80% de margem.")}`;

  const list = $("#dashboardProducts");
  if (!db.recipes.length) { list.className="product-list empty"; list.textContent="Nenhuma receita cadastrada."; }
  else {
    list.className="product-list";
    list.innerHTML = db.recipes.map((r,i) => {
      const s=stats[i], price=num(r.salePrice), margin=marginFor(price,s.costPerCookie);
      return `<div class="format-card"><strong>${escapeHtml(r.name)}</strong><div class="format-meta">Custo ${money(s.costPerCookie)} · ${price?`Venda ${money(price)} · Margem ${margin.toFixed(1)}%`:`sem preço de venda`}</div></div>`;
    }).join("");
  }
  if (!priced.length) { $("#bestMargin").textContent="—"; $("#bestMarginMeta").textContent="Cadastre uma receita e um preço de venda."; }
  else {
    priced.sort((a,b)=>(marginFor(b.p,b.s.costPerCookie)||0)-(marginFor(a.p,a.s.costPerCookie)||0));
    const x=priced[0], margin=marginFor(x.p,x.s.costPerCookie);
    $("#bestMargin").textContent=x.r.name;
    $("#bestMarginMeta").textContent=`${margin.toFixed(1)}% de margem · ${money(x.p-x.s.costPerCookie)} de lucro bruto por unidade`;
  }
}

function renderIngredients() {
  const arr = currentIngredientTab === "ingredients" ? db.ingredients : db.packaging;
  const target = $("#ingredientTable");
  if (!arr.length) { target.innerHTML=`<div class="empty">Nenhum ${currentIngredientTab==="ingredients"?"ingrediente":"item de embalagem"} cadastrado.<br><button class="ghost" onclick="openItemModal('${currentIngredientTab}')">Adicionar agora</button></div>`; return; }
  target.innerHTML = `<table class="data-table"><thead><tr><th>Nome</th><th>Compra</th><th>Unidade</th><th>Custo/base</th><th>Ações</th></tr></thead><tbody>${arr.map(x=>`<tr><td><strong>${escapeHtml(x.name)}</strong></td><td>${money(x.price)}</td><td>${x.packageQty} ${unitLabel(x.packageUnit)}</td><td>${money(costPerBase(x))}/${baseUnit(x.packageUnit)}</td><td><div class="actions"><button class="icon-btn" onclick="openItemModal('${currentIngredientTab}','${x.id}')">✎</button><button class="icon-btn" onclick="deleteItem('${currentIngredientTab}','${x.id}')">🗑</button></div></td></tr>`).join("")}</tbody></table>`;
}
$$("[data-ingredient-tab]").forEach(b=>b.addEventListener("click",()=>{currentIngredientTab=b.dataset.ingredientTab;$$(`[data-ingredient-tab]`).forEach(x=>x.classList.toggle("active",x===b));renderIngredients();}));
$("#newIngredientBtn").addEventListener("click",()=>openItemModal("ingredients"));
$("#newPackagingBtn").addEventListener("click",()=>openItemModal("packaging"));

function openItemModal(type,id=null) {
  const arr=type==="ingredients"?db.ingredients:db.packaging, old=id?arr.find(x=>x.id===id):null;
  const title=type==="ingredients"?"Ingrediente":"Embalagem";
  const units=type==="ingredients"?["g","kg","ml","l","un"]:["un","g","kg","ml","l","m","cm"];
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>${old?"Editar":"Novo"} ${title.toLowerCase()}</h2><p class="recipe-meta">O sistema transforma o preço de compra em custo por g, ml, metro ou unidade.</p></div><button class="close" onclick="closeModal()">✕</button></div><div class="form-grid two"><label>Nome<input id="itemName" value="${escapeAttr(old?.name||"")}" placeholder="${type==="ingredients"?"Ex.: Manteiga":"Ex.: Papel manteiga"}"></label><label>Preço pago (R$)<input id="itemPrice" type="number" min="0" step="0.01" value="${old?.price??""}"></label><label>Quantidade comprada<input id="itemQty" type="number" min="0" step="0.001" value="${old?.packageQty??""}"></label><label>Unidade<select id="itemUnit">${units.map(u=>`<option value="${u}" ${old?.packageUnit===u?"selected":""}>${unitLabel(u)}</option>`).join("")}</select></label></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveItem('${type}','${id||""}')">Salvar</button></div>`;
  openModal();
}
function saveItem(type,id) {
  const item={id:id||uid(type==="ingredients"?"ing":"pack"),name:$("#itemName").value.trim(),price:num($("#itemPrice").value),packageQty:num($("#itemQty").value),packageUnit:$("#itemUnit").value};
  if(!item.name||!item.packageQty){alert("Preencha nome e quantidade comprada.");return;}
  const arr=type==="ingredients"?db.ingredients:db.packaging, idx=arr.findIndex(x=>x.id===id); if(idx>=0)arr[idx]=item; else arr.push(item);
  saveDB();closeModal();renderIngredients();renderRecipes();renderDashboard();
}
function deleteItem(type,id) {
  const used = type==="ingredients" && db.recipes.some(r=>[...(r.ingredients||[]),...(r.fillingIngredients||[])].some(i=>i.ingredientId===id));
  const packUsed = type==="packaging" && db.salesFormats.some(f=>(f.packaging||[]).some(p=>p.packagingId===id));
  if(used){alert("Esse ingrediente está sendo usado em uma receita. Remova-o da receita antes de excluir.");return;}
  if(packUsed){alert("Essa embalagem está sendo usada em um formato de venda salvo. Remova-a do formato antes de excluir.");return;}
  if(!confirm("Excluir este item?"))return;
  const arr=type==="ingredients"?db.ingredients:db.packaging; const idx=arr.findIndex(x=>x.id===id); if(idx>=0)arr.splice(idx,1); saveDB();renderIngredients();renderRecipes();
}

function renderRecipes() {
  const el=$("#recipeList");
  if(!db.recipes.length){el.innerHTML=`<div class="card empty">Nenhuma receita cadastrada.<br><button class="primary" onclick="openRecipeModal()">Criar primeira receita</button></div>`;return;}
  el.innerHTML=db.recipes.map(r=>{
    const s=recipeStats(r), price=num(r.salePrice), margin=marginFor(price,s.costPerCookie), p=pricingForCost(s.costPerCookie);
    return `<article class="recipe-card"><h3>${escapeHtml(r.name)}</h3><div class="recipe-meta">${r.cookieMass||80}g de massa · ${s.estimatedYield||0} un. estimadas ${r.realYield?`· ${r.realYield} reais`:""}</div><div class="recipe-numbers"><div class="mini-stat"><span>Custo/un.</span><strong>${money(s.costPerCookie)}</strong></div><div class="mini-stat"><span>Venda</span><strong>${price?money(price):"—"}</strong></div><div class="mini-stat"><span>Margem ${infoIcon("Margem = lucro bruto ÷ preço de venda. É a porcentagem do preço que sobra depois do custo.")}</span><strong>${margin!==null?margin.toFixed(0)+"%":"—"}</strong></div></div><div class="price-suggestions"><div><span>Mínimo seguro ${infoIcon("É o valor mínimo para recuperar o custo estimado de ingredientes, recheio, custos indiretos e, quando aplicável, embalagem do formato. Não inclui lucro.")}</span><strong>${money(p.replacement)}</strong></div><div><span>Ideal ${infoIcon(`Sugestão de preço para atingir ${p.targetMargin.toFixed(0)}% de margem. Você pode alterar essa meta em Configurações.`)}</span><strong>${money(p.ideal)}</strong></div></div><div class="recipe-formats">${(r.formatIds||[]).map(id=>formatMarkup(id,s,price)).join("")}</div><div class="recipe-card-footer"><span class="recipe-meta">${(r.formatIds||[]).length} formato(s) de venda</span><div class="actions"><button class="icon-btn" onclick="openRecipeModal('${r.id}')">✎</button><button class="icon-btn" onclick="deleteRecipe('${r.id}')">🗑</button></div></div></article>`;
  }).join("");
}
$("#newRecipeBtn").addEventListener("click",()=>openRecipeModal());

function ingredientOptions(selected="") { return db.ingredients.length ? db.ingredients.map(x=>`<option value="${x.id}" ${x.id===selected?"selected":""}>${escapeHtml(x.name)}</option>`).join("") : `<option value="">Cadastre ingredientes primeiro</option>`; }
function addIngredientRow(container,data={}) {
  const row=document.createElement("div");row.className="ingredient-row";
  row.innerHTML=`<select class="ing-select">${ingredientOptions(data.ingredientId)}</select><input class="ing-amount" type="number" min="0" step="0.1" value="${data.amount??""}" placeholder="Qtd"><select class="ing-unit"><option value="g" ${data.unit==="g"?"selected":""}>g</option><option value="kg" ${data.unit==="kg"?"selected":""}>kg</option><option value="ml" ${data.unit==="ml"?"selected":""}>ml</option><option value="l" ${data.unit==="l"?"selected":""}>L</option><option value="un" ${data.unit==="un"?"selected":""}>un</option></select><button class="icon-btn remove-row">×</button>`;
  row.querySelector(".remove-row").onclick=()=>row.remove();container.appendChild(row);
}

function formatMarkup(id,stats,price) {
  const f=getFormat(id); if(!f) return "";
  const c=formatCost(f,stats); const saleTotal=price?price*c.cookieCount:0; const formatMargin=saleTotal?marginFor(saleTotal,c.total):null;
  const names=(f.packaging||[]).map(p=>{const x=db.packaging.find(a=>a.id===p.packagingId);return x?`${escapeHtml(x.name)} × ${p.quantity}`:"";}).filter(Boolean).join(" + ");
  const p=pricingForCost(c.costPerCookie);
  return `<div class="format-card"><strong>${escapeHtml(f.name)}</strong><div class="format-meta">${c.cookieCount} cookie(s) · ${names||"sem embalagem"}</div><div class="format-meta">Cookies: ${money(stats.costPerCookie*c.cookieCount)} · Embalagem: ${money(c.packCost)} · <strong>Total: ${money(c.total)}</strong>${saleTotal?` · Venda: ${money(saleTotal)} · Margem: ${formatMargin.toFixed(1)}%`:""}</div><div class="format-meta">Mínimo seguro: <strong>${money(c.total)}</strong> · Ideal (${p.targetMargin.toFixed(0)}%): <strong>${money(p.ideal*c.cookieCount)}</strong></div></div>`;
}

function openRecipeModal(id=null, preselectedFormats=null) {
  const old=id?db.recipes.find(x=>x.id===id):null;
  const selectedFormats=preselectedFormats ? [...preselectedFormats] : [...(old?.formatIds||[])];
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>${old?"Editar":"Nova"} receita</h2><p class="recipe-meta">Cadastre a receita base. O recheio abaixo é calculado pelo consumo de cada cookie.</p></div><button class="close" onclick="closeModal()">✕</button></div><div class="form-grid two"><label>Nome da receita<input id="recipeName" value="${escapeAttr(old?.name||"")}" placeholder="Ex.: Cookie tradicional baunilha"></label><label>Preço de venda por unidade (R$)<input id="salePrice" type="number" min="0" step="0.01" value="${old?.salePrice??""}"></label><label>Peso de massa por cookie (g)<input id="cookieMass" type="number" min="0" step="1" value="${old?.cookieMass??80}"></label><label>Peso de recheio por cookie (g) <span class="recipe-meta">informativo</span><input id="fillingMass" type="number" min="0" step="0.1" value="${old?.fillingMass??20}"></label><label>Rendimento real (un.) <span class="recipe-meta">opcional</span><input id="realYield" type="number" min="0" step="1" value="${old?.realYield??""}" placeholder="Se vazio, usa o estimado"></label><label>Peso real da receita (g) <span class="recipe-meta">opcional</span><input id="massOverride" type="number" min="0" step="1" value="${old?.massOverride??""}" placeholder="Se vazio, soma os ingredientes"></label></div><hr class="section-divider"><div class="card-head"><div><h3>Ingredientes da massa</h3><p>Quantidade usada em uma receita inteira.</p></div><button class="secondary small" id="addIng">+ Ingrediente</button></div><div id="ingRows"></div><hr class="section-divider"><div class="card-head"><div><h3>Recheio por cookie</h3><p>Digite aqui a quantidade que vai em <strong>cada cookie</strong>, não a quantidade da receita inteira.</p></div><button class="secondary small" id="addFill">+ Ingrediente</button></div><div id="fillRows"></div><div class="notice compact">Ex.: se cada cookie leva 20 g de Nutella, coloque <strong>20 g</strong> aqui. O sistema multiplica pelo rendimento para calcular o consumo da receita.</div><hr class="section-divider"><div class="card-head"><div><h3>Formatos de venda</h3><p>Os formatos ficam salvos globalmente e podem ser reutilizados em várias receitas.</p></div><div class="button-row"><button class="secondary small" id="newFormat">+ Novo formato</button></div></div><div class="assign-format-row"><select id="formatPicker"><option value="">Selecione um formato salvo</option>${db.salesFormats.map(f=>`<option value="${f.id}">${escapeHtml(f.name)} · ${f.cookieCount||1} cookie(s)</option>`).join("")}</select><button class="secondary small" id="assignFormat">Atribuir formato</button></div><div id="assignedFormats"></div><div class="notice compact">Ex.: salve uma vez o formato <strong>Delivery</strong> com saquinho + caixa. Depois basta atribuí-lo ao Nutella, Ovomaltine e outras receitas.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveRecipe('${id||""}')">Salvar receita</button></div>`;
  openModal();
  const ingRows=$("#ingRows"),fillRows=$("#fillRows");
  (old?.ingredients||[]).forEach(x=>addIngredientRow(ingRows,x));
  (old?.fillingIngredients||[]).forEach(x=>addIngredientRow(fillRows,x));
  $("#addIng").onclick=()=>addIngredientRow(ingRows);
  $("#addFill").onclick=()=>addIngredientRow(fillRows);
  $("#newFormat").onclick=()=>openSalesFormatModal(null,(newId)=>{ if(newId) selectedFormats.push(newId); closeModal(); openRecipeModal(id, selectedFormats); });
  $("#assignFormat").onclick=()=>{const v=$("#formatPicker").value;if(!v)return;selectedFormats.push(v);refreshAssignedFormats(selectedFormats);};
  refreshAssignedFormats(selectedFormats);
}
function refreshAssignedFormats(ids){
  const unique=[...new Set(ids)].filter(id=>getFormat(id));
  const el=$("#assignedFormats"); if(!el)return;
  el.innerHTML=unique.length?unique.map(id=>{const f=getFormat(id);const pack=(f.packaging||[]).map(p=>{const x=db.packaging.find(a=>a.id===p.packagingId);return x?`${x.name} × ${p.quantity}`:"";}).filter(Boolean).join(" + ");return `<div class="assigned-format"><div><strong>${escapeHtml(f.name)}</strong><span>${f.cookieCount||1} cookie(s) · ${escapeHtml(pack||"sem embalagem")}</span></div><button class="icon-btn remove-assigned" data-id="${id}">×</button></div>`}).join(""):`<div class="empty compact">Nenhum formato atribuído.</div>`;
  el.querySelectorAll(".remove-assigned").forEach(btn=>btn.onclick=()=>{const i=ids.indexOf(btn.dataset.id);if(i>=0)ids.splice(i,1);refreshAssignedFormats(ids);});
}

function openSalesFormatModal(id=null,onSaved=null){
  const old=id?getFormat(id):null;
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>${old?"Editar":"Novo"} formato de venda</h2><p class="recipe-meta">Crie uma combinação de embalagem e quantidade de cookies para reutilizar em qualquer receita.</p></div><button class="close" onclick="closeModal()">✕</button></div><div class="form-grid two"><label>Nome do formato<input id="fmtName" value="${escapeAttr(old?.name||"")}" placeholder="Ex.: Delivery"></label><label>Quantidade de cookies<input id="fmtCookies" type="number" min="1" step="1" value="${old?.cookieCount??1}"></label></div><div class="section-divider"></div><div class="card-head"><div><h3>Embalagens</h3><p>Você pode combinar mais de uma embalagem.</p></div><button class="secondary small" id="addPack">+ Embalagem</button></div><div id="packRows"></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" id="saveFmt">Salvar formato</button></div>`;
  openModal();
  (old?.packaging||[]).forEach(x=>addPackRow($("#packRows"),x));
  $("#addPack").onclick=()=>addPackRow($("#packRows"));
  $("#saveFmt").onclick=()=>saveSalesFormat(id,onSaved);
}
function addPackRow(container,data={}){
  const row=document.createElement("div");row.className="pack-row";
  row.innerHTML=`<select class="pack-select">${db.packaging.length?db.packaging.map(x=>`<option value="${x.id}" ${x.id===data.packagingId?"selected":""}>${escapeHtml(x.name)}</option>`).join(""):"<option value=\"\">Cadastre embalagens primeiro</option>"}</select><input class="pack-qty" type="number" min="0" step="1" value="${data.quantity??1}"><button class="icon-btn remove-row">×</button>`;
  row.querySelector(".remove-row").onclick=()=>row.remove();container.appendChild(row);
}
function saveSalesFormat(id,onSaved){
  const item={id:id||uid("fmt"),name:$("#fmtName").value.trim(),cookieCount:num($("#fmtCookies").value)||1,packaging:[...$("#packRows").querySelectorAll(".pack-row")].map(r=>({packagingId:r.querySelector(".pack-select").value,quantity:num(r.querySelector(".pack-qty").value)||1})).filter(x=>x.packagingId)};
  if(!item.name){alert("Informe o nome do formato.");return;}
  if(!item.packaging.length){alert("Adicione pelo menos uma embalagem ao formato.");return;}
  const idx=db.salesFormats.findIndex(x=>x.id===id);if(idx>=0)db.salesFormats[idx]=item;else db.salesFormats.push(item);
  saveDB();
  if(onSaved) { onSaved(item.id); } else { closeModal(); renderRecipes(); }
}
function manageSalesFormats(){
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>Formatos de venda salvos</h2><p class="recipe-meta">Edite uma combinação uma vez e reutilize em várias receitas.</p></div><button class="close" onclick="closeModal()">✕</button></div><div id="formatManagerList"></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Fechar</button><button class="primary" onclick="openSalesFormatModal(null,manageSalesFormats)">+ Novo formato</button></div>`;
  openModal();
  const list=$("#formatManagerList");
  list.innerHTML=db.salesFormats.length?db.salesFormats.map(f=>`<div class="assigned-format"><div><strong>${escapeHtml(f.name)}</strong><span>${f.cookieCount||1} cookie(s) · ${(f.packaging||[]).map(p=>{const x=db.packaging.find(a=>a.id===p.packagingId);return x?`${escapeHtml(x.name)} × ${p.quantity}`:""}).filter(Boolean).join(" + ")}</span></div><div class="actions"><button class="icon-btn" onclick="openSalesFormatModal('${f.id}',manageSalesFormats)">✎</button><button class="icon-btn" onclick="deleteSalesFormat('${f.id}')">🗑</button></div></div>`).join(""):`<div class="empty">Nenhum formato salvo ainda.</div>`;
}
function deleteSalesFormat(id){
  if(db.recipes.some(r=>(r.formatIds||[]).includes(id))){alert("Esse formato está atribuído a uma receita. Remova a atribuição antes de excluir.");return;}
  if(!confirm("Excluir este formato salvo?"))return;db.salesFormats=db.salesFormats.filter(x=>x.id!==id);saveDB();manageSalesFormats();
}

function saveRecipe(id) {
  const collectRows=(sel)=>[...document.querySelectorAll(sel+" .ingredient-row")].map(r=>({ingredientId:r.querySelector(".ing-select").value,amount:num(r.querySelector(".ing-amount").value),unit:r.querySelector(".ing-unit").value})).filter(x=>x.ingredientId&&x.amount>0);
  const assigned=[...$("#assignedFormats").querySelectorAll(".remove-assigned")].map(b=>b.dataset.id);
  const recipe={id:id||uid("rec"),name:$("#recipeName").value.trim(),salePrice:num($("#salePrice").value),cookieMass:num($("#cookieMass").value)||80,fillingMass:num($("#fillingMass").value),realYield:num($("#realYield").value),massOverride:num($("#massOverride").value),ingredients:collectRows("#ingRows"),fillingIngredients:collectRows("#fillRows"),formatIds:assigned};
  if(!recipe.name){alert("Informe o nome da receita.");return;}
  const arr=db.recipes,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=recipe;else arr.push(recipe);
  saveDB();closeModal();renderRecipes();renderDashboard();
}
function deleteRecipe(id){if(!confirm("Excluir esta receita?"))return;db.recipes=db.recipes.filter(x=>x.id!==id);saveDB();renderRecipes();renderDashboard();}

function renderSettings(){
  $("#targetMargin").value=db.settings.targetMargin??50;
  renderIndirectCosts();
}
function renderIndirectCosts(){
  const el=$("#indirectCostList"); if(!el)return;
  const costs=db.settings.indirectCosts||[];
  el.innerHTML=costs.length?costs.map(c=>`<div class="cost-item"><div><strong>${escapeHtml(c.name)}</strong><span>${indirectCostDescription(c)}</span></div><div class="cost-item-right"><strong>${money(indirectCostValue(c))}</strong><div class="actions"><button class="icon-btn" onclick="openIndirectCostModal('${c.id}')">✎</button><button class="icon-btn" onclick="deleteIndirectCost('${c.id}')">🗑</button></div></div></div>`).join(""):`<div class="empty compact">Nenhum custo indireto cadastrado.</div>`;
}
function indirectCostDescription(c){
  if(c.mode==="perRecipe")return `${money(c.price)} por receita`;
  return `${money(costPerBase(c))}/${unitLabel(baseUnit(c.packageUnit))} · consumo estimado: ${c.usage||0} ${unitLabel(c.packageUnit)} por receita`;
}
function openIndirectCostModal(id=null){
  const old=id?(db.settings.indirectCosts||[]).find(x=>x.id===id):null;
  const units=["un","g","kg","ml","l","m","cm"];
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>${old?"Editar":"Novo"} custo indireto</h2><p class="recipe-meta">Use custos fixos por receita ou materiais que tenham consumo estimado, como papel manteiga por metro.</p></div><button class="close" onclick="closeModal()">✕</button></div><div class="form-grid two"><label>Nome<input id="costName" value="${escapeAttr(old?.name||"")}" placeholder="Ex.: Papel manteiga"></label><label>Como calcular<select id="costMode"><option value="perRecipe" ${old?.mode==="perRecipe"?"selected":""}>Valor fixo por receita</option><option value="byMeasure" ${old?.mode!=="perRecipe"?"selected":""}>Por medida consumida</option></select></label><label>Preço pago (R$)<input id="costPrice" type="number" min="0" step="0.01" value="${old?.price??""}"></label><label class="measure-field">Quantidade comprada<input id="costQty" type="number" min="0" step="0.001" value="${old?.packageQty??1}"></label><label class="measure-field">Unidade<select id="costUnit">${units.map(u=>`<option value="${u}" ${old?.packageUnit===u?"selected":""}>${unitLabel(u)}</option>`).join("")}</select></label><label class="measure-field">Consumo estimado por receita<input id="costUsage" type="number" min="0" step="0.001" value="${old?.usage??1}"></label></div><div class="notice compact">Ex.: compre 10 m de papel manteiga por R$ 20 e estime 0,5 m por receita. O sistema calcula automaticamente R$ 1,00 de custo para essa receita. Se em alguma receita não usar o material, deixe o consumo estimado em 0 ou, no futuro, desative o custo.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveIndirectCost('${id||""}')">Salvar custo</button></div>`;
  openModal();
  const toggle=()=>{$$(".measure-field").forEach(x=>x.style.display=$("#costMode").value==="perRecipe"?"none":"grid")};
  $("#costMode").addEventListener("change",toggle);toggle();
}
function saveIndirectCost(id){
  const item={id:id||uid("cost"),name:$("#costName").value.trim(),mode:$("#costMode").value,price:num($("#costPrice").value),packageQty:num($("#costQty").value)||1,packageUnit:$("#costUnit").value,usage:num($("#costUsage").value)||0};
  if(!item.name||item.price<=0){alert("Informe o nome e o preço do custo.");return;}
  if(item.mode!=="perRecipe" && item.packageQty<=0){alert("Informe a quantidade comprada.");return;}
  const arr=db.settings.indirectCosts||[];const idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);db.settings.indirectCosts=arr;saveDB();closeModal();renderSettings();renderRecipes();renderDashboard();
}
function deleteIndirectCost(id){if(!confirm("Excluir este custo indireto?"))return;db.settings.indirectCosts=db.settings.indirectCosts.filter(x=>x.id!==id);saveDB();renderSettings();renderRecipes();renderDashboard();}
$("#addIndirectBtn").addEventListener("click",()=>openIndirectCostModal());
$("#manageFormatsBtn").addEventListener("click",()=>manageSalesFormats());
$("#saveSettingsBtn").addEventListener("click",()=>{db.settings.targetMargin=Math.min(95,Math.max(1,num($("#targetMargin").value)||50));saveDB();renderSettings();renderDashboard();renderRecipes();alert("Configurações salvas.");});

$("#exportBtn").addEventListener("click",()=>{
  const payload={app:"Cookie Pricer",version:2,exportedAt:new Date().toISOString(),data:db};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`cookie-pricer-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
});
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const incoming=parsed.data||parsed;if(!incoming||!Array.isArray(incoming.ingredients)||!Array.isArray(incoming.packaging)||!Array.isArray(incoming.recipes))throw new Error();if(!confirm("Restaurar este backup substituirá os dados atuais deste navegador. Continuar?"))return;db=normalizeDB(incoming);saveDB();renderSettings();renderDashboard();renderIngredients();renderRecipes();alert("Backup restaurado com sucesso.");}catch{alert("Não foi possível ler este backup.");}e.target.value="";
});
$("#clearDataBtn").addEventListener("click",()=>{if(!confirm("Isso apagará TODOS os dados deste navegador. Faça um backup antes. Continuar?"))return;localStorage.removeItem(KEY);db=structuredClone(defaultData);renderDashboard();renderIngredients();renderRecipes();renderSettings();});

function openModal(){$("#modalBackdrop").classList.add("open")}
function closeModal(){$("#modalBackdrop").classList.remove("open")}
$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});

renderDashboard();
