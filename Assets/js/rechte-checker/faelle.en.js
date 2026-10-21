/* ═══════════════════════════════════════════════════════════════════════
   rc-en.js — English translation layer for the Rights Checker (/en/ only).
   Loaded exclusively when <html lang="en"> (see bootstrap in index.html),
   so the German page is never affected. window.RC_EN.apply() mutates the
   SCENARIOS array and KEYWORD_MAP in place before the first render.

   Source of truth stays the German index.html. When a German scenario
   changes, update the matching entry here and rebuild /en/.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var scenarios = {
        // ──────── WORKING HOURS ────────
        'ueberstunden': {
            title: '"You\'re working overtime today!"',
            desc: 'Your boss demands that you stay longer than your training contract states.',
            verdictShort: 'Only within narrow limits — and never for free!',
            verdictDetail: 'For trainees who are **minors** the limit is strict: at most 8 hours a day and 40 hours a week (§ 8 JArbSchG). Overtime beyond that is practically ruled out. For trainees **of legal age** the Working Hours Act applies: 8 hours a day, up to 10 hours only if it averages out to 8 hours over 6 months (§ 3 ArbZG). Whether you have to stay longer at all depends on your training contract and any collective agreement. In every case, each minute beyond the agreed training time must be **specially paid or compensated with time off** (§ 17 (7) BBiG).',
            laws: [
                { title: '§ 8 JArbSchG – Duration of working hours', text: 'Young people may not be employed for more than 8 hours per day and no more than 40 hours per week.' },
                { title: '§ 3 ArbZG – Working hours of employees', text: 'An employee\'s daily working time may not exceed 8 hours. It can be extended to up to 10 hours only if it is balanced out to an average of 8 hours within 6 months.' },
                { title: '§ 17 (7) BBiG – Additional hours', text: 'Employment beyond the agreed regular daily training time must be specially remunerated or compensated with corresponding time off.' }
            ],
            tips: [
                'Record every overtime hour in writing with date, time and reason.',
                'Politely point out the legal rule to your trainer.',
                'If overtime is demanded regularly: contact the IHK/HWK (chamber) or your union.',
                'Overtime must be either paid or compensated with time off — never "for free".'
            ],
            email: {
                subject: 'Query regarding working hours / overtime',
                body: `Dear [name of trainer],

I would like to speak with you regarding the overtime I have recently worked.

According to my training contract, my regular working time is [X hours/week]. Last week, however, I worked a total of [Y hours], which exceeds the agreed time.

Under § 17 (7) BBiG, employment beyond the agreed training time must be specially remunerated or compensated with corresponding time off. [For trainees who are minors, § 8 JArbSchG also applies, setting a maximum working time of 8 hours per day and 40 hours per week.]

I therefore kindly ask you to clarify how the overtime worked will be balanced out. I am happy to discuss this in person.

Kind regards
[Your name]`
            }
        },
        'wochenende': {
            title: '"You\'re coming in Saturday too!"',
            desc: 'You are supposed to work on the weekend even though it is not in your contract.',
            verdictShort: 'It depends — the industry is decisive!',
            verdictDetail: 'For minors: Saturdays and Sundays are generally off (§§ 16–17 JArbSchG). Exceptions apply only in certain industries (hospitality, hospitals, agriculture, etc.). For adults, the Working Hours Act applies — Sunday and public-holiday work is generally prohibited (§ 9 ArbZG), with industry-specific exceptions.',
            laws: [
                { title: '§ 16 JArbSchG – Saturday rest', text: 'Young people may not be employed on Saturdays. Employing young people on Saturdays is only permitted in certain industries (e.g. hospitals, restaurants, retail outlets, bakeries, etc.).' },
                { title: '§ 17 JArbSchG – Sunday rest', text: 'Young people may not be employed on Sundays. Exceptions apply to the same industries as for the Saturday rest.' },
                { title: '§ 9 ArbZG – Sunday and public-holiday rest', text: 'Employees may not be employed on Sundays and public holidays from 0:00 to 24:00. Exceptions are regulated by law.' }
            ],
            tips: [
                'Check your training contract: is weekend work mentioned there?',
                'Check whether your industry is one of the statutory exceptions.',
                'Minors are entitled to at least 2 free Saturdays per month.',
                'For Saturday work, another working day in the same week must be free.'
            ],
            email: {
                subject: 'Query regarding weekend work',
                body: `Dear [name of trainer],

I would like to ask about the planned work on Saturday, [date].

My training contract stipulates working hours from Monday to Friday. [If a minor: Under § 16 JArbSchG, young people may generally not be employed on Saturdays, unless the company belongs to one of the statutorily defined exception industries.]

I would like to ensure that the planned weekend work complies with the legal rules and that the corresponding time off in lieu is granted.

Could we clarify this in a brief conversation?

Kind regards
[Your name]`
            }
        },
        'pause': {
            title: '"A break? Just power through!"',
            desc: 'You don\'t get a proper break or are told to eat at your workstation.',
            verdictShort: 'No! You have a right to breaks!',
            verdictDetail: 'Breaks are legally required and non-negotiable. Minors: for 4.5–6 h of work at least 30 min., for more than 6 h at least 60 min. break. Adults: for 6–9 h at least 30 min., for more than 9 h at least 45 min. Breaks must be set in advance and may not be placed at the very start or end of the working time.',
            laws: [
                { title: '§ 11 JArbSchG – Rest breaks', text: 'Young people must be granted rest breaks of appropriate length, fixed in advance. The rest breaks must be at least: 30 minutes for a working time of more than 4.5 hours, 60 minutes for a working time of more than 6 hours.' },
                { title: '§ 4 ArbZG – Rest breaks', text: 'Work must be interrupted by rest breaks fixed in advance of at least 30 minutes for a working time of more than 6 up to 9 hours and 45 minutes for a working time of more than 9 hours in total.' }
            ],
            tips: [
                'You are allowed to leave your workplace during the break.',
                'Breaks do not count as working time — they are unpaid, but you are also not obliged to do anything.',
                'Document it if breaks are regularly cancelled.',
                'Speak to the trainer first, then, if needed, the works council.'
            ],
            email: {
                subject: 'Concern regarding break times',
                body: `Dear [name of trainer],

recently it has repeatedly happened that I was unable to take my legally required break, or only partially.

Under § 11 JArbSchG (for minors) or § 4 ArbZG (for adults), I am entitled to rest breaks of at least [30/60] minutes given my daily working time. These must be fixed in advance and actually granted.

I kindly ask that the break rules be observed in future and suggest agreeing on fixed break times.

Kind regards
[Your name]`
            }
        },
        'nachtarbeit': {
            title: '"You\'re taking the late shift!"',
            desc: 'You are supposed to work in the evening or at night — is that even allowed for a trainee?',
            verdictShort: 'No! Night work is prohibited for minors!',
            verdictDetail: 'Trainees who are minors may only be employed between 6:00 and 20:00 (§ 14 JArbSchG). Exceptions apply to a few industries (bakeries from 5:00, restaurants until 22:00, shift operations until 23:00). Trainees of legal age are subject to the ArbZG — night work is possible here, but with special protective rules.',
            laws: [
                { title: '§ 14 JArbSchG – Night rest', text: 'Young people may only be employed between 6:00 and 20:00. By way of exception, young people over 16 may be employed in the hospitality trade until 22:00, in multi-shift operations until 23:00, and in agriculture from 5:00 or until 21:00.' },
                { title: '§ 6 ArbZG – Night and shift work', text: 'The daily working time of night workers may not exceed 8 hours. Night workers are entitled to regular occupational-health check-ups.' }
            ],
            tips: [
                'Check whether you are a minor or of legal age — the rules differ greatly.',
                'Bakery trainees aged 16+ may work from 5:00, hospitality trainees aged 16+ until 22:00.',
                'For regular night shifts: you are entitled to an occupational-health check-up.',
                'Night work must be regulated in the training contract or collective agreement.'
            ],
            email: {
                subject: 'Query regarding the planned late/night shift',
                body: `Dear [name of trainer],

I have been informed that I am to take the late/night shift on [date].

[If a minor:] Under § 14 JArbSchG, young people may generally only be employed between 6:00 and 20:00. As I am under 18, I kindly ask you to check whether this scheduling is compatible with the legal requirements.

[If of legal age:] I would like to ensure that the night work takes place within the framework of § 6 ArbZG and that the prescribed rest period is observed.

Kind regards
[Your name]`
            }
        },

        // ──────── DUTIES / TASKS ────────
        'putzen': {
            title: '"Go sweep the hall!"',
            desc: 'You are told to clean, tidy up or do tasks that have nothing to do with your training.',
            verdictShort: 'Only in moderation — not as a permanent task!',
            verdictDetail: 'Trainees may only be assigned tasks that serve the purpose of the training (§ 14 BBiG). Occasionally tidying up your own workstation is fine. Regularly cleaning the entire company, which has nothing to do with the training, is an impermissible non-training activity. The trainer is obliged to carry out the training according to the training framework plan.',
            laws: [
                { title: '§ 14 (1) no. 1 BBiG – Duties of the training company', text: 'Training companies must ensure that trainees are taught the vocational competence required to achieve the training goal. The training must follow a training plan structured by subject matter and time.' },
                { title: '§ 14 (2) BBiG – Non-training tasks', text: 'Trainees may only be assigned tasks that serve the purpose of the training and are appropriate to their physical strength.' }
            ],
            tips: [
                'Keeping your own workstation clean: completely normal and allowed.',
                'Regularly sweeping the hall, cleaning toilets, making coffee: non-training and not okay.',
                'Compare the tasks with your training framework plan — is cleaning in there?',
                'Document repeated non-training activities with date and duration.'
            ],
            email: {
                subject: 'Training content in line with the training framework plan',
                body: `Dear [name of trainer],

recently I have repeatedly been assigned tasks that, in my assessment, are not provided for in the training framework plan of my occupation (e.g. [describe specific task]).

Under § 14 BBiG, training companies must ensure that trainees are taught vocational competence. Tasks that do not serve the training purpose should only be assigned in exceptional cases.

I would like to make the best possible use of my training time and kindly ask that task allocation be aligned more closely with the training framework plan. I am happy to discuss this.

Kind regards
[Your name]`
            }
        },
        'privatbesorgungen': {
            title: '"Go grab me a coffee!"',
            desc: 'You are told to run private errands for the boss — shopping, fetching coffee, washing the car.',
            verdictShort: 'No! Private errands are off-limits!',
            verdictDetail: 'Private errands for the trainer have absolutely nothing to do with the training and are clearly non-training activities. You are not a personal assistant. The training company is obliged to teach you the knowledge and skills needed to achieve the training goal — and washing the boss\'s car is definitely not one of them.',
            laws: [
                { title: '§ 14 BBiG – Duties of the training company', text: 'Trainees may only be assigned tasks that serve the purpose of the training and are appropriate to their physical strength.' }
            ],
            tips: [
                'Private errands for the boss are always impermissible — no matter how nicely he asks.',
                'Even "just quickly" making coffee is not part of your training (unless you are training as a cook/in hospitality).',
                'Politely decline and refer to the purpose of the training.',
                'If the pressure becomes too great: report it to the IHK/HWK as a training deficiency.'
            ],
            email: {
                subject: 'Request to clarify task allocation',
                body: `Dear [name of trainer],

I am writing to you because I have recently been repeatedly assigned tasks that are not connected to my training (e.g. [private errands, fetching coffee, etc.]).

Under § 14 BBiG, trainees may only be assigned tasks that serve the purpose of the training. Private errands do not fall within this scope.

I would like to make meaningful use of my training time and kindly ask that in future I be assigned only training-relevant tasks.

Kind regards
[Your name]`
            }
        },
        'eintoenig': {
            title: '"Just keep doing the same thing!"',
            desc: 'For weeks or months you have been doing the same work with no variety.',
            verdictShort: 'No! Training must be varied!',
            verdictDetail: 'The trainer is obliged to carry out the training according to a plan structured by subject and time (based on the training framework plan). If you do the same activity for months, the training plan is not being observed. You have the right to get to know all the areas provided for in the framework plan.',
            laws: [
                { title: '§ 14 (1) no. 1 BBiG – Training goal', text: 'Training companies must ensure that trainees are taught the vocational competence required to achieve the training goal.' },
                { title: '§ 5 BBiG – Training regulations', text: 'The training regulations must set out the structure by subject and time of the vocational training (training framework plan).' }
            ],
            tips: [
                'Compare your current tasks with the training framework plan for your occupation.',
                'Keep your report booklet conscientiously — monotonous entries are noticed by the IHK.',
                'Ask for a meeting with the trainer and show the framework plan.',
                'If nothing changes: contact the responsible IHK/HWK. They can inspect the company.'
            ],
            email: {
                subject: 'Suggestion on structuring the training',
                body: `Dear [name of trainer],

I have noticed that since [period] I have mainly been assigned to [describe activity]. Comparing this with the training framework plan for my occupation, I find that some training content has not yet been covered.

Under § 14 BBiG, the training must be carried out so that the training goal can be achieved within the intended time. I would like to make sure I can get to know all the areas provided for.

Could we go through the training plan together and discuss the next stages?

Kind regards
[Your name]`
            }
        },

        // ──────── VACATION ────────
        'urlaub-gestrichen': {
            title: '"Your holiday is cancelled!"',
            desc: 'The boss withdraws your already-approved holiday.',
            verdictShort: 'No! Approved holiday is binding!',
            verdictDetail: 'Once approved, holiday can only be revoked in absolute exceptional cases (e.g. a threat to the company\'s existence). Your minimum entitlement as a trainee who is a minor: 25–30 working days/year depending on age (§ 19 JArbSchG). Adults: at least 24 working days (§ 3 BUrlG). Collective or employment agreements may provide for more.',
            laws: [
                { title: '§ 19 JArbSchG – Holiday', text: 'The employer must grant young people paid recreational holiday for each calendar year: at least 30 working days (under 16), 27 working days (under 17), 25 working days (under 18).' },
                { title: '§ 3 BUrlG – Duration of holiday', text: 'Holiday amounts to at least 24 working days per year (for a 6-day week) or 20 working days (for a 5-day week).' },
                { title: '§ 7 (1) BUrlG – Timing of the holiday', text: 'When scheduling holiday, the employee\'s holiday wishes must be taken into account, unless urgent operational reasons conflict with them.' }
            ],
            tips: [
                'Always get the holiday approval in writing.',
                'Once approved, holiday is virtually a contract — the boss cannot cancel it unilaterally.',
                'If cancellation causes you costs (travel etc.), the employer must reimburse them.',
                'Vocational-school holidays should be usable for leave — raise it in good time.'
            ],
            email: {
                subject: 'Withdrawal of approved holiday',
                body: `Dear [name of trainer],

I have been informed that my already-approved holiday from [date] to [date] is to be withdrawn.

I would like to point out that once approved, holiday can only be revoked in absolute exceptional cases. Under § 7 BUrlG, the employee\'s holiday wishes must be taken into account when scheduling.

I have already [booked travel / made corresponding arrangements]. Should a postponement be unavoidable, I ask for written evidence of the urgent operational reasons as well as reimbursement of any cancellation costs.

Kind regards
[Your name]`
            }
        },
        'urlaub-bestimmen': {
            title: '"You take holiday when I say!"',
            desc: 'The boss determines the entire holiday timing alone and ignores your wishes.',
            verdictShort: 'Partly — your wishes count!',
            verdictDetail: 'The employer must take your holiday wishes into account (§ 7 BUrlG) but may refuse for urgent operational reasons. Company holidays (e.g. Christmas) are permissible but may not use up all of your holiday. At least part must be freely plannable.',
            laws: [
                { title: '§ 7 BUrlG – Timing, transfer', text: 'When scheduling holiday, the employee\'s holiday wishes must be taken into account, unless urgent operational reasons or the holiday wishes of other employees, who deserve priority on social grounds, conflict with them.' }
            ],
            tips: [
                'Always submit your holiday wishes in writing (email = proof).',
                'Company holiday is okay but may not use up your entire entitlement.',
                'Make a compromise proposal if there are conflicts.',
                'If your wishes are refused without reason: involve the works council or IHK.'
            ],
            email: {
                subject: 'Holiday planning and consideration of holiday wishes',
                body: `Dear [name of trainer],

regarding the holiday planning for [period/year], I would like to submit my wishes.

Under § 7 BUrlG, employees\' holiday wishes must be taken into account when scheduling holiday. I would like to take my holiday in the period [preferred period].

I am happy to coordinate with my colleagues to find a solution that works well for everyone.

Kind regards
[Your name]`
            }
        },
        'pruefungsfreistellung': {
            title: '"You use your holiday for the exam!"',
            desc: 'The boss says you have to use holiday for the exam and exam preparation.',
            verdictShort: 'No! Release from work is mandatory!',
            verdictDetail: 'You do **not** have to take vacation for exams: your company must release you with pay to take part in exams (§ 15 (1) BBiG, § 19 BBiG). This applies to the intermediate and the final exam. In addition, you are off **on the working day immediately before the written final exam** — for all trainees, whatever their age. That extra day exists only before the written final exam, not before every exam.',
            laws: [
                { title: '§ 15 (1) BBiG – Release from work', text: 'Trainers must release trainees to take part in exams and in training measures outside the training site, and on the working day immediately preceding the written final exam.' },
                { title: '§ 19 (1) no. 1 BBiG – Pay', text: 'Pay continues for the time of release under § 15.' }
            ],
            tips: [
                'You never have to sacrifice holiday for exams or vocational school!',
                'The day before the written final exam = a paid day off.',
                'Interim exams also fall under the release obligation.',
                'Record the exam dates in writing and communicate them in good time.'
            ],
            email: {
                subject: 'Release for the exam under § 15 BBiG',
                body: `Dear [name of trainer],

my [interim/final] exam takes place on [date]. I would like to point out that, under § 15 BBiG, I must be released from company duties to take part in exams.

In addition, under § 15 (2) BBiG, I am entitled to a day off on the day before the written final exam.

This is paid release that may not be credited against my holiday entitlement.

I kindly ask for confirmation of the release for [date/dates].

Kind regards
[Your name]`
            }
        },

        // ──────── VOCATIONAL SCHOOL ────────
        'nach-schule-betrieb': {
            title: '"After school you come in to work!"',
            desc: 'You are supposed to work at the company after a full day of vocational school.',
            verdictShort: 'On one long school day per week: no — whatever your age!',
            verdictDetail: 'Since the 2020 BBiG reform this applies to **all** trainees: after a vocational school day with **more than five lessons** (of at least 45 minutes each) you may not be put to work in the company — **once a week** (§ 15 (1) BBiG). That day counts with your average daily training time. If you have a second long school day in the same week, the company may employ you afterwards; lesson time including breaks and necessary travel between school and company is then credited. Nobody may employ you before lessons that start before 9 a.m.',
            laws: [
                { title: '§ 15 (1) BBiG – Release', text: 'Trainees may not be employed before vocational school lessons beginning before 9 a.m., nor on one school day per week with more than five lessons of at least 45 minutes each.' },
                { title: '§ 15 (2) BBiG – Crediting', text: 'Vocational school time including breaks and necessary travel time is credited; the long school day counts with the average daily training time.' },
                { title: '§ 9 JArbSchG – Vocational school', text: 'For minors, the Youth Employment Protection Act additionally applies with the same basic rules.' }
            ],
            tips: [
                'One long school day (more than 5 lessons) per week = off afterwards, also for adults.',
                'Record school times and travel in your training record — that documents the credit.',
                'With block teaching (at least 25 hours on 5 days) you are released for the whole week.',
                'Nobody may call you into work before lessons that start before 9 a.m.'
            ],
            email: {
                subject: 'Release after vocational-school lessons',
                body: `Dear [name of trainer],

on [date/weekday] I have vocational school from [time] to [time], which corresponds to [X] lessons.

[If a minor:] Under § 9 (1) JArbSchG, on school days with more than 5 lessons I am exempt from company training.

Under § 15 BBiG, vocational-school time including breaks and the journey to school is credited towards working time. I ask for your understanding that I cannot come in to the company on this day.

Kind regards
[Your name]`
            }
        },
        'schule-nicht-angerechnet': {
            title: '"Vocational school is your free time!"',
            desc: 'Your boss says vocational-school time does not count as working time.',
            verdictShort: 'Wrong! Vocational school = working time!',
            verdictDetail: 'Since the 2020 BBiG reform this applies to **all** trainees, minors and adults alike: vocational school is training time. Lesson time is credited **including breaks and the necessary travel time** between school and company (§ 15 (2) BBiG). A school day with more than five lessons counts once a week with your average daily training time, a block week of at least 25 hours with the average weekly one. The way from home to school is not included.',
            laws: [
                { title: '§ 15 BBiG – Crediting', text: 'Training companies must release trainees to attend vocational-school lessons. The vocational-school time is credited towards the company training time.' }
            ],
            tips: [
                'This rule has applied to ALL trainees since 2020 – minors and adults.',
                'Breaks and the way between school and company are credited too.',
                'If your company handles it differently, inform the IHK/HWK.',
                'Enter your school times correctly in your training record.'
            ],
            email: {
                subject: 'Crediting of vocational-school time towards working time',
                body: `Dear [name of trainer],

I have noticed that vocational-school time is not, or not fully, taken into account in my working-time records.

Under § 15 BBiG (in the version applicable since 2020), vocational-school time including breaks must be credited towards the company training time. This applies to all trainees regardless of age.

I kindly ask that the vocational-school times on my school days be recorded correctly as training time.

Kind regards
[Your name]`
            }
        },

        // ──────── PAY ────────
        'verguetung-niedrig': {
            title: '"More money? Be glad you\'re learning!"',
            desc: 'Your training allowance is suspiciously low — is there a limit?',
            verdictShort: 'There is a minimum training allowance!',
            verdictDetail: 'Since 2020 there has been a **statutory minimum training allowance** (§ 17 (2) BBiG). It depends on the year your training **started**: for a 2026 start it is at least **€724** in the 1st year, €854 in the 2nd, €977 in the 3rd and €1,014 in the 4th year. For a 2025 start: €682 / 805 / 921 / 955. For a 2027 start: €764 / 902 / 1,031 / 1,070. Exception: if your company is bound by a collective agreement, its pay applies — even if it is lower (§ 17 (3) BBiG). Without such a binding, pay may be at most 20% below the sector agreement. It is due no later than the last working day of the month (§ 18 (2) BBiG).',
            laws: [
                { title: '§ 17 BBiG – Right to remuneration', text: 'Training companies must grant trainees appropriate remuneration. It must increase with the progress of the training, at least annually. A minimum training allowance is set by law.' },
                { title: '§ 18 BBiG – Calculation and due date', text: 'The allowance is calculated for the current calendar month and must be paid at the latest on the last working day of the month.' }
            ],
            tips: [
                'What counts is the year your training started, not the current calendar year.',
                'Check whether a collective agreement applies to your company — it takes precedence.',
                'Without a collective agreement: at most 20% below the sector rate.',
                'Payment must reach your account by the last working day of the month.'
            ],
            email: {
                subject: 'Query regarding the training allowance',
                body: `Dear [name of trainer],

I have informed myself about the current rules on training allowances and would like to clarify a question.

Under § 17 BBiG, trainees are entitled to an appropriate allowance that is at least equal to the statutory minimum training allowance. For the current year and my [X] training year, this is [look up the amount].

My current allowance is [your amount]. I would like to understand how it is composed [and whether a collective agreement applies].

Could we have a brief conversation about this?

Kind regards
[Your name]`
            }
        },
        'arbeitsmaterial': {
            title: '"Buy your own tools!"',
            desc: 'You are supposed to pay for work materials, books or tools out of your own pocket.',
            verdictShort: 'No! Training materials are the company\'s responsibility!',
            verdictDetail: 'The training company is obliged to provide you free of charge with the training materials needed for the training and for sitting the exams (§ 14 (1) no. 3 BBiG). This includes tools, materials, specialist books and any protective clothing the company requires.',
            laws: [
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Training companies must provide trainees free of charge with the training materials, in particular tools, materials and specialist literature, that are required for the vocational training and for sitting interim and final exams.' }
            ],
            tips: [
                'Tools, specialist books, software, work clothing: all the trainer\'s duty.',
                'Textbooks for vocational school are often the trainee\'s responsibility (depends on the federal state).',
                'Keep all receipts if you have paid for something up front — demand reimbursement!',
                'Prescribed safety clothing must always be provided by the company.'
            ],
            email: {
                subject: 'Provision of training materials',
                body: `Dear [name of trainer],

for my training I need [describe specific material/tool/book]. So far it has been suggested that I bear these costs myself.

Under § 14 (1) no. 3 BBiG, training companies are obliged to provide trainees free of charge with the training materials required for the vocational training and for sitting the exams.

I kindly ask that the required materials be provided by the company [or that the costs I have already paid, amounting to [amount], be reimbursed].

Kind regards
[Your name]`
            }
        },
        'krank-kein-geld': {
            title: '"Sick = no pay!"',
            desc: 'You are ill and the boss says you then get no pay.',
            verdictShort: 'Wrong! Continued pay is the law!',
            verdictDetail: 'When ill you are entitled to continued payment of your allowance for up to 6 weeks (§ 19 BBiG in conjunction with the Continued Remuneration Act). Condition: you have been with the company for more than 4 weeks and report sick correctly (inform the employer + provide a doctor\'s certificate).',
            laws: [
                { title: '§ 19 (1) no. 2 BBiG – Continued payment of the allowance', text: 'Trainees must also be paid the allowance for the period of release under § 15 and in the event of incapacity for work for up to 6 weeks.' },
                { title: '§ 3 EntgFG – Continued remuneration in case of illness', text: 'If an employee is prevented from working due to incapacity resulting from illness through no fault of their own, they are entitled to continued remuneration from the employer for 6 weeks.' }
            ],
            tips: [
                'Report sick on the first day of illness BEFORE the start of work.',
                'From the 3rd day of illness (or as agreed in the contract) you need a doctor\'s certificate.',
                'The 6-week rule applies per illness, not per year.',
                'If the company does not pay: request it in writing and set a deadline.'
            ],
            email: {
                subject: 'Continued remuneration in case of illness',
                body: `Dear [name of trainer / HR department],

I was unable to work due to illness from [date] to [date] and submitted a corresponding certificate of incapacity for work. However, my allowance statement for [month] is missing the continued payment for this period.

Under § 19 BBiG in conjunction with § 3 EntgFG, in the event of incapacity for work due to illness I am entitled to continued payment of the allowance for up to 6 weeks.

I kindly ask you to check this and pay the outstanding amount.

Kind regards
[Your name]`
            }
        },

        // ──────── TERMINATION ────────
        'kuendigung-drohung': {
            title: '"One more time and you\'re out!"',
            desc: 'The boss threatens you with dismissal — what rules apply?',
            verdictShort: 'Only possible under strict conditions!',
            verdictDetail: 'After the probationary period, your training relationship can only be terminated without notice for good cause (§ 22 BBiG). "Good cause" means a serious breach of duty (e.g. theft, repeated unexcused absence). A warning is usually required beforehand. Ordinary termination by the company is not possible after the probationary period!',
            laws: [
                { title: '§ 22 (1) BBiG – Termination during the probationary period', text: 'During the probationary period, the training relationship can be terminated at any time without notice and without giving reasons.' },
                { title: '§ 22 (2) BBiG – Termination after the probationary period', text: 'After the probationary period, the training relationship can only be terminated for good cause without notice. The reason for termination must be stated in writing.' },
                { title: '§ 22 (3) BBiG – Termination by the trainee', text: 'Trainees may terminate with 4 weeks\' notice if they wish to give up the training or be trained for a different occupation.' }
            ],
            tips: [
                'During the probationary period (1–4 months), termination without reason is possible — by both sides.',
                'After the probationary period: a "good cause" AND a prior warning are needed (for breaches of duty).',
                'Termination must always be in writing + state the reason.',
                'You can file a claim with the labour court within 3 weeks.'
            ],
            email: {
                subject: 'Request for a clarifying conversation',
                body: `Dear [name of trainer],

it has been suggested to me that my training relationship might be ended. I take this very seriously and would like to clarify the situation.

I am committed to completing my training successfully and would like to understand what exactly is expected of me and how I can improve.

Could we have a conversation soon to discuss the situation openly?

Kind regards
[Your name]`
            }
        },
        'abmahnung': {
            title: '"You\'re getting a warning!"',
            desc: 'You have received a written warning or one has been threatened.',
            verdictShort: 'Possible, but only for genuine misconduct!',
            verdictDetail: 'A warning must name specific misconduct, identify the duty breached and threaten the consequence if repeated. Blanket warnings ("you\'re too slow") are ineffective. You have the right to add a rebuttal statement to your personnel file. A warning is often a precondition for a later termination.',
            laws: [
                { title: 'Requirements for a valid warning (employment law)', text: 'A valid warning must: (1) describe the misconduct specifically (date, type, circumstances), (2) name the duty breached, (3) call for future contract-compliant performance, (4) threaten consequences in the event of a further breach of duty.' }
            ],
            tips: [
                'Check whether the warning contains the three elements: misconduct, duty, consequence.',
                'You may write a rebuttal statement and have it added to your personnel file.',
                'When receiving it, only sign for RECEIPT, not for agreement!',
                'Get advice: union, IHK training advisor or a specialist lawyer.'
            ],
            email: {
                subject: 'Rebuttal statement regarding the warning of [date]',
                body: `Dear [name of trainer / HR department],

I have received the warning dated [date] and hereby submit a rebuttal statement, which I ask to be added to my personnel file.

[Describe the facts from your point of view here — factual and specific]

I reject the accusations raised in the warning [in full / in part]. [Insert reasons]

I ask that this rebuttal statement be added to my personnel file in accordance with my employment-law entitlement.

Kind regards
[Your name]`
            }
        },
        'aufhebungsvertrag': {
            title: '"Just sign here…"',
            desc: 'You are presented with a termination agreement to end the training relationship.',
            verdictShort: 'STOP — never sign on the spot!',
            verdictDetail: 'A termination agreement ends your training relationship by mutual consent. BUT: you are not obliged to sign! Warning: a termination agreement can lead to a blocking period at the employment agency (up to 12 weeks with no unemployment benefit). You lose your protection against dismissal. Always get advice first!',
            laws: [
                { title: '§ 22 BBiG – Termination', text: 'After the probationary period, the training relationship can only be terminated for good cause. Alternatively, it can be ended by mutual consent through a termination agreement — but this requires the trainee\'s consent.' },
                { title: '§ 159 SGB III – Blocking period', text: 'If the employee has caused their own unemployment through their own conduct (e.g. a termination agreement), a blocking period of up to 12 weeks for unemployment benefit may be imposed.' }
            ],
            tips: [
                'NEVER sign on the spot — take time to consider (at least 3 days).',
                'Have the agreement checked by an expert (union, IHK, lawyer).',
                'A termination agreement can trigger a blocking period for unemployment benefit!',
                'Ask yourself: do I want this? You do not have to sign if you want to stay.',
                'If you are a minor: your legal guardians must consent.'
            ],
            email: {
                subject: 'Time to consider the termination agreement',
                body: `Dear [name of trainer],

thank you for the conversation on [date]. I have taken note of the proposed termination agreement.

Before I can make such a decision, I need sufficient time to consider it and would like to have the agreement reviewed by an independent body.

I ask for your understanding that I will not sign the agreement immediately. I will get back to you with my response by [date + 1–2 weeks] at the latest.

Kind regards
[Your name]`
            }
        },

        // ──────── BULLYING ────────
        'mobbing': {
            title: '"Don\'t be so sensitive!"',
            desc: 'You are being bullied, insulted or systematically excluded at the workplace.',
            verdictShort: 'No! Bullying is never okay!',
            verdictDetail: 'The employer has a duty of care and must protect you from bullying (§ 241 BGB). Bullying can have consequences under employment, civil and even criminal law. It is not your fault and you do not have to endure it. Systematic insults, exclusion and harassment are not a "normal tone".',
            laws: [
                { title: '§ 241 (2) BGB – Duty of care', text: 'The obligation (employment relationship) may require each party to have regard for the rights and interests of the other. The employer is obliged to protect the personality rights of the employee.' },
                { title: '§ 3 ArbSchG – Basic duties of the employer', text: 'The employer is obliged to take the necessary occupational-safety measures, taking into account circumstances that affect the safety and health of employees.' },
                { title: '§ 12 AGG – Measures against harassment', text: 'The employer is obliged to take the necessary measures to protect against discrimination. In the event of violations, they must take suitable measures (warning, transfer, dismissal of the perpetrator).' }
            ],
            tips: [
                'Keep a bullying diary: date, time, what happened, who was present.',
                'Find allies: a person of trust, the works council, the youth and trainee representation (JAV).',
                'Contact the IHK/HWK — they have training advisors for exactly such cases.',
                'You can also turn directly to a bullying advice centre.',
                'Your health comes first — in an emergency: see a doctor and describe the situation.'
            ],
            email: {
                subject: 'Report of incidents at the workplace',
                body: `Dear [person of trust / HR department / works council],

I am contacting you because situations that weigh heavily on me keep arising at my workplace.

Specifically, these are the following incidents:
- [date]: [description]
- [date]: [description]
- [date]: [description]

These incidents significantly impair my training and my well-being. Under § 241 BGB, the employer has a duty of care to protect employees\' personality rights.

I kindly ask for a confidential conversation and that suitable measures be taken.

Kind regards
[Your name]`
            }
        },
        'diskriminierung': {
            title: '"Women can\'t do that!"',
            desc: 'You are being discriminated against because of gender, origin, religion or other characteristics.',
            verdictShort: 'Absolutely prohibited — the AGG protects you!',
            verdictDetail: 'The General Equal Treatment Act (AGG) protects you from discrimination on grounds of race/origin, gender, religion, disability, age or sexual identity. This applies to your entire working life. The employer must actively counteract it. In the event of violations you have a right to complain and possibly claims for damages.',
            laws: [
                { title: '§ 1 AGG – Aim of the Act', text: 'The aim of the Act is to prevent or eliminate discrimination on grounds of race or ethnic origin, gender, religion or belief, disability, age or sexual identity.' },
                { title: '§ 13 AGG – Right to complain', text: 'Employees have the right to complain to the competent bodies of the company if they feel discriminated against in connection with their employment relationship.' },
                { title: '§ 15 AGG – Compensation and damages', text: 'In the event of a violation of the prohibition of discrimination, the employer is obliged to compensate the damage caused. For non-pecuniary damage, appropriate compensation in money may be claimed.' }
            ],
            tips: [
                'Document discriminatory statements immediately (witnesses, date, exact wording).',
                'Use your right to complain under § 13 AGG — every company must have a complaints body.',
                'Claims for damages must be asserted within 2 months!',
                'The Federal Anti-Discrimination Agency advises free of charge: antidiskriminierungsstelle.de'
            ],
            email: {
                subject: 'Complaint under § 13 AGG',
                body: `Dear [complaints body / works council / HR department],

I hereby exercise my right to complain under § 13 AGG.

On [date] the following incident occurred:
[describe the facts]

I regard this as discrimination on grounds of [characteristic: gender / origin / religion / etc.] within the meaning of § 1 AGG.

I ask you to examine the matter and take suitable measures under § 12 AGG. I expect a response within [2 weeks].

Kind regards
[Your name]`
            }
        },
        'zeugnis': {
            title: '"A reference? You don\'t need that!"',
            desc: 'Your boss refuses to issue you a training reference.',
            verdictShort: 'Yes you do! You are entitled to one!',
            verdictDetail: 'On termination of the training relationship, the training company must issue you a reference (§ 16 BBiG). This is mandatory and not optional! The reference must include details of the type, duration and goal of the training as well as the skills acquired. At your request, also conduct and performance (a qualified reference).',
            laws: [
                { title: '§ 16 BBiG – Reference', text: 'Training companies must issue trainees a written reference on termination of the training relationship. It must include details of the type, duration and goal of the vocational training as well as the vocational skills, knowledge and abilities acquired. At request, details of conduct and performance must also be included.' }
            ],
            tips: [
                'You are entitled to a simple reference (mandatory) or a qualified reference (on request).',
                'The reference must be worded benevolently and must not harm you.',
                'Request it in writing and with a deadline if it does not arrive.',
                'Do you know the "reference code language"? Have your reference checked by professionals.'
            ],
            email: {
                subject: 'Request for the issue of a training reference',
                body: `Dear [name of trainer],

my training relationship ends on [date] / ended on [date]. I ask you to issue me, under § 16 BBiG, a qualified training reference which, in addition to the type, duration and goal of the training, also includes details of my conduct and performance.

I kindly ask you to send it by [date + 2–3 weeks] at the latest.

Thank you in advance.

Kind regards
[Your name]`
            }
        },

        // ──────── WORKING HOURS — further scenarios ────────
        'ruhezeit-zwischen-schichten': {
            title: '"Back at 6 tomorrow morning — you were here until 10pm yesterday."',
            desc: 'There are fewer than 11 hours between the end of work and the next start of work.',
            verdictShort: 'No, uninterrupted rest is mandatory!',
            verdictDetail: 'Between two working days there must be an uninterrupted rest period of at least 12 hours (young people, § 13 JArbSchG) or 11 hours (adults, § 5 ArbZG). This also applies if overtime was worked the previous day. Violations are an administrative offence (§ 22 ArbZG) — the company faces a fine.',
            laws: [
                { title: '§ 13 JArbSchG – Shift time', text: 'After the end of the daily working time, young people must be granted an uninterrupted rest period of at least 12 hours.' },
                { title: '§ 5 ArbZG – Rest period', text: 'After the end of the daily working time, employees must have an uninterrupted rest period of at least eleven hours.' }
            ],
            tips: [
                'Do the maths: end yesterday + 11 (or 12) hours = earliest start today.',
                'For repeated violations: inform the supervisory authority (trade inspectorate) — they monitor this.',
                'Note the start and end of each shift — your own records are sufficient in court.',
                'In a few industries (hospitals, restaurants, agriculture) reductions to 10 h are possible — only with compensation.'
            ],
            email: {
                subject: 'Compliance with the minimum rest period between shifts',
                body: `Dear [name of trainer],

on [date] my working time ended at [time], and the next day I am to start at [time]. This leaves less than the legally required minimum rest period of [11/12] hours between shifts (§ 5 ArbZG or § 13 JArbSchG).

I kindly ask you to adjust the roster so that the legal rest period is observed.

Kind regards
[Your name]`
            }
        },
        'arbeitszeitkonto-manipulation': {
            title: '"We\'re taking those two hours off you again."',
            desc: 'Hours worked are removed from the working-time account after the fact, or the time-clock data is "corrected".',
            verdictShort: 'No, that is clearly unlawful!',
            verdictDetail: 'The employer must record all actual working time — this was made clear by the ECJ in 2019 (C-55/18) and confirmed by the German Federal Labour Court in 2022 (1 ABR 22/21). Deleting, doctoring or manipulating the records after the fact is unlawful and may constitute withholding of wages (§ 266a StGB in the case of social-security contributions).',
            laws: [
                { title: '§ 16 ArbZG – Notice, working-time records', text: 'The employer is obliged to record working time exceeding the daily working time of eight hours. The records must be kept for at least two years.' },
                { title: 'Federal Labour Court 13.09.2022 – 1 ABR 22/21', text: 'Employers are legally obliged to record their employees\' working time in full.' },
                { title: '§ 17 BBiG – Right to remuneration', text: 'Employment beyond the agreed training time must be specially remunerated or compensated with time off.' }
            ],
            tips: [
                'ALWAYS keep your own time account (photo of the time slip, your own app, a notebook).',
                'On the next pay statement, request a written overview of all hours worked.',
                'Secure evidence: geo-tags, email timestamps, colleagues as witnesses.',
                'Withholding social-security contributions is a criminal offence (§ 266a StGB) — a report is possible.'
            ],
            email: {
                subject: 'Correction of the working-time account',
                body: `Dear [name of trainer],

reviewing my working-time account / pay statement, I noticed that on [date] [X hours] were not recorded or were deducted after the fact. According to my own records, I worked from [time] to [time] on that day.

Under § 16 ArbZG the employer must record all working time, and under § 17 (7) BBiG additional hours must be remunerated or compensated.

I kindly ask you to correct this and provide a written overview of my working-time account.

Kind regards
[Your name]`
            }
        },
        'bereitschaftsdienst': {
            title: '"You just have to be reachable — that doesn\'t count."',
            desc: 'On-call duty, standby duty or constant availability is not counted as working time.',
            verdictShort: 'It depends: standby duty = working time, on-call only partly.',
            verdictDetail: 'Standby duty (present at the workplace, ready to work immediately): counts fully as working time (ECJ C-303/98, Federal Labour Court). On-call duty (at home, with a response time): generally does NOT count as working time — but only if you can largely organise your free time freely. If you must be there within 5 minutes, on-call can also become working time (ECJ C-518/15 Matzak). For minors, standby counts fully towards the 8-hour daily limit, and the ban on night work applies to it as well.',
            laws: [
                { title: '§ 2 (1) ArbZG – Definitions', text: 'Working time within the meaning of this Act is the time from the start to the end of work, excluding rest breaks.' },
                { title: 'ECJ C-518/15 (Matzak)', text: 'Standby time during which a worker must be physically present at a place determined by the employer and can pursue their own interests only to a very limited extent is to be regarded as working time.' }
            ],
            tips: [
                'Standby duty at the company → working time, must be paid (at least the minimum wage).',
                'On-call duty with a short response time (< 30 min.) → usually working time under ECJ case law.',
                'Actual call-outs during on-call duty are ALWAYS subject to remuneration.',
                'As a trainee under 18: standby duty is generally impermissible (§ 22 JArbSchG by analogy).'
            ],
            email: {
                subject: 'Treatment of standby duty as working time',
                body: `Dear [name of trainer],

since [date] I have been taking on [standby/on-call duty], which so far has not been counted as working time.

Under § 2 ArbZG and ECJ case law (C-303/98 and C-518/15), standby duty counts fully as working time. For on-call duty with a short response time, the entire period is to be regarded as working time.

I kindly ask you to clarify the remuneration and crediting towards my working-time accounts.

Kind regards
[Your name]`
            }
        },
        'fahrtzeit-aussenstelle': {
            title: '"Getting to the construction site is your problem."',
            desc: 'The company sends you to changing sites and does not count the travel time as working time.',
            verdictShort: 'Journey to the first workplace = private matter. Changing sites = working time!',
            verdictDetail: 'The journey from home to the first regular workplace (e.g. the company) is a private matter. But: if the employer sends you directly to changing sites (customer, construction site, branch), the travel time is working time and subject to remuneration (Federal Labour Court 17.10.2018). Even if you transport tools/material or car-pooling is ordered by the employer, the journey counts as working time.',
            laws: [
                { title: 'Federal Labour Court 17.10.2018 – 5 AZR 553/17', text: 'Journeys to external workplaces are part of the contractually owed work, unless it is the first regular workplace.' },
                { title: '§ 2 ArbZG – Definitions', text: 'Working time is the time from the start to the end of work, excluding rest breaks.' }
            ],
            tips: [
                'A direct journey to the customer/construction site from home = working time (Federal Labour Court).',
                'Picking up tools at the company → the working day starts there, not at the customer.',
                'Note departure and arrival per site.',
                'The training contract may contain a flat-rate rule — but it may not fall below the Federal Labour Court standard.'
            ],
            email: {
                subject: 'Remuneration of travel time to external sites',
                body: `Dear [name of trainer],

on [date/period] I was assigned to jobs at [customer / construction site / branch]. The travel time of [X hours in total] was not recorded as working time.

Under Federal Labour Court case law (17.10.2018 – 5 AZR 553/17), journeys to changing workplaces are to be regarded as working time and are subject to remuneration.

I kindly ask you to credit the travel time to my working-time account retroactively.

Kind regards
[Your name]`
            }
        },

        // ──────── DUTIES / TASKS — further scenarios ────────
        'weisung-rechtswidrig': {
            title: '"I don\'t care if it\'s against the rules, you\'re doing it now!"',
            desc: 'Your trainer gives you an instruction that violates laws, safety rules or public morals.',
            verdictShort: 'Unlawful instructions you may — must — refuse!',
            verdictDetail: 'The employer\'s right to give instructions ends where laws or public morals are violated (§ 106 GewO). You are not obliged to follow unlawful instructions — and you can even refuse them without being dismissed for it (§ 22 BBiG: no "good cause"). You even make yourself liable if, for example, you evade taxes or ignore safety rules.',
            laws: [
                { title: '§ 106 GewO – Right to give instructions', text: 'The employer may determine the content, place and time of the work performance at their reasonable discretion, insofar as these working conditions are not laid down by the employment contract, a works agreement, an applicable collective agreement or statutory provisions.' },
                { title: '§ 14 BBiG – Duties of the training company', text: 'Trainees may only be assigned tasks that serve the purpose of the training and are appropriate to their physical strength.' },
                { title: '§ 138 BGB – Transaction contrary to public policy', text: 'A legal transaction that is contrary to public policy is void.' }
            ],
            tips: [
                'When in doubt, ask politely: "Is this really intended? I\'m unsure."',
                'Note the instruction verbatim + date/time/witnesses — important for securing evidence.',
                'For clearly criminally relevant tasks (fraud, theft, manipulation): consistently refuse.',
                'If you get the instruction in writing, you have a perfect defence.'
            ],
            email: {
                subject: 'Clarification of an instruction',
                body: `Dear [name of trainer],

on [date] I was instructed to [specific activity]. In my assessment, this instruction conflicts with [law/regulation/safety rule].

Under § 106 GewO, the employer\'s right to give instructions may not violate statutory provisions. § 14 BBiG requires that training-appropriate tasks be assigned.

I kindly ask for clarification — happy to discuss in person — and for written confirmation should the instruction be maintained.

Kind regards
[Your name]`
            }
        },
        'akkordarbeit': {
            title: '"You\'re working piece-rate now, or no bonus."',
            desc: 'You are supposed to do piece-work or performance-based work under time pressure.',
            verdictShort: 'Prohibited for minors — for adults only with protection!',
            verdictDetail: 'Young people (under 18) may NOT be employed on piece-work or other work where higher earnings can be achieved through an increased work pace (§ 23 JArbSchG). This also applies to pace-driven assembly-line work. For adults, piece-work is permitted, but health hazards must be excluded (§ 3 ArbSchG).',
            laws: [
                { title: '§ 23 JArbSchG – Piece-work, pace-dependent work', text: 'Young people may not be employed on piece-work or other work where a higher wage can be achieved through an increased work pace. They may also not be deployed on assembly-line work with a prescribed pace.' },
                { title: '§ 3 ArbSchG – Basic duties', text: 'The employer is obliged to take the necessary occupational-safety measures.' }
            ],
            tips: [
                'Under 18: piece-work is absolutely off-limits — simply refusing is lawful.',
                'Quota targets and speed-based bonuses also count as piece-work-like.',
                'For adults: the pace must not come at the expense of your health.',
                'Under pressure → inform the trade inspectorate / IHK; they monitor this actively.'
            ],
            email: {
                subject: 'Piece-work / pace targets',
                body: `Dear [name of trainer],

since [date] I have been employed on [piece-work / quota targets / pace-bonus system].

[If a minor:] Under § 23 JArbSchG, employing young people on piece-work or pace-dependent work is expressly prohibited.

I kindly ask you to adjust my tasks.

Kind regards
[Your name]`
            }
        },

        // ──────── VACATION — further scenarios ────────
        'urlaubsdauer': {
            title: '"You only get 20 days\' holiday, you don\'t need more."',
            desc: 'You wonder how many days\' holiday you are legally entitled to — and whether 20 days is lawful.',
            verdictShort: 'Minimum entitlement by age (young people: 25–30 working days)',
            verdictDetail: 'Young people have a staggered minimum holiday (§ 19 JArbSchG): under 16 = 30 working days, under 17 = 27 working days, under 18 = 25 working days. Adults: at least 24 working days for a 6-day week / 20 working days for a 5-day week (§ 3 BUrlG). Collective or employment agreements may provide MORE — never less. The reference date for age: 1 January of the calendar year.',
            laws: [
                { title: '§ 19 JArbSchG – Holiday', text: 'Holiday amounts to at least 30 working days per year if the young person is not yet 16 at the start of the calendar year; 27 working days if not yet 17; 25 working days if not yet 18.' },
                { title: '§ 3 BUrlG – Duration of holiday', text: 'Holiday amounts to at least 24 working days per year.' }
            ],
            tips: [
                'Working days = Mon–Sat. For a 5-day week: 24 working days = 20 working days.',
                'Age at the start of the year decides — anyone still 17 in January has 25 days for the whole year.',
                'Extra holiday from a collective agreement/contract = binding, not unilaterally reducible.',
                'When switching from probation to full employment: holiday pro rata until year-end, then full entitlement.'
            ],
            email: {
                subject: 'Clarification of the holiday entitlement',
                body: `Dear [name of trainer],

calculating my holiday for [year], I arrive at the following:

- My age at the start of the year: [X]
- Under § 19 JArbSchG / § 3 BUrlG this results in a minimum entitlement of [Y] working days.
- So far I have been granted [Z] days.

I kindly ask you to check and correct my holiday account.

Kind regards
[Your name]`
            }
        },
        'krankheit-im-urlaub': {
            title: '"Tough luck, your holiday days are gone."',
            desc: 'You fall ill during your holiday — the company deducts the days from your holiday account anyway.',
            verdictShort: 'No! Sick days do not count as holiday!',
            verdictDetail: 'If an employee/trainee becomes unable to work due to illness during their holiday, the days of incapacity proven by a medical certificate are NOT credited against the annual holiday (§ 9 BUrlG). You only have to: 1) report sick immediately (even from holiday), 2) submit a certificate of incapacity for work — even if issued abroad. The holiday days are then owed to you again later.',
            laws: [
                { title: '§ 9 BUrlG – Illness during the holiday', text: 'If an employee falls ill during their holiday, the days of incapacity for work proven by a medical certificate are not credited against the annual holiday.' }
            ],
            tips: [
                'Get a certificate of incapacity for work from the doctor immediately — even abroad (translation optional but helpful).',
                'Send the sick note to the employer immediately (an email with the certificate is enough).',
                'You do NOT have to return early from your holiday.',
                'Holiday days are credited back for the sick days — apply for them again.'
            ],
            email: {
                subject: 'Illness during holiday — non-crediting',
                body: `Dear [name of trainer],

I was on holiday from [date] to [date]. During this time I was unable to work due to illness from [date] to [date]; the certificate of incapacity for work is attached.

Under § 9 BUrlG, these [X] sick days are not credited against my annual holiday. I kindly ask for a corresponding credit to my holiday account.

Kind regards
[Your name]`
            }
        },
        'urlaub-zusammenhaengend': {
            title: '"You take a week off at most!"',
            desc: 'The company only allows individual holiday days or short periods, but no longer continuous holiday.',
            verdictShort: 'A continuous holiday of at least 12 working days is mandatory!',
            verdictDetail: 'Holiday is to be granted continuously, unless urgent operational or personal reasons justify splitting it (§ 7 (2) BUrlG). For more than 12 working days of holiday, at least one part must comprise 12 consecutive working days. For young people: holiday should be given continuously and during the vocational school\'s lesson-free period (§ 19 (3) JArbSchG).',
            laws: [
                { title: '§ 7 (2) BUrlG – Splitting the holiday', text: 'Holiday is to be granted continuously, unless urgent operational reasons or reasons relating to the person of the employee make splitting the holiday necessary. If the holiday cannot be granted continuously for these reasons and the employee is entitled to more than twelve working days\' holiday, one of the holiday parts must comprise at least twelve consecutive working days.' },
                { title: '§ 19 (3) JArbSchG', text: 'Holiday should be given to young people who are still subject to compulsory vocational schooling, as far as possible during the vocational-school holidays.' }
            ],
            tips: [
                'Plan at least one block of 12 working days (≈ 2 weeks) per year.',
                'For vocational-school holidays: place recreational holiday there preferentially (young people).',
                'If refused: demand a written justification of the urgent operational reason.',
                'If the employer permanently refuses the block: involve the IHK / union.'
            ],
            email: {
                subject: 'Application for continuous holiday',
                body: `Dear [name of trainer],

I would like to take continuous holiday from [date] to [date] ([X working days]).

Under § 7 (2) BUrlG, holiday is in principle to be granted continuously. For more than 12 working days of annual holiday, at least one part must comprise 12 consecutive working days.

I kindly ask you to approve the application.

Kind regards
[Your name]`
            }
        },

        // ──────── VOCATIONAL SCHOOL — further scenarios ────────
        'berufsschule-fahrtkosten': {
            title: '"You pay for the journey to vocational school yourself."',
            desc: 'You have to travel to vocational school, inter-company courses or exams at your own expense.',
            verdictShort: 'Vocational school travel is usually your cost — inter-company courses are paid by the company.',
            verdictDetail: 'According to case law, the company generally does **not** have to pay travel and accommodation costs for **vocational school** — not even for block teaching away from home (Federal Labour Court, 26 Sep 2002 – 6 AZR 486/00). It is different if the company sends you to a school other than the responsible one, if a **collective agreement** provides for reimbursement (e.g. in the public sector), or if your federal state pays subsidies (many states support travel and accommodation for block teaching). **Inter-company courses** and training measures outside the company, on the other hand, are part of in-company training — the company bears their costs.',
            laws: [
                { title: 'BAG 26 Sep 2002 – 6 AZR 486/00', text: 'The trainer bears the costs of in-company training, but not the costs arising from attending vocational school.' },
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Trainers must provide trainees free of charge with the materials required for the training and for taking the exams.' },
                { title: '§ 19 (1) no. 1 BBiG – Pay', text: 'Pay continues for the time of release under § 15 — including vocational school and inter-company measures.' }
            ],
            tips: [
                'Ask the school authority or district about travel or accommodation subsidies for vocational students.',
                'Check your collective agreement — it often contains a reimbursement rule.',
                'Inter-company courses: collect receipts and submit them to the company.',
                'If you no longer live with your parents, check vocational training allowance (BAB) at the employment agency.'
            ],
            email: {
                subject: 'Reimbursement of costs for the inter-company course',
                body: `Dear [name of trainer],

for the inter-company course from [date] to [date] in [place] I incurred travel and accommodation costs of [amount €] (receipts attached).

Inter-company courses are part of in-company training; their costs are borne by the training company. [If applicable: our collective agreement also provides for reimbursement in § [X].]

I kindly ask you to reimburse them with the next payment.

Kind regards
[Your name]`
            }
        },
        'pruefungswiederholung': {
            title: '"Failed? Tough, you\'re out."',
            desc: 'You did not pass an exam — the company wants to end the training relationship immediately.',
            verdictShort: 'You have a right to a retake — the contract extends on request!',
            verdictDetail: 'Anyone who does not pass the final exam can retake it twice (§ 37 (1) BBiG). At your request, the training relationship extends until the next retake exam, by a maximum of 1 year (§ 21 (3) BBiG). The company may not "throw you out" — the extension is your right. The allowance continues.',
            laws: [
                { title: '§ 21 (3) BBiG – Termination', text: 'If the trainee does not pass the final exam, the training relationship extends at their request until the next possible retake exam, by a maximum of one year.' },
                { title: '§ 37 (1) BBiG – Final exam', text: 'The final exam may be retaken twice.' }
            ],
            tips: [
                'Submit the extension request IN WRITING and BEFORE the regular end of training.',
                'During the extension: the full training allowance continues.',
                'Compulsory vocational schooling also remains — you may attend retake classes.',
                'Advice from the IHK/HWK is free — registration for the retake also runs through them.'
            ],
            email: {
                subject: 'Extension of the training relationship under § 21 (3) BBiG',
                body: `Dear [name of trainer],

unfortunately I did not pass the final exam on [date]. I intend to retake the exam at the next possible date.

I hereby apply, under § 21 (3) BBiG, for an extension of my training relationship until the next retake exam, but by no more than one year.

I kindly ask for written confirmation.

Kind regards
[Your name]`
            }
        },

        // ──────── PAY — further scenarios ────────
        'mindestausbildungsverguetung': {
            title: '"€550 a month is fine for a trainee."',
            desc: 'You receive less than the statutory minimum training allowance.',
            verdictShort: 'Below the minimum? Then your pay is too low!',
            verdictDetail: 'The **minimum training allowance** (§ 17 (2) BBiG) depends on the year your training **started** and rises with each training year by fixed surcharges (+18%, +35%, +40%). 2025 start: €682 / 805 / 921 / 955. 2026 start: **€724 / 854 / 977 / 1,014**. 2027 start: €764 / 902 / 1,031 / 1,070 (published by the federal ministry in the Federal Law Gazette). A company bound by a collective agreement may pay the agreed rate even if it is lower (§ 17 (3) BBiG). A company without such a binding may be at most 20% below the sector rate (§ 17 (4) BBiG). Paid too little? You can claim the difference — watch out for cut-off periods in your contract.',
            laws: [
                { title: '§ 17 (1) BBiG – Appropriate pay', text: 'Trainers must grant trainees appropriate pay. It rises as the training progresses, at least annually.' },
                { title: '§ 17 (2) BBiG – Minimum pay', text: 'Pay below the statutory minimum amounts is not appropriate. The amounts are updated annually and published in the Federal Law Gazette.' },
                { title: '§ 17 (3) BBiG – Collective agreement', text: 'Pay under a collective agreement binding the trainer is also appropriate, even if it is below the minimum.' }
            ],
            tips: [
                'Check the start date in your contract — it sets your minimum for the whole training.',
                'Ask whether a collective agreement applies: if so, its rate counts, otherwise the minimum or the 80% rule.',
                'Received too little? Claim it in writing and watch the cut-off periods in your contract.',
                'The IHK/HWK checks pay when registering the contract — ask them.'
            ],
            email: {
                subject: 'Adjustment of the training allowance to the minimum rates',
                body: `Dear [name of trainer],

checking my allowance against the statutory minimum training allowance (§ 17 BBiG) or the industry-standard collective agreement, I find that my current pay of [X €] is below the minimum for my [1st/2nd/3rd/4th] training year in [year].

I kindly ask you to adjust it and pay the difference for the past months.

Kind regards
[Your name]`
            }
        },
        'jaehrliche-steigerung': {
            title: '"In your second year you earn the same as in your first."',
            desc: 'Your pay is not increased when you move into the next training year.',
            verdictShort: 'An increase is mandatory — at least annually!',
            verdictDetail: 'Training pay must **rise at least once a year** as the training progresses (§ 17 (1) BBiG). That is not a favour but an obligation. The amount is set by an applicable collective agreement; otherwise at least the statutory minimum of your start year applies with its fixed surcharges (+18% in the 2nd, +35% in the 3rd, +40% in the 4th year compared with the 1st, § 17 (2) BBiG). Pay that stays the same across the training years is unlawful.',
            laws: [
                { title: '§ 17 (1) BBiG – Remuneration', text: 'The allowance is to be assessed according to the trainee\'s age so that it increases with the progress of the training, at least annually.' }
            ],
            tips: [
                'When moving into the new training year, actively ask when the increase is coming.',
                'The increase applies from the day of transition (e.g. the anniversary of the training start).',
                'If not adjusted: back payment of the difference is possible (3-year limitation period).',
                'Check the collective agreement — the increases are often fixed.'
            ],
            email: {
                subject: 'Adjustment of the allowance in the new training year',
                body: `Dear [name of trainer],

on [date] I entered my [2nd/3rd/4th] training year. The training allowance has not yet been adjusted.

§ 17 (1) sentence 2 BBiG bindingly requires at least an annual increase of the training allowance.

I kindly ask you to adjust it with effect from [date].

Kind regards
[Your name]`
            }
        },
        'ueberstunden-verguetung': {
            title: '"We\'re not paying those few hours of overtime."',
            desc: 'You have worked overtime but are supposed to get neither money nor time off in lieu.',
            verdictShort: 'Overtime must be paid or compensated with time off!',
            verdictDetail: 'Employment beyond the agreed training time must be specially remunerated or compensated with corresponding time off (§ 17 (7) BBiG). A flat-rate settlement in the training contract ("all overtime settled with the allowance") is IMPERMISSIBLE — such clauses are void. There is also no such thing as "goodwill" overtime.',
            laws: [
                { title: '§ 17 (7) BBiG – Overtime remuneration', text: 'Employment beyond the agreed regular daily training time must be specially remunerated or compensated with corresponding time off.' }
            ],
            tips: [
                'Flat-rate clauses in the training contract are ineffective — you can still make a claim.',
                'Your choice: money OR time off in lieu. You cannot have both, but you choose.',
                'Precise recording of the overtime is worth gold (date, occasion, duration).',
                'Amount: hourly value = monthly allowance / agreed monthly hours, plus any premium.'
            ],
            email: {
                subject: 'Compensation for overtime worked',
                body: `Dear [name of trainer],

in the last [weeks/months] I have worked [X] hours of overtime (list attached).

Under § 17 (7) BBiG, these hours must be compensated either by remuneration or by time off. I opt for [time off in lieu / payment].

I kindly ask for written confirmation of the compensation.

Kind regards
[Your name]`
            }
        },

        // ──────── TERMINATION — further scenarios ────────
        'kuendigung-probezeit': {
            title: '"During the probationary period you can be sacked any time."',
            desc: 'You are still in the probationary period and the boss threatens dismissal at any time.',
            verdictShort: 'True — but the probationary period is limited to 1–4 months!',
            verdictDetail: 'During the probationary period, the training relationship can be terminated by both sides at any time without notice and without giving reasons (§ 22 (1) BBiG). BUT: the probationary period must be between 1 and 4 months (§ 20 BBiG) — longer is impermissible. Once the probationary period is over, the company can only terminate for good cause. Dismissals due to discrimination are prohibited even during the probationary period (§ 7 AGG). Even during probation, notice must be given **in writing** — via WhatsApp or email it is invalid (§ 22 (3) BBiG).',
            laws: [
                { title: '§ 20 BBiG – Probationary period', text: 'The training relationship begins with the probationary period. It must be at least one month and no more than four months.' },
                { title: '§ 22 (1) BBiG – Termination during the probationary period', text: 'During the probationary period, the training relationship can be terminated at any time without notice.' }
            ],
            tips: [
                'Note the end of the probationary period (4 months after the start of the contract = at the latest).',
                'Termination must be IN WRITING — verbal is ineffective (§ 22 (3) BBiG, § 623 BGB).',
                'In case of an AGG violation (discrimination): the termination is contestable, damages are possible.',
                'The JAV / works council can be consulted on terminations (§ 102 BetrVG).'
            ],
            email: {
                subject: 'Clarification of the end of the probationary period',
                body: `Dear [name of trainer],

my training relationship began on [date]. Under § 20 BBiG, the probationary period therefore ends at the latest on [date + 4 months].

Please confirm the agreed end of the probationary period and let me know whether there are any concerns about my suitability so that I can address them.

Kind regards
[Your name]`
            }
        },
        'kuendigung-aus-wichtigem-grund': {
            title: '"Late once → dismissal without notice!"',
            desc: 'After minor lapses, the company threatens dismissal without notice for good cause.',
            verdictShort: 'Good cause = serious breach of duty + usually a prior warning!',
            verdictDetail: 'After the probationary period, dismissal without notice is only possible for good cause (§ 22 (2) no. 1 BBiG). Good cause = a serious breach of duty that makes continuing the training relationship unreasonable for the employer. Typical: theft, repeated unexcused absences, physical violence. Precondition as a rule: a prior warning. Being late once is not enough. Deadline: within 2 weeks of learning of the cause at the latest (§ 22 (4) BBiG).',
            laws: [
                { title: '§ 22 (2) no. 1 BBiG – Extraordinary termination', text: 'After the probationary period, the training relationship can only be terminated for good cause without notice.' },
                { title: '§ 22 (3) BBiG – Written form + reason', text: 'The termination must be in writing and, in the cases of paragraph 2, state the reasons for termination.' },
                { title: '§ 22 (4) BBiG – 2-week deadline', text: 'A termination for good cause is ineffective if the facts on which it is based have been known to the person entitled to terminate for longer than two weeks.' }
            ],
            tips: [
                'Check the termination letter: in writing? reason stated? date?',
                '2-week deadline since learning of the cause — otherwise the termination is ineffective.',
                'In case of an economically existential conflict: file a claim with the labour court IMMEDIATELY (3-week deadline, § 4 KSchG by analogy with § 22 BBiG).',
                'The IHK conciliation committee before a lawsuit — often mandatory, helps reach agreement.'
            ],
            email: {
                subject: 'Receipt of the termination — queries',
                body: `Dear [name of trainer],

on [date] I received your termination for good cause.

So that I can check its validity, I ask you for:
1) a clear designation of the good cause (§ 22 (3) BBiG),
2) the date on which you became aware of the facts (§ 22 (4) BBiG: 2-week deadline),
3) any prior warnings.

I reserve the right to call the conciliation committee and, if necessary, to file a claim with the labour court.

Kind regards
[Your name]`
            }
        },
        'schlichtungsausschuss-ihk': {
            title: '"Sue if you like, you don\'t stand a chance."',
            desc: 'You want to challenge a dismissal, pay or another dispute — the company brushes it off.',
            verdictShort: 'The IHK/HWK have conciliation committees — free and before any lawsuit!',
            verdictDetail: 'If your chamber has an **arbitration committee** for training disputes, you must go there before suing at the labour court (§ 111 (2) ArbGG). The procedure is free of charge and usually faster than a lawsuit. The committee\'s ruling only becomes effective if **both sides accept it within one week**; it can then be enforced. If it is not accepted, you can sue at the labour court within **two weeks** of the ruling.',
            laws: [
                { title: '§ 111 (2) ArbGG – Conciliation committee', text: 'In disputes arising from an existing training relationship, the labour court may only be called upon once the committee for dealing with the dispute has been called upon beforehand.' }
            ],
            tips: [
                'Point of contact: the IHK / Chamber of Crafts in your region (see ihk.de / hwk.de).',
                'Free of charge, in most cases without the need for a lawyer.',
                'In a dismissal dispute: still observe the 3-week deadline (§ 4 KSchG).',
                'Union members often receive legal protection and advice on top.'
            ],
            email: {
                subject: 'Calling the conciliation committee',
                body: `Dear Sir or Madam of the [IHK/HWK region],

I hereby call the conciliation committee under § 111 (2) ArbGG in the following dispute arising from the training relationship:

Parties:
- Trainee: [name, address]
- Training company: [company, address]

Subject of the dispute: [brief description of the facts]

Request: [specific demand]

Kind regards
[Your name]`
            }
        },

        // ──────── BULLYING — further scenarios ────────
        'sexuelle-belaestigung': {
            title: '"Don\'t make such a fuss, it was just a joke."',
            desc: 'You are being sexually harassed — through touching, suggestive comments or assaults.',
            verdictShort: 'Sexual harassment is prohibited — and the employer must act!',
            verdictDetail: 'Sexual harassment at the workplace is a form of discrimination (§ 3 (4) AGG) and expressly prohibited. This includes: unwanted touching, sexually charged remarks, showing pornographic content, unwanted advances — even if meant as a "joke". The employer MUST take protective measures (§ 12 AGG): warning, transfer, dismissal of the perpetrator. You have the right to complain, to damages, to compensation for pain and suffering, and to refuse to work (§ 14 AGG).',
            laws: [
                { title: '§ 3 (4) AGG – Definition of sexual harassment', text: 'Sexual harassment is discrimination where unwanted conduct of a sexual nature — including unwanted sexual acts and requests for them, sexually determined physical contact, remarks of a sexual nature, and the unwanted showing and visible display of pornographic images — has the purpose or effect of violating the dignity of the person concerned.' },
                { title: '§ 12 AGG – Measures by the employer', text: 'The employer is obliged to take the necessary measures to protect against discrimination. In the event of violations, they must take the measures appropriate in the individual case (warning, reassignment, transfer or dismissal of the person responsible).' },
                { title: '§ 14 AGG – Right to refuse to work', text: 'If the employer takes no measures, or obviously unsuitable measures, to stop harassment or sexual harassment at the workplace, the affected employees are entitled to stop their work without loss of pay.' },
                { title: '§ 15 AGG – Damages and compensation', text: 'For non-pecuniary damage, the employee may claim appropriate compensation in money.' }
            ],
            tips: [
                'Create evidence: date, place, exact wording, witnesses, possibly photo/audio (caution: secret recordings of third parties are problematic).',
                'Complain to the employer, JAV, works council — the employer MUST act (§ 13 AGG).',
                'Points of contact: the Federal Anti-Discrimination Agency (antidiskriminierungsstelle.de), the women\'s helpline (08000 116 016).',
                'In case of an assault: call the police IMMEDIATELY (110). A criminal complaint is possible (§§ 184i, 177 StGB).'
            ],
            email: {
                subject: 'Complaint under § 13 AGG — sexual harassment',
                body: `Dear [management / HR management],

I hereby lodge a complaint under § 13 AGG regarding sexual harassment at the workplace by [name of the person].

Facts:
- Date: [...]
- Place: [...]
- Conduct: [...]
- Witnesses: [...]

I call on you, under § 12 AGG, to take suitable measures without delay to stop further harassment. I request a written response within [14 days].

Kind regards
[Your name]`
            }
        },

        // ──────── SAFETY ────────
        'schutzkleidung': {
            title: '"You can buy your own safety shoes."',
            desc: 'The company requires PPE (personal protective equipment) but does not want to provide it.',
            verdictShort: 'PPE must be provided by the company free of charge — ALWAYS!',
            verdictDetail: 'Personal protective equipment (safety shoes, helmet, gloves, safety goggles, hearing protection, respiratory protection, protective clothing) must be provided by the employer free of charge (§ 3 (3) ArbSchG, § 2 PSA-BV). For trainees, additionally under § 14 (1) no. 3 BBiG (training materials). Any contribution by the trainee is IMPERMISSIBLE. Employment without PPE is an administrative offence, and in the event of an accident the company is liable.',
            laws: [
                { title: '§ 3 (3) ArbSchG – Costs of occupational safety', text: 'The employer may not impose the costs of measures under this Act on the employees.' },
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Training companies must provide trainees free of charge with the training materials, in particular tools and materials.' },
                { title: '§ 2 PSA-BV – PPE Use Ordinance', text: 'The employer must provide personal protective equipment that, among other things, meets the requirements.' }
            ],
            tips: [
                'PPE = ANY protective equipment — whether expensive (safety shoes) or cheap (gloves).',
                'Cleaning and replacement due to wear are also paid by the company.',
                'If refused: complain to the safety officer, the works council, the employers\' liability insurance association.',
                'Working without PPE: you may refuse the work (§ 14 AGG by analogy).'
            ],
            email: {
                subject: 'Provision of personal protective equipment',
                body: `Dear [name of trainer],

for my work at [workplace / machine], [PPE type] is absolutely required. This has not yet been provided to me.

Under § 3 (3) ArbSchG and § 14 (1) no. 3 BBiG, PPE must be provided free of charge by the company. I kindly ask you to provide it by [date] — otherwise I cannot perform the work for safety reasons.

Kind regards
[Your name]`
            }
        },
        'gefahrenstoffe': {
            title: '"Just stir the acid, it won\'t take five minutes."',
            desc: 'As a minor you are supposed to work with hazardous substances, dangerous machines or in heat/noise.',
            verdictShort: 'Young people may not carry out dangerous work!',
            verdictDetail: 'Young people (under 18) may NOT be employed on work that exceeds their capacity, poses moral hazards or entails dangers to life/health (§ 22 JArbSchG): hazardous substances, noise > 85 dB, heat/cold/wetness to a hazardous extent, biological agents of risk group 2–4. EXCEPTION: to achieve the training goal, if competent supervision is present (§ 22 (2) JArbSchG).',
            laws: [
                { title: '§ 22 JArbSchG – Dangerous work', text: 'Young people may not be employed on work that exceeds their physical or psychological capacity, on work that entails moral hazards, or on work involving accident risks which young people, due to a lack of safety awareness or experience, cannot be expected to recognise or avert.' },
                { title: '§ 22 (2) JArbSchG – Exception for training', text: 'Paragraph 1 does not apply to the employment of young people insofar as this is necessary to achieve their training goal and their protection is ensured by the supervision of a competent person.' }
            ],
            tips: [
                'List of prohibited substances/activities: TRGS 905 (Hazardous Substances Ordinance).',
                'Competent supervision means: a person right beside you, not "in the building".',
                'Noise, vibration, radiation → specific limit values in ordinances.',
                'The employment ban exists — the trainee cannot waive it.'
            ],
            email: {
                subject: 'Work with hazardous substances / dangerous work',
                body: `Dear [name of trainer],

on [date] I was instructed to carry out [activity with substance/machine].

As a young person under 18, I am subject to the employment ban of § 22 JArbSchG. Such work is only permitted under direct competent supervision and to achieve the training goal.

I kindly ask you to clarify whether the conditions are met; otherwise, to assign me a suitable task.

Kind regards
[Your name]`
            }
        },
        'arbeitsunfall': {
            title: '"Slap a plaster on it, carry on — no big deal."',
            desc: 'You injured yourself at the workplace — the company does not want to report it as an accident.',
            verdictShort: 'Every workplace accident with > 3 days\' incapacity MUST be reported!',
            verdictDetail: 'A workplace accident (including a commuting accident) must be reported by the employer to the employers\' liability insurance association (BG) within 3 days if it leads to more than 3 days of incapacity for work (§ 193 SGB VII). For any need for treatment, go to the "Durchgangsarzt" (D-Arzt, a specially authorised doctor) — not the family doctor. A first-aid-book entry ALWAYS (even for minor injuries, kept for 5 years). Waiving or concealing makes the employer liable.',
            laws: [
                { title: '§ 193 SGB VII – Accident report', text: 'Employers must report accidents involving insured persons in their companies through which an insured person is killed or so injured that they become unable to work for more than three days, within three days.' },
                { title: '§ 14 ArbSchG – Duties of the employer', text: 'The employer must instruct employees about safety and health protection at work.' }
            ],
            tips: [
                'A first-aid book is mandatory — have EVERY incident recorded (even a cut on the finger).',
                'For injuries beyond a plaster: see the D-Arzt (list at BG.de).',
                'The BG pays for treatment + injury benefit regardless of fault.',
                'No report by the employer? You can report it to the BG yourself — free of charge.'
            ],
            email: {
                subject: 'Report of the workplace accident of [date]',
                body: `Dear [name of trainer],

on [date] I injured myself at work: [brief description]. This led to incapacity for work of [X] days; medical treatment took place at the [D-Arzt].

I kindly ask for the following measures:
1) an entry in the first-aid book (§ 24 DGUV V 1),
2) an accident report to the employers\' liability insurance association (§ 193 SGB VII),
3) confirmation with a copy of the report to me.

Kind regards
[Your name]`
            }
        },
        'sicherheitsbelehrung': {
            title: '"An induction? Just do what the others do."',
            desc: 'You are deployed on machines / in hazardous areas without having received a safety briefing.',
            verdictShort: 'Instruction is mandatory — before the activity, regularly!',
            verdictDetail: 'The employer must instruct all employees about safety and health protection before starting the activity and afterwards at least annually (§ 12 ArbSchG, § 4 DGUV V 1). For young people additionally: before first employment and at least every six months (§ 29 JArbSchG). Content: specific hazards, protective measures, emergency rules. Documentation is mandatory (signature). Without instruction, you may refuse dangerous work.',
            laws: [
                { title: '§ 12 ArbSchG – Instruction', text: 'The employer must instruct employees adequately and appropriately about safety and health protection at work during their working time. The instruction must take place before the activity begins upon hiring, upon changes in the area of responsibility, or upon the introduction of new work equipment or new technology.' },
                { title: '§ 29 JArbSchG – Instruction on accident and health hazards', text: 'The employer must instruct young people, before starting employment and upon significant changes to working conditions, about the accident and health hazards to which they are exposed and about the facilities and measures to avert those hazards. They must give special instruction before first employing them on machines or at dangerous workplaces and when handling dangerous substances. The instructions must be repeated at appropriate intervals, but at least every six months.' }
            ],
            tips: [
                'Ask for the instruction IN WRITING — date, content, signature.',
                'If there is no instruction at dangerous places: refuse the activity → no breach of duty.',
                'Every six months for young people, annually for adults.',
                'Also have occupational-health provision (G examinations) clarified.'
            ],
            email: {
                subject: 'Safety instruction under § 12 ArbSchG / § 29 JArbSchG',
                body: `Dear [name of trainer],

since [date] I have been deployed on [machine / activity] without a safety instruction having taken place.

§ 12 ArbSchG (or § 29 JArbSchG for young people) requires an instruction BEFORE starting the activity and at least a six-monthly repetition.

I kindly ask that the instruction be carried out and documented promptly.

Kind regards
[Your name]`
            }
        },
        'arbeitsmedizinische-untersuchung': {
            title: '"A youth health check-up (J1)? You don\'t need that."',
            desc: 'You are a young person and are supposed to work without a first examination having taken place.',
            verdictShort: 'The first examination is mandatory — no certificate, no employment!',
            verdictDetail: 'Young people may only be employed if they have been medically examined before starting employment (first examination, § 32 JArbSchG). After one year of employment: a follow-up examination (§ 33). The examinations are free of charge (certificate reimbursement via the federal state). The employer MUST have the certificate — otherwise there is an employment ban. Violations are an administrative offence (§ 58 JArbSchG).',
            laws: [
                { title: '§ 32 JArbSchG – First examination', text: 'A young person may only be employed in the first twelve months after the start of the training or employment if they have been examined by a doctor within the last fourteen months before the start of employment and the employer holds a certificate issued by that doctor.' },
                { title: '§ 33 JArbSchG – First follow-up examination', text: 'After the end of the first year of employment, the employer may only continue to employ the young person if the young person has undergone a follow-up examination within the last three months.' }
            ],
            tips: [
                'The examination is free of charge at the family doctor or the company doctor.',
                'Keep the certificate (the yellow-pink-green slip) safe.',
                'Follow-up examination after 1 year — keep an eye on the date yourself.',
                'Without a certificate, you are not lawfully allowed to work.'
            ],
            email: {
                subject: 'First examination under § 32 JArbSchG',
                body: `Dear [name of trainer],

to clarify my fitness for employment: I completed my [first examination / follow-up examination] on [date]; the certificate is attached / the original is in the personnel office.

Please confirm that it has been recorded in the personnel file.

Kind regards
[Your name]`
            }
        },
        'psychische-belastung': {
            title: '"Stop whining, that\'s part of the job."',
            desc: 'You suffer from ongoing psychological pressure, bullying, stress or are at your limit.',
            verdictShort: 'Psychological strain is a hazard — the employer has a duty to act!',
            verdictDetail: 'The employer must carry out a risk assessment that expressly also covers psychological strain (§ 5 (3) no. 6 ArbSchG). The duty of care (§ 618 BGB) also applies to mental health. Where there is ongoing stress, bullying, excessive demands or fear, they must take measures. If you fall ill because of it, normal sick leave with continued pay applies — you do not have to tell the company the diagnosis.',
            laws: [
                { title: '§ 5 (3) no. 6 ArbSchG – Risk assessment', text: 'A hazard may arise in particular from psychological strain at work.' },
                { title: '§ 618 BGB – Duty of care', text: 'The person entitled to the services must set up and maintain rooms, equipment or apparatus that they have to provide for the performance of the services, and regulate services performed under their direction, so that the obligated person is protected against dangers to life and health as far as the nature of the service allows.' }
            ],
            tips: [
                'A family-doctor appointment → a certificate of incapacity with a diagnosis protects you under employment law.',
                'The telephone counselling service is free 24/7: 0800 111 0 111 or 0800 111 0 222.',
                'Involve the JAV / works council / a person of trust — they can relieve the pressure.',
                'Changing training company is possible (§ 22 BBiG, possibly with a termination agreement) — get advice first.'
            ],
            email: {
                subject: 'Note on increased psychological strain at the workplace',
                body: `Dear [name of trainer],

I would like to point out a significant situation of psychological strain that has affected me at the workplace since [period]: [brief description — excessive demands / conflicts / pressure].

Under § 5 (3) no. 6 ArbSchG, the assessment of psychological strain is part of the risk assessment. I kindly ask for a confidential conversation and, if necessary, an adjustment of the working conditions.

Kind regards
[Your name]`
            }
        },

        // ──────── TRAINING QUALITY ────────
        'ausbildungsplan-existenz': {
            title: '"A training plan? We do whatever comes up."',
            desc: 'There is no written training plan; you are deployed as needed.',
            verdictShort: 'A plan structured by subject and time is mandatory!',
            verdictDetail: 'The training regulations (centrally defined for each occupation) provide for a training framework plan (§ 5 (1) no. 4 BBiG). From this, the company must derive a company training plan and document it in the training contract (§ 11 (1) no. 4 BBiG). The plan must be structured by SUBJECT (which content) and by TIME (when). Without a plan there is no proper training → this deficiency can lead to extraordinary termination by the trainee (§ 22 BBiG).',
            laws: [
                { title: '§ 5 (1) no. 4 BBiG – Training regulations', text: 'The training regulations must set out the structure by subject and time of the transfer of vocational skills, knowledge and abilities (training framework plan).' },
                { title: '§ 11 (1) no. 4 BBiG – Record of the training contract', text: 'The record must contain: the structure by subject and time of the vocational training.' },
                { title: '§ 14 (1) no. 1 BBiG – Duties', text: 'Training companies must ensure that trainees are taught the vocational competence required to achieve the training goal, and carry out the vocational training in a form dictated by its purpose, planned and structured by time and subject, so that the training goal can be achieved within the intended training time.' }
            ],
            tips: [
                'The training framework plan for your occupation is available free of charge from the IHK/HWK.',
                'If there is no plan: request it in writing + set a deadline (e.g. 4 weeks).',
                'Keep your report booklet consistently according to the training-framework-plan structures — it documents gaps.',
                'For permanently missing content: involve the IHK training advisor.'
            ],
            email: {
                subject: 'Request for the company training plan',
                body: `Dear [name of trainer],

to ensure structured training in accordance with § 5, § 11 (1) no. 4 and § 14 (1) no. 1 BBiG, I request the written provision of the company training plan or the subject/time structure of my training.

I kindly ask for it to be provided by [date + 4 weeks].

Kind regards
[Your name]`
            }
        },
        'ausbilder-nie-da': {
            title: '"The boss isn\'t here, ask someone else."',
            desc: 'The registered trainer is permanently absent and no one else takes care of things.',
            verdictShort: 'The trainer must be personally + professionally + pedagogically qualified and present!',
            verdictDetail: 'Anyone who trains must be **personally and professionally suitable** (§ 28 BBiG); professional suitability includes vocational and work-related teaching skills, usually proven by the trainer aptitude exam (AEVO, § 30 BBiG). The company must carry out the training itself or expressly appoint a trainer (§ 14 (1) no. 2 BBiG) — one who is practically never there does not meet that. The IHK/HWK monitors suitability (§ 32 BBiG) and can object to shortcomings; in serious cases the responsible state authority can prohibit training (§ 33 BBiG).',
            laws: [
                { title: '§ 28 BBiG – Personal suitability', text: 'Anyone who hires or trains trainees must be personally suitable. Personally unsuitable is in particular anyone who is not allowed to employ children and young people.' },
                { title: '§ 30 BBiG – Professional suitability', text: 'Professionally suitable is anyone who possesses the vocational skills, knowledge and abilities as well as the occupational and work-pedagogical skills.' },
                { title: '§ 32 BBiG – Prohibition', text: 'The competent body must prohibit the hiring and training of trainees if the personal or professional suitability is lacking.' }
            ],
            tips: [
                'Record the dates + hours during which no trainer was available.',
                'In place of the trainer: has the company named a "training instructor"? If not, there is a clear gap.',
                'Involve the IHK training advisor — they check the suitability.',
                'In case of a permanent deficit: a change of training company may be possible.'
            ],
            email: {
                subject: 'Availability of the trainer',
                body: `Dear [management / HR management],

my registered trainer Mr/Ms [name] has been permanently unavailable since [date/period]. No training instructor has been named to me as a substitute.

Under §§ 28, 30 BBiG, the presence of a personally + professionally qualified trainer is a precondition for proper vocational training.

I kindly ask you to clarify how the training will be ensured in future. Otherwise, I will inform the competent IHK / HWK.

Kind regards
[Your name]`
            }
        },
        'ausbildungszeit-verkuerzung': {
            title: '"Shorten it? Can\'t, a contract is a contract."',
            desc: 'You would like to shorten your training because of good performance or prior education.',
            verdictShort: 'Shortening is possible — with an application + the chamber\'s approval!',
            verdictDetail: 'The training period can be shortened by the competent body (IHK/HWK) on a joint application by the trainee and company if the training goal is expected to be achieved in the shortened time (§ 8 (1) BBiG). Grounds for crediting: A-levels/technical A-levels, relevant prior education, good performance. Rule of thumb: up to 12 months\' shortening is common. An extension when needed is also possible (§ 8 (2)). When in doubt: check early admission to the exam (§ 45 (1) BBiG).',
            laws: [
                { title: '§ 8 (1) BBiG – Shortening', text: 'On a joint application by the trainee and the training company, the competent body must shorten the training period if the training goal is expected to be achieved in the shortened time.' },
                { title: '§ 45 (1) BBiG – Early admission to the exam', text: 'Trainees may be admitted to the final exam before the end of their training period if their performance justifies it.' }
            ],
            tips: [
                'Submit the application jointly with the company — if needed, ask the IHK to mediate.',
                'A-levels: usually 12 months\' shortening, technical college entrance qualification 6 months (varies by occupation).',
                'With top grades at vocational school: an early exam is possible (§ 45 BBiG).',
                'Even if the company refuses: the trainee can apply for an early exam unilaterally.'
            ],
            email: {
                subject: 'Application to shorten the training period under § 8 BBiG',
                body: `Dear [name of trainer],

I would like to apply, under § 8 (1) BBiG, to shorten my training period by [X months].

Reasons:
- [Prior education: A-levels / technical A-levels / relevant previous occupation]
- [Performance level: current grade average / assessment]

I kindly ask for a joint application to the competent chamber.

Kind regards
[Your name]`
            }
        },

        // ──────── CO-DETERMINATION ────────
        'jav-betriebsrat-zugang': {
            title: '"You visit the JAV in your free time."',
            desc: 'You want to speak to the youth and trainee representation (JAV) or the works council — but supposedly not during working hours.',
            verdictShort: 'You may visit the works council/JAV DURING working hours — without loss of pay!',
            verdictDetail: 'Every employee (including a trainee) may visit the works council / the JAV during working hours without loss of pay (§ 39 (3) BetrVG). Concerns can be: a complaint, advice, a conflict with the employer. Consultation hours are to be organised at the company. JAV members themselves are released for their duties (§ 65 BetrVG in conjunction with § 37 BetrVG).',
            laws: [
                { title: '§ 39 (3) BetrVG – Works council consultation hours', text: 'Every employee has the right to visit the works council during consultation hours.' },
                { title: '§ 39 (2) BetrVG – Loss of working time', text: 'Loss of working time required to make use of works-council consultation hours does not entitle the employer to reduce pay.' },
                { title: '§ 65 BetrVG – Status of the JAV', text: 'The provisions on the works council apply to the JAV accordingly.' }
            ],
            tips: [
                'Note the works-council/JAV consultation appointment — as proof of the recorded working time.',
                'JAV meetings / training are also paid release time (§ 65 in conjunction with § 37 BetrVG).',
                'A concern can also be pursued urgently outside the consultation hour (§ 39 (3)).',
                'No works council? You have the right to initiate an election (§ 17a BetrVG).'
            ],
            email: {
                subject: 'JAV / works-council consultation hour — release',
                body: `Dear [name of trainer],

on [date] I will make use of the works council\'s / JAV\'s consultation hour (approx. [time from – to]).

Under § 39 (2) BetrVG, this time is to be treated as working time and does not lead to a reduction in pay.

Kind regards
[Your name]`
            }
        },
        'jav-wahlrecht': {
            title: '"Elections? We don\'t need those, we\'re too small."',
            desc: 'No JAV is elected at the company even though there are trainees and younger employees.',
            verdictShort: 'A JAV election is mandatory from 5 eligible young people/trainees!',
            verdictDetail: 'A **youth and trainee representation (JAV)** is elected if the company has at least 5 employees under 18 **or** trainees under 25 (§ 60 BetrVG). **Requirement:** there is a works council. Employees under 18 and all trainees may vote; employees under 25 and — since 2021 — **all trainees regardless of age** may stand for election (§ 61 BetrVG). The term of office is 2 years.',
            laws: [
                { title: '§ 60 BetrVG – Establishment and task', text: 'In companies with usually at least five employees who have not yet reached the age of 18 or who are employed for their vocational training, JAVs are formed.' },
                { title: '§ 61 BetrVG – Voting entitlement and eligibility', text: 'Entitled to vote are all employees of the company who have not yet reached the age of 18, as well as employees who are employed for their vocational training and have not yet reached the age of 25.' },
                { title: '§ 70 BetrVG – Tasks of the JAV', text: 'The JAV must in particular apply for measures that serve young employees and those employed for their vocational training.' }
            ],
            tips: [
                'No works council + > 5 trainees: first initiate a works-council election (§ 17a BetrVG), then the JAV.',
                'An election initiative can come from THREE eligible trainees.',
                'Term of office 2 years — the dates are always in Q1 (typically March/April).',
                'The JAV has strong participation rights on take-over, training and complaints.'
            ],
            email: {
                subject: 'JAV election at the company',
                body: `Dear members of the works council,

as a trainee at the company, I would like to suggest the election of a youth and trainee representation (§ 60 BetrVG). In our assessment, the conditions (at least 5 eligible employees under 25 / 18) are met.

I kindly ask for information about the next steps to prepare the election.

Kind regards
[Your name]`
            }
        },
        'datenschutz-ueberwachung': {
            title: '"We monitor all PCs, that\'s normal."',
            desc: 'The company secretly monitors PC activity, emails, cameras or location.',
            verdictShort: 'Covert monitoring is prohibited — the works council must agree!',
            verdictDetail: 'The use of technical devices for monitoring conduct or performance (cameras, keyloggers, GPS, email analysis) requires the works council\'s consent (§ 87 (1) no. 6 BetrVG). Processing employees\' data is only permitted insofar as it is necessary and with information (§ 26 BDSG). Covert monitoring is almost always unlawful — evidence from it is inadmissible, and compensation for pain and suffering is possible (Federal Labour Court 27.07.2017 – 2 AZR 681/16).',
            laws: [
                { title: '§ 26 BDSG – Processing of employee data', text: 'Personal data of employees may be processed for the purposes of the employment relationship if this is necessary for carrying out the employment relationship.' },
                { title: '§ 87 (1) no. 6 BetrVG – Co-determination on monitoring', text: 'The works council has a right of co-determination over the introduction and use of technical devices intended to monitor the conduct or performance of employees.' },
                { title: 'Federal Labour Court 27.07.2017 – 2 AZR 681/16', text: 'Covertly created records of employees\' conduct are inadmissible in dismissal-protection proceedings.' }
            ],
            tips: [
                'Ask: which data is collected? Where is it stored? Who has access?',
                'Call the company data protection officer — free of charge for employees.',
                'In case of violations: inform your federal state\'s data protection supervisory authority (free of charge).',
                'Covert monitoring → compensation is realistic (typically €2,000–8,000).'
            ],
            email: {
                subject: 'Information request under Art. 15 GDPR',
                body: `Dear [management / data protection officer],

under Art. 15 GDPR, I hereby request information about all personal data that the company processes about me, in particular:

1) Which data is collected (PC activity, email, camera, location, login)?
2) The purposes of the processing
3) The recipients of the data
4) The storage period
5) The legal basis

I request the information within one month.

Kind regards
[Your name]`
            }
        },
        'sechs-tage-woche': {
            title: '"You\'re working six days this week."',
            desc: 'Monday to Saturday at work because things are busy.',
            verdictShort: 'Under 18: five days at most. From 18: only with compensation.',
            verdictDetail: '**Minors** may only be employed on **five days a week**; the two days off should be consecutive if possible (§ 15 JArbSchG). Anyone who has to work on Saturday (only allowed in certain industries) gets another day off that week (§ 16 (3) JArbSchG). For **adults**, working days under the Working Hours Act are Monday to Saturday; up to 48 hours a week are allowed (6 × 8 hours). If your training contract says five days a week, however, every sixth day is additional work and must be paid or compensated with time off (§ 17 (7) BBiG).',
            laws: [
                { title: '§ 15 JArbSchG – Five-day week', text: 'Young people may only be employed on five days a week. The two weekly rest days should be consecutive where possible.' },
                { title: '§ 3 ArbZG – Working time', text: 'Daily working time on working days may not exceed eight hours; working days are Monday to Saturday.' },
                { title: '§ 17 (7) BBiG – Additional work', text: 'Employment beyond the agreed regular training time must be specially paid or compensated with time off.' }
            ],
            tips: [
                'Check your training contract: it states how many days a week are agreed.',
                'Under 18: a sixth working day is not allowed — say so politely but clearly.',
                'From 18: get written confirmation of when you can take the extra day off.',
                'Record every extra day with its hours in your time sheet.'
            ],
            email: {
                subject: 'Working day on Saturday, [date]',
                body: `Dear [name of trainer],

an additional working day on Saturday, [date], has been scheduled for me next week. According to my training contract I work on [five] days a week.

[As I am not yet 18, under § 15 JArbSchG I may only be employed on five days a week.] / [I am willing to take on the day and would ask for a short confirmation of which day I can take off in return (§ 17 (7) BBiG).]

Thank you for a short reply.

Kind regards
[Your name]`
            }
        },
        'feiertagsarbeit': {
            title: '"We\'re open on the public holiday — you\'re in."',
            desc: 'The company opens on a statutory public holiday and you are supposed to work.',
            verdictShort: 'Off as a rule — only certain industries may, and then you get a replacement day.',
            verdictDetail: 'Work on statutory public holidays is **generally prohibited** (§ 9 ArbZG). Exceptions exist only for certain activities, e.g. in hospitality, hospitals, transport or emergency services (§ 10 ArbZG). Anyone who works on a public holiday falling on a working day gets a **replacement rest day** within eight weeks (§ 11 ArbZG). **Minors** are specially protected: they may never work on 25 December, 1 January, Easter Sunday and 1 May, nor after 2 p.m. on 24 and 31 December; on other holidays only in the permitted industries and with a replacement day off in the same or the following week (§ 18 JArbSchG).',
            laws: [
                { title: '§ 9 ArbZG – Sunday and holiday rest', text: 'Employees may not be employed on Sundays and statutory public holidays from midnight to midnight.' },
                { title: '§ 11 ArbZG – Compensation', text: 'Employees who work on a public holiday falling on a working day must receive a replacement rest day within eight weeks.' },
                { title: '§ 18 JArbSchG – Holiday rest', text: 'Young people may not be employed on 24 and 31 December after 2 p.m. or on public holidays; never on 25 December, 1 January, Easter Sunday and 1 May.' }
            ],
            tips: [
                'Ask which exception your company falls under — not every shop may open.',
                'Get the replacement rest day confirmed with a date right away.',
                'Check the collective agreement or training contract for holiday bonuses.',
                'Under 18: 25 Dec, 1 Jan, Easter Sunday and 1 May are always off — no exceptions.'
            ],
            email: {
                subject: 'Work on the public holiday [date]',
                body: `Dear [name of trainer],

according to the roster I am scheduled for [public holiday, date]. Statutory public holidays are generally work-free under § 9 ArbZG; for working on one I am entitled to a replacement rest day under § 11 ArbZG. [As a trainee under 18, § 18 JArbSchG additionally applies to me.]

Please let me know briefly which exception the assignment is based on and on which day I will receive the replacement rest day.

Kind regards
[Your name]`
            }
        },
        'vor-der-berufsschule': {
            title: '"Pop into work before school."',
            desc: 'Lessons start at 8 a.m., but you are supposed to do something at work first.',
            verdictShort: 'No — nobody may employ you before lessons that start before 9 a.m.',
            verdictDetail: 'Since 2020 it has been in the Vocational Training Act for **all** trainees: if vocational school lessons start **before 9 a.m.**, the company may **not** employ you beforehand at all — not even "just briefly" (§ 15 (1) BBiG). Before that, this applied only to minors. If lessons start at 9 a.m. or later, work beforehand is possible in principle, but the time must be realistic: the way to school then counts towards your hours (§ 15 (2) BBiG), and you must not arrive late because of it.',
            laws: [
                { title: '§ 15 (1) BBiG – Release', text: 'Trainers may not employ trainees before vocational school lessons that begin before 9 a.m.' },
                { title: '§ 15 (2) BBiG – Crediting', text: 'Vocational school time including breaks and necessary travel time is credited to the training time.' },
                { title: '§ 13 no. 2 BBiG – Duty to attend', text: 'Trainees must attend the training measures they are released for — including arriving at lessons on time.' }
            ],
            tips: [
                'Check your timetable: start before 9 a.m. = no work beforehand.',
                'The rule also applies if you are 18 or older.',
                'Do not arrive late at school because work held you up — that falls back on you.',
                'If it keeps happening, contact the IHK/HWK training advisers.'
            ],
            email: {
                subject: 'Work before vocational school starts',
                body: `Dear [name of trainer],

on my school days ([weekday]) lessons begin at [time]. Under § 15 (1) BBiG, trainees may not be employed before vocational school lessons that begin before 9 a.m.

I would ask you not to schedule me before lessons on those days any more. I am happy to do the task at another time.

Kind regards
[Your name]`
            }
        },
        'umkleidezeit': {
            title: '"Changing clothes is your own time — before and after."',
            desc: 'You have to put on work clothes at the company, but the time does not count.',
            verdictShort: 'If you must change at work, changing is working time.',
            verdictDetail: 'The Federal Labour Court distinguishes: if the company prescribes **specific clothing** and you must **put it on at work** (hygiene, protective clothing, conspicuous uniforms you cannot or should not put on at home), then changing, including the way to the changing room, **counts as working time** and must be paid. If you may put the clothes on at home and wear them inconspicuously on the way, changing is your own business. Collective agreements may have their own rules. For trainees, this time counts as training time — and therefore also towards the maximum limits.',
            laws: [
                { title: '§ 611a BGB – Employment contract', text: 'The activity demanded by the employer is remunerated; this includes changing for the employer\'s benefit when clothing must be put on at work.' },
                { title: 'BAG 19 Sep 2012 – 5 AZR 678/11', text: 'Changing times and the internal walks to change are paid working time if changing must take place at work.' }
            ],
            tips: [
                'Ask whether you may put the clothes on at home — everything depends on that.',
                'Note how long changing and the walk to the changing room really take.',
                'The company must provide protective and hygiene clothing (see "protective clothing").',
                'Check the collective agreement — it often sets a flat changing time.'
            ],
            email: {
                subject: 'Counting changing times',
                body: `Dear [name of trainer],

I have to put on the prescribed work clothing at the company. This takes about [X minutes] before and after work, including the way to the changing room.

According to Federal Labour Court case law (BAG 19 Sep 2012 – 5 AZR 678/11), such changing times are working time. I would ask that they be counted in my training time in future.

Kind regards
[Your name]`
            }
        },
        'homeoffice-azubi': {
            title: '"Work from home today, but don\'t keep asking."',
            desc: 'You are supposed to work from home — without tasks, without a contact person.',
            verdictShort: 'Mobile training is allowed — leaving you alone is not.',
            verdictDetail: 'You have **no right to work from home**, and the company may not simply send you home if your contract does not provide for it. **Mobile training** is permitted, however, if it serves the training goal and you are actually trained there: with tasks from the training plan, a reachable trainer and feedback (§ 14 (1) BBiG). The company must provide the necessary hardware and software **free of charge** (§ 14 (1) no. 3 BBiG). The Working Hours Act, breaks and maximum limits apply at home just the same.',
            laws: [
                { title: '§ 14 (1) no. 1 BBiG – Duty to train', text: 'Trainers must ensure that professional competence is taught in a planned way, structured in time and content.' },
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Training materials must be provided free of charge; for digital mobile training also the necessary hardware and software.' }
            ],
            tips: [
                'Ask for fixed tasks and a fixed time when your trainer can be reached.',
                'The company provides the laptop, software and access — you do not have to buy anything.',
                'Record in your training log what you learned while working from home.',
                'Breaks and end of work apply at the kitchen table too.'
            ],
            email: {
                subject: 'Support while working from home',
                body: `Dear [name of trainer],

I am scheduled to work from home on [days]. So that the time is useful for my training, I would ask for specific tasks from the training plan and a fixed time when I can ask questions.

I also need [device / access] to do the tasks (§ 14 (1) no. 3 BBiG).

Kind regards
[Your name]`
            }
        },
        'keine-zeiterfassung': {
            title: '"We don\'t record hours here."',
            desc: 'There is no time recording at the company, and overtime "disappears".',
            verdictShort: 'The company must record your working time.',
            verdictDetail: 'Since the Federal Labour Court decision of 13 Sep 2022 it has been clear: employers in Germany are **obliged to record the start and end of working time** of their employees (derived from § 3 (2) no. 1 ArbSchG, following the 2019 ECJ ruling). How exactly — time clock, app or spreadsheet — the company may decide, but "not at all" is not an option. For trainees this is doubly important: overtime must be paid or compensated (§ 17 (7) BBiG), and that only works with proof. **Regardless of that, you may always record your times yourself** — your own prompt notes are important evidence in a dispute.',
            laws: [
                { title: 'BAG 13 Sep 2022 – 1 ABR 22/21', text: 'Under § 3 (2) no. 1 ArbSchG, employers are obliged to introduce a system that records the start and end of daily working time.' },
                { title: '§ 16 (2) ArbZG – Records', text: 'Working time exceeding eight hours on working days must be recorded and kept for at least two years.' },
                { title: '§ 17 (7) BBiG – Additional work', text: 'Employment beyond the agreed training time must be paid or compensated with time off.' }
            ],
            tips: [
                'Write down start, end and breaks every day yourself — ideally right away.',
                'A time-tracking app with dates is better than notes on scraps of paper.',
                'If there is a works council, ask them about time recording.',
                'Your records also help with your training log.'
            ],
            email: {
                subject: 'Recording my working hours',
                body: `Dear [name of trainer],

I have noticed that my working hours are not currently being recorded. According to Federal Labour Court case law (BAG 13 Sep 2022 – 1 ABR 22/21), the employer is obliged to record the start and end of working time.

Please let me know how my hours will be recorded in future. Until then I will keep my own record, which I am happy to show you regularly.

Kind regards
[Your name]`
            }
        },
        'anderer-betrieb': {
            title: '"Next week you\'re helping out at our partner company."',
            desc: 'You are supposed to work at another company that is not your training company.',
            verdictShort: 'Only if it is part of your training — you may not be lent out as a temp.',
            verdictDetail: 'Your training takes place at the **training site** named in your contract. Training periods at another company are possible if they **serve the training goal** and are agreed — e.g. in **joint training** (§ 10 (5) BBiG) or because your own company cannot teach certain content. Then someone there must actually train you, and the pay and obligations of your training contract continue. What is not allowed is "lending" you to another firm as **cheap help** so it saves on staff — that is not training (§ 14 (3) BBiG) and may also be unauthorised temporary agency work.',
            laws: [
                { title: '§ 10 (5) BBiG – Joint training', text: 'Several persons or companies may cooperate in a training network, provided responsibility for the individual training periods is ensured.' },
                { title: '§ 14 (3) BBiG – Purpose of training', text: 'Trainees may only be given tasks that serve the purpose of the training.' }
            ],
            tips: [
                'Ask which content from the training plan you are to learn there.',
                'Get the arrangement in writing — with duration and a contact person on site.',
                'Your pay, vacation and vocational school continue unchanged.',
                'If you are just cheap labour, contact the IHK/HWK training advisers.'
            ],
            email: {
                subject: 'Assignment at [company]',
                body: `Dear [name of trainer],

you have announced that I will be assigned to [company] from [date]. So that the assignment forms part of my training, I would ask for a short written note:

- which content from my training plan I am to learn there,
- how long the assignment will last, and
- who will train me on site.

Under § 14 (3) BBiG, I may only be given tasks that serve the purpose of the training.

Kind regards
[Your name]`
            }
        },
        'firmenwagen-fahren': {
            title: '"From now on you drive the deliveries."',
            desc: 'You have a driving licence and are supposed to drive the company car regularly.',
            verdictShort: 'Occasionally yes, if it fits your occupation — not as a permanent task.',
            verdictDetail: 'Driving can be part of the training, e.g. when you take material to a site or to a customer. But if you become the **regular driver** for deliveries that have nothing to do with your occupation, that is an activity outside the training (§ 14 (3) BBiG). Important for you: you are not liable without limit for **damage to the company car**. Under the principles of employee liability, the company bears slight negligence alone, moderate negligence is shared, and only for gross negligence or intent do you pay most of it. For trainees, inexperience is taken into account as well. You must pay fines for your **own** traffic offences yourself. The car must be roadworthy and insured.',
            laws: [
                { title: '§ 14 (3) BBiG – Purpose of training', text: 'Trainees may only be given tasks that serve the purpose of the training.' },
                { title: 'BAG Grand Senate 27 Sep 1994 – GS 1/89', text: 'For work-related activities, the employee is liable according to the degree of fault; not at all for slight negligence.' }
            ],
            tips: [
                'Ask whether and how the car is comprehensively insured — and who pays the excess.',
                'Before every trip, briefly check tyres, lights and load, and report defects in writing.',
                'Note trips in your training log with the training link (customer, material, job).',
                'For pure courier runs: politely point to the training plan.'
            ],
            email: {
                subject: 'Trips with the company car',
                body: `Dear [name of trainer],

since [date] I have regularly been doing delivery runs with the company car. I am happy to help out, but would like to make sure my training continues according to the training plan (§ 14 (3) BBiG).

I would also ask for brief information on how the car is insured and what happens in the event of damage.

Kind regards
[Your name]`
            }
        },
        'kassenfehlbetrag': {
            title: '"We\'ll take the till shortfall out of your pay."',
            desc: 'Money is missing when the till is cashed up, and you are supposed to cover it from your pay.',
            verdictShort: 'Not just like that — liability requires fault and proof.',
            verdictDetail: 'A **flat deduction** for till differences is not allowed. You are only liable if **fault** is proven against you, and even then under the principles of employee liability: not at all for slight negligence, proportionally for moderate negligence, mostly for gross negligence or intent. A **shortfall agreement** (liability without fault) is only valid if you receive appropriate shortfall pay for it and have sole access to the till — and in a training contract **flat-rate damages are void** (§ 12 (2) no. 4 BBiG). Even if a claim exists, the company may not take your pay below the attachment-exempt amount (§ 394 BGB).',
            laws: [
                { title: '§ 12 (2) BBiG – Void agreements', text: 'Agreements on contractual penalties, on excluding or limiting damage claims, and on setting damages as flat amounts are void.' },
                { title: '§ 394 BGB – Set-off', text: 'To the extent a claim is not subject to attachment, set-off against it is not permitted.' },
                { title: 'BAG Grand Senate 27 Sep 1994 – GS 1/89', text: 'Employees are liable for work-related damage on a scale according to the degree of their fault.' }
            ],
            tips: [
                'Do not sign an "acknowledgement of debt" for a till difference.',
                'Insist that tills are handed over by one person only with a counting record.',
                'Check your payslip: a deduction must be shown and justified.',
                'For repeated deductions: involve the works council, union or IHK/HWK.'
            ],
            email: {
                subject: 'Deduction for till difference of [date]',
                body: `Dear [name of trainer],

an amount of [€X] was withheld from my pay for [month] because of a till difference. I do not agree with this deduction.

Liability requires proven fault; flat-rate damages are void in a training relationship under § 12 (2) BBiG. I therefore ask for the withheld amount to be refunded with the next payslip.

Kind regards
[Your name]`
            }
        },
        'schaden-bezahlen': {
            title: '"You broke the device — you pay."',
            desc: 'Something broke while you were working, and the company wants compensation.',
            verdictShort: 'For slight negligence you pay nothing — and trainees are given more leeway.',
            verdictDetail: 'Damage at work is governed by **internal loss sharing**: for **slight negligence** (can happen to anyone) you are not liable at all. For **moderate** negligence the damage is shared according to the circumstances. Only for **gross negligence or intent** are you usually fully liable, and even then a cap is possible if your pay is grossly out of proportion to the damage. For trainees, age, experience and whether you were adequately instructed and supervised all count. You must handle tools and machines **with care** (§ 13 no. 5 BBiG) — but a flat amount for damage in the contract is void (§ 12 (2) BBiG).',
            laws: [
                { title: 'BAG Grand Senate 27 Sep 1994 – GS 1/89', text: 'The limitation of liability applies to all work caused by the business and performed under the employment relationship.' },
                { title: '§ 13 no. 5 BBiG – Duties', text: 'Trainees must treat tools, machines and other equipment with care.' },
                { title: '§ 12 (2) no. 4 BBiG – Void', text: 'Agreements setting the amount of damages as flat sums are void.' }
            ],
            tips: [
                'Report the damage immediately and honestly — concealing it quickly becomes gross misconduct.',
                'Write down how it happened and whether you had been instructed.',
                'Do not sign anything accepting a payment before you have had advice.',
                'If the company has insurance, it must use that first.'
            ],
            email: {
                subject: 'Damage to [device] on [date]',
                body: `Dear [name of trainer],

on [date], [device] was damaged while I was [activity]. I regret this. I have recorded what happened as follows: [short description].

Under the principles of employee liability, I would only bear the costs in the case of gross negligence or intent, which is not the case here. I would therefore ask you not to make a deduction.

Kind regards
[Your name]`
            }
        },
        'handyverbot': {
            title: '"Phones stay in the locker during work."',
            desc: 'The company bans private phone use during working hours.',
            verdictShort: 'Yes, a ban on private use is generally allowed.',
            verdictDetail: 'During working hours you owe work — so the company may **restrict or ban** private phone use (right to give instructions, § 106 GewO). Rules like "phones in the locker" are usually allowed too, especially for safety or data protection reasons. If there is a **works council**, it must co-determine such rules on conduct (§ 87 (1) no. 1 BetrVG). During **breaks** you may use your phone, because the break is your free time. And in real emergencies your family must be able to reach you, e.g. via the company phone. Violations can lead to a warning.',
            laws: [
                { title: '§ 106 GewO – Right to give instructions', text: 'The employer may determine the content, place and time of work as well as order and conduct in the company at its reasonable discretion.' },
                { title: '§ 87 (1) no. 1 BetrVG – Co-determination', text: 'The works council has a right of co-determination in matters of company order and employee conduct.' }
            ],
            tips: [
                'During your break, the phone is yours.',
                'Give your family the company\'s number for emergencies.',
                'If you need the phone for work (photos, authentication), the company must regulate that.',
                'With a works council: ask about the works agreement.'
            ]
        },
        'kleiderordnung-tattoo': {
            title: '"Cover your tattoos, and get a haircut."',
            desc: 'The company sets rules on clothing, tattoos, piercings or hairstyle.',
            verdictShort: 'Clothing: often yes. Interfering with your appearance outside work: rarely.',
            verdictDetail: 'The company may set rules on appearance if there is a **legitimate reason**: safety (no rings at machines), hygiene (tie hair back in the kitchen), customer contact (uniform clothing). Covering tattoos during work can be required in customer-facing roles. The more a rule interferes with your **personality rights** and affects you beyond working hours — e.g. cutting your hair or removing a tattoo — the weightier the reason must be; that is rarely permissible. Rules may not discriminate, e.g. on grounds of religion (AGG). Where there is a works council, a dress code is subject to co-determination.',
            laws: [
                { title: '§ 106 GewO – Right to give instructions', text: 'Instructions on order and conduct must be reasonable, i.e. weigh the interests of both sides.' },
                { title: 'Art. 2 (1) GG – Personality rights', text: 'Everyone has the right to the free development of their personality; this includes outward appearance.' },
                { title: '§ 1 AGG – Ban on discrimination', text: 'Discrimination on grounds of religion, belief, origin or sex is prohibited — including through dress rules.' }
            ],
            tips: [
                'Ask for the reason behind the rule — safety and hygiene are usually justified.',
                'Prescribed uniforms must generally be provided by the company.',
                'Long sleeves or plasters for tattoos are a common compromise.',
                'For religious clothing (e.g. headscarf), get advice first.'
            ],
            email: {
                subject: 'Rules on appearance',
                body: `Dear [name of trainer],

you have asked me to [rule]. I would like to follow the company's rules and would ask for a short explanation of the reason behind it.

For everyday work I suggest [compromise, e.g. long sleeves / hair tied back].

Kind regards
[Your name]`
            }
        },
        'social-media-post': {
            title: '"Because of your post, you\'re getting a warning."',
            desc: 'You posted something privately about the company or colleagues.',
            verdictShort: 'Opinions yes — insults, secrets and photos of others no.',
            verdictDetail: 'As a trainee you too have **freedom of expression** (Art. 5 GG): objective criticism or a post about a tiring day is allowed. The limits are **insults** to your trainer, colleagues or customers, disclosing **business and trade secrets** (§ 13 no. 6 BBiG), photos or videos of colleagues without their consent, and pictures from areas where photography is forbidden. Such posts can justify a **warning**, and serious cases (e.g. gross insults) even termination for good cause (§ 22 (2) BBiG). "Private" groups and stories are not really private if colleagues are reading along.',
            laws: [
                { title: 'Art. 5 (1) GG – Freedom of expression', text: 'Everyone has the right to express their opinion freely; limits include the right to personal honour.' },
                { title: '§ 13 no. 6 BBiG – Confidentiality', text: 'Trainees must keep business and trade secrets confidential.' }
            ],
            tips: [
                'No names, no photos of colleagues, no internal information — then you are almost always safe.',
                'Better sort out anger in a personal conversation or with the JAV/works council.',
                'If you get a warning: adding a counter-statement to your personnel file is your right.',
                'Delete a post that went too far and apologise — that counts in the assessment.'
            ]
        },
        'nebenjob': {
            title: '"A side job alongside your training? Forbidden!"',
            desc: 'You want to earn extra money at weekends or in the evenings.',
            verdictShort: 'A side job is generally allowed — within limits.',
            verdictDetail: 'A **blanket ban** is invalid, because your free time is yours (freedom of occupation, Art. 12 GG). The company may prohibit a side job, however, if **legitimate interests** are affected: if it impairs your training (you arrive exhausted), if it is with a **competitor**, or if the **maximum working time** is exceeded. Hours with several employers are **added together** (§ 2 (1) ArbZG); for minors the 8 hours a day and 40 hours a week apply to all jobs combined. If your contract contains a **duty to notify**, you must report the side job. During vacation you may not take a job that contradicts the purpose of rest (§ 8 BUrlG).',
            laws: [
                { title: '§ 2 (1) ArbZG – Working time', text: 'Working hours with several employers are to be added together.' },
                { title: '§ 8 BUrlG – Gainful work during vacation', text: 'During vacation the employee may not perform gainful work that contradicts the purpose of the vacation.' },
                { title: '§ 4 (5) JArbSchG – Several employers', text: 'If a young person is employed by several employers, working and shift times as well as working days are added together.' }
            ],
            tips: [
                'Check whether your contract requires you to report a side job — if so, notify briefly in writing.',
                'Add up all hours: training + side job may not break the maximum limits.',
                'No job with a direct competitor of your training company.',
                'Make sure you get enough sleep before school and exams.'
            ],
            email: {
                subject: 'Notification of a side job',
                body: `Dear [name of trainer],

I hereby notify you that from [date] I will take up a side job with [employer, sector], namely [scope, e.g. 4 hours on Saturdays].

The job does not compete with our company and does not affect my training or attendance at vocational school. I comply with the statutory maximum working hours overall.

Kind regards
[Your name]`
            }
        },
        'urlaub-probezeit': {
            title: '"No vacation until after probation."',
            desc: 'You are new at the company and want to take a few days off in the first months.',
            verdictShort: 'The full entitlement comes after 6 months — vacation before then is still possible.',
            verdictDetail: 'You acquire your **full annual leave** after **six months** at the company (waiting period, § 4 BUrlG). During that time the company does not have to grant leave, but it **may**, and many do. This has nothing to do with probation, which is often shorter (1–4 months). Important: if you start in the middle of the year, you are entitled to a pro-rata share in the first year — one twelfth per full month if you no longer complete the waiting period that year (§ 5 BUrlG). If the training ends earlier, untaken leave is paid out.',
            laws: [
                { title: '§ 4 BUrlG – Waiting period', text: 'The full leave entitlement is first acquired after the employment relationship has existed for six months.' },
                { title: '§ 5 (1) BUrlG – Partial leave', text: 'There is an entitlement to one twelfth of the annual leave for each full month, among other things for periods in which no full entitlement arises because the waiting period is not met.' }
            ],
            tips: [
                'Just ask — many companies grant leave in the first months.',
                'Calculate your first-year entitlement pro rata (one twelfth per full month).',
                'Under 18, a higher minimum leave applies (see "How much vacation").',
                'Get approved leave confirmed in writing.'
            ]
        },
        'urlaub-schulzeit': {
            title: '"Just take vacation on your school day."',
            desc: 'Vacation is to be placed during school time, or school days are counted as vacation.',
            verdictShort: 'School days are not vacation — school remains compulsory.',
            verdictDetail: 'Vocational school is compulsory and **training time**, not vacation: you are released for school days (§ 15 BBiG), and they may not be deducted from your leave. Vacation only applies to days when you would otherwise be at work. For **minors** it is written into law: leave **should be given during the school holidays**, and for every school day you attend during your leave you get an **extra day of leave** (§ 19 (3) JArbSchG). For adults the same applies in effect: leave during school time is practically worthless, because compulsory schooling continues.',
            laws: [
                { title: '§ 19 (3) JArbSchG – Vocational school', text: 'Leave should be given to vocational students during the school holidays. Where it is not, an extra day of leave must be granted for every school day attended during the leave.' },
                { title: '§ 15 (1) BBiG – Release', text: 'Trainers must release trainees to attend vocational school lessons.' }
            ],
            tips: [
                'Plan your vacation during the school holidays — that is easiest for everyone.',
                'If school days are deducted from your leave, raise it in writing.',
                'Under 18: for each school day during your leave you get a day back.',
                'No company can excuse you from compulsory school — not even with leave.'
            ],
            email: {
                subject: 'School days counted as vacation',
                body: `Dear [name of trainer],

my leave request for [period] includes [number] vocational school days. On those days I attend vocational school and am released for it under § 15 BBiG; they therefore cannot count as days of leave. [As a trainee under 18, under § 19 (3) JArbSchG I am entitled to an extra day of leave for each of those days.]

Please correct my leave account accordingly.

Kind regards
[Your name]`
            }
        },
        'resturlaub-verfaellt': {
            title: '"Your remaining leave expires on 31 December."',
            desc: 'You still have days of leave, and the company says they are gone at year end.',
            verdictShort: 'Not automatically — the company must first ask you to take it and warn you.',
            verdictDetail: 'Leave should be taken in the current year; carrying it over to **31 March** of the following year is possible if operational or personal reasons require it (§ 7 (3) BUrlG). **But:** since the case law of the ECJ and the Federal Labour Court, leave **only** expires if the company **asked you in good time and specifically** to take it and **clearly warned you** that it would otherwise expire. If it did not, your leave remains and moves into the next year. If you could not take leave because of illness, separate, longer deadlines apply.',
            laws: [
                { title: '§ 7 (3) BUrlG – Carry-over', text: 'Leave must be granted and taken in the current calendar year. Carry-over is only permitted for urgent operational or personal reasons; it must then be taken in the first three months of the following year.' },
                { title: 'BAG 19 Feb 2019 – 9 AZR 423/16', text: 'Leave as a rule only lapses if the employer has previously enabled the employee to take it and the employee nevertheless voluntarily did not.' }
            ],
            tips: [
                'Request your leave in writing and in good time — then you have proof.',
                'If you got no warning about expiry, the leave does not expire.',
                'Note your leave balance at the end of the year.',
                'When your training ends, remaining leave is paid out (see "Leave at the end").'
            ],
            email: {
                subject: 'Remaining leave from [year]',
                body: `Dear [name of trainer],

according to my records I still have [number] days of leave from [year]. I did not receive a request to take this leave together with a warning that it might expire.

According to Federal Labour Court case law (BAG 19 Feb 2019 – 9 AZR 423/16), the leave remains in this case. Please confirm that the days will be carried over to my leave account.

Kind regards
[Your name]`
            }
        },
        'urlaubsabgeltung': {
            title: '"Forget your remaining leave at the end of the training."',
            desc: 'The training is ending, you still have leave left and are not being kept on.',
            verdictShort: 'What you can no longer take must be paid out.',
            verdictDetail: 'If leave can no longer be taken in full or in part because the training or employment relationship **ends**, it must be **paid out** (§ 7 (4) BUrlG). Ideally you take it before the end — but if that was not possible, e.g. because of exams or because the training ends earlier when you pass, you are entitled to payment. It is calculated on the basis of your average earnings over the last 13 weeks (§ 11 BUrlG). If you are **kept on**, on the other hand, the leave carries over into the new employment.',
            laws: [
                { title: '§ 7 (4) BUrlG – Payment in lieu', text: 'If leave can no longer be granted in full or in part because the employment ends, it must be paid out.' },
                { title: '§ 11 BUrlG – Holiday pay', text: 'Holiday pay is based on the average earnings of the last thirteen weeks before the leave begins.' }
            ],
            tips: [
                'Plan remaining leave early, but keep exam dates in mind.',
                'The training ends when you pass the final exam — even before the contract end date.',
                'Check your last payslip for the leave payment.',
                'Watch the cut-off periods in your contract: claim promptly in writing.'
            ],
            email: {
                subject: 'Payment for my remaining leave',
                body: `Dear [name of trainer],

my training relationship ends on [date]. At that point I still have [number] days of leave that I can no longer take because of [reason].

Under § 7 (4) BUrlG these days must be paid out. Please pay them with my final payslip.

Kind regards
[Your name]`
            }
        },
        'sonderurlaub': {
            title: '"You have to take vacation for the funeral."',
            desc: 'A special occasion — a death, your own wedding, a birth — and you are told to use leave.',
            verdictShort: 'For important personal reasons you get paid time off — as a trainee, guaranteed.',
            verdictDetail: 'If you are **prevented from working through no fault of your own for a reason relating to you personally**, your pay must continue for a relatively short time. For trainees this is written in § 19 (1) no. 2 BBiG — and because deviations to your disadvantage are void (§ 25 BBiG), the training contract cannot exclude it (in normal employment contracts § 616 BGB can partly be excluded). Recognised occasions include the **death of close relatives**, your **own wedding**, the **birth of your own child**, a summons to court or an authority. A private house move usually does not count. How many days depends on the occasion; collective agreements often give concrete numbers (usually 1–2 days).',
            laws: [
                { title: '§ 19 (1) no. 2 BBiG – Continued pay', text: 'Pay continues for up to six weeks if trainees are prevented through no fault of their own, for another reason relating to them personally, from fulfilling their duties.' },
                { title: '§ 25 BBiG – Mandatory', text: 'An agreement deviating from these provisions to the trainee\'s disadvantage is void.' },
                { title: '§ 616 BGB – Temporary prevention', text: 'The right to pay remains if the person is prevented from working for a relatively insignificant time for a reason relating to them personally and through no fault of their own.' }
            ],
            tips: [
                'Let them know as early as possible what it is about and how long you will be away.',
                'Provide proof if requested (e.g. death notice, marriage certificate).',
                'Check the collective or training contract: it often lists fixed days per occasion.',
                'If you are still told to take leave for it, object in writing.'
            ],
            email: {
                subject: 'Time off for [occasion] on [date]',
                body: `Dear [name of trainer],

because of [occasion, e.g. my grandmother's funeral] I cannot be at work on [date].

For this I request paid time off under § 19 (1) no. 2 BBiG; it is not meant to be deducted from my annual leave. I am happy to provide proof.

Kind regards
[Your name]`
            }
        },
        'arzttermin': {
            title: '"Doctor\'s appointments are for after work."',
            desc: 'You have a doctor\'s appointment during working hours and are told to take leave or make up the time.',
            verdictShort: 'If there is no other way, you get paid time off.',
            verdictDetail: 'In principle you should schedule doctor\'s appointments **outside working hours** where possible. If there is **no other way** — e.g. acute symptoms, a specialist who only offers morning appointments, or a test that must take place in the morning on an empty stomach — you must be given **paid time off** for the appointment including travel (§ 19 (1) no. 2 BBiG; for employees § 616 BGB). You do not have to make up the time or take leave. **Minors** must be released without loss of pay for the examinations required under the Youth Employment Protection Act (§ 43 JArbSchG). If you are unfit for work, the normal sick note applies anyway.',
            laws: [
                { title: '§ 19 (1) no. 2 BBiG – Continued pay', text: 'Pay continues if trainees are prevented from training through no fault of their own for a reason relating to them personally.' },
                { title: '§ 43 JArbSchG – Release', text: 'The employer must release young people for the medical examinations under this Act; there may be no loss of pay.' }
            ],
            tips: [
                'First try for an appointment outside working hours — that strengthens your position.',
                'Ask the practice for a certificate of the appointment and its duration.',
                'Let them know in good time and enter the appointment in your time record.',
                'Flexitime? Then the company can ask you to schedule it in your free time.'
            ],
            email: {
                subject: 'Doctor\'s appointment on [date]',
                body: `Dear [name of trainer],

on [date] I have a doctor's appointment from [time] until about [time]. Unfortunately an appointment outside my training hours was not possible because [reason].

I request time off for this under § 19 (1) no. 2 BBiG. I will provide a certificate from the practice.

Kind regards
[Your name]`
            }
        },
        'bildungsurlaub': {
            title: '"Educational leave? Not for trainees."',
            desc: 'You want to attend a seminar and take educational leave for it.',
            verdictShort: 'In most federal states yes — but the rules are a matter for each state.',
            verdictDetail: '**Educational leave** (depending on the state also called education time or educational release) is **additional paid leave** for recognised further training and does not come out of your annual leave. It is governed by **state laws**: most federal states have such a law, **Bavaria and Saxony** do not. Whether and for what trainees may take it is decided by each state; several states limit it for trainees to political education or to a few days during the training. Otherwise 5 days a year is common, often 10 days over two years. The course must be recognised in the state, and the application usually has to reach the company several weeks in advance.',
            laws: [
                { title: 'State laws on educational release', text: 'Employees are entitled to paid release for recognised courses under the conditions of the respective state law; Bavaria and Saxony have no such law.' }
            ],
            tips: [
                'Search for "Bildungsurlaub" plus your federal state — the trainee rules are listed there.',
                'Choose a course recognised for your federal state.',
                'Apply in writing within your state\'s deadline (often 6 weeks in advance).',
                'Educational leave is additional — your annual leave stays untouched.'
            ]
        },
        'berichtsheft-zuhause': {
            title: '"You write your training log at home."',
            desc: 'There is no time at work for the training record — you are supposed to keep it in your free time.',
            verdictShort: 'No — the company must give you time for it at your workplace.',
            verdictDetail: 'Keeping the training record (the **training log**) is your duty (§ 13 no. 7 BBiG) — but it is **training time**, not free time. The company must expressly **give you the opportunity to keep it at your workplace** and **review it regularly** (§ 14 (2) BBiG). So it may not refer you to your evenings. This matters because the training log is a requirement for admission to the final exam (§ 43 (1) no. 2 BBiG): without kept records you cannot sit the exam. Whether it is on paper or electronic is set in the training contract.',
            laws: [
                { title: '§ 14 (2) BBiG – Training record', text: 'Trainers must encourage trainees to keep training records and review them regularly. Trainees must be given the opportunity to keep the record at their workplace.' },
                { title: '§ 13 no. 7 BBiG – Duty', text: 'Trainees must keep a written or electronic training record.' },
                { title: '§ 43 (1) no. 2 BBiG – Admission', text: 'Anyone who has submitted the required training record is to be admitted to the final exam.' }
            ],
            tips: [
                'Suggest a fixed time each week, e.g. 30 minutes on Fridays.',
                'Write promptly — at the end of the week you still remember what you did.',
                'A digital training log saves time if your company allows electronic records.',
                'If there is no time, note that — it matters if admission becomes an issue.'
            ],
            email: {
                subject: 'Time for the training record',
                body: `Dear [name of trainer],

in recent weeks I have had no opportunity during working hours to keep my training record. Under § 14 (2) BBiG, trainees must be given the opportunity to keep the training record at their workplace.

I suggest scheduling [day, time, duration] for this each week. I am happy to submit the records to you regularly for review afterwards.

Kind regards
[Your name]`
            }
        },
        'berichtsheft-unterschrift': {
            title: '"I\'ll sign the training log sometime."',
            desc: 'Your trainer has not signed off your records for months.',
            verdictShort: 'Reviewing is mandatory — missing records can cause admission problems.',
            verdictDetail: 'Your trainer must **review your training records regularly** (§ 14 (2) BBiG); in practice that means countersigning them. If they let it slide, that is **their** breach of duty, not yours. It becomes critical before the final exam: only those who have submitted the required records are admitted (§ 43 (1) no. 2 BBiG). Many chambers check the signatures. So: keep your log complete and without gaps, submit it regularly and note when you submitted it. If the signature still does not come, contact the IHK/HWK early.',
            laws: [
                { title: '§ 14 (2) BBiG – Review', text: 'Trainers must encourage trainees to keep training records and review them regularly.' },
                { title: '§ 43 (1) no. 2 BBiG – Admission', text: 'Anyone who has submitted the required written or electronic training record is to be admitted to the final exam.' }
            ],
            tips: [
                'Submit the records at a fixed rhythm, e.g. monthly — and note the date.',
                'A digital training log with an approval link makes signing off easier for your trainer.',
                'Signatures missing shortly before exam registration: ask the IHK/HWK immediately.',
                'Do not rewrite anything that has already been signed off.'
            ],
            email: {
                subject: 'Review of my training records',
                body: `Dear [name of trainer],

my training records for the period [from – to] have been with you for review since [date] and have not yet been signed off.

As the records are a requirement for admission to the final exam under § 43 (1) no. 2 BBiG, I would ask you to review and sign them by [date].

Kind regards
[Your name]`
            }
        },
        'blockunterricht': {
            title: '"After block teaching you\'re coming in for the afternoon."',
            desc: 'You have a week of block teaching and are still expected at work.',
            verdictShort: 'In a block week of at least 25 hours you are off for the whole week.',
            verdictDetail: 'With **block teaching** of at least **25 scheduled hours on at least five days**, the company may **not employ you** that week (§ 15 (1) BBiG) — this has applied to all trainees since 2020. Only **in-company training sessions** of up to **two hours a week** are allowed, e.g. a short lesson at the company, not normal work. The block week counts with your average weekly training time (§ 15 (2) BBiG), so you have no minus hours.',
            laws: [
                { title: '§ 15 (1) BBiG – Block teaching', text: 'Trainees may not be employed in school weeks with scheduled block teaching of at least 25 hours on at least five days; additional in-company training sessions of up to two hours a week are permitted.' },
                { title: '§ 15 (2) BBiG – Crediting', text: 'School weeks under paragraph 1 are credited with the average weekly training time.' }
            ],
            tips: [
                'Check the block plan: at least 25 hours on five days?',
                'A short training session at the company (up to 2 hours) is allowed, normal work is not.',
                'There may be no minus hours for the block week.',
                'Enter the block week fully in your training log.'
            ],
            email: {
                subject: 'Work during block teaching',
                body: `Dear [name of trainer],

in the week of [date] I have block teaching with [hours] lessons on five days. Under § 15 (1) BBiG I may not be employed at the company that week; only in-company training sessions of up to two hours are permitted.

I would therefore ask you not to put me on the roster that week.

Kind regards
[Your name]`
            }
        },
        'berufsschule-fehlen': {
            title: '"Skipping school has consequences."',
            desc: 'You missed vocational school without an excuse — what may the company do?',
            verdictShort: 'Yes — vocational school is compulsory, and absences can lead to dismissal.',
            verdictDetail: 'You are released for lessons, but you are also **obliged to attend** (§ 13 no. 2 BBiG); the company must encourage you to attend school (§ 14 (1) no. 4 BBiG) and may ask for proof of attendance. Unexcused absence is a **breach of duty**: there can be a **warning**, you lose your right to pay for the time skipped, and repeated truancy after a warning can be a **good cause for termination** (§ 22 (2) BBiG). On top of that, there are consequences under state school law. If you are ill, your sick note also covers school — but you must inform the school separately under its rules.',
            laws: [
                { title: '§ 13 no. 2 BBiG – Attendance', text: 'Trainees are obliged to take part in training measures for which they are released under § 15.' },
                { title: '§ 14 (1) no. 4 BBiG – Encouragement', text: 'Trainers must encourage trainees to attend vocational school.' },
                { title: '§ 22 (2) no. 1 BBiG – Termination', text: 'After probation, termination without notice is possible for good cause.' }
            ],
            tips: [
                'Ill? Report to the company AND to the school according to its rules.',
                'If you have received a warning, take it seriously — the next one may be the last.',
                'Problems at school? Talk to a teacher, trainer or training adviser before you skip.',
                'Late because of the bus or train: report it to the school immediately and keep proof.'
            ]
        },
        'schulbuecher-kosten': {
            title: '"You pay for school books and calculators yourself."',
            desc: 'You need books and materials for vocational school — who pays?',
            verdictShort: 'Materials for the company: the company pays — school books often you or the state.',
            verdictDetail: 'The company must provide you **free of charge with all training materials** you need for **in-company training and the exams**: tools, materials, specialist literature, and for mobile training also hardware and software (§ 14 (1) no. 3 BBiG). Materials required **only by the vocational school** are, according to the prevailing view, **not** included. Whether you have to buy school books yourself is regulated by the federal states through **free learning materials** rules — in some states the school provides books free of charge or on loan, in others you pay a contribution. Many companies and collective agreements cover the costs voluntarily anyway. If you also need the same book at work or for the exam, it is a training material.',
            laws: [
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Trainers must provide trainees free of charge with the training materials, in particular tools, materials and specialist literature, required for the training and for taking intermediate and final exams.' }
            ],
            tips: [
                'Ask the school about lending or free learning materials in your state.',
                'Ask the company — many cover school books voluntarily.',
                'Exam literature and reference books you also use at work must be provided by the company.',
                'Keep receipts: work materials you paid for yourself are tax-deductible.'
            ]
        },
        'zwischenpruefung': {
            title: '"You don\'t need to go to the intermediate exam, it doesn\'t count."',
            desc: 'The company wants you at work on the day of the intermediate exam.',
            verdictShort: 'Yes you do — no participation, no admission to the final exam.',
            verdictDetail: 'Taking part in the **intermediate exam** is a requirement for **admission to the final exam** (§ 43 (1) no. 2 BBiG) — even if its result does not count towards the grade in many occupations. In the **stretched final exam** there is "Part 1" instead of the intermediate exam, and it **does count** towards the final result. You must be **released with pay** for the exam (§ 15 (1) BBiG, § 19 (1) BBiG), and the company must register you with the chamber. Keeping you from it puts your qualification at risk.',
            laws: [
                { title: '§ 43 (1) no. 2 BBiG – Admission', text: 'Anyone who has taken part in the prescribed intermediate exams is to be admitted to the final exam.' },
                { title: '§ 15 (1) BBiG – Release', text: 'Trainers must release trainees to take part in exams.' }
            ],
            tips: [
                'Pass on the exam date early and get it confirmed in writing.',
                'Ask whether you have a stretched exam — then Part 1 counts.',
                'Contact the chamber if you do not receive an invitation.',
                'Exam day is training time — no leave, no minus hours.'
            ],
            email: {
                subject: 'Intermediate exam on [date]',
                body: `Dear [name of trainer],

my intermediate exam at the [IHK/HWK] takes place on [date]. Taking part is a requirement for my admission to the final exam under § 43 (1) no. 2 BBiG; I must be released for the exam day under § 15 (1) BBiG.

Please briefly confirm that I am not scheduled at work that day.

Kind regards
[Your name]`
            }
        },
        'pruefungsgebuehr': {
            title: '"You pay the exam fee."',
            desc: 'The company wants you to repay the cost of the intermediate or final exam.',
            verdictShort: 'No — the training company bears the cost of exams.',
            verdictDetail: 'The chamber\'s **exam fees** for intermediate and final exams are borne by the **training company**; they are part of the cost of training. Everything you need **for the exam** (exam materials, workpieces, tools) must also be provided free of charge (§ 14 (1) no. 3 BBiG). An agreement under which you pay for your training is **void** (§ 12 (2) no. 1 BBiG). This also applies to a **retake** as long as you are still in training. After the training relationship ends — e.g. if you retake an exam later without a contract — it may be different.',
            laws: [
                { title: '§ 14 (1) no. 3 BBiG – Training materials', text: 'Trainers must provide free of charge the materials required for taking intermediate and final exams.' },
                { title: '§ 12 (2) no. 1 BBiG – Void', text: 'An agreement obliging trainees to pay compensation for their vocational training is void.' }
            ],
            tips: [
                'The chamber\'s invoice usually goes straight to the company.',
                'If something was deducted: check the payslip and reclaim it in writing.',
                'Exam materials and workpieces are also provided by the company.',
                'If unsure, the chamber will answer the question definitively.'
            ],
            email: {
                subject: 'Exam fee [intermediate/final exam]',
                body: `Dear [name of trainer],

with my payslip for [month], an amount of [€X] was withheld for the exam fee. The cost of the exam is borne by the trainer; an agreement under which trainees pay for their training is void under § 12 (2) no. 1 BBiG.

Please refund it with the next payslip.

Kind regards
[Your name]`
            }
        },
        'vorzeitige-zulassung': {
            title: '"Take the exam early? Not with us."',
            desc: 'Your grades are good and you want to bring the final exam forward.',
            verdictShort: 'Yes you can — the chamber decides admission, not the company alone.',
            verdictDetail: 'If your **performance** justifies it, you can be admitted to the final exam **before the end of the training period** (§ 45 (1) BBiG). The company and the vocational school are **consulted**, but the chamber decides. Good grades at school and good performance at work are typical; many chambers bring it forward by up to six months. This is different from **shortening** the training period at or shortly after signing the contract, which company and trainee apply for **jointly** (§ 8 (1) BBiG). Anyone who passes early ends the training when the result is announced.',
            laws: [
                { title: '§ 45 (1) BBiG – Early admission', text: 'Trainees may be admitted to the final exam before the end of their training period after consulting the trainer and the vocational school, if their performance justifies it.' },
                { title: '§ 8 (1) BBiG – Shortening', text: 'On joint application, the competent body must shorten the training period if the training goal is expected to be reached in the shorter time.' }
            ],
            tips: [
                'Ask your chamber about its criteria (often an average grade of 2.0 or better).',
                'Get a statement from the vocational school early.',
                'Watch the registration deadlines — often several months before the exam date.',
                'Plan your study time: early also means less preparation.'
            ]
        },
        'nach-pruefung-weiterarbeiten': {
            title: '"Passed? Keep working for now, the contract will come later."',
            desc: 'You passed the final exam and keep working without a new contract.',
            verdictShort: 'Then you automatically have a permanent employment contract.',
            verdictDetail: 'The training ends when the **exam result is announced** if you pass before the contractual end date (§ 21 (2) BBiG). If you **keep working** afterwards without anything else being expressly agreed, a **permanent employment relationship** arises automatically (§ 24 BBiG) — with a skilled worker\'s salary instead of training pay. A fixed-term contract presented later no longer changes that, because a fixed term must be agreed in writing before work begins. Your salary then follows the collective agreement, your agreement, or what is customary at the company for comparable skilled workers.',
            laws: [
                { title: '§ 21 (2) BBiG – End', text: 'If trainees pass the final exam before the end of the training period, the training relationship ends when the examination board announces the result.' },
                { title: '§ 24 BBiG – Continued work', text: 'If trainees are employed after the training relationship without anything being expressly agreed, an employment relationship of indefinite duration is deemed to have been established.' },
                { title: '§ 14 (4) TzBfG – Written form', text: 'A fixed term in an employment contract must be in writing to be effective.' }
            ],
            tips: [
                'Note the date on which the result was announced to you.',
                'From then on you are entitled to a skilled worker\'s salary — not training pay.',
                'Do not sign a fixed-term contract presented afterwards without checking it.',
                'Get your continued employment confirmed in writing.'
            ],
            email: {
                subject: 'Continued employment after passing the final exam',
                body: `Dear [name of trainer],

on [date] the result of my passed final exam was announced to me. Since then I have continued working at the company without a separate agreement.

Under § 24 BBiG an employment relationship of indefinite duration has thus been established. I would ask for written confirmation and for information about my salary from [date].

Kind regards
[Your name]`
            }
        },
        'verguetung-zu-spaet': {
            title: '"Your pay is coming a bit later this month."',
            desc: 'Your training pay is not in your account at the end of the month.',
            verdictShort: 'It must arrive by the last working day of the month at the latest.',
            verdictDetail: 'Training pay for the current month must be paid **no later than the last working day of the month** (§ 18 (2) BBiG). That is a fixed statutory deadline — payment "in the middle of next month" is not allowed for trainees, not even by contract (§ 25 BBiG). If the company does not pay, it is **in default** from the following day and owes **default interest** (§§ 286, 288 BGB). If pay is repeatedly or permanently withheld, that can be a **good cause** for you to terminate the training yourself (§ 22 (2) no. 1 BBiG) — get advice before doing so.',
            laws: [
                { title: '§ 18 (2) BBiG – Due date', text: 'Pay for the current calendar month is due no later than the last working day of the month.' },
                { title: '§ 286 BGB – Default', text: 'If a calendar date is set for performance, the debtor is in default without a reminder if it does not perform on time.' },
                { title: '§ 25 BBiG – Mandatory', text: 'Agreements deviating from these provisions to the trainee\'s disadvantage are void.' }
            ],
            tips: [
                'Remind them politely but in writing, stating the due date.',
                'If there is a reason (e.g. an accounting error), ask for a fixed date.',
                'If it keeps happening: involve the IHK/HWK or your union.',
                'Serious arrears can be claimed through the labour court.'
            ],
            email: {
                subject: 'Outstanding training pay for [month]',
                body: `Dear [name of trainer],

my training pay for [month] has not yet arrived in my account. Under § 18 (2) BBiG, pay is due no later than the last working day of the month.

Please transfer it by [date] at the latest and let me know briefly if there is a delay.

Kind regards
[Your name]`
            }
        },
        'ausbildungskosten-zurueck': {
            title: '"If you quit, you pay back the training costs."',
            desc: 'Your contract contains a repayment clause or contractual penalty for quitting.',
            verdictShort: 'Such clauses are void in a training contract.',
            verdictDetail: 'The Vocational Training Act expressly prohibits trainees paying for their training. **Void** are agreements on **compensation for the vocational training**, **contractual penalties**, **excluding or limiting damage claims** and **damages as flat amounts** (§ 12 (2) BBiG). A clause "if you quit you pay €X" or "repayment of course costs" is therefore invalid — whether or not you signed it. The rest of the contract remains valid. Only for genuine, proven damage after an unjustified ending of the contract can the company claim compensation, and strict deadlines apply (§ 23 BBiG).',
            laws: [
                { title: '§ 12 (2) BBiG – Void agreements', text: 'Agreements obliging trainees to pay compensation for their training, contractual penalties, excluding or limiting damage claims and setting damages as flat amounts are void.' },
                { title: '§ 23 BBiG – Damages', text: 'If the training relationship is ended early after probation, damage claims can only be asserted within three months of its end.' }
            ],
            tips: [
                'Do not sign a repayment agreement — it would be void anyway.',
                'If money is withheld from your last pay, reclaim it in writing.',
                'Have the contract checked by the IHK/HWK — it only registers lawful contracts.',
                'Further training AFTER your apprenticeship may be governed differently.'
            ],
            email: {
                subject: 'Claim for repayment of training costs',
                body: `Dear [name],

you are demanding payment of [€X] from me for [training costs / contractual penalty]. Agreements under which trainees pay compensation for their training or a contractual penalty are void under § 12 (2) BBiG.

I therefore reject the claim and ask for the withheld amount to be paid out by [date].

Kind regards
[Your name]`
            }
        },
        'lehrgeld': {
            title: '"You pay a fee for the training place."',
            desc: 'You are supposed to pay an apprenticeship fee, school fee or a fee for the training place.',
            verdictShort: 'No — in dual training you pay nothing, you get paid.',
            verdictDetail: 'In **dual training under the BBiG or the Crafts Code** you are entitled to **appropriate pay** (§ 17 BBiG), and any agreement requiring you to pay for the training is **void** (§ 12 (2) no. 1 BBiG). "Apprenticeship fees" have not existed for decades. It is different for **school-based training** at private schools (e.g. some health or design occupations): school fees may apply there because there is no training contract with a company. So check whether your contract is a vocational training contract registered with the chamber.',
            laws: [
                { title: '§ 12 (2) no. 1 BBiG – Void', text: 'An agreement obliging trainees to pay compensation for their vocational training is void.' },
                { title: '§ 17 (1) BBiG – Pay', text: 'Trainers must grant trainees appropriate pay.' }
            ],
            tips: [
                'Do not pay anything up front — reputable training companies do not charge money.',
                'Ask whether the contract will be registered with the IHK/HWK.',
                'For school-based training: check school fee reimbursement or BAföG.',
                'Suspect a scam? Inform the chamber or a consumer advice centre.'
            ]
        },
        'bleibeverpflichtung': {
            title: '"After the training you stay with us for two years — it\'s in the contract."',
            desc: 'The training contract obliges you to stay at the company after qualifying.',
            verdictShort: 'Such a clause is void — unless agreed voluntarily in the last six months.',
            verdictDetail: 'Agreements that **restrict** your professional activity for the time **after the training** are **void** (§ 12 (1) BBiG). This includes stay-on clauses, non-compete clauses and "you may not go to a competitor". After your training you are free to choose where you work. **The only exception:** you voluntarily commit **within the last six months** of the training to enter into employment with your training company afterwards. A clause signed when the contract was concluded does not apply.',
            laws: [
                { title: '§ 12 (1) BBiG – Void agreements', text: 'An agreement restricting trainees in their professional activity after the end of the training relationship is void. This does not apply if trainees commit within the last six months to enter into employment with the trainer afterwards.' }
            ],
            tips: [
                'You can ignore a stay-on clause in your training contract.',
                'If you get an offer in the last six months, check pay and duration calmly.',
                'Threats of repayment if you leave are also void (§ 12 (2) BBiG).',
                'Want to stay? Then negotiate the offer confidently.'
            ]
        },
        'kost-und-logis': {
            title: '"We\'ll deduct food and your room from your pay."',
            desc: 'The company provides accommodation or meals and offsets them against your pay.',
            verdictShort: 'Allowed — but at most at official benefit-in-kind values and never more than 75% of pay.',
            verdictDetail: 'Benefits in kind such as **accommodation** or **meals** may be offset against pay, but only at the official social-insurance **benefit-in-kind values** — not at an invented price — and **at most up to 75% of gross pay** (§ 17 (6) BBiG). So at least a quarter must always remain for you in cash. It must be agreed, usually in the training contract. If you cannot use the benefit for a legitimate reason (e.g. because you are ill at home), it is paid to you in cash (§ 19 (2) BBiG). This occurs mainly in hotels, hospitality and agriculture.',
            laws: [
                { title: '§ 17 (6) BBiG – Benefits in kind', text: 'Benefits in kind may be offset at the benefit-in-kind values set under SGB IV, but not beyond 75 percent of gross pay.' },
                { title: '§ 19 (2) BBiG – Cash compensation', text: 'If trainees cannot take benefits in kind for a legitimate reason during the period of continued pay, these are to be compensated at the benefit-in-kind values.' }
            ],
            tips: [
                'Check your payslip: the deduction must be shown as a benefit in kind.',
                'Compare it with the current official benefit-in-kind values.',
                'Do the maths: at least 25% of your gross pay must be paid in cash.',
                'If nothing was agreed, nothing may be deducted.'
            ],
            email: {
                subject: 'Offsetting of benefits in kind',
                body: `Dear [name of trainer],

[€X] for [accommodation / meals] was deducted from my payslip for [month]. Under § 17 (6) BBiG, benefits in kind may only be offset at the official benefit-in-kind values and not beyond 75% of gross pay.

Please check and explain the calculation.

Kind regards
[Your name]`
            }
        },
        'weihnachtsgeld-azubi': {
            title: '"Only permanent staff get a Christmas bonus."',
            desc: 'Everyone at the company gets a Christmas or holiday bonus, except the trainees.',
            verdictShort: 'There is no statutory right — but a collective agreement, contract or equal treatment can give one.',
            verdictDetail: 'There is no **statutory** Christmas or holiday bonus. A right can arise, however, from a **collective agreement** (often expressly including trainees), your **training contract**, a **works agreement** or **company practice** (the company has paid it without reservation for several years). If the company pays voluntarily, it must observe the **principle of equal treatment**: it may only exclude groups for an **objective reason**. Such a reason can lie in the purpose of the payment (e.g. rewarding company loyalty); a mere "trainees get nothing" is not always enough.',
            laws: [
                { title: 'Principle of equal treatment (BAG)', text: 'If an employer grants voluntary benefits according to a recognisable system, it may not exclude individual employees or groups without an objective reason.' },
                { title: '§ 10 (2) BBiG – Applicable law', text: 'The legal provisions and principles applicable to employment contracts apply to the training contract.' }
            ],
            tips: [
                'Look in the collective agreement and training contract for "annual special payment".',
                'Ask the works council whether there is a works agreement.',
                'Ask politely why trainees are excluded.',
                'If the company used to include trainees, a company practice may exist.'
            ]
        },
        'fahrtkosten-arbeit': {
            title: '"Nobody pays for your commute."',
            desc: 'You commute to work every day and wonder whether you are entitled to anything.',
            verdictShort: 'Usually true — but you get something back through your tax return.',
            verdictDetail: 'The way from home to work is generally **your own business**; the company does not have to pay for it unless a collective or training contract says so. Many companies voluntarily pay for a **job ticket** or a subsidy — **tax-free** for public transport (§ 3 no. 15 EStG). In your **tax return** you can claim the **commuter allowance**: since 2026 **38 cents per kilometre** of the one-way distance, from the first kilometre (§ 9 (1) no. 4 EStG). This is worthwhile above all if income tax was withheld. Trips to changing work locations or to inter-company courses are a different matter (see "Travel time to a branch").',
            laws: [
                { title: '§ 9 (1) no. 4 EStG – Commuter allowance', text: 'For trips between home and the first place of work, a commuter allowance per full kilometre of distance is to be applied for each working day (since 2026: €0.38 from the first kilometre).' },
                { title: '§ 3 no. 15 EStG – Job ticket', text: 'Employer subsidies for public transport paid in addition to the wages already owed are tax-free.' }
            ],
            tips: [
                'Ask about a job ticket or travel subsidy — many companies pay voluntarily.',
                'File a tax return: as a trainee you often get withheld income tax back in full.',
                'Note your working days and the distance for the commuter allowance.'
            ]
        },
        'kindergeld-bab': {
            title: '"As a trainee you don\'t get child benefit any more."',
            desc: 'You now earn money yourself and wonder about child benefit and allowances.',
            verdictShort: 'Yes you do — during your first training there is child benefit, however much you earn.',
            verdictDetail: 'For children in their **first vocational training** there is **child benefit until the 25th birthday**, **regardless of how much training pay you earn** (§ 32 (4) EStG). It is usually paid to your parents, who can pass it on to you. If, because of the training, you **no longer live with your parents** because the company is too far away, you can apply for **vocational training allowance (BAB)** at the employment agency (§§ 56 ff. SGB III); whether and how much you receive depends on your income and your parents\'. For your own flat, housing benefit may also be an option.',
            laws: [
                { title: '§ 32 (4) EStG – Children in training', text: 'A child aged 18 but not yet 25 is taken into account if being trained for an occupation; in first training without any check of employment.' },
                { title: '§ 56 SGB III – Vocational training allowance', text: 'Trainees are entitled to vocational training allowance during eligible training if they belong to the eligible group and do not have the necessary funds otherwise.' }
            ],
            tips: [
                'Your parents must report your training start to the family benefits office — attach the training contract.',
                'Use the employment agency\'s BAB calculator before applying.',
                'Apply for BAB before your training starts if possible — little is paid retroactively.',
                'After your first training, stricter child benefit rules apply.'
            ]
        },
        'probezeit-weniger-geld': {
            title: '"During probation you get less money."',
            desc: 'The company wants to pay lower pay in the first months.',
            verdictShort: 'No — the full pay applies from the first day.',
            verdictDetail: 'Probation is part of the training, and the agreed **appropriate pay** applies **from the first day** (§ 17 BBiG). A lower "probation pay" below the minimum for your start year or below the applicable collective agreement is not allowed, and agreements to your disadvantage are **void** (§ 25 BBiG). Pay rises with the **training year**, not with the end of probation. If you received too little, you can claim the difference.',
            laws: [
                { title: '§ 17 (1) BBiG – Pay', text: 'Trainers must grant trainees appropriate pay; it rises as the training progresses, at least annually.' },
                { title: '§ 25 BBiG – Mandatory', text: 'An agreement deviating from these provisions to the trainee\'s disadvantage is void.' }
            ],
            tips: [
                'Compare your first payslip with the pay in your training contract.',
                'Check that it is at least the minimum for your start year.',
                'Claim any difference in writing — with month and amount.',
                'The IHK/HWK will help if the company does not give in.'
            ],
            email: {
                subject: 'Amount of my training pay during probation',
                body: `Dear [name of trainer],

for the months [months] I was paid [€X], whereas my training contract provides for [€Y]. Lower pay during probation is not permitted under §§ 17, 25 BBiG.

Please pay the difference totalling [€Z] with the next payslip.

Kind regards
[Your name]`
            }
        },
        'krankmeldung-ab-tag-eins': {
            title: '"With us you need a sick note from day one."',
            desc: 'You are ill for a day and are supposed to get a doctor\'s note for that.',
            verdictShort: 'Yes, the company may require that.',
            verdictDetail: 'You must report illness to the company **without delay**, i.e. on the first day, ideally before work starts — the company decides how (usually by phone). By law a **medical certificate** is only needed from the **fourth calendar day**, but the employer **may require it earlier**, even from the first day (§ 5 (1) EntgFG). Since 2023 there is the **electronic sick note (eAU)**: the doctor certifies the incapacity, and the company retrieves it from your health insurer. Your part is to see the doctor in time and inform the company. If the rule applies only to you, no special reason is required, but it must not be harassment.',
            laws: [
                { title: '§ 5 (1) EntgFG – Duty to notify and prove', text: 'The employee must report incapacity for work and its expected duration without delay. If it lasts longer than three calendar days, a medical certificate must be provided; the employer may demand it earlier.' }
            ],
            tips: [
                'Report before work starts — even if you are only going to the doctor afterwards.',
                'Say how long you expect to be away; you do not have to give a diagnosis.',
                'On school days, also inform the school according to its rules.',
                'Keep the printouts of the eAU for your records.'
            ]
        },
        'diagnose-chef': {
            title: '"What\'s wrong with you? I want to know the diagnosis."',
            desc: 'Your trainer asks what illness you have or wants to see the diagnosis.',
            verdictShort: 'No — the diagnosis is none of the company\'s business.',
            verdictDetail: 'You only have to tell the company **that** you are unfit for work and for **how long** you expect to be (§ 5 EntgFG). You **do not have to name the diagnosis** — which is why it does not appear on the employer\'s copy or in the eAU it retrieves. Health data are specially protected (Art. 9 GDPR). **Exceptions** are rare: e.g. contagious diseases that endanger colleagues, when a continuing illness has to be clarified for continued pay (that goes through the health insurer), or in the case of a work accident. Of course you may voluntarily tell whatever you want.',
            laws: [
                { title: '§ 5 (1) EntgFG – Notification', text: 'The incapacity for work and its expected duration must be reported — not its cause.' },
                { title: 'Art. 9 (1) GDPR – Health data', text: 'Processing of health data is prohibited in principle unless an exception applies.' }
            ],
            tips: [
                'A polite "I\'d like to keep that to myself" is enough.',
                'With contagious illnesses: give a hint to protect colleagues, without details.',
                'If the illness is work-related (accident, strain), say so — then other rules apply.',
                'You can report repeated probing to the JAV or works council.'
            ]
        },
        'krank-arbeiten': {
            title: '"You\'re ill? Then just work from home."',
            desc: 'You are on sick leave and are still supposed to answer emails or do tasks.',
            verdictShort: 'No — anyone unfit for work does not have to work.',
            verdictDetail: 'Being on sick leave means you are **unfit for work**: you **do not have to work**, not even from home, answer emails or be reachable. Your pay continues for up to six weeks (§ 3 EntgFG). The company may not pressure you to work anyway or disadvantage you for recovering. You should behave in a way that helps you get well quickly — going for a walk or shopping is allowed if it does not hinder recovery. Brief information that only you can give (e.g. where a key is) is reasonable as an exception.',
            laws: [
                { title: '§ 3 (1) EntgFG – Continued pay', text: 'An employee prevented from working by incapacity due to illness through no fault of their own is entitled to continued pay for up to six weeks.' }
            ],
            tips: [
                'Reply politely that you are on sick leave and state when it ends.',
                'Switch on an out-of-office message and turn off the work phone.',
                'Working anyway can endanger your recovery — and your insurance cover is unclear.',
                'Repeated pressure: involve the JAV, works council or IHK/HWK.'
            ],
            email: {
                subject: 'Availability during my sick leave',
                body: `Dear [name of trainer],

I am signed off sick until [date] and cannot take on any tasks during this time, not even from home.

As soon as I am well again, I will gladly take care of [task].

Kind regards
[Your name]`
            }
        },
        'krank-berufsschule': {
            title: '"Sick for work, but you\'re going to school."',
            desc: 'You are on sick leave, and the company thinks you can still go to vocational school.',
            verdictShort: 'Being unfit for work also covers vocational school.',
            verdictDetail: 'Incapacity for work relates to your **training as a whole** — which includes vocational school. Anyone unfit for work due to illness also does **not have to go to school**. Conversely: anyone well enough for school is usually not unfit for work either. The **school\'s** own rules apply in addition: you usually have to report your absence there on the first day and provide an **excuse**, often regardless of the sick note for the company. If an exam falls during your illness, you usually need a medical certificate for the chamber to withdraw.',
            laws: [
                { title: '§ 3 EntgFG – Incapacity for work', text: 'Anyone who cannot perform their contractual activity due to illness is unfit for work; for trainees this includes attending vocational school.' },
                { title: 'State school laws', text: 'Vocational students must excuse absences according to their school\'s rules.' }
            ],
            tips: [
                'On the day you are ill, report to the company AND the school.',
                'Ask the school what excuse it needs (form, copy of the sick note).',
                'Ill on exam day: inform the chamber immediately and get a certificate.',
                'Catch up on missed material with classmates — it helps with your training log.'
            ]
        },
        'krankheit-urlaub-abziehen': {
            title: '"We\'ll deduct your sick days from your leave."',
            desc: 'The company wants to offset days off sick against your leave account.',
            verdictShort: 'No — illness and vacation have nothing to do with each other.',
            verdictDetail: 'Sick days are **incapacity for work**, not vacation. Continued pay applies to them (§ 3 EntgFG), and your leave entitlement remains **untouched**. Offsetting them against leave is not allowed. This even applies if you fall ill **during** your vacation: days of incapacity proven by a medical certificate are **not** counted against your annual leave (§ 9 BUrlG). Cutting your leave because of many sick days in the year is not allowed either — the statutory minimum leave accrues even during long illness.',
            laws: [
                { title: '§ 9 BUrlG – Illness during vacation', text: 'If an employee falls ill during vacation, the days of incapacity proven by a medical certificate are not counted against the annual leave.' },
                { title: '§ 3 EntgFG – Continued pay', text: 'In case of incapacity due to illness through no fault of one\'s own, there is a right to continued pay for up to six weeks.' }
            ],
            tips: [
                'Check your leave account after every illness.',
                'Request a correction in writing, stating the days of your sick note.',
                'Ill on vacation? Report immediately and get a sick note — otherwise the days count as leave.',
                'Have your leave balance confirmed regularly.'
            ],
            email: {
                subject: 'Correction of my leave account',
                body: `Dear [name of trainer],

the days of my incapacity for work from [date] to [date] were deducted from my leave account. Sick days are not recreational leave; offsetting them against leave is not permitted (cf. § 9 BUrlG, § 3 EntgFG).

Please correct my leave account by [number] days.

Kind regards
[Your name]`
            }
        },
        'selbst-kuendigen': {
            title: '"You want to quit? It\'s not that easy."',
            desc: 'You want to drop out of the training or switch to another occupation or company.',
            verdictShort: 'You can resign — how depends on probation and the reason.',
            verdictDetail: '**During probation** you can resign at any time **without notice and without giving reasons** (§ 22 (1) BBiG). **After that** you have two options: with **four weeks\' notice** if you **give up the training entirely** or want to train for **another occupation** (§ 22 (2) no. 2 BBiG), or **without notice for good cause**, e.g. serious breaches of duty by the company (no. 1). If you want to learn **the same occupation at another company**, that is not a reason under no. 2 — then it works through a **termination agreement** by mutual consent or a good cause. Notice must always be **in writing**, after probation stating the reasons (§ 22 (3) BBiG). If you are under 18, your parents must sign.',
            laws: [
                { title: '§ 22 (1) BBiG – Probation', text: 'During probation the training relationship can be terminated at any time without notice.' },
                { title: '§ 22 (2) BBiG – After probation', text: 'After probation, termination is only possible for good cause without notice, or by trainees with four weeks\' notice if they give up the training or want to train for another occupation.' },
                { title: '§ 22 (3) BBiG – Form', text: 'Termination must be in writing and, in the cases of paragraph 2, state the reasons; electronic form is excluded.' }
            ],
            tips: [
                'Talk to the IHK/HWK training advisers first — there is often a solution.',
                'For a change of company in the same occupation: termination agreement and new contract, the time is credited.',
                'Notice on paper, signed, with proof of delivery (handed over with a witness or by registered mail).',
                'Watch out for unemployment benefit blocking periods if you leave without a follow-up.'
            ],
            email: {
                subject: 'Termination of my training relationship (template for the letter)',
                body: `[Your name, address]
[Company name, address]
[Place, date]

Termination of the vocational training relationship

Dear [name],

I hereby terminate my vocational training relationship of [contract date] with four weeks' notice as of [date].

Reason: I am giving up the vocational training / I want to train for the occupation of [other occupation] (§ 22 (2) no. 2 BBiG).

Please confirm receipt of this notice and issue me a training certificate (§ 16 BBiG).

Kind regards
[Signature]
[signature of parents/guardians if applicable]`
            }
        },
        'kuendigung-whatsapp': {
            title: '"You\'re fired." — via WhatsApp',
            desc: 'The termination arrives as a message, an email or only verbally.',
            verdictShort: 'Invalid — a termination must be on paper and signed.',
            verdictDetail: 'Terminating a training relationship must be done **in writing**, and **electronic form is expressly excluded** (§ 22 (3) BBiG). A termination by **WhatsApp, text, email, a photo of a letter or verbally** is therefore **invalid** — your training relationship continues, and so does your right to pay. In writing means: a paper with a **handwritten signature** (§ 126 BGB). After probation the notice must also state the **reasons**. For minors it must reach the parents. Important: keep turning up for training or offering your work, otherwise there may be a dispute about pay.',
            laws: [
                { title: '§ 22 (3) BBiG – Form', text: 'Termination must be in writing; electronic form is excluded.' },
                { title: '§ 126 (1) BGB – Written form', text: 'Where written form is required by law, the document must be signed by the issuer by hand with their name.' }
            ],
            tips: [
                'Take a screenshot of the message, but do not reply with "okay".',
                'Keep offering your work in writing — you are still a trainee.',
                'If a written termination follows: watch the deadline for a lawsuit or the arbitration committee.',
                'Get advice immediately: IHK/HWK, union or a specialist lawyer.'
            ],
            email: {
                subject: 'Your message of [date]',
                body: `Dear [name],

your message of [date] via [WhatsApp / email] cannot end my training relationship. Under § 22 (3) BBiG termination must be in writing; electronic form is excluded.

My training relationship therefore continues. I continue to offer my work and will come to the company as usual on [date].

Kind regards
[Your name]`
            }
        },
        'uebernahme': {
            title: '"Being kept on? You have no right to that."',
            desc: 'The end of your training is approaching and you do not know if you will be kept on.',
            verdictShort: 'Mostly true — except for JAV and works council members or under collective agreements.',
            verdictDetail: 'There is **no general right** to be kept on: the training relationship ends when you pass the exam or at the end of the contract. **Exceptions:** if you are a member of the **JAV, the works council** or another employee representation, the company must tell you in writing **three months before the end** if it does not intend to keep you; if you request continued employment in writing in the last three months, a permanent employment relationship is deemed established (§ 78a BetrVG), unless a court decides otherwise. Many **collective agreements** (e.g. metal and electrical industry) provide for fixed-term retention. And: if you keep working after the end without an arrangement, you are permanently employed (§ 24 BBiG).',
            laws: [
                { title: '§ 78a (2) BetrVG – Continued employment', text: 'If a trainee who is a member of the youth and trainee representation or the works council requests continued employment in writing within the last three months before the end, a permanent employment relationship is deemed established.' },
                { title: '§ 12 (1) BBiG – Commitment', text: 'In the last six months of training, trainees can validly commit to entering into employment with the training company afterwards.' }
            ],
            tips: [
                'Ask about your chances no later than six months before the end.',
                'Check the collective agreement for a retention rule.',
                'As a JAV or works council member: request continued employment in writing in the last three months.',
                'Register as a job seeker with the employment agency no later than three months before the end.'
            ]
        },
        'kuendigung-wegen-krankheit': {
            title: '"You\'re ill too often — we have to part ways."',
            desc: 'The company threatens dismissal because of frequent illness.',
            verdictShort: 'Possible during probation — hardly afterwards.',
            verdictDetail: '**During probation** the company can terminate without a reason, so also because of illness (§ 22 (1) BBiG). **After probation** the company can only terminate **for good cause** (§ 22 (2) no. 1 BBiG), and **illness is generally not a good cause**: it is not your fault. Only in extreme exceptional cases, e.g. if it is certain that the training goal can permanently no longer be reached because of the illness, can termination be considered. Long absences may, however, mean the training has to be **extended** (§ 8 (2) BBiG). Faking illness, on the other hand, is a serious breach of duty.',
            laws: [
                { title: '§ 22 (2) no. 1 BBiG – Good cause', text: 'After probation, the training relationship can only be terminated by the trainer for good cause without notice.' },
                { title: '§ 8 (2) BBiG – Extension', text: 'In exceptional cases, the competent body can extend the training period on the trainee\'s application if this is necessary to reach the training goal.' }
            ],
            tips: [
                'Report every illness properly and on time — that takes away the company\'s arguments.',
                'For longer illness: apply to the chamber to extend your training.',
                'Work-related illness (allergy, back)? Raise health protection.',
                'Received notice? Get advice immediately, deadlines are running.'
            ]
        },
        'schwangerschaft': {
            title: '"Pregnant during your training — that doesn\'t work here."',
            desc: 'You are pregnant and worried about your training place.',
            verdictShort: 'Dismissal is prohibited — and the training can be adapted.',
            verdictDetail: 'From the start of the pregnancy until **four months after giving birth**, the company may **not dismiss you** (§ 17 MuSchG) — not even during probation if it knows about the pregnancy or is told within two weeks of the dismissal. The **Maternity Protection Act** expressly applies to trainees: there are employment bans for dangerous work, protection periods before and after birth, and paid time off for check-ups. Afterwards the training can continue **part-time** (§ 7a BBiG) or be **extended** on application (§ 8 (2) BBiG); parental leave is also possible and extends the training.',
            laws: [
                { title: '§ 17 (1) MuSchG – Ban on dismissal', text: 'Dismissing a woman is not permitted during her pregnancy and until four months after giving birth if the employer knows about the pregnancy or is told within two weeks.' },
                { title: '§ 7a BBiG – Part-time training', text: 'Vocational training can be carried out part-time; daily or weekly training time can be reduced by at most 50 percent.' }
            ],
            tips: [
                'Tell the company about the pregnancy as soon as you feel ready — only then does the protection apply in practice.',
                'Ask for the risk assessment of your workplace to be explained.',
                'Talk to the IHK/HWK about part-time training or an extension.',
                'Advice is also available from pregnancy counselling services and your union.'
            ]
        },
        'insolvenz-betrieb': {
            title: '"The company is bankrupt — what happens to you?"',
            desc: 'Your training company is insolvent or closing.',
            verdictShort: 'Your pay is secured for three months — and the chamber helps you switch.',
            verdictDetail: 'Insolvency does **not automatically** end your training relationship. Outstanding pay for the **three months before insolvency proceedings open** is paid by the employment agency as **insolvency benefit** (§§ 165 ff. SGB III) — you must apply within **two months**. If the company closes down completely, training may become impossible; then termination for good cause is conceivable. The **IHK/HWK** helps you find a new training company, and your previous training time is **credited**. If the company is sold, you usually transfer to the new owner.',
            laws: [
                { title: '§ 165 SGB III – Insolvency benefit', text: 'Employees are entitled to insolvency benefit for the preceding three months of employment if they still have pay claims when insolvency occurs; trainees are included.' },
                { title: '§ 324 (3) SGB III – Deadline', text: 'Insolvency benefit must be applied for within an exclusion period of two months after the insolvency event.' }
            ],
            tips: [
                'Inform the IHK/HWK immediately — they know about open training places.',
                'Apply for insolvency benefit within two months.',
                'Get an interim reference and confirmation of your training time so far.',
                'Do not sign a termination agreement without advice.'
            ]
        },
        'probezeit-verlaengert': {
            title: '"We\'re extending your probation by three months."',
            desc: 'Shortly before probation ends, the company wants to extend it.',
            verdictShort: 'Four months maximum — extension only after a long interruption.',
            verdictDetail: 'Probation must last **at least one and at most four months** (§ 20 BBiG). A longer probation or an extension beyond four months is not allowed, and agreements to that effect are void (§ 25 BBiG). Case law recognises only one exception: if the training was **substantially interrupted** during probation (e.g. long illness, more than a third of the probation) and the contract says it is then extended, it can run longer by the length of the interruption. "We\'re not sure yet" is not enough. After probation, the company can only terminate for good cause.',
            laws: [
                { title: '§ 20 BBiG – Probation', text: 'The training relationship begins with probation. It must be at least one month and at most four months.' },
                { title: '§ 25 BBiG – Mandatory', text: 'An agreement deviating from these provisions to the trainee\'s disadvantage is void.' }
            ],
            tips: [
                'Work out when your probation ends according to the contract.',
                'Do not sign an extension if there was no long interruption.',
                'Ask what specifically should be improved — and work on it.',
                'If unsure: call the IHK/HWK training advisers.'
            ],
            email: {
                subject: 'Extension of probation',
                body: `Dear [name of trainer],

you have suggested extending my probation until [date]. Under § 20 BBiG probation may last at most four months; an agreement beyond that is void under § 25 BBiG.

I am happy to talk with you about what I can improve in my training.

Kind regards
[Your name]`
            }
        },
        'anschreien-beleidigung': {
            title: '"Are you too stupid for this?" — your boss yells at you.',
            desc: 'Your trainer or colleagues yell at you, insult or humiliate you.',
            verdictShort: 'No — nobody has to put up with insults and humiliation.',
            verdictDetail: 'The company must ensure that you are **supported in your personal development** and **not endangered** (§ 14 (1) no. 5 BBiG). Yelling, insults, humiliating you in front of others or threats are incompatible with that — and can be an **insult under criminal law** (§ 185 StGB). You have a **right to complain** (§ 84 BetrVG), even without a works council, and may not suffer any disadvantage for it. Criticism of your work is allowed — the tone is not. If it continues, it can be a good cause to end the training or change companies; the chamber will support you.',
            laws: [
                { title: '§ 14 (1) no. 5 BBiG – Duty of protection', text: 'Trainers must ensure that trainees are supported in their character development and are not endangered morally or physically.' },
                { title: '§ 84 BetrVG – Right to complain', text: 'Every employee has the right to complain to the responsible bodies in the company if they feel disadvantaged, treated unfairly or otherwise impaired.' },
                { title: '§ 185 StGB – Insult', text: 'Insult is punishable by imprisonment of up to one year or a fine.' }
            ],
            tips: [
                'Keep a log: date, time, exact words, witnesses.',
                'Say calmly and clearly: "Please speak to me in a normal tone."',
                'Talk to the JAV, works council or a person you trust.',
                'The IHK/HWK training advisers are responsible for this too — confidentially.'
            ],
            email: {
                subject: 'Tone on [date]',
                body: `Dear [name],

on [date] I was yelled at in [situation] and called [words]. I take criticism of my work seriously and want to learn from it — but I do not want to accept such a tone.

I would ask for a conversation about how we can work together objectively in future. [JAV / works council / person of trust] is welcome to take part.

Kind regards
[Your name]`
            }
        },
        'hitze-arbeitsplatz': {
            title: '"35 degrees in the office? You\'ll have to cope."',
            desc: 'In summer it gets extremely hot at work, and nothing happens.',
            verdictShort: 'There is no "too hot to work" day off — but action should be taken from 26 °C and must be from 30 °C.',
            verdictDetail: 'There is no right to a **heat day off**. The **technical rule for workplaces ASR A3.5** sets thresholds, however: in work rooms the air temperature **should** not exceed **26 °C**. Above 26 °C measures **should**, above **30 °C must** be taken — e.g. blinds, ventilating in the morning, flexitime, relaxed dress rules and drinks. Above **35 °C**, a room is **not suitable as a work room** without special measures (air showers, cooling breaks, heat protection clothing). For **young people** and pregnant women a special risk assessment applies. If there is a concrete health hazard, you may stop working at that spot and must report it immediately.',
            laws: [
                { title: 'ASR A3.5 – Room temperature', text: 'Air temperature in work rooms should not exceed +26 °C; above +30 °C effective measures must be taken, above +35 °C the room is not suitable as a work room without technical or organisational measures.' },
                { title: '§ 3a ArbStättV – Setting up and operating', text: 'The employer must ensure that workplaces are operated in such a way that they pose no hazards to safety and health.' }
            ],
            tips: [
                'Measure the temperature and note readings with the time.',
                'Suggest concrete measures: start earlier, fan, drinks, blinds.',
                'If you feel dizzy or sick: stop working, tell someone, first aid.',
                'With a works council: it co-determines health protection.'
            ],
            email: {
                subject: 'Temperature at the workplace',
                body: `Dear [name],

at my workplace [room] I have measured temperatures of [X °C] in recent days ([date, time]). Under ASR A3.5, measures to protect employees must be taken from 30 °C.

I suggest: [e.g. earlier start / fan / drinks]. Please let me know briefly which measures will be taken.

Kind regards
[Your name]`
            }
        },
        'alkohol-rauchen': {
            title: '"Come on, a beer after work — are you in?"',
            desc: 'Alcohol at work, after-work beers, smoking at the workplace — what applies?',
            verdictShort: 'Clear bans apply to minors — and for everyone: do not work intoxicated.',
            verdictDetail: 'The employer may not give **young people alcoholic drinks or tobacco** whose sale is prohibited under the Youth Protection Act (§ 31 (2) JArbSchG) — so no alcohol at all under 16, and no spirits and no cigarettes or e-cigarettes under 18. For **everyone**: you may not put yourself into a state through alcohol or drugs in which you endanger yourself or others (§ 15 DGUV Regulation 1). Many companies have a general alcohol ban. With **smoking**, the company must effectively protect non-smokers (§ 5 ArbStättV) — so you do not have to breathe in second-hand smoke. Nobody may pressure you to drink.',
            laws: [
                { title: '§ 31 (2) JArbSchG – Alcohol and tobacco', text: 'The employer may not give young people alcoholic drinks, tobacco products or other products named in §§ 9, 10 JuSchG whose sale to them is prohibited.' },
                { title: '§ 15 (2) DGUV Regulation 1 – Intoxicants', text: 'Insured persons may not put themselves, through alcohol, drugs or other intoxicants, into a state in which they can endanger themselves or others.' },
                { title: '§ 5 ArbStättV – Protection of non-smokers', text: 'The employer must take the necessary measures to effectively protect non-smoking employees from the health hazards of tobacco smoke.' }
            ],
            tips: [
                'A friendly "no thanks" is enough — nobody may pressure you.',
                'Under 18: the company may not give you spirits or cigarettes.',
                'Anyone working intoxicated at machines can quickly lose insurance cover.',
                'Bothered by smoke at work? Raise non-smoker protection in writing.'
            ]
        },
        'vertrag-nicht-eingetragen': {
            title: '"We don\'t need a written contract."',
            desc: 'You have started but received no training contract, or it is not registered with the chamber.',
            verdictShort: 'Yes you do — without a written record and registration, your exam admission is at risk.',
            verdictDetail: 'The company must set down the essential content of the training contract **in writing before training begins**, sign it and **hand it to you** (for minors also to the parents) (§ 11 BBiG). This includes occupation, start and duration, training plan, daily training time, probation, pay and leave. It must also **apply without delay for registration** in the register of training relationships at the IHK/HWK (§ 36 BBiG). This is crucial for you: only those whose training relationship is **registered** are admitted to the final exam — or those who prove that the missing registration is not their fault (§ 43 (1) no. 3 BBiG).',
            laws: [
                { title: '§ 11 (1) BBiG – Written record', text: 'Trainers must set down the essential content in writing without delay after concluding the training contract, at the latest before training begins.' },
                { title: '§ 36 (1) BBiG – Registration', text: 'Trainers must apply for entry in the register of training relationships without delay after concluding the contract.' },
                { title: '§ 43 (1) no. 3 BBiG – Admission', text: 'Anyone whose training relationship is registered, or is not registered for a reason they are not responsible for, is to be admitted to the final exam.' }
            ],
            tips: [
                'Request the contract in writing — you are entitled to it before you start.',
                'Ask the IHK/HWK whether your training relationship is registered.',
                'Keep all evidence: offer letter, payslips, school registration.',
                'If nothing happens, inform the chamber — it can require the company to register.'
            ],
            email: {
                subject: 'Training contract and registration with the chamber',
                body: `Dear [name of trainer],

I have been training as a [occupation] since [date]. I have not yet received a written training contract.

Under § 11 BBiG the essential content of the contract must be set down in writing and handed over before training begins; under § 36 BBiG registration with the [IHK/HWK] must be applied for. Please hand over the contract and briefly confirm the registration by [date].

Kind regards
[Your name]`
            }
        },
        'teilzeitausbildung': {
            title: '"Part-time training? That doesn\'t exist."',
            desc: 'You want to train part-time because of a child, caring duties, health or a side income.',
            verdictShort: 'It does — since 2020 possible for everyone if you and the company agree.',
            verdictDetail: 'Since 2020, **any** vocational training can be carried out **part-time**; a special reason such as a child or caring duties is no longer required (§ 7a BBiG). The requirement is an **agreement** with the company in the training contract — you have no unilateral right. Daily or weekly training time may be reduced by **at most 50%**. The **training period is extended** accordingly, to at most **one and a half times** the normal length. **Pay** may be reduced proportionally, but not more than the training time (§ 17 (5) BBiG). Part-time can be combined with shortening under § 8 BBiG.',
            laws: [
                { title: '§ 7a (1) BBiG – Part-time', text: 'Vocational training can be carried out part-time. The reduction of daily or weekly training time must be agreed in the training contract; it may not exceed 50 percent.' },
                { title: '§ 7a (2) BBiG – Duration', text: 'The duration of part-time training is extended accordingly, but at most to one and a half times the duration set in the training regulation.' },
                { title: '§ 17 (5) BBiG – Pay', text: 'In part-time training, pay may be reduced appropriately; the reduction may not exceed the reduction in training time.' }
            ],
            tips: [
                'Raise the wish early — ideally before signing the contract.',
                'The IHK/HWK advises on part-time models and registers them.',
                'Check support: BAB, child supplement or housing benefit can close the gap.',
                'School times stay the same — part-time applies to the company.'
            ]
        },
        'ausland': {
            title: '"A placement abroad during training? Impossible."',
            desc: 'You want to do part of your training abroad, e.g. with Erasmus+.',
            verdictShort: 'Possible — up to a quarter of the training period if it serves the training goal.',
            verdictDetail: 'Parts of vocational training can take place **abroad** if this **serves the training goal** (§ 2 (3) BBiG). In total they should not exceed **a quarter** of the training period. The stay abroad then counts as **part of the training**: your contract continues, as do pay and insurance, and the time is credited. You have no right to it — the company must agree. It is funded e.g. through **Erasmus+**, which subsidises travel, accommodation and a language course; the chambers or the vocational school often handle the organisation.',
            laws: [
                { title: '§ 2 (3) BBiG – Abroad', text: 'Parts of vocational training can be carried out abroad if this serves the training goal. Their total duration should not exceed a quarter of the training period set in the training regulation.' }
            ],
            tips: [
                'Ask the IHK/HWK for mobility advisers — they help with planning and funding.',
                'Agree with the company which content from the training plan you will learn there.',
                'Plan ahead: Erasmus+ applications often take several months.',
                'Document the stay in your training log like any other training time.'
            ]
        },
        'ausbildung-verlaengern': {
            title: '"Extend? You have to finish in the normal time."',
            desc: 'You were ill for a long time or are falling behind and want more time.',
            verdictShort: 'On your application the chamber can extend it — the company is only consulted.',
            verdictDetail: 'In exceptional cases the **chamber extends** the training period **on your application** if this is necessary to reach the training goal (§ 8 (2) BBiG). Typical reasons are **long illness**, pregnancy, serious shortcomings in the company\'s training, or learning difficulties. The company is **consulted** but does not have to agree. Different from this: if you fail the final exam, the training relationship is automatically extended at your **request** until the next retake, by at most one year (§ 21 (3) BBiG).',
            laws: [
                { title: '§ 8 (2) BBiG – Extension', text: 'In exceptional cases the competent body can extend the training period on the trainee\'s application if necessary to reach the training goal. The trainers are to be heard before the decision.' },
                { title: '§ 21 (3) BBiG – Not passed', text: 'If trainees do not pass the final exam, the training relationship is extended at their request until the next possible retake, by at most one year.' }
            ],
            tips: [
                'You apply to the chamber — early, not just before the exam.',
                'Document the reason (sick notes, absences, school reports).',
                'Talk to the company and the school before applying.',
                'Failed? Request the extension in writing — it then applies automatically.'
            ]
        },
        'gewerkschaft': {
            title: '"Union? If you join, you can leave."',
            desc: 'You want to join a union, and the company does not like it at all.',
            verdictShort: 'No — joining is your fundamental right, disadvantages because of it are prohibited.',
            verdictDetail: 'The right to form a union and **to join one** is a **fundamental right** (freedom of association, Art. 9 (3) GG). Agreements that restrict or hinder this right are **void**, and measures against it are **unlawful** — this is written directly in the Basic Law and also applies between you and your company. Dismissal, a warning or worse treatment because of membership is not allowed. The company may usually **not even ask** whether you are a member. Unions usually offer trainees low fees, legal advice and legal protection.',
            laws: [
                { title: 'Art. 9 (3) GG – Freedom of association', text: 'The right to form associations to safeguard and improve working and economic conditions is guaranteed to everyone and to all occupations. Agreements that restrict or seek to impair this right are void; measures directed to this end are unlawful.' }
            ],
            tips: [
                'Joining is your private business — you do not have to report it.',
                'Membership usually gives you free legal advice on employment law.',
                'If you are disadvantaged: note everything and involve the union.',
                'Many unions have their own youth and trainee groups.'
            ]
        },
        'streik-azubi': {
            title: '"Trainees aren\'t allowed to strike."',
            desc: 'Your union calls a warning strike, and you want to join in.',
            verdictShort: 'Yes they are — if it concerns your training conditions and the union calls for it.',
            verdictDetail: 'Trainees may take part in **strikes** if the union calls for them and the strike **also concerns their training conditions**, e.g. because training pay is being negotiated in the collective agreement. The Federal Labour Court has expressly recognised this for **short warning strikes**. During the strike there is **no pay**; union members usually receive **strike pay**. You may **not be dismissed** or warned for taking part in a lawful strike. A **"wildcat" strike** without a union call, on the other hand, is not protected, and **vocational school** remains compulsory even on strike days.',
            laws: [
                { title: 'Art. 9 (3) GG – Freedom of association', text: 'Freedom of association also protects union activity, including industrial action.' },
                { title: 'Federal Labour Court case law', text: 'Trainees may take part in short, time-limited warning strikes if the union is also negotiating their training pay.' }
            ],
            tips: [
                'Only join a strike your union has called.',
                'Register at the strike office — important for strike pay and proof.',
                'If the strike falls on a school day, school comes first.',
                'Exams are not strike days: do not strike on exam days.'
            ]
        },
        'betriebsversammlung': {
            title: '"Trainees don\'t need to go to the staff meeting."',
            desc: 'There is a works meeting, and you are supposed to keep working instead.',
            verdictShort: 'Yes they do — trainees are part of the workforce and may attend with pay.',
            verdictDetail: 'As a trainee you are an **employee within the meaning of the Works Constitution Act** and may attend **works meetings**. They usually take place **during working hours**, and the time spent attending, including extra travel time, is **paid like working time** (§ 44 BetrVG). The company may not keep you from it. If there is a **JAV**, it can also call its own **youth and trainee meeting** (§ 71 BetrVG), to which the same applies. There you can raise questions and problems about your training.',
            laws: [
                { title: '§ 42 (1) BetrVG – Works meeting', text: 'The works meeting consists of the employees of the company; it is chaired by the chair of the works council.' },
                { title: '§ 44 (1) BetrVG – Time and pay', text: 'Works meetings take place during working hours. The time of attendance including additional travel time is to be paid to employees like working time.' },
                { title: '§ 71 BetrVG – Youth and trainee meeting', text: 'The youth and trainee representation can, in agreement with the works council, call a company youth and trainee meeting before or after each works meeting.' }
            ],
            tips: [
                'The invitation is usually on the notice board or sent by the works council.',
                'Tell your trainer that you are attending.',
                'Use the meeting to raise training topics.',
                'The time counts as working time — record it in your time sheet.'
            ]
        }
    };

    // English keyword map (colloquial search terms → scenario ids).
    // Scenario title/desc/verdict text is also searched directly after
    // translation, so this map mainly covers synonyms and slang.
    var keywords = {
        // Working hours
        'overtime': ['ueberstunden'], 'extra hours': ['ueberstunden'], 'stay longer': ['ueberstunden'],
        'work longer': ['ueberstunden'], 'work more': ['ueberstunden'], 'too many hours': ['ueberstunden'],
        'weekend': ['wochenende'], 'saturday': ['wochenende'], 'sunday': ['wochenende'],
        'public holiday': ['wochenende', 'feiertagsarbeit'], 'holiday work': ['wochenende', 'feiertagsarbeit'], 'weekend work': ['wochenende'],
        'break': ['pause'], 'lunch break': ['pause'], 'no break': ['pause'], 'rest break': ['pause'],
        'eat': ['pause'], 'power through': ['pause'],
        'night work': ['nachtarbeit'], 'late shift': ['nachtarbeit'], 'night shift': ['nachtarbeit'],
        'evening': ['nachtarbeit'], 'at night': ['nachtarbeit'], 'shift work': ['nachtarbeit'], 'early shift': ['nachtarbeit'],
        'rest period': ['ruhezeit-zwischen-schichten'], '11 hours': ['ruhezeit-zwischen-schichten'],
        'between shifts': ['ruhezeit-zwischen-schichten'], 'shift change': ['ruhezeit-zwischen-schichten'],
        'too early': ['ruhezeit-zwischen-schichten'], 'no sleep': ['ruhezeit-zwischen-schichten'],
        'hours deleted': ['arbeitszeitkonto-manipulation'], 'time account': ['arbeitszeitkonto-manipulation'],
        'time clock': ['arbeitszeitkonto-manipulation'], 'time tracking': ['arbeitszeitkonto-manipulation', 'keine-zeiterfassung'],
        'hours deducted': ['arbeitszeitkonto-manipulation'], 'manipulated': ['arbeitszeitkonto-manipulation'],
        'minus hours': ['arbeitszeitkonto-manipulation'],
        'standby': ['bereitschaftsdienst'], 'on-call': ['bereitschaftsdienst'], 'on call': ['bereitschaftsdienst'],
        'reachable': ['bereitschaftsdienst'], 'available': ['bereitschaftsdienst'],
        'travel time': ['fahrtzeit-aussenstelle'], 'commute': ['fahrtzeit-aussenstelle', 'fahrtkosten-arbeit'],
        'construction site': ['fahrtzeit-aussenstelle'], 'field work': ['fahrtzeit-aussenstelle'],
        'driving to customer': ['fahrtzeit-aussenstelle'], 'job site': ['fahrtzeit-aussenstelle'],

        // Duties / tasks
        'cleaning': ['putzen'], 'sweep': ['putzen'], 'tidy up': ['putzen'], 'sweep the hall': ['putzen'],
        'clean toilet': ['putzen'], 'mopping': ['putzen'], 'vacuum': ['putzen'], 'trash': ['putzen'], 'scrub': ['putzen'],
        'coffee': ['privatbesorgungen'], 'get coffee': ['privatbesorgungen'], 'shopping': ['privatbesorgungen'],
        'wash car': ['privatbesorgungen'], 'errands': ['privatbesorgungen'], 'private': ['privatbesorgungen'],
        'monotonous': ['eintoenig'], 'always the same': ['eintoenig'], 'boring': ['eintoenig'],
        'nothing new': ['eintoenig'], 'no variety': ['eintoenig'], 'only copying': ['eintoenig'],
        'instruction': ['weisung-rechtswidrig'], 'illegal': ['weisung-rechtswidrig'], 'unlawful': ['weisung-rechtswidrig'],
        'refuse': ['weisung-rechtswidrig'], 'forbidden order': ['weisung-rechtswidrig'],
        'piece work': ['akkordarbeit'], 'piece-rate': ['akkordarbeit'], 'assembly line': ['akkordarbeit'],
        'quota': ['akkordarbeit'], 'pace': ['akkordarbeit'], 'performance pay': ['akkordarbeit'],

        // Vacation
        'vacation': ['urlaub-gestrichen', 'urlaub-bestimmen', 'pruefungsfreistellung', 'urlaubsdauer'],
        'holiday': ['urlaub-gestrichen', 'urlaub-bestimmen', 'urlaubsdauer'],
        'holiday cancelled': ['urlaub-gestrichen'], 'vacation cancelled': ['urlaub-gestrichen'],
        'holiday revoked': ['urlaub-gestrichen'], 'no holiday': ['urlaub-gestrichen'],
        'boss decides holiday': ['urlaub-bestimmen'], 'when boss says': ['urlaub-bestimmen'],
        'exam leave': ['pruefungsfreistellung'], 'exam release': ['pruefungsfreistellung'],
        'day off exam': ['pruefungsfreistellung'], 'exam': ['pruefungsfreistellung', 'pruefungswiederholung'],
        'how many holiday days': ['urlaubsdauer'], 'holiday entitlement': ['urlaubsdauer'],
        'holiday days': ['urlaubsdauer'], '24 days': ['urlaubsdauer'], '25 days': ['urlaubsdauer'],
        '30 days': ['urlaubsdauer'],
        'sick on holiday': ['krankheit-im-urlaub'], 'ill on vacation': ['krankheit-im-urlaub'],
        'sick note holiday': ['krankheit-im-urlaub'],
        'continuous holiday': ['urlaub-zusammenhaengend'], 'two weeks off': ['urlaub-zusammenhaengend'],
        '12 working days': ['urlaub-zusammenhaengend'], 'split holiday': ['urlaub-zusammenhaengend'],

        // Vocational school
        'travel costs': ['berufsschule-fahrtkosten', 'fahrtkosten-arbeit'], 'travel reimbursement': ['berufsschule-fahrtkosten'],
        'inter-company': ['berufsschule-fahrtkosten'], 'block school': ['berufsschule-fahrtkosten', 'blockunterricht'],
        'accommodation': ['berufsschule-fahrtkosten'],
        'vocational school': ['nach-schule-betrieb', 'schule-nicht-angerechnet'],
        'school': ['nach-schule-betrieb', 'schule-nicht-angerechnet'],
        'after school': ['nach-schule-betrieb'], 'school working time': ['schule-nicht-angerechnet'],
        'school free time': ['schule-nicht-angerechnet'], 'school not counted': ['schule-nicht-angerechnet'],
        'block lessons': ['nach-schule-betrieb', 'schule-nicht-angerechnet'],
        'failed': ['pruefungswiederholung'], 'not passed': ['pruefungswiederholung'],
        'retake': ['pruefungswiederholung'], 'resit': ['pruefungswiederholung'], 'repeat exam': ['pruefungswiederholung'],

        // Pay
        'money': ['verguetung-niedrig', 'krank-kein-geld', 'arbeitsmaterial'],
        'salary': ['verguetung-niedrig', 'krank-kein-geld'], 'pay': ['verguetung-niedrig'],
        'allowance': ['verguetung-niedrig'], 'too little money': ['verguetung-niedrig'],
        'wage': ['verguetung-niedrig', 'krank-kein-geld'], 'minimum wage': ['verguetung-niedrig', 'mindestausbildungsverguetung'],
        'minimum training allowance': ['mindestausbildungsverguetung'], 'lower limit pay': ['mindestausbildungsverguetung'],
        'annual increase': ['jaehrliche-steigerung'], 'pay not rising': ['jaehrliche-steigerung'],
        'same pay': ['jaehrliche-steigerung'], 'frozen pay': ['jaehrliche-steigerung'],
        'raise': ['jaehrliche-steigerung'], 'pay rise': ['jaehrliche-steigerung'],
        'pay overtime': ['ueberstunden-verguetung'], 'overtime pay': ['ueberstunden-verguetung'],
        'overtime compensation': ['ueberstunden-verguetung'],
        'tools': ['arbeitsmaterial'], 'work materials': ['arbeitsmaterial'], 'material': ['arbeitsmaterial'],
        'buy myself': ['arbeitsmaterial'], 'books': ['arbeitsmaterial'], 'work clothing': ['arbeitsmaterial'],
        'sick': ['krank-kein-geld'], 'illness': ['krank-kein-geld'], 'sick no pay': ['krank-kein-geld'],
        'continued pay': ['krank-kein-geld'], 'sick note': ['krank-kein-geld', 'krankmeldung-ab-tag-eins'],

        // Termination
        'termination': ['kuendigung-drohung', 'abmahnung', 'aufhebungsvertrag', 'kuendigung-probezeit', 'kuendigung-aus-wichtigem-grund'],
        'dismissal': ['kuendigung-drohung', 'kuendigung-aus-wichtigem-grund'], 'fired': ['kuendigung-drohung'],
        'sacked': ['kuendigung-drohung'], 'kicked out': ['kuendigung-drohung', 'kuendigung-whatsapp'],
        'probation': ['kuendigung-probezeit'], 'probationary period': ['kuendigung-probezeit'],
        'probation end': ['kuendigung-probezeit'],
        'termination without notice': ['kuendigung-aus-wichtigem-grund'], 'good cause': ['kuendigung-aus-wichtigem-grund'],
        'summary dismissal': ['kuendigung-aus-wichtigem-grund'],
        'warning': ['abmahnung'], 'written warning': ['abmahnung'], 'reprimand': ['abmahnung'],
        'termination agreement': ['aufhebungsvertrag'], 'sign': ['aufhebungsvertrag'], 'settlement agreement': ['aufhebungsvertrag'],
        'reference': ['zeugnis'], 'work reference': ['zeugnis'], 'training reference': ['zeugnis'], 'no reference': ['zeugnis'],
        'conciliation': ['schlichtungsausschuss-ihk'], 'labour court': ['schlichtungsausschuss-ihk'],
        'sue': ['schlichtungsausschuss-ihk'], 'lawsuit': ['schlichtungsausschuss-ihk'], 'ihk mediation': ['schlichtungsausschuss-ihk'],

        // Bullying / discrimination / harassment
        'bullying': ['mobbing', 'diskriminierung'], 'mobbing': ['mobbing'], 'bullied': ['mobbing'],
        'insult': ['mobbing', 'anschreien-beleidigung'], 'insulted': ['mobbing', 'anschreien-beleidigung'], 'harassment': ['mobbing', 'sexuelle-belaestigung'],
        'shouting': ['mobbing', 'anschreien-beleidigung'], 'excluded': ['mobbing'],
        'discrimination': ['diskriminierung'], 'discriminated': ['diskriminierung'], 'racism': ['diskriminierung'],
        'sexism': ['diskriminierung'], 'origin': ['diskriminierung'], 'religion': ['diskriminierung'],
        'skin colour': ['diskriminierung'], 'disability': ['diskriminierung'],
        'sexual harassment': ['sexuelle-belaestigung'], 'groped': ['sexuelle-belaestigung'],
        'touched': ['sexuelle-belaestigung'], 'suggestive': ['sexuelle-belaestigung'],
        'assault': ['sexuelle-belaestigung'], 'catcalling': ['sexuelle-belaestigung'], 'me too': ['sexuelle-belaestigung'],

        // Safety
        'protective clothing': ['schutzkleidung'], 'safety shoes': ['schutzkleidung'], 'helmet': ['schutzkleidung'],
        'safety goggles': ['schutzkleidung'], 'gloves': ['schutzkleidung'], 'ppe': ['schutzkleidung'],
        'hearing protection': ['schutzkleidung'], 'respirator': ['schutzkleidung'],
        'hazardous substance': ['gefahrenstoffe'], 'dangerous substances': ['gefahrenstoffe'],
        'acid': ['gefahrenstoffe'], 'chemicals': ['gefahrenstoffe'], 'asbestos': ['gefahrenstoffe'],
        'noise': ['gefahrenstoffe'], 'dangerous work': ['gefahrenstoffe'], 'poison': ['gefahrenstoffe'],
        'accident': ['arbeitsunfall'], 'work accident': ['arbeitsunfall'], 'injured': ['arbeitsunfall'],
        'injury': ['arbeitsunfall'], 'first aid book': ['arbeitsunfall'],
        'instruction safety': ['sicherheitsbelehrung'], 'safety briefing': ['sicherheitsbelehrung'],
        'induction': ['sicherheitsbelehrung'], 'machine': ['sicherheitsbelehrung'], 'forklift': ['sicherheitsbelehrung'],
        'medical examination': ['arbeitsmedizinische-untersuchung'], 'j1': ['arbeitsmedizinische-untersuchung'],
        'first examination': ['arbeitsmedizinische-untersuchung'], 'follow-up examination': ['arbeitsmedizinische-untersuchung'],
        'health check': ['arbeitsmedizinische-untersuchung'],
        'burnout': ['psychische-belastung'], 'depression': ['psychische-belastung'], 'overwhelmed': ['psychische-belastung'],
        'cant go on': ['psychische-belastung'], 'panic': ['psychische-belastung'], 'stress': ['psychische-belastung'],
        'mental': ['psychische-belastung'], 'duty of care': ['psychische-belastung'],

        // Training quality
        'training plan': ['ausbildungsplan-existenz'], 'no training plan': ['ausbildungsplan-existenz'],
        'framework plan': ['ausbildungsplan-existenz'], 'structured training': ['ausbildungsplan-existenz'],
        'no trainer': ['ausbilder-nie-da'], 'trainer absent': ['ausbilder-nie-da'], 'left alone': ['ausbilder-nie-da'],
        'no guidance': ['ausbilder-nie-da'], 'nobody teaches': ['ausbilder-nie-da'],
        'shorten': ['ausbildungszeit-verkuerzung'], 'shorten training': ['ausbildungszeit-verkuerzung', 'vorzeitige-zulassung'],
        'early exam': ['ausbildungszeit-verkuerzung'], 'reduce training': ['ausbildungszeit-verkuerzung'],

        // Co-determination
        'jav': ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
        'works council': ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
        'consultation hour': ['jav-betriebsrat-zugang'], 'trainee representation': ['jav-wahlrecht'],
        'youth representation': ['jav-wahlrecht'], 'election': ['jav-wahlrecht'], 'union': ['jav-betriebsrat-zugang', 'gewerkschaft'],
        'surveillance': ['datenschutz-ueberwachung'], 'monitoring': ['datenschutz-ueberwachung'],
        'camera': ['datenschutz-ueberwachung'], 'data protection': ['datenschutz-ueberwachung'],
        'privacy': ['datenschutz-ueberwachung'], 'gdpr': ['datenschutz-ueberwachung'], 'dsgvo': ['datenschutz-ueberwachung'],
        'keylogger': ['datenschutz-ueberwachung'], 'gps tracking': ['datenschutz-ueberwachung'],
        'email monitored': ['datenschutz-ueberwachung'], 'pc monitored': ['datenschutz-ueberwachung'],

                                                         // Added 19 Oct 2026
                                                         'six days': ['sechs-tage-woche'],
                                                         '6 days': ['sechs-tage-woche'],
                                                         'six-day week': ['sechs-tage-woche'],
                                                         'five-day week': ['sechs-tage-woche'],
                                                         'work every day': ['sechs-tage-woche'],
                                                         'bank holiday': ['feiertagsarbeit'],
                                                         'christmas': ['feiertagsarbeit'],
                                                         'new year': ['feiertagsarbeit'],
                                                         'easter': ['feiertagsarbeit'],
                                                         'may day': ['feiertagsarbeit'],
                                                         'replacement rest day': ['feiertagsarbeit'],
                                                         'before school': ['vor-der-berufsschule'],
                                                         'before lessons': ['vor-der-berufsschule'],
                                                         'before 9': ['vor-der-berufsschule'],
                                                         'morning before school': ['vor-der-berufsschule'],
                                                         'work then school': ['vor-der-berufsschule'],
                                                         'changing clothes': ['umkleidezeit'],
                                                         'changing time': ['umkleidezeit'],
                                                         'getting changed': ['umkleidezeit'],
                                                         'uniform': ['umkleidezeit'],
                                                         'locker room': ['umkleidezeit'],
                                                         'home office': ['homeoffice-azubi'],
                                                         'work from home': ['homeoffice-azubi'],
                                                         'remote': ['homeoffice-azubi'],
                                                         'wfh': ['homeoffice-azubi'],
                                                         'mobile work': ['homeoffice-azubi'],
                                                         'laptop': ['homeoffice-azubi'],
                                                         'time recording': ['keine-zeiterfassung'],
                                                         'clock in': ['keine-zeiterfassung'],
                                                         'timesheet': ['keine-zeiterfassung'],
                                                         'record hours': ['keine-zeiterfassung'],
                                                         'no time recording': ['keine-zeiterfassung'],
                                                         'other company': ['anderer-betrieb'],
                                                         'partner company': ['anderer-betrieb'],
                                                         'lent out': ['anderer-betrieb'],
                                                         'help out': ['anderer-betrieb'],
                                                         'joint training': ['anderer-betrieb'],
                                                         'subsidiary': ['anderer-betrieb'],
                                                         'branch': ['anderer-betrieb'],
                                                         'company car': ['firmenwagen-fahren'],
                                                         'drive deliveries': ['firmenwagen-fahren'],
                                                         'driver': ['firmenwagen-fahren'],
                                                         'van': ['firmenwagen-fahren'],
                                                         'driving licence': ['firmenwagen-fahren'],
                                                         'car accident': ['firmenwagen-fahren'],
                                                         'speeding fine': ['firmenwagen-fahren'],
                                                         'till': ['kassenfehlbetrag'],
                                                         'cash register': ['kassenfehlbetrag'],
                                                         'till shortfall': ['kassenfehlbetrag'],
                                                         'missing money': ['kassenfehlbetrag'],
                                                         'deduct from pay': ['kassenfehlbetrag'],
                                                         'pay deduction': ['kassenfehlbetrag'],
                                                         'broke': ['schaden-bezahlen'],
                                                         'broken': ['schaden-bezahlen'],
                                                         'damage': ['schaden-bezahlen'],
                                                         'damaged': ['schaden-bezahlen'],
                                                         'liability': ['schaden-bezahlen'],
                                                         'pay for repair': ['schaden-bezahlen'],
                                                         'compensation': ['schaden-bezahlen'],
                                                         'phone': ['handyverbot'],
                                                         'mobile phone': ['handyverbot'],
                                                         'smartphone': ['handyverbot'],
                                                         'phone ban': ['handyverbot'],
                                                         'locker': ['handyverbot'],
                                                         'private use': ['handyverbot'],
                                                         'tattoo': ['kleiderordnung-tattoo'],
                                                         'piercing': ['kleiderordnung-tattoo'],
                                                         'hairstyle': ['kleiderordnung-tattoo'],
                                                         'haircut': ['kleiderordnung-tattoo'],
                                                         'dress code': ['kleiderordnung-tattoo'],
                                                         'headscarf': ['kleiderordnung-tattoo'],
                                                         'beard': ['kleiderordnung-tattoo'],
                                                         'jewellery': ['kleiderordnung-tattoo'],
                                                         'instagram': ['social-media-post'],
                                                         'tiktok': ['social-media-post'],
                                                         'social media': ['social-media-post'],
                                                         'post': ['social-media-post'],
                                                         'posted': ['social-media-post'],
                                                         'story': ['social-media-post'],
                                                         'facebook': ['social-media-post'],
                                                         'criticise boss': ['social-media-post'],
                                                         'group chat': ['social-media-post'],
                                                         'side job': ['nebenjob'],
                                                         'second job': ['nebenjob'],
                                                         'mini job': ['nebenjob'],
                                                         'part-time job': ['nebenjob'],
                                                         'earn extra': ['nebenjob'],
                                                         'weekend job': ['nebenjob'],
                                                         'vacation probation': ['urlaub-probezeit'],
                                                         'leave in first months': ['urlaub-probezeit'],
                                                         'waiting period': ['urlaub-probezeit'],
                                                         'partial leave': ['urlaub-probezeit'],
                                                         'pro rata leave': ['urlaub-probezeit'],
                                                         'vacation school day': ['urlaub-schulzeit'],
                                                         'leave school day': ['urlaub-schulzeit'],
                                                         'school holidays': ['urlaub-schulzeit'],
                                                         'leave during school': ['urlaub-schulzeit'],
                                                         'remaining leave': ['resturlaub-verfaellt'],
                                                         'leave expires': ['resturlaub-verfaellt'],
                                                         'carry over leave': ['resturlaub-verfaellt'],
                                                         'unused vacation': ['resturlaub-verfaellt'],
                                                         'end of year leave': ['resturlaub-verfaellt'],
                                                         'leave payout': ['urlaubsabgeltung'],
                                                         'pay out vacation': ['urlaubsabgeltung'],
                                                         'remaining leave end': ['urlaubsabgeltung'],
                                                         'vacation payment': ['urlaubsabgeltung'],
                                                         'end of training leave': ['urlaubsabgeltung'],
                                                         'special leave': ['sonderurlaub'],
                                                         'funeral': ['sonderurlaub'],
                                                         'bereavement': ['sonderurlaub'],
                                                         'death in family': ['sonderurlaub'],
                                                         'wedding': ['sonderurlaub'],
                                                         'birth of child': ['sonderurlaub'],
                                                         'moving house': ['sonderurlaub'],
                                                         'court date': ['sonderurlaub'],
                                                         'doctor appointment': ['arzttermin'],
                                                         'doctor': ['arzttermin'],
                                                         'dentist': ['arzttermin'],
                                                         'specialist': ['arzttermin'],
                                                         'medical appointment': ['arzttermin'],
                                                         'make up time': ['arzttermin'],
                                                         'educational leave': ['bildungsurlaub'],
                                                         'education leave': ['bildungsurlaub'],
                                                         'seminar': ['bildungsurlaub'],
                                                         'training course leave': ['bildungsurlaub'],
                                                         'further training': ['bildungsurlaub'],
                                                         'training log': ['berichtsheft-zuhause'],
                                                         'training record': ['berichtsheft-zuhause'],
                                                         'report book': ['berichtsheft-zuhause'],
                                                         'logbook at home': ['berichtsheft-zuhause'],
                                                         'weekly report': ['berichtsheft-zuhause'],
                                                         'berichtsheft': ['berichtsheft-zuhause'],
                                                         'sign training log': ['berichtsheft-unterschrift'],
                                                         'not signing': ['berichtsheft-unterschrift'],
                                                         'sign off': ['berichtsheft-unterschrift'],
                                                         'countersign': ['berichtsheft-unterschrift'],
                                                         'trainer signature': ['berichtsheft-unterschrift'],
                                                         'admission training record': ['berichtsheft-unterschrift'],
                                                         'block teaching': ['blockunterricht'],
                                                         'block week': ['blockunterricht'],
                                                         'school week': ['blockunterricht'],
                                                         'work after block': ['blockunterricht'],
                                                         'skip school': ['berufsschule-fehlen'],
                                                         'skipped school': ['berufsschule-fehlen'],
                                                         'truancy': ['berufsschule-fehlen'],
                                                         'missed school': ['berufsschule-fehlen'],
                                                         'unexcused absence': ['berufsschule-fehlen'],
                                                         'absent from school': ['berufsschule-fehlen'],
                                                         'school books': ['schulbuecher-kosten'],
                                                         'textbooks': ['schulbuecher-kosten'],
                                                         'calculator': ['schulbuecher-kosten'],
                                                         'reference book': ['schulbuecher-kosten'],
                                                         'learning materials': ['schulbuecher-kosten'],
                                                         'school supplies': ['schulbuecher-kosten'],
                                                         'intermediate exam': ['zwischenpruefung'],
                                                         'part 1 exam': ['zwischenpruefung'],
                                                         'stretched exam': ['zwischenpruefung'],
                                                         'mid-term exam': ['zwischenpruefung'],
                                                         'exam fee': ['pruefungsgebuehr'],
                                                         'exam fees': ['pruefungsgebuehr'],
                                                         'pay for exam': ['pruefungsgebuehr'],
                                                         'exam costs': ['pruefungsgebuehr'],
                                                         'chamber fee': ['pruefungsgebuehr'],
                                                         'retake fee': ['pruefungsgebuehr'],
                                                         'early admission': ['vorzeitige-zulassung'],
                                                         'exam early': ['vorzeitige-zulassung'],
                                                         'bring exam forward': ['vorzeitige-zulassung'],
                                                         'finish early': ['vorzeitige-zulassung'],
                                                         'after the exam': ['nach-pruefung-weiterarbeiten'],
                                                         'keep working': ['nach-pruefung-weiterarbeiten'],
                                                         'no contract': ['nach-pruefung-weiterarbeiten', 'vertrag-nicht-eingetragen'],
                                                         'passed exam': ['nach-pruefung-weiterarbeiten'],
                                                         'training over': ['nach-pruefung-weiterarbeiten'],
                                                         'permanent contract': ['nach-pruefung-weiterarbeiten'],
                                                         'salary after training': ['nach-pruefung-weiterarbeiten'],
                                                         'pay late': ['verguetung-zu-spaet'],
                                                         'salary late': ['verguetung-zu-spaet'],
                                                         'not paid': ['verguetung-zu-spaet'],
                                                         'wages missing': ['verguetung-zu-spaet'],
                                                         'payday': ['verguetung-zu-spaet'],
                                                         'no money received': ['verguetung-zu-spaet'],
                                                         'training costs': ['ausbildungskosten-zurueck'],
                                                         'pay back': ['ausbildungskosten-zurueck'],
                                                         'repayment': ['ausbildungskosten-zurueck'],
                                                         'contractual penalty': ['ausbildungskosten-zurueck'],
                                                         'quit costs': ['ausbildungskosten-zurueck'],
                                                         'course costs': ['ausbildungskosten-zurueck'],
                                                         'apprenticeship fee': ['lehrgeld'],
                                                         'training fee': ['lehrgeld'],
                                                         'school fee': ['lehrgeld'],
                                                         'pay for training': ['lehrgeld'],
                                                         'scam': ['lehrgeld'],
                                                         'have to stay': ['bleibeverpflichtung'],
                                                         'stay-on clause': ['bleibeverpflichtung'],
                                                         'non-compete': ['bleibeverpflichtung'],
                                                         'competitor': ['bleibeverpflichtung'],
                                                         'stay after training': ['bleibeverpflichtung'],
                                                         'retention clause': ['bleibeverpflichtung'],
                                                         'board and lodging': ['kost-und-logis'],
                                                         'accommodation deduction': ['kost-und-logis'],
                                                         'staff room': ['kost-und-logis'],
                                                         'meals': ['kost-und-logis'],
                                                         'benefit in kind': ['kost-und-logis'],
                                                         'christmas bonus': ['weihnachtsgeld-azubi'],
                                                         'holiday bonus': ['weihnachtsgeld-azubi'],
                                                         'bonus': ['weihnachtsgeld-azubi'],
                                                         '13th salary': ['weihnachtsgeld-azubi'],
                                                         'special payment': ['weihnachtsgeld-azubi'],
                                                         'annual bonus': ['weihnachtsgeld-azubi'],
                                                         'commuter allowance': ['fahrtkosten-arbeit'],
                                                         'job ticket': ['fahrtkosten-arbeit'],
                                                         'way to work': ['fahrtkosten-arbeit'],
                                                         'fuel costs': ['fahrtkosten-arbeit'],
                                                         'child benefit': ['kindergeld-bab'],
                                                         'bab': ['kindergeld-bab'],
                                                         'training allowance': ['kindergeld-bab'],
                                                         'housing benefit': ['kindergeld-bab'],
                                                         'subsidy': ['kindergeld-bab'],
                                                         'own flat': ['kindergeld-bab'],
                                                         'moving out': ['kindergeld-bab'],
                                                         'probation pay': ['probezeit-weniger-geld'],
                                                         'less money probation': ['probezeit-weniger-geld'],
                                                         'reduced pay': ['probezeit-weniger-geld'],
                                                         'first month less': ['probezeit-weniger-geld'],
                                                         'sick leave': ['krankmeldung-ab-tag-eins'],
                                                         'doctor note': ['krankmeldung-ab-tag-eins'],
                                                         'first day sick': ['krankmeldung-ab-tag-eins'],
                                                         'medical certificate': ['krankmeldung-ab-tag-eins'],
                                                         'call in sick': ['krankmeldung-ab-tag-eins'],
                                                         'diagnosis': ['diagnose-chef'],
                                                         'what illness': ['diagnose-chef'],
                                                         'name illness': ['diagnose-chef'],
                                                         'reason for sick leave': ['diagnose-chef'],
                                                         'boss asks illness': ['diagnose-chef'],
                                                         'health data': ['diagnose-chef'],
                                                         'work while sick': ['krank-arbeiten'],
                                                         'sick but work': ['krank-arbeiten'],
                                                         'reachable when sick': ['krank-arbeiten'],
                                                         'emails on sick leave': ['krank-arbeiten'],
                                                         'sick working from home': ['krank-arbeiten'],
                                                         'sick school': ['krank-berufsschule'],
                                                         'ill vocational school': ['krank-berufsschule'],
                                                         'school sick note': ['krank-berufsschule'],
                                                         'school excuse': ['krank-berufsschule'],
                                                         'ill on exam day': ['krank-berufsschule'],
                                                         'sick days leave': ['krankheit-urlaub-abziehen'],
                                                         'deduct sick days': ['krankheit-urlaub-abziehen'],
                                                         'leave cut illness': ['krankheit-urlaub-abziehen'],
                                                         'offset sick days': ['krankheit-urlaub-abziehen'],
                                                         'resign': ['selbst-kuendigen'],
                                                         'quit training': ['selbst-kuendigen'],
                                                         'drop out': ['selbst-kuendigen'],
                                                         'change company': ['selbst-kuendigen'],
                                                         'switch occupation': ['selbst-kuendigen'],
                                                         'notice period trainee': ['selbst-kuendigen'],
                                                         'fired by whatsapp': ['kuendigung-whatsapp'],
                                                         'termination by email': ['kuendigung-whatsapp'],
                                                         'verbal dismissal': ['kuendigung-whatsapp'],
                                                         'fired by text': ['kuendigung-whatsapp'],
                                                         'written termination': ['kuendigung-whatsapp'],
                                                         'kept on': ['uebernahme'],
                                                         'retention': ['uebernahme'],
                                                         'hired after training': ['uebernahme'],
                                                         'continued employment': ['uebernahme'],
                                                         'permanent job': ['uebernahme'],
                                                         'not kept on': ['uebernahme'],
                                                         'ill too often': ['kuendigung-wegen-krankheit'],
                                                         'fired for being sick': ['kuendigung-wegen-krankheit'],
                                                         'dismissal illness': ['kuendigung-wegen-krankheit'],
                                                         'many sick days': ['kuendigung-wegen-krankheit'],
                                                         'absence dismissal': ['kuendigung-wegen-krankheit'],
                                                         'pregnant': ['schwangerschaft'],
                                                         'pregnancy': ['schwangerschaft'],
                                                         'maternity protection': ['schwangerschaft'],
                                                         'baby': ['schwangerschaft'],
                                                         'parental leave': ['schwangerschaft'],
                                                         'having a child': ['schwangerschaft'],
                                                         'insolvency': ['insolvenz-betrieb'],
                                                         'bankrupt': ['insolvenz-betrieb'],
                                                         'company closing': ['insolvenz-betrieb'],
                                                         'insolvency benefit': ['insolvenz-betrieb'],
                                                         'business closure': ['insolvenz-betrieb'],
                                                         'extend probation': ['probezeit-verlaengert'],
                                                         'probation extended': ['probezeit-verlaengert'],
                                                         'longer probation': ['probezeit-verlaengert'],
                                                         'probation four months': ['probezeit-verlaengert'],
                                                         'probation length': ['probezeit-verlaengert'],
                                                         'yelled at': ['anschreien-beleidigung'],
                                                         'humiliate': ['anschreien-beleidigung'],
                                                         'disrespect': ['anschreien-beleidigung'],
                                                         'belittled': ['anschreien-beleidigung'],
                                                         'heat': ['hitze-arbeitsplatz'],
                                                         'too hot': ['hitze-arbeitsplatz'],
                                                         'heatwave': ['hitze-arbeitsplatz'],
                                                         'temperature office': ['hitze-arbeitsplatz'],
                                                         '30 degrees': ['hitze-arbeitsplatz'],
                                                         'air conditioning': ['hitze-arbeitsplatz'],
                                                         'summer work': ['hitze-arbeitsplatz'],
                                                         'alcohol': ['alkohol-rauchen'],
                                                         'beer': ['alkohol-rauchen'],
                                                         'drinking': ['alkohol-rauchen'],
                                                         'drunk': ['alkohol-rauchen'],
                                                         'smoking': ['alkohol-rauchen'],
                                                         'cigarette': ['alkohol-rauchen'],
                                                         'vape': ['alkohol-rauchen'],
                                                         'drugs': ['alkohol-rauchen'],
                                                         'cannabis': ['alkohol-rauchen'],
                                                         'training contract': ['vertrag-nicht-eingetragen'],
                                                         'contract missing': ['vertrag-nicht-eingetragen'],
                                                         'not registered': ['vertrag-nicht-eingetragen'],
                                                         'chamber registration': ['vertrag-nicht-eingetragen'],
                                                         'written contract': ['vertrag-nicht-eingetragen'],
                                                         'part-time': ['teilzeitausbildung'],
                                                         'part-time training': ['teilzeitausbildung'],
                                                         'fewer hours': ['teilzeitausbildung'],
                                                         'training with child': ['teilzeitausbildung'],
                                                         'caring duties': ['teilzeitausbildung'],
                                                         'single parent': ['teilzeitausbildung'],
                                                         'abroad': ['ausland'],
                                                         'placement abroad': ['ausland'],
                                                         'erasmus': ['ausland'],
                                                         'internship abroad': ['ausland'],
                                                         'exchange': ['ausland'],
                                                         'extend': ['ausbildung-verlaengern'],
                                                         'extension': ['ausbildung-verlaengern'],
                                                         'more time': ['ausbildung-verlaengern'],
                                                         'extend training': ['ausbildung-verlaengern'],
                                                         'falling behind': ['ausbildung-verlaengern'],
                                                         'long illness': ['ausbildung-verlaengern'],
                                                         'trade union': ['gewerkschaft'],
                                                         'join union': ['gewerkschaft'],
                                                         'member': ['gewerkschaft'],
                                                         'freedom of association': ['gewerkschaft'],
                                                         'strike': ['streik-azubi'],
                                                         'warning strike': ['streik-azubi'],
                                                         'striking': ['streik-azubi'],
                                                         'strike pay': ['streik-azubi'],
                                                         'collective bargaining': ['streik-azubi'],
                                                         'industrial action': ['streik-azubi'],
                                                         'works meeting': ['betriebsversammlung'],
                                                         'staff meeting': ['betriebsversammlung'],
                                                         'youth meeting': ['betriebsversammlung'],
                                                         'trainee meeting': ['betriebsversammlung'],
                                                         'employee meeting': ['betriebsversammlung']
    };

    window.RC_EN = {
        scenarios: scenarios,
        keywords: keywords,
        // Mutate SCENARIOS + KEYWORD_MAP in place with the English data.
        apply: function (SCENARIOS, KEYWORD_MAP) {
            var sc = this.scenarios;
            var fields = ['title', 'desc', 'verdictShort', 'verdictDetail', 'laws', 'tips', 'email'];
            (SCENARIOS || []).forEach(function (s) {
                var o = sc[s.id];
                if (!o) return;
                fields.forEach(function (k) {
                    if (o[k] !== undefined) s[k] = o[k];
                });
            });
            if (KEYWORD_MAP) {
                Object.keys(KEYWORD_MAP).forEach(function (k) { delete KEYWORD_MAP[k]; });
                var kw = this.keywords;
                Object.keys(kw).forEach(function (k) { KEYWORD_MAP[k] = kw[k]; });
            }
        }
    };
})();
