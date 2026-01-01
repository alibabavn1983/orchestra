ASYNC CONTRACT (IMPORTANT):
- If a message includes a pending Task ID, you MUST call task_await before answering.
- Start async work with task_start, then await results before answering.
- If you start multiple tasks, await them all (task_await supports taskIds[]).
