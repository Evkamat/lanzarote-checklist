const VERSION = 'naturalist-v17'
const scope = new URL('./', self.location)
const base = [
  './','./index.html','./manifest.webmanifest','./css/style.css',
  './js/app.js','./js/store.js','./js/ui.js','./js/groups.js','./js/map.js','./config/destinations.js','./config/offline-destinations.json',
  './assets/icons/atlas.svg','./assets/icons/atlas-192.png','./assets/icons/atlas-512.png',
  './assets/vendor/leaflet.js','./assets/vendor/leaflet.css','./assets/vendor/markercluster.js',
  './assets/vendor/markercluster.css','./assets/vendor/markercluster-default.css','./assets/vendor/heat.js',
  './assets/vendor/images/layers.png','./assets/vendor/images/layers-2x.png','./assets/vendor/images/marker-icon.png',
  './assets/vendor/images/marker-icon-2x.png','./assets/vendor/images/marker-shadow.png'
]
const scoped = url => url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
async function prepare(resources) {
  const cache = await caches.open(VERSION)
  const urls = [...new Set([...base,...resources].map(file => new URL(file,scope).href))]
  let bytes = 0
  for (let i=0;i<urls.length;i+=10) {
    const sizes = await Promise.all(urls.slice(i,i+10).map(async url => {
      const response = await cache.match(url) || await fetch(url)
      if (!response.ok) throw new Error(url)
      const size = (await response.clone().blob()).size
      await cache.put(url,response)
      return size
    }))
    bytes += sizes.reduce((sum,size)=>sum+size,0)
  }
  return bytes
}
async function install() {
  const cache = await caches.open(VERSION)
  await cache.addAll(base)
  for (const d of await (await fetch("./config/offline-destinations.json")).json()) {
    const files = ['species.json','locations.json','observations.geojson',...(d.publicObservations ? ['public-observations.geojson'] : [])].map(file=>d.path+file)
    await cache.addAll(files)
    const taxa = await (await cache.match(files[0])).json()
    const places = await (await cache.match(files[1])).json()
    await prepare([d.cover,...places.map(place=>place.photo?.src),...taxa.flatMap(t=>t.images.flatMap(p=>[p.src,p.thumb]))].filter(Boolean))
  }
}
self.addEventListener('install',event=>event.waitUntil(install()))
self.addEventListener('activate', event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(key=>key.startsWith('naturalist-') && key !== VERSION).map(key=>caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('fetch',event=>{
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || !scoped(url)) return
  event.respondWith((async()=>{
    const cache = await caches.open(VERSION)
    const cached = await cache.match(request)
    if (request.mode === 'navigate') {
      try { return await fetch(request) }
      catch { return cached || await cache.match(new URL('./index.html',scope)) }
    }
    const isConfig = url.pathname === scope.pathname+'config/destinations.js'
    if (isConfig || url.pathname.startsWith(scope.pathname+'data/')) {
      try {
        const response = await fetch(request,isConfig ? {cache:'no-cache'} : undefined)
        if (response.ok) { await cache.put(request,response.clone()); return response }
        return cached || response
      } catch (error) { if (cached) return cached; throw error }
    }
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok && url.pathname.startsWith(scope.pathname+'assets/images/')) await cache.put(request,response.clone())
    return response
  })())
})
self.addEventListener('message',event=>{
  const port = event.ports[0]
  const resources = event.data?.resources
  if (!port || !Array.isArray(resources) || !resources.every(file=>typeof file==='string' && scoped(new URL(file,scope)))) return
  event.waitUntil(prepare(resources).then(bytes=>port.postMessage({bytes}),()=>port.postMessage({error:true})))
})
