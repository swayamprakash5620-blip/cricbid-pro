import type { PlayerSnapshot } from "@/types/auction";
import { p } from "./seed-players-extended";

const RF = "Right-arm fast";
const RFM = "Right-arm fast-medium";
const RM = "Right-arm medium";
const LF = "Left-arm fast";
const LFM = "Left-arm fast-medium";
const OB = "Right-arm offbreak";
const LB = "Legbreak googly";
const SLA = "Slow left-arm orthodox";
const LWS = "Left-arm wrist-spin";
const NA = "None";

/**
 * Additional active players currently in the field (IPL squads, international
 * squads across Test / ODI / T20I, plus leading Associate nation players).
 */
export const EXTRA_PLAYERS_SEED: PlayerSnapshot[] = [
  // ==================== INDIA — CAPPED & IPL REGULARS ====================
  p("Umran Malik", "India", "BOWL", "R", RF, "FB", 75, "KKR", 81, "IPL 26 6 3.0 60.0 29 9.4 5/25|T20I 8 0 0 0 11 10.5 2/9|ODI 10 2 2.0 40.0 13 6.5 3/57"),
  p("Jaydev Unadkat", "India", "BOWL", "R", LFM, "FB", 50, "SRH", 81, "IPL 105 240 10.0 105.0 95 8.9 5/25|T20I 10 0 0 0 14 8.9 3/38|ODI 8 8 8.0 50.0 9 5.6 3/41|TEST 4 23 7.7 40.0 3 4.0 2/50"),
  p("Vijay Shankar", "India", "AR", "R", RM, "ARS", 30, "CSK", 79, "IPL 76 1233 27.0 128.0 9 9.2 2/19|T20I 9 101 25.3 128.0 5 8.3 2/32|ODI 12 223 31.9 94.0 4 5.8 2/15"),
  p("Deepak Hooda", "India", "AR", "R", OB, "ARS", 50, "CSK", 80, "IPL 125 1471 18.4 129.0 10 7.8 2/12|T20I 21 368 30.7 147.0 6 7.1 4/10|ODI 10 153 25.5 102.0 3 5.6 1/6"),
  p("Rahul Tripathi", "India", "BAT", "R", RM, "BT", 50, "CSK", 80, "IPL 100 2291 26.3 139.0 0 0 93|T20I 5 97 19.4 141.0 0 0 35"),
  p("Manish Pandey", "India", "BAT", "R", RM, "BT", 50, "KKR", 79, "IPL 174 3942 29.0 121.0 0 0 114*|T20I 39 709 44.3 126.0 0 0 79*|ODI 29 566 33.3 86.0 0 0 104*"),
  p("Karn Sharma", "India", "BOWL", "L", LB, "SP", 50, "MI", 80, "IPL 80 398 14.7 140.0 76 8.2 4/16|T20I 1 0 0 0 0 8.5 0/34|ODI 2 0 0 0 0 7.0 0/48|TEST 1 4 2.0 25.0 4 4.0 2/95"),
  p("Mayank Markande", "India", "BOWL", "R", LB, "SP", 30, "KKR", 79, "IPL 37 48 8.0 110.0 37 8.8 4/15|T20I 3 0 0 0 1 9.0 1/33"),
  p("Shivam Mavi", "India", "BOWL", "R", RFM, "FB", 50, "LSG", 79, "IPL 32 92 11.5 130.0 30 8.7 4/21|T20I 6 9 4.5 90.0 7 8.4 4/22"),
  p("Navdeep Saini", "India", "BOWL", "R", RF, "FB", 50, "RR", 78, "IPL 32 25 6.3 90.0 22 8.6 2/19|T20I 11 13 13.0 108.0 13 7.0 3/17|ODI 8 107 26.8 85.0 6 6.9 2/58|TEST 2 8 4.0 30.0 4 3.4 2/54"),
  p("Prithvi Shaw", "India", "BAT", "R", OB, "BT", 50, "INTL", 79, "IPL 79 1892 23.9 147.0 0 0 99|ODI 6 189 31.5 113.0 0 0 49|TEST 5 339 42.4 86.0 0 0 134"),
  p("Umesh Yadav", "India", "BOWL", "R", RF, "FB", 50, "INTL", 79, "IPL 148 210 9.0 115.0 144 8.4 4/23|T20I 9 12 12.0 100.0 12 9.1 3/19|ODI 75 79 8.8 60.0 106 6.0 4/31|TEST 57 1065 12.0 70.0 170 3.5 6/88"),

  // ==================== INDIA — UNCAPPED IPL TALENT ====================
  p("Harpreet Brar", "India", "AR", "L", SLA, "UC", 50, "PBKS", 82, "IPL 49 290 19.3 130.0 30 7.4 3/13", "U"),
  p("Arjun Tendulkar", "India", "AR", "L", LFM, "UC", 30, "LSG", 78, "IPL 5 13 13.0 108.0 3 9.4 1/9", "U"),
  p("Mahipal Lomror", "India", "AR", "L", SLA, "UC", 50, "GT", 80, "IPL 40 527 19.5 140.0 1 8.8 1/14", "U"),
  p("Abdul Samad", "India", "BAT", "R", LB, "UC", 75, "LSG", 82, "IPL 61 742 19.5 148.0 2 10.1 1/5", "U"),
  p("Anuj Rawat", "India", "WK", "L", NA, "UC", 30, "GT", 79, "IPL 24 318 17.7 124.0 0 0 66*", "U"),
  p("Akash Madhwal", "India", "BOWL", "R", RFM, "UC", 50, "RR", 80, "IPL 13 2 1.0 50.0 15 9.4 5/5", "U"),
  p("Mukesh Choudhary", "India", "BOWL", "L", LFM, "UC", 30, "CSK", 79, "IPL 15 6 3.0 75.0 16 9.6 4/46", "U"),
  p("Kartik Tyagi", "India", "BOWL", "R", RF, "UC", 30, "GT", 79, "IPL 21 10 5.0 70.0 15 9.5 3/22", "U"),
  p("Kumar Kartikeya", "India", "BOWL", "L", SLA, "UC", 30, "RR", 79, "IPL 13 3 3.0 60.0 7 8.0 2/24", "U"),
  p("Akash Singh", "India", "BOWL", "R", LFM, "UC", 30, "LSG", 79, "IPL 15 5 5.0 70.0 12 9.6 2/30", "U"),
  p("Prince Yadav", "India", "BOWL", "R", RM, "UC", 30, "LSG", 79, "IPL 6 0 0 0 4 9.7 2/40", "U"),
  p("Shaik Rasheed", "India", "BAT", "R", LB, "UC", 30, "CSK", 79, "IPL 3 50 16.7 125.0 0 0 27", "U"),
  p("Gurjapneet Singh", "India", "BOWL", "R", LFM, "UC", 30, "CSK", 78, "IPL 2 0 0 0 1 10.5 1/41", "U"),
  p("Shreyas Gopal", "India", "BOWL", "R", LB, "UC", 30, "CSK", 79, "IPL 52 150 14.0 115.0 49 7.9 4/16", "U"),
  p("Musheer Khan", "India", "AR", "R", SLA, "UC", 30, "PBKS", 79, "IPL 2 0 0 0 0 8.0 0/16", "U"),
  p("Suryansh Shedge", "India", "AR", "R", RM, "UC", 30, "PBKS", 78, "IPL 4 20 6.7 130.0 0 10.0 0/12", "U"),
  p("Shubham Dubey", "India", "BAT", "L", NA, "UC", 30, "RR", 80, "IPL 10 120 20.0 160.0 0 0 33*", "U"),
  p("Yudhvir Singh", "India", "BOWL", "R", RFM, "UC", 30, "RR", 78, "IPL 8 15 7.5 100.0 6 9.8 2/27", "U"),
  p("Swapnil Singh", "India", "AR", "R", SLA, "UC", 30, "RCB", 79, "IPL 13 40 10.0 125.0 8 8.1 2/28", "U"),
  p("Manoj Bhandage", "India", "AR", "L", RM, "UC", 30, "RCB", 78, "IPL 3 10 10.0 140.0 0 9.0 0/20", "U"),
  p("Robin Minz", "India", "WK", "L", NA, "UC", 30, "MI", 78, "IPL 2 7 3.5 90.0 0 0 4", "U"),
  p("Zeeshan Ansari", "India", "BOWL", "R", LB, "UC", 30, "SRH", 79, "IPL 10 0 0 0 6 9.5 3/42", "U"),
  p("Harsh Dubey", "India", "AR", "L", SLA, "UC", 30, "SRH", 79, "IPL 3 0 0 0 3 9.0 2/34", "U"),
  p("Kumar Kushagra", "India", "WK", "R", NA, "UC", 30, "GT", 78, "IPL 6 25 6.3 110.0 0 0 13", "U"),
  p("Arshad Khan", "India", "AR", "L", LFM, "UC", 30, "GT", 79, "IPL 18 170 21.3 150.0 12 10.2 3/37", "U"),
  p("Manav Suthar", "India", "BOWL", "L", SLA, "UC", 30, "GT", 78, "IPL 3 1 1.0 50.0 1 9.0 1/31", "U"),
  p("N Jagadeesan", "India", "WK", "R", NA, "UC", 30, "INTL", 80, "IPL 13 162 18.0 115.0 0 0 39", "U"),
  p("Simarjeet Singh", "India", "BOWL", "R", RM, "UC", 30, "SRH", 78, "IPL 13 5 5.0 70.0 9 9.3 2/26", "U"),
  p("Vishnu Vinod", "India", "WK", "R", NA, "UC", 30, "PBKS", 78, "IPL 6 45 11.3 135.0 0 0 30", "U"),
  p("Lalit Yadav", "India", "AR", "R", OB, "UC", 30, "DC", 78, "IPL 27 305 19.1 118.0 10 7.9 2/11", "U"),
  p("Anukul Roy", "India", "AR", "L", SLA, "UC", 30, "KKR", 79, "IPL 11 50 16.7 120.0 4 7.6 2/22", "U"),
  p("Luvnith Sisodia", "India", "WK", "L", NA, "UC", 30, "KKR", 77, "IPL 2 10 5.0 100.0 0 0 6", "U"),
  p("Kamlesh Nagarkoti", "India", "BOWL", "R", RF, "UC", 30, "CSK", 77, "IPL 12 40 13.3 110.0 5 9.4 2/13", "U"),
  p("Shams Mulani", "India", "AR", "L", SLA, "UC", 30, "INTL", 78, "IPL 1 0 0 0 0 9.0 0/18", "U"),

  // ==================== AUSTRALIA ====================
  p("Josh Philippe", "Australia", "WK", "R", NA, "WKS", 50, "INTL", 80, "IPL 5 78 19.5 102.0 0 0 33|T20I 10 129 14.3 113.0 0 0 45|ODI 3 25 8.3 69.0 0 0 13"),
  p("Jhye Richardson", "Australia", "BOWL", "R", RF, "FB", 75, "INTL", 82, "IPL 6 4 4.0 50.0 3 10.6 1/34|T20I 18 30 7.5 100.0 24 8.1 3/8|ODI 15 90 12.9 75.0 24 5.3 4/26|TEST 3 26 6.5 40.0 11 2.9 5/42"),
  p("Riley Meredith", "Australia", "BOWL", "R", RF, "FB", 50, "INTL", 80, "IPL 18 10 5.0 80.0 18 9.0 2/25|T20I 9 5 5.0 70.0 9 9.5 2/24|ODI 1 0 0 0 0 7.0 0/49"),
  p("Ashton Agar", "Australia", "AR", "L", SLA, "ARS", 50, "INTL", 80, "T20I 49 439 16.3 129.0 55 7.1 6/30|ODI 22 383 22.5 99.0 18 5.3 5/38|TEST 5 195 32.5 55.0 9 3.2 2/58"),
  p("Ashton Turner", "Australia", "BAT", "R", OB, "BT", 50, "INTL", 79, "IPL 6 15 3.0 80.0 0 0 9|T20I 18 160 16.0 145.0 1 8.0 1/12|ODI 9 213 30.4 125.0 0 0 84*"),
  p("Michael Neser", "Australia", "AR", "R", RFM, "ARS", 50, "INTL", 82, "ODI 2 46 23.0 85.0 2 5.4 2/46|TEST 2 38 12.7 42.0 7 3.4 5/56"),
  p("Jake Weatherald", "Australia", "BAT", "L", LB, "BT", 50, "INTL", 80, "TEST 2 96 24.0 58.0 0 0 72"),
  p("Lance Morris", "Australia", "BOWL", "R", RF, "FB", 50, "INTL", 80, "ODI 2 0 0 0 2 6.0 1/29"),
  p("Nathan McSweeney", "Australia", "BAT", "R", OB, "BT", 50, "INTL", 79, "TEST 3 72 14.4 37.0 0 0 39*"),
  p("Ben McDermott", "Australia", "BAT", "R", NA, "BT", 50, "INTL", 79, "T20I 25 437 20.8 128.0 0 0 53|ODI 5 169 33.8 86.0 0 0 104"),

  // ==================== ENGLAND ====================
  p("Tom Banton", "England", "WK", "R", NA, "WKS", 75, "INTL", 82, "IPL 2 18 9.0 112.0 0 0 16|T20I 14 327 23.4 140.0 0 0 73|ODI 6 172 28.7 95.0 0 0 58"),
  p("Jordan Cox", "England", "WK", "R", NA, "WKS", 50, "INTL", 80, "T20I 4 70 17.5 150.0 0 0 55|ODI 3 31 10.3 80.0 0 0 21"),
  p("Luke Wood", "England", "BOWL", "L", LF, "FB", 50, "INTL", 80, "IPL 1 0 0 0 1 17.0 1/68|T20I 11 9 4.5 90.0 13 8.6 3/24|ODI 3 0 0 0 4 7.0 2/42"),
  p("Matthew Potts", "England", "BOWL", "R", RFM, "FB", 50, "INTL", 81, "ODI 7 30 10.0 70.0 9 5.6 4/38|TEST 9 200 16.7 55.0 31 3.3 5/33"),
  p("Tom Curran", "England", "AR", "R", RFM, "ARS", 50, "INTL", 79, "IPL 13 75 15.0 120.0 9 9.3 2/20|T20I 30 64 10.7 120.0 25 9.1 4/36|ODI 28 296 19.7 90.0 36 6.1 5/35|TEST 2 66 33.0 37.0 2 3.4 1/65"),
  p("Liam Dawson", "England", "AR", "L", SLA, "ARS", 50, "INTL", 81, "T20I 14 87 14.5 110.0 14 7.4 3/27|ODI 6 84 21.0 90.0 9 5.3 4/52|TEST 4 120 20.0 40.0 12 3.5 5/107"),
  p("Chris Jordan", "England", "BOWL", "R", RFM, "FB", 50, "MI", 79, "IPL 31 155 15.5 135.0 30 9.7 4/11|T20I 95 450 13.2 135.0 107 8.6 4/6|ODI 35 170 15.5 95.0 45 5.9 5/29|TEST 8 180 20.0 52.0 21 3.0 4/18"),
  p("Tom Hartley", "England", "BOWL", "L", SLA, "SP", 50, "INTL", 80, "ODI 2 10 10.0 70.0 2 6.2 1/38|TEST 8 260 21.7 60.0 31 3.6 7/62"),
  p("Sonny Baker", "England", "BOWL", "R", RF, "FB", 50, "INTL", 79, "ODI 3 4 4.0 40.0 4 7.4 4/76"),
  p("Ben Foakes", "England", "WK", "R", NA, "WKS", 50, "INTL", 80, "ODI 1 61 61.0 80.0 0 0 61*|TEST 25 1200 32.0 46.0 0 0 113"),
  p("Dan Lawrence", "England", "BAT", "R", OB, "BT", 50, "INTL", 79, "T20I 2 31 15.5 130.0 0 0 22|TEST 14 650 27.0 52.0 2 3.8 1/0"),

  // ==================== SOUTH AFRICA ====================
  p("Faf du Plessis", "South Africa", "BAT", "R", LB, "BT", 100, "DC", 83, "IPL 154 4773 35.6 136.0 0 0 96|T20I 50 1528 35.5 134.0 0 0 119|ODI 143 5507 47.5 88.0 0 0 185|TEST 69 4163 40.0 44.0 0 0 199"),
  p("Matthew Breetzke", "South Africa", "BAT", "R", NA, "BT", 75, "LSG", 83, "IPL 3 80 26.7 150.0 0 0 41|T20I 10 220 22.0 135.0 0 0 51|ODI 5 463 92.6 100.0 0 0 150"),
  p("Lhuan-dre Pretorius", "South Africa", "WK", "L", NA, "WKS", 50, "RR", 81, "IPL 2 25 12.5 140.0 0 0 17|T20I 4 90 22.5 150.0 0 0 41|TEST 1 30 15.0 60.0 0 0 26"),
  p("George Linde", "South Africa", "AR", "L", SLA, "ARS", 50, "INTL", 81, "T20I 16 150 18.8 145.0 15 7.0 4/23|ODI 3 30 15.0 90.0 3 5.0 2/33|TEST 4 150 21.4 50.0 10 3.4 5/64"),
  p("Ottneil Baartman", "South Africa", "BOWL", "R", RFM, "FB", 50, "INTL", 80, "T20I 10 4 4.0 60.0 15 8.0 4/11|ODI 3 0 0 0 4 6.0 2/36"),
  p("Bjorn Fortuin", "South Africa", "BOWL", "L", SLA, "SP", 50, "INTL", 79, "T20I 15 25 8.3 100.0 13 7.0 2/14|ODI 6 30 15.0 80.0 7 5.0 2/26"),
  p("Rilee Rossouw", "South Africa", "BAT", "L", OB, "BT", 75, "INTL", 81, "IPL 22 520 26.0 150.0 0 0 82|T20I 25 700 35.0 158.0 0 0 109|ODI 36 1239 35.4 95.0 0 0 132"),
  p("Prenelan Subrayen", "South Africa", "BOWL", "R", OB, "SP", 30, "INTL", 78, "ODI 2 5 5.0 50.0 2 5.0 1/40|TEST 1 6 3.0 30.0 1 3.4 1/70"),

  // ==================== NEW ZEALAND ====================
  p("Jimmy Neesham", "New Zealand", "AR", "L", RFM, "ARS", 75, "INTL", 82, "IPL 14 61 7.6 110.0 5 9.0 2/23|T20I 85 1050 22.0 150.0 60 8.9 4/20|ODI 76 1490 29.8 103.0 70 6.3 5/27|TEST 12 709 33.8 55.0 14 3.2 3/42"),
  p("Adam Milne", "New Zealand", "BOWL", "R", RF, "FB", 50, "INTL", 80, "IPL 10 10 5.0 80.0 7 9.0 2/12|T20I 45 50 10.0 100.0 50 8.2 4/26|ODI 40 125 10.4 80.0 41 5.6 3/49"),
  p("Ben Sears", "New Zealand", "BOWL", "R", RF, "FB", 50, "INTL", 80, "T20I 12 6 6.0 80.0 14 8.6 3/15|ODI 8 10 5.0 60.0 12 5.9 5/34"),
  p("Nathan Smith", "New Zealand", "AR", "R", RFM, "ARS", 50, "INTL", 81, "ODI 8 120 30.0 105.0 12 5.9 4/31|TEST 3 90 22.5 60.0 9 3.6 4/58"),
  p("Henry Nicholls", "New Zealand", "BAT", "L", OB, "BT", 50, "INTL", 80, "T20I 10 120 15.0 110.0 0 0 32|ODI 75 2000 33.0 80.0 0 0 124*|TEST 60 3000 37.0 49.0 0 0 200*"),
  p("Mitchell Hay", "New Zealand", "WK", "R", NA, "WKS", 50, "INTL", 80, "T20I 10 180 22.5 140.0 0 0 51|ODI 5 210 70.0 110.0 0 0 99*"),
  p("Zak Foulkes", "New Zealand", "AR", "R", RFM, "ARS", 30, "INTL", 78, "T20I 6 30 15.0 130.0 7 8.5 4/38"),
  p("Ajaz Patel", "New Zealand", "BOWL", "L", SLA, "SP", 50, "INTL", 82, "T20I 7 2 2.0 50.0 11 6.2 2/15|TEST 22 300 9.0 40.0 80 3.1 10/119"),

  // ==================== WEST INDIES ====================
  p("Kyle Mayers", "West Indies", "AR", "L", RM, "ARS", 75, "INTL", 81, "IPL 13 379 29.2 145.0 0 9.0 0/10|T20I 40 900 24.0 135.0 15 8.6 2/17|ODI 30 900 32.0 95.0 15 5.5 3/23|TEST 16 900 32.0 50.0 15 2.7 5/18"),
  p("Johnson Charles", "West Indies", "WK", "R", NA, "WKS", 50, "KKR", 79, "IPL 2 25 12.5 120.0 0 0 15|T20I 60 1500 25.0 130.0 0 0 118|ODI 50 1300 26.0 80.0 0 0 130"),
  p("Keacy Carty", "West Indies", "BAT", "R", RM, "BT", 50, "INTL", 80, "ODI 30 950 36.5 82.0 0 0 102|TEST 4 120 15.0 40.0 0 0 34"),
  p("Matthew Forde", "West Indies", "AR", "R", RFM, "ARS", 50, "INTL", 80, "T20I 12 70 14.0 160.0 12 8.8 3/20|ODI 15 150 15.0 110.0 25 5.4 5/48"),
  p("Justin Greaves", "West Indies", "AR", "R", RM, "ARS", 30, "INTL", 79, "ODI 12 250 25.0 90.0 6 5.6 2/30|TEST 8 400 28.6 45.0 8 3.0 3/35"),
  p("Jomel Warrican", "West Indies", "BOWL", "L", SLA, "SP", 30, "INTL", 80, "TEST 18 250 10.0 40.0 70 2.9 6/32"),
  p("Kemar Roach", "West Indies", "BOWL", "R", RF, "FB", 50, "INTL", 81, "ODI 95 300 8.0 70.0 125 5.0 6/27|TEST 85 1300 12.0 40.0 280 2.9 6/48"),
  p("Alick Athanaze", "West Indies", "BAT", "L", OB, "BT", 30, "INTL", 79, "ODI 15 400 28.6 85.0 2 5.4 1/20|TEST 10 450 25.0 50.0 1 3.5 1/12"),
  p("Obed McCoy", "West Indies", "BOWL", "L", LFM, "FB", 50, "RR", 79, "IPL 8 3 3.0 50.0 11 8.8 2/19|T20I 30 30 6.0 100.0 40 9.6 6/17|ODI 2 0 0 0 2 7.0 1/40"),

  // ==================== AFGHANISTAN ====================
  p("Rahmat Shah", "Afghanistan", "BAT", "R", LB, "BT", 50, "INTL", 81, "ODI 120 4000 35.0 72.0 15 5.6 5/32|TEST 12 1000 42.0 48.0 0 4.0 0/10"),
  p("Najibullah Zadran", "Afghanistan", "BAT", "L", OB, "BT", 50, "INTL", 79, "T20I 115 2100 27.0 135.0 0 0 75*|ODI 95 2000 30.0 90.0 0 0 104*"),
  p("Karim Janat", "Afghanistan", "AR", "R", RM, "ARS", 30, "INTL", 78, "T20I 70 900 20.0 125.0 40 8.5 5/11|ODI 5 30 7.5 75.0 3 5.6 2/24"),
  p("Sediqullah Atal", "Afghanistan", "BAT", "L", NA, "BT", 50, "INTL", 81, "T20I 10 220 24.4 125.0 0 0 52|ODI 10 400 44.4 85.0 0 0 85"),
  p("Fareed Ahmad", "Afghanistan", "BOWL", "L", LFM, "FB", 30, "INTL", 79, "T20I 45 40 6.7 90.0 60 7.6 4/30|ODI 25 40 6.7 70.0 35 5.6 4/50"),
  p("Qais Ahmad", "Afghanistan", "BOWL", "R", LB, "SP", 30, "INTL", 78, "T20I 10 30 15.0 130.0 10 8.0 2/20|ODI 3 10 5.0 70.0 3 5.4 2/40"),
  p("Ikram Alikhil", "Afghanistan", "WK", "L", NA, "WKS", 30, "INTL", 78, "ODI 25 600 27.0 75.0 0 0 86"),
  p("Darwish Rasooli", "Afghanistan", "BAT", "R", OB, "BT", 30, "INTL", 78, "T20I 4 70 17.5 150.0 0 0 42"),

  // ==================== SRI LANKA ====================
  p("Avishka Fernando", "Sri Lanka", "BAT", "R", RM, "BT", 75, "INTL", 82, "T20I 30 600 20.0 120.0 0 0 64|ODI 50 1600 33.0 92.0 0 0 127"),
  p("Dinesh Chandimal", "Sri Lanka", "WK", "R", NA, "WKS", 50, "INTL", 81, "T20I 70 1000 18.0 105.0 0 0 66*|ODI 160 3800 31.0 72.0 0 0 111|TEST 85 6000 42.0 48.0 0 0 206*"),
  p("Dushmantha Chameera", "Sri Lanka", "BOWL", "R", RF, "FB", 75, "DC", 82, "IPL 6 3 3.0 50.0 5 8.8 2/22|T20I 60 120 8.0 100.0 60 8.0 4/17|ODI 50 300 12.0 80.0 60 5.6 5/16|TEST 12 150 9.0 40.0 30 3.6 5/47"),
  p("Nuwan Thushara", "Sri Lanka", "BOWL", "R", RFM, "FB", 75, "RCB", 81, "IPL 7 2 2.0 40.0 8 9.0 2/24|T20I 25 20 5.0 80.0 35 7.9 5/20|ODI 2 0 0 0 2 6.0 1/40"),
  p("Janith Liyanage", "Sri Lanka", "AR", "R", RM, "ARS", 50, "INTL", 80, "T20I 6 50 12.5 110.0 2 8.0 1/12|ODI 25 800 40.0 85.0 15 5.4 3/34"),
  p("Sadeera Samarawickrama", "Sri Lanka", "WK", "R", NA, "WKS", 50, "INTL", 80, "T20I 20 300 18.0 115.0 0 0 61|ODI 35 1100 36.0 90.0 0 0 108|TEST 10 400 25.0 50.0 0 0 59"),
  p("Eshan Malinga", "Sri Lanka", "BOWL", "R", RF, "FB", 50, "SRH", 80, "IPL 6 0 0 0 8 8.9 2/28|ODI 4 0 0 0 5 6.2 2/40"),
  p("Jeffrey Vandersay", "Sri Lanka", "BOWL", "R", LB, "SP", 50, "INTL", 80, "T20I 15 30 6.0 100.0 15 8.0 3/30|ODI 25 150 12.0 80.0 35 5.2 6/33|TEST 2 20 10.0 50.0 5 3.4 3/50"),
  p("Lahiru Kumara", "Sri Lanka", "BOWL", "L", RF, "FB", 50, "INTL", 80, "T20I 10 5 5.0 80.0 10 9.0 2/24|ODI 30 50 5.0 60.0 40 6.2 4/28|TEST 30 100 5.0 30.0 80 3.7 6/122"),

  // ==================== PAKISTAN ====================
  p("Sahibzada Farhan", "Pakistan", "BAT", "R", NA, "BT", 75, "INTL", 82, "T20I 20 650 32.5 135.0 0 0 74"),
  p("Hasan Ali", "Pakistan", "BOWL", "R", RFM, "FB", 75, "INTL", 81, "T20I 70 150 10.0 130.0 75 8.6 4/18|ODI 65 450 15.0 105.0 90 5.6 5/34|TEST 25 400 14.0 85.0 80 3.0 5/27"),
  p("Mohammad Haris", "Pakistan", "WK", "R", NA, "WKS", 50, "INTL", 80, "T20I 25 400 18.0 140.0 0 0 107*|ODI 6 30 6.0 80.0 0 0 13"),
  p("Imam-ul-Haq", "Pakistan", "BAT", "L", NA, "BT", 50, "INTL", 81, "ODI 72 3100 48.0 82.0 0 0 151|TEST 25 1600 40.0 45.0 0 0 157"),
  p("Usman Khan", "Pakistan", "WK", "R", NA, "WKS", 50, "INTL", 79, "T20I 20 400 22.0 130.0 0 0 69|ODI 4 60 15.0 80.0 0 0 37"),
  p("Hasan Nawaz", "Pakistan", "BAT", "R", NA, "BT", 50, "INTL", 80, "T20I 10 250 31.3 170.0 0 0 105*"),
  p("Faheem Ashraf", "Pakistan", "AR", "L", RFM, "ARS", 50, "INTL", 80, "T20I 50 300 13.0 120.0 50 8.0 3/5|ODI 35 400 18.0 90.0 30 5.6 3/26|TEST 15 650 30.0 55.0 25 3.0 3/42"),
  p("Sufiyan Muqeem", "Pakistan", "BOWL", "L", LWS, "SP", 50, "INTL", 81, "T20I 15 5 5.0 50.0 25 6.8 5/3|ODI 6 5 5.0 50.0 8 5.0 3/42"),
  p("Kamran Ghulam", "Pakistan", "BAT", "R", SLA, "BT", 50, "INTL", 80, "ODI 8 250 31.3 85.0 0 0 63|TEST 6 450 40.0 50.0 1 3.5 1/20"),
  p("Sajid Khan", "Pakistan", "BOWL", "R", OB, "SP", 50, "INTL", 81, "TEST 12 300 18.0 60.0 50 3.4 9/111"),
  p("Khushdil Shah", "Pakistan", "AR", "L", SLA, "ARS", 30, "INTL", 78, "T20I 30 400 20.0 125.0 6 8.0 2/20|ODI 15 300 25.0 95.0 6 5.4 2/40"),
  p("Mohammad Abbas Afridi", "Pakistan", "BOWL", "R", RFM, "FB", 30, "INTL", 79, "T20I 20 40 8.0 140.0 30 9.4 5/31"),

  // ==================== BANGLADESH ====================
  p("Tanzid Hasan", "Bangladesh", "BAT", "L", NA, "BT", 50, "INTL", 80, "T20I 30 750 25.0 130.0 0 0 80|ODI 25 700 28.0 85.0 0 0 84"),
  p("Jaker Ali", "Bangladesh", "WK", "R", NA, "WKS", 50, "INTL", 80, "T20I 25 500 25.0 135.0 0 0 72|ODI 8 250 35.7 85.0 0 0 68|TEST 4 250 31.0 50.0 0 0 84"),
  p("Shoriful Islam", "Bangladesh", "BOWL", "R", LFM, "FB", 50, "INTL", 80, "T20I 35 30 7.5 90.0 40 8.0 3/14|ODI 30 50 8.0 70.0 40 5.6 4/21|TEST 10 100 10.0 40.0 25 3.4 3/69"),
  p("Tanzim Hasan Sakib", "Bangladesh", "BOWL", "R", RFM, "FB", 50, "INTL", 80, "T20I 20 50 10.0 110.0 25 7.6 4/7|ODI 12 60 12.0 85.0 12 5.6 3/62"),
  p("Mominul Haque", "Bangladesh", "BAT", "L", SLA, "BT", 30, "INTL", 79, "ODI 30 400 16.0 70.0 0 5.0 0/10|TEST 70 4500 37.0 55.0 4 3.6 3/27"),
  p("Parvez Hossain Emon", "Bangladesh", "BAT", "L", NA, "BT", 30, "INTL", 79, "T20I 15 350 25.0 140.0 0 0 100"),
  p("Soumya Sarkar", "Bangladesh", "AR", "L", RM, "ARS", 30, "INTL", 79, "T20I 85 1400 18.0 125.0 25 9.0 2/19|ODI 70 2200 33.0 95.0 15 5.8 3/56|TEST 16 800 26.0 70.0 4 4.2 2/68"),
  p("Shadman Islam", "Bangladesh", "BAT", "L", OB, "BT", 30, "INTL", 79, "TEST 22 1100 28.0 40.0 0 0 120"),
  p("Hasan Mahmud", "Bangladesh", "BOWL", "R", RFM, "FB", 50, "INTL", 80, "T20I 20 15 5.0 80.0 22 8.1 3/32|ODI 20 50 8.0 70.0 30 5.6 5/32|TEST 8 100 10.0 40.0 30 3.0 5/43"),

  // ==================== ZIMBABWE ====================
  p("Sean Williams", "Zimbabwe", "AR", "L", SLA, "ARS", 50, "INTL", 80, "T20I 85 1800 25.0 125.0 45 7.2 3/9|ODI 160 5200 37.0 85.0 85 5.1 4/43|TEST 20 1400 40.0 60.0 25 3.5 4/57"),
  p("Brian Bennett", "Zimbabwe", "BAT", "R", OB, "BT", 50, "INTL", 81, "T20I 30 900 33.0 145.0 5 8.0 2/20|ODI 15 600 40.0 95.0 3 5.6 2/40|TEST 6 450 37.5 65.0 2 4.0 1/12"),
  p("Craig Ervine", "Zimbabwe", "BAT", "L", NA, "BT", 30, "INTL", 78, "T20I 50 1000 22.0 120.0 0 0 75|ODI 125 3700 33.0 82.0 0 0 130*|TEST 25 1400 31.0 45.0 0 0 160"),
  p("Richard Ngarava", "Zimbabwe", "BOWL", "L", LFM, "FB", 30, "INTL", 79, "T20I 60 50 5.0 80.0 65 7.6 4/20|ODI 40 100 6.0 65.0 50 5.6 4/34|TEST 6 50 6.0 40.0 15 3.4 3/52"),

  // ==================== IRELAND ====================
  p("Andy Balbirnie", "Ireland", "BAT", "R", OB, "BT", 30, "INTL", 78, "T20I 110 2400 23.0 120.0 0 0 83|ODI 105 3300 32.0 80.0 2 6.0 1/26|TEST 9 500 28.0 50.0 0 0 95"),
  p("Harry Tector", "Ireland", "BAT", "R", OB, "BT", 50, "INTL", 80, "T20I 75 1700 30.0 125.0 3 7.4 1/9|ODI 50 1900 45.0 85.0 4 5.4 2/22|TEST 6 300 27.0 55.0 0 4.0 0/10"),
  p("Lorcan Tucker", "Ireland", "WK", "R", NA, "WKS", 30, "INTL", 79, "T20I 75 1600 26.0 130.0 0 0 94|ODI 40 1000 28.0 85.0 0 0 109|TEST 6 300 27.0 60.0 0 0 108"),
  p("Mark Adair", "Ireland", "AR", "R", RFM, "ARS", 30, "INTL", 79, "T20I 75 700 16.0 140.0 90 8.0 4/23|ODI 35 500 18.0 95.0 45 5.4 4/19|TEST 7 300 27.0 60.0 20 3.0 6/56"),
  p("Curtis Campher", "Ireland", "AR", "R", RFM, "ARS", 30, "INTL", 79, "T20I 60 1100 25.0 125.0 40 7.8 4/26|ODI 30 800 33.0 85.0 25 5.6 4/54|TEST 3 150 30.0 50.0 3 3.5 2/45"),

  // ==================== NETHERLANDS ====================
  p("Scott Edwards", "Netherlands", "WK", "R", NA, "WKS", 30, "INTL", 79, "T20I 60 1000 24.0 120.0 0 0 71*|ODI 50 1500 38.0 90.0 0 0 86"),
  p("Max O'Dowd", "Netherlands", "BAT", "R", OB, "BT", 30, "INTL", 79, "T20I 60 1800 32.0 125.0 0 0 133*|ODI 40 1100 28.0 75.0 0 0 90"),
  p("Logan van Beek", "Netherlands", "AR", "R", RFM, "ARS", 30, "INTL", 79, "T20I 40 350 15.0 120.0 40 7.8 3/9|ODI 35 500 20.0 85.0 45 5.6 4/24"),
  p("Paul van Meekeren", "Netherlands", "BOWL", "R", RFM, "FB", 30, "INTL", 79, "T20I 55 100 6.0 90.0 60 7.2 4/11|ODI 20 50 6.0 60.0 25 5.4 4/40"),

  // ==================== SCOTLAND ====================
  p("George Munsey", "Scotland", "BAT", "L", NA, "BT", 30, "INTL", 79, "T20I 75 2100 30.0 145.0 0 0 127*|ODI 40 1100 30.0 95.0 0 0 108"),
  p("Richie Berrington", "Scotland", "BAT", "R", RM, "BT", 30, "INTL", 77, "T20I 100 2300 28.0 125.0 15 7.6 4/23|ODI 100 3000 34.0 82.0 25 5.8 4/30"),
  p("Brandon McMullen", "Scotland", "AR", "R", RM, "ARS", 30, "INTL", 79, "T20I 30 800 30.0 145.0 15 8.6 3/27|ODI 30 1200 42.0 100.0 35 5.8 5/34"),
  p("Mark Watt", "Scotland", "BOWL", "L", SLA, "SP", 30, "INTL", 78, "T20I 70 300 10.0 120.0 80 7.0 5/27|ODI 60 600 15.0 85.0 70 4.6 4/42"),

  // ==================== NEPAL ====================
  p("Sandeep Lamichhane", "Nepal", "BOWL", "R", LB, "SP", 50, "INTL", 81, "T20I 55 100 6.0 90.0 100 6.0 5/9|ODI 55 300 10.0 70.0 110 4.0 6/11"),
  p("Kushal Bhurtel", "Nepal", "BAT", "R", NA, "BT", 30, "INTL", 78, "T20I 50 1300 27.0 130.0 0 0 104*|ODI 50 1600 33.0 85.0 0 0 115"),
  p("Rohit Paudel", "Nepal", "BAT", "R", OB, "BT", 30, "INTL", 78, "T20I 60 1400 28.0 120.0 5 7.4 2/14|ODI 70 2000 33.0 80.0 10 5.4 3/20"),
  p("Dipendra Singh Airee", "Nepal", "AR", "R", OB, "ARS", 30, "INTL", 79, "T20I 70 1800 32.0 145.0 40 7.4 4/11|ODI 60 1500 30.0 90.0 40 5.0 4/25"),

  // ==================== USA ====================
  p("Monank Patel", "USA", "WK", "R", NA, "WKS", 30, "INTL", 78, "T20I 35 900 28.0 125.0 0 0 75|ODI 45 1300 33.0 80.0 0 0 102"),
  p("Saurabh Netravalkar", "USA", "BOWL", "R", LFM, "FB", 30, "INTL", 79, "T20I 35 30 5.0 70.0 45 6.6 5/12|ODI 50 100 6.0 60.0 75 4.4 6/32"),
  p("Aaron Jones", "USA", "BAT", "R", LB, "BT", 30, "INTL", 78, "T20I 35 900 32.0 135.0 3 8.0 1/10|ODI 45 1300 35.0 85.0 4 5.6 2/30"),
  p("Ali Khan", "USA", "BOWL", "R", RF, "FB", 30, "INTL", 79, "T20I 20 20 5.0 80.0 30 7.4 4/7|ODI 25 40 5.0 60.0 40 5.0 4/33"),

  // ==================== UAE / NAMIBIA ====================
  p("Muhammad Waseem", "UAE", "BAT", "R", RM, "BT", 30, "INTL", 78, "T20I 70 2500 37.0 150.0 2 8.0 1/12|ODI 45 1600 37.0 95.0 0 0 116"),
  p("Gerhard Erasmus", "Namibia", "AR", "R", OB, "ARS", 30, "INTL", 78, "T20I 70 1700 28.0 125.0 40 6.8 4/20|ODI 40 1300 37.0 85.0 25 5.0 4/32"),
  p("JJ Smit", "Namibia", "AR", "L", LFM, "ARS", 30, "INTL", 78, "T20I 65 1000 25.0 145.0 60 7.8 4/12|ODI 40 900 30.0 100.0 40 5.6 4/38"),
];
