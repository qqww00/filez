Feature: Mobile search and sorting controls
  As a user searching and organizing files on a smartphone or tablet
  I want touch-adapted search inputs and a compact mobile sorting selector
  So that I can quickly find and arrange files without UI controls overflowing or being obscured by virtual keyboards

  Background:
    Given the user is logged into the file manager on a mobile device with viewport width 375 pixels
    And the directory contains the following items:
      | name               | type      | size       | modified_at          |
      | Archives           | directory | -          | 2026-10-20T08:00:00Z |
      | Invoices           | directory | -          | 2026-10-22T09:00:00Z |
      | invoice-101.pdf    | file      | 524288     | 2026-10-23T14:00:00Z |
      | invoice-102.pdf    | file      | 1048576    | 2026-10-23T15:00:00Z |
      | vacation-photo.jpg | file      | 4194304    | 2026-10-21T18:00:00Z |

  Scenario: Instant file filtering on mobile without horizontal clipping
    When the user enters "invoice" into the search bar
    Then only "Invoices", "invoice-101.pdf", and "invoice-102.pdf" are visible in the list
    And the match counter displays "3 matches found"
    And all search controls fit within the mobile viewport width

  Scenario: Mobile search input maintains accessible font size to prevent automatic browser zoom
    When the user taps the search input field to activate the on-screen keyboard
    Then the search input font size is at least 16 pixels to prevent mobile browser auto-zooming
    And the search input, clear button, and subfolder toggle remain visible above the keyboard

  Scenario: Clearing search restores full directory listing
    Given the user has filtered the list with query "photo"
    When the user taps the clear search button
    Then the search input is cleared
    And all 5 original items are displayed in the directory listing

  Scenario: No matching results displays a touch-friendly empty state
    When the user enters "nonexistent-contract" into the search bar
    Then the message "No matching files or folders found" is displayed
    And the empty state card is centered within the mobile screen margins
    And no action buttons are clipped

  Scenario: Subfolder search toggle adapts to narrow screen width
    When the user taps the subfolder search toggle button
    Then the button state changes to active with label "Subfolders: ON"
    And the toggle button has a minimum touch target height of 44 pixels
    And the search bar container does not exceed the 375 pixel screen width

  Scenario Outline: Mobile sorting selector reorders directory contents while keeping folders grouped
    When the user selects "<sort_option>" from the mobile sort dropdown
    Then the directory items are sorted by "<sort_field>" in "<sort_direction>" order
    And directory folders remain grouped at the top of the list
    And the selected sort preference persists when navigating between folders

    Examples:
      | sort_option            | sort_field | sort_direction |
      | Name (A to Z)          | name       | asc            |
      | Name (Z to A)          | name       | desc           |
      | Size (Largest first)   | size       | desc           |
      | Size (Smallest first)  | size       | asc            |
      | Modified (Newest first)| date       | desc           |
      | Modified (Oldest first)| date       | asc            |
      | Type (A to Z)          | type       | asc            |
      | Type (Z to A)          | type       | desc           |
