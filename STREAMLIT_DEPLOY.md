# Streamlit Community Cloud deployment

This repository has two services: the Streamlit UI (`streamlit_app.py`) and FastAPI (`main.py`). Streamlit Community Cloud runs the UI, not the FastAPI API. Host the API separately and give it persistent storage before deploying the UI.

## 1. Deploy the FastAPI backend

Build and run the repository's `Dockerfile` on a container host that supports a persistent disk or volume:

- The container listens on the platform-provided `PORT` (default `8000`).
- Attach a persistent disk mounted at `/data`. The app stores SQLite at `/data/clinic.db`.
- Use one API instance with SQLite. Do not scale this container horizontally; SQLite on a mounted local disk is not a shared multi-instance database.
- Configure these variables in the backend host's secret/environment settings. Do not put their values in Git:
  - `OPENROUTER_API_KEY` — replacement key entered directly in the hosting dashboard; never use a key exposed in chat.
  - `SECRET_KEY` — a long, randomly generated, stable signing key.
  - `DOCTOR_INVITE` — a private registration invite; rotate it if it has been shared.
  - `OPENROUTER_MODEL` — optional; defaults to `anthropic/claude-sonnet-4.5`.
  - `DATABASE_PATH=/data/clinic.db`
- After deployment, check `https://<your-api-host>/health`. Keep the API URL on HTTPS.

The Docker image contains the API code only. The database must be backed up separately by the host's supported backup process.

## 2. Deploy the Streamlit UI

1. Push the application files to a GitHub repository you control. The repository may be public or private, but never commit `.env`, `clinic.db`, `.streamlit/secrets.toml`, API keys, user records, or other secrets. Root `requirements.txt` contains only the Streamlit UI dependencies; the API container installs the separate `requirements-api.txt`.
2. In Streamlit Community Cloud, create an app from that repository, select the branch containing the app, and set the app file to `streamlit_app.py`.
3. In the app's **Advanced settings → Secrets**, set:

   ```toml
   MEDINTEL_API_URL = "https://<your-api-host>"
   ```

   Alternatively, set the same `MEDINTEL_API_URL` in the UI service's environment. The UI does not need the OpenRouter key; keep that only on the API host.
4. Deploy and check that the UI can reach the API. Register a synthetic test patient and doctor, verify login and the AI route, then remove the test records.

For local development, `.streamlit/secrets.toml.example` shows the expected format. Copy it to `.streamlit/secrets.toml` and replace the example API URL. The actual secrets file is ignored by Git.

## Important limitations

This project is a demonstration, not a production clinical system. It does not provide production-grade privacy, compliance, access governance, database encryption/key management, backup/restore procedures, abuse protection, or a clinical drug database. AI requests send chat content and relevant patient-record context to OpenRouter and the selected model provider. Use synthetic data only unless the organization has approved the providers and completed the required privacy, consent, security, and regulatory reviews.
