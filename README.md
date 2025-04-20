# Smart Meter UI

This is the web frontend for a smart meter project. It displays real-time and historical energy metrics, fetched from AWS Lambda endpoints.

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/smart-meter-ui.git
   ```

2. Open the project in VSCode or any code editor.

3. Use Live Server or similar extension to serve `index.html`:
   ```bash
   # Using VSCode Live Server
   Right-click index.html > Open with Live Server
   ```
   Or manually serve:
   ```bash
   cd smart-meter-ui
   python3 -m http.server
   # Then go to http://localhost:8000
   ```

## API Integration
Make sure the following Lambda endpoints are live:
- `/latest` – returns latest power reading
- `/avgbetween/<ts1>/<ts2>` – returns average power between two timestamps

Update `api.js` accordingly to use those endpoints.

## Individual Grid Customization
Each contributor has their own grid section:
- Sol
- Kiran
- Jint
- Rasyid
- Yousef

Each section has two `<div>`s for:
- `#name-energy`
- `#name-finance`

Use jQuery `.toggle()` logic already set up in `main.js` to switch between views.

## Notes
- The `data/` folder is currently retained for backup/dummy testing. All live data is fetched via API.

## Notification System
- To use the phone notification system, you must set up an account with Twilio and start up a Whatapp Sandbox.
- After that create a .env file which will include your: TWILIO_SID, TWILIO_AUTH_TOKEN, MY_PHONE_NUMBER and PORT.
- Run the server.js file and the UI.
- Test using notification button.