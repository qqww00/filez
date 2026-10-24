Feature: Mobile dialogs, media player, and upload progress drawer
  As a user managing files on a mobile phone or tablet
  I want modal dialogs, media viewers, and upload progress to adapt to handheld screen dimensions
  So that I can confirm actions, watch videos, and monitor uploads without controls overflowing the viewport

  Background:
    Given the user is on a mobile device with viewport width 375 pixels and height 667 pixels
    And the application has an active session

  Scenario: Delete confirmation dialog renders as a responsive card with accessible action buttons
    Given a file named "notes.txt" is selected for deletion
    When the delete confirmation dialog opens on the mobile screen
    Then the dialog width does not exceed the mobile viewport width minus margins
    And both "Cancel" and "Delete" buttons have a minimum touch target size of 44 by 44 pixels
    And the background page scrolling is locked while the dialog is active

  Scenario: Copy destination dialog provides internal scrolling without spilling outside the screen
    Given a file named "report.pdf" is selected to copy
    And the filesystem contains 20 destination folders
    When the copy destination dialog opens
    Then the dialog height does not exceed 90% of the mobile viewport height
    And the folder selection list scrolls smoothly with touch momentum inside the dialog
    And the "Confirm Copy" and "Cancel" buttons remain pinned and visible at the bottom of the dialog

  Scenario: Upload progress drawer anchors as a responsive bottom sheet
    Given 3 files are currently uploading in the background
    When the user views the upload progress drawer on mobile
    Then the drawer is docked to the bottom of the mobile viewport spanning full screen width
    And the drawer header provides a toggle button to expand or minimize the sheet
    And each uploading file item has a touch-friendly cancel button of at least 44 by 44 pixels

  Scenario: Video player modal scales to full mobile viewport with enlarged touch controls
    Given a video file "1000071049.mp4" exists in the folder
    When the user taps the video file to start playback
    Then the video player modal fills 100% of the mobile viewport
    And the playback scrubber has an enlarged touch hit area of at least 36 pixels in height
    And the play, pause, fullscreen, and close buttons have touch targets of at least 48 by 48 pixels

  Scenario: Dismissing a modal restores background scrollability
    Given the delete confirmation dialog is open
    When the user taps the "Cancel" button or backdrop
    Then the dialog closes
    And scrolling on the main file listing is re-enabled

  Scenario Outline: Dialogs adapt smoothly to device orientation rotation without losing state
    Given the "<dialog_type>" is active on a mobile device in "<initial_orientation>" orientation
    When the user rotates the device to "<new_orientation>" orientation
    Then the "<dialog_type>" recalculates its dimensions within 300 milliseconds
    And all action buttons remain fully visible on the screen
    And no form inputs or selections are lost

    Examples:
      | dialog_type        | initial_orientation | new_orientation |
      | Login Modal        | portrait (375x667)  | landscape (667x375) |
      | Copy Dialog        | portrait (375x667)  | landscape (667x375) |
      | Delete Dialog      | portrait (375x667)  | landscape (667x375) |
      | Video Player       | portrait (375x667)  | landscape (667x375) |
      | Upload Drawer      | landscape (667x375) | portrait (375x667) |
