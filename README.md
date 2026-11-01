# Shift Market

[Shift Market](https://shift-market.mit-sdg.dev/) is a shift-coverage app designed for the East Campus mail desk (FRED DESK). Desk staff can give up a shift they can't work, and another staff member can claim it. The desk captain creates one-off or weekly shifts and can assign them to staff. The schedule lives on the home page in one calendar. You can [view a short demo](https://youtu.be/Daain-rQxFA) of Shift Market's features and how to use them.

# Features

Please note that currently, Shift Market does not require any credentials to view or make any changes. Registration, sign-in, and authentication are expected to be functional by end of day Sunday, November 1st (see [Planned features](#planned-features).)

- The desk captain can create shifts, which can either be created with an assignee or unassigned and available. Shifts can be created as just one, or as weekly-recurring shifts.
- Desk staff, including the desk captain, can view the calendar with all the current shifts, the staff assigned to work that shift, and the shift status. Shifts appear differently based on whether they are available (need coverage), held by the viewing staff member, or held by any other staff member.
- Desk staff can click to claim any shift that needs coverage, whether that is because it's unassigned or because the assigned staff member is seeking coverage.
- To request coverage for a particular shift they are assigned to, desk staff can click a button on that shift. They will still be assigned to that shift until someone else agrees to cover the shift, i.e. by claiming it.

# User journey

Fionna, desk captain, opens Shift Market and enters her kerberos. The calendar shows the mail desk’s weekly shifts, with 2-hour blocks from 8am to midnight. She creates a weekly shift for Mondays through a date range assigned to cake, and one on Tuesday assigned to nobody, and one on Wednesday assigned to herself. She then claims one of the open shifts, and its block changes to show her name. She cannot claim Cake's shifts. She offers and reclaims one of her shifts.

# Running the tests

Running the test suite should require no additional setup. To view the test without running them, view [tests/all-test-output.txt](tests/all-test-output.txt).

To run Shift Market locally on your computer, you may wish to run [scripts/seed-local.ts](scripts/seed-local.ts) to populate the calendar with shifts in 2-hour blocks, Monday through Sunday, 8am-12am. These shifts start available for anyone to claim.

# Planned Features

- (Close to release) Authentication
- Discord notifications at time of shift creation and a reminder two hours before an unfilled shift.

# Acknowledgements

Shift Market is a project created for 6.104 at MIT with Professor Daniel Jackson. Shoutout to Daniel and all the TA's who have helped me thus far: Amalia, Carmel, and Kartik.