# Messaging update — 29 October 2026

Open http://localhost:3003/messages and sign in with your own local account.

Messages are stored in PostgreSQL. The former oldest-200 limit is replaced with latest-50 pages and a Load older messages control. History is retained until account/message deletion or loss of the database; a reload does not delete it. Normal media is stored with the message in the local database, not browser storage.

Find People ranks up to 50 candidates by mutual accepted connections; it excludes existing relationships and blocked accounts. This is SQL-based recommendation, not ML. Incoming requests have explicit Accept/Decline controls; outgoing pending requests are listed separately. Socket events refresh conversations and requests.

Attachments support JPEG/PNG images, MP4/WebM video, and WebM/Ogg/MP4 audio, capped at 8 MB. Recording is user initiated and stops after two minutes. Browser permissions and supported codecs affect recording/playback. Content-type allowlisting and basic file signatures are checked; there is no antivirus/transcoding pipeline. Production-scale media needs object storage, quotas and a media processing strategy.

View once atomically grants one recipient download and removes stored media bytes. Failed delivery after consumption cannot be retried. It does not prevent screenshots, recording, saved copies or guarantee WhatsApp-equivalent privacy. Sender cannot reopen a view-once attachment. Delete for me hides only that participant's copy. Delete for everyone is sender-only and replaces content with a tombstone; it cannot erase external copies. Historical backups may retain earlier database contents. This implementation is not end-to-end encrypted.

Verification: disposable local fixtures tested 230-message pagination/reload, recipient-only acceptance, authorized photo access, outsider denial, delete-for-me isolation, sender-only deletion, concurrent view-once consumption, MIME rejection and blocks. Existing social integration and 28 Node tests passed. Browser text send/reload reviewed separately. Real microphone recording and cross-device video calls have not been verified.

Roadmap generation already uses goals, self-described skills and recorded assessments. A new checkbox allows excluding assessment summaries. Plans update when the learner generates another plan, not automatically after every answer. Configured Groq chat provider answered a live smoke prompt; this does not establish general answer quality or parity with ChatGPT/Claude.
