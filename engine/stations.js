// Exam content: stations, gated patient knowledge, examiner scripts and rubrics.
// In production this lives in the database (NestJS + Postgres) and is authored by ex-examiners.

const stations = [
  {
    id: 'osce-toothache',
    type: 'osce',
    title: 'History taking: Toothache',
    subtitle: 'OSCE station · Communication & history',
    minutes: 10,
    persona: {
      name: 'Ms Ellis',
      role: 'Patient, 34',
      voice: { pitch: 1.15, rate: 1 },
      opening: "Hi... sorry, I've been in a lot of pain with my tooth. I hope you can help.",
    },
    brief:
      'Ms Ellis, 34, has turned up as an emergency patient. Take a focused history, explain your provisional diagnosis and discuss management options. You do not need to examine the patient.',
    // Gated knowledge: the patient only reveals a fact when the candidate asks a matching question.
    facts: [
      { id: 'understanding', triggers: [/(any questions|make sense|understand|clear|anything else)/i], reply: 'I think so, yes. Thank you for explaining it.' },
      { id: 'greet', triggers: [/\b(hello|hi|good (morning|afternoon))\b/i], reply: 'Hello. Nice to meet you.' },
      { id: 'identity', triggers: [/(full name|date of birth|dob|confirm.*(name|details))/i], reply: "It's Sarah Ellis, 14th of March 1991." },
      { id: 'pc', triggers: [/(what brings|how can i help|what seems|what's the problem|what is the problem|tell me (about|what))/i], reply: "I've got really bad toothache on one side." },
      { id: 'site', triggers: [/(where|which tooth|which side|point|location|show me)/i], reply: "It's the bottom right, right at the back." },
      { id: 'onset', triggers: [/(how long|when did|start|since when|began|onset)/i], reply: 'About three days now. It came on gradually, then got much worse yesterday.' },
      { id: 'character', triggers: [/(describe|what (kind|type|sort)|feel like|sharp|dull|throbb)/i], reply: "It's a throbbing pain. It even woke me up last night." },
      { id: 'radiation', triggers: [/(spread|radiat|go anywhere|move|ear|jaw)/i], reply: 'Sometimes it goes up towards my ear.' },
      { id: 'severity', triggers: [/(scale|out of (10|ten)|how (bad|severe)|rate|severity)/i], reply: "Honestly, about an eight out of ten." },
      { id: 'exacerbating', triggers: [/\b(worse|better|hot|cold|trigger\w*|eat|eating|drinks?|reliev\w*|aggravat\w*)\b/i], reply: 'Hot drinks make it much worse. Cold water actually helps a bit.' },
      { id: 'analgesia', triggers: [/(painkiller|pain killer|medication for|taken anything|tried anything|have you (taken|tried))/i], reply: "I've been taking paracetamol, it takes the edge off but doesn't last." },
      { id: 'swelling', triggers: [/(swell|swollen|lump|fever|temperature|unwell)/i], reply: 'Maybe slightly swollen on the gum, no fever though.' },
      { id: 'mh', triggers: [/(medical history|health (problem|condition)|any (condition|illness)|medicines|medication|take any|inhaler|general health)/i], reply: 'I have asthma. I use a blue salbutamol inhaler when I need it.' },
      { id: 'allergy', triggers: [/(allerg)/i], reply: "Yes, I'm allergic to penicillin. I came out in a rash." },
      { id: 'social', triggers: [/(smoke|cigarette|alcohol|drink alcohol|social)/i], reply: 'I smoke about ten a day. I know, I know...' },
      { id: 'dental', triggers: [/(last (saw|visit)|dentist before|dental history|regular)/i], reply: "I haven't been to a dentist in about three years. I'm a bit nervous." },
      { id: 'ice', triggers: [/(worr|concern|expect|hoping|ideas|think it is)/i], reply: "I'm really worried I'm going to lose the tooth. I'd like to keep it if I can." },
    ],
    fallback: [
      "Sorry, I'm not sure what you mean.",
      'Hmm... could you ask that another way?',
      "I don't really know, sorry.",
    ],
    rubric: [
      { id: 'intro', domain: 'Communication', label: 'Introduces self and gains consent', marks: 1, any: [/(my name is|i'?m (dr|doctor|the dentist)|i am (dr|the dentist))/i] },
      { id: 'id', domain: 'Communication', label: "Confirms patient's identity", marks: 1, any: [/(full name|date of birth|dob)/i] },
      { id: 'open', domain: 'History', label: 'Opens with an open question', marks: 1, any: [/(what brings|how can i help|what seems|tell me)/i] },
      { id: 'site', domain: 'History', label: 'Establishes site of pain', marks: 1, any: [/(where|which tooth|which side|point)/i] },
      { id: 'onset', domain: 'History', label: 'Establishes onset / duration', marks: 1, any: [/(how long|when did|start)/i] },
      { id: 'char', domain: 'History', label: 'Establishes character of pain', marks: 1, any: [/(describe|what (kind|type|sort)|feel like)/i] },
      { id: 'sev', domain: 'History', label: 'Establishes severity', marks: 1, any: [/(scale|out of (10|ten)|how (bad|severe)|rate)/i] },
      { id: 'exac', domain: 'History', label: 'Asks about exacerbating / relieving factors', marks: 1, any: [/(worse|better|hot|cold|trigger)/i] },
      { id: 'mh', domain: 'Safety', label: 'Takes a medical history', marks: 2, any: [/(medical history|health (problem|condition)|medicines|medication|general health)/i] },
      { id: 'allergy', domain: 'Safety', label: 'Asks about allergies', marks: 2, any: [/(allerg)/i] },
      { id: 'nsaid', domain: 'Safety', label: 'Recognises asthma: cautions against NSAIDs / ibuprofen', marks: 2, all: [/(ibuprofen|nsaid|anti-?inflammator)/i, /(avoid|not|careful|caution|asthma)/i] },
      { id: 'abx', domain: 'Safety', label: 'Avoids penicillin / amoxicillin given the allergy', marks: 2, any: [/(no (penicillin|amoxicillin)|avoid (penicillin|amoxicillin)|metronidazole|clarithromycin|not.*(penicillin|amoxicillin))/i] },
      { id: 'social', domain: 'History', label: 'Takes a social history (smoking)', marks: 1, any: [/(smoke|cigarette|tobacco)/i] },
      { id: 'cessation', domain: 'Health promotion', label: 'Offers smoking cessation advice', marks: 1, any: [/(stop smoking|quit|cessation|cut down)/i] },
      { id: 'ice', domain: 'Communication', label: 'Explores ideas, concerns, expectations', marks: 2, any: [/(worr|concern|expect|hoping)/i] },
      { id: 'dx', domain: 'Clinical reasoning', label: 'Gives a plausible diagnosis (irreversible pulpitis / apical periodontitis)', marks: 2, any: [/(irreversible pulpitis|pulpitis|apical periodontitis|nerve.*(inflamed|dying)|infect)/i] },
      { id: 'tx', domain: 'Clinical reasoning', label: 'Discusses options: root canal treatment vs extraction', marks: 2, all: [/(root canal|rct|endodontic)/i, /(extract|take.*out|remov)/i] },
      { id: 'check', domain: 'Communication', label: 'Checks understanding / invites questions', marks: 1, any: [/(any questions|make sense|understand)/i] },
    ],
    passMark: 0.6,
  },
  {
    id: 'me-viva',
    type: 'viva',
    title: 'Medical Emergencies viva',
    subtitle: 'Rapid-fire viva · 8-minute clock',
    minutes: 8,
    persona: {
      name: 'Dr Blake',
      role: 'Examiner',
      voice: { pitch: 0.85, rate: 1.05 },
      opening: "Good afternoon. I'll be asking you a series of medical emergency scenarios. Please answer as you would in practice.",
    },
    brief: 'The examiner will ask scripted medical emergency questions. Answer each one with drug, dose, route and next steps. The clock does not stop.',
    questions: [
      {
        q: 'A 40-year-old patient develops wheeze, facial swelling and a rash after a local anaesthetic. What do you do?',
        rubric: [
          { label: 'Recognises anaphylaxis and calls 999', marks: 1, any: [/(999|ambulance|emergency services|call for help)/i] },
          { label: 'Adrenaline 1:1000', marks: 1, any: [/adrenaline|epinephrine/i] },
          { label: 'Correct dose 500 micrograms (0.5 ml)', marks: 1, any: [/(500 ?(mcg|micrograms?|µg)|0\.5 ?(ml|mg))/i] },
          { label: 'Intramuscular, anterolateral thigh', marks: 1, any: [/(intramuscular|\bim\b|thigh)/i] },
          { label: 'Repeat after 5 minutes if no improvement', marks: 1, any: [/(repeat|5 min|five min)/i] },
        ],
      },
      {
        q: 'A diabetic patient becomes confused and sweaty but is still able to swallow. Management?',
        rubric: [
          { label: 'Recognises hypoglycaemia', marks: 1, any: [/hypo/i] },
          { label: 'Oral glucose 10–20 g', marks: 2, any: [/(oral glucose|glucose gel|sugar|sugary drink|10.?20 ?g)/i] },
          { label: 'Knows glucagon 1 mg IM if unconscious', marks: 2, any: [/glucagon/i] },
        ],
      },
      {
        q: 'A patient complains of crushing central chest pain radiating to the left arm. What do you do?',
        rubric: [
          { label: 'GTN spray 400 micrograms sublingual', marks: 2, any: [/(gtn|glyceryl trinitrate)/i] },
          { label: 'Aspirin 300 mg chewed if MI suspected', marks: 2, any: [/aspirin/i] },
          { label: 'Calls 999 / oxygen if hypoxic', marks: 1, any: [/(999|ambulance|oxygen)/i] },
        ],
      },
      {
        q: 'A known asthmatic is unable to complete sentences. Management?',
        rubric: [
          { label: 'Salbutamol inhaler via spacer', marks: 2, any: [/(salbutamol|blue inhaler|spacer)/i] },
          { label: 'Up to 10 puffs / 4 puffs then 2 every 2 min', marks: 1, any: [/(10 puffs|ten puffs|4 puffs|four puffs)/i] },
          { label: 'Oxygen 15 L/min and call 999 if severe', marks: 2, any: [/(oxygen|15 ?l|999|ambulance)/i] },
        ],
      },
      {
        q: 'A patient has been fitting for more than five minutes. What do you give?',
        rubric: [
          { label: 'Buccal midazolam', marks: 2, any: [/midazolam/i] },
          { label: 'Correct adult dose 10 mg', marks: 2, any: [/10 ?mg/i] },
          { label: 'Protect from injury, do not restrain', marks: 1, any: [/(protect|don'?t restrain|do not restrain|clear the area|recovery position)/i] },
        ],
      },
    ],
    passMark: 0.6,
  },
  {
    id: 'dtp-longcase',
    type: 'longcase',
    title: 'DTP long case',
    subtitle: 'Diagnosis & treatment planning · 4 phase-locked stages',
    minutes: 54,
    persona: { name: 'Dr Patel', role: 'Examiner', voice: { pitch: 0.95, rate: 1 }, opening: 'Read each stage carefully. Once you submit a stage you cannot go back.' },
    brief: 'Mr Khan, 58, attends complaining of loose upper front teeth and bleeding gums. Work through the four stages in order. Each stage unlocks only when the previous one is submitted.',
    phases: [
      {
        title: 'Stage 1 · History',
        info: 'Mr Khan, 58. Type 2 diabetic (HbA1c 64 mmol/mol), smokes 20/day, takes metformin. Last dental visit 6 years ago. Gums bleed on brushing; upper incisors feel loose.',
        prompt: 'List the key risk factors you have identified from the history.',
        rubric: [
          { label: 'Smoking identified as risk factor', marks: 2, any: [/smok/i] },
          { label: 'Poorly controlled diabetes identified', marks: 2, any: [/(diabet|hba1c)/i] },
          { label: 'Irregular attendance noted', marks: 1, any: [/(attend|6 years|irregular|not seen)/i] },
        ],
      },
      {
        title: 'Stage 2 · Examination',
        info: 'BPE: 4 4 3 / 4 4 4. Generalised plaque, bleeding on probing 70%. UR1 and UL1 grade II mobility. Radiographs: 50–60% horizontal bone loss, vertical defect UL1.',
        prompt: 'Interpret the findings. Which further investigations would you carry out?',
        rubric: [
          { label: 'Recognises advanced periodontal disease', marks: 2, any: [/(periodontitis|periodontal)/i] },
          { label: 'Requests full periodontal charting (6-point pocket chart)', marks: 2, any: [/(chart|6.?point|six.?point|pocket)/i] },
          { label: 'Mentions vitality testing of mobile teeth', marks: 1, any: [/(vitality|sensibility|ept|ethyl chloride)/i] },
        ],
      },
      {
        title: 'Stage 3 · Diagnosis',
        info: 'Full chart confirms generalised probing depths 6–8 mm with interproximal attachment loss.',
        prompt: 'State your diagnosis using the 2017 classification.',
        rubric: [
          { label: 'Generalised periodontitis', marks: 2, any: [/generali[sz]ed/i] },
          { label: 'Stage III or IV', marks: 2, any: [/stage (iii|iv|3|4)/i] },
          { label: 'Grade C (smoking + diabetes)', marks: 2, any: [/grade c/i] },
        ],
      },
      {
        title: 'Stage 4 · Treatment plan',
        info: 'Mr Khan is motivated and wants to keep his front teeth if possible.',
        prompt: 'Outline a phased treatment plan.',
        rubric: [
          { label: 'Oral hygiene instruction & risk factor control', marks: 2, any: [/(ohi|oral hygiene|brush|interdental)/i] },
          { label: 'Smoking cessation & liaise with GP re diabetes', marks: 2, any: [/(cessation|stop smoking|quit|gp|glycaemic)/i] },
          { label: 'Root surface debridement / non-surgical therapy (step 2)', marks: 2, any: [/(rsd|debridement|root surface|non.?surgical|scaling)/i] },
          { label: 'Re-evaluation and supportive periodontal care', marks: 2, any: [/(re.?evaluat|review|supportive|maintenance|recall)/i] },
        ],
      },
    ],
    passMark: 0.6,
  },
];

module.exports = { stations };
