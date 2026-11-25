// Checklist categories are a browsing hierarchy. Each taxon has one terminal category.
const group = (id, label, {source = label, children = [], tone, marine = false} = {}) =>
  ({id, label, source, children, tone, marine})

const tree = [
  group('fish','Ryby',{marine:true,tone:'water'}),
  group('amphibians','Obojživelníci',{tone:'water'}),
  group('mammals','Savci',{tone:'cliff'}),
  group('reptiles','Plazi',{tone:'cliff',children:[
    group('lizards','Ještěři',{source:null}),
    group('sea-turtles','Mořské želvy',{source:null,marine:true}),
    group('other-reptiles','Ostatní plazi',{source:'Plazi'})
  ]}),
  group('birds','Ptáci',{tone:'cliff',children:[
    group('passerines','Pěvci'),
    group('raptors','Dravci'),
    group('owls','Sovy'),
    group('other-birds','Ostatní ptáci',{source:'Ptáci'})
  ]}),
  group('arthropods','Členovci',{tone:'earth',children:[
    group('arachnids','Pavoukovci'),
    group('crustaceans','Korýši'),
    group('insects','Hmyz',{tone:'insect',children:[
      group('beetles','Brouci'),
      group('orthopterans','Rovnokřídlí'),
      group('mantises','Kudlanky'),
      group('butterflies','Denní motýli'),
      group('hymenopterans','Blanokřídlí',{children:[
        group('bees','Včely'),
        group('other-hymenopterans','Ostatní blanokřídlí',{source:'Blanokřídlí'})
      ]}),
      group('flies','Dvoukřídlí',{children:[
        group('hoverflies','Pestřenky'),
        group('other-flies','Ostatní dvoukřídlí',{source:'Dvoukřídlí'})
      ]}),
      group('other-insects','Ostatní hmyz',{source:'Hmyz'})
    ]}),
    group('other-arthropods','Ostatní členovci',{source:'Členovci'})
  ]}),
  group('molluscs','Měkkýši',{tone:'earth',children:[
    group('land-molluscs','Suchozemští měkkýši'),
    group('marine-molluscs','Mořští měkkýši',{marine:true,tone:'water'}),
    group('other-molluscs','Ostatní měkkýši',{source:'Měkkýši'})
  ]}),
  group('echinoderms','Ostnokožci',{marine:true,tone:'water'}),
  group('annelids','Kroužkovci',{tone:'earth'}),
  group('cnidarians','Žahavci',{tone:'water'}),
  group('plants','Rostliny',{tone:'leaf'})
]

export function createGroups(taxa) {
  const nodes = new Map()
  const bySource = new Map()
  const paths = new Map()
  const collator = new Intl.Collator('cs')

  function add(definition, parent = null) {
    const node = {...definition, parent, tone:definition.tone || parent?.tone, children:[]}
    nodes.set(node.id,node)
    if (node.source && !definition.children.length) bySource.set(node.source,node)
    node.children = definition.children.map(child => add(child,node))
    return node
  }
  const roots = tree.map(definition => add(definition))
  const fallback = []

  for (const taxon of taxa) {
    let leaf = nodes.get(taxon.checklist_group)
    if (leaf?.children.length || !leaf) leaf = bySource.get(taxon.taxonomy.group)
    if (!leaf) {
      leaf = add(group('custom:' + taxon.taxonomy.group,taxon.taxonomy.group))
      fallback.push(leaf)
    }
    const path = []
    for (let node = leaf; node; node = node.parent) path.unshift(node)
    paths.set(taxon.id,path)
  }
  roots.splice(roots.length - 1,0,...fallback.sort((a,b) => collator.compare(a.label,b.label)))

  const path = id => paths.get(id) || []
  const marineIds = new Set(taxa.filter(taxon => taxon.marine ?? path(taxon.id).at(-1).marine).map(taxon => taxon.id))
  const members = list => {
    const index = new Map()
    for (const {id} of list) {
      for (const node of path(id)) {
        if (!index.has(node.id)) index.set(node.id,[])
        index.get(node.id).push(id)
      }
    }
    return index
  }
  const catalog = members(taxa)
  const populated = nodes => nodes.filter(node => catalog.has(node.id))
  const options = (nodes, depth = 0) => populated(nodes).flatMap(node => [
    [node.id,'　'.repeat(depth) + node.label],
    ...options(node.children,depth + 1)
  ])

  return {
    roots:populated(roots),
    children:node => populated(node.children),
    node:id => nodes.get(id),
    options:options(roots),
    path,
    members,
    count:id => catalog.get(id)?.length || 0,
    marineCount:marineIds.size,
    matches:(taxonId, groupId, marine) =>
      (!groupId || path(taxonId).some(node => node.id === groupId)) && (!marine || marineIds.has(taxonId))
  }
}
