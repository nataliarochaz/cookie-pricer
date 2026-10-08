const KEY = "cookie-pricer-v1";

const defaultData = {
  ingredients: [],
  packaging: [],
  recipes: [],
  settings: { energy: 0, labor: 0 }
};

let db = loadDB();
let currentIngredientTab = "ingredients";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function loadDB() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? {...defaultData, ...saved, settings: {...defaultData.settings, ...(saved.settings || {})}} : structuredClone(defaultData);
  } catch { return structuredClone(defaultData); }
}
function saveDB() {
  localStorage.setItem(KEY, JSON.stringify(db));
  const el = $("#saveStatus");
  if (el) {
    el.textContent = "● Salvo automaticamente";
    el.style.color = "var(--green)";
  }
}
function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
}
function uid(prefix="id") { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function num(v) { return Math.max(0, Number(v) || 0); }

function unitLabel(unit) {
  return {g:"g",kg:"kg",ml:"ml",l:"L",un:"un"}[unit] || unit;
}
function baseQuantity(qty, unit) {
  qty = num(qty);
  if (unit === "kg" || unit === "l") return qty * 1000;
  return qty;
}
function baseUnit(unit) {
  if (unit === "kg") return "g";
  if (unit === "l") return "ml";
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
  const refUnit = baseUnit(ref.packageUnit);
  if (refUnit !== baseUnit(item.unit)) return 0;
  return amount * costPerBase(ref);
}
function packagingCost(item) {
  const ref = db.packaging.find(x => x.id === item.packagingId);
  return ref ? num(item.quantity) * costPerBase(ref) : 0;
}
function recipeStats(recipe) {
  const ingredientTotal = (recipe.ingredients || []).reduce((s, i) => s + ingredientCost(i), 0);
  const overhead = num(db.settings.energy) + num(db.settings.labor);
  const totalCost = ingredientTotal + overhead;
  const estimatedMass = (recipe.ingredients || []).reduce((s, i) => {
    if (baseUnit(i.unit) === "g") return s + baseQuantity(i.amount, i.unit);
    return s;
  }, 0);
  const doughMass = num(recipe.massOverride) || estimatedMass;
  const individualMass = num(recipe.cookieMass) || 80;
  const fillingMass = num(recipe.fillingMass);
  const estimatedYield = Math.floor(doughMass / individualMass);
  const realYield = num(recipe.realYield);
  const yieldUsed = realYield > 0 ? realYield : estimatedYield;
  const fillingTotal = (recipe.fillingIngredients || []).reduce((s, i) => s + ingredientCost(i), 0);
  const totalWithFilling = totalCost + fillingTotal;
  const costPerCookie = yieldUsed > 0 ? totalWithFilling / yieldUsed : 0;
  return {ingredientTotal, fillingTotal, overhead, totalCost: totalWithFilling, estimatedMass: doughMass, individualMass, fillingMass, estimatedYield, yieldUsed, costPerCookie};
}

function navigate(page) {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  const meta = {
    dashboard:["VISÃO GERAL","Dashboard"], ingredients:["CADASTRO","Insumos"], recipes:["PRODUÇÃO","Receitas"], settings:["SISTEMA","Configurações"]
  }[page];
  $("#pageEyebrow").textContent = meta[0];
  $("#pageTitle").textContent = meta[1];
  if (page === "dashboard") renderDashboard();
  if (page === "ingredients") renderIngredients();
  if (page === "recipes") renderRecipes();
  if (page === "settings") renderSettings();
}
$$(".nav-item").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
$$("[data-go]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.go)));

function renderDashboard() {
  $("#statRecipes").textContent = db.recipes.length;
  $("#statIngredients").textContent = db.ingredients.length + db.packaging.length;
  const stats = db.recipes.map(recipeStats);
  const avgCost = stats.length ? stats.reduce((s,x)=>s+x.costPerCookie,0)/stats.length : 0;
  const priced = db.recipes.map((r,i)=>({r,s:stats[i],p:num(r.salePrice)})).filter(x=>x.p>0);
  const avgMargin = priced.length ? priced.reduce((s,x)=>s+((x.p-x.s.costPerCookie)/x.p)*100,0)/priced.length : 0;
  $("#statAvgCost").textContent = money(avgCost);
  $("#statAvgMargin").textContent = avgMargin.toFixed(1) + "%";

  const list = $("#dashboardProducts");
  if (!db.recipes.length) { list.className="product-list empty"; list.textContent="Nenhuma receita cadastrada."; }
  else {
    list.className="product-list";
    list.innerHTML = db.recipes.map((r,i) => {
      const s=stats[i], price=num(r.salePrice), margin=price ? ((price-s.costPerCookie)/price)*100 : 0;
      return `<div class="format-card"><strong>${escapeHtml(r.name)}</strong><div class="format-meta">Custo ${money(s.costPerCookie)} · ${price?`Venda ${money(price)} · Margem ${margin.toFixed(1)}%`:"sem preço de venda"}</div></div>`;
    }).join("");
  }
  if (!priced.length) {
    $("#bestMargin").textContent="—"; $("#bestMarginMeta").textContent="Cadastre uma receita e um preço de venda.";
  } else {
    priced.sort((a,b)=>((b.p-b.s.costPerCookie)/b.p)-((a.p-a.s.costPerCookie)/a.p));
    const x=priced[0], margin=((x.p-x.s.costPerCookie)/x.p)*100;
    $("#bestMargin").textContent=escapeHtml(x.r.name);
    $("#bestMarginMeta").textContent=`${margin.toFixed(1)}% de margem · ${money(x.p-x.s.costPerCookie)} de lucro por unidade`;
  }
}

function renderIngredients() {
  const arr = currentIngredientTab === "ingredients" ? db.ingredients : db.packaging;
  const target = $("#ingredientTable");
  if (!arr.length) {
    target.innerHTML=`<div class="empty">Nenhum ${currentIngredientTab==="ingredients"?"ingrediente":"item de embalagem"} cadastrado.<br><button class="ghost" onclick="openItemModal('${currentIngredientTab}')">Adicionar agora</button></div>`;
    return;
  }
  target.innerHTML = `<table class="data-table"><thead><tr><th>Nome</th><th>Compra</th><th>Unidade</th><th>Custo/base</th><th>Ações</th></tr></thead><tbody>${
    arr.map(x=>`<tr><td><strong>${escapeHtml(x.name)}</strong></td><td>${money(x.price)}</td><td>${x.packageQty} ${unitLabel(x.packageUnit)}</td><td>${money(costPerBase(x))}/${baseUnit(x.packageUnit)}</td><td><div class="actions"><button class="icon-btn" onclick="openItemModal('${currentIngredientTab}','${x.id}')">✎</button><button class="icon-btn" onclick="deleteItem('${currentIngredientTab}','${x.id}')">🗑</button></div></td></tr>`).join("")
  }</tbody></table>`;
}
$$("[data-ingredient-tab]").forEach(b=>b.addEventListener("click",()=>{currentIngredientTab=b.dataset.ingredientTab;$$("[data-ingredient-tab]").forEach(x=>x.classList.toggle("active",x===b));renderIngredients();}));
$("#newIngredientBtn").addEventListener("click",()=>openItemModal("ingredients"));
$("#newPackagingBtn").addEventListener("click",()=>openItemModal("packaging"));

function openItemModal(type,id=null) {
  const arr = type==="ingredients" ? db.ingredients : db.packaging;
  const old = id ? arr.find(x=>x.id===id) : null;
  const title = type==="ingredients" ? "Ingrediente" : "Embalagem";
  $("#modal").innerHTML = `<div class="modal-header"><div><h2>${old?"Editar":"Novo"} ${title.toLowerCase()}</h2><p class="recipe-meta">O sistema transforma o preço de compra em custo por g, ml ou unidade.</p></div><button class="close" onclick="closeModal()">✕</button></div>
    <div class="form-grid two">
      <label>Nome<input id="itemName" value="${escapeAttr(old?.name||"")}" placeholder="${type==="ingredients"?"Ex.: Manteiga":"Ex.: Saquinho descartável"}"></label>
      <label>Preço pago (R$)<input id="itemPrice" type="number" min="0" step="0.01" value="${old?.price??""}"></label>
      <label>Quantidade comprada<input id="itemQty" type="number" min="0" step="0.001" value="${old?.packageQty??""}"></label>
      <label>Unidade<select id="itemUnit">${["g","kg","ml","l","un"].map(u=>`<option value="${u}" ${old?.packageUnit===u?"selected":""}>${unitLabel(u)}</option>`).join("")}</select></label>
    </div>
    <div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveItem('${type}','${id||""}')">Salvar</button></div>`;
  openModal();
}
function saveItem(type,id) {
  const item={id:id||uid(type==="ingredients"?"ing":"pack"),name:$("#itemName").value.trim(),price:num($("#itemPrice").value),packageQty:num($("#itemQty").value),packageUnit:$("#itemUnit").value};
  if(!item.name||!item.packageQty){alert("Preencha nome e quantidade comprada.");return;}
  const arr=type==="ingredients"?db.ingredients:db.packaging;
  const idx=arr.findIndex(x=>x.id===id); if(idx>=0) arr[idx]=item; else arr.push(item);
  saveDB();closeModal();renderIngredients();renderRecipes();renderDashboard();
}
function deleteItem(type,id) {
  const used = type==="ingredients" && db.recipes.some(r=>[...(r.ingredients||[]),...(r.fillingIngredients||[])].some(i=>i.ingredientId===id));
  if(used){alert("Esse ingrediente está sendo usado em uma receita. Remova-o da receita antes de excluir.");return;}
  if(!confirm("Excluir este item?"))return;
  const arr=type==="ingredients"?db.ingredients:db.packaging; const idx=arr.findIndex(x=>x.id===id); if(idx>=0)arr.splice(idx,1);
  saveDB();renderIngredients();
}

function renderRecipes() {
  const el=$("#recipeList");
  if(!db.recipes.length){el.innerHTML=`<div class="card empty">Nenhuma receita cadastrada.<br><button class="primary" onclick="openRecipeModal()">Criar primeira receita</button></div>`;return;}
  el.innerHTML=db.recipes.map(r=>{
    const s=recipeStats(r), price=num(r.salePrice), margin=price?((price-s.costPerCookie)/price)*100:null;
    return `<article class="recipe-card">
      <h3>${escapeHtml(r.name)}</h3><div class="recipe-meta">${r.cookieMass||80}g de massa · ${s.estimatedYield||0} un. estimadas ${r.realYield?`· ${r.realYield} reais`:""}</div>
      <div class="recipe-numbers"><div class="mini-stat"><span>Custo/un.</span><strong>${money(s.costPerCookie)}</strong></div><div class="mini-stat"><span>Venda</span><strong>${price?money(price):"—"}</strong></div><div class="mini-stat"><span>Margem</span><strong>${margin!==null?margin.toFixed(0)+"%":"—"}</strong></div></div>
      <div class="recipe-formats">${(r.formats||[]).map(f=>{
        const packCost=(f.packaging||[]).reduce((sum,p)=>sum+packagingCost(p),0);
        const cookieCost=s.costPerCookie*(num(f.cookieCount)||1);
        const total=cookieCost+packCost;
        const saleTotal=price?(price*(num(f.cookieCount)||1)):0;
        const packNames=(f.packaging||[]).map(p=>{const x=db.packaging.find(a=>a.id===p.packagingId);return x?`${escapeHtml(x.name)} × ${p.quantity}`:"";}).filter(Boolean).join(" + ");
        return `<div class="format-card"><strong>${escapeHtml(f.name||"Formato de venda")}</strong><div class="format-meta">${f.cookieCount||1} cookie(s) · ${packNames||"sem embalagem"}</div><div class="format-meta">Cookies: ${money(cookieCost)} · Embalagem: ${money(packCost)} · <strong>Total: ${money(total)}</strong>${saleTotal?` · Venda: ${money(saleTotal)}`:""}</div></div>`;
      }).join("")}</div>
      <div class="recipe-card-footer"><span class="recipe-meta">${(r.formats||[]).length} formato(s) de venda</span><div class="actions"><button class="icon-btn" onclick="openRecipeModal('${r.id}')">✎</button><button class="icon-btn" onclick="deleteRecipe('${r.id}')">🗑</button></div></div>
    </article>`;
  }).join("");
}
$("#newRecipeBtn").addEventListener("click",()=>openRecipeModal());

function ingredientOptions(selected="") {
  return db.ingredients.map(x=>`<option value="${x.id}" ${x.id===selected?"selected":""}>${escapeHtml(x.name)}</option>`).join("");
}
function addIngredientRow(container, data={}) {
  const row=document.createElement("div"); row.className="ingredient-row";
  row.innerHTML=`<select class="ing-select">${ingredientOptions(data.ingredientId)}</select><input class="ing-amount" type="number" min="0" step="0.1" value="${data.amount??""}" placeholder="Qtd"><select class="ing-unit"><option value="g" ${data.unit==="g"?"selected":""}>g</option><option value="kg" ${data.unit==="kg"?"selected":""}>kg</option><option value="ml" ${data.unit==="ml"?"selected":""}>ml</option><option value="un" ${data.unit==="un"?"selected":""}>un</option></select><button class="icon-btn remove-row">×</button>`;
  row.querySelector(".remove-row").onclick=()=>row.remove();
  container.appendChild(row);
}
function formatMarkup(f={}) {
  const names=(f.packaging||[]).map(p=>{const x=db.packaging.find(a=>a.id===p.packagingId);return x?`${x.name} × ${p.quantity}`:"";}).filter(Boolean).join(" + ");
  return `<div class="format-card"><button class="icon-btn format-actions remove-format">×</button><strong>${escapeHtml(f.name||"Formato de venda")}</strong><div class="format-meta">${names||"Sem embalagem"} · Embalagem: ${money((f.packaging||[]).reduce((s,p)=>s+packagingCost(p),0))}</div></div>`;
}
function openRecipeModal(id=null) {
  const old=id?db.recipes.find(x=>x.id===id):null;
  $("#modal").innerHTML=`<div class="modal-header"><div><h2>${old?"Editar":"Nova"} receita</h2><p class="recipe-meta">A receita calcula custo, rendimento estimado e formatos de venda.</p></div><button class="close" onclick="closeModal()">✕</button></div>
    <div class="form-grid two">
      <label>Nome da receita<input id="recipeName" value="${escapeAttr(old?.name||"")}" placeholder="Ex.: Cookie tradicional baunilha"></label>
      <label>Preço de venda por unidade (R$)<input id="salePrice" type="number" min="0" step="0.01" value="${old?.salePrice??""}"></label>
      <label>Peso de massa por cookie (g)<input id="cookieMass" type="number" min="0" step="1" value="${old?.cookieMass??80}"></label>
      <label>Recheio por cookie (g)<input id="fillingMass" type="number" min="0" step="1" value="${old?.fillingMass??20}"></label>
      <label>Rendimento real (un.) <span class="recipe-meta">opcional</span><input id="realYield" type="number" min="0" step="1" value="${old?.realYield??""}" placeholder="Se vazio, usa o estimado"></label>
      <label>Peso real da receita (g) <span class="recipe-meta">opcional</span><input id="massOverride" type="number" min="0" step="1" value="${old?.massOverride??""}" placeholder="Se vazio, soma os ingredientes"></label>
    </div>
    <hr class="section-divider">
    <div class="card-head"><div><h3>Ingredientes da massa</h3><p>Quantidade usada em uma receita.</p></div><button class="secondary small" id="addIng">+ Ingrediente</button></div>
    <div id="ingRows"></div>
    <hr class="section-divider">
    <div class="card-head"><div><h3>Recheio</h3><p>Itens usados para o recheio da receita inteira.</p></div><button class="secondary small" id="addFill">+ Ingrediente</button></div>
    <div id="fillRows"></div>
    <hr class="section-divider">
    <div class="card-head"><div><h3>Formatos de venda</h3><p>Combine embalagens conforme o canal de venda.</p></div><button class="secondary small" id="addFormat">+ Formato</button></div>
    <div id="formats"></div>
    <div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveRecipe('${id||""}')">Salvar receita</button></div>`;
  openModal();
  const ingRows=$("#ingRows"), fillRows=$("#fillRows");
  (old?.ingredients||[]).forEach(x=>addIngredientRow(ingRows,x));
  (old?.fillingIngredients||[]).forEach(x=>addIngredientRow(fillRows,x));
  $("#addIng").onclick=()=>addIngredientRow(ingRows);
  $("#addFill").onclick=()=>addIngredientRow(fillRows);
  $("#addFormat").onclick=()=>addFormatUI($("#formats"));
  (old?.formats||[]).forEach(x=>addFormatUI($("#formats"),x));
}
function addFormatUI(container,data={}) {
  const wrap=document.createElement("div"); wrap.className="format-editor";
  const packRows=(data.packaging||[]).map(p=>`<div class="pack-row"><select class="pack-select">${db.packaging.map(x=>`<option value="${x.id}" ${x.id===p.packagingId?"selected":""}>${escapeHtml(x.name)}</option>`).join("")}</select><input class="pack-qty" type="number" min="0" step="1" value="${p.quantity??1}"><button class="icon-btn remove-row">×</button></div>`).join("");
  wrap.innerHTML=`<div class="format-card"><div class="form-grid two"><label>Nome do formato<input class="format-name" value="${escapeAttr(data.name||"")}" placeholder="Ex.: Delivery"></label><label>Quantidade de cookies no formato<input class="format-cookies" type="number" min="1" step="1" value="${data.cookieCount??1}"></label></div><div style="margin-top:12px"><div class="row-label">Embalagens</div><div class="pack-rows">${packRows}</div><button class="secondary small add-pack">+ Embalagem</button></div><div class="format-meta preview"></div><button class="icon-btn remove-format" style="margin-top:10px">Remover formato</button></div>`;
  wrap.querySelector(".remove-format").onclick=()=>wrap.remove();
  wrap.querySelector(".add-pack").onclick=()=>addPackRow(wrap.querySelector(".pack-rows"));
  wrap.querySelectorAll(".pack-row .remove-row").forEach(b=>b.onclick=()=>b.parentElement.remove());
  container.appendChild(wrap); updateFormatPreview(wrap);
}
function addPackRow(container,data={}) {
  const row=document.createElement("div"); row.className="pack-row";
  row.innerHTML=`<select class="pack-select">${db.packaging.map(x=>`<option value="${x.id}" ${x.id===data.packagingId?"selected":""}>${escapeHtml(x.name)}</option>`).join("")}</select><input class="pack-qty" type="number" min="0" step="1" value="${data.quantity??1}"><button class="icon-btn remove-row">×</button>`;
  row.querySelector(".remove-row").onclick=()=>row.remove(); container.appendChild(row);
}
function updateFormatPreview(wrap){
  const cost=[...wrap.querySelectorAll(".pack-row")].reduce((s,row)=>s+packagingCost({packagingId:row.querySelector(".pack-select").value,quantity:num(row.querySelector(".pack-qty").value)}),0);
  const name=wrap.querySelector(".format-name").value||"Formato";
  wrap.querySelector(".preview").textContent=`${name}: custo das embalagens ${money(cost)}`;
}
function saveRecipe(id) {
  const collectRows=(sel)=>[...document.querySelectorAll(sel+" .ingredient-row")].map(r=>({ingredientId:r.querySelector(".ing-select").value,amount:num(r.querySelector(".ing-amount").value),unit:r.querySelector(".ing-unit").value})).filter(x=>x.ingredientId&&x.amount>0);
  const formats=[...$("#formats").children].map(w=>({name:w.querySelector(".format-name").value.trim()||"Formato de venda",cookieCount:num(w.querySelector(".format-cookies").value)||1,packaging:[...w.querySelectorAll(".pack-row")].map(r=>({packagingId:r.querySelector(".pack-select").value,quantity:num(r.querySelector(".pack-qty").value)||1})).filter(x=>x.packagingId)}));
  const recipe={id:id||uid("rec"),name:$("#recipeName").value.trim(),salePrice:num($("#salePrice").value),cookieMass:num($("#cookieMass").value)||80,fillingMass:num($("#fillingMass").value),realYield:num($("#realYield").value),massOverride:num($("#massOverride").value),ingredients:collectRows("#ingRows"),fillingIngredients:collectRows("#fillRows"),formats};
  if(!recipe.name){alert("Informe o nome da receita.");return;}
  const arr=db.recipes, idx=arr.findIndex(x=>x.id===id); if(idx>=0)arr[idx]=recipe;else arr.push(recipe);
  saveDB();closeModal();renderRecipes();renderDashboard();
}
function deleteRecipe(id){if(!confirm("Excluir esta receita?"))return;db.recipes=db.recipes.filter(x=>x.id!==id);saveDB();renderRecipes();renderDashboard();}

function renderSettings(){ $("#overheadEnergy").value=db.settings.energy||""; $("#overheadLabor").value=db.settings.labor||""; }
$("#saveSettingsBtn").addEventListener("click",()=>{db.settings.energy=num($("#overheadEnergy").value);db.settings.labor=num($("#overheadLabor").value);saveDB();renderDashboard();alert("Configurações salvas.");});
$("#exportBtn").addEventListener("click",()=>{
  const payload={app:"Cookie Pricer",version:1,exportedAt:new Date().toISOString(),data:db};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`cookie-pricer-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
});
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const incoming=parsed.data||parsed;
    if(!incoming||!Array.isArray(incoming.ingredients)||!Array.isArray(incoming.packaging)||!Array.isArray(incoming.recipes))throw new Error();
    if(!confirm("Restaurar este backup substituirá os dados atuais deste navegador. Continuar?"))return;
    db={...defaultData,...incoming,settings:{...defaultData.settings,...(incoming.settings||{})}};saveDB();renderSettings();renderDashboard();alert("Backup restaurado com sucesso.");
  }catch{alert("Não foi possível ler este backup.");}
  e.target.value="";
});
$("#clearDataBtn").addEventListener("click",()=>{if(!confirm("Isso apagará TODOS os dados deste navegador. Faça um backup antes. Continuar?"))return;localStorage.removeItem(KEY);db=structuredClone(defaultData);renderDashboard();renderIngredients();renderRecipes();renderSettings();});

function openModal(){$("#modalBackdrop").classList.add("open")}
function closeModal(){$("#modalBackdrop").classList.remove("open")}
$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
document.addEventListener("input",e=>{const w=e.target.closest(".format-editor");if(w)updateFormatPreview(w)});
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(s){return escapeHtml(s)}

renderDashboard();
