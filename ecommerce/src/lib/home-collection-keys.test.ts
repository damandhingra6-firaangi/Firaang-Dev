import { describe, expect, it } from "vitest";
import {
  isHomeDiscoveryCollection,
  matchesHomeCollectionVibe,
} from "./home-collection-keys";

describe("homepage Shopify collection matching", () => {
  it("resolves renamed India collection records by their Shopify title or stable handle", () => {
    expect(matchesHomeCollectionVibe({ title: "Made For India", handle: "independence-day" }, "india")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "India Unfiltered", handle: "india-unfiltered" }, "india")).toBe(true);
  });

  it("matches the existing added collections by their Shopify handles", () => {
    expect(matchesHomeCollectionVibe({ title: "Humor & Quotes", handle: "funny" }, "humor-quotes")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Limited Edition", handle: "rockstar" }, "limited-edition")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Women's Collection", handle: "baby-tees" }, "womens-collection")).toBe(true);
  });

  it("maps the remaining homepage categories to their published Shopify handles", () => {
    expect(matchesHomeCollectionVibe({ title: "Methology", handle: "devotional-collection" }, "mythology")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Anime & KAWAII", handle: "kawaii-core" }, "anime")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Streetwear", handle: "genz" }, "streetwear")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Mindset", handle: "motivational" }, "mindset")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Essentials", handle: "firaang-original" }, "essentials")).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Bottomwear", handle: "pants" }, "bottomwear")).toBe(true);
  });

  it("includes the published navigation records in the homepage collection fetch set", () => {
    const navigationCollections = [
      { title: "Methology", handle: "devotional-collection" },
      { title: "Anime & KAWAII", handle: "kawaii-core" },
      { title: "Bottomwear", handle: "pants" },
      { title: "404 Series", handle: "404-series" },
      { title: "Essentials", handle: "firaang-original" },
      { title: "Humor & Quotes", handle: "funny" },
      { title: "India Unfiltered", handle: "independence-day" },
      { title: "Limited Edition", handle: "rockstar" },
      { title: "Mindset", handle: "motivational" },
      { title: "Streetwear", handle: "genz" },
      { title: "Women's Collection", handle: "baby-tees" },
    ];

    expect(navigationCollections.every(isHomeDiscoveryCollection)).toBe(true);
  });

  it("does not fuzzy-match unrelated collection names", () => {
    const unrelated = { title: "India Streetwear", handle: "india-streetwear" };
    expect(matchesHomeCollectionVibe(unrelated, "india")).toBe(false);
    expect(isHomeDiscoveryCollection(unrelated)).toBe(false);
  });

  it("matches the Shopify Streetwear and 404 Series collections by their handles", () => {
    const streetwearCollection = { title: "Streetwear", handle: "genz" };
    expect(matchesHomeCollectionVibe(streetwearCollection, "streetwear")).toBe(true);
    expect(isHomeDiscoveryCollection(streetwearCollection)).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Renamed in Shopify", handle: "genz" }, "streetwear")).toBe(true);

    const fourOhFourCollection = { title: "404 Series", handle: "404-series" };
    expect(matchesHomeCollectionVibe(fourOhFourCollection, "404")).toBe(true);
    expect(isHomeDiscoveryCollection(fourOhFourCollection)).toBe(true);
    expect(matchesHomeCollectionVibe({ title: "Renamed in Shopify", handle: "404-series" }, "404")).toBe(true);
  });

  it("includes only known homepage collection aliases in the Shopify product fetch set", () => {
    expect(isHomeDiscoveryCollection({ title: "Anime & Pop", handle: "anime-pop" })).toBe(true);
    expect(isHomeDiscoveryCollection({ title: "Made For India", handle: "independence-day" })).toBe(true);
    expect(isHomeDiscoveryCollection({ title: "Rakhi Special", handle: "rakhispecial" })).toBe(true);
    expect(isHomeDiscoveryCollection({ title: "Unrelated Collection", handle: "other" })).toBe(false);
  });
});
