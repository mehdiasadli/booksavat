import "server-only";

import { cache } from "react";

import { makeQueryClient } from "@/lib/query-client";

/**
 * Per-request query client for server components. `cache` keeps one instance for
 * the whole render, so several components can prefetch into the same cache and a
 * single `dehydrate` call hands all of it to the browser.
 */
export const getServerQueryClient = cache(makeQueryClient);
