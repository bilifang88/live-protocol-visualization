# Application Layer Protocol Visualizer

## Requirements
- Python 3.9+
- FastAPI
- Uvicorn

## Run

Open a terminal in this project folder:

```bash
pip install fastapi uvicorn
uvicorn app:app --reload
```

Then open:

http://127.0.0.1:8000

## Features
- Exactly two main panels
- Browsing: simulated DNS query/response + HTTP GET/response
- Mail: simulated DNS + SMTP EHLO, MAIL FROM, RCPT TO, DATA, QUIT
- Streaming: simulated DNS + HTTP manifest and segment requests
- Animated progressive protocol reveal
- Previous / Next / Pause / Replay controls
- Activity status and log
- Responsive layout for smaller screens

## Important
The project intentionally simulates protocol exchanges rather than opening real network sockets. This follows the assignment allowance that protocol simulation is acceptable.
