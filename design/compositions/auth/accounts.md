# Accounts

Every user is created by `Registering.register`, which stores the username other people type to find them. `Sessioning.use` returns a session's user on each request. Neither concept refers to the other. Each way of signing in is a composition of its own: it registers or looks up a user, then calls `Sessioning.start`. To reuse accounts, copy this composition with one or more ways of signing in, such as [passwords](passwords.md); the frontend calls them through `web/src/reusable/session.ts`.

The [me endpoint](reaction:Accounts.identifyMe) passes the session to `Sessioning.use`, which returns the user, then responds with the user's username from `Registering._username`. Every endpoint that requires a session starts the same way: `Sessioning.use` returns the session's user, or the request is refused with `NOT_SIGNED_IN`. Each endpoint reads the user from the session, never from the request's inputs. Each way of signing in responds with the user, and the page then calls the me endpoint for the username.

```endpoints
Accounts.identifyMe at /auth/me
```

The [sign-out endpoint](reaction:Accounts.SignOut) ends the session with Sessioning, and the HTTP server clears the cookie. If the person is also signed in on another computer, they stay signed in there.

```endpoints
Accounts.SignOut at /auth/logout
```
