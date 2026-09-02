# Clinly specialty provider directory

Clinly currently includes **183 provider types** across nine workflow families. The specialty selector is searchable by provider name and aliases; as a user types, providers whose names or aliases **start with the typed text are ranked first**. If a provider does not see an exact match, they can use the **General – Provider** workspace.

This page is the human-readable provider directory. The runtime source of truth lives in [`web/src/specialtyCatalog.js`](../web/src/specialtyCatalog.js) and [`web/src/specialtyCatalogExpanded.js`](../web/src/specialtyCatalogExpanded.js).

## Aesthetics & treatments

- Laser Hair Removal Specialist
- Medical Aesthetics Provider
- Esthetician
- Electrologist
- Tattoo Removal Specialist
- Hair Restoration Specialist
- Skincare Specialist
- Permanent Makeup Artist
- Acne Specialist
- Facialist
- Dermaplaning Specialist
- Microneedling Specialist
- Chemical Peel Specialist
- Body Contouring Specialist
- Cryotherapy Specialist
- Red Light Therapy Provider
- IV Hydration Provider
- Teeth Whitening Specialist

## Beauty & personal care

- Nail Technician
- Hair Stylist
- Barber
- Braider / Loctician
- Makeup Artist
- Lash Technician
- Brow Artist
- Waxing Specialist
- Spray Tan Artist
- Microblading Artist
- Tattoo Artist
- Professional Piercer
- Wig Specialist
- Hair Extension Specialist
- Hair Colorist
- Curly Hair Specialist
- Scalp Care Specialist
- Bridal Hair Stylist
- Image Consultant

## Rehabilitation

- Physical Therapist
- Physical Therapist Assistant
- Occupational Therapist
- Athletic Trainer
- Chiropractor
- Pelvic Floor Specialist
- Speech-Language Pathologist
- Respiratory Therapist
- Hand Therapist
- Vestibular Therapist
- Lymphedema Therapist
- Cardiac Rehabilitation Specialist
- Pulmonary Rehabilitation Specialist
- Neurological Rehabilitation Specialist
- Pediatric Occupational Therapist
- Pediatric Physical Therapist

## Fitness & performance

- Personal Trainer
- Strength & Conditioning Coach
- Running Coach
- Mobility Coach
- Pilates Instructor
- Yoga Instructor
- Sports Performance Coach
- Gym Personal Trainer
- Online Fitness Coach
- Bodybuilding Coach
- Powerlifting Coach
- Olympic Weightlifting Coach
- CrossFit Coach
- Triathlon Coach
- Cycling Coach
- Swimming Coach
- Tennis Coach
- Golf Coach
- Boxing Coach
- Martial Arts Instructor
- Dance Instructor
- Gymnastics Coach
- Pickleball Coach
- Postpartum Fitness Coach
- Prenatal Fitness Coach

## Wellness

- Wellness Coach
- Holistic Wellness Practitioner
- Nutrition Coach
- Health Coach
- Sleep Coach
- Menopause Coach
- Corporate Wellness Coach
- Habit Coach
- Stress Management Coach
- Mindfulness Coach
- Meditation Teacher
- Breathwork Facilitator
- Ayurvedic Wellness Coach
- Functional Nutrition Coach
- Sports Nutrition Coach
- Weight Management Coach

## Coaching

- Life Coach
- Career Coach
- Executive Coach
- Accountability Coach
- ADHD Coach
- Relationship Coach
- Business Coach
- Sobriety Coach
- Parent Coach
- Divorce Coach
- Dating Coach
- Confidence Coach
- Mindset Coach
- Productivity Coach
- Time Management Coach
- Creativity Coach
- Writing Coach
- Public Speaking Coach
- Communication Coach
- Sales Coach
- Real Estate Coach
- Spiritual Coach
- Grief Coach

## Bodywork & recovery

- Massage Therapist
- Sports Massage Therapist
- Stretch Therapist
- Recovery Specialist
- Somatic Practitioner
- Structural Integration Practitioner
- Myofascial Release Therapist
- Reflexologist
- Reiki Practitioner
- Acupressure Practitioner
- Cupping Therapist
- Assisted Stretch Practitioner

## Consulting & advisory

- Business Consultant
- Marketing Consultant
- Technology Consultant
- Financial Coach
- Professional Organizer
- Human Resources Consultant
- Operations Consultant
- Strategy Consultant
- Management Consultant
- Brand Consultant
- Social Media Consultant
- SEO Consultant
- UX Consultant
- Cybersecurity Consultant
- Cloud Consultant
- Data & Analytics Consultant
- AI Consultant
- Project Management Consultant
- Nonprofit Consultant
- Fundraising Consultant
- Education Consultant
- College Admissions Consultant
- Wedding Planner
- Event Planner
- Interior Designer
- Home Stager
- Virtual Assistant
- Bookkeeper
- Tax Preparer
- Credit Coach
- Debt Coach
- Mortgage Readiness Coach

## Service care

- Doula
- Lactation Consultant
- Behavior Support Specialist
- Audiologist
- Postpartum Doula
- Newborn Care Specialist
- Pediatric Sleep Consultant
- Childbirth Educator
- Fertility Coach
- Caregiver Coach
- Patient Advocate
- Aging Life Care Manager
- Special Needs Advocate
- Autism Support Specialist
- Executive Function Coach
- Academic Coach
- Private Tutor
- Private Music Teacher
- Voice Coach
- Dog Trainer
- Pet Behavior Consultant
- **General – Provider** (fallback workspace)

## General provider fallback

The General – Provider workspace is intentionally neutral for professions that are not yet represented. It uses a general client-plan workflow with broad progress notes, milestones, and follow-up rather than forcing the provider into an unrelated specialty.

If a new profession should become first-class, add it to the catalog with its aliases and workflow family so it automatically becomes searchable in the Clinly specialty selector.