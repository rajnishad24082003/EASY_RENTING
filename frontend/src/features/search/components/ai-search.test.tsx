import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { stateFromAiFilters } from "../filters";
import { AiSearchBar } from "./ai-search-bar";
import { AiSearchSummary } from "./ai-search-summary";

describe("AiSearchSummary", () => {
  const state = stateFromAiFilters({
    locality: "Koramangala",
    lat: 12.9352,
    lng: 77.6245,
    radiusKm: 3,
    maxRent: 35000,
    bhk: [2],
    furnishing: ["FULLY_FURNISHED"],
    tenantPreference: "FAMILY",
  });

  it("renders the explanation, the AI badge and one chip per parsed filter", () => {
    render(
      <AiSearchSummary
        state={state}
        onChange={() => {}}
        explanation="2 BHK furnished flats under ₹35,000 near Koramangala for families"
        parser="AI"
      />,
    );
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.queryByText("Smart rules")).not.toBeInTheDocument();
    expect(screen.getByText(/near Koramangala for families/)).toBeInTheDocument();
    const chips = within(screen.getByRole("list", { name: "Active filters" })).getAllByRole("listitem");
    expect(chips.map((li) => li.textContent)).toEqual([
      "Within 3 km of Koramangala",
      "Under ₹35K",
      "2 BHK",
      "Fully furnished",
      "For family",
    ]);
  });

  it("shows the Smart rules badge for rule-based parsing", () => {
    render(<AiSearchSummary state={state} onChange={() => {}} explanation="2 BHK under ₹35,000" parser="RULES" />);
    expect(screen.getByText("Smart rules")).toBeInTheDocument();
  });

  it("removes a filter when its chip is dismissed", async () => {
    const onChange = vi.fn();
    render(<AiSearchSummary state={state} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Under ₹35K" }));
    expect(onChange).toHaveBeenCalledWith(expect.not.objectContaining({ maxRent: expect.anything() }));
    expect(onChange.mock.calls[0][0]).toMatchObject({ bhk: [2], near: "Koramangala" });
  });

  it("renders nothing without filters or explanation", () => {
    const { container } = render(<AiSearchSummary state={{}} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AiSearchBar", () => {
  it("submits trimmed text and runs example chips", async () => {
    const onSearch = vi.fn();
    render(<AiSearchBar onSearch={onSearch} examples={["Studio in Powai under 25k"]} />);
    await userEvent.type(screen.getByRole("searchbox"), "  2 BHK in HSR  {Enter}");
    expect(onSearch).toHaveBeenLastCalledWith("2 BHK in HSR");

    await userEvent.click(screen.getByRole("button", { name: "Studio in Powai under 25k" }));
    expect(onSearch).toHaveBeenLastCalledWith("Studio in Powai under 25k");
    expect(screen.getByRole("searchbox")).toHaveValue("Studio in Powai under 25k");
  });

  it("rejects queries shorter than 3 characters", async () => {
    const onSearch = vi.fn();
    render(<AiSearchBar onSearch={onSearch} />);
    await userEvent.type(screen.getByRole("searchbox"), "ab{Enter}");
    expect(onSearch).not.toHaveBeenCalled();
  });
});
