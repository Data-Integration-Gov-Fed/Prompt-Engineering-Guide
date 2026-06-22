const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'tepo.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS training_modules (
    id TEXT PRIMARY KEY,
    title TEXT,
    report_type TEXT,
    order_num INTEGER,
    description TEXT,
    content TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    module_id TEXT REFERENCES training_modules(id),
    question TEXT,
    options TEXT,
    correct_index INTEGER,
    explanation TEXT,
    order_num INTEGER
  );

  CREATE TABLE IF NOT EXISTS tech_progress (
    id TEXT PRIMARY KEY,
    tech_name TEXT,
    tech_email TEXT,
    module_id TEXT REFERENCES training_modules(id),
    module_title TEXT,
    status TEXT CHECK(status IN ('not_started','in_progress','completed')),
    score INTEGER,
    total_questions INTEGER,
    attempts INTEGER DEFAULT 0,
    completed_date DATETIME,
    time_spent_minutes INTEGER,
    training_type TEXT CHECK(training_type IN ('new_hire','quarterly'))
  );
`);

const MODULES = [
  {
    id: 'mod-1',
    title: 'Macular Thickness Analysis Report',
    report_type: 'macular_thickness',
    order_num: 1,
    description: 'Understand the 6mm x 6mm macular data cube, ETDRS grid, Fovea Finder™, and color-coded normative comparisons.',
    content: `The Macular Thickness Analysis Report is based on the 6mm x 6mm data cube (Macular Cube 512x128 or 200x200 scan).

**Key Components:**
1. **LSO Fundus Image** — Shown with ILM-RPE retinal thickness map overlay.
2. **Slice Navigator** — Simultaneous view of selected point on LSO image, OCT fundus image, retinal thickness map, layer maps, and OCT image.
3. **ETDRS Grid** — Auto-centered on fovea via Fovea Finder™. Retinal thickness ILM to RPE in microns, compared to normative data.
4. **OCT Fundus Image** — Shown alongside LSO image.
5. **Fovea Finder™** — Enables precise placement of ETDRS grid.
6. **B-Scan (Horizontal)** — Blue-framed. Corresponds to horizontal crosshair line on fundus image.
7. **B-Scan (Vertical)** — Pink-framed. Corresponds to vertical crosshair line on fundus image.
8. **3D Macular Thickness Map** — Topographical display of retinal thickness.
9. **Segmented ILM Map** — Inner limiting membrane layer map.
10. **Segmented RPE Map** — Retinal pigment epithelium layer map.
11. **Macular Parameters Table** — Values compared to normative data with color coding.

**Color Coding:**
- Green = Within normal limits (90% of normals)
- Yellow = Borderline (5–10%)
- Red = Outside normal limits (<1%)
- White = Thickest 5%

**Normal Ranges (71-year-old reference):**
- Central Subfield: 220.5 – 294.8 µm
- Average Thickness: 257.1 – 295.0 µm
- Average Volume: 9.39 – 10.75 mm³`
  },
  {
    id: 'mod-2',
    title: 'RNFL and ONH Analysis Report',
    report_type: 'rnfl_onh',
    order_num: 2,
    description: 'Learn the Optic Disc Cube 200x200 scan components: RNFL thickness maps, TSNIT graph, quadrant values, and normative color coding.',
    content: `Based on the 6mm x 6mm Optic Disc Cube 200x200 scan. Assesses RNFL and ONH for both eyes.

**Key Components:**
1. **RNFL Thickness Map** — Topographical RNFL display. Hourglass shape of yellow/red = NORMAL.
2. **RNFL Deviation Map** — Deviation from normal. Shows cup/disc boundaries and RNFL calculation circle.
3. **Neuro-retinal Rim Thickness Profile** — Matched to normative data around full disc circumference.
4. **RNFL TSNIT Graph** — Temporal-Superior-Nasal-Inferior-Temporal measurements vs normative data.
5. **RNFL Quadrant Values** — Superior, Nasal, Inferior, Temporal averages vs norms.
6. **RNFL Clock Hour Values** — Average thickness per clock hour (1–12) vs norms.
7. **Horizontal/Vertical B-scans** — Through disc center. RPE/disc = black; ILM/cup = red.
8. **RNFL Calculation Circle** — Auto-centered on optic disc.

**Color Coding:**
- Green = Normal (5% < green < 95%)
- Yellow = Suspect (1% < yellow < 5%)
- Red = Outside normal limits (< 1%)
- White = Thickest 5% (> 95%)
- Gray = Not applicable (no normative data)

**Normal Ranges (69-year-old reference):**
- Average RNFL Thickness: 75.0 – 107.2 µm
- RNFL Symmetry: 76% – 95%
- Rim Area: 1.03 – 1.69 mm²
- Average C/D Ratio: 0.64 – 0.21
- Cup Volume: 0.01 – 0.035 mm³`
  },
  {
    id: 'mod-3',
    title: 'Ganglion Cell Analysis Report',
    report_type: 'ganglion_cell',
    order_num: 3,
    description: 'Explore GCL+IPL thickness maps, deviation maps, and why ganglion cell loss is the earliest detectable sign of glaucoma.',
    content: `Based on Macular Cube 512x128 or 200x200. Evaluates GCL (Ganglion Cell Layer) + IPL (Inner Plexiform Layer).

**Key Components:**
1. **GCL+IPL Thickness Maps** — On fundus image with elliptical annulus centered on fovea.
2. **Deviation Maps** — Deviations from normal. Red = significant thinning.
3. **Sector Maps** — Elliptical annulus divided into 6 regions vs normative data.
4. **Thickness Table** — Average and minimum thickness within annulus vs norms.
5. **Horizontal B-scans** — OD and OS shown for comparison.

**Normal Ranges (46-year-old reference):**
- Average Thickness: 72.9 – 92.5 µm
- Minimum Thickness: 70.6 – 90.3 µm
- Superior: 73.3 – 94.7 µm
- Inferior: 69.3 – 90.4 µm

**Clinical Significance:**
GCL loss is often the earliest detectable sign of glaucoma and can precede RNFL thinning.`
  },
  {
    id: 'mod-4',
    title: 'GPA Report (Guided Progression Analysis)',
    report_type: 'gpa',
    order_num: 4,
    description: 'Master GPA event and trend analysis — color-coded change maps, TSNIT progression profiles, and the four progression indicators.',
    content: `GPA™ performs event analysis and trend analysis of RNFL thickness and ONH parameters.

**Event Analysis** — Compares change from baseline to expected variability. Change outside expected range = progression.
**Trend Analysis** — Rate of change over time using linear regression.

**Key Components:**
1. **RNFL Thickness Maps** — Color-coded display for 2 baselines + 2 most recent exams.
2. **RNFL Change Maps** — Up to 8 exams registered to baseline.
   - Yellow = Change first noted
   - Red = Change sustained over consecutive visits (confirmed progression)
3. **RNFL Thickness Profiles** — TSNIT values plotted. Orange = first noted, Maroon = sustained.
4. **Trend Graphs** — Average/Superior/Inferior RNFL and C/D ratio over time with rate of change.
5. **RNFL/ONH Summary** — Four progression indicators:
   - RNFL Thickness Map Progression → best for FOCAL change
   - RNFL Thickness Profiles Progression → best for BROADER focal change
   - Average RNFL Thickness Progression → best for DIFFUSE change
   - Average Cup-to-Disc Progression → best for GLOBAL change

Two baseline exams required before GPA can assess progression.`
  },
  {
    id: 'mod-5',
    title: 'Advanced RPE Analysis Report',
    report_type: 'rpe_analysis',
    order_num: 5,
    description: 'Learn RPE elevation mapping, sub-RPE slab imaging, and how this report monitors AMD progression and detects CNV.',
    content: `Based on Macular Cube 512x128 or 200x200. Provides RPE elevation and Sub-RPE illumination data for current and prior visits.

**Key Components:**
1. **RPE Elevation Map** — On fundus image. Minimum elevation included: 19.5 µm.
2. **Circles on Map** — 3mm and 5mm diameter, centered on fovea.
3. **Fovea Location Coordinates** — Marked on map.
4. **Sub-RPE Slab** — En face image of tissue reflectivity beneath Bruch's membrane.
5. **RPE Profile™** — Combines RPE Elevation Map + sub-RPE illumination areas (outlined yellow).
6. **Table of Values** — Prior vs Current comparison:
   - RPE Elevation: Area/Volume in 3mm and 5mm circles
   - Sub-RPE Illumination: Area in 5mm circle, closest distance to fovea

**Clinical Use:** Monitoring AMD progression. Sub-RPE slab helps identify choroidal neovascularization (CNV).`
  },
  {
    id: 'mod-6',
    title: 'Macular Change Analysis Report',
    report_type: 'macular_change',
    order_num: 6,
    description: 'Understand visit-to-visit macular comparison using auto-registration and Fovea Finder™ for AMD, DME, and epiretinal membrane monitoring.',
    content: `Compares macular thickness between visits. Post-acquisition registration + Fovea Finder™ ensures repeatability even in AMD, DME, VRI patients.

**Key Components:**
1. **Color Maps (both visits)** — ILM-to-RPE thickness over 6mm x 6mm cube, color-coded.
2. **ETDRS Grid Values** — Thickness per sector for both visits.
3. **LSO Fundus Image** — Cube placement shown. Fovea Finder™ auto-centers.
4. **OCT Fundus Image** — From follow-up exam, AUTOMATICALLY REGISTERED to previous.
5. **Change Analysis Map** — Difference from previous in micrometers, shown in color.
6. **B-Scan Pairs** — Previous and current registered images side by side.

**Clinical Use:** Monitoring AMD, DME, epiretinal membrane. Auto-registration ensures exact same location compared.`
  },
  {
    id: 'mod-7',
    title: 'Single Eye Summary Report',
    report_type: 'single_eye_summary',
    order_num: 7,
    description: 'Review the at-a-glance single-page overview combining macula and RNFL/ONH data — the first-look report for routine exams.',
    content: `At-a-glance overview of one eye — macula, RNFL, and ONH. Useful for patient education and identifying need for further analysis.

**Macula Side:**
1. Macula Fundus Image — Auto-centered via Fovea Finder™
2. ILM-RPE Thickness Map — 6mm x 6mm color-coded
3. Horizontal B-Scan — Cross section through fovea
4. ETDRS Grid Values

**ONH/RNFL Side:**
5. RNFL Thickness Map — 6mm x 6mm color-coded
6. RNFL Deviation Map — Deviation from normal
7. RNFL Calculation Circle — Where TSNIT is extracted
8. RNFL TSNIT Graph — vs normative data
9. ONH Fundus Image — Auto-centered on disc
10. Key Parameters Table — Disc Area, Rim Area, C/D Ratio, Cup Volume, RNFL values
11. Horizontal Tomogram — B-scan through disc center
12. Distribution of Normals Legend
13. Vertical Tomogram — Vertical B-scan through disc

**Clinical Use:** First-look report for routine exams. Suspicious findings → order full RNFL/ONH or Macular report.`
  },
  {
    id: 'mod-8',
    title: 'Anterior Segment Cube Report',
    report_type: 'anterior_segment_cube',
    order_num: 8,
    description: 'Learn the 4mm x 4mm anterior segment scan, central corneal thickness (CCT) measurement, and its critical role in IOP interpretation.',
    content: `Based on 4mm x 4mm Anterior Segment Cube 512x128 scan. Evaluates cornea including pathology visualization and central corneal thickness (CCT).

**Key Components:**
1. **Iris Image** — Scan location shown for orientation.
2. **Slice Navigator** — Simultaneous view of cornea and OCT display.
3. **Central Corneal Thickness (CCT)** — Measured in microns with calipers.
4. **Blue-Framed B-Scan** — Corresponds to horizontal crosshair on iris image.
5. **Pink-Framed B-Scan** — Corresponds to vertical crosshair on iris image.

**CCT Clinical Reference:**
- Normal: ~520–545 µm
- Thin (<500 µm): IOP likely UNDERESTIMATED → increases true glaucoma risk
- Thick (>600 µm): IOP likely OVERESTIMATED`
  },
  {
    id: 'mod-9',
    title: 'Anterior Segment 5 Line Raster',
    report_type: 'anterior_segment_raster',
    order_num: 9,
    description: 'Explore the 5-line raster scan for corneal pathology documentation, iridocorneal angle assessment, and surgical evaluation.',
    content: `Used for assessment and documentation of the cornea and iridocorneal angle.

**Key Components:**
1. **Scan Parameters** — Angle, spacing, length shown at top. All adjustable.
2. **Iris Image** — Scan line locations shown.
3. **Enlarged B-Scan** — Center (third) scan shown enlarged by default.
4. **Legend** — Indicates which of 5 scan lines is displayed (1–5).

**Clinical Use:** Corneal pathology, iridocorneal angle assessment, anterior segment lesion documentation, pre/post-surgical evaluation.`
  },
  {
    id: 'mod-10',
    title: 'HD 5 Line Raster Report',
    report_type: 'hd_5_line_raster',
    order_num: 10,
    description: 'Understand Selective Pixel Profiling™, how HD raster collects more data per location, and its use for high-resolution retinal imaging.',
    content: `Collects more data per location than other Cirrus scans. Selective Pixel Profiling™ constructs the best possible image from all pixel data.

**Key Components:**
1. **Scan Parameters** — Angle, spacing, length shown and adjustable.
2. **LSO Fundus Image** — Scan line locations (not iris image — this is posterior segment).
3. **5 Scan Thumbnails** — Each line scanned 4 times; optimal selected via Selective Pixel Profiling™.
4. **Enlarged Center B-Scan** — Default: third (center) scan shown large.
5. **Legend** — Indicates which scan line is displayed.

**Clinical Use:** High-resolution retinal imaging, macular pathology evaluation, epiretinal membrane, macular holes, vitreomacular traction.`
  },
  {
    id: 'mod-11',
    title: 'HD 5 Line Raster Single Line Report',
    report_type: 'hd_single_line',
    order_num: 11,
    description: 'Learn the single-line HD raster — 20 scans per location vs 4 — for maximum resolution at one specific retinal location.',
    content: `Enhanced HD 5 Line Raster used to scan a single high-density line.

**Key Components:**
1. **Scan Parameters** — Angle, spacing (0 mm), length shown.
2. **LSO Fundus Image** — Single scan line location shown.
3. **Enhanced B-Scan** — 20 lines collapsed to 1 location, scanned 20 times, optimal image selected.

**Comparison:**
- Standard HD 5 Line: 5 lines × 4 scans = 4 scans per location
- Single Line: 1 line × 20 scans = 20 scans per location → significantly higher quality

**Clinical Use:** Maximum resolution at one specific retinal location. Research-grade imaging. Detailed foveal pathology analysis.`
  },
  {
    id: 'mod-12',
    title: 'Advanced Visualization Custom Report',
    report_type: 'adv_visualization',
    order_num: 12,
    description: 'Discover C-scans, en face retinal slabs, and how Advanced Visualization creates custom cross-sections through all three dimensions.',
    content: `From Macular Cube 512x128 or 200x200. Displays cross-sections through 3 dimensions: B-scans (X/Y axis) and C-scans/slabs (Z axis).

**Key Components:**
1. **Custom Print Mode** — Single or multi-page report of tagged images from Advanced Visualization screen.
2. **Overlay Description** — Type and transparency % shown (e.g., ILM-RPE, 19%).
3. **RPE Slab Image** — Average signal intensity per A-scan through defined slab depth = C-scan of RPE.
4. **LSO Fundus + ILM Slab Overlay** — Reveals epiretinal membrane features.
5. **B-Scan** — Corresponds to horizontal crosshair on fundus image.

**Slab types:** ILM slab, RPE-fit slab, RPE slab — user-defined borders.

**Clinical Use:** Epiretinal membrane evaluation, en face retinal layer imaging, complex pathology documentation.`
  },
  {
    id: 'mod-13',
    title: 'HFA Cirrus Combined Report',
    report_type: 'hfa_combined',
    order_num: 13,
    description: 'Learn how ZEISS FORUM combines Cirrus structural data with HFA visual field function for structure-function correlation in glaucoma.',
    content: `Available exclusively via ZEISS FORUM management system. Combines Cirrus HD-OCT structure + HFA visual field function in one page.

**HFA Visual Field Section:**
1. HFA Graytone Plot (OD)
2. HFA Testing Strategy (e.g., 30-2 SITA-Standard)
3. Total Deviation + Pattern Deviation Plots (OS)
4. HFA Reliability Indices — Fixation losses, false POS/NEG errors
5. HFA Global Indices — VFI, MD (Mean Deviation), PSD, GHT

**Cirrus HD-OCT Section:**
6. RNFL Thickness Graph (OU)
7. RNFL + ONH Parameters Table (with normative comparison)
8. RNFL Thickness Map
9. RNFL Quadrants and Clock Hours
10. RNFL Thickness Deviation Map
11. Neuro-retinal Rim Thickness Graph
12. Distribution of Normals Legend

**Key Principle:**
Structural loss (RNFL thinning on OCT) typically precedes functional loss (visual field defects) in early glaucoma. Structure-function correlation confirms diagnosis and monitors progression.`
  }
];

const QUESTIONS = [
  // Module 1
  { id: 'q1-1', module_id: 'mod-1', order_num: 1, question: 'What does the ETDRS grid measure?', options: JSON.stringify(['Blood vessel density in the macula', 'Retinal thickness from ILM to RPE in microns', 'Optic nerve head area', 'Vitreous volume']), correct_index: 1, explanation: 'The ETDRS grid is auto-centered on the fovea and measures retinal thickness from ILM to RPE in microns, compared to normative data.' },
  { id: 'q1-2', module_id: 'mod-1', order_num: 2, question: 'What does RED mean on the macular thickness map?', options: JSON.stringify(['Within normal limits', 'Borderline — top 5% (thickest)', 'Outside normal limits — bottom 1%', 'Borderline — bottom 5%']), correct_index: 2, explanation: 'Red = bottom 1% compared to normative database — outside normal limits.' },
  { id: 'q1-3', module_id: 'mod-1', order_num: 3, question: 'What is the normal Central Subfield range for a 71-year-old?', options: JSON.stringify(['180.0 – 240.5 µm', '245.0 – 310.0 µm', '220.5 – 294.8 µm', '200.0 – 270.0 µm']), correct_index: 2, explanation: 'The age-dependent normative range for Central Subfield in a 71-year-old is 220.5 – 294.8 µm.' },
  { id: 'q1-4', module_id: 'mod-1', order_num: 4, question: 'What is Fovea Finder™ used for?', options: JSON.stringify(['Measure cup-to-disc ratio', 'Identify RNFL thinning patterns', 'Auto-center the ETDRS grid on the fovea', 'Calculate retinal volume']), correct_index: 2, explanation: 'Fovea Finder™ ensures precise ETDRS grid placement by automatically centering on the fovea.' },
  { id: 'q1-5', module_id: 'mod-1', order_num: 5, question: 'The blue-framed B-scan corresponds to which crosshair?', options: JSON.stringify(['Vertical crosshair line on fundus image', 'Horizontal crosshair line on fundus image', 'Diagonal crosshair line on fundus image', 'The ETDRS grid center']), correct_index: 1, explanation: 'Blue = horizontal crosshair, Pink = vertical crosshair on the fundus image.' },

  // Module 2
  { id: 'q2-1', module_id: 'mod-2', order_num: 1, question: 'What does TSNIT stand for?', options: JSON.stringify(['Total-Segmented-Nasal-Internal-Temporal', 'Temporal-Superior-Nasal-Inferior-Temporal', 'Thickness-Superior-Normal-Inferior-Total', 'Temporal-Sectional-Nerve-Index-Table']), correct_index: 1, explanation: 'TSNIT describes the order quadrants are plotted on the RNFL circular graph: Temporal-Superior-Nasal-Inferior-Temporal.' },
  { id: 'q2-2', module_id: 'mod-2', order_num: 2, question: 'What does YELLOW indicate on the RNFL report?', options: JSON.stringify(['Within normal limits (5%–95%)', 'Outside normal limits (< 1%)', 'Thickest 5% (> 95%)', 'Borderline — bottom 5% (suspect)']), correct_index: 3, explanation: 'Yellow = suspect range: 1% < yellow < 5%. Not normal, not confirmed loss — borderline.' },
  { id: 'q2-3', module_id: 'mod-2', order_num: 3, question: 'What RNFL thickness map pattern is considered normal?', options: JSON.stringify(['Uniform green across the entire map', 'Hourglass shape of yellow and red', 'Diffuse red along inferior quadrant only', 'Solid blue ring around the disc']), correct_index: 1, explanation: 'An hourglass shape of yellow and red reflects normal superior/inferior RNFL bundle thickness.' },
  { id: 'q2-4', module_id: 'mod-2', order_num: 4, question: 'ILM/cup boundaries on the disc B-scan are shown in which color?', options: JSON.stringify(['Blue', 'Green', 'Red', 'Yellow']), correct_index: 2, explanation: 'RPE/disc boundaries = black; ILM/cup boundaries = red on the disc center B-scan.' },
  { id: 'q2-5', module_id: 'mod-2', order_num: 5, question: 'What is the normal Average RNFL thickness range for a 69-year-old?', options: JSON.stringify(['85.0 – 120.5 µm', '60.0 – 95.0 µm', '75.0 – 107.2 µm', '90.0 – 130.0 µm']), correct_index: 2, explanation: 'Normal average RNFL for a 69-year-old is 75.0 – 107.2 µm. Values below this in red may indicate RNFL loss.' },

  // Module 3
  { id: 'q3-1', module_id: 'mod-3', order_num: 1, question: 'What layers does the Ganglion Cell Analysis (GCA) measure?', options: JSON.stringify(['RPE + Bruch\'s membrane', 'RNFL + GCL', 'GCL + IPL', 'INL + OPL']), correct_index: 2, explanation: 'GCA measures the combined Ganglion Cell Layer (GCL) plus Inner Plexiform Layer (IPL).' },
  { id: 'q3-2', module_id: 'mod-3', order_num: 2, question: 'The Sector Map divides the elliptical annulus into how many regions?', options: JSON.stringify(['4', '6', '8', '12']), correct_index: 1, explanation: 'The elliptical annulus is divided into 6 sectors, each compared to normative data.' },
  { id: 'q3-3', module_id: 'mod-3', order_num: 3, question: 'Why is GCA particularly important for glaucoma diagnosis?', options: JSON.stringify(['It detects cup-to-disc ratio changes', 'It measures intraocular pressure accurately', 'GCL loss can precede RNFL thinning — earliest sign', 'It evaluates the optic nerve head rim area']), correct_index: 2, explanation: 'GCL loss is often the earliest detectable sign of glaucoma, appearing before RNFL changes are visible.' },
  { id: 'q3-4', module_id: 'mod-3', order_num: 4, question: 'What is the normal Average GCL+IPL thickness range for a 46-year-old?', options: JSON.stringify(['60.0 – 80.0 µm', '80.0 – 100.0 µm', '72.9 – 92.5 µm', '55.0 – 75.0 µm']), correct_index: 2, explanation: 'The age-specific normative range for average GCL+IPL in a 46-year-old is 72.9 – 92.5 µm.' },

  // Module 4
  { id: 'q4-1', module_id: 'mod-4', order_num: 1, question: 'What does GPA stand for?', options: JSON.stringify(['Glaucoma Progression Algorithm', 'Guided Progression Analysis', 'Global Parameter Assessment', 'Ganglion Photoreceptor Analysis']), correct_index: 1, explanation: 'GPA stands for Guided Progression Analysis — Cirrus\'s tool for detecting and monitoring glaucoma progression.' },
  { id: 'q4-2', module_id: 'mod-4', order_num: 2, question: 'What does RED on the GPA Change Map indicate?', options: JSON.stringify(['Within normal limits — no progression', 'Change first noted — unconfirmed', 'Change sustained over consecutive visits — confirmed progression', 'Artifact — rescan required']), correct_index: 2, explanation: 'Yellow = change first noted; Red = change sustained over consecutive visits (confirmed progression).' },
  { id: 'q4-3', module_id: 'mod-4', order_num: 3, question: 'How many baseline exams are required before GPA can assess progression?', options: JSON.stringify(['One', 'Two', 'Three', 'Four']), correct_index: 1, explanation: 'GPA requires two baseline exams before event analysis can be performed.' },
  { id: 'q4-4', module_id: 'mod-4', order_num: 4, question: 'Which GPA indicator is best for detecting FOCAL RNFL change?', options: JSON.stringify(['Average RNFL Thickness Progression', 'Average Cup-to-Disc Progression', 'RNFL Thickness Profiles Progression', 'RNFL Thickness Map Progression']), correct_index: 3, explanation: 'Map = focal, Profiles = broader focal, Average = diffuse, C/D = global structural change.' },

  // Module 5
  { id: 'q5-1', module_id: 'mod-5', order_num: 1, question: 'What is the minimum RPE elevation included in the quantitative result?', options: JSON.stringify(['10.0 µm', '15.0 µm', '19.5 µm', '25.0 µm']), correct_index: 2, explanation: 'The software threshold for RPE elevation inclusion in quantitative results is 19.5 µm.' },
  { id: 'q5-2', module_id: 'mod-5', order_num: 2, question: 'What does the Sub-RPE Slab image show?', options: JSON.stringify(['Retinal nerve fiber layer thickness', 'Reflectivity of tissue beneath Bruch\'s membrane', 'Ganglion cell layer thickness map', 'Corneal endothelial cell density']), correct_index: 1, explanation: 'The Sub-RPE Slab is an en face image of tissue reflectivity beneath Bruch\'s membrane — used for CNV detection in AMD.' },
  { id: 'q5-3', module_id: 'mod-5', order_num: 3, question: 'What are the two circle diameters on the RPE Elevation Map?', options: JSON.stringify(['2mm and 4mm', '3mm and 5mm', '4mm and 6mm', '1mm and 3mm']), correct_index: 1, explanation: '3mm and 5mm diameter circles are used, both centered on the fovea location.' },

  // Module 6
  { id: 'q6-1', module_id: 'mod-6', order_num: 1, question: 'What ensures the same retinal location is compared between visits?', options: JSON.stringify(['Manual technician alignment', 'Post-acquisition registration and Fovea Finder™', 'Patient fixation only', 'ETDRS grid placement']), correct_index: 1, explanation: 'Post-acquisition registration combined with Fovea Finder™ ensures the same location is compared — even in AMD, DME, and VRI patients.' },
  { id: 'q6-2', module_id: 'mod-6', order_num: 2, question: 'What does the Change Analysis Map display?', options: JSON.stringify(['Absolute thickness values per sector', 'Normative deviation color coding', 'Difference from previous visit in micrometers, shown in color', 'RNFL thickness over time']), correct_index: 2, explanation: 'The Change Analysis Map shows the difference from the previous visit in micrometers as a color-coded visual map.' },

  // Module 7
  { id: 'q7-1', module_id: 'mod-7', order_num: 1, question: 'The Single Eye Summary Report is most useful for?', options: JSON.stringify(['Detailed GPA trend analysis', 'At-a-glance overview — identifying if additional analysis needed', 'Advanced RPE elevation mapping', 'High-resolution corneal imaging']), correct_index: 1, explanation: 'The Single Eye Summary combines macula + RNFL/ONH on one page for a quick first-look overview in routine exams.' },
  { id: 'q7-2', module_id: 'mod-7', order_num: 2, question: 'What does the RNFL Calculation Circle indicate?', options: JSON.stringify(['The area of RNFL color coding normative deviation', 'Where TSNIT analysis is extracted from the data cube', 'The boundary of the optic cup', 'The foveal avascular zone']), correct_index: 1, explanation: 'The RNFL Calculation Circle is auto-centered on the optic disc and marks where TSNIT analysis is extracted.' },

  // Module 8
  { id: 'q8-1', module_id: 'mod-8', order_num: 1, question: 'What does CCT stand for?', options: JSON.stringify(['Corneal Cell Thickness — measured in cells', 'Curved Corneal Topography — measured in diopters', 'Central Corneal Thickness — measured in microns', 'Ciliary Choroidal Thickness — measured in mm']), correct_index: 2, explanation: 'CCT = Central Corneal Thickness, measured in microns. Critical for accurate IOP interpretation.' },
  { id: 'q8-2', module_id: 'mod-8', order_num: 2, question: 'A CCT measurement of 480 µm indicates?', options: JSON.stringify(['Thick cornea — IOP likely overestimated', 'Normal cornea — IOP measurement accurate', 'Thin cornea — IOP likely underestimated, true glaucoma risk higher', 'Corneal edema present — rescan required']), correct_index: 2, explanation: 'A thin cornea (<500 µm) causes Goldmann tonometry to underestimate IOP, meaning true glaucoma risk is higher than measured.' },
  { id: 'q8-3', module_id: 'mod-8', order_num: 3, question: 'The pink-framed B-scan on the Anterior Segment report corresponds to?', options: JSON.stringify(['Horizontal crosshair on iris image', 'Diagonal crosshair on iris image', 'Vertical crosshair on iris image', 'The corneal apex location']), correct_index: 2, explanation: 'Blue = horizontal crosshair; Pink = vertical crosshair on the iris image.' },

  // Module 9
  { id: 'q9-1', module_id: 'mod-9', order_num: 1, question: 'The Anterior Segment 5 Line Raster is primarily used for?', options: JSON.stringify(['RNFL thickness measurement', 'Macular thickness mapping', 'Assessment of cornea and iridocorneal angle', 'Retinal pigment epithelium analysis']), correct_index: 2, explanation: 'Primary use is corneal pathology documentation and iridocorneal angle assessment.' },
  { id: 'q9-2', module_id: 'mod-9', order_num: 2, question: 'Which scan line is shown enlarged by default?', options: JSON.stringify(['First (top) scan', 'Last (bottom) scan', 'Center (third) scan', 'All 5 scans are shown equally']), correct_index: 2, explanation: 'By default, the center (third) scan of the 5 lines is shown enlarged.' },

  // Module 10
  { id: 'q10-1', module_id: 'mod-10', order_num: 1, question: 'What does Selective Pixel Profiling™ do?', options: JSON.stringify(['Selects the correct patient from the database', 'Evaluates all pixel data from multiple scans to construct the best image', 'Automatically segments retinal layers', 'Calibrates the scan angle for optimal alignment']), correct_index: 1, explanation: 'Selective Pixel Profiling™ is a proprietary algorithm that evaluates all pixel data from multiple scans to produce the highest quality image.' },
  { id: 'q10-2', module_id: 'mod-10', order_num: 2, question: 'On the HD 5 Line Raster report, scan lines are shown on which image?', options: JSON.stringify(['Iris image', 'LSO fundus image', 'RNFL deviation map', 'Retinal thickness color map']), correct_index: 1, explanation: 'HD 5 Line Raster is a posterior segment scan — scan lines appear on the LSO fundus image, unlike the anterior segment raster which uses the iris image.' },

  // Module 11
  { id: 'q11-1', module_id: 'mod-11', order_num: 1, question: 'How many times is the single line scanned in the HD Single Line Report?', options: JSON.stringify(['4 times', '10 times', '20 times', '50 times']), correct_index: 2, explanation: '20 scans per location vs 4 for standard HD raster — significantly higher image quality.' },
  { id: 'q11-2', module_id: 'mod-11', order_num: 2, question: 'What spacing setting is used for the HD Single Line scan?', options: JSON.stringify(['0.5 mm', '1.0 mm', '0 mm', '2.0 mm']), correct_index: 2, explanation: 'Zero (0 mm) spacing collapses all lines to a single location for maximum density scanning.' },

  // Module 12
  { id: 'q12-1', module_id: 'mod-12', order_num: 1, question: 'What does a C-scan (C-slab) reveal in Advanced Visualization?', options: JSON.stringify(['Vertical cross-sections through retinal layers', 'En face views through defined retinal depths (Z axis)', 'Horizontal B-scans through the optic nerve head', 'Fluorescence angiography equivalent images']), correct_index: 1, explanation: 'C-scans provide en face views through defined retinal depths along the Z axis — unique cross-sections not visible on standard B-scans.' },
  { id: 'q12-2', module_id: 'mod-12', order_num: 2, question: 'What does the RPE Slab Image represent?', options: JSON.stringify(['Average thickness of the RPE layer in microns', 'Average signal intensity per A-scan through defined slab depth — C-scan of RPE', 'Deviation of RPE from normative data', 'RNFL density within the RPE region']), correct_index: 1, explanation: 'The RPE Slab Image is an en face view (C-scan) showing average signal intensity per A-scan through the defined RPE slab depth.' },

  // Module 13
  { id: 'q13-1', module_id: 'mod-13', order_num: 1, question: 'The HFA Cirrus Combined Report is available exclusively through which system?', options: JSON.stringify(['Standalone Cirrus HD-OCT software', 'ZEISS FORUM management system', 'HFA III standalone software', 'DICOM viewer software']), correct_index: 1, explanation: 'The HFA Cirrus Combined Report is exclusively available through the ZEISS FORUM management system — not standalone Cirrus software.' },
  { id: 'q13-2', module_id: 'mod-13', order_num: 2, question: 'In early glaucoma, what typically occurs first?', options: JSON.stringify(['Visual field defects (functional loss)', 'Structural loss (RNFL thinning on OCT)', 'Both occur simultaneously', 'Increased cup-to-disc ratio only']), correct_index: 1, explanation: 'OCT detects structural RNFL thinning before visual field defects appear — a key advantage of structure-function correlation.' },
  { id: 'q13-3', module_id: 'mod-13', order_num: 3, question: 'What does MD stand for on the HFA report?', options: JSON.stringify(['Macular Deviation — central sensitivity loss measure', 'Mean Diameter — average disc measurement', 'Mean Deviation — overall visual field sensitivity vs age-matched normals', 'Minimal Detection — threshold sensitivity value']), correct_index: 2, explanation: 'MD = Mean Deviation, the overall visual field sensitivity compared to age-matched normals. Negative MD = overall sensitivity loss.' }
];

function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM training_modules').get();
  if (count.c > 0) return;

  const insertModule = db.prepare(`
    INSERT INTO training_modules (id, title, report_type, order_num, description, content)
    VALUES (@id, @title, @report_type, @order_num, @description, @content)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO quiz_questions (id, module_id, question, options, correct_index, explanation, order_num)
    VALUES (@id, @module_id, @question, @options, @correct_index, @explanation, @order_num)
  `);

  const seedAll = db.transaction(() => {
    for (const m of MODULES) insertModule.run(m);
    for (const q of QUESTIONS) insertQuestion.run(q);
  });

  seedAll();
  console.log('Database seeded with 13 modules and all quiz questions.');
}

seedDatabase();

module.exports = db;
