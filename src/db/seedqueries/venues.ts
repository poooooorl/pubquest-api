interface Venue {
  name: string;
  category: "PUB" | "BAR" | "CLUB" | "PARK";
  lat: number;
  lng: number;
}

export const defaultVenues: Venue[] = [
  // Central London Classics
  { name: "The Rusty Spoon", category: "PUB", lat: 51.5165, lng: -0.134 },
  { name: "The Golden Lion", category: "PUB", lat: 51.5135, lng: -0.136 },
  { name: "The Kings Head", category: "PUB", lat: 51.512, lng: -0.14 },
  { name: "The Red Lion", category: "PUB", lat: 51.508, lng: -0.13 },
  { name: "The White Hart", category: "PUB", lat: 51.511, lng: -0.125 },
  { name: "The Crown", category: "PUB", lat: 51.515, lng: -0.132 },
  { name: "The Royal Oak", category: "PUB", lat: 51.52, lng: -0.15 },
  { name: "The Plough", category: "PUB", lat: 51.518, lng: -0.12 },
  { name: "The Prince of Wales", category: "PUB", lat: 51.513, lng: -0.128 },
  { name: "The Black Horse", category: "PUB", lat: 51.519, lng: -0.135 },
  {
    name: "Ye Olde Cheshire Cheese",
    category: "PUB",
    lat: 51.5142,
    lng: -0.1086,
  },
  { name: "The Grapes", category: "PUB", lat: 51.508, lng: -0.04 },
  { name: "The Lamb & Flag", category: "PUB", lat: 51.5115, lng: -0.126 },
  { name: "The French House", category: "BAR", lat: 51.513, lng: -0.131 },
  { name: "Gordons Wine Bar", category: "BAR", lat: 51.5085, lng: -0.124 },
  { name: "The Harp", category: "PUB", lat: 51.5095, lng: -0.127 },
  { name: "The Nags Head", category: "PUB", lat: 51.5125, lng: -0.125 },
  { name: "The Chandos", category: "PUB", lat: 51.509, lng: -0.128 },
  { name: "The Porterhouse", category: "PUB", lat: 51.511, lng: -0.122 },
  { name: "The Craft Beer Co.", category: "PUB", lat: 51.517, lng: -0.138 },

  // Covent Garden & West End
  { name: "The Salisbury", category: "PUB", lat: 51.5109, lng: -0.1267 },
  { name: "The Coal Hole", category: "PUB", lat: 51.5105, lng: -0.1201 },
  { name: "The Opera Tavern", category: "BAR", lat: 51.5125, lng: -0.128 },
  { name: "The Maple Leaf", category: "PUB", lat: 51.514, lng: -0.1295 },
  { name: "The Cross Keys", category: "PUB", lat: 51.5118, lng: -0.1255 },

  // Shoreditch & East London
  { name: "The Old Blue Last", category: "PUB", lat: 51.5254, lng: -0.0784 },
  { name: "The Book Club", category: "BAR", lat: 51.5248, lng: -0.0763 },
  { name: "Callooh Callay", category: "BAR", lat: 51.5242, lng: -0.0799 },
  { name: "The Owl and Pussycat", category: "PUB", lat: 51.526, lng: -0.0755 },
  { name: "The Queen of Hoxton", category: "BAR", lat: 51.5267, lng: -0.0818 },
  { name: "The Nightjar", category: "BAR", lat: 51.5245, lng: -0.088 },
  { name: "Happiness Forgets", category: "BAR", lat: 51.5255, lng: -0.082 },
  { name: "The Griffin", category: "PUB", lat: 51.5272, lng: -0.0843 },
  { name: "The Strongroom Bar", category: "BAR", lat: 51.5238, lng: -0.0795 },
  { name: "The George & Dragon", category: "PUB", lat: 51.5251, lng: -0.0768 },

  // Camden & North London
  { name: "The Lock Tavern", category: "PUB", lat: 51.5426, lng: -0.1441 },
  { name: "The Dublin Castle", category: "PUB", lat: 51.5395, lng: -0.1389 },
  { name: "The World's End", category: "PUB", lat: 51.5415, lng: -0.1416 },
  { name: "The Black Cap", category: "PUB", lat: 51.544, lng: -0.1405 },
  { name: "The Colonel Fawcett", category: "PUB", lat: 51.5418, lng: -0.1382 },
  { name: "The Southampton Arms", category: "PUB", lat: 51.556, lng: -0.1445 },
  { name: "The Stag", category: "PUB", lat: 51.5408, lng: -0.1398 },
  { name: "The Prince Albert", category: "PUB", lat: 51.5422, lng: -0.1425 },
  { name: "Bubala King's Cross", category: "BAR", lat: 51.539, lng: -0.1246 },

  // Soho & Fitzrovia
  { name: "The Toucan", category: "PUB", lat: 51.5138, lng: -0.133 },
  { name: "The Coach & Horses", category: "PUB", lat: 51.5134, lng: -0.1316 },
  { name: "The Dog & Duck", category: "PUB", lat: 51.514, lng: -0.1325 },
  { name: "The Sun & 13 Cantons", category: "PUB", lat: 51.5148, lng: -0.1344 },
  { name: "The Newman Arms", category: "PUB", lat: 51.518, lng: -0.1368 },
  { name: "The Carpenter's Arms", category: "PUB", lat: 51.5172, lng: -0.1352 },
  { name: "Bradley's Spanish Bar", category: "BAR", lat: 51.5162, lng: -0.138 },
  {
    name: "Experimental Cocktail Club",
    category: "BAR",
    lat: 51.5145,
    lng: -0.1338,
  },
  { name: "Swift", category: "BAR", lat: 51.5135, lng: -0.1342 },

  // South Bank & Borough
  { name: "The George Inn", category: "PUB", lat: 51.5052, lng: -0.0909 },
  { name: "The Anchor Bankside", category: "PUB", lat: 51.5065, lng: -0.095 },
  { name: "The Market Porter", category: "PUB", lat: 51.5048, lng: -0.0915 },
  { name: "The Globe Tavern", category: "PUB", lat: 51.5055, lng: -0.0922 },
  { name: "The Rake", category: "BAR", lat: 51.505, lng: -0.0908 },
  { name: "The Wheatsheaf", category: "PUB", lat: 51.506, lng: -0.093 },

  // Clerkenwell & Farringdon
  { name: "The Jerusalem Tavern", category: "PUB", lat: 51.5222, lng: -0.1025 },
  { name: "The Three Kings", category: "PUB", lat: 51.5228, lng: -0.104 },
  { name: "The Fox & Anchor", category: "PUB", lat: 51.5212, lng: -0.1008 },
  { name: "The Slaughtered Lamb", category: "PUB", lat: 51.5235, lng: -0.1058 },
  { name: "The Betsey Trotwood", category: "PUB", lat: 51.524, lng: -0.1075 },
  { name: "Ye Olde Mitre", category: "PUB", lat: 51.5185, lng: -0.1095 },
  { name: "The Bull", category: "PUB", lat: 51.5218, lng: -0.1048 },

  // Notting Hill & Westbourne Grove
  { name: "The Churchill Arms", category: "PUB", lat: 51.5065, lng: -0.1945 },
  { name: "The Portobello Star", category: "PUB", lat: 51.5142, lng: -0.1985 },
  { name: "The Westbourne", category: "PUB", lat: 51.5158, lng: -0.192 },
  { name: "The Windsor Castle", category: "PUB", lat: 51.5078, lng: -0.1952 },
  { name: "The Elgin", category: "PUB", lat: 51.5148, lng: -0.1968 },

  // Mayfair & St James's
  { name: "The Red Lion", category: "PUB", lat: 51.5082, lng: -0.1365 },
  { name: "The Punch Bowl", category: "PUB", lat: 51.5088, lng: -0.1485 },
  { name: "The Guinea", category: "PUB", lat: 51.5092, lng: -0.1512 },
  { name: "The Audley", category: "PUB", lat: 51.5105, lng: -0.1535 },
  { name: "The Running Horse", category: "PUB", lat: 51.5075, lng: -0.1425 },
  {
    name: "The Duke of Wellington",
    category: "PUB",
    lat: 51.5068,
    lng: -0.1398,
  },

  // Bloomsbury & Holborn
  { name: "The Champion", category: "PUB", lat: 51.5228, lng: -0.1188 },
  { name: "The Princess Louise", category: "PUB", lat: 51.5195, lng: -0.1205 },
  { name: "The Cittie of Yorke", category: "PUB", lat: 51.5178, lng: -0.1185 },
  { name: "The Seven Stars", category: "PUB", lat: 51.515, lng: -0.1168 },
  { name: "The Museum Tavern", category: "PUB", lat: 51.5188, lng: -0.1278 },
  { name: "The Duke", category: "PUB", lat: 51.5218, lng: -0.1198 },

  // Clapham & South West
  { name: "The Falcon", category: "PUB", lat: 51.4638, lng: -0.1382 },
  { name: "The Windmill", category: "PUB", lat: 51.4642, lng: -0.1408 },
  { name: "The Alexandra", category: "PUB", lat: 51.4655, lng: -0.1425 },
  { name: "The Belle Vue", category: "PUB", lat: 51.4648, lng: -0.1398 },
  { name: "The Bread & Roses", category: "PUB", lat: 51.466, lng: -0.1445 },

  // Marylebone & Paddington
  { name: "The Globe", category: "PUB", lat: 51.5218, lng: -0.1582 },
  { name: "The Prince Regent", category: "PUB", lat: 51.5228, lng: -0.1605 },
  { name: "The Victoria", category: "PUB", lat: 51.5182, lng: -0.1625 },
  { name: "The Beehive", category: "PUB", lat: 51.5195, lng: -0.1645 },

  // Hackney & Dalston
  { name: "The Haggerston", category: "PUB", lat: 51.5402, lng: -0.0705 },
  { name: "The Chesham Arms", category: "PUB", lat: 51.5418, lng: -0.0685 },
  { name: "The Pembury Tavern", category: "PUB", lat: 51.5432, lng: -0.0728 },
  { name: "The Prince George", category: "PUB", lat: 51.5445, lng: -0.0748 },
  { name: "The Cock Tavern", category: "PUB", lat: 51.5425, lng: -0.0695 },
];

export const generateVenuesSeedQuery = () => `
  INSERT INTO venues (name, category, location) VALUES 
  ${defaultVenues
    .map(
      (venue) =>
        `('${venue.name.replace(/'/g, "''")}', '${venue.category}', ST_SetSRID(ST_MakePoint(${venue.lng}, ${venue.lat}), 4326))`,
    )
    .join(",\n  ")}
  RETURNING id, name
`;

export async function seedVenues(client: any) {
  const venuesRes = await client.query(generateVenuesSeedQuery());
  console.log(
    `✅ Created Venues: ${venuesRes.rows.length} (First ID: ${venuesRes.rows[0].id})`,
  );
  return venuesRes.rows;
}
