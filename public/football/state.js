/**
 * Football Pro 2026 - Shared Reactive Game State, Constants and Matchup Setup
 */

export const PITCH_LENGTH = 115; // Scaled to represent 105m pitch length
export const PITCH_WIDTH = 75;  // Scaled to represent 68m pitch width
export const GOAL_WIDTH = 14;
export const GOAL_HEIGHT = 5.5;

export const TEAMS = {
  RED: 0,
  BLUE: 1
};

export const COUNTRIES = [
  { name: "Spain", flag: "🇪🇸" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "England", flag: "🇬🇧" },
  { name: "India", flag: "🇮🇳" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Italy", flag: "🇮🇹" }
];

export const CLUBS_DATABASE = {
  "Spain": [
    { name: "FC Barcelona", crest: "🔵🔴", rating: 5, att: 87, mid: 85, def: 83, league: "LALIGA EA SPORTS", colorHex: "#004d98", secondary: 0xa50044, players: [
      { name: "Lewandowski", role: "ST", number: 9 },
      { name: "Raphinha", role: "LW", number: 11 },
      { name: "Lamine Yamal", role: "RW", number: 19 },
      { name: "Pedri", role: "LCM", number: 8 },
      { name: "Frenkie de Jong", role: "CM", number: 21 },
      { name: "Gavi", role: "RCM", number: 6 },
      { name: "Balde", role: "LB", number: 3 },
      { name: "Inigo Martinez", role: "LCB", number: 5 },
      { name: "Cubarsi", role: "RCB", number: 2 },
      { name: "Kounde", role: "RB", number: 23 },
      { name: "Ter Stegen", role: "GK", number: 1 }
    ], reserves: [
      { name: "Ferran Torres", role: "ST", number: 7 },
      { name: "Ansu Fati", role: "LW", number: 10 },
      { name: "Fermin Lopez", role: "CM", number: 16 },
      { name: "Christensen", role: "CB", number: 15 },
      { name: "Pena", role: "GK", number: 13 }
    ]},
    { name: "Real Madrid", crest: "⚪👑", rating: 5, att: 90, mid: 84, def: 82, league: "LALIGA EA SPORTS", colorHex: "#ffffff", secondary: 0xfacc15, players: [
      { name: "Mbappe", role: "ST", number: 9 },
      { name: "Vinicius Jr", role: "LW", number: 7 },
      { name: "Rodrygo", role: "RW", number: 11 },
      { name: "Bellingham", role: "LCM", number: 5 },
      { name: "Valverde", role: "CM", number: 8 },
      { name: "Tchouameni", role: "RCM", number: 14 },
      { name: "Mendy", role: "LB", number: 23 },
      { name: "Rudiger", role: "LCB", number: 22 },
      { name: "Militao", role: "RCB", number: 3 },
      { name: "Carvajal", role: "RB", number: 2 },
      { name: "Courtois", role: "GK", number: 1 }
    ], reserves: [
      { name: "Endrick", role: "ST", number: 16 },
      { name: "Arda Guler", role: "RW", number: 15 },
      { name: "Modric", role: "CM", number: 10 },
      { name: "Lucas Vazquez", role: "RB", number: 17 },
      { name: "Lunin", role: "GK", number: 13 }
    ]},
    { name: "Spain (National)", crest: "🇪🇸🛡️", rating: 5, att: 88, mid: 86, def: 84, league: "UEFA EURO", colorHex: "#ef4444", secondary: 0xfacc15, players: [
      { name: "Alvaro Morata", role: "ST", number: 7 },
      { name: "Nico Williams", role: "LW", number: 17 },
      { name: "Lamine Yamal", role: "RW", number: 19 },
      { name: "Fabian Ruiz", role: "LCM", number: 8 },
      { name: "Rodri", role: "CM", number: 16 },
      { name: "Dani Olmo", role: "RCM", number: 10 },
      { name: "Cucurella", role: "LB", number: 24 },
      { name: "Laporte", role: "LCB", number: 14 },
      { name: "Le Normand", role: "RCB", number: 3 },
      { name: "Carvajal", role: "RB", number: 2 },
      { name: "Unai Simon", role: "GK", number: 23 }
    ], reserves: [
      { name: "Oyarzabal", role: "ST", number: 21 },
      { name: "Merino", role: "CM", number: 6 },
      { name: "Grimaldo", role: "LB", number: 12 },
      { name: "Vivian", role: "CB", number: 5 },
      { name: "Raya", role: "GK", number: 1 }
    ]}
  ],
  "Argentina": [
    { name: "Argentina (National)", crest: "🇦🇷⭐", rating: 5, att: 89, mid: 85, def: 84, league: "COPA AMERICA", colorHex: "#7dd3fc", secondary: 0xffffff, players: [
      { name: "Lionel Messi", role: "RW", number: 10 },
      { name: "Julian Alvarez", role: "ST", number: 9 },
      { name: "Nico Gonzalez", role: "LW", number: 15 },
      { name: "Mac Allister", role: "LCM", number: 20 },
      { name: "Enzo Fernandez", role: "CM", number: 24 },
      { name: "Rodrigo De Paul", role: "RCM", number: 7 },
      { name: "Tagliafico", role: "LB", number: 3 },
      { name: "Otamendi", role: "LCB", number: 19 },
      { name: "Cuti Romero", role: "RCB", number: 13 },
      { name: "Nahuel Molina", role: "RB", number: 26 },
      { name: "Dibu Martinez", role: "GK", number: 23 }
    ], reserves: [
      { name: "Lautaro Martinez", role: "ST", number: 22 },
      { name: "Garnacho", role: "LW", number: 17 },
      { name: "Paredes", role: "CM", number: 5 },
      { name: "Lisandro Martinez", role: "CB", number: 25 },
      { name: "Rulli", role: "GK", number: 1 }
    ]},
    { name: "Boca Juniors", crest: "🔵🟡", rating: 4, att: 80, mid: 78, def: 77, league: "LIGA PROFESIONAL", colorHex: "#003b7a", secondary: 0xfcc600, players: [
      { name: "Cavani", role: "ST", number: 10 },
      { name: "Merentiel", role: "LS", number: 16 },
      { name: "Zenon", role: "LM", number: 22 },
      { name: "Medina", role: "LCM", number: 36 },
      { name: "Pol Fernandez", role: "RCM", number: 8 },
      { name: "Advincula", role: "RM", number: 17 },
      { name: "Blanco", role: "LB", number: 23 },
      { name: "Rojo", role: "LCB", number: 6 },
      { name: "Lema", role: "RCB", number: 2 },
      { name: "Figal", role: "RB", number: 4 },
      { name: "Romero", role: "GK", number: 1 }
    ], reserves: [
      { name: "Benedetto", role: "ST", number: 9 },
      { name: "Janson", role: "LW", number: 11 },
      { name: "Saralegui", role: "CM", number: 47 },
      { name: "Valentini", role: "CB", number: 15 },
      { name: "Brey", role: "GK", number: 12 }
    ]}
  ],
  "Portugal": [
    { name: "Portugal (National)", crest: "🇵🇹🛡", rating: 5, att: 88, mid: 84, def: 83, league: "UEFA EURO", colorHex: "#dc2626", secondary: 0x166534, players: [
      { name: "Cristiano Ronaldo", role: "ST", number: 7 },
      { name: "Rafael Leao", role: "LW", number: 17 },
      { name: "Bernardo Silva", role: "RW", number: 10 },
      { name: "Bruno Fernandes", role: "LCM", number: 8 },
      { name: "Joao Palhinha", role: "CM", number: 6 },
      { name: "Vitinha", role: "RCM", number: 23 },
      { name: "Nuno Mendes", role: "LB", number: 19 },
      { name: "Ruben Dias", role: "LCB", number: 4 },
      { name: "Antonio Silva", role: "RCB", number: 24 },
      { name: "Joao Cancelo", role: "RB", number: 2 },
      { name: "Diogo Costa", role: "GK", number: 22 }
    ], reserves: [
      { name: "Goncalo Ramos", role: "ST", number: 9 },
      { name: "Joao Felix", role: "LW", number: 11 },
      { name: "Ruben Neves", role: "CM", number: 18 },
      { name: "Dalot", role: "RB", number: 20 },
      { name: "Sa", role: "GK", number: 12 }
    ]},
    { name: "Benfica", crest: "🔴🦅", rating: 4, att: 82, mid: 81, def: 80, league: "LIGA PORTUGAL", colorHex: "#da291c", secondary: 0xffffff, players: [
      { name: "Di Maria", role: "RW", number: 11 },
      { name: "Pavlidis", role: "ST", number: 14 },
      { name: "Aursnes", role: "LW", number: 8 },
      { name: "Kokcu", role: "LCM", number: 10 },
      { name: "Florentino", role: "CM", number: 61 },
      { name: "Joao Mario", role: "RCM", number: 20 },
      { name: "Carreras", role: "LB", number: 3 },
      { name: "Otamendi", role: "LCB", number: 30 },
      { name: "Antonio S.", role: "RCB", number: 4 },
      { name: "Bah", role: "RB", number: 6 },
      { name: "Trubin", role: "GK", number: 1 }
    ], reserves: [
      { name: "Arthur Cabral", role: "ST", number: 9 },
      { name: "Rollheiser", role: "RW", number: 32 },
      { name: "Barreiro", role: "CM", number: 18 },
      { name: "Morato", role: "CB", number: 91 },
      { name: "Samuel Soares", role: "GK", number: 24 }
    ]}
  ],
  "England": [
    { name: "England (National)", crest: "🦁🦁🦁", rating: 5, att: 89, mid: 86, def: 84, league: "UEFA EURO", colorHex: "#ffffff", secondary: 0x1e3a8a, players: [
      { name: "Harry Kane", role: "ST", number: 9 },
      { name: "Jude Bellingham", role: "LCM", number: 10 },
      { name: "Phil Foden", role: "LW", number: 11 },
      { name: "Bukayo Saka", role: "RW", number: 7 },
      { name: "Declan Rice", role: "CM", number: 4 },
      { name: "Kobbie Mainoo", role: "RCM", number: 26 },
      { name: "Kieran Trippier", role: "LB", number: 12 },
      { name: "Marc Guehi", role: "LCB", number: 6 },
      { name: "John Stones", role: "RCB", number: 5 },
      { name: "Kyle Walker", role: "RB", number: 2 },
      { name: "Jordan Pickford", role: "GK", number: 1 }
    ], reserves: [
      { name: "Ollie Watkins", role: "ST", number: 19 },
      { name: "Cole Palmer", role: "CAM", number: 24 },
      { name: "Anthony Gordon", role: "LW", number: 18 },
      { name: "Ezri Konsa", role: "CB", number: 14 },
      { name: "Dean Henderson", role: "GK", number: 13 }
    ]},
    { name: "Manchester City", crest: "🔵🦅", rating: 5, att: 91, mid: 87, def: 84, league: "PREMIER LEAGUE", colorHex: "#bae6fd", secondary: 0x075985, players: [
      { name: "Haaland", role: "ST", number: 9 },
      { name: "Foden", role: "LW", number: 47 },
      { name: "Bernardo S.", role: "RW", number: 20 },
      { name: "De Bruyne", role: "LCM", number: 17 },
      { name: "Rodri", role: "CM", number: 16 },
      { name: "Kovacic", role: "RCM", number: 8 },
      { name: "Gvardiol", role: "LB", number: 24 },
      { name: "Ruben Dias", role: "LCB", number: 3 },
      { name: "Akanji", role: "RCB", number: 25 },
      { name: "Walker", role: "RB", number: 2 },
      { name: "Ederson", role: "GK", number: 31 }
    ], reserves: [
      { name: "Savinho", role: "RW", number: 26 },
      { name: "Doku", role: "LW", number: 11 },
      { name: "Gundogan", role: "CM", number: 19 },
      { name: "Stones", role: "CB", number: 5 },
      { name: "Ortega", role: "GK", number: 18 }
    ]}
  ],
  "India": [
    { name: "India (National)", crest: "🇮🇳🐯", rating: 3, att: 70, mid: 68, def: 67, league: "AFC ASIAN CUP", colorHex: "#005ca9", secondary: 0xffffff, players: [
      { name: "Sunil Chhetri", role: "ST", number: 11 },
      { name: "Manvir Singh", role: "RW", number: 9 },
      { name: "L. Chhangte", role: "LW", number: 17 },
      { name: "Apuia Ralte", role: "CM", number: 8 },
      { name: "Anirudh Thapa", role: "LCM", number: 7 },
      { name: "Sahal Abdul Samad", role: "RCM", number: 10 },
      { name: "Subhasish Bose", role: "LB", number: 3 },
      { name: "Sandesh Jhingan", role: "LCB", number: 5 },
      { name: "Anwar Ali", role: "RCB", number: 4 },
      { name: "Nikhil Poojary", role: "RB", number: 21 },
      { name: "Gurpreet S. Sandhu", role: "GK", number: 1 }
    ], reserves: [
      { name: "Liston Colaco", role: "LW", number: 14 },
      { name: "Naorem Mahesh", role: "RW", number: 12 },
      { name: "Jeakson Singh", role: "CM", number: 6 },
      { name: "Mehtab Singh", role: "CB", number: 15 },
      { name: "Amrinder Singh", role: "GK", number: 22 }
    ]},
    { name: "Mohun Bagan SG", crest: "🟢🔴", rating: 3, att: 72, mid: 69, def: 68, league: "INDIAN SUPER LEAGUE", colorHex: "#0f5a2f", secondary: 0x8b0f1a, players: [
      { name: "Jason Cummings", role: "ST", number: 9 },
      { name: "Petratos", role: "RW", number: 10 },
      { name: "Liston Colaco", role: "LW", number: 17 },
      { name: "Sahal Samad", role: "LCM", number: 18 },
      { name: "Apuia Ralte", role: "CM", number: 8 },
      { name: "Anirudh Thapa", role: "RCM", number: 7 },
      { name: "Subhasish Bose", role: "LB", number: 15 },
      { name: "Anwar Ali", role: "LCB", number: 4 },
      { name: "Hector Yuste", role: "RCB", number: 21 },
      { name: "Asish Rai", role: "RB", number: 44 },
      { name: "Vishal Kaith", role: "GK", number: 1 }
    ], reserves: [
      { name: "Sadiku", role: "ST", number: 99 },
      { name: "Manvir Singh", role: "RW", number: 11 },
      { name: "Abhishek Suryavanshi", role: "CM", number: 16 },
      { name: "Amandeep", role: "CB", number: 32 },
      { name: "Arsh Anwer", role: "GK", number: 23 }
    ]}
  ],
  "Brazil": [
    { name: "Brazil (National)", crest: "🇧🇷⭐", rating: 5, att: 89, mid: 84, def: 83, league: "COPA AMERICA", colorHex: "#fbbf24", secondary: 0x166534, players: [
      { name: "Vinicius Jr", role: "LW", number: 7 },
      { name: "Rodrygo", role: "RW", number: 10 },
      { name: "Endrick", role: "ST", number: 9 },
      { name: "Bruno Guimaraes", role: "LCM", number: 5 },
      { name: "Lucas Paqueta", role: "CM", number: 8 },
      { name: "Joao Gomes", role: "RCM", number: 15 },
      { name: "Wendell", role: "LB", number: 6 },
      { name: "Marquinhos", role: "LCB", number: 4 },
      { name: "Eder Militao", role: "RCB", number: 3 },
      { name: "Danilo", role: "RB", number: 2 },
      { name: "Alisson Becker", role: "GK", number: 1 }
    ], reserves: [
      { name: "Raphinha", role: "RW", number: 11 },
      { name: "Martinelli", role: "LW", number: 22 },
      { name: "Andreas Pereira", role: "CM", number: 18 },
      { name: "Bremer", role: "CB", number: 14 },
      { name: "Ederson Moraes", role: "GK", number: 23 }
    ]},
    { name: "Flamengo", crest: "🔴⚫", rating: 4, att: 81, mid: 80, def: 79, league: "SERIE A BRAZIL", colorHex: "#dc2626", secondary: 0x111827, players: [
      { name: "Pedro", role: "ST", number: 9 },
      { name: "Gabigol", role: "ST", number: 10 },
      { name: "Cebolinha", role: "LW", number: 11 },
      { name: "Arrascaeta", role: "LCM", number: 14 },
      { name: "De la Cruz", role: "CM", number: 18 },
      { name: "Gerson", role: "RCM", number: 8 },
      { name: "Ayrton Lucas", role: "LB", number: 6 },
      { name: "Leo Pereira", role: "LCB", number: 4 },
      { name: "Fabricio Bruno", role: "RCB", number: 15 },
      { name: "Varela", role: "RB", number: 2 },
      { name: "Rossi", role: "GK", number: 1 }
    ], reserves: [
      { name: "Bruno Henrique", role: "LW", number: 27 },
      { name: "Luiz Araujo", role: "RW", number: 7 },
      { name: "Pulgar", role: "CM", number: 5 },
      { name: "David Luiz", role: "CB", number: 23 },
      { name: "Matheus Cunha", role: "GK", number: 25 }
    ]}
  ],
  "France": [
    { name: "France (National)", crest: "🇫🇷🐓", rating: 5, att: 91, mid: 86, def: 85, league: "UEFA EURO", colorHex: "#0f172a", secondary: 0xffffff, players: [
      { name: "Kylian Mbappe", role: "ST", number: 10 },
      { name: "Ousmane Dembele", role: "RW", number: 11 },
      { name: "Marcus Thuram", role: "LW", number: 15 },
      { name: "Antoine Griezmann", role: "LCM", number: 7 },
      { name: "Aurelien Tchouameni", role: "CM", number: 8 },
      { name: "N'Golo Kante", role: "RCM", number: 13 },
      { name: "Theo Hernandez", role: "LB", number: 22 },
      { name: "William Saliba", role: "LCB", number: 4 },
      { name: "Dayot Upamecano", role: "RCB", number: 18 },
      { name: "Jules Kounde", role: "RB", number: 5 },
      { name: "Mike Maignan", role: "GK", number: 16 }
    ], reserves: [
      { name: "Olivier Giroud", role: "ST", number: 9 },
      { name: "Kingsley Coman", role: "RW", number: 20 },
      { name: "Adrien Rabiot", role: "CM", number: 14 },
      { name: "Ibrahima Konate", role: "CB", number: 24 },
      { name: "Brice Samba", role: "GK", number: 1 }
    ]},
    { name: "Paris Saint-Germain", crest: "🗼⚜️", rating: 5, att: 86, mid: 84, def: 83, league: "LIGUE 1 MCDONALD'S", colorHex: "#004170", secondary: 0xda291c, players: [
      { name: "Goncalo Ramos", role: "ST", number: 9 },
      { name: "Bradley Barcola", role: "LW", number: 29 },
      { name: "Ousmane Dembele", role: "RW", number: 10 },
      { name: "Vitinha", role: "LCM", number: 17 },
      { name: "Warren Zaire-Emery", role: "CM", number: 33 },
      { name: "Joao Neves", role: "RCM", number: 87 },
      { name: "Nuno Mendes", role: "LB", number: 25 },
      { name: "Marquinhos", role: "LCB", number: 5 },
      { name: "Willian Pacho", role: "RCB", number: 51 },
      { name: "Achraf Hakimi", role: "RB", number: 2 },
      { name: "Gianluigi Donnarumma", role: "GK", number: 1 }
    ], reserves: [
      { name: "Kolo Muani", role: "ST", number: 23 },
      { name: "Marco Asensio", role: "LW", number: 11 },
      { name: "Fabian Ruiz", role: "CM", number: 8 },
      { name: "Lucas Beraldo", role: "CB", number: 35 },
      { name: "Safonov", role: "GK", number: 39 }
    ]}
  ],
  "Germany": [
    { name: "Germany (National)", crest: "🇩🇪🦅", rating: 5, att: 87, mid: 87, def: 84, league: "UEFA EURO", colorHex: "#ffffff", secondary: 0x111827, players: [
      { name: "Kai Havertz", role: "ST", number: 7 },
      { name: "Jamal Musiala", role: "LW", number: 10 },
      { name: "Florian Wirtz", role: "RW", number: 17 },
      { name: "Ilkay Gundogan", role: "LCM", number: 21 },
      { name: "Toni Kroos", role: "CM", number: 8 },
      { name: "Robert Andrich", role: "RCM", number: 23 },
      { name: "Maximilian Mittelstadt", role: "LB", number: 18 },
      { name: "Jonathan Tah", role: "LCB", number: 4 },
      { name: "Antonio Rudiger", role: "RCB", number: 2 },
      { name: "Joshua Kimmich", role: "RB", number: 6 },
      { name: "Manuel Neuer", role: "GK", number: 1 }
    ], reserves: [
      { name: "Niclas Fullkrug", role: "ST", number: 9 },
      { name: "Leroy Sane", role: "RW", number: 19 },
      { name: "Pascal Gross", role: "CM", number: 5 },
      { name: "Nico Schlotterbeck", role: "CB", number: 15 },
      { name: "Marc-Andre ter Stegen", role: "GK", number: 22 }
    ]},
    { name: "Bayern Munich", crest: "🔴🛡️", rating: 5, att: 89, mid: 85, def: 82, league: "BUNDESLIGA", colorHex: "#dc2626", secondary: 0x0066b2, players: [
      { name: "Harry Kane", role: "ST", number: 9 },
      { name: "Leroy Sane", role: "LW", number: 10 },
      { name: "Michael Olise", role: "RW", number: 17 },
      { name: "Jamal Musiala", role: "LCM", number: 42 },
      { name: "Aleksandar Pavlovic", role: "CM", number: 45 },
      { name: "Joshua Kimmich", role: "RCM", number: 6 },
      { name: "Alphonso Davies", role: "LB", number: 19 },
      { name: "Kim Min-jae", role: "LCB", number: 3 },
      { name: "Dayot Upamecano", role: "RCB", number: 2 },
      { name: "Sacha Boey", role: "RB", number: 23 },
      { name: "Manuel Neuer", role: "GK", number: 1 }
    ], reserves: [
      { name: "Mathys Tel", role: "ST", number: 39 },
      { name: "Serge Gnabry", role: "LW", number: 7 },
      { name: "Thomas Muller", role: "CAM", number: 25 },
      { name: "Eric Dier", role: "CB", number: 15 },
      { name: "Sven Ulreich", role: "GK", number: 26 }
    ]}
  ],
  "Italy": [
    { name: "Italy (National)", crest: "🇮🇹🛡️", rating: 5, att: 86, mid: 84, def: 85, league: "UEFA EURO", colorHex: "#1d4ed8", secondary: 0xffffff, players: [
      { name: "Gianluca Scamacca", role: "ST", number: 9 },
      { name: "Federico Chiesa", role: "LW", number: 14 },
      { name: "Davide Frattesi", role: "RW", number: 21 },
      { name: "Nicolo Barella", role: "LCM", number: 18 },
      { name: "Jorginho", role: "CM", number: 8 },
      { name: "Bryan Cristante", role: "RCM", number: 16 },
      { name: "Federico Dimarco", role: "LB", number: 3 },
      { name: "Alessandro Bastoni", role: "LCB", number: 23 },
      { name: "Riccardo Calafiori", role: "RCB", number: 5 },
      { name: "Giovanni Di Lorenzo", role: "RB", number: 2 },
      { name: "Gianluigi Donnarumma", role: "GK", number: 1 }
    ], reserves: [
      { name: "Mateo Retegui", role: "ST", number: 19 },
      { name: "Mattia Zaccagni", role: "LW", number: 20 },
      { name: "Lorenzo Pellegrini", role: "CM", number: 10 },
      { name: "Gianluca Mancini", role: "CB", number: 17 },
      { name: "Guglielmo Vicario", role: "GK", number: 12 }
    ]},
    { name: "Juventus", crest: "⚫⚪", rating: 4, att: 83, mid: 82, def: 82, league: "SERIE A", colorHex: "#171717", secondary: 0xffffff, players: [
      { name: "Vlahovic", role: "ST", number: 9 },
      { name: "Yildiz", role: "LW", number: 10 },
      { name: "Weah", role: "RW", number: 22 },
      { name: "Koopmeiners", role: "LCM", number: 8 },
      { name: "Douglas Luiz", role: "CM", number: 26 },
      { name: "Locatelli", role: "RCM", number: 5 },
      { name: "Cambiaso", role: "LB", number: 27 },
      { name: "Bremer", role: "LCB", number: 3 },
      { name: "Gatti", role: "RCB", number: 4 },
      { name: "Savona", role: "RB", number: 37 },
      { name: "Di Gregorio", role: "GK", number: 29 }
    ], reserves: [
      { name: "Milik", role: "ST", number: 14 },
      { name: "Mbangula", role: "LW", number: 51 },
      { name: "Thuram", role: "CM", number: 19 },
      { name: "Kalulu", role: "CB", number: 15 },
      { name: "Perin", role: "GK", number: 1 }
    ]}
  ]
};

export const TEAM_DATA = {
  "RED DEVILS": { name: "RED DEVILS", colorHex: "#ef4444", color: 0xef4444, secondary: 0xffffff, cssClass: "red-color" },
  "SKY BLUES": { name: "SKY BLUES", colorHex: "#38bdf8", color: 0x38bdf8, secondary: 0x1e3a8a, cssClass: "blue-color" },
  "MADRID KINGS": { name: "MADRID KINGS", colorHex: "#f8fafc", color: 0xf8fafc, secondary: 0xf59e0b, cssClass: "white-color" },
  "MUNICH GIANTS": { name: "MUNICH GIANTS", colorHex: "#991b1b", color: 0x991b1b, secondary: 0xd97706, cssClass: "red-color" },
  "PARIS STARS": { name: "PARIS STARS", colorHex: "#1e1b4b", color: 0x1e1b4b, secondary: 0xeab308, cssClass: "blue-color" },
  "MILANO FC": { name: "MILANO FC", colorHex: "#171717", color: 0x171717, secondary: 0xdc2626, cssClass: "black-color" }
};

export const TEAMS_LIST = Object.keys(TEAM_DATA);

export const PLAYER_STATES = {
  IDLE: "IDLE",
  WALKING: "WALKING",
  RUNNING: "RUNNING",
  SPRINTING: "SPRINTING",
  DRIBBLING: "DRIBBLING",
  PASSING: "PASSING",
  SHOOTING: "SHOOTING",
  TACKLED: "TACKLED",
  STUMBLED: "STUMBLED",
  CELEBRATING: "CELEBRATING"
};

export const FORMATIONS = {
  "4-3-3": [
    { role: "LB", pos: { x: -35, z: -20 } },
    { role: "LCB", pos: { x: -38, z: -7 } },
    { role: "RCB", pos: { x: -38, z: 7 } },
    { role: "RB", pos: { x: -35, z: 20 } },
    { role: "LCM", pos: { x: -18, z: -15 } },
    { role: "CM", pos: { x: -22, z: 0 } },
    { role: "RCM", pos: { x: -18, z: 15 } },
    { role: "LW", pos: { x: -5, z: -18 } },
    { role: "ST", pos: { x: -2, z: 0 } },
    { role: "RW", pos: { x: -5, z: 18 } }
  ],
  "4-4-2": [
    { role: "LB", pos: { x: -35, z: -20 } },
    { role: "LCB", pos: { x: -38, z: -7 } },
    { role: "RCB", pos: { x: -38, z: 7 } },
    { role: "RB", pos: { x: -35, z: 20 } },
    { role: "LM", pos: { x: -18, z: -22 } },
    { role: "LCM", pos: { x: -20, z: -8 } },
    { role: "RCM", pos: { x: -20, z: 8 } },
    { role: "RM", pos: { x: -18, z: 22 } },
    { role: "LS", pos: { x: -3, z: -10 } },
    { role: "RS", pos: { x: -3, z: 10 } }
  ]
};

export const gameState = {
  // 3D Engine Globals
  scene: null,
  camera: null,
  renderer: null,
  orbitControls: null,
  clock: null,

  // Ball
  ballMesh: null,
  ballVelocity: null, // Will be Vector3
  ballRadius: 0.32,
  ballDribbler: null,

  // Players
  players: [],
  userControlledPlayer: null,
  opponentGoalKeeper: null,
  userGoalKeeper: null,

  // Match Stats & Time
  score: { home: 0, away: 0 },
  matchTimer: 0,
  countdownTimer: 0,

  // States
  gameActive: false,
  isGoalScoringPause: false,
  isReplayActive: false,
  isPvPMode: false,
  kickoffActive: false, // True until first kick is taken - freezes AI movement/tackles

  // Replay
  replayBuffer: [],
  replayFrameIndex: 0,

  // Matchup parameters
  userTeamName: "RED DEVILS",
  oppTeamName: "SKY BLUES",
  userFormationName: "4-3-3",
  oppFormationName: "4-3-3",
  matchDuration: 180, // Default 3 Mins
  gameDifficulty: "easy",
  scoringTeamId: null,
  shotTaker: null,

  // Inputs
  keys: {
    w: false, a: false, s: false, d: false,
    arrowUp: false, arrowDown: false, arrowLeft: false, arrowRight: false,
    space: false, e: false, shift: false, q: false, c: false
  },

  touchState: {
    jsActive: false,
    jsStart: { x: 0, y: 0 },
    jsMove: { x: 0, y: 0 },
    joystickDir: null, // Will be Vector2
    btnSprint: false,
    btnTackle: false,
    btnPass: false,
    btnShoot: false
  },

  setPiece: {
    active: false,
    type: null, // 'throwin' | 'corner' | 'goalkick'
    team: null,
    spot: null, // will be Vector3
    kicker: null,
    targets: [],
    targetIndex: 0,
    aimAngle: 0,
    mode: 'choose' // 'choose' | 'player' | 'direct'
  },

  foulState: {
    active: false,
    spot: null, // will be Vector3
    offender: null, // PlayerAgent
    victim: null, // PlayerAgent
    cardTypeShown: null // 'yellow' | 'red' | null
  },

  homeTeam: {
    country: "Argentina",
    clubIndex: 0
  },
  awayTeam: {
    country: "Portugal",
    clubIndex: 0
  },
  selectedHomeLineup: null,
  selectedAwayLineup: null,
  selectedHomeReserves: null,
  selectedAwayReserves: null,
  homeFormation: "4-3-3",
  awayFormation: "4-3-3"
};
