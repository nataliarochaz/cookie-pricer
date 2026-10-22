'use strict';

const STORAGE_KEY = 'cookie-pricer-v3';
const LEGACY_KEY = 'cookie-pricer-v1';
const APP_VERSION = '3.5';
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

const EMPTY_DB = {
  schemaVersion: 3,
  ingredients: [], packaging: [], masses: [], fillings: [], products: [], kits: [], salesFormats: [],
  settings: { defaultMarkup: 3, indirectCosts: [], workTransportPerTrip: 10, workMinimumCookies: 12, kraftReservePerCookie:0.20, laborHourlyRate:20, laborHoursBatch:4.5, laborRecipesPerSession:4 }
};
let db = loadDB();
function ensureWorkFormat() {
  let format = db.salesFormats.find(f => String(f.name||'').trim().toLocaleLowerCase('pt-BR') === 'trabalho da agatha');
  const perCookie = Math.ceil((num(db.settings.workTransportPerTrip ?? 10) / Math.max(1, Math.floor(num(db.settings.workMinimumCookies ?? 12) || 12))) * 100) / 100;
  if (!format) { format = {id:uid('fmt'), name:'Trabalho da Agatha', cookieCount:1, packaging:[], extraCostPerCookie:perCookie, isDefaultWorkFormat:true}; db.salesFormats.push(format); }
  else if (format.isDefaultWorkFormat || format.extraCostPerCookie===undefined) { format.extraCostPerCookie=perCookie; format.isDefaultWorkFormat=true; }
  db.products.forEach(product => { product.formatIds = Array.isArray(product.formatIds) ? product.formatIds : []; if (!product.formatIds.includes(format.id)) product.formatIds.push(format.id); });
}
ensureWorkFormat();
try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {}
let currentIngredientTab = 'ingredients';
let searchTerms = { ingredients: '', products: '' };

function uid(prefix='id') { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`; }
function num(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; }
function signedNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function money(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function qtyFmt(v, digits=2) { return Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits }); }
function pct(v, digits=1) { return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(value) { return escapeHtml(value); }
function titleCaseUnit(unit) { return ({g:'g',kg:'kg',ml:'ml',l:'L',un:'un',m:'m',cm:'cm'}[unit] || unit || ''); }
function baseQuantity(quantity, unit) {
  const q = num(quantity);
  if (unit === 'kg' || unit === 'l') return q * 1000;
  if (unit === 'cm') return q / 100;
  return q;
}
function baseUnit(unit) {
  if (unit === 'kg') return 'g';
  if (unit === 'l') return 'ml';
  if (unit === 'cm') return 'm';
  return unit;
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeRows(rows) { return Array.isArray(rows) ? rows.map(row => ({...row})).filter(row => row && typeof row === 'object') : []; }

function normalizeV3(incoming) {
  const src = incoming || {};
  const out = {
    ...deepClone(EMPTY_DB), ...src,
    ingredients: normalizeRows(src.ingredients), packaging: normalizeRows(src.packaging),
    masses: normalizeRows(src.masses), fillings: normalizeRows(src.fillings), products: normalizeRows(src.products),
    kits: normalizeRows(src.kits), salesFormats: normalizeRows(src.salesFormats),
    settings: {...deepClone(EMPTY_DB.settings), ...(src.settings || {})}
  };
  out.settings.defaultMarkup = Math.min(20, Math.max(1, num(out.settings.defaultMarkup) || 3)); out.settings.defaultMargin=Math.min(80,Math.max(1,num(out.settings.defaultMargin) || (1-1/(num(out.settings.defaultMarkup)||3))*100 || 40));
  out.settings.workTransportPerTrip = Math.max(0, num(out.settings.workTransportPerTrip ?? 10));
  out.settings.workMinimumCookies = Math.max(1, Math.floor(num(out.settings.workMinimumCookies ?? 12) || 12));
  out.settings.indirectCosts = normalizeRows(out.settings.indirectCosts);
  for (const group of ['ingredients','packaging','masses','fillings','products','kits','salesFormats']) {
    out[group] = out[group].map(item => ({...item, id: item.id || uid(group)}));
  }
  out.masses = out.masses.map(m => ({
    ...m, name: String(m.name || 'Massa sem nome'), ingredients: normalizeRows(m.ingredients),
    cookieWeight: num(m.cookieWeight) || 80, yieldCount: num(m.yieldCount), realYield: num(m.realYield), realMass: num(m.realMass)
  }));
  out.fillings = out.fillings.map(f => ({...f, name:String(f.name || 'Recheio sem nome'), ingredients:normalizeRows(f.ingredients), otherCost:num(f.otherCost)}));
  out.products = out.products.map(p => ({
    ...p, name:String(p.name || 'Sabor sem nome'), formatIds:Array.isArray(p.formatIds)?p.formatIds:[],
    packagingCost:num(p.packagingCost), fixedCost:num(p.fixedCost), laborCost:num(p.laborCost), salePrice:num(p.salePrice),
    platformFee: p.platformFee === undefined ? 0.27 : Math.min(0.95, num(p.platformFee)),
    markupTarget: p.markupTarget === null || p.markupTarget === undefined || p.markupTarget === '' ? null : Math.max(1, num(p.markupTarget) || out.settings.defaultMarkup)
  }));
  out.kits = out.kits.map(k => ({...k, quantity:Math.max(1, Math.floor(num(k.quantity)||1)), discount:Math.min(95,num(k.discount)), packagingCost:num(k.packagingCost), salePrice:num(k.salePrice)}));
  out.salesFormats = out.salesFormats.map(f => ({...f, name:String(f.name||'Formato de venda'), cookieCount:Math.max(1,Math.floor(num(f.cookieCount)||1)), packaging:normalizeRows(f.packaging), extraCostPerCookie:num(f.extraCostPerCookie)}));
  out.settings.indirectCosts = out.settings.indirectCosts.map(c => ({...c, id:c.id||uid('ind'), price:num(c.price), packageQty:num(c.packageQty)||1, packageUnit:c.packageUnit||'un', usage:num(c.usage), mode:c.mode||'perRecipe'}));
  out.schemaVersion = 3;
  return out;
}

function getLegacyRoot(parsed) { return parsed && parsed.data ? parsed.data : parsed; }
function legacyMassEstimate(rows) {
  return (rows || []).reduce((sum, row) => {
    const unit = row.unit || 'g';
    return baseUnit(unit) === 'g' ? sum + baseQuantity(row.amount, unit) : sum;
  }, 0);
}
function migrateLegacy(legacyInput) {
  const old = getLegacyRoot(legacyInput || {});
  const imported = deepClone(EMPTY_DB);
  imported.ingredients = normalizeRows(old.ingredients).map(x => ({...x, id:x.id||uid('ing')}));
  imported.packaging = normalizeRows(old.packaging).map(x => ({...x, id:x.id||uid('pack')}));
  imported.salesFormats = normalizeRows(old.salesFormats).map(x => ({...x, id:x.id||uid('fmt'), packaging:normalizeRows(x.packaging)}));
  imported.settings.indirectCosts = normalizeRows(old.settings?.indirectCosts).map(x=>({...x,id:x.id||uid('ind')}));
  if (num(old.settings?.energy)>0 && !imported.settings.indirectCosts.some(x=>x.legacyKey==='energy')) imported.settings.indirectCosts.push({id:uid('ind'),name:'Gás / energia (importado, revisar valor)',price:num(old.settings.energy),packageQty:1,packageUnit:'un',mode:'perRecipe',usage:1,legacyKey:'energy'});
  if (num(old.settings?.labor)>0 && !imported.settings.indirectCosts.some(x=>x.legacyKey==='labor')) imported.settings.indirectCosts.push({id:uid('ind'),name:'Mão de obra antiga (valor preservado)',price:num(old.settings.labor),packageQty:1,packageUnit:'un',mode:'perRecipe',usage:1,legacyKey:'labor'});
  const oldMargin = Math.min(95,Math.max(1,num(old.settings?.targetMargin)||50));
  imported.settings.defaultMarkup = Math.min(20, Math.max(1, 1/(1-oldMargin/100)));
  const formatSignature = f => JSON.stringify({name:String(f?.name||'').trim().toLowerCase(),cookieCount:num(f?.cookieCount)||1,packaging:(f?.packaging||[]).map(p=>({packagingId:p.packagingId,quantity:num(p.quantity)||1}))});
  const formatMap = new Map();
  const legacyFormats = normalizeRows(old.salesFormats);
  for (const f of legacyFormats) formatMap.set(f.id, f.id);
  const usedIds = new Set(imported.salesFormats.map(f=>f.id));
  function ensureFormat(oldFormat) {
    const signature = formatSignature(oldFormat);
    const match = imported.salesFormats.find(f=>formatSignature(f)===signature);
    if (match) return match.id;
    const newId = usedIds.has(oldFormat.id) ? uid('fmt') : (oldFormat.id||uid('fmt'));
    usedIds.add(newId);
    imported.salesFormats.push({...oldFormat,id:newId,packaging:normalizeRows(oldFormat.packaging)});
    return newId;
  }
  imported.products = [];
  for (const oldRecipe of normalizeRows(old.recipes)) {
    const massId = uid('mass');
    const fillingId = uid('fill');
    const massRows = normalizeRows(oldRecipe.ingredients).map(x=>({...x}));
    const estimatedMass = num(oldRecipe.massOverride) || legacyMassEstimate(massRows);
    const cookieWeight = num(oldRecipe.cookieMass)||80;
    const estYield = estimatedMass>0 ? Math.max(1,Math.floor(estimatedMass/cookieWeight)) : 1;
    const realYield = num(oldRecipe.realYield);
    const legacyYield = realYield || estYield;
    imported.masses.push({id:massId,name:`${oldRecipe.name || 'Receita importada'} · massa`,ingredients:massRows,cookieWeight,yieldCount:legacyYield,realYield:0,realMass:num(oldRecipe.massOverride),sourceLegacyRecipeId:oldRecipe.id||null});
    imported.fillings.push({id:fillingId,name:`${oldRecipe.name || 'Receita importada'} · recheio`,ingredients:normalizeRows(oldRecipe.fillingIngredients).map(x=>({...x})),otherCost:0,sourceLegacyRecipeId:oldRecipe.id||null});
    const originalFormatIds = Array.isArray(oldRecipe.formatIds) ? oldRecipe.formatIds : (Array.isArray(oldRecipe.formats) ? oldRecipe.formats.map(f=>ensureFormat(f)) : []);
    imported.products.push({
      id:uid('prod'),name:String(oldRecipe.name||'Receita importada'),massId,fillingId,
      packagingCost:0,fixedCost:0,laborCost:0,salePrice:num(oldRecipe.salePrice),markupTarget:imported.settings.defaultMarkup,
      platformFee:0.27,formatIds:originalFormatIds.map(id=>formatMap.get(id)||id),
      legacy:{cookieMass:num(oldRecipe.cookieMass),cookieWeight,realYield,realMass:num(oldRecipe.massOverride)}
    });
  }
  return normalizeV3(imported);
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeV3(JSON.parse(raw));
    const oldRaw = localStorage.getItem(LEGACY_KEY);
    if (oldRaw) {
      const migrated = migrateLegacy(JSON.parse(oldRaw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (err) { console.warn('Não foi possível carregar dados locais:', err); }
  return normalizeV3(EMPTY_DB);
}
function saveDB(message='Salvo automaticamente') {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    $('#saveStatus').innerHTML = `<span class="status-dot"></span> ${escapeHtml(message)}`;
    $('#sidebarSaveStatus').textContent = 'Salvo neste navegador';
  } catch (err) { toast('Não foi possível salvar. Exporte um backup e confira o espaço do navegador.', 'error'); }
}
function toast(message, type='') {
  const region = $('#toastRegion'); if(!region) return;
  const el = document.createElement('div'); el.className = `toast ${type}`.trim(); el.textContent = message; region.appendChild(el);
  setTimeout(()=>el.remove(), 3600);
}

function getItemById(items, id) { return items.find(x=>x.id===id); }
function getIngredient(id) { return getItemById(db.ingredients,id); }
function costPerBase(item) { const q=baseQuantity(item?.packageQty,item?.packageUnit); return q>0 ? num(item.price)/q : 0; }
function calculateIngredientCost(row) {
  const item=getIngredient(row.ingredientId); if(!item) return 0;
  const rowUnit=baseUnit(row.unit||item.packageUnit), sourceUnit=baseUnit(item.packageUnit);
  if (rowUnit!==sourceUnit) return 0;
  return baseQuantity(row.amount,row.unit||item.packageUnit)*costPerBase(item);
}
function sumIndirectBatchCost() {
  return (db.settings.indirectCosts||[]).reduce((sum,item)=>sum+indirectCostValue(item),0);
}
function indirectCostValue(item) {
  if (!item || item.deferredSetup || item.legacyKey==='labor') return 0;
  if (item.mode==='perRecipe') return num(item.price);
  const amount=baseQuantity(item.packageQty,item.packageUnit);
  if(amount<=0) return 0;
  return num(item.price)/amount*baseQuantity(item.usage,item.packageUnit);
}
function indirectCostDescription(item) {
  if(item.deferredSetup || item.legacyKey==='labor') return 'Valor antigo preservado · revise antes de incluir no custo';
  if(item.mode==='perRecipe') return `${money(item.price)} por fornada`;
  return `${money(costPerBase(item))}/${titleCaseUnit(baseUnit(item.packageUnit))} · consumo de ${qtyFmt(item.usage,3)} ${titleCaseUnit(item.packageUnit)} por fornada`;
}
function massEstimatedWeight(mass) {
  return (mass.ingredients||[]).reduce((sum,row)=>baseUnit(row.unit||'g')==='g' ? sum+baseQuantity(row.amount,row.unit||'g') : sum,0);
}
function massStats(mass) {
  if(!mass) return {batchCost:0, estimatedWeight:0, batchWeight:0, estimatedYield:0, yieldUsed:0, costPerCookie:0, rowsCost:0};
  const rowsCost=(mass.ingredients||[]).reduce((sum,row)=>sum+calculateIngredientCost(row),0);
  const estimatedWeight=massEstimatedWeight(mass);
  const batchWeight=num(mass.realMass)||estimatedWeight;
  const cookieWeight=num(mass.cookieWeight)||80;
  const estimatedYield=cookieWeight>0&&batchWeight>0?Math.floor(batchWeight/cookieWeight):0;
  const inputYield=num(mass.yieldCount)||12;
  const yieldUsed=num(mass.realYield)||inputYield;
  return {batchCost:rowsCost,estimatedWeight,batchWeight,estimatedYield,yieldUsed,costPerCookie:yieldUsed>0?rowsCost/yieldUsed:0,rowsCost,cookieWeight};
}
function fillingStats(filling) {
  if(!filling) return {ingredientCost:0,otherCost:0,costPerCookie:0};
  const ingredientCost=(filling.ingredients||[]).reduce((sum,row)=>sum+calculateIngredientCost(row),0);
  const otherCost=num(filling.otherCost);
  return {ingredientCost,otherCost,costPerCookie:ingredientCost+otherCost};
}
function getProduct(id) { return getItemById(db.products,id); }
function productStats(product) {
  const mass=massStats(getItemById(db.masses,product.massId));
  const filling=fillingStats(getItemById(db.fillings,product.fillingId));
  const indirectItems=(db.settings.indirectCosts||[]).map(item=>({item,batchCost:indirectCostValue(item),perCookie:mass.yieldUsed>0?indirectCostValue(item)/mass.yieldUsed:0}));
  const configuredIndirect=indirectItems.reduce((sum,row)=>sum+row.perCookie,0);
  const laborBatchCost=Math.max(0,num(db.settings.laborHourlyRate??20))*Math.max(0,num(db.settings.laborHoursBatch??4.5));
  const laborPerCookie=mass.yieldUsed>0?laborBatchCost/mass.yieldUsed:0;
  const allocatedIndirect=configuredIndirect+laborPerCookie;
  const ingredientCost=mass.costPerCookie+filling.costPerCookie;
  // Custos fixos, mão de obra e embalagem de versões anteriores são preservados nos dados,
  // mas não entram no novo cálculo automaticamente. Os dois primeiros irão para Ajustes;
  // a embalagem será calculada pelo formato de venda para evitar duplicidade.
  const legacyFixedCost=num(product.fixedCost);
  const legacyLaborCost=num(product.laborCost);
  const legacyPackagingCost=num(product.packagingCost);
  const baseCost=ingredientCost+allocatedIndirect;
  const total=baseCost;
  const markup=product.markupTarget===null||product.markupTarget===undefined||product.markupTarget==='' ? num(db.settings.defaultMarkup)||3 : num(product.markupTarget)||num(db.settings.defaultMarkup)||3;
  const suggestedPrice=baseCost*markup;
  const price=num(product.salePrice);
  const profit=price-baseCost;
  const margin=price>0?profit/price*100:null;
  const realMarkup=baseCost>0&&price>0?price/baseCost:null;
  const fee=Math.min(.95,num(product.platformFee));
  const platformPrice=price>0&&fee<1?price/(1-fee):0;
  const hasLegacyValues=legacyFixedCost>0||legacyLaborCost>0||legacyPackagingCost>0;
  return {mass,filling,indirectItems,allocatedIndirect,laborBatchCost,laborPerCookie,ingredientCost,baseCost,total,legacyFixedCost,legacyLaborCost,legacyPackagingCost,hasLegacyValues,markup,suggestedPrice,price,profit,margin,realMarkup,fee,platformPrice};
}
function formatPackagingCost(format) {
  return (format.packaging||[]).reduce((sum,row)=>{
    const item=getItemById(db.packaging,row.packagingId); return sum+(item?num(row.quantity)*costPerBase(item):0);
  },0);
}
function isSharedKraft(item) {
  return /kraft/i.test(String(item?.name||'')) && /saco|sacola|embalagem/i.test(String(item?.name||''));
}
function formatPackagingBreakdown(format) {
  let individual=0, sharedActual=0;
  (format.packaging||[]).forEach(row=>{
    const item=getItemById(db.packaging,row.packagingId); if(!item)return;
    const cost=num(row.quantity)*costPerBase(item);
    if(isSharedKraft(item)) sharedActual+=cost; else individual+=cost;
  });
  return {individual,sharedActual,total:individual+sharedActual};
}
function isDeliveryFormat(format) {
  return /delivery|entrega/i.test(String(format?.name||''));
}
function productFormatStats(product,format) {
  const s=productStats(product); const count=Math.max(1,Math.floor(num(format.cookieCount)||1));
  const pack=formatPackagingBreakdown(format);
  const kraftReservePerCookie=isDeliveryFormat(format)?num(db.settings.kraftReservePerCookie??0.20):0;
  const extraPerCookie=num(format.extraCostPerCookie);
  const extraCost=(extraPerCookie+kraftReservePerCookie)*count;
  const total=s.baseCost*count+pack.individual+extraCost;
  return {count,packCost:pack.individual,sharedKraftCostPerOrder:pack.sharedActual,kraftReservePerCookie,extraCost,total,costPerCookie:total/count,suggestedPrice:(total/count)*s.markup};
}
function productDisplayName(id) { return getProduct(id)?.name || 'Sabor removido'; }

function navigate(page) {
  $$('.nav-item[data-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  $$('.page').forEach(section=>section.classList.toggle('active',section.id===`page-${page}`));
  const meta={start:['PAINEL GERAL','Início'],ingredients:['PRODUÇÃO','Ingredientes'],packaging:['PREPARAR PARA VENDER','Embalagens e formatos'],masses:['FICHA TÉCNICA','Massas'],fillings:['FICHA TÉCNICA','Recheios'],costs:['COMPOSIÇÃO DO CUSTO','Custo por cookie'],pricing:['VENDA','Preço e lucro'],settings:['SEUS DADOS','Backup e ajustes']}[page]||['COOKIE PRICER','Sistema'];
  $('#pageEyebrow').textContent=meta[0]; $('#pageTitle').textContent=meta[1];
  renderPage(page);
}
$$('.nav-item[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));
$('#manageFormatsPackagingBtn')?.addEventListener('click',()=>manageSalesFormats()); $('#manageFormatsPackagingBtn2')?.addEventListener('click',()=>manageSalesFormats());
$$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.go)));
function renderPage(page) {
  if(page==='start') renderStart();
  if(page==='ingredients') renderIngredients();
  if(page==='masses') renderMasses();
  if(page==='fillings') renderFillings();
  if(page==='costs') renderCosts();
  if(page==='pricing') renderPricing();
  if(page==='packaging') renderPackagingPage();
  if(page==='settings') renderSettings();
}

function infoIcon(text) { return `<button type="button" class="info-tip" data-info="${escapeAttr(text)}" aria-label="Informação" title="Ver explicação">i</button>`; }
function positionInfoTooltip(icon) {
  const tip=$('#globalInfoTooltip'); if(!tip||!icon)return;
  tip.textContent=icon.dataset.info||'';
  const maxWidth=Math.min(310,Math.max(185,window.innerWidth-24));
  tip.style.width=`${maxWidth}px`; tip.style.left='12px'; tip.style.top='8px'; tip.classList.add('show');
  const rect=icon.getBoundingClientRect(), tipRect=tip.getBoundingClientRect();
  const left=Math.max(12,Math.min(window.innerWidth-maxWidth-12,rect.left+rect.width/2-maxWidth/2));
  let top=rect.top-tipRect.height-8; if(top<8)top=rect.bottom+8; if(top+tipRect.height>window.innerHeight-8)top=Math.max(8,window.innerHeight-tipRect.height-8);
  tip.style.left=`${left}px`; tip.style.top=`${top}px`;
}
function hideInfoTooltip(){ $('#globalInfoTooltip')?.classList.remove('show'); }
function setupInfoTooltips() {
  document.addEventListener('mouseover',event=>{const icon=event.target.closest?.('.info-tip');if(icon)positionInfoTooltip(icon);});
  document.addEventListener('mouseout',event=>{const icon=event.target.closest?.('.info-tip');if(icon&&!icon.contains(event.relatedTarget))hideInfoTooltip();});
  document.addEventListener('focusin',event=>{const icon=event.target.closest?.('.info-tip');if(icon)positionInfoTooltip(icon);});
  document.addEventListener('focusout',event=>{const icon=event.target.closest?.('.info-tip');if(icon&&!icon.contains(event.relatedTarget))hideInfoTooltip();});
  document.addEventListener('click',event=>{const icon=event.target.closest?.('.info-tip');if(icon){positionInfoTooltip(icon);event.stopPropagation();}else hideInfoTooltip();});
  window.addEventListener('scroll',hideInfoTooltip,true); window.addEventListener('resize',hideInfoTooltip);
}

function renderStart() {
  $('#statIngredients').textContent=db.ingredients.length+db.packaging.length;
  $('#statMasses').textContent=db.masses.length; $('#statFillings').textContent=db.fillings.length; $('#statProducts').textContent=db.products.length;
  const list=$('#startProductList');
  if(!db.products.length){list.className='overview-list empty-state';list.textContent='Ainda não há sabores cadastrados.';return;}
  list.className='overview-list';
  list.innerHTML=db.products.slice(0,6).map(product=>{
    const stats=productStats(product);const margin=stats.margin;
    return `<div class="overview-row"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(getItemById(db.masses,product.massId)?.name||'Sem massa')} · ${escapeHtml(getItemById(db.fillings,product.fillingId)?.name||'Sem recheio')}</small></div><div class="overview-price"><strong>${money(stats.total)}</strong><small>${stats.price>0?`Venda ${money(stats.price)} · ${pct(margin)} sobre custo base`:`Sugestão base ${money(stats.suggestedPrice)}`}</small></div></div>`;
  }).join('');
}

// INSUMOS
function unitOptions(selected, type) {
  const options=type==='ingredients'?['g','kg','ml','l','un']:['un','g','kg','ml','l','m','cm'];
  return options.map(u=>`<option value="${u}" ${u===selected?'selected':''}>${titleCaseUnit(u)}</option>`).join('');
}
function renderIngredients() {
  $$('.tab[data-ingredient-tab]').forEach(tab=>tab.classList.toggle('active',tab.dataset.ingredientTab===currentIngredientTab));
  $('#ingredientCount').textContent=db.ingredients.length; $('#packagingCount').textContent=db.packaging.length;
  const isIngredients=currentIngredientTab==='ingredients'; const list=isIngredients?db.ingredients:db.packaging;
  $('#ingredientTableTitle').textContent=isIngredients?'Ingredientes cadastrados':'Embalagens cadastradas';
  const query=searchTerms.ingredients.toLocaleLowerCase('pt-BR');
  const filtered=list.filter(x=>String(x.name||'').toLocaleLowerCase('pt-BR').includes(query));
  const target=$('#ingredientTable');
  if(!filtered.length){target.innerHTML=`<div class="empty-table">${list.length?'Nenhum resultado para essa busca.':`Ainda não há ${isIngredients?'ingredientes':'embalagens'} cadastrados.`}<br><button class="ghost" onclick="openItemModal('${isIngredients?'ingredients':'packaging'}')">${isIngredients?'Adicionar ingrediente':'Adicionar embalagem'}</button></div>`;return;}
  target.innerHTML=`<table class="data-table"><thead><tr><th>Nome</th><th>Preço pago</th><th>Qtd. da embalagem</th><th>Unidade</th><th>Custo por unidade-base</th><th>Observação</th><th></th></tr></thead><tbody>${filtered.map(item=>`<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${money(item.price)}</td><td>${qtyFmt(item.packageQty,3)}</td><td>${titleCaseUnit(item.packageUnit)}</td><td class="cost-value">${money(costPerBase(item))} / ${titleCaseUnit(baseUnit(item.packageUnit))}</td><td>${escapeHtml(item.note||'')}</td><td class="actions-cell"><div class="actions"><button class="icon-btn" title="Editar" aria-label="Editar ${escapeAttr(item.name)}" onclick="openItemModal('${isIngredients?'ingredients':'packaging'}','${item.id}')">✎</button><button class="icon-btn text-danger" title="Excluir" aria-label="Excluir ${escapeAttr(item.name)}" onclick="deleteItem('${isIngredients?'ingredients':'packaging'}','${item.id}')">×</button></div></td></tr>`).join('')}</tbody></table>`;
}
$$('[data-ingredient-tab]').forEach(tab=>tab.addEventListener('click',()=>{currentIngredientTab=tab.dataset.ingredientTab;renderIngredients();}));
$('#ingredientSearch').addEventListener('input',event=>{searchTerms.ingredients=event.target.value;renderIngredients();const input=$('#ingredientSearch');input.focus();input.setSelectionRange(input.value.length,input.value.length);});
$('#newIngredientBtn').addEventListener('click',()=>openItemModal('ingredients'));
$('#newPackagingBtn').addEventListener('click',()=>openItemModal('packaging'));
function openItemModal(type,id=null) {
  const arr=type==='ingredients'?db.ingredients:db.packaging; const old=id?getItemById(arr,id):null; const title=type==='ingredients'?'ingrediente':'embalagem';
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">BASE DE CÁLCULO</span><h2 id="modalTitle">${old?'Editar':'Novo'} ${title}</h2><p>O custo é calculado dividindo o preço pago pela quantidade comprada.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome<input id="itemName" value="${escapeAttr(old?.name||'')}" placeholder="${type==='ingredients'?'Ex.: Manteiga sem sal':'Ex.: Saquinho individual'}" required></label><label>Preço pago (R$)<input id="itemPrice" type="number" min="0" step="0.01" value="${old?.price??''}" placeholder="0,00"></label><label>Quantidade na embalagem<input id="itemQty" type="number" min="0.001" step="0.001" value="${old?.packageQty??''}" placeholder="Ex.: 1000"></label><label>Unidade<select id="itemUnit">${unitOptions(old?.packageUnit||(type==='ingredients'?'g':'un'),type)}</select></label><label class="full-field">Observação (opcional)<input id="itemNote" value="${escapeAttr(old?.note||'')}" placeholder="Marca, tamanho, local de compra..."></label></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveItem('${type}','${id||''}')">Salvar ${title}</button></div>`;
  openModal();
}
function saveItem(type,id) {
  const item={id:id||uid(type==='ingredients'?'ing':'pack'),name:$('#itemName').value.trim(),price:num($('#itemPrice').value),packageQty:num($('#itemQty').value),packageUnit:$('#itemUnit').value,note:$('#itemNote').value.trim()};
  if(!item.name||!item.packageQty){toast('Preencha o nome e a quantidade da embalagem.','error');return;}
  const arr=type==='ingredients'?db.ingredients:db.packaging;const idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);
  saveDB();closeModal();renderIngredients();renderStart();renderMasses();renderFillings();renderCosts();renderPricing();toast(`${type==='ingredients'?'Ingrediente':'Embalagem'} salvo.`);
}
function deleteItem(type,id) {
  const arr=type==='ingredients'?db.ingredients:db.packaging;const item=getItemById(arr,id);if(!item)return;
  const referenced=type==='ingredients'&&(db.masses.some(m=>(m.ingredients||[]).some(r=>r.ingredientId===id))||db.fillings.some(f=>(f.ingredients||[]).some(r=>r.ingredientId===id))) || type==='packaging'&&db.salesFormats.some(f=>(f.packaging||[]).some(r=>r.packagingId===id));
  if(referenced){toast('Este item é usado em uma ficha técnica ou formato de venda. Remova o vínculo antes de excluir.','error');return;}
  if(!confirm(`Excluir ${item.name}?`))return;const idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr.splice(idx,1);saveDB();renderIngredients();renderStart();renderCosts();renderPricing();toast('Item excluído.');
}

// EDITOR DE LINHAS DE INGREDIENTES PARA MASSAS E RECHEIOS
function ingredientRowHTML(row={ingredientId:'',amount:'',unit:'g'}) {
  const opts=db.ingredients.map(item=>`<option value="${item.id}" ${item.id===row.ingredientId?'selected':''}>${escapeHtml(item.name)}</option>`).join('');
  const selectedIngredient=getIngredient(row.ingredientId);const fallbackUnit=baseUnit(selectedIngredient?.packageUnit||'g');const currentUnit=row.unit||fallbackUnit;
  return `<div class="ingredient-edit-row" data-ingredient-row><select class="ing-select" aria-label="Ingrediente"><option value="">Selecionar ingrediente</option>${opts}</select><input class="ing-amount" type="number" min="0" step="0.001" value="${row.amount??''}" placeholder="Qtd." aria-label="Quantidade"><select class="ing-unit" aria-label="Unidade">${['g','kg','ml','l','un','m','cm'].map(u=>`<option value="${u}" ${u===currentUnit?'selected':''}>${titleCaseUnit(u)}</option>`).join('')}</select><button class="remove-row" type="button" aria-label="Remover ingrediente" onclick="this.closest('[data-ingredient-row]').remove()">×</button></div>`;
}
function addIngredientRow(containerId,row={ingredientId:'',amount:'',unit:'g'}) {
  const container=$(`#${containerId}`);if(!container)return;
  container.insertAdjacentHTML('beforeend',ingredientRowHTML(row));
  const newRow=container.lastElementChild;const select=$('.ing-select',newRow);select.addEventListener('change',()=>{const item=getIngredient(select.value);if(item){$('.ing-unit',newRow).value=baseUnit(item.packageUnit);}});
}
function collectIngredientRows(containerId) {
  return $$(`#${containerId} [data-ingredient-row]`).map(row=>({ingredientId:$('.ing-select',row).value,amount:num($('.ing-amount',row).value),unit:$('.ing-unit',row).value})).filter(row=>row.ingredientId&&row.amount>0);
}
function noIngredientHint() { return db.ingredients.length?'Clique em “+ Ingrediente” para adicionar linhas à ficha técnica.':'Cadastre primeiro os insumos na aba Insumos para montar as fichas técnicas.'; }

// MASSAS
$('#newMassBtn').addEventListener('click',()=>openMassModal());
function renderMasses() {
  const list=$('#massList');
  if(!db.masses.length){list.innerHTML=`<div class="card empty-table" style="grid-column:1/-1">Nenhuma massa cadastrada.<br><button class="primary" onclick="openMassModal()">+ Cadastrar primeira massa</button><p class="inline-help">${escapeHtml(noIngredientHint())}</p></div>`;return;}
  list.innerHTML=db.masses.map(m=>{const s=massStats(m);const activeLabel=num(m.realYield)>0?'rendimento real':'rendimento informado';const components=(m.ingredients||[]).map(row=>{const ing=getIngredient(row.ingredientId);return ing?`${escapeHtml(ing.name)} ${qtyFmt(row.amount,3)} ${titleCaseUnit(row.unit)}`:''}).filter(Boolean).slice(0,4).join(' · ');return `<article class="entity-card"><div class="entity-top"><div><h3>${escapeHtml(m.name)}</h3><p>${(m.ingredients||[]).length} ingrediente(s) · ${escapeHtml(activeLabel)}</p></div><div class="entity-actions"><button class="icon-btn" title="Duplicar massa" aria-label="Duplicar massa" onclick="duplicateEntity('masses','${m.id}')">⧉</button><button class="icon-btn" title="Editar massa" aria-label="Editar massa" onclick="openMassModal('${m.id}')">✎</button><button class="icon-btn text-danger" title="Excluir massa" aria-label="Excluir massa" onclick="deleteEntity('masses','${m.id}')">×</button></div></div><div class="entity-metrics"><div class="metric"><span>Custo da receita</span><strong>${money(s.batchCost)}</strong></div><div class="metric"><span>Rendimento ativo</span><strong>${qtyFmt(s.yieldUsed,0)} un.</strong></div><div class="metric"><span>Custo por cookie</span><strong>${money(s.costPerCookie)}</strong></div></div><div class="entity-ingredients">${components||'Nenhum ingrediente informado.'}${(m.ingredients||[]).length>4?` <strong>+${m.ingredients.length-4} itens</strong>`:''}</div><div class="entity-footer"><small>${num(m.realMass)>0?'Peso real da massa':'Peso estimado (só quantidades em g/ml)'}: ${s.batchWeight>0?`${qtyFmt(s.batchWeight,1)} g`:'não informado'}</small><strong>${qtyFmt(s.cookieWeight,0)} g por cookie</strong></div></article>`;}).join('');
}
function openMassModal(id=null) {
  const old=id?getItemById(db.masses,id):null;const s=old?massStats(old):null;const rows=old?.ingredients||[];
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">FICHA TÉCNICA</span><h2 id="modalTitle">${old?'Editar massa':'Nova massa'}</h2><p>Os preços vêm da aba Insumos. Informe o rendimento usado na sua produção.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid three"><label>Nome da massa<input id="massName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Tradicional" required></label><label>Peso de cada cookie (g)<input id="massCookieWeight" type="number" min="1" step="1" value="${old?.cookieWeight??80}"></label><label>Rendimento informado (un.)<input id="massYieldCount" type="number" min="1" step="1" value="${old?.yieldCount??12}" placeholder="12"></label><label>Rendimento real (un.)<input id="massRealYield" type="number" min="1" step="1" value="${old?.realYield||''}" placeholder="${s?.yieldUsed||'Usa o rendimento informado'}"></label><label>Peso real da fornada (g)<input id="massRealWeight" type="number" min="0" step="0.1" value="${old?.realMass||''}" placeholder="${s?.estimatedWeight?qtyFmt(s.estimatedWeight,1):'Soma dos ingredientes'}"></label><label>Nota / observação<input id="massNote" value="${escapeAttr(old?.note||'')}" placeholder="Opcional"></label></div><div class="form-section"><div class="form-section-head"><div><strong>Ingredientes da massa</strong><small>Use a unidade que corresponde à quantidade da receita: g, ml ou un.</small></div><button class="secondary small" type="button" onclick="addIngredientRow('massIngredientRows')">+ Ingrediente</button></div><div id="massIngredientRows" class="ingredient-editor">${rows.length?'':'<div class="inline-help">'+escapeHtml(noIngredientHint())+'</div>'}</div></div><div class="modal-notice">Se o rendimento real estiver preenchido, ele prevalece. Caso contrário, será usado o rendimento informado; se os dois estiverem vazios, o sistema estima pelo peso da massa e pelo peso por cookie.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveMass('${id||''}')">Salvar massa</button></div>`;
  rows.forEach(row=>addIngredientRow('massIngredientRows',row));openModal();
}
function saveMass(id) {
  const item={id:id||uid('mass'),name:$('#massName').value.trim(),cookieWeight:num($('#massCookieWeight').value)||80,yieldCount:num($('#massYieldCount').value),realYield:num($('#massRealYield').value),realMass:num($('#massRealWeight').value),note:$('#massNote').value.trim(),ingredients:collectIngredientRows('massIngredientRows')};
  if(!item.name){toast('Informe o nome da massa.','error');return;}if(!item.ingredients.length){toast('Adicione ao menos um ingrediente à massa.','error');return;}
  const arr=db.masses,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);saveDB();closeModal();renderMasses();renderStart();renderCosts();renderPricing();toast('Massa salva.');
}

// RECHEIOS
$('#newFillingBtn').addEventListener('click',()=>openFillingModal());
function renderFillings() {
  const list=$('#fillingList');
  if(!db.fillings.length){list.innerHTML=`<div class="card empty-table" style="grid-column:1/-1">Nenhum recheio cadastrado.<br><button class="primary" onclick="openFillingModal()">+ Cadastrar primeiro recheio</button><p class="inline-help">${escapeHtml(noIngredientHint())}</p></div>`;return;}
  list.innerHTML=db.fillings.map(f=>{const s=fillingStats(f);const components=(f.ingredients||[]).map(row=>{const ing=getIngredient(row.ingredientId);return ing?`${escapeHtml(ing.name)} ${qtyFmt(row.amount,3)} ${titleCaseUnit(row.unit)}`:''}).filter(Boolean).slice(0,4).join(' · ');return `<article class="entity-card"><div class="entity-top"><div><h3>${escapeHtml(f.name)}</h3><p>${(f.ingredients||[]).length} item(ns) · quantidade por cookie</p></div><div class="entity-actions"><button class="icon-btn" title="Duplicar recheio" aria-label="Duplicar recheio" onclick="duplicateEntity('fillings','${f.id}')">⧉</button><button class="icon-btn" title="Editar recheio" aria-label="Editar recheio" onclick="openFillingModal('${f.id}')">✎</button><button class="icon-btn text-danger" title="Excluir recheio" aria-label="Excluir recheio" onclick="deleteEntity('fillings','${f.id}')">×</button></div></div><div class="entity-metrics"><div class="metric"><span>Ingredientes</span><strong>${money(s.ingredientCost)}</strong></div><div class="metric"><span>Outros custos</span><strong>${money(s.otherCost)}</strong></div><div class="metric"><span>Custo por cookie</span><strong>${money(s.costPerCookie)}</strong></div></div><div class="entity-ingredients">${components||'Sem ingredientes pesados'}${f.otherCost>0?` · <strong>outros custos lançados em reais</strong>`:''}</div><div class="entity-footer"><small>${(f.ingredients||[]).length?'Custo recalculado pelos insumos':'Use “Outros” quando não pesar o item'}</small><strong>${money(s.costPerCookie)} / cookie</strong></div></article>`;}).join('');
}
function openFillingModal(id=null) {
  const old=id?getItemById(db.fillings,id):null;const s=old?fillingStats(old):null;const rows=old?.ingredients||[];
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">FICHA TÉCNICA</span><h2 id="modalTitle">${old?'Editar recheio':'Novo recheio'}</h2><p>Informe o quanto de cada insumo vai em um único cookie.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome do recheio<input id="fillingName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Nutella" required></label><label>Outros custos por cookie (R$) <button class="info-tip" data-info="Use este campo quando parte do recheio não for medida em gramas ou unidades. Exemplo: lançar diretamente R$ 1,05 por cookie. O valor é somado ao custo dos ingredientes abaixo.">i</button><input id="fillingOtherCost" type="number" min="0" step="0.01" value="${old?.otherCost??0}" placeholder="0,00"></label></div><div class="form-section"><div class="form-section-head"><div><strong>Ingredientes por cookie</strong><small>Exemplo: 40 g de Nutella por unidade, não 40 g pela receita inteira.</small></div><button class="secondary small" type="button" onclick="addIngredientRow('fillingIngredientRows')">+ Ingrediente</button></div><div id="fillingIngredientRows" class="ingredient-editor">${rows.length?'':'<div class="inline-help">'+escapeHtml(noIngredientHint())+'</div>'}</div></div><div class="notice compact">Custo calculado agora: <strong>${money(s?.costPerCookie||0)} por cookie</strong>. O valor é atualizado automaticamente quando você salvar alterações nos insumos.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveFilling('${id||''}')">Salvar recheio</button></div>`;
  rows.forEach(row=>addIngredientRow('fillingIngredientRows',row));openModal();
}
function saveFilling(id) {
  const item={id:id||uid('fill'),name:$('#fillingName').value.trim(),otherCost:num($('#fillingOtherCost').value),ingredients:collectIngredientRows('fillingIngredientRows')};
  if(!item.name){toast('Informe o nome do recheio.','error');return;}if(!item.ingredients.length&&item.otherCost<=0){toast('Adicione ingredientes ou informe outros custos por cookie.','error');return;}
  const arr=db.fillings,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);saveDB();closeModal();renderFillings();renderStart();renderCosts();renderPricing();toast('Recheio salvo.');
}

// SABORES / CUSTO POR COOKIE
$('#newProductBtn').addEventListener('click',()=>openProductModal());
$('#productSearch').addEventListener('input',event=>{searchTerms.products=event.target.value;renderCosts();const input=$('#productSearch');input.focus();input.setSelectionRange(input.value.length,input.value.length);});
function formatNamesForProduct(product) {
  const formats=(product.formatIds||[]).map(id=>getItemById(db.salesFormats,id)).filter(Boolean);
  if(!formats.length) return '<span class="muted-value">Sem formato vinculado</span>';
  return `<div class="format-list-cell">${formats.map(format=>{
    const stats=productFormatStats(product,format);
    return `<button type="button" class="format-pill" data-product-details="${product.id}" title="Ver custo detalhado de ${escapeAttr(format.name)}">${escapeHtml(format.name)} <small>${money(stats.packCost)}</small></button>`;
  }).join('')}</div>`;
}
function renderCosts() {
  const target=$('#costTable');const products=db.products.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(searchTerms.products.toLocaleLowerCase('pt-BR')));
  const stats=db.products.map(p=>productStats(p));
  $('#costProductCount').textContent=db.products.length;
  $('#costLowest').textContent=stats.length?money(Math.min(...stats.map(s=>s.baseCost))):money(0);
  $('#costHighest').textContent=stats.length?money(Math.max(...stats.map(s=>s.baseCost))):money(0);
  $('#costIndirect').textContent=money(sumIndirectBatchCost());
  const configMessage=$('#costConfigurationMessage');
  if(configMessage){
    const indirectCount=(db.settings.indirectCosts||[]).filter(item=>!item.deferredSetup&&item.legacyKey!=='labor'&&indirectCostValue(item)>0).length;
    configMessage.textContent=indirectCount
      ? `${indirectCount} custo(s) de produção configurado(s) já são rateados automaticamente. Mão de obra ainda não foi configurada e não entra no custo base.`
      : 'Por enquanto, o custo base soma massa + recheio. Gás, energia, materiais de produção e mão de obra ainda não estão configurados; vamos preencher essa parte juntos em Ajustes.';
  }
  if(!products.length){target.innerHTML=`<div class="empty-table">${db.products.length?'Nenhum sabor corresponde à busca.':'Nenhum sabor montado ainda. Combine uma massa com um recheio.'}<br><button class="primary" onclick="openProductModal()">+ Novo sabor</button></div>`;return;}
  target.innerHTML=`<table class="data-table cost-table"><thead><tr><th>Sabor</th><th>Massa usada</th><th>Custo da massa</th><th>Recheio</th><th>Custo do recheio</th><th>Massa + recheio</th><th>Custo base</th><th>Formatos de venda</th><th></th></tr></thead><tbody>${products.map(p=>{const s=productStats(p);return `<tr><td><button type="button" class="product-detail-link" data-product-details="${p.id}">${escapeHtml(p.name)}</button></td><td>${escapeHtml(getItemById(db.masses,p.massId)?.name||'Não definida')}</td><td>${money(s.mass.costPerCookie)}</td><td>${escapeHtml(getItemById(db.fillings,p.fillingId)?.name||'Não definido')}</td><td>${money(s.filling.costPerCookie)}</td><td>${money(s.ingredientCost)}</td><td><strong class="cost-value">${money(s.baseCost)}</strong>${s.allocatedIndirect>0?`<small class="cell-subnote">inclui custos de produção</small>`:''}</td><td class="format-cell">${formatNamesForProduct(p)}</td><td class="actions-cell"><div class="actions"><button class="icon-btn" title="Duplicar sabor" aria-label="Duplicar sabor" onclick="duplicateEntity('products','${p.id}')">⧉</button><button class="icon-btn" title="Editar sabor" aria-label="Editar sabor" onclick="openProductModal('${p.id}')">✎</button><button class="icon-btn text-danger" title="Excluir sabor" aria-label="Excluir sabor" onclick="deleteEntity('products','${p.id}')">×</button></div></td></tr>`;}).join('')}</tbody></table>`;
}
$('#costTable').addEventListener('click',event=>{
  const button=event.target.closest('[data-product-details]');if(!button)return;
  openProductDetails(button.dataset.productDetails);
});
function formatCostRows(format) {
  return (format.packaging||[]).map(row=>{
    const item=getItemById(db.packaging,row.packagingId);
    if(!item) return `<tr><td>Embalagem removida</td><td>${qtyFmt(row.quantity,3)}</td><td class="text-danger">Não calculado</td></tr>`;
    return `<tr><td>${escapeHtml(item.name)}</td><td>${qtyFmt(row.quantity,3)} ${titleCaseUnit(baseUnit(item.packageUnit))}</td><td>${money(num(row.quantity)*costPerBase(item))}</td></tr>`;
  }).join('');
}
function ingredientBreakdownRows(rows) {
  if(!rows?.length) return '<tr><td colspan="3" class="muted-value">Nenhum ingrediente pesado nesta ficha.</td></tr>';
  return rows.map(row=>{
    const item=getIngredient(row.ingredientId);const cost=calculateIngredientCost(row);
    return `<tr><td>${escapeHtml(item?.name||'Ingrediente removido')}</td><td>${qtyFmt(row.amount,3)} ${titleCaseUnit(row.unit||(item?baseUnit(item.packageUnit):''))}</td><td>${money(cost)}</td></tr>`;
  }).join('');
}
function openProductDetails(id) {
  const p=getProduct(id);if(!p)return;
  const s=productStats(p);const mass=getItemById(db.masses,p.massId);const filling=getItemById(db.fillings,p.fillingId);
  const formats=(p.formatIds||[]).map(fid=>getItemById(db.salesFormats,fid)).filter(Boolean);
  const legacyWarning=s.hasLegacyValues?`<div class="notice compact legacy-cost-notice"><strong>Valores preservados do cadastro anterior, ainda não incluídos no novo cálculo:</strong><br>${s.legacyFixedCost>0?`Fixos antigos por cookie: ${money(s.legacyFixedCost)}. `:''}${s.legacyLaborCost>0?`Mão de obra antiga por cookie: ${money(s.legacyLaborCost)}. `:''}${s.legacyPackagingCost>0?`Embalagem antiga manual: ${money(s.legacyPackagingCost)}. `:''}Os custos de produção serão configurados em Ajustes, e a embalagem deve ser vinculada a um formato de venda para evitar duplicidade.</div>`:'';
  const formatHtml=formats.length?formats.map(format=>{
    const fs=productFormatStats(p,format);const packageRows=formatCostRows(format);
    return `<article class="cost-detail-format"><div class="cost-detail-format-head"><div><h4>${escapeHtml(format.name)}</h4><p>${fs.count} cookie(s) por formato</p></div><div class="cost-detail-format-price"><span>Embalagem</span><strong>${money(fs.packCost)}</strong></div></div><div class="cost-detail-math"><div><span>Custo base × quantidade</span><strong>${money(s.baseCost*fs.count)}</strong></div><div><span>Embalagens individuais</span><strong>${money(fs.packCost)} por pedido</strong></div><div><span>Kraft compartilhado (custo real por pedido)</span><strong>${money(fs.sharedKraftCostPerOrder)}</strong></div><div><span>Reserva de kraft</span><strong>${money(fs.kraftReservePerCookie)} por cookie</strong></div><div><span>Transporte e outros adicionais</span><strong>${money(fs.extraCost)} por pedido</strong></div><div><span>Custo total do formato</span><strong>${money(fs.total)}</strong></div><div><span>Custo por cookie neste formato</span><strong>${money(fs.costPerCookie)}</strong></div><div><span>Preço sugerido do formato</span><strong>${money(fs.suggestedPrice)}</strong></div></div><details class="detail-disclosure"><summary>Ver composição da embalagem</summary><div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Embalagem</th><th>Quantidade</th><th>Custo</th></tr></thead><tbody>${packageRows||'<tr><td colspan="3">Sem itens de embalagem.</td></tr>'}</tbody></table></div></details></article>`;
  }).join(''):'<div class="empty-table">Nenhum formato vinculado a este sabor. Edite o sabor e selecione os formatos cadastrados, ou crie um em Preço → Gerenciar formatos. O custo base não inclui embalagem.</div>';
  const activeIndirectRows=s.indirectItems.filter(({item})=>!item.deferredSetup&&item.legacyKey!=='labor');const pendingIndirectRows=s.indirectItems.filter(({item})=>item.deferredSetup||item.legacyKey==='labor');const indirectRows=[...activeIndirectRows.map(({item,batchCost,perCookie})=>`<tr><td>${escapeHtml(item.name)}</td><td>${money(batchCost)}</td><td>${money(perCookie)}</td></tr>`),...pendingIndirectRows.map(({item})=>`<tr><td>${escapeHtml(item.name)} <span class="muted-value">(antigo)</span></td><td>Pendente</td><td>Pendente</td></tr>`)].join('')||'<tr><td colspan="3" class="muted-value">Nenhum custo de produção configurado ainda.</td></tr>';
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">FICHA DETALHADA</span><h2 id="modalTitle">${escapeHtml(p.name)}</h2><p>O custo base não inclui a embalagem de venda. Cada formato tem seu próprio custo final.</p></div><div class="modal-head-actions"><button class="secondary small" onclick="openProductModal('${p.id}')">Editar sabor</button><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div></div>
    ${legacyWarning}
    <div class="cost-detail-kpis"><div><span>Custo da massa / cookie</span><strong>${money(s.mass.costPerCookie)}</strong><small>${escapeHtml(mass?.name||'Massa não definida')}</small></div><div><span>Custo do recheio / cookie</span><strong>${money(s.filling.costPerCookie)}</strong><small>${escapeHtml(filling?.name||'Recheio não definido')}</small></div><div><span>Custo base por cookie</span><strong>${money(s.baseCost)}</strong><small>Massa + recheio + custos configurados</small></div></div>
    <section class="cost-detail-section"><div class="cost-detail-section-head"><div><h3>Composição da massa</h3><p>Ingredientes e custo calculado por fornada.</p></div><strong>${money(s.mass.batchCost)} <small>/ fornada</small></strong></div><div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Custo da quantidade</th></tr></thead><tbody>${ingredientBreakdownRows(mass?.ingredients)}</tbody></table></div><p class="cost-detail-note">Rendimento usado no cálculo: ${s.mass.yieldUsed||0} cookie(s) · custo por cookie: ${money(s.mass.costPerCookie)}.</p></section>
    <section class="cost-detail-section"><div class="cost-detail-section-head"><div><h3>Composição do recheio</h3><p>Quantidades por cookie.</p></div><strong>${money(s.filling.costPerCookie)} <small>/ cookie</small></strong></div><div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Ingrediente</th><th>Quantidade por cookie</th><th>Custo</th></tr></thead><tbody>${ingredientBreakdownRows(filling?.ingredients)}</tbody></table></div>${s.filling.otherCost>0?`<p class="cost-detail-note">Outros custos registrados no recheio: ${money(s.filling.otherCost)} por cookie.</p>`:''}</section>
    <section class="cost-detail-section"><div class="cost-detail-section-head"><div><h3>Custos de produção rateados</h3><p>Estes itens vêm de Ajustes e são divididos pelo rendimento real usado da massa.</p></div><strong>${money(s.allocatedIndirect)} <small>/ cookie</small></strong></div><div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Custo configurado</th><th>Valor por fornada</th><th>Rateio por cookie</th></tr></thead><tbody>${indirectRows}</tbody></table></div><div class="cost-detail-base"><span>Custo base calculado</span><strong>${money(s.baseCost)}</strong><small>Não inclui embalagem, mão de obra ainda não configurada nem custos antigos pendentes de revisão.</small></div></section>
    <section class="cost-detail-section"><div class="cost-detail-section-head"><div><h3>Formatos de venda</h3><p>O custo da embalagem é buscado dos insumos vinculados ao formato.</p></div><button class="secondary small" onclick="closeModal();navigate('pricing');manageSalesFormats()">Gerenciar formatos</button></div><div class="cost-detail-format-list">${formatHtml}</div></section>
    <div class="modal-footer"><button class="secondary" onclick="closeModal()">Fechar</button><button class="primary" onclick="openProductModal('${p.id}')">Editar sabor</button></div>`;
  openModal();
}
function openProductModal(id=null) {
  const old=id?getProduct(id):null;
  const massOpts=db.masses.map(m=>`<option value="${m.id}" ${m.id===old?.massId?'selected':''}>${escapeHtml(m.name)}</option>`).join('');
  const fillingOpts=db.fillings.map(f=>`<option value="${f.id}" ${f.id===old?.fillingId?'selected':''}>${escapeHtml(f.name)}</option>`).join('');
  const formatChecks=db.salesFormats.length?db.salesFormats.map(f=>`<label class="checkbox-row"><input type="checkbox" class="product-format-check" value="${f.id}" ${(old?.formatIds||[]).includes(f.id)?'checked':''}> <span><strong>${escapeHtml(f.name)}</strong> <span class="muted-value">· ${f.cookieCount||1} un. · embalagem ${money(formatPackagingCost(f))}</span></span></label>`).join(''):'<div class="inline-help">Nenhum formato global cadastrado. Você pode criar formatos na aba Preço.</div>';
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">COMPOSIÇÃO DO CUSTO</span><h2 id="modalTitle">${old?'Editar sabor':'Novo sabor'}</h2><p>Cadastre a combinação de massa e recheio. Embalagens e custos de produção são vinculados em outras áreas e calculados automaticamente.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome do sabor<input id="productName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Cookie de Nutella" required></label><label>Massa usada<select id="productMass"><option value="">Selecionar massa</option>${massOpts}</select></label><label>Recheio usado<select id="productFilling"><option value="">Sem recheio / selecionar</option>${fillingOpts}</select></label><label>Markup alvo deste sabor <button class="info-tip" data-info="Multiplicador aplicado ao custo base para gerar o preço sugerido. Deixe em branco para herdar o markup padrão da aba Preço. A embalagem entra separadamente em cada formato.">i</button><input id="productMarkup" type="number" min="1" max="20" step="0.1" value="${old?.markupTarget??''}" placeholder="Padrão: ${qtyFmt(db.settings.defaultMarkup,1)}×"></label><label>Preço que cobra hoje por cookie (R$)<input id="productSalePrice" type="number" min="0" step="0.01" value="${old?.salePrice??''}" placeholder="Opcional"></label></div><div class="notice compact">Você não precisa preencher embalagem, custos fixos ou mão de obra aqui. O formato define a embalagem e os custos de produção serão configurados em Ajustes. Valores antigos são preservados e sinalizados na ficha detalhada.</div><div class="form-section"><div class="form-section-head"><div><strong>Formatos de venda aplicáveis</strong><small>Marque todos os formatos que esse sabor pode utilizar. O valor ao lado é o custo automático da embalagem.</small></div></div><div class="checkbox-list" id="productFormatList">${formatChecks}</div><p class="inline-help">Para cadastrar ou editar formatos, use “Gerenciar formatos” na aba Preço.</p></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveProduct('${id||''}')">Salvar sabor</button></div>`;
  openModal();
}
function saveProduct(id) {
  const old=id?getProduct(id):null;const markupValue=$('#productMarkup').value.trim();
  const item={...(old||{}),id:id||uid('prod'),name:$('#productName').value.trim(),massId:$('#productMass').value,fillingId:$('#productFilling').value,packagingCost:num(old?.packagingCost),fixedCost:num(old?.fixedCost),laborCost:num(old?.laborCost),salePrice:num($('#productSalePrice').value),markupTarget:markupValue===''?null:Math.max(1,num(markupValue)),platformFee:old?.platformFee??0.27,formatIds:$$('.product-format-check').filter(c=>c.checked).map(c=>c.value)};
  if(!old){const workFormat=db.salesFormats.find(f=>String(f.name||'').trim().toLocaleLowerCase('pt-BR')==='trabalho da agatha');if(workFormat&&!item.formatIds.includes(workFormat.id))item.formatIds.push(workFormat.id);}
  if(!item.name){toast('Informe o nome do sabor.','error');return;}if(!item.massId||!getItemById(db.masses,item.massId)){toast('Escolha a massa usada neste sabor.','error');return;}
  const arr=db.products,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);saveDB();closeModal();renderCosts();renderPricing();renderStart();toast('Sabor salvo.');
}
// PRICE, MARGINS AND KITS
$('#defaultMargin').addEventListener('change',()=>{const margin=Math.min(80,Math.max(1,num($('#defaultMargin').value)||40));db.settings.defaultMargin=margin;db.settings.defaultMarkup=1/(1-margin/100);saveDB();renderPricing();renderStart();renderCosts();toast('Margem desejada atualizada.');});
function renderPricing() {
  const currentMargin=db.settings.defaultMargin??40; $('#defaultMargin').value=currentMargin; db.settings.defaultMarkup=1/(1-currentMargin/100);
  const products=db.products.map(p=>({p,s:productStats(p)}));
  const priced=products.filter(x=>x.s.price>0);const lowMargin=priced.filter(x=>(x.s.margin??0)<35);
  const avgMargin=priced.length?priced.reduce((sum,x)=>sum+(x.s.margin||0),0)/priced.length:0;
  const best=priced.slice().sort((a,b)=>(b.s.margin||0)-(a.s.margin||0))[0];
  $('#pricingKpis').innerHTML=`<div class="price-kpi"><span>Margem média dos preços atuais</span><strong>${priced.length?pct(avgMargin):'—'}</strong><small>${priced.length?'calculada sobre '+priced.length+' sabor(es) com preço atual':'Preencha o preço atual na tabela'}</small></div><div class="price-kpi"><span>Melhor margem atual</span><strong>${best?escapeHtml(best.p.name):'—'}</strong><small>${best?pct(best.s.margin)+' de margem · lucro '+money(best.s.profit):'Ainda não há preços para comparar'}</small></div><div class="price-kpi"><span>Sabores abaixo de 35% de margem</span><strong>${lowMargin.length}</strong><small>${lowMargin.length?'Confira os preços sinalizados em vermelho':'Nenhum sabor com margem baixa detectada'}</small></div>`;
  const target=$('#priceTable');
  if(!products.length){target.innerHTML='<div class="empty-table">Cadastre os sabores na aba Custo por cookie para calcular os preços.</div>';}
  else target.innerHTML=`<table class="data-table"><thead><tr><th>Sabor</th><th>Custo base</th><th>Markup alvo</th><th>Preço sugerido (base)</th><th>Preço hoje / cookie</th><th>Lucro sobre custo base</th><th>Margem sobre custo base</th><th>Markup real</th><th>Taxa plataforma</th><th>Preço p/ plataforma</th></tr></thead><tbody>${products.map(({p,s})=>`<tr><td><strong>${escapeHtml(p.name)}</strong></td><td class="cost-value">${money(s.total)}</td><td><input class="table-input" aria-label="Markup alvo de ${escapeAttr(p.name)}" type="number" min="1" max="20" step="0.1" value="${qtyFmt(s.markup,1)}" data-price-field="markupTarget" data-product-id="${p.id}"></td><td><strong class="cost-value">${money(s.suggestedPrice)}</strong></td><td><input class="table-input wide" aria-label="Preço atual de ${escapeAttr(p.name)}" type="number" min="0" step="0.01" value="${p.salePrice>0?p.salePrice:''}" placeholder="R$" data-price-field="salePrice" data-product-id="${p.id}"></td><td class="${s.price>0&&s.profit<0?'text-danger':'cost-value'}">${s.price>0?money(s.profit):'—'}</td><td>${s.margin===null?'—':`<span class="margin-pill ${s.margin<35?'low':''}">${pct(s.margin)}</span>`}</td><td>${s.realMarkup===null?'—':`<span class="markup-chip">${qtyFmt(s.realMarkup,2)}×</span>`}</td><td><label class="inline-fee"><input class="table-input" aria-label="Taxa de plataforma de ${escapeAttr(p.name)}" type="number" min="0" max="95" step="1" value="${Math.round(s.fee*100)}" data-price-field="platformFee" data-product-id="${p.id}">%</label></td><td class="cost-value">${s.price>0?money(s.platformPrice):'—'}</td></tr>`).join('')}</tbody></table>`;
  renderKits(); renderFormatSummaries();
}
$('#priceTable').addEventListener('change',event=>{
  const input=event.target.closest('[data-price-field]');if(!input)return;const product=getProduct(input.dataset.productId);if(!product)return;const field=input.dataset.priceField;
  if(field==='markupTarget')product.markupTarget=Math.max(1,num(input.value)||num(db.settings.defaultMarkup)||3);
  if(field==='salePrice')product.salePrice=num(input.value);
  if(field==='platformFee')product.platformFee=Math.min(.95,num(input.value)/100);
  saveDB();renderPricing();renderStart();renderCosts();
});
$('#newKitBtn').addEventListener('click',()=>openKitModal());
function renderKits() {
  const target=$('#kitTable');
  if(!db.kits.length){target.innerHTML='<div class="empty-table">Nenhum kit cadastrado ainda. Crie caixas de 4, 6 ou 12 unidades, por exemplo.</div>';return;}
  target.innerHTML=`<table class="data-table"><thead><tr><th>Kit</th><th>Qtd.</th><th>Sabor base</th><th>Formato / embalagem</th><th>Custo do kit</th><th>Preço sugerido</th><th>Desconto</th><th>Lucro estimado</th><th></th></tr></thead><tbody>${db.kits.map(k=>{const product=getProduct(k.productId);const s=product?productStats(product):null;const format=getItemById(db.salesFormats,k.formatId);const quantity=format?Math.max(1,Math.floor(num(format.cookieCount)||1)):k.quantity;const packCost=format?formatPackagingCost(format):num(k.packagingCost);const extraCost=format?num(format.extraCostPerCookie)*quantity:0;const cost=s?s.baseCost*quantity+packCost+extraCost:0;const suggested=s?cost*s.markup*(1-num(k.discount)/100):0;const profit=suggested-cost;const formatLabel=format?escapeHtml(format.name):num(k.packagingCost)>0?`Embalagem antiga (${money(k.packagingCost)})`:'Sem formato';return `<tr><td><strong>${escapeHtml(k.name)}</strong></td><td>${quantity}</td><td>${escapeHtml(product?.name||'Sabor removido')}</td><td>${formatLabel}</td><td class="cost-value">${money(cost)}</td><td class="cost-value">${money(suggested)}</td><td>${pct(k.discount,0)}</td><td class="${profit<0?'text-danger':'cost-value'}">${money(profit)}</td><td class="actions-cell"><div class="actions"><button class="icon-btn" title="Editar kit" aria-label="Editar kit" onclick="openKitModal('${k.id}')">✎</button><button class="icon-btn text-danger" title="Excluir kit" aria-label="Excluir kit" onclick="deleteEntity('kits','${k.id}')">×</button></div></td></tr>`;}).join('')}</tbody></table>`;
}
function openKitModal(id=null) {
  const old=id?getItemById(db.kits,id):null;
  const options=db.products.map(p=>`<option value="${p.id}" ${p.id===old?.productId?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  const formatOptions=db.salesFormats.map(f=>`<option value="${f.id}" ${f.id===old?.formatId?'selected':''}>${escapeHtml(f.name)} · ${f.cookieCount||1} un. · embalagem ${money(formatPackagingCost(f))}</option>`).join('');
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">KITS E COMBOS</span><h2 id="modalTitle">${old?'Editar kit':'Novo kit'}</h2><p>O kit pode reutilizar um formato global para calcular a embalagem automaticamente.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome do kit<input id="kitName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Caixa com 6" required></label><label>Sabor base<select id="kitProduct"><option value="">Selecionar sabor</option>${options}</select></label><label>Formato de venda / embalagem<select id="kitFormat"><option value="">Sem formato selecionado</option>${formatOptions}</select></label><label>Quantidade de cookies<input id="kitQuantity" type="number" min="1" step="1" value="${old?.quantity??6}"></label><label>Desconto (%)<input id="kitDiscount" type="number" min="0" max="95" step="1" value="${old?.discount??10}"></label></div><div class="modal-notice">Ao selecionar um formato, a quantidade de cookies acompanha o formato e a embalagem é calculada automaticamente. Se nenhum formato for selecionado, kits antigos preservam o custo manual anterior; kits novos ficam sem embalagem calculada até você vincular um formato.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveKit('${id||''}')">Salvar kit</button></div>`;
  openModal();
  const formatSelect=$('#kitFormat'),quantityInput=$('#kitQuantity');
  const syncQuantity=()=>{const f=getItemById(db.salesFormats,formatSelect.value);if(f){quantityInput.value=Math.max(1,Math.floor(num(f.cookieCount)||1));quantityInput.disabled=true;}else quantityInput.disabled=false;};
  formatSelect.addEventListener('change',syncQuantity);syncQuantity();
}
function saveKit(id) {
  const old=id?getItemById(db.kits,id):null;const formatId=$('#kitFormat').value;const format=getItemById(db.salesFormats,formatId);
  const item={...(old||{}),id:id||uid('kit'),name:$('#kitName').value.trim(),quantity:format?Math.max(1,Math.floor(num(format.cookieCount)||1)):Math.max(1,Math.floor(num($('#kitQuantity').value)||1)),productId:$('#kitProduct').value,formatId:formatId||'',discount:Math.min(95,num($('#kitDiscount').value)),packagingCost:format?0:num(old?.packagingCost),salePrice:num(old?.salePrice)};
  if(!item.name||!item.productId||!getProduct(item.productId)){toast('Informe o nome do kit e escolha um sabor base.','error');return;}
  const arr=db.kits,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);saveDB();closeModal();renderPricing();toast('Kit salvo.');
}

// FORMATOS GLOBAIS DE VENDA
$('#manageFormatsBtn').addEventListener('click',()=>manageSalesFormats());
$('#manageFormatsSettingsBtn').addEventListener('click',()=>manageSalesFormats());
function renderFormatSummaries() {
  const assigned=[];
  db.products.forEach(product=>(product.formatIds||[]).forEach(id=>{const f=getItemById(db.salesFormats,id);if(f)assigned.push({product,format:f,stats:productFormatStats(product,f)});}));
  const target=$('#assignedFormatSummary');
  target.innerHTML=assigned.length?assigned.map(item=>`<article class="format-summary-card"><strong>${escapeHtml(item.product.name)} · ${escapeHtml(item.format.name)}</strong><small>${item.stats.count} cookie(s) · Embalagem ${money(item.stats.packCost)} · Transporte/outros ${money(item.stats.extraCost)} · Custo do formato ${money(item.stats.total)}</small><span class="format-count">Preço sugerido do formato: ${money(item.stats.suggestedPrice)} · ${money(item.stats.suggestedPrice/item.stats.count)} por cookie</span></article>`).join(''):'<div class="empty-table" style="grid-column:1/-1">Nenhum formato global vinculado a um sabor. Edite um sabor em “Custo por cookie” para vincular formatos.</div>';
}
function renderPackagingPage(){
  const target=$('#packagingFormatSummary'); if(!target)return;
  target.innerHTML=db.salesFormats.length?db.salesFormats.map(f=>{
    const count=Math.max(1,Math.floor(num(f.cookieCount)||1));
    const pack=formatPackagingBreakdown(f);
    const extra=num(f.extraCostPerCookie)*count;
    const kraftReserve=isDeliveryFormat(f)?num(db.settings.kraftReservePerCookie??0.20)*count:0;
    const rows=(f.packaging||[]).map(row=>{const item=getItemById(db.packaging,row.packagingId);return item?`<div class=\"format-pack-row\"><span>${escapeHtml(item.name)} <small>× ${qtyFmt(row.quantity,2)}</small></span><strong>${money(num(row.quantity)*costPerBase(item))}</strong></div>`:''}).filter(Boolean).join('')||'<div class=\"format-pack-empty\">Nenhuma embalagem vinculada</div>';
    const total=pack.individual+extra+kraftReserve;
    return `<article class=\"format-summary-card redesigned-format-card\"><div class=\"format-card-top\"><div><span class=\"kicker\">FORMATO DE VENDA</span><strong>${escapeHtml(f.name)}</strong></div><span class=\"format-units-pill\">${count} ${count===1?'cookie':'cookies'}</span></div><div class=\"format-card-section\"><h4>Embalagens usadas</h4>${rows}</div><div class=\"format-cost-grid\"><div><small>Embalagens individuais</small><strong>${money(pack.individual)}</strong></div><div><small>Kraft por pedido</small><strong>${money(pack.sharedActual)}</strong></div><div><small>Adicionais e reserva</small><strong>${money(extra+kraftReserve)}</strong></div></div><div class=\"format-card-total\"><div><small>Custo adicional por formato</small><strong>${money(total)}</strong></div><div><small>Equivalente por cookie</small><strong>${money(total/count)}</strong></div></div></article>`;
  }).join(''):'<div class=\"empty-table\">Nenhum formato cadastrado. Clique em “Gerenciar formatos” para criar o primeiro.</div>';
}
function renderSettingsFormatSummary() {
  const target=$('#settingsFormatSummary');if(!target)return;
  target.innerHTML=db.salesFormats.length?db.salesFormats.map(f=>`<div class="cost-item"><div><strong>${escapeHtml(f.name)}</strong><span>${f.cookieCount||1} cookie(s) · Adicional por cookie ${money(f.extraCostPerCookie)} · ${(f.packaging||[]).map(row=>{const p=getItemById(db.packaging,row.packagingId);return p?`${escapeHtml(p.name)} × ${row.quantity}`:'Embalagem removida';}).join(' + ')||'Sem itens de embalagem'}${db.kits.some(k=>k.formatId===f.id)?' · usado em kit':''}</span></div><div class="cost-item-right"><strong>${money(formatPackagingCost(f)+(num(f.extraCostPerCookie)*(num(f.cookieCount)||1)))}</strong><span>embalagem + adicionais do formato</span></div></div>`).join(''):'<div class="empty-table">Nenhum formato global cadastrado.</div>';
}
function manageSalesFormats() {
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">FORMATOS REUTILIZÁVEIS</span><h2 id="modalTitle">Formatos de venda</h2><p>Crie uma combinação de embalagem uma vez e vincule a vários sabores.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div id="formatManagerList"></div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Fechar</button><button class="primary" onclick="openSalesFormatModal(null,manageSalesFormats)">+ Novo formato</button></div>`;
  openModal();renderFormatManagerList();
}
function renderFormatManagerList() {
  const target=$('#formatManagerList');if(!target)return;
  target.innerHTML=db.salesFormats.length?db.salesFormats.map(f=>`<div class="cost-item"><div><strong>${escapeHtml(f.name)}</strong><span>${f.cookieCount||1} cookie(s) · Adicional por cookie ${money(f.extraCostPerCookie)} · ${(f.packaging||[]).map(row=>{const p=getItemById(db.packaging,row.packagingId);return p?`${escapeHtml(p.name)} × ${row.quantity}`:'Item removido';}).join(' + ')}</span></div><div class="actions"><button class="icon-btn" onclick="openSalesFormatModal('${f.id}',manageSalesFormats)" aria-label="Editar formato">✎</button><button class="icon-btn text-danger" onclick="deleteSalesFormat('${f.id}')" aria-label="Excluir formato">×</button></div></div>`).join(''):'<div class="empty-table">Nenhum formato ainda.</div>';
}
function openSalesFormatModal(id=null,onSaved=null) {
  const old=id?getItemById(db.salesFormats,id):null;
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">FORMATOS REUTILIZÁVEIS</span><h2 id="modalTitle">${old?'Editar formato':'Novo formato de venda'}</h2><p>O formato pode ser atribuído a vários sabores. Editá-lo atualiza os sabores vinculados. A embalagem é opcional, então você também pode criar um formato sem custo adicional.</p></div><button class="close" onclick="${onSaved?'manageSalesFormats()':'closeModal()'}" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome do formato<input id="formatName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Delivery" required></label><label>Cookies neste formato / pedido<input id="formatCookieCount" type="number" min="1" step="1" value="${old?.cookieCount??1}"></label><label>Adicional por cookie (R$) <button class="info-tip" data-info="Use para custos específicos deste canal, como o transporte para levar os cookies ao trabalho. Esse valor é multiplicado pela quantidade de cookies do formato.">i</button><input id="formatExtraCost" type="number" min="0" step="0.01" value="${old?.extraCostPerCookie??0}" placeholder="0,00"></label></div><div class="notice compact">Para Trabalho da Agatha, a referência inicial é R$ 10 por ida ÷ 12 cookies = R$ 0,84 por cookie. O valor fica fixo para a precificação e não precisa ser recalculado a cada viagem.</div><div class="form-section"><div class="form-section-head"><div><strong>Itens de embalagem</strong><small>${db.packaging.length?'Informe quantas unidades de cada embalagem são usadas por formato/pedido.':'Cadastre embalagens primeiro na aba Insumos.'}</small></div><button class="secondary small" onclick="addFormatRow()" type="button">+ Embalagem</button></div><div id="formatPackRows" class="ingredient-editor"></div></div><div class="modal-footer"><button class="secondary" onclick="${onSaved?'manageSalesFormats()':'closeModal()'}">Cancelar</button><button class="primary" onclick="saveSalesFormat('${id||''}',${onSaved?'true':'false'})">Salvar formato</button></div>`;
  (old?.packaging||[]).forEach(row=>addFormatRow(row));if(!old?.packaging?.length)addFormatRow();openModal();
}
function addFormatRow(row={packagingId:'',quantity:1}) {
  const target=$('#formatPackRows');if(!target)return;
  const options=db.packaging.map(item=>`<option value="${item.id}" ${item.id===row.packagingId?'selected':''}>${escapeHtml(item.name)}</option>`).join('');
  target.insertAdjacentHTML('beforeend',`<div class="format-row-editor" data-format-row><select class="format-pack-select"><option value="">Selecionar embalagem</option>${options}</select><input class="format-pack-qty" type="number" min="0.001" step="0.001" value="${row.quantity??1}" aria-label="Unidades de embalagem usadas neste formato"><button class="remove-row" type="button" onclick="this.closest('[data-format-row]').remove()" aria-label="Remover embalagem">×</button></div>`);
}
function saveSalesFormat(id,fromManager=false) {
  const item={...(id?getItemById(db.salesFormats,id):{}),id:id||uid('fmt'),name:$('#formatName').value.trim(),cookieCount:Math.max(1,Math.floor(num($('#formatCookieCount').value)||1)),extraCostPerCookie:num($('#formatExtraCost').value),packaging:$$('[data-format-row]',$('#formatPackRows')).map(row=>({packagingId:$('.format-pack-select',row).value,quantity:num($('.format-pack-qty',row).value)||1})).filter(row=>row.packagingId)};
  if(!item.name){toast('Informe o nome do formato.','error');return;}
  const arr=db.salesFormats,idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);saveDB();closeModal();renderPricing();renderSettingsFormatSummary();renderStart();toast('Formato salvo.');
  if(fromManager)manageSalesFormats();
}
function deleteSalesFormat(id) {
  const usedByProduct=db.products.some(product=>(product.formatIds||[]).includes(id));const usedByKit=db.kits.some(kit=>kit.formatId===id);if(usedByProduct||usedByKit){toast('Este formato está vinculado a um sabor ou kit. Remova o vínculo antes de excluir.','error');return;}
  if(!confirm('Excluir este formato de venda?'))return;db.salesFormats=db.salesFormats.filter(f=>f.id!==id);saveDB();renderPricing();renderSettingsFormatSummary();manageSalesFormats();
}

// BACKUP, IMPORTAÇÃO LEGADA E CUSTOS INDIRETOS
function renderSettings() {
  const currentMargin=db.settings.defaultMargin??40; $('#defaultMargin').value=currentMargin; db.settings.defaultMarkup=1/(1-currentMargin/100);
  $('#laborHourlyRate').value=db.settings.laborHourlyRate??20; $('#laborHoursBatch').value=db.settings.laborHoursBatch??4.5; $('#laborRecipesPerSession').value=db.settings.laborRecipesPerSession??4;
  const laborSummary=$('#laborCostSummary'); if(laborSummary){const batch=num(db.settings.laborHourlyRate??20)*num(db.settings.laborHoursBatch??4.5);const recipes=Math.max(1,num(db.settings.laborRecipesPerSession??4));const perRecipe=batch/recipes;laborSummary.textContent=`Sessão: ${money(batch)} ÷ ${recipes} receitas = ${money(perRecipe)} por receita de 12 cookies (${money(perRecipe/12)} por cookie). O custo por unidade acompanha o rendimento cadastrado em cada massa.`;}
  const trip=$('#workTransportTrip'); if(trip)trip.value=db.settings.workTransportPerTrip??10;
  const minimum=$('#workMinimumCookies'); if(minimum)minimum.value=db.settings.workMinimumCookies??12;
  const perCookie=Math.ceil((num(db.settings.workTransportPerTrip??10)/Math.max(1,Math.floor(num(db.settings.workMinimumCookies??12)||12)))*100)/100;
  const workFormat=db.salesFormats.find(f=>String(f.name||'').trim().toLocaleLowerCase('pt-BR')==='trabalho da agatha'); if(workFormat && workFormat.isDefaultWorkFormat)workFormat.extraCostPerCookie=perCookie;
  const summary=$('#workTransportSummary'); if(summary)summary.textContent=`Referência fixa: ${money(num(db.settings.workTransportPerTrip??10))} por ida ÷ ${Math.max(1,Math.floor(num(db.settings.workMinimumCookies??12)||12))} cookies = ${money(perCookie)} por cookie. Não será recalculada por viagem.`;
  renderIndirectCosts();renderSettingsFormatSummary();
  const legacyExists=(()=>{try{return !!localStorage.getItem(LEGACY_KEY);}catch{return false;}})();
  const status=$('#legacyStatus');
  status.classList.toggle('available',legacyExists);
  status.textContent=legacyExists?'Encontramos dados da versão anterior neste navegador. Eles são mantidos separadamente e podem ser mesclados novamente.':'Nenhuma base antiga foi detectada neste navegador. Você ainda pode importar um backup JSON antigo nesta tela.';
}
function renderIndirectCosts() {
  const target=$('#indirectCostList');if(!target)return;const costs=db.settings.indirectCosts||[];
  target.innerHTML=costs.length?costs.map(c=>`<div class="cost-item"><div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(indirectCostDescription(c))}</span></div><div class="cost-item-right"><strong>${c.deferredSetup||c.legacyKey==='labor'?'Pendente':money(indirectCostValue(c))}</strong><div class="actions"><button class="icon-btn" aria-label="Editar custo" onclick="openIndirectCostModal('${c.id}')">✎</button><button class="icon-btn text-danger" aria-label="Excluir custo" onclick="deleteIndirectCost('${c.id}')">×</button></div></div></div>`).join(''):'<div class="empty-table">Nenhum custo indireto cadastrado.</div>';
}
$('#addIndirectBtn').addEventListener('click',()=>openIndirectCostModal());
function openIndirectCostModal(id=null) {
  const old=id?getItemById(db.settings.indirectCosts||[],id):null;const units=['un','g','kg','ml','l','m','cm'];
  $('#modal').innerHTML=`<div class="modal-header"><div><span class="kicker">CUSTOS ADICIONAIS</span><h2 id="modalTitle">${old?'Editar custo indireto':'Novo custo indireto'}</h2><p>Use valor por fornada para gás e energia, ou cálculo por medida para materiais de consumo.</p></div><button class="close" onclick="closeModal()" aria-label="Fechar">×</button></div><div class="form-grid two"><label>Nome<input id="indirectName" value="${escapeAttr(old?.name||'')}" placeholder="Ex.: Gás, energia, papel manteiga"></label><label>Como calcular<select id="indirectMode"><option value="perRecipe" ${old?.mode==='perRecipe'?'selected':''}>Valor fixo por fornada</option><option value="byMeasure" ${old?.mode!=='perRecipe'?'selected':''}>Por medida consumida</option></select></label><label>Preço pago (R$)<input id="indirectPrice" type="number" min="0" step="0.01" value="${old?.price??''}"></label><label class="measure-field">Quantidade comprada<input id="indirectQty" type="number" min="0.001" step="0.001" value="${old?.packageQty??1}"></label><label class="measure-field">Unidade<select id="indirectUnit">${units.map(u=>`<option value="${u}" ${u===(old?.packageUnit||'un')?'selected':''}>${titleCaseUnit(u)}</option>`).join('')}</select></label><label class="measure-field">Consumo por fornada<input id="indirectUsage" type="number" min="0" step="0.001" value="${old?.usage??0}"></label></div><div class="modal-notice">Exemplo: 10 metros de papel manteiga custam R$ 20 e você usa 0,5 m por fornada. O sistema rateia R$ 1,00 por fornada pelo rendimento da massa escolhida.</div><div class="modal-footer"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveIndirectCost('${id||''}')">Salvar custo</button></div>`;
  openModal();const toggle=()=>$$('.measure-field').forEach(el=>el.style.display=$('#indirectMode').value==='perRecipe'?'none':'grid');$('#indirectMode').addEventListener('change',toggle);toggle();
}
function saveIndirectCost(id) {
  const item={id:id||uid('ind'),name:$('#indirectName').value.trim(),mode:$('#indirectMode').value,price:num($('#indirectPrice').value),packageQty:num($('#indirectQty').value)||1,packageUnit:$('#indirectUnit').value,usage:num($('#indirectUsage').value)};
  if(!item.name||item.price<=0){toast('Informe o nome e um preço maior que zero.','error');return;}
  const arr=db.settings.indirectCosts||[];const idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=item;else arr.push(item);db.settings.indirectCosts=arr;saveDB();closeModal();renderSettings();renderCosts();renderPricing();renderStart();toast('Custo indireto salvo.');
}
function deleteIndirectCost(id) {const cost=getItemById(db.settings.indirectCosts||[],id);if(!cost)return;if(!confirm(`Excluir o custo “${cost.name}”?`))return;db.settings.indirectCosts=db.settings.indirectCosts.filter(x=>x.id!==id);saveDB();renderSettings();renderCosts();renderPricing();renderStart();}

$('#saveLaborSettingsBtn')?.addEventListener('click',()=>{db.settings.laborHourlyRate=Math.max(0,num($('#laborHourlyRate').value));db.settings.laborHoursBatch=Math.max(0,num($('#laborHoursBatch').value));db.settings.laborRecipesPerSession=Math.max(1,Math.floor(num($('#laborRecipesPerSession').value)||4));saveDB('Mão de obra salva');renderSettings();renderCosts();renderPricing();renderStart();toast('Mão de obra atualizada.');});
$('#saveWorkTransportBtn').addEventListener('click',()=>{
  db.settings.workTransportPerTrip=Math.max(0,num($('#workTransportTrip').value));
  db.settings.workMinimumCookies=Math.max(1,Math.floor(num($('#workMinimumCookies').value)||12)); db.settings.kraftReservePerCookie=Math.max(0,num($('#kraftReservePerCookie').value));
  const perCookie=Math.ceil((db.settings.workTransportPerTrip/db.settings.workMinimumCookies)*100)/100;
  let format=db.salesFormats.find(f=>String(f.name||'').trim().toLocaleLowerCase('pt-BR')==='trabalho da agatha');
  if(!format){format={id:uid('fmt'),name:'Trabalho da Agatha',cookieCount:1,packaging:[],extraCostPerCookie:perCookie,isDefaultWorkFormat:true};db.salesFormats.push(format);}
  format.extraCostPerCookie=perCookie;format.isDefaultWorkFormat=true;
  db.products.forEach(product=>{product.formatIds=Array.isArray(product.formatIds)?product.formatIds:[];if(!product.formatIds.includes(format.id))product.formatIds.push(format.id);});
  saveDB('Custo de transporte salvo');renderSettings();renderCosts();renderPricing();renderStart();
  const summary=$('#workTransportSummary');if(summary)summary.textContent=`Referência fixa: ${money(db.settings.workTransportPerTrip)} por ida ÷ ${db.settings.workMinimumCookies} cookies = ${money(perCookie)} por cookie. Não será recalculada por viagem.`;
  toast('Custo de transporte atualizado.');
});
$('#exportBtn').addEventListener('click',exportBackup);
function exportBackup() {
  const payload={app:'Cookie Pricer',version:APP_VERSION,exportedAt:new Date().toISOString(),data:db};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cookie-pricer-backup-v3.2-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  toast('Backup exportado. Guarde o arquivo em um local seguro.');
}
$('#importInput').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());const incoming=getLegacyRoot(parsed);
    if(!incoming||!Array.isArray(incoming.ingredients)||!Array.isArray(incoming.packaging)||!Array.isArray(incoming.recipes)&&!Array.isArray(incoming.products))throw new Error('Formato inválido');
    if(!confirm('Restaurar este backup substituirá os dados atuais da V3. Recomendamos exportar um backup antes. Continuar?'))return;
    db=Array.isArray(incoming.masses)&&Array.isArray(incoming.products)?normalizeV3(incoming):migrateLegacy(parsed);saveDB('Backup restaurado');refreshAll();toast('Backup restaurado com sucesso.');
  }catch(err){console.error(err);toast('Não foi possível ler esse arquivo de backup. Confira se ele é um JSON do Cookie Pricer.','error');}
  event.target.value='';
});
$('#legacyImportInput').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const incoming=getLegacyRoot(parsed);if(!incoming||!Array.isArray(incoming.ingredients)||!Array.isArray(incoming.recipes))throw new Error('Formato inválido');if(!confirm('Os dados do sistema antigo serão mesclados aos dados atuais. Cadastros com nomes repetidos serão preservados sem duplicação quando possível. Continuar?'))return;const legacy=migrateLegacy(parsed);db=mergeLegacyData(db,legacy);saveDB('Dados antigos importados');refreshAll();toast('Dados antigos importados. Confira massas, recheios e preços antes de vender.');}
  catch(err){console.error(err);toast('Não foi possível ler o backup antigo.','error');}event.target.value='';
});
$('#importBrowserLegacyBtn').addEventListener('click',()=>{
  let raw;try{raw=localStorage.getItem(LEGACY_KEY);}catch{}if(!raw){toast('Não encontramos dados antigos neste navegador. Use o campo para importar um arquivo JSON.','error');return;}
  if(!confirm('Vamos mesclar os dados antigos deste navegador com a V3. Itens com nomes repetidos serão preservados sem duplicação quando possível. Continuar?'))return;
  try{db=mergeLegacyData(db,migrateLegacy(JSON.parse(raw)));saveDB('Dados antigos recuperados');refreshAll();toast('Dados antigos recuperados e mesclados.');}catch(err){console.error(err);toast('Não foi possível recuperar os dados antigos.','error');}
});
function mergeLegacyData(current, legacy) {
  const out=normalizeV3(current);
  const ingredientIdMap=new Map(), packagingIdMap=new Map(), massIdMap=new Map(), fillingIdMap=new Map(), formatIdMap=new Map();
  const addNamed=(group,item,idMap, newPrefix)=>{
    const arr=out[group];const nameKey=String(item.name||'').trim().toLocaleLowerCase('pt-BR');const existing=arr.find(x=>String(x.name||'').trim().toLocaleLowerCase('pt-BR')===nameKey);
    if(existing){idMap.set(item.id,existing.id);return existing;}
    const copy=deepClone(item);copy.id=uid(newPrefix);arr.push(copy);idMap.set(item.id,copy.id);return copy;
  };
  legacy.ingredients.forEach(item=>addNamed('ingredients',item,ingredientIdMap,'ing'));
  legacy.packaging.forEach(item=>addNamed('packaging',item,packagingIdMap,'pack'));
  legacy.masses.forEach(item=>{
    const copy=deepClone(item);copy.ingredients=(copy.ingredients||[]).map(row=>({...row,ingredientId:ingredientIdMap.get(row.ingredientId)||row.ingredientId}));
    const baseName=String(copy.name||'Massa importada');let proposed=baseName,n=2;while(out.masses.some(x=>x.name.toLocaleLowerCase('pt-BR')===proposed.toLocaleLowerCase('pt-BR')))proposed=`${baseName} (${n++})`;copy.name=proposed;copy.id=uid('mass');out.masses.push(copy);massIdMap.set(item.id,copy.id);
  });
  legacy.fillings.forEach(item=>{
    const copy=deepClone(item);copy.ingredients=(copy.ingredients||[]).map(row=>({...row,ingredientId:ingredientIdMap.get(row.ingredientId)||row.ingredientId}));
    const baseName=String(copy.name||'Recheio importado');let proposed=baseName,n=2;while(out.fillings.some(x=>x.name.toLocaleLowerCase('pt-BR')===proposed.toLocaleLowerCase('pt-BR')))proposed=`${baseName} (${n++})`;copy.name=proposed;copy.id=uid('fill');out.fillings.push(copy);fillingIdMap.set(item.id,copy.id);
  });
  const formatSignature=f=>JSON.stringify({name:String(f.name||'').toLowerCase(),count:num(f.cookieCount)||1,pack:(f.packaging||[]).map(x=>({packagingId:x.packagingId,quantity:num(x.quantity)||1}))});
  legacy.salesFormats.forEach(item=>{
    const copy=deepClone(item);copy.packaging=(copy.packaging||[]).map(row=>({...row,packagingId:packagingIdMap.get(row.packagingId)||row.packagingId}));
    const signature=formatSignature(copy);const existing=out.salesFormats.find(f=>formatSignature(f)===signature);
    if(existing){formatIdMap.set(item.id,existing.id);return;}copy.id=uid('fmt');out.salesFormats.push(copy);formatIdMap.set(item.id,copy.id);
  });
  const currentNames=new Set(out.products.map(p=>p.name.trim().toLocaleLowerCase('pt-BR')));
  legacy.products.forEach(item=>{
    const key=item.name.trim().toLocaleLowerCase('pt-BR');if(currentNames.has(key))return;
    const copy=deepClone(item);copy.id=uid('prod');copy.massId=massIdMap.get(item.massId)||item.massId;copy.fillingId=fillingIdMap.get(item.fillingId)||item.fillingId;copy.formatIds=(item.formatIds||[]).map(id=>formatIdMap.get(id)||id);out.products.push(copy);currentNames.add(key);
  });
  legacy.kits.forEach(item=>{const copy=deepClone(item);copy.id=uid('kit');copy.productId=out.products.find(p=>p.name.toLocaleLowerCase('pt-BR')===productDisplayName(item.productId).toLocaleLowerCase('pt-BR'))?.id||item.productId;out.kits.push(copy);});
  legacy.settings.indirectCosts.forEach(item=>{const exists=out.settings.indirectCosts.some(x=>x.name.trim().toLocaleLowerCase('pt-BR')===item.name.trim().toLocaleLowerCase('pt-BR')&&num(x.price)===num(item.price));if(!exists)out.settings.indirectCosts.push({...deepClone(item),id:uid('ind')});});
  return normalizeV3(out);
}
$('#clearDataBtn').addEventListener('click',()=>{if(!confirm('Isso apagará os dados salvos na V3 neste navegador. A chave de dados antiga não será apagada. Exporte um backup antes de continuar.'))return;localStorage.removeItem(STORAGE_KEY);db=normalizeV3(EMPTY_DB);saveDB();refreshAll();toast('Dados da V3 apagados.');});

// EXEMPLOS DA PLANILHA ENVIADA
$('#loadExamplesBtn').addEventListener('click',loadSpreadsheetExamples);
function loadSpreadsheetExamples() {
  if(db.ingredients.length||db.packaging.length||db.masses.length||db.fillings.length||db.products.length){toast('Para evitar sobrescrever cadastros, os exemplos só podem ser carregados quando a base estiver vazia.','error');return;}
  if(!confirm('Carregar os exemplos da planilha enviada? Os valores são ilustrativos e precisam ser conferidos com seus preços reais.'))return;
  const ingredientRows=[
    ['Açúcar refinado',2.99,1000,'g'],['Açúcar mascavo',8.49,500,'g'],['Ovo',20,30,'un'],['Manteiga sem sal',8.49,200,'g'],['Farinha de trigo tipo 1',2.79,1000,'g'],['Fermento químico em pó',5.49,100,'g'],['Gotas de chocolate',110,1000,'g'],['Chocolate ao leite (barra 2 kg)',208,2000,'g'],['Chocolate branco',122,1000,'g'],['Chocolate meio amargo (145 g)',16.49,145,'g'],['Chocolate em pó 70%',21.49,200,'g'],['Cacau em pó / black',8,100,'g'],['Nutella',50,700,'g'],['Creme de Ovomaltine',49,700,'g'],['Flocos crocantes',13,160,'g'],['Doce de leite',8.9,400,'g'],['Creme Alpino / avelã',10,80,'g']
  ];
  db.ingredients=ingredientRows.map(([name,price,packageQty,packageUnit])=>({id:uid('ing'),name,price,packageQty,packageUnit,note:''}));
  const byName=new Map(db.ingredients.map(x=>[x.name,x.id]));const ing=(name,amount)=>({ingredientId:byName.get(name),amount,unit:getIngredientUnit(name)});
  function getIngredientUnit(name){const ref=db.ingredients.find(x=>x.name===name);return ref?baseUnit(ref.packageUnit):'g';}
  const massDefs=[
    {name:'Tradicional',yieldCount:11,realMass:942,rows:[['Açúcar refinado',180],['Açúcar mascavo',70],['Ovo',2],['Manteiga sem sal',100],['Farinha de trigo tipo 1',380],['Fermento químico em pó',8],['Gotas de chocolate',100]]},
    {name:'Chocolate',yieldCount:10,rows:[['Açúcar refinado',180],['Açúcar mascavo',70],['Ovo',2],['Manteiga sem sal',110],['Farinha de trigo tipo 1',320],['Fermento químico em pó',8],['Gotas de chocolate',100],['Chocolate em pó 70%',20]]},
    {name:'Red Velvet',yieldCount:10,rows:[['Açúcar refinado',240],['Ovo',2],['Manteiga sem sal',80],['Farinha de trigo tipo 1',320],['Fermento químico em pó',8],['Chocolate branco',100],['Chocolate em pó 70%',35]]},
    {name:'Black',yieldCount:10,rows:[['Açúcar refinado',200],['Açúcar mascavo',70],['Ovo',2],['Manteiga sem sal',120],['Farinha de trigo tipo 1',320],['Fermento químico em pó',8],['Cacau em pó / black',40]]},
    {name:'Brownie',yieldCount:9,rows:[['Açúcar refinado',140],['Ovo',2],['Manteiga sem sal',100],['Farinha de trigo tipo 1',105],['Gotas de chocolate',150],['Cacau em pó / black',20]]}
  ];
  db.masses=massDefs.map(m=>({id:uid('mass'),name:m.name,cookieWeight:80,yieldCount:m.yieldCount,realYield:0,realMass:m.realMass||0,note:'Exemplo da planilha enviada',ingredients:m.rows.map(([name,amount])=>ing(name,amount))}));
  const fillingDefs=[
    {name:'Nutella',rows:[['Nutella',40]],otherCost:0},{name:'Ovomaltine',rows:[['Creme de Ovomaltine',32],['Flocos crocantes',8]],otherCost:0},{name:'Triplo Choco',rows:[['Chocolate ao leite (barra 2 kg)',13],['Chocolate branco',13],['Chocolate meio amargo (145 g)',13]],otherCost:0},{name:'Red Velvet',rows:[],otherCost:1.05},{name:'Doce de Leite',rows:[['Doce de leite',40]],otherCost:0},{name:'Duo',rows:[['Chocolate ao leite (barra 2 kg)',12],['Chocolate branco',12]],otherCost:0},{name:'Alpino',rows:[['Creme Alpino / avelã',20]],otherCost:0.67},{name:'Kinder',rows:[],otherCost:5.32},{name:'Brookie',rows:[['Creme de Ovomaltine',20]],otherCost:1.28},{name:'Tradicional',rows:[['Chocolate ao leite (barra 2 kg)',22]],otherCost:0}
  ];
  db.fillings=fillingDefs.map(f=>({id:uid('fill'),name:f.name,ingredients:f.rows.map(([name,amount])=>ing(name,amount)),otherCost:f.otherCost}));
  const massId=name=>db.masses.find(x=>x.name===name)?.id;const fillingId=name=>db.fillings.find(x=>x.name===name)?.id;
  const productDefs=[
    ['Nutella','Tradicional','Nutella',15],['Ovomaltine','Chocolate','Ovomaltine',15],['Triplo Choco','Chocolate','Triplo Choco',15],['Red Velvet','Red Velvet','Red Velvet',12],['Doce de Leite','Chocolate','Doce de Leite',12],['Duo','Black','Duo',10],['Alpino','Black','Alpino',16],['Kinder','Chocolate','Kinder',18],['Brookie','Tradicional','Brookie',16],['Tradicional','Tradicional','Tradicional',12]
  ];
  db.products=productDefs.map(([name,massName,fillingName,salePrice])=>({id:uid('prod'),name,massId:massId(massName),fillingId:fillingId(fillingName),packagingCost:0,fixedCost:0,laborCost:0,salePrice,markupTarget:3,platformFee:0.27,formatIds:[]}));
  db.kits=[{id:uid('kit'),name:'Caixa com 4',quantity:4,productId:db.products.find(p=>p.name==='Tradicional').id,discount:5,packagingCost:0,salePrice:0},{id:uid('kit'),name:'Caixa com 6',quantity:6,productId:db.products.find(p=>p.name==='Tradicional').id,discount:10,packagingCost:0,salePrice:0},{id:uid('kit'),name:'Caixa com 12',quantity:12,productId:db.products.find(p=>p.name==='Tradicional').id,discount:15,packagingCost:0,salePrice:0}];
  db.settings.defaultMarkup=3;saveDB();refreshAll();toast('Exemplos da planilha carregados. Revise os valores antes de usar.');
}

// UTILITÁRIOS DE ENTIDADE: DUPLICAR / EXCLUIR
function duplicateEntity(type,id) {
  const group=db[type];if(!Array.isArray(group))return;const source=getItemById(group,id);if(!source)return;
  const copy=deepClone(source);copy.id=uid(type==='masses'?'mass':type==='fillings'?'fill':type==='products'?'prod':'kit');
  const baseName=`${source.name} (cópia)`;let next=baseName,n=2;while(group.some(x=>x.name.toLocaleLowerCase('pt-BR')===next.toLocaleLowerCase('pt-BR')))next=`${source.name} (cópia ${n++})`;copy.name=next;
  const index=group.findIndex(x=>x.id===id);group.splice(index+1,0,copy);saveDB();refreshAll();toast(`${source.name} foi duplicado.`);
}
function deleteEntity(type,id) {
  const group=db[type];if(!Array.isArray(group))return;const item=getItemById(group,id);if(!item)return;
  if(type==='masses'&&db.products.some(p=>p.massId===id)){toast('Essa massa está vinculada a um sabor. Altere o vínculo antes de excluir.','error');return;}
  if(type==='fillings'&&db.products.some(p=>p.fillingId===id)){toast('Esse recheio está vinculado a um sabor. Altere o vínculo antes de excluir.','error');return;}
  if(!confirm(`Excluir “${item.name}”?`))return;db[type]=group.filter(x=>x.id!==id);saveDB();refreshAll();toast('Cadastro excluído.');
}

// MODAL GLOBAL
function openModal(){const back=$('#modalBackdrop');back.classList.add('open');back.setAttribute('aria-hidden','false');const first=$('input,select', $('#modal')) || $('.close', $('#modal'));if(first)first.focus();}
function closeModal(){const back=$('#modalBackdrop');back.classList.remove('open');back.setAttribute('aria-hidden','true');}
$('#modalBackdrop').addEventListener('click',event=>{if(event.target.id==='modalBackdrop')closeModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();hideInfoTooltip();}});

function refreshAll() {
  renderStart();renderIngredients();renderMasses();renderFillings();renderCosts();renderPricing();renderSettings();
}
setupInfoTooltips();
refreshAll();
