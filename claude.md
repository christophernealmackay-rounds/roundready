# RoundReady Project

## Business Requirements

- A web app designed for skilled nursing facilities – beautiful UI, clean, clinical, crisp.
- The application is designed to prevent regulatory penalties related to QAPI’s.
- It should have tabs across the top that allow a user to navigate through the various elements of the application, including a landing dashboard, Angels, Residents, Users, QAPI, Rounds, and Reports.
- It should have a settings gear in the upper right hand corner next to the user profile bubble in which various settings can be managed.
- The QAPI tab should have three functionalities. 1) QAPI template, 2) List of current and archived QAPIs, 3) QAA Committee notes (this will be an open text document that allows facilities to take notes on QAA meeting minutes.
- The dashboard will include data driven visuals regarding the following: 1) individual performance of angels and their rounding completion over time. A visual will show an aggregate number and another visual will show performance by individuals who have rounds assigned to them during the date selector on the top of the dashboard. 2) The dashboard will have KPI cards related to specific QAPI items. QAPI items will be linked to specific rounding questions from the rounds tab. Clicking on a QAPI item KPI card will immediately generate a report that shows relevant details including aggregated data pertaining to the rounding questions tied to that QAPI item.
- Angels tab will be where department heads responsible for angel rounds are configured and assigned residents.
- Residents tab is where residents will be pulled via API to PCC. This is an MVP demo so actual API is not currently available. It will show residents in a list format with room number and assigned angel.
- Users tab is where users will be added, permissions added, department heads assigned, and notifications settings (taken out of settings tab). This is also where residents are assigned to angels. Maintain auto assign functionality, except that residents should be assigned in order, not spread out among angels. For example, room 101 beds a,b,c should all go to the same angel. It should include the admins, angels (department heads), Charge nurses (for issue resolution), and any other users the admin may want to include. Departments include Nursing, Dietary, Activities, MDS, Therapy, Social Services, Housekeeping, Maintenance, Admissions, Medical Records, and the ability to create or remove departments as needed.
- Rounds will have 4 distinctive sections. 1) Angel rounds – these are the questions that are tied to QAPI items. A QAPI item must have a question tied to it. Every rounding question should have the ability to determine if Yes or no triggers an issue as well as an assigned department head to notify if an issue is found 2) A repository of sample questions a user can draw from to build a rounding template of questions for angel rounds. The facility will start with a sample repository and can add or remove questions to sections within the repository. The questions should be drag and drop from the repository to the templates. 3) a RapidRound template where an additional template can be crafted at need and immediately sent out to all rounding angels. This template will have a start and stop date or the ability to stop on demand. Same functionality as angel rounds except the questions are not required to be tied to QAPI items. This is a section for rapid response to potential issues in the facility that a facility administrator or DON may want to gather data on quickly. Think of this as a survey response tactic. 4) A list of archived templates that can be used to create a new template quickly.
- Report tab must be able to pull data filterable by date (custom date picker), filterable by resident, by QAPI, showing aggregated results of all QAPI items, and reports for QAPI items for any and all QAPIs selected from a dropdown list.
- The priority of the application is to create a slick, professional, gorgeous and intuitive UI/UX
- The app should be fully functional in the sense that changes made in one tab will flow correctly through to the other tabs. The logic is as follows: 1) users create the angels that will be used for assigning rounds. 2) Residents and angels move in lock step, when a resident is assigned to an angel they are no longer unassigned, when an angel is marked absent the residents become “unassigned” until they are temporarily redistributed. 3) QAPIs and QAPI items are related to each other with a parent-child relationship and the QAPI items are sections within the Angel rounds template that must contain rounding questions either created from scratch by the user or pulled from the repository of questions. 4) Rounding questions are answered during rounds by angels and the data collected will populate the data required for the report section. 5) the dashboard should be live and reflective of the data from all the other tabs as necessary.
- Much of the seed data to fill the dashboard can be found in supabase. You will need to get credentials to access the database.

## Technical details

- Implemented as a modern NextJS app, client rendered.
- No persistence in the demo. It should restart each time the server is opened.
- Use popular libraries
- Utilize Supabase database for data seeding as needed. Ask me for supabase details when needed.

## Color Scheme and Font

**Color Palette**

**Surfaces**

| **Token** | **Hex** |
| --- | --- |
| Background | \*f3f1ec |
| Background warm | \*ece8e0 |
| Surface | \*fefdfa |
| Surface alt | \*f9f7f2 |
| Surface sunken | \*f5f3ed |

**Brand Blues**

| **Token** | **Hex** |
| --- | --- |
| Blue (primary) | \*1A5FA8 |
| Blue deep | \*0C3F73 |
| Blue ink | \*072B52 |
| Blue mid | \*4A8AC6 |
| Blue pale | \*dbe7f3 |
| Blue tint | \*eaf1f8 |
| Blue wash | \*f4f7fb |

**Text**

| **Token** | **Hex** |
| --- | --- |
| Ink (primary) | \*14171c |
| Ink soft | \*3a3d44 |
| Muted | \*6a6864 |
| Faint | \*928e85 |

**Status Colors**

| **Status** | **Base** | **Mid** | **Pale** | **Tint** | **Edge** |
| --- | --- | --- | --- | --- | --- |
| Green | \*3B6D11 | \*5C9120 | \*e9f1d8 | \*f3f8e7 | \*a8cc6a |
| Red | \*9B1F1F | \*C53030 | \*f9e3e3 | \*fcefef | \*e89a9a |
| Amber | \*7A4A0C | \*B07A1F | \*f5e3c2 | \*faf0d9 | \*e4b96d |
| Plum | \*3C3489 | —   | \*e8e4f5 | \*f1eef9 | —   |

**Borders**

| **Token** | **Hex** |
| --- | --- |
| Hairline | \*e6e2d8 |
| Hairline strong | \*d6d1c3 |
| Hairline soft | \*efebe1 |

**Typography**

| **Role** | **Font** | **Fallbacks** |
| --- | --- | --- |
| Display | Fraunces | Georgia, Times New Roman, serif |
| UI (body) | Inter Tight | \-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif |
| Mono (data) | JetBrains Mono | ui-monospace, SF Mono, Menlo, monospace |

**Type Sizes & Weights**

| **Element** | **Size** | **Weight** | **Notes** |
| --- | --- | --- | --- |
| Body base | 13px | 400 | letter-spacing: -0.005em |
| Logo | 18px | 500 | Fraunces, letter-spacing: -0.02em |
| Nav tabs | 13px | 500 | —   |
| Section headers | 11px | 600 | All-caps, letter-spacing: 0.06em |
| Facility name (topbar) | 11.5px | 400 | letter-spacing: 0.005em |
| User avatar initials | 10.5px | 600 | letter-spacing: 0.02em |

Font features: cv11, ss01, ss02 enabled on body; ss01 on logo.

**Layout & Spacing**

- Topbar height: 56px, sticky, z-index: 100
- Subnav: sticky at top: 56px, z-index: 99
- Page padding: 24px horizontal
- Nav tab padding: 14px 18px
- Body rendering: -webkit-font-smoothing: antialiased

**Gradients**

| **Element** | **Gradient** |
| --- | --- |
| Topbar | linear-gradient(180deg, \*1A5FA8 0%, \*155291 100%) |
| User avatar | linear-gradient(135deg, \*0C447C 0%, \*072B52 100%) |
| Page bg texture | Two subtle radial gradients — blue at top-left, plum at top-right |

**Shadows**

| **Token** | **Value** |
| --- | --- |
| XS  | 0 1px 0 rgba(20,23,28,.04) |
| SM  | 0 1px 2px rgba(20,23,28,.04), 0 1px 0 rgba(20,23,28,.03) |
| MD  | 0 2px 6px rgba(20,23,28,.05), 0 1px 0 rgba(20,23,28,.03) |
| LG  | 0 8px 24px rgba(20,23,28,.08), 0 2px 4px rgba(20,23,28,.04) |
| XL  | 0 24px 60px rgba(7,43,82,.18), 0 4px 12px rgba(20,23,28,.08) |

**Motion**

- Default transition: all 0.2s
- Hover effects: translateY(-1px) on interactive elements

## Strategy

- Write plan with success criteria for each phase to be checked off. Include project scaffolding and rigorous unit testing. Create a plan.md file in the docs tab.
- Execute the plan ensuring all criteria are met, step by step with my approval to start after each step.
- Carry out extensive integration testing with Supabase database
- Create necessary table schema in Subabase as needed.
- Show me detailed plan before executing any work.
- Only show complete once extensive testing has been completed. If you experience an issue, prove the issue by recreating it, prove you recreated it, solve it, test it, prove you solved it before saying it has been solved.

## Coding Standards

1.  Use latest versions of libraries and idiomatic approaches as of today.
2.  Keep it simple – always keep it simple, do not over-engineer, keep defensive programming simple and only use when absolutely necessary. Focus on simplicity in design and code.
3.  Be concise. Create a minimal README with no emojis ever.