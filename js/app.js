import { destinations, mapyKey } from '../config/destinations.js'
import { readEntries, writeEntries, download, photoData, validCoordinates } from './store.js'
import { $, html, norm, uniq, option, select, month, difficulty, link, image, credit } from './ui.js'
import { createGroups } from './groups.js'
import { initMap, drawTaxonMap } from './map.js'

const settings = {
  get(key) { try { return localStorage.getItem(key) } catch { return null } },
  set(key,value) { try { localStorage.setItem(key,value) } catch { /* Session still works. */ } }
}
const destinationId = Object.hasOwn(destinations, settings.get('destination')) ? settings.get('destination') : Object.keys(destinations)[0]
const destination = destinations[destinationId]
const load = async file => {
  const response = await fetch(destination.path + file)
  if (!response.ok) throw new Error(file)
  return response.json()
}
const taxaById = new Map()
const candidatesById = new Map()
const catalogTaxon = id => candidatesById.get(id)?.checklist_parent || id
const knownTaxon = id => taxaById.get(id) || candidatesById.get(id)
const retiredChecklist = new Map()
const retiredName = id => Object.hasOwn(destination.retiredTaxa || {},id) ? destination.retiredTaxa[id] : retiredChecklist.get(id)
const outsideOption = 'outside-checklist'
function preserveRetiredRecord(entry) {
  const name = retiredName(entry?.taxonId)
  if (entry?.kind !== 'record' || !name) return entry
  return {...entry,taxonId:null,customTaxon:name,destinationId}
}
const belongsHere = entry => knownTaxon(entry.taxonId) ||
  (entry.kind === 'record' && entry.taxonId === null && entry.destinationId === destinationId)
const recordName = entry => entry.customTaxon || knownTaxon(entry.taxonId)?.scientific_name
const validCustomTaxon = name => typeof name === 'string' && name.trim().length > 0 && name.length <= 160
let taxa = [], places = [], occurrences, mapOccurrences, mapCatalog, entries = [], idbAvailable = true, mapping, detailId, editing
let activePage = 'atlas'
let groups, atlasGroup = '', atlasMarine = false
const entriesFor = id => entries.filter(entry => entry.taxonId === id)
const records = () => entries.filter(entry => entry.kind === 'record')
const seen = id => entries.some(entry => catalogTaxon(entry.taxonId) === id && (entry.kind === 'quick' || entry.kind === 'record'))
const favorite = id => entriesFor(id).some(entry => entry.kind === 'favorite')
const tell = message => { $('notice').textContent = message }
const run = handler => async event => {
  try { await handler(event) } catch (error) { console.error(error); tell('Akci se nepodařilo dokončit. Zkontrolujte data nebo dostupnost úložiště.') }
}
async function save(added, removed = []) {
  if (!idbAvailable) throw new Error('IndexedDB')
  await writeEntries(added, removed)
  entries = (await readEntries()).map(preserveRetiredRecord).filter(belongsHere)
  redraw()
}
function setTheme(value) {
  if (value === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = value
  settings.set('theme',value)
}
$('theme').value = ['dark','light'].includes(settings.get('theme')) ? settings.get('theme') : 'auto'
setTheme($('theme').value)
$('theme').onchange = event => setTheme(event.target.value)

function redraw() {
  const count = taxa.filter(t => seen(t.id)).length
  $('progressText').textContent = `${count} / ${taxa.length} taxonů nalezeno`
  $('progress').max = taxa.length || 1
  $('progress').value = count
  if (activePage === 'atlas') drawAtlas()
  if (activePage === 'journal') drawJournal()
  if (activePage === 'stats') drawStats()
  if (activePage === 'map') mapping?.refresh()
}
function drawCategories() {
  const categories = $('atlasCategories')
  const focused = categories.contains(document.activeElement) ? document.activeElement : null
  const button = (id,label,count,tone) => `<button type="button" data-group="${html(id)}" data-tone="${tone || 'leaf'}" aria-pressed="${id === atlasGroup}"><span>${html(label)}</span><small>${count}</small></button>`
  const groupButton = node => button(node.id,node.label,groups.count(node.id),node.tone)
  const active = groups.node(atlasGroup)
  const branch = []
  for (let node = active; node; node = node.parent) branch.unshift(node)
  categories.innerHTML = `<div class="atlas-category-row" data-level="root">${button('','Všechny taxony',taxa.length)}${groups.roots.map(groupButton).join('')}</div>
    ${branch.map(node => {
      const children = groups.children(node)
      return children.length ? `<div class="atlas-category-branch"><p>${html(node.label)}</p><div class="atlas-category-row" data-level="${html(node.id)}">${button(node.id,node.id === 'birds' ? 'Všichni ptáci' : 'Celá skupina',groups.count(node.id),node.tone)}${children.map(groupButton).join('')}</div></div>` : ''
    }).join('')}
    ${groups.marineCount ? `<div class="atlas-environment"><button type="button" data-marine data-tone="water" aria-pressed="${atlasMarine}"><span>Mořské organismy</span><small>${groups.marineCount}</small></button></div>` : ''}`
  if (focused) {
    const buttons = [...categories.querySelectorAll('button')]
    const level = focused.closest('[data-level]')?.dataset.level
    const replacement = buttons.find(candidate => candidate.dataset.group === focused.dataset.group
      && candidate.closest('[data-level]')?.dataset.level === level)
    replacement?.focus({preventScroll:true})
  }
}
function drawAtlas() {
  const query = norm($('query').value).trim().split(/\s+/)
  const value = id => $(id).value
  const list = taxa.filter(t => {
    const text = norm([t.scientific_name,t.common_name_cs,t.common_name_en,t.local_form,t.former_label,
      ...t.synonyms,...(t.genus_examples || []),...Object.values(t.taxonomy),...groups.path(t.id).map(node=>node.label),...t.habitats,t.identification,t.ecology,t.observation_tips].join(' '))
    return query.every(word => text.includes(word))
      && groups.matches(t.id,atlasGroup,atlasMarine)
      && (!value('habitat') || t.habitats.includes(value('habitat')))
      && (!value('endemic') || (t.endemicity || 'Neurčeno') === value('endemic'))
      && (!value('origin') || (t.origin_status || 'Neurčeno') === value('origin'))
      && (!value('chance') || String(t.detectability) === value('chance'))
      && (!value('season') || (value('season') === '?' ? !(t.seasonality || t.observation_months)?.length : (t.seasonality || t.observation_months)?.includes(Number(value('season')))))
      && (!value('seen') || seen(t.id) === (value('seen') === 'yes'))
      && (!value('favorite') || favorite(t.id))
  })
  const collator = new Intl.Collator('cs')
  const sort = value('sort')
  list.sort((a,b) => (sort === 'count' ? (b.observation_count ?? -1) - (a.observation_count ?? -1)
    : sort === 'chance' ? (a.detectability ?? 99) - (b.detectability ?? 99)
    : sort === 'name' ? collator.compare(a.common_name_cs || a.scientific_name, b.common_name_cs || b.scientific_name)
    : 0) || collator.compare(a.scientific_name,b.scientific_name))
  $('results').textContent = `${list.length} z ${taxa.length} taxonů`
  const card = t => `<article class="card ${seen(t.id) ? 'seen' : ''}">
    <button class="open-photo" data-action="detail" data-id="${html(t.id)}" aria-label="Detail · ${html(t.scientific_name)}">${image(t)}</button>
    <div class="card-content"><small>${html(groups.path(t.id).at(-1).label)}</small><h3><i>${html(t.scientific_name)}</i></h3>
    <p>${html(t.common_name_cs)}</p><div class="tags"><span class="tag">${html(t.endemicity || 'Endemicita neurčena')}</span><span class="tag">${html(difficulty[t.detectability] || 'Obtížnost neurčena')}</span></div>
    <p class="muted">${html(t.habitats.join(', '))}</p>${genusExamples(t,true)}${photoLinks(t,true)}<div class="actions">${taxonButtons(t)}<button data-action="detail" data-id="${html(t.id)}">Detail</button></div></div>
    </article>`
  const members = sort === 'group' ? groups.members(list) : null
  const sections = (nodes, depth = 0) => nodes.map(node => {
    const ids = members.get(node.id)
    if (!ids) return ''
    const heading = `h${Math.min(3 + depth,6)}`
    return `<${heading} class="atlas-group" data-group="${html(node.id)}" data-depth="${depth}" data-tone="${node.tone || 'leaf'}">${html(node.label)} <small>· ${ids.length}</small></${heading}>`
      + (node.children.length ? sections(groups.children(node),depth + 1) : ids.map(id=>card(taxaById.get(id))).join(''))
  }).join('')
  $('cards').innerHTML = (members ? sections(groups.roots) : list.map(card).join('')) || '<p>Žádné odpovídající taxony.</p>'
}
function genusExamples(taxon, card = false) {
  if (!taxon.genus_examples?.length) return ''
  const examples = taxon.genus_examples.map(name=>`<i>${html(name)}</i>`).join(', ')
  return card ? `<p class="muted"><small>Možné druhy: ${examples}</small></p>`
    : `<h3>Možné druhy</h3><p>${examples}</p>${taxon.candidate_note ? `<p>${html(taxon.candidate_note)}</p>` : ''}`
}
function photoLinks(taxon, card = false) {
  const links = (taxon.photo_links || []).filter(photo => !card || !taxon.images.length)
  const identification = card ? taxon.images[0]?.identification_note : null
  return [
    identification && `<p class="muted"><small>${html(identification)}</small></p>`,
    ...links.map(photo => `<p>${link(photo.url,photo.label)}</p>`),
    !card && taxon.photo_note && `<p class="muted">${html(taxon.photo_note)}</p>`
  ].filter(Boolean).join('')
}
function taxonButtons(t) {
  const quick = entriesFor(t.id).some(e => e.kind === 'quick')
  const marked = seen(t.id)
  return `<button data-action="quick" data-id="${html(t.id)}" aria-pressed="${quick}" title="Rychlá značka checklistu">${quick ? '✓ Nalezeno' : marked ? '✓ V deníku' : 'Označit nález'}</button>
  <button data-action="favorite" data-id="${html(t.id)}" aria-pressed="${favorite(t.id)}" aria-label="Oblíbený taxon · ${html(t.scientific_name)}" title="Cíleně hledat">${favorite(t.id) ? '★' : '☆'}</button>`
}
const paragraph = (label,value) => `<h3>${label}</h3><p>${html(value || 'Údaj není k dispozici.')}</p>`
function detail(id, open = true) {
  const t = taxaById.get(id)
  $('detailMapCanvas')?._atlasMap?.remove()
  detailId = id
  const documented = occurrences.features.filter(({properties})=>properties.quality_grade === 'research' && properties.taxon_ids.includes(id))
  $('detailBody').innerHTML = `<h2><i>${html(t.scientific_name)}</i></h2><p>${html([t.common_name_cs,t.common_name_en].filter(Boolean).join(' · '))}</p>
    <div class="actions">${taxonButtons(t)}<button data-action="new" data-id="${html(id)}">Zapsat pozorování</button><button data-action="map" data-id="${html(id)}">Zobrazit na mapě</button></div>
    <p class="muted">${html(t.verification_status)}</p>
    ${t.images.length ? t.images.map(p => `<figure><img loading="lazy" decoding="async" src="${html(p.src)}" alt="${html(p.depicted_name || t.scientific_name)}"><figcaption>${credit(p)}</figcaption></figure>`).join('') : image(t)}${photoLinks(t)}
    ${paragraph('Taxonomie', [t.taxonomic_rank, ...Object.values(t.taxonomy)].filter(Boolean).join(' · '))}
    ${t.local_form ? paragraph('Místní poddruh',t.local_form) : ''}
    ${t.former_label ? paragraph('Dřívější označení v seznamu',t.former_label) : ''}
    ${genusExamples(t)}
    ${paragraph('Synonyma',t.synonyms.join(', '))}
    ${paragraph('Rozšíření a původnost',[t.distribution,t.endemicity,t.origin_status].filter(Boolean).join(' · '))}
    ${paragraph('Biotopy',t.habitats.join(', '))}
    ${paragraph('Determinační znaky',t.identification)}
    ${paragraph('Podobné taxony',t.similar_taxa.join(', '))}
    ${paragraph('Ekologie a zajímavosti',[t.ecology,t.interesting_facts].filter(Boolean).join(' '))}
    ${paragraph('Sezónnost',t.seasonality?.map(month).join(', '))}
    ${t.observation_months?.length ? paragraph('Měsíce doložených záznamů', t.observation_months.map(month).join(', ')) : ''}
    <h3>Doložené výskyty</h3><p>${documented.length} záznamů Research Grade v místním datasetu.</p>
    ${documented.length ? '<details id="detailMap"><summary>Zobrazit výřezy pozorování</summary><div id="detailMapCanvas" aria-label="Výskyty taxonu"></div></details>' : ''}
    ${paragraph('Terénní poznámka',t.observation_tips)}
    <h3>Vlastní pozorování</h3>${recordList(records().filter(entry => catalogTaxon(entry.taxonId) === id),false)}
    <h3>Zdroje</h3><ul>${[...t.sources.map(s => link(s.url,s.label)),link('https://www.inaturalist.org/taxa/search?q='+encodeURIComponent(t.scientific_name),'Vyhledat na iNaturalistu'),link('https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent(t.scientific_name),'Vyhledat na Wikimedia Commons')].filter(Boolean).map(s=>`<li>${s}</li>`).join('')}</ul>`
  if (documented.length) $('detailMap').ontoggle = event => {
    const container = $('detailMapCanvas')
    if (event.target.open && $('detail').open) drawTaxonMap(container,destination,documented)
  }
  if (open && !$('detail').open) $('detail').showModal()
}
function recordList(list, actions = true) {
  return `<div class="records-list">${[...list].sort((a,b) => (b.date || '').localeCompare(a.date || '')).map(r => `<article class="panel">
    <strong><i>${html(recordName(r))}</i></strong>${r.customTaxon ? ' <span class="tag">Mimo checklist</span>' : ''}
    <p>${html([r.date?.replace('T',' '),places.find(p=>p.id===r.site)?.name,r.location,r.lat != null ? `${r.lat}, ${r.lon}` : '',r.count != null ? `${r.count} jedinců` : '',r.stage,r.certainty].filter(Boolean).join(' · '))}</p>
    ${r.note ? `<p>${html(r.note)}</p>` : ''}${(r.photos || []).map(photo => `<img loading="lazy" width="150" src="${html(photo)}" alt="Vlastní fotografie">`).join('')}
    ${actions ? `<div class="actions"><button data-action="edit" data-id="${html(r.id)}">Upravit</button><button data-action="delete" data-id="${html(r.id)}">Smazat</button></div>` : ''}</article>`).join('') || '<p>Zatím žádná pozorování.</p>'}</div>`
}
function drawJournal() {
  const quick = entries.filter(e=>e.kind === 'quick').map(e=>knownTaxon(e.taxonId)).filter(Boolean)
  $('records').innerHTML = recordList(records()) + (quick.length ? `<h3>Rychlé značky checklistu</h3><ul>${quick.map(t=>`<li><i>${html(t.scientific_name)}</i> <button data-action="quick" data-id="${html(t.id)}">Odebrat značku</button></li>`).join('')}</ul>` : '')
}
function drawStats() {
  const found = taxa.filter(t=>seen(t.id))
  const list = records()
  const metric = (label,value) => `<div class="panel"><strong>${value}</strong>${label}</div>`
  const bar = (label,value,max) => `<p>${html(label)} · ${value} / ${max}<progress max="${max || 1}" value="${value}" aria-label="${html(label)}"></progress></p>`
  const days = uniq(list.map(r => r.date?.slice(0,10)))
  const wishlist = taxa.filter(t => favorite(t.id) && !seen(t.id))
  const foundGroups = groups.members(found)
  const groupStats = nodes => nodes.map(node => {
    const count = foundGroups.get(node.id)?.length || 0
    const total = groups.count(node.id)
    const children = groups.children(node)
    return children.length
      ? `<details class="group-stats"><summary>${html(node.label)} · ${count} / ${total}</summary><progress max="${total}" value="${count}" aria-label="${html(node.label)}"></progress><div>${groupStats(children)}</div></details>`
      : bar(node.label,count,total)
  }).join('')
  $('statistics').innerHTML = `<div class="metrics">${metric('Nalezené taxony',found.length)}${metric('Taxony v atlasu',taxa.length)}${metric('Splněný checklist',`${Math.round(100*found.length/(taxa.length || 1))} %`)}${metric('Nalezené endemity',found.filter(t=>t.endemicity && t.endemicity !== 'Širší rozšíření').length)}${metric('Záznamy deníku',list.length)}${metric('Navštívené doporučené lokality',uniq(list.map(r=>r.site)).length)}</div>
  <h3>Taxonomické skupiny</h3><div id="groupStats">${groupStats(groups.roots)}</div>
  <h3>Záznamy podle dne</h3>${days.map(day=>bar(day,list.filter(r=>r.date.startsWith(day)).length,list.length)).join('') || '<p>Zatím žádné.</p>'}
  <h3>Oblíbené taxony k nalezení</h3>${wishlist.length ? `<ul>${wishlist.map(t=>`<li><button data-action="detail" data-id="${html(t.id)}"><i>${html(t.scientific_name)}</i></button></li>`).join('')}</ul>` : '<p>Zatím žádné.</p>'}`
}
function editor(taxonId, record) {
  editing = record
  const now = new Date()
  const local = new Date(now.valueOf()-now.getTimezoneOffset()*60000).toISOString().slice(0,16)
  const field = (name,title,type='text',extra='') => `<label>${title}<input name="${name}" type="${type}" value="${html(record?.[name] ?? (name === 'date' ? local : ''))}" ${extra}></label>`
  const recordOptions = taxa.flatMap(t=>[[t.id,t.scientific_name], ...[...candidatesById.values()]
    .filter(candidate=>candidate.checklist_parent === t.id).map(candidate=>[candidate.id,'　' + candidate.scientific_name])])
  $('recordFields').innerHTML = `${select('taxonId','Taxon',[[outsideOption,'Organismus mimo checklist'],...recordOptions],'Vyberte taxon')}<div id="customTaxonField" hidden>${field('customTaxon','Název nebo pracovní určení','text','maxlength="160"')}</div>${field('date','Datum a čas','datetime-local','required')}
  ${select('site','Doporučená lokalita',places.map(p=>[p.id,p.name]),'Bez přiřazení')}${field('location','Vlastní lokalita')}
  ${field('lat','Zeměpisná šířka','number','min="-90" max="90" step="any"')}${field('lon','Zeměpisná délka','number','min="-180" max="180" step="any"')}
  <button type="button" id="recordGps">Použít GPS</button>${field('count','Počet jedinců','number','min="1" step="1"')}${field('stage','Stadium nebo pohlaví')}
  ${select('certainty','Jistota určení',['Jisté','Pravděpodobné','Nejisté'],'Neuvedeno')}
  <label>Poznámka<textarea name="note">${html(record?.note)}</textarea></label>
  <label>Přidat fotografie<input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple></label>
  ${record?.photos?.length ? '<label><input type="checkbox" name="removePhotos"> Odebrat stávající fotografie</label>' : ''}`
  const taxonSelect = $('taxonId')
  const customField = $('recordForm').elements.customTaxon
  const toggleCustom = () => {
    const outside = taxonSelect.value === outsideOption
    $('customTaxonField').hidden = !outside
    customField.required = outside
  }
  taxonSelect.value = record?.customTaxon ? outsideOption : record?.taxonId || taxonId || ''
  taxonSelect.required = true
  taxonSelect.onchange = toggleCustom
  toggleCustom()
  $('site').value = record?.site || ''
  $('certainty').value = record?.certainty || ''
  $('editorInfo').textContent = ''
  $('recordGps').onclick = () => gps((lat,lon)=>{
    $('recordForm').elements.lat.value = lat
    $('recordForm').elements.lon.value = lon
  }, $('editorInfo'))
  $('editor').showModal()
}
export function gps(callback, status) {
  if (!navigator.geolocation) { status.textContent = 'GPS vyžaduje HTTPS a podporovaný prohlížeč.'; return }
  status.textContent = 'Zjišťuji polohu…'
  navigator.geolocation.getCurrentPosition(({coords}) => {
    status.textContent = `Poloha získána · přesnost přibližně ${Math.round(coords.accuracy)} m`
    callback(coords.latitude,coords.longitude,coords.accuracy)
  },()=>{ status.textContent = 'Poloha je nedostupná nebo nebylo uděleno oprávnění.' },{timeout:12000})
}
const photoPattern = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/i
$('recordForm').onsubmit = async event => {
  event.preventDefault()
  const form = event.currentTarget
  const submit = form.querySelector('[type=submit]')
  const e = form.elements
  const lat = e.lat.value === '' ? null : e.lat.valueAsNumber
  const lon = e.lon.value === '' ? null : e.lon.valueAsNumber
  if ((lat != null || lon != null) && !validCoordinates(lat,lon)) {
    $('editorInfo').textContent = 'Zadejte obě platné souřadnice.'
    return
  }
  const selectedTaxon = $('taxonId').value
  const outside = selectedTaxon === outsideOption
  const customTaxon = outside ? e.customTaxon.value.trim() : null
  if (outside ? !validCustomTaxon(customTaxon) : !knownTaxon(selectedTaxon)) {
    $('editorInfo').textContent = 'Vyberte taxon nebo zadejte vlastní pracovní určení.'
    return
  }
  const taxonId = outside ? null : selectedTaxon
  submit.disabled = true
  try {
    const photos = e.removePhotos?.checked ? [] : [...(editing?.photos || [])]
    for (const photo of e.photos.files) {
      if (photo.size > 15_000_000) throw new Error('Jedna fotografie může mít nejvýše 15 MB.')
      const data = await photoData(photo)
      if (!photoPattern.test(data)) throw new Error('Použijte fotografie JPEG, PNG, WebP nebo GIF.')
      photos.push(data)
    }
    await save([{id:editing?.id || crypto.randomUUID(),kind:'record',taxonId,...(outside ? {customTaxon,destinationId} : {}),date:e.date.value,site:$('site').value,location:e.location.value,lat,lon,count:e.count.value ? e.count.valueAsNumber : null,stage:e.stage.value,certainty:$('certainty').value,note:e.note.value,photos}])
    $('editor').close()
    if ($('detail').open && detailId) detail(detailId,false)
  } catch (error) { $('editorInfo').textContent = error.message || 'Záznam se nepodařilo uložit.' }
  finally { submit.disabled = false }
}
$('cancel').onclick = () => $('editor').close()
$('newRecord').onclick = () => editor()
$('detail').addEventListener('close', () => {
  const canvas = $('detailMapCanvas')
  if (canvas?._atlasMap) {
    canvas._atlasMap.remove()
    delete canvas._atlasMap
  }
})
$('licenses').onclick = () => {
  $('detailMapCanvas')?._atlasMap?.remove()
  detailId = null
  const photos = taxa.flatMap(t=>t.images.map(p=>`<li><i>${html(t.scientific_name)}</i> · ${credit(p)}</li>`))
  photos.push(...places.filter(place=>place.photo).map(place=>`<li>${html(place.name)} · ${credit(place.photo)}</li>`))
  if (destination.cover) photos.unshift(`<li>Úvodní fotografie · ${credit(destination.cover)}</li>`)
  $('detailBody').innerHTML = `<h2>Licence fotografií</h2>${photos.length ? `<ul>${photos.join('')}</ul>` : '<p>Atlas zatím neobsahuje žádné fotografie.</p>'}`
  $('detail').showModal()
}
document.addEventListener('click',run(async event => {
  const button = event.target.closest('button[data-action]')
  if (!button) return
  const {action,id} = button.dataset
  if (action === 'detail') detail(id)
  if (action === 'new') editor(id)
  if (action === 'edit') editor(null,entries.find(r=>r.id===id))
  if (action === 'delete' && confirm('Smazat toto pozorování?')) await save([], [id])
  if (action === 'map') {
    $('detail').close()
    location.hash = 'map'
    navigate()
    mapping?.choose(id)
  }
  if (action === 'quick' || action === 'favorite') {
    const key = `${action}:${id}`
    const existing = entries.some(r=>r.id===key)
    button.disabled = true
    try { await save(existing ? [] : [{id:key,taxonId:id,kind:action}],existing ? [key] : []) }
    finally { button.disabled = false }
    if ($('detail').open && detailId) detail(detailId,false)
    else [...document.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===action && b.dataset.id===id)?.focus()
  }
}))
$('backup').onclick = () => download('naturalist-zaloha.json',JSON.stringify({version:1,destination:destinationId,entries:entries.map(e=>$('includePhotos').checked ? e : {...e,photos:[]})},null,2),'application/json')
$('restore').onchange = async event => {
  const input = event.currentTarget
  try {
    if (!input.files.length) return
    const data = JSON.parse(await input.files[0].text())
    if (data.version !== 1 || data.destination !== destinationId || !Array.isArray(data.entries)) throw new Error('Záloha má jinou verzi nebo destinaci.')
    const ids = new Set()
    const restored = data.entries.map(preserveRetiredRecord).filter(entry =>
      !(['quick','favorite'].includes(entry?.kind) && retiredName(entry.taxonId))
    ).map(entry => {
      const {id,kind,taxonId,customTaxon,date,site,location,lat,lon,count,stage,certainty,note,photos=[]} = entry
      const outside = kind === 'record' && taxonId === null && validCustomTaxon(customTaxon)
      const valid = typeof id === 'string' && !ids.has(id) && (knownTaxon(taxonId) || outside) && ['record','quick','favorite'].includes(kind)
      if (!valid) throw new Error('Záloha obsahuje neplatné nebo duplicitní záznamy.')
      ids.add(id)
      if (kind !== 'record') {
        if (id !== `${kind}:${taxonId}`) throw new Error('Neplatná značka checklistu.')
        return {id,kind,taxonId}
      }
      if ([date,site,location,stage,certainty,note].some(value=>typeof value !== 'string')
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
        || ((lat != null || lon != null) && !validCoordinates(lat,lon))
        || (count != null && (!Number.isInteger(count) || count < 1))
        || !Array.isArray(photos) || !photos.every(photo=>typeof photo==='string' && photoPattern.test(photo))) throw new Error('Záloha obsahuje neplatné údaje pozorování.')
      const current = entries.find(e=>e.id===id)
      return {id,kind,taxonId,...(outside ? {customTaxon:customTaxon.trim(),destinationId} : {}),date,site,location,lat,lon,count,stage,certainty,note,photos:photos.length ? photos : current?.photos || []}
    })
    await save(restored)
    tell(`Obnoveno ${restored.length} položek. Záznamy se stejným ID byly aktualizovány.`)
  } catch (error) { tell(error.message || 'Zálohu se nepodařilo obnovit.') }
  finally { input.value = '' }
}
const columns = ['id','kind','taxonId','scientific_name','customTaxon','date','site','location','lat','lon','count','stage','certainty','note']
const exported = () => entries.filter(e=>e.kind !== 'favorite').map(e=>({...e,scientific_name:knownTaxon(e.taxonId)?.scientific_name}))
$('csv').onclick = () => {
  const cell = value => {
    let text = String(value ?? '')
    if (typeof value === 'string' && /^(\s*[=+@-]|[\t\r\n])/.test(text)) text = "'" + text
    return '"' + text.replaceAll('"','""') + '"'
  }
  download('naturalist-nalezy.csv','\uFEFF'+[columns,...exported().map(e=>columns.map(k=>e[k]))].map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8')
}
$('geojson').onclick = () => {
  const features = exported().filter(e=>validCoordinates(e.lat,e.lon)).map(({lat,lon,photos,...properties})=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties}))
  download('naturalist-nalezy.geojson',JSON.stringify({type:'FeatureCollection',features},null,2),'application/geo+json')
}

function navigate() {
  const hash = location.hash.slice(1)
  activePage = ['map','journal','stats'].includes(hash) ? hash : 'atlas'
  for (const page of ['atlas','map','journal','stats']) $(page).hidden = page !== activePage
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === '#' + activePage) a.setAttribute('aria-current','page')
    else a.removeAttribute('aria-current')
  })
  if (activePage === 'map' && !mapping) mapping = initMap({destination,taxa,places,occurrences:mapOccurrences,
    catalog:mapCatalog, catalogTaxon, records, mapyKey, gps})
  else if (activePage === 'map') mapping?.resize()
  redraw()
}

async function boot() {
  const [sourceTaxa, sites, documented, publicMap] = await Promise.all([
    load('species.json'),load('locations.json'),load('observations.geojson'),
    destination.publicObservations ? load('public-observations.geojson').catch(()=>null) : null
  ])
  places = sites
  occurrences = documented
  mapCatalog = sourceTaxa
  const points = new Map(documented.features.map(feature=>[feature.properties.observation_id,feature]))
  for (const feature of publicMap?.features || []) {
    const point = points.get(feature.properties.observation_id)
    points.set(feature.properties.observation_id, point
      ? {...feature,properties:{...feature.properties,taxon_ids:point.properties.taxon_ids}}
      : feature)
  }
  mapOccurrences = {...documented, features:[...points.values()], updated_at:publicMap?.updated_at || documented.updated_at,
    extraTaxa:publicMap?.taxa || []}
  taxa = sourceTaxa.filter(t=>!retiredName(t.id) && !t.checklist_hidden && !t.checklist_parent)
  const visible = new Set(taxa.map(t=>t.id))
  for (const t of sourceTaxa) {
    if (retiredName(t.id)) continue
    if (visible.has(t.checklist_parent)) candidatesById.set(t.id,t)
    else if (t.checklist_hidden || t.checklist_parent) retiredChecklist.set(t.id,t.scientific_name)
  }
  groups = createGroups(taxa)
  taxa.forEach(t=>taxaById.set(t.id,t))
  try {
    entries = (await readEntries()).map(preserveRetiredRecord).filter(belongsHere)
    if (destinationId === 'lanzarote' && !settings.get('legacy-migrated')) {
      const legacy = JSON.parse(settings.get('lanz-fauna-v1') || '{}')
      const migrated = taxa.filter(t=>legacy?.[t.legacy_index] && !entries.some(e=>e.id===`quick:${t.id}`)).map(t=>({id:`quick:${t.id}`,kind:'quick',taxonId:t.id}))
      if (migrated.length) await writeEntries(migrated)
      entries.push(...migrated)
      settings.set('legacy-migrated','1')
    }
  } catch (error) { idbAvailable = false; console.error(error); tell('Lokální deník se nepodařilo otevřít. Katalog je dostupný.') }
  $('destination').textContent = destination.name
  $('region').textContent = destination.region
  if (destination.cover) {
    document.querySelector('.hero').style.setProperty('--cover', `url("${new URL(destination.cover.src,document.baseURI).href}")`)
    $('heroCredit').innerHTML = link(destination.cover.source_url,'Foto ' + destination.cover.author)
  }
  $('brandDestination').textContent = destination.name
  document.title = `Catch them all: ${destination.name}`
  $('destinationSetting').hidden = Object.keys(destinations).length < 2
  $('destinationChoice').innerHTML = Object.entries(destinations).map(([id,d])=>option(id,d.name)).join('')
  $('destinationChoice').value = destinationId
  $('destinationChoice').onchange = e=>{settings.set('destination',e.target.value); location.reload()}
  $('filters').innerHTML = [
    select('habitat','Biotop',uniq(taxa.flatMap(t=>t.habitats))),
    select('endemic','Endemicita',uniq(taxa.map(t=>t.endemicity || 'Neurčeno'))),
    select('origin','Původnost',uniq(taxa.map(t=>t.origin_status || 'Neurčeno'))),
    select('chance','Obtížnost',Object.entries(difficulty)),
    select('season','Sezóna nebo měsíc doložení',[...Array.from({length:12},(_,i)=>[i+1,month(i+1)]),['?','Neurčená']]),
    select('seen','Checklist',[['yes','Pozorované'],['no','Nepozorované']]),
    select('favorite','Oblíbené',[['yes','Pouze oblíbené']]),
    select('sort','Řazení',[['name','Český název'],['group','Po taxonomických skupinách'],['chance','Šance na nález'],['count','Počet publikovaných záznamů Research Grade']],'Vědecký název')
  ].join('')
  $('sort').value = 'group'
  const categories = $('atlasCategories')
  drawCategories()
  categories.onclick = event => {
    const button = event.target.closest('button')
    if (!button) return
    if (button.hasAttribute('data-marine')) atlasMarine = !atlasMarine
    else atlasGroup = button.dataset.group
    drawCategories()
    drawAtlas()
  }
  $('filters').onchange = drawAtlas
  $('query').oninput = drawAtlas
  const layout = () => {
    const compact = settings.get('compact') === '1'
    $('cards').classList.toggle('compact',compact)
    $('layout').textContent = compact ? 'Zobrazit karty' : 'Kompaktní seznam'
  }
  $('layout').onclick = () => { settings.set('compact', $('cards').classList.contains('compact') ? '0' : '1'); layout() }
  layout()
  addEventListener('hashchange',navigate)
  navigate()
  setupOffline()
}
function setupOffline() {
  if (!('serviceWorker' in navigator)) {
    $('offline').disabled = true
    $('offline').title = 'Offline režim vyžaduje HTTPS nebo localhost.'
    return
  }
  const registration = navigator.serviceWorker.register('./sw.js')
  registration.catch(error=>{console.error(error); tell('Offline režim se nepodařilo aktivovat.')})
  $('offline').onclick = run(async () => {
    await registration
    const worker = await navigator.serviceWorker.ready
    const placePhotos = places.flatMap(place=>place.photo ? [place.photo.src] : [])
    const resources = Object.values(destinations).flatMap(d=>[...['species.json','locations.json','observations.geojson',
      ...(d.publicObservations ? ['public-observations.geojson'] : [])].map(file=>d.path+file),d.cover?.src].filter(Boolean)).concat(taxa.flatMap(t=>t.images.flatMap(p=>[p.src,p.thumb])),placePhotos)
    const channel = new MessageChannel()
    $('offline').disabled = true
    tell('Připravuji atlas pro offline použití…')
    channel.port1.onmessage = ({data}) => {
      tell(data.error ? 'Offline kopii se nepodařilo připravit.' : `Atlas je připraven offline · ${(data.bytes/1048576).toFixed(1)} MiB dat.`)
      $('offline').disabled = false
      channel.port1.close()
    }
    worker.active.postMessage({resources},[channel.port2])
  })
}
boot().catch(error=>{console.error(error); tell('Atlas se nepodařilo načíst. Spusťte jej přes HTTP nebo HTTPS a zkuste stránku obnovit.')})
