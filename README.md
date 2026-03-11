# Custom TwinCAT node for n8n (Example)
This repo will be a demo of a how to integrate TwinCAT into n8n. As n8n nodes are written in JavaScript or typescript, this will need to have ads-client for nodeJS.

```shell
git clone https://github.com/sebastienlindqvist/TwinCAT-n8n-Example.git
cd TwinCAT-n8n-Example/n8n-nodes-twincat-ads
```

## Option A: Deploy as a Docker container

1. Install dependencies and build the node
```shell
npm install
npm run build
```

2. Build and deploy container
```shell
docker compose up --build
```

## Option B: Run locally with `n8n start`

> **Prerequisites:** Node.js and n8n installed globally (`npm install -g n8n`)

1. Install dependencies and build the node
```shell
# Run inside the n8n-nodes-twincat-ads directory
npm install
npm run build
```

2. Register the package globally via npm link
```shell
# Run inside the n8n-nodes-twincat-ads directory
npm link
```

3. Link it into n8n's node folder
```shell
# Windows (run in your user folder, e.g. C:\Users\<USERNAME>\.n8n)
cd $env:USERPROFILE\.n8n
npm link n8n-nodes-twincat-ads

# macOS / Linux
cd ~/.n8n
npm link n8n-nodes-twincat-ads
```

> **Note:** If `~/.n8n` doesn't exist yet, start n8n once first (`n8n start`) so it creates the folder, then stop it and run the link command above.

4. Start n8n with the custom extensions path set

**Windows (PowerShell):**
```shell
$env:N8N_CUSTOM_EXTENSIONS="$env:USERPROFILE\.n8n\node_modules\n8n-nodes-twincat-ads"
n8n start
```

**macOS / Linux:**
```shell
N8N_CUSTOM_EXTENSIONS="~/.n8n/node_modules/n8n-nodes-twincat-ads" n8n start
```

The **TwinCAT ADS** node will now appear in the node palette under the "transform" group.

---

## Ollama setup (Docker only)

### Downloading a model

Once the containers are running, you need to pull a model into Ollama before it can be used. Exec into the Ollama container and run `ollama pull`:

```shell
docker exec -it ollama sh
ollama pull llama3
exit
```
Replace `llama3` with whichever model you want (e.g. `mistral`, `phi3`, `gemma2`). You can browse available models at [ollama.com/library](https://ollama.com/library).

> **Note:** Model downloads can be several gigabytes. Make sure you have enough disk space before pulling.

### Adding Ollama credentials in n8n

1. Open n8n at `http://localhost:5678`
2. Go to **Settings → Credentials → Add Credential**
3. Search for **Ollama** and select it
4. Set the **Base URL** to:
   ```
   http://ollama:11434
   ```
   > Use `ollama` (the container name) not `localhost` — containers communicate over the internal Docker network, not the host network.
5. Click **Save** and test the connection
