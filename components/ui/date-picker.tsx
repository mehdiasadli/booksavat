"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	value?: Date | null;
	onChange: (date: Date | null) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	/** Allow clearing the selected date. */
	clearable?: boolean;
	/** Inclusive lower bound (local calendar day). */
	minDate?: Date | null;
	/** Inclusive upper bound (local calendar day). Defaults to today when set. */
	maxDate?: Date | null;
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	disabled,
	id,
	className,
	clearable = true,
	minDate,
	maxDate,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const selected = value ?? undefined;

	const disabledMatchers = React.useMemo(() => {
		const matchers: Array<{ before: Date } | { after: Date }> = [];
		if (minDate) {
			matchers.push({ before: startOfDay(minDate) });
		}
		if (maxDate) {
			matchers.push({ after: startOfDay(maxDate) });
		}
		return matchers.length > 0 ? matchers : undefined;
	}, [minDate, maxDate]);

	return (
		<div className={cn("min-w-0 w-full", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					id={id}
					disabled={disabled}
					render={
						<Button
							variant="outline"
							data-empty={!selected}
							className="w-full min-w-0 justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
						/>
					}
				>
					<CalendarIcon className="size-3.5 shrink-0" />
					<span className="min-w-0 truncate">
						{selected ? format(selected, "PPP") : placeholder}
					</span>
					{clearable && selected ? (
						<button
							type="button"
							aria-label="Clear date"
							className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onChange(null);
							}}
						>
							<XIcon className="size-3.5" />
						</button>
					) : null}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={selected}
						onSelect={(date) => {
							onChange(date ?? null);
							setOpen(false);
						}}
						defaultMonth={selected}
						disabled={disabledMatchers}
						startMonth={minDate ? startOfDay(minDate) : undefined}
						endMonth={maxDate ? startOfDay(maxDate) : undefined}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
