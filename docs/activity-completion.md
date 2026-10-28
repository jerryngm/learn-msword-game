# Activity completion

Missions and revision activities check the Word skill being practised. Missing full stops or commas do not block ordinary typing, personal introductions, cursor editing, spelling correction, formatting, lists, or picture tasks. Matching still requires the expected words and any required formatting, structure, command history, or save location. Numeric punctuation is preserved by the shared comparator.

If an otherwise correct answer differs in punctuation, learners can choose **Check** to finish and receive a gentle English/Vietnamese reminder without a star penalty. Exact answers still finish automatically. Waiting for Check lets learners finish typing punctuation or a personal name before the screen moves on.

Punctuation correction exercises remain strict, as do capitalization exercises and the full-stop change used to demonstrate Undo/Redo. Topic 1 sentence-correction revision exercises also still require their explicitly requested capital and full stop. Missions introducing the learner accept a missing stop while requiring the name and city prompts to be filled.

Literal text in mission instructions, revision prompts and hints is quoted and emphasized using the activity's example or demo text; personalized sentence fragments are quoted explicitly. The quotation marks identify the text and are not part of the answer.

When a mission is completed, the result screen (`renderSuccess`) is embedded directly as an overlay over the completed workspace with a gentle blurred backdrop (`backdrop-filter: blur(2.5px)`), instead of destroying the document and abruptly wiping to a standalone page. This preserves spatial continuity and pride of authorship, allows learners to view their finished work (with an interactive "Look at my work" peek toggle), and reuses the existing result component including peer helper alert notifications (`#helperAlertSlot`).

Implementation: `pb_public/js/content/text-rules.js`, topic predicates in `pb_public/js/content/`, and the mission/revision/success screens. Regression coverage: `tests/completion.test.mjs` and `tests/success-overlay.test.mjs`. Existing permissive filename and capstone matching is unchanged. No persistence schema changes are required.
