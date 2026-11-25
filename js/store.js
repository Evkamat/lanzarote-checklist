const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('naturalist', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export async function readEntries() {
  const db = await database
  return new Promise((resolve, reject) => {
    const request = db.transaction('entries').objectStore('entries').getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function writeEntries(entries, removals = []) {
  const db = await database
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite')
    const store = transaction.objectStore('entries')
    removals.forEach(id => store.delete(id))
    entries.forEach(entry => store.put(entry))
    transaction.oncomplete = resolve
    transaction.onabort = () => reject(transaction.error)
  })
}

export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function photoData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function validCoordinates(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}
