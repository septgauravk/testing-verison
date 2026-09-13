import { describe, expect, it } from "vitest";
import { imageList, productInput, wholeQuantity } from "./routers";

describe("commerce validation", () => {
  it("accepts only whole stock quantities from 1 through 1000", () => {
    expect(wholeQuantity.safeParse(1).success).toBe(true);
    expect(wholeQuantity.safeParse(1000).success).toBe(true);
    expect(wholeQuantity.safeParse(0).success).toBe(false);
    expect(wholeQuantity.safeParse(1001).success).toBe(false);
    expect(wholeQuantity.safeParse(1.5).success).toBe(false);
    expect(wholeQuantity.safeParse("10").success).toBe(false);
  });

  it("limits product imagery to one through five valid URLs", () => {
    const images = Array.from({ length: 5 }, (_, index) => `https://cdn.example.com/watch-${index}.jpg`);
    expect(imageList.safeParse(images).success).toBe(true);
    expect(imageList.safeParse([]).success).toBe(false);
    expect(imageList.safeParse([...images, "https://cdn.example.com/watch-5.jpg"]).success).toBe(false);
    expect(imageList.safeParse(["not-a-url"]).success).toBe(false);
  });

  it("allows an empty video field to remove an existing product film", () => {
    const result = productInput.safeParse({
      brandId: 1,
      collection: "men",
      name: "Test Watch",
      shortDescription: "Automatic movement",
      description: "A test watch description.",
      images: ["https://cdn.example.com/watch.jpg"],
      videoUrl: "",
      videoPoster: "",
      price: 10000,
      discount: 10,
      stock: 25,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.videoUrl).toBeNull();
      expect(result.data.videoPoster).toBeNull();
    }
  });
});
