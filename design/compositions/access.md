# Access

This composition sets rules for who may do what with shifts. These rules are written as views, and every endpoint a user calls about a shift evaluates a view first to confirm that the caller has access to the action they are trying to perform. Other compositions call on these views to enforce access gating.

A user can be [a desk captain](view:access.IsCaptain).

A user [owns a shift](view:access.Owns) when their kerberos is the holder of that shift.