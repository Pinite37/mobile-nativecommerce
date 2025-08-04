// Données des villes et quartiers du Bénin
export const beninCities = [
  { id: 1, name: "Cotonou" },
  { id: 2, name: "Porto-Novo" },
  { id: 3, name: "Parakou" },
  { id: 4, name: "Abomey-Calavi" },
  { id: 5, name: "Bohicon" },
  { id: 6, name: "Natitingou" },
  { id: 7, name: "Ouidah" },
  { id: 8, name: "Djougou" },
];

export const neighborhoodsByCity: { [key: string]: string[] } = {
  "Cotonou": [
    "Akpakpa", "Cadjehoun", "Fidjrossè", "Gbégamey", "Houéyiho", 
    "Jéricho", "Menontin", "Patte d'Oie", "Ste Rita", "Vedoko", "Zongo"
  ],
  "Porto-Novo": [
    "Adjarra", "Adjohoun", "Aguégué", "Akpro-Missérété", "Avrankou", "Dangbo"
  ],
  "Parakou": [
    "Albarika", "Banikanni", "Ladjifarani", "Titirou", "Zongo"
  ],
  "Abomey-Calavi": [
    "Akassato", "Arconville", "Godomey", "Tankpè", "Togoudo", "Zinvié"
  ],
  "Bohicon": [
    "Agongointo", "Avogbanna", "Lissèzoun", "Ouassaho", "Passagon", "Sodohomè"
  ],
  "Natitingou": [
    "Boriyouré", "Kouaba", "Péporiyakou", "Takonta", "Yarikou"
  ],
  "Ouidah": [
    "Avlékété", "Djègbadji", "Houakpè", "Pahou", "Savi"
  ],
  "Djougou": [
    "Bariénou", "Bougou", "Kolokondé", "Partago", "Sérou"
  ],
};

// Helper function to get districts for a city
export const getDistrictsForCity = (cityName: string): string[] => {
  return neighborhoodsByCity[cityName] || [];
};

// Helper function to get all city names
export const getAllCityNames = (): string[] => {
  return beninCities.map(city => city.name);
};
