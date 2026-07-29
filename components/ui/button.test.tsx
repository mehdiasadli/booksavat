import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("<Button />", () => {
	it("renders an accessible button with its label", () => {
		render(<Button>Save</Button>);

		expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
	});

	it("calls onClick when clicked", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Save</Button>);

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("stays silent when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Save
			</Button>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onClick).not.toHaveBeenCalled();
	});

	it("applies variant and size classes on top of the caller's className", () => {
		render(
			<Button variant="destructive" size="sm" className="mt-2">
				Delete
			</Button>,
		);

		expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
			"text-destructive",
			"h-7",
			"mt-2",
		);
	});
});
