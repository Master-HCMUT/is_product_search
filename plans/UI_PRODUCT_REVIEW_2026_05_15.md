# UI Product Review - 2026-05-15

## Scope

Reviewed the live app with Chrome across:

- Login
- Customer shop
- Shop owner dashboard
- Shop owner product management
- Shop owner DS account management
- Data scientist dashboard
- Data scientist model evaluation
- Data scientist search analysis

Screenshots and raw browser text were captured locally under `/tmp/is-product-ui-review`.

## Findings

### Customer Shop

- The customer homepage is the strongest surface: search, category chips, filters, cart, product sheet, debug toggle, and load-more pagination are all discoverable.
- The first product rail is still semantically noisy. `Trending Finds` often returns jewelry/accessories because the query is broad and the catalog has many matching accessory terms.
- Debug controls are correctly hidden until a search happens, but the label is developer-oriented. This is acceptable for now because it is intentionally optional.
- The page depends on many homepage rail API calls at once. Backend fallback protects it, but a future polish pass should stagger or cache rail calls.

### Shop Owner

- Before this pass, the owner dashboard showed `0` products and `0` DS accounts because demo localStorage data was initialized after child page effects ran.
- Product management was disconnected from the real indexed catalog and showed an empty mock table, while the customer shop searched thousands of products.
- The owner header did not expose direct navigation to Products or DS Accounts after leaving the dashboard.

### Data Scientist

- DS dashboard and search analysis are useful and connected to backend search logs.
- Model evaluation is still a placeholder: it says no model data is available, while the system actually uses Superlinked + MiniLM embeddings and Gemini query parsing.
- Search analysis clearly communicates match rate and feedback coverage, but the insight quality is limited until customer feedback is collected.

### Cross-Cutting UX / Runtime

- Protected routes had an auth race: direct navigation or page reload could redirect authenticated users back to login because `currentUser` was loaded in `useEffect`.
- Radix dropdown triggers emitted ref warnings because the shared `Button` component did not forward refs.
- Header navigation was sparse for owner and DS roles.

## Improvements Applied

- Load auth state synchronously from localStorage to prevent protected-route reload redirects.
- Forward refs from the shared `Button` component so Radix dropdowns stop warning.
- Initialize demo localStorage data synchronously before the router renders.
- Add role-specific header navigation:
  - Owner: Products, DS Accounts
  - Data Scientist: Search Analysis, Evaluation
- Connect owner dashboard stats to backend catalog metadata and backend search logs.
- Convert owner product management from an empty mock table into a live indexed-catalog inspector using the backend product API.

## Recommended Next Pass

- Add real category classification to products during ingestion, then use category filters instead of keyword-only category intent.
- Replace model evaluation placeholder with live embedding/search diagnostics: collection count, indexed vector count, recent fallback rate, parse source rate, and search latency.
- Add feedback prompts after bad or empty searches so DS analytics has meaningful qualitative data.
- Cache customer homepage rails or load them progressively so the first render is faster.
