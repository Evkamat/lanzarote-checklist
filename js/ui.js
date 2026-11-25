export const $ = id => document.getElementById(id)
export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const norm = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export const uniq = values => [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b,'cs'))
export const option = (value, label = value) => `<option value="${html(value)}">${html(label)}</option>`
export const select = (id, title, values, empty = 'Vše') => `<label>${title}<select id="${id}">${option('',empty)}${values.map(value => Array.isArray(value) ? option(...value) : option(value)).join('')}</select></label>`
export const month = n => new Intl.DateTimeFormat('cs',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2020,n-1,1)))
export const difficulty = {1:'Dobrá šance',2:'Cílené hledání',3:'Obtížný nález'}
export const link = (url, label) => /^https:\/\//i.test(url || '') ? `<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)}</a>` : ''
export const mapLink = (lat,lon) => `https://mapy.com/zakladni?x=${lon}&y=${lat}&z=16&source=coor&id=${lon}%2C${lat}`
export const image = (taxon, thumb = true) => taxon.images[0] ? `<img class="photo" loading="lazy" decoding="async" src="${html(taxon.images[0][thumb ? 'thumb' : 'src'])}" alt="${html(taxon.images[0].depicted_name || taxon.scientific_name)}">` : `<div class="no-photo"><span aria-hidden="true">✳</span><small>${taxon.photo_links?.length ? 'Fotografie v externím zdroji' : 'Fotografie není dostupná'}</small></div>`
export const credit = photo => [html(photo.depicted_name),html(photo.identification_note),html(photo.author),link(photo.license_url, photo.license),link(photo.source_url, photo.source),link(photo.original_url,'Původní snímek'),html(photo.location_note),html(photo.modifications),html(photo.form)].filter(Boolean).join(' · ')
