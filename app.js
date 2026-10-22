'use strict';

const STORAGE_KEY = 'gotejar-kit-vender-system-v1';
const DEFAULT_STATE = {
  version: 1,
  ingredients: [
    { id:'ing-sugar', name:'Açúcar refinado', price:2.99, packQty:1000, unit:'g', note:'' },
    { id:'ing-brown-sugar', name:'Açúcar mascavo', price:8.49, packQty:500, unit:'g', note:'' },
    { id:'ing-egg', name:'Ovo', price:20, packQty:30, unit:'un', note:'Cartela de 30' },
    { id:'ing-butter', name:'Manteiga sem sal', price:8.49, packQty:200, unit:'g', note:'Confira a composição no rótulo' },
    { id:'ing-flour', name:'Farinha de trigo tipo 1', price:2.79, packQty:1000, unit:'g', note:'Tipo 1' },
    { id:'ing-baking-powder', name:'Fermento químico em pó', price:5.49, packQty:100, unit:'g', note:'' },
    { id:'ing-choc-drops', name:'Gotas de chocolate', price:110, packQty:1000, unit:'g', note:'Vai dentro da massa' },
    { id:'ing-milk-choc', name:'Chocolate ao leite (barra 2 kg)', price:208, packQty:2000, unit:'g', note:'Vai no recheio' },
    { id:'ing-white-choc', name:'Chocolate branco', price:122, packQty:1000, unit:'g', note:'' },
    { id:'ing-semi-choc', name:'Chocolate meio amargo (145 g)', price:16.49, packQty:145, unit:'g', note:'Terceiro chocolate do Triplo Choco' },
    { id:'ing-choc-powder', name:'Chocolate em pó 70%', price:21.49, packQty:200, unit:'g', note:'' },
    { id:'ing-black-cocoa', name:'Cacau em pó / black', price:8, packQty:100, unit:'g', note:'' },
    { id:'ing-nutella', name:'Nutella', price:50, packQty:700, unit:'g', note:'Pote de 700 g' },
    { id:'ing-ovo-cream', name:'Creme de Ovomaltine', price:49, packQty:700, unit:'g', note:'' },
    { id:'ing-crunchy', name:'Flocos crocantes', price:13, packQty:160, unit:'g', note:'Crocante do Ovomaltine' },
    { id:'ing-dulce', name:'Doce de leite', price:8.90, packQty:400, unit:'g', note:'' },
    { id:'ing-alpino', name:'Creme Alpino / avelã', price:10, packQty:80, unit:'g', note:'' }
  ],
  doughs: [
    { id:'dough-traditional', name:'Tradicional', yield:11, components:[
      {id:'dc-trad-sugar',ingredientId:'ing-sugar',qty:180},{id:'dc-trad-brown',ingredientId:'ing-brown-sugar',qty:70},{id:'dc-trad-egg',ingredientId:'ing-egg',qty:2},{id:'dc-trad-butter',ingredientId:'ing-butter',qty:100},{id:'dc-trad-flour',ingredientId:'ing-flour',qty:380},{id:'dc-trad-powder',ingredientId:'ing-baking-powder',qty:8},{id:'dc-trad-drops',ingredientId:'ing-choc-drops',qty:100}
    ]},
    { id:'dough-chocolate', name:'Chocolate', yield:10, components:[
      {id:'dc-choc-sugar',ingredientId:'ing-sugar',qty:180},{id:'dc-choc-brown',ingredientId:'ing-brown-sugar',qty:70},{id:'dc-choc-egg',ingredientId:'ing-egg',qty:2},{id:'dc-choc-butter',ingredientId:'ing-butter',qty:110},{id:'dc-choc-flour',ingredientId:'ing-flour',qty:320},{id:'dc-choc-powder',ingredientId:'ing-baking-powder',qty:8},{id:'dc-choc-drops',ingredientId:'ing-choc-drops',qty:100},{id:'dc-choc-cocoa',ingredientId:'ing-choc-powder',qty:20}
    ]},
    { id:'dough-red-velvet', name:'Red Velvet', yield:10, components:[
      {id:'dc-rv-sugar',ingredientId:'ing-sugar',qty:240},{id:'dc-rv-egg',ingredientId:'ing-egg',qty:2},{id:'dc-rv-butter',ingredientId:'ing-butter',qty:80},{id:'dc-rv-flour',ingredientId:'ing-flour',qty:320},{id:'dc-rv-powder',ingredientId:'ing-baking-powder',qty:8},{id:'dc-rv-white',ingredientId:'ing-white-choc',qty:100},{id:'dc-rv-cocoa',ingredientId:'ing-choc-powder',qty:35}
    ]},
    { id:'dough-black', name:'Black', yield:10, components:[
      {id:'dc-black-sugar',ingredientId:'ing-sugar',qty:200},{id:'dc-black-brown',ingredientId:'ing-brown-sugar',qty:70},{id:'dc-black-egg',ingredientId:'ing-egg',qty:2},{id:'dc-black-butter',ingredientId:'ing-butter',qty:120},{id:'dc-black-flour',ingredientId:'ing-flour',qty:320},{id:'dc-black-powder',ingredientId:'ing-baking-powder',qty:8},{id:'dc-black-cocoa',ingredientId:'ing-black-cocoa',qty:40}
    ]},
    { id:'dough-brownie', name:'Brownie', yield:9, components:[
      {id:'dc-brownie-sugar',ingredientId:'ing-sugar',qty:140},{id:'dc-brownie-egg',ingredientId:'ing-egg',qty:2},{id:'dc-brownie-butter',ingredientId:'ing-butter',qty:100},{id:'dc-brownie-flour',ingredientId:'ing-flour',qty:105},{id:'dc-brownie-drops',ingredientId:'ing-choc-drops',qty:150},{id:'dc-brownie-cocoa',ingredientId:'ing-black-cocoa',qty:20}
    ]}
  ],
  fillings: [
    { id:'filling-nutella', name:'Nutella', other:0, note:'', components:[{id:'fc-nutella-nutella',ingredientId:'ing-nutella',qty:40}] },
    { id:'filling-ovo', name:'Ovomaltine', other:0, note:'', components:[{id:'fc-ovo-cream',ingredientId:'ing-ovo-cream',qty:32},{id:'fc-ovo-crunchy',ingredientId:'ing-crunchy',qty:8}] },
    { id:'filling-triple', name:'Triplo Choco', other:0, note:'', components:[{id:'fc-trip-milk',ingredientId:'ing-milk-choc',qty:13},{id:'fc-trip-white',ingredientId:'ing-white-choc',qty:13},{id:'fc-trip-semi',ingredientId:'ing-semi-choc',qty:13}] },
    { id:'filling-red-velvet', name:'Red Velvet', other:1.05, note:'Valor direto por cookie, conforme a ficha original.', components:[] },
    { id:'filling-dulce', name:'Doce de Leite', other:0, note:'', components:[{id:'fc-dulce-dulce',ingredientId:'ing-dulce',qty:40}] },
    { id:'filling-duo', name:'Duo', other:0, note:'', components:[{id:'fc-duo-milk',ingredientId:'ing-milk-choc',qty:12},{id:'fc-duo-white',ingredientId:'ing-white-choc',qty:12}] },
    { id:'filling-alpino', name:'Alpino', other:0.67, note:'Valor direto por cookie, conforme a ficha original.', components:[{id:'fc-alpino-alpino',ingredientId:'ing-alpino',qty:20}] },
    { id:'filling-kinder', name:'Kinder', other:5.32, note:'Valor direto por cookie, conforme a ficha original.', components:[] },
    { id:'filling-brookie', name:'Brookie', other:1.28, note:'Valor direto por cookie, conforme a ficha original.', components:[{id:'fc-brookie-ovo',ingredientId:'ing-ovo-cream',qty:20}] },
    { id:'filling-traditional', name:'Tradicional', other:0, note:'', components:[{id:'fc-trad-milk',ingredientId:'ing-milk-choc',qty:22}] }
  ],
  cookies: [
    {id:'cookie-nutella',name:'Nutella',doughId:'dough-traditional',fillingId:'filling-nutella',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:15,platformFee:0.27},
    {id:'cookie-ovo',name:'Ovomaltine',doughId:'dough-chocolate',fillingId:'filling-ovo',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:15,platformFee:0.27},
    {id:'cookie-triple',name:'Triplo Choco',doughId:'dough-chocolate',fillingId:'filling-triple',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:15,platformFee:0.27},
    {id:'cookie-red-velvet',name:'Red Velvet',doughId:'dough-red-velvet',fillingId:'filling-red-velvet',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:12,platformFee:0.27},
    {id:'cookie-dulce',name:'Doce de Leite',doughId:'dough-chocolate',fillingId:'filling-dulce',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:12,platformFee:0.27},
    {id:'cookie-duo',name:'Duo',doughId:'dough-black',fillingId:'filling-duo',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:10,platformFee:0.27},
    {id:'cookie-alpino',name:'Alpino',doughId:'dough-black',fillingId:'filling-alpino',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:16,platformFee:0.27},
    {id:'cookie-kinder',name:'Kinder',doughId:'dough-chocolate',fillingId:'filling-kinder',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:18,platformFee:0.27},
    {id:'cookie-brookie',name:'Brookie',doughId:'dough-traditional',fillingId:'filling-brookie',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:16,platformFee:0.27},
    {id:'cookie-traditional',name:'Tradicional',doughId:'dough-traditional',fillingId:'filling-traditional',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:12,platformFee:0.27}
  ],
  kits: [
    {id:'kit-4',name:'Caixa com 4',qty:4,baseCookieId:'cookie-traditional',discount:0.05},
    {id:'kit-6',name:'Caixa com 6',qty:6,baseCookieId:'cookie-traditional',discount:0.10},
    {id:'kit-12',name:'Caixa com 12',qty:12,baseCookieId:'cookie-traditional',discount:0.15}
  ]
};

let state = null;
let currentView = 'home';
let pendingConfirm = null;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function makeId(prefix='item') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function money(value) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(value)); }
function decimal(value, digits=2) { return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value)); }
function percent(value, digits=1) { return `${decimal(num(value)*100,digits)}%`; }
function findById(list,id) { return list.find(item => item.id === id) || null; }
function itemName(list,id,missing='Não definido') { return (findById(list,id)?.name) || missing; }
function getIngredient(id) { return findById(state.ingredients,id); }
function unitCost(ingredient) {
  if (!ingredient) return 0;
  const qty = num(ingredient.packQty);
  return qty > 0 ? num(ingredient.price) / qty : 0;
}
function doughStats(dough) {
  if (!dough) return {cost:0,yield:0,unitCost:0,totalQty:0,missing:1};
  const comps = Array.isArray(dough.components) ? dough.components : [];
  let cost = 0, totalQty = 0, missing = 0;
  comps.forEach(comp => {
    const ing = getIngredient(comp.ingredientId);
    if (!ing) { missing++; return; }
    const qty = Math.max(0,num(comp.qty));
    totalQty += qty;
    cost += qty * unitCost(ing);
  });
  const yieldCount = Math.max(0,num(dough.yield));
  return {cost,totalQty,yield:yieldCount,unitCost:yieldCount>0?cost/yieldCount:0,missing};
}
function fillingStats(filling) {
  if (!filling) return {cost:0,gramCost:0,other:0,totalQty:0,missing:1};
  const comps = Array.isArray(filling.components) ? filling.components : [];
  let gramCost = 0, totalQty = 0, missing = 0;
  comps.forEach(comp => {
    const ing = getIngredient(comp.ingredientId);
    if (!ing) { missing++; return; }
    const qty = Math.max(0,num(comp.qty));
    totalQty += qty;
    gramCost += qty * unitCost(ing);
  });
  const other = Math.max(0,num(filling.other));
  return {cost:gramCost+other,gramCost,other,totalQty,missing};
}
function cookieStats(cookie) {
  const dough = findById(state.doughs,cookie.doughId);
  const filling = findById(state.fillings,cookie.fillingId);
  const doughCost = doughStats(dough).unitCost;
  const fillingCost = fillingStats(filling).cost;
  const ingredientCost = doughCost + fillingCost;
  const packaging = Math.max(0,num(cookie.packaging));
  const fixed = Math.max(0,num(cookie.fixed));
  const labor = Math.max(0,num(cookie.labor));
  const total = ingredientCost + packaging + fixed + labor;
  const markup = Math.max(0,num(cookie.markup));
  const suggestedPrice = total * markup;
  const currentPrice = Math.max(0,num(cookie.currentPrice));
  const profitToday = currentPrice - total;
  const marginToday = currentPrice > 0 ? profitToday/currentPrice : 0;
  const actualMarkup = total > 0 ? currentPrice/total : 0;
  const fee = Math.max(0,Math.min(0.9999,num(cookie.platformFee)));
  const platformPrice = currentPrice / (1-fee);
  return {doughCost,fillingCost,ingredientCost,packaging,fixed,labor,total,markup,suggestedPrice,currentPrice,profitToday,marginToday,actualMarkup,platformFee:fee,platformPrice,
    needsDough:!dough,needsFilling:!filling};
}
function kitStats(kit) {
  const base = findById(state.cookies,kit.baseCookieId);
  const baseCost = base ? cookieStats(base).total : 0;
  const basePrice = base ? num(base.currentPrice) : 0;
  const qty = Math.max(0,num(kit.qty));
  const discount = Math.max(0,Math.min(1,num(kit.discount)));
  return {baseCost,basePrice,qty,discount,cost:baseCost*qty,suggestedPrice:basePrice*qty*(1-discount),saving:basePrice*qty*discount};
}
function counts() { return {ingredients:state.ingredients.length,doughs:state.doughs.length,fillings:state.fillings.length,cookies:state.cookies.length,kits:state.kits.length}; }
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = document.getElementById('save-status');
    if (status) status.textContent = 'Salvo neste navegador';
  } catch (err) {
    showToast('Não foi possível salvar automaticamente. Exporte um backup.');
  }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.ingredients)) return parsed;
    }
  } catch (err) { /* use fresh defaults below */ }
  return clone(DEFAULT_STATE);
}
function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active',button.dataset.view===view));
  render();
  window.scrollTo({top:0,behavior:'smooth'});
}
function pageHeading(eyebrow,title,description,actions='') {
  return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-description">${esc(description)}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;
}
function actionButtons(type,id) {
  return `<div class="actions-cell"><button class="button button-quiet button-icon" title="Duplicar" aria-label="Duplicar" data-action="duplicate" data-type="${esc(type)}" data-id="${esc(id)}">⧉</button><button class="button button-danger button-icon" title="Excluir" aria-label="Excluir" data-action="delete" data-type="${esc(type)}" data-id="${esc(id)}">×</button></div>`;
}
function input(entity,id,field,value,options={}) {
  const type = options.type || 'text';
  const subid = options.subId ? ` data-subid="${esc(options.subId)}"` : '';
  const step = options.step ? ` step="${options.step}"` : '';
  const min = options.min !== undefined ? ` min="${options.min}"` : '';
  const max = options.max !== undefined ? ` max="${options.max}"` : '';
  const klass = options.className || 'field field-sm';
  const placeholder = options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : '';
  return `<input class="${klass}" type="${type}" data-entity="${esc(entity)}" data-id="${esc(id)}" data-field="${esc(field)}"${subid} value="${esc(value)}"${step}${min}${max}${placeholder}>`;
}
function select(entity,id,field,value,items,options={}) {
  const placeholder = options.placeholder || 'Selecione';
  const subid = options.subId ? ` data-subid="${esc(options.subId)}"` : '';
  const none = options.allowBlank ? `<option value="">${esc(placeholder)}</option>` : '';
  return `<select class="${options.className||'field field-sm field-select'}" data-entity="${esc(entity)}" data-id="${esc(id)}" data-field="${esc(field)}"${subid}>${none}${items.map(item=>`<option value="${esc(item.id)}" ${item.id===value?'selected':''}>${esc(item.name)}</option>`).join('')}</select>`;
}
function render() {
  const main = document.getElementById('main-content');
  if (!main) return;
  const views = {home:renderHome,ingredients:renderIngredients,doughs:renderDoughs,fillings:renderFillings,cookies:renderCookies,prices:renderPrices};
  main.innerHTML = (views[currentView] || renderHome)();
}
function renderHome() {
  const c = counts();
  const computed = state.cookies.map(cookie=>({cookie,stats:cookieStats(cookie)}));
  const missing = computed.filter(x=>x.stats.needsDough||x.stats.needsFilling).length;
  return `${pageHeading('PAINEL INICIAL','Sua ficha técnica, conectada.','Edite os cadastros uma vez e acompanhe automaticamente o custo e o preço de cada sabor.',`<button class="button button-primary" data-action="go" data-view="ingredients">Atualizar insumos</button>`)}
    <div class="grid grid-4">
      <div class="card kpi"><div class="kpi-label">Insumos cadastrados</div><div class="kpi-value">${c.ingredients}</div><div class="kpi-caption">Preços por ${'g, ml ou unidade'}</div></div>
      <div class="card kpi"><div class="kpi-label">Receitas de massa</div><div class="kpi-value">${c.doughs}</div><div class="kpi-caption">Custo por receita e por cookie</div></div>
      <div class="card kpi"><div class="kpi-label">Recheios cadastrados</div><div class="kpi-value">${c.fillings}</div><div class="kpi-caption">Custo calculado por cookie</div></div>
      <div class="card kpi"><div class="kpi-label">Sabores precificados</div><div class="kpi-value">${c.cookies}</div><div class="kpi-caption">${c.kits} formatos de kit cadastrados</div></div>
    </div>
    <div class="callout" style="margin-top:16px"><div class="callout-icon">✓</div><div><strong>Como o cálculo funciona</strong><p>Insumos → custo da massa e do recheio → custo por cookie → preço sugerido, margem e preço para plataforma. Cadastros podem ser adicionados, duplicados ou excluídos sem depender da posição na tabela.</p></div></div>
    ${missing?`<div class="notice notice-danger" style="margin-top:13px">${missing} sabor(es) estão sem massa ou recheio associado. Revise a aba Custo por cookie para completar os vínculos.</div>`:''}
    <div class="section-head"><div><h2>Resumo por sabor</h2><p>Valores calculados a partir dos dados cadastrados.</p></div><button class="button button-quiet" data-action="go" data-view="prices">Ver precificação ↗</button></div>
    <div class="card card-pad"><div class="home-price-row"><div class="home-price-label">Sabor</div><div class="home-price-label">Custo total</div><div class="home-price-label">Preço sugerido</div><div class="home-price-label hide-mobile">Preço atual</div></div>
      <div class="home-price-list">${computed.map(({cookie,stats})=>`<div class="home-price-row"><div>${esc(cookie.name)}${stats.needsDough||stats.needsFilling?'<small class="price-bad">Vínculo pendente</small>':''}</div><div class="money">${money(stats.total)}</div><div class="money strong">${money(stats.suggestedPrice)}</div><div class="money hide-mobile">${money(stats.currentPrice)}</div></div>`).join('') || '<div class="empty-state">Cadastre seu primeiro sabor na aba Custo por cookie.</div>'}</div>
    </div>
    <div class="section-head"><div><h2>Fluxo de trabalho</h2><p>Atualize a base, depois confira os resultados.</p></div></div>
    <div class="grid grid-3">
      <div class="card card-pad"><div class="eyebrow">01 · BASE</div><h3>Insumos</h3><p class="muted small">Informe preço e tamanho da embalagem comprada. O custo por unidade sai automaticamente.</p><button class="button button-quiet button-small" data-action="go" data-view="ingredients">Abrir insumos →</button></div>
      <div class="card card-pad"><div class="eyebrow">02 · RECEITAS</div><h3>Massas e recheios</h3><p class="muted small">Cadastre quantidades usadas nas receitas e o rendimento de cada massa.</p><div class="row-actions"><button class="button button-quiet button-small" data-action="go" data-view="doughs">Massas →</button><button class="button button-quiet button-small" data-action="go" data-view="fillings">Recheios →</button></div></div>
      <div class="card card-pad"><div class="eyebrow">03 · VENDA</div><h3>Custo e preço</h3><p class="muted small">Combine massa e recheio por sabor, informe custos adicionais e revise preço, lucro e kits.</p><div class="row-actions"><button class="button button-quiet button-small" data-action="go" data-view="cookies">Custo →</button><button class="button button-quiet button-small" data-action="go" data-view="prices">Preço →</button></div></div>
    </div>
    <p class="bottom-note">Os cadastros iniciais reproduzem os exemplos da planilha original. Revise os preços de compra e os valores preenchidos antes de usar os resultados como referência comercial.</p>`;
}
function renderIngredients() {
  const rows = state.ingredients.map(ing=>`<tr>
    <td class="name-cell">${input('ingredient',ing.id,'name',ing.name,{className:'field field-sm field-name'})}</td>
    <td class="num">${input('ingredient',ing.id,'price',ing.price,{type:'number',step:'0.01',min:0,className:'field field-sm field-money'})}</td>
    <td class="num">${input('ingredient',ing.id,'packQty',ing.packQty,{type:'number',step:'0.01',min:0,className:'field field-sm field-number'})}</td>
    <td>${select('ingredient',ing.id,'unit',ing.unit,[{id:'g',name:'g'},{id:'kg',name:'kg'},{id:'ml',name:'ml'},{id:'un',name:'un'}],{className:'field field-sm field-select'})}</td>
    <td class="num strong money">${money(unitCost(ing))}<div class="muted small">por ${esc(ing.unit||'un')}</div></td>
    <td>${input('ingredient',ing.id,'note',ing.note||'',{className:'field field-sm',placeholder:'Observação'})}</td>
    <td>${actionButtons('ingredient',ing.id)}</td>
  </tr>`).join('');
  return `${pageHeading('BASE DE CUSTOS','Insumos','Cadastre o preço pago, a quantidade da embalagem e a unidade (g, kg, ml ou un). Ao alternar entre g e kg, as quantidades existentes são convertidas automaticamente.',`<button class="button button-primary" data-action="add" data-type="ingredient">+ Novo insumo</button>`)}
    <div class="card"><div class="card-header"><div><h2>Lista de insumos</h2><p>${state.ingredients.length} itens cadastrados · os valores alimentam as massas e os recheios.</p></div><span class="pill pill-green">Cálculo automático</span></div>
      <div class="table-wrap"><table><thead><tr><th>Insumo</th><th class="num">Preço pago (R$)</th><th class="num">Qtd. embalagem</th><th>Unidade</th><th class="num">Preço por unidade</th><th>Observação</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="7"><div class="empty-state">Nenhum insumo cadastrado.</div></td></tr>'}</tbody></table></div>
    </div>
    <p class="bottom-note">Exemplo: uma embalagem de 1.000 g por R$ 10,00 custa R$ 0,01/g. Para ovos, informe a quantidade em unidades e use “un” como unidade de medida.</p>`;
}
function componentRows(type, recipe, components) {
  const entity = type==='dough'?'doughComponent':'fillingComponent';
  const removeAction = type==='dough'?'remove-dough-component':'remove-filling-component';
  const rows = components.map(comp=>{
    const ing = getIngredient(comp.ingredientId);
    return `<div class="recipe-line">
      ${select(entity,recipe.id,'ingredientId',comp.ingredientId,state.ingredients.map(i=>({id:i.id,name:i.name})),{className:'field field-sm field-select',placeholder:'Selecione insumo',allowBlank:true,subId:comp.id})}
      <div class="qty-control">${input(entity,recipe.id,'qty',comp.qty,{type:'number',step:ing?.unit==='kg'?'0.0001':'0.01',min:0,className:'field field-sm field-number qty-field',subId:comp.id})}<span class="unit-suffix">${esc(ing?.unit||'un')}</span></div>
      <button class="button button-danger button-icon" title="Remover ingrediente da receita" aria-label="Remover ingrediente" data-action="${removeAction}" data-id="${esc(recipe.id)}" data-subid="${esc(comp.id)}">×</button>
    </div>`;
  }).join('');
  return `<div class="recipe-line-head"><span>Ingrediente</span><span style="text-align:right">Quantidade na unidade cadastrada</span><span></span></div>${rows||'<p class="muted small">Nenhum ingrediente adicionado.</p>'}`;
}
function renderDoughs() {
  const cards = state.doughs.map(dough=>{
    const stats = doughStats(dough);
    return `<section class="card recipe-card">
      <div class="card-header"><div style="flex:1;min-width:190px"><label class="label">Nome da massa</label>${input('dough',dough.id,'name',dough.name,{className:'field field-name'})}</div>
        <div class="recipe-summary"><div class="recipe-stat"><span>Rendimento</span>${input('dough',dough.id,'yield',dough.yield,{type:'number',step:'1',min:0,className:'field field-sm field-number'})}</div><div class="recipe-stat"><span>Custo da receita</span><strong>${money(stats.cost)}</strong></div><div class="recipe-stat"><span>Custo por cookie</span><strong>${money(stats.unitCost)}</strong></div></div>
        <div class="actions-cell"><button class="button button-quiet button-icon" title="Duplicar massa" aria-label="Duplicar massa" data-action="duplicate" data-type="dough" data-id="${esc(dough.id)}">⧉</button><button class="button button-danger button-icon" title="Excluir massa" aria-label="Excluir massa" data-action="delete" data-type="dough" data-id="${esc(dough.id)}">×</button></div>
      </div>
      <div class="recipe-list"><div class="recipe-list-top"><div><h3>Ingredientes da receita</h3><div class="muted small">A quantidade usa a unidade cadastrada em Insumos.</div></div><button class="button button-quiet button-small" data-action="add-dough-component" data-id="${esc(dough.id)}">+ Ingrediente</button></div>
        ${componentRows('dough',dough,dough.components||[])}
      </div>
      <div class="recipe-footer"><span>Quantidade total registrada: <strong>${decimal(stats.totalQty,2)}</strong></span><span>Rendimento: <strong>${decimal(stats.yield,0)} cookies</strong></span><span>Custo da receita: <strong>${money(stats.cost)}</strong></span></div>
    </section>`;
  }).join('');
  return `${pageHeading('FICHA TÉCNICA','Massas','Informe quanto de cada insumo entra em uma receita e quantos cookies essa receita rende. O custo é calculado pela composição cadastrada.',`<button class="button button-primary" data-action="add" data-type="dough">+ Nova massa</button>`)}
    <div class="stack">${cards||'<div class="empty-state"><strong>Nenhuma massa cadastrada</strong>Adicione uma massa para começar.</div>'}</div>
    <p class="bottom-note">O custo da receita soma quantidade utilizada × custo por unidade de cada insumo. O custo por cookie é o custo da receita dividido pelo rendimento informado. O sistema não presume um rendimento fixo.</p>`;
}
function renderFillings() {
  const cards = state.fillings.map(filling=>{
    const stats = fillingStats(filling);
    return `<section class="card recipe-card">
      <div class="card-header"><div style="flex:1;min-width:185px"><label class="label">Nome do recheio</label>${input('filling',filling.id,'name',filling.name,{className:'field field-name'})}<div class="helper">${esc(filling.note||'Custo por unidade de cookie.')}</div></div>
        <div class="recipe-summary"><div class="recipe-stat"><span>Insumos na composição</span><strong>${(filling.components||[]).length}</strong></div><div class="recipe-stat"><span>Outros custos</span><strong>${money(stats.other)}</strong></div><div class="recipe-stat"><span>Custo por cookie</span><strong>${money(stats.cost)}</strong></div></div>
        <div class="actions-cell"><button class="button button-quiet button-icon" title="Duplicar recheio" aria-label="Duplicar recheio" data-action="duplicate" data-type="filling" data-id="${esc(filling.id)}">⧉</button><button class="button button-danger button-icon" title="Excluir recheio" aria-label="Excluir recheio" data-action="delete" data-type="filling" data-id="${esc(filling.id)}">×</button></div>
      </div>
      <div class="recipe-list"><div class="recipe-list-top"><div><h3>Composição do recheio</h3><div class="muted small">Informe a quantidade usada em um cookie. Para custo direto, use “Outros”.</div></div><button class="button button-quiet button-small" data-action="add-filling-component" data-id="${esc(filling.id)}">+ Ingrediente</button></div>
        ${componentRows('filling',filling,filling.components||[])}
        <div class="divider"></div><div class="form-grid"><div class="form-field"><label class="label">Outros custos por cookie (R$)</label>${input('filling',filling.id,'other',filling.other,{type:'number',step:'0.01',min:0,className:'field field-money'})}<div class="helper">Valor direto usado pela planilha original para recheios não pesados.</div></div><div class="form-field" style="grid-column:span 2"><label class="label">Observação</label>${input('filling',filling.id,'note',filling.note||'',{className:'field',placeholder:'Opcional'})}</div></div>
      </div>
      <div class="recipe-footer"><span>Custo dos ingredientes: <strong>${money(stats.gramCost)}</strong></span><span>Outros: <strong>${money(stats.other)}</strong></span><span>Custo do recheio: <strong>${money(stats.cost)}</strong></span></div>
    </section>`;
  }).join('');
  return `${pageHeading('FICHA TÉCNICA','Recheios','Informe a quantidade de cada ingrediente usada em um cookie. O custo unitário é atualizado automaticamente.',`<button class="button button-primary" data-action="add" data-type="filling">+ Novo recheio</button>`)}
    <div class="stack">${cards||'<div class="empty-state"><strong>Nenhum recheio cadastrado</strong>Adicione um recheio para começar.</div>'}</div>
    <p class="bottom-note">Custo por cookie = soma de quantidade usada × preço por unidade dos insumos + outros custos por cookie.</p>`;
}
function renderCookies() {
  const rows = state.cookies.map(cookie=>{
    const stats = cookieStats(cookie);
    return `<tr>
      <td class="name-cell">${input('cookie',cookie.id,'name',cookie.name,{className:'field field-sm field-name'})}</td>
      <td>${select('cookie',cookie.id,'doughId',cookie.doughId,state.doughs.map(x=>({id:x.id,name:x.name})),{className:'field field-sm field-select',placeholder:'Sem massa',allowBlank:true})}</td>
      <td class="num money">${money(stats.doughCost)}</td>
      <td>${select('cookie',cookie.id,'fillingId',cookie.fillingId,state.fillings.map(x=>({id:x.id,name:x.name})),{className:'field field-sm field-select',placeholder:'Sem recheio',allowBlank:true})}</td>
      <td class="num money">${money(stats.fillingCost)}</td>
      <td class="num money">${money(stats.ingredientCost)}</td>
      <td class="num">${input('cookie',cookie.id,'packaging',cookie.packaging,{type:'number',step:'0.01',min:0,className:'field field-sm field-money'})}</td>
      <td class="num">${input('cookie',cookie.id,'fixed',cookie.fixed,{type:'number',step:'0.01',min:0,className:'field field-sm field-money'})}</td>
      <td class="num">${input('cookie',cookie.id,'labor',cookie.labor,{type:'number',step:'0.01',min:0,className:'field field-sm field-money'})}</td>
      <td class="num strong money">${money(stats.total)}${stats.needsDough||stats.needsFilling?'<div class="small price-bad">Vínculo pendente</div>':''}</td>
      <td>${actionButtons('cookie',cookie.id)}</td>
    </tr>`;
  }).join('');
  return `${pageHeading('CUSTO DO PRODUTO','Custo por cookie','Combine uma massa e um recheio para cada sabor. Embalagem, custos fixos e mão de obra são valores por cookie, conforme a lógica da planilha.',`<button class="button button-primary" data-action="add" data-type="cookie">+ Novo sabor</button>`)}
    <div class="card"><div class="card-header"><div><h2>Ficha de custos dos sabores</h2><p>${state.cookies.length} sabores · os custos de massa e recheio vêm das respectivas abas.</p></div><span class="pill pill-green">Atualização automática</span></div>
      <div class="table-wrap"><table><thead><tr><th>Sabor</th><th>Massa usada</th><th class="num">Custo da massa</th><th>Recheio</th><th class="num">Custo do recheio</th><th class="num">Ingredientes</th><th class="num">Embalagem (R$)</th><th class="num">Fixos (R$)</th><th class="num">Mão de obra (R$)</th><th class="num">Custo total</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="11"><div class="empty-state">Nenhum sabor cadastrado.</div></td></tr>'}</tbody></table></div>
      <div class="card-body"><div class="notice">Embalagem, fixos e mão de obra são lançados como custo por cookie. Para manter a mesma lógica da planilha, o sistema não divide esses três campos por lote automaticamente.</div></div>
    </div>`;
}
function renderPrices() {
  const rows = state.cookies.map(cookie=>{
    const stats = cookieStats(cookie);
    const marginClass = stats.marginToday < 0.35 ? 'price-bad' : 'price-good';
    return `<tr>
      <td class="name-cell"><strong>${esc(cookie.name)}</strong><div class="muted small">${money(stats.total)} de custo</div></td>
      <td class="num">${input('cookie',cookie.id,'markup',cookie.markup,{type:'number',step:'0.1',min:0,className:'field field-sm field-number'})}<div class="muted small">vezes o custo</div></td>
      <td class="num strong money">${money(stats.suggestedPrice)}</td>
      <td class="num">${input('cookie',cookie.id,'currentPrice',cookie.currentPrice,{type:'number',step:'0.01',min:0,className:'field field-sm field-money'})}</td>
      <td class="num money ${stats.profitToday>=0?'price-good':'price-bad'}">${money(stats.profitToday)}</td>
      <td class="num ${marginClass}">${percent(stats.marginToday,1)}</td>
      <td class="num">${decimal(stats.actualMarkup,2)}x</td>
      <td class="num">${input('cookie',cookie.id,'platformFeePct',(num(cookie.platformFee)*100).toFixed(2),{type:'number',step:'0.1',min:0,max:99.99,className:'field field-sm field-money'})}</td>
      <td class="num strong money">${money(stats.platformPrice)}</td>
    </tr>`;
  }).join('');
  const kits = state.kits.map(kit=>{
    const stats = kitStats(kit);
    return `<div class="kit-card"><div class="kit-card-heading"><div style="flex:1"><label class="label">Nome do kit</label>${input('kit',kit.id,'name',kit.name,{className:'field field-sm'})}</div>${actionButtons('kit',kit.id)}</div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px"><div><label class="label">Quantidade</label>${input('kit',kit.id,'qty',kit.qty,{type:'number',step:'1',min:1,className:'field field-sm field-number'})}</div><div><label class="label">Desconto (%)</label>${input('kit',kit.id,'discountPct',(num(kit.discount)*100).toFixed(1),{type:'number',step:'0.5',min:0,max:100,className:'field field-sm field-number'})}</div><div style="grid-column:span 2"><label class="label">Sabor usado como base</label>${select('kit',kit.id,'baseCookieId',kit.baseCookieId,state.cookies.map(x=>({id:x.id,name:x.name})),{className:'field field-sm field-select',placeholder:'Sem sabor base',allowBlank:true})}</div></div>
      <div class="kit-metrics"><div class="kit-metric"><span>Custo estimado do kit</span><strong>${money(stats.cost)}</strong></div><div class="kit-metric"><span>Preço sugerido do kit</span><strong>${money(stats.suggestedPrice)}</strong></div></div><div class="helper">Economia pelo desconto: ${money(stats.saving)}</div></div>`;
  }).join('');
  return `${pageHeading('PRECIFICAÇÃO','Preço de venda','Compare o preço atual com o custo total. O preço sugerido preserva a regra original: custo × markup.',`<button class="button button-primary" data-action="add" data-type="kit">+ Novo kit</button>`)}
    <div class="card"><div class="card-header"><div><h2>Preço por sabor</h2><p>A margem é calculada sobre o preço praticado hoje. Valores abaixo de 35% ficam sinalizados.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Sabor</th><th class="num">Markup alvo</th><th class="num">Preço sugerido</th><th class="num">Preço hoje</th><th class="num">Lucro hoje</th><th class="num">Margem hoje</th><th class="num">Markup real</th><th class="num">Taxa plataforma (%)</th><th class="num">Preço plataforma</th></tr></thead><tbody>${rows||'<tr><td colspan="9"><div class="empty-state">Cadastre um sabor na aba Custo por cookie.</div></td></tr>'}</tbody></table></div>
      <div class="card-body"><div class="notice">O preço para plataforma usa preço atual ÷ (1 − taxa), seguindo a planilha original. Confirme a taxa no seu contrato. Markup é multiplicador sobre custo, não é a mesma coisa que margem.</div></div>
    </div>
    <div class="section-head"><div><h2>Kits e combos</h2><p>O custo considera quantidade × custo unitário do sabor base. O preço considera o preço atual do sabor base e o desconto informado.</p></div></div>
    <div class="kit-grid">${kits||'<div class="empty-state">Nenhum kit cadastrado.</div>'}</div>
    <p class="bottom-note">A planilha original calcula kits a partir do sabor base e do preço atual. Embalagem exclusiva do kit e custos logísticos não são adicionados automaticamente ao custo do kit.</p>`;
}
function showToast(message) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = message; region.appendChild(toast);
  window.setTimeout(()=>toast.remove(),3200);
}
function showConfirm(title,description,onConfirm,confirmText='Excluir item') {
  pendingConfirm = onConfirm;
  const old = document.getElementById('confirm-modal'); if (old) old.remove();
  const modal = document.createElement('div'); modal.className='modal-backdrop'; modal.id='confirm-modal';
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">${esc(title)}</h2><p>${esc(description)}</p><div class="modal-actions"><button class="button button-quiet" data-action="cancel-confirm">Cancelar</button><button class="button button-danger" data-action="confirm">${esc(confirmText)}</button></div></div>`;
  document.body.appendChild(modal);
}
function duplicateRecord(type,id) {
  let source, list, prefix;
  if (type==='ingredient') { list=state.ingredients; source=findById(list,id); prefix='ing'; }
  if (type==='dough') { list=state.doughs; source=findById(list,id); prefix='dough'; }
  if (type==='filling') { list=state.fillings; source=findById(list,id); prefix='filling'; }
  if (type==='cookie') { list=state.cookies; source=findById(list,id); prefix='cookie'; }
  if (type==='kit') { list=state.kits; source=findById(list,id); prefix='kit'; }
  if (!source || !list) return;
  const copy = clone(source); copy.id=makeId(prefix);
  copy.name = `${source.name || 'Item'} (cópia)`;
  if (type==='dough' || type==='filling') copy.components=(source.components||[]).map(c=>({...c,id:makeId(type==='dough'?'dc':'fc')}));
  list.splice(list.findIndex(x=>x.id===id)+1,0,copy);
  saveState(); render(); showToast('Item duplicado.');
}
function deleteRecord(type,id) {
  const map={ingredient:'ingredients',dough:'doughs',filling:'fillings',cookie:'cookies',kit:'kits'};
  const list=state[map[type]]; const item=findById(list,id); if(!item) return;
  const name=item.name || 'este item';
  let message='O item será removido do cadastro.';
  if (type==='ingredient') message=`“${name}” será removido dos insumos e de todas as composições de massas e recheios que o utilizam. Os custos serão recalculados.`;
  if (type==='dough') message=`“${name}” será removida. Os sabores que a utilizam ficarão sem massa associada, até você escolher outra.`;
  if (type==='filling') message=`“${name}” será removido. Os sabores que o utilizam ficarão sem recheio associado, até você escolher outro.`;
  if (type==='cookie') message=`“${name}” será removido da ficha de custos e da precificação. Kits que o usam como base ficarão sem sabor base.`;
  if (type==='kit') message=`“${name}” será removido dos kits cadastrados.`;
  showConfirm('Excluir cadastro?',message,()=>{
    state[map[type]]=state[map[type]].filter(x=>x.id!==id);
    if (type==='ingredient') {
      state.doughs.forEach(r=>r.components=(r.components||[]).filter(c=>c.ingredientId!==id));
      state.fillings.forEach(r=>r.components=(r.components||[]).filter(c=>c.ingredientId!==id));
    }
    if (type==='dough') state.cookies.forEach(c=>{if(c.doughId===id)c.doughId='';});
    if (type==='filling') state.cookies.forEach(c=>{if(c.fillingId===id)c.fillingId='';});
    if (type==='cookie') state.kits.forEach(k=>{if(k.baseCookieId===id)k.baseCookieId='';});
    saveState(); render(); showToast('Cadastro excluído e referências ajustadas.');
  });
}
function addRecord(type) {
  const id=makeId(type);
  if (type==='ingredient') state.ingredients.push({id,name:'Novo insumo',price:0,packQty:1000,unit:'g',note:''});
  if (type==='dough') state.doughs.push({id,name:'Nova massa',yield:1,components:[]});
  if (type==='filling') state.fillings.push({id,name:'Novo recheio',other:0,note:'',components:[]});
  if (type==='cookie') state.cookies.push({id,name:'Novo sabor',doughId:state.doughs[0]?.id||'',fillingId:state.fillings[0]?.id||'',packaging:1,fixed:1.5,labor:0,markup:3,currentPrice:0,platformFee:0.27});
  if (type==='kit') state.kits.push({id,name:'Novo kit',qty:1,baseCookieId:state.cookies[0]?.id||'',discount:0});
  saveState(); render(); showToast('Novo cadastro criado.');
}
function addComponent(type,id) {
  const list=type==='dough'?state.doughs:state.fillings;
  const recipe=findById(list,id); if(!recipe) return;
  if(!state.ingredients.length) { showToast('Cadastre primeiro um insumo.'); return; }
  const componentId=makeId(type==='dough'?'dc':'fc');
  recipe.components=recipe.components||[];
  recipe.components.push({id:componentId,ingredientId:state.ingredients[0].id,qty:0});
  saveState(); render();
}
function removeComponent(type,id,subid) {
  const list=type==='dough'?state.doughs:state.fillings;
  const recipe=findById(list,id); if(!recipe) return;
  recipe.components=(recipe.components||[]).filter(c=>c.id!==subid);
  saveState(); render(); showToast('Ingrediente removido da composição.');
}
function updateField(el) {
  const entity=el.dataset.entity,id=el.dataset.id,field=el.dataset.field;
  if(!entity||!field) return;
  let val=el.value;
  if(el.type==='number') val=num(val);
  if(entity==='ingredient') {
    const obj=findById(state.ingredients,id);
    if(obj) {
      if(field==='unit' && obj.unit!==val && ((obj.unit==='g' && val==='kg') || (obj.unit==='kg' && val==='g'))) {
        // Ao alternar g/kg, converte a embalagem e as quantidades já usadas
        // nas receitas para manter o mesmo custo real após a mudança de unidade.
        const factor = val==='kg' ? 0.001 : 1000;
        obj.packQty = Number((num(obj.packQty) * factor).toFixed(6));
        [...state.doughs,...state.fillings].forEach(recipe => (recipe.components||[]).forEach(comp => {
          if(comp.ingredientId===id) comp.qty = Number((num(comp.qty) * factor).toFixed(6));
        }));
      }
      obj[field]=val;
    }
  }
  else if(entity==='dough') { const obj=findById(state.doughs,id); if(obj) obj[field]=val; }
  else if(entity==='filling') { const obj=findById(state.fillings,id); if(obj) obj[field]=val; }
  else if(entity==='cookie') {
    const obj=findById(state.cookies,id);
    if(obj) {
      if(field==='platformFeePct') obj.platformFee=Math.max(0,Math.min(.9999,num(val)/100));
      else obj[field]=val;
    }
  }
  else if(entity==='kit') {
    const obj=findById(state.kits,id);
    if(obj) {
      if(field==='discountPct') obj.discount=Math.max(0,Math.min(1,num(val)/100));
      else obj[field]=val;
    }
  }
  else if(entity==='doughComponent') {
    const obj=findById(state.doughs,id); const comp=obj&&(obj.components||[]).find(c=>c.id===el.dataset.subid); if(comp) comp[field]=field==='qty'?Math.max(0,num(val)):val;
  }
  else if(entity==='fillingComponent') {
    const obj=findById(state.fillings,id); const comp=obj&&(obj.components||[]).find(c=>c.id===el.dataset.subid); if(comp) comp[field]=field==='qty'?Math.max(0,num(val)):val;
  }
  saveState();
  // Recalculate output values while preserving focus and cursor when practical.
  const active = document.activeElement; const view=currentView;
  render();
  if(active && active.dataset && active.dataset.entity) {
    const selector=`[data-entity="${CSS.escape(entity)}"][data-id="${CSS.escape(id)}"][data-field="${CSS.escape(field)}"]${el.dataset.subid?`[data-subid="${CSS.escape(el.dataset.subid)}"]`:''}`;
    const replacement=document.querySelector(selector);
    if(replacement) { replacement.focus({preventScroll:true}); try { replacement.setSelectionRange(replacement.value.length,replacement.value.length); } catch(_){} }
  }
}
function exportBackup() {
  const blob=new Blob([JSON.stringify({app:'Calculadora Cookie Eu Quero',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`calculadora-cookie-eu-quero-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('Backup exportado.');
}
function importBackup(file) {
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const parsed=JSON.parse(reader.result); const data=parsed.data||parsed;
      const required=['ingredients','doughs','fillings','cookies','kits'];
      if(!data||!required.every(k=>Array.isArray(data[k]))) throw new Error('O arquivo não parece ser um backup compatível.');
      showConfirm('Importar este backup?', 'Os dados atuais neste navegador serão substituídos pelos dados do arquivo selecionado. Exporte um backup atual antes de continuar.',()=>{
        state={version:1,ingredients:data.ingredients,doughs:data.doughs,fillings:data.fillings,cookies:data.cookies,kits:data.kits};
        saveState(); render(); showToast('Backup importado.');
      },'Substituir dados');
    } catch(err) { showToast(err.message||'Não foi possível importar esse arquivo.'); }
  };
  reader.onerror=()=>showToast('Falha ao ler o arquivo.'); reader.readAsText(file);
}
function handleAction(button) {
  const action=button.dataset.action,id=button.dataset.id,type=button.dataset.type;
  if(action==='go') setView(button.dataset.view);
  else if(action==='add') addRecord(type);
  else if(action==='duplicate') duplicateRecord(type,id);
  else if(action==='delete') deleteRecord(type,id);
  else if(action==='add-dough-component') addComponent('dough',id);
  else if(action==='add-filling-component') addComponent('filling',id);
  else if(action==='remove-dough-component') removeComponent('dough',id,button.dataset.subid);
  else if(action==='remove-filling-component') removeComponent('filling',id,button.dataset.subid);
  else if(action==='export') exportBackup();
  else if(action==='import-trigger') document.getElementById('import-file').click();
  else if(action==='reset') showConfirm('Restaurar dados de exemplo?', 'Isso substituirá os cadastros deste navegador pelos dados originais da planilha. Exporte um backup antes se quiser preservar suas alterações.',()=>{state=clone(DEFAULT_STATE);saveState();render();showToast('Dados de exemplo restaurados.');},'Restaurar exemplos');
  else if(action==='cancel-confirm') { const modal=document.getElementById('confirm-modal'); if(modal) modal.remove(); pendingConfirm=null; }
  else if(action==='confirm') { const modal=document.getElementById('confirm-modal'); if(modal) modal.remove(); const cb=pendingConfirm; pendingConfirm=null; if(cb) cb(); }
}
function init() {
  state=loadState();
  document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.body.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]'); if(button) handleAction(button);
  });
  document.body.addEventListener('change',event=>{
    const target=event.target;
    if(target.matches('[data-entity][data-field]')) updateField(target);
  });
  document.getElementById('import-file').addEventListener('change',event=>{
    const file=event.target.files&&event.target.files[0]; if(file) importBackup(file); event.target.value='';
  });
  render();
}
if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined' && module.exports) module.exports={DEFAULT_STATE,unitCost,doughStats,fillingStats,cookieStats,kitStats,clone,setStateForTest:value=>{state=value;}};
