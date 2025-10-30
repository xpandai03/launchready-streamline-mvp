  connectUrl: 'https://getlate.dev/api/v1/connect/instagram?profileId=69015eae11ddd21e5caf5959&redirect_url=http%3A...'
}
[OAuth] Connect URL generated: {
  userId: 'a3e00873-f28f-49bc-a4c3-ea43ac964512',
  platform: 'instagram',
  profileId: '69015eae11ddd21e5caf5959'
}
3:09:29 AM [express] GET /api/social/connect/instagram 200 in 7111ms :: {"success":true,"connectUrl"…
     ==> Deploying...
==> Running 'npm run start'
> rest-express@1.0.0 start
> NODE_ENV=production node dist/index.js
3:16:21 AM [express] serving on port 10000
     ==> Your service is live 🎉
     ==> 
     ==> ///////////////////////////////////////////////////////////
     ==> 
     ==> Available at your primary URL https://launchready-streamline-mvp.onrender.com
     ==> 
     ==> ///////////////////////////////////////////////////////////
     [GET]200launchready-streamline-mvp.onrender.com/clientIP="34.82.242.193" requestID="646428a5-5928-4d2c" responseTimeMS=6 responseBytes=1181 userAgent="Go-http-client/2.0"
     ==> Detected service running on port 10000
     ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
     [GET]200launchready-streamline-mvp.onrender.com/settings/social-accountsclientIP="76.95.213.107" requestID="f2dde0e8-8c8f-458a" responseTimeMS=7 responseBytes=1181 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/assets/index-SJfQOmmq.cssclientIP="76.95.213.107" requestID="630363b0-1645-400c" responseTimeMS=6 responseBytes=13475 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/assets/index-D-J-Py5I.jsclientIP="76.95.213.107" requestID="95cc2f58-c747-41f6" responseTimeMS=37 responseBytes=171426 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/favicon.icoclientIP="76.95.213.107" requestID="87807742-0ff7-4a42" responseTimeMS=3 responseBytes=1181 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/api/social/accountsclientIP="76.95.213.107" requestID="937218b8-7dff-4fd3" responseTimeMS=2086 responseBytes=337 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/assets/index-SJfQOmmq.cssclientIP="76.95.213.107" requestID="bd194af1-7b3c-4426" responseTimeMS=7 responseBytes=13475 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/settings/social-accountsclientIP="76.95.213.107" requestID="86d01697-9101-4bb7" responseTimeMS=2 responseBytes=1181 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/assets/index-D-J-Py5I.jsclientIP="76.95.213.107" requestID="666de8b8-4ed6-47a9" responseTimeMS=91 responseBytes=171426 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
     [GET]200launchready-streamline-mvp.onrender.com/favicon.icoclientIP="76.95.213.107" requestID="aa3f9580-42f8-435f" responseTimeMS=2 responseBytes=1181 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
[Social Accounts] Fetching accounts for user: a3e00873-f28f-49bc-a4c3-ea43ac964512
[Late Service] Fetching accounts: {
  profileId: '69015eae11ddd21e5caf5959',
  url: 'https://getlate.dev/api/v1/accounts?profileId=69015eae11ddd21e5caf5959'
}
[Late Service] Accounts fetched: { count: 0, accounts: [] }
[Social Accounts] Accounts fetched: { userId: 'a3e00873-f28f-49bc-a4c3-ea43ac964512', count: 0 }
3:22:49 AM [express] GET /api/social/accounts 200 in 2085ms :: {"success":true,"accounts":[],"profil…
[Social Accounts] Fetching accounts for user: a3e00873-f28f-49bc-a4c3-ea43ac964512
[Late Service] Fetching accounts: {
  profileId: '69015eae11ddd21e5caf5959',
  url: 'https://getlate.dev/api/v1/accounts?profileId=69015eae11ddd21e5caf5959'
}
[Late Service] Accounts fetched: { count: 0, accounts: [] }
[Social Accounts] Accounts fetched: { userId: 'a3e00873-f28f-49bc-a4c3-ea43ac964512', count: 0 }
3:22:57 AM [express] GET /api/social/accounts 200 in 1085ms :: {"success":true,"accounts":[],"profil…
     [GET]200launchready-streamline-mvp.onrender.com/api/social/accountsclientIP="76.95.213.107" requestID="b7266dbb-2163-46aa" responseTimeMS=1088 responseBytes=337 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
[OAuth] Connect request: {
  userId: 'a3e00873-f28f-49bc-a4c3-ea43ac964512',
  platform: 'instagram'
}
[Late Service] Generated connect URL: {
  profileId: '69015eae11ddd21e5caf5959',
  platform: 'instagram',
  redirectUrl: 'http://localhost:5000/oauth-callback',
  connectUrl: 'https://getlate.dev/api/v1/connect/instagram?profileId=69015eae11ddd21e5caf5959&redirect_url=http%3A...'
}
[OAuth] Connect URL generated: {
  userId: 'a3e00873-f28f-49bc-a4c3-ea43ac964512',
  platform: 'instagram',
  profileId: '69015eae11ddd21e5caf5959'
}
3:23:02 AM [express] GET /api/social/connect/instagram 304 in 305ms :: {"success":true,"connectUrl":…
     [GET]304launchready-streamline-mvp.onrender.com/api/social/connect/instagramclientIP="76.95.213.107" requestID="6b4559e3-3f9a-4dc6" responseTimeMS=305 responseBytes=179 userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"