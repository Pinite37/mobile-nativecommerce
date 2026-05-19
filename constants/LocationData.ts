// Données des villes et quartiers du Bénin
export const beninCities = [
  // Grandes villes
  { id: 1,  name: "Cotonou" },
  { id: 2,  name: "Porto-Novo" },
  { id: 3,  name: "Parakou" },
  { id: 4,  name: "Abomey-Calavi" },
  { id: 5,  name: "Bohicon" },
  { id: 6,  name: "Natitingou" },
  { id: 7,  name: "Ouidah" },
  { id: 8,  name: "Djougou" },
  // Autres communes
  { id: 9,  name: "Abomey" },
  { id: 10, name: "Adja-Ouèrè" },
  { id: 11, name: "Adjarra" },
  { id: 12, name: "Adjohoun" },
  { id: 13, name: "Agbangnizoun" },
  { id: 14, name: "Aguégués" },
  { id: 15, name: "Akpro-Missérété" },
  { id: 16, name: "Allada" },
  { id: 17, name: "Aplahoué" },
  { id: 18, name: "Athiémé" },
  { id: 19, name: "Avrankou" },
  { id: 20, name: "Banikoara" },
  { id: 21, name: "Bantè" },
  { id: 22, name: "Bassila" },
  { id: 23, name: "Bembèrèkè" },
  { id: 24, name: "Bonou" },
  { id: 25, name: "Bopa" },
  { id: 26, name: "Boukoumbé" },
  { id: 27, name: "Cobly" },
  { id: 28, name: "Comè" },
  { id: 29, name: "Copargo" },
  { id: 30, name: "Covè" },
  { id: 31, name: "Dangbo" },
  { id: 32, name: "Dassa-Zoumé" },
  { id: 33, name: "Djidja" },
  { id: 34, name: "Djakotomey" },
  { id: 35, name: "Dogbo" },
  { id: 36, name: "Glazoué" },
  { id: 37, name: "Gogounou" },
  { id: 38, name: "Grand-Popo" },
  { id: 39, name: "Houéyogbé" },
  { id: 40, name: "Ifangni" },
  { id: 41, name: "Kalalé" },
  { id: 42, name: "Kandi" },
  { id: 43, name: "Karimama" },
  { id: 44, name: "Kérou" },
  { id: 45, name: "Kétou" },
  { id: 46, name: "Klouékanmè" },
  { id: 47, name: "Kouandé" },
  { id: 48, name: "Kpomassè" },
  { id: 49, name: "Lalo" },
  { id: 50, name: "Lokossa" },
  { id: 51, name: "Malanville" },
  { id: 52, name: "Matéri" },
  { id: 53, name: "Misérété" },
  { id: 54, name: "N'Dali" },
  { id: 55, name: "Nikki" },
  { id: 56, name: "Ouaké" },
  { id: 57, name: "Ouèssè" },
  { id: 58, name: "Ouinhi" },
  { id: 59, name: "Péhunco" },
  { id: 60, name: "Pèrèrè" },
  { id: 61, name: "Pobè" },
  { id: 62, name: "Sakété" },
  { id: 63, name: "Savalou" },
  { id: 64, name: "Savè" },
  { id: 65, name: "Ségbana" },
  { id: 66, name: "Sèmè-Kpodji" },
  { id: 67, name: "Sinendé" },
  { id: 68, name: "So-Ava" },
  { id: 69, name: "Tanguiéta" },
  { id: 70, name: "Tchaourou" },
  { id: 71, name: "Toffo" },
  { id: 72, name: "Tori-Bossito" },
  { id: 73, name: "Toukountouna" },
  { id: 74, name: "Toviklin" },
  { id: 75, name: "Zagnanado" },
  { id: 76, name: "Za-Kpota" },
  { id: 77, name: "Zè" },
  { id: 78, name: "Zogbodomey" },
];

export const neighborhoodsByCity: { [key: string]: string[] } = {
  // ── Littoral ─────────────────────────────────────────────────────────────────
  "Cotonou": [
    "Akpakpa", "Agla", "Cadjèhoun", "Fidjrossè", "Gbèdjromèdji", "Xwlacodji",
    "Zogbo", "Sainte-Rita", "Gbégamey", "Haie-Vive", "Mènontin", "Sikècodji",
    "Vèdoko", "Aïdjèdo", "Kindonou", "Dantokpa", "Ladji", "Fifadji",
    "Houénoussou", "Ekpé", "Sènadé", "Kpondéhou", "Avotrou", "Djègan-Kpèvi",
    "Togoudo", "Godomey", "Ahouansori", "Kpota", "Midombo", "Dékanmè",
    "Gbesuké", "Zogbohouè", "Wologuèdè",
  ],

  // ── Ouémé ─────────────────────────────────────────────────────────────────────
  "Porto-Novo": [
    "Ouando", "Tokpota", "Avoti", "Gbégbè", "Hounli", "Massi",
    "Ahouannonzoun", "Djassin", "Ekpè", "Agbokou", "Aglogbè", "Agbado",
    "Houinmè", "Dowa", "Samiondji", "Gbècon", "Yénawa", "Tonoussa",
    "Kodji", "Vodjè", "Dèkoungbé", "Attaké",
  ],
  "Adjarra": ["Agbokin", "Démè", "Togbota", "Avlékété"],
  "Adjohoun": ["Akpadanou", "Azowlissè", "Dangbo", "Kpédékpo", "Kodé", "Gangban"],
  "Akpro-Missérété": ["Dékanmè", "Houédomè", "Houègbo", "Vakon"],
  "Avrankou": ["Adjèrè", "Gbozoumè", "Kpankou", "Onigbolo"],
  "Bonou": ["Atchonsa", "Gové", "Hèvè", "Kpankou"],
  "Dangbo": ["Attogon", "Houédomè", "Kpédékpo", "Zoungamè"],
  "Sèmè-Kpodji": ["Agblangandan", "Daagbé", "Djèrègbé", "Tohouè"],
  "Aguégués": ["Azowlissè", "Hétin-Sota", "Zoungamè"],

  // ── Atlantique ────────────────────────────────────────────────────────────────
  "Abomey-Calavi": [
    "Akassato", "Glo-Djigbé", "Godomey", "Kpanroun", "Ouèdo", "Togba",
    "Zinvié", "Hèvié", "Gétigon", "Womey", "Dékanmè", "Vèdoko",
    "Gbèdjougo", "Miniffi", "Déwé",
  ],
  "Allada": ["Attogon", "Avakpa", "Lissèzoun", "Sékou", "Togoudo", "Tokpa-Domè", "Zè"],
  "Kpomassè": ["Ahozon", "Aïzè", "Pahou", "Sèhouè", "Tové"],
  "Ouidah": ["Avlékété", "Djègbadji", "Gakpé", "Houakpè-Daho", "Kpovié", "Pahou", "Savi"],
  "So-Ava": ["Agbato", "Dékin", "Ekpé", "Ganvié", "Houédogli", "Vèkky"],
  "Toffo": ["Agonlin-Houégbo", "Coussin", "Damè-Wogon", "Dèkin", "Lissazounmè", "Séhouè"],
  "Tori-Bossito": ["Agoué", "Ahouandji", "Sèhouè", "Tori-Cada", "Tori-Gare"],
  "Zè": ["Dodji-Bata", "Glégoumè", "Koundokpota", "Sèhouè", "Tangbo", "Toffo"],
  "Misérété": ["Akpovi", "Gombé", "Hèvié", "Kpanroun"],

  // ── Zou ───────────────────────────────────────────────────────────────────────
  "Abomey": [
    "Agbokpa", "Cana", "Djègbé", "Gnizounmè", "Hounli", "Lissazoumè",
    "Sèhoun", "Détohou", "Avogbanna", "Sèhoué", "Kpakpaza",
  ],
  "Agbangnizoun": ["Domè", "Kpokissa", "Lalo", "Zounzonmè"],
  "Bohicon": ["Avogbanna", "Saclo", "Sodohomè", "Zounzonmè", "Passagon", "Gnidjazoun"],
  "Covè": ["Agonlin-Houégbo", "Dasso", "Kpakpaza", "Zallagnon"],
  "Djidja": ["Agouna", "Agouagon", "Banamè", "Dévé", "Gbéssakpérou", "Kpakpaza"],
  "Ouinhi": ["Dasso", "Gbèko", "Zon"],
  "Zagnanado": ["Agué", "Ayou", "Kpédékpo", "Sèhouè"],
  "Za-Kpota": ["Gnidjazoun", "Kpakpaza", "Toffo", "Zounzonmè"],
  "Zogbodomey": ["Bèssè", "Domè", "Kpokissa", "Lalo", "Passagon"],

  // ── Mono ──────────────────────────────────────────────────────────────────────
  "Lokossa": ["Agonlin", "Koudo", "Ouèdèmè-Adohouanmè", "Ouèdèmè-Pédah"],
  "Athiémé": ["Lobogo", "Montèhou", "Zoungoudo"],
  "Bopa": ["Agatogbo", "Gbakpè", "Hlassamè", "Yègodé"],
  "Comè": ["Agbodranfo", "Oumako", "Ouèdèmè-Pédah"],
  "Grand-Popo": ["Agoué", "Avlo", "Djanglanmè", "Gbéhoué", "Sazué"],
  "Houéyogbé": ["Ayomi", "Doutou", "Gbakpè", "Madjrè", "Sè"],

  // ── Couffo ────────────────────────────────────────────────────────────────────
  "Aplahoué": ["Dekpo-Centre", "Dévé", "Kpétou", "Lonkly", "Totchangni"],
  "Djakotomey": ["Adjido", "Benonmè", "Gbéhoué", "Médènou"],
  "Dogbo": ["Avedjin", "Dévé", "Gohomey", "Toviklin"],
  "Klouékanmè": ["Ahogbéya", "Dévé", "Gbakpè", "Houégbo"],
  "Lalo": ["Adjido", "Dévé", "Gnizounmè", "Kpéké", "Légbassito"],
  "Toviklin": ["Adoukandji", "Gbéhoué", "Kpinnou", "Médènou"],

  // ── Plateau ───────────────────────────────────────────────────────────────────
  "Adja-Ouèrè": ["Ikpinlè", "Kpoulou", "Massè", "Oyèkè"],
  "Ifangni": ["Daffo", "Igana", "Issaba", "Iwoye-Kéto"],
  "Kétou": ["Idigny", "Okpomèta", "Owodé", "Takon"],
  "Pobè": ["Ahoyéyé", "Igana", "Kpankou", "Yoko"],
  "Sakété": ["Ifangni", "Issè", "Itadjè", "Kpankou"],

  // ── Collines ──────────────────────────────────────────────────────────────────
  "Bantè": ["Agoua", "Alédjo", "Bobè", "Diane-Cameroun", "Koko", "Lèma", "Tchaourou"],
  "Dassa-Zoumé": ["Glazoué", "Kèrè", "Paouignan", "Soclogbo"],
  "Glazoué": ["Assanté", "Gomè", "Ouèssè", "Sokponta"],
  "Ouèssè": ["Assanté", "Kaboua", "Odougba", "Tchaourou"],
  "Savalou": ["Doumè", "Gobada", "Kpakpaza", "Lèma", "Monkpa", "Ottola", "Tchètti"],
  "Savè": ["Bèssè", "Kaboua", "Kpébié", "Odougba"],

  // ── Borgou ────────────────────────────────────────────────────────────────────
  "Parakou": [
    "Banikanni", "Zongo", "Madina", "Kpébié", "Titirou", "Tourou", "Ganhi",
    "Wansirou", "Goura", "Ladji-Tokpa", "Hamdallaye", "Albarika", "Kpébié-Nord",
    "Gah", "Guéma", "Banigri", "Tahouo", "Parakou-Centre", "Gberou-Baba",
  ],
  "Bembèrèkè": ["Bori", "Gamia", "Gninsy", "Ina", "N'Dali", "Soroko"],
  "Kalalé": ["Derassi", "Guilmaro", "Kassakou", "Ségbana", "Sirarou"],
  "N'Dali": ["Bori", "Gbéré", "Gnonkourakali", "Sérékalé"],
  "Nikki": ["Biro", "Kaobagou", "Suya", "Tasso", "Wéwé"],
  "Pèrèrè": ["Béroubouay", "Gando", "Ko", "N'Dali"],
  "Sinendé": ["Bèrèkè", "Gobé", "Sérékalé", "Sirarou"],
  "Tchaourou": ["Alafiarou", "Bèttèrou", "Kika", "Sanson", "Wouari"],

  // ── Alibori ───────────────────────────────────────────────────────────────────
  "Banikoara": ["Founougo", "Gomparou", "Goumori", "Kokey", "Kokiborou", "Ounet", "Soroko", "Toura"],
  "Gogounou": ["Angaradébou", "Bagou", "Sori", "Wéwérou"],
  "Kandi": ["Angaradébou", "Donwari", "Kassakou", "Saah", "Saa"],
  "Karimama": ["Birni-Lafia", "Bogo-Bogo", "Gambou", "Monsey", "Yérimaro"],
  "Malanville": ["Garou", "Guéné", "Madécali", "Tomboutou"],
  "Ségbana": ["Bellefoungou", "Liboussou", "Lougou", "Pénéssoulou", "Robogui", "Sokotindji"],

  // ── Atacora ───────────────────────────────────────────────────────────────────
  "Natitingou": [
    "Natitingou-Centre", "Kossou", "Pouri", "Tchaourou", "Perma",
    "Tchandèrou", "Kouandata", "Boukoumbé-Centre",
  ],
  "Boukoumbé": ["Dipoli", "Koundata", "Manta", "Natta", "Tabota"],
  "Cobly": ["Datori", "Kountori", "Sémèrè", "Tapièga"],
  "Kérou": ["Alédjo-Koura", "Brignamaro", "Fô", "Kaobagou", "Perma"],
  "Kouandé": ["Birni", "Fofounou", "Guilmaro", "Guilmoro"],
  "Matéri": ["Dassari", "Gouandé", "Nodi", "Tantéga"],
  "Péhunco": ["Firgoun", "Gnémasson", "Sèkèrè", "Soroko"],
  "Tanguiéta": ["Batia", "Cotiakou", "Nadoba", "Taïacou"],
  "Toukountouna": ["Perma", "Wari-Maro"],

  // ── Donga ─────────────────────────────────────────────────────────────────────
  "Djougou": ["Bèrèkè", "Kpèdè", "Ouaké", "Pédarou", "Sérou", "Sinendé"],
  "Bassila": ["Alédjo", "Koko", "Manigri", "Tchalinga"],
  "Copargo": ["Barei", "Kpèdè", "Odogou", "Partago"],
  "Ouaké": ["Barei", "Kpèdè", "Odogou", "Partago"],
};

export const getDistrictsForCity = (cityName: string): string[] => {
  return neighborhoodsByCity[cityName] || [];
};

export const getAllCityNames = (): string[] => {
  return beninCities.map(city => city.name);
};
