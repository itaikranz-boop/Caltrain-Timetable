import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STATION METADATA — ordered north→south (SF=0, Tamien=last)
// ─────────────────────────────────────────────────────────────────────────────
const STATIONS = [
  { id:"SF",  name:"San Francisco",       short:"SF (4th & King)",   zone:1 },
  { id:"22S", name:"22nd Street",         short:"22nd Street",       zone:1 },
  { id:"BAY", name:"Bayshore",            short:"Bayshore",          zone:1 },
  { id:"SSF", name:"South San Francisco", short:"S. San Francisco",  zone:1 },
  { id:"SBR", name:"San Bruno",           short:"San Bruno",         zone:2 },
  { id:"MIL", name:"Millbrae",            short:"Millbrae",          zone:2 },
  { id:"BRW", name:"Broadway",            short:"Broadway",          zone:2 },
  { id:"BUR", name:"Burlingame",          short:"Burlingame",        zone:2 },
  { id:"SMT", name:"San Mateo",           short:"San Mateo",         zone:2 },
  { id:"HWP", name:"Hayward Park",        short:"Hayward Park",      zone:2 },
  { id:"HSD", name:"Hillsdale",           short:"Hillsdale",         zone:2 },
  { id:"BEL", name:"Belmont",             short:"Belmont",           zone:2 },
  { id:"SCA", name:"San Carlos",          short:"San Carlos",        zone:2 },
  { id:"RWC", name:"Redwood City",        short:"Redwood City",      zone:3 },
  { id:"MNP", name:"Menlo Park",          short:"Menlo Park",        zone:3 },
  { id:"PAL", name:"Palo Alto",           short:"Palo Alto",         zone:3 },
  { id:"CAL", name:"California Avenue",   short:"California Ave",    zone:3 },
  { id:"SAT", name:"San Antonio",         short:"San Antonio",       zone:3 },
  { id:"MTV", name:"Mountain View",       short:"Mountain View",     zone:3 },
  { id:"SUN", name:"Sunnyvale",           short:"Sunnyvale",         zone:3 },
  { id:"LAW", name:"Lawrence",            short:"Lawrence",          zone:4 },
  { id:"SCL", name:"Santa Clara",         short:"Santa Clara",       zone:4 },
  { id:"CPK", name:"College Park",        short:"College Park",      zone:4 },
  { id:"SJD", name:"San Jose Diridon",    short:"San Jose",          zone:4 },
  { id:"TAM", name:"Tamien",              short:"Tamien",            zone:4 },
  { id:"CAP", name:"Capitol",             short:"Capitol",           zone:5 },
  { id:"BLH", name:"Blossom Hill",        short:"Blossom Hill",      zone:5 },
  { id:"MHL", name:"Morgan Hill",         short:"Morgan Hill",       zone:6 },
  { id:"SMT2",name:"San Martin",          short:"San Martin",        zone:6 },
  { id:"GIL", name:"Gilroy",              short:"Gilroy",            zone:6 },
];
const STATION_BY_ID = Object.fromEntries(STATIONS.map(s=>[s.id,s]));
// Map from display name → station id
const NAME_TO_ID = {
  "San Francisco":"SF","22nd Street":"22S","Bayshore":"BAY",
  "South San Francisco":"SSF","San Bruno":"SBR","Millbrae":"MIL",
  "Broadway":"BRW","Burlingame":"BUR","San Mateo":"SMT","Hayward Park":"HWP",
  "Hillsdale":"HSD","Belmont":"BEL","San Carlos":"SCA","Redwood City":"RWC",
  "Menlo Park":"MNP","Palo Alto":"PAL","California Avenue":"CAL",
  "San Antonio":"SAT","Mountain View":"MTV","Sunnyvale":"SUN",
  "Lawrence":"LAW","Santa Clara":"SCL","College Park":"CPK",
  "San Jose Diridon":"SJD","Tamien":"TAM",
  "Capitol":"CAP","Blossom Hill":"BLH","Morgan Hill":"MHL",
  "San Martin":"SMT2","Gilroy":"GIL"
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE TIMETABLE — sourced directly from caltrain.com (eff. Jan 31 2026)
// Each train: { train, type, stops:{stationId:"HH:MM"} }
// Times in 24h "HH:MM". Stops not served are omitted.
// ─────────────────────────────────────────────────────────────────────────────

function buildTrains(trainDefs, rawByStation) {
  const stationNames = Object.keys(rawByStation);
  return trainDefs.map(([num, type], i) => {
    const stops = {};
    for (const name of stationNames) {
      const times = rawByStation[name];
      if (i < times.length && times[i] !== null) {
        stops[NAME_TO_ID[name]] = times[i];
      }
    }
    return { train: num, type, stops };
  });
}

function t(s) { // parse "H:MMam/pm" → "HH:MM" 24h, or null for "--"
  if (!s || s === "--") return null;
  const pm = s.endsWith("pm"), am = s.endsWith("am");
  const [h, m] = s.replace(/[apm]/g,"").split(":").map(Number);
  let H = h;
  if (pm && h !== 12) H = h + 12;
  if (am && h === 12) H = 0;
  return `${String(H).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

const NB_DEFS = [
  ["101","Local"],["103","Local"],["401","Limited"],["105","Local"],["503","Express"],
  ["107","Local"],["805","SCC"],["405","Limited"],["601","Weekend"],["109","Local"],
  ["807","SCC"],["507","Express"],["603","Weekend"],["111","Local"],["809","SCC"],
  ["409","Limited"],["113","Local"],["605","Weekend"],["811","SCC"],["511","Express"],
  ["607","Weekend"],["115","Local"],["413","Limited"],["609","Weekend"],["117","Local"],
  ["611","Weekend"],["119","Local"],["613","Weekend"],["121","Local"],["615","Weekend"],
  ["123","Local"],["617","Weekend"],["125","Local"],["619","Weekend"],["127","Local"],
  ["621","Weekend"],["129","Local"],["623","Weekend"],["131","Local"],["625","Weekend"],
  ["133","Local"],["627","Weekend"],["135","Local"],["629","Weekend"],["137","Local"],
  ["631","Weekend"],["139","Local"],["633","Weekend"],["141","Local"],["515","Express"],
  ["143","Local"],["635","Weekend"],["417","Limited"],["637","Weekend"],["145","Local"],
  ["519","Express"],["639","Weekend"],["147","Local"],["421","Limited"],["641","Weekend"],
  ["149","Local"],["523","Express"],["643","Weekend"],["151","Local"],["425","Limited"],
  ["645","Weekend"],["153","Local"],["527","Express"],["647","Weekend"],["155","Local"],
  ["429","Limited"],["649","Weekend"],["157","Local"],["651","Weekend"],["159","Local"],
  ["653","Weekend"],["161","Local"],["655","Weekend"],["163","Local"],["657","Weekend"],
  ["165","Local"],["659","Weekend"],["167","Local"],["661","Weekend"],["169","Local"],
  ["171","Local"],["663","Weekend"],["173","Local"],["665","Weekend"],
];

const NB_RAW = {
"Gilroy":[null,null,null,null,null,null,t("5:52am"),null,null,null,t("6:31am"),null,null,null,t("6:52am"),null,null,null,t("7:31am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"San Martin":[null,null,null,null,null,null,t("6:04am"),null,null,null,t("6:43am"),null,null,null,t("7:04am"),null,null,null,t("7:43am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"Morgan Hill":[null,null,null,null,null,null,t("6:10am"),null,null,null,t("6:49am"),null,null,null,t("7:10am"),null,null,null,t("7:49am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"Blossom Hill":[null,null,null,null,null,null,t("6:23am"),null,null,null,t("7:02am"),null,null,null,t("7:23am"),null,null,null,t("8:02am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"Capitol":[null,null,null,null,null,null,t("6:29am"),null,null,null,t("7:08am"),null,null,null,t("7:29am"),null,null,null,t("8:08am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"San Francisco":[t("6:01am"),t("6:26am"),t("6:53am"),t("7:16am"),t("7:22am"),t("7:46am"),null,t("7:53am"),t("8:16am"),t("8:16am"),null,t("8:22am"),t("8:46am"),t("8:46am"),null,t("8:53am"),t("9:16am"),t("9:16am"),null,t("9:22am"),t("9:46am"),t("9:46am"),t("9:53am"),t("10:16am"),t("10:16am"),t("10:46am"),t("10:46am"),t("11:16am"),t("11:16am"),t("11:46am"),t("11:46am"),t("12:16pm"),t("12:16pm"),t("12:46pm"),t("12:46pm"),t("1:16pm"),t("1:16pm"),t("1:46pm"),t("1:46pm"),t("2:16pm"),t("2:16pm"),t("2:46pm"),t("2:46pm"),t("3:16pm"),t("3:16pm"),t("3:46pm"),t("3:46pm"),t("4:16pm"),t("4:16pm"),t("4:22pm"),t("4:46pm"),t("4:46pm"),t("4:53pm"),t("5:16pm"),t("5:16pm"),t("5:22pm"),t("5:46pm"),t("5:46pm"),t("5:53pm"),t("6:16pm"),t("6:16pm"),t("6:22pm"),t("6:46pm"),t("6:46pm"),t("6:53pm"),t("7:16pm"),t("7:16pm"),t("7:22pm"),t("7:46pm"),t("7:46pm"),t("7:53pm"),t("8:16pm"),t("8:16pm"),t("8:46pm"),t("8:46pm"),t("9:16pm"),t("9:16pm"),t("9:46pm"),t("9:46pm"),t("10:16pm"),t("10:16pm"),t("10:46pm"),t("10:46pm"),t("11:16pm"),t("11:16pm"),t("11:48pm"),t("11:50pm"),t("12:48am"),t("12:50am")],
"22nd Street":[t("5:55am"),t("6:20am"),t("6:47am"),t("7:10am"),t("7:16am"),t("7:40am"),null,t("7:47am"),t("8:10am"),t("8:10am"),null,t("8:16am"),t("8:40am"),t("8:40am"),null,t("8:47am"),t("9:10am"),t("9:10am"),null,t("9:16am"),t("9:40am"),t("9:40am"),t("9:47am"),t("10:10am"),t("10:10am"),t("10:40am"),t("10:40am"),t("11:10am"),t("11:10am"),t("11:40am"),t("11:40am"),t("12:10pm"),t("12:10pm"),t("12:40pm"),t("12:40pm"),t("1:10pm"),t("1:10pm"),t("1:40pm"),t("1:40pm"),t("2:10pm"),t("2:10pm"),t("2:40pm"),t("2:40pm"),t("3:10pm"),t("3:10pm"),t("3:40pm"),t("3:40pm"),t("4:10pm"),t("4:10pm"),t("4:16pm"),t("4:40pm"),t("4:40pm"),t("4:47pm"),t("5:10pm"),t("5:10pm"),t("5:16pm"),t("5:40pm"),t("5:40pm"),t("5:47pm"),t("6:10pm"),t("6:10pm"),t("6:16pm"),t("6:40pm"),t("6:40pm"),t("6:47pm"),t("7:10pm"),t("7:10pm"),t("7:16pm"),t("7:40pm"),t("7:40pm"),t("7:47pm"),t("8:10pm"),t("8:10pm"),t("8:40pm"),t("8:40pm"),t("9:10pm"),t("9:10pm"),t("9:40pm"),t("9:40pm"),t("10:10pm"),t("10:10pm"),t("10:40pm"),t("10:40pm"),t("11:10pm"),t("11:10pm"),t("11:42pm"),t("11:44pm"),t("12:42am"),t("12:44am")],
"Bayshore":[t("5:50am"),t("6:15am"),null,t("7:05am"),null,t("7:35am"),null,null,t("8:05am"),t("8:05am"),null,null,t("8:35am"),t("8:35am"),null,null,t("9:05am"),t("9:05am"),null,null,t("9:35am"),t("9:35am"),null,t("10:05am"),t("10:05am"),t("10:35am"),t("10:35am"),t("11:05am"),t("11:05am"),t("11:35am"),t("11:35am"),t("12:05pm"),t("12:05pm"),t("12:35pm"),t("12:35pm"),t("1:05pm"),t("1:05pm"),t("1:35pm"),t("1:35pm"),t("2:05pm"),t("2:05pm"),t("2:35pm"),t("2:35pm"),t("3:05pm"),t("3:05pm"),t("3:35pm"),t("3:35pm"),t("4:05pm"),t("4:05pm"),null,t("4:35pm"),t("4:35pm"),null,t("5:05pm"),t("5:05pm"),null,t("5:35pm"),t("5:35pm"),null,t("6:05pm"),t("6:05pm"),null,t("6:35pm"),t("6:35pm"),null,t("7:05pm"),t("7:05pm"),null,t("7:35pm"),t("7:35pm"),null,t("8:05pm"),t("8:05pm"),t("8:35pm"),t("8:35pm"),t("9:05pm"),t("9:05pm"),t("9:35pm"),t("9:35pm"),t("10:05pm"),t("10:05pm"),t("10:35pm"),t("10:35pm"),t("11:05pm"),t("11:05pm"),t("11:37pm"),t("11:39pm"),t("12:37am"),t("12:39am")],
"South San Francisco":[t("5:45am"),t("6:10am"),t("6:39am"),t("7:00am"),t("7:09am"),t("7:30am"),null,t("7:39am"),t("8:00am"),t("8:00am"),null,t("8:09am"),t("8:30am"),t("8:30am"),null,t("8:39am"),t("9:00am"),t("9:00am"),null,t("9:09am"),t("9:30am"),t("9:30am"),t("9:39am"),t("10:00am"),t("10:00am"),t("10:30am"),t("10:30am"),t("11:00am"),t("11:00am"),t("11:30am"),t("11:30am"),t("12:00pm"),t("12:00pm"),t("12:30pm"),t("12:30pm"),t("1:00pm"),t("1:00pm"),t("1:30pm"),t("1:30pm"),t("2:00pm"),t("2:00pm"),t("2:30pm"),t("2:30pm"),t("3:00pm"),t("3:00pm"),t("3:30pm"),t("3:30pm"),t("4:00pm"),t("4:00pm"),t("4:09pm"),t("4:30pm"),t("4:30pm"),t("4:39pm"),t("5:00pm"),t("5:00pm"),t("5:09pm"),t("5:30pm"),t("5:30pm"),t("5:39pm"),t("6:00pm"),t("6:00pm"),t("6:09pm"),t("6:30pm"),t("6:30pm"),t("6:39pm"),t("7:00pm"),t("7:00pm"),t("7:09pm"),t("7:30pm"),t("7:30pm"),t("7:39pm"),t("8:00pm"),t("8:00pm"),t("8:30pm"),t("8:30pm"),t("9:00pm"),t("9:00pm"),t("9:30pm"),t("9:30pm"),t("10:00pm"),t("10:00pm"),t("10:30pm"),t("10:30pm"),t("11:00pm"),t("11:00pm"),t("11:32pm"),t("11:34pm"),t("12:32am"),t("12:34am")],
"San Bruno":[t("5:42am"),t("6:07am"),null,t("6:57am"),null,t("7:27am"),null,null,t("7:57am"),t("7:57am"),null,null,t("8:27am"),t("8:27am"),null,null,t("8:57am"),t("8:57am"),null,null,t("9:27am"),t("9:27am"),null,t("9:57am"),t("9:57am"),t("10:27am"),t("10:27am"),t("10:57am"),t("10:57am"),t("11:27am"),t("11:27am"),t("11:57am"),t("11:57am"),t("12:27pm"),t("12:27pm"),t("12:57pm"),t("12:57pm"),t("1:27pm"),t("1:27pm"),t("1:57pm"),t("1:57pm"),t("2:27pm"),t("2:27pm"),t("2:57pm"),t("2:57pm"),t("3:27pm"),t("3:27pm"),t("3:57pm"),t("3:57pm"),null,t("4:27pm"),t("4:27pm"),null,t("4:57pm"),t("4:57pm"),null,t("5:27pm"),t("5:27pm"),null,t("5:57pm"),t("5:57pm"),null,t("6:27pm"),t("6:27pm"),null,t("6:57pm"),t("6:57pm"),null,t("7:27pm"),t("7:27pm"),null,t("7:57pm"),t("7:57pm"),t("8:27pm"),t("8:27pm"),t("8:57pm"),t("8:57pm"),t("9:27pm"),t("9:27pm"),t("9:57pm"),t("9:57pm"),t("10:27pm"),t("10:27pm"),t("10:57pm"),t("10:57pm"),t("11:29pm"),t("11:31pm"),t("12:29am"),t("12:31am")],
"Millbrae":[t("5:39am"),t("6:04am"),t("6:33am"),t("6:54am"),t("7:04am"),t("7:24am"),null,t("7:33am"),t("7:54am"),t("7:54am"),null,t("8:04am"),t("8:24am"),t("8:24am"),null,t("8:33am"),t("8:54am"),t("8:54am"),null,t("9:04am"),t("9:24am"),t("9:24am"),t("9:33am"),t("9:54am"),t("9:54am"),t("10:24am"),t("10:24am"),t("10:54am"),t("10:54am"),t("11:24am"),t("11:24am"),t("11:54am"),t("11:54am"),t("12:24pm"),t("12:24pm"),t("12:54pm"),t("12:54pm"),t("1:24pm"),t("1:24pm"),t("1:54pm"),t("1:54pm"),t("2:24pm"),t("2:24pm"),t("2:54pm"),t("2:54pm"),t("3:24pm"),t("3:24pm"),t("3:54pm"),t("3:54pm"),t("4:04pm"),t("4:24pm"),t("4:24pm"),t("4:33pm"),t("4:54pm"),t("4:54pm"),t("5:04pm"),t("5:24pm"),t("5:24pm"),t("5:33pm"),t("5:54pm"),t("5:54pm"),t("6:04pm"),t("6:24pm"),t("6:24pm"),t("6:33pm"),t("6:54pm"),t("6:54pm"),t("7:04pm"),t("7:24pm"),t("7:24pm"),t("7:33pm"),t("7:54pm"),t("7:54pm"),t("8:24pm"),t("8:24pm"),t("8:54pm"),t("8:54pm"),t("9:24pm"),t("9:24pm"),t("9:54pm"),t("9:54pm"),t("10:24pm"),t("10:24pm"),t("10:54pm"),t("10:54pm"),t("11:26pm"),t("11:28pm"),t("12:26am"),t("12:28am")],
"Broadway":[null,null,null,null,null,null,null,null,t("7:51am"),null,null,null,t("8:21am"),null,null,null,null,t("8:51am"),null,null,t("9:21am"),null,null,t("9:51am"),null,t("10:21am"),null,t("10:51am"),null,t("11:21am"),null,t("11:51am"),null,t("12:21pm"),null,t("12:51pm"),null,t("1:21pm"),null,t("1:51pm"),null,t("2:21pm"),null,t("2:51pm"),null,t("3:21pm"),null,t("3:51pm"),null,null,null,t("4:21pm"),null,t("4:51pm"),null,null,t("5:21pm"),null,null,t("5:51pm"),null,null,t("6:21pm"),null,null,t("6:51pm"),null,null,t("7:21pm"),null,null,t("7:51pm"),null,t("8:21pm"),null,t("8:51pm"),null,t("9:21pm"),null,t("9:51pm"),null,t("10:21pm"),null,t("10:51pm"),null,null,t("11:25pm"),null,t("12:25am")],
"Burlingame":[t("5:35am"),t("6:00am"),null,t("6:50am"),null,t("7:20am"),null,null,t("7:48am"),t("7:50am"),null,null,t("8:18am"),t("8:20am"),null,null,t("8:50am"),t("8:48am"),null,null,t("9:18am"),t("9:20am"),null,t("9:48am"),t("9:50am"),t("10:18am"),t("10:20am"),t("10:48am"),t("10:50am"),t("11:18am"),t("11:20am"),t("11:48am"),t("11:50am"),t("12:18pm"),t("12:20pm"),t("12:48pm"),t("12:50pm"),t("1:18pm"),t("1:20pm"),t("1:48pm"),t("1:50pm"),t("2:18pm"),t("2:20pm"),t("2:48pm"),t("2:50pm"),t("3:18pm"),t("3:20pm"),t("3:48pm"),t("3:50pm"),null,t("4:18pm"),t("4:20pm"),null,t("4:48pm"),t("4:50pm"),null,t("5:18pm"),t("5:20pm"),null,t("5:48pm"),t("5:50pm"),null,t("6:18pm"),t("6:20pm"),null,t("6:48pm"),t("6:50pm"),null,t("7:18pm"),t("7:20pm"),null,t("7:48pm"),t("7:50pm"),t("8:18pm"),t("8:20pm"),t("8:48pm"),t("8:50pm"),t("9:18pm"),t("9:20pm"),t("9:48pm"),t("9:50pm"),t("10:18pm"),t("10:20pm"),t("10:48pm"),t("10:50pm"),t("11:22pm"),t("11:22pm"),t("12:22am"),t("12:22am")],
"San Mateo":[t("5:32am"),t("5:57am"),t("6:28am"),t("6:47am"),t("6:59am"),t("7:17am"),null,t("7:28am"),t("7:46am"),t("7:47am"),null,t("7:59am"),t("8:16am"),t("8:17am"),null,t("8:28am"),t("8:47am"),t("8:46am"),null,t("8:59am"),t("9:16am"),t("9:17am"),t("9:28am"),t("9:46am"),t("9:47am"),t("10:16am"),t("10:17am"),t("10:46am"),t("10:47am"),t("11:16am"),t("11:17am"),t("11:46am"),t("11:47am"),t("12:16pm"),t("12:17pm"),t("12:46pm"),t("12:47pm"),t("1:16pm"),t("1:17pm"),t("1:46pm"),t("1:47pm"),t("2:16pm"),t("2:17pm"),t("2:46pm"),t("2:47pm"),t("3:16pm"),t("3:17pm"),t("3:46pm"),t("3:47pm"),t("3:59pm"),t("4:16pm"),t("4:17pm"),t("4:28pm"),t("4:46pm"),t("4:47pm"),t("4:59pm"),t("5:16pm"),t("5:17pm"),t("5:28pm"),t("5:46pm"),t("5:47pm"),t("5:59pm"),t("6:16pm"),t("6:17pm"),t("6:28pm"),t("6:46pm"),t("6:47pm"),t("6:59pm"),t("7:16pm"),t("7:17pm"),t("7:28pm"),t("7:46pm"),t("7:47pm"),t("8:16pm"),t("8:17pm"),t("8:46pm"),t("8:47pm"),t("9:16pm"),t("9:17pm"),t("9:46pm"),t("9:47pm"),t("10:16pm"),t("10:17pm"),t("10:46pm"),t("10:47pm"),t("11:19pm"),t("11:20pm"),t("12:19am"),t("12:20am")],
"Hayward Park":[t("5:30am"),t("5:55am"),null,t("6:45am"),null,t("7:15am"),null,null,t("7:43am"),t("7:45am"),null,null,t("8:13am"),t("8:15am"),null,null,t("8:45am"),t("8:43am"),null,null,t("9:13am"),t("9:15am"),null,t("9:43am"),t("9:45am"),t("10:13am"),t("10:15am"),t("10:43am"),t("10:45am"),t("11:13am"),t("11:15am"),t("11:43am"),t("11:45am"),t("12:13pm"),t("12:15pm"),t("12:43pm"),t("12:45pm"),t("1:13pm"),t("1:15pm"),t("1:43pm"),t("1:45pm"),t("2:13pm"),t("2:15pm"),t("2:43pm"),t("2:45pm"),t("3:13pm"),t("3:15pm"),t("3:43pm"),t("3:45pm"),null,t("4:13pm"),t("4:15pm"),null,t("4:43pm"),t("4:45pm"),null,t("5:13pm"),t("5:15pm"),null,t("5:43pm"),t("5:45pm"),null,t("6:13pm"),t("6:15pm"),null,t("6:43pm"),t("6:45pm"),null,t("7:13pm"),t("7:15pm"),null,t("7:43pm"),t("7:45pm"),t("8:13pm"),t("8:15pm"),t("8:43pm"),t("8:45pm"),t("9:13pm"),t("9:15pm"),t("9:43pm"),t("9:45pm"),t("10:13pm"),t("10:15pm"),t("10:43pm"),t("10:45pm"),t("11:17pm"),t("11:17pm"),t("12:17am"),t("12:17am")],
"Hillsdale":[t("5:27am"),t("5:52am"),t("6:25am"),t("6:42am"),t("6:56am"),t("7:12am"),null,t("7:25am"),t("7:41am"),t("7:42am"),null,t("7:56am"),t("8:11am"),t("8:12am"),null,t("8:25am"),t("8:43am"),t("8:41am"),null,t("8:56am"),t("9:11am"),t("9:12am"),t("9:25am"),t("9:41am"),t("9:42am"),t("10:11am"),t("10:12am"),t("10:41am"),t("10:42am"),t("11:11am"),t("11:12am"),t("11:41am"),t("11:42am"),t("12:11pm"),t("12:12pm"),t("12:41pm"),t("12:42pm"),t("1:11pm"),t("1:12pm"),t("1:41pm"),t("1:42pm"),t("2:11pm"),t("2:12pm"),t("2:41pm"),t("2:42pm"),t("3:11pm"),t("3:12pm"),t("3:41pm"),t("3:43pm"),t("3:56pm"),t("4:11pm"),t("4:12pm"),t("4:25pm"),t("4:41pm"),t("4:42pm"),t("4:56pm"),t("5:11pm"),t("5:12pm"),t("5:25pm"),t("5:41pm"),t("5:42pm"),t("5:56pm"),t("6:11pm"),t("6:12pm"),t("6:25pm"),t("6:41pm"),t("6:42pm"),t("6:56pm"),t("7:11pm"),t("7:12pm"),t("7:25pm"),t("7:41pm"),t("7:42pm"),t("8:11pm"),t("8:12pm"),t("8:41pm"),t("8:42pm"),t("9:11pm"),t("9:12pm"),t("9:41pm"),t("9:42pm"),t("10:11pm"),t("10:12pm"),t("10:41pm"),t("10:42pm"),t("11:14pm"),t("11:15pm"),t("12:14am"),t("12:15am")],
"Belmont":[t("5:24am"),t("5:49am"),null,t("6:39am"),null,t("7:09am"),null,null,t("7:38am"),t("7:39am"),null,null,t("8:08am"),t("8:09am"),null,null,t("8:39am"),t("8:38am"),null,null,t("9:08am"),t("9:09am"),null,t("9:38am"),t("9:39am"),t("10:08am"),t("10:09am"),t("10:38am"),t("10:39am"),t("11:08am"),t("11:09am"),t("11:38am"),t("11:39am"),t("12:08pm"),t("12:09pm"),t("12:38pm"),t("12:39pm"),t("1:08pm"),t("1:09pm"),t("1:38pm"),t("1:39pm"),t("2:08pm"),t("2:09pm"),t("2:38pm"),t("2:39pm"),t("3:08pm"),t("3:09pm"),t("3:38pm"),t("3:39pm"),null,t("4:08pm"),t("4:09pm"),null,t("4:38pm"),t("4:39pm"),null,t("5:08pm"),t("5:09pm"),null,t("5:38pm"),t("5:39pm"),null,t("6:08pm"),t("6:09pm"),null,t("6:38pm"),t("6:39pm"),null,t("7:08pm"),t("7:09pm"),null,t("7:38pm"),t("7:39pm"),t("8:08pm"),t("8:09pm"),t("8:38pm"),t("8:39pm"),t("9:08pm"),t("9:09pm"),t("9:38pm"),t("9:39pm"),t("10:08pm"),t("10:09pm"),t("10:38pm"),t("10:39pm"),t("11:11pm"),t("11:12pm"),t("12:11am"),t("12:12am")],
"San Carlos":[t("5:22am"),t("5:47am"),null,t("6:37am"),null,t("7:07am"),null,null,t("7:35am"),t("7:37am"),null,null,t("8:05am"),t("8:07am"),null,null,t("8:37am"),t("8:35am"),null,null,t("9:05am"),t("9:07am"),null,t("9:35am"),t("9:37am"),t("10:05am"),t("10:07am"),t("10:35am"),t("10:37am"),t("11:05am"),t("11:07am"),t("11:35am"),t("11:37am"),t("12:05pm"),t("12:07pm"),t("12:35pm"),t("12:37pm"),t("1:05pm"),t("1:07pm"),t("1:35pm"),t("1:37pm"),t("2:05pm"),t("2:07pm"),t("2:35pm"),t("2:37pm"),t("3:05pm"),t("3:07pm"),t("3:35pm"),t("3:37pm"),null,t("4:05pm"),t("4:07pm"),null,t("4:35pm"),t("4:37pm"),null,t("5:05pm"),t("5:07pm"),null,t("5:35pm"),t("5:37pm"),null,t("6:05pm"),t("6:07pm"),null,t("6:35pm"),t("6:37pm"),null,t("7:05pm"),t("7:07pm"),null,t("7:35pm"),t("7:37pm"),t("8:05pm"),t("8:07pm"),t("8:35pm"),t("8:37pm"),t("9:05pm"),t("9:07pm"),t("9:35pm"),t("9:37pm"),t("10:05pm"),t("10:07pm"),t("10:35pm"),t("10:37pm"),t("11:09pm"),t("11:09pm"),t("12:09am"),t("12:09am")],
"Redwood City":[t("5:18am"),t("5:43am"),t("6:18am"),t("6:33am"),t("6:49am"),t("7:03am"),null,t("7:18am"),t("7:32am"),t("7:33am"),null,t("7:49am"),t("8:02am"),t("8:03am"),null,t("8:18am"),t("8:34am"),t("8:32am"),null,t("8:49am"),t("9:02am"),t("9:03am"),t("9:18am"),t("9:32am"),t("9:33am"),t("10:02am"),t("10:03am"),t("10:32am"),t("10:33am"),t("11:02am"),t("11:03am"),t("11:32am"),t("11:33am"),t("12:02pm"),t("12:03pm"),t("12:32pm"),t("12:33pm"),t("1:02pm"),t("1:03pm"),t("1:32pm"),t("1:33pm"),t("2:02pm"),t("2:03pm"),t("2:32pm"),t("2:33pm"),t("3:02pm"),t("3:03pm"),t("3:32pm"),t("3:34pm"),t("3:49pm"),t("4:02pm"),t("4:03pm"),t("4:18pm"),t("4:32pm"),t("4:33pm"),t("4:49pm"),t("5:02pm"),t("5:03pm"),t("5:18pm"),t("5:32pm"),t("5:33pm"),t("5:49pm"),t("6:02pm"),t("6:03pm"),t("6:18pm"),t("6:32pm"),t("6:33pm"),t("6:49pm"),t("7:02pm"),t("7:03pm"),t("7:18pm"),t("7:32pm"),t("7:33pm"),t("8:02pm"),t("8:03pm"),t("8:32pm"),t("8:33pm"),t("9:02pm"),t("9:03pm"),t("9:32pm"),t("9:33pm"),t("10:02pm"),t("10:03pm"),t("10:32pm"),t("10:33pm"),t("11:05pm"),t("11:06pm"),t("12:05am"),t("12:06am")],
"Menlo Park":[t("5:13am"),t("5:38am"),t("6:13am"),t("6:28am"),null,t("6:58am"),null,t("7:13am"),t("7:26am"),t("7:28am"),null,null,t("7:56am"),t("7:58am"),null,t("8:13am"),t("8:28am"),t("8:26am"),null,null,t("8:56am"),t("8:58am"),t("9:13am"),t("9:26am"),t("9:28am"),t("9:56am"),t("9:58am"),t("10:26am"),t("10:28am"),t("10:56am"),t("10:58am"),t("11:26am"),t("11:28am"),t("11:56am"),t("11:58am"),t("12:26pm"),t("12:28pm"),t("12:56pm"),t("12:58pm"),t("1:26pm"),t("1:28pm"),t("1:56pm"),t("1:58pm"),t("2:26pm"),t("2:28pm"),t("2:56pm"),t("2:58pm"),t("3:26pm"),t("3:28pm"),null,t("3:56pm"),t("3:58pm"),t("4:13pm"),t("4:26pm"),t("4:28pm"),null,t("4:56pm"),t("4:58pm"),t("5:13pm"),t("5:26pm"),t("5:28pm"),null,t("5:56pm"),t("5:58pm"),t("6:13pm"),t("6:26pm"),t("6:28pm"),null,t("6:56pm"),t("6:58pm"),t("7:13pm"),t("7:26pm"),t("7:28pm"),t("7:56pm"),t("7:58pm"),t("8:26pm"),t("8:28pm"),t("8:56pm"),t("8:58pm"),t("9:26pm"),t("9:28pm"),t("9:56pm"),t("9:58pm"),t("10:26pm"),t("10:28pm"),t("11:00pm"),t("11:00pm"),t("12:00am"),t("12:00am")],
"Palo Alto":[t("5:10am"),t("5:35am"),t("6:10am"),t("6:25am"),t("6:43am"),t("6:55am"),null,t("7:10am"),t("7:24am"),t("7:25am"),null,t("7:43am"),t("7:54am"),t("7:55am"),null,t("8:10am"),t("8:25am"),t("8:24am"),null,t("8:43am"),t("8:54am"),t("8:55am"),t("9:10am"),t("9:24am"),t("9:25am"),t("9:54am"),t("9:55am"),t("10:24am"),t("10:25am"),t("10:54am"),t("10:55am"),t("11:24am"),t("11:25am"),t("11:54am"),t("11:55am"),t("12:24pm"),t("12:25pm"),t("12:54pm"),t("12:55pm"),t("1:24pm"),t("1:25pm"),t("1:54pm"),t("1:55pm"),t("2:24pm"),t("2:25pm"),t("2:54pm"),t("2:55pm"),t("3:24pm"),t("3:25pm"),t("3:43pm"),t("3:54pm"),t("3:55pm"),t("4:10pm"),t("4:24pm"),t("4:25pm"),t("4:43pm"),t("4:54pm"),t("4:55pm"),t("5:10pm"),t("5:24pm"),t("5:25pm"),t("5:43pm"),t("5:54pm"),t("5:55pm"),t("6:10pm"),t("6:24pm"),t("6:25pm"),t("6:43pm"),t("6:54pm"),t("6:55pm"),t("7:10pm"),t("7:24pm"),t("7:25pm"),t("7:54pm"),t("7:55pm"),t("8:24pm"),t("8:25pm"),t("8:54pm"),t("8:55pm"),t("9:24pm"),t("9:25pm"),t("9:54pm"),t("9:55pm"),t("10:24pm"),t("10:25pm"),t("10:57pm"),t("10:58pm"),t("11:57pm"),t("11:58pm")],
"California Avenue":[t("5:07am"),t("5:32am"),t("6:07am"),t("6:22am"),null,t("6:52am"),null,t("7:07am"),t("7:21am"),t("7:22am"),null,null,t("7:51am"),t("7:52am"),null,t("8:07am"),t("8:22am"),t("8:21am"),null,null,t("8:51am"),t("8:52am"),t("9:07am"),t("9:21am"),t("9:22am"),t("9:51am"),t("9:52am"),t("10:21am"),t("10:22am"),t("10:51am"),t("10:52am"),t("11:21am"),t("11:22am"),t("11:51am"),t("11:52am"),t("12:21pm"),t("12:22pm"),t("12:51pm"),t("12:52pm"),t("1:21pm"),t("1:22pm"),t("1:51pm"),t("1:52pm"),t("2:21pm"),t("2:22pm"),t("2:51pm"),t("2:52pm"),t("3:21pm"),t("3:22pm"),null,t("3:51pm"),t("3:52pm"),t("4:07pm"),t("4:21pm"),t("4:22pm"),null,t("4:51pm"),t("4:52pm"),t("5:07pm"),t("5:21pm"),t("5:22pm"),null,t("5:51pm"),t("5:52pm"),t("6:07pm"),t("6:21pm"),t("6:22pm"),null,t("6:51pm"),t("6:52pm"),t("7:07pm"),t("7:21pm"),t("7:22pm"),t("7:51pm"),t("7:52pm"),t("8:21pm"),t("8:22pm"),t("8:51pm"),t("8:52pm"),t("9:21pm"),t("9:22pm"),t("9:51pm"),t("9:52pm"),t("10:21pm"),t("10:22pm"),t("10:54pm"),t("10:55pm"),t("11:54pm"),t("11:55pm")],
"San Antonio":[t("5:04am"),t("5:29am"),t("6:04am"),t("6:19am"),null,t("6:49am"),null,t("7:04am"),t("7:18am"),t("7:19am"),null,null,t("7:48am"),t("7:49am"),null,t("8:04am"),t("8:19am"),t("8:18am"),null,null,t("8:48am"),t("8:49am"),t("9:04am"),t("9:18am"),t("9:19am"),t("9:48am"),t("9:49am"),t("10:18am"),t("10:19am"),t("10:48am"),t("10:49am"),t("11:18am"),t("11:19am"),t("11:48am"),t("11:49am"),t("12:18pm"),t("12:19pm"),t("12:48pm"),t("12:49pm"),t("1:18pm"),t("1:19pm"),t("1:48pm"),t("1:49pm"),t("2:18pm"),t("2:19pm"),t("2:48pm"),t("2:49pm"),t("3:18pm"),t("3:19pm"),null,t("3:48pm"),t("3:49pm"),t("4:04pm"),t("4:18pm"),t("4:19pm"),null,t("4:48pm"),t("4:49pm"),t("5:04pm"),t("5:18pm"),t("5:19pm"),null,t("5:48pm"),t("5:49pm"),t("6:04pm"),t("6:18pm"),t("6:19pm"),null,t("6:48pm"),t("6:49pm"),t("7:04pm"),t("7:18pm"),t("7:19pm"),t("7:48pm"),t("7:49pm"),t("8:18pm"),t("8:19pm"),t("8:48pm"),t("8:49pm"),t("9:18pm"),t("9:19pm"),t("9:48pm"),t("9:49pm"),t("10:18pm"),t("10:19pm"),t("10:51pm"),t("10:52pm"),t("11:51pm"),t("11:52pm")],
"Mountain View":[t("5:01am"),t("5:26am"),t("6:01am"),t("6:16am"),t("6:36am"),t("6:46am"),null,t("7:01am"),t("7:15am"),t("7:16am"),null,t("7:36am"),t("7:45am"),t("7:46am"),null,t("8:01am"),t("8:16am"),t("8:15am"),null,t("8:36am"),t("8:45am"),t("8:46am"),t("9:01am"),t("9:15am"),t("9:16am"),t("9:45am"),t("9:46am"),t("10:15am"),t("10:16am"),t("10:45am"),t("10:46am"),t("11:15am"),t("11:16am"),t("11:45am"),t("11:46am"),t("12:15pm"),t("12:16pm"),t("12:45pm"),t("12:46pm"),t("1:15pm"),t("1:16pm"),t("1:45pm"),t("1:46pm"),t("2:15pm"),t("2:16pm"),t("2:45pm"),t("2:46pm"),t("3:15pm"),t("3:16pm"),t("3:36pm"),t("3:45pm"),t("3:46pm"),t("4:01pm"),t("4:15pm"),t("4:16pm"),t("4:36pm"),t("4:45pm"),t("4:46pm"),t("5:01pm"),t("5:15pm"),t("5:16pm"),t("5:36pm"),t("5:45pm"),t("5:46pm"),t("6:01pm"),t("6:15pm"),t("6:16pm"),t("6:36pm"),t("6:45pm"),t("6:46pm"),t("7:01pm"),t("7:15pm"),t("7:16pm"),t("7:45pm"),t("7:46pm"),t("8:15pm"),t("8:16pm"),t("8:45pm"),t("8:46pm"),t("9:15pm"),t("9:16pm"),t("9:45pm"),t("9:46pm"),t("10:15pm"),t("10:16pm"),t("10:48pm"),t("10:49pm"),t("11:48pm"),t("11:49pm")],
"Sunnyvale":[t("4:57am"),t("5:22am"),t("5:57am"),t("6:12am"),t("6:32am"),t("6:42am"),null,t("6:57am"),t("7:11am"),t("7:12am"),null,t("7:32am"),t("7:41am"),t("7:42am"),null,t("7:57am"),t("8:12am"),t("8:11am"),null,t("8:32am"),t("8:41am"),t("8:42am"),t("8:57am"),t("9:11am"),t("9:12am"),t("9:41am"),t("9:42am"),t("10:11am"),t("10:12am"),t("10:41am"),t("10:42am"),t("11:11am"),t("11:12am"),t("11:41am"),t("11:42am"),t("12:11pm"),t("12:12pm"),t("12:41pm"),t("12:42pm"),t("1:11pm"),t("1:12pm"),t("1:41pm"),t("1:42pm"),t("2:11pm"),t("2:12pm"),t("2:41pm"),t("2:42pm"),t("3:11pm"),t("3:12pm"),t("3:32pm"),t("3:41pm"),t("3:42pm"),t("3:57pm"),t("4:11pm"),t("4:12pm"),t("4:32pm"),t("4:41pm"),t("4:42pm"),t("4:57pm"),t("5:11pm"),t("5:12pm"),t("5:32pm"),t("5:41pm"),t("5:42pm"),t("5:57pm"),t("6:11pm"),t("6:12pm"),t("6:32pm"),t("6:41pm"),t("6:42pm"),t("6:57pm"),t("7:11pm"),t("7:12pm"),t("7:41pm"),t("7:42pm"),t("8:11pm"),t("8:12pm"),t("8:41pm"),t("8:42pm"),t("9:11pm"),t("9:12pm"),t("9:41pm"),t("9:42pm"),t("10:11pm"),t("10:12pm"),t("10:44pm"),t("10:45pm"),t("11:44pm"),t("11:45pm")],
"Lawrence":[t("4:54am"),t("5:19am"),t("5:54am"),t("6:09am"),null,t("6:39am"),null,t("6:54am"),t("7:07am"),t("7:09am"),null,null,t("7:37am"),t("7:39am"),null,t("7:54am"),t("8:09am"),t("8:07am"),null,null,t("8:37am"),t("8:39am"),t("8:54am"),t("9:07am"),t("9:09am"),t("9:37am"),t("9:39am"),t("10:07am"),t("10:09am"),t("10:37am"),t("10:39am"),t("11:07am"),t("11:09am"),t("11:37am"),t("11:39am"),t("12:07pm"),t("12:09pm"),t("12:37pm"),t("12:39pm"),t("1:07pm"),t("1:09pm"),t("1:37pm"),t("1:39pm"),t("2:07pm"),t("2:09pm"),t("2:37pm"),t("2:39pm"),t("3:07pm"),t("3:09pm"),null,t("3:37pm"),t("3:39pm"),t("3:54pm"),t("4:07pm"),t("4:09pm"),null,t("4:37pm"),t("4:39pm"),t("4:54pm"),t("5:07pm"),t("5:09pm"),null,t("5:37pm"),t("5:39pm"),t("5:54pm"),t("6:07pm"),t("6:09pm"),null,t("6:37pm"),t("6:39pm"),t("6:54pm"),t("7:07pm"),t("7:09pm"),t("7:37pm"),t("7:39pm"),t("8:07pm"),t("8:09pm"),t("8:37pm"),t("8:39pm"),t("9:07pm"),t("9:09pm"),t("9:37pm"),t("9:39pm"),t("10:07pm"),t("10:09pm"),t("10:41pm"),t("10:41pm"),t("11:41pm"),t("11:41pm")],
"Santa Clara":[t("4:49am"),t("5:14am"),t("5:49am"),t("6:04am"),null,t("6:34am"),null,t("6:49am"),t("7:02am"),t("7:04am"),null,null,t("7:32am"),t("7:34am"),null,t("7:49am"),t("8:04am"),t("8:02am"),null,null,t("8:32am"),t("8:34am"),t("8:49am"),t("9:02am"),t("9:04am"),t("9:32am"),t("9:34am"),t("10:02am"),t("10:04am"),t("10:32am"),t("10:34am"),t("11:02am"),t("11:04am"),t("11:32am"),t("11:34am"),t("12:02pm"),t("12:04pm"),t("12:32pm"),t("12:34pm"),t("1:02pm"),t("1:04pm"),t("1:32pm"),t("1:34pm"),t("2:02pm"),t("2:04pm"),t("2:32pm"),t("2:34pm"),t("3:02pm"),t("3:04pm"),null,t("3:32pm"),t("3:34pm"),t("3:49pm"),t("4:02pm"),t("4:04pm"),null,t("4:32pm"),t("4:34pm"),t("4:49pm"),t("5:02pm"),t("5:04pm"),null,t("5:32pm"),t("5:34pm"),t("5:49pm"),t("6:02pm"),t("6:04pm"),null,t("6:32pm"),t("6:34pm"),t("6:49pm"),t("7:02pm"),t("7:04pm"),t("7:32pm"),t("7:34pm"),t("8:02pm"),t("8:04pm"),t("8:32pm"),t("8:34pm"),t("9:02pm"),t("9:04pm"),t("9:32pm"),t("9:34pm"),t("10:02pm"),t("10:04pm"),t("10:36pm"),t("10:36pm"),t("11:36pm"),t("11:36pm")],
"College Park":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,t("8:01am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,t("3:31pm"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"San Jose Diridon":[t("4:43am"),t("5:08am"),t("5:43am"),t("5:58am"),t("6:22am"),t("6:28am"),t("6:40am"),t("6:43am"),t("6:56am"),t("6:58am"),t("7:19am"),t("7:22am"),t("7:26am"),t("7:28am"),t("7:40am"),t("7:43am"),t("7:53am"),t("7:56am"),t("8:19am"),t("8:22am"),t("8:26am"),t("8:28am"),t("8:43am"),t("8:56am"),t("8:58am"),t("9:26am"),t("9:28am"),t("9:56am"),t("9:58am"),t("10:26am"),t("10:28am"),t("10:56am"),t("10:58am"),t("11:26am"),t("11:28am"),t("11:56am"),t("11:58am"),t("12:26pm"),t("12:28pm"),t("12:56pm"),t("12:58pm"),t("1:26pm"),t("1:28pm"),t("1:56pm"),t("1:58pm"),t("2:26pm"),t("2:28pm"),t("2:56pm"),t("2:58pm"),t("3:22pm"),t("3:26pm"),t("3:28pm"),t("3:43pm"),t("3:56pm"),t("3:58pm"),t("4:22pm"),t("4:26pm"),t("4:28pm"),t("4:43pm"),t("4:56pm"),t("4:58pm"),t("5:22pm"),t("5:26pm"),t("5:28pm"),t("5:43pm"),t("5:56pm"),t("5:58pm"),t("6:22pm"),t("6:26pm"),t("6:28pm"),t("6:43pm"),t("6:56pm"),t("6:58pm"),t("7:26pm"),t("7:28pm"),t("7:56pm"),t("7:58pm"),t("8:26pm"),t("8:28pm"),t("8:56pm"),t("8:58pm"),t("9:26pm"),t("9:28pm"),t("9:56pm"),t("9:58pm"),t("10:30pm"),t("10:30pm"),t("11:30pm"),t("11:30pm")],
"Tamien":[t("4:37am"),null,null,t("5:52am"),null,null,t("6:35am"),null,t("6:51am"),t("6:52am"),t("7:14am"),null,null,null,t("7:35am"),null,t("7:47am"),t("7:51am"),t("8:14am"),null,null,null,null,t("8:51am"),t("8:52am"),null,null,t("9:51am"),t("9:52am"),null,null,t("10:51am"),t("10:52am"),null,null,t("11:51am"),t("11:52am"),null,null,t("12:51pm"),t("12:52pm"),null,null,t("1:51pm"),t("1:52pm"),null,null,t("2:51pm"),t("2:52pm"),null,null,null,null,t("3:51pm"),t("3:52pm"),null,null,null,null,t("4:51pm"),t("4:52pm"),null,null,null,null,t("5:51pm"),t("5:52pm"),null,null,null,null,t("6:51pm"),t("6:52pm"),null,null,t("7:51pm"),t("7:52pm"),null,null,t("8:51pm"),t("8:52pm"),null,null,t("9:51pm"),t("9:52pm"),t("11:24pm"),t("11:25pm"),t("12:24am"),t("12:25am")],
};

const SB_DEFS = [
  ["102","Local"],["104","Local"],["502","Express"],["106","Local"],["404","Limited"],
  ["108","Local"],["506","Express"],["110","Local"],["408","Limited"],["112","Local"],
  ["602","Weekend"],["510","Express"],["114","Local"],["604","Weekend"],["412","Limited"],
  ["116","Local"],["606","Weekend"],["118","Local"],["608","Weekend"],["120","Local"],
  ["610","Weekend"],["122","Local"],["612","Weekend"],["124","Local"],["614","Weekend"],
  ["126","Local"],["616","Weekend"],["128","Local"],["618","Weekend"],["130","Local"],
  ["620","Weekend"],["132","Local"],["622","Weekend"],["134","Local"],["624","Weekend"],
  ["136","Local"],["626","Weekend"],["138","Local"],["628","Weekend"],["140","Local"],
  ["630","Weekend"],["514","Express"],["814","SCC"],["142","Local"],["632","Weekend"],
  ["416","Limited"],["816","SCC"],["144","Local"],["634","Weekend"],["518","Express"],
  ["146","Local"],["636","Weekend"],["420","Limited"],["820","SCC"],["148","Local"],
  ["638","Weekend"],["522","Express"],["822","SCC"],["150","Local"],["640","Weekend"],
  ["424","Limited"],["152","Local"],["642","Weekend"],["526","Express"],["154","Local"],
  ["644","Weekend"],["428","Limited"],["156","Local"],["646","Weekend"],["158","Local"],
  ["648","Weekend"],["160","Local"],["650","Weekend"],["162","Local"],["652","Weekend"],
  ["164","Local"],["654","Weekend"],["166","Local"],["656","Weekend"],["168","Local"],
  ["658","Weekend"],["170","Local"],["660","Weekend"],["172","Local"],["662","Weekend"],
  ["174","Local"],["664","Weekend"],["176","Local"],["668","Weekend"],
];

const SB_RAW = {
"San Francisco":[t("4:55am"),t("5:30am"),t("6:20am"),t("6:25am"),t("6:48am"),t("6:55am"),t("7:20am"),t("7:25am"),t("7:48am"),t("7:55am"),t("7:55am"),t("8:20am"),t("8:25am"),t("8:25am"),t("8:48am"),t("8:55am"),t("8:55am"),t("9:25am"),t("9:25am"),t("9:55am"),t("9:55am"),t("10:25am"),t("10:25am"),t("10:55am"),t("10:55am"),t("11:25am"),t("11:25am"),t("11:55am"),t("11:55am"),t("12:25pm"),t("12:25pm"),t("12:55pm"),t("12:55pm"),t("1:25pm"),t("1:25pm"),t("1:55pm"),t("1:55pm"),t("2:25pm"),t("2:25pm"),t("2:55pm"),t("2:55pm"),t("3:20pm"),null,t("3:25pm"),t("3:25pm"),t("3:48pm"),null,t("3:55pm"),t("3:55pm"),t("4:20pm"),t("4:25pm"),t("4:25pm"),t("4:48pm"),null,t("4:55pm"),t("4:55pm"),t("5:20pm"),null,t("5:25pm"),t("5:25pm"),t("5:48pm"),t("5:55pm"),t("5:55pm"),t("6:20pm"),t("6:25pm"),t("6:25pm"),t("6:48pm"),t("6:55pm"),t("6:55pm"),t("7:25pm"),t("7:25pm"),t("7:55pm"),t("7:55pm"),t("8:25pm"),t("8:25pm"),t("8:55pm"),t("8:55pm"),t("9:25pm"),t("9:25pm"),t("9:55pm"),t("9:55pm"),t("10:25pm"),t("10:25pm"),t("10:55pm"),t("10:55pm"),t("11:25pm"),t("11:25pm"),t("12:05am"),t("12:05am")],
"22nd Street":[t("5:00am"),t("5:35am"),t("6:24am"),t("6:30am"),t("6:53am"),t("7:00am"),t("7:24am"),t("7:30am"),t("7:53am"),t("8:00am"),t("8:00am"),t("8:24am"),t("8:30am"),t("8:30am"),t("8:53am"),t("9:00am"),t("9:00am"),t("9:30am"),t("9:30am"),t("10:00am"),t("10:00am"),t("10:30am"),t("10:30am"),t("11:00am"),t("11:00am"),t("11:30am"),t("11:30am"),t("12:00pm"),t("12:00pm"),t("12:30pm"),t("12:30pm"),t("1:00pm"),t("1:00pm"),t("1:30pm"),t("1:30pm"),t("2:00pm"),t("2:00pm"),t("2:30pm"),t("2:30pm"),t("3:00pm"),t("3:00pm"),t("3:24pm"),null,t("3:30pm"),t("3:30pm"),t("3:53pm"),null,t("4:00pm"),t("4:00pm"),t("4:24pm"),t("4:30pm"),t("4:30pm"),t("4:53pm"),null,t("5:00pm"),t("5:00pm"),t("5:24pm"),null,t("5:30pm"),t("5:30pm"),t("5:53pm"),t("6:00pm"),t("6:00pm"),t("6:24pm"),t("6:30pm"),t("6:30pm"),t("6:53pm"),t("7:00pm"),t("7:00pm"),t("7:30pm"),t("7:30pm"),t("8:00pm"),t("8:00pm"),t("8:30pm"),t("8:30pm"),t("9:00pm"),t("9:00pm"),t("9:30pm"),t("9:30pm"),t("10:00pm"),t("10:00pm"),t("10:30pm"),t("10:30pm"),t("11:00pm"),t("11:00pm"),t("11:30pm"),t("11:30pm"),t("12:10am"),t("12:10am")],
"Bayshore":[t("5:04am"),t("5:39am"),null,t("6:34am"),null,t("7:04am"),null,t("7:34am"),null,t("8:04am"),t("8:04am"),null,t("8:34am"),t("8:34am"),null,t("9:04am"),t("9:04am"),t("9:34am"),t("9:34am"),t("10:04am"),t("10:04am"),t("10:34am"),t("10:34am"),t("11:04am"),t("11:04am"),t("11:34am"),t("11:34am"),t("12:04pm"),t("12:04pm"),t("12:34pm"),t("12:34pm"),t("1:04pm"),t("1:04pm"),t("1:34pm"),t("1:34pm"),t("2:04pm"),t("2:04pm"),t("2:34pm"),t("2:34pm"),t("3:04pm"),t("3:04pm"),null,null,t("3:34pm"),t("3:34pm"),null,null,t("4:04pm"),t("4:04pm"),null,t("4:34pm"),t("4:34pm"),null,null,t("5:04pm"),t("5:04pm"),null,null,t("5:34pm"),t("5:34pm"),null,t("6:04pm"),t("6:04pm"),null,t("6:34pm"),t("6:34pm"),null,t("7:04pm"),t("7:04pm"),t("7:34pm"),t("7:34pm"),t("8:04pm"),t("8:04pm"),t("8:34pm"),t("8:34pm"),t("9:04pm"),t("9:04pm"),t("9:34pm"),t("9:34pm"),t("10:04pm"),t("10:04pm"),t("10:34pm"),t("10:34pm"),t("11:04pm"),t("11:04pm"),t("11:34pm"),t("11:34pm"),t("12:14am"),t("12:14am")],
"South San Francisco":[t("5:10am"),t("5:46am"),t("6:32am"),t("6:40am"),t("7:01am"),t("7:10am"),t("7:32am"),t("7:40am"),t("8:01am"),t("8:10am"),t("8:10am"),t("8:32am"),t("8:40am"),t("8:40am"),t("9:01am"),t("9:10am"),t("9:10am"),t("9:40am"),t("9:40am"),t("10:10am"),t("10:10am"),t("10:40am"),t("10:40am"),t("11:10am"),t("11:10am"),t("11:40am"),t("11:40am"),t("12:10pm"),t("12:10pm"),t("12:40pm"),t("12:40pm"),t("1:10pm"),t("1:10pm"),t("1:40pm"),t("1:40pm"),t("2:10pm"),t("2:10pm"),t("2:40pm"),t("2:40pm"),t("3:10pm"),t("3:10pm"),t("3:32pm"),null,t("3:40pm"),t("3:40pm"),t("4:01pm"),null,t("4:10pm"),t("4:10pm"),t("4:32pm"),t("4:40pm"),t("4:40pm"),t("5:01pm"),null,t("5:10pm"),t("5:10pm"),t("5:32pm"),null,t("5:40pm"),t("5:40pm"),t("6:01pm"),t("6:10pm"),t("6:10pm"),t("6:32pm"),t("6:40pm"),t("6:40pm"),t("7:01pm"),t("7:10pm"),t("7:10pm"),t("7:40pm"),t("7:40pm"),t("8:10pm"),t("8:10pm"),t("8:40pm"),t("8:40pm"),t("9:10pm"),t("9:10pm"),t("9:40pm"),t("9:40pm"),t("10:10pm"),t("10:10pm"),t("10:40pm"),t("10:40pm"),t("11:10pm"),t("11:10pm"),t("11:40pm"),t("11:40pm"),t("12:20am"),t("12:20am")],
"San Bruno":[t("5:13am"),t("5:49am"),null,t("6:43am"),null,t("7:13am"),null,t("7:43am"),null,t("8:13am"),t("8:13am"),null,t("8:43am"),t("8:43am"),null,t("9:13am"),t("9:13am"),t("9:43am"),t("9:43am"),t("10:13am"),t("10:13am"),t("10:43am"),t("10:43am"),t("11:13am"),t("11:13am"),t("11:43am"),t("11:43am"),t("12:13pm"),t("12:13pm"),t("12:43pm"),t("12:43pm"),t("1:13pm"),t("1:13pm"),t("1:43pm"),t("1:43pm"),t("2:13pm"),t("2:13pm"),t("2:43pm"),t("2:43pm"),t("3:13pm"),t("3:13pm"),null,null,t("3:43pm"),t("3:43pm"),null,null,t("4:13pm"),t("4:13pm"),null,t("4:43pm"),t("4:43pm"),null,null,t("5:13pm"),t("5:13pm"),null,null,t("5:43pm"),t("5:43pm"),null,t("6:13pm"),t("6:13pm"),null,t("6:43pm"),t("6:43pm"),null,t("7:13pm"),t("7:13pm"),t("7:43pm"),t("7:43pm"),t("8:13pm"),t("8:13pm"),t("8:43pm"),t("8:43pm"),t("9:13pm"),t("9:13pm"),t("9:43pm"),t("9:43pm"),t("10:13pm"),t("10:13pm"),t("10:43pm"),t("10:43pm"),t("11:13pm"),t("11:13pm"),t("11:43pm"),t("11:43pm"),t("12:23am"),t("12:23am")],
"Millbrae":[t("5:16am"),t("5:52am"),t("6:38am"),t("6:46am"),t("7:07am"),t("7:16am"),t("7:38am"),t("7:46am"),t("8:07am"),t("8:16am"),t("8:16am"),t("8:38am"),t("8:46am"),t("8:46am"),t("9:07am"),t("9:16am"),t("9:16am"),t("9:46am"),t("9:46am"),t("10:16am"),t("10:16am"),t("10:46am"),t("10:46am"),t("11:16am"),t("11:16am"),t("11:46am"),t("11:46am"),t("12:16pm"),t("12:16pm"),t("12:46pm"),t("12:46pm"),t("1:16pm"),t("1:16pm"),t("1:46pm"),t("1:46pm"),t("2:16pm"),t("2:16pm"),t("2:46pm"),t("2:46pm"),t("3:16pm"),t("3:16pm"),t("3:38pm"),null,t("3:46pm"),t("3:46pm"),t("4:07pm"),null,t("4:16pm"),t("4:16pm"),t("4:38pm"),t("4:46pm"),t("4:46pm"),t("5:07pm"),null,t("5:16pm"),t("5:16pm"),t("5:38pm"),null,t("5:46pm"),t("5:46pm"),t("6:07pm"),t("6:16pm"),t("6:16pm"),t("6:38pm"),t("6:46pm"),t("6:46pm"),t("7:07pm"),t("7:16pm"),t("7:16pm"),t("7:46pm"),t("7:46pm"),t("8:16pm"),t("8:16pm"),t("8:46pm"),t("8:46pm"),t("9:16pm"),t("9:16pm"),t("9:46pm"),t("9:46pm"),t("10:16pm"),t("10:16pm"),t("10:46pm"),t("10:46pm"),t("11:16pm"),t("11:16pm"),t("11:46pm"),t("11:46pm"),t("12:26am"),t("12:26am")],
"Broadway":[null,null,null,null,null,null,null,null,null,null,t("8:19am"),null,null,t("8:49am"),null,null,t("9:19am"),null,t("9:49am"),null,t("10:19am"),null,t("10:49am"),null,t("11:19am"),null,t("11:49am"),null,t("12:19pm"),null,t("12:49pm"),null,t("1:19pm"),null,t("1:49pm"),null,t("2:19pm"),null,t("2:49pm"),null,t("3:19pm"),null,null,null,t("3:49pm"),null,null,null,t("4:19pm"),null,null,t("4:49pm"),null,null,null,t("5:19pm"),null,null,null,t("5:49pm"),null,null,t("6:19pm"),null,null,t("6:49pm"),null,null,t("7:19pm"),null,t("7:49pm"),null,t("8:19pm"),null,t("8:49pm"),null,t("9:19pm"),null,t("9:49pm"),null,t("10:19pm"),null,t("10:49pm"),null,t("11:19pm"),null,t("11:49pm"),null,t("12:29am")],
"Burlingame":[t("5:20am"),t("5:56am"),null,t("6:50am"),null,t("7:20am"),null,t("7:50am"),null,t("8:20am"),t("8:21am"),null,t("8:50am"),t("8:51am"),null,t("9:20am"),t("9:21am"),t("9:50am"),t("9:51am"),t("10:20am"),t("10:21am"),t("10:50am"),t("10:51am"),t("11:20am"),t("11:21am"),t("11:50am"),t("11:51am"),t("12:20pm"),t("12:21pm"),t("12:50pm"),t("12:51pm"),t("1:20pm"),t("1:21pm"),t("1:50pm"),t("1:51pm"),t("2:20pm"),t("2:21pm"),t("2:50pm"),t("2:51pm"),t("3:20pm"),t("3:21pm"),null,null,t("3:50pm"),t("3:51pm"),null,null,t("4:20pm"),t("4:21pm"),null,t("4:50pm"),t("4:51pm"),null,null,t("5:20pm"),t("5:21pm"),null,null,t("5:50pm"),t("5:51pm"),null,t("6:20pm"),t("6:21pm"),null,t("6:50pm"),t("6:51pm"),null,t("7:20pm"),t("7:21pm"),t("7:50pm"),t("7:51pm"),t("8:20pm"),t("8:21pm"),t("8:50pm"),t("8:51pm"),t("9:20pm"),t("9:21pm"),t("9:50pm"),t("9:51pm"),t("10:20pm"),t("10:21pm"),t("10:50pm"),t("10:51pm"),t("11:20pm"),t("11:21pm"),t("11:50pm"),t("11:51pm"),t("12:30am"),t("12:31am")],
"San Mateo":[t("5:23am"),t("5:59am"),t("6:43am"),t("6:53am"),t("7:12am"),t("7:23am"),t("7:43am"),t("7:53am"),t("8:12am"),t("8:23am"),t("8:24am"),t("8:43am"),t("8:53am"),t("8:54am"),t("9:12am"),t("9:23am"),t("9:24am"),t("9:53am"),t("9:54am"),t("10:23am"),t("10:24am"),t("10:53am"),t("10:54am"),t("11:23am"),t("11:24am"),t("11:53am"),t("11:54am"),t("12:23pm"),t("12:24pm"),t("12:53pm"),t("12:54pm"),t("1:23pm"),t("1:24pm"),t("1:53pm"),t("1:54pm"),t("2:23pm"),t("2:24pm"),t("2:53pm"),t("2:54pm"),t("3:23pm"),t("3:24pm"),t("3:43pm"),null,t("3:53pm"),t("3:54pm"),t("4:12pm"),null,t("4:23pm"),t("4:24pm"),t("4:43pm"),t("4:53pm"),t("4:54pm"),t("5:12pm"),null,t("5:23pm"),t("5:24pm"),t("5:43pm"),null,t("5:53pm"),t("5:54pm"),t("6:12pm"),t("6:23pm"),t("6:24pm"),t("6:43pm"),t("6:53pm"),t("6:54pm"),t("7:12pm"),t("7:23pm"),t("7:24pm"),t("7:53pm"),t("7:54pm"),t("8:23pm"),t("8:24pm"),t("8:53pm"),t("8:54pm"),t("9:23pm"),t("9:24pm"),t("9:53pm"),t("9:54pm"),t("10:23pm"),t("10:24pm"),t("10:53pm"),t("10:54pm"),t("11:23pm"),t("11:24pm"),t("11:53pm"),t("11:54pm"),t("12:33am"),t("12:34am")],
"Hayward Park":[t("5:25am"),t("6:02am"),null,t("6:55am"),null,t("7:25am"),null,t("7:55am"),null,t("8:25am"),t("8:26am"),null,t("8:55am"),t("8:56am"),null,t("9:25am"),t("9:26am"),t("9:55am"),t("9:56am"),t("10:25am"),t("10:26am"),t("10:55am"),t("10:56am"),t("11:25am"),t("11:26am"),t("11:55am"),t("11:56am"),t("12:25pm"),t("12:26pm"),t("12:55pm"),t("12:56pm"),t("1:25pm"),t("1:26pm"),t("1:55pm"),t("1:56pm"),t("2:25pm"),t("2:26pm"),t("2:55pm"),t("2:56pm"),t("3:25pm"),t("3:26pm"),null,null,t("3:55pm"),t("3:56pm"),null,null,t("4:25pm"),t("4:26pm"),null,t("4:55pm"),t("4:56pm"),null,null,t("5:25pm"),t("5:26pm"),null,null,t("5:55pm"),t("5:56pm"),null,t("6:25pm"),t("6:26pm"),null,t("6:55pm"),t("6:56pm"),null,t("7:25pm"),t("7:26pm"),t("7:55pm"),t("7:56pm"),t("8:25pm"),t("8:26pm"),t("8:55pm"),t("8:56pm"),t("9:25pm"),t("9:26pm"),t("9:55pm"),t("9:56pm"),t("10:25pm"),t("10:26pm"),t("10:55pm"),t("10:56pm"),t("11:25pm"),t("11:26pm"),t("11:55pm"),t("11:56pm"),t("12:35am"),t("12:36am")],
"Hillsdale":[t("5:27am"),t("6:05am"),t("6:46am"),t("6:57am"),t("7:15am"),t("7:27am"),t("7:46am"),t("7:57am"),t("8:15am"),t("8:27am"),t("8:29am"),t("8:46am"),t("8:57am"),t("8:59am"),t("9:15am"),t("9:27am"),t("9:29am"),t("9:57am"),t("9:59am"),t("10:27am"),t("10:29am"),t("10:57am"),t("10:59am"),t("11:27am"),t("11:29am"),t("11:57am"),t("11:59am"),t("12:27pm"),t("12:29pm"),t("12:57pm"),t("12:59pm"),t("1:27pm"),t("1:29pm"),t("1:57pm"),t("1:59pm"),t("2:27pm"),t("2:29pm"),t("2:57pm"),t("2:59pm"),t("3:27pm"),t("3:29pm"),t("3:46pm"),null,t("3:57pm"),t("3:59pm"),t("4:15pm"),null,t("4:27pm"),t("4:29pm"),t("4:46pm"),t("4:57pm"),t("4:59pm"),t("5:15pm"),null,t("5:27pm"),t("5:29pm"),t("5:46pm"),null,t("5:57pm"),t("5:59pm"),t("6:15pm"),t("6:27pm"),t("6:29pm"),t("6:46pm"),t("6:57pm"),t("6:59pm"),t("7:15pm"),t("7:27pm"),t("7:29pm"),t("7:57pm"),t("7:59pm"),t("8:27pm"),t("8:29pm"),t("8:57pm"),t("8:59pm"),t("9:27pm"),t("9:29pm"),t("9:57pm"),t("9:59pm"),t("10:27pm"),t("10:29pm"),t("10:57pm"),t("10:59pm"),t("11:27pm"),t("11:29pm"),t("11:57pm"),t("11:59pm"),t("12:37am"),t("12:39am")],
"Belmont":[t("5:31am"),t("6:09am"),null,t("7:01am"),null,t("7:31am"),null,t("8:01am"),null,t("8:31am"),t("8:32am"),null,t("9:01am"),t("9:02am"),null,t("9:31am"),t("9:32am"),t("10:01am"),t("10:02am"),t("10:31am"),t("10:32am"),t("11:01am"),t("11:02am"),t("11:31am"),t("11:32am"),t("12:01pm"),t("12:02pm"),t("12:31pm"),t("12:32pm"),t("1:01pm"),t("1:02pm"),t("1:31pm"),t("1:32pm"),t("2:01pm"),t("2:02pm"),t("2:31pm"),t("2:32pm"),t("3:01pm"),t("3:02pm"),t("3:31pm"),t("3:32pm"),null,null,t("4:01pm"),t("4:02pm"),null,null,t("4:31pm"),t("4:32pm"),null,t("5:01pm"),t("5:02pm"),null,null,t("5:31pm"),t("5:32pm"),null,null,t("6:01pm"),t("6:02pm"),null,t("6:31pm"),t("6:32pm"),null,t("7:01pm"),t("7:02pm"),null,t("7:31pm"),t("7:32pm"),t("8:01pm"),t("8:02pm"),t("8:31pm"),t("8:32pm"),t("9:01pm"),t("9:02pm"),t("9:31pm"),t("9:32pm"),t("10:01pm"),t("10:02pm"),t("10:31pm"),t("10:32pm"),t("11:01pm"),t("11:02pm"),t("11:31pm"),t("11:32pm"),t("12:01am"),t("12:02am"),t("12:41am"),t("12:42am")],
"San Carlos":[t("5:33am"),t("6:12am"),null,t("7:03am"),null,t("7:33am"),null,t("8:03am"),null,t("8:33am"),t("8:34am"),null,t("9:03am"),t("9:04am"),null,t("9:33am"),t("9:34am"),t("10:03am"),t("10:04am"),t("10:33am"),t("10:34am"),t("11:03am"),t("11:04am"),t("11:33am"),t("11:34am"),t("12:03pm"),t("12:04pm"),t("12:33pm"),t("12:34pm"),t("1:03pm"),t("1:04pm"),t("1:33pm"),t("1:34pm"),t("2:03pm"),t("2:04pm"),t("2:33pm"),t("2:34pm"),t("3:03pm"),t("3:04pm"),t("3:33pm"),t("3:34pm"),null,null,t("4:03pm"),t("4:04pm"),null,null,t("4:33pm"),t("4:34pm"),null,t("5:03pm"),t("5:04pm"),null,null,t("5:33pm"),t("5:34pm"),null,null,t("6:03pm"),t("6:04pm"),null,t("6:33pm"),t("6:34pm"),null,t("7:03pm"),t("7:04pm"),null,t("7:33pm"),t("7:34pm"),t("8:03pm"),t("8:04pm"),t("8:33pm"),t("8:34pm"),t("9:03pm"),t("9:04pm"),t("9:33pm"),t("9:34pm"),t("10:03pm"),t("10:04pm"),t("10:33pm"),t("10:34pm"),t("11:03pm"),t("11:04pm"),t("11:33pm"),t("11:34pm"),t("12:03am"),t("12:04am"),t("12:43am"),t("12:44am")],
"Redwood City":[t("5:37am"),t("6:16am"),t("6:53am"),t("7:07am"),t("7:22am"),t("7:37am"),t("7:53am"),t("8:07am"),t("8:22am"),t("8:37am"),t("8:38am"),t("8:53am"),t("9:07am"),t("9:08am"),t("9:22am"),t("9:37am"),t("9:38am"),t("10:07am"),t("10:08am"),t("10:37am"),t("10:38am"),t("11:07am"),t("11:08am"),t("11:37am"),t("11:38am"),t("12:07pm"),t("12:08pm"),t("12:37pm"),t("12:38pm"),t("1:07pm"),t("1:08pm"),t("1:37pm"),t("1:38pm"),t("2:07pm"),t("2:08pm"),t("2:37pm"),t("2:38pm"),t("3:07pm"),t("3:08pm"),t("3:37pm"),t("3:38pm"),t("3:53pm"),null,t("4:07pm"),t("4:08pm"),t("4:22pm"),null,t("4:37pm"),t("4:38pm"),t("4:53pm"),t("5:07pm"),t("5:08pm"),t("5:22pm"),null,t("5:37pm"),t("5:38pm"),t("5:53pm"),null,t("6:07pm"),t("6:08pm"),t("6:22pm"),t("6:37pm"),t("6:38pm"),t("6:53pm"),t("7:07pm"),t("7:08pm"),t("7:22pm"),t("7:37pm"),t("7:38pm"),t("8:07pm"),t("8:08pm"),t("8:37pm"),t("8:38pm"),t("9:07pm"),t("9:08pm"),t("9:37pm"),t("9:38pm"),t("10:07pm"),t("10:08pm"),t("10:37pm"),t("10:38pm"),t("11:07pm"),t("11:08pm"),t("11:37pm"),t("11:38pm"),t("12:07am"),t("12:08am"),t("12:47am"),t("12:48am")],
"Menlo Park":[t("5:41am"),t("6:20am"),null,t("7:11am"),t("7:26am"),t("7:41am"),null,t("8:11am"),t("8:26am"),t("8:41am"),t("8:42am"),null,t("9:11am"),t("9:12am"),t("9:26am"),t("9:41am"),t("9:42am"),t("10:11am"),t("10:12am"),t("10:41am"),t("10:42am"),t("11:11am"),t("11:12am"),t("11:41am"),t("11:42am"),t("12:11pm"),t("12:12pm"),t("12:41pm"),t("12:42pm"),t("1:11pm"),t("1:12pm"),t("1:41pm"),t("1:42pm"),t("2:11pm"),t("2:12pm"),t("2:41pm"),t("2:42pm"),t("3:11pm"),t("3:12pm"),t("3:41pm"),t("3:42pm"),null,null,t("4:11pm"),t("4:12pm"),t("4:26pm"),null,t("4:41pm"),t("4:42pm"),null,t("5:11pm"),t("5:12pm"),t("5:26pm"),null,t("5:41pm"),t("5:42pm"),null,null,t("6:11pm"),t("6:12pm"),t("6:26pm"),t("6:41pm"),t("6:42pm"),null,t("7:11pm"),t("7:12pm"),t("7:26pm"),t("7:41pm"),t("7:42pm"),t("8:11pm"),t("8:12pm"),t("8:41pm"),t("8:42pm"),t("9:11pm"),t("9:12pm"),t("9:41pm"),t("9:42pm"),t("10:11pm"),t("10:12pm"),t("10:41pm"),t("10:42pm"),t("11:11pm"),t("11:12pm"),t("11:41pm"),t("11:42pm"),t("12:11am"),t("12:12am"),t("12:51am"),t("12:52am")],
"Palo Alto":[t("5:44am"),t("6:24am"),t("6:59am"),t("7:14am"),t("7:29am"),t("7:44am"),t("7:59am"),t("8:14am"),t("8:29am"),t("8:44am"),t("8:46am"),t("8:59am"),t("9:14am"),t("9:16am"),t("9:29am"),t("9:44am"),t("9:46am"),t("10:14am"),t("10:16am"),t("10:44am"),t("10:46am"),t("11:14am"),t("11:16am"),t("11:44am"),t("11:46am"),t("12:14pm"),t("12:16pm"),t("12:44pm"),t("12:46pm"),t("1:14pm"),t("1:16pm"),t("1:44pm"),t("1:46pm"),t("2:14pm"),t("2:16pm"),t("2:44pm"),t("2:46pm"),t("3:14pm"),t("3:16pm"),t("3:44pm"),t("3:46pm"),t("3:59pm"),null,t("4:14pm"),t("4:16pm"),t("4:29pm"),null,t("4:44pm"),t("4:46pm"),t("4:59pm"),t("5:14pm"),t("5:16pm"),t("5:29pm"),null,t("5:44pm"),t("5:46pm"),t("5:59pm"),null,t("6:14pm"),t("6:16pm"),t("6:29pm"),t("6:44pm"),t("6:46pm"),t("6:59pm"),t("7:14pm"),t("7:16pm"),t("7:29pm"),t("7:44pm"),t("7:46pm"),t("8:14pm"),t("8:16pm"),t("8:44pm"),t("8:46pm"),t("9:14pm"),t("9:16pm"),t("9:44pm"),t("9:46pm"),t("10:14pm"),t("10:16pm"),t("10:44pm"),t("10:46pm"),t("11:14pm"),t("11:16pm"),t("11:44pm"),t("11:46pm"),t("12:14am"),t("12:16am"),t("12:54am"),t("12:56am")],
"California Avenue":[t("5:47am"),t("6:27am"),null,t("7:17am"),t("7:32am"),t("7:47am"),null,t("8:17am"),t("8:32am"),t("8:47am"),t("8:49am"),null,t("9:17am"),t("9:19am"),t("9:32am"),t("9:47am"),t("9:49am"),t("10:17am"),t("10:19am"),t("10:47am"),t("10:49am"),t("11:17am"),t("11:19am"),t("11:47am"),t("11:49am"),t("12:17pm"),t("12:19pm"),t("12:47pm"),t("12:49pm"),t("1:17pm"),t("1:19pm"),t("1:47pm"),t("1:49pm"),t("2:17pm"),t("2:19pm"),t("2:47pm"),t("2:49pm"),t("3:17pm"),t("3:19pm"),t("3:47pm"),t("3:49pm"),null,null,t("4:17pm"),t("4:19pm"),t("4:32pm"),null,t("4:47pm"),t("4:49pm"),null,t("5:17pm"),t("5:19pm"),t("5:32pm"),null,t("5:47pm"),t("5:49pm"),null,null,t("6:17pm"),t("6:19pm"),t("6:32pm"),t("6:47pm"),t("6:49pm"),null,t("7:17pm"),t("7:19pm"),t("7:32pm"),t("7:47pm"),t("7:49pm"),t("8:17pm"),t("8:19pm"),t("8:47pm"),t("8:49pm"),t("9:17pm"),t("9:19pm"),t("9:47pm"),t("9:49pm"),t("10:17pm"),t("10:19pm"),t("10:47pm"),t("10:49pm"),t("11:17pm"),t("11:19pm"),t("11:47pm"),t("11:49pm"),t("12:17am"),t("12:19am"),t("12:57am"),t("12:59am")],
"San Antonio":[t("5:51am"),t("6:31am"),null,t("7:21am"),t("7:36am"),t("7:51am"),null,t("8:21am"),t("8:36am"),t("8:51am"),t("8:52am"),null,t("9:21am"),t("9:22am"),t("9:36am"),t("9:51am"),t("9:52am"),t("10:21am"),t("10:22am"),t("10:51am"),t("10:52am"),t("11:21am"),t("11:22am"),t("11:51am"),t("11:52am"),t("12:21pm"),t("12:22pm"),t("12:51pm"),t("12:52pm"),t("1:21pm"),t("1:22pm"),t("1:51pm"),t("1:52pm"),t("2:21pm"),t("2:22pm"),t("2:51pm"),t("2:52pm"),t("3:21pm"),t("3:22pm"),t("3:51pm"),t("3:52pm"),null,null,t("4:21pm"),t("4:22pm"),t("4:36pm"),null,t("4:51pm"),t("4:52pm"),null,t("5:21pm"),t("5:22pm"),t("5:36pm"),null,t("5:51pm"),t("5:52pm"),null,null,t("6:21pm"),t("6:22pm"),t("6:36pm"),t("6:51pm"),t("6:52pm"),null,t("7:21pm"),t("7:22pm"),t("7:36pm"),t("7:51pm"),t("7:52pm"),t("8:21pm"),t("8:22pm"),t("8:51pm"),t("8:52pm"),t("9:21pm"),t("9:22pm"),t("9:51pm"),t("9:52pm"),t("10:21pm"),t("10:22pm"),t("10:51pm"),t("10:52pm"),t("11:21pm"),t("11:22pm"),t("11:51pm"),t("11:52pm"),t("12:21am"),t("12:22am"),t("1:01am"),t("1:02am")],
"Mountain View":[t("5:54am"),t("6:34am"),t("7:06am"),t("7:24am"),t("7:39am"),t("7:54am"),t("8:06am"),t("8:24am"),t("8:39am"),t("8:54am"),t("8:55am"),t("9:06am"),t("9:24am"),t("9:25am"),t("9:39am"),t("9:54am"),t("9:55am"),t("10:24am"),t("10:25am"),t("10:54am"),t("10:55am"),t("11:24am"),t("11:25am"),t("11:54am"),t("11:55am"),t("12:24pm"),t("12:25pm"),t("12:54pm"),t("12:55pm"),t("1:24pm"),t("1:25pm"),t("1:54pm"),t("1:55pm"),t("2:24pm"),t("2:25pm"),t("2:54pm"),t("2:55pm"),t("3:24pm"),t("3:25pm"),t("3:54pm"),t("3:55pm"),t("4:06pm"),null,t("4:24pm"),t("4:25pm"),t("4:39pm"),null,t("4:54pm"),t("4:55pm"),t("5:06pm"),t("5:24pm"),t("5:25pm"),t("5:39pm"),null,t("5:54pm"),t("5:55pm"),t("6:06pm"),null,t("6:24pm"),t("6:25pm"),t("6:39pm"),t("6:54pm"),t("6:55pm"),t("7:06pm"),t("7:24pm"),t("7:25pm"),t("7:39pm"),t("7:54pm"),t("7:55pm"),t("8:24pm"),t("8:25pm"),t("8:54pm"),t("8:55pm"),t("9:24pm"),t("9:25pm"),t("9:54pm"),t("9:55pm"),t("10:24pm"),t("10:25pm"),t("10:54pm"),t("10:55pm"),t("11:24pm"),t("11:25pm"),t("11:54pm"),t("11:55pm"),t("12:24am"),t("12:25am"),t("1:04am"),t("1:05am")],
"Sunnyvale":[t("5:58am"),t("6:38am"),t("7:09am"),t("7:28am"),t("7:43am"),t("7:58am"),t("8:09am"),t("8:28am"),t("8:43am"),t("8:58am"),t("8:59am"),t("9:09am"),t("9:28am"),t("9:29am"),t("9:43am"),t("9:58am"),t("9:59am"),t("10:28am"),t("10:29am"),t("10:58am"),t("10:59am"),t("11:28am"),t("11:29am"),t("11:58am"),t("11:59am"),t("12:28pm"),t("12:29pm"),t("12:58pm"),t("12:59pm"),t("1:28pm"),t("1:29pm"),t("1:58pm"),t("1:59pm"),t("2:28pm"),t("2:29pm"),t("2:58pm"),t("2:59pm"),t("3:28pm"),t("3:29pm"),t("3:58pm"),t("3:59pm"),t("4:09pm"),null,t("4:28pm"),t("4:29pm"),t("4:43pm"),null,t("4:58pm"),t("4:59pm"),t("5:09pm"),t("5:28pm"),t("5:29pm"),t("5:43pm"),null,t("5:58pm"),t("5:59pm"),t("6:09pm"),null,t("6:28pm"),t("6:29pm"),t("6:43pm"),t("6:58pm"),t("6:59pm"),t("7:09pm"),t("7:28pm"),t("7:29pm"),t("7:43pm"),t("7:58pm"),t("7:59pm"),t("8:28pm"),t("8:29pm"),t("8:58pm"),t("8:59pm"),t("9:28pm"),t("9:29pm"),t("9:58pm"),t("9:59pm"),t("10:28pm"),t("10:29pm"),t("10:58pm"),t("10:59pm"),t("11:28pm"),t("11:29pm"),t("11:58pm"),t("11:59pm"),t("12:28am"),t("12:29am"),t("1:08am"),t("1:09am")],
"Lawrence":[t("6:01am"),t("6:41am"),null,t("7:31am"),t("7:46am"),t("8:01am"),null,t("8:31am"),t("8:46am"),t("9:01am"),t("9:03am"),null,t("9:31am"),t("9:33am"),t("9:46am"),t("10:01am"),t("10:03am"),t("10:31am"),t("10:33am"),t("11:01am"),t("11:03am"),t("11:31am"),t("11:33am"),t("12:01pm"),t("12:03pm"),t("12:31pm"),t("12:33pm"),t("1:01pm"),t("1:03pm"),t("1:31pm"),t("1:33pm"),t("2:01pm"),t("2:03pm"),t("2:31pm"),t("2:33pm"),t("3:01pm"),t("3:03pm"),t("3:31pm"),t("3:33pm"),t("4:01pm"),t("4:03pm"),null,null,t("4:31pm"),t("4:33pm"),t("4:46pm"),null,t("5:01pm"),t("5:03pm"),null,t("5:31pm"),t("5:33pm"),t("5:46pm"),null,t("6:01pm"),t("6:03pm"),null,null,t("6:31pm"),t("6:33pm"),t("6:46pm"),t("7:01pm"),t("7:03pm"),null,t("7:31pm"),t("7:33pm"),t("7:46pm"),t("8:01pm"),t("8:03pm"),t("8:31pm"),t("8:33pm"),t("9:01pm"),t("9:03pm"),t("9:31pm"),t("9:33pm"),t("10:01pm"),t("10:03pm"),t("10:31pm"),t("10:33pm"),t("11:01pm"),t("11:03pm"),t("11:31pm"),t("11:33pm"),t("12:01am"),t("12:03am"),t("12:31am"),t("12:33am"),t("1:11am"),t("1:13am")],
"Santa Clara":[t("6:06am"),t("6:46am"),null,t("7:36am"),t("7:51am"),t("8:06am"),null,t("8:36am"),t("8:51am"),t("9:06am"),t("9:07am"),null,t("9:36am"),t("9:37am"),t("9:51am"),t("10:06am"),t("10:07am"),t("10:36am"),t("10:37am"),t("11:06am"),t("11:07am"),t("11:36am"),t("11:37am"),t("12:06pm"),t("12:07pm"),t("12:36pm"),t("12:37pm"),t("1:06pm"),t("1:07pm"),t("1:36pm"),t("1:37pm"),t("2:06pm"),t("2:07pm"),t("2:36pm"),t("2:37pm"),t("3:06pm"),t("3:07pm"),t("3:36pm"),t("3:37pm"),t("4:06pm"),t("4:07pm"),null,null,t("4:36pm"),t("4:37pm"),t("4:51pm"),null,t("5:06pm"),t("5:07pm"),null,t("5:36pm"),t("5:37pm"),t("5:51pm"),null,t("6:06pm"),t("6:07pm"),null,null,t("6:36pm"),t("6:37pm"),t("6:51pm"),t("7:06pm"),t("7:07pm"),null,t("7:36pm"),t("7:37pm"),t("7:51pm"),t("8:06pm"),t("8:07pm"),t("8:36pm"),t("8:37pm"),t("9:06pm"),t("9:07pm"),t("9:36pm"),t("9:37pm"),t("10:06pm"),t("10:07pm"),t("10:36pm"),t("10:37pm"),t("11:06pm"),t("11:07pm"),t("11:36pm"),t("11:37pm"),t("12:06am"),t("12:07am"),t("12:36am"),t("12:37am"),t("1:16am"),t("1:17am")],
"College Park":[null,null,null,null,null,t("8:08am"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,t("4:08pm"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
"San Jose Diridon":[t("6:10am"),t("6:50am"),t("7:14am"),t("7:40am"),t("7:55am"),t("8:10am"),t("8:14am"),t("8:40am"),t("8:55am"),t("9:10am"),t("9:11am"),t("9:14am"),t("9:40am"),t("9:41am"),t("9:55am"),t("10:10am"),t("10:11am"),t("10:40am"),t("10:41am"),t("11:10am"),t("11:11am"),t("11:40am"),t("11:41am"),t("12:10pm"),t("12:11pm"),t("12:40pm"),t("12:41pm"),t("1:10pm"),t("1:11pm"),t("1:40pm"),t("1:41pm"),t("2:10pm"),t("2:11pm"),t("2:40pm"),t("2:41pm"),t("3:10pm"),t("3:11pm"),t("3:40pm"),t("3:41pm"),t("4:10pm"),t("4:11pm"),t("4:14pm"),null,t("4:40pm"),t("4:41pm"),t("4:55pm"),null,t("5:10pm"),t("5:11pm"),t("5:14pm"),t("5:40pm"),t("5:41pm"),t("5:55pm"),null,t("6:10pm"),t("6:11pm"),t("6:14pm"),null,t("6:40pm"),t("6:41pm"),t("6:55pm"),t("7:10pm"),t("7:11pm"),t("7:14pm"),t("7:40pm"),t("7:41pm"),t("7:55pm"),t("8:10pm"),t("8:11pm"),t("8:40pm"),t("8:41pm"),t("9:10pm"),t("9:11pm"),t("9:40pm"),t("9:41pm"),t("10:10pm"),t("10:11pm"),t("10:40pm"),t("10:41pm"),t("11:10pm"),t("11:11pm"),t("11:40pm"),t("11:41pm"),t("12:10am"),t("12:11am"),t("12:40am"),t("12:41am"),t("1:20am"),t("1:21am")],
"Tamien":[null,null,null,null,null,null,null,null,null,t("9:17am"),null,null,null,null,null,t("10:17am"),null,null,null,t("11:17am"),null,null,null,t("12:17pm"),null,null,null,t("1:17pm"),null,null,null,t("2:17pm"),null,null,null,t("3:17pm"),null,null,null,t("4:17pm"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,t("5:17pm"),null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
};

const NB_TRAINS = buildTrains(NB_DEFS, NB_RAW);
const SB_TRAINS = buildTrains(SB_DEFS, SB_RAW);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function stationIndex(id) { return STATIONS.findIndex(s=>s.id===id); }

function parseMin(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return h*60+m;
}

function fmt(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

function durLabel(mins) {
  const a=Math.abs(mins),h=Math.floor(a/60),m=a%60;
  return h===0?`${m}m`:m===0?`${h}h`:`${h}h ${m}m`;
}

function waitLabel(w) {
  if(w<=0) return "Boarding";
  if(w<60) return `${w} min`;
  return durLabel(w);
}

function isSameDay(a,b) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}

const TYPE_CFG = {
  Express:{color:"#C8412C",label:"EXP"},
  Limited:{color:"#1A56A0",label:"LTD"},
  Local:  {color:"#2D6A4F",label:"LCL"},
  Weekend:{color:"#7B5EA7",label:"WKD"},
  SCC:    {color:"#8B6914",label:"SCC"},
};

const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_S=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function loadPrefs(){try{const v=localStorage.getItem("caltrain-v2");return v?JSON.parse(v):null;}catch{return null;}}
async function savePrefs(p){try{localStorage.setItem("caltrain-v2",JSON.stringify(p));}catch{}}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE ENGINE — uses actual stop times, no offsets
// ─────────────────────────────────────────────────────────────────────────────
function getTripsForRoute(fromId, toId, planDate, cutoffMins) {
  const fromIdx = stationIndex(fromId);
  const toIdx   = stationIndex(toId);
  if(fromIdx===toIdx) return [];
  const isNorth = fromIdx > toIdx; // lower index = more north (SF=0)
  const dow = planDate.getDay();
  const isWeekend = dow===0||dow===6;
  const trains = isNorth ? NB_TRAINS : SB_TRAINS;

  return trains
    .filter(tr => {
      if(isWeekend) return tr.type==="Weekend";
      return tr.type!=="Weekend"; // weekday: all non-weekend (Local, Limited, Express, SCC)
    })
    .map(tr => {
      const depT = tr.stops[fromId];
      const arrT = tr.stops[toId];
      if(!depT||!arrT) return null;
      const depM = parseMin(depT);
      let arrM = parseMin(arrT);
      let travel = arrM-depM;
      if(travel<0) travel+=24*60; // past midnight
      const wait = depM-cutoffMins;
      return {train:tr.train,type:tr.type,dep:depT,arr:arrT,depMins:depM,travel,wait};
    })
    .filter(Boolean)
    .filter(tr=>tr.wait>=-2)
    .sort((a,b)=>a.depMins-b.depMins);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [now,setNow]               = useState(new Date());
  const [planDate,setPlanDate]     = useState(null);
  const [planHour,setPlanHour]     = useState(null);
  const [dirOverride,setDirOverride] = useState(null);
  const [showAll,setShowAll]       = useState(false);
  const [fromId,setFromId]         = useState("CAL");
  const [toId,setToId]             = useState("SF");
  const [favorites,setFavorites]   = useState([]);
  const [modal,setModal]           = useState(null);
  const [prefsLoaded,setPrefsLoaded] = useState(false);

  useEffect(()=>{
    loadPrefs().then(p=>{
      if(p){
        if(p.fromId) setFromId(p.fromId);
        if(p.toId)   setToId(p.toId);
        if(p.favorites) setFavorites(p.favorites);
      }
      setPrefsLoaded(true);
    });
  },[]);

  useEffect(()=>{if(!prefsLoaded)return;savePrefs({fromId,toId,favorites});},[fromId,toId,favorites,prefsLoaded]);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t);},[]);
  useEffect(()=>{setShowAll(false);},[dirOverride,planDate,planHour,fromId,toId]);

  const effectiveDate = planDate??now;
  const dow = effectiveDate.getDay();
  const isWeekend = dow===0||dow===6;
  const isToday = isSameDay(effectiveDate,now);
  const isPlanningMode = !isToday||planHour!==null;

  const cutoffMins = isToday
    ? (planHour!==null ? planHour*60 : now.getHours()*60+now.getMinutes())
    : 0;

  const displayHour = planHour!==null?planHour:(isToday?now.getHours():6);

  // direction: determined by station order, overridable
  const fromIdx = stationIndex(fromId);
  const toIdx   = stationIndex(toId);
  const naturalDir = fromIdx>toIdx?"north":"south";
  const direction  = dirOverride??naturalDir;
  const isNorth    = direction==="north";

  // if stations conflict with overridden direction, swap effective stations
  const eFrom = isNorth?(fromIdx>toIdx?fromId:toId):(fromIdx<toIdx?fromId:toId);
  const eTo   = isNorth?(fromIdx>toIdx?toId:fromId):(fromIdx<toIdx?toId:fromId);

  const smartDir = displayHour<12?"north":"south";
  const isAuto   = dirOverride===null;

  const trips = getTripsForRoute(eFrom, eTo, effectiveDate, cutoffMins);
  const next  = trips[0];
  const rest  = trips.slice(1);
  const shown = showAll?rest:rest.slice(0,5);

  const fromStation = STATION_BY_ID[eFrom];
  const toStation   = STATION_BY_ID[eTo];
  const timeLabel = isToday
    ? now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true})
    : planHour!==null
      ? (planHour===0?"midnight":planHour<12?`${planHour} AM`:planHour===12?"noon":`${planHour-12} PM`)
      : "All day";
  const dateLabel = isToday?"Today":`${DAY_NAMES[dow]}, ${MONTH_S[effectiveDate.getMonth()]} ${effectiveDate.getDate()}`;

  const accentBg = isNorth
    ?"linear-gradient(135deg,#1a3a5c,#0e2840)"
    :"linear-gradient(135deg,#2d1a4a,#1a0e30)";

  const routeKey=`${eFrom}→${eTo}`;
  const isFav=favorites.some(f=>`${f.from}→${f.to}`===routeKey);
  function toggleFav(){
    if(isFav) setFavorites(favorites.filter(f=>`${f.from}→${f.to}`!==routeKey));
    else setFavorites([...favorites,{from:eFrom,to:eTo,label:`${fromStation.short} → ${toStation.short}`}]);
  }
  function applyRoute(from,to){setFromId(from);setToId(to);setDirOverride(null);setModal(null);}

  const dateChips = Array.from({length:7},(_,i)=>{
    const d=new Date(now);d.setDate(now.getDate()+i);d.setHours(0,0,0,0);return d;
  });

  function selectDate(d,i){
    if(i===0){setPlanDate(null);setPlanHour(null);}
    else{setPlanDate(new Date(d));setPlanHour(6);}
    setDirOverride(null);
  }

  return (
    <div style={{minHeight:"100vh",background:"#0f1923",display:"flex",flexDirection:"column",
      alignItems:"center",padding:"20px 16px 60px",fontFamily:"'Inter','Helvetica Neue',sans-serif",
      color:"#e8edf2",boxSizing:"border-box"}}>

      {/* Header */}
      <div style={{width:"100%",maxWidth:480,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#5b8db8",textTransform:"uppercase",marginBottom:4}}>
              Caltrain · {isNorth?"Northbound ↑":"Southbound ↓"}
            </div>
            <div style={{fontSize:18,fontWeight:700,lineHeight:1.3}}>
              {fromStation.short}
              <span style={{color:"#4a7fa3",fontWeight:400,fontSize:16}}> → </span>
              {toStation.short}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,fontWeight:700,color:isPlanningMode?"#e8d84a":"#e8edf2"}}>{dateLabel}</div>
            <div style={{fontSize:11,color:isPlanningMode?"#b8a830":"#6b8fa8",marginTop:2}}>
              {timeLabel} · {isWeekend?"Weekend":"Weekday"}
            </div>
          </div>
        </div>
      </div>

      {/* Date selector */}
      <div style={{width:"100%",maxWidth:480,marginBottom:14}}>
        <div style={{overflowX:"auto",display:"flex",gap:6,paddingBottom:4,scrollbarWidth:"none"}}>
          {dateChips.map((d,i)=>{
            const active=isSameDay(d,effectiveDate);
            const we=d.getDay()===0||d.getDay()===6;
            return(
              <button key={i} onClick={()=>selectDate(d,i)}
                style={{flexShrink:0,padding:"7px 12px",borderRadius:10,cursor:"pointer",
                  background:active?(i===0?"#0e2840":"#1a2e10"):"#141f2b",
                  border:active?`1px solid ${i===0?"#2a5a8a":"#3a6a1a"}`:"1px solid #1a2d40",
                  color:active?(i===0?"#5b8db8":"#7dde4a"):"#3a5a74",textAlign:"center",minWidth:56}}>
                <div style={{fontSize:12,fontWeight:700}}>{i===0?"Today":i===1?"Tmrw":DAY_NAMES[d.getDay()]}</div>
                <div style={{fontSize:10,marginTop:1,color:active?(i===0?"#3a6a94":"#5a8a30"):"#2a3a50"}}>
                  {i===0||i===1?DAY_NAMES[d.getDay()]:`${MONTH_S[d.getMonth()]} ${d.getDate()}`}
                </div>
                {we&&<div style={{fontSize:9,marginTop:1,color:active?"#9ab860":"#1e3a50",fontWeight:600}}>WE</div>}
              </button>
            );
          })}
        </div>

        <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:10,color:"#2a4a5a",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",flexShrink:0}}>From:</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {(isToday?[null,6,8,10,12,15,17,19,21]:[0,6,8,10,12,15,17,19,21]).map(h=>{
              const active=isToday?(planHour===h):(planHour===h||(h===0&&planHour===null));
              const label=h===null?"Now":h===0?"All day":h<12?`${h}AM`:h===12?"Noon":`${h-12}PM`;
              return(
                <button key={h??-1} onClick={()=>(!isToday&&h===0)?setPlanHour(null):setPlanHour(h)}
                  style={{padding:"4px 8px",borderRadius:7,
                    border:active?"1px solid #2a5a4a":"1px solid #1a2d40",
                    background:active?"#0e2a1e":"transparent",
                    color:active?"#5dde9e":"#2a4a5a",fontSize:11,cursor:"pointer",fontWeight:600}}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isPlanningMode&&(
          <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"7px 12px",background:"#1a2a14",border:"1px solid #2a4a1a",borderRadius:9}}>
            <div style={{fontSize:12,color:"#7dde4a",fontWeight:600}}>📅 Planning mode</div>
            <button onClick={()=>{setPlanDate(null);setPlanHour(null);setDirOverride(null);}}
              style={{fontSize:11,color:"#4a7a2a",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
              Back to live ↩
            </button>
          </div>
        )}
      </div>

      {/* Route selector */}
      <div style={{width:"100%",maxWidth:480,marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <StationBtn label="From" station={fromStation} onClick={()=>setModal("from")} />
          <button onClick={()=>{setFromId(toId);setToId(fromId);setDirOverride(null);}}
            style={{flexShrink:0,width:36,height:36,borderRadius:18,background:"#1a2d40",
              border:"1px solid #2a4a6a",color:"#5b8db8",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>⇅</button>
          <StationBtn label="To" station={toStation} onClick={()=>setModal("to")} />
          <button onClick={toggleFav}
            style={{flexShrink:0,width:36,height:36,borderRadius:18,
              background:isFav?"#1a3a1a":"#141f2b",
              border:`1px solid ${isFav?"#2a5a2a":"#1a2d40"}`,
              color:isFav?"#5dde9e":"#2a4a5a",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isFav?"★":"☆"}
          </button>
        </div>
        {favorites.length>0&&(
          <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>setModal("favorites")}
              style={{padding:"4px 10px",borderRadius:20,background:"transparent",
                border:"1px dashed #1a3050",color:"#3a5a74",fontSize:11,cursor:"pointer",fontWeight:600}}>
              ☆ Favorites
            </button>
            {favorites.slice(0,3).map(f=>(
              <button key={`${f.from}${f.to}`} onClick={()=>applyRoute(f.from,f.to)}
                style={{padding:"4px 10px",borderRadius:20,background:"#141f2b",
                  border:`1px solid ${eFrom===f.from&&eTo===f.to?"#2a5a8a":"#1a2d40"}`,
                  color:eFrom===f.from&&eTo===f.to?"#5b8db8":"#4a6a84",
                  fontSize:11,cursor:"pointer",fontWeight:500,
                  maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Direction toggle */}
      <div style={{width:"100%",maxWidth:480,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"#141f2b",borderRadius:12,padding:4,gap:4}}>
          {[{val:"north",emoji:"↑",label:"Northbound",sub:"toward SF"},
            {val:"south",emoji:"↓",label:"Southbound",sub:"toward San Jose"}].map(({val,emoji,label,sub})=>{
            const active=direction===val;
            return(
              <button key={val} onClick={()=>setDirOverride(dirOverride===val?null:val)}
                style={{padding:"9px 12px",borderRadius:9,cursor:"pointer",textAlign:"left",
                  border:active?`1px solid ${val==="north"?"#2a5a8a":"#5a2a8a"}`:"1px solid transparent",
                  background:active?(val==="north"?"#0e2840":"#1e0e38"):"transparent",
                  color:active?"#e8edf2":"#3a5a74"}}>
                <div style={{fontSize:13,fontWeight:700}}>{emoji} {label}</div>
                <div style={{fontSize:10,marginTop:1,color:active?"#5b8db8":"#1e3a50"}}>{sub}
                  {isAuto&&smartDir===val&&<span style={{marginLeft:6,color:"#5dde9e",fontWeight:700}}>AUTO</span>}
                </div>
              </button>
            );
          })}
        </div>
        {dirOverride!==null&&(
          <button onClick={()=>setDirOverride(null)}
            style={{marginTop:5,fontSize:11,color:"#2a4a62",background:"none",border:"none",cursor:"pointer",padding:"2px 4px"}}>
            ↩ Reset to auto
          </button>
        )}
      </div>

      {/* Next train hero */}
      {next?(
        <div style={{width:"100%",maxWidth:480,background:accentBg,
          border:`1px solid ${isNorth?"#2a5a8a":"#5a2a8a"}`,borderRadius:16,padding:"18px 22px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#5b8db8",textTransform:"uppercase",marginBottom:10}}>
            {isPlanningMode&&!isToday?"First train":"Next departure"}
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:44,fontWeight:800,lineHeight:1,letterSpacing:"-0.02em"}}>{fmt(next.dep)}</div>
              <div style={{marginTop:6,color:"#8ab8d8",fontSize:13}}>
                Arrives {fmt(next.arr)} · {durLabel(next.travel)} ride
              </div>
              <TrainBadge type={next.type} train={next.train} style={{marginTop:8}} />
            </div>
            <div style={{textAlign:"right",paddingBottom:2}}>
              {isToday&&planHour===null?(
                <>
                  <div style={{fontSize:next.wait<=5?30:26,fontWeight:800,lineHeight:1,
                    color:next.wait<=0?"#5dde9e":next.wait<=5?"#f5a623":next.wait<=15?"#e8d84a":"#5dde9e"}}>
                    {waitLabel(next.wait)}
                  </div>
                  {next.wait>0&&<div style={{fontSize:10,color:"#4a6a84",marginTop:3}}>until departure</div>}
                </>
              ):(
                <div style={{fontSize:13,fontWeight:600,color:"#7dde4a"}}>{dateLabel}</div>
              )}
            </div>
          </div>
        </div>
      ):(
        <div style={{width:"100%",maxWidth:480,background:"#141f2b",border:"1px solid #1a2d40",
          borderRadius:16,padding:"24px",textAlign:"center",color:"#3a5a74",marginBottom:14,fontSize:14}}>
          No trains for this route on this day/time.
          {isWeekend&&<div style={{marginTop:6,fontSize:12,color:"#2a4a5a"}}>This station may not have weekend service.</div>}
        </div>
      )}

      {/* Upcoming list */}
      {shown.length>0&&(
        <div style={{width:"100%",maxWidth:480}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#2a4a5a",textTransform:"uppercase",marginBottom:10}}>
            {isPlanningMode&&!isToday?"All trains":"Coming up"}
          </div>
          {shown.map(tr=><TrainRow key={tr.train} t={tr} isLive={isToday&&planHour===null} />)}
          {rest.length>5&&(
            <button onClick={()=>setShowAll(!showAll)}
              style={{width:"100%",marginTop:8,padding:"11px",background:"transparent",
                border:"1px solid #1a3050",borderRadius:10,color:"#3a5a74",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              {showAll?`Show fewer`:`Show all ${rest.length} remaining trains`}
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{width:"100%",maxWidth:480,marginTop:24,padding:"11px 16px",background:"#141f2b",
        borderRadius:12,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        {Object.entries(TYPE_CFG)
          .filter(([k])=>isWeekend?k==="Weekend":k!=="Weekend")
          .map(([type,cfg])=>(
            <div key={type} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{background:cfg.color,color:"#fff",borderRadius:4,fontSize:9,fontWeight:800,padding:"2px 5px",letterSpacing:"0.06em"}}>{cfg.label}</span>
              <span style={{fontSize:11,color:"#4a6a84"}}>{type==="SCC"?"S.County Connector":type}</span>
            </div>
          ))}
        <span style={{marginLeft:"auto",fontSize:10,color:"#1e3548"}}>caltrain.com · Jan 31 2026</span>
      </div>

      {/* Modals */}
      {modal&&(
        <StationModal
          title={modal==="favorites"?"Favorites":modal==="from"?"Choose departure":"Choose arrival"}
          mode={modal} currentFrom={fromId} currentTo={toId}
          favorites={favorites} setFavorites={setFavorites}
          onSelect={(from,to)=>applyRoute(from,to)}
          onClose={()=>setModal(null)}
          onPickStation={id=>{modal==="from"?setFromId(id):setToId(id);setModal(null);}}
        />
      )}
    </div>
  );
}

function StationBtn({label,station,onClick}){
  return(
    <button onClick={onClick} style={{flex:1,padding:"8px 12px",background:"#141f2b",
      border:"1px solid #1e3550",borderRadius:10,color:"#e8edf2",cursor:"pointer",textAlign:"left",minWidth:0}}>
      <div style={{fontSize:10,color:"#3a5a74",marginBottom:2,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{station.short}</div>
    </button>
  );
}

function TrainBadge({type,train,style:sx={}}){
  const cfg=TYPE_CFG[type]||TYPE_CFG.Local;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,...sx}}>
      <span style={{background:cfg.color,color:"#fff",borderRadius:4,fontSize:9,fontWeight:800,padding:"2px 5px",letterSpacing:"0.06em"}}>{cfg.label}</span>
      <span style={{fontSize:11,color:"#4a6a84",fontWeight:600}}>#{train}</span>
    </div>
  );
}

function TrainRow({t,isLive}){
  const urgent=isLive&&t.wait>=0&&t.wait<=10;
  return(
    <div style={{display:"flex",alignItems:"center",padding:"11px 14px",marginBottom:5,
      background:"#141f2b",borderRadius:11,border:`1px solid ${urgent?"#1e3a2a":"#131e2b"}`,gap:12}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span style={{fontSize:18,fontWeight:700,color:"#d8e8f4"}}>{fmt(t.dep)}</span>
          <span style={{fontSize:12,color:"#3a5a74"}}>→ {fmt(t.arr)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
          <TrainBadge type={t.type} train={t.train} />
          <span style={{fontSize:11,color:"#2a4a5e"}}>{durLabel(t.travel)} ride</span>
        </div>
      </div>
      {isLive&&(
        <div style={{fontSize:13,fontWeight:700,minWidth:52,textAlign:"right",color:urgent?"#f5a623":"#2a5a3a"}}>
          {waitLabel(t.wait)}
        </div>
      )}
    </div>
  );
}

function StationModal({title,mode,currentFrom,currentTo,favorites,setFavorites,onSelect,onClose,onPickStation}){
  const [search,setSearch]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{setTimeout(()=>inputRef.current?.focus(),80);},[]);
  const q=search.toLowerCase();
  const filtered=mode==="favorites"?favorites
    :STATIONS.filter(s=>s.name.toLowerCase().includes(q)||s.short.toLowerCase().includes(q));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,
      display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{background:"#111b26",borderRadius:"20px 20px 0 0",padding:"0 0 32px",
        maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,background:"#2a3a4a",borderRadius:2}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 12px"}}>
          <div style={{fontSize:15,fontWeight:700}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#4a6a84",fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>×</button>
        </div>
        {mode!=="favorites"&&(
          <div style={{padding:"0 16px 10px"}}>
            <input ref={inputRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search stations…"
              style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",background:"#1a2d3e",
                border:"1px solid #2a4a5a",borderRadius:10,color:"#e8edf2",fontSize:14,outline:"none"}}/>
          </div>
        )}
        <div style={{overflowY:"auto",flex:1,padding:"0 16px"}}>
          {mode==="favorites"&&favorites.length===0&&(
            <div style={{textAlign:"center",color:"#3a5a74",padding:"32px 0",fontSize:14}}>No favorites yet. Tap ☆ on a route to save it.</div>
          )}
          {mode==="favorites"
            ?favorites.map(f=>(
                <div key={`${f.from}${f.to}`} style={{display:"flex",alignItems:"center",padding:"12px 4px",borderBottom:"1px solid #141f2b",gap:10}}>
                  <button onClick={()=>onSelect(f.from,f.to)}
                    style={{flex:1,background:"none",border:"none",color:"#d8e8f4",cursor:"pointer",textAlign:"left",fontSize:14,fontWeight:500}}>
                    {f.label}
                  </button>
                  <button onClick={()=>setFavorites(favorites.filter(x=>!(x.from===f.from&&x.to===f.to)))}
                    style={{background:"none",border:"none",color:"#3a5a74",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
                </div>
              ))
            :filtered.map(s=>{
                const isCur=mode==="from"?s.id===currentFrom:s.id===currentTo;
                const isOth=mode==="from"?s.id===currentTo:s.id===currentFrom;
                return(
                  <button key={s.id} onClick={()=>!isOth&&onPickStation(s.id)}
                    style={{width:"100%",padding:"12px 8px",background:"none",border:"none",
                      borderBottom:"1px solid #141f2b",
                      color:isCur?"#5b8db8":isOth?"#2a4a5e":"#d8e8f4",
                      cursor:isOth?"not-allowed":"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:isCur?700:500}}>{s.name}</div>
                      <div style={{fontSize:11,color:"#3a5a6a",marginTop:1}}>Zone {s.zone}</div>
                    </div>
                    {isCur&&<span style={{fontSize:11,color:"#5b8db8",fontWeight:600}}>selected</span>}
                    {isOth&&<span style={{fontSize:11,color:"#2a4060"}}>other end</span>}
                  </button>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
