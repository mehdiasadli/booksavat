# olib

Standalone Open Library SDK for BookSavat. Depends only on **`fetch`** and **`zod`** — no app imports.

## Quick start

```ts
import { olib } from "../olib";

const { docs } = await olib.search.works({
  q: "fantastic mr fox",
  limit: 5,
  fields: ["key", "title", "author_name", "cover_i"],
});

const work = await olib.works.get(docs[0].key);
const editions = await olib.works.editions(work.key, { limit: 10 });
const author = await olib.authors.get(work.authors?.[0]?.author?.key ?? "OL34184A");
const cover = olib.covers.bookUrl({ key: "olid", value: "OL44247403M", size: "L" });
```

Or create your own client:

```ts
import { createOpenLibrary } from "../olib";

const client = createOpenLibrary({
  userAgent: "MyApp",
  contact: "me@example.com",
});
```

## API surface

| Call | Endpoint |
| --- | --- |
| `olib.search.works(input)` | `GET /search.json` |
| `olib.search.authors(input)` | `GET /search/authors.json` |
| `olib.works.get(id)` | `GET /works/{id}.json` |
| `olib.works.editions(id, input?)` | `GET /works/{id}/editions.json` |
| `olib.editions.get(id)` | `GET /books/{id}.json` |
| `olib.editions.byIsbn(isbn)` | `GET /isbn/{isbn}.json` (follows redirect) |
| `olib.authors.get(id)` | `GET /authors/{id}.json` |
| `olib.authors.works(id, input?)` | `GET /authors/{id}/works.json` |
| `olib.covers.bookUrl(input)` | URL builder (no network) |
| `olib.covers.authorUrl(input)` | URL builder (no network) |

## Inputs & query params

Search inputs accept:

- `q` (required)
- `limit`, `offset` **or** `page` (not both)
- `fields` (string or string[])
- `sort`, `lang` (works search)
- `includeEditions` — ensures `editions` is requested in `fields`

Works/authors list endpoints accept `limit` + `offset` (max 1000).

OLIDs may be passed bare (`OL45804W`) or as paths (`/works/OL45804W`).

## Errors

All failures throw `OpenLibraryError` with `code`:

- `INVALID_INPUT` — Zod rejected the call arguments
- `INVALID_RESPONSE` — response JSON failed schema validation
- `NOT_FOUND` — HTTP 404
- `RATE_LIMITED` — HTTP 403/429
- `HTTP_ERROR` — other non-OK status
- `NETWORK_ERROR` — timeout / fetch failure

## Rate limits

Open Library: **1 rps** anonymous, **3 rps** when `User-Agent` includes app name + contact. This client always sends:

```http
User-Agent: BookSavat (hello@booksavat.app)
```
