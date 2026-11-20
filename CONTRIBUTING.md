# Contributing to Ondo

Thank you for helping make heat safe for every body. Ondo started as a hackathon build at Speech to Ship 2026, and we welcome issues, ideas and pull requests.

## Ground rules

1. **Rules decide, the LLM explains.** Never let a language model produce or change a safety limit (bath, °C, minutes, rounds, cool-down, water). Limits live only in `app/backend/rules.py`.
2. **Safety rule changes need a source and a test.** Any change to the rules table must include:
   - a link to the guidance or evidence behind it (a public-health body, a peer-reviewed paper or a drug label);
   - a unit test for the rule on its own and in combination;
   - an update to [`docs/SAFETY_ENGINE.md`](docs/SAFETY_ENGINE.md).
   Changes that make a limit *less* conservative need a clinician's review noted in the PR.
3. **Safety guidance, not medical advice.** Keep that framing in all copy, in every language. Ondo never diagnoses.
4. **Keys stay server-side.** Never send `YDC_API_KEY` or `EMERGENT_LLM_KEY` to the browser, and never commit `.env`.
5. **Every external call has a fallback.** New You.com or LLM calls need a timeout, a MongoDB cache and a seeded fallback with a Live / Cached badge.
6. **No dead buttons.** If a control is in the UI, it does something and persists.
7. **Don't invent numbers.** Statistics in the app and docs need a source link.

## Getting started

1. Fork and clone the repo, then follow [Run it locally](README.md#run-it-locally).
2. Create a branch: `git checkout -b feat/short-description`.
3. Make your change, with tests.
4. Run the backend tests (`pytest -q` in `app/backend`) and check the frontend builds (`yarn build` in `app/frontend`).
5. Open a pull request that explains **what** changed, **why**, and **how you tested it**. Include a screenshot or short clip for UI changes.

## Good first contributions

- Translations and native-speaker review of check-in lines, unwell steps and explanations.
- New entries for the medicine dictionary (generic name, common brand names, drug class) with a source.
- Accessibility: screen-reader labels, contrast, larger tap targets.
- Real screenshots for [`assets/screens/`](assets/screens/).
- Tests for bath selection edge cases.

## Reporting a bug

Open an issue with steps to reproduce, what you expected, what happened, and your browser and device. **Never include a real person's health information** in an issue; use the demo personas (Margaret, Mr. Tanaka, Priya, David, the Chen family) instead.

## Reporting a security or safety issue

If you find a way for Ondo to give an unsafe prescription, or a security issue such as an exposed key, please don't open a public issue. Contact the maintainers privately through the repository's security advisory page so we can fix it first.

## Style

- **Python:** type hints, Pydantic models for every LLM response, small pure functions in the rules engine.
- **React:** functional components, the brand tokens (ink `#101418`, steam white `#F7F5F2`, deep teal `#0E3B43`, jade `#2FA58F`, amber `#E9A23B`, vermilion `#E2483D`), Fraunces for headings and Inter for UI. Large type and tap targets for older guests.
- **Copy:** short, warm, plain language. Show progress steps instead of silent spinners.

## Code of conduct

Be kind, be specific, and assume good intent. Harassment or discrimination of any kind isn't tolerated.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
