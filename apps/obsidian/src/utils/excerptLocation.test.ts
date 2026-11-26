import { formatExcerptLocationLabel } from "@/utils/excerptLocation";

const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";

describe("excerptLocation", () => {
  describe("formatExcerptLocationLabel()", () => {
    it(`formats single-line, multi-line, and zero-line excerpt locations (${ISSUE_3})`, () => {
      expect(formatExcerptLocationLabel(0, 0)).toBe("Selection");
      expect(formatExcerptLocationLabel(12, 12)).toBe("L12");
      expect(formatExcerptLocationLabel(225, 226)).toBe("L225-226");
    });
  });
});
