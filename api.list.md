# DevTinder APIs

---

## AuthRouter

- POST /user/auth/signup -- done
- POST /user/auth/login -- done
- POST /user/auth/logout --

## ProfileRouter

- GET /user/profile/view
- PATCH /user/profile/edit
- PATCH /user/profile/password

## RequestRouter

- POST /user/request/interested/:userID
- POST /user/request/ignore/:userID
- POST /user/request/accept/:requestId
- POST /user/request/reject/:requestId

## UserRouter

- GET /user/matches
- GET /user/receivedConnectionRequests
- GET /user/feed
