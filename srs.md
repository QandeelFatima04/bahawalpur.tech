Below is a **Software Requirements Specification (SRS)** derived from the provided PRD for **CareerBridge AI**. The structure follows a standard **IEEE-style SRS format** so your engineering team (frontend, backend, AI, DevOps) can implement the system with minimal ambiguity.

Source reference: 

---

# Software Requirements Specification (SRS)

# CareerBridge AI

Version: 1.0
Based on: PRD v2.0
Target Launch: Pakistan
Initial Deployment: Islamia University of Bahawalpur (IUB)

---

# 1. Introduction

## 1.1 Purpose

This document specifies the **software requirements for CareerBridge AI**, a platform that structures student resumes into technical profiles and matches them with relevant job opportunities using an AI-assisted compatibility scoring system.

The SRS defines:

* System functionality
* User interactions
* System architecture
* Data structures
* Non-functional constraints

This document is intended for:

* Backend engineers
* Frontend engineers
* AI engineers
* DevOps engineers
* QA teams

---

# 2. System Overview

CareerBridge AI is a **career intelligence and recruitment platform** designed to improve the alignment between **technical graduates and entry-level software roles**.

The system performs three core tasks:

1. Resume parsing and profile structuring
2. AI-based career readiness analysis
3. Candidate-job compatibility matching

Primary users include:

* Students
* Hiring companies
* Platform administrators

---

# 3. Definitions

| Term              | Definition                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Candidate Profile | Structured representation of a student’s technical background       |
| Resume Parsing    | Extraction of structured information from uploaded resumes          |
| Matching Engine   | Algorithm that calculates compatibility between candidates and jobs |
| Career Report     | AI-generated career readiness analysis                              |
| Match Score       | Numeric compatibility score between candidate and job               |

---

# 4. System Scope

The MVP will include:

### Student Career Intelligence System

* Profile creation
* Resume upload
* AI career insights
* Job compatibility scores

### Company Hiring Dashboard

* Job posting
* Candidate discovery
* Ranked candidate lists
* Candidate shortlisting

### Matching Engine

* Automated compatibility scoring between candidates and jobs

---

# 5. User Classes

## 5.1 Student

Students use the platform to:

* Upload resumes
* Build profiles
* Receive career insights
* Discover jobs

Typical user characteristics:

* Final-year CS students
* Software engineering graduates
* Early-career developers

---

## 5.2 Company

Companies use the system to:

* Create job listings
* Discover qualified candidates
* Filter candidates
* Contact candidates

Typical organizations:

* Software houses
* Startups
* Outsourcing companies

---

## 5.3 Administrator

Administrators maintain platform integrity.

Responsibilities include:

* Company verification
* User moderation
* AI output auditing
* System monitoring

---

# 6. System Architecture

## 6.1 High-Level Architecture

```
Frontend (React / Next.js)

        |

API Layer (FastAPI)

        |

Core Services
- Authentication
- Resume Parsing
- Matching Engine
- AI Analysis

        |

Database (PostgreSQL)
```

---

## 6.2 System Components

### Frontend

Technologies:

* React
* Next.js

Interfaces:

* Student Dashboard
* Company Dashboard
* Admin Panel

---

### Backend

Framework:

* FastAPI

Responsibilities:

* API services
* Authentication
* Resume parsing orchestration
* Matching engine logic
* AI interaction

---

### AI Layer

Uses LLM-based services for:

* Resume parsing
* Skill extraction
* Career report generation

---

### Database

Database: PostgreSQL

Stores:

* Users
* Profiles
* Jobs
* Match scores
* Resume metadata
* Shortlists

---

# 7. Functional Requirements

## FR-01 Student Registration

The system shall allow students to register using:

Required:

* Email
* Password

Optional:

* University
* Degree program
* Graduation year

---

## FR-02 Student Authentication

The system shall support:

* Login
* Logout
* Session management
* Password reset

---

## FR-03 Student Profile Management

Students shall be able to:

* Create profile
* Edit profile
* Add skills manually
* Add projects
* Add technologies used

---

## FR-04 Resume Upload

Students shall be able to upload resumes in:

Supported formats:

* PDF
* DOC
* DOCX

Uploaded resumes shall be stored securely.

---

## FR-05 Resume Parsing

The system shall extract the following from resumes:

* Skills
* Programming languages
* Frameworks
* Technologies
* Education
* Work experience
* Projects

The output shall generate a **structured candidate profile**.

---

## FR-06 Career Readiness Report

The AI module shall generate a career analysis including:

* Professional summary
* Suggested career paths
* Skill gap analysis
* Resume improvement suggestions

---

## FR-07 Candidate Visibility Consent

The system shall request candidate consent before making their profile visible to companies.

Options:

* Allow visibility
* Deny visibility

If denied, the profile shall not be searchable.

---

## FR-08 Job Creation

Companies shall be able to create job postings with the following fields:

* Job title
* Required skills
* Experience level
* Education requirement
* Location
* Job description

---

## FR-09 Candidate Matching

The system shall calculate compatibility between:

* Candidate profiles
* Job requirements

Each job shall generate a **ranked candidate list**.

---

## FR-10 Explainable Match Score

Each match shall display a breakdown including:

Example:

```
Match Score: 78%

Skill Match: 85%
Project Relevance: 80%
Education Match: 70%
Experience Match: 65%
```

---

## FR-11 Candidate Filtering

Companies shall be able to filter candidates by:

* Skills
* Education
* Experience
* Match score

---

## FR-12 Candidate Shortlisting

Companies shall be able to:

* Shortlist candidates
* Reject candidates

---

## FR-13 Candidate Contact

Companies shall be able to contact candidates via:

* Email

---

## FR-14 Admin Company Verification

Admins shall approve or reject company registrations before they can post jobs.

---

## FR-15 Admin Monitoring

Admins shall be able to:

* Monitor user activity
* Review AI outputs
* View platform analytics

---

# 8. Matching Engine Specification

## 8.1 Matching Triggers

Matching shall run when:

* Resume uploaded
* Student updates profile
* New job created

---

## 8.2 Matching Factors

The compatibility score shall include:

| Factor            | Weight |
| ----------------- | ------ |
| Skill Match       | 40%    |
| Project Relevance | 25%    |
| Education Match   | 20%    |
| Experience Match  | 15%    |

---

## 8.3 Matching Output

The matching engine shall output:

* Ranked candidate list
* Match score
* Score explanation

---

# 9. Data Model

## 9.1 Core Entities

### Users

```
User
- id
- email
- password_hash
- role
- created_at
```

---

### Candidate Profile

```
CandidateProfile
- user_id
- university
- degree
- graduation_year
- skills
- projects
- experience
- visibility_flag
```

---

### Job

```
Job
- id
- company_id
- title
- required_skills
- experience_level
- education_requirement
- location
- description
```

---

### Match Score

```
Match
- id
- candidate_id
- job_id
- skill_score
- project_score
- education_score
- experience_score
- total_score
```

---

### Shortlist

```
Shortlist
- id
- company_id
- candidate_id
- job_id
- status
```

---

# 10. Non-Functional Requirements

## 10.1 Performance

Resume parsing must complete within:

10–30 seconds.

---

## 10.2 Security

The system must include:

* Role-based authentication
* Secure file storage
* Access control
* Password hashing

---

## 10.3 Scalability

The system must support:

* Thousands of students
* Hundreds of companies
* Thousands of job listings

---

## 10.4 Reliability

The matching engine must operate automatically without manual intervention.

---

## 10.5 Maintainability

The system must follow modular architecture:

* Independent services
* API-first design
* Clear service boundaries

---

# 11. System Constraints

The MVP will **not include**:

* Interview scheduling
* Full ATS pipeline
* AI mock interviews
* Mobile application
* Advanced ML ranking models
* University integrations

---

# 12. Success Metrics

## Student Metrics

* Profile completion rate
* Resume uploads
* Career reports generated

---

## Company Metrics

* Jobs posted
* Candidates shortlisted
* Candidates contacted

---

## Platform Metrics

* Candidate-job matches generated
* Time to shortlist
* Platform retention

---

# 13. Deployment Plan

Deployment environment:

* Cloud infrastructure (AWS/GCP)
* Containerized backend services
* PostgreSQL managed database

CI/CD pipeline should include:

* Automated testing
* Code linting
* Security scanning

---