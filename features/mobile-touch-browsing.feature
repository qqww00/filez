Feature: Mobile touch-first file browsing and navigation
  As a user accessing Filez from a smartphone or tablet
  I want a responsive, touch-friendly interface
  So that I can comfortably browse folders, view metadata, and open media without horizontal scrolling

  Background:
    Given the user is logged into the file manager on a mobile device with viewport width 375 pixels and height 667 pixels
    And the current directory contains the following items:
      | name                         | type      | size       | modified_at          |
      | Documents                    | directory | -          | 2026-10-23T10:00:00Z |
      | Photos                       | directory | -          | 2026-10-23T11:00:00Z |
      | quarterly-budget-report.xlsx | file      | 2457600    | 2026-10-23T12:00:00Z |
      | presentation-slides.pdf      | file      | 15728640   | 2026-10-23T13:30:00Z |

  Scenario: Tap-to-navigate into a directory with touch feedback
    When the user taps the folder row "Documents"
    Then the user navigates into the "Documents" folder
    And the breadcrumbs display "Home / Documents"
    And the page width fits within the mobile viewport with no horizontal scrollbar

  Scenario: Extremely long filename truncates gracefully without pushing action buttons
    Given a file named "annual-financial-report-consolidated-final-approved-signed-v2-draft-review.pdf" exists in the current folder
    When the user views the directory listing on the mobile screen
    Then the filename is truncated with an ellipsis
    And the download, copy, and delete action buttons remain fully visible on the screen
    And no horizontal page overflow occurs

  Scenario: Deeply nested directory breadcrumb trail enables horizontal touch scrolling
    Given the user has navigated into "Documents/Projects/2026/Q4/Marketing/Campaigns"
    When the user views the navigation header on a screen width of 375 pixels
    Then the breadcrumb trail is horizontally scrollable with touch momentum
    And the user can tap any ancestor directory "Projects" to navigate directly to it

  Scenario: Interactive controls meet minimum touch target dimensions
    When the user inspects all interactive elements on the mobile screen
    Then the folder rows, action buttons, breadcrumb links, and refresh button have a touch target area of at least 44 by 44 pixels
    And adjacent buttons have at least 8 pixels of touch separation

  Scenario: Navigating to a non-existent or deleted folder displays a responsive error banner
    Given the folder "DeletedFolder" has been removed on the server
    When the user attempts to navigate to "DeletedFolder"
    Then an error notification "Failed to read directory" is displayed
    And the error notification fits within the mobile screen margins
    And the user can tap the breadcrumb "Home" to return to the root folder

  Scenario Outline: Layout adapts fluidly across various handheld screen sizes without overflow
    Given the user opens the file manager on a device with screen width "<width>" pixels and height "<height>" pixels
    When the directory contents are displayed
    Then the page layout has 0 pixels of horizontal page overflow
    And all action buttons are visible within "<width>" pixels
    And the brand title and primary header actions do not overlap

    Examples:
      | width | height | device_profile           |
      | 320   | 568    | Compact phone (SE)       |
      | 360   | 800    | Standard Android phone   |
      | 375   | 667    | Standard iPhone          |
      | 390   | 844    | Modern iPhone            |
      | 412   | 915    | Large Android phone      |
      | 768   | 1024   | Tablet portrait view     |
