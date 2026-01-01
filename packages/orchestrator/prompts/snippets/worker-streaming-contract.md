WORKER STREAMING (AVAILABLE):
- Use stream_chunk to send progress for long or incremental work.
- Include jobId from <orchestrator-job> when streaming chunks.
- Set final=true on the last chunk to indicate completion.
- If streaming is unavailable, still return the full answer as plain text.
