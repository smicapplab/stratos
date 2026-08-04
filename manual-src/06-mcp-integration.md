# 6. MCP Integrations (Model Context Protocol)

Stratos is designed for the AI era. Using the **Model Context Protocol (MCP)**, you can integrate Stratos directly with AI assistants like Claude Desktop, Cursor, or your own custom agents.

## What is MCP?

MCP is an open standard that allows AI models to securely connect to external data sources. By enabling the Stratos MCP server, your AI assistant can read your tasks, update statuses, and create new tickets on your behalf—all through natural language.

## Enabling the MCP Server

The Stratos MCP server is distributed as a public NPM package (`@stratos/mcp-server`) that communicates via STDIO.

1. Navigate to your **Profile Settings** inside Stratos.
2. Go to the **Developer & API** tab.
3. Click **Generate Personal Access Token (PAT)**. Save this token securely.
4. Locate your AI assistant's configuration file. For Claude Desktop, it is found at:
   * Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   * Windows: `%APPDATA%\Claude\claude_desktop_config.json`
5. Add the following snippet to the file, replacing `<YOUR_PAT>` with the token you generated:
   ```json
   {
     "mcpServers": {
       "stratos": {
         "command": "npx",
         "args": ["-y", "@stratos/mcp-server"],
         "env": {
           "STRATOS_PAT": "<YOUR_PAT>"
         }
       }
     }
   }
   ```
6. Restart your AI assistant. It will automatically download the MCP server and connect to your Stratos workspace.

## Example Use Cases

Once connected, you can ask your AI:
* *"What are my overdue urgent tasks in Stratos?"*
* *"Create a new bug ticket in the Engineering board for the login crash."*
* *"Summarize the latest comments on Task-105 and draft a reply."*

The AI will seamlessly fetch the data and execute the actions using your permissions.
