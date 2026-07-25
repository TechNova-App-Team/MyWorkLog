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
            verdictShort: 'No, not permitted as a rule!',
            verdictDetail: 'Minors in training may work a maximum of 8 hours/day and 40 hours/week (§ 8 JArbSchG). For trainees of legal age, the Working Hours Act applies (max. 8 h/day, up to 10 h only with compensation). Overtime may only be ordered in absolute exceptions and must be paid or compensated with time off.',
            laws: [
                { title: '§ 8 JArbSchG – Duration of working hours', text: 'Young people may not be employed for more than 8 hours per day and no more than 40 hours per week.' },
                { title: '§ 3 ArbZG – Working hours of employees', text: 'An employee\'s daily working time may not exceed 8 hours. It can be extended to up to 10 hours only if it is balanced out to an average of 8 hours within 6 months.' },
                { title: '§ 17 (3) BBiG – Right to remuneration', text: 'Employment beyond the agreed training time must be specially remunerated or compensated with time off.' }
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

Under § 17 (3) BBiG, employment beyond the agreed training time must be specially remunerated or compensated with corresponding time off. [For trainees who are minors, § 8 JArbSchG also applies, setting a maximum working time of 8 hours per day and 40 hours per week.]

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
            verdictDetail: 'You have a statutory right to be released from work for exams AND the day before (§ 15 BBiG). This is paid release — not holiday! Vocational-school time also counts fully towards working time. Anyone who tells you otherwise is breaking the law.',
            laws: [
                { title: '§ 15 (1) BBiG – Release, crediting', text: 'Training companies may not employ trainees before vocational-school lessons that start before 9:00. They must release trainees to attend vocational school, exams and training measures.' },
                { title: '§ 15 (2) BBiG – Day before the exam', text: 'Training companies must release trainees on the day before the written final exam.' }
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
            verdictShort: 'Depends on age & number of lessons!',
            verdictDetail: 'Minors: with more than 5 lessons (of 45 min. each) on a single day → released for the whole day, no company work (§ 9 JArbSchG). Adults: vocational-school time counts towards working time, but the company can in theory still deploy you afterwards. NOTE: since 2020 an improved crediting rule applies to ALL trainees!',
            laws: [
                { title: '§ 15 BBiG – Release, crediting', text: 'The vocational-school time, including breaks and the journey to school, is credited towards working time. Training companies may not employ trainees before vocational-school lessons starting before 9:00.' },
                { title: '§ 9 (1) JArbSchG – Vocational school', text: 'The employer must release young people to attend vocational-school lessons. On a school day with more than 5 lessons, the young person may no longer be employed at the company.' }
            ],
            tips: [
                'Vocational-school time + breaks + the journey to school = credited towards working time.',
                'Block lessons have special rules — check with the IHK.',
                'No one may deploy you before vocational-school lessons that start before 9:00.',
                'Travel time to vocational school is also credited!'
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
            verdictDetail: 'Since the BBiG reform of 2020 it is clear: vocational-school lessons are fully credited towards working time — for all trainees, whether minors or adults. This includes lesson time, breaks and the journey to school.',
            laws: [
                { title: '§ 15 BBiG – Crediting', text: 'Training companies must release trainees to attend vocational-school lessons. The vocational-school time is credited towards the company training time.' }
            ],
            tips: [
                'This rule has applied since 2020 to ALL trainees — minors and adults.',
                'Breaks at school and the journey to school are also credited.',
                'If your company handles this differently, inform the IHK/HWK.',
                'Record the vocational-school times correctly in your report booklet.'
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
            verdictDetail: 'Since 2020 there has been a statutory minimum training allowance (§ 17 BBiG). For 2026: 1st year approx. €700+. It is adjusted annually. Collective-agreement rules take precedence and may be higher. The allowance must rise each year and be paid at the latest on the last working day of the month.',
            laws: [
                { title: '§ 17 BBiG – Right to remuneration', text: 'Training companies must grant trainees appropriate remuneration. It must increase with the progress of the training, at least annually. A minimum training allowance is set by law.' },
                { title: '§ 18 BBiG – Calculation and due date', text: 'The allowance is calculated for the current calendar month and must be paid at the latest on the last working day of the month.' }
            ],
            tips: [
                'Check whether a collective agreement applies to your industry — it takes precedence and is often higher.',
                'The minimum allowance is adjusted annually by the Federal Institute for Vocational Education and Training (BIBB).',
                'The allowance must rise each training year.',
                'Payment must be in your account at the latest on the last working day of the month.'
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
            verdictDetail: 'Between two working days there must be an uninterrupted rest period of at least 12 hours (young people, § 13 JArbSchG) or 11 hours (adults, § 5 ArbZG). This also applies if overtime was worked the previous day. Violations are an administrative offence (§ 22 ArbZG) — the company risks a fine of up to €15,000.',
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

Under § 16 ArbZG the employer must record all working time, and under § 17 (3) BBiG additional hours must be remunerated or compensated.

I kindly ask you to correct this and provide a written overview of my working-time account.

Kind regards
[Your name]`
            }
        },
        'bereitschaftsdienst': {
            title: '"You just have to be reachable — that doesn\'t count."',
            desc: 'On-call duty, standby duty or constant availability is not counted as working time.',
            verdictShort: 'It depends: standby duty = working time, on-call only partly.',
            verdictDetail: 'Standby duty (present at the workplace, ready to work immediately): counts fully as working time (ECJ C-303/98, Federal Labour Court). On-call duty (at home, with a response time): generally does NOT count as working time — but only if you can largely organise your free time freely. If you must be there within 5 minutes, on-call can also become working time (ECJ C-518/15 Matzak). Young people may generally not perform standby duty.',
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
            verdictShort: 'Vocational school usually a private matter, inter-company courses usually reimbursable.',
            verdictDetail: 'The travel costs to regular vocational school are generally borne by the trainee (exception: some state grant rules). For inter-company courses (ÜLU) and out-of-town vocational school with no local alternative (block school), the company must cover or reimburse the costs (§ 9 BBiG, Federal Labour Court). For exams, the company pays (§ 15 BBiG in conjunction with § 19). For accommodation at a block school there is BAB funding.',
            laws: [
                { title: '§ 9 BBiG – Training at an inter-company training centre', text: 'The necessary costs of inter-company training measures, including travel, accommodation and meal costs, are in principle to be borne by the training company.' },
                { title: '§ 19 BBiG – Continued payment of the allowance', text: 'Trainees must also be paid the allowance for the period of release under § 15.' },
                { title: 'Federal Labour Court 16.06.2021 – 9 AZR 76/18', text: 'For out-of-town block schooling, the trainees\' travel and accommodation costs are to be borne by the training company.' }
            ],
            tips: [
                'Regular vocational school in your home town: the journey = a private matter.',
                'Out-of-town block vocational school or inter-company courses: the company must reimburse the costs.',
                'Always collect and submit receipts (tickets, accommodation).',
                'If refused: apply for BAB at the employment agency — it can help additionally.'
            ],
            email: {
                subject: 'Reimbursement of travel/accommodation costs',
                body: `Dear [name of trainer],

for the period [date] I had to travel [to the inter-company training centre / to the out-of-town block school]. The costs incurred amount to [amount €] (receipts attached).

Under § 9 BBiG or Federal Labour Court ruling 9 AZR 76/18, these costs are to be borne by the training company.

I kindly ask you to reimburse them with the next allowance payment.

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
            verdictShort: 'Minimum amounts have applied since 2020 — raised annually!',
            verdictDetail: 'Since 01/01/2020 there has been a minimum training allowance (§ 17 (2) BBiG), which is adjusted annually. For 2026 (example values, check the amounts): 1st year approx. €695, 2nd year +18%, 3rd year +35%, 4th year +40%. Companies bound by a collective agreement MUST pay the collective wage (often higher). Not bound by a collective agreement: a maximum shortfall of 20% below the industry\'s collective allowance is permitted — otherwise it is inappropriate (§ 17 (1)).',
            laws: [
                { title: '§ 17 (1) BBiG – Right to remuneration', text: 'Training companies must grant trainees an appropriate allowance. It is to be assessed according to the trainee\'s age so that it increases with the progress of the training, at least annually.' },
                { title: '§ 17 (2) BBiG – Minimum allowance', text: 'The minimum allowance is announced annually by the Federal Ministry of Education and Research in the Federal Gazette.' }
            ],
            tips: [
                'You can find the current minimum rates at the BIBB (bibb.de) — always check the current year.',
                'Your industry\'s collective agreement almost always beats the minimum rates (in amount).',
                'Non-collective company: the 80% rule (max. 20% below the industry collective rate).',
                'If it falls short: back payment (3-year limitation period).'
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
            verdictDetail: 'The training allowance must increase at least once a year as the training progresses (§ 17 (1) sentence 2 BBiG). This is not optional. The specific amount: collective agreement (if binding) or the minimum allowance ordinance (typically +18% / +35% / +40% compared to the 1st year). A "frozen" allowance is unlawful.',
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
            verdictDetail: 'Employment beyond the agreed training time must be specially remunerated or compensated with corresponding time off (§ 17 (3) BBiG). A flat-rate settlement in the training contract ("all overtime settled with the allowance") is IMPERMISSIBLE — such clauses are void. There is also no such thing as "goodwill" overtime.',
            laws: [
                { title: '§ 17 (3) BBiG – Overtime remuneration', text: 'Employment beyond the agreed regular daily training time must be specially remunerated or compensated with corresponding time off.' }
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

Under § 17 (3) BBiG, these hours must be compensated either by remuneration or by time off. I opt for [time off in lieu / payment].

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
            verdictDetail: 'During the probationary period, the training relationship can be terminated by both sides at any time without notice and without giving reasons (§ 22 (1) BBiG). BUT: the probationary period must be between 1 and 4 months (§ 20 BBiG) — longer is impermissible. Once the probationary period is over, the company can only terminate for good cause. Dismissals due to discrimination are prohibited even during the probationary period (§ 7 AGG).',
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
            verdictDetail: 'Before a lawsuit at the labour court in training disputes, in many chamber districts you MUST call the IHK/HWK conciliation committee (§ 111 (2) ArbGG). The procedure is free of charge, oral and often fast (weeks instead of months). The ruling has the effect of an enforceable settlement. If one side does not accept it: file a claim with the labour court within 2 weeks.',
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
            verdictDetail: 'Young people may only be employed if they have been medically examined before starting employment (first examination, § 32 JArbSchG). After one year of employment: a follow-up examination (§ 33). The examinations are free of charge (certificate reimbursement via the federal state). The employer MUST have the certificate — otherwise there is an employment ban. For violations: a fine of up to €15,000 (§ 58 JArbSchG).',
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
            verdictDetail: 'The employer must carry out a risk assessment that expressly also covers psychological strain (§ 5 (3) no. 6 ArbSchG). The duty of care (§ 618 BGB) also applies to mental health. Where there is ongoing stress, bullying, excessive demands or fear, they must take measures. For burnout / depression caused by work: recognition as an occupational disease is possible (list BK No. 2113 etc.).',
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
            verdictDetail: 'Anyone who trains must be personally AND professionally qualified (§ 28 BBiG) — i.e. hold the trainer aptitude certificate (AdA) AND a vocational qualification + several years of practice. The trainer must actually be available for the training (§ 28 (3)). Permanent absence → the competent body (IHK) can revoke the company\'s training authorisation (§ 32 BBiG).',
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
            verdictDetail: 'A youth and trainee representation (JAV) must be elected if at least 5 young people under 18 OR employees in vocational training (trainees < 25) work at the company (§ 60 BetrVG). Precondition: there must be a works council. Entitled to vote: all young people/trainees. Eligible for election: employees under 25. Term of office: 2 years.',
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
        'public holiday': ['wochenende'], 'holiday work': ['wochenende'], 'weekend work': ['wochenende'],
        'break': ['pause'], 'lunch break': ['pause'], 'no break': ['pause'], 'rest break': ['pause'],
        'eat': ['pause'], 'power through': ['pause'],
        'night work': ['nachtarbeit'], 'late shift': ['nachtarbeit'], 'night shift': ['nachtarbeit'],
        'evening': ['nachtarbeit'], 'at night': ['nachtarbeit'], 'shift work': ['nachtarbeit'], 'early shift': ['nachtarbeit'],
        'rest period': ['ruhezeit-zwischen-schichten'], '11 hours': ['ruhezeit-zwischen-schichten'],
        'between shifts': ['ruhezeit-zwischen-schichten'], 'shift change': ['ruhezeit-zwischen-schichten'],
        'too early': ['ruhezeit-zwischen-schichten'], 'no sleep': ['ruhezeit-zwischen-schichten'],
        'hours deleted': ['arbeitszeitkonto-manipulation'], 'time account': ['arbeitszeitkonto-manipulation'],
        'time clock': ['arbeitszeitkonto-manipulation'], 'time tracking': ['arbeitszeitkonto-manipulation'],
        'hours deducted': ['arbeitszeitkonto-manipulation'], 'manipulated': ['arbeitszeitkonto-manipulation'],
        'minus hours': ['arbeitszeitkonto-manipulation'],
        'standby': ['bereitschaftsdienst'], 'on-call': ['bereitschaftsdienst'], 'on call': ['bereitschaftsdienst'],
        'reachable': ['bereitschaftsdienst'], 'available': ['bereitschaftsdienst'],
        'travel time': ['fahrtzeit-aussenstelle'], 'commute': ['fahrtzeit-aussenstelle'],
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
        'travel costs': ['berufsschule-fahrtkosten'], 'travel reimbursement': ['berufsschule-fahrtkosten'],
        'inter-company': ['berufsschule-fahrtkosten'], 'block school': ['berufsschule-fahrtkosten'],
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
        'continued pay': ['krank-kein-geld'], 'sick note': ['krank-kein-geld'],

        // Termination
        'termination': ['kuendigung-drohung', 'abmahnung', 'aufhebungsvertrag', 'kuendigung-probezeit', 'kuendigung-aus-wichtigem-grund'],
        'dismissal': ['kuendigung-drohung', 'kuendigung-aus-wichtigem-grund'], 'fired': ['kuendigung-drohung'],
        'sacked': ['kuendigung-drohung'], 'kicked out': ['kuendigung-drohung'],
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
        'insult': ['mobbing'], 'insulted': ['mobbing'], 'harassment': ['mobbing', 'sexuelle-belaestigung'],
        'shouting': ['mobbing'], 'excluded': ['mobbing'],
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
        'shorten': ['ausbildungszeit-verkuerzung'], 'shorten training': ['ausbildungszeit-verkuerzung'],
        'early exam': ['ausbildungszeit-verkuerzung'], 'reduce training': ['ausbildungszeit-verkuerzung'],

        // Co-determination
        'jav': ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
        'works council': ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
        'consultation hour': ['jav-betriebsrat-zugang'], 'trainee representation': ['jav-wahlrecht'],
        'youth representation': ['jav-wahlrecht'], 'election': ['jav-wahlrecht'], 'union': ['jav-betriebsrat-zugang'],
        'surveillance': ['datenschutz-ueberwachung'], 'monitoring': ['datenschutz-ueberwachung'],
        'camera': ['datenschutz-ueberwachung'], 'data protection': ['datenschutz-ueberwachung'],
        'privacy': ['datenschutz-ueberwachung'], 'gdpr': ['datenschutz-ueberwachung'], 'dsgvo': ['datenschutz-ueberwachung'],
        'keylogger': ['datenschutz-ueberwachung'], 'gps tracking': ['datenschutz-ueberwachung'],
        'email monitored': ['datenschutz-ueberwachung'], 'pc monitored': ['datenschutz-ueberwachung']
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
