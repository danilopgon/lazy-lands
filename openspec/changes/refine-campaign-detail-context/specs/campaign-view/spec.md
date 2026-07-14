# Delta for campaign-view

## MODIFIED Requirements

### Requirement: Campaign detail screen

The system MUST retain the campaign breadcrumb, system/tone/updated header, stat ledger, world-state editor, and existing header actions. Recent sessions MUST show only the newest three sessions in ascending session-number order within that subset, with only the localized **Log session** action and no history route or “View all sessions” link. Active memories MUST show the newest three active facts with localized type, content, and origin/source; arcs MUST show at most three active/dormant records ordered high, medium, low with stable source order for equal priority. Only those two panels MUST offer localized “View all” links to their existing Memory Review and Arcs routes. Each panel MUST retain independent loading, error/retry, empty, and success states without changing fetches.

(Previously: detail showed all active memories, sliced eligible arcs without priority ordering, and used earlier specialist-link copy.)

#### Scenario: Bounded chronological context
- GIVEN more than three sessions, active facts, and eligible arcs
- WHEN campaign detail renders
- THEN it shows the newest three sessions chronologically, three newest facts, and three priority-ordered arcs
- AND only memory and arc panels expose their truthful existing-route “View all” links

#### Scenario: Panel failures remain isolated
- GIVEN one child collection request fails while another resolves
- WHEN campaign detail renders
- THEN the failing panel shows its retryable error and the resolved panel keeps its own result

#### Scenario: No eligible arcs
- GIVEN all arcs are resolved or discarded
- WHEN campaign detail renders
- THEN the arcs preview is empty and no terminal arc is displayed
