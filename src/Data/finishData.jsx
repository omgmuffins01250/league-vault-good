// src/Data/finishData.jsx
// Keep a fast in-memory map of CSV text keyed by "<year>_<SCORING>"
if (!window.FL_finishData) window.FL_finishData = {};

// Preserve any previous global ingestor (the App's version writes to localStorage)
const _prevIngest =
  typeof window.FL_ingestFinishCSV === "function"
    ? window.FL_ingestFinishCSV
    : null;

/** Register CSV for a season/scoring (in-memory) + forward to previous ingestor if present */
window.FL_ingestFinishCSV = function (year, scoring, csvText) {
  if (!year || !scoring || !csvText) return;
  const key = `${year}_${String(scoring).toUpperCase()}`;
  window.FL_finishData[key] = String(csvText);
  if (_prevIngest) {
    try {
      _prevIngest(year, scoring, csvText);
    } catch {}
  }
};

/** Attach finish pos (e.g., WR3) to draft rows for the given scoring type (from in-memory CSVs) */
window.FL_attachFinishPosFromLocal = function (draftByYear, scoring = "PPR") {
  if (!draftByYear) return draftByYear || {};
  const out = {};
  const sc = String(scoring).toUpperCase();

  const splitCSVLine = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const norm = (s = "") =>
    s.toLowerCase()
      .replace(/\./g, "")
      .replace(/'/g, "")
      .replace(/\b(jr|sr|ii|iii|iv|v|vi)\b/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const yr = Number(yrStr);
    const csv = window.FL_finishData[`${yr}_${sc}`];
    if (!csv) { out[yr] = rows; continue; }

    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { out[yr] = rows; continue; }

    const header = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase());
    const iName = header.indexOf("NAME");
    const iPos  = header.indexOf("POS");
    const iFpts = header.indexOf("FPTS");
    if (iName === -1 || iPos === -1 || iFpts === -1) { out[yr] = rows; continue; }

    const buckets = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const name = (cols[iName] || "").trim();
      const pos  = (cols[iPos]  || "").trim().toUpperCase();
      const fpts = Number((cols[iFpts] || "").toString().replace(/[^0-9.\-]/g, ""));
      if (!name || !pos || !Number.isFinite(fpts)) continue;
      if (!buckets[pos]) buckets[pos] = [];
      buckets[pos].push({ name, pos, fpts });
    }

    // sort each position by points desc and create a map name->"POSrank"
    Object.values(buckets).forEach(arr => arr.sort((a, b) => b.fpts - a.fpts));
    const rankMap = new Map();
    Object.entries(buckets).forEach(([pos, arr]) => {
      arr.forEach((p, i) => rankMap.set(norm(p.name), `${pos}${i + 1}`));
    });

    out[yr] = (rows || []).map((r) => {
      const key = norm(r.player || "");
      const lbl = rankMap.get(key);
      return lbl ? { ...r, finishPos: lbl } : r;
    });
  }

  return out;
};

  // ---------------------------------------------------------------------------
  // SHELL — paste each season's CSV into the backticks
  // ---------------------------------------------------------------------------
  
  // 2010
  window.FL_ingestFinishCSV(2010, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2011
  window.FL_ingestFinishCSV(2011, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2012
  window.FL_ingestFinishCSV(2012, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2013
  window.FL_ingestFinishCSV(2013, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2014
  window.FL_ingestFinishCSV(2014, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2015
  window.FL_ingestFinishCSV(2015, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2016
  window.FL_ingestFinishCSV(2016, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2017
  window.FL_ingestFinishCSV(2017, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2018
  window.FL_ingestFinishCSV(2018, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2019
  window.FL_ingestFinishCSV(2019, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2020
  window.FL_ingestFinishCSV(2020, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2021
  window.FL_ingestFinishCSV(2021, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2022
  window.FL_ingestFinishCSV(2022, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2023
  window.FL_ingestFinishCSV(2023, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  `);
  
  // 2024
  window.FL_ingestFinishCSV(2024, "PPR", `
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
  RK,NAME,TEAM,POS,GP,YDS,TD,INT,YDS,TD,REC,YDS,TD,SCK,INT,FF,FR,FPTS/G,FPTS
1,Lamar Jackson,BAL,QB,17,4172,41,4,915,4,0,0,0,0,0,0,0,25.3,430.4
2,Ja'Marr Chase,CIN,WR,17,0,0,0,32,0,127,1708,17,0,0,0,0,23.7,403
3,Josh Allen,BUF,QB,17,3731,28,6,531,12,0,7,1,0,0,0,0,22.3,379
4,Joe Burrow,CIN,QB,17,4918,43,9,201,2,0,0,0,0,0,0,0,21.9,372.8
5,Baker Mayfield,TB,QB,17,4500,41,16,378,3,0,0,0,0,0,0,0,21.5,365.8
6,Jahmyr Gibbs,DET,RB,17,0,0,0,1412,16,52,517,4,0,0,0,0,21.3,362.9
7,Jayden Daniels,WAS,QB,17,3568,25,9,891,6,0,0,0,0,0,0,0,20.9,355.8
8,Saquon Barkley,PHI,RB,16,0,0,0,2005,13,33,278,2,0,0,0,0,22.2,355.3
9,Bijan Robinson,ATL,RB,17,0,0,0,1456,14,61,431,1,0,0,0,0,20.1,341.7
10,Derrick Henry,BAL,RB,17,0,0,0,1921,16,19,193,2,0,0,0,0,19.8,336.4
11,Jared Goff,DET,QB,17,4629,37,12,56,0,1,7,1,0,0,0,0,19.1,324.5
12,Justin Jefferson,MIN,WR,17,22,0,0,3,0,103,1533,10,0,0,0,0,18.7,317.5
13,Bo Nix,DEN,QB,17,3775,29,12,430,4,1,2,1,0,0,0,0,18.7,317.2
14,Amon-Ra St. Brown,DET,WR,17,7,1,0,6,0,115,1263,12,0,0,0,0,18.6,316.2
15,Jalen Hurts,PHI,QB,15,2903,18,5,630,14,0,0,0,0,0,0,0,21,315.1
16,Sam Darnold,MIN,QB,17,4319,35,12,212,1,0,0,0,0,0,0,0,18.1,308
17,De'Von Achane,MIA,RB,17,0,0,0,907,6,78,592,6,0,0,0,0,17.6,299.9
18,Kyler Murray,ARI,QB,17,3851,21,11,572,5,0,0,0,0,0,0,0,17.5,297.2
19,Josh Jacobs,GB,RB,17,0,0,0,1329,15,36,342,1,0,0,0,0,17.2,293.1
20,Justin Herbert,LAC,QB,17,3870,23,3,306,2,0,0,0,0,0,0,0,16.8,285.4
21,Brian Thomas Jr.,JAX,WR,17,0,0,0,48,0,87,1282,10,0,0,0,0,16.7,284
22,Patrick Mahomes,KC,QB,16,3928,26,11,307,2,1,2,0,0,0,0,0,17.7,283
23,Drake London,ATL,WR,17,0,0,0,-3,0,100,1271,9,0,0,0,0,16.5,280.8
24,Malik Nabers,NYG,WR,15,0,0,0,2,0,109,1204,7,0,0,0,0,18.2,273.6
25,Kyren Williams,LAR,RB,16,0,0,0,1299,14,34,182,2,0,0,0,0,17,272.1
26,Terry McLaurin,WAS,WR,17,0,0,0,2,0,82,1096,13,0,0,0,0,15.8,267.8
27,Brock Purdy,SF,QB,15,3864,20,12,323,5,0,0,0,0,0,0,0,17.8,266.9
28,James Cook,BUF,RB,16,0,0,0,1009,16,32,258,2,0,0,0,0,16.7,266.7
29,Geno Smith,SEA,QB,17,4320,21,15,272,2,0,0,0,0,0,0,0,15.6,266
30,Alvin Kamara,NO,RB,14,0,0,0,950,6,68,543,2,0,0,0,0,18.9,265.3
31,CeeDee Lamb,DAL,WR,15,0,0,0,70,0,101,1194,6,0,0,0,0,17.6,263.4
32,Brock Bowers,LV,TE,17,0,0,0,13,0,112,1194,5,0,0,0,0,15.5,262.7
33,Aaron Rodgers,NYJ,QB,17,3897,28,11,107,0,0,0,0,0,0,0,0,15.1,256.6
34,Chase Brown,CIN,RB,16,0,0,0,990,7,54,360,4,0,0,0,0,15.9,255
35,Caleb Williams,CHI,QB,17,3541,20,6,489,0,0,0,0,0,0,0,0,15,254.5
36,James Conner,ARI,RB,16,0,0,0,1094,8,47,414,1,0,0,1,0,15.9,253.8
37,Jaxon Smith-Njigba,SEA,WR,17,35,0,0,26,0,100,1130,6,0,0,0,0,14.9,253
38,Garrett Wilson,NYJ,WR,17,0,0,0,5,0,101,1104,7,0,0,0,0,14.8,251.9
39,Trey McBride,ARI,TE,16,0,0,0,2,2,111,1146,2,0,0,0,0,15.6,249.8
40,Jonathan Taylor,IND,RB,14,0,0,0,1431,11,18,136,1,0,0,0,1,17.6,246.7
41,Bucky Irving,TB,RB,17,0,0,0,1122,8,47,392,0,0,0,0,1,14.4,244.4
42,Chuba Hubbard,CAR,RB,15,0,0,0,1195,10,43,171,1,0,0,0,0,16.1,241.6
43,Aaron Jones Sr.,MIN,RB,17,0,0,0,1138,5,51,408,2,0,0,0,0,14.2,241.6
44,Davante Adams,NYJ,WR,14,0,0,0,0,0,85,1063,8,0,0,0,0,17.2,241.3
45,Ladd McConkey,LAC,WR,16,0,0,0,0,0,82,1149,7,0,0,0,0,15.1,240.9
46,Jerry Jeudy,CLE,WR,17,0,0,0,0,0,90,1229,4,0,0,0,0,14.2,240.9
47,Breece Hall,NYJ,RB,16,0,0,0,876,5,57,483,3,0,0,0,0,15.1,240.9
48,Joe Mixon,HOU,RB,14,0,0,0,1016,11,36,309,1,0,0,0,0,17.2,240.5
49,Mike Evans,TB,WR,14,0,0,0,0,0,74,1004,11,0,0,0,0,17.2,240.4
50,Courtland Sutton,DEN,WR,17,30,1,0,0,0,81,1081,8,0,0,0,0,14.1,240.3
51,DJ Moore,CHI,WR,17,0,0,0,75,0,98,966,6,0,0,0,0,14,238.1
52,George Kittle,SF,TE,15,0,0,0,0,0,78,1106,8,0,0,0,0,15.8,236.6
53,Jordan Love,GB,QB,15,3389,25,11,83,1,0,0,0,0,0,0,0,15.6,233.9
54,Jonnu Smith,MIA,TE,17,0,0,0,-1,0,88,884,8,0,0,0,0,13.1,222.3
55,Tee Higgins,CIN,WR,12,0,0,0,0,0,73,911,10,0,0,0,0,18.5,222.1
56,David Montgomery,DET,RB,14,3,1,0,775,12,36,341,0,0,0,0,0,15.8,221.7
57,C.J. Stroud,HOU,QB,17,3727,20,12,233,0,0,0,0,0,0,0,0,13,220.4
58,Tyreek Hill,MIA,WR,17,0,0,0,53,0,81,959,6,0,0,0,0,12.8,218.2
59,Jakobi Meyers,LV,WR,15,0,0,0,23,0,87,1027,4,0,0,0,0,14.5,218
60,A.J. Brown,PHI,WR,13,0,0,0,0,0,67,1079,7,0,0,0,0,16.7,216.9
61,Matthew Stafford,LAR,QB,16,3762,20,8,41,0,0,0,0,0,0,0,0,13.4,214.6
62,D'Andre Swift,CHI,RB,17,0,0,0,959,6,42,386,0,0,0,0,0,12.6,214.5
63,Jordan Addison,MIN,WR,15,0,0,0,20,1,63,875,9,0,0,0,0,14.2,212.5
64,Jameson Williams,DET,WR,15,0,0,0,61,1,58,1001,7,0,0,0,0,14.1,212.2
65,Nico Collins,HOU,WR,12,0,0,0,0,0,68,1006,7,0,0,0,0,17.6,210.6
66,Jauan Jennings,SF,WR,15,0,0,0,0,0,77,975,6,0,0,0,0,14,210.5
67,Zay Flowers,BAL,WR,17,0,0,0,56,0,74,1059,4,0,0,0,0,12.3,209.5
68,Puka Nacua,LAR,WR,11,0,0,0,46,1,79,990,3,0,0,0,0,18.8,206.6
69,Najee Harris,PIT,RB,17,0,0,0,1043,6,36,283,0,0,0,0,0,12,204.6
70,Tony Pollard,TEN,RB,16,0,0,0,1079,5,41,238,0,0,0,0,0,12.5,200.7
71,Rachaad White,TB,RB,16,0,0,0,613,3,51,393,6,0,0,0,0,12.5,199.6
72,DeVonta Smith,PHI,WR,13,0,0,0,1,0,68,833,8,0,0,0,0,15.3,199.4
73,Calvin Ridley,TEN,WR,17,0,0,0,55,1,64,1017,4,0,0,0,0,11.7,199.2
74,Rico Dowdle,DAL,RB,16,0,0,0,1079,2,39,249,3,0,0,0,0,12.4,197.8
75,Jayden Reed,GB,WR,17,0,0,0,163,1,55,857,6,0,0,0,0,11.6,197
76,Marvin Harrison Jr.,ARI,WR,17,0,0,0,0,0,62,885,8,0,0,0,0,11.6,196.5
77,Travis Kelce,KC,TE,16,0,0,0,1,0,97,823,3,0,0,0,0,12.2,195.4
78,Bryce Young,CAR,QB,14,2403,15,9,249,6,0,0,0,0,0,0,0,13.9,195
79,Darnell Mooney,ATL,WR,16,0,0,0,0,0,64,992,5,0,0,0,0,12.1,193.2
80,J.K. Dobbins,LAC,RB,13,0,0,0,905,9,32,153,0,0,0,0,0,14.8,191.8
81,DK Metcalf,SEA,WR,15,0,0,0,0,0,66,992,5,0,0,0,0,12.7,191.2
82,Mark Andrews,BAL,TE,17,0,0,0,5,0,55,673,11,0,0,0,0,11.1,188.8
83,Xavier Worthy,KC,WR,17,0,0,0,104,3,59,638,6,0,0,0,0,11,187.2
84,Zach Charbonnet,SEA,RB,17,0,0,0,569,8,42,340,1,0,0,0,0,11,186.9
85,Keenan Allen,CHI,WR,15,0,0,1,0,0,70,744,7,0,0,0,0,12.3,184.4
86,Chris Boswell,PIT,K,17,0,0,0,0,0,0,0,0,0,0,0,0,10.8,184
87,Josh Downs,IND,WR,14,0,0,0,12,0,72,803,5,0,0,0,0,13.1,183.5
88,Wan'Dale Robinson,NYG,WR,17,0,0,0,18,0,93,699,3,0,0,0,0,10.7,182.7
89,Khalil Shakir,BUF,WR,15,0,0,0,4,0,76,821,4,0,0,0,0,12.2,182.5
90,Tyrone Tracy Jr.,NYG,RB,17,0,0,0,839,5,38,284,1,0,0,0,0,10.7,182.3
91,Tua Tagovailoa,MIA,QB,11,2867,19,7,49,0,0,0,0,0,0,0,0,16.5,181.6
92,Kenneth Walker III,SEA,RB,11,0,0,0,573,7,46,299,1,0,0,0,0,16.5,181.2
93,Brandon Aubrey,DAL,K,17,0,0,0,0,0,0,0,0,0,0,0,0,10.5,178
94,Zach Ertz,WAS,TE,17,0,0,0,0,0,66,654,7,0,0,0,0,10.4,177.4
95,Drake Maye,NE,QB,13,2276,15,10,421,2,0,0,0,0,0,0,0,13.6,177.1
96,Kirk Cousins,ATL,QB,14,3508,18,16,0,0,0,0,0,0,0,0,0,12.6,176.3
97,Rhamondre Stevenson,NE,RB,15,0,0,0,801,7,33,168,1,0,0,0,0,11.7,175.9
98,Cooper Kupp,LAR,WR,12,0,0,0,10,0,67,710,6,0,0,0,0,14.6,175
99,Quentin Johnston,LAC,WR,15,0,0,0,6,0,55,711,8,0,0,0,0,11.6,174.7
100,Sam LaPorta,DET,TE,16,0,0,0,0,0,60,726,7,0,0,0,0,10.9,174.6
101,Rashod Bateman,BAL,WR,17,0,0,0,0,0,45,756,9,0,0,0,0,10.3,174.6
102,Russell Wilson,PIT,QB,11,2482,16,5,155,2,0,0,0,0,0,0,0,15.7,172.8
103,Pat Freiermuth,PIT,TE,17,0,0,0,0,0,65,653,7,0,0,0,0,9.9,168.3
104,Cameron Dicker,LAC,K,17,0,0,0,0,0,0,0,0,0,0,0,0,9.9,168
105,Ka'imi Fairbairn,HOU,K,17,0,0,0,0,0,0,0,0,0,0,0,0,9.9,168
106,Michael Pittman Jr.,IND,WR,16,0,0,0,0,0,69,808,3,0,0,0,0,10.4,165.8
107,George Pickens,PIT,WR,14,0,0,0,-6,0,59,900,3,0,0,0,0,11.7,164.4
108,Anthony Richardson Sr.,IND,QB,11,1814,8,12,499,6,1,-1,0,0,0,0,0,14.9,163.4
109,Tucker Kraft,GB,TE,17,0,0,0,6,0,50,707,7,0,0,0,0,9.6,163.3
110,Alec Pierce,IND,WR,16,0,0,0,0,0,37,824,7,0,0,0,0,10.1,161.4
111,Jason Sanders,MIA,K,17,0,0,0,0,0,0,0,0,0,0,0,0,9.5,161
112,Chase McLaughlin,TB,K,17,0,0,0,0,0,0,0,0,0,0,0,0,9.4,160
113,Brian Robinson Jr.,WAS,RB,14,0,0,0,799,8,20,159,0,0,0,0,0,11.4,159.8
114,Javonte Williams,DEN,RB,17,0,0,0,513,4,52,346,0,0,0,0,0,9.3,157.9
115,Kareem Hunt,KC,RB,13,0,0,0,728,7,23,176,0,0,0,0,0,12,155.4
116,Jake Bates,DET,K,17,0,0,0,0,0,0,0,0,0,0,0,0,9.1,154
117,Deebo Samuel Sr.,SF,WR,15,0,0,0,136,1,51,670,3,0,0,0,0,10.2,153.6
118,Jalen Tolbert,DAL,WR,17,0,0,0,0,0,49,610,7,0,0,0,0,8.9,152
119,Derek Carr,NO,QB,10,2145,15,5,71,1,0,0,0,0,0,0,0,15.1,150.9
120,Jaylen Waddle,MIA,WR,15,0,0,0,12,0,58,744,2,0,0,0,0,10,149.6
121,Wil Lutz,DEN,K,17,0,0,0,0,0,0,0,0,0,0,0,0,8.8,149
122,David Njoku,CLE,TE,11,0,0,0,0,0,64,505,5,0,0,0,0,13.5,148.5
123,DeMario Douglas,NE,WR,17,0,0,0,16,0,66,621,3,0,0,0,0,8.7,147.7
124,DeAndre Hopkins,KC,WR,16,0,0,0,0,0,56,610,5,0,0,0,0,9.2,147
125,Hunter Henry,NE,TE,16,0,0,0,0,0,66,674,2,0,0,0,0,9.1,145.4
126,Trevor Lawrence,JAX,QB,10,2045,11,7,119,3,0,-5,0,0,0,0,0,14.5,145.2
127,Rome Odunze,CHI,WR,17,0,0,0,15,0,54,734,3,0,0,0,0,8.5,144.9
128,Mike Gesicki,CIN,TE,17,0,0,0,0,0,65,665,2,0,0,0,0,8.3,141.5
129,Cade Otton,TB,TE,14,0,0,0,-4,0,59,600,4,0,0,0,0,10,140.6
130,Ray-Ray McCloud III,ATL,WR,17,0,0,0,79,0,62,686,1,0,0,0,0,8.3,140.5
131,Tank Dell,HOU,WR,14,0,0,0,43,0,51,667,3,0,0,0,0,10,140
132,Adam Thielen,CAR,WR,10,0,0,0,0,0,48,615,5,0,0,0,0,13.9,139.5
133,Daniel Carlson,LV,K,17,0,0,0,0,0,0,0,0,0,0,0,0,8.2,139
134,Tyler Bass,BUF,K,17,0,0,0,0,0,0,0,0,0,0,0,0,8.2,139
135,Justin Tucker,BAL,K,17,0,0,0,0,0,0,0,0,0,0,0,0,8.1,138
136,Chris Godwin,TB,WR,7,0,0,0,2,0,50,576,5,0,0,0,0,19.7,137.8
137,Alexander Mattison,LV,RB,14,0,0,0,420,4,36,294,1,0,0,0,0,9.8,137.4
138,Nick Westbrook-Ikhine,TEN,WR,17,0,0,0,0,0,32,497,9,0,0,0,0,8,135.7
139,Jalen McMillan,TB,WR,13,0,0,0,43,0,37,461,8,0,0,0,0,10.4,135.4
140,Daniel Jones,NYG,QB,10,2070,8,7,265,2,0,0,0,0,0,0,0,13.5,135.3
141,Jerome Ford,CLE,RB,14,0,0,0,565,3,37,225,0,0,0,0,0,9.6,134
142,Jason Myers,SEA,K,17,0,0,0,0,0,0,0,0,0,0,0,0,7.8,133
143,Jake Elliott,PHI,K,17,0,0,0,0,0,0,0,0,0,0,0,0,7.8,133
144,Austin Ekeler,WAS,RB,12,0,0,0,367,4,35,366,0,0,0,0,0,11,132.3
145,Romeo Doubs,GB,WR,13,0,0,0,0,0,46,601,4,0,0,0,0,10.2,132.1
146,Matt Gay,IND,K,16,0,0,0,0,0,0,0,0,0,0,0,0,8.2,132
147,Kyle Pitts Sr.,ATL,TE,17,0,0,0,0,0,47,602,4,0,0,0,0,7.7,131.2
148,Jameis Winston,CLE,QB,12,2121,13,12,83,1,0,0,0,0,0,0,0,10.9,131.1
149,Joshua Karty,LAR,K,17,0,0,0,0,0,0,0,0,0,0,0,0,7.7,131
150,Travis Etienne Jr.,JAX,RB,15,0,0,0,558,2,39,254,0,0,0,0,0,8.7,130.2
151,Marvin Mims Jr.,DEN,WR,17,0,0,0,42,0,39,503,6,0,0,0,0,7.6,129.5
152,Tre Tucker,LV,WR,17,0,0,0,44,1,47,539,3,0,0,0,0,7.6,129.3
153,Tank Bigsby,JAX,RB,16,0,0,0,766,7,7,54,0,0,0,0,0,8.1,129
154,Justice Hill,BAL,RB,15,0,0,0,228,1,42,383,3,0,0,0,0,8.5,127.1
155,Allen Lazard,NYJ,WR,12,0,0,0,0,0,37,530,6,0,0,0,0,10.5,126
156,Will Reichard,MIN,K,13,0,0,0,0,0,0,0,0,0,0,0,0,9.7,126
157,Ameer Abdullah,LV,RB,16,0,0,0,311,2,40,261,3,0,0,0,0,7.8,125.2
158,Xavier Legette,CAR,WR,16,0,0,0,24,0,49,497,4,0,0,0,0,7.8,125.1
159,Michael Wilson,ARI,WR,16,0,0,0,7,0,47,548,4,0,0,0,1,7.8,124.5
160,Jaylen Warren,PIT,RB,15,0,0,0,511,1,38,310,0,0,0,0,0,8.3,124.1
161,Blake Grupe,NO,K,17,0,0,0,0,0,0,0,0,0,0,0,0,7.3,124
162,Isaiah Likely,BAL,TE,16,0,0,0,0,0,42,477,6,0,0,0,0,7.7,123.7
163,Demarcus Robinson,LAR,WR,17,0,0,0,0,0,31,505,7,0,0,0,0,7.3,123.5
164,Juwan Johnson,NO,TE,17,0,0,0,0,0,50,548,3,0,0,0,0,7.2,122.8
165,Amari Cooper,BUF,WR,14,0,0,0,0,0,44,547,4,0,0,0,0,8.8,122.7
166,Stefon Diggs,HOU,WR,8,13,0,0,8,1,47,496,3,0,0,0,0,15.2,121.9
167,Tyler Conklin,NYJ,TE,16,0,0,0,0,0,51,449,4,0,0,0,0,7.6,121.9
168,Kayshon Boutte,NE,WR,15,0,0,0,0,0,43,589,3,0,0,0,0,8.1,121.9
169,Tyler Lockett,SEA,WR,17,0,0,0,0,0,49,600,2,0,0,0,0,7.1,121
170,Elijah Moore,CLE,WR,17,0,0,0,1,0,61,538,1,0,0,0,0,7.1,120.9
171,Cole Kmet,CHI,TE,17,0,0,0,0,0,47,474,4,0,0,0,0,7.1,120.4
172,Will Levis,TEN,QB,12,2091,13,12,183,0,0,0,0,0,0,0,0,10,119.9
173,Andrei Iosivas,CIN,WR,17,0,0,0,0,0,36,479,6,0,0,0,0,7.1,119.9
174,Justin Fields,PIT,QB,10,1106,5,1,289,5,0,0,0,0,0,0,0,11.9,119.1
175,Dalton Schultz,HOU,TE,17,0,0,0,0,0,53,532,2,0,0,0,0,7,118.2
176,Chad Ryland,ARI,K,13,0,0,0,0,0,0,0,0,0,0,0,0,9.1,118
177,Cam Little,JAX,K,17,0,0,0,0,0,0,0,0,0,0,0,0,6.9,118
178,Dak Prescott,DAL,QB,8,1978,11,8,54,1,0,0,0,0,0,0,0,14.6,116.5
179,Ray Davis,BUF,RB,17,0,0,0,442,3,17,189,3,0,0,0,0,6.8,116.1
180,Jordan Mason,SF,RB,12,0,0,0,789,3,11,91,0,0,0,0,0,9.6,115
181,Joey Slye,NE,K,17,0,0,0,0,0,0,0,0,0,0,0,0,6.8,115
182,Olamide Zaccheaus,WAS,WR,17,0,0,0,8,0,45,506,3,0,0,0,0,6.7,114.4
183,Tyjae Spears,TEN,RB,12,0,0,0,312,4,30,224,1,0,0,0,0,9.5,113.6
184,Chig Okonkwo,TEN,TE,17,0,0,0,17,0,52,479,2,0,0,0,0,6.7,113.6
185,Noah Gray,KC,TE,17,0,0,0,-4,0,40,437,5,0,0,0,0,6.7,113.3
186,Younghoe Koo,ATL,K,14,0,0,0,0,0,0,0,0,0,0,0,0,8.1,113
187,Calvin Austin III,PIT,WR,17,0,0,0,0,0,36,548,4,0,0,0,0,6.6,112.8
188,Jake Moody,SF,K,14,0,0,0,0,0,0,0,0,0,0,0,0,8,112
189,Keon Coleman,BUF,WR,13,0,0,0,9,0,29,556,4,0,0,0,0,8.6,111.5
190,Dontayvion Wicks,GB,WR,17,0,0,0,0,0,39,415,5,0,0,0,0,6.5,110.5
191,Will Dissly,LAC,TE,15,0,0,0,0,0,50,481,2,0,0,0,0,7.3,110.1
192,Darius Slayton,NYG,WR,16,0,0,0,17,0,39,573,2,0,0,0,0,6.9,110
193,Cooper Rush,DAL,QB,12,1844,12,5,18,0,0,0,0,0,0,0,0,9.1,109.6
194,Austin Hooper,NE,TE,17,0,0,0,0,0,45,476,3,0,0,0,0,6.4,108.6
195,Joshua Palmer,LAC,WR,15,0,0,0,0,0,39,584,1,0,0,0,0,7.2,107.4
196,Austin Seibert,WAS,K,9,0,0,0,0,0,0,0,0,0,0,0,0,11.9,107
197,Devaughn Vele,DEN,WR,13,0,0,0,0,0,41,475,3,0,0,0,0,8.2,106.5
198,Tyler Allgeier,ATL,RB,17,0,0,0,644,3,13,88,0,0,0,0,0,6.2,106.2
199,Christian Watson,GB,WR,15,0,0,0,23,0,29,620,2,0,0,0,0,7,105.3
200,Jalen Nailor,MIN,WR,17,0,0,0,-4,0,28,414,6,0,0,1,0,6.2,105
201,Jake Ferguson,DAL,TE,14,0,0,0,0,0,59,494,0,0,0,0,0,7.5,104.4
202,Noah Fant,SEA,TE,14,0,0,0,0,0,48,500,1,0,0,0,0,7.4,104
203,Cairo Santos,CHI,K,17,0,0,0,0,0,0,0,0,0,0,0,0,6.1,104
204,Dallas Goedert,PHI,TE,10,0,0,0,0,0,42,496,2,0,0,0,0,10.4,103.6
205,Antonio Gibson,NE,RB,17,0,0,0,538,1,23,206,0,0,0,0,0,6.1,103.4
206,Foster Moreau,NO,TE,17,0,0,0,0,0,32,413,5,0,0,0,0,6.1,103.3
207,Taysom Hill,NO,QB,8,21,0,1,278,6,23,187,0,0,0,1,0,12.8,102.3
208,Eddy Piñeiro,CAR,K,17,0,0,0,0,0,0,0,0,0,0,0,0,5.9,101
209,Dalton Kincaid,BUF,TE,13,0,0,0,0,0,44,448,2,0,0,0,0,7.8,100.8
210,Nick Folk,TEN,K,14,0,0,0,0,0,0,0,0,0,0,0,0,7.1,100
211,Joe Flacco,IND,QB,8,1761,12,7,26,0,0,0,0,0,0,0,0,12.4,99
212,Tutu Atwell,LAR,WR,17,0,0,0,7,0,42,562,0,0,0,0,0,5.8,98.9
213,Mack Hollins,BUF,WR,17,0,0,0,0,0,31,378,5,0,0,0,1,5.8,98.8
214,Jaleel McLaughlin,DEN,RB,16,0,0,0,496,1,24,76,2,0,0,0,0,6.1,97.2
215,Parker Washington,JAX,WR,17,0,0,0,0,1,32,390,3,0,0,0,0,5.7,97
216,Devin Singletary,NYG,RB,15,0,0,0,437,4,21,119,0,0,0,0,0,6.4,96.6
217,Gardner Minshew,LV,QB,10,2013,9,10,58,0,0,0,0,0,0,0,0,9.6,96.3
218,Mac Jones,JAX,QB,10,1672,8,8,92,1,0,0,0,0,0,0,0,9.6,96.1
219,Emanuel Wilson,GB,RB,17,0,0,0,502,4,11,48,1,0,0,0,0,5.6,96
220,Brandon McManus,GB,K,11,0,0,0,0,0,0,0,0,0,0,0,0,8.7,96
221,Harrison Butker,KC,K,13,0,0,0,0,0,0,0,0,0,0,0,0,7.4,96
222,Mason Rudolph,TEN,QB,8,1530,9,9,106,1,0,0,0,0,0,0,0,12,95.8
223,Isaac Guerendo,SF,RB,16,0,0,0,420,4,15,152,0,0,0,0,0,5.9,94.2
224,Ricky Pearsall,SF,WR,11,0,0,0,45,0,31,400,3,0,0,0,0,8.5,93.5
225,Aidan O'Connell,LV,QB,9,1612,8,4,30,1,0,0,0,0,0,0,0,10.4,93.5
226,Cam Akers,MIN,RB,17,0,0,0,444,2,14,68,3,0,0,0,0,5.5,93.2
227,Jalen Coker,CAR,WR,11,19,0,0,0,0,32,478,2,0,0,0,0,8.4,92.6
228,Tim Patrick,DET,WR,16,0,0,0,0,0,33,394,3,0,0,0,0,5.8,92.4
229,KaVontae Turpin,DAL,WR,17,0,0,0,92,0,31,420,2,0,0,0,0,5.4,92.2
230,Ty Johnson,BUF,RB,17,0,0,0,213,1,18,284,3,0,0,0,0,5.4,91.7
231,Brenton Strange,JAX,TE,17,0,0,0,0,0,40,411,2,0,0,0,0,5.4,91.1
232,Jordan Akins,CLE,TE,17,0,0,0,0,0,40,390,2,0,0,0,0,5.4,91
233,Evan McPherson,CIN,K,12,0,0,0,0,0,0,0,0,0,0,0,0,7.6,91
234,Greg Dortch,ARI,WR,17,0,0,0,31,0,37,342,3,0,0,0,0,5.3,90.3
235,Evan Engram,JAX,TE,9,0,0,0,0,0,47,365,1,0,0,0,0,9.9,89.5
236,Diontae Johnson,HOU,WR,12,0,0,0,6,0,33,375,3,0,0,0,0,7.4,89.1
237,T.J. Hockenson,MIN,TE,10,0,0,0,0,0,41,455,0,0,0,0,0,8.7,86.5
238,Noah Brown,WAS,WR,11,0,0,0,0,0,35,453,1,0,0,0,0,7.8,86.3
239,Braelon Allen,NYJ,RB,17,0,0,0,334,2,19,148,1,0,0,0,0,5,85.2
240,David Moore,CAR,WR,17,0,0,0,0,0,32,351,3,0,0,0,0,5,85.1
241,Marquez Valdes-Scantling,NO,WR,14,0,0,0,4,0,19,411,4,0,0,0,0,6,84.5
242,Zack Moss,CIN,RB,8,0,0,0,242,2,23,187,1,0,0,0,0,10.2,81.9
243,Samaje Perine,KC,RB,17,0,0,0,92,1,28,322,1,0,0,0,1,4.8,81.4
244,Cedric Tillman,CLE,WR,11,0,0,0,-5,0,29,339,3,0,0,0,0,7.3,80.4
245,Sterling Shepard,TB,WR,14,0,0,0,69,0,32,334,1,0,0,0,0,5.7,80.3
246,Drew Lock,NYG,QB,8,1071,6,5,133,2,0,0,0,0,0,0,0,10,80.1
247,Dustin Hopkins,CLE,K,16,0,0,0,0,0,0,0,0,0,0,0,0,4.9,79
248,AJ Barner,SEA,TE,17,0,0,0,0,0,30,245,4,0,0,0,0,4.6,78.5
249,Tyler Boyd,TEN,WR,16,0,0,0,3,0,39,390,0,0,0,0,0,4.9,78.3
250,Roschon Johnson,CHI,RB,14,0,0,0,150,6,16,104,0,0,0,0,0,5.5,77.4
251,Miles Sanders,CAR,RB,11,0,0,0,205,2,24,148,1,0,0,0,0,7,77.3
252,Deshaun Watson,CLE,QB,7,1148,5,3,148,1,0,0,0,0,0,0,0,11,76.7
253,Chris Olave,NO,WR,8,0,0,0,7,0,32,400,1,0,0,0,0,9.6,76.7
254,Rashid Shaheed,NO,WR,6,0,0,0,29,0,20,349,3,0,0,0,0,12.6,75.8
255,Ja'Tavion Sanders,CAR,TE,16,0,0,0,0,0,33,342,1,0,0,0,0,4.6,73.2
256,Raheem Mostert,MIA,RB,13,0,0,0,278,2,19,161,0,0,0,0,0,5.5,70.9
257,Christian Kirk,JAX,WR,8,0,0,0,0,0,27,379,1,0,0,0,0,8.9,70.9
258,Brandin Cooks,DAL,WR,10,0,0,0,-3,0,26,259,3,0,0,0,0,7,69.6
259,Sean Tucker,TB,RB,17,0,0,0,308,2,9,109,1,0,0,0,0,4,68.7
260,Theo Johnson,NYG,TE,12,0,0,0,0,0,29,331,1,0,0,0,0,5.7,68.1
261,Dyami Brown,WAS,WR,16,0,0,0,26,0,30,308,1,0,0,0,0,4.2,67.4
262,Spencer Rattler,NO,QB,7,1317,4,5,146,0,0,0,0,0,0,0,0,9.6,67.3
263,Troy Franklin,DEN,WR,16,0,0,0,8,0,28,263,2,0,0,0,0,4.2,67.1
264,Josh Oliver,MIN,TE,15,0,0,0,0,0,22,258,3,0,0,0,0,4.4,65.8
265,Colby Parkinson,LAR,TE,17,0,0,0,0,0,30,294,1,0,0,0,0,3.8,65.4
266,Kendrick Bourne,NE,WR,12,0,0,0,6,0,28,305,1,0,0,0,0,5.4,65.1
267,Rashee Rice,KC,WR,4,0,0,0,1,0,24,288,2,0,0,1,0,16.2,64.9
268,Lil'Jordan Humphrey,DEN,WR,17,0,0,0,0,0,31,293,1,0,0,0,0,3.8,64.3
269,Gus Edwards,LAC,RB,11,0,0,0,365,4,3,6,0,0,0,0,0,5.8,64.1
270,Jeremy McNichols,WAS,RB,17,0,0,0,261,4,9,27,0,0,0,0,0,3.8,63.8
271,Curtis Samuel,BUF,WR,14,0,0,0,14,0,31,253,1,0,0,0,0,4.5,63.7
272,Van Jefferson,PIT,WR,17,0,0,0,0,0,24,276,2,0,0,0,0,3.7,63.6
273,Nick Chubb,CLE,RB,8,0,0,0,332,3,5,31,1,0,0,0,0,7.9,63.3
274,Justin Watson,KC,WR,17,0,0,0,0,0,22,289,2,0,0,0,0,3.7,62.9
275,Kenneth Gainwell,PHI,RB,17,0,0,0,290,1,16,116,0,0,0,0,0,3.7,62.6
276,Brandon Aiyuk,SF,WR,7,0,0,0,0,0,25,374,0,0,0,0,0,8.9,62.4
277,Tyler Johnson,LAR,WR,15,0,0,0,0,0,26,291,1,0,0,0,0,4.1,61.1
278,Greg Joseph,NYJ,K,8,0,0,0,0,0,0,0,0,0,0,0,0,7.6,61
279,Josh Whyle,TEN,TE,17,0,0,0,0,0,28,248,1,0,0,0,0,3.6,60.8
280,Tyler Huntley,MIA,QB,5,829,3,3,135,2,0,0,0,0,0,0,0,12.1,60.7
281,Grant Calcaterra,PHI,TE,17,0,0,0,0,0,24,298,1,0,0,0,0,3.5,59.8
282,Dawson Knox,BUF,TE,16,0,0,0,0,0,22,311,1,0,0,0,0,3.7,59.1
283,Andy Dalton,CAR,QB,6,989,7,6,34,0,0,0,0,0,0,0,0,9.8,59
284,Kyle Juszczyk,SF,FB,17,0,0,0,26,1,19,200,2,0,0,0,0,3.4,57.6
285,Ezekiel Elliott,DAL,RB,15,0,0,0,226,3,12,69,0,0,0,0,0,3.8,57.5
286,Luke Schoonmaker,DAL,TE,17,0,0,0,0,0,27,241,1,0,0,0,0,3.4,57.1
287,Anders Carlson,NYJ,K,7,0,0,0,0,0,0,0,0,0,0,0,1,8.1,57
288,Isiah Pacheco,KC,RB,7,0,0,0,310,1,12,79,0,0,0,0,0,8.1,56.9
289,Malik Washington,MIA,WR,14,0,0,0,25,1,26,223,0,0,0,0,0,4.1,56.8
290,Mike Williams,PIT,WR,18,0,0,0,0,0,21,298,1,0,0,0,0,3.2,56.8
291,Tommy Tremble,CAR,TE,12,0,0,0,0,0,23,234,2,0,0,0,0,4.7,56.4
292,Dare Ogunbowale,HOU,RB,17,0,0,0,112,0,19,198,1,0,0,1,0,3.3,56
293,John Metchie III,HOU,WR,13,0,0,0,0,0,24,254,1,0,0,0,0,4.3,55.4
294,Emari Demercado,ARI,RB,13,0,0,0,223,1,16,104,0,0,0,0,0,4.2,54.7
295,Brayden Narveson,TEN,K,7,0,0,0,0,0,0,0,0,0,0,0,0,7.7,54
296,Gabe Davis,JAX,WR,10,0,0,0,0,0,20,239,2,0,0,0,0,5.4,53.9
297,Trey Sermon,IND,RB,17,0,0,0,159,2,16,99,0,0,0,0,0,3.2,53.8
298,Adonai Mitchell,IND,WR,17,24,0,0,6,0,23,312,0,0,0,0,0,3.2,53.8
299,JuJu Smith-Schuster,KC,WR,14,0,0,0,0,0,18,231,2,0,0,0,0,3.8,53.1
300,Matthew Wright,TEN,K,5,0,0,0,0,0,0,0,0,0,0,0,0,10.6,53
301,Jordan Whittington,LAR,WR,15,0,0,0,12,0,22,293,0,0,0,0,1,3.5,52.5
302,Cedrick Wilson Jr.,NO,WR,15,21,1,0,0,0,20,211,1,0,0,0,0,3.5,51.9
303,Malik Willis,GB,QB,7,550,3,0,138,1,0,0,0,0,0,0,0,7.4,51.8
304,Kalif Raymond,DET,WR,12,0,0,0,0,0,17,215,2,0,0,0,0,4.2,50.5
305,Elijah Higgins,ARI,TE,17,0,0,0,0,0,20,172,2,0,0,0,0,2.9,49.2
306,Nelson Agholor,BAL,WR,14,0,0,0,0,0,14,231,2,0,0,0,0,3.5,49.1
307,Audric Estime,DEN,RB,13,0,0,0,310,2,5,27,0,0,0,0,0,3.7,48.7
308,Nick Vannett,TEN,TE,17,0,0,0,0,0,17,135,3,0,0,0,0,2.9,48.5
309,Christian McCaffrey,SF,RB,4,0,0,0,202,0,15,146,0,0,0,0,0,11.9,47.8
310,DJ Turner,LV,WR,12,0,0,0,33,1,16,158,1,0,0,0,0,3.9,47.1
311,Trey Benson,ARI,RB,13,0,0,0,291,1,6,59,0,0,0,0,0,3.6,47
312,Graham Gano,NYG,K,10,0,0,0,0,0,0,0,0,0,0,0,0,4.6,46
313,Isaiah Davis,NYJ,RB,17,0,0,0,174,1,9,75,1,0,0,0,0,2.7,45.9
314,Marcus Mariota,WAS,QB,3,364,4,0,92,1,0,0,0,0,0,0,0,15.3,45.8
315,Jacoby Brissett,NE,QB,8,826,2,1,62,0,0,0,0,0,0,0,0,5.7,45.2
316,Johnny Mundt,MIN,TE,17,0,0,0,0,0,19,142,2,0,0,0,0,2.7,45.2
317,Cade York,CIN,K,6,0,0,0,0,0,0,0,0,0,0,0,0,7.5,45
318,Darnell Washington,PIT,TE,17,0,0,0,0,0,19,200,1,0,0,0,0,2.6,45
319,Tyler Goodson,IND,RB,16,0,0,0,153,1,11,61,1,0,0,0,0,2.8,44.4
320,Michael Penix Jr.,ATL,QB,5,775,3,3,11,1,0,0,0,0,0,0,0,8.8,44.1
321,Adam Trautman,DEN,TE,17,0,0,0,0,0,13,188,2,0,0,0,0,2.6,43.8
322,Dameon Pierce,HOU,RB,11,0,0,0,293,2,2,2,0,0,0,0,0,4,43.5
323,Nate Adkins,DEN,TE,17,0,0,0,0,0,14,115,3,0,0,0,0,2.6,43.5
324,Chris Brooks,GB,RB,15,0,0,0,183,1,11,69,0,0,0,0,0,2.8,42.2
325,Parker Romo,MIN,K,4,0,0,0,0,0,0,0,0,0,0,0,0,10.5,42
326,Jahan Dotson,PHI,WR,17,0,0,0,13,0,19,216,0,0,0,0,0,2.5,41.9
327,Derius Davis,LAC,WR,15,0,0,0,39,0,13,112,2,0,0,0,0,2.7,40.1
328,Greg Zuerlein,NYJ,K,8,0,0,0,0,0,0,0,0,0,0,0,0,5,40
329,Tanner Hudson,CIN,TE,11,0,0,0,1,0,19,154,1,0,0,0,0,3.5,38.5
330,Josh Reynolds,JAX,WR,9,0,0,0,0,0,13,194,1,0,0,0,0,4.3,38.4
331,Robert Woods,HOU,WR,15,0,0,0,0,0,20,203,0,0,0,0,0,2.6,38.3
332,Cordarrelle Patterson,PIT,RB,13,0,0,0,135,0,12,80,1,0,0,0,0,2.9,37.5
333,Jamaal Williams,NO,RB,14,0,0,0,164,1,9,57,0,0,0,0,0,2.6,37.1
334,Ryan Miller,TB,WR,11,0,0,0,0,0,12,128,2,0,0,0,0,3.3,36.8
335,Michael Mayer,LV,TE,11,0,0,0,0,0,21,156,0,0,0,0,0,3.3,36.6
336,Drew Sample,CIN,TE,17,0,0,0,-4,0,20,109,1,0,0,1,0,2.1,36.5
337,Tylan Wallace,BAL,WR,17,0,0,0,0,0,11,193,1,0,0,0,0,2.1,36.3
338,D'Ernest Johnson,JAX,RB,14,0,0,0,143,0,12,96,0,0,0,0,0,2.6,35.9
339,Erick All Jr.,CIN,TE,9,0,0,0,0,0,20,158,0,0,0,0,0,4,35.8
340,Michael Carter,ARI,RB,3,0,0,0,131,1,11,57,0,0,0,0,0,11.9,35.8
341,Jalen Brooks,DAL,WR,14,0,0,0,0,0,12,177,1,0,0,0,0,2.6,35.7
342,Trey Palmer,TB,WR,15,0,0,0,0,0,12,172,1,0,0,0,0,2.3,35.2
343,Pierre Strong Jr.,CLE,RB,14,0,0,0,108,0,14,104,0,0,0,0,0,2.5,35.2
344,Brock Wright,DET,TE,17,0,0,0,0,0,13,100,2,0,0,0,0,2.1,35
345,Stone Smartt,LAC,TE,15,0,0,0,0,0,16,208,0,0,0,0,0,2.3,34.8
346,Luke McCaffrey,WAS,WR,17,0,0,0,0,0,18,168,0,0,0,0,0,2,34.8
347,Payne Durham,TB,TE,16,0,0,0,0,0,11,115,2,0,0,0,0,2.2,34.5
348,Cade Stover,HOU,TE,15,0,0,0,0,0,15,133,1,0,0,0,0,2.3,34.3
349,Lucas Krull,DEN,TE,13,0,0,0,0,0,19,152,0,0,0,0,0,2.6,34.2
350,Zane Gonzalez,WAS,K,6,0,0,0,0,0,0,0,0,0,0,0,0,5.7,34
351,Blake Corum,LAR,RB,17,0,0,0,207,0,7,58,0,0,0,0,0,2,33.5
352,Mecole Hardman,KC,WR,12,0,0,0,62,1,12,90,0,0,0,0,0,2.8,33.2
353,Hassan Haskins,LAC,RB,17,0,0,0,89,2,3,49,1,0,0,0,0,1.9,32.8
354,Ja'Lynn Polk,NE,WR,15,0,0,0,0,0,12,87,2,0,0,0,0,2.2,32.7
355,Kimani Vidal,LAC,RB,10,0,0,0,155,0,5,62,1,0,0,0,0,3.3,32.7
356,Mo Alie-Cox,IND,TE,17,0,0,0,0,0,12,147,1,0,0,0,0,1.9,32.7
357,D'Onta Foreman,CLE,RB,11,0,0,0,232,0,6,54,0,0,0,0,0,3,32.6
358,Kylen Granson,IND,TE,17,0,0,0,0,0,14,182,0,0,0,0,0,1.9,32.2
359,Jonathan Mingo,DAL,WR,17,0,0,0,5,0,17,167,0,0,0,0,0,1.9,32.2
360,Dante Pettis,NO,WR,8,0,0,0,0,0,12,120,1,0,0,0,0,4,32
361,Malik Heath,GB,WR,13,0,0,0,0,0,10,97,2,0,0,0,0,2.4,31.7
362,Khalil Herbert,CIN,RB,14,0,0,0,130,1,10,25,0,0,0,0,0,2.2,31.5
363,Chris Rodriguez Jr.,WAS,RB,9,0,0,0,173,2,1,12,0,0,0,0,0,3.5,31.5
364,Joshua Dobbs,SF,QB,2,361,2,2,24,2,0,0,0,0,0,0,0,15.4,30.8
365,Riley Patterson,ATL,K,5,0,0,0,0,0,0,0,0,0,0,0,0,6,30
366,Matt Prater,ARI,K,4,0,0,0,0,0,0,0,0,0,0,0,0,7.5,30
367,Patrick Taylor Jr.,SF,RB,13,0,0,0,183,1,3,25,0,0,0,0,0,2.3,29.8
368,Jake Bobo,SEA,WR,17,0,0,0,0,0,13,107,1,0,0,0,0,1.7,29.7
369,Zamir White,LV,RB,8,0,0,0,183,1,6,30,0,0,0,0,0,3.7,29.3
370,Michael Burton,DEN,FB,17,0,0,0,8,1,10,65,1,0,0,0,0,1.7,29.3
371,Kendre Miller,NO,RB,6,0,0,0,148,1,5,33,0,0,0,0,0,4.9,29.1
372,Tanner McKee,PHI,QB,2,323,4,0,-1,0,0,0,0,0,0,0,0,14.4,28.8
373,JaMycal Hasty,NE,RB,15,0,0,0,69,0,10,59,1,0,0,0,0,1.9,28.8
374,Jeremy Ruckert,NYJ,TE,17,0,0,0,0,0,18,105,0,0,0,0,0,1.7,28.5
375,Ty Chandler,MIN,RB,17,0,0,0,182,0,6,42,0,0,0,0,0,1.7,28.4
376,Charlie Kolar,BAL,TE,13,0,0,0,2,0,9,131,1,0,0,0,0,2.2,28.3
377,Jamison Crowder,WAS,WR,6,0,0,0,0,0,9,72,2,0,0,0,0,4.7,28.2
378,Sincere McCormick,LV,RB,5,0,0,0,183,0,6,29,0,0,0,0,0,5.4,27.2
379,Kevin Austin Jr.,NO,WR,8,0,0,0,9,0,11,151,0,0,0,0,0,3.4,27
380,Hunter Luepke,DAL,RB,16,0,0,0,38,0,12,111,0,0,0,0,0,1.7,26.9
381,Bub Means,NO,WR,7,0,0,0,0,0,9,118,1,0,0,0,0,3.8,26.8
382,Eric Saubert,SF,TE,17,0,0,0,0,0,11,97,1,0,0,0,0,1.6,26.7
383,Jaylen Wright,MIA,RB,15,0,0,0,249,0,3,8,0,0,0,0,0,1.8,26.7
384,Tyler Higbee,LAR,TE,3,0,0,0,0,0,8,66,2,0,0,0,0,8.9,26.6
385,Daniel Bellinger,NYG,TE,17,0,0,0,0,0,14,125,0,0,0,0,0,1.6,26.5
386,Alec Ingold,MIA,FB,15,0,0,0,17,1,11,96,0,0,0,0,0,1.8,26.3
387,Jordan Mims,NO,RB,11,0,0,0,70,0,12,71,0,0,0,0,0,2.4,26.1
388,KhaDarel Hodge,ATL,WR,17,0,0,0,0,0,7,131,1,0,0,0,1,1.5,26.1
389,Drew Ogletree,IND,TE,17,0,0,0,0,0,9,109,1,0,0,0,0,1.5,25.9
390,Kenny Pickett,PHI,QB,5,291,2,1,15,1,0,0,0,0,0,0,0,5,25.1
391,Spencer Shrader,KC,K,4,0,0,0,0,0,0,0,0,0,0,0,0,6,24
392,Carson Steele,KC,FB,17,0,0,0,183,0,7,26,0,0,0,0,0,1.4,23.9
393,Mason Tipton,NO,WR,11,0,0,0,0,0,14,99,0,0,0,0,0,2.2,23.9
394,Xavier Hutchinson,HOU,WR,16,0,0,0,0,0,12,117,0,0,0,0,0,1.5,23.7
395,Bo Melton,GB,WR,17,0,0,0,54,0,8,91,0,0,0,0,1,1.3,22.5
396,Kenny McIntosh,SEA,RB,17,0,0,0,172,0,3,22,0,0,0,0,0,1.3,22.4
397,Trent Sherfield Sr.,MIN,WR,17,0,0,0,0,0,8,83,1,0,0,0,0,1.3,22.3
398,Julian Hill,MIA,TE,16,0,0,0,0,0,12,100,0,0,0,0,0,1.4,22
399,Desmond Ridder,LV,QB,5,458,2,2,36,0,0,0,0,0,0,0,0,4.4,21.9
400,Rakim Jarrett,TB,WR,10,0,0,0,0,0,9,124,0,0,0,0,0,2.1,21.4
`);
  