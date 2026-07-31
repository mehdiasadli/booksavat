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

	it("shows a spinner alone when loading without loadingText", () => {
		render(
			<Button loading loadingText={undefined}>
				Save
			</Button>,
		);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(button).not.toHaveTextContent("Save");
		expect(button.querySelector("svg")).toBeInTheDocument();
	});

	it("shows loader beside loadingText when both are set", () => {
		render(
			<Button loading loadingText="Saving">
				Save
			</Button>,
		);

		const button = screen.getByRole("button", { name: "Saving" });
		expect(button).toBeDisabled();
		expect(button.querySelector("svg")).toBeInTheDocument();
	});
});
