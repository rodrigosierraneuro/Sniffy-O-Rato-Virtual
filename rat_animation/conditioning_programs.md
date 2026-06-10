# Sniffy Pro — Conditioning Programs: Complete Reference & Implementation Guide

Extracted from `SniffyPro.exe` (PE32 resources) and seven `.sdf` sample files.  
All numeric values are defaults; the simulation allows runtime overrides via PARM resources.

---

## Table of Contents

1. [Overview of Conditioning Modes](#1-overview-of-conditioning-modes)
2. [Magazine Training](#2-magazine-training)
3. [Shaping (Bar Press)](#3-shaping-bar-press)
4. [Operant Schedules](#4-operant-schedules)
5. [Classical Conditioning](#5-classical-conditioning)
6. [Discrimination Training](#6-discrimination-training)
7. [Extinction](#7-extinction)
8. [Custom / Trick Behaviors](#8-custom--trick-behaviors)
9. [Parameter Reference (PARM)](#9-parameter-reference-parm)
10. [Speed-Level Tables (MODP)](#10-speed-level-tables-modp)
11. [Behavior / Animation State Catalog](#11-behavior--animation-state-catalog)
12. [Reinforcement Hierarchy (REIN)](#12-reinforcement-hierarchy-rein)
13. [SDF File Format](#13-sdf-file-format)
14. [Implementation Guide](#14-implementation-guide)

---

## 1. Overview of Conditioning Modes

Sniffy Pro supports two top-level paradigms selectable from the *Experiment* menu:

| Mode | Key concept | UI entry point |
|------|-------------|----------------|
| **Operant Conditioning** | Rat behavior → consequence (reinforcement/extinction) | Design Operant Conditioning Experiment |
| **Classical Conditioning** | Neutral stimulus paired with unconditioned stimulus (Rescorla-Wagner) | Design Classical Conditioning Experiment |

Within operant conditioning there are two sub-modes:

- **Manual reinforcement** — the experimenter presses SPACE / clicks the bar.
- **Automatic schedules** — the program delivers reinforcement according to a schedule (CRF, FR, FI, VR, VI, DRL).

A *Shaping Tutor* overlay is available for both manual and automatic modes.

---

## 2. Magazine Training

**Purpose:** Establish a conditioned reinforcer — make the hopper sound (CS) predict food (US) before shaping begins.

**In-app text (LABTEXT 1128):**
> "To train Sniffy, begin by developing an association between food and the hopper sound."

**Procedure:**
1. Set schedule to **No Reinforcement** (manual mode, PARM 141 = 0).
2. Experimenter watches for rat approaching the hopper area.
3. Press SPACE each time the rat is near the hopper → hopper sound plays → pellet dispensed.
4. Repeat until the rat reliably runs to the hopper on sound onset.

**Success criterion (LABTEXT 1132 → 1136):**
> "Sniffy appears to have developed an association between the sound of the hopper and the food."

**Key parameters:**

| PARM | Default | Meaning |
|------|---------|---------|
| 128 | 40 | Hunger threshold (higher = hungrier) |
| 129 | 25 | Location threshold — proximity to hopper required |
| 152 | 24 | Hopper sound duration (ticks) |

**Sample file:** `MagTrain.sdf` (421 simulation ticks recorded)

---

## 3. Shaping (Bar Press)

**Purpose:** Use successive approximations to increase the probability of bar pressing.

**In-app text (LABTEXT 1129):**
> "Sniffy appears to have developed an association between the sound of the hopper and the food. You can now use the sound as a reinforcer to increase Sniffy's rearing behaviours. Once you have trained Sniffy to rear often, begin to refine the behaviour by only reinforcing rearing near the hopper. Sniffy should learn to bar press."

### 3.1 Shaping Steps (from REIN resources)

The shaping tutor uses a sequence of approximation targets. Each REIN resource contains:
- A behavior name
- A proximity/threshold value
- A linked LABTEXT instruction
- A list of SEQX animation IDs that constitute "correct" responses

| Step | REIN ID | Target behavior | Threshold | Instruction |
|------|---------|----------------|-----------|-------------|
| 1 | 128 | Rear Up Facing Back | 3000 | LABTEXT 1139: reinforce any upright rearing toward bar |
| 2 | 129 | Bar Press | 25 | LABTEXT 1140: bar now delivers food automatically |
| — | 136 | Rear Up Facing Front | 3000 | LABTEXT 1147: reinforce rearing facing experimenter |

**Shaping Tutor text (LABTEXT 1139):**
> "I will assist you by reinforcing Sniffy whenever he lifts his paws off the ground while facing in the general direction of the bar. The bar has also been set to deliver reinforcement."

**Shaping Tutor text (LABTEXT 1140):**
> "I have set the Bar to activate the food dispenser."

**Sample file:** `ShapeBP.sdf` (4702 ticks, bar press acquired)

### 3.2 Shaping Animation Sequences

The engine maps each approximation step to a set of SEQX IDs. When the rat enters any of these animation states the behavior is counted as a valid response.

| Behavior | SEQX animation IDs (from REIN data) |
|----------|-------------------------------------|
| Rear Up Facing Back | 138, 139, 140, 141 |
| Beg | 214, 215, 216, 217 |
| Head Lower | 186, 187, 206, 207, 212, 213 |
| Head Tuck | 206, 207, 212, 213 |
| Roll | 212, 213 |
| Face Touch | 188, 189, 190, 191, 208, 209, 210, 211 |
| Face Wipe | 208, 209, 210, 211 |
| Rear Up Facing Front | 134, 135, 136, 137, 236, 237, 216, 217 |

---

## 4. Operant Schedules

**In-app text (LABTEXT 1134):**
> "You have chosen to reinforce Sniffy on a Schedule."

**In-app text (LABTEXT 1131):**
> "Sniffy appears to be trained properly. You may experiment with different Schedule effects."

### 4.1 Schedule Types

| Schedule | PARM 141 value | Description |
|----------|---------------|-------------|
| **CRF** (Continuous Reinforcement) | 0 | Every bar press delivers food |
| **FR** (Fixed Ratio) | 1 | Reinforcement after every *n* responses |
| **FI** (Fixed Interval) | 2 | First response after *t* seconds is reinforced |
| **VR** (Variable Ratio) | 3 | Reinforcement after average *n* responses (variable) |
| **VI** (Variable Interval) | 4 | First response after random interval averaging *t* s |
| **DRL** (Differential Reinforcement of Low rate) | 5 | Response reinforced only if preceded by IRT ≥ *t* s |

### 4.2 Schedule Parameters

| PARM | Default | Schedule | Meaning |
|------|---------|----------|---------|
| 132 | 8 | FR | Fixed ratio value *n* |
| 133 | 10 | FI | Fixed interval in seconds |
| 134 | 0 | VR | Variable ratio mean *n* (0 = use FR value) |
| 135 | 20 | VI | Variable interval mean in seconds |
| 136 | 10 | DRL | IRT requirement in seconds |
| 137 | 0 | DRH | DRH upper bound (0 = disabled) |
| 138 | 100 | CRF | CRF reinforcement percentage |
| 142 | 6 | FR/VR | Number of responses per block |

**VR variance** is computed using a reduction factor:

```
VR_actual = VR_mean ± (VR_mean / RVRREDUCTION)
RVRREDUCTION (PARM ~8) default = 8
```

**Sample file:** `VR-25.sdf` — Variable Ratio schedule, mean ratio = 25 (4079 ticks)

### 4.3 Schedule Strength Computation

The debug string embedded in the EXE reveals the internal score formula:

```
ID {id}
  Base   {base}      — base drive (hunger × deprivation factor)
  Beh    {beh}       — current behavior probability
  Pain   {pain}      — pain/aversion component
  Sctr   {scatter}   — random scatter
  Dsc    {discrimin} — discrimination weight (S+/S−)
  Sch    {schedule}  — schedule component
  Crt    {criteria}  — criteria met flag
  Thrshd {threshold} — threshold for action

SF   {slope_factor}
Mem  {memory}
BS   {behavior_strength}
Dlt  {delta}
IRT  {inter_response_time}
FR   {fr_value}
FI   {fi_value}
VR   {vr_value}
VI   {vi_value}
Rate {response_rate}
```

---

## 5. Classical Conditioning

**Purpose:** Pair a neutral conditioned stimulus (CS: light, bell, or tone) with an unconditioned stimulus (US: food or shock) to produce a conditioned response.

### 5.1 Rescorla-Wagner Model

Sniffy Pro implements the **Rescorla-Wagner (1972)** learning rule, with these internal variables (found as symbol strings in the EXE):

| Variable | Role |
|----------|------|
| `Alpha` | CS salience (associability) |
| `Beta` | US salience (learning rate) |
| `Rho` | US magnitude |
| `Gamma` | Generalization / decay factor |
| `V` | Associative strength (CS→US) |
| `deltaV` | Change in V per trial |
| `E` | Expectancy / excitation |
| `deltaE` | Change in excitation |
| `kBetaZero` | Beta when US absent |
| `GammaZero` | Gamma baseline |
| `Vabnminus1` | V on previous trial (A→B) |
| `V2ndOrdernminus1` | V for second-order conditioning |
| `lastUCSRho` | Previous UCS magnitude |
| `lastUCSNature` | Previous UCS type |
| `rhoCap` | Maximum rho (asymptote) |
| `SR` | Stimulus-Response strength |
| `SS` | Stimulus-Stimulus association |

**Core update rule:**
```
deltaV = Alpha × Beta × (Rho − Σ V_all_cues)
V_new  = V_old + deltaV
```

### 5.2 Stimulus Types

**Conditioned Stimuli (CS):**
- Light
- Bell
- Tone

**Unconditioned Stimuli (US):**
- Food (positive reinforcement)
- Shock (aversive)
- None

**String literals found in EXE:**
```
"Light paired with"
"Bell paired with"
"Tone paired with"
"Shock"
"None"
```

### 5.3 Classical Conditioning Parameters

| PARM | Default | Meaning |
|------|---------|---------|
| 153 | 600 ms | CS presentation duration |
| 157 | 0 ms | US delay (onset asynchrony; 0 = simultaneous) |
| 159 | 7 | Inter-trial interval (seconds) |

**Sample file:** `ClassAcq.sdf` (7121 ticks, classical acquisition phase)

---

## 6. Discrimination Training

**In-app text (LABTEXT 1135):**
> "Sniffy is being reinforced on a Discrimination Schedule. Responses are reinforced in the presence of the S+ tone and no reinforcement is given in the presence of the S−. Sniffy should learn to respond in the presence of the S+ and not in the presence of the S−."

### 6.1 Discrimination Parameters

| PARM | Default | Meaning |
|------|---------|---------|
| 139 | 4 | S+ weight (reinforcement probability multiplier) |
| 140 | 3 | S− weight (suppression multiplier) |
| 149 | 10 | Behavioral contrast factor |

### 6.2 S+/S− Logic

```
If current_stimulus == S_PLUS:
    schedule_weight = S_plus_weight   (PARM 139)
    reinforcement_eligible = true
Else:  // S_MINUS
    schedule_weight = S_minus_weight  (PARM 140)
    reinforcement_eligible = false
```

Behavioral contrast: when responding drops in S−, it temporarily increases above baseline in S+. Magnitude is proportional to `BehaviouralContrast_Factor` (PARM 149).

---

## 7. Extinction

**In-app text (LABTEXT 1133):**
> "No food will be delivered to continue to reinforce Sniffy's behaviour. Gradually the bar pressing behaviour will be eliminated."

**Extinction** is engaged by:
1. Setting schedule to **No Reinforcement** (REIN 199, PARM 141 = 0).
2. Disconnecting the bar from the food dispenser.

### 7.1 Extinction Parameters

| PARM | Default | Meaning |
|------|---------|---------|
| 148 | 0 | Limited display (0 = show all responses during extinction) |
| 158 | 1 | Limited depth (response recording depth) |
| 146 | 2 | Timeout recovery factor (rate at which drive recovers) |

**DECP (Decay Parameters) — two resources:**

| DECP | Values | Inferred use |
|------|--------|-------------|
| 128 | [2, 11, 3, 21, 2] | Short-term extinction decay curve (5 stages) |
| 129 | [2, 62, 3, 122, 2] | Long-term extinction / spontaneous recovery curve |

---

## 8. Custom / Trick Behaviors

Beyond bar pressing, Sniffy Pro supports shaping these target behaviors (each with dedicated SEQX animation sequences and LABTEXT coaching messages):

| Behavior | REIN ID | Tutor text (LABTEXT) |
|----------|---------|----------------------|
| **Bar Press** | 129 | 1140: "I have set the Bar to activate the food dispenser." |
| **Beg** | 130 | 1141: "…reinforce Sniffy anytime he lifts his paws off the ground and stands upright as if begging." |
| **Head Lower** | 131 | 1142: "…reinforce Sniffy anytime he stands on his hind paws and lowers his head close to the ground." |
| **Head Tuck** | 132 | 1143: "…reinforce Sniffy anytime he stands on his hind paws and tucks his head." |
| **Roll** | 133 | 1144: "…reinforce Sniffy anytime he rolls over." |
| **Face Touch** | 134 | 1145: "…reinforce Sniffy anytime he touches his face with his paw." |
| **Face Wipe** | 135 | 1146: "…reinforce Sniffy anytime he repeatedly wipes his face up and down." |
| **Rear Up Facing Front** | 136 | 1147: "…reinforce Sniffy whenever he lifts his paws off the ground while facing you." |
| **Rear Up Facing Back** | 128 | 1139: "…reinforce Sniffy whenever he lifts his paws off the ground while facing in the general direction of the bar." |

**Demo files:** `BegDemo.sdf`, `FaceWipeDemo.sdf`, `RollDemo.sdf`

---

## 9. Parameter Reference (PARM)

All PARM resources are stored as `uint16` little-endian (2 bytes each). Resource IDs 128–159.

| PARM ID | Default | Name | Notes |
|---------|---------|------|-------|
| 128 | 40 | `Hunger_Threshold` | Higher = rat is hungrier / more motivated |
| 129 | 25 | `Location_Threshold` | Proximity to hopper for magazine training |
| 130 | 550 | `Tick_Size` | Simulation tick in ms (matches MODP_130 Normal) |
| 131 | 60 | `Session_Length` | Session length in minutes |
| 132 | 8 | `FR_Ratio` | Fixed ratio value |
| 133 | 10 | `FI_Interval` | Fixed interval in seconds |
| 134 | 0 | `VR_Ratio` | Variable ratio mean (0 = use FR value) |
| 135 | 20 | `VI_Interval` | Variable interval mean in seconds |
| 136 | 10 | `DRL_Interval` | DRL inter-response time requirement (s) |
| 137 | 0 | `DRH_Interval` | DRH upper bound (0 = off) |
| 138 | 100 | `CRF_Percent` | CRF reinforcement % |
| 139 | 4 | `S_Plus_Weight` | Discrimination S+ strength |
| 140 | 3 | `S_Minus_Weight` | Discrimination S− suppression |
| 141 | 0 | `Schedule_Type` | 0=CRF, 1=FR, 2=FI, 3=VR, 4=VI, 5=DRL |
| 142 | 6 | `Number_Responses` | Responses per schedule block |
| 143 | 2 | `Behaviour_Threshold` | Minimum behavior score to count as response |
| 144 | 80 | `Deprivation_Factor` | Food deprivation multiplier on drive |
| 146 | 2 | `Timeout_Recovery_Factor` | Post-timeout drive recovery rate |
| 147 | 4 | `Slope_Factor` | Sigmoid slope for probability computation |
| 148 | 0 | `Limited_Display` | 0 = show all; 1 = limited cumulative record |
| 149 | 10 | `BehaviouralContrast_Factor` | Contrast magnitude in discrimination |
| 150 | 0 | `Thirsty` | 0 = hungry paradigm; 1 = thirst paradigm |
| 151 | 0 | `Starting_Seed` | RNG seed (0 = random) |
| 152 | 24 | `Hopper_Sound_Duration` | Hopper click duration in ticks |
| 153 | 600 | `CS_Duration_ms` | CS presentation duration (classical) |
| 157 | 0 | `US_Delay_ms` | CS-US onset asynchrony |
| 158 | 1 | `Limited_Depth` | Response history depth |
| 159 | 7 | `Inter_Trial_Interval` | ITI in seconds (classical) |

---

## 10. Speed-Level Tables (MODP)

MODP resources define 5-level speed curves. The **Normal** column matches the corresponding PARM default. The simulation allows the user to drag a speed slider (Very Slow → Very Fast).

| MODP ID | Parameter | Very Slow | Slow | **Normal** | Fast | Very Fast |
|---------|-----------|-----------|------|------------|------|-----------|
| 128 | Hunger decay rate | 100 | 80 | **70** | 60 | 40 |
| 129 | Location radius (px) | 40 | 30 | **25** | 20 | 10 |
| 130 | Tick size (ms) | 500 | 525 | **550** | 575 | 600 |
| 132 | FR ratio | 20 | 16 | **12** | 10 | 8 |
| 133 | FI interval (s) | 6 | 8 | **10** | 12 | 24 |
| 137 | DRL interval (s) | 2 | 4 | **8** | 16 | 32 |
| 143 | Behaviour threshold | 1000 | 990 | **980** | 950 | 900 |
| 152 | Hopper sound duration | 8 | 16 | **24** | 36 | 48 |
| 153 | CS duration (ms) | 400 | 500 | **600** | 700 | 800 |
| 160 | Pain/fear offsets (signed) | +100 | +77 | **+40/0/−40** | −77 | −100 |

---

## 11. Behavior / Animation State Catalog

All behavior states found in SDF files and the EXE animation engine (119 SEQX resources, IDs 120–281).

### Locomotion

| State name | Notes |
|-----------|-------|
| Walking South / North / East / West | 4-directional base walk |
| Short Walk East / West | Short displacement |
| Turning (8 directions) | 45° increments |
| Tight Turn (8 directions) | In-place rotation |

### Rearing / Bar Press

| State name | Notes |
|-----------|-------|
| Rearing West / East | Generic rear |
| Low Rear West / East | Partial rear (shaping step 1) |
| Rear South / North variants | Directional rear |
| Bar Press North From Facing West | Full bar press (west approach) |
| Bar Press North From Facing East | Full bar press (east approach) |
| One Press | Single press cycle |
| Mount and Press | Multi-press sequence |
| No Press | Approach without pressing |
| Dismount | Leave bar area |

### Shaping / Trick Behaviors

| State name | Behavior |
|-----------|---------|
| Rear Up Facing Back | Shaping step for bar press |
| Rear Up Facing Front | Facing-front rear |
| Head Lower West / East | Head lower approximation |
| Head Tuck West / SW | Head tuck |
| Roll West / East | Roll-over trick |
| Face Touch Groom West / East | Face touch |
| Face Wipe (Grooming Trick) | Repeated face wipe |
| Beg One / Mount / No / Dismount / Fear variants | Beg trick sequence |

### Exploratory / Neutral

| State name | Notes |
|-----------|-------|
| Sniffing North / West / East / South | Directional sniff |
| Sniffing Hopper | Hopper investigation |
| Genital Lick | Self-grooming |
| Grooming | General grooming |
| Eating | Food consumption |
| Drinking | Water consumption |

### Emotional / Aversive

| State name | Notes |
|-----------|-------|
| Fear (all 4 directions) | Aversive US active |
| Fear Dismount | Escape from bar area |
| Pain Rear / North / South | Shock reaction |
| High Pain | Maximum shock |
| Dismount Pain | Pain-induced dismount |

### Sprite folder mapping (rat_images/png/)

```
walk_left / walk_right / walk_up / walk_down
run_left / run_right
groom_a / groom_b / groom_c / groom_d / groom_e
sniff_left / sniff_right
eat / drink
rear_up_a / rear_up_b
lever_press_l / lever_press_r   ← variant 1 only
turn_left / turn_right
freeze_a / freeze_b
explore_left / explore_right
10walk_left / 10walk_right ...  ← variant 2 (same, no lever_press)
```

---

## 12. Reinforcement Hierarchy (REIN)

The full ordered list (REIL_128) determines the sequence in which behaviors are displayed in the Shaping Tutor menu:

```
137  Target Behavior      (header)
199  No Reinforcement
129  Bar Press
130  Beg
133  Roll
135  Face Wipe
---  (divider)
138  Shaping Tutor        (header)
128  Rear Up Facing Back
136  Rear Up Facing Front
131  Head Lower
132  Head Tuck
134  Face Touch
```

---

## 13. SDF File Format

SDF ("Sniffy Data File") is a proprietary binary format.

| Offset | Length | Content |
|--------|--------|---------|
| 0 | 20 bytes | ASCII header: `PsychoMouse 6016fMac` |
| 20–35 | 16 bytes | Metadata (version, flags) |
| 36–39 | 4 bytes | Magic: `0f 45 ec db` (constant) |
| 40–43 | 4 bytes | Per-file seed / unique ID |
| 44+ | variable | Encoded session data (behavior frames, timestamps, schedule events) |

**Embedded string data** (found in all SDF files): behavior state names (see §11), schedule parameters, shaping target names, frame counts, and session metadata.

**Sample files summary:**

| File | Ticks | Paradigm |
|------|-------|---------|
| MagTrain.sdf | 421 | Magazine training |
| ShapeBP.sdf | 4702 | Shaping → bar press |
| BegDemo.sdf | 4909 | Shaping → beg |
| FaceWipeDemo.sdf | 2163 | Shaping → face wipe |
| RollDemo.sdf | 1419 | Shaping → roll |
| ClassAcq.sdf | 7121 | Classical conditioning acquisition |
| VR-25.sdf | 4079 | Variable ratio 25 schedule |

---

## 14. Implementation Guide

This section describes how to implement a modern equivalent of the Sniffy Pro conditioning engine.

### 14.1 Core Architecture

```
┌─────────────────────────────────────────────────┐
│                  SimulationEngine                │
│  tick(dt)                                        │
│    ├── DriveSystem.update(dt)                    │
│    ├── BehaviorStateMachine.update(dt)           │
│    ├── ScheduleEngine.evaluate(response)         │
│    ├── ReinforcerSystem.deliver()                │
│    └── Recorder.log(tick, state, response)       │
└─────────────────────────────────────────────────┘
```

### 14.2 Drive System

```js
class DriveSystem {
  constructor(params) {
    this.hunger      = params.PARM_128;  // 40
    this.deprivation = params.PARM_144;  // 80
    this.decayRate   = params.MODP_128[speedLevel]; // [100,80,70,60,40]
  }

  update(dt) {
    // Hunger increases over time (drives behavior)
    this.hunger = Math.min(100, this.hunger + (this.decayRate * dt / 1000));
  }

  reinforce() {
    // Food delivery resets hunger partially
    this.hunger = Math.max(0, this.hunger - (this.deprivation * 0.1));
  }

  get driveStrength() {
    return (this.hunger / 100) * (this.deprivation / 100);
  }
}
```

### 14.3 Behavior Probability Engine

Based on the debug format string extracted from the EXE:

```js
function computeBehaviorScore({ base, beh, pain, scatter, discrimin, schedule, criteria, threshold, slopeFactor }) {
  // Rescaled sigmoid
  const raw = base * beh * (1 + schedule * discrimin) - pain + scatter;
  const score = 1 / (1 + Math.exp(-slopeFactor * (raw - threshold)));
  return score;
}

// slopeFactor = PARM_147 / 100  (default 4 → 0.04)
// threshold   = PARM_143 / 1000 (default 2 → 0.002, MODP_143 at speed)
```

### 14.4 Schedule Engine

```js
class ScheduleEngine {
  // PARM 141 schedule types
  static TYPES = { CRF: 0, FR: 1, FI: 2, VR: 3, VI: 4, DRL: 5 };

  constructor(params) {
    this.type         = params.PARM_141;
    this.frRatio      = params.PARM_132;   // 8
    this.fiInterval   = params.PARM_133;   // 10s
    this.vrMean       = params.PARM_134 || params.PARM_132;
    this.viMean       = params.PARM_135;   // 20s
    this.drlIRT       = params.PARM_136;   // 10s
    this.responseCount = 0;
    this.intervalTimer = 0;
    this.lastResponseTime = 0;
    this._setNextTarget();
  }

  _setNextTarget() {
    switch (this.type) {
      case 1: // FR
        this.target = this.frRatio; break;
      case 2: // FI
        this.target = this.fiInterval * 1000; break;
      case 3: // VR — variable using Poisson-like distribution
        this.target = this._vr(); break;
      case 4: // VI
        this.target = this._vi(); break;
      case 5: // DRL
        this.target = this.drlIRT * 1000; break;
    }
  }

  _vr() {
    // Mean ± mean/8 (RVRREDUCTION=8)
    const spread = this.vrMean / 8;
    return Math.max(1, Math.round(this.vrMean + (Math.random() * 2 - 1) * spread));
  }

  _vi() {
    // Exponential distribution with mean = viMean
    return Math.round(-this.viMean * Math.log(Math.random()) * 1000);
  }

  onResponse(timestamp) {
    const irt = timestamp - this.lastResponseTime;
    this.lastResponseTime = timestamp;

    switch (this.type) {
      case 0: return true;  // CRF
      case 1: // FR
        this.responseCount++;
        if (this.responseCount >= this.target) {
          this.responseCount = 0; this._setNextTarget(); return true;
        }
        return false;
      case 2: // FI
        if (this.intervalTimer >= this.target) {
          this.intervalTimer = 0; this._setNextTarget(); return true;
        }
        return false;
      case 3: // VR
        this.responseCount++;
        if (this.responseCount >= this.target) {
          this.responseCount = 0; this._setNextTarget(); return true;
        }
        return false;
      case 4: // VI
        if (this.intervalTimer >= this.target) {
          this.intervalTimer = 0; this._setNextTarget(); return true;
        }
        return false;
      case 5: // DRL
        return irt >= this.target;
    }
  }

  tick(dt) {
    if (this.type === 2 || this.type === 4) {
      this.intervalTimer += dt;
    }
  }
}
```

### 14.5 Classical Conditioning (Rescorla-Wagner)

```js
class RescorlaWagner {
  constructor({ alpha = 0.1, beta = 0.3, rho = 1.0, gamma = 0.95 }) {
    this.alpha  = alpha;   // CS salience
    this.beta   = beta;    // US salience (learning rate)
    this.rho    = rho;     // US magnitude
    this.gamma  = gamma;   // Retention/decay
    this.V      = 0;       // Associative strength
    this.E      = 0;       // Excitation
  }

  trial({ csPresent, usPresent }) {
    if (!csPresent) return;
    const prediction = this.V;
    const actual     = usPresent ? this.rho : 0;
    const predError  = actual - prediction;  // Rescorla-Wagner delta rule
    this.V  = Math.max(0, Math.min(1, this.V + this.alpha * this.beta * predError));
    this.E  = this.V * this.gamma;
  }

  get conditionedResponseStrength() { return this.E; }
}
```

### 14.6 Shaping Tutor Logic

```js
class ShapingTutor {
  constructor(steps) {
    // steps = ordered REIN list (from §12)
    this.steps    = steps;
    this.current  = 0;
    this.criterion = 10;  // consecutive reinforcements to advance
    this.count    = 0;
  }

  evaluate(animationStateId) {
    const step = this.steps[this.current];
    if (step.seqIds.includes(animationStateId)) {
      this.count++;
      if (this.count >= this.criterion) {
        this.count = 0;
        this.advance();
        return { reinforce: true, advance: true };
      }
      return { reinforce: true, advance: false };
    }
    return { reinforce: false, advance: false };
  }

  advance() {
    if (this.current < this.steps.length - 1) this.current++;
  }

  get instruction() { return LABTEXT[this.steps[this.current].labtextId]; }
}
```

### 14.7 Session Recorder

```js
class SessionRecorder {
  constructor() { this.frames = []; }

  log(tick, state, extras = {}) {
    this.frames.push({ tick, state, ...extras, ts: Date.now() });
  }

  exportCSV() {
    return ['tick,state,ts', ...this.frames.map(f =>
      `${f.tick},${f.state},${f.ts}`
    )].join('\n');
  }

  exportSDF() {
    // Minimal SDF-compatible output
    const header = new TextEncoder().encode('PsychoMouse 6016fMac');
    // ... encode frames as binary per SDF format
    return header;
  }
}
```

### 14.8 Speed Control

Map UI speed slider (0–4) to MODP arrays:

```js
const SPEED_LEVELS = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];

const MODP = {
  128: [100, 80, 70, 60, 40],    // hunger decay
  129: [40, 30, 25, 20, 10],     // location radius
  130: [500, 525, 550, 575, 600], // tick size ms
  132: [20, 16, 12, 10, 8],      // FR ratio
  133: [6, 8, 10, 12, 24],       // FI interval
  137: [2, 4, 8, 16, 32],        // DRL IRT
  152: [8, 16, 24, 36, 48],      // hopper sound duration
  153: [400, 500, 600, 700, 800], // CS duration ms
};

function getParam(modpId, speedLevel) {
  return MODP[modpId]?.[speedLevel] ?? MODP[modpId]?.[2]; // default Normal
}
```

### 14.9 Simulation Tick Loop

Replace the original Win32 `SetTimer` / `SniffyFrame` callback with `requestAnimationFrame`:

```js
class SimulationEngine {
  constructor(params, speedLevel = 2) {
    this.tickSize  = MODP[130][speedLevel];  // ms per sim tick (default 550)
    this.accumulator = 0;
    this.tick = 0;
    this.drive    = new DriveSystem(params, speedLevel);
    this.schedule = new ScheduleEngine(params);
    this.recorder = new SessionRecorder();
    this.stateMachine = new RatStateMachine({ ... });
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last; last = now;
      this.accumulator += dt;
      while (this.accumulator >= this.tickSize) {
        this._simTick();
        this.accumulator -= this.tickSize;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _simTick() {
    this.tick++;
    this.drive.update(this.tickSize);
    this.schedule.tick(this.tickSize);
    this.stateMachine.update(this.drive.driveStrength);
    this.recorder.log(this.tick, this.stateMachine.state);
  }
}
```

### 14.10 Sound System

The original EXE embeds one WAV resource: `"NoFood Sound"` (8-bit PCM, 22126 Hz, ~6 KB). For the hopper click and CS tones, use the Web Audio API:

```js
class SoundSystem {
  constructor(ctx = new AudioContext()) { this.ctx = ctx; }

  playHopperClick(durationTicks, tickMs) {
    // Short white-noise burst simulating pellet delivery
    const dur = (durationTicks * tickMs) / 1000;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start();
  }

  playTone(freq = 1000, durationMs = 600) {
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + durationMs / 1000);
  }
}
```

---

*Extracted from `SniffyPro.exe` (PE32, Win32 GDI, ~19 MB) and 7 SDF sample files.*  
*All PARM/MODP values are factory defaults; runtime values are stored per-session in SDF.*
