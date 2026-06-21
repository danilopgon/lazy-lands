# Requirements and Acceptance Criteria

This document contains the functional requirements for the Lazy Lands MVP.

Acceptance criteria follow the Given-When-Then format.

## Auth

### US-01 — User registration

As a DM without an account,  
I want to register with email and password,  
so that I can access my campaigns from any device.

#### Acceptance criteria

Given I am on the registration page,  
When I enter a valid email and a password with at least 8 characters and submit the form,  
Then my account is created using Supabase Auth and I am redirected to the first campaign onboarding flow.

Given I am on the registration page,  
When I enter an email that already exists,  
Then I see an error message and the form is not submitted.

Given I am on the registration page,  
When I enter a password shorter than 8 characters,  
Then the password field shows a validation error before submitting.

### US-02 — Login

As a registered DM,  
I want to log in with email and password,  
so that I can access my saved campaigns.

#### Acceptance criteria

Given I am on the login page,  
When I enter valid credentials,  
Then I am authenticated and redirected to my campaign list.

Given I enter invalid credentials,  
When the login fails,  
Then I see a generic authentication error.

Given I am not authenticated,  
When I try to access a protected route,  
Then I am redirected to the login page.

## Campaign onboarding

### US-03 — Create campaign from free text

As an authenticated DM,  
I want to paste my campaign notes into a free text field,  
so that the app can extract NPCs, factions and world state automatically.

#### Acceptance criteria

Given I am on the new campaign page,  
When I paste a campaign description of at least 100 characters and click "Analyze campaign",  
Then the AI extracts NPCs, factions and initial world state.

Given the AI has extracted campaign data,  
When I review the result,  
Then all extracted fields are editable before saving.

Given the AI call fails,  
When I try to analyze the campaign,  
Then I see a clear retryable error and my original input is not lost.

Given the input is too short,  
When I try to analyze the campaign,  
Then the submit action is disabled or validation feedback is shown.

## Campaign view

### US-04 — View and edit world state

As an authenticated DM,  
I want to view and edit the current world state,  
so that my campaign remains up to date between sessions.

#### Acceptance criteria

Given I am on a campaign detail page,  
When I edit the world state and save,  
Then the updated world state is persisted.

Given I own multiple campaigns,  
When I open one campaign,  
Then I only see data belonging to that campaign.

### US-05 — Manage open arcs

As an authenticated DM,  
I want to create and update open arcs,  
so that pending conflicts and unresolved threads are considered in future sessions.

#### Acceptance criteria

Given I am on a campaign detail page,  
When I create an arc with title, description and priority,  
Then the arc is persisted and displayed as open.

Given an arc exists,  
When I mark it as resolved or dropped,  
Then it no longer appears as an open arc in generation context.

Given an arc belongs to another user,  
When I try to access it,  
Then the system rejects the operation.

## Sessions

### US-06 — Register played session

As an authenticated DM,  
I want to record what happened in a played session,  
so that the app can use it as context for future generation.

#### Acceptance criteria

Given I am on the new session page,  
When I enter a summary and consequences,  
Then the session is saved with the correct session number.

Given I try to save an empty session,  
When I submit the form,  
Then I see a validation error and no session is created.

### US-07 — Review memory suggestions

As an authenticated DM,  
I want to review important memories detected by AI,  
so that I decide what becomes active campaign memory.

#### Acceptance criteria

Given I have just saved a session,  
When the AI processing finishes,  
Then I see between 0 and 5 memory suggestions.

Given I see a memory suggestion,  
When I accept it,  
Then it is saved as an active MemoryFact.

Given I see a memory suggestion,  
When I reject it,  
Then it is not saved as active memory.

Given I edit a memory suggestion before accepting it,  
When I accept it,  
Then the edited version is saved as the MemoryFact.

## Generation

### US-08 — Generate next session

As an authenticated DM,  
I want to prepare the next session with one action,  
so that I receive a coherent proposal based on campaign history.

#### Acceptance criteria

Given I have campaign context, sessions, open arcs and accepted memories,  
When I click "Prepare session",  
Then the AI generates a structured session proposal.

The generated proposal must include:

- Title.
- Synopsis.
- Main objective.
- Twist or complication.
- Encounters.
- Faction reactions.
- Arc progression.
- Connections to previous events or accepted memories.

Given the LLM returns invalid JSON,  
When the backend validates it,  
Then the invalid output is rejected and no corrupt data is persisted.

Given the campaign has no previous sessions,  
When I prepare a session,  
Then the system generates an opening session based on initial campaign context.

### US-09 — Copy or export generated session

As an authenticated DM,  
I want to copy or export the generated session,  
so that I can use it at the table.

#### Acceptance criteria

Given I am viewing a generated session,  
When I click "Copy session",  
Then the structured content is copied in a readable format.

Given PDF export is implemented,  
When I click "Export PDF",  
Then a readable PDF is downloaded.

Given PDF export fails,  
When I try to export,  
Then I see a clear error and no corrupted file is downloaded.
