import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PropertySummaryDto } from "@/lib/api/types";
import { ListingCard } from "./listing-card";

const property: PropertySummaryDto = {
  id: "p1",
  title: "Bright 2 BHK near Sony Signal",
  propertyType: "APARTMENT",
  bhk: 2,
  bathrooms: 2,
  areaSqft: 1150,
  furnishing: "SEMI_FURNISHED",
  tenantPreference: "FAMILY",
  rent: 32000,
  deposit: 150000,
  locality: "Koramangala",
  city: "Bengaluru",
  latitude: 12.93,
  longitude: 77.62,
  coverImageUrl: "/api/v1/files/public/p1/cover.jpg",
  amenities: ["LIFT", "PARKING"],
  status: "ACTIVE",
  availableFrom: "2026-11-01",
  createdAt: "2026-10-01T00:00:00Z",
  distanceKm: 1.24,
  ownerVerified: true,
  shortlisted: false,
};

describe("ListingCard", () => {
  it("shows price, configuration, location, distance and the verified badge", () => {
    render(<ListingCard property={property} />);
    expect(screen.getByText("₹32,000")).toBeInTheDocument();
    expect(screen.getByText(/Deposit ₹1,50,000/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "2 BHK Apartment in Koramangala" });
    expect(link).toHaveAttribute("href", "/properties/p1");
    expect(screen.getByText("Koramangala, Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("1.2 km away")).toBeInTheDocument();
    expect(screen.getByText("Verified owner")).toBeInTheDocument();
    expect(screen.getByText("1,150 sq.ft")).toBeInTheDocument();
    expect(screen.getByText("Semi-furnished")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: property.title })).toHaveAttribute("src", property.coverImageUrl);
  });

  it("handles studios, missing images, no distance and unverified owners", () => {
    render(
      <ListingCard
        property={{
          ...property,
          bhk: 0,
          propertyType: "STUDIO",
          coverImageUrl: null,
          distanceKm: null,
          ownerVerified: false,
        }}
        action={<button type="button">heart</button>}
      />,
    );
    expect(screen.getByRole("link", { name: "Studio Studio in Koramangala" })).toBeInTheDocument();
    expect(screen.queryByText("Verified owner")).not.toBeInTheDocument();
    expect(screen.queryByText(/away/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "heart" })).toBeInTheDocument();
  });
});
