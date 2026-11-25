import { $, html, month, select, link, mapLink, credit } from './ui.js'
import { validCoordinates } from './store.js'
import { createGroups } from './groups.js'

let libraries
function loadLibraries() {
  if (libraries) return libraries
  const asset = file => new URL('../assets/vendor/' + file, import.meta.url).href
  for (const file of ['leaflet.css','markercluster.css','markercluster-default.css']) {
    document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:asset(file)}))
  }
  const script = file => new Promise((resolve,reject) => {
    const element = Object.assign(document.createElement('script'),{src:asset(file),onload:resolve,onerror:reject})
    document.head.append(element)
  })
  libraries = script('leaflet.js').then(()=>Promise.all([script('markercluster.js'),script('heat.js')]))
  return libraries
}

export function initMap({destination,taxa,places,occurrences,catalog,catalogTaxon,records,mapyKey,gps}) {
  const scope = $('mapContent')
  const key = mapyKey.trim()
  const names = new Map(catalog.map(t=>[t.id,t.scientific_name]))
  const picker = new Map(taxa.map(t=>[t.id,t.scientific_name]))
  const groups = createGroups([...taxa,...occurrences.extraTaxa.map(t=>({id:`inat:${t.id}`,taxonomy:{group:t.group}}))])
  const byInatId = new Map(catalog.filter(t=>t.inaturalist_taxon_id).map(t=>[t.inaturalist_taxon_id,t.id]))
  for (const {id,name} of occurrences.extraTaxa) picker.set(`inat:${id}`,name)
  const pointsWithTaxa = occurrences.features.map(feature=>{
    const {taxon_ids, inaturalist_taxon_id, taxon_name, ancestor_ids = []} = feature.properties
    const observedId = byInatId.get(inaturalist_taxon_id)
    if (!observedId && taxon_name && inaturalist_taxon_id) picker.set(`inat:${inaturalist_taxon_id}`,taxon_name)
    const ids = new Set(taxon_ids)
    for (const id of [...ancestor_ids,inaturalist_taxon_id]) {
      if (byInatId.has(id)) ids.add(byInatId.get(id))
      if (id != null) ids.add(`inat:${id}`)
    }
    for (const id of ids) {
      ids.add(catalogTaxon(id))
      if (names.has(id)) picker.set(id,names.get(id))
    }
    const label = taxon_name || names.get(observedId) || taxon_ids.map(id=>names.get(id)).filter(Boolean).join(', ') || 'Neurčený organismus'
    return {feature,ids,label}
  })
  const sortedTaxa = [...picker].sort((a,b)=>a[1].localeCompare(b[1],'cs'))
  let map, L, rendered, tile, logo, gpsLayer
  scope.innerHTML = `
    <div class="actions"><button id="mapGps">Moje poloha</button><label>Mapový podklad<select id="baseMap"><option value="none">Bez podkladu</option><option value="basic">Mapy.com · základní</option><option value="outdoor">Mapy.com · turistická</option></select></label>
    </div>
    <fieldset class="map-layers"><legend>Co zobrazit na mapě</legend>
    <label><input type="checkbox" id="mapPlaces" checked> Doporučené lokality</label>
    <label><input type="checkbox" id="mapPublic"> Pozorování z iNaturalistu</label>
    <label><input type="checkbox" id="mapPrivate"> Moje nálezy s polohou</label></fieldset>
    <p id="mapStatus" class="map-status" role="status"></p><div id="mapCanvas" aria-label="Interaktivní mapa pozorování"></div>
    <details id="mapFilters"><summary>Filtry pozorování</summary><div class="fields">
    <fieldset><legend>Taxony</legend><div class="taxon-picker">${sortedTaxa.map(([id,name])=>`<label><input type="checkbox" name="mapTaxon" value="${html(id)}"> <i>${html(name)}</i></label>`).join('')}</div><small>Prázdný výběr zobrazí všechny taxony.</small></fieldset>
    ${select('mapGroup','Taxonomická skupina',groups.options)}
    ${groups.marineCount ? '<label><input type="checkbox" id="mapMarine"> Mořské organismy</label>' : ''}
    <label>Od<input type="date" id="mapFrom"></label><label>Do<input type="date" id="mapTo"></label>
    ${select('mapMonth','Měsíc',Array.from({length:12},(_,i)=>[i+1,month(i+1)]))}
    <label><input type="checkbox" id="needsId"> Přidat Needs ID</label>
    <label><input type="checkbox" id="mapHeat"> Hustota záznamů</label></div></details>
    <p id="mapCount" role="status"></p><p class="legend"><span>● Research Grade</span><span>● Needs ID</span><span>● Vlastní nález</span><span>◆ Doporučená lokalita</span></p>
    <p class="muted" id="mapDataNote" hidden>Mapa používá místní výřez veřejných záznamů z iNaturalistu s otevřenou licencí. Výběr zahrnuje i organismy mimo checklist. Hustota bodů odráží také aktivitu pozorovatelů.</p>
    <h3>Doporučené lokality</h3><div class="location-cards">${places.map(site=>`<article class="panel location-card">
    ${site.photo ? `<figure class="location-photo"><img src="${html(site.photo.src)}" alt="${html(site.photo.alt || site.name)}" loading="lazy" decoding="async"><figcaption>${credit(site.photo)}</figcaption></figure>` : ''}
    <h4>${html(site.name)}</h4><p>${html(site.description)}</p><p>${html(site.habitats.join(' · '))}</p><p>${html(site.taxa.map(id=>names.get(id)).filter(Boolean).join(' · '))}</p><p>${html([site.season,site.restrictions].filter(Boolean).join(' '))}</p>
    <div class="actions"><button type="button" data-site="${html(site.id)}">Zaměřit na mapě</button>${link(mapLink(...site.coordinates),'Otevřít na Mapy.com')}${site.sources.map(s=>link(s.url,s.label)).join(' ')}</div></article>`).join('') || '<p>Pro tuto destinaci nejsou k dispozici doporučené lokality.</p>'}</div>`
  const status = message => { $('mapStatus').textContent = message }
  $('baseMap').value = key ? 'basic' : 'none'
  $('baseMap').disabled = !key

  function setTiles() {
    if (!map) return
    tile?.remove()
    logo?.remove()
    tile = logo = null
    const layer = $('baseMap').value
    if (layer === 'none' || !key) {
      status(!key ? 'Podklad Mapy.com vyžaduje API klíč v config/destinations.js. Body a lokality jsou dostupné i bez podkladu.' : 'Mapa zobrazuje body bez mapového podkladu.')
      return
    }
    status('')
    tile = L.tileLayer(`https://api.mapy.com/v1/maptiles/${layer}/256/{z}/{x}/{y}?lang=cs&apikey=${encodeURIComponent(key)}`,{
      maxZoom:19,attribution:'<a href="https://api.mapy.com/copyright" target="_blank" rel="noopener">© Seznam.cz a.s. a další</a>'
    }).on('tileerror',()=>status('Podklad Mapy.com je nedostupný. Zkontrolujte připojení, oprávnění klíče a kredity.')).addTo(map)
    logo = L.control({position:'bottomleft'})
    logo.onAdd = () => {
      const node = L.DomUtil.create('div','map-logo')
      node.innerHTML = '<a href="https://mapy.com/" target="_blank" rel="noopener"><img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com"></a>'
      return node
    }
    logo.addTo(map)
  }
  function refresh() {
    const selected = new Set([...scope.querySelectorAll('input[name=mapTaxon]:checked')].map(c=>c.value))
    const group = $('mapGroup').value
    const marine = $('mapMarine')?.checked
    const groupMatches = id => groups.matches(catalogTaxon(id),group,marine)
    const dateMatches = date => {
      const from = $('mapFrom').value, to = $('mapTo').value, m = Number($('mapMonth').value)
      return (!from || (date && date >= from)) && (!to || (date && date <= to)) && (!m || Number(date?.slice(5,7)) === m)
    }
    const showPublic = $('mapPublic').checked
    $('mapDataNote').hidden = !showPublic
    const list = showPublic ? pointsWithTaxa.filter(({feature:{properties:p},ids})=>
      (!selected.size || [...selected].some(id=>ids.has(id)))
      && ((!group && !marine) || [...ids].some(groupMatches))
      && (p.quality_grade === 'research' || ($('needsId').checked && p.quality_grade === 'needs_id')) && dateMatches(p.observed_on)) : []
    const own = $('mapPrivate').checked ? records().filter(r=>r.taxonId && validCoordinates(r.lat,r.lon)
      && (!selected.size || selected.has(r.taxonId) || selected.has(catalogTaxon(r.taxonId)))
      && groupMatches(r.taxonId) && dateMatches(r.date?.slice(0,10))) : []
    $('mapCount').textContent = `${list.length} veřejných a ${own.length} vlastních záznamů · ${occurrences.updated_at ? 'aktualizace ' + new Date(occurrences.updated_at).toLocaleDateString('cs') : 'datum aktualizace neuvedeno'}`
    if (!map) return
    rendered?.remove()
    rendered = L.layerGroup().addTo(map)
    const points = []
    const cluster = L.markerClusterGroup({chunkedLoading:true,showCoverageOnHover:false})
    for (const {feature:{geometry,properties:p},label} of list) {
      const [lon,lat] = geometry.coordinates
      const location = [lat,lon]
      points.push(location)
      const color = p.quality_grade === 'research' ? '#19775f' : '#b26419'
      const icon = L.divIcon({className:'occurrence-marker',html:`<span style="background:${color}"></span>`,iconSize:[16,16],iconAnchor:[8,8]})
      const popup = `<strong><i>${html(label)}</i></strong><p>${html(p.observed_on || 'Datum neuvedeno')} · ${html(p.quality_grade === 'research' ? 'Research Grade' : 'Needs ID')}<br>${p.accuracy == null ? 'Přesnost neuvedena' : html(p.accuracy) + ' m'}<br>${html(p.observer)} · ${html(p.license.toUpperCase())}</p>${link(p.url,'Otevřít na iNaturalistu')} · ${link(mapLink(lat,lon),'Mapy.com')}`
      cluster.addLayer(L.marker(location,{icon,title:label,alt:label}).bindPopup(popup))
    }
    if ($('mapHeat').checked && points.length) L.heatLayer(points,{radius:23,blur:17}).addTo(rendered)
    rendered.addLayer(cluster)
    for (const r of own) {
      L.circleMarker([r.lat,r.lon],{color:'#246bb0',fillOpacity:.85,radius:7}).bindPopup(
        `<strong><i>${html(r.customTaxon || names.get(r.taxonId))}</i></strong><p>${html(r.date)} · ${html(r.location)}</p>`).addTo(rendered)
    }
    if ($('mapPlaces').checked) for (const site of places) {
      const icon = L.divIcon({className:'site-marker',html:'◆',iconSize:[22,22],iconAnchor:[11,11]})
      L.marker(site.coordinates,{icon,title:site.name,alt:site.name}).bindPopup(
        `<strong>${html(site.name)}</strong><p>${html(site.description)}</p>${link(mapLink(...site.coordinates),'Otevřít na Mapy.com')}`).addTo(rendered)
    }
  }
  $('baseMap').onchange = setTiles
  $('mapGps').onclick = () => gps((lat,lon,accuracy)=>{
    if (!map) return
    gpsLayer?.remove()
    gpsLayer = L.circle([lat,lon],{radius:accuracy,color:'#246bb0'}).addTo(map)
    map.setView([lat,lon],16)
  },$('mapStatus'))
  $('mapFilters').onchange = refresh
  scope.querySelector('.map-layers').onchange = refresh
  scope.onclick = event => {
    const id = event.target.closest('[data-site]')?.dataset.site
    const site = places.find(p=>p.id===id)
    if (site && map) {
      map.setView(site.coordinates,14)
      $('mapCanvas').scrollIntoView({block:'nearest'})
    }
  }
  loadLibraries().then(()=>{
    L = globalThis.L
    map = L.map('mapCanvas',{maxZoom:19,minZoom:2,zoomAnimation:false}).setView(destination.center,destination.zoom)
    setTiles()
    refresh()
  }).catch(()=>status('Mapové knihovny se nepodařilo načíst. Doporučené lokality a odkazy jsou dostupné níže.'))
  return {refresh,resize:()=>requestAnimationFrame(()=>map?.invalidateSize()),choose(id){
    scope.querySelectorAll('input[name=mapTaxon]').forEach(box=>{box.checked=box.value===id})
    $('mapGroup').value = ''
    if ($('mapMarine')) $('mapMarine').checked = false
    $('mapPublic').checked = true
    refresh()
  }}
}

export async function drawTaxonMap(container, destination, features) {
  if (container._atlasMap) {
    container._atlasMap.invalidateSize()
    return
  }
  try {
    await loadLibraries()
    if (!container.isConnected || !container.offsetWidth || container._atlasMap) return
    const L = globalThis.L
    const map = L.map(container,{maxZoom:17,scrollWheelZoom:false,zoomAnimation:false}).setView(destination.center,destination.zoom)
    container._atlasMap = map
    const layer = L.featureGroup().addTo(map)
    for (const {geometry,properties} of features) {
      const [lon,lat] = geometry.coordinates
      L.circleMarker([lat,lon],{radius:5,color:'#23634e',fillOpacity:.8}).bindPopup(
        `${html(properties.observed_on || 'Datum neuvedeno')} · ${link(properties.url,'iNaturalist')} · ${link(mapLink(lat,lon),'Mapy.com')}`
      ).addTo(layer)
    }
    map.fitBounds(layer.getBounds(),{padding:[16,16],maxZoom:13,animate:false})
  } catch {
    container.textContent = 'Mapu se nepodařilo načíst.'
  }
}
