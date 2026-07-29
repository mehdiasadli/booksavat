import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are enabled, and this
// project keeps them off in favour of explicit imports.
afterEach(cleanup);
