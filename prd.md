# CareerBridge AI — MVP Product Requirements Document (PRD)

**Version:** 2.0 (Execution PRD)  
**Product Name:** CareerBridge AI  
**Launch Geography:** Pakistan  
**Initial University:** Islamia University of Bahawalpur (IUB)  
**Primary Domain:** CS / IT / Software Engineering careers

---

# 1. Product Overview

CareerBridge AI is a **career readiness and recruitment platform** that converts unstructured student resumes into structured technical profiles and matches them with relevant jobs.

The platform provides:

## For Students

- Career readiness analysis
- Skill gap identification
- Resume improvement guidance
- Job compatibility scores

## For Companies

- Structured candidate discovery
- AI-assisted candidate ranking
- Filtered talent pools from universities

The MVP focuses on **entry-level software roles in Pakistan**.

---

# 2. Problem Statement

## Students

Many CS graduates in Pakistan struggle to:

- Understand which roles fit their skills
- Identify missing industry skills
- Present their experience effectively
- Discover relevant job opportunities

## Companies

Companies struggle with:

- Unstructured resumes
- Large volumes of weak candidates
- Difficulty discovering talent outside major cities

This creates:

- Poor hiring efficiency
- Low candidate-job alignment
- Underutilized technical talent

CareerBridge AI solves this by structuring candidate data and applying compatibility scoring.

---

# 3. Product Goals

### Goal 1
Convert student resumes into **structured technical profiles**

### Goal 2
Provide **career readiness insights**

### Goal 3
Enable **job-candidate compatibility matching**

### Goal 4
Allow companies to **discover qualified candidates quickly**

---

# 4. Target Users

## 4.1 Students

Primary users:

- Computer Science students
- IT students
- Software Engineering students

Focus:

- Final year students
- Recent graduates (0–2 years experience)

Initial launch university:

- Islamia University of Bahawalpur (IUB)

---

## 4.2 Companies

Companies hiring:

- Junior developers
- Software engineers
- Interns
- QA engineers
- DevOps engineers

Typical employers:

- Software houses
- Startups
- Outsourcing companies

---

## 4.3 Admin

Admin maintains platform integrity.

Responsibilities:

- Company verification
- User moderation
- Monitoring platform activity
- AI output auditing

---

# 5. MVP Scope

The MVP consists of **three core systems**.

---

# 6. System Modules

## 6.1 Student Career Intelligence System

Students can:

- Create profiles
- Upload resumes
- Add skills manually
- Receive AI career analysis
- View job compatibility matches

---

## 6.2 Company Hiring Dashboard

Companies can:

- Create job roles
- Discover candidates
- View ranked matches
- Filter candidates
- Shortlist candidates

---

## 6.3 Matching Engine

Automatically calculates compatibility between:

- Candidate profile
- Job requirements

---

# 7. User Flows

---

## 7.1 Student Flow

1. Student registers
2. Student creates profile
3. Student uploads resume
4. System parses resume
5. System generates structured profile
6. AI generates career report
7. Student reviews recommendations
8. Student opts into company visibility
9. Student receives job matches

---

## 7.2 Company Flow

1. Company registers
2. Admin verifies company
3. Company creates job role
4. System calculates candidate matches
5. Company views ranked candidates
6. Company filters candidates
7. Company shortlists candidates
8. Company contacts candidate

---

# 8. Functional Requirements

## FR-01 Student Registration

Students must be able to register using:

- Email
- Password

Optional fields:

- University
- Degree program
- Graduation year

---

## FR-02 Student Profile Creation

Students must be able to:

- Upload resume (PDF / DOC)
- Add skills manually
- Add projects
- Add technologies used

---

## FR-03 Resume Parsing

The system must extract:

- Skills
- Programming languages
- Technologies
- Education
- Projects
- Experience

Output: **structured candidate profile**

---

## FR-04 Career Readiness Report

AI generates a report including:

- Professional summary
- Suggested career paths
- Skill gap analysis
- Resume improvement suggestions

---

## FR-05 Job Creation

Companies must define:

- Job title
- Required skills
- Experience level
- Education requirement
- Location

---

## FR-06 Candidate Matching

The system calculates compatibility between:

- Candidate profile
- Job requirements

Each job receives a ranked candidate list.

---

## FR-07 Explainable Match Score

Each match displays score breakdown.

Example:

Match Score: **78%**

- Skill Match: 85%
- Project Relevance: 80%
- Education Match: 70%
- Experience Match: 65%

---

## FR-08 Candidate Consent

Students must explicitly allow profile visibility.

Prompt:

Allow companies to view your profile?

- Yes
- No

If **No**, companies cannot access the profile.

---

## FR-09 Candidate Filtering

Companies must filter candidates by:

- Skills
- Education
- Experience
- Match score

---

## FR-10 Candidate Shortlisting

Companies must be able to:

- Shortlist candidates
- Reject candidates

---

## FR-11 Candidate Contact

Companies must contact candidates via:

- Email

---

# 9. Matching Engine

## Matching Triggers

Matching runs when:

- Student updates profile
- Resume uploaded
- Job created

---

## Matching Factors

Compatibility score considers:

1. Skill match
2. Education match
3. Project relevance
4. Experience relevance

---

## MVP Scoring Model

Match Score =

- 40% Skill Match
- 25% Project Relevance
- 20% Education Match
- 15% Experience Match

---

# 10. System Architecture

## Frontend

Technology:

React / Next.js

Dashboards:

- Student dashboard
- Company dashboard
- Admin panel

---

## Backend

Framework:

FastAPI

Responsibilities:

- Authentication
- Resume parsing
- Matching engine
- AI analysis
- API services

---

## AI Layer

Uses LLMs for:

- Resume parsing
- Skill extraction
- Career report generation

---

## Database

PostgreSQL stores:

- Users
- Profiles
- Resumes
- Jobs
- Match scores
- Shortlists

---

# 11. Non-Functional Requirements

## Performance

Resume parsing must complete within **10–30 seconds**

---

## Security

System must include:

- Role-based authentication
- Secure resume storage
- Access control

---

## Scalability

System must support:

- Thousands of students
- Hundreds of companies
- Thousands of jobs

---

## Reliability

Matching must run automatically.

No manual intervention required.

---

# 12. Admin Capabilities

Admins must be able to:

- Approve companies
- Reject companies
- Monitor user activity
- Moderate AI outputs
- Review platform analytics

---

# 13. Success Metrics

## Student Metrics

- Profile completion rate
- Resume uploads
- Career reports generated

---

## Company Metrics

- Jobs posted
- Candidates shortlisted
- Candidates contacted

---

## Platform Metrics

- Candidate-job matches
- Time to shortlist
- User retention

---

# 14. MVP Limitations

The MVP will **not include**:

- Full ATS pipeline
- Interview scheduling
- AI mock interviews
- Mobile app
- Advanced ML ranking models
- University integrations

---

# 15. MVP Timeline

| Phase | Timeline |
|------|--------|
| Design | 1 week |
| Backend development | 2 weeks |
| Frontend development | 2 weeks |
| Testing | 1 week |
| Launch | Week 6 |