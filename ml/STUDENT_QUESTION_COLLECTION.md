# SkillNest real-question pilot: collection pack

Status: prepared locally, not published or sent. No student responses collected.
Copy the student section into a form you control or distribute as a document.
Do not collect email addresses automatically or require names/student numbers.
Use college-approved collection procedures; this pilot is for adult volunteers.

## Student-facing introduction and consent

We are evaluating a SkillNest model that suggests the technical topic of a
programming question. Participation is optional and has no effect on grades or
access to SkillNest. Please share an actual doubt in your own words. Do not use
AI to generate or rewrite it, and do not paste somebody else's question.

Please exclude names, contact details, passwords, API keys, private code and
confidential project information. You do not need to provide an answer.

Your question and topic choices will be reviewed by the SkillNest project team
and used only for this local college-project evaluation, not model training.
Raw responses will not be posted publicly or sent to external AI services.
Only aggregate evaluation results will be shared. The team will delete raw
responses within 90 days of collection. A separate opt-in would be required for
future training, public examples, publication of the dataset or commercial use.

Keep a random participant code of your choice (not your name or student ID).
Use the same code for all your submissions. You may ask the person who shared
this form to remove submissions using that code before aggregate reporting.
Already shared aggregate results cannot be withdrawn individually.

Required unchecked agreement:
"I am 18 or older, understand the purpose above, and voluntarily agree to the
use of my own question for this evaluation. I have removed private information."
If not agreed, do not collect/store a question.

## Form fields

1. Consent checkbox above (required, unchecked by default).
2. Random participant code (required; same code across submissions).
3. Your actual programming doubt (required, 20-3000 characters).
4. What were you trying to accomplish? (optional, up to 1000 characters).
5. Which topics do you think apply? (checkboxes: JavaScript, Python, React,
   SQL, Another topic, Not sure; multiple choices allowed).
6. Is this related to another question you already submitted? (optional prior
   submission code, so related questions can be grouped).
7. Experience with this topic (optional: beginning / some experience / advanced).

Do not show example question wording before submission; it can prime responses.
Do not require exactly one topic. Keep mixed/unsupported questions as a separate
challenge set instead of forcing them into one of our four classes.

## Organizer checklist

- Share only after selecting the responsible collector and a private storage
  location. The distributor is the withdrawal contact described above.
- Initial practical collection goal: 80-120 independent questions across the
  four topics, plus ambiguous/unsupported examples. This is a pilot target, not
  a guarantee of statistically reliable scores. Recruit multiple contributors;
  avoid filling the dataset with paraphrases from a few people.
- Save responses under ignored `ml/data/student-pilot/`, never in Git or a
  public shared sheet. Record collection date, consent version and deletion due
  date. These participant codes are pseudonyms, not a promise of anonymity.
- Remove declined consent and private information before annotation. Honor
  withdrawals and delete at 90 days; the document does not automate deletion.
- Two knowledgeable reviewers independently assign topics from question text,
  without seeing model predictions. Preserve disagreements; adjudicate them.
  Student topic choices are hints, not verified labels.
- Keep participant/related-question groups together. Freeze this set for final
  evaluation only. Do not tune thresholds or train on it. Use separate public
  train/validation data during model development.
- Report topic-level precision/recall/F1, coverage/abstentions and errors on
  unsupported/mixed questions. Do not imply improved learner resolutions from
  a classification score.

Suggested private record fields:
`submission_id, participant_code, related_group, collected_at, consent_version,
consent, question, context, student_topics, reviewer_1_topics, reviewer_2_topics,
final_topics, adjudication_note, deletion_due, use=evaluation_only`.

This collection pack is not a hosted form. No invitations have been sent.
