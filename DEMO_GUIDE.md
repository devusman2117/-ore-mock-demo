# DentiPrep AI: Client demo guide

Reference site: https://cosmident.cosmiron.ai (Cosmident by Cosmiron AI)

---

## 1. Ye website kya karti hai? (simple alfaaz mein)

UK mein jo dentists bahar se aate hain (overseas graduates), unhein **GDC ORE Part 2** exam pass karna hota hai.
Ye exam **oral, timed, aur in-person** hota hai: candidate ek actor patient se baat karta hai, examiner sawal poochta hai.

**Masla:**
- GDC fail hone ki **wajah nahi batata**. Mark scheme aur model answers secret hote hain.
- Sirf **4 attempts** milte hain, aur har resit ki fee ~**£6,967** hai.
- Log akelay kitabon se parhte hain, practice ka koi realistic tareeqa nahi.

**Hal (ye website):**
Ek **AI exam hall** jo raat 2 baje bhi khula hai:
1. **AI patient / AI examiner** (photoreal, lip-synced avatar) se candidate **bol kar ya likh kar** baat karta hai.
2. **Asli clock** chalta hai, rukta nahi.
3. Khatam hotay hi **marksheet** milti hai jo batati hai ke **kaun se alfaaz ne kaun sa mark dilwaya**.
4. 48 ghantay mein **ex-examiner** ka written analysis bhi aata hai.

---

## 2. Website mein kya kya features hain (aur demo mein kahan dikhaye hain)

| Feature (original site) | Ye kya hai | Demo mein kahan |
|---|---|---|
| Landing page | Problem, solution, how it works, pricing, comparison, FAQ | `Home` |
| Pick a mock | Single station, ME viva, DTP long case | `Mocks` |
| **AI patient with gated knowledge** | Patient sirf wohi batata hai jo sahi sawal poocha jaye (allergy tab hi batayegi jab "allergies?" poochoge) | OSCE station → "Facts uncovered" meter |
| **Speak or type** | Mic se bolo ya type karo, dono ko same marks | 🎤 button (Chrome/Edge) |
| AI avatar ki awaaz | Patient/examiner bol kar jawab deta hai | 🔊 toggle, avatar ka munh hilta hai |
| **Live clock** | Asli exam ki tarah timer, 0 pe auto-submit | Upar right corner |
| **ME viva (8 min)** | Medical emergency ke rapid-fire sawal: drug, dose, route | "Medical Emergencies viva" |
| **DTP long case (54 min, 4 phase-locked stages)** | Har stage submit karne ke baad lock, agla khulta hai | "DTP long case" |
| **Evidence-based marksheet** | Har mark ke saath candidate ke apne alfaaz quote + highlight | Result page |
| Listen → Converse → Judge → Respond | Grading ke 4 stages | Result page ka pipeline |
| Domain breakdown | Communication, History, Safety, Clinical reasoning | Result page ki bars |
| Examiner analysis | Strengths / weak areas | Purple box (demo mein auto-generated) |
| **Contest verdict** | Mark se ikhtilaf ho to human mentor ko bhejo | Result page → "Contest verdict" |
| Progress + "No pass, no fee" | 2 mocks sit karo, 1 pass karo → refund eligible | `My results` |
| **One-click account delete** | Saari recordings aur scores ek click mein delete | `My results` neeche |
| **Academy embed** | Dental academies ek `<script>` tag se apni site pe laga sakti hain, referral tracking ke saath | `Academies` |
| Dark mode | | Upar moon icon |

---

## 3. Andar se kaise kaam karta hai (technical flow)

```
Candidate (browser)
   │  bolta hai 🎤  ──►  Speech-to-Text  ──►  text
   │                                          │
   │                                          ▼
   │                               Backend: /sessions/:id/message
   │                                          │
   │                         ┌────────────────┴───────────────┐
   │                         │  AI Patient engine             │
   │                         │  - hidden "facts" list         │
   │                         │  - sirf matching fact reveal   │
   │                         └────────────────┬───────────────┘
   │                                          ▼
   │  ◄── Text-to-Speech + lip-sync avatar ── reply
   │
   └── "End & mark" ──► /sessions/:id/finish
                               │
                               ▼
                 Grader (Listen → Converse → Judge → Respond)
                 - har rubric item ke liye transcript mein evidence dhoondo
                 - evidence nahi = mark nahi
                               │
                               ▼
                 Marksheet + domain scores + analysis  ──► database
```

**Ahem baat:** rubrics aur hidden facts **kabhi browser ko nahi bheje jaate** (cheating se bachne ke liye). Sirf server ke paas hote hain.

### Demo vs Production

| Hissa | Demo (abhi) | Production (asal project) |
|---|---|---|
| AI patient | Rule-based keyword matching | **LLM (Claude API)**, system prompt mein facts + "sirf poochne pe batao" |
| Grader | Regex rubric matching | LLM judge jo har mark ke liye **verbatim quote** de; server check kare ke quote transcript mein hai |
| Avatar | SVG cartoon + browser voice | **HeyGen / D-ID streaming avatar** (photoreal, lip-sync) |
| Speech-to-text | Browser Web Speech API | **Deepgram / OpenAI Whisper** streaming |
| Database | `data/attempts.json` | **PostgreSQL** (Prisma / TypeORM) |
| Login | Nahi | Email/Google login (NextAuth / JWT) |
| Payment | Nahi | **Stripe** (£299 / £550 + VAT) |
| Examiner 48h analysis | Auto-generated | Mentor dashboard jahan ex-examiner likhe |
| Recordings | Nahi | Audio S3 / R2 pe |

---

## 4. Client ko demo kaise dena hai (5 minute ka script)

**Pehle:** `npm start` chalao, **Chrome** mein `http://localhost:3000` kholo, mic allow karo, speakers on.

1. **Home page (1 min):** Problem section dikhao: "GDC fail ki wajah nahi batata, 4 attempts, £6,967 per resit." Phir "How it works" ke 3 steps.
2. **Mocks → History taking: Toothache (2 min).** Ye lines bolo ya type karo:
   - `Hello, my name is Dr Ahmed, I'm the dentist. Can you confirm your full name and date of birth?`
   - `What brings you in today?`
   - `Where is the pain and how long has it been going on?`
   - `Do you have any allergies or medical history?` ← dikhao ke patient **ab** asthma aur penicillin allergy batati hai, pehle nahi
   - `I think this is irreversible pulpitis. Options are root canal treatment or extraction. Please avoid ibuprofen because of your asthma. Does that make sense?`
   - Ek baar 🎤 se bol kar bhi dikhao.
   - **"Facts uncovered" meter** point out karo = gated knowledge.
3. **End & mark → Marksheet (1 min):** Hara highlight dikhao: "ye mark aapke in alfaaz ki wajah se mila." Laal items: "ye nahi poocha, isliye mark nahi." Contest verdict button dabao.
4. **ME viva (30 sec):** Pehla sawal: `Call 999, adrenaline 500 micrograms IM in the thigh, repeat after 5 minutes`.
5. **DTP long case (30 sec):** Stage submit karo, dikhao ke wo lock ho gaya.
6. **My results + Academies (30 sec):** Progress, refund eligibility, one-click delete, embed script.

---

## 5. Asal project: Next.js + NestJS structure

```
dentiprep/
├── apps/
│   ├── web/                      # Next.js 15 (App Router) – frontend
│   │   ├── app/
│   │   │   ├── page.tsx                  # Landing (demo: viewHome)
│   │   │   ├── mocks/page.tsx            # Mock picker (viewMocks)
│   │   │   ├── exam/[stationId]/page.tsx # Exam room (viewExam, runOsce/Viva/LongCase)
│   │   │   ├── result/[id]/page.tsx      # Marksheet (viewResult)
│   │   │   ├── dashboard/page.tsx        # My results (viewDashboard)
│   │   │   ├── academy/page.tsx          # Embed info (viewAcademy)
│   │   │   └── (auth)/login, signup
│   │   ├── components/  Avatar, Clock, ChatPanel, Marksheet, PricingCard
│   │   └── public/embed.js               # Academy widget
│   │
│   └── api/                      # NestJS – backend
│       └── src/
│           ├── stations/     StationsController   GET /stations, /stations/:id
│           ├── sessions/     SessionsController   POST /sessions, /:id/message, /:id/finish
│           │                 └── WebSocket gateway for live audio streaming
│           ├── ai/           PatientService (Claude), GraderService (Claude judge)
│           ├── speech/       SttService (Deepgram), AvatarService (HeyGen)
│           ├── attempts/     AttemptsController   GET /attempts, POST /:id/contest
│           ├── mentors/      Review queue for contested & 48h analysis
│           ├── billing/      Stripe checkout + webhooks + refund rule
│           ├── academies/    Referral attribution
│           ├── auth/         JWT + Google
│           └── prisma/       PostgreSQL schema
└── packages/shared/          # Shared types (Station, Attempt, Marksheet)
```

Demo ka har backend route (`server.js`) seedha ek NestJS controller ban jaata hai, aur har view function (`public/app.js`) ek Next.js page. Logic (`engine/`) NestJS services mein chala jaata hai. Isliye demo se production tak koi kaam zaya nahi hota.

### Database tables (PostgreSQL)
`users`, `academies`, `stations`, `station_facts`, `rubric_items`, `sessions`, `messages`, `attempts`, `marks` (evidence quote ke saath), `contests`, `payments`

### Mutawaqqa phases
1. **Phase 1:** Next.js UI + NestJS API + Postgres + auth (demo ko port karna)
2. **Phase 2:** Claude se AI patient + LLM grader with evidence verification
3. **Phase 3:** Voice: streaming STT + HeyGen avatar, audio recording
4. **Phase 4:** Stripe payments, refund logic, mentor dashboard, academy embed
5. **Phase 5:** Content: ex-examiners se 30+ stations aur rubrics likhwana

---

## 6. Zaroori notes
- Demo mein brand ka naam **"DentiPrep AI"** rakha hai (placeholder). Client ka asal naam `public/app.js` mein `BRAND` aur `index.html` ke title mein badal dein. Cosmident ka naam/logo copy na karein; wo kisi aur company ka brand hai.
- Clinical content (doses, rubrics) demo ke liye hai. Production mein qualified dentist se verify karwana zaroori hai.
- Mic aur voice sirf **Chrome / Edge** mein theek chalte hain. Firefox mein typing use karein.
